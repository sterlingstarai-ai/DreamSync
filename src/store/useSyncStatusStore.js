import { create } from 'zustand';
import {
  getSyncStatusSnapshot,
  subscribe as subscribeToSyncQueue,
} from '../lib/offline/syncQueue';

const useSyncStatusStore = create(() => ({
  ...getSyncStatusSnapshot(),
}));

let bound = false;

function bindSyncQueue() {
  if (bound) return;
  bound = true;

  subscribeToSyncQueue((snapshot) => {
    useSyncStatusStore.setState(snapshot);
  });
}

bindSyncQueue();

export default useSyncStatusStore;
