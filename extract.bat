@echo off
setlocal

echo ==========================================
echo Canvas Animation Capture and Conversion
echo ==========================================

REM Build and run the Docker container.
REM The CMD in Dockerfile (docker-run.sh) will execute capture.js and create-video.js sequentially.
call docker-compose up --build --remove-orphans

if %errorlevel% neq 0 (
    echo.
    echo ERROR: The Docker process failed. Check logs above.
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
echo Done!
pause
endlocal