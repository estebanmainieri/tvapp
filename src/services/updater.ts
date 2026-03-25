import { Platform, NativeModules, AppState, Alert } from 'react-native';
import { APP_VERSION } from '../version';

const GITHUB_OWNER = 'estebanmainieri';
const GITHUB_REPO = 'tvapp';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
// Use /releases (sorted by date desc) instead of /releases/latest,
// because "latest" points to the last full APK release, not OTA updates.
const RELEASES_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=5`;

export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  bundleUrl: string;
  hasUpdate: boolean;
  isOta: boolean; // true = JS bundle only, false = full APK
  error?: string;
}

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  try {
    console.log('[Updater] Checking for updates... Current version:', APP_VERSION);
    const res = await fetch(RELEASES_URL, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const releases = await res.json();
    if (!Array.isArray(releases) || releases.length === 0) {
      throw new Error('No releases found');
    }

    // Find the newest release by version (first in list = most recent by date)
    const release = releases[0];
    const latestVersion = (release.tag_name || '').replace(/^v/, '');
    const currentVersion = APP_VERSION;

    console.log('[Updater] Latest version:', latestVersion, 'Current:', currentVersion);

    // Also check against OTA bundle version
    let otaVersion = '';
    if (Platform.OS === 'android') {
      const { AppUpdater } = NativeModules;
      if (AppUpdater?.getOtaBundleVersion) {
        try {
          otaVersion = await AppUpdater.getOtaBundleVersion();
        } catch (_) {}
      }
    }

    const effectiveVersion = otaVersion && compareVersions(otaVersion, currentVersion) > 0
      ? otaVersion
      : currentVersion;

    const hasUpdate = compareVersions(latestVersion, effectiveVersion) > 0;

    let downloadUrl = '';
    let bundleUrl = '';
    if (hasUpdate) {
      // Look for bundle in the newest release
      for (const a of (release.assets || []) as any[]) {
        if (a.name === 'index.android.bundle') {
          bundleUrl = a.browser_download_url;
        }
      }
      // Look for APK in any of the recent releases (might be in an older one)
      for (const r of releases) {
        for (const a of (r.assets || []) as any[]) {
          if (a.name.endsWith('.apk')) {
            downloadUrl = a.browser_download_url;
            break;
          }
        }
        if (downloadUrl) break;
      }
      console.log('[Updater] APK URL:', downloadUrl || 'none');
      console.log('[Updater] Bundle URL:', bundleUrl || 'none');
    }

    // Prefer OTA bundle update (faster, no reinstall) over full APK
    const isOta = !!bundleUrl;

    return { version: latestVersion, downloadUrl, bundleUrl, hasUpdate, isOta };
  } catch (err: any) {
    console.warn('[Updater] Check failed:', err?.message || err);
    return { version: APP_VERSION, downloadUrl: '', bundleUrl: '', hasUpdate: false, isOta: false, error: err?.message || 'Check failed' };
  }
}

async function ensureInstallPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const { AppUpdater } = NativeModules;
  if (!AppUpdater?.canInstallApks) return true;

  try {
    const canInstall = await AppUpdater.canInstallApks();
    if (canInstall) return true;

    // Open settings so user can grant permission
    console.log('[Updater] Requesting install permission...');
    await AppUpdater.openInstallPermissionSettings();

    // Give user time to toggle the setting, then re-check
    await new Promise<void>(r => setTimeout(r, 3000));
    return await AppUpdater.canInstallApks();
  } catch (e) {
    console.warn('[Updater] Permission check failed:', e);
    return true; // proceed anyway, let Android handle it
  }
}

export async function applyUpdate(update: UpdateInfo): Promise<void> {
  if (Platform.OS === 'web') {
    (window as any).location.reload();
    return;
  }

  if (Platform.OS === 'android') {
    const { AppUpdater } = NativeModules;
    if (!AppUpdater) {
      throw new Error('AppUpdater native module not available');
    }

    // Prefer OTA bundle update
    if (update.isOta && update.bundleUrl && AppUpdater.downloadBundle) {
      console.log('[Updater] Applying OTA bundle update...');
      await AppUpdater.downloadBundle(update.bundleUrl, update.version);
      console.log('[Updater] OTA bundle downloaded. Restarting app...');
      await AppUpdater.restartApp();
      return;
    }

    // Fall back to full APK update
    if (update.downloadUrl) {
      const hasPermission = await ensureInstallPermission();
      if (!hasPermission) {
        throw new Error('Install permission not granted. Go to Settings > Apps > Teve+ > Install unknown apps');
      }

      console.log('[Updater] Starting APK download and install...');
      await AppUpdater.downloadAndInstall(update.downloadUrl);
    }
  }
}

// Keep backwards compatibility — old callers pass just a URL string
export async function applyUpdateLegacy(downloadUrl: string): Promise<void> {
  return applyUpdate({
    version: '',
    downloadUrl,
    bundleUrl: '',
    hasUpdate: true,
    isOta: false,
  });
}

let checkTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: { remove: () => void } | null = null;

export function startBackgroundUpdateCheck(
  onUpdateAvailable: (info: UpdateInfo) => void,
) {
  const doCheck = () => {
    checkForUpdate().then(info => {
      if (info.hasUpdate) onUpdateAvailable(info);
    });
  };

  // Check immediately
  doCheck();

  // Then periodically
  checkTimer = setInterval(doCheck, CHECK_INTERVAL);

  // Also check when app comes back from background (native only)
  if (Platform.OS !== 'web') {
    appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') doCheck();
    });
  }
}

export function stopBackgroundUpdateCheck() {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}
