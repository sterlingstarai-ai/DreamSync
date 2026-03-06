import { generateId } from '../utils/id';

const SOURCE_DEVICE_KEY = 'dreamsync_source_device_id';

let cachedSourceDeviceId = null;

export function getSourceDeviceId() {
  if (cachedSourceDeviceId) {
    return cachedSourceDeviceId;
  }

  if (typeof window === 'undefined') {
    cachedSourceDeviceId = 'dreamsync-server';
    return cachedSourceDeviceId;
  }

  try {
    const stored = window.localStorage.getItem(SOURCE_DEVICE_KEY);
    if (stored) {
      cachedSourceDeviceId = stored;
      return cachedSourceDeviceId;
    }

    cachedSourceDeviceId = `device_${generateId()}`;
    window.localStorage.setItem(SOURCE_DEVICE_KEY, cachedSourceDeviceId);
    return cachedSourceDeviceId;
  } catch {
    cachedSourceDeviceId = `device_${generateId()}`;
    return cachedSourceDeviceId;
  }
}

export function createSyncMetadata(overrides = {}) {
  const now = new Date().toISOString();
  return {
    sourceDeviceId: overrides.sourceDeviceId || getSourceDeviceId(),
    updatedAt: overrides.updatedAt || now,
    deletedAt: overrides.deletedAt || null,
  };
}

export function createDeletedSyncMetadata(overrides = {}) {
  const now = new Date().toISOString();
  return {
    sourceDeviceId: overrides.sourceDeviceId || getSourceDeviceId(),
    updatedAt: overrides.updatedAt || now,
    deletedAt: overrides.deletedAt || now,
  };
}
