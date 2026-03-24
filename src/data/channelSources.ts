import { getItem, setItem } from './storage';

export interface ChannelSourceConfig {
  id: string;
  name: string;
  type: 'iptv-org' | 'm3u' | 'free-tv';
  url: string;
  enabled: boolean;
  isBuiltIn: boolean;
}

const FREE_TV_BASE = 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists';

/** Build the Free-TV playlist URL for a given country name */
export function getFreeTVUrl(countryCode: string): string {
  const name = FREE_TV_COUNTRY_NAMES[countryCode];
  if (!name) return '';
  return `${FREE_TV_BASE}/playlist_${name}.m3u8`;
}

// Map ISO country codes to Free-TV playlist file names
const FREE_TV_COUNTRY_NAMES: Record<string, string> = {
  AR: 'argentina', US: 'usa', BR: 'brazil', MX: 'mexico', ES: 'spain',
  CO: 'colombia', CL: 'chile', PE: 'peru', UY: 'uruguay', VE: 'venezuela',
  EC: 'ecuador', PY: 'paraguay', BO: 'bolivia', CR: 'costa_rica', PA: 'panama',
  GB: 'uk', FR: 'france', DE: 'germany', IT: 'italy', PT: 'portugal',
  NL: 'netherlands', BE: 'belgium', AT: 'austria', CH: 'switzerland',
  SE: 'sweden', NO: 'norway', DK: 'denmark', FI: 'finland',
  PL: 'poland', CZ: 'czech_republic', RO: 'romania', GR: 'greece',
  TR: 'turkey', RU: 'russia', UA: 'ukraine', IN: 'india',
  JP: 'japan', KR: 'south_korea', CN: 'china', AU: 'australia',
  CA: 'canada', IE: 'ireland', ZA: 'south_africa',
  DO: 'dominican_republic', GT: 'guatemala', HN: 'honduras', SV: 'el_salvador',
  NI: 'nicaragua', CU: 'cuba', PR: 'puerto_rico',
};

// Pre-configured sources
export const BUILT_IN_SOURCES: ChannelSourceConfig[] = [
  {
    id: 'iptv-org',
    name: 'IPTV.org',
    type: 'iptv-org',
    url: 'https://iptv-org.github.io/api',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'free-tv',
    name: 'Free-TV',
    type: 'free-tv',
    url: FREE_TV_BASE,
    enabled: false,
    isBuiltIn: true,
  },
];

const SOURCES_KEY = '@tvapp/channel_sources';

export async function getSavedSources(): Promise<ChannelSourceConfig[]> {
  const saved = await getItem<ChannelSourceConfig[]>(SOURCES_KEY);
  if (!saved) return BUILT_IN_SOURCES;

  const savedMap = new Map(saved.map(s => [s.id, s]));
  const merged: ChannelSourceConfig[] = [];

  for (const builtIn of BUILT_IN_SOURCES) {
    const savedVersion = savedMap.get(builtIn.id);
    merged.push({
      ...builtIn,
      enabled: savedVersion ? savedVersion.enabled : builtIn.enabled,
    });
  }

  for (const s of saved) {
    if (!s.isBuiltIn) {
      merged.push(s);
    }
  }

  return merged;
}

export async function saveSources(sources: ChannelSourceConfig[]): Promise<void> {
  await setItem(SOURCES_KEY, sources);
}

export async function toggleSource(sourceId: string): Promise<ChannelSourceConfig[]> {
  const sources = await getSavedSources();
  const updated = sources.map(s =>
    s.id === sourceId ? { ...s, enabled: !s.enabled } : s
  );
  await saveSources(updated);
  return updated;
}

export async function addCustomSource(name: string, url: string): Promise<ChannelSourceConfig[]> {
  const sources = await getSavedSources();
  const id = `custom_${Date.now()}`;
  sources.push({
    id,
    name,
    type: 'm3u',
    url,
    enabled: true,
    isBuiltIn: false,
  });
  await saveSources(sources);
  return sources;
}

export async function removeCustomSource(sourceId: string): Promise<ChannelSourceConfig[]> {
  const sources = await getSavedSources();
  const updated = sources.filter(s => s.id !== sourceId || s.isBuiltIn);
  await saveSources(updated);
  return updated;
}
