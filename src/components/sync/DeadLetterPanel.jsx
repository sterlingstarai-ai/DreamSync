/**
 * DeadLetterPanel — 동기화 실패 항목 복구 UI (Q4)
 *
 * syncQueue의 dead_letter 큐에 쌓인 항목을 목록으로 보여주고
 * 개별/전체 재시도 및 삭제 액션을 제공한다.
 *
 * 접근성:
 *   - 목록: role="list" + aria-label
 *   - 각 버튼: aria-label (동작 + 항목 유형 명시)
 *   - empty state: role="status"
 *   - 모달 포커스 트랩 + ESC는 Modal 컴포넌트가 처리
 */
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Trash2, AlertTriangle, RotateCcw, X } from 'lucide-react';
import { Button, Modal } from '../common';
import {
  getDeadLetterItems,
  retryDeadLetterItem,
  removeDeadLetterItem,
  retryAllDeadLetters,
  clearAllDeadLetters,
  subscribe,
} from '../../lib/offline/syncQueue';
import { formatRelative } from '../../lib/utils/date';

/** 엔터티 유형 → 한국어 레이블 */
const ENTITY_LABELS = {
  dreams: '꿈 기록',
  daily_logs: '체크인',
  forecasts: '예보',
  personal_symbols: '심볼',
  coach_plans: '코치 플랜',
};

/**
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
export default function DeadLetterPanel({ isOpen, onClose }) {
  const [items, setItems] = useState(() => getDeadLetterItems());
  const [retryingId, setRetryingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [isRetryingAll, setIsRetryingAll] = useState(false);

  // syncQueue 상태 변경 구독 — dead letter 목록 실시간 반영
  useEffect(() => {
    const unsub = subscribe(() => {
      setItems(getDeadLetterItems());
    });
    return () => { unsub(); };
  }, []);

  const handleRetry = useCallback(async (id) => {
    setRetryingId(id);
    try {
      await retryDeadLetterItem(id);
    } finally {
      setRetryingId(null);
    }
  }, []);

  const handleRemove = useCallback(async (id) => {
    setRemovingId(id);
    try {
      await removeDeadLetterItem(id);
    } finally {
      setRemovingId(null);
    }
  }, []);

  const handleRetryAll = useCallback(async () => {
    setIsRetryingAll(true);
    try {
      await retryAllDeadLetters();
    } finally {
      setIsRetryingAll(false);
    }
  }, []);

  const handleClearAll = useCallback(async () => {
    await clearAllDeadLetters();
  }, []);

  const isEmpty = items.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="동기화 복구"
      description="전송에 실패한 항목을 재시도하거나 삭제할 수 있습니다."
      size="lg"
      footer={
        isEmpty ? null : (
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              haptic={false}
              onClick={handleClearAll}
              className="text-red-400 hover:text-red-300"
              aria-label="전체 삭제"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              전체 삭제
            </Button>
            <div className="flex-1" />
            <Button
              variant="secondary"
              size="sm"
              haptic={false}
              onClick={handleRetryAll}
              loading={isRetryingAll}
              aria-label="전체 재시도"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              전체 재시도
            </Button>
          </div>
        )
      }
    >
      {isEmpty ? (
        <EmptyDeadLetter />
      ) : (
        <ul
          role="list"
          aria-label="동기화 실패 항목 목록"
          className="space-y-3"
        >
          {items.map((item) => (
            <DeadLetterItem
              key={item.id}
              item={item}
              isRetrying={retryingId === item.id}
              isRemoving={removingId === item.id}
              onRetry={() => handleRetry(item.id)}
              onRemove={() => handleRemove(item.id)}
            />
          ))}
        </ul>
      )}
    </Modal>
  );
}

/** 항목이 없을 때 표시되는 empty state */
function EmptyDeadLetter() {
  return (
    <div
      role="status"
      aria-label="동기화 실패 항목 없음"
      className="py-10 flex flex-col items-center gap-3 text-center"
    >
      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-emerald-400" aria-hidden="true" />
      </div>
      <div>
        <p className="font-medium text-[var(--text-primary)]">
          실패한 항목이 없습니다
        </p>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          모든 데이터가 정상적으로 동기화되었습니다.
        </p>
      </div>
    </div>
  );
}

/**
 * 단일 dead-letter 항목 카드
 * @param {{ item: object, isRetrying: boolean, isRemoving: boolean, onRetry: () => void, onRemove: () => void }} props
 */
function DeadLetterItem({ item, isRetrying, isRemoving, onRetry, onRemove }) {
  const entityLabel = ENTITY_LABELS[item.entity] || item.entity;
  const opLabel = item.op === 'delete' ? '삭제' : '저장';
  const relativeTime = item.deadLetteredAt
    ? (() => {
        try {
          return formatRelative(item.deadLetteredAt);
        } catch {
          return '알 수 없음';
        }
      })()
    : '알 수 없음';

  const isBusy = isRetrying || isRemoving;

  return (
    <li className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
      <div className="flex items-start gap-3">
        {/* 아이콘 */}
        <div
          className="mt-0.5 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {entityLabel} {opLabel} 실패
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
            {item.lastError || '알 수 없는 오류'}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {relativeTime} · 재시도 {item.retries ?? 0}회
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            aria-label={`${entityLabel} 재시도`}
            onClick={onRetry}
            disabled={isBusy}
            className="p-1.5 rounded-lg text-violet-400 hover:bg-violet-500/10 disabled:opacity-40 transition-colors"
          >
            {isRetrying ? (
              <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            aria-label={`${entityLabel} 삭제`}
            onClick={onRemove}
            disabled={isBusy}
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}
