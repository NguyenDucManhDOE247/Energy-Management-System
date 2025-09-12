import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import tinytuya
import json
import time
import threading
from datetime import datetime, timedelta
from bson.json_util import dumps
from bson.objectid import ObjectId

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
# Turn off pretty-print mode of Flask jsonify
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False

# MongoDB connection
mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/ems-data-collection')
client = MongoClient(mongo_uri)
db = client.get_database()

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    from flask import Response
    return Response('{"status":"ok"}', mimetype='application/json')

# Collections
devices_collection = db.devices
device_data_collection = db.deviceData
config_collection = db.dataCollectionConfig

# Load Tuya device configurations
try:
    with open('devices.json', 'r') as f:
        DEVICES = json.load(f)
except FileNotFoundError:
    # Default device configuration if file not found
    DEVICES = {
        "devices": [
            {
                "id": "device1",
                "name": "Smart Plug 1",
                "type": "tuya",
                "device_id": "your_device_id_1",
                "ip": "192.168.1.100",
                "local_key": "your_local_key_1",
                "version": "3.3"
            },
            {
                "id": "device2",
                "name": "Smart Plug 2",
                "type": "tuya",
                "device_id": "your_device_id_2",
                "ip": "192.168.1.101",
                "local_key": "your_local_key_2",
                "version": "3.3"
            }
        ]
    }
    # Save default configuration
    with open('devices.json', 'w') as f:
        json.dump(DEVICES, f, indent=4)

# Function to collect data from Tuya devices - Using mock data instead of real device connections
def collect_tuya_data(device):
    try:
        # Use sample data instead of connecting to real device
        # Simulate device data with realistic random values
        import random
        
        # Generate random power value between 80W and 250W
        power = round(random.uniform(80, 250), 1)
        
        # Generate random current value between 0.35A and 1.1A
        current = round(random.uniform(0.35, 1.1), 2)
        
        # Generate random voltage value between 220V and 240V
        voltage = round(random.uniform(220, 240), 1)
        
        # Calculate energy (kWh) - for now, just an instantaneous reading
        # In a real implementation, you'd integrate over time
        energy = power / 1000.0  # Convert W to kW
        
        # Randomly determine device state (on/off) - mostly on (80% chance)
        state = random.random() < 0.8
        
        # Prepare data for MongoDB
        timestamp = datetime.now().isoformat()
        device_data = {
            'device_id': device['id'],
            'timestamp': timestamp,
            'power': power,
            'current': current,
            'voltage': voltage,
            'energy': energy,
            'state': state
        }
        
        # Insert into MongoDB
        device_data_collection.insert_one(device_data)
        
        return device_data
    except Exception as e:
        print(f"Error collecting data from device {device['id']}: {str(e)}")
        return None

# Data collection thread
def data_collection_thread():
    while True:
        try:
            # Get collection interval from config
            config = config_collection.find_one({"config_type": "collection_interval"})
            interval = config.get('value', 10) if config else 10  # Default 10 seconds
            
            # Collect data from all devices
            for device in DEVICES['devices']:
                if device['type'] == 'tuya':
                    collect_tuya_data(device)
            
            # Sleep for the configured interval
            time.sleep(interval)
        except Exception as e:
            print(f"Error in data collection thread: {str(e)}")
            time.sleep(10)  # Sleep and retry on error

# Function to generate initial sample data
def generate_initial_data():
    """Generate initial sample data for each device"""
    try:
        # Check if we already have data
        if device_data_collection.count_documents({}) > 0:
            print("Data already exists, skipping initial data generation")
            return
            
        print("Generating initial sample data...")
        
        # Generate data for the last hour with 5-minute intervals
        now = datetime.now()
        
        for device in DEVICES['devices']:
            if device['type'] == 'tuya':
                # Generate 12 data points (1 hour with 5-minute intervals)
                for i in range(12):
                    # Create timestamp 5*i minutes in the past
                    timestamp = (now - timedelta(minutes=5 * i)).isoformat()
                    
                    # Generate random values
                    import random
                    power = round(random.uniform(80, 250), 1)
                    current = round(random.uniform(0.35, 1.1), 2)
                    voltage = round(random.uniform(220, 240), 1)
                    energy = power / 1000.0
                    state = random.random() < 0.8
                    
                    # Prepare data for MongoDB
                    device_data = {
                        'device_id': device['id'],
                        'timestamp': timestamp,
                        'power': power,
                        'current': current,
                        'voltage': voltage,
                        'energy': energy,
                        'state': state
                    }
                    
                    # Insert into MongoDB
                    device_data_collection.insert_one(device_data)
                    
        print("Initial sample data generation completed")
    except Exception as e:
        print(f"Error generating initial data: {str(e)}")

