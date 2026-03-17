# Release Tve+

Build, upload, and publish a new release of the Tve+ app.

## Steps

1. **Bump version**: Read `version.json`, increment the patch number (or use `$ARGUMENTS` if provided: `major`, `minor`, or `patch`). Update both `version.json` and `src/version.ts`.

2. **Build release APK**: Run the Android release build:
   ```
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export JAVA_HOME=/usr/local/opt/openjdk@17
   export PATH=$JAVA_HOME/bin:$PATH
   cd android && ./gradlew assembleRelease --no-daemon
   ```
   The APK will be at `android/app/build/outputs/apk/release/app-release.apk`.

3. **Git commit & tag**: Stage `version.json` and `src/version.ts`, commit with message `release: vX.Y.Z`, and create git tag `vX.Y.Z`.

4. **Push to GitHub**: Push the commit and tag to origin/main.

5. **Create GitHub Release**: Use `gh release create` to create a release with the APK attached:
   ```
   gh release create vX.Y.Z android/app/build/outputs/apk/release/app-release.apk \
     --title "Tve+ vX.Y.Z" \
     --notes "Release X.Y.Z" \
     --latest
   ```

6. **Verify**: Confirm the release is live by running `gh release view vX.Y.Z`. Print the download URL.

The app automatically checks GitHub Releases every 24 hours (or manually via Settings > Check for updates). When it detects a new version, it downloads the APK and triggers the Android installer.

## Important
- Do NOT skip any step
- If the build fails, fix the error and retry — do not proceed without a successful build
- The APK must be a release build (not debug) so it works standalone without Metro
- Always verify the GitHub release was created successfully before reporting done
