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
  if (!isNative) return;

  try {
    // Hide splash screen
    await SplashScreen.hide();

    // Configure status bar
    if (isIOS) {
      await StatusBar.setStyle({ style: Style.Light });
    }

    // Handle back button on Android
    if (isAndroid) {
      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        } else {
          window.history.back();
        }
      });
    }

    // Keyboard events
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
    });

    Keyboard.addListener('keyboardWillHide', () => {
      document.body.style.setProperty('--keyboard-height', '0px');
    });

  } catch (error) {
    logger.error('Capacitor init error:', error);
  }
}
