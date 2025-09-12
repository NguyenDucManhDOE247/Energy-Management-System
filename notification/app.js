require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3003;

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'notification' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'notification.log' })
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

// Notification Schema
const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true, enum: ['info', 'warning', 'alert', 'success'] },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  deviceId: { type: String },
  user: { type: String },
  data: { type: mongoose.Schema.Types.Mixed }
});

const Notification = mongoose.model('Notification', notificationSchema);

// Notification Config Schema
const notificationConfigSchema = new mongoose.Schema({
  type: { type: String, required: true },
  threshold: { type: Number },
  enabled: { type: Boolean, default: true },
  sendEmail: { type: Boolean, default: false },
  emailRecipients: [{ type: String }]
});

const NotificationConfig = mongoose.model('NotificationConfig', notificationConfigSchema);

// Setup email transporter
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  
  // Verify connection
  transporter.verify()
    .then(() => logger.info('SMTP connection verified'))
    .catch(err => logger.error('SMTP connection error:', err));
} else {
  logger.warn('SMTP configuration incomplete, email notifications will not be sent');
}

// Socket.io connection
io.on('connection', (socket) => {
  logger.info('A client connected');
  
  socket.on('disconnect', () => {
    logger.info('A client disconnected');
  });
});

// Authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }

      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Helper function to send email
const sendEmail = async (notification, recipients) => {
  if (!transporter || !recipients || recipients.length === 0) {
    return;
  }
  
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: recipients.join(','),
      subject: `EMS Notification: ${notification.title}`,
      html: `
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        <p><strong>Type:</strong> ${notification.type}</p>
        <p><strong>Time:</strong> ${new Date(notification.timestamp).toLocaleString()}</p>
        ${notification.deviceId ? `<p><strong>Device ID:</strong> ${notification.deviceId}</p>` : ''}
      `
    };
    
    await transporter.sendMail(mailOptions);
    logger.info(`Email notification sent to ${recipients.join(', ')}`);
  } catch (error) {
    logger.error('Error sending email notification:', error);
  }
};

// Get unread notifications
app.get('/api/notifications/unread', async (req, res) => {
  try {
    // Query for unread notifications
    const notifications = await Notification.find({})
      .sort({ timestamp: -1 })
      .limit(50);
    
    res.json(notifications);
  } catch (err) {
    logger.error(`Error getting unread notifications: ${err}`);
    res.status(500).json({ error: 'Error fetching notification' });
  }
});

// API Routes
// Get all notifications
app.get('/api/notifications', authenticateJWT, async (req, res) => {
  try {
    // Query parameters
    const limit = parseInt(req.query.limit) || 50;
    const unreadOnly = req.query.unread === 'true';
    const type = req.query.type;
    
    // Build query
    const query = {};
    if (unreadOnly) {
      query.isRead = false;
    }
    if (type) {
      query.type = type;
    }
    
    const notifications = await Notification.find(query)
      .sort({ timestamp: -1 })
      .limit(limit);
    
    res.json(notifications);
  } catch (err) {
    logger.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Error fetching notifications' });
  }
});

// Get notification by ID
app.get('/api/notifications/:id', authenticateJWT, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (err) {
    logger.error(`Error fetching notification ${req.params.id}:`, err);
    res.status(500).json({ error: 'Error fetching notification' });
  }
});

