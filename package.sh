#!/bin/bash

# Package the application for distribution

APP_NAME="ai-accountability-assistant"
VERSION="1.0.0"
PACKAGE_DIR="dist-package"

echo "📦 Packaging $APP_NAME v$VERSION..."

# Clean previous package
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# Copy necessary files
echo "📋 Copying files..."
cp -r src "$PACKAGE_DIR/"
cp -r public "$PACKAGE_DIR/"
cp package.json "$PACKAGE_DIR/"
cp pnpm-lock.yaml "$PACKAGE_DIR/"
cp vite.config.ts "$PACKAGE_DIR/"
cp tsconfig*.json "$PACKAGE_DIR/"
cp components.json "$PACKAGE_DIR/"
cp index.html "$PACKAGE_DIR/"
cp .env.local "$PACKAGE_DIR/" 2>/dev/null || echo "No .env.local found"
cp convex.json "$PACKAGE_DIR/"
cp install.sh "$PACKAGE_DIR/"
cp uninstall.sh "$PACKAGE_DIR/"

# Make install scripts executable
chmod +x "$PACKAGE_DIR/install.sh"
chmod +x "$PACKAGE_DIR/uninstall.sh"

# Create README for the package
cat > "$PACKAGE_DIR/INSTALL.md" << 'EOF'
# AI Accountability Assistant - Installation Guide

## Quick Install (Ubuntu/Debian)

1. Extract the package
2. Open terminal in the extracted folder
3. Run: `./install.sh`
4. Launch from Applications menu or run: `ai-accountability-assistant`

## Manual Installation

If the automatic installer doesn't work:

1. Install Node.js 20+: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs`
2. Install pnpm: `npm install -g pnpm`
3. Install dependencies: `pnpm install`
4. Build: `pnpm build`
5. Run: `pnpm preview`

## Features

- ✅ Single-user mode (no sign-in required)
- 🕌 Automatic prayer time calculation based on location
- 🎤 Voice commands with hotword activation ("assistant")
- 📝 Task management and accountability tracking
- 🔄 Microsoft To-Do integration (optional)
- 💾 Local data storage

## Usage

1. Go to Settings to configure your location for prayer times
2. Say "assistant" followed by your command for voice input
3. All data is stored locally on your machine

## Uninstall

Run: `./uninstall.sh`
EOF

# Create archive
echo "🗜️ Creating archive..."
tar -czf "${APP_NAME}-${VERSION}-ubuntu.tar.gz" -C "$PACKAGE_DIR" .

echo "✅ Package created: ${APP_NAME}-${VERSION}-ubuntu.tar.gz"
echo ""
echo "📋 Installation instructions:"
echo "1. Extract: tar -xzf ${APP_NAME}-${VERSION}-ubuntu.tar.gz"
echo "2. Install: cd ${APP_NAME}-${VERSION} && ./install.sh"
echo "3. Launch: ai-accountability-assistant"
