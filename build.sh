#!/bin/bash
set -e
echo "=== Installing npm dependencies ==="
npm install
echo "=== Building frontend ==="
npm run build
echo "=== dist contents ==="
ls -la dist/
echo "=== Copying frontend to static ==="
mkdir -p backend/src/main/resources/static
cp dist/index.html backend/src/main/resources/static/
cp -r dist/assets backend/src/main/resources/static/
echo "=== static contents ==="
ls -la backend/src/main/resources/static/
echo "=== Building backend ==="
cd backend && mvn clean package -DskipTests -q
echo "=== Build complete ==="