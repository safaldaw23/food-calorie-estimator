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

### Option 1: Manual Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/safaldaw23/food-calorie-estimator.git
cd food-calorie-estimator

# Install Python dependencies
pip install -r backend/requirements.txt

# Install Node.js dependencies
cd frontend && npm install && cd ..

# Start the load balancer
python load_balancer.py &

# Start backend servers in separate terminals
cd backend && python app.py  # Will start on port 8000

# Start frontend
cd frontend && npm run dev
```

**Access Points:**
- **Frontend**: http://localhost:5173
- **Load Balancer**: http://localhost:9000
- **Backend Servers**: http://localhost:8000

### Option 2: Docker (Production-Ready)

```bash
# Start with Docker Compose
./docker-start.sh

# Stop services
./docker-stop.sh
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
│   └── setupTests.ts
├── 📁 backend/                  # Flask backend server
│   ├── app.py                  # Main Flask application
│   ├── database.py             # Database models & setup
│   ├── requirements.txt        # Python dependencies
│   └── nutrition_data.json     # Nutrition lookup data
├── 📁 tests/                   # Test suites
│   ├── backend/                # Backend tests (pytest)
│   └── frontend/               # Frontend tests (Jest)
├── 📁 shared/                  # Shared resources
│   └── food_predictions.db     # SQLite database
├── 📁 logs/                    # Application logs
├── load_balancer.py            # Load balancer service
├── docker-compose.yml          # Docker configuration
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

## 🔧 Development

### Adding New Features

1. **Backend**: Add routes in `backend/app.py`
2. **Frontend**: Create components in `frontend/src/components/`
3. **Tests**: Add tests in `tests/backend/` or `tests/frontend/`
4. **Documentation**: Update README.md and relevant docs

### Database Management

```bash
# Query database directly
python query_database.py

# Or use SQLite CLI
sqlite3 shared/food_predictions.db
```

### Running Multiple Backend Servers

```bash
# Terminal 1 - Backend Server 1 (Port 8000)
cd backend && python app.py

# Terminal 2 - Backend Server 2 (Port 8001)
cd backend && PORT=8001 python app.py

# Terminal 3 - Backend Server 3 (Port 8002)
cd backend && PORT=8002 python app.py

# Terminal 4 - Load Balancer
python load_balancer.py
```

### Monitoring

- **Logs**: Check `logs/` directory for service logs
- **Health Checks**: Visit `/health` endpoints
- **Stats**: Visit `/stats` on load balancer

## 📈 Performance & Scalability

- **Load Balancing**: Round-robin across 3 backend servers
- **Database**: Optimized with indexes and connection pooling  
- **Caching**: Ready for Redis integration
- **Background Tasks**: Celery support for async processing
- **Monitoring**: Health checks and detailed logging

## 🐳 Docker Deployment

Full Docker support with multi-container setup:

- **Frontend Container**: Nginx + React build
- **Backend Containers**: 3 Flask instances
- **Load Balancer Container**: Custom Flask load balancer
- **Shared Volumes**: Database and uploads

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