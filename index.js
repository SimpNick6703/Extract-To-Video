const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class CanvasVideoExtractor {
  constructor() {
    this.outputDir = '/app/output';
    this.framesDir = '/app/frames';
    this.targetUrl = 'https://wutheringwaves-event1.kurogames-global.com/?packageId=A1730&language=en&isInternalBrowser=0&platform=PC';
    this.targetFPS = 60;
    this.maxDuration = 30; // seconds
    this.outputWidth = 3840; // 4K width
    this.outputHeight = 2160; // 4K height
  }

  async init() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(this.framesDir, { recursive: true });
      console.log('✅ Directories created successfully');
    } catch (error) {
      console.error('❌ Failed to create directories:', error);
      throw error;
    }
  }

  async launchBrowser() {
    console.log('🚀 Launching browser...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=3840,2160',
        '--force-device-scale-factor=1'
      ],
      defaultViewport: {
        width: this.outputWidth,
        height: this.outputHeight,
        deviceScaleFactor: 1
      }
    });

    return browser;
  }

  async captureFrames() {
    let browser;
    let frameCount = 0;
    const maxFrames = this.targetFPS * this.maxDuration;
    
    try {
      browser = await this.launchBrowser();
      const page = await browser.newPage();
      
      console.log('📱 Navigating to target URL...');
      await page.goto(this.targetUrl, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });

      // Wait a bit more for animations to start
      await page.waitForTimeout(3000);

      console.log('🔍 Looking for canvas elements...');
      
      // Find all canvas elements and identify the animated one
      const canvasElements = await page.$$('canvas');
      console.log(`Found ${canvasElements.length} canvas element(s)`);

      if (canvasElements.length === 0) {
        throw new Error('No canvas elements found on the page');
      }

      // Inject frame capture logic
      await page.evaluate(() => {
        window.capturedFrames = [];
        window.frameCount = 0;
        window.isCapturing = false;
        
        // Override requestAnimationFrame to capture frames
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function(callback) {
          return originalRAF.call(window, function(timestamp) {
            const result = callback(timestamp);
            
            if (window.isCapturing) {
              // Find the main animated canvas (usually the largest or most recently active)
              const canvases = Array.from(document.querySelectorAll('canvas'));
              const activeCanvas = canvases.find(canvas => {
                const ctx = canvas.getContext('2d');
                return ctx && canvas.width > 100 && canvas.height > 100;
              }) || canvases[0];
              
              if (activeCanvas) {
                try {
                  const dataURL = activeCanvas.toDataURL('image/png');
                  window.capturedFrames.push({
                    frame: window.frameCount++,
                    dataURL: dataURL,
                    timestamp: timestamp,
                    width: activeCanvas.width,
                    height: activeCanvas.height
                  });
                } catch (e) {
                  console.warn('Failed to capture frame:', e);
                }
              }
            }
            
            return result;
          });
        };
      });

      // Start capturing
      console.log('🎬 Starting frame capture...');
      await page.evaluate(() => {
        window.isCapturing = true;
        window.capturedFrames = [];
        window.frameCount = 0;
      });

      // Capture frames for the specified duration
      const captureInterval = 1000 / this.targetFPS; // ms between frames
      const startTime = Date.now();
      
      while (frameCount < maxFrames) {
        await page.waitForTimeout(captureInterval);
        
        const frames = await page.evaluate(() => {
          const frames = window.capturedFrames.slice();
          window.capturedFrames = [];
          return frames;
        });

        // Save frames to disk
        for (const frameData of frames) {
          const framePath = path.join(this.framesDir, `frame_${String(frameCount).padStart(6, '0')}.png`);
          const base64Data = frameData.dataURL.replace(/^data:image\/png;base64,/, '');
          await fs.writeFile(framePath, base64Data, 'base64');
          frameCount++;
          
          if (frameCount % 60 === 0) {
            console.log(`📸 Captured ${frameCount} frames...`);
          }
          
          if (frameCount >= maxFrames) break;
        }
        
        // Check if we've been capturing for too long
        if (Date.now() - startTime > this.maxDuration * 1000 + 5000) {
          console.log('⏰ Maximum capture time reached');
          break;
        }
      }

      // Stop capturing
      await page.evaluate(() => {
        window.isCapturing = false;
      });

      console.log(`✅ Captured ${frameCount} frames total`);
      return frameCount;

    } catch (error) {
      console.error('❌ Error during frame capture:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async createVideo(frameCount) {
    if (frameCount === 0) {
      throw new Error('No frames to process');
    }

    console.log('🎞️  Creating MP4 video...');
    
    const outputPath = path.join(this.outputDir, `wuthering_waves_animation_${Date.now()}.mp4`);
    const inputPattern = path.join(this.framesDir, 'frame_%06d.png');
    
    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        '-y', // Overwrite output file
        '-framerate', this.targetFPS.toString(),
        '-i', inputPattern,
        '-c:v', 'libx264',
        '-preset', 'slow', // Better compression
        '-crf', '18', // High quality (lower is better, 0-51 range)
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', // Optimize for web playback
        '-vf', `scale=${this.outputWidth}:${this.outputHeight}:flags=lanczos`, // High quality scaling
        outputPath
      ];

      console.log('🔧 FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
      
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      ffmpeg.stdout.on('data', (data) => {
        process.stdout.write(data);
      });
      
      ffmpeg.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Video created successfully: ${outputPath}`);
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });
      
      ffmpeg.on('error', (error) => {
        reject(error);
      });
    });
  }

  async cleanup() {
    try {
      console.log('🧹 Cleaning up frame files...');
      const files = await fs.readdir(this.framesDir);
      
      for (const file of files) {
        if (file.endsWith('.png')) {
          await fs.unlink(path.join(this.framesDir, file));
        }
      }
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.warn('⚠️  Cleanup failed:', error);
    }
  }

  async run() {
    try {
      console.log('🎯 Starting Canvas Video Extractor');
      console.log(`📺 Target: ${this.targetUrl}`);
      console.log(`⚙️  Settings: ${this.outputWidth}x${this.outputHeight} @ ${this.targetFPS}fps`);
      
      await this.init();
      const frameCount = await this.captureFrames();
      
      if (frameCount > 0) {
        const videoPath = await this.createVideo(frameCount);
        console.log(`🎉 Success! Video saved to: ${videoPath}`);
        
        // Optionally clean up frame files
        await this.cleanup();
      } else {
        console.log('❌ No frames were captured');
      }
      
    } catch (error) {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    }
  }
}

// Alternative direct canvas capture method
class DirectCanvasCapture {
  constructor() {
    this.outputDir = '/app/output';
    this.framesDir = '/app/frames';
    this.targetUrl = 'https://wutheringwaves-event1.kurogames-global.com/?packageId=A1730&language=en&isInternalBrowser=0&platform=PC';
  }

  async captureWithScreenshot() {
    console.log('📷 Using screenshot-based capture method...');
    
    let browser;
    let frameCount = 0;
    const targetFPS = 60;
    const maxFrames = targetFPS * 30;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--window-size=3840,2160'
        ],
        defaultViewport: {
          width: 3840,
          height: 2160,
          deviceScaleFactor: 1
        }
      });

      const page = await browser.newPage();
      await page.goto(this.targetUrl, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(3000);

      console.log('🎬 Starting screenshot capture...');
      
      const frameInterval = 1000 / targetFPS;
      const startTime = Date.now();
      
      while (frameCount < maxFrames) {
        const framePath = path.join(this.framesDir, `frame_${String(frameCount).padStart(6, '0')}.png`);
        
        await page.screenshot({
          path: framePath,
          type: 'png',
          fullPage: false
        });
        
        frameCount++;
        
        if (frameCount % 60 === 0) {
          console.log(`📸 Captured ${frameCount} frames...`);
        }
        
        await page.waitForTimeout(frameInterval);
        
        if (Date.now() - startTime > 30000 + 5000) break;
      }

      console.log(`✅ Screenshot capture completed: ${frameCount} frames`);
      return frameCount;

    } finally {
      if (browser) await browser.close();
    }
  }
}

// Run the extractor
async function main() {
  const extractor = new CanvasVideoExtractor();
  await extractor.run();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CanvasVideoExtractor, DirectCanvasCapture };
