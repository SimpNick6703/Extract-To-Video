#!/bin/bash

echo "=========================================="
echo "Canvas Animation Capture and Conversion"
echo "=========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is available (handles both 'docker-compose' and 'docker compose')
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ Error: Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Create output directories if they don't exist
mkdir -p output frames

echo "🔨 Building and starting Docker container..."
echo "This will run both the capture and video creation steps."
echo "This may take a few minutes..."

# Use docker-compose up to build the image (if needed) and run the container.
# The Dockerfile's CMD (docker-run.sh) will handle the sequential execution
# of capture.js and create-video.js.
$COMPOSE_CMD up --build --remove-orphans

# Check the exit code of the docker-compose up command
if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "SUCCESS: Full process completed successfully!"
    echo "=========================================="
    echo ""
    echo "Output files are available in the ./output directory:"
    ls -la ./output/
else
    echo ""
    echo "ERROR: The Docker process failed!"
    echo "Please check the logs above for details."
    exit 1
fi

echo ""
echo "Cleaning up containers..."
$COMPOSE_CMD down

echo "Done!"
echo "=========================================="