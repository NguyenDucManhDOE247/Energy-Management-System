require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'device-control' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'device-control.log' })
  ],
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => logger.info('MongoDB connected'))
.catch(err => logger.error('MongoDB connection error:', err));

// Device Schema
const deviceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['tuya', 'tapo'] },
  device_id: { type: String, required: true },
  ip: { type: String, required: true },
  local_key: { type: String, required: true },
  version: { type: String, required: true },
});

const Device = mongoose.model('Device', deviceSchema);

// Device Status Schema
const deviceStatusSchema = new mongoose.Schema({
  device_id: { type: String, required: true, unique: true },
  state: { type: Boolean, default: false },
  online: { type: Boolean, default: false },
  last_updated: { type: Date, default: Date.now },
});

const DeviceStatus = mongoose.model('DeviceStatus', deviceStatusSchema);

// Control History Schema
const controlHistorySchema = new mongoose.Schema({
  device_id: { type: String, required: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  user: { type: String },
});

const ControlHistory = mongoose.model('ControlHistory', controlHistorySchema);

// API Routes
// Get all devices
app.get('/api/devices', async (req, res) => {
  try {
    const devices = await Device.find({}, '-_id -__v');
    const deviceStatusMap = {};
    
    // Get status for all devices
    const statuses = await DeviceStatus.find({}, '-_id -__v');
    statuses.forEach(status => {
      deviceStatusMap[status.device_id] = {
        state: status.state,
        online: status.online,
        last_updated: status.last_updated
      };
    });
    
    // Combine device info with status
    const result = devices.map(device => ({
      ...device.toObject(),
      status: deviceStatusMap[device.id] || { state: false, online: false }
    }));
    
    res.json(result);
  } catch (err) {
    logger.error('Error fetching devices:', err);
    res.status(500).json({ error: 'Error fetching devices' });
  }
});

// Get a specific device
app.get('/api/devices/:deviceId', async (req, res) => {
  try {
    const device = await Device.findOne({ id: req.params.deviceId }, '-_id -__v');
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Get device status
    const status = await DeviceStatus.findOne({ device_id: req.params.deviceId }, '-_id -__v');
    
    res.json({
      ...device.toObject(),
      status: status ? {
        state: status.state,
        online: status.online,
        last_updated: status.last_updated
      } : { state: false, online: false }
    });
  } catch (err) {
    logger.error(`Error fetching device ${req.params.deviceId}:`, err);
    res.status(500).json({ error: 'Error fetching device' });
  }
});

// Update device status (online/offline)
app.put('/api/devices/:deviceId/status', async (req, res) => {
  try {
    const { online } = req.body;
    if (online === undefined) {
      return res.status(400).json({ error: 'Missing online status' });
    }
    
    // Find or create device status
    let status = await DeviceStatus.findOne({ device_id: req.params.deviceId });
    if (status) {
      status.online = online;
      status.last_updated = new Date();
      await status.save();
    } else {
      status = new DeviceStatus({
        device_id: req.params.deviceId,
        online,
        last_updated: new Date()
      });
      await status.save();
    }
    
    res.json({
      device_id: req.params.deviceId,
      online: status.online,
      state: status.state,
      last_updated: status.last_updated
    });
  } catch (err) {
    logger.error(`Error updating device ${req.params.deviceId} status:`, err);
    res.status(500).json({ error: 'Error updating device status' });
  }
});

// Toggle device (on/off)
app.put('/api/devices/:deviceId/toggle', async (req, res) => {
  try {
    // Validate that the device exists
    const device = await Device.findOne({ id: req.params.deviceId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Get current status
    let status = await DeviceStatus.findOne({ device_id: req.params.deviceId });
    if (!status) {
      status = new DeviceStatus({
        device_id: req.params.deviceId,
        state: false,
        online: false,
        last_updated: new Date()
      });
    }
    
    // Toggle state
    const newState = !status.state;
    
    // Simulate device control with sample data (no actual device connection)
    logger.info(`Simulating toggle for device ${device.id} to ${newState ? 'ON' : 'OFF'}`);
    
    // Update status in database
    status.state = newState;
    status.online = true; // Always show as online in sample mode
    status.last_updated = new Date();
    await status.save();
    
    // Log the control action
    await new ControlHistory({
      device_id: req.params.deviceId,
      action: newState ? 'turn_on' : 'turn_off',
      user: req.user ? req.user.username : 'system'
    }).save();
    
    return res.json({
      device_id: req.params.deviceId,
      state: status.state,
      online: status.online,
      last_updated: status.last_updated
    });
  } catch (err) {
    logger.error(`Error toggling device ${req.params.deviceId}:`, err);
    res.status(500).json({ error: 'Error toggling device' });
  }
});

// Get control history for a device
app.get('/api/devices/:deviceId/history', async (req, res) => {
  try {
    const history = await ControlHistory.find(
      { device_id: req.params.deviceId },
      '-_id -__v'
    ).sort({ timestamp: -1 }).limit(50);
    
    res.json(history);
  } catch (err) {
    logger.error(`Error fetching control history for device ${req.params.deviceId}:`, err);
    res.status(500).json({ error: 'Error fetching control history' });
  }
});

// Get weekly control history for a device
app.get('/api/devices/:deviceId/weekly-history', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { week } = req.query;
    
    if (!week) {
      return res.status(400).json({ error: 'Missing week parameter (format: YYYY-WW)' });
    }
    
    // Parse year and week number from the week parameter (format: YYYY-WW)
    const [year, weekNum] = week.split('-').map(num => parseInt(num, 10));
    
    if (isNaN(year) || isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
      return res.status(400).json({ error: 'Invalid week format. Use YYYY-WW (e.g., 2023-30)' });
    }
    
    // Calculate the start and end dates of the requested week
    const startDate = new Date(year, 0, 1 + (weekNum - 1) * 7);
    // Adjust to the first day of the week (Sunday)
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7); // End date is exclusive
    
    logger.info(`Fetching weekly history for device ${deviceId}, week ${week} (${startDate.toISOString()} to ${endDate.toISOString()})`);
    
    // Query the database for control history within the specified week
    const history = await ControlHistory.find(
      {
        device_id: deviceId,
        timestamp: { $gte: startDate, $lt: endDate }
      },
      '-_id -__v'
    ).sort({ timestamp: 1 });
    
    // Group by day of week and action
    const dailyStats = Array(7).fill().map(() => ({
      on_count: 0,
      off_count: 0,
      actions: []
    }));
    
    history.forEach(record => {
      const dayOfWeek = new Date(record.timestamp).getDay(); // 0 = Sunday, 6 = Saturday
      if (record.action === 'turn_on') {
        dailyStats[dayOfWeek].on_count++;
      } else if (record.action === 'turn_off') {
        dailyStats[dayOfWeek].off_count++;
      }
      dailyStats[dayOfWeek].actions.push(record);
    });
    
    // Format the response
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const result = weekdays.map((day, index) => ({
      day,
      date: new Date(new Date(startDate).setDate(startDate.getDate() + index)).toISOString().split('T')[0],
      on_count: dailyStats[index].on_count,
      off_count: dailyStats[index].off_count,
      total_actions: dailyStats[index].on_count + dailyStats[index].off_count,
      actions: dailyStats[index].actions
    }));
    
    res.json({
      device_id: deviceId,
      week,
      start_date: startDate.toISOString().split('T')[0],
      end_date: new Date(endDate.getTime() - 1).toISOString().split('T')[0], // Subtract 1ms to make it inclusive
      days: result,
      total_actions: history.length
    });
  } catch (err) {
    logger.error(`Error fetching weekly control history for device ${req.params.deviceId}:`, err);
    res.status(500).json({ error: 'Error fetching weekly control history' });
  }
});

