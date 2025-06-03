#!/bin/bash

# Food Calorie Estimator - Docker Shutdown Script
# Gracefully stops all containers and cleans up

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}🐳 FOOD CALORIE ESTIMATOR - DOCKER SHUTDOWN${NC}"
echo -e "${CYAN}============================================================${NC}"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️  docker-compose not found, using 'docker compose'${NC}"
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Show current running containers
echo -e "${BLUE}📊 Current container status:${NC}"
$COMPOSE_CMD ps 2>/dev/null || echo "No containers running"

# Stop containers gracefully
echo -e "\n${YELLOW}🛑 Stopping containers gracefully...${NC}"
$COMPOSE_CMD down

# Optional: Remove volumes (uncomment if you want to clear data)
# echo -e "${RED}🗑️  Removing volumes...${NC}"
# $COMPOSE_CMD down -v

# Optional: Remove images (uncomment if you want to clean up images)
# echo -e "${RED}🗑️  Removing images...${NC}"
# docker rmi $(docker images -q food-calorie-estimator_*) 2>/dev/null || true

# Clean up any orphaned containers
echo -e "${BLUE}🧹 Cleaning up orphaned containers...${NC}"
$COMPOSE_CMD down --remove-orphans 2>/dev/null || true

echo -e "\n${GREEN}✅ All containers stopped successfully!${NC}"
echo -e "${BLUE}💡 Data is preserved in volumes. Use docker-start.sh to restart.${NC}"

# Show final status
echo -e "\n${CYAN}📊 FINAL STATUS${NC}"
echo -e "${CYAN}============================================================${NC}"
$COMPOSE_CMD ps 2>/dev/null || echo "No containers running" 