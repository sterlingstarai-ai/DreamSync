import { describe, expect, it } from 'vitest';
import { deserializeEntityRecord, serializeEntityRecord } from './supabase';

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
});
