export const colors = {
  // Backgrounds
  background: '#0D0D0D',
  surface: '#1A1A2E',
  surfaceLight: '#252540',
  surfaceHighlight: '#2A2A4A',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0C0',
  textMuted: '#6B6B80',

  // Focus & Accent
  focusBorder: '#FFD700', // Gold - high visibility for elderly
  accent: '#E50914', // Red accent (Netflix-like)
  accentLight: '#FF3D3D',

  // Status
  live: '#FF0000',
  error: '#FF4444',
  success: '#44FF44',
  buffering: '#FFD700',

  // Overlay
  overlayDark: 'rgba(0, 0, 0, 0.85)',
  overlayMedium: 'rgba(0, 0, 0, 0.6)',

  // Categories
  categoryColors: {
    sports: '#2ECC71',
    news: '#3498DB',
    movies: '#E74C3C',
    music: '#9B59B6',
    kids: '#F39C12',
    entertainment: '#1ABC9C',
    documentary: '#34495E',
    general: '#7F8C8D',
  } as Record<string, string>,
} as const;
