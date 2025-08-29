#!/bin/bash

# AI Accountability Assistant - Ubuntu Installer
# This script installs the application and sets it up as a desktop app

set -e

APP_NAME="AI Accountability Assistant"
APP_DIR="$HOME/.local/share/ai-accountability-assistant"
DESKTOP_FILE="$HOME/.local/share/applications/ai-accountability-assistant.desktop"
BIN_DIR="$HOME/.local/bin"

echo "🚀 Installing $APP_NAME..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

# Create application directory
echo "📁 Creating application directory..."
mkdir -p "$APP_DIR"
mkdir -p "$BIN_DIR"

# Copy application files
echo "📋 Copying application files..."
cp -r . "$APP_DIR/"

# Navigate to app directory and install dependencies
cd "$APP_DIR"

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🔨 Building application..."
pnpm build

# Create launcher script
echo "🚀 Creating launcher script..."
cat > "$BIN_DIR/ai-accountability-assistant" << 'EOF'
#!/bin/bash
cd "$HOME/.local/share/ai-accountability-assistant"
pnpm preview --host 0.0.0.0 --port 3000 &
sleep 2
xdg-open "http://localhost:3000"
wait
EOF

chmod +x "$BIN_DIR/ai-accountability-assistant"

# Create desktop entry
echo "🖥️ Creating desktop entry..."
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=$APP_NAME
Comment=AI-powered accountability assistant with prayer times and voice commands
Exec=$BIN_DIR/ai-accountability-assistant
Icon=$APP_DIR/public/logo.png
Terminal=false
StartupNotify=true
Categories=Productivity;Office;
Keywords=AI;Assistant;Prayer;Accountability;
EOF

# Make desktop file executable
chmod +x "$DESKTOP_FILE"

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$HOME/.local/share/applications"
fi

echo "✅ Installation complete!"
echo ""
echo "🎉 $APP_NAME has been installed successfully!"
echo ""
echo "You can now:"
echo "  • Launch from Applications menu"
echo "  • Run from terminal: ai-accountability-assistant"
echo "  • Access at: http://localhost:3000"
echo ""
echo "📍 Installation location: $APP_DIR"
echo "🖥️ Desktop entry: $DESKTOP_FILE"
echo ""
echo "To uninstall, run: ./uninstall.sh"
