/**
 * Database Report Page JavaScript
 */

// Create DatabaseReport namespace
EMS.DatabaseReport = {
  // Configuration variables
  config: {
    datatable: null,
    chartType: 'line', // Default chart type
    chartPeriod: 'daily', // Default chart period
    dateRange: {
      start: null,
      end: null
    },
    exportFormats: ['csv', 'pdf', 'excel']
  },
  
  // Chart objects
  charts: {
    main: null
  },
  
  // Data storage
  data: {
    records: [],
    summary: {
      total: 0,
      average: 0,
      peak: 0,
      lowest: 0
    },
    filtered: false
  },
  
  // Initialize the database report page
  init: function() {
    console.log('Initializing Database Report Page');
    
    // Set default date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    this.config.dateRange.start = startDate;
    this.config.dateRange.end = endDate;
    
    // Initialize date pickers
    this.initDatePickers();
    
    // Initialize chart
    this.initChart();
    
    // Initialize data table
    this.initDataTable();
    
    // Load initial data
    this.loadData();
    
    // Set up event listeners
    this.setupEventListeners();
  },
  
  // Initialize date pickers
  initDatePickers: function() {
    const startDatePicker = document.getElementById('startDate');
    const endDatePicker = document.getElementById('endDate');
    
    if (startDatePicker && endDatePicker) {
      // Format dates for the input fields (YYYY-MM-DD)
      startDatePicker.value = this.formatDateForInput(this.config.dateRange.start);
      endDatePicker.value = this.formatDateForInput(this.config.dateRange.end);
      
      // Set max date for start date picker to today
      startDatePicker.max = this.formatDateForInput(new Date());
      
      // Set max date for end date picker to today
      endDatePicker.max = this.formatDateForInput(new Date());
    }
  },
  
  // Initialize chart
  initChart: function() {
    const ctx = document.getElementById('reportChart');
    if (!ctx) return;
    
    // Initialize empty chart
    this.charts.main = new Chart(ctx, {
      type: this.config.chartType,
      data: {
        labels: [],
        datasets: [{
          label: 'Energy Consumption (kWh)',
          data: [],
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
              unit: 'day'
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
                return value + ' kWh';
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
                  label += context.parsed.y + ' kWh';
                }
                return label;
              }
            }
          }
        }
      }
    });
  },
  
  // Initialize data table
  initDataTable: function() {
    const tableElement = document.getElementById('dataTable');
    if (!tableElement) return;
    
    // Initialize DataTable
    this.config.datatable = $(tableElement).DataTable({
      responsive: true,
      ordering: true,
      searching: true,
      paging: true,
      lengthMenu: [10, 25, 50, 100],
      pageLength: 10,
      language: {
        search: "_INPUT_",
        searchPlaceholder: "Search records...",
        lengthMenu: "Show _MENU_ entries",
        info: "Showing _START_ to _END_ of _TOTAL_ entries",
        infoEmpty: "Showing 0 to 0 of 0 entries",
        infoFiltered: "(filtered from _MAX_ total entries)",
        zeroRecords: "No matching records found",
        paginate: {
          first: "First",
          last: "Last",
          next: "<i class='fas fa-chevron-right'></i>",
          previous: "<i class='fas fa-chevron-left'></i>"
        }
      },
      dom: 'Bfrtip',
      buttons: [
        {
          extend: 'csv',
          className: 'btn btn-sm btn-outline-primary',
          text: '<i class="fas fa-file-csv"></i> CSV'
        },
        {
          extend: 'excel',
          className: 'btn btn-sm btn-outline-primary',
          text: '<i class="fas fa-file-excel"></i> Excel'
        },
        {
          extend: 'pdf',
          className: 'btn btn-sm btn-outline-primary',
          text: '<i class="fas fa-file-pdf"></i> PDF'
        }
      ],
      columns: [
        { data: 'timestamp', title: 'Timestamp' },
        { data: 'device', title: 'Device' },
        { data: 'consumption', title: 'Consumption (kWh)' },
        { data: 'peak', title: 'Peak Power (W)' },
        { data: 'duration', title: 'Duration' }
      ],
      columnDefs: [
        {
          targets: 0,
          render: function(data) {
            return EMS.formatDate(data, 'YYYY-MM-DD HH:mm:ss');
          }
        },
        {
          targets: 2,
          render: function(data) {
            return EMS.formatNumber(data, 3);
          }
        },
        {
          targets: 3,
          render: function(data) {
            return EMS.formatNumber(data, 1);
          }
        }
      ]
    });
  },
  
  // Load data from the API
  loadData: function() {
    // Show loading indicator
    this.showLoading(true);
    
    // Prepare query parameters
    const params = {
      startDate: this.formatDateForApi(this.config.dateRange.start),
      endDate: this.formatDateForApi(this.config.dateRange.end)
    };
    
    // Get selected device filter
    const deviceFilter = document.getElementById('deviceFilter');
    if (deviceFilter && deviceFilter.value !== 'all') {
      params.deviceId = deviceFilter.value;
    }
    
    // Get selected data type filter
    const dataTypeFilter = document.getElementById('dataTypeFilter');
    if (dataTypeFilter && dataTypeFilter.value !== 'all') {
      params.dataType = dataTypeFilter.value;
    }
    
    // Fetch data from API
    fetch('/api/energy-data?' + new URLSearchParams(params))
      .then(response => response.json())
      .then(data => {
        // Update data storage
        this.data.records = data.records || [];
        this.data.summary = data.summary || {
          total: 0,
          average: 0,
          peak: 0,
          lowest: 0
        };
        this.data.filtered = true;
        
        // Update UI
        this.updateUI();
        
        // Hide loading indicator
        this.showLoading(false);
      })
      .catch(error => {
        console.error('Error loading database report data:', error);
        
        // Show error notification
        EMS.showToast('Error', 'Failed to load report data. Please try again later.', 'danger');
        
        // Hide loading indicator
        this.showLoading(false);
      });
  },
  
  // Update UI elements with current data
  updateUI: function() {
    // Update summary metrics
    this.updateSummaryMetrics();
    
    // Update chart
    this.updateChart();
    
    // Update data table
    this.updateDataTable();
    
    // Show/hide no data message
    this.toggleNoDataMessage();
  },
  
  // Update summary metrics
  updateSummaryMetrics: function() {
    // Update total consumption
    const totalElement = document.getElementById('totalConsumption');
    if (totalElement) {
      totalElement.textContent = EMS.formatNumber(this.data.summary.total);
    }
    
    // Update average consumption
    const averageElement = document.getElementById('averageConsumption');
    if (averageElement) {
      averageElement.textContent = EMS.formatNumber(this.data.summary.average);
    }
    
    // Update peak consumption
    const peakElement = document.getElementById('peakConsumption');
    if (peakElement) {
      peakElement.textContent = EMS.formatNumber(this.data.summary.peak);
    }
    
    // Update lowest consumption
    const lowestElement = document.getElementById('lowestConsumption');
    if (lowestElement) {
      lowestElement.textContent = EMS.formatNumber(this.data.summary.lowest);
    }
  },
  
  // Update chart with current data
  updateChart: function() {
    if (!this.charts.main) return;
    
    // Process data for the chart based on period
    const chartData = this.processChartData();
    
    // Update chart
    this.charts.main.data.labels = chartData.labels;
    this.charts.main.data.datasets[0].data = chartData.values;
    
    // Update chart type if needed
    if (this.charts.main.config.type !== this.config.chartType) {
      this.charts.main.config.type = this.config.chartType;
    }
    
    // Update chart
    this.charts.main.update();
  },
  
  // Process data for the chart based on the selected period
  processChartData: function() {
    const result = {
      labels: [],
      values: []
    };
    
    if (this.data.records.length === 0) return result;
    
    // Sort records by timestamp
    const sortedRecords = [...this.data.records].sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
    
    // Process data based on period
    switch (this.config.chartPeriod) {
      case 'hourly':
        // Group by hour
        const hourlyData = this.groupDataByPeriod(sortedRecords, 'hour');
        result.labels = hourlyData.map(item => item.period);
        result.values = hourlyData.map(item => item.value);
        break;
        
      case 'daily':
        // Group by day
        const dailyData = this.groupDataByPeriod(sortedRecords, 'day');
        result.labels = dailyData.map(item => item.period);
        result.values = dailyData.map(item => item.value);
        break;
        
      case 'weekly':
        // Group by week
        const weeklyData = this.groupDataByPeriod(sortedRecords, 'week');
        result.labels = weeklyData.map(item => item.period);
        result.values = weeklyData.map(item => item.value);
        break;
        
      case 'monthly':
        // Group by month
        const monthlyData = this.groupDataByPeriod(sortedRecords, 'month');
        result.labels = monthlyData.map(item => item.period);
        result.values = monthlyData.map(item => item.value);
        break;
        
      default:
        // Use raw data
        result.labels = sortedRecords.map(record => EMS.formatDate(record.timestamp, 'MM-DD HH:mm'));
        result.values = sortedRecords.map(record => record.consumption);
        break;
    }
    
    return result;
  },
  
  // Group data by period (hour, day, week, month)
  groupDataByPeriod: function(records, periodType) {
    const groupedData = {};
    
    records.forEach(record => {
      const date = new Date(record.timestamp);
      let periodKey;
      
      switch (periodType) {
        case 'hour':
          // Format: YYYY-MM-DD HH
          periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:00`;
          break;
          
        case 'day':
          // Format: YYYY-MM-DD
          periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
          break;
          
        case 'week':
          // Get the first day of the week (assuming Sunday is the first day)
          const firstDayOfWeek = new Date(date);
          const day = date.getDay();
          const diff = date.getDate() - day;
          firstDayOfWeek.setDate(diff);
          
          // Format: YYYY-WW (Week number)
          const weekNumber = Math.ceil((((date - new Date(date.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
          periodKey = `${date.getFullYear()}-W${weekNumber}`;
          break;
          
        case 'month':
          // Format: YYYY-MM
          periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
          
        default:
          periodKey = record.timestamp;
          break;
      }
      
      if (!groupedData[periodKey]) {
        groupedData[periodKey] = {
          total: 0,
          count: 0
        };
      }
      
      groupedData[periodKey].total += record.consumption;
      groupedData[periodKey].count += 1;
    });
    
    // Convert grouped data to array format
    const result = Object.keys(groupedData).map(key => {
      return {
        period: key,
        value: groupedData[key].total,
        average: groupedData[key].total / groupedData[key].count
      };
    });
    
    // Sort by period
    result.sort((a, b) => {
      return a.period.localeCompare(b.period);
    });
    
    return result;
  },
  
  // Update data table with current data
  updateDataTable: function() {
    if (!this.config.datatable) return;
    
    // Clear existing data
    this.config.datatable.clear();
    
    // Add new data
    this.config.datatable.rows.add(this.data.records);
    
    // Redraw the table
    this.config.datatable.draw();
  },
  
  // Show/hide no data message
  toggleNoDataMessage: function() {
    const noDataMessage = document.getElementById('noDataMessage');
    const chartContainer = document.getElementById('chartContainer');
    const tableContainer = document.getElementById('tableContainer');
    
    if (noDataMessage && chartContainer && tableContainer) {
      if (this.data.records.length === 0) {
        // No data available
        noDataMessage.style.display = 'block';
        chartContainer.style.display = 'none';
        tableContainer.style.display = 'none';
      } else {
        // Data available
        noDataMessage.style.display = 'none';
        chartContainer.style.display = 'block';
        tableContainer.style.display = 'block';
      }
    }
  },
  
  // Show/hide loading indicator
  showLoading: function(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = show ? 'flex' : 'none';
    }
  },
  
  // Set up event listeners
  setupEventListeners: function() {
    // Apply filter button
    const applyFilterBtn = document.getElementById('applyFilter');
    if (applyFilterBtn) {
      applyFilterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.applyFilters();
      });
    }
    
    // Reset filter button
    const resetFilterBtn = document.getElementById('resetFilter');
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.resetFilters();
      });
    }
    
    // Chart type selection
    const chartTypeButtons = document.querySelectorAll('.chart-type-btn');
    chartTypeButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons
        chartTypeButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Update chart type
        this.config.chartType = button.getAttribute('data-type');
        
        // Update chart
        this.updateChart();
      });
    });
    
    // Chart period selection
    const chartPeriodButtons = document.querySelectorAll('.chart-period-btn');
    chartPeriodButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons
        chartPeriodButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Update chart period
        this.config.chartPeriod = button.getAttribute('data-period');
        
        // Update chart
        this.updateChart();
      });
    });
    
    // Export buttons
    const exportButtons = document.querySelectorAll('.export-btn');
    exportButtons.forEach(button => {
      button.addEventListener('click', () => {
        const format = button.getAttribute('data-format');
        this.exportData(format);
      });
    });
  },
  
  // Apply filters
  applyFilters: function() {
    // Get start date
    const startDateInput = document.getElementById('startDate');
    if (startDateInput && startDateInput.value) {
      this.config.dateRange.start = new Date(startDateInput.value);
    }
    
    // Get end date
    const endDateInput = document.getElementById('endDate');
    if (endDateInput && endDateInput.value) {
      this.config.dateRange.end = new Date(endDateInput.value);
    }
    
    // Load data with new filters
    this.loadData();
  },
  
  // Reset filters
  resetFilters: function() {
    // Reset date range to last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    this.config.dateRange.start = startDate;
    this.config.dateRange.end = endDate;
    
    // Reset date pickers
    this.initDatePickers();
    
    // Reset device filter
    const deviceFilter = document.getElementById('deviceFilter');
    if (deviceFilter) {
      deviceFilter.value = 'all';
    }
    
    // Reset data type filter
    const dataTypeFilter = document.getElementById('dataTypeFilter');
    if (dataTypeFilter) {
      dataTypeFilter.value = 'all';
    }
    
    // Load data with reset filters
    this.loadData();
  },
  
  // Export data
  exportData: function(format) {
    if (!this.data.filtered || this.data.records.length === 0) {
      EMS.showToast('No Data', 'There is no data to export. Please apply filters and try again.', 'warning');
      return;
    }
    
    switch (format) {
      case 'csv':
        this.exportToCSV();
        break;
        
      case 'excel':
        this.exportToExcel();
        break;
        
      case 'pdf':
        this.exportToPDF();
        break;
        
      default:
        console.error('Unknown export format:', format);
        break;
    }
  },
  
  // Export data to CSV
  exportToCSV: function() {
    // Use DataTables built-in export
    const exportButton = document.querySelector('.buttons-csv');
    if (exportButton) {
      exportButton.click();
    } else {
      // Fallback if DataTables export is not available
      this.generateCSV();
    }
  },
  
  // Export data to Excel
  exportToExcel: function() {
    // Use DataTables built-in export
    const exportButton = document.querySelector('.buttons-excel');
    if (exportButton) {
      exportButton.click();
    } else {
      // Fallback to CSV export
      this.generateCSV();
    }
  },
  
  // Export data to PDF
  exportToPDF: function() {
    // Use DataTables built-in export
    const exportButton = document.querySelector('.buttons-pdf');
    if (exportButton) {
      exportButton.click();
    } else {
      // Fallback if DataTables export is not available
      EMS.showToast('Export Failed', 'PDF export is currently not available. Please try CSV or Excel format.', 'warning');
    }
  },
  
  // Generate CSV data (fallback for DataTables export)
  generateCSV: function() {
    // Generate CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add header row
    csvContent += 'Timestamp,Device,Consumption (kWh),Peak Power (W),Duration\n';
    
    // Add data rows
    this.data.records.forEach(record => {
      const row = [
        EMS.formatDate(record.timestamp, 'YYYY-MM-DD HH:mm:ss'),
        record.device,
        EMS.formatNumber(record.consumption, 3),
        EMS.formatNumber(record.peak, 1),
        record.duration
      ];
      
      csvContent += row.join(',') + '\n';
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `energy_data_export_${EMS.formatDate(new Date(), 'YYYYMMDD')}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  },
  
  // Format date for API
  formatDateForApi: function(date) {
    if (!date) return '';
    
    return date.toISOString().split('T')[0];
  },
  
  // Format date for input fields
  formatDateForInput: function(date) {
    if (!date) return '';
    
    return date.toISOString().split('T')[0];
  }
};
