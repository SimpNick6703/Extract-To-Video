# Canvas Animation Extractor

Extract animated canvas content from the Wuthering Waves event page and convert to high-quality MP4 files using synchronized frame capture and FFmpeg.

> [!NOTE]
> This repository is for extracting a Wuthering Waves Character, Changli's Outfit Animation from their limited time web event [page](https://wutheringwaves-event1.kurogames-global.com/?packageId=A1730&language=en&isInternalBrowser=0&platform=PC).

> [!CAUTION]
> The limited time event has ended and the page has be taken down by the rightful owners (Wuthering Waves, Kuro Games). The page is no longer accessible, hence the repository is archived but will remain publicly accessible for reference.

## Features

- **Synchronized Frame Capture**: Uses `requestAnimationFrame` hooking for perfect frame synchronization.
- **High Resolution Capture**: Captures at 1920x1080 resolution.
- **Direct FFmpeg Integration**: Uses FFmpeg directly for professional video encoding.
- **Smart Frame Detection**: Automatically detects the main animated canvas element.
- **Docker-based**: No need to install Node.js or dependencies locally.

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
1. Build the Docker image (if not already built or changed).
2. Navigate to the Wuthering Waves event page.
3. Inject `requestAnimationFrame` hooks for synchronized capture.
4. Capture canvas animation frames perfectly in sync for 20 seconds.
5. Convert captured frames to a high-quality MP4 video using FFmpeg.
6. The output video and debug screenshots will be available in your local `./output` directory.

## Output Files

The script generates a single high-quality MP4 file:

- `animation.mp4` - High quality video (CRF 18, H.264 encoding).

The output is optimized for quality while maintaining reasonable file size. Debug screenshots from the capture process are saved in the `./output` directory for troubleshooting.

## Manual Usage

If you prefer to run steps individually (e.g., for debugging inside the container):

1. **Build the Docker image**:
   ```bash
   docker build -t canvas-extractor .
   ```

2. **Run the container (and execute `docker-run.sh` inside it)**:
   ```bash
   docker run --rm --shm-size=2gb -v "$(pwd)/output:/app/output" -v "$(pwd)/frames:/app/frames" canvas-extractor
   ```
   *Note: The `-v` flags mount your local `output` and `frames` directories into the container.*

3. **Copy output files (if running container without direct volume mounts)**:
   ```bash
   # Linux/macOS
   docker cp <container_id>:/app/output ./output
   
   # Windows
   docker cp <container_id>:/app/output .\output
   ```

You can also run the individual Node.js scripts inside a running container (e.g., by starting with `bash` as CMD):
```bash
node capture.js      # Capture frames to /app/frames
node create-video.js # Create video from frames in /app/frames to /app/output
```

## Platform Support

This project works on **Windows**, **Linux**, and **macOS**:

- **Windows**: Use `extract.bat` (double-click or run from Command Prompt).
- **Linux/macOS**: Use `./extract.sh` (requires executable permissions).

## Troubleshooting

### No frames or video output
- Ensure Docker Desktop (Windows/macOS) or Docker Engine (Linux) is running.
- Verify that your internet connection is active and the Wuthering Waves event page URL is accessible.
- The script attempts to capture for 20 seconds; if the animation hasn't started or is not visible, no frames might be captured.
- Check the debug screenshots (`debug_initial_load.png`, `debug_post_click.png`, `debug_post_scroll.png`) in the `./output` directory for clues on page loading or navigation issues.

### Poor quality output
- The script captures at 1920x1080 resolution.
- The output uses CRF 18 for high quality with reasonable file size. Adjust `CRF` in `create-video.js` (lower for higher quality, higher for smaller size, range 0-51).

### Docker issues
- **Network/DNS errors**: Try using a different Docker registry or check your internet connection.
- **Node.js image issues**: The Dockerfile uses Node.js 24 for better compatibility.
- **Proxy issues**: If behind a corporate firewall, configure Docker proxy settings.
- **General Docker issues**:
    - Ensure Docker is running: `docker info`.
    - Increase shared memory if needed: `--shm-size=4gb` in `docker-compose.yml`.
    - Check Docker logs for the container: `docker logs <container_name>` (e.g., `docker logs canvas-video-extractor`).

## Technical Details

- **Browser**: Uses Puppeteer with Chromium for rendering.
- **Capture Method**: Hooks into `requestAnimationFrame` for perfect frame synchronization.
- **Video Encoding**: FFmpeg with H.264 encoding (`libx264` codec), optimized for quality and compatibility.
- **Frame Format**: PNG for lossless intermediate storage.
- **Resolution**: Capture viewport is set to 1920x1080.
- **Frame Rate**: Captures and encodes at 6 FPS.

## Files Structure

```
├── capture.js          # Main capture script with requestAnimationFrame hooking.
├── create-video.js     # Video creation script using FFmpeg.
├── docker-run.sh       # Orchestrates running capture.js and create-video.js inside the container.
├── extract.sh          # Main user script for Linux/macOS (builds and runs the Docker container).
├── extract.bat         # Main user script for Windows (builds and runs the Docker container).
├── Dockerfile          # Docker container definition (installs Node.js, Chrome, FFmpeg).
├── package.json        # Node.js dependencies.
└── README.md           # This file.
```

## Requirements

- **Docker Desktop** (Windows/macOS) or **Docker Engine** (Linux).
- Internet connection (to access the Wuthering Waves event page).
- ~2GB disk space for temporary frames and output videos.

### Windows-specific notes:
- Docker Desktop must be running.
- The batch file will pause on completion or error for review.
- Use Command Prompt or PowerShell to run manually if needed.

## Architecture Improvements

This version includes several key improvements over previous iterations:

1.  **Synchronized Capture**: Replaces `setInterval` with `requestAnimationFrame` hooking for perfect frame timing.
2.  **Direct FFmpeg Integration**: Uses FFmpeg directly for robust and high-quality video encoding, removing an intermediate tool dependency.
3.  **Unified Execution**: Simplified `extract.bat` and `extract.sh` to use `docker-compose up`, orchestrating both capture and video creation within a single, consistent Docker run.
4.  **Better Error Handling**: Includes detailed error reporting and logging, especially within the browser context and during FFmpeg execution.
5.  **Async/Await**: Modern JavaScript patterns for better code maintainability.