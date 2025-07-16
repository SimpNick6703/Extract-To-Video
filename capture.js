const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const url = process.argv[2] || 'https://wutheringwaves-event.kurogames-global.com/package/jUEp_Lightly_We_Foss_the_Crown';
const outputDir = path.join(__dirname, 'frames');
const captureDuration = 15000;

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

        console.log('Taking initial screenshot to see what loaded: debug_initial_load.png');
        await page.screenshot({ path: 'debug_initial_load.png', fullPage: true });

        // Check for and click any potential cookie/consent banners to unblock the page.
        console.log('Checking for any consent/overlay banners...');
        // FIX: Replaced the non-standard :has-text selector with a standard JavaScript function.
        const consentButtonHandle = await page.evaluateHandle(() => {
            const keywords = ['accept all', 'agree', 'consent', 'allow all']; // List of common keywords
            const buttons = Array.from(document.querySelectorAll('button'));
            for (const button of buttons) {
                const buttonText = button.innerText.toLowerCase();
                for (const keyword of keywords) {
                    if (buttonText.includes(keyword)) {
                        return button; // Return the button element if found
                    }
                }
            }
            return null; // Return null if no button is found
        });

        if (consentButtonHandle && consentButtonHandle.asElement()) {
            console.log('Consent button found, clicking it...');
            await consentButtonHandle.asElement().click();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for overlay to disappear
        } else {
            console.log('No common consent buttons found, proceeding...');
        }
        
        const mainSwiperSelector = '.main-swiper';
        console.log('Waiting for main content area and hovering over it...');
        await page.waitForSelector(mainSwiperSelector, { timeout: 15000 });
        await page.hover(mainSwiperSelector);

        console.log('Simulating user scrolling with targeted mouse wheel...');
        for (let i = 0; i < 3; i++) {
            await page.mouse.wheel({ deltaY: 1000 });
            console.log(`Scroll attempt ${i + 1}/3...`);
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const canvasSelector = '#spineCanvas';
        console.log('Taking screenshot after scrolling: debug_post_scroll.png');
        await page.screenshot({ path: 'debug_post_scroll.png', fullPage: true });
        
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
        }, selector);

        console.log(`Capturing for ${captureDuration / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, captureDuration));

        if (frames.length === 0) {
            throw new Error('No frames were captured!');
        }
        
        console.log(`Successfully captured ${frames.length} frames.`);

    } catch (error) {
        console.error(`Error during capture: ${error.message}`);
        console.error('Please check the debug screenshots if they were created.');
        process.exitCode = 1;
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
}

captureCanvasAnimation();