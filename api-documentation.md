# API Documentation cho EMS (Energy Monitoring System)

## API Gateway
Base URL: `http://localhost:8000`

### Health Check
- **Endpoint**: `/health`
- **Method**: GET
- **Mô tả**: Kiểm tra trạng thái hoạt động của API Gateway
- **Phản hồi**: `{"status":"ok"}`

### Thông tin API
- **Endpoint**: `/api`
- **Method**: GET
- **Mô tả**: Lấy thông tin tổng quan về các dịch vụ API có sẵn
- **Phản hồi**: 
```json
{
  "message": "EMS API Gateway",
  "version": "1.0.0",
  "services": {
    "data": "/api/data",
    "devices": "/api/devices",
    "analytics": "/api/analytics",
    "notifications": "/api/notifications"
  }
}
```

### Đăng nhập
- **Endpoint**: `/auth/login`
- **Method**: POST
- **Mô tả**: Đăng nhập để lấy token JWT
- **Body Parameters**:
  - `username`: Tên đăng nhập (bắt buộc)
  - `password`: Mật khẩu (bắt buộc)
- **Phản hồi**: 
```json
{
  "token": "jwt_token_here",
  "username": "username_here"
}
```

## Data Collection Service
Base URL: `http://localhost:5000` hoặc thông qua API Gateway: `http://localhost:8000/api/data`

### Health Check
- **Endpoint**: `/health`
- **Method**: GET
- **Mô tả**: Kiểm tra trạng thái hoạt động của Data Collection Service
- **Phản hồi**: `{"status":"ok"}`

### Lấy dữ liệu hiện tại
- **Endpoint**: `/api/data/current`
- **Method**: GET
- **Mô tả**: Lấy dữ liệu hiện tại từ tất cả các thiết bị
- **Phản hồi**: Danh sách các thiết bị với dữ liệu mới nhất

### Lấy dữ liệu của thiết bị cụ thể
- **Endpoint**: `/api/data/device/:device_id`
- **Method**: GET
- **Mô tả**: Lấy dữ liệu của một thiết bị cụ thể
- **URL Parameters**:
  - `device_id`: ID của thiết bị (bắt buộc)
- **Query Parameters**:
  - `from`: Thời gian bắt đầu (tùy chọn)
  - `to`: Thời gian kết thúc (tùy chọn)
  - `limit`: Số lượng bản ghi tối đa trả về (tùy chọn, mặc định: 100)
- **Phản hồi**: Danh sách dữ liệu của thiết bị

### Lấy dữ liệu lịch sử
- **Endpoint**: `/api/data/historical`
- **Method**: GET
- **Mô tả**: Lấy dữ liệu lịch sử của tất cả các thiết bị trong khoảng thời gian
- **Query Parameters**:
  - `from`: Thời gian bắt đầu (bắt buộc)
  - `to`: Thời gian kết thúc (bắt buộc)
  - `device_id`: ID của thiết bị (tùy chọn)
- **Phản hồi**: Danh sách dữ liệu lịch sử

### Kích hoạt thu thập dữ liệu
- **Endpoint**: `/api/data/collect`
- **Method**: POST
- **Mô tả**: Kích hoạt thu thập dữ liệu ngay lập tức từ tất cả các thiết bị
- **Phản hồi**: Kết quả thu thập dữ liệu

### Lấy danh sách thiết bị
- **Endpoint**: `/api/devices`
- **Method**: GET
- **Mô tả**: Lấy danh sách tất cả các thiết bị được cấu hình
- **Phản hồi**: Danh sách các thiết bị

### Lấy thông tin thiết bị
- **Endpoint**: `/api/device/:device_id`
- **Method**: GET
- **Mô tả**: Lấy thông tin chi tiết của một thiết bị cụ thể
- **URL Parameters**:
  - `device_id`: ID của thiết bị (bắt buộc)
- **Phản hồi**: Thông tin chi tiết của thiết bị

## Device Control Service
Base URL: `http://localhost:3001` hoặc thông qua API Gateway: `http://localhost:8000/api/devices`

### Health Check
- **Endpoint**: `/health`
- **Method**: GET
- **Mô tả**: Kiểm tra trạng thái hoạt động của Device Control Service
- **Phản hồi**: `{"status":"ok"}`

### Lấy tất cả thiết bị
- **Endpoint**: `/api/devices`
- **Method**: GET
- **Mô tả**: Lấy danh sách tất cả các thiết bị với trạng thái hiện tại
- **Phản hồi**: Danh sách các thiết bị với trạng thái

