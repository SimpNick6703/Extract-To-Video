const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

async function createVideo() {
    console.log('Starting video creation with FFmpeg...');

    try {
        await fs.access('./frames');
    } catch {
        console.error('Error: frames directory not found. Run the capture script first.');
        process.exit(1);
    }

    let frameFiles;
    try {
        frameFiles = await fs.readdir('./frames');
        frameFiles = frameFiles.filter(file => file.endsWith('.png'));
    } catch (error) {
        console.error('Error reading frames directory:', error);
        process.exit(1);
    }

    if (frameFiles.length === 0) {
        console.error('Error: No frames found in ./frames/ directory. Cannot create video.');
        process.exit(1);
    }

    console.log(`Found ${frameFiles.length} frames.`);

    try {
        await fs.access('./output');
    } catch {
        await fs.mkdir('./output');
    }

    let fps = 60;

    // Use FFmpeg to create the video
    return new Promise((resolve, reject) => {
        const args = [
            '-y', // Overwrite output file
            '-framerate', fps.toString(),
            '-i', './frames/frame-%05d.png', // Corrected to %05d for consistency with capture.js
            '-c:v', 'libx264', // Using H.264 (CPU) for broader compatibility
            '-preset', 'medium', // Good balance of speed and compression
            '-crf', '18', // Constant Rate Factor for quality (18-23 is good)
            '-pix_fmt', 'yuv420p', // Pixel format for broad compatibility
            '-movflags', '+faststart', // Optimize for web playback
            './output/animation.mp4'
        ];

        console.log(`Running FFmpeg: ffmpeg ${args.join(' ')}`);

        const child = spawn('ffmpeg', args, {
            stdio: 'inherit' // This is important to see FFmpeg's output directly
        });

        child.on('close', async (code) => {
            if (code === 0) {
                console.log('\nSUCCESS: Video creation completed successfully with FFmpeg!');
                try {
                    const outputPath = './output/animation.mp4';
                    const stats = await fs.stat(outputPath);
                    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                    console.log('\nOutput details:');
                    console.log(`  File: ${outputPath}`);
                    console.log(`  Size: ${fileSizeMB} MB`);
                    console.log(`  Frames: ${frameFiles.length}`);
                    console.log(`  FPS: ${fps}`);
                    console.log('\nVideo is ready for playback!');
                } catch (error) {
                    console.log('Video created but could not read file details:', error.message);
                }
                resolve();
            } else {
                console.error(`\nERROR: FFmpeg failed with exit code ${code}`);
                reject(new Error(`FFmpeg process failed with exit code ${code}`));
            }
        });

        child.on('error', (error) => {
            console.error('Failed to start FFmpeg process:', error);
            reject(error);
        });
    });
}

// Run the video creation
createVideo()
    .then(() => {
        console.log('\n========================================');
        console.log('SUCCESS: Full process completed!');
        console.log('========================================');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nERROR: Video conversion failed:', error);
        process.exit(1);
    });