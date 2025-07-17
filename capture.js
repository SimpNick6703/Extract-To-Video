const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const url = process.argv[2] || 'https://wutheringwaves-event1.kurogames-global.com/?packageId=A1730&language=en&isInternalBrowser=0&platform=PC';
const outputDir = path.join(__dirname, 'frames');
const captureDuration = 15000;
const debugOutputDir = '/app/output';

async function captureCanvasAnimation() {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('Launching browser in headless mode...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log('Navigating to the website with a longer timeout...');
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        
        // This first screenshot is guaranteed to happen and will show us the entry screen.
        console.log('Taking initial screenshot to see what loaded: debug_initial_load.png');
        await page.screenshot({ path: path.join(debugOutputDir, 'debug_initial_load.png'), fullPage: true }); // Make sure this line is correct

        // STRATEGY: Click the center of the page to dismiss any pre-loader or entry screen.
        console.log('Attempting to dismiss pre-loader screen by clicking the page center...');
        await page.mouse.click(960, 540, { delay: 100 }); // Click center of 1920x1080 viewport
        console.log('Taking screenshot after click: debug_post_click.png'); // ADDED THIS LINE IN PREVIOUS STEP
        await page.screenshot({ path: path.join(debugOutputDir, 'debug_post_click.png'), fullPage: true }); // Make sure this line is correct

        // After the click, wait for the main content selector to appear.
        // This confirms we've successfully navigated past the entry screen.
        const mainSwiperSelector = '.main-swiper';
        console.log('Waiting for the main content (.main-swiper) to appear after the click...');
        await page.waitForSelector(mainSwiperSelector, { timeout: 30000 });
        
        console.log('✅ Main content is loaded. Proceeding to scroll.');
        await page.hover(mainSwiperSelector); // Hover to ensure focus

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
        console.log('✅ Canvas element found and ready.');

        console.log('Starting canvas capture...');
        const frames = [];
        await page.exposeFunction('saveFrame', (dataUrl) => {
            const frameNumber = frames.length.toString().padStart(5, '0');
            const filePath = path.join(outputDir, `frame-${frameNumber}.png`);
            fs.writeFileSync(filePath, Buffer.from(dataUrl.split(',')[1], 'base64'));
        });

        await page.evaluate((selector) => {
            const canvas = document.querySelector(selector);
            if (!canvas) { return; }
            const originalRAF = window.requestAnimationFrame;
            window.requestAnimationFrame = (callback) => {
                originalRAF(callback);
                window.saveFrame(canvas.toDataURL('image/png'));
            };
        }, canvasSelector);

        console.log(`Capturing for ${captureDuration / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, captureDuration));

        if (frames.length === 0) {
            throw new Error('No frames were captured!');
        }
        
        console.log(`Successfully captured ${frames.length} frames.`);

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