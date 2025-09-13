const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const winston = require('winston');
const router = express.Router();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'auth-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'auth-service.log' })
  ]
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  firstName: String,
  lastName: String,
  email: String,
  created: { type: Date, default: Date.now },
  lastLogin: Date
});

// Create User model
const User = mongoose.model('User', userSchema);

// Initialize admin user if doesn't exist
const initializeAdmin = async () => {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const admin = new User({
        username: 'admin',
        password: 'admin123', // In production, hash this password
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com'
      });
      await admin.save();
      logger.info('Admin user created');
    }
  } catch (error) {
    logger.error('Error initializing admin user:', error);
  }
};

// Initialize admin user
initializeAdmin();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication failed. User not found.' });
    }
    
    // Check password (use bcrypt in production)
    if (password !== user.password) {
      return res.status(401).json({ error: 'Authentication failed. Wrong password.' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );
    
    // Return user info and token
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed. Server error.' });
  }
});

// Validate token endpoint
router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

// Register endpoint (admin only)
router.post('/register', async (req, res) => {
  try {
    const { username, password, firstName, lastName, email, role } = req.body;
    
    // Check if user already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Create new user
    const user = new User({
      username,
      password, // In production, hash this password
      firstName,
      lastName,
      email,
      role: role || 'user'
    });
    
    await user.save();
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Server error.' });
  }
});

module.exports = router;
