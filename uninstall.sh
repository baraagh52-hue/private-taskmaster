#!/usr/bin/env bash
set -euo pipefail

APP_ID="ai-assistant"
INSTALL_DIR="$HOME/.local/share/$APP_ID"
BIN_DIR="$HOME/.local/bin"
LAUNCHER="$BIN_DIR/$APP_ID"
DESKTOP_FILE="$HOME/.local/share/applications/$APP_ID.desktop"
ICON_FILE="$HOME/.local/share/icons/$APP_ID.png"

echo "Removing launcher, desktop entry, icon, and install dir..."

rm -f "$LAUNCHER" || true
rm -f "$DESKTOP_FILE" || true
rm -f "$ICON_FILE" || true
rm -rf "$INSTALL_DIR" || true

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" || true
fi

echo "Uninstalled $APP_ID."
