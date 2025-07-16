const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function captureCanvasAnimation() {
    const browser = await puppeteer.launch({
        headless: true, // Always true for Docker/production
        executablePath: '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-gpu',
            '--disable-features=VizDisplayCompositor',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();
    
    // Set viewport to 4K for maximum resolution
    await page.setViewport({
        width: 3840,
        height: 2160,
        deviceScaleFactor: 1
    });

    console.log('Navigating to the website...');
    await page.goto('https://wutheringwaves-event1.kurogames-global.com/?packageId=A1730&language=en&isInternalBrowser=0&platform=PC', {
        waitUntil: 'networkidle2',
        timeout: 60000
    });

    // Wait for the page to fully load and animations to start
    await page.waitForTimeout(5000);

    console.log('Looking for canvas elements...');
    
    // Wait a bit more for everything to load
    await page.waitForTimeout(10000);
    
    // Find all canvas elements
    const canvasInfo = await page.evaluate(() => {
        const canvases = document.querySelectorAll('canvas');
        return Array.from(canvases).map((canvas, index) => ({
            index,
            width: canvas.width,
            height: canvas.height,
            offsetWidth: canvas.offsetWidth,
            offsetHeight: canvas.offsetHeight,
            style: canvas.style.cssText,
            id: canvas.id,
            className: canvas.className
        }));
    });
    
    console.log(`Found ${canvasInfo.length} canvas elements:`);
    canvasInfo.forEach((info, i) => {
        console.log(`  Canvas ${i}: ${info.width}x${info.height} (display: ${info.offsetWidth}x${info.offsetHeight}) id="${info.id}" class="${info.className}"`);
    });

    if (canvasInfo.length === 0) {
        throw new Error('No canvas elements found on the page');
    }

    // Create frames directory
    const framesDir = './frames';
    try {
        await fs.access(framesDir);
    } catch {
        await fs.mkdir(framesDir);
    }

    let frameCount = 0;
    const maxFrames = 900; // Capture 15 seconds at 60fps
    const maxDuration = 15000; // 15 seconds max

    console.log('Starting synchronized frame capture using requestAnimationFrame...');

    // Set up frame data bridge between browser and Node.js
    const frames = [];
    let captureStartTime = Date.now();
    let isCapturing = true;

    // Expose function to receive frame data from browser
    await page.exposeFunction('sendFrameData', (frameData) => {
        if (!isCapturing) return;
        
        frames.push({
            index: frameCount++,
            data: frameData.dataURL,
            timestamp: Date.now(),
            canvasInfo: frameData.canvasInfo
        });

        if (frameCount % 60 === 0) {
            console.log(`Captured ${frameCount} frames from canvas ${frameData.canvasInfo.canvasIndex} (${frameData.canvasInfo.width}x${frameData.canvasInfo.height})`);
        }

        // Stop capturing if we've reached max frames or duration
        const elapsed = Date.now() - captureStartTime;
        if (frameCount >= maxFrames || elapsed >= maxDuration) {
            isCapturing = false;
        }
    });

    // Inject script to hook into requestAnimationFrame
    await page.evaluateOnNewDocument(() => {
        let targetCanvas = null;
        let originalRAF = window.requestAnimationFrame;
        
        // Override requestAnimationFrame to capture frames
        window.requestAnimationFrame = function(callback) {
            const wrappedCallback = function(timestamp) {
                // Find the best canvas to capture from
                if (!targetCanvas) {
                    const canvases = document.querySelectorAll('canvas');
                    let maxArea = 0;
                    
                    for (let canvas of canvases) {
                        const area = canvas.width * canvas.height;
                        if (area > maxArea && area > 10000) { // Minimum size filter
                            maxArea = area;
                            targetCanvas = canvas;
                        }
                    }
                }
                
                // Capture frame if we have a target canvas
                if (targetCanvas && window.sendFrameData) {
                    try {
                        const dataURL = targetCanvas.toDataURL('image/png');
                        window.sendFrameData({
                            dataURL: dataURL,
                            canvasInfo: {
                                width: targetCanvas.width,
                                height: targetCanvas.height,
                                canvasIndex: Array.from(document.querySelectorAll('canvas')).indexOf(targetCanvas)
                            }
                        });
                    } catch (e) {
                        console.error('Frame capture error:', e);
                    }
                }
                
                // Call the original callback
                return callback(timestamp);
            };
            
            return originalRAF.call(this, wrappedCallback);
        };
    });

    // Reload the page to apply the requestAnimationFrame hook
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForTimeout(5000); // Wait for animations to start

    // Wait for capture to complete
    console.log('Waiting for frame capture to complete...');
    const checkInterval = 100;
    let lastFrameCount = 0;
    let stableFrames = 0;
    
    while (isCapturing) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        
        // Check if we're still getting new frames
        if (frameCount === lastFrameCount) {
            stableFrames++;
            if (stableFrames > 50) { // 5 seconds without new frames
                console.log('No new frames detected, stopping capture...');
                isCapturing = false;
            }
        } else {
            stableFrames = 0;
            lastFrameCount = frameCount;
        }
    }

    console.log(`Capture completed. Total frames: ${frames.length}`);
    
    if (frames.length === 0) {
        throw new Error('No frames were captured. The animation might not be running or canvas is not accessible.');
    }

    console.log(`Saving ${frames.length} frames to disk...`);

    // Save frames to disk
    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const base64Data = frame.data.replace(/^data:image\/png;base64,/, '');
        const filename = path.join(framesDir, `frame_${String(i).padStart(6, '0')}.png`);
        await fs.writeFile(filename, base64Data, 'base64');
        
        if (i % 60 === 0 || i === frames.length - 1) {
            console.log(`Saved frame ${i + 1}/${frames.length}`);
        }
    }

    console.log('All frames saved successfully!');
    
    // Calculate actual framerate and save metadata
    if (frames.length > 1) {
        const totalTime = frames[frames.length - 1].timestamp - frames[0].timestamp;
        const actualFPS = (frames.length * 1000) / totalTime;
        console.log(`Actual capture rate: ${actualFPS.toFixed(2)} FPS`);
        console.log(`Total capture duration: ${(totalTime / 1000).toFixed(2)} seconds`);
        
        // Save metadata
        const metadata = {
            totalFrames: frames.length,
            actualFPS: actualFPS,
            totalDuration: totalTime,
            captureDate: new Date().toISOString(),
            targetFPS: 60,
            canvasInfo: frames[0]?.canvasInfo
        };
        await fs.writeFile('./capture_metadata.json', JSON.stringify(metadata, null, 2));
    }

    await browser.close();
    return frames.length;
}

// Run the capture
captureCanvasAnimation()
    .then((frameCount) => {
        console.log(`\nCapture completed successfully!`);
        console.log(`Total frames captured: ${frameCount}`);
        console.log('Frames saved in ./frames/ directory');
        console.log('Run node create-video.js to create the MP4 file.');
    })
    .catch((error) => {
        console.error('Error during capture:', error);
        process.exit(1);
    });
