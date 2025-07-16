const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const url = process.argv[2] || 'https://wutheringwaves-event.kurogames-global.com/package/jUEp_Lightly_We_Foss_the_Crown';
const outputDir = path.join(__dirname, 'frames');
const captureDuration = 15000; // Capture for 15 seconds

/**
 * Main function to capture canvas animation frames.
 */
async function captureCanvasAnimation() {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log('Navigating to the website...');
        await page.goto(url, { waitUntil: 'networkidle0' });

        console.log('Waiting for the page to become interactive...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Simulate mouse scrolling to navigate the webpage's slider to the correct section.
        console.log('Simulating user scrolling to the animation section...');
        for (let i = 0; i < 3; i++) {
            await page.mouse.wheel({ deltaY: 800 }); // Simulate scrolling down
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for slide animation
            console.log(`Scroll ${i + 1}/3...`);
        }

        // The most reliable selector for the canvas is its unique ID.
        const canvasSelector = '#spineCanvas';
        
        console.log('Waiting for the canvas element to become visible...');
        // Wait for the element with the ID "spineCanvas" to not only exist but be visible.
        await page.waitForSelector(canvasSelector, { visible: true, timeout: 20000 });
        console.log('✅ Canvas element found and ready.');

        console.log('Starting canvas capture...');

        const frames = [];
        await page.exposeFunction('saveFrame', (dataUrl) => {
            const frameNumber = frames.length.toString().padStart(5, '0');
            const filePath = path.join(outputDir, `frame-${frameNumber}.png`);
            const imageBuffer = Buffer.from(dataUrl.split(',')[1], 'base64');
            fs.writeFileSync(filePath, imageBuffer);
            frames.push(filePath);
        });

        // Inject script to capture frames using the CSS ID selector.
        await page.evaluate((selector) => {
            const canvas = document.querySelector(selector);
            if (!canvas) {
                console.error('Could not find the canvas element to hook requestAnimationFrame.');
                return;
            }

            const originalRequestAnimationFrame = window.requestAnimationFrame;
            window.requestAnimationFrame = function(callback) {
                originalRequestAnimationFrame(callback);
                const dataUrl = canvas.toDataURL('image/png');
                window.saveFrame(dataUrl);
            };
        }, canvasSelector);

        console.log(`Capturing for ${captureDuration / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, captureDuration));

        if (frames.length === 0) {
            throw new Error('No frames were captured! Ensure the canvas is animating.');
        }

        console.log(`Successfully captured ${frames.length} frames.`);

    } catch (error) {
        console.error(`Error during capture: ${error.message}`);
        process.exitCode = 1;
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
}

captureCanvasAnimation();