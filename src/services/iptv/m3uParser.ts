import { UnifiedChannel } from '../../types';

// URLs that are web pages, not direct streams — player can't handle them
const NON_STREAM_PATTERNS = [
  /youtube\.com\/(watch|channel|c\/|@)/i,
  /youtu\.be\//i,
  /twitch\.tv\//i,
  /dailymotion\.com\//i,
  /facebook\.com\//i,
];

function isPlayableUrl(url: string, keepYouTube: boolean): boolean {
  if (keepYouTube && (url.match(/youtube\.com\/(watch|channel|c\/|@)/i) || url.match(/youtu\.be\//i))) {
    return true;
  }
  return !NON_STREAM_PATTERNS.some(p => p.test(url));
}

export interface ParseM3UOptions {
  /** Keep YouTube URLs instead of filtering them (for later resolution) */
  keepYouTube?: boolean;
}

/**
 * Parse M3U/M3U8 playlist content into UnifiedChannel array.
 * Handles standard EXTINF format used by iptv-org and similar sources.
 */
export function parseM3U(content: string, sourceLabel: string, options?: ParseM3UOptions): UnifiedChannel[] {
  const keepYouTube = options?.keepYouTube ?? false;
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

    // Skip non-direct-stream URLs (YouTube pages, Twitch pages, etc.)
    if (!isPlayableUrl(url, keepYouTube)) {
      continue;
    }

    const name = extractName(line);
    const logo = extractAttribute(line, 'tvg-logo');
    const group = extractAttribute(line, 'group-title');
    const tvgId = extractAttribute(line, 'tvg-id');
    const country = extractAttribute(line, 'tvg-country');
    const language = extractAttribute(line, 'tvg-language');

    // Always prefix ID with source label to avoid collisions between sources
    const id = `${sourceLabel}_${tvgId || i}`;

    channels.push({
      id,
      source: 'custom_m3u',
      name: cleanChannelName(name) || `Channel ${i}`,
      logo: logo || undefined,
      categories: group ? [group] : [],
      country: country || undefined,
      language: language || undefined,
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

/** Remove Free-TV markers like Ⓨ Ⓖ from channel names */
function cleanChannelName(name: string | null): string | null {
  if (!name) return null;
  return name.replace(/[\u24B6-\u24E9\u2460-\u2473\u24EA-\u24FF\u2776-\u277F\u24C8\u24CE\u24D6]/g, '').replace(/[ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ]/g, '').trim();
}
