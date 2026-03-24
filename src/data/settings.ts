import { getItem, setItem, KEYS } from './storage';

export interface AppSettings {
  preferredCountry?: string;
  preferredLanguage?: string;
  uiLanguage?: string;
  lastDataRefresh?: number;
  showFavoritesOnly?: boolean;
  showMainstreamOnly?: boolean;
  sidebarVisible?: boolean;
  viewMode?: string;
}

export async function getSettings(): Promise<AppSettings> {
  return (await getItem<AppSettings>(KEYS.SETTINGS)) ?? {};
}

export async function updateSettings(
  partial: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await setItem(KEYS.SETTINGS, updated);
  return updated;
}