### Lấy thông tin thiết bị cụ thể
- **Endpoint**: `/api/devices/:deviceId`
- **Method**: GET
- **Mô tả**: Lấy thông tin chi tiết của một thiết bị cụ thể
- **URL Parameters**:
  - `deviceId`: ID của thiết bị (bắt buộc)
- **Phản hồi**: Thông tin chi tiết của thiết bị

### Cập nhật trạng thái kết nối của thiết bị
- **Endpoint**: `/api/devices/:deviceId/status`
- **Method**: PUT
- **Mô tả**: Cập nhật trạng thái kết nối (online/offline) của thiết bị
- **URL Parameters**:
  - `deviceId`: ID của thiết bị (bắt buộc)
- **Body Parameters**:
  - `online`: Trạng thái kết nối (bắt buộc, boolean)
- **Phản hồi**: Trạng thái mới của thiết bị

### Đảo trạng thái thiết bị
- **Endpoint**: `/api/devices/:deviceId/toggle`
- **Method**: PUT
- **Mô tả**: Đảo trạng thái (on/off) của thiết bị
- **URL Parameters**:
  - `deviceId`: ID của thiết bị (bắt buộc)
- **Phản hồi**: Trạng thái mới của thiết bị

### Lấy lịch sử điều khiển của thiết bị
- **Endpoint**: `/api/devices/:deviceId/history`
- **Method**: GET
- **Mô tả**: Lấy lịch sử các hành động điều khiển của thiết bị
- **URL Parameters**:
  - `deviceId`: ID của thiết bị (bắt buộc)
- **Phản hồi**: Danh sách các hành động điều khiển

### Lấy lịch sử điều khiển theo tuần của thiết bị
- **Endpoint**: `/api/devices/:deviceId/weekly-history`
- **Method**: GET
- **Mô tả**: Lấy lịch sử các hành động điều khiển của thiết bị theo tuần
- **URL Parameters**:
  - `deviceId`: ID của thiết bị (bắt buộc)
- **Query Parameters**:
  - `week`: Tuần cần lấy dữ liệu (bắt buộc, định dạng YYYY-WW, ví dụ: 2023-30)
- **Phản hồi**: Thống kê hành động điều khiển theo ngày trong tuần
```json
{
  "device_id": "device1",
  "week": "2023-30",
  "start_date": "2023-07-23",
  "end_date": "2023-07-29",
  "days": [
    {
      "day": "Sunday",
      "date": "2023-07-23",
      "on_count": 0,
      "off_count": 0,
      "total_actions": 0,
      "actions": []
    },
    ...
  ],
  "total_actions": 0
}
```

### Thêm thiết bị mới
- **Endpoint**: `/api/devices`
- **Method**: POST
- **Mô tả**: Thêm một thiết bị mới vào hệ thống
- **Body Parameters**:
  - `name`: Tên thiết bị (bắt buộc)
  - `type`: Loại thiết bị (bắt buộc, "tuya" hoặc "tapo")
  - `ip`: Địa chỉ IP của thiết bị (bắt buộc)
  - `id`: ID của thiết bị (tùy chọn)
  - `deviceId`: ID của thiết bị trên nền tảng (tùy chọn)
  - `local_key`: Khóa cục bộ của thiết bị (tùy chọn)
  - `version`: Phiên bản giao thức của thiết bị (tùy chọn)
- **Phản hồi**: Thông tin thiết bị đã thêm

### Điều khiển thiết bị
- **Endpoint**: `/api/devices/:deviceId/control`
- **Method**: POST hoặc PUT
- **Mô tả**: Điều khiển trạng thái (on/off) của thiết bị
- **URL Parameters**:
  - `deviceId`: ID của thiết bị (bắt buộc)
- **Body Parameters**:
  - `state`: Trạng thái mới (bắt buộc, boolean: true = on, false = off)
- **Phản hồi**: Kết quả điều khiển thiết bị

### Lấy trạng thái thiết bị
- **Endpoint**: `/api/devices/:deviceId/status`
- **Method**: GET
- **Mô tả**: Lấy trạng thái hiện tại của thiết bị
- **URL Parameters**:
  - `deviceId`: ID của thiết bị (bắt buộc)
- **Phản hồi**: Trạng thái hiện tại của thiết bị

## Analytics Service
Base URL: `http://localhost:3002` hoặc thông qua API Gateway: `http://localhost:8000/api/analytics`

