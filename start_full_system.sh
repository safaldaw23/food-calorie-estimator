#!/bin/bash

# Food Calorie Estimator - Full System Startup Script
# This script starts the load balancer, 3 backend servers, Redis, Celery worker, and frontend

echo "🚀 Starting Food Calorie Estimator - Full System"
echo "=================================================="

# Set environment variables for local development
export BACKEND_1_URL=http://localhost:8000
export BACKEND_2_URL=http://localhost:8001  
export BACKEND_3_URL=http://localhost:8002
export REDIS_URL=redis://localhost:6379/0

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to stop process on port
stop_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}⚠️  Stopping existing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null
        sleep 2
    fi
}

# Function to check if Redis is installed
check_redis() {
    if command -v redis-server >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Clean up any existing processes
echo -e "${BLUE}🧹 Cleaning up existing processes...${NC}"
stop_port 8000
stop_port 8001
stop_port 8002
stop_port 9000
stop_port 5173
stop_port 5174
stop_port 5175
stop_port 6379

echo ""

# Check and start Redis
echo -e "${BLUE}🔧 Starting Redis Server...${NC}"
if check_redis; then
    redis-server --daemonize yes --port 6379 --save "" --appendonly no
    sleep 2
    if redis-cli ping >/dev/null 2>&1; then
        echo -e "   ✅ Redis Server (Port 6379): ${GREEN}Running${NC}"
    else
        echo -e "   ❌ Redis Server (Port 6379): ${RED}Failed to start${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Redis not installed. Batch processing will not work.${NC}"
    echo -e "   ${YELLOW}   Install Redis with: brew install redis${NC}"
fi

echo ""

# Start Backend Servers
echo -e "${BLUE}🖥️  Starting Backend Servers...${NC}"

# Create logs directory if it doesn't exist
mkdir -p logs

echo "   Starting Backend Server 1 (Port 8000)..."
(cd backend && python app.py 8000) > logs/backend_8000.log 2>&1 &
BACKEND1_PID=$!
sleep 2

echo "   Starting Backend Server 2 (Port 8001)..."
(cd backend && python app.py 8001) > logs/backend_8001.log 2>&1 &
BACKEND2_PID=$!
sleep 2

echo "   Starting Backend Server 3 (Port 8002)..."
(cd backend && python app.py 8002) > logs/backend_8002.log 2>&1 &
BACKEND3_PID=$!
sleep 3

# Check if backend servers started successfully
echo -e "${BLUE}🔍 Checking Backend Server Status...${NC}"
for port in 8000 8001 8002; do
    if curl -s "http://localhost:$port/health" > /dev/null; then
        echo -e "   ✅ Backend Server (Port $port): ${GREEN}Running${NC}"
    else
        echo -e "   ❌ Backend Server (Port $port): ${RED}Failed to start${NC}"
    fi
done

# Start Celery Worker (if Redis is available)
echo ""
echo -e "${BLUE}⚙️  Starting Celery Worker...${NC}"
if redis-cli ping >/dev/null 2>&1; then
    (cd backend && celery -A celery_worker worker --loglevel=info) > logs/celery_worker.log 2>&1 &
    CELERY_PID=$!
    sleep 3
    if kill -0 $CELERY_PID 2>/dev/null; then
        echo -e "   ✅ Celery Worker: ${GREEN}Running${NC} (PID: $CELERY_PID)"
    else
        echo -e "   ❌ Celery Worker: ${RED}Failed to start${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Celery Worker: ${YELLOW}Skipped (Redis not available)${NC}"
    CELERY_PID=""
fi

# Start Load Balancer
echo ""
echo -e "${BLUE}⚖️  Starting Load Balancer...${NC}"
python load_balancer.py > logs/load_balancer.log 2>&1 &
LOAD_BALANCER_PID=$!
sleep 3

# Check if load balancer started successfully
if curl -s "http://localhost:9000/health" > /dev/null; then
    echo -e "   ✅ Load Balancer (Port 9000): ${GREEN}Running${NC}"
else
    echo -e "   ❌ Load Balancer (Port 9000): ${RED}Failed to start${NC}"
fi

# Start Frontend
echo ""
echo -e "${BLUE}🌐 Starting Frontend...${NC}"
(cd frontend && npm run dev) > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 5

# Check if frontend started
echo -e "${BLUE}🔍 Checking Frontend Status...${NC}"
if curl -s "http://localhost:5173" > /dev/null 2>&1; then
    echo -e "   ✅ Frontend (Port 5173): ${GREEN}Running${NC}"
elif curl -s "http://localhost:5174" > /dev/null 2>&1; then
    echo -e "   ✅ Frontend (Port 5174): ${GREEN}Running${NC}"
elif curl -s "http://localhost:5175" > /dev/null 2>&1; then
    echo -e "   ✅ Frontend (Port 5175): ${GREEN}Running${NC}"
else
    echo -e "   ❌ Frontend: ${RED}Failed to start or still starting...${NC}"
fi

cd ..

# Display system status
echo ""
echo "=================================================="
echo -e "${GREEN}🎉 System Startup Complete!${NC}"
echo "=================================================="
echo ""
echo -e "${BLUE}📋 System Architecture:${NC}"
echo "   Frontend (React + Vite) → Load Balancer → 3 Backend Servers"
echo ""
echo -e "${BLUE}🌐 Access Points:${NC}"

# Check which frontend port is actually running
if curl -s "http://localhost:5173" > /dev/null 2>&1; then
    echo -e "   • Frontend:      ${GREEN}http://localhost:5173${NC}"
elif curl -s "http://localhost:5174" > /dev/null 2>&1; then
    echo -e "   • Frontend:      ${GREEN}http://localhost:5174${NC}"
elif curl -s "http://localhost:5175" > /dev/null 2>&1; then
    echo -e "   • Frontend:      ${GREEN}http://localhost:5175${NC}"
else
    echo -e "   • Frontend:      ${YELLOW}Starting... (check in a moment)${NC}"
fi

echo -e "   • Load Balancer: ${GREEN}http://localhost:9000${NC}"
echo -e "   • Backend 1:     ${GREEN}http://localhost:8000${NC}"
echo -e "   • Backend 2:     ${GREEN}http://localhost:8001${NC}"
echo -e "   • Backend 3:     ${GREEN}http://localhost:8002${NC}"
echo ""

echo -e "${BLUE}📊 Load Balancer Endpoints:${NC}"
echo "   • GET  /health  - Load balancer health"
echo "   • GET  /stats   - Load balancer statistics"
echo "   • POST /predict - Food prediction (auto-routed)"
echo "   • GET  /history - Prediction history (auto-routed)"
echo ""

echo -e "${BLUE}🔍 Quick Health Check:${NC}"
curl -s "http://localhost:9000/stats" | python -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"   • Total Servers: {data['servers']['total']}\")
    print(f\"   • Healthy Servers: {data['servers']['healthy']}\")
    print(f\"   • Algorithm: {data['load_balancer']['algorithm']}\")
    print(f\"   • Next Server: {data['next_server']}\")
except:
    print('   • Load Balancer: Still starting...')
"

echo ""
echo -e "${BLUE}📝 Process IDs (for manual management):${NC}"
echo "   • Backend 1 PID: $BACKEND1_PID"
echo "   • Backend 2 PID: $BACKEND2_PID"
echo "   • Backend 3 PID: $BACKEND3_PID"
echo "   • Load Balancer PID: $LOAD_BALANCER_PID"
echo "   • Frontend PID: $FRONTEND_PID"
if [ ! -z "$CELERY_PID" ]; then
    echo "   • Celery Worker PID: $CELERY_PID"
fi
echo "   • Redis Server: Use 'redis-cli shutdown' to stop"
echo ""

echo -e "${BLUE}📋 Log Files:${NC}"
echo "   • Backend Logs: logs/backend_*.log"
echo "   • Load Balancer: logs/load_balancer.log"
echo "   • Frontend: logs/frontend.log"
if [ ! -z "$CELERY_PID" ]; then
    echo "   • Celery Worker: logs/celery_worker.log"
fi
echo ""

echo -e "${YELLOW}⚠️  To stop all services, run: ./stop_full_system.sh${NC}"
echo -e "${GREEN}✨ Your Food Calorie Estimator is ready!${NC}"
echo "==================================================" 