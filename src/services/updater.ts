import { Platform, NativeModules, AppState, Alert } from 'react-native';
import { APP_VERSION } from '../version';

const GITHUB_OWNER = 'estebanmainieri';
const GITHUB_REPO = 'tvapp';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const LATEST_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  hasUpdate: boolean;
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
    const res = await fetch(LATEST_URL, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const release = await res.json();
    const latestVersion = (release.tag_name || '').replace(/^v/, '');
    const currentVersion = APP_VERSION;

    console.log('[Updater] Latest version:', latestVersion, 'Current:', currentVersion);
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    let downloadUrl = '';
    if (hasUpdate && release.assets) {
      const apkAsset = release.assets.find(
        (a: any) => a.name.endsWith('.apk'),
      );
      if (apkAsset) {
        downloadUrl = apkAsset.browser_download_url;
        console.log('[Updater] APK URL:', downloadUrl);
      }
    }

    return { version: latestVersion, downloadUrl, hasUpdate };
  } catch (err: any) {
    console.warn('[Updater] Check failed:', err?.message || err);
    return { version: APP_VERSION, downloadUrl: '', hasUpdate: false, error: err?.message || 'Check failed' };
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

export async function applyUpdate(downloadUrl: string): Promise<void> {
  if (Platform.OS === 'web') {
    (window as any).location.reload();
    return;
  }

  if (Platform.OS === 'android') {
    const { AppUpdater } = NativeModules;
    if (!AppUpdater) {
      throw new Error('AppUpdater native module not available');
    }

    const hasPermission = await ensureInstallPermission();
    if (!hasPermission) {
      throw new Error('Install permission not granted. Go to Settings > Apps > Tve+ > Install unknown apps');
    }

    console.log('[Updater] Starting download and install...');
    await AppUpdater.downloadAndInstall(downloadUrl);
  }
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
