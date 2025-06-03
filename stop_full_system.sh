#!/bin/bash

# Food Calorie Estimator - System Shutdown Script
# This script stops all running services

echo "🛑 Stopping Food Calorie Estimator - Full System"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to stop process on port
stop_port() {
    local port=$1
    local service_name=$2
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}🔴 Stopping $service_name (Port $port, PID: $pid)${NC}"
        kill -15 $pid 2>/dev/null  # Try graceful shutdown first
        sleep 2
        
        # Check if still running
        if kill -0 $pid 2>/dev/null; then
            echo -e "${RED}   Force killing $service_name...${NC}"
            kill -9 $pid 2>/dev/null
            sleep 1
        fi
        
        # Verify it's stopped
        if ! kill -0 $pid 2>/dev/null; then
            echo -e "${GREEN}   ✅ $service_name stopped successfully${NC}"
        else
            echo -e "${RED}   ❌ Failed to stop $service_name${NC}"
        fi
    else
        echo -e "${BLUE}   ℹ️  $service_name (Port $port): Not running${NC}"
    fi
}

# Stop all services
echo -e "${BLUE}🛑 Stopping all services...${NC}"
echo ""

# Stop Frontend
stop_port 5173 "Frontend (Primary)"
stop_port 5174 "Frontend (Alternative)"
stop_port 5175 "Frontend (Alternative)"

echo ""

# Stop Load Balancer
stop_port 9000 "Load Balancer"

echo ""

# Stop Backend Servers
stop_port 8000 "Backend Server 1"
stop_port 8001 "Backend Server 2"
stop_port 8002 "Backend Server 3"

echo ""

# Stop Redis and Celery
echo -e "${BLUE}🔧 Stopping Redis and Celery...${NC}"

# Stop Celery workers
if pgrep -f "celery.*worker" >/dev/null; then
    echo -e "${YELLOW}🔴 Stopping Celery Workers${NC}"
    pkill -f "celery.*worker" && echo -e "${GREEN}   ✅ Celery workers stopped${NC}"
fi

# Stop Redis
if redis-cli ping >/dev/null 2>&1; then
    echo -e "${YELLOW}🔴 Stopping Redis Server${NC}"
    redis-cli shutdown && echo -e "${GREEN}   ✅ Redis server stopped${NC}"
fi

# Clean up any remaining processes
echo -e "${BLUE}🧹 Cleaning up remaining processes...${NC}"

# Kill any remaining Python processes related to our app
pkill -f "app.py" 2>/dev/null && echo -e "${YELLOW}   Killed remaining backend processes${NC}"
pkill -f "load_balancer.py" 2>/dev/null && echo -e "${YELLOW}   Killed remaining load balancer processes${NC}"

# Kill any remaining Node/Vite processes
pkill -f "vite" 2>/dev/null && echo -e "${YELLOW}   Killed remaining frontend processes${NC}"

echo ""

# Final verification
echo -e "${BLUE}🔍 Final verification...${NC}"
active_ports=()

for port in 5173 5174 5175 8000 8001 8002 9000; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        active_ports+=($port)
    fi
done

if [ ${#active_ports[@]} -eq 0 ]; then
    echo -e "${GREEN}   ✅ All services stopped successfully${NC}"
else
    echo -e "${RED}   ⚠️  Some ports still active: ${active_ports[*]}${NC}"
    echo -e "${YELLOW}   You may need to manually kill these processes${NC}"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}🎉 Shutdown Complete!${NC}"
echo "=================================================="
echo ""
echo -e "${BLUE}📋 System Status: ${GREEN}All services stopped${NC}"
echo -e "${BLUE}📝 Log files preserved in: ${YELLOW}logs/${NC}"
echo -e "${BLUE}🗄️  Database preserved: ${YELLOW}backend/food_predictions.db${NC}"
echo ""
echo -e "${GREEN}✨ Ready for next startup with: ./start_full_system.sh${NC}"
echo "==================================================" 