#!/usr/bin/env bash
set -euo pipefail

APP_NAME="AI Accountability Assistant"
APP_CMD_NAME="ai-accountability-assistant"
INSTALL_DIR="$HOME/.local/share/$APP_CMD_NAME"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
LAUNCHER_PATH="$BIN_DIR/$APP_CMD_NAME"
DESKTOP_ENTRY_PATH="$DESKTOP_DIR/$APP_CMD_NAME.desktop"

echo "==> Installing $APP_NAME"

# Create dirs
mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$DESKTOP_DIR"

# Copy project files (excluding node_modules and build caches if present)
echo "==> Copying project files to $INSTALL_DIR"
rsync -a --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude dist \
  --exclude .turbo \
  --exclude .next \
  ./ "$INSTALL_DIR/"

cd "$INSTALL_DIR"

# Ensure Node.js and pnpm exist
need_node=0
if ! command -v node >/dev/null 2>&1; then
  need_node=1
else
  NODE_MAJOR=$(node -v | sed 's/^v\([0-9]\+\).*/\1/')
  if [ "$NODE_MAJOR" -lt 18 ]; then
    need_node=1
  fi
fi

if [ "$need_node" -eq 1 ]; then
  echo "==> Node.js (>=18) not found. Installing Node.js LTS via nvm (user-local)..."
  # Install nvm user-locally (no sudo)
  export NVM_DIR="$HOME/.nvm"
  if [ ! -d "$NVM_DIR" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  fi
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  nvm install --lts
  nvm use --lts
fi

# Ensure pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  echo "==> pnpm not found. Installing pnpm..."
  corepack enable || true
  corepack prepare pnpm@latest --activate || npm i -g pnpm
fi

# Install deps and build
echo "==> Installing dependencies"
pnpm install --frozen-lockfile || pnpm install

echo "==> Building application"
pnpm build

# Create launcher script (vite preview)
echo "==> Creating launcher at $LAUNCHER_PATH"
cat > "$LAUNCHER_PATH" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
APP_DIR="$HOME/.local/share/ai-accountability-assistant"

# Load nvm if present to ensure node in PATH
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$HOME/.nvm/nvm.sh"
fi

cd "$APP_DIR"
# Start preview on port 3000 (adjust if needed)
exec pnpm preview --host --port 3000
EOF
chmod +x "$LAUNCHER_PATH"

# Create desktop entry
echo "==> Creating desktop entry at $DESKTOP_ENTRY_PATH"
cat > "$DESKTOP_ENTRY_PATH" <<EOF
[Desktop Entry]
Type=Application
Name=$APP_NAME
Comment=Run $APP_NAME locally
Exec=$LAUNCHER_PATH
Icon=${INSTALL_DIR}/public/logo.png
Terminal=false
Categories=Utility;Development;
EOF

echo "==> Installation complete."
echo ""
echo "Launch with: $APP_CMD_NAME"
echo "Or from your app launcher: $APP_NAME"
echo "App runs on: http://localhost:3000"
