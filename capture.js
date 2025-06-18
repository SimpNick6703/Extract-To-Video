const puppeteer = require('puppeteer');
const fs = require('fs');
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
    if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir);
    }

    let frameCount = 0;
    const maxFrames = 600; // Capture 10 seconds at 60fps
    const captureInterval = 1000 / 30; // 30fps for more reliable capture

    console.log('Starting frame capture...');

    // Simple interval-based capture approach
    const capturePromise = new Promise(async (resolve, reject) => {
        const frames = [];
        let captureCount = 0;
        let consecutiveFailures = 0;
        
        const captureFrame = async () => {
            try {
                // Try to capture from the largest canvas first
                const frameData = await page.evaluate(() => {
                    const canvases = document.querySelectorAll('canvas');
                    let bestCanvas = null;
                    let maxArea = 0;
                    
                    // Find the largest canvas
                    for (let canvas of canvases) {
                        const area = canvas.width * canvas.height;
                        if (area > maxArea && area > 10000) { // Minimum size filter
                            maxArea = area;
                            bestCanvas = canvas;
                        }
                    }
                    
                    if (bestCanvas) {
                        try {
                            const dataURL = bestCanvas.toDataURL('image/png');
                            return {
                                success: true,
                                data: dataURL,
                                width: bestCanvas.width,
                                height: bestCanvas.height,
                                canvasIndex: Array.from(canvases).indexOf(bestCanvas)
                            };
                        } catch (e) {
                            return { success: false, error: e.message };
                        }
                    }
                    
                    return { success: false, error: 'No suitable canvas found' };
                });
                
                if (frameData.success) {
                    frames.push({
                        index: captureCount,
                        data: frameData.data,
                        timestamp: Date.now(),
                        canvasInfo: {
                            width: frameData.width,
                            height: frameData.height,
                            canvasIndex: frameData.canvasIndex
                        }
                    });
                    consecutiveFailures = 0;
                    
                    if (captureCount % 30 === 0) {
                        console.log(`Captured ${captureCount + 1} frames from canvas ${frameData.canvasIndex} (${frameData.width}x${frameData.height})`);
                    }
                } else {
                    consecutiveFailures++;
                    if (consecutiveFailures === 1) {
                        console.log(`Frame capture failed: ${frameData.error}`);
                    }
                    
                    // If we fail too many times consecutively, stop
                    if (consecutiveFailures > 30) {
                        console.log('Too many consecutive failures, stopping capture');
                        resolve(frames);
                        return;
                    }
                }
                
                captureCount++;
                
                if (captureCount >= maxFrames) {
                    resolve(frames);
                } else {
                    setTimeout(captureFrame, captureInterval);
                }
                
            } catch (error) {
                console.error('Error in capture frame:', error);
                consecutiveFailures++;
                if (consecutiveFailures > 10) {
                    reject(error);
                } else {
                    setTimeout(captureFrame, captureInterval);
                }
            }
        };
        
        // Start capturing
        setTimeout(captureFrame, 1000); // Wait 1 second before starting
    });

    const frames = await capturePromise;

    console.log(`Capture completed. Total frames: ${frames.length}`);
    
    // If no frames were captured, try screenshot method as fallback
    if (frames.length === 0) {
        console.log('No canvas frames captured, trying screenshot method...');
        
        for (let i = 0; i < 30; i++) { // Capture 30 screenshots over 10 seconds
            const screenshot = await page.screenshot({
                type: 'png',
                fullPage: false
            });
            
            const filename = path.join(framesDir, `screenshot_${String(i).padStart(6, '0')}.png`);
            fs.writeFileSync(filename, screenshot);
            
            console.log(`Captured screenshot ${i + 1}/30`);
            await page.waitForTimeout(333); // ~3 fps
        }
        
        console.log('Screenshot capture completed');
        return 30; // Return number of screenshots
    }

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
        
        if (i % 30 === 0 || i === frames.length - 1) {
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
