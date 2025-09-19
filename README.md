# ⚡ Energy Management System

A cloud-native energy monitoring system that transforms traditional energy management from monolithic to microservices architecture. This system enhances flexibility, scalability, and operational efficiency through containerized microservices and lightweight communication protocols.

## 📂 Project Structure

```
Energy-Management-System/
├── analytics/             # Analytics microservice (Node.js)
├── data-collection/       # IoT data collection microservice (Python)
├── device-control/        # Device control microservice (Node.js)
├── gateway/               # API Gateway reverse proxy (Nginx)
├── k8s/                   # Kubernetes manifests
├── mongodb/               # MongoDB database service
├── notification/          # Notification microservice (Node.js)
├── redis/                 # Redis cache configuration
├── ui-service/            # User interface service (Node.js + EJS)
├── docker-compose.yaml    # Run the entire system (local)
├── Jenkinsfile            # Jenkins CI/CD pipeline
├── README.md              # Project information
```

## ⚙️ Technologies Used

| Layer            | Technology                              |
| ---------------- | --------------------------------------- |
| Frontend         | HTML + CSS + JavaScript + EJS Templates |
| Backend          | Node.js + Express.js, Python           |
| Databases        | MongoDB, Redis                         |
| CI/CD            | Jenkins + Docker + GitHub Webhook      |
| Deployment       | DigitalOcean Kubernetes                |
| Reverse Proxy    | NGINX                                  |
| API Gateway      | NGINX                                  |
| Containerization | Docker                                 |
| Orchestration    | Kubernetes                             |
| Caching          | Redis                                  |
| Authentication   | JWT                                    |

---

## 🚀 Key Features

- [x] Real-time energy consumption monitoring
- [x] IoT device data collection and integration
- [x] Energy usage analytics and reporting
- [x] Device control and management
- [x] Notifications for energy usage anomalies
- [x] User authentication and authorization
- [x] Responsive web interface with dashboard
- [x] Containerized microservices for scalability
- [x] Fault isolation and resilience
- [x] Dynamic resource allocation
- [x] Seamless integration with renewable energy data resources

---

## 📦 Deployment Instructions

### 1. Local Development with Docker Compose

```bash
# Clone the repository
git clone https://github.com/NguyenDucManhDOE247/Energy-Management-System.git
cd Energy-Management-System

# Start all services
docker-compose up -d

# Access the application at http://localhost:80
```

### 2. Jenkins + CI/CD Pipeline

- Build Docker images for each microservice
- Push images to DockerHub
- Apply all `k8s/*.yaml` files to the Kubernetes cluster

### 3. Kubernetes Cluster Commands

```bash
# Create namespace and deploy all services
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n ems
kubectl get svc -n ems
```

---

## 📎 Deployment Details

| Component   | Details                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| DockerHub   | `nguyenducmanh247/*`                                                    |
| GitHub Repo | [NguyenDucManhDOE247/Energy-Management-System](https://github.com/NguyenDucManhDOE247/Energy-Management-System) |
| Gateway URL | `http://<ip>:32000/`                                                    |
| Jenkins     | Runs in a container with kubeconfig mounted                             |
| Kubernetes  | DigitalOcean Kubernetes                                                 |

---

## 🧩 Microservices Architecture

| Microservice    | Description                                                           |
| --------------- | --------------------------------------------------------------------- |
| Analytics       | Processes energy usage data and generates insights                    |
| Data Collection | Collects data from IoT energy monitoring devices                      |
| Device Control  | Manages and controls connected energy devices                         |
| Gateway         | Routes requests to appropriate services and load balancing            |
| MongoDB         | Stores persistent data for all services                               |
| Notification    | Handles user notifications for alerts and updates                     |
| Redis           | Provides caching and message queue between services                   |
| UI Service      | Delivers the web interface with dashboards and controls               |

---

## 💡 Cloud Native Benefits

- **Resilience**: Fault isolation ensures system stability even when individual services fail
- **Scalability**: Dynamic resource allocation handles traffic spikes efficiently
- **Flexibility**: Independent service deployment enables faster updates and feature additions
- **Cost Efficiency**: Resource optimization reduces operational costs compared to monolithic systems
- **Maintainability**: Smaller, focused codebases make maintenance and debugging easier
- **Data Persistence**: Cloud storage ensures data is preserved even during host failures
- **Load Distribution**: Load balancing provides consistent performance during high traffic

---

## 👤 Contributors

- **Nguyen Duc Manh**  
   BCSE2022 - Vietnam Japan University

---

## 📄 License

This project is licensed under the MIT License.

---

## 📘 Additional Notes

- Ensure that the Kubernetes cluster is properly configured with sufficient resources
- Use `kubectl logs <pod-name> -n energy-system` to debug any issues with pods
- Update the `nginx.conf` and `gateway-deployment.yaml` files as needed to match your domain or IP configuration
- For local testing, use `docker-compose.yml` to spin up services

---

Developed for research paper: "A CLOUD NATIVE APPROACH OF ENERGY MONITORING SYSTEM USING MICROSERVICES ARCHITECTURE"
