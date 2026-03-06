import { enqueue } from './syncQueue';
import {
  createDeletedSyncMetadata,
  createSyncMetadata,
} from '../sync/metadata';

export function queueUpsert(entity, payload) {
  if (!payload?.id) return;

  const nextPayload = {
    ...payload,
    ...createSyncMetadata(payload),
  };

  void enqueue({
    entity,
    op: 'upsert',
    recordId: nextPayload.id,
    payload: nextPayload,
    clientUpdatedAt: nextPayload.updatedAt,
    sourceDeviceId: nextPayload.sourceDeviceId,
  });
}

export function queueDelete(entity, payload) {
  if (!payload?.id) return;

  const nextPayload = {
    ...payload,
    ...createDeletedSyncMetadata(payload),
  };

  void enqueue({
    entity,
    op: 'delete',
    recordId: nextPayload.id,
    payload: nextPayload,
    clientUpdatedAt: nextPayload.updatedAt,
    sourceDeviceId: nextPayload.sourceDeviceId,
  });
}
