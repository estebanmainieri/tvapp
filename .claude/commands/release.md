# Release Tve+

Build and publish a new release of the Tve+ app. Automatically detects whether a full APK or OTA-only release is needed.

## Steps

1. **Detect release type**: Run `git diff HEAD -- android/` to check if any native code changed since the last release tag. If native files changed → full APK + OTA bundle. If only JS/TS changed → OTA bundle only.

2. **Bump version**: Read `version.json`, increment the patch number (or use `$ARGUMENTS` if provided: `major`, `minor`, or `patch`). Update both `version.json` and `src/version.ts`.

3. **Git commit**: Stage all changed files, commit with message `release: vX.Y.Z`. The pre-commit hook will auto-bump the version — read the final version from `version.json` after commit and use THAT for the tag.

4. **If full release (native changed)**:
   Build APK:
   ```
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export JAVA_HOME=/usr/local/opt/openjdk@17
   export PATH=$JAVA_HOME/bin:$PATH
   cd android && ./gradlew assembleRelease --no-daemon
   ```

5. **Always build OTA bundle**:
   ```
   mkdir -p android/app/build/ota
   npx react-native bundle \
     --platform android \
     --dev false \
     --entry-file index.js \
     --bundle-output android/app/build/ota/index.android.bundle \
     --assets-dest android/app/build/ota/assets \
     --minify true
   ```

6. **Tag and push**: Create git tag with the final version and push to origin/main.

7. **Create GitHub Release**:
   - Full release: attach BOTH `app-release.apk` AND `index.android.bundle`
   - OTA only: attach ONLY `index.android.bundle`
   Include release type in the notes (e.g., "OTA update" or "Full release").

8. **Verify**: `gh release view vX.Y.Z`

## Important
- Do NOT release without the user's explicit request
- Do NOT skip any step
- Always verify the GitHub release was created successfully before reporting done
- Tell the user whether this was an OTA or full APK release
