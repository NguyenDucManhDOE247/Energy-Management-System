const express = require('express');
const mongoose = require('mongoose');
const winston = require('winston');
const cors = require('cors');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// MongoDB connection
mongoose.connect('mongodb://mongodb:27017/ems', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  logger.info('Connected to MongoDB');
  // Generate sample data after connection
  generateSampleData();
})
.catch(err => {
  logger.error('MongoDB connection error:', err);
});

// Define schemas and models
const dailySummarySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  totalConsumption: { type: Number, required: true },
  peakDemand: { type: Number, required: true },
  deviceContribution: {
    type: Map,
    of: Number
  },
  costEstimate: { type: Number, required: true }
});

const weeklySummarySchema = new mongoose.Schema({
  week: { type: String, required: true }, // Format: YYYY-WW
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalConsumption: { type: Number, required: true },
  averageDailyConsumption: { type: Number, required: true },
  costEstimate: { type: Number, required: true },
  deviceContribution: {
    type: Map,
    of: Number
  }
});

const monthlySummarySchema = new mongoose.Schema({
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  totalConsumption: { type: Number, required: true },
  averageDailyConsumption: { type: Number, required: true },
  costEstimate: { type: Number, required: true },
  comparisonToPrevious: { type: Number }
});

const yearlySummarySchema = new mongoose.Schema({
  year: { type: Number, required: true },
  totalConsumption: { type: Number, required: true },
  averageMonthlyConsumption: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  monthlyBreakdown: {
    type: Map,
    of: Number
  }
});

const DailySummary = mongoose.model('DailySummary', dailySummarySchema);
const WeeklySummary = mongoose.model('WeeklySummary', weeklySummarySchema);
const MonthlySummary = mongoose.model('MonthlySummary', monthlySummarySchema);
const YearlySummary = mongoose.model('YearlySummary', yearlySummarySchema);

// Function to generate sample data
async function generateSampleData() {
  try {
    // Clear existing data
    await DailySummary.deleteMany({});
    await WeeklySummary.deleteMany({});
    await MonthlySummary.deleteMany({});
    await YearlySummary.deleteMany({});

    logger.info('Generating sample data...');

    // Generate Daily Summaries for the last 30 days
    const dailySummaries = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const deviceContribution = new Map();
      deviceContribution.set('device1', Math.random() * 10 + 5);
      deviceContribution.set('device2', Math.random() * 8 + 3);
      deviceContribution.set('device3', Math.random() * 6 + 2);
      
      const totalConsumption = Array.from(deviceContribution.values()).reduce((a, b) => a + b, 0);
      
      dailySummaries.push({
        date,
        totalConsumption,
        peakDemand: totalConsumption * (0.7 + Math.random() * 0.3),
        deviceContribution,
        costEstimate: totalConsumption * 0.15
      });
    }
    await DailySummary.insertMany(dailySummaries);
    logger.info(`Created ${dailySummaries.length} daily summaries`);

    // Generate Weekly Summaries for the last 8 weeks
    const weeklySummaries = [];
    for (let i = 0; i < 8; i++) {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - (today.getDay() + 7 * i));
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      
      const deviceContribution = new Map();
      deviceContribution.set('device1', Math.random() * 50 + 30);
      deviceContribution.set('device2', Math.random() * 40 + 20);
      deviceContribution.set('device3', Math.random() * 30 + 15);
      
      const totalConsumption = Array.from(deviceContribution.values()).reduce((a, b) => a + b, 0);
      
      // Format week as YYYY-WW
      const weekYear = startDate.getFullYear();
      const weekNum = Math.ceil((((startDate - new Date(weekYear, 0, 1)) / 86400000) + 1) / 7);
      const weekFormatted = `${weekYear}-${weekNum.toString().padStart(2, '0')}`;
      
      weeklySummaries.push({
        week: weekFormatted,
        startDate,
        endDate,
        totalConsumption,
        averageDailyConsumption: totalConsumption / 7,
        costEstimate: totalConsumption * 0.15,
        deviceContribution
      });
    }
    await WeeklySummary.insertMany(weeklySummaries);
    logger.info(`Created ${weeklySummaries.length} weekly summaries`);

    // Generate Monthly Summaries for the last 12 months
    const monthlySummaries = [];
    for (let i = 0; i < 12; i++) {
      const today = new Date();
      const month = (today.getMonth() - i + 12) % 12;
      const year = today.getFullYear() - Math.floor((today.getMonth() - i + 12) / 12);
      
      const totalConsumption = 300 + Math.random() * 200;
      
      monthlySummaries.push({
        month: month + 1, // Month is 1-12 for readability
        year,
        totalConsumption,
        averageDailyConsumption: totalConsumption / 30,
        costEstimate: totalConsumption * 0.15,
        comparisonToPrevious: (Math.random() * 0.4) - 0.2 // Between -20% and +20%
      });
    }
    await MonthlySummary.insertMany(monthlySummaries);
    logger.info(`Created ${monthlySummaries.length} monthly summaries`);

    // Generate Yearly Summaries for the last 5 years
    const yearlySummaries = [];
    for (let i = 0; i < 5; i++) {
      const year = new Date().getFullYear() - i;
      
      const monthlyBreakdown = new Map();
      let totalConsumption = 0;
      
      for (let month = 1; month <= 12; month++) {
        const consumption = 300 + Math.random() * 200;
        monthlyBreakdown.set(month.toString(), consumption);
        totalConsumption += consumption;
      }
      
      yearlySummaries.push({
        year,
        totalConsumption,
        averageMonthlyConsumption: totalConsumption / 12,
        totalCost: totalConsumption * 0.15,
        monthlyBreakdown
      });
    }
    await YearlySummary.insertMany(yearlySummaries);
    logger.info(`Created ${yearlySummaries.length} yearly summaries`);

    logger.info('Sample data generation complete');
  } catch (error) {
    logger.error('Error generating sample data:', error);
  }
}

