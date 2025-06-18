#!/bin/bash

echo "=========================================="
echo "Canvas Animation Capture and Conversion"
echo "=========================================="

# Set permissions
chmod +x /app/convert.sh

echo "Step 1: Capturing canvas animation frames..."
echo "This may take a few minutes..."

# Run the capture script
node capture.js

# Check if capture was successful
if [ $? -eq 0 ] && [ -d "./frames" ] && [ "$(ls -A ./frames)" ]; then
    echo ""
    echo "✓ Frame capture completed successfully!"
    echo ""
    echo "Step 2: Converting frames to MP4..."
    
    # Run the conversion script
    bash convert.sh
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "=========================================="
        echo "✓ Process completed successfully!"
        echo "=========================================="
        echo ""
        echo "Output files are available in the ./output directory:"
        ls -la ./output/
        echo ""
        echo "To copy files from container, run:"
        echo "docker cp <container_id>:/app/output ./output"
    else
        echo "✗ Video conversion failed!"
        exit 1
    fi
else
    echo "✗ Frame capture failed or no frames were captured!"
    echo "Please check the website URL and ensure the animation is running."
    exit 1
fi
