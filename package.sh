#!/usr/bin/env bash
set -euo pipefail

# Read version from package.json
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run this packager."
  exit 1
fi

VERSION=$(node -e "console.log(require('./package.json').version || '0.0.0')")
PKG_NAME="ai-accountability-assistant-${VERSION}-ubuntu"
OUT_FILE="${PKG_NAME}.tar.gz"

echo "==> Creating package ${OUT_FILE}"

TMP_DIR="$(mktemp -d)"
PKG_DIR="$TMP_DIR/$PKG_NAME"
mkdir -p "$PKG_DIR"

# Copy files excluding heavy/artifact dirs
rsync -a \
  --exclude node_modules \
  --exclude .git \
  --exclude dist \
  --exclude .turbo \
  --exclude .next \
  ./ "$PKG_DIR/"

# Ensure installer scripts are executable
chmod +x "$PKG_DIR/install.sh" "$PKG_DIR/uninstall.sh" || true

# Create archive
tar -C "$TMP_DIR" -czf "$OUT_FILE" "$PKG_NAME"

# Cleanup temp dir
rm -rf "$TMP_DIR"

echo "==> Package created: $OUT_FILE"
echo "Install steps:"
echo "  tar -xzf $OUT_FILE"
echo "  cd $PKG_NAME"
echo "  ./install.sh"
