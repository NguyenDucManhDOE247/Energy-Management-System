FROM node:16-alpine

# Cài đặt curl và wget để kiểm tra kết nối
RUN apk add --no-cache curl wget

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3002

CMD ["node", "app.js"]
