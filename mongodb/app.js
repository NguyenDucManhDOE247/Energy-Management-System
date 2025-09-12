require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// JWT Verification
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'No authentication token provided' });
  }
};

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Schemas for models
const DailySummarySchema = new mongoose.Schema({
  date: { type: String, required: true },
  device_id: { type: String, required: true },
  total_energy: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  carbon_emission: { type: Number, default: 0 },
  usage_hours: { type: Number, default: 0 },
  peak_power: { type: Number, default: 0 },
  average_power: { type: Number, default: 0 },
});

const MonthlySummarySchema = new mongoose.Schema({
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  device_id: { type: String, required: true },
  total_energy: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  carbon_emission: { type: Number, default: 0 },
  usage_hours: { type: Number, default: 0 },
  peak_power: { type: Number, default: 0 },
  average_power: { type: Number, default: 0 },
});

const YearlySummarySchema = new mongoose.Schema({
  year: { type: Number, required: true },
  device_id: { type: String, required: true },
  total_energy: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  carbon_emission: { type: Number, default: 0 },
  usage_hours: { type: Number, default: 0 },
  peak_power: { type: Number, default: 0 },
  average_power: { type: Number, default: 0 },
});

// Create models
const DailySummary = mongoose.model('DailySummary', DailySummarySchema);
const MonthlySummary = mongoose.model('MonthlySummary', MonthlySummarySchema);
const YearlySummary = mongoose.model('YearlySummary', YearlySummarySchema);

// API to insert sample data (admin only)
app.post('/api/admin/insert-sample-data', authenticateJWT, async (req, res) => {
  try {
    // Check admin permissions
    if (req.user.username !== 'admin') {
      return res.status(403).json({ error: 'No permission to perform this action' });
    }
    
    const { collection, data } = req.body;
    
    if (!collection || !data) {
      return res.status(400).json({ error: 'Missing collection or data information' });
    }
    
    let result;
    
    switch (collection) {
      case 'dailysummaries':
        result = await DailySummary.findOneAndUpdate(
          { date: data.date, device_id: data.device_id }, 
          data, 
          { upsert: true, new: true }
        );
        break;
      case 'monthlysummaries':
        result = await MonthlySummary.findOneAndUpdate(
          { month: data.month, year: data.year, device_id: data.device_id }, 
          data, 
          { upsert: true, new: true }
        );
        break;
      case 'yearlysummaries':
        result = await YearlySummary.findOneAndUpdate(
          { year: data.year, device_id: data.device_id }, 
          data, 
          { upsert: true, new: true }
        );
        break;
      default:
        return res.status(400).json({ error: 'Invalid collection' });
    }
    
    res.status(200).json({ message: 'Data added successfully', data: result });
  } catch (error) {
    console.error('Error adding sample data:', error);
    res.status(500).json({ error: 'Error adding sample data' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`MongoDB Service running on port ${PORT}`);
});
