#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="ai-assistant-installer"
OUT_DIR="dist_pkg"
ARCHIVE="${PKG_NAME}.tar.gz"

echo "Building package..."
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Copy necessary files
cp -R \
  package.json \
  pnpm-lock.yaml 2>/dev/null || true
cp -R src public index.html README.md components.json "$OUT_DIR"/ 2>/dev/null || true

# Add installer scripts
cp install.sh uninstall.sh "$OUT_DIR"/

# Create archive at project root
tar -czf "$ARCHIVE" -C "$OUT_DIR" .

echo "Package created: $ARCHIVE"
echo "To install on Ubuntu:"
echo "  tar -xzf $ARCHIVE"
echo "  cd $OUT_DIR"
echo "  bash install.sh"
