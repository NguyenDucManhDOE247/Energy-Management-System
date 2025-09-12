require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 3000;
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:8000';

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ui-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'ui-service.log' })
  ],
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/components', express.static(path.join(__dirname, 'public', 'components')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Test API Gateway connection
app.get('/test-api-gateway', async (req, res) => {
  try {
    const response = await axios.get(`${API_GATEWAY_URL}/health`, { timeout: 5000 });
    res.json({
      success: true,
      apiGatewayUrl: API_GATEWAY_URL,
      response: response.data
    });
  } catch (error) {
    res.json({
      success: false,
      apiGatewayUrl: API_GATEWAY_URL,
      error: error.message
    });
  }
});

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.redirect('/login');
  }
  
  // Store token for API requests
  res.locals.token = token;
  next();
};

// Helper function to make authenticated API requests
const apiRequest = async (method, url, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${API_GATEWAY_URL}${url}`,
      headers: {},
      // Add timeout to prevent hanging requests
      timeout: 10000 // Increased timeout to 10 seconds
    };
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    // Log detailed error information
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx
      logger.error(`API request error (${method} ${url}): Status ${error.response.status} - ${error.message}`);
      logger.error(`Response data: ${JSON.stringify(error.response.data || {})}`);
    } else if (error.request) {
      // The request was made but no response was received
      logger.error(`API request timeout/network error (${method} ${url}): ${error.message}`);
      logger.error(`Target URL was: ${API_GATEWAY_URL}${url}`);
    } else {
      // Something happened in setting up the request
      logger.error(`API request setup error (${method} ${url}): ${error.message}`);
    }
    throw error;
  }
};

// Routes
// Login page
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Remove direct login endpoint as per request

// Login form submission
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    logger.info(`Attempting login for user: ${username}`);
    logger.info(`API Gateway URL: ${API_GATEWAY_URL}`);
    
    // Debug payload - but don't log the password for security
    logger.info(`Login attempt for username: ${username}`);
    
    // Make sure we have valid values
    if (!username || !password) {
      throw new Error('Username and password are required');
    }
    
    // Direct axios call to API Gateway authentication endpoint
    const loginResponse = await axios({
      method: 'post',
      url: `${API_GATEWAY_URL}/auth/login`,
      data: { username, password },
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    logger.info(`Login response status: ${loginResponse.status}`);
    
    if (loginResponse.status !== 200) {
      throw new Error('Authentication failed');
    }
    
    const response = loginResponse.data;
    logger.info('Login successful, setting token');
    
    // Set cookie
    res.cookie('token', response.token, {
      httpOnly: true,
      maxAge: 3600000 // 1 hour
    });
    
    res.redirect('/');
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    let errorMessage = 'Login failed. Please check your username and password.';
    
    // Try to get more specific error message from API response
    if (error.response && error.response.data) {
      logger.error(`API response status: ${error.response.status}`);
      logger.error(`API response data: ${JSON.stringify(error.response.data)}`);
      
      if (error.response.data.message) {
        errorMessage = error.response.data.message;
      }
    } else {
      logger.error(`Full error: ${error.stack}`);
    }
    
    res.render('login', { error: errorMessage });
  }
});

// Logout
app.get('/logout', (req, res) => {
  try {
    res.clearCookie('token');
    logger.info('User logged out successfully');
    return res.redirect('/login');
  } catch (error) {
    logger.error('Error during logout:', error);
    return res.redirect('/login');
  }
});

// Home page (dashboard)
app.get('/', isAuthenticated, async (req, res) => {
  try {
    // Fetch current energy data
    let energyData = [];
    try {
      energyData = await apiRequest('get', '/api/data/current');
    } catch (e) {
      logger.error('Error fetching energy data:', e);
      energyData = []; // Default empty array if error
    }
    
    // Fetch device list
    let devices = [];
    try {
      devices = await apiRequest('get', '/api/devices', null, res.locals.token);
    } catch (e) {
      logger.error('Error fetching devices:', e);
      devices = []; // Default empty array if error
    }
    
    // Fetch summary data
    const today = new Date().toISOString().split('T')[0];
    let summaryData = {};
    try {
      summaryData = await apiRequest('get', `/api/analytics/summary?timeframe=daily&date=${today}`);
    } catch (e) {
      logger.error('Error fetching summary data:', e);
      summaryData = {
        totalConsumption: 0,
        averageConsumption: 0,
        peakConsumption: 0,
        trend: "stable",
        devices: []
      }; // Default data if error
    }
    
    res.render('dashboard', {
      energyData: energyData || [],
      devices: devices || [],
      summaryData: summaryData || {},
      page: 'dashboard'
    });
  } catch (error) {
    res.render('error', {
      message: 'Unable to load dashboard data',
      error: error.message
    });
  }
});

// Explicit dashboard route to match frontend references
app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    // Fetch current energy data
    let energyData = [];
    try {
      energyData = await apiRequest('get', '/api/data/current');
    } catch (e) {
      logger.error('Error fetching energy data:', e);
      energyData = []; // Default empty array if error
    }
    
    // Fetch device list
    let devices = [];
    try {
      devices = await apiRequest('get', '/api/devices', null, res.locals.token);
    } catch (e) {
      logger.error('Error fetching devices:', e);
      devices = []; // Default empty array if error
    }
    
    // Fetch summary data
    const today = new Date().toISOString().split('T')[0];
    let summaryData = {};
    try {
      summaryData = await apiRequest('get', `/api/analytics/summary?timeframe=daily&date=${today}`);
    } catch (e) {
      logger.error('Error fetching summary data:', e);
      summaryData = {
        totalConsumption: 0,
        averageConsumption: 0,
        peakConsumption: 0,
        trend: "stable",
        devices: []
      }; // Default data if error
    }
    
    res.render('dashboard', {
      energyData: energyData || [],
      devices: devices || [],
      summaryData: summaryData || {},
      page: 'dashboard'
    });
  } catch (error) {
    res.render('error', {
      message: 'Unable to load dashboard data',
      error: error.message
    });
  }
});

// Energy Status page
app.get('/energy-status', isAuthenticated, async (req, res) => {
  try {
    // Fetch current energy data
    let energyData = [];
    try {
      energyData = await apiRequest('get', '/api/data/current');
    } catch (e) {
      logger.error('Error fetching energy data:', e);
      energyData = []; // Default empty array if error
    }
    
    // Fetch device list
    let devices = [];
    try {
      devices = await apiRequest('get', '/api/devices', null, res.locals.token);
    } catch (e) {
      logger.error('Error fetching devices:', e);
      devices = []; // Default empty array if error
    }
    
    res.render('energy-status', {
      energyData: energyData || [], // Ensure energyData is always defined even if empty
      devices: devices || [],
      page: 'energy-status'
    });
  } catch (error) {
    res.render('error', {
      message: 'Unable to load energy status data',
      error: error.message
    });
  }
});

// Database Report page
app.get('/database-report', isAuthenticated, async (req, res) => {
  try {
    // Get query parameters
    const deviceId = req.query.device || 'all';
    const from = req.query.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default 7 days ago
    const to = req.query.to || new Date().toISOString().split('T')[0]; // Default today
    
    // Fetch device list
    let devices = [];
    try {
      devices = await apiRequest('get', '/api/devices', null, res.locals.token);
    } catch (e) {
      logger.error('Error fetching devices:', e);
      devices = []; // Default empty array if error
    }
    
    // Fetch historical data
    let url = `/api/data/historical?from=${from}&to=${to}`;
    if (deviceId !== 'all') {
      url += `&device_id=${deviceId}`;
    }
    
    let data = [];
    try {
      data = await apiRequest('get', url);
    } catch (e) {
      logger.error('Error fetching historical data:', e);
      data = []; // Default empty array if error
    }
    
    res.render('database-report', {
      devices: devices || [],
      deviceId,
      from,
      to,
      data: data || [], // Ensure data is always defined even if empty
      page: 'database-report'
    });
  } catch (error) {
    res.render('error', {
      message: 'Unable to load report data',
      error: error.message
    });
  }
});

// Summary page
app.get('/summary', isAuthenticated, async (req, res) => {
  try {
    // Get query parameters
    const timeframe = req.query.timeframe || 'daily';
    const from = req.query.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default 30 days ago
    const to = req.query.to || new Date().toISOString().split('T')[0]; // Default today
    
    // Fetch device list
    let devices = [];
    try {
      devices = await apiRequest('get', '/api/devices', null, res.locals.token);
    } catch (e) {
      logger.error('Error fetching devices:', e);
      devices = []; // Default empty array if error
    }
    
    // Fetch summary data
    let summaryData = {};
    try {
      summaryData = await apiRequest('get', `/api/analytics/summary?timeframe=${timeframe}&from=${from}&to=${to}`);
    } catch (e) {
      logger.error('Error fetching summary data:', e);
      summaryData = {
        totalConsumption: 0,
        averageConsumption: 0,
        peakConsumption: 0,
        trend: "stable",
        devices: []
      }; // Default data if error
    }
    
    // Fetch cost data
    let costData = {};
    try {
      costData = await apiRequest('get', `/api/analytics/cost?from=${from}&to=${to}&timeframe=${timeframe}`);
    } catch (e) {
      logger.error('Error fetching cost data:', e);
      costData = {
        totalCost: 0,
        averageCost: 0,
        costByDevice: []
      }; // Default data if error
    }
    
    // Fetch carbon emission data
    let carbonData = {};
    try {
      carbonData = await apiRequest('get', `/api/analytics/carbon?from=${from}&to=${to}&timeframe=${timeframe}`);
    } catch (e) {
      logger.error('Error fetching carbon data:', e);
      carbonData = {
        totalEmissions: 0,
        averageEmissions: 0,
        emissionsByDevice: []
      }; // Default data if error
    }
    
    // Define all variables needed by the template to prevent undefined errors
    const startDate = from;
    const endDate = to;
    const timeLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const energyValues = [5, 4, 6, 5, 7, 8, 7]; // Sample data
    const deviceStats = devices.map(d => ({ 
      name: d.name || 'Unnamed device', 
      energy: Math.random() * 100, 
      cost: Math.random() * 20,
      percentage: Math.floor(Math.random() * 100),
      trend: Math.floor(Math.random() * 20) - 10  // Random trend between -10 and 10
    }));
    
    // Define other variables required by the template
    const totalEnergy = summaryData.totalConsumption || 124.5;  // Default value if not available
    const estimatedCost = costData.totalCost || 18.75;  // Default value if not available
    const efficiencyRating = 75;  // Default efficiency rating
    const peakPower = summaryData.peakConsumption || 350;  // Default value if not available
    
    res.render('summary', {
      devices: devices || [],
      timeframe,
      from,
      to,
      startDate,
      endDate,
      summaryData: summaryData || {},
      costData: costData || {},
      carbonData: carbonData || {},
      timeLabels,
      energyValues,
      deviceStats,
      totalEnergy,
      estimatedCost,
      efficiencyRating,
      peakPower,
      page: 'summary'
    });
  } catch (error) {
    res.render('error', {
      message: 'Unable to load summary data',
      error: error.message
    });
  }
});

// Controller page
app.get('/controller', isAuthenticated, async (req, res) => {
  try {
    // Fetch device list with status
    let devices = [];
    try {
      devices = await apiRequest('get', '/api/devices', null, res.locals.token);
    } catch (e) {
      logger.error('Error fetching devices:', e);
      devices = []; // Default empty array if error
    }
    
    res.render('controller', {
      devices: devices || [],
      page: 'controller'
    });
  } catch (error) {
    res.render('error', {
      message: 'Unable to load device data',
      error: error.message
    });
  }
});

// Toggle device API endpoint
app.post('/controller/toggle/:deviceId', isAuthenticated, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    
    // Call the device control API
    const result = await apiRequest(
      'put', 
      `/api/devices/${deviceId}/toggle`,
      {},
      res.locals.token
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Unable to control device' });
  }
});

// Notifications page
app.get('/notifications', isAuthenticated, async (req, res) => {
  try {
    // Fetch notifications
    const notifications = await apiRequest('get', '/api/notifications', null, res.locals.token);
    
    res.render('notifications', {
      notifications,
      page: 'notifications'
    });
  } catch (error) {
    res.render('error', {
      message: 'Unable to load notification data',
      error: error.message
    });
  }
});

// API Proxy endpoints (for AJAX calls from frontend)
app.get('/api/proxy/data/current', async (req, res) => {
  try {
    const data = await apiRequest('get', '/api/data/current');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current data' });
  }
});

// API endpoint for comparing device data
app.get('/api/proxy/analytics/compare', isAuthenticated, async (req, res) => {
  try {
    const { devices, timeframe, from, to } = req.query;
    const url = `/api/analytics/compare?devices=${devices}&timeframe=${timeframe}&from=${from}&to=${to}`;
    const data = await apiRequest('get', url, null, res.locals.token);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

app.get('/api/proxy/devices', isAuthenticated, async (req, res) => {
  try {
    const data = await apiRequest('get', '/api/devices', null, res.locals.token);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Add missing notifications unread count endpoint
app.get('/api/notifications/unread-count', async (req, res) => {
  try {
    const data = await apiRequest('get', '/api/notifications/unread', null, res.locals.token);
    res.json({ count: data.length || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unread notifications', count: 0 });
  }
});

// Add missing device toggle endpoint
app.post('/api/proxy/devices/:deviceId/toggle', isAuthenticated, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const data = await apiRequest('put', `/api/devices/${deviceId}/control`, req.body, res.locals.token);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle device' });
  }
});

// Device details page
app.get('/devices/:deviceId', isAuthenticated, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // Fetch device details
    const device = await apiRequest('get', `/api/devices/${deviceId}`, null, res.locals.token);
    
    // Fetch current data for this device
    const deviceData = await apiRequest('get', `/api/data/device/${deviceId}?limit=1`, null, res.locals.token);
    
    res.render('device-details', {
      device,
      deviceData: deviceData && deviceData.length > 0 ? deviceData[0] : null,
      error: null
    });
  } catch (error) {
    logger.error(`Error fetching device details: ${error.message}`);
    res.render('device-details', {
      device: { id: req.params.deviceId, name: 'Device not found' },
      deviceData: null,
      error: 'Unable to load device information'
    });
  }
});

// Device control history page
app.get('/devices/:deviceId/history', isAuthenticated, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // Fetch device details
    const device = await apiRequest('get', `/api/devices/${deviceId}`, null, res.locals.token);
    
    // Fetch control history
    const history = await apiRequest('get', `/api/devices/${deviceId}/history`, null, res.locals.token);
    
    res.render('device-history', {
      device,
      history: history || [],
      error: null
    });
  } catch (error) {
    logger.error(`Error fetching device control history: ${error.message}`);
    res.render('device-history', {
      device: { id: req.params.deviceId, name: 'Device not found' },
      history: [],
      error: 'Unable to load device control history'
    });
  }
});

// Analytics pages
app.get('/analytics/:timeframe', isAuthenticated, async (req, res) => {
  try {
    const { timeframe } = req.params;
    const { from, to, device_id } = req.query;
    
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(timeframe)) {
      return res.status(400).render('error', {
        message: 'Invalid parameter',
        error: 'Timeframe must be one of these values: daily, weekly, monthly, yearly'
      });
    }
    
    let analyticsData = [];
    try {
      // Build query string with provided parameters
      let queryString = '';
      if (from) queryString += `&from=${from}`;
      if (to) queryString += `&to=${to}`;
      if (device_id) queryString += `&device_id=${device_id}`;
      
      // Call corresponding analytics API
      analyticsData = await apiRequest('get', `/api/analytics/${timeframe}?${queryString.substr(1)}`, null, res.locals.token);
    } catch (e) {
      logger.error(`Error fetching analytics data: ${e.message}`);
      analyticsData = []; // Default to empty array on error
    }
    
    // Get device list for filter display
    let devices = [];
    try {
      devices = await apiRequest('get', '/api/devices', null, res.locals.token);
    } catch (e) {
      logger.error(`Error fetching devices for analytics: ${e.message}`);
      devices = []; // Default to empty array on error
    }
    
    res.render('analytics', {
      timeframe,
      from: from || '',
      to: to || '',
      device_id: device_id || '',
      analyticsData,
      devices,
      error: null
    });
  } catch (error) {
    logger.error(`Error rendering analytics page: ${error.message}`);
    res.status(500).render('error', {
      message: 'Error loading analytics page',
      error: error.message
    });
  }
});

// Error handling
app.use((req, res, next) => {
  res.status(404).render('error', {
    message: 'Page not found',
    error: 'The page you requested does not exist'
  });
});

app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).render('error', {
    message: 'Server error',
    error: err.message
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`UI Service running on port ${PORT}`);
});

// Check if server is running
app.on('error', (error) => {
  logger.error(`Unable to start UI Service: ${error}`);
});
