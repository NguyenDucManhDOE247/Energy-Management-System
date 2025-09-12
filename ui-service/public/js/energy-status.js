/**
 * Energy Status Page JavaScript
 */

// Create EnergyStatus namespace
EMS.EnergyStatus = {
  // Configuration variables
  config: {
    refreshInterval: 10000, // Data refresh interval in milliseconds
    chartUpdateInterval: 1000, // Live chart update interval in milliseconds
    maxDataPoints: 30, // Maximum number of data points to display on live chart
    socket: null // WebSocket connection
  },
  
  // Chart objects
  charts: {
    liveConsumption: null,
    powerGauge: null
  },
  
  // Data storage
  data: {
    devices: [],
    consumption: {
      current: 0,
      today: 0,
      month: 0,
      history: []
    },
    lastUpdated: null
  },
  
  // Initialize the energy status page
  init: function() {
    console.log('Initializing Energy Status Page');
    
    // Initialize charts
    this.initCharts();
    
    // Load initial data
    this.loadData();
    
    // Connect to WebSocket for real-time updates
    this.connectWebSocket();
    
    // Set up periodic refresh
    setInterval(() => this.loadData(), this.config.refreshInterval);
    
    // Set up chart animation
    setInterval(() => this.updateLiveChart(), this.config.chartUpdateInterval);
    
    // Set up event listeners
    this.setupEventListeners();
  },
  
  // Initialize charts
  initCharts: function() {
    this.initLiveConsumptionChart();
    this.initPowerGauges();
  },
  
  // Initialize live consumption chart
  initLiveConsumptionChart: function() {
    const ctx = document.getElementById('liveConsumptionChart');
    if (!ctx) return;
    
    // Initialize empty data
    const labels = Array(this.config.maxDataPoints).fill('');
    const data = Array(this.config.maxDataPoints).fill(null);
    
    // Chart configuration
    this.charts.liveConsumption = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Power (W)',
          data: data,
          backgroundColor: 'rgba(78, 115, 223, 0.05)',
          borderColor: 'rgba(78, 115, 223, 1)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: 'rgba(78, 115, 223, 1)',
          pointBorderColor: 'rgba(255, 255, 255, 1)',
          pointHoverRadius: 5,
          pointHoverBackgroundColor: 'rgba(78, 115, 223, 1)',
          pointHoverBorderColor: 'rgba(255, 255, 255, 1)',
          pointHitRadius: 10,
          pointBorderWidth: 2,
          lineTension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            left: 10,
            right: 25,
            top: 25,
            bottom: 0
          }
        },
        scales: {
          x: {
            time: {
              unit: 'time'
            },
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              maxTicksLimit: 7
            }
          },
          y: {
            ticks: {
              maxTicksLimit: 5,
              padding: 10,
              callback: function(value) {
                return value + ' W';
              }
            },
            grid: {
              color: "rgb(234, 236, 244)",
              zeroLineColor: "rgb(234, 236, 244)",
              drawBorder: false,
              borderDash: [2],
              zeroLineBorderDash: [2]
            }
          },
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: "rgb(255, 255, 255)",
            bodyFontColor: "#858796",
            titleMarginBottom: 10,
            titleFontColor: '#6e707e',
            titleFontSize: 14,
            borderColor: '#dddfeb',
            borderWidth: 1,
            xPadding: 15,
            yPadding: 15,
            displayColors: false,
            intersect: false,
            mode: 'index',
            caretPadding: 10,
            callbacks: {
              label: function(context) {
                var label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y + ' W';
                }
                return label;
              }
            }
          }
        }
      }
    });
  },
  
  // Initialize power gauges
  initPowerGauges: function() {
    const powerGaugeElement = document.getElementById('powerGauge');
    if (!powerGaugeElement) return;
    
    // Using Google Charts for the gauge
    google.charts.load('current', {'packages':['gauge']});
    google.charts.setOnLoadCallback(() => {
      const data = google.visualization.arrayToDataTable([
        ['Label', 'Value'],
        ['Power (W)', 0]
      ]);

      const options = {
        width: 300, 
        height: 300,
        redFrom: 900, 
        redTo: 1000,
        yellowFrom: 750, 
        yellowTo: 900,
        minorTicks: 5,
        max: 1000
      };

      this.charts.powerGauge = new google.visualization.Gauge(powerGaugeElement);
      this.charts.powerGauge.draw(data, options);
    });
  },
  
  // Load data from the API
  loadData: function() {
    // Fetch current energy status data from API
    Promise.all([
      fetch('/api/energy-status/current'),
      fetch('/api/devices/status')
    ])
    .then(responses => Promise.all(responses.map(response => response.json())))
    .then(([energyData, devicesData]) => {
      // Update data storage
      this.data.consumption.current = energyData.currentPower;
      this.data.consumption.today = energyData.todayConsumption;
      this.data.consumption.month = energyData.monthConsumption;
      
      // Add new data point to history
      this.data.consumption.history.push({
        timestamp: new Date(),
        value: energyData.currentPower
      });
      
      // Limit history array to max data points
      if (this.data.consumption.history.length > this.config.maxDataPoints) {
        this.data.consumption.history.shift();
      }
      
      // Update devices data
      this.data.devices = devicesData;
      
      // Update last updated timestamp
      this.data.lastUpdated = new Date();
      
      // Update UI
      this.updateUI();
    })
    .catch(error => {
      console.error('Error loading energy status data:', error);
      // Show error notification
      EMS.showToast('Error', 'Failed to load energy status data. Please try again later.', 'danger');
    });
  },
  
  // Update UI elements with current data
  updateUI: function() {
    // Update stats cards
    this.updateStatsCards();
    
    // Update devices status
    this.updateDevicesStatus();
    
    // Update last updated time
    this.updateLastUpdatedTime();
    
    // Update power gauge
    this.updatePowerGauge();
  },
  
  // Update stats cards with current data
  updateStatsCards: function() {
    // Update current power consumption
    const currentPowerElement = document.getElementById('currentPower');
    if (currentPowerElement) {
      currentPowerElement.textContent = EMS.formatNumber(this.data.consumption.current);
    }
    
    // Update today's consumption
    const todayConsumptionElement = document.getElementById('todayConsumption');
    if (todayConsumptionElement) {
      todayConsumptionElement.textContent = EMS.formatNumber(this.data.consumption.today);
    }
    
    // Update month's consumption
    const monthConsumptionElement = document.getElementById('monthConsumption');
    if (monthConsumptionElement) {
      monthConsumptionElement.textContent = EMS.formatNumber(this.data.consumption.month);
    }
  },
  
  // Update devices status
  updateDevicesStatus: function() {
    const devicesContainer = document.getElementById('devicesStatus');
    if (!devicesContainer) return;
    
    // Clear existing content
    devicesContainer.innerHTML = '';
    
    // Check if there are any devices
    if (this.data.devices.length === 0) {
      devicesContainer.innerHTML = `
        <div class="alert alert-info">
          No devices found. Please add devices to monitor their status.
        </div>
      `;
      return;
    }
    
    // Create device cards
    this.data.devices.forEach(device => {
      const deviceCard = document.createElement('div');
      deviceCard.className = `device-status-card ${device.online ? 'online' : 'offline'}`;
      
      deviceCard.innerHTML = `
        <div class="device-status-header">
          <span class="device-status-name">${device.name}</span>
          <span class="device-status-indicator indicator-${device.online ? 'online' : 'offline'}"></span>
        </div>
        <div class="device-status-details">
          <div class="device-status-detail">
            <span class="device-status-label">Status:</span>
            <span class="device-status-value">
              <span class="status-badge badge-${device.online ? 'online' : 'offline'}">
                ${device.online ? 'Online' : 'Offline'}
              </span>
            </span>
          </div>
          <div class="device-status-detail">
            <span class="device-status-label">Power:</span>
            <span class="device-status-value">${device.online ? EMS.formatNumber(device.power) + ' W' : 'N/A'}</span>
          </div>
          <div class="device-status-detail">
            <span class="device-status-label">Today:</span>
            <span class="device-status-value">${device.online ? EMS.formatNumber(device.todayEnergy) + ' kWh' : 'N/A'}</span>
          </div>
          <div class="device-status-detail">
            <span class="device-status-label">Last Seen:</span>
            <span class="device-status-value">${EMS.formatDate(device.lastSeen, 'YYYY-MM-DD HH:mm')}</span>
          </div>
        </div>
      `;
      
      devicesContainer.appendChild(deviceCard);
    });
  },
  
  // Update last updated time
  updateLastUpdatedTime: function() {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (!lastUpdatedElement || !this.data.lastUpdated) return;
    
    lastUpdatedElement.textContent = this.data.lastUpdated.toLocaleTimeString();
  },
  
  // Update power gauge
  updatePowerGauge: function() {
    if (!this.charts.powerGauge) return;
    
    const data = google.visualization.arrayToDataTable([
      ['Label', 'Value'],
      ['Power (W)', this.data.consumption.current]
    ]);
    
    this.charts.powerGauge.draw(data, {
      width: 300, 
      height: 300,
      redFrom: 900, 
      redTo: 1000,
      yellowFrom: 750, 
      yellowTo: 900,
      minorTicks: 5,
      max: 1000
    });
    
    // Update gauge value text
    const gaugeValueElement = document.getElementById('gaugeValue');
    if (gaugeValueElement) {
      gaugeValueElement.textContent = EMS.formatNumber(this.data.consumption.current) + ' W';
    }
  },
  
  // Update live consumption chart
  updateLiveChart: function() {
    if (!this.charts.liveConsumption) return;
    
    const chart = this.charts.liveConsumption;
    
    // Update chart labels (timestamps)
    const labels = this.data.consumption.history.map(item => {
      const time = new Date(item.timestamp);
      return time.getHours().toString().padStart(2, '0') + ':' + 
             time.getMinutes().toString().padStart(2, '0') + ':' + 
             time.getSeconds().toString().padStart(2, '0');
    });
    
    // Update chart data (power values)
    const data = this.data.consumption.history.map(item => item.value);
    
    // Update chart
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
  },
  
  // Connect to WebSocket for real-time updates
  connectWebSocket: function() {
    // Check if WebSocket is supported
    if ('WebSocket' in window) {
      // Connect to WebSocket server
      this.config.socket = new WebSocket(`ws://${window.location.host}/ws/energy`);
      
      // Connection opened
      this.config.socket.addEventListener('open', (event) => {
        console.log('Connected to energy data WebSocket');
      });
      
      // Listen for messages
      this.config.socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Update current power consumption
          this.data.consumption.current = data.currentPower;
          
          // Add new data point to history
          this.data.consumption.history.push({
            timestamp: new Date(),
            value: data.currentPower
          });
          
          // Limit history array to max data points
          if (this.data.consumption.history.length > this.config.maxDataPoints) {
            this.data.consumption.history.shift();
          }
          
          // Update UI elements
          this.updateStatsCards();
          this.updatePowerGauge();
          this.updateLastUpdatedTime();
          
          // If device status is included in the message
          if (data.devices) {
            this.data.devices = data.devices;
            this.updateDevicesStatus();
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });
      
      // Connection closed
      this.config.socket.addEventListener('close', (event) => {
        console.log('Disconnected from energy data WebSocket');
        
        // Try to reconnect after a delay
        setTimeout(() => this.connectWebSocket(), 5000);
      });
      
      // Connection error
      this.config.socket.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
      });
    } else {
      console.warn('WebSocket is not supported by this browser');
      
      // Fallback to more frequent polling
      this.config.refreshInterval = 2000;
    }
  },
  
  // Set up event listeners
  setupEventListeners: function() {
    // Refresh data button
    const refreshButton = document.getElementById('refreshData');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        this.loadData();
        EMS.showToast('Refreshed', 'Energy status data has been refreshed.', 'info', 2000);
      });
    }
    
    // Device details button
    document.addEventListener('click', (event) => {
      const deviceCard = event.target.closest('.device-status-card');
      if (deviceCard) {
        // Get device index from data attribute or similar
        const deviceIndex = Array.from(deviceCard.parentNode.children).indexOf(deviceCard);
        const device = this.data.devices[deviceIndex];
        
        // Navigate to device details page
        window.location.href = `/controller?device=${device.id}`;
      }
    });
  }
};