// Add a new device
app.post('/api/devices', async (req, res) => {
  try {
    const { id, name, type, deviceId, ip, local_key, version } = req.body;
    
    // If no id is provided, create id from deviceId or generate a random one
    const deviceId_final = id || deviceId || `device_${Date.now()}`;
    const version_final = version || '3.3';
    const local_key_final = local_key || 'default_key';
    
    // Validate required fields
    if (!name || !type || !ip) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if device already exists
    const existingDevice = await Device.findOne({ id: deviceId_final });
    if (existingDevice) {
      return res.status(409).json({ error: 'Device already exists' });
    }
    
    // Create new device
    const device = new Device({
      id: deviceId_final,
      name,
      type,
      device_id: deviceId || deviceId_final,
      ip,
      local_key: local_key_final,
      version: version_final
    });
    
    await device.save();
    
    // Initialize device status
    const status = new DeviceStatus({
      device_id: deviceId_final,
      state: false,
      online: false,
      last_updated: new Date()
    });
    
    await status.save();
    
    res.status(201).json({
      ...device.toObject(),
      status: {
        state: status.state,
        online: status.online,
        last_updated: status.last_updated
      }
    });
  } catch (err) {
    logger.error('Error adding device:', err);
    res.status(500).json({ error: 'Error adding device' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Control a device - supports both endpoints
app.post('/api/devices/:deviceId/control', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { state } = req.body;
    
    if (typeof state !== 'boolean') {
      return res.status(400).json({ error: 'State must be boolean' });
    }
    
    // Find the device
    const device = await Device.findOne({ id: deviceId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Update device status
    const status = await DeviceStatus.findOne({ device_id: deviceId });
    if (status) {
      status.state = state;
      status.last_updated = new Date();
      await status.save();
    } else {
      const newStatus = new DeviceStatus({
        device_id: deviceId,
        state,
        online: true,
        last_updated: new Date()
      });
      await newStatus.save();
    }
    
    // Simulate device control
    logger.info(`Controlling device ${deviceId}: ${state ? 'ON' : 'OFF'}`);
    
    // Save control history
    await new ControlHistory({
      device_id: deviceId,
      action: state ? 'turn_on' : 'turn_off',
      user: req.user ? req.user.username : 'system',
      timestamp: new Date()
    }).save();
    
    res.json({ 
      deviceId, 
      state,
      success: true,
      message: `Device has been ${state ? 'turned on' : 'turned off'}`
    });
  } catch (err) {
    logger.error(`Error controlling device: ${err}`);
    res.status(500).json({ error: 'Error controlling device' });
  }
});

// Get device status
app.get('/api/devices/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // Find the device
    const device = await Device.findOne({ id: deviceId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Get device status
    const status = await DeviceStatus.findOne({ device_id: deviceId });
    if (!status) {
      return res.status(404).json({ error: 'Device status not found' });
    }
    
    res.json({
      deviceId,
      name: device.name,
      type: device.type,
      ip: device.ip,
      state: status.state,
      online: status.online,
      last_updated: status.last_updated
    });
  } catch (err) {
    logger.error(`Error getting device status: ${err}`);
    res.status(500).json({ error: 'Error getting device status' });
  }
});

// Function to generate sample device control history
const generateSampleControlHistory = async () => {
  try {
    // Check if history data already exists
    const historyCount = await ControlHistory.countDocuments();
    if (historyCount > 0) {
      logger.info('Control history data already exists, skipping sample data generation');
      return;
    }

    logger.info('Generating sample device control history...');

    // Get device list
    const devices = await Device.find();
    if (devices.length === 0) {
      logger.info('No devices found to create control history');
      return;
    }

    // Create history data for the last 7 days
    const actions = ['turn_on', 'turn_off'];
    const users = ['admin', 'system', 'user1', 'user2'];
    
    for (const device of devices) {
      // Create 5-15 history records for each device
      const recordCount = Math.floor(Math.random() * 11) + 5;
      
      for (let i = 0; i < recordCount; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        const user = users[Math.floor(Math.random() * users.length)];
        
        // Create random timestamp within the last 7 days
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 7));
        timestamp.setHours(Math.floor(Math.random() * 24));
        timestamp.setMinutes(Math.floor(Math.random() * 60));
        
        // Create history record
        const history = new ControlHistory({
          device_id: device.id,
          action,
          user,
          timestamp
        });
        
        await history.save();
      }
    }
    
    logger.info('Sample device control history created successfully');
  } catch (error) {
    logger.error('Error creating sample control history data:', error);
  }
};

// Start server
app.listen(PORT, () => {
  logger.info(`Device Control Service running on port ${PORT}`);
  
  // Generate sample data after server starts
  setTimeout(() => {
    generateSampleControlHistory();
  }, 10000); // Wait 10 seconds for other services to start
});

// Endpoint to synchronize devices from Data Collection Service
app.post('/api/devices/sync', async (req, res) => {
  try {
    // Get device list from Data Collection Service
    const dataCollectionUrl = process.env.DATA_COLLECTION_URL || 'http://data-collection:5000';
    const response = await axios.get(`${dataCollectionUrl}/api/devices`);
    const devices = response.data;
    
    let syncResult = {
      total: devices.length,
      created: 0,
      updated: 0,
      failed: 0,
      details: []
    };
    
    // Synchronize each device
    for (const deviceData of devices) {
      try {
        // Check if device already exists
        let device = await Device.findOne({ id: deviceData.id });
        
        if (device) {
          // Update device
          device.name = deviceData.name;
          device.type = deviceData.type;
          device.device_id = deviceData.device_id;
          device.ip = deviceData.ip;
          device.local_key = deviceData.local_key;
          device.version = deviceData.version;
          await device.save();
          
          syncResult.updated++;
          syncResult.details.push({
            id: deviceData.id,
            name: deviceData.name,
            status: 'updated'
          });
        } else {
          // Create new device
          device = new Device({
            id: deviceData.id,
            name: deviceData.name,
            type: deviceData.type,
            device_id: deviceData.device_id,
            ip: deviceData.ip,
            local_key: deviceData.local_key,
            version: deviceData.version
          });
          await device.save();
          
          // Create default device status
          const status = new DeviceStatus({
            device_id: deviceData.id,
            state: false,
            online: false,
            last_updated: new Date()
          });
          await status.save();
          
          syncResult.created++;
          syncResult.details.push({
            id: deviceData.id,
            name: deviceData.name,
            status: 'created'
          });
        }
      } catch (error) {
        logger.error(`Error syncing device ${deviceData.id}:`, error);
        syncResult.failed++;
        syncResult.details.push({
          id: deviceData.id,
          name: deviceData.name,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    res.json({
      message: 'Device synchronization completed',
      result: syncResult
    });
  } catch (error) {
    logger.error('Error syncing devices:', error);
    res.status(500).json({
      error: 'Error syncing devices',
      message: error.message
    });
  }
});

// Add PUT method for device control as alternative path
app.put('/api/devices/:deviceId/control', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { state } = req.body;
    
    if (typeof state !== 'boolean') {
      return res.status(400).json({ error: 'State must be boolean' });
    }
    
    // Find the device
    const device = await Device.findOne({ id: deviceId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Update device status
    const status = await DeviceStatus.findOne({ device_id: deviceId });
    if (status) {
      status.state = state;
      status.last_updated = new Date();
      await status.save();
    } else {
      const newStatus = new DeviceStatus({
        device_id: deviceId,
        state,
        online: true,
        last_updated: new Date()
      });
      await newStatus.save();
    }
    
    // Simulate device control
    logger.info(`Controlling device ${deviceId}: ${state ? 'ON' : 'OFF'}`);
    
    // Save control history
    await new ControlHistory({
      device_id: deviceId,
      action: state ? 'turn_on' : 'turn_off',
      user: req.user ? req.user.username : 'system',
      timestamp: new Date()
    }).save();
    
    res.json({ 
      deviceId, 
      state,
      success: true,
      message: `Device has been ${state ? 'turned on' : 'turned off'}`
    });
  } catch (err) {
    logger.error(`Error controlling device: ${err}`);
    res.status(500).json({ error: 'Error controlling device' });
  }
});
