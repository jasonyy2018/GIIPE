@echo off
REM Windows batch script to run all checks
echo Running all build checks...
echo.

REM Set UTF-8 encoding
chcp 65001 >nul

echo [1/3] Quick syntax check...
python scripts\quick-check.py
if %errorlevel% neq 0 (
    echo Quick check failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Comprehensive check...
python scripts\ultimate-build-check.py
if %errorlevel% neq 0 (
    echo Comprehensive check found issues!
    pause
    exit /b 1
)

echo.
echo [3/3] Full build check (requires Node.js)...
cd frontend
if exist node_modules (
    python ..\scripts\check-before-build.py
) else (
    echo Skipping - node_modules not found. Run 'npm install' first.
)
cd ..

echo.
echo All checks completed!
pause

