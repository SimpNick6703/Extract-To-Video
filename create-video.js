const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

async function createVideo() {
    console.log('Converting frames to MP4 using canvas-sketch-cli...');

    // Check if frames directory exists
    try {
        await fs.access('./frames');
    } catch {
        console.error('Error: frames directory not found. Run the capture script first.');
        process.exit(1);
    }

    // Count frames
    let frameFiles;
    try {
        frameFiles = await fs.readdir('./frames');
        frameFiles = frameFiles.filter(file => file.endsWith('.png'));
    } catch (error) {
        console.error('Error reading frames directory:', error);
        process.exit(1);
    }

    if (frameFiles.length === 0) {
        console.error('Error: No frames found in ./frames/ directory');
        process.exit(1);
    }

    console.log(`Found ${frameFiles.length} frames`);

    // Read metadata if available
    let fps = 60;
    let metadata = null;
    try {
        const metadataContent = await fs.readFile('./capture_metadata.json', 'utf8');
        metadata = JSON.parse(metadataContent);
        if (metadata.actualFPS) {
            fps = Math.round(metadata.actualFPS);
            console.log(`Using detected framerate: ${fps} FPS`);
        }
    } catch {
        console.log('No metadata found, using default 60 FPS');
    }

    // Create output directory
    try {
        await fs.access('./output');
    } catch {
        await fs.mkdir('./output');
    }

    console.log('Creating high-quality MP4 using canvas-sketch-cli...');

    // Use canvas-sketch-cli to create the video
    return new Promise((resolve, reject) => {
        const args = [
            'canvas-sketch-cli',
            './frames',
            `--dir=./output`,
            `--output=animation.mp4`,
            `--fps=${fps}`,
            '--crf=18',
            '--preset=medium'
        ];

        console.log(`Running: npx ${args.join(' ')}`);

        const child = spawn('npx', args, {
            stdio: 'inherit',
            shell: true
        });

        child.on('close', async (code) => {
            if (code === 0) {
                console.log('\nSUCCESS: Video creation completed successfully!');
                
                try {
                    // Check output file and show details
                    const outputPath = './output/animation.mp4';
                    const stats = await fs.stat(outputPath);
                    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                    
                    console.log('\nOutput details:');
                    console.log(`  File: ${outputPath}`);
                    console.log(`  Size: ${fileSizeMB} MB`);
                    console.log(`  Frames: ${frameFiles.length}`);
                    console.log(`  FPS: ${fps}`);
                    
                    if (metadata) {
                        const durationSeconds = (metadata.totalDuration / 1000).toFixed(2);
                        console.log(`  Duration: ${durationSeconds} seconds`);
                    }
                    
                    console.log('\nVideo is ready for playback!');
                } catch (error) {
                    console.log('Video created but could not read file details:', error.message);
                }
                
                resolve();
            } else {
                console.error(`\nERROR: Video creation failed with exit code ${code}`);
                console.error('This might be due to:');
                console.error('  - canvas-sketch-cli not properly installed');
                console.error('  - FFmpeg not available in system PATH');
                console.error('  - Invalid frame files');
                console.error('\nTrying fallback FFmpeg approach...');
                
                // Fallback to direct FFmpeg if canvas-sketch-cli fails
                createVideoWithFFmpeg(fps, frameFiles.length)
                    .then(resolve)
                    .catch(reject);
            }
        });

        child.on('error', (error) => {
            console.error('Failed to start canvas-sketch-cli:', error);
            console.log('Trying fallback FFmpeg approach...');
            
            // Fallback to direct FFmpeg
            createVideoWithFFmpeg(fps, frameFiles.length)
                .then(resolve)
                .catch(reject);
        });
    });
}

async function createVideoWithFFmpeg(fps, frameCount) {
    console.log('\nUsing direct FFmpeg approach...');
    
    return new Promise((resolve, reject) => {
        const args = [
            '-y',
            '-r', fps.toString(),
            '-i', './frames/frame_%06d.png',
            '-c:v', 'libx265',
            '-preset', 'medium',
            '-crf', '18',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            './output/animation.mp4'
        ];

        console.log(`Running: ffmpeg ${args.join(' ')}`);

        const child = spawn('ffmpeg', args, {
            stdio: 'inherit'
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
                    console.log(`  Frames: ${frameCount}`);
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
            console.error('Failed to start FFmpeg:', error);
            reject(error);
        });
    });
}

// Run the video creation
createVideo()
    .then(() => {
        console.log('\n========================================');
        console.log('SUCCESS: Video conversion completed successfully!');
        console.log('========================================');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nERROR: Video conversion failed:', error);
        process.exit(1);
    });
