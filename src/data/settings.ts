import { getItem, setItem, KEYS } from './storage';

export interface AppSettings {
  preferredCountry?: string;
  preferredLanguage?: string;
  lastDataRefresh?: number;
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
