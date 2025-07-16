@echo off
setlocal

echo ==========================================
echo Canvas Animation Capture and Conversion
echo ==========================================

REM Step 1: Build the Docker image if it doesn't exist
docker-compose build

echo.
echo Step 1: Capturing canvas animation frames...
echo This may take a few minutes...

REM Use the correct service name 'canvas-extractor' and run capture.js directly
docker-compose run --rm canvas-extractor node capture.js
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Frame capture failed!
    echo Please check the logs and debug screenshots (debug_*.png).
    goto :error
)

echo.
echo ==========================================
echo Step 2: Converting frames to a high-quality video...
echo ==========================================

REM Use the correct service name 'canvas-extractor' and run create-video.js directly
docker-compose run --rm canvas-extractor node create-video.js
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Video creation failed.
    goto :error
)

echo.
echo SUCCESS: Process completed!
goto :cleanup

:error
echo.
echo ERROR: Extraction failed.
echo Check the logs above for error details.

:cleanup
echo.
echo Cleaning up container...
docker-compose down

echo Done!
pause
endlocal