### Health Check
- **Endpoint**: `/health`
- **Method**: GET
- **Mô tả**: Kiểm tra trạng thái hoạt động của Analytics Service
- **Phản hồi**: `{"status":"ok"}`

### Thống kê hàng ngày
- **Endpoint**: `/api/analytics/daily`
- **Method**: GET
- **Mô tả**: Lấy thống kê năng lượng hàng ngày
- **Query Parameters**:
  - `date`: Ngày cần thống kê (tùy chọn, định dạng YYYY-MM-DD)
  - `device_id`: ID của thiết bị (tùy chọn)
- **Phản hồi**: Thống kê năng lượng hàng ngày

### Thống kê hàng tháng
- **Endpoint**: `/api/analytics/monthly`
- **Method**: GET
- **Mô tả**: Lấy thống kê năng lượng hàng tháng
- **Query Parameters**:
  - `month`: Tháng cần thống kê (tùy chọn, định dạng MM)
  - `year`: Năm cần thống kê (tùy chọn, định dạng YYYY)
  - `device_id`: ID của thiết bị (tùy chọn)
- **Phản hồi**: Thống kê năng lượng hàng tháng

### Thống kê hàng tuần
- **Endpoint**: `/api/analytics/weekly`
- **Method**: GET
- **Mô tả**: Lấy thống kê năng lượng hàng tuần
- **Query Parameters**:
  - `week`: Tuần cần thống kê (bắt buộc, định dạng YYYY-WW, ví dụ: 2023-30)
  - `device_id`: ID của thiết bị (tùy chọn)
- **Phản hồi**: Thống kê năng lượng hàng tuần
```json
{
  "device_id": "device1",
  "week": "2023-30",
  "start_date": "2023-07-23",
  "end_date": "2023-07-29",
  "days": [
    {
      "day": "Sunday",
      "date": "2023-07-23",
      "total_kwh": 0,
      "average_watts": 0,
      "max_watts": 0,
      "min_watts": 0,
      "operating_hours": 0
    },
    ...
  ],
  "total_kwh": 0,
  "average_daily_kwh": 0
}
```

### Thống kê hàng năm
- **Endpoint**: `/api/analytics/yearly`
- **Method**: GET
- **Mô tả**: Lấy thống kê năng lượng hàng năm
- **Query Parameters**:
  - `year`: Năm cần thống kê (bắt buộc, định dạng YYYY)
  - `device_id`: ID của thiết bị (tùy chọn)
- **Phản hồi**: Thống kê năng lượng hàng năm

### Thống kê theo khoảng thời gian
- **Endpoint**: `/api/analytics/timerange`
- **Method**: GET
- **Mô tả**: Lấy thống kê năng lượng theo khoảng thời gian tùy chỉnh
- **Query Parameters**:
  - `from`: Thời gian bắt đầu (bắt buộc, định dạng YYYY-MM-DD)
  - `to`: Thời gian kết thúc (bắt buộc, định dạng YYYY-MM-DD)
  - `device_id`: ID của thiết bị (tùy chọn)
- **Phản hồi**: Thống kê năng lượng theo khoảng thời gian

## Ví dụ sử dụng API

### Đăng nhập và lấy token
```bash
curl -X POST -H "Content-Type: application/json" -d '{"username":"admin", "password":"demo123"}' http://localhost:8000/auth/login
```

### Lấy dữ liệu hiện tại từ tất cả thiết bị
```bash
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/data/current
```

### Lấy dữ liệu lịch sử trong khoảng thời gian
```bash
curl -H "Authorization: Bearer <token>" "http://localhost:8000/api/data/historical?from=2023-01-01T00:00:00&to=2023-01-31T23:59:59"
```

### Điều khiển thiết bị (bật)
```bash
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"state":true}' http://localhost:8000/api/devices/device1/control
```

### Lấy thống kê hàng ngày
```bash
curl -H "Authorization: Bearer <token>" "http://localhost:8000/api/analytics/daily?date=2023-01-01"
```

### Lấy thống kê hàng tuần
```bash
curl -H "Authorization: Bearer <token>" "http://localhost:8000/api/analytics/weekly?week=2023-30&device_id=device1"
```

### Lấy lịch sử điều khiển thiết bị theo tuần
```bash
curl -H "Authorization: Bearer <token>" "http://localhost:8000/api/devices/device1/weekly-history?week=2023-30"
```
