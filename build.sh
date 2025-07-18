#!/bin/bash
set -e

echo "Starting build process..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build client
echo "Building client..."
npm run build

# Run database migrations
echo "Running database migrations..."
npm run db:migrate

echo "Build completed successfully!"