# Generate initial data
generate_initial_data()

# Start data collection thread
collection_thread = threading.Thread(target=data_collection_thread, daemon=True)
collection_thread.start()

# API Routes
@app.route('/api/data/current', methods=['GET'])
def get_current_data():
    """Get current data from all devices"""
    try:
        # Find the latest data for each device
        pipeline = [
            {"$sort": {"timestamp": -1}},
            {"$group": {
                "_id": "$device_id",
                "latest_data": {"$first": "$$ROOT"}
            }},
            {"$replaceRoot": {"newRoot": "$latest_data"}}
        ]
        
        latest_data = list(device_data_collection.aggregate(pipeline))
        
        # Convert ObjectId to string to make it JSON serializable
        for item in latest_data:
            if '_id' in item:
                item['_id'] = str(item['_id'])
        
        # If no data found, generate some sample data
        if not latest_data:
            for device in DEVICES['devices']:
                if device['type'] == 'tuya':
                    data = collect_tuya_data(device)
                    if data:
                        # Convert ObjectId to string before appending
                        if '_id' in data:
                            data['_id'] = str(data['_id'])
                        latest_data.append(data)
        
        return jsonify(latest_data)
    except Exception as e:
        print(f"Error in get_current_data: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/device/<device_id>', methods=['GET'])
def get_device_data(device_id):
    """Get data for a specific device"""
    try:
        # Optional time range filter
        start_time = request.args.get('from')
        end_time = request.args.get('to')
        
        query = {"device_id": device_id}
        
        if start_time and end_time:
            query["timestamp"] = {
                "$gte": start_time,
                "$lte": end_time
            }
        
        # Limit results to most recent
        limit = int(request.args.get('limit', 100))
        
        data = list(device_data_collection.find(
            query, 
            {'_id': 0}
        ).sort("timestamp", -1).limit(limit))
        
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/historical', methods=['GET'])
def get_historical_data():
    """Get historical data for all devices"""
    try:
        # Required time range
        start_time = request.args.get('from')
        end_time = request.args.get('to')
        
        if not start_time or not end_time:
            return jsonify({
                "error": "Missing required parameters", 
                "message": "Both 'from' and 'to' parameters are required",
                "example": "/api/data/historical?from=2023-01-01T00:00:00&to=2023-01-31T23:59:59"
            }), 400
        
        query = {
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        # Optional device filter
        device_id = request.args.get('device_id')
        if device_id:
            query["device_id"] = device_id
        
        # Exclude _id field to avoid ObjectId serialization issues
        data = list(device_data_collection.find(
            query, 
            {'_id': 0}
        ).sort("timestamp", 1))
        
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/collect', methods=['POST'])
def trigger_data_collection():
    """Trigger immediate data collection for all devices"""
    try:
        results = []
        for device in DEVICES['devices']:
            if device['type'] == 'tuya':
                result = collect_tuya_data(device)
                if result:
                    # Convert ObjectId to string to make it JSON serializable
                    if '_id' in result:
                        result['_id'] = str(result['_id'])
                    results.append(result)
        
        return jsonify({"message": "Data collection triggered", "results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/devices', methods=['GET'])
def get_devices():
    """Get list of all devices"""
    return jsonify(DEVICES['devices'])

@app.route('/api/device/<device_id>', methods=['GET'])
def get_device(device_id):
    """Get information about a specific device"""
    for device in DEVICES['devices']:
        if device['id'] == device_id:
            return jsonify(device)
    return jsonify({"error": "Device not found"}), 404

# Endpoint health_check already defined at line 28
# @app.route('/health', methods=['GET'])
# def health_check():
#     return jsonify({"status": "ok"}), 200
    """Health check endpoint"""
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    # Insert devices into MongoDB if they don't exist
    for device in DEVICES['devices']:
        if not devices_collection.find_one({"id": device['id']}):
            devices_collection.insert_one(device)
    
    # Insert default config if it doesn't exist
    if not config_collection.find_one({"config_type": "collection_interval"}):
        config_collection.insert_one({
            "config_type": "collection_interval",
            "value": 10,  # 10 seconds default
            "description": "Data collection interval in seconds"
        })
    
    # Start Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)
