/**
 * Main JavaScript file for Energy Monitoring System
 */

// Global namespace for the application
const EMS = {};

// Initialize the application
EMS.init = function() {
  // Initialize sidebar
  EMS.initSidebar();
  
  // Initialize tooltips
  EMS.initTooltips();
  
  // Initialize popovers
  EMS.initPopovers();
  
  // Initialize the page specific scripts
  EMS.initPageScripts();
  
  // Initialize event listeners
  EMS.initEventListeners();
  
  // Initialize notification system
  EMS.initNotifications();
  
  console.log('EMS application initialized');
};

// Initialize sidebar functionality
EMS.initSidebar = function() {
  const sidebarToggle = document.querySelector('#sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function(e) {
      e.preventDefault();
      document.body.classList.toggle('sidebar-toggled');
      document.querySelector('.sidebar').classList.toggle('toggled');
    });
  }
  
  // Close sidebar on small screens when clicking outside
  const bodyClick = function() {
    if (window.innerWidth < 768 && !document.body.classList.contains('sidebar-toggled')) {
      document.body.classList.add('sidebar-toggled');
      document.querySelector('.sidebar').classList.add('toggled');
    }
  };
  
  // Set active sidebar item based on current page
  const currentUrl = window.location.pathname;
  document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    const linkPath = link.getAttribute('href');
    if (linkPath && currentUrl.includes(linkPath) && linkPath !== '/') {
      link.classList.add('active');
      
      // Expand parent collapse if in a submenu
      const parentCollapse = link.closest('.collapse');
      if (parentCollapse) {
        parentCollapse.classList.add('show');
        const parentLink = document.querySelector(`[data-target="#${parentCollapse.id}"]`);
        if (parentLink) {
          parentLink.classList.remove('collapsed');
          parentLink.setAttribute('aria-expanded', 'true');
        }
      }
    } else if (linkPath === '/' && currentUrl === '/') {
      link.classList.add('active');
    }
  });
};

// Initialize Bootstrap tooltips
EMS.initTooltips = function() {
  // Check if Bootstrap is available
  if (typeof bootstrap !== 'undefined') {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  } else {
    // Fallback for older Bootstrap versions
    if (typeof $ !== 'undefined' && typeof $.fn.tooltip !== 'undefined') {
      $('[data-toggle="tooltip"]').tooltip();
    }
  }
};

// Initialize Bootstrap popovers
EMS.initPopovers = function() {
  // Check if Bootstrap is available
  if (typeof bootstrap !== 'undefined') {
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
  } else {
    // Fallback for older Bootstrap versions
    if (typeof $ !== 'undefined' && typeof $.fn.popover !== 'undefined') {
      $('[data-toggle="popover"]').popover();
    }
  }
};

// Initialize page specific scripts based on the current page
EMS.initPageScripts = function() {
  const currentPage = document.body.getAttribute('data-page');
  
  switch(currentPage) {
    case 'dashboard':
      if (typeof EMS.Dashboard !== 'undefined') {
        EMS.Dashboard.init();
      }
      break;
    case 'energy-status':
      if (typeof EMS.EnergyStatus !== 'undefined') {
        EMS.EnergyStatus.init();
      }
      break;
    case 'database-report':
      if (typeof EMS.DatabaseReport !== 'undefined') {
        EMS.DatabaseReport.init();
      }
      break;
    case 'summary':
      if (typeof EMS.Summary !== 'undefined') {
        EMS.Summary.init();
      }
      break;
    case 'controller':
      if (typeof EMS.Controller !== 'undefined') {
        EMS.Controller.init();
      }
      break;
    case 'notifications':
      if (typeof EMS.Notifications !== 'undefined') {
        EMS.Notifications.init();
      }
      break;
    case 'login':
    case 'register':
      if (typeof EMS.Auth !== 'undefined') {
        EMS.Auth.init();
      }
      break;
    default:
      // No page specific scripts to load
      break;
  }
};

