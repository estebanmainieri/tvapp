import { Platform, NativeModules, AppState } from 'react-native';
import { APP_VERSION } from '../version';

const GITHUB_OWNER = 'estebanmainieri';
const GITHUB_REPO = 'tvapp';
const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
const LATEST_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  hasUpdate: boolean;
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
    const res = await fetch(LATEST_URL, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const release = await res.json();
    const latestVersion = (release.tag_name || '').replace(/^v/, '');
    const currentVersion = APP_VERSION;

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    let downloadUrl = '';
    if (hasUpdate && release.assets) {
      const apkAsset = release.assets.find(
        (a: any) => a.name.endsWith('.apk'),
      );
      if (apkAsset) {
        downloadUrl = apkAsset.browser_download_url;
      }
    }

    return { version: latestVersion, downloadUrl, hasUpdate };
  } catch (err) {
    console.warn('Update check failed:', err);
    return { version: APP_VERSION, downloadUrl: '', hasUpdate: false };
  }
}

export async function applyUpdate(downloadUrl: string): Promise<void> {
  if (Platform.OS === 'web') {
    // Web: just reload the page
    (window as any).location.reload();
    return;
  }

  if (Platform.OS === 'android') {
    const { AppUpdater } = NativeModules;
    if (!AppUpdater) {
      throw new Error('AppUpdater native module not available');
    }
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

  // Then every hour
  checkTimer = setInterval(doCheck, CHECK_INTERVAL);

  // Also check when app comes back from background
  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') doCheck();
  });
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
