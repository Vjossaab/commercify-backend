# Commercify - Real-Time Distributed E-Commerce Platform

Commercify is a comprehensive, production-ready distributed e-commerce platform built to demonstrate core distributed systems principles. The platform features real-time synchronization, microservices architecture, and fault tolerance.

## 🏗️ Architecture

### Microservices
- **Auth Service** (Port 5000): User registration, login, JWT authentication
- **Catalog Service** (Port 5001): Product management and inventory
- **Order Service** (Port 5002): Order processing and stock management
- **WebSocket Relay** (Port 5003): Real-time updates via Redis pub/sub

### Infrastructure
- **MongoDB**: Primary database with replica set for high availability
- **Redis**: Pub/sub messaging for real-time synchronization
- **Nginx**: API gateway and load balancer
- **Docker Compose**: Service orchestration

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for frontend development)
- 8GB+ RAM recommended

### 1. Clone and Setup
```bash
git clone <repository-url>
cd commercify
```

### 2. Start Backend Services
```bash
# Start all backend services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Start Frontend
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:8080
- **WebSocket**: http://localhost:8081

## 🧪 Testing Distributed Systems Features

### Real-Time Stock Updates
1. Register as both a **Seller** and **Buyer** (use different emails)
2. Seller: Add products with limited stock
3. Buyer: Add items to cart and checkout
4. Observe real-time stock updates across both sessions

### Fault Tolerance
```bash
# Test service resilience
docker-compose stop catalog_service
# Other services continue working

# Restart service
docker-compose start catalog_service
# Service reconnects and syncs automatically
```

### Load Testing
```bash
# Scale services horizontally
docker-compose up --scale catalog_service=3 --scale order_service=2
```

## 🔧 Development

### Backend Services Structure
```
backend/
├── auth_service.py      # Authentication & JWT
├── catalog_service.py   # Product management  
├── order_service.py     # Order processing
├── websocket_relay.py   # Real-time updates
├── requirements.txt     # Python dependencies
├── Dockerfile          # Container configuration
└── nginx.conf          # API gateway config
```

### Frontend Structure
```
src/
├── components/         # React components
├── services/          # API & WebSocket clients  
├── context/           # React context (Auth)
├── hooks/             # Custom hooks (Cart)
├── types/             # TypeScript interfaces
└── App.tsx           # Main application
```

## 🌟 Key Features

### For Buyers
- Browse real-time product catalog
- Add items to shopping cart
- Live stock validation
- Seamless checkout process
- Order history tracking

### For Sellers
- Product inventory management
- Real-time stock monitoring
- Sales dashboard with analytics
- Low stock alerts
- Bulk operations

### Real-Time Features
- Live stock updates across all clients
- Instant product catalog synchronization
- Real-time cart validation
- WebSocket-based notifications

## 🛠️ Configuration

### Environment Variables
```bash
# Backend Services
SECRET_KEY=your-secret-key-change-in-production
MONGO_URI=mongodb://mongodb:27017/commercify
REDIS_URI=redis://redis:6379/0

# Frontend (create .env file)
VITE_API_URL=http://localhost:8080
VITE_WS_URL=http://localhost:8081
```

### Database Setup
MongoDB replica set is automatically configured for distributed transactions and high availability.

## 📊 Monitoring & Health Checks

### Service Health
```bash
# Check individual service health
curl http://localhost:8080/auth/health
curl http://localhost:8080/catalog/health  
curl http://localhost:8080/orders/health
curl http://localhost:8081/health
```

### Logs
```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f catalog_service
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Input validation and sanitization
- Role-based access control (RBAC)

## 🚨 Troubleshooting

### Common Issues

1. **Services not starting**: Check port availability
2. **Database connection failed**: Ensure MongoDB is running
3. **WebSocket connection issues**: Verify Redis is accessible
4. **Frontend API errors**: Confirm backend services are healthy

### Reset Environment
```bash
# Stop all services and remove data
docker-compose down -v

# Rebuild and restart
docker-compose up --build -d
```

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale specific services
docker-compose up --scale catalog_service=3
docker-compose up --scale order_service=2
```

### Performance Optimization
- Redis caching for frequently accessed data
- Database indexing for optimal queries
- Connection pooling for database connections
- CDN integration for static assets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Commercify** - Demonstrating distributed systems excellence through real-time e-commerce innovation.