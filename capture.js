const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const url = process.argv[2] || 'https://wutheringwaves-event1.kurogames-global.com/?packageId=A1730&language=en&isInternalBrowser=0&platform=PC';
const outputDir = path.join(__dirname, 'frames');
const captureDuration = 20000;
const debugOutputDir = '/app/output';

async function captureCanvasAnimation() {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('Launching browser in headless mode...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
        defaultViewport: null
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log('Navigating to the website with a longer timeout...');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        console.log('Taking initial screenshot to see what loaded: debug_initial_load.png');
        await page.screenshot({ path: path.join(debugOutputDir, 'debug_initial_load.png'), fullPage: true });

        console.log('Attempting to dismiss pre-loader screen by clicking the page center...');
        await page.mouse.click(960, 540, { delay: 100 });
        console.log('Taking screenshot after click: debug_post_click.png');
        await page.screenshot({ path: path.join(debugOutputDir, 'debug_post_click.png'), fullPage: true });

        const mainSwiperSelector = '.main-swiper';
        console.log('Waiting for the main content (.main-swiper) to appear after the click...');
        await page.waitForSelector(mainSwiperSelector, { timeout: 30000 });
        
        console.log('Main content is loaded. Proceeding to scroll.');
        await page.hover(mainSwiperSelector);

        console.log('Simulating user scrolling with targeted mouse wheel...');
        for (let i = 0; i < 3; i++) {
            await page.mouse.wheel({ deltaY: 1000 });
            console.log(`Scroll attempt ${i + 1}/3...`);
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const canvasSelector = '#spineCanvas';
        
        console.log('Taking screenshot after scrolling: debug_post_scroll.png');
        await page.screenshot({ path: path.join(debugOutputDir, 'debug_post_scroll.png'), fullPage: true });
        
        console.log('Waiting for the canvas element to become visible...');
        await page.waitForSelector(canvasSelector, { visible: true, timeout: 10000 });
        console.log('Canvas element found and ready.');

        console.log('Starting canvas capture...');

        // Expose a function to save frames to the Node.js environment
        await page.exposeFunction('saveCanvasFrameToDisk', (base64Data, frameNumber) => {
            const filePath = path.join(outputDir, `frame-${String(frameNumber).padStart(5, '0')}.jpg`);
            try {
                fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                // console.log(`Saved frame ${frameNumber}`); // Uncomment for verbose logging of each frame
            } catch (e) {
                console.error(`ERROR: Failed to save frame ${frameNumber} to disk:`, e.message);
                // Optionally, re-throw if it's a critical error that should stop the process
                // throw e;
            }
        });

        // Inject the requestAnimationFrame hook into the browser context
        await page.evaluate((selector, maxDurationMs) => {
            const canvas = document.querySelector(selector);
            if (!canvas) {
                console.error('ERROR: Canvas element not found in browser context for capture!');
                return;
            }

            let frameCounter = 0;
            const startTime = performance.now();
            const originalRAF = window.requestAnimationFrame;

            window.requestAnimationFrame = function(callback) {
                return originalRAF.call(window, function(timestamp) {
                    // Call the original animation callback first
                    const result = callback(timestamp);

                    // Check if we are still within the desired capture duration
                    if (performance.now() - startTime < maxDurationMs) {
                        try {
                            const dataURL = canvas.toDataURL('image/jpeg', 0.9);
                            // Send only the base64 part to the Node.js exposed function
                            window.saveCanvasFrameToDisk(dataURL.split(',')[1], frameCounter);
                            frameCounter++;
                        } catch (e) {
                            console.error('ERROR: Failed to capture canvas frame with toDataURL:', e.message);
                            // Depending on the error, you might want to stop the capture here
                        }
                    } else {
                        console.log('INFO: Max capture duration reached in browser context. Stopping RAF hook.');
                        // Optionally revert requestAnimationFrame here if needed
                    }

                    return result;
                });
            };
            console.log('INFO: requestAnimationFrame hook injected successfully.');
        }, canvasSelector, captureDuration); // Pass captureDuration to the browser context

        console.log(`Capturing for ${captureDuration / 1000} seconds...`);
        // Wait for the specified duration; frames are saved asynchronously by the hook
        await new Promise(resolve => setTimeout(resolve, captureDuration + 5000)); // Add a small buffer

        // No need to check frames.length here, as saving is async.
        // FFmpeg will verify frame count when creating the video.
        console.log('Frame capture duration completed. Moving to video creation.');

    } catch (error) {
        console.error(`Error during capture: ${error.message}`);
        console.error('Please check the debug screenshots for clues.');
        process.exitCode = 1;
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
}

captureCanvasAnimation();