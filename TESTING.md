# Testing Guide - Food Calorie Estimator

This document outlines the comprehensive testing setup for the Food Calorie Estimator project, including unit tests, integration tests, and coverage reporting.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Backend Testing (Python/pytest)](#backend-testing-pythonpytest)
- [Frontend Testing (React/Jest)](#frontend-testing-reactjest)
- [Integration Testing](#integration-testing)
- [Running Tests](#running-tests)
- [Coverage Reports](#coverage-reports)
- [Continuous Integration](#continuous-integration)

## 🎯 Overview

The testing suite covers:

- **Unit Tests**: Individual component/function testing
- **Integration Tests**: API endpoint and workflow testing
- **Coverage Reports**: Code coverage analysis
- **API Tests**: End-to-end API validation

### Testing Technologies

- **Backend**: pytest, pytest-cov, requests-mock
- **Frontend**: Jest, React Testing Library
- **Integration**: API testing with curl/requests
- **Coverage**: HTML and XML reports

## 🗂️ Test Structure

```
Food calorie estimator/
├── backend/
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── test_app.py          # Main app functionality
│   │   │   └── test_database.py     # Database operations
│   │   ├── integration/
│   │   │   └── test_api_integration.py  # API workflow tests
│   │   ├── conftest.py              # Test configuration & fixtures
│   │   └── __init__.py
│   ├── pytest.ini                  # Pytest configuration
│   └── requirements-test.txt       # Test dependencies
├── frontend/
│   ├── src/
│   │   ├── __tests__/
│   │   │   ├── components/          # Component tests
│   │   │   ├── pages/              # Page tests
│   │   │   └── App.test.tsx        # Main app tests
│   │   └── setupTests.ts           # Jest configuration
│   └── package.json                # Updated with Jest config
├── tests/
│   └── test_load_balancer.py       # Load balancer tests
├── test_runner.py                  # Comprehensive test runner
├── run_tests.sh                    # Quick test script
└── TESTING.md                      # This documentation
```

## 🐍 Backend Testing (Python/pytest)

### Setup

1. **Install test dependencies:**
   ```bash
   cd backend
   pip install -r requirements-test.txt
   ```

2. **Run backend tests:**
   ```bash
   cd backend
   python -m pytest -v --cov=. --cov-report=html:htmlcov --cov-report=term-missing
   ```

### Test Categories

#### Unit Tests (`backend/tests/unit/`)

**test_app.py** - Tests main application functionality:
- Health endpoint testing
- Prediction API validation
- Error handling
- File upload processing
- History and search endpoints
- Batch processing endpoints

**test_database.py** - Tests database operations:
- Model creation and validation
- Query operations
- Data integrity
- Statistics calculations

#### Configuration (`backend/tests/conftest.py`)

Provides test fixtures:
- `client`: Flask test client
- `db_session`: Database session for testing
- `mock_model`: Mocked ML model
- `sample_image`: Test image data
- `sample_prediction_data`: Mock prediction results

### Example Test Run

```bash
cd backend
python -m pytest tests/unit/test_app.py::test_predict_success -v
```

## ⚛️ Frontend Testing (React/Jest)

### Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Run frontend tests:**
   ```bash
   cd frontend
   npm run test:coverage
   ```

### Test Configuration

The `package.json` includes Jest configuration:
- **Test environment**: jsdom
- **Setup files**: `src/setupTests.ts`
- **Coverage collection**: All TypeScript/TSX files
- **Module mapping**: CSS files mocked

### Test Commands

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

## 🔗 Integration Testing

### API Integration Tests

Located in `backend/tests/integration/test_api_integration.py`:

- Full workflow testing
- Concurrent request handling
- Error scenario validation
- Batch processing workflows
- Pagination testing
- Health check validation

### Load Balancer Tests

Located in `tests/test_load_balancer.py`:

- Round-robin routing
- Health check mechanisms
- Failover handling
- Request logging
- Statistics tracking

### Running Integration Tests

```bash
# Start Docker containers first
docker-compose up -d

# Run integration tests
cd backend
python -m pytest tests/integration/ -v
```

## 🚀 Running Tests

### Method 1: Quick Shell Script

```bash
# Run all tests
./run_tests.sh

# Run specific test suite
./run_tests.sh backend
./run_tests.sh frontend
./run_tests.sh integration
```

### Method 2: Comprehensive Python Runner

```bash
# Run all tests with detailed reporting
python test_runner.py

# Run with options
python test_runner.py --verbose
python test_runner.py --backend-only
python test_runner.py --skip-integration
```

### Method 3: Individual Test Suites

**Backend only:**
```bash
cd backend
python -m pytest -v --cov=. --cov-report=html:htmlcov --cov-report=term-missing
```

**Frontend only:**
```bash
cd frontend
npm run test:coverage
```

**Integration only:**
```bash
# Ensure Docker is running
docker-compose up -d
cd backend
python -m pytest tests/integration/ -v
```

## 📊 Coverage Reports

### Backend Coverage

After running backend tests, coverage reports are generated:

- **HTML Report**: `backend/htmlcov/index.html`
- **Terminal Report**: Displayed during test run
- **XML Report**: `backend/coverage.xml` (for CI)

### Frontend Coverage

After running frontend tests with coverage:

- **HTML Report**: `frontend/coverage/lcov-report/index.html`
- **LCOV Report**: `frontend/coverage/lcov.info`
- **Text Summary**: Displayed in terminal

### Opening Coverage Reports

```bash
# Backend coverage (HTML)
open backend/htmlcov/index.html

# Frontend coverage (HTML)
open frontend/coverage/lcov-report/index.html
```

## 🔧 Test Configuration Files

### Backend (`backend/pytest.ini`)

```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
addopts = 
    --verbose
    --cov=.
    --cov-report=html:htmlcov
    --cov-report=term-missing
    --cov-report=xml
    --cov-exclude=tests/*
```

### Frontend (`frontend/package.json` - Jest section)

```json
{
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/src/setupTests.ts"],
    "collectCoverageFrom": [
      "src/**/*.{ts,tsx}",
      "!src/**/*.d.ts",
      "!src/main.tsx"
    ],
    "coverageReporters": ["text", "lcov", "html"]
  }
}
```

## 🤖 Continuous Integration

### GitHub Actions Example

Create `.github/workflows/tests.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v3
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install -r requirements-test.txt
      - name: Run tests
        run: |
          cd backend
          python -m pytest --cov=. --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend
          npm install
      - name: Run tests
        run: |
          cd frontend
          npm run test:ci
```

## 🐛 Common Issues & Solutions

### Issue: Jest tests fail with module not found

**Solution:** Ensure all testing dependencies are installed:
```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

### Issue: Python tests can't find modules

**Solution:** Add project root to Python path or install in development mode:
```bash
cd backend
pip install -e .
```

### Issue: Integration tests fail with connection errors

**Solution:** Ensure Docker containers are running:
```bash
docker-compose up -d
# Wait a few seconds for containers to start
sleep 10
```

### Issue: Coverage reports not generated

**Solution:** Check that coverage packages are installed:
```bash
pip install pytest-cov coverage
npm install --save-dev jest
```

## 📈 Test Coverage Goals

- **Backend**: Aim for >80% code coverage
- **Frontend**: Aim for >70% code coverage
- **Integration**: Cover all major API endpoints
- **Critical Paths**: 100% coverage for prediction workflow

## 🎯 Testing Best Practices

1. **Write tests first** when adding new features
2. **Mock external dependencies** (APIs, databases, file systems)
3. **Test error conditions** not just happy paths
4. **Keep tests isolated** and independent
5. **Use descriptive test names** that explain what is being tested
6. **Regularly review and update** test coverage
7. **Run tests locally** before committing code

## 📞 Support

For testing issues or questions:

1. Check this documentation first
2. Review test logs and error messages
3. Ensure all dependencies are installed
4. Verify Docker containers are running for integration tests
5. Check that services are running on expected ports

---

**Happy Testing! 🧪✨** 