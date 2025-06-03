# 🍔 Food Calorie Estimator

![System Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![Frontend](https://img.shields.io/badge/Frontend-React%2BTypeScript-61dafb)
![Backend](https://img.shields.io/badge/Backend-Flask-green)
![ML](https://img.shields.io/badge/ML-PyTorch%2BResNet50-orange)
![Docker](https://img.shields.io/badge/Container-Docker-2496ed)

A **production-ready** full-stack web application that uses AI (ResNet-50) to identify food items from images and estimate their calorie and nutrient content. Features a scalable microservices architecture with load balancing and comprehensive testing.

## ✨ Features

- 🖼️ **AI-Powered Food Recognition** - Upload images via drag & drop or file picker
- 🧠 **ResNet-50 Deep Learning Model** - Pre-trained on ImageNet with custom food classification
- 📊 **Nutritional Analysis** - Detailed calorie, protein, carbs, and fat estimation
- 📈 **Prediction History** - Track and search past predictions
- ⚖️ **Load Balanced Architecture** - 3 backend servers with round-robin distribution
- 🧪 **Comprehensive Testing** - Unit tests, integration tests, and coverage reports
- 🐳 **Docker Support** - Full containerization with Docker Compose
- 📱 **Responsive Design** - Modern UI with Material-UI components

## 🏗️ System Architecture

```
Frontend (React + Vite) → Load Balancer (Port 9000) → 3 Backend Servers (8000-8002)
                                                     ↓
                                              SQLite Database (Shared)
```

### Components:
- **Frontend**: React with TypeScript, Vite, Material-UI
- **Load Balancer**: Flask-based round-robin load balancer
- **Backend Servers**: 3 Flask instances for high availability
- **Database**: Shared SQLite with SQLAlchemy ORM
- **ML Pipeline**: PyTorch ResNet-50 → Softmax → Nutrition Lookup

## 🚀 Quick Start

### Docker Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/safaldaw23/food-calorie-estimator.git
cd food-calorie-estimator

# Start all services with Docker Compose
./docker-start.sh

# Stop all services
./docker-stop.sh
```

**Access Points:**
- **Frontend**: http://localhost:3000
- **Load Balancer**: http://localhost:9000
- **Backend Servers**: http://localhost:8000-8002

### Alternative Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build -d
```

## 🧪 Testing

Comprehensive testing infrastructure with **64% backend coverage** and **9/13 frontend tests passing**:

```bash
# Run all tests with coverage
python test_runner.py

# Or use the shell script
./run_tests.sh

# Individual test suites
pytest backend/tests/ --cov=backend --cov-report=html
cd frontend && npm test -- --coverage
```

## 📊 API Endpoints

### Load Balancer (Port 9000)
- `POST /predict` - Food prediction (auto-routed to available backend)
- `GET /history` - Prediction history (auto-routed)
- `GET /health` - Load balancer health status
- `GET /stats` - Load balancer statistics

### Backend Servers (8000-8002)
- `POST /predict` - Upload image for food recognition
- `GET /history` - Get prediction history
- `GET /api/predictions/search` - Search predictions
- `GET /uploads/<filename>` - Serve uploaded images

## 🗂️ Project Structure

```
food-calorie-estimator/
├── 📁 frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── config/             # API configuration
│   │   └── App.tsx
│   ├── package.json
│   ├── Dockerfile              # Frontend container
│   └── setupTests.ts
├── 📁 backend/                  # Flask backend server
│   ├── app.py                  # Main Flask application
│   ├── database.py             # Database models & setup
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Backend container
│   └── nutrition_data.json     # Nutrition lookup data
├── 📁 tests/                   # Test suites
│   ├── backend/                # Backend tests (pytest)
│   └── frontend/               # Frontend tests (Jest)
├── 📁 shared/                  # Shared resources
│   └── food_predictions.db     # SQLite database
├── load_balancer.py            # Load balancer service
├── docker-compose.yml          # Multi-container orchestration
├── Dockerfile.loadbalancer     # Load balancer container
├── docker-start.sh             # Docker startup script
├── docker-stop.sh              # Docker shutdown script
├── test_runner.py              # Comprehensive test runner
└── TESTING.md                  # Testing documentation
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Fast build tool
- **Material-UI** - Component library
- **React Router** - Navigation
- **Axios** - HTTP client
- **Jest** - Testing framework

### Backend
- **Flask** - Web framework
- **SQLAlchemy** - ORM
- **PyTorch** - ML framework
- **ResNet-50** - Pre-trained model
- **SQLite** - Database
- **pytest** - Testing framework

### Infrastructure
- **Docker & Docker Compose**
- **Load Balancer** (Custom Flask-based)
- **Redis** (Optional, for Celery tasks)
- **Celery** (Optional, for background processing)
- **Nginx** (Frontend reverse proxy)

## 🔧 Development

### Adding New Features

1. **Backend**: Add routes in `backend/app.py`
2. **Frontend**: Create components in `frontend/src/components/`
3. **Tests**: Add tests in `tests/backend/` or `tests/frontend/`
4. **Documentation**: Update README.md and relevant docs

### Database Management

```bash
# Access database through Docker
docker-compose exec backend python query_database.py

# Or connect directly to SQLite
sqlite3 shared/food_predictions.db
```

### Development with Docker

```bash
# Build and start in development mode
docker-compose -f docker-compose.yml up --build

# View specific service logs
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f load-balancer

# Execute commands in running containers
docker-compose exec backend bash
docker-compose exec frontend bash
```

### Monitoring

- **Logs**: `docker-compose logs -f`
- **Health Checks**: Visit `/health` endpoints
- **Stats**: Visit `/stats` on load balancer
- **Container Status**: `docker-compose ps`

## 📈 Performance & Scalability

- **Load Balancing**: Round-robin across 3 backend servers
- **Containerization**: Easy horizontal scaling with Docker
- **Database**: Optimized with indexes and connection pooling  
- **Caching**: Ready for Redis integration
- **Background Tasks**: Celery support for async processing
- **Monitoring**: Health checks and detailed logging

## 🐳 Docker Architecture

The application runs in multiple containers:

- **Frontend Container**: Nginx + React build (Port 3000)
- **Backend Containers**: 3 Flask instances (Ports 8000-8002)
- **Load Balancer Container**: Custom Flask load balancer (Port 9000)
- **Redis Container**: Caching and task queue (Port 6379)
- **Celery Worker**: Background task processing
- **Shared Volumes**: Database and uploads persistence

## 🔮 Future Enhancements

- [ ] Redis caching for faster responses
- [ ] CI/CD pipelines with GitHub Actions
- [ ] Kubernetes orchestration
- [ ] Advanced ML models (Vision Transformers)
- [ ] Mobile application (React Native)
- [ ] Cloud deployment (AWS/GCP/Azure)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Contact

For questions or suggestions, please open an issue in this repository.

---

**Built with ❤️ using React, Flask, and PyTorch** 