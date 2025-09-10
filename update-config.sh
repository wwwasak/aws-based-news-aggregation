#!/bin/bash

echo "========================================"
echo "  AWS News Aggregator - Config Update"
echo "========================================"
echo

echo "1. Building applications..."
cd apps/fetcher
npm run build
if [ $? -ne 0 ]; then
    echo "Failed to build fetcher app"
    exit 1
fi

cd ../api
npm run build
if [ $? -ne 0 ]; then
    echo "Failed to build API app"
    exit 1
fi

cd ../notifier
npm run build
if [ $? -ne 0 ]; then
    echo "Failed to build notifier app"
    exit 1
fi

echo
echo "2. Building CDK infrastructure..."
cd ../../infra
npm run build
if [ $? -ne 0 ]; then
    echo "Failed to build CDK"
    exit 1
fi

echo
echo "3. Deploying updated Lambda functions..."
npx cdk deploy news-agg-lambda --require-approval never
if [ $? -ne 0 ]; then
    echo "Failed to deploy Lambda functions"
    exit 1
fi

echo
echo "✅ Configuration update completed successfully!"
echo
echo "You can now test the updated configuration by running:"
echo "aws lambda invoke --function-name news-agg-fetcher --payload '{}' response.json"
echo
