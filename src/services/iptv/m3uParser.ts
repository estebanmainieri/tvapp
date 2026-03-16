import { UnifiedChannel } from '../../types';

/**
 * Parse M3U/M3U8 playlist content into UnifiedChannel array.
 * Handles standard EXTINF format used by iptv-org and similar sources.
 */
export function parseM3U(content: string, sourceLabel: string): UnifiedChannel[] {
  const lines = content.split('\n').map(l => l.trim());
  const channels: UnifiedChannel[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('#EXTINF:')) continue;

    // Find the next non-empty, non-comment line (the URL)
    let url = '';
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j];
      if (next && !next.startsWith('#')) {
        url = next;
        break;
      }
    }

    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      continue;
    }

    const name = extractName(line);
    const logo = extractAttribute(line, 'tvg-logo');
    const group = extractAttribute(line, 'group-title');
    const tvgId = extractAttribute(line, 'tvg-id');

    channels.push({
      id: tvgId || `${sourceLabel}_${i}`,
      source: 'custom_m3u',
      name: name || `Channel ${i}`,
      logo: logo || undefined,
      categories: group ? [group] : [],
      streamUrl: url,
      isLive: true,
      isMainstream: false,
      channelNumber: channels.length + 1,
    });
  }

  return channels;
}

function extractAttribute(line: string, attr: string): string | null {
  const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
  const match = line.match(regex);
  return match ? match[1] : null;
}

function extractName(line: string): string | null {
  // Name is after the last comma in the EXTINF line
  const commaIndex = line.lastIndexOf(',');
  if (commaIndex >= 0) {
    return line.slice(commaIndex + 1).trim() || null;
  }
  return null;
}
