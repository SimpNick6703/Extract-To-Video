@echo off
setlocal

echo Canvas Animation Extractor for Wuthering Waves
echo =================================================

:: Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

echo Building Docker image...
docker build -t canvas-extractor .

if errorlevel 1 (
    echo ERROR: Docker build failed!
    pause
    exit /b 1
)

echo SUCCESS: Docker image built successfully!
echo.
echo Running canvas extraction...
echo This will:
echo   1. Navigate to the Wuthering Waves event page
echo   2. Capture canvas animation frames at maximum resolution
echo   3. Convert frames to high-quality MP4 files
echo.

:: Create output directory on host
if not exist ".\output" mkdir ".\output"

:: Run the container and capture container ID
for /f %%i in ('docker run -d --shm-size=2gb canvas-extractor') do set CONTAINER_ID=%%i

echo Container started with ID: %CONTAINER_ID%
echo Following container logs...
echo.

:: Follow logs
docker logs -f %CONTAINER_ID%

:: Check if container completed successfully
for /f %%i in ('docker wait %CONTAINER_ID%') do set EXIT_CODE=%%i

if "%EXIT_CODE%"=="0" (
    echo.
    echo SUCCESS: Extraction completed successfully!
    echo Copying output files to host...
    
    :: Copy output files to host
    docker cp %CONTAINER_ID%:/app/output .\
    docker cp %CONTAINER_ID%:/app/capture_metadata.json .\ >nul 2>&1
    
    echo SUCCESS: Files copied to .\output directory:
    dir /b .\output\
    
    echo.
    echo Process completed! Check the .\output directory for your videos.
) else (
    echo.
    echo ERROR: Extraction failed with exit code: %EXIT_CODE%
    echo Check the logs above for error details.
)

:: Clean up container
echo Cleaning up container...
docker rm %CONTAINER_ID% >nul

echo Done!
pause
