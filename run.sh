#!/bin/bash

# Canvas Video Extractor Runner Script
# This script builds and runs the Docker container to extract animated canvas content

echo "🎯 Canvas Video Extractor for Wuthering Waves"
echo "=============================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Create output directories
mkdir -p output frames

echo "🔨 Building Docker image..."
$COMPOSE_CMD build

echo "🚀 Starting canvas extraction..."
$COMPOSE_CMD up --remove-orphans

echo "📁 Checking output..."
if [ -f "output/*.mp4" ]; then
    echo "✅ Video file created successfully!"
    ls -la output/
else
    echo "⚠️  No MP4 file found. Check the logs above for errors."
fi

echo "🧹 Cleaning up containers..."
$COMPOSE_CMD down

echo "✨ Process complete!"