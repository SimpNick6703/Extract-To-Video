#!/bin/bash

echo "=========================================="
echo "Canvas Animation Capture and Conversion"
echo "=========================================="

# Step 1: Build the Docker image if it doesn't exist
docker-compose build

echo ""
echo "Step 1: Capturing canvas animation frames..."
echo "This may take a few minutes..."

# Use the correct service name 'canvas-extractor' and run capture.js directly
call docker-compose run --rm canvas-extractor node capture.js
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Frame capture failed!"
    echo "Please check the logs and debug screenshots (debug_*.png)."
    exit 1
fi

echo ""
echo "=========================================="
echo "Step 2: Converting frames to a high-quality video..."
echo "=========================================="

# Use the correct service name 'canvas-extractor' and run create-video.js directly
call docker-compose run --rm canvas-extractor node create-video.js
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Video creation failed."
    exit 1
fi

echo ""
echo "SUCCESS: Process completed!"

# Cleanup
echo "Cleaning up container..."
docker-compose down

echo "Done!"