// Initialize global event listeners
EMS.initEventListeners = function() {
  // Add scroll to top button functionality
  const scrollToTopBtn = document.querySelector('#scrollToTop');
  if (scrollToTopBtn) {
    window.addEventListener('scroll', function() {
      if (window.pageYOffset > 100) {
        scrollToTopBtn.style.display = 'block';
      } else {
        scrollToTopBtn.style.display = 'none';
      }
    });
    
    scrollToTopBtn.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
  
  // Add logout confirmation
  const logoutBtn = document.querySelector('#logoutButton');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      if (!confirm('Are you sure you want to logout?')) {
        e.preventDefault();
      }
    });
  }
};

// Initialize notification system
EMS.initNotifications = function() {
  // Check for unread notifications
  EMS.checkNotifications();
  
  // Set up polling for new notifications every 60 seconds
  setInterval(EMS.checkNotifications, 60000);
  
  // Set up toast notification display
  EMS.setupToastNotifications();
};

// Check for unread notifications
EMS.checkNotifications = function() {
  // This would typically be an API call to check for new notifications
  // For now we'll just simulate it
  fetch('/api/notifications/unread-count')
    .then(response => response.json())
    .then(data => {
      const notificationBadge = document.querySelector('#notificationBadge');
      if (notificationBadge) {
        if (data.count > 0) {
          notificationBadge.textContent = data.count > 99 ? '99+' : data.count;
          notificationBadge.style.display = 'block';
        } else {
          notificationBadge.style.display = 'none';
        }
      }
    })
    .catch(error => {
      console.error('Error fetching notifications:', error);
    });
};

// Set up toast notifications
EMS.setupToastNotifications = function() {
  // This would be used to display toast notifications
  // We'll create a container for them if it doesn't exist
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }
  
  // Listen for server-sent events or websocket messages
  // For now we'll just set up the display function
  EMS.showToast = function(title, message, type = 'info', duration = 5000) {
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
      <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header bg-${type} text-white">
          <strong class="me-auto">${title}</strong>
          <small>${new Date().toLocaleTimeString()}</small>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          ${message}
        </div>
      </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    
    // Check if Bootstrap is available
    if (typeof bootstrap !== 'undefined') {
      const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: duration
      });
      toast.show();
      
      // Remove the element after it's hidden
      toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
      });
    } else {
      // Fallback for older Bootstrap versions
      if (typeof $ !== 'undefined' && typeof $.fn.toast !== 'undefined') {
        $(toastElement).toast({
          autohide: true,
          delay: duration
        }).toast('show');
        
        $(toastElement).on('hidden.bs.toast', function() {
          $(toastElement).remove();
        });
      } else {
        // Simplest fallback
        toastElement.style.display = 'block';
        setTimeout(() => {
          toastElement.style.display = 'none';
          toastElement.remove();
        }, duration);
      }
    }
  };
};

// Utility function to format dates
EMS.formatDate = function(date, format = 'YYYY-MM-DD') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  format = format.replace('YYYY', year);
  format = format.replace('MM', month);
  format = format.replace('DD', day);
  format = format.replace('HH', hours);
  format = format.replace('mm', minutes);
  format = format.replace('ss', seconds);
  
  return format;
};

// Utility function to format numbers
EMS.formatNumber = function(number, decimals = 2, decimalSeparator = '.', thousandsSeparator = ',') {
  if (number === null || number === undefined) return '';
  
  const num = parseFloat(number);
  if (isNaN(num)) return '0';
  
  const fixed = num.toFixed(decimals);
  const parts = fixed.split('.');
  
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  
  return decimals ? parts.join(decimalSeparator) : parts[0];
};

// Utility function for API calls
EMS.api = {
  get: async function(endpoint, params = {}) {
    try {
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const url = `/api${endpoint}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API GET error:', error);
      throw error;
    }
  },
  
  post: async function(endpoint, data = {}) {
    try {
      const url = `/api${endpoint}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API POST error:', error);
      throw error;
    }
  },
  
  put: async function(endpoint, data = {}) {
    try {
      const url = `/api${endpoint}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API PUT error:', error);
      throw error;
    }
  },
  
  delete: async function(endpoint, params = {}) {
    try {
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const url = `/api${endpoint}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API DELETE error:', error);
      throw error;
    }
  }
};

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', EMS.init);
