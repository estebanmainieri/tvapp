#!/bin/bash
# Auto-bump patch version on each commit
# Called by the pre-commit git hook

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION_JSON="$ROOT_DIR/version.json"
VERSION_TS="$ROOT_DIR/src/version.ts"

# Read current version
CURRENT=$(grep -o '"version": *"[^"]*"' "$VERSION_JSON" | grep -o '[0-9]*\.[0-9]*\.[0-9]*')

if [ -z "$CURRENT" ]; then
  echo "Could not read version from $VERSION_JSON"
  exit 1
fi

# Split into parts
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

# Bump patch
PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$PATCH"

# Update version.json
echo "{ \"version\": \"$NEW_VERSION\" }" > "$VERSION_JSON"

# Update src/version.ts
cat > "$VERSION_TS" << EOF
// Auto-updated by pre-commit hook
export const APP_VERSION = '$NEW_VERSION';
EOF

# Stage the updated files
git add "$VERSION_JSON" "$VERSION_TS"

echo "Version bumped: $CURRENT -> $NEW_VERSION"
