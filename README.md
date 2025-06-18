# Canvas Animation Extractor

Extract animated canvas content from the Wuthering Waves event page and convert to high-quality MP4 files.

## Features

- **High Resolution Capture**: Captures at maximum resolution (up to 4K)
- **Multiple Quality Options**: Generates ultra-high quality, balanced, and web-optimized versions
- **Smart Frame Detection**: Automatically detects animated canvas elements
- **60 FPS Support**: Captures and maintains smooth 60 FPS animation
- **Docker-based**: No need to install Node.js or dependencies locally

## Quick Start

1. **Run the extraction**:
   ```bash
   ./extract.sh
   ```

That's it! The script will:
1. Build the Docker image
2. Navigate to the Wuthering Waves event page
3. Capture canvas animation frames
4. Convert frames to multiple MP4 formats
5. Copy output files to your local `./output` directory

## Output Files

The script generates several versions of the animation:

- `animation_ultra_quality.mp4` - Highest quality (CRF 15, large file)
- `animation_high_quality.mp4` - High quality balanced (CRF 18, good size/quality ratio)
- `animation_web_optimized.mp4` - Web-optimized 1080p version (CRF 23)
- `animation_preview.gif` - GIF preview for quick viewing

## Manual Usage

If you prefer to run steps individually:

1. **Build the Docker image**:
   ```bash
   docker build -t canvas-extractor .
   ```

2. **Run the container**:
   ```bash
   docker run --shm-size=2gb canvas-extractor
   ```

3. **Copy output files**:
   ```bash
   docker cp <container_id>:/app/output ./output
   ```

## Troubleshooting

### No frames captured
- Ensure the website is accessible and the animation is running
- Check if the canvas elements are being rendered correctly
- The script waits 5 seconds for the page to load - increase this if needed

### Poor quality output
- The script captures at maximum resolution detected
- For 4K output, ensure your display/browser supports high DPI
- Ultra-quality version uses CRF 15 for maximum quality

### Docker issues
- Ensure Docker is running: `docker info`
- Increase shared memory if needed: `--shm-size=4gb`
- Check Docker logs: `docker logs <container_id>`

## Technical Details

- **Browser**: Uses Puppeteer with Chromium for rendering
- **Capture Method**: Intercepts `requestAnimationFrame()` calls
- **Video Encoding**: FFmpeg with H.264 (libx264)
- **Frame Format**: PNG for lossless intermediate storage
- **Resolution**: Viewport set to 3840x2160 (4K) for maximum quality

## Files Structure

```
├── capture.js          # Main capture script (Node.js + Puppeteer)
├── convert.sh          # FFmpeg conversion script
├── docker-run.sh       # Container execution script
├── extract.sh          # Main user script (build + run + copy)
├── Dockerfile          # Docker container definition
├── package.json        # Node.js dependencies
└── README.md           # This file
```

## Requirements

- Docker (only requirement on host system)
- Internet connection (to access the Wuthering Waves event page)
- ~2GB disk space for temporary frames and output videos

## License

MIT License - Feel free to modify and use as needed.
