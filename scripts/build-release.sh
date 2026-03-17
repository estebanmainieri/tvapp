#!/bin/bash
# Build release APK and create GitHub release
# Usage: ./scripts/build-release.sh [major|minor|patch]
#   Default: patch

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION_JSON="$ROOT_DIR/version.json"
VERSION_TS="$ROOT_DIR/src/version.ts"
BUMP_TYPE="${1:-patch}"

cd "$ROOT_DIR"

# Read current version
CURRENT=$(grep -o '"version": *"[^"]*"' "$VERSION_JSON" | grep -o '[0-9]*\.[0-9]*\.[0-9]*')
if [ -z "$CURRENT" ]; then
  echo "❌ Could not read version from $VERSION_JSON"
  exit 1
fi

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

# Bump version
case "$BUMP_TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "Usage: $0 [major|minor|patch]"; exit 1 ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
TAG="v$NEW_VERSION"
APK_NAME="tveplus-$NEW_VERSION.apk"

echo "📦 Building version $CURRENT → $NEW_VERSION"

# Update version files
echo "{ \"version\": \"$NEW_VERSION\" }" > "$VERSION_JSON"
cat > "$VERSION_TS" << EOF
// Auto-updated by build-release script
export const APP_VERSION = '$NEW_VERSION';
EOF

# Build release APK
echo "🔨 Building release APK..."
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export JAVA_HOME="${JAVA_HOME:-/usr/local/opt/openjdk@17}"
export PATH="$JAVA_HOME/bin:$PATH"

cd android
./gradlew assembleRelease --no-daemon
cd ..

APK_SRC="android/app/build/outputs/apk/release/app-release.apk"
APK_DST="$ROOT_DIR/$APK_NAME"

if [ ! -f "$APK_SRC" ]; then
  echo "❌ APK not found at $APK_SRC"
  exit 1
fi

cp "$APK_SRC" "$APK_DST"
echo "✅ APK built: $APK_DST"

# Git commit + tag
git add "$VERSION_JSON" "$VERSION_TS"
git commit -m "release: v$NEW_VERSION"
git tag "$TAG"
git push origin main
git push origin "$TAG"

# Create GitHub release
echo "🚀 Creating GitHub release $TAG..."
gh release create "$TAG" "$APK_DST" \
  --title "Tve+ $TAG" \
  --notes "Release $NEW_VERSION" \
  --latest

rm "$APK_DST"

echo ""
echo "✅ Release $TAG published!"
echo "📥 Download: https://github.com/estebanmainieri/tvapp/releases/latest/download/$APK_NAME"
