export type ChannelSource =
  | 'iptv'
  | 'youtube'
  | 'twitch'
  | 'custom_m3u'
  | 'pluto'
  | 'tubi';

export interface UnifiedChannel {
  id: string;
  source: ChannelSource;
  name: string;
  logo?: string;
  categories: string[];
  country?: string;
  language?: string;
  streamUrl: string;
  quality?: string;
  isLive: boolean;
  isMainstream: boolean;
  channelNumber: number;
  meta?: {
    youtubeChannelId?: string;
    twitchUsername?: string;
    userAgent?: string;
    referrer?: string;
  };
}

export interface IPTVRawChannel {
  id: string;
  name: string;
  alt_names: string[];
  network: string | null;
  owners: string[];
  country: string;
  subdivision: string | null;
  city: string | null;
  broadcast_area: string[];
  languages: string[];
  categories: string[];
  is_nsfw: boolean;
  launched: string | null;
  closed: string | null;
  replaced_by: string | null;
  website: string | null;
  logo: string;
}

export interface IPTVRawStream {
  channel: string;
  url: string;
  http_referrer: string | null;
  user_agent: string | null;
  quality: string | null;
}

export interface IPTVCategory {
  id: string;
  name: string;
}

export interface IPTVCountry {
  code: string;
  name: string;
  languages: string[];
  flag: string;
}

export interface IPTVLanguage {
  code: string;
  name: string;
}

export interface ChannelIndex {
  all: UnifiedChannel[];
  byCategory: Map<string, UnifiedChannel[]>;
  byCountry: Map<string, UnifiedChannel[]>;
  byId: Map<string, UnifiedChannel>;
}
