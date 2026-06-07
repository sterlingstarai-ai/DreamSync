import { Capacitor } from '@capacitor/core';

export function getPlatformLabel() {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform();
  }
  return 'web';
}

export function isNativePlatform() {
  return getPlatformLabel() !== 'web';
}
