#!/bin/bash

# AI Accountability Assistant - Ubuntu Uninstaller

APP_NAME="AI Accountability Assistant"
APP_DIR="$HOME/.local/share/ai-accountability-assistant"
DESKTOP_FILE="$HOME/.local/share/applications/ai-accountability-assistant.desktop"
BIN_FILE="$HOME/.local/bin/ai-accountability-assistant"

echo "🗑️ Uninstalling $APP_NAME..."

# Stop any running instances
pkill -f "ai-accountability-assistant" || true

# Remove application directory
if [ -d "$APP_DIR" ]; then
    echo "📁 Removing application directory..."
    rm -rf "$APP_DIR"
fi

# Remove desktop entry
if [ -f "$DESKTOP_FILE" ]; then
    echo "🖥️ Removing desktop entry..."
    rm "$DESKTOP_FILE"
fi

# Remove launcher script
if [ -f "$BIN_FILE" ]; then
    echo "🚀 Removing launcher script..."
    rm "$BIN_FILE"
fi

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$HOME/.local/share/applications"
fi

echo "✅ $APP_NAME has been uninstalled successfully!"
