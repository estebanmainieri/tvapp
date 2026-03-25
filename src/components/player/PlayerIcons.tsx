import React, { memo, useMemo } from 'react';
import { View, Text, Platform } from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
}

// Web: use dangerouslySetInnerHTML for SVG
// Native: use react-native-svg
let Svg: any, Path: any, Polygon: any, Rect: any, Line: any, Circle: any, SvgText: any;
if (Platform.OS !== 'web') {
  try {
    const RNSvg = require('react-native-svg');
    Svg = RNSvg.Svg;
    Path = RNSvg.Path;
    Polygon = RNSvg.Polygon;
    Rect = RNSvg.Rect;
    Line = RNSvg.Line;
    Circle = RNSvg.Circle;
    SvgText = RNSvg.Text;
  } catch {}
}

const WebSvgIcon = memo(function WebSvgIcon({ size = 20, color = '#fff', path, viewBox = '0 0 24 24' }: IconProps & { path: string; viewBox?: string }) {
  const html = useMemo(
    () => ({ __html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}" fill="${color}">${path}</svg>` }),
    [size, color, path, viewBox],
  );
  const style = useMemo(
    () => ({ width: size, height: size, display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const }),
    [size],
  );
  return (<div style={style} dangerouslySetInnerHTML={html} />) as any;
});

export const PlayIcon = memo(function PlayIcon({ size = 20, color = '#fff' }: IconProps) {
  if (Platform.OS === 'web') return <WebSvgIcon size={size} color={color} path='<polygon points="6,3 20,12 6,21"/>' />;
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Polygon points="6,3 20,12 6,21" /></Svg>;
});

export const PauseIcon = memo(function PauseIcon({ size = 20, color = '#fff' }: IconProps) {
  if (Platform.OS === 'web') return <WebSvgIcon size={size} color={color} path='<rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/>' />;
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Rect x="5" y="3" width="4" height="18" /><Rect x="15" y="3" width="4" height="18" /></Svg>;
});

export const VolumeOnIcon = memo(function VolumeOnIcon({ size = 20, color = '#fff' }: IconProps) {
  if (Platform.OS === 'web') return <WebSvgIcon size={size} color={color} path='<polygon points="4,8 4,16 8,16 14,21 14,3 8,8"/><path d="M18.5,12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73,2.5-2.25,2.5-4.02z" /><path d="M16,3.23v2.06c2.89.86,5,3.54,5,6.71s-2.11,5.85-5,6.71v2.06c4.01-.91,7-4.49,7-8.77s-2.99-7.86-7-8.77z" />' />;
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Polygon points="4,8 4,16 8,16 14,21 14,3 8,8" /><Path d="M18.5,12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73,2.5-2.25,2.5-4.02z" /><Path d="M16,3.23v2.06c2.89.86,5,3.54,5,6.71s-2.11,5.85-5,6.71v2.06c4.01-.91,7-4.49,7-8.77s-2.99-7.86-7-8.77z" /></Svg>;
});

export const VolumeMuteIcon = memo(function VolumeMuteIcon({ size = 20, color = '#fff' }: IconProps) {
  if (Platform.OS === 'web') return <WebSvgIcon size={size} color={color} path='<polygon points="4,8 4,16 8,16 14,21 14,3 8,8"/><path d="M24,9.17L22.83,8 20,10.83 17.17,8 16,9.17 18.83,12 16,14.83 17.17,16 20,13.17 22.83,16 24,14.83 21.17,12z"/>' viewBox="0 0 26 24" />;
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return <Svg width={size} height={size} viewBox="0 0 26 24" fill={color}><Polygon points="4,8 4,16 8,16 14,21 14,3 8,8" /><Path d="M24,9.17L22.83,8 20,10.83 17.17,8 16,9.17 18.83,12 16,14.83 17.17,16 20,13.17 22.83,16 24,14.83 21.17,12z" /></Svg>;
});

export const ReloadIcon = memo(function ReloadIcon({ size = 20, color = '#fff' }: IconProps) {
  if (Platform.OS === 'web') return <WebSvgIcon size={size} color={color} path='<path d="M17.65,6.35C16.2,4.9 14.21,4 12,4c-4.42,0-7.99,3.58-7.99,8s3.57,8 7.99,8c3.73,0 6.84-2.55 7.73-6h-2.08c-.82,2.33-3.04,4-5.65,4-3.31,0-6-2.69-6-6s2.69-6 6-6c1.66,0 3.14,.69 4.22,1.78L13,11h7V4l-2.35,2.35z"/>' />;
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d="M17.65,6.35C16.2,4.9 14.21,4 12,4c-4.42,0-7.99,3.58-7.99,8s3.57,8 7.99,8c3.73,0 6.84-2.55 7.73-6h-2.08c-.82,2.33-3.04,4-5.65,4-3.31,0-6-2.69-6-6s2.69-6 6-6c1.66,0 3.14,.69 4.22,1.78L13,11h7V4l-2.35,2.35z" /></Svg>;
});

export const FullscreenIcon = memo(function FullscreenIcon({ size = 20, color = '#fff' }: IconProps) {
  if (Platform.OS === 'web') return <WebSvgIcon size={size} color={color} path='<path d="M7,14H5v5h5v-2H7V14z M5,10h2V7h3V5H5V10z M17,17h-3v2h5v-5h-2V17z M14,5v2h3v3h2V5H14z"/>' />;
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d="M7,14H5v5h5v-2H7V14z M5,10h2V7h3V5H5V10z M17,17h-3v2h5v-5h-2V17z M14,5v2h3v3h2V5H14z" /></Svg>;
});

export const FullscreenExitIcon = memo(function FullscreenExitIcon({ size = 20, color = '#fff' }: IconProps) {
  if (Platform.OS === 'web') return <WebSvgIcon size={size} color={color} path='<path d="M5,16h3v3h2v-5H5V16z M8,8H5v2h5V5H8V8z M14,19h2v-3h3v-2h-5V19z M16,8V5h-2v5h5V8H16z"/>' />;
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d="M5,16h3v3h2v-5H5V16z M8,8H5v2h5V5H8V8z M14,19h2v-3h3v-2h-5V19z M16,8V5h-2v5h5V8H16z" /></Svg>;
});

export const SkipPrevIcon = memo(function SkipPrevIcon({ size = 20, color = '#fff' }: IconProps) {
  if (Platform.OS === 'web') return <WebSvgIcon size={size} color={color} path='<polygon points="6,18 6,6 8,6 8,18"/><polygon points="9.5,12 20,6 20,18"/>' />;
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Polygon points="6,18 6,6 8,6 8,18" /><Polygon points="9.5,12 20,6 20,18" /></Svg>;
});

export const SkipNextIcon = memo(function SkipNextIcon({ size = 20, color = '#fff' }: IconProps) {
  if (Platform.OS === 'web') return <WebSvgIcon size={size} color={color} path='<polygon points="18,18 18,6 16,6 16,18"/><polygon points="14.5,12 4,6 4,18"/>' />;
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Polygon points="18,18 18,6 16,6 16,18" /><Polygon points="14.5,12 4,6 4,18" /></Svg>;
});

export const GearIcon = memo(function GearIcon({ size = 20, color = '#fff' }: IconProps) {
  const gearPath = 'M19.14,12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24,0-.44.17-.47.41l-.36,2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47,0-.59.22L2.74,8.87c-.12.21-.08.47.12.61l2.03,1.58c-.04.31-.07.63-.07.94s.02.63.06.94l-2.03,1.58c-.18.14-.23.41-.12.61l1.92,3.32c.12.22.37.29.59.22l2.39-.96c.5.38,1.03.7,1.62.94l.36,2.54c.05.24.24.41.48.41h3.84c.24,0,.44-.17.47-.41l.36-2.54c.59-.24,1.13-.56,1.62-.94l2.39.96c.22.08.47,0,.59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6 3.6,1.62 3.6,3.6-1.62,3.6-3.6,3.6z';
  if (Platform.OS === 'web') return <WebSvgIcon size={size} color={color} path={`<path d="${gearPath}"/>`} />;
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d={gearPath} /></Svg>;
});

export const GlobeIcon = memo(function GlobeIcon({ size = 20, color = '#fff', label }: IconProps & { label?: string }) {
  if (Platform.OS === 'web') {
    const globePath = '<path d="M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10-4.48 10-10S17.52,2 12,2z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12,2c-3,3.2-3,13.8 0,20" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12,2c3,3.2 3,13.8 0,20" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.3"/><line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" stroke-width="1.3"/>';
    const textEl = label ? `<rect x="5" y="7.5" width="14" height="10" rx="1.5" fill="rgba(0,0,0,0.55)"/><text x="12" y="12.5" text-anchor="middle" dominant-baseline="central" font-size="7.5" font-weight="800" fill="currentColor" font-family="system-ui,sans-serif">${label}</text>` : '';
    return (
      <div
        style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}
        dangerouslySetInnerHTML={{
          __html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">${globePath}${textEl}</svg>`,
        }}
      />
    ) as any;
  }
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10-4.48 10-10S17.52,2 12,2z" fill="none" stroke={color} strokeWidth="1.8" />
      <Path d="M12,2c-3,3.2-3,13.8 0,20" fill="none" stroke={color} strokeWidth="1.5" />
      <Path d="M12,2c3,3.2 3,13.8 0,20" fill="none" stroke={color} strokeWidth="1.5" />
      <Line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth="1.3" />
      <Line x1="3" y1="15" x2="21" y2="15" stroke={color} strokeWidth="1.3" />
      {label && (
        <>
          <Rect x="5" y="7.5" width="14" height="10" rx="1.5" fill="rgba(0,0,0,0.55)" />
          <SvgText x="12" y="13" textAnchor="middle" fontSize="7.5" fontWeight="800" fill={color}>{label}</SvgText>
        </>
      )}
    </Svg>
  );
});