// Create a new notification
app.post('/api/notifications', async (req, res) => {
  try {
    const { title, message, type, deviceId, user, data } = req.body;
    
    // Validate required fields
    if (!title || !message || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create notification
    const notification = new Notification({
      title,
      message,
      type,
      deviceId,
      user,
      data,
      timestamp: new Date(),
      isRead: false
    });
    
    await notification.save();
    
    // Emit to connected clients
    io.emit('notification', notification);
    
    // Check if email should be sent
    const config = await NotificationConfig.findOne({ type });
    if (config && config.enabled && config.sendEmail && config.emailRecipients.length > 0) {
      await sendEmail(notification, config.emailRecipients);
    }
    
    res.status(201).json(notification);
  } catch (err) {
    logger.error('Error creating notification:', err);
    res.status(500).json({ error: 'Error creating notification' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (err) {
    logger.error(`Error marking notification ${req.params.id} as read:`, err);
    res.status(500).json({ error: 'Error marking notification as read' });
  }
});

// Delete notification
app.delete('/api/notifications/:id', authenticateJWT, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.status(204).send();
  } catch (err) {
    logger.error(`Error deleting notification ${req.params.id}:`, err);
    res.status(500).json({ error: 'Error deleting notification' });
  }
});

// Get notification configs
app.get('/api/notification-configs', authenticateJWT, async (req, res) => {
  try {
    const configs = await NotificationConfig.find();
    res.json(configs);
  } catch (err) {
    logger.error('Error fetching notification configs:', err);
    res.status(500).json({ error: 'Error fetching notification configs' });
  }
});

// Create/Update notification config
app.post('/api/notification-configs', authenticateJWT, async (req, res) => {
  try {
    const { type, threshold, enabled, sendEmail, emailRecipients } = req.body;
    
    // Validate required fields
    if (!type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Find or create config
    let config = await NotificationConfig.findOne({ type });
    
    if (config) {
      // Update existing config
      config.threshold = threshold !== undefined ? threshold : config.threshold;
      config.enabled = enabled !== undefined ? enabled : config.enabled;
      config.sendEmail = sendEmail !== undefined ? sendEmail : config.sendEmail;
      config.emailRecipients = emailRecipients || config.emailRecipients;
    } else {
      // Create new config
      config = new NotificationConfig({
        type,
        threshold,
        enabled: enabled !== undefined ? enabled : true,
        sendEmail: sendEmail !== undefined ? sendEmail : false,
        emailRecipients: emailRecipients || []
      });
    }
    
    await config.save();
    
    res.status(201).json(config);
  } catch (err) {
    logger.error('Error creating/updating notification config:', err);
    res.status(500).json({ error: 'Error creating/updating notification config' });
  }
});

// Function to generate sample notifications for demonstration
const generateSampleNotifications = async () => {
  try {
    logger.info('Generating sample notifications...');
    
    // Check if we already have sample data
    const existingNotifications = await Notification.findOne({});
    if (existingNotifications) {
      logger.info('Sample notifications already exist, skipping generation');
      return;
    }
    
    // Sample notification types
    const notificationTypes = ['info', 'warning', 'alert', 'success'];
    
    // Sample devices
    const devices = [
      { id: 'device1', name: 'Induction Cooker' },
      { id: 'device2', name: 'Rice Cooker' },
      { id: 'device3', name: 'Air Conditioner' },
      { id: 'device4', name: 'Refrigerator' },
      { id: 'device5', name: 'Washing Machine' }
    ];
    
    // Sample notification templates
    const notificationTemplates = [
      {
        title: 'High Power Consumption',
        message: '{device} is consuming power above normal threshold',
        type: 'warning'
      },
      {
        title: 'Device Turned On',
        message: '{device} has been turned on successfully',
        type: 'info'
      },
      {
        title: 'Device Turned Off',
        message: '{device} has been turned off successfully',
        type: 'info'
      },
      {
        title: 'High Temperature Warning',
        message: 'Temperature of {device} exceeds safety threshold',
        type: 'alert'
      },
      {
        title: 'Energy Saving',
        message: '{device} is operating in energy saving mode',
        type: 'success'
      },
      {
        title: 'Connection Error',
        message: 'Unable to connect to {device}',
        type: 'alert'
      },
      {
        title: 'Power Consumption Report',
        message: 'Weekly power consumption report has been generated',
        type: 'info'
      }
    ];
    
    // Generate 20 sample notifications
    for (let i = 0; i < 20; i++) {
      // Select random template and device
      const template = notificationTemplates[Math.floor(Math.random() * notificationTemplates.length)];
      const device = devices[Math.floor(Math.random() * devices.length)];
      
      // Generate timestamp within the last week
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 7));
      
      // Create notification with randomized read status
      const notification = new Notification({
        title: template.title,
        message: template.message.replace('{device}', device.name),
        type: template.type,
        timestamp: timestamp,
        isRead: Math.random() > 0.5,
        deviceId: device.id,
        user: 'admin'
      });
      
      await notification.save();
    }
    
    // Create notification configs
    const configs = [
      {
        type: 'power_threshold',
        threshold: 2000,
        enabled: true,
        sendEmail: false,
        emailRecipients: ['admin@example.com']
      },
      {
        type: 'energy_daily',
        threshold: 10,
        enabled: true,
        sendEmail: false,
        emailRecipients: ['admin@example.com']
      },
      {
        type: 'device_offline',
        enabled: true,
        sendEmail: false,
        emailRecipients: ['admin@example.com']
      }
    ];
    
    for (const config of configs) {
      const existingConfig = await NotificationConfig.findOne({ type: config.type });
      if (!existingConfig) {
        await new NotificationConfig(config).save();
      }
    }
    
    logger.info('Sample notification generation completed');
  } catch (error) {
    logger.error('Error generating sample notifications:', error);
  }
};

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
server.listen(PORT, () => {
  logger.info(`Notification Service running on port ${PORT}`);
  
  // Generate sample notifications after service starts
  setTimeout(() => {
    generateSampleNotifications();
  }, 5000); // Wait 5 seconds for other services to start
});
