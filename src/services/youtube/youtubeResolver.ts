import { UnifiedChannel } from '../../types';

const YT_PATTERNS = [
  /youtube\.com\/(watch|channel|c\/|@|user\/)/i,
  /youtu\.be\//i,
];

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function isYouTubeUrl(url: string): boolean {
  return YT_PATTERNS.some(p => p.test(url));
}

/**
 * Fetch a YouTube page and extract the HLS manifest URL from ytInitialPlayerResponse.
 * Works for live streams — returns null for non-live or failed extractions.
 */
async function extractHLSFromYouTube(youtubeUrl: string): Promise<string | null> {
  try {
    const res = await fetch(youtubeUrl, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Extract hlsManifestUrl from the embedded ytInitialPlayerResponse
    const match = html.match(/"hlsManifestUrl"\s*:\s*"([^"]+)"/);
    if (match) {
      // YouTube escapes & as \u0026 in JSON embedded in HTML
      return match[1].replace(/\\u0026/g, '&');
    }

    return null;
  } catch (err) {
    console.warn(`[YT] Failed to resolve ${youtubeUrl}:`, err);
    return null;
  }
}

/**
 * Resolve YouTube URLs to HLS for a list of channels.
 * Resolves in parallel with a timeout. Channels that fail are dropped.
 */
export async function resolveYouTubeChannels(
  channels: UnifiedChannel[],
  timeoutMs = 15000,
): Promise<UnifiedChannel[]> {
  const ytChannels = channels.filter(ch => isYouTubeUrl(ch.streamUrl));
  const nonYtChannels = channels.filter(ch => !isYouTubeUrl(ch.streamUrl));

  if (ytChannels.length === 0) return channels;

  console.log(`[YT] Resolving ${ytChannels.length} YouTube live streams...`);

  const resolveWithTimeout = (ch: UnifiedChannel): Promise<UnifiedChannel> => {
    return Promise.race([
      extractHLSFromYouTube(ch.streamUrl).then(hlsUrl => {
        if (hlsUrl) {
          console.log(`[YT] Resolved: ${ch.name}`);
          return { ...ch, streamUrl: hlsUrl };
        }
        console.warn(`[YT] No HLS for: ${ch.name} (not live?) — keeping with original URL`);
        return ch;
      }),
      new Promise<UnifiedChannel>(resolve => setTimeout(() => {
        console.warn(`[YT] Timeout: ${ch.name} — keeping with original URL`);
        resolve(ch);
      }, timeoutMs)),
    ]);
  };

  const results = await Promise.all(ytChannels.map(resolveWithTimeout));
  const resolvedCount = results.filter(ch => !isYouTubeUrl(ch.streamUrl)).length;

  console.log(`[YT] Resolved ${resolvedCount}/${ytChannels.length} YouTube channels (${ytChannels.length - resolvedCount} kept as YouTube URLs)`);

  return [...nonYtChannels, ...results];
}
