import { Platform } from 'react-native';

export const isTV = Platform.isTV;
export const isAppleTV = Platform.OS === 'ios' && Platform.isTV;
export const isAndroidTV = Platform.OS === 'android' && Platform.isTV;
export const isWeb = Platform.OS === 'web';
export const isPhone = !Platform.isTV && Platform.OS !== 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
