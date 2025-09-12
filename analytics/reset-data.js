// Reset and re-add sample data
const mongoose = require('mongoose');
require('dotenv').config();

// Schema definitions
const dailySummarySchema = new mongoose.Schema({
  date: String,
  device_id: String,
  total_energy: Number,
  cost: Number,
  carbon_emission: Number,
  usage_hours: Number,
  peak_power: Number,
  average_power: Number
});

const monthlySummarySchema = new mongoose.Schema({
  month: Number,
  year: Number,
  device_id: String,
  total_energy: Number,
  cost: Number,
  carbon_emission: Number,
  usage_hours: Number,
  peak_power: Number,
  average_power: Number
});

const yearlySummarySchema = new mongoose.Schema({
  year: Number,
  device_id: String,
  total_energy: Number,
  cost: Number,
  carbon_emission: Number,
  usage_hours: Number,
  peak_power: Number,
  average_power: Number
});

// Models
const DailySummary = mongoose.model('DailySummary', dailySummarySchema);
const MonthlySummary = mongoose.model('MonthlySummary', monthlySummarySchema);
const YearlySummary = mongoose.model('YearlySummary', yearlySummarySchema);

// Connect to MongoDB
mongoose.connect('mongodb://mongodb:27017/ems', { 
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const resetAndAddSampleData = async () => {
  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await DailySummary.deleteMany({});
    await MonthlySummary.deleteMany({});
    await YearlySummary.deleteMany({});
    
    // Create sample data
    console.log('Adding sample data...');
    
    // Daily data
    const dailyData = [
      {
        date: '2025-09-01',
        device_id: 'device1',
        total_energy: 2.5,
        cost: 0.375,
        carbon_emission: 1.25,
        usage_hours: 2.0,
        peak_power: 1800,
        average_power: 1250
      },
      {
        date: '2025-09-01',
        device_id: 'device2',
        total_energy: 0.8,
        cost: 0.12,
        carbon_emission: 0.4,
        usage_hours: 1.5,
        peak_power: 900,
        average_power: 533
      },
      {
        date: '2025-09-01',
        device_id: 'device3',
        total_energy: 6.4,
        cost: 0.96,
        carbon_emission: 3.2,
        usage_hours: 8.0,
        peak_power: 1800,
        average_power: 800
      },
      {
        date: '2025-09-01',
        device_id: 'device4',
        total_energy: 1.5,
        cost: 0.225,
        carbon_emission: 0.75,
        usage_hours: 24.0,
        peak_power: 200,
        average_power: 62.5
      },
      {
        date: '2025-09-01',
        device_id: 'device5',
        total_energy: 1.0,
        cost: 0.15,
        carbon_emission: 0.5,
        usage_hours: 2.0,
        peak_power: 1000,
        average_power: 500
      }
    ];
    
    // Monthly data
    const monthlyData = [
      {
        month: 9,
        year: 2025,
        device_id: 'device1',
        total_energy: 65.0,
        cost: 9.75,
        carbon_emission: 32.5,
        usage_hours: 60.0,
        peak_power: 1900,
        average_power: 1083
      },
      {
        month: 9,
        year: 2025,
        device_id: 'device2',
        total_energy: 24.0,
        cost: 3.6,
        carbon_emission: 12.0,
        usage_hours: 45.0,
        peak_power: 950,
        average_power: 533
      },
      {
        month: 9,
        year: 2025,
        device_id: 'device3',
        total_energy: 180.0,
        cost: 27.0,
        carbon_emission: 90.0,
        usage_hours: 240.0,
        peak_power: 2000,
        average_power: 750
      },
      {
        month: 9,
        year: 2025,
        device_id: 'device4',
        total_energy: 45.0,
        cost: 6.75,
        carbon_emission: 22.5,
        usage_hours: 720.0,
        peak_power: 250,
        average_power: 62.5
      },
      {
        month: 9,
        year: 2025,
        device_id: 'device5',
        total_energy: 30.0,
        cost: 4.5,
        carbon_emission: 15.0,
        usage_hours: 60.0,
        peak_power: 1200,
        average_power: 500
      }
    ];
    
    // Yearly data
    const yearlyData = [
      {
        year: 2025,
        device_id: 'device1',
        total_energy: 750.0,
        cost: 112.5,
        carbon_emission: 375.0,
        usage_hours: 720.0,
        peak_power: 2000,
        average_power: 1042
      },
      {
        year: 2025,
        device_id: 'device2',
        total_energy: 292.0,
        cost: 43.8,
        carbon_emission: 146.0,
        usage_hours: 540.0,
        peak_power: 1000,
        average_power: 541
      },
      {
        year: 2025,
        device_id: 'device3',
        total_energy: 2160.0,
        cost: 324.0,
        carbon_emission: 1080.0,
        usage_hours: 2880.0,
        peak_power: 2000,
        average_power: 750
      },
      {
        year: 2025,
        device_id: 'device4',
        total_energy: 540.0,
        cost: 81.0,
        carbon_emission: 270.0,
        usage_hours: 8760.0,
        peak_power: 250,
        average_power: 61.6
      },
      {
        year: 2025,
        device_id: 'device5',
        total_energy: 365.0,
        cost: 54.75,
        carbon_emission: 182.5,
        usage_hours: 730.0,
        peak_power: 1200,
        average_power: 500
      }
    ];
    
    // Insert data
    await DailySummary.insertMany(dailyData);
    await MonthlySummary.insertMany(monthlyData);
    await YearlySummary.insertMany(yearlyData);
    
    console.log('Sample data inserted successfully!');
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Run the function
resetAndAddSampleData();

// Set a timeout to force exit if it takes too long
setTimeout(() => {
  console.error('Timeout: Script took too long to execute. Exiting...');
  process.exit(1);
}, 10000); // 10 seconds timeout
