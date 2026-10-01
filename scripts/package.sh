#!/usr/bin/env bash
# Builds dist/meet-spark-<version>.zip from extension/ (ready to share or upload to the Chrome Web Store).
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./extension/manifest.json').version")
mkdir -p dist
rm -f "dist/meet-spark-$VERSION.zip"
(cd extension && zip -qr "../dist/meet-spark-$VERSION.zip" . -x '.*')
echo "Built dist/meet-spark-$VERSION.zip"