// Layout/mode icon — three horizontal bars
export const LayoutIcon = memo(function LayoutIcon({ size = 20, color = '#fff' }: IconProps) {
  const layoutPath = 'M3,5h18v2H3V5z M3,11h18v2H3V11z M3,17h18v2H3V17z';
  if (Platform.OS === 'web') return <WebSvgIcon size={size} color={color} path={`<path d="${layoutPath}"/>`} />;
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d={layoutPath} /></Svg>;
});

// Guide icon — list with sidebar (channel guide)
export const GuideIcon = memo(function GuideIcon({ size = 20, color = '#fff' }: IconProps) {
  const p = 'M3,3h8v18H3V3z M13,3h8v5H13V3z M13,10h8v5H13V10z M13,17h8v4H13V17z';
  if (Platform.OS === 'web') return <WebSvgIcon size={size} color={color} path={`<path d="${p}"/>`} />;
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d={p} /></Svg>;
});

// TV icon — screen/monitor
export const TVIcon = memo(function TVIcon({ size = 20, color = '#fff' }: IconProps) {
  const p = 'M21,3H3C1.9,3,1,3.9,1,5v12c0,1.1,0.9,2,2,2h7v2H8v2h8v-2h-2v-2h7c1.1,0,2-0.9,2-2V5C23,3.9,22.1,3,21,3z M21,17H3V5h18V17z';
  if (Platform.OS === 'web') return <WebSvgIcon size={size} color={color} path={`<path d="${p}"/>`} />;
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d={p} /></Svg>;
});

// Multi/grid icon — 2x2 grid
export const GridIcon = memo(function GridIcon({ size = 20, color = '#fff' }: IconProps) {
  const p = 'M3,3h8v8H3V3z M13,3h8v8H13V3z M3,13h8v8H3V13z M13,13h8v8H13V13z';
  if (Platform.OS === 'web') return <WebSvgIcon size={size} color={color} path={`<path d="${p}"/>`} />;
  if (!Svg) return <View style={{ width: size, height: size }} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d={p} /></Svg>;
});
