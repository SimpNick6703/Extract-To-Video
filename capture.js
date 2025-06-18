const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureCanvasAnimation() {
    const browser = await puppeteer.launch({
        headless: false, // Set to true for production
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--allow-running-insecure-content',
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
    
    // Find all canvas elements and select the one with animation
    const canvasElements = await page.$$('canvas');
    console.log(`Found ${canvasElements.length} canvas elements`);

    if (canvasElements.length === 0) {
        throw new Error('No canvas elements found on the page');
    }

    // Create frames directory
    const framesDir = './frames';
    if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir);
    }

    let frameCount = 0;
    const maxFrames = 600; // Capture 10 seconds at 60fps
    const captureInterval = 1000 / 60; // 60fps

    console.log('Starting frame capture...');

    // Inject canvas capture script
    await page.evaluate(() => {
        window.capturedFrames = [];
        window.isCapturing = false;
        window.frameIndex = 0;
        
        // Function to capture canvas frame
        window.captureFrame = function(canvas) {
            if (!canvas) return null;
            try {
                return canvas.toDataURL('image/png');
            } catch (e) {
                console.error('Error capturing frame:', e);
                return null;
            }
        };
        
        // Override requestAnimationFrame to capture frames
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function(callback) {
            return originalRAF.call(window, function(timestamp) {
                const result = callback(timestamp);
                
                if (window.isCapturing && window.frameIndex < 600) {
                    // Find the animated canvas (usually the largest or most recently drawn to)
                    const canvases = document.querySelectorAll('canvas');
                    let targetCanvas = null;
                    
                    // Try to find the canvas with the most recent drawing activity
                    for (let canvas of canvases) {
                        if (canvas.width > 100 && canvas.height > 100) {
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                targetCanvas = canvas;
                                break;
                            }
                        }
                    }
                    
                    if (targetCanvas) {
                        const frameData = window.captureFrame(targetCanvas);
                        if (frameData) {
                            window.capturedFrames.push({
                                index: window.frameIndex,
                                data: frameData,
                                timestamp: timestamp
                            });
                            window.frameIndex++;
                        }
                    }
                }
                
                return result;
            });
        };
    });

    // Start capturing
    await page.evaluate(() => {
        window.isCapturing = true;
        console.log('Started capturing frames...');
    });

    // Wait for frames to accumulate
    let lastFrameCount = 0;
    let stableCount = 0;
    
    while (frameCount < maxFrames) {
        await page.waitForTimeout(1000);
        
        const currentFrameCount = await page.evaluate(() => window.capturedFrames.length);
        
        console.log(`Captured ${currentFrameCount} frames...`);
        
        if (currentFrameCount === lastFrameCount) {
            stableCount++;
            if (stableCount > 10) {
                console.log('Frame count stable, animation might have stopped');
                break;
            }
        } else {
            stableCount = 0;
        }
        
        lastFrameCount = currentFrameCount;
        frameCount = currentFrameCount;
        
        if (frameCount >= maxFrames) break;
    }

    // Stop capturing
    await page.evaluate(() => {
        window.isCapturing = false;
    });

    console.log(`Capture completed. Total frames: ${frameCount}`);

    // Extract frames from the page
    const frames = await page.evaluate(() => window.capturedFrames);

    if (frames.length === 0) {
        throw new Error('No frames were captured. The animation might not be running or canvas is not accessible.');
    }

    console.log(`Saving ${frames.length} frames to disk...`);

    // Save frames to disk
    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const base64Data = frame.data.replace(/^data:image\/png;base64,/, '');
        const filename = path.join(framesDir, `frame_${String(i).padStart(6, '0')}.png`);
        fs.writeFileSync(filename, base64Data, 'base64');
        
        if (i % 60 === 0) {
            console.log(`Saved frame ${i + 1}/${frames.length}`);
        }
    }

    console.log('All frames saved successfully!');
    
    // Calculate actual framerate
    if (frames.length > 1) {
        const totalTime = frames[frames.length - 1].timestamp - frames[0].timestamp;
        const actualFPS = (frames.length * 1000) / totalTime;
        console.log(`Actual capture rate: ${actualFPS.toFixed(2)} FPS`);
        
        // Save metadata
        const metadata = {
            totalFrames: frames.length,
            actualFPS: actualFPS,
            totalDuration: totalTime,
            captureDate: new Date().toISOString()
        };
        fs.writeFileSync('./capture_metadata.json', JSON.stringify(metadata, null, 2));
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
        console.log('Run the video conversion script to create MP4 file.');
    })
    .catch((error) => {
        console.error('Error during capture:', error);
        process.exit(1);
    });
