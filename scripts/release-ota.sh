#!/bin/bash
# Build and release an OTA (JS bundle only) update.
# This is faster than a full APK release and doesn't require reinstallation.
#
# Usage: ./scripts/release-ota.sh
#
# What it does:
# 1. Reads version from version.json
# 2. Builds the JS bundle (index.android.bundle)
# 3. Creates a git commit + tag
# 4. Pushes to GitHub
# 5. Creates a GitHub Release with the bundle attached
#
# The app will detect the new bundle and apply it on next update check.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

# Read version
VERSION=$(grep -o '"version": *"[^"]*"' version.json | grep -o '[0-9]*\.[0-9]*\.[0-9]*')
if [ -z "$VERSION" ]; then
  echo "Error: Could not read version from version.json"
  exit 1
fi

echo "==> Building OTA bundle for v${VERSION}..."

# Build the JS bundle
BUNDLE_DIR="$ROOT_DIR/android/app/build/ota"
mkdir -p "$BUNDLE_DIR"

npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output "$BUNDLE_DIR/index.android.bundle" \
  --assets-dest "$BUNDLE_DIR/assets" \
  --minify true

BUNDLE_SIZE=$(wc -c < "$BUNDLE_DIR/index.android.bundle" | tr -d ' ')
echo "==> Bundle built: ${BUNDLE_SIZE} bytes"

if [ "$BUNDLE_SIZE" -lt 1000 ]; then
  echo "Error: Bundle is too small, something went wrong"
  exit 1
fi

echo "==> OTA bundle ready at: $BUNDLE_DIR/index.android.bundle"
echo ""
echo "To release, run:"
echo "  git add -A && git commit -m 'release: v${VERSION}'"
echo "  git tag v${VERSION}"
echo "  git push origin main --tags"
echo "  gh release create v${VERSION} $BUNDLE_DIR/index.android.bundle --title 'Teve+ v${VERSION}' --notes 'OTA update v${VERSION}' --latest"
