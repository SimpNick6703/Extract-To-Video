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

        // Wait a few seconds for the initial page animations to settle.
        console.log('Waiting for the page to become interactive...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // FIX: Simulate mouse wheel scrolling to navigate through the swiper.js slides.
        // This is required because the site doesn't use a native scrollbar.
        // We scroll down 3 times to ensure we reach the "NEW OUTFITS" section.
        console.log('Simulating user scrolling to the animation section...');
        for (let i = 0; i < 3; i++) {
            await page.mouse.wheel({ deltaY: 800 }); // Positive deltaY scrolls down
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for slide animation
            console.log(`Scroll ${i + 1}/3...`);
        }

        // The specific XPath to the canvas element. This is the most reliable locator.
        const canvasXPath = '/html/body/div/div[1]/div[2]/div/div/div[4]/div[3]/canvas';
        
        console.log('Waiting for the canvas element to be confirmed in the viewport...');
        await page.waitForXPath(canvasXPath, { timeout: 10000 }); // Wait up to 10s to be safe
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

        // Inject script to capture frames, locating the canvas using its XPath.
        await page.evaluate((xpath) => {
            // Find the canvas element using its XPath inside the browser context.
            const canvas = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
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
        }, canvasXPath);

        // Let the capture run for the specified duration.
        console.log(`Capturing for ${captureDuration / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, captureDuration));

        if (frames.length === 0) {
            throw new Error('No frames were captured! The canvas might not be animating.');
        }

        console.log(`Successfully captured ${frames.length} frames.`);

    } catch (error) {
        console.error(`Error during capture: ${error.message}`);
        process.exitCode = 1; // Set failure exit code for the batch script
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
}

captureCanvasAnimation();