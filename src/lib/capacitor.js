import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import logger from './utils/logger';

// Platform detection
export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isWeb = Capacitor.getPlatform() === 'web';

// Initialize Capacitor plugins
export async function initCapacitor() {
  if (!isNative) return () => {};

  const listenerHandles = [];

  try {
    // Hide splash screen
    await SplashScreen.hide();

    // Configure status bar
    if (isIOS) {
      await StatusBar.setStyle({ style: Style.Light });
    }

    // Handle back button on Android
    if (isAndroid) {
      const backButtonHandle = await App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        } else {
          window.history.back();
        }
      });
      listenerHandles.push(backButtonHandle);
    }

    // Keyboard events
    const keyboardShowHandle = await Keyboard.addListener('keyboardWillShow', (info) => {
      document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
    });
    listenerHandles.push(keyboardShowHandle);

    const keyboardHideHandle = await Keyboard.addListener('keyboardWillHide', () => {
      document.body.style.setProperty('--keyboard-height', '0px');
    });
    listenerHandles.push(keyboardHideHandle);

  } catch (error) {
    logger.error('Capacitor init error:', error);
  }

  return async () => {
    for (const handle of listenerHandles) {
      try {
        await handle.remove();
      } catch {
        // 무시: 이미 해제된 핸들러일 수 있음
      }
    }
    document.body.style.setProperty('--keyboard-height', '0px');
  };
}
