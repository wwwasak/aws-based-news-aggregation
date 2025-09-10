@echo off
echo ========================================
echo   AWS News Aggregator - Config Update
echo ========================================
echo.

echo 1. Building applications...
cd apps\fetcher
call npm run build
if errorlevel 1 (
    echo Failed to build fetcher app
    pause
    exit /b 1
)

cd ..\api
call npm run build
if errorlevel 1 (
    echo Failed to build API app
    pause
    exit /b 1
)

cd ..\notifier
call npm run build
if errorlevel 1 (
    echo Failed to build notifier app
    pause
    exit /b 1
)

echo.
echo 2. Building CDK infrastructure...
cd ..\..\infra
call npm run build
if errorlevel 1 (
    echo Failed to build CDK
    pause
    exit /b 1
)

echo.
echo 3. Deploying updated Lambda functions...
call npx cdk deploy news-agg-lambda --require-approval never
if errorlevel 1 (
    echo Failed to deploy Lambda functions
    pause
    exit /b 1
)

echo.
echo ✅ Configuration update completed successfully!
echo.
echo You can now test the updated configuration by running:
echo aws lambda invoke --function-name news-agg-fetcher --payload "{}" response.json
echo.
pause
