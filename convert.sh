#!/bin/bash

echo "Converting frames to MP4..."

# Check if frames directory exists
if [ ! -d "./frames" ]; then
    echo "Error: frames directory not found. Run the capture script first."
    exit 1
fi

# Count frames
FRAME_COUNT=$(ls -1 ./frames/*.png 2>/dev/null | wc -l)
if [ $FRAME_COUNT -eq 0 ]; then
    echo "Error: No frames found in ./frames/ directory"
    exit 1
fi

echo "Found $FRAME_COUNT frames"

# Read metadata if available
FPS=60
if [ -f "./capture_metadata.json" ]; then
    ACTUAL_FPS=$(cat capture_metadata.json | grep -o '"actualFPS":[^,]*' | cut -d':' -f2 | tr -d ' ')
    if [ ! -z "$ACTUAL_FPS" ]; then
        FPS=$(echo "$ACTUAL_FPS" | cut -d'.' -f1)
        echo "Using detected framerate: ${FPS} FPS"
    fi
fi

# Create output directory
mkdir -p ./output

# High quality MP4 conversion with multiple options
echo "Creating high-quality MP4 files..."

# Option 1: Highest quality (large file size)
echo "1. Creating ultra-high quality version..."
ffmpeg -y -r $FPS -i ./frames/frame_%06d.png \
    -c:v libx265 -preset slow -crf 15 \
    -pix_fmt yuv420p -movflags +faststart \
    ./output/animation_ultra_quality.mp4

# Option 2: High quality balanced (good size/quality ratio)
echo "2. Creating high quality balanced version..."
ffmpeg -y -r $FPS -i ./frames/frame_%06d.png \
    -c:v libx265 -preset medium -crf 18 \
    -pix_fmt yuv420p -movflags +faststart \
    ./output/animation_high_quality.mp4

# Option 3: Web optimized version
echo "3. Creating web-optimized version..."
ffmpeg -y -r $FPS -i ./frames/frame_%06d.png \
    -c:v libx265 -preset fast -crf 23 \
    -pix_fmt yuv420p -movflags +faststart \
    -vf "scale=1920:1080" \
    ./output/animation_web_optimized.mp4

# Option 4: Create a GIF version for preview
echo "4. Creating GIF preview..."
ffmpeg -y -r $FPS -i ./frames/frame_%06d.png \
    -vf "fps=30,scale=800:-1:flags=lanczos,palettegen" \
    ./output/palette.png

ffmpeg -y -r $FPS -i ./frames/frame_%06d.png -i ./output/palette.png \
    -filter_complex "fps=30,scale=800:-1:flags=lanczos[x];[x][1:v]paletteuse" \
    ./output/animation_preview.gif

# Clean up palette
rm -f ./output/palette.png

echo "Conversion completed!"
echo "Output files:"
echo "  - Ultra quality: ./output/animation_ultra_quality.mp4"
echo "  - High quality:  ./output/animation_high_quality.mp4"
echo "  - Web optimized: ./output/animation_web_optimized.mp4"
echo "  - GIF preview:   ./output/animation_preview.gif"

# Show file sizes
echo ""
echo "File sizes:"
ls -lh ./output/animation_*.mp4 ./output/animation_*.gif 2>/dev/null | awk '{print $9 ": " $5}'
