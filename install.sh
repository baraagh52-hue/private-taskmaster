#!/usr/bin/env bash
set -euo pipefail

APP_NAME="AI Accountability Assistant"
APP_ID="ai-assistant"
INSTALL_DIR="$HOME/.local/share/$APP_ID"
BIN_DIR="$HOME/.local/bin"
LAUNCHER="$BIN_DIR/$APP_ID"
DESKTOP_FILE="$HOME/.local/share/applications/$APP_ID.desktop"
ICON_DIR="$HOME/.local/share/icons"
ICON_FILE="$ICON_DIR/$APP_ID.png"

echo "[1/8] Preparing directories..."
mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$(dirname "$DESKTOP_FILE")" "$ICON_DIR"

echo "[2/8] Installing Node & pnpm (user-level)..."
# Enable corepack and pnpm for the user
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Installing Node.js (via fnm for user)..."
  # Install fnm (Fast Node Manager) user-local
  curl -fsSL https://fnm.vercel.app/install | bash
  export PATH="$HOME/.fnm:$PATH"
  eval "$(fnm env)"
  fnm install --lts
  fnm use --lts
fi
corepack enable || true
corepack prepare pnpm@latest --activate || true

echo "[3/8] Copying project files to $INSTALL_DIR..."
# Use rsync if available for faster copy
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude=node_modules --exclude=dist --exclude=.git ./ "$INSTALL_DIR"/
else
  # Fallback to cp
  rm -rf "$INSTALL_DIR"/*
  cp -R ./ "$INSTALL_DIR"/
  # remove heavy/unnecessary dirs if present
  rm -rf "$INSTALL_DIR/node_modules" "$INSTALL_DIR/dist" "$INSTALL_DIR/.git" || true
fi

echo "[4/8] Installing dependencies and building app..."
cd "$INSTALL_DIR"
pnpm install --frozen-lockfile || pnpm install
# Build may fail if environment is not set for prod; still allow dev run via launcher
if pnpm build; then
  echo "Build completed."
else
  echo "Build failed (continuing). You can run development server via the launcher."
fi

echo "[5/8] Installing icon..."
if [ -f "$INSTALL_DIR/public/logo.png" ]; then
  cp "$INSTALL_DIR/public/logo.png" "$ICON_FILE"
elif [ -f "$INSTALL_DIR/public/logo.svg" ]; then
  # Some desktops handle SVG fine
  cp "$INSTALL_DIR/public/logo.svg" "$ICON_FILE"
else
  # Create a placeholder if missing
  convert -size 512x512 xc:#111111 "$ICON_FILE" 2>/dev/null || true
fi

echo "[6/8] Creating launcher script at $LAUNCHER..."
cat > "$LAUNCHER" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$HOME/.local/share/ai-assistant"

if [ ! -d "$APP_DIR" ]; then
  echo "Install directory not found: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

# Ensure pnpm available
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable || true
    corepack prepare pnpm@latest --activate || true
  fi
fi

# Prefer preview if build exists, otherwise dev
if [ -d "dist" ]; then
  # Start preview server
  exec pnpm preview
else
  # Start dev server (Terminal=True in .desktop)
  exec pnpm dev
fi
EOF
chmod +x "$LAUNCHER"

echo "[7/8] Creating desktop entry at $DESKTOP_FILE..."
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=$APP_NAME
Comment=Launch the AI Accountability Assistant
Exec=$LAUNCHER
Terminal=true
Type=Application
Icon=$ICON_FILE
Categories=Utility;Productivity;
Keywords=AI;Assistant;Productivity;Tasks;Prayer;
StartupNotify=false
EOF

# Attempt to update desktop database (optional)
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$(dirname "$DESKTOP_FILE")" || true
fi

echo "[8/8] Done!"
echo
echo "Launcher installed:"
echo "  - Desktop entry: $DESKTOP_FILE"
echo "  - CLI launcher:  $LAUNCHER"
echo
echo "You can launch from your app menu as \"$APP_NAME\" or by running: $APP_ID"
echo "If it doesn't appear, try:  gtk-update-icon-cache ~/.local/share/icons  (optional) and relogin."
