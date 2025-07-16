# Canvas Animation Extractor

Extract animated canvas content from the Wuthering Waves event page and convert to high-quality MP4 files using `canvas-sketch-cli` and synchronized frame capture.

## Features

- **Synchronized Frame Capture**: Uses `requestAnimationFrame` hooking for perfect frame synchronization
- **High Resolution Capture**: Captures at maximum resolution (up to 4K)
- **canvas-sketch Integration**: Uses `canvas-sketch-cli` for professional video encoding
- **Smart Frame Detection**: Automatically detects the largest, most active canvas elements
- **60 FPS Support**: Captures and maintains smooth 60 FPS animation
- **Docker-based**: No need to install Node.js or dependencies locally

## Quick Start

### Windows
1. **Run the extraction**:
   ```cmd
   extract.bat
   ```

### Linux/macOS
1. **Run the extraction**:
   ```bash
   ./extract.sh
   ```

That's it! The script will:
1. Build the Docker image
2. Navigate to the Wuthering Waves event page
3. Inject `requestAnimationFrame` hooks for synchronized capture
4. Capture canvas animation frames perfectly in sync
5. Convert frames to high-quality MP4 using `canvas-sketch-cli`
6. Copy output files to your local `./output` directory

## Output Files

The script generates a single high-quality MP4 file:

- `animation.mp4` - High quality video (CRF 18, H.265 encoding)

The output is optimized for quality while maintaining reasonable file size. Metadata from the capture process is saved in `capture_metadata.json`.

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
   # Linux/macOS
   docker cp <container_id>:/app/output ./output
   
   # Windows
   docker cp <container_id>:/app/output .\output
   ```

You can also run the scripts individually inside the container:
```bash
node capture.js      # Capture frames
node create-video.js # Create video from frames
```

## Platform Support

This project works on **Windows**, **Linux**, and **macOS**:

- **Windows**: Use `extract.bat` (double-click or run from Command Prompt)
- **Linux/macOS**: Use `./extract.sh` (requires executable permissions)

## Troubleshooting

### No frames captured
- Ensure the website is accessible and the animation is running
- Check if the canvas elements are being rendered correctly
- The script waits for animations to start - it will stop automatically after 15 seconds or 900 frames

### Poor quality output
- The script captures at maximum resolution detected
- For 4K output, ensure your display/browser supports high DPI
- The output uses CRF 18 for high quality with reasonable file size

### canvas-sketch-cli issues
- If `canvas-sketch-cli` fails, the script automatically falls back to direct FFmpeg
- Ensure FFmpeg is available in the container (it's included in the Dockerfile)

### Docker build issues
- **Network/DNS errors**: Try using a different Docker registry or check your internet connection
- **Node.js image issues**: The Dockerfile uses Node.js 20 for better compatibility
- **Proxy issues**: If behind a corporate firewall, configure Docker proxy settings

### General Docker issues
- Ensure Docker is running: `docker info`
- Increase shared memory if needed: `--shm-size=4gb`
- Check Docker logs: `docker logs <container_id>`

## Technical Details

- **Browser**: Uses Puppeteer with Chromium for rendering
- **Capture Method**: Hooks into `requestAnimationFrame` for perfect synchronization
- **Video Encoding**: `canvas-sketch-cli` with H.265 encoding (fallback to FFmpeg if needed)
- **Frame Format**: PNG for lossless intermediate storage
- **Resolution**: Viewport set to 3840x2160 (4K) for maximum quality
- **Frame Rate**: Automatically detects and maintains original animation frame rate

## Files Structure

```
├── capture.js          # Main capture script with requestAnimationFrame hooking
├── create-video.js     # Video creation using canvas-sketch-cli
├── docker-run.sh       # Container execution script
├── extract.sh          # Main user script for Linux/macOS (build + run + copy)
├── extract.bat         # Main user script for Windows (build + run + copy)
├── Dockerfile          # Docker container definition
├── package.json        # Node.js dependencies (includes canvas-sketch-cli)
└── README.md           # This file
```

## Requirements

- **Docker Desktop** (Windows/macOS) or **Docker Engine** (Linux)
- Internet connection (to access the Wuthering Waves event page)
- ~2GB disk space for temporary frames and output videos

### Windows-specific notes:
- Docker Desktop must be running
- The batch file will pause on completion or error for review
- Use Command Prompt or PowerShell to run manually if needed

## Architecture Improvements

This version includes several key improvements over the original:

1. **Synchronized Capture**: Replaces `setInterval` with `requestAnimationFrame` hooking for perfect frame timing
2. **canvas-sketch Integration**: Uses the professional `canvas-sketch-cli` tool for video encoding
3. **Simplified Output**: Generates one high-quality file instead of multiple versions
4. **Better Error Handling**: Includes fallback mechanisms and detailed error reporting
5. **Async/Await**: Modern JavaScript patterns for better code maintainability

## License

MIT License - Feel free to modify and use as needed.
