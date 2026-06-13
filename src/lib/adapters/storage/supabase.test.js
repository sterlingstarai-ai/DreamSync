import { describe, expect, it } from 'vitest';
import {
  deserializeEntityRecord,
  getEntityUpsertOptions,
  serializeEntityRecord,
} from './supabase';

describe('SupabaseStorageAdapter mapping', () => {
  it('serializes dream records to snake_case rows', () => {
    const row = serializeEntityRecord('dreams', {
      id: 'dream-1',
      userId: 'user-1',
      date: '2026-03-07',
      content: '호수 꿈',
      voiceUrl: 'https://example.com/voice.m4a',
      analysis: { themes: ['평온'] },
      createdAt: '2026-03-07T08:00:00.000Z',
      updatedAt: '2026-03-07T08:30:00.000Z',
      deletedAt: null,
      sourceDeviceId: 'device-a',
    });

    expect(row).toEqual({
      id: 'dream-1',
      user_id: 'user-1',
      dream_date: '2026-03-07',
      content: '호수 꿈',
      voice_url: 'https://example.com/voice.m4a',
      analysis: { themes: ['평온'] },
      created_at: '2026-03-07T08:00:00.000Z',
      updated_at: '2026-03-07T08:30:00.000Z',
      deleted_at: null,
      source_device_id: 'device-a',
    });
  });

  it('deserializes forecast rows back to app records', () => {
    const record = deserializeEntityRecord('forecasts', {
      id: 'forecast-1',
      user_id: 'user-1',
      forecast_date: '2026-03-07',
      prediction: { condition: 4, confidence: 72, summary: '좋은 흐름', suggestions: ['산책'] },
      actual: { condition: 4 },
      accuracy: 100,
      experiment: {
        plannedSuggestions: ['산책'],
        selectedActions: ['산책'],
        completedSuggestions: ['산책'],
        actionFeedback: { 산책: 'helpful' },
      },
      created_at: '2026-03-07T07:00:00.000Z',
      updated_at: '2026-03-07T21:00:00.000Z',
      deleted_at: null,
      source_device_id: 'device-a',
    });

    expect(record).toEqual({
      id: 'forecast-1',
      userId: 'user-1',
      date: '2026-03-07',
      prediction: { condition: 4, confidence: 72, summary: '좋은 흐름', suggestions: ['산책'] },
      actual: { condition: 4 },
      accuracy: 100,
      experiment: {
        plannedSuggestions: ['산책'],
        selectedActions: ['산책'],
        completedSuggestions: ['산책'],
        actionFeedback: { 산책: 'helpful' },
      },
      createdAt: '2026-03-07T07:00:00.000Z',
      updatedAt: '2026-03-07T21:00:00.000Z',
      deletedAt: null,
      sourceDeviceId: 'device-a',
    });
  });

  it('throws a helpful error when required row fields are missing', () => {
    expect(() => serializeEntityRecord('dreams', {
      id: 'dream-2',
      content: '계약이 깨진 테스트',
    })).toThrow('[Supabase] dreams row contract mismatch');
  });

  it('throws a helpful error when required record fields are missing', () => {
    expect(() => deserializeEntityRecord('daily_logs', {
      id: 'log-1',
      log_date: '2026-03-07',
      created_at: '2026-03-07T07:00:00.000Z',
      updated_at: '2026-03-07T21:00:00.000Z',
      source_device_id: 'device-a',
    })).toThrow('[Supabase] daily_logs record contract mismatch');
  });

  it('uses unique sync keys for idempotent multi-device upserts', () => {
    expect(getEntityUpsertOptions('dreams')).toBeUndefined();
    expect(getEntityUpsertOptions('daily_logs')).toEqual({ onConflict: 'user_id,log_date' });
    expect(getEntityUpsertOptions('forecasts')).toEqual({ onConflict: 'user_id,forecast_date' });
    expect(getEntityUpsertOptions('personal_symbols')).toEqual({ onConflict: 'user_id,name' });
    expect(getEntityUpsertOptions('coach_plans')).toEqual({ onConflict: 'user_id,plan_date' });
  });
});
