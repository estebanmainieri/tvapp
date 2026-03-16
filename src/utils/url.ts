export type StreamUrlType = 'hls' | 'youtube' | 'twitch' | 'm3u' | 'direct' | 'unknown';

export function detectUrlType(url: string): StreamUrlType {
  const lower = url.toLowerCase();

  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return 'youtube';
  }
  if (lower.includes('twitch.tv')) {
    return 'twitch';
  }
  if (lower.endsWith('.m3u') || lower.endsWith('.m3u8')) {
    return lower.endsWith('.m3u8') ? 'hls' : 'm3u';
  }
  if (lower.includes('.m3u8')) {
    return 'hls';
  }
  if (
    lower.endsWith('.mp4') ||
    lower.endsWith('.mkv') ||
    lower.endsWith('.ts')
  ) {
    return 'direct';
  }

  return 'unknown';
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function extractYouTubeChannelId(url: string): string | null {
  const match = url.match(/youtube\.com\/(?:channel\/|@)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function extractTwitchChannel(url: string): string | null {
  const match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  return match ? match[1] : null;
}