// API Routes
app.get('/api/data/daily', async (req, res) => {
  try {
    const data = await DailySummary.find().sort({ date: -1 });
    res.json(data);
  } catch (error) {
    logger.error('Error fetching daily analytics:', error);
    res.status(500).json({ error: 'Failed to fetch daily analytics' });
  }
});

app.get('/api/data/weekly', async (req, res) => {
  try {
    const { week } = req.query;
    let query = {};
    
    if (week) {
      query.week = week;
    }
    
    const data = await WeeklySummary.find(query).sort({ week: -1 });
    res.json(data);
  } catch (error) {
    logger.error('Error fetching weekly analytics:', error);
    res.status(500).json({ error: 'Failed to fetch weekly analytics' });
  }
});

app.get('/api/analytics/monthly', async (req, res) => {
  try {
    const { month, year, device_id } = req.query;
    let query = {};
    
    if (month) {
      query.month = parseInt(month);
    }
    
    if (year) {
      query.year = parseInt(year);
    }
    
    const data = await MonthlySummary.find(query).sort({ year: -1, month: -1 });
    
    // Filter by device_id if specified (assuming sample data creation)
    if (device_id) {
      // In a real scenario, you would have device contribution data
      // This is just a sample to ensure API works
      const filteredData = data.map(item => ({
        ...item._doc,
        totalConsumption: item.totalConsumption * 0.3, // Simulation: this device contributes 30%
        deviceContribution: { [device_id]: item.totalConsumption * 0.3 }
      }));
      
      return res.json(filteredData);
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Error fetching monthly analytics:', error);
    res.status(500).json({ error: 'Failed to fetch monthly analytics' });
  }
});

app.get('/api/analytics/yearly', async (req, res) => {
  try {
    const { year, device_id } = req.query;
    let query = {};
    
    if (year) {
      query.year = parseInt(year);
    }
    
    const data = await YearlySummary.find(query).sort({ year: -1 });
    
    // Filter by device_id if specified
    if (device_id) {
      // Similar to monthly, this is a sample
      const filteredData = data.map(item => ({
        ...item._doc,
        totalConsumption: item.totalConsumption * 0.3,
        deviceContribution: { [device_id]: item.totalConsumption * 0.3 }
      }));
      
      return res.json(filteredData);
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Error fetching yearly analytics:', error);
    res.status(500).json({ error: 'Failed to fetch yearly analytics' });
  }
});

app.get('/api/data/monthly', async (req, res) => {
  try {
    const data = await MonthlySummary.find().sort({ year: -1, month: -1 });
    res.json(data);
  } catch (error) {
    logger.error('Error fetching monthly analytics:', error);
    res.status(500).json({ error: 'Failed to fetch monthly analytics' });
  }
});

app.get('/api/data/yearly', async (req, res) => {
  try {
    const data = await YearlySummary.find().sort({ year: -1 });
    res.json(data);
  } catch (error) {
    logger.error('Error fetching yearly analytics:', error);
    res.status(500).json({ error: 'Failed to fetch yearly analytics' });
  }
});

// API routes for API Gateway
app.get('/api/analytics/daily', async (req, res) => {
  try {
    const { date, device_id } = req.query;
    let query = {};
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    const data = await DailySummary.find(query).sort({ date: -1 });
    
    // Filter by device_id if specified
    if (device_id) {
      const filteredData = data.map(item => {
        if (item.deviceContribution && item.deviceContribution.has(device_id)) {
          return {
            ...item._doc,
            totalConsumption: item.deviceContribution.get(device_id),
            deviceContribution: { [device_id]: item.deviceContribution.get(device_id) }
          };
        }
        return null;
      }).filter(item => item !== null);
      
      return res.json(filteredData);
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Error fetching daily analytics:', error);
    res.status(500).json({ error: 'Failed to fetch daily analytics' });
  }
});

// Add route for API Gateway - /api/analytics/weekly
app.get('/api/analytics/weekly', async (req, res) => {
  try {
    const { week, device_id } = req.query;
    let query = {};
    
    if (week) {
      query.week = week;
    }
    
    const data = await WeeklySummary.find(query).sort({ week: -1 });
    
    // Filter by device_id if specified
    if (device_id) {
      const filteredData = data.map(item => {
        if (item.deviceContribution && item.deviceContribution.has(device_id)) {
          return {
            ...item._doc,
            totalConsumption: item.deviceContribution.get(device_id),
            deviceContribution: { [device_id]: item.deviceContribution.get(device_id) }
          };
        }
        // If there's no specific device data, return a sample
        return {
          ...item._doc,
          totalConsumption: item.totalConsumption * 0.3, // Simulation: this device contributes 30%
          deviceContribution: { [device_id]: item.totalConsumption * 0.3 }
        };
      });
      
      return res.json(filteredData);
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Error fetching weekly analytics:', error);
    res.status(500).json({ error: 'Failed to fetch weekly analytics' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'analytics' });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Analytics service running on port ${PORT}`);
  
  // Log available routes
  app._router.stack
    .filter(r => r.route)
    .map(r => {
      logger.info(`Route: ${Object.keys(r.route.methods).join(', ').toUpperCase()} ${r.route.path}`);
    });
});

module.exports = app;
