FROM python:3.9-slim

WORKDIR /app

# Cài đặt curl và wget để kiểm tra kết nối
RUN apt-get update && apt-get install -y curl wget && apt-get clean

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
