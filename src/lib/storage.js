import { Preferences } from '@capacitor/preferences';

// Storage utility for Capacitor
export const storage = {
  async get(key) {
    try {
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  async set(key, value) {
    try {
      await Preferences.set({ key, value: JSON.stringify(value) });
      return true;
    } catch {
      return false;
    }
  },

  async remove(key) {
    try {
      await Preferences.remove({ key });
      return true;
    } catch {
      return false;
    }
  },

  async clear() {
    try {
      await Preferences.clear();
      return true;
    } catch {
      return false;
    }
  },
};
