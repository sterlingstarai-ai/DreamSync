/**
 * useDreamStore 날짜 중복 방지(dedup) 테스트 — Q3
 *
 * 정책: (user_id, dream_date) 자연키 upsert
 *   - 같은 날짜에 이미 꿈이 있으면 새 레코드를 생성하지 않고 기존을 업데이트한다.
 *   - 기존 id가 canonical PK로 유지된다 (DB LWW 트리거 동작 미러링).
 *   - 소프트삭제(deletedAt) 레코드는 중복 대상에서 제외한다.
 *
 * 주의: addDream에 명시적 date 파라미터를 사용하여 시스템 시간 목킹 없이 테스트한다.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import useDreamStore from './useDreamStore';

const DATE_A = '2026-06-27';
const DATE_B = '2026-06-28';

describe('useDreamStore — date dedup guard (Q3)', () => {
  beforeEach(() => {
    useDreamStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('같은 날짜에 두 번 addDream하면 레코드 수가 1개로 유지됨 (upsert)', async () => {
    await useDreamStore.getState().addDream({
      content: '첫 번째 꿈',
      userId: 'u1',
      date: DATE_A,
      autoAnalyze: false,
    });

    await useDreamStore.getState().addDream({
      content: '수정된 꿈',
      userId: 'u1',
      date: DATE_A,
      autoAnalyze: false,
    });

    expect(useDreamStore.getState().dreams).toHaveLength(1);
  });

  it('upsert 시 기존 id가 보존됨 (canonical PK 불변)', async () => {
    const first = await useDreamStore.getState().addDream({
      content: '원래 꿈',
      userId: 'u1',
      date: DATE_A,
      autoAnalyze: false,
    });

    const second = await useDreamStore.getState().addDream({
      content: '수정 꿈',
      userId: 'u1',
      date: DATE_A,
      autoAnalyze: false,
    });

    expect(second.id).toBe(first.id);
    expect(useDreamStore.getState().dreams[0].id).toBe(first.id);
  });

  it('upsert 시 content가 새 내용으로 교체됨', async () => {
    await useDreamStore.getState().addDream({
      content: '원래 꿈',
      userId: 'u1',
      date: DATE_A,
      autoAnalyze: false,
    });

    await useDreamStore.getState().addDream({
      content: '수정된 꿈 내용',
      userId: 'u1',
      date: DATE_A,
      autoAnalyze: false,
    });

    expect(useDreamStore.getState().dreams[0].content).toBe('수정된 꿈 내용');
  });

  it('날짜가 다른 꿈은 별도 레코드로 생성됨', async () => {
    await useDreamStore.getState().addDream({
      content: `${DATE_A} 꿈`,
      userId: 'u1',
      date: DATE_A,
      autoAnalyze: false,
    });

    await useDreamStore.getState().addDream({
      content: `${DATE_B} 꿈`,
      userId: 'u1',
      date: DATE_B,
      autoAnalyze: false,
    });

    expect(useDreamStore.getState().dreams).toHaveLength(2);
  });

  it('다른 userId는 같은 날짜여도 별도 레코드로 생성됨', async () => {
    await useDreamStore.getState().addDream({
      content: 'A의 꿈',
      userId: 'u1',
      date: DATE_A,
      autoAnalyze: false,
    });
    await useDreamStore.getState().addDream({
      content: 'B의 꿈',
      userId: 'u2',
      date: DATE_A,
      autoAnalyze: false,
    });

    expect(useDreamStore.getState().dreams).toHaveLength(2);
  });

  it('deletedAt이 있는 tombstone은 중복 대상에서 제외 — 새 레코드 생성', async () => {
    // 원격 sync로 들어온 tombstone 시뮬레이션
    const tombstoneId = 'dream-tombstone';
    useDreamStore.setState((state) => ({
      dreams: [
        ...state.dreams,
        {
          id: tombstoneId,
          userId: 'u1',
          content: '삭제된 꿈',
          date: DATE_A,
          analysis: null,
          voiceUrl: null,
          createdAt: new Date('2026-06-27T09:00:00Z').toISOString(),
          updatedAt: new Date('2026-06-27T09:00:00Z').toISOString(),
          deletedAt: new Date('2026-06-27T09:30:00Z').toISOString(),
          sourceDeviceId: 'device-remote',
        },
      ],
    }));

    const newDream = await useDreamStore.getState().addDream({
      content: '새 꿈 (tombstone 무시)',
      userId: 'u1',
      date: DATE_A,
      autoAnalyze: false,
    });

    const liveDreams = useDreamStore.getState().dreams.filter((d) => !d.deletedAt);
    expect(liveDreams).toHaveLength(1);
    expect(newDream.id).not.toBe(tombstoneId);
    expect(liveDreams[0].content).toBe('새 꿈 (tombstone 무시)');
  });

  it('addDream이 isLoading을 false로 복원함 (upsert 경로 포함)', async () => {
    await useDreamStore.getState().addDream({
      content: '첫 꿈',
      userId: 'u1',
      date: DATE_A,
      autoAnalyze: false,
    });

    await useDreamStore.getState().addDream({
      content: '두 번째 (upsert)',
      userId: 'u1',
      date: DATE_A,
      autoAnalyze: false,
    });

    expect(useDreamStore.getState().isLoading).toBe(false);
  });

  it('date 파라미터 미지정 시 오늘 날짜로 생성됨', async () => {
    const dream = await useDreamStore.getState().addDream({
      content: '날짜 미지정 꿈',
      userId: 'u1',
      autoAnalyze: false,
    });

    expect(dream.date).toBeDefined();
    expect(dream.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
