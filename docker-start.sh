#!/bin/bash

# Food Calorie Estimator - Docker Startup Script
# Builds and starts all containers with proper monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}🐳 FOOD CALORIE ESTIMATOR - DOCKER STARTUP${NC}"
echo -e "${CYAN}============================================================${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️  docker-compose not found, using 'docker compose'${NC}"
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo -e "${BLUE}📋 Pre-flight checks...${NC}"

# Create shared directory if it doesn't exist
if [ ! -d "shared" ]; then
    echo -e "${YELLOW}📁 Creating shared directory...${NC}"
    mkdir -p shared
fi

# Stop any existing containers
echo -e "${YELLOW}🛑 Stopping any existing containers...${NC}"
$COMPOSE_CMD down 2>/dev/null || true

# Build and start containers
echo -e "${GREEN}🔨 Building Docker images...${NC}"
$COMPOSE_CMD build --no-cache

echo -e "${GREEN}🚀 Starting containers...${NC}"
$COMPOSE_CMD up -d

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 10

# Health check function
check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}🔍 Checking $service_name...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is healthy${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}⏳ Waiting for $service_name (attempt $attempt/$max_attempts)...${NC}"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name failed to start${NC}"
    return 1
}

# Check all services
echo -e "\n${CYAN}🔍 HEALTH CHECKS${NC}"
echo -e "${CYAN}============================================================${NC}"

# Check backend services
check_service "Backend Server 1" "http://localhost:8000/health"
check_service "Backend Server 2" "http://localhost:8001/health"
check_service "Backend Server 3" "http://localhost:8002/health"

# Check load balancer
check_service "Load Balancer" "http://localhost:9000/health"

# Check frontend
check_service "Frontend" "http://localhost:3000/health"

# Display running containers
echo -e "\n${CYAN}📊 CONTAINER STATUS${NC}"
echo -e "${CYAN}============================================================${NC}"
$COMPOSE_CMD ps

# Display service URLs
echo -e "\n${GREEN}🌐 SERVICE URLS${NC}"
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}Frontend:      http://localhost:3000${NC}"
echo -e "${GREEN}Load Balancer: http://localhost:9000${NC}"
echo -e "${GREEN}Backend 1:     http://localhost:8000${NC}"
echo -e "${GREEN}Backend 2:     http://localhost:8001${NC}"
echo -e "${GREEN}Backend 3:     http://localhost:8002${NC}"

echo -e "\n${CYAN}📋 USEFUL COMMANDS${NC}"
echo -e "${CYAN}============================================================${NC}"
echo -e "${YELLOW}View logs:         $COMPOSE_CMD logs -f [service]${NC}"
echo -e "${YELLOW}Stop containers:   $COMPOSE_CMD down${NC}"
echo -e "${YELLOW}Restart service:   $COMPOSE_CMD restart [service]${NC}"
echo -e "${YELLOW}Container shell:   $COMPOSE_CMD exec [service] /bin/bash${NC}"

echo -e "\n${GREEN}✅ Docker setup complete! Your Food Calorie Estimator is running.${NC}" 