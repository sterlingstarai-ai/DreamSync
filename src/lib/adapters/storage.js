/**
 * Storage Adapter Interface
 * 로컬 스토리지 추상화 - localStorage 대신 Capacitor Preferences 사용
 *
 * 어댑터 패턴으로 구현체 분리:
 * - LocalStorageAdapter: 개발/웹 환경
 * - PreferencesAdapter: 네이티브 환경 (Capacitor Preferences)
 * - SupabaseAdapter: 서버 연동 시 (Phase 2+)
 */
import { Preferences } from '@capacitor/preferences';
import logger from '../utils/logger';
import { Capacitor } from '@capacitor/core';

/**
 * Storage Adapter 인터페이스
 * @typedef {Object} StorageAdapter
 * @property {function(string, any): Promise<void>} set
 * @property {function(string): Promise<any>} get
 * @property {function(string): Promise<void>} remove
 * @property {function(): Promise<void>} clear
 */

/**
 * Capacitor Preferences Adapter (네이티브 환경)
 * iOS: UserDefaults (암호화됨)
 * Android: SharedPreferences (암호화 가능)
 */
const PreferencesAdapter = {
  async set(key, value) {
    await Preferences.set({
      key: `dreamsync_${key}`,
      value: JSON.stringify(value),
    });
  },

  async get(key) {
    const { value } = await Preferences.get({ key: `dreamsync_${key}` });
    if (value === null) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },

  async remove(key) {
    await Preferences.remove({ key: `dreamsync_${key}` });
  },

  async clear() {
    await Preferences.clear();
  },

  async keys() {
    const { keys } = await Preferences.keys();
    return keys.filter(k => k.startsWith('dreamsync_'))
      .map(k => k.replace('dreamsync_', ''));
  },
};

/**
 * LocalStorage Adapter (웹 환경 / 개발용)
 */
const LocalStorageAdapter = {
  async set(key, value) {
    try {
      localStorage.setItem(`dreamsync_${key}`, JSON.stringify(value));
    } catch (e) {
      logger.error('LocalStorage set error:', e);
    }
  },

  async get(key) {
    try {
      const value = localStorage.getItem(`dreamsync_${key}`);
      if (value === null) return null;
      return JSON.parse(value);
    } catch {
      return null;
    }
  },

  async remove(key) {
    localStorage.removeItem(`dreamsync_${key}`);
  },

  async clear() {
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith('dreamsync_'));
    keys.forEach(k => localStorage.removeItem(k));
  },

  async keys() {
    return Object.keys(localStorage)
      .filter(k => k.startsWith('dreamsync_'))
      .map(k => k.replace('dreamsync_', ''));
  },
};

/**
 * 현재 환경에 맞는 Storage Adapter 선택
 */
function getStorageAdapter() {
  if (Capacitor.isNativePlatform()) {
    return PreferencesAdapter;
  }
  return LocalStorageAdapter;
}

/**
 * Storage 서비스 (싱글톤)
 */
const storage = getStorageAdapter();

export default storage;

/**
 * Zustand persist용 custom storage
 */
export const zustandStorage = {
  getItem: async (name) => {
    const value = await storage.get(name);
    return value ? JSON.stringify(value) : null;
  },
  setItem: async (name, value) => {
    try {
      const parsed = JSON.parse(value);
      await storage.set(name, parsed);
    } catch {
      await storage.set(name, value);
    }
  },
  removeItem: async (name) => {
    await storage.remove(name);
  },
};
