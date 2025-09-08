#!/usr/bin/env bash
set -euo pipefail

APP_CMD_NAME="ai-accountability-assistant"
INSTALL_DIR="$HOME/.local/share/$APP_CMD_NAME"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
LAUNCHER_PATH="$BIN_DIR/$APP_CMD_NAME"
DESKTOP_ENTRY_PATH="$DESKTOP_DIR/$APP_CMD_NAME.desktop"

echo "==> Uninstalling $APP_CMD_NAME"

rm -f "$LAUNCHER_PATH" || true
rm -f "$DESKTOP_ENTRY_PATH" || true
rm -rf "$INSTALL_DIR" || true

echo "==> Uninstall complete."
