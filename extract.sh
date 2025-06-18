#!/bin/bash

echo "🎯 Canvas Animation Extractor for Wuthering Waves"
echo "================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "🔨 Building Docker image..."
docker build -t canvas-extractor .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "✅ Docker image built successfully!"
echo ""
echo "🚀 Running canvas extraction..."
echo "This will:"
echo "  1. Navigate to the Wuthering Waves event page"
echo "  2. Capture canvas animation frames at maximum resolution"
echo "  3. Convert frames to high-quality MP4 files"
echo ""

# Create output directory on host
mkdir -p ./output

# Run the container
CONTAINER_ID=$(docker run -d --shm-size=2gb canvas-extractor)

echo "🔄 Container started with ID: $CONTAINER_ID"
echo "📊 Following container logs..."
echo ""

# Follow logs
docker logs -f $CONTAINER_ID

# Check if container completed successfully
EXIT_CODE=$(docker wait $CONTAINER_ID)

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Extraction completed successfully!"
    echo "📁 Copying output files to host..."
    
    # Copy output files to host
    docker cp $CONTAINER_ID:/app/output ./
    docker cp $CONTAINER_ID:/app/capture_metadata.json ./ 2>/dev/null || true
    
    echo "✅ Files copied to ./output directory:"
    ls -la ./output/
    
    echo ""
    echo "🎉 Process completed! Check the ./output directory for your videos."
else
    echo ""
    echo "❌ Extraction failed with exit code: $EXIT_CODE"
    echo "📋 Check the logs above for error details."
fi

# Clean up container
echo "🧹 Cleaning up container..."
docker rm $CONTAINER_ID > /dev/null

echo "Done!"
