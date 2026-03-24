# Release Tve+

Build and publish a new release. Automatically detects release type and version bump.

## Steps

1. **Detect release type and version bump**:
   - Check `git diff <last-release-tag> -- android/` for native code changes
   - If native code changed → **full release** (APK + OTA bundle), bump **minor** (0.X.0)
   - If only JS/TS changed → **OTA release** (bundle only), bump **patch** (0.0.X)
   - Override: if `$ARGUMENTS` is `major`, `minor`, or `patch`, use that instead

2. **Bump version**: Update `version.json` and `src/version.ts` with the new version.

3. **Git commit**: Stage all changed files, commit with message:
   - Full release: `release: vX.Y.Z`
   - OTA release: `release: vX.Y.Z (OTA)`
   The pre-commit hook will auto-bump the patch — read the final version from `version.json` after commit and use THAT for the tag.

4. **If full release** — build APK:
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
   - Full release: attach BOTH `app-release.apk` AND `index.android.bundle`, use `--latest`
   - OTA release: attach ONLY `index.android.bundle`, do NOT use `--latest` (so the `/releases/latest/download/app-release.apk` link always points to the last full APK)
   Include release type and changelog in the notes.

8. **Verify**: `gh release view vX.Y.Z`. Tell the user:
   - Release type (OTA or full APK)
   - What the TV box will do (auto-restart vs reinstall)

## Important
- Do NOT release without the user's explicit request
- Do NOT skip any step
- Always verify the GitHub release was created successfully before reporting done
