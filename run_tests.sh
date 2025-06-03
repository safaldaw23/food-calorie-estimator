#!/bin/bash

# Food Calorie Estimator - Test Runner Script
# Usage: ./run_tests.sh [backend|frontend|integration|all]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo ""
    print_status $BLUE "================================="
    print_status $BLUE "$1"
    print_status $BLUE "================================="
}

# Default test type
TEST_TYPE=${1:-all}

case $TEST_TYPE in
    "backend")
        print_header "🐍 Running Backend Tests Only"
        cd backend && python -m pytest -v --cov=. --cov-report=html:htmlcov --cov-report=term-missing
        print_status $GREEN "✅ Backend tests completed!"
        print_status $YELLOW "📊 Coverage report: backend/htmlcov/index.html"
        ;;
    
    "frontend")
        print_header "⚛️  Running Frontend Tests Only"
        if [ ! -d "frontend/node_modules" ]; then
            print_status $YELLOW "📦 Installing frontend dependencies..."
            cd frontend && npm install
        fi
        cd frontend && npm run test:coverage
        print_status $GREEN "✅ Frontend tests completed!"
        print_status $YELLOW "📊 Coverage report: frontend/coverage/lcov-report/index.html"
        ;;
    
    "integration")
        print_header "🔗 Running Integration Tests Only"
        
        # Check if Docker containers are running
        if ! docker-compose ps | grep -q "Up"; then
            print_status $YELLOW "🐳 Starting Docker containers..."
            docker-compose up -d
            sleep 5
        fi
        
        # Run integration tests
        cd backend && python -m pytest tests/integration/ -v
        
        # Quick API health checks
        print_status $BLUE "🌐 Testing API endpoints..."
        
        # Test health endpoint
        if curl -sf http://localhost:9000/health > /dev/null; then
            print_status $GREEN "   ✅ Health endpoint: OK"
        else
            print_status $RED "   ❌ Health endpoint: FAILED"
        fi
        
        # Test history endpoint
        if curl -sf http://localhost:9000/history > /dev/null; then
            print_status $GREEN "   ✅ History endpoint: OK"
        else
            print_status $RED "   ❌ History endpoint: FAILED"
        fi
        
        print_status $GREEN "✅ Integration tests completed!"
        ;;
    
    "all")
        print_header "🚀 Running All Tests"
        
        # Backend tests
        print_status $BLUE "Running backend tests..."
        cd backend
        if python -m pytest -v --cov=. --cov-report=html:htmlcov --cov-report=term-missing; then
            print_status $GREEN "✅ Backend tests: PASSED"
        else
            print_status $RED "❌ Backend tests: FAILED"
            exit 1
        fi
        cd ..
        
        # Frontend tests (optional, skip if Node.js not available)
        if command -v node &> /dev/null; then
            print_status $BLUE "Running frontend tests..."
            cd frontend
            if [ ! -d "node_modules" ]; then
                print_status $YELLOW "📦 Installing frontend dependencies..."
                npm install
            fi
            
            if npm run test:coverage; then
                print_status $GREEN "✅ Frontend tests: PASSED"
            else
                print_status $YELLOW "⚠️  Frontend tests: FAILED (continuing...)"
            fi
            cd ..
        else
            print_status $YELLOW "⏭️  Skipping frontend tests (Node.js not found)"
        fi
        
        # Integration tests (if Docker is available)
        if command -v docker-compose &> /dev/null; then
            print_status $BLUE "Running integration tests..."
            
            # Start Docker containers if not running
            if ! docker-compose ps | grep -q "Up"; then
                print_status $YELLOW "🐳 Starting Docker containers..."
                docker-compose up -d
                sleep 10
            fi
            
            # Run integration tests
            cd backend
            if python -m pytest tests/integration/ -v; then
                print_status $GREEN "✅ Integration tests: PASSED"
            else
                print_status $YELLOW "⚠️  Integration tests: FAILED (continuing...)"
            fi
            cd ..
            
            # API health checks
            print_status $BLUE "🌐 API Health Checks..."
            sleep 2
            
            if curl -sf http://localhost:9000/health > /dev/null; then
                print_status $GREEN "   ✅ Load balancer health: OK"
            else
                print_status $RED "   ❌ Load balancer health: FAILED"
            fi
            
        else
            print_status $YELLOW "⏭️  Skipping integration tests (Docker not found)"
        fi
        
        print_header "📊 Test Summary"
        
        # Coverage reports
        if [ -f "backend/htmlcov/index.html" ]; then
            print_status $GREEN "📈 Backend coverage: backend/htmlcov/index.html"
        fi
        
        if [ -f "frontend/coverage/lcov-report/index.html" ]; then
            print_status $GREEN "📈 Frontend coverage: frontend/coverage/lcov-report/index.html"
        fi
        
        print_status $GREEN "🎉 All tests completed!"
        ;;
    
    *)
        print_status $RED "❌ Invalid test type: $TEST_TYPE"
        echo ""
        echo "Usage: $0 [backend|frontend|integration|all]"
        echo ""
        echo "  backend     - Run Python/pytest tests only"
        echo "  frontend    - Run React/Jest tests only"
        echo "  integration - Run API and Docker integration tests"
        echo "  all         - Run all test suites (default)"
        echo ""
        exit 1
        ;;
esac

print_status $GREEN "✨ Test run complete!" 