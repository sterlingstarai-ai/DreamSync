/**
 * 심볼 상세 컴포넌트
 */
import { X, BookOpen, Calendar, TrendingUp, Edit3, MessageCircle } from 'lucide-react';
import { formatDate } from '../../lib/utils/date';
import { Button } from '../common';

export default function SymbolDetail({ symbol, onClose, onEdit, relatedDreams = [] }) {
  if (!symbol) return null;

  const { name, category, meaning, personalMeaning, frequency, firstSeen, lastSeen, trend, notes } = symbol;

  // 카테고리 라벨
  const categoryLabels = {
    water: '물/액체',
    fire: '불/열',
    sky: '하늘/우주',
    animal: '동물',
    person: '사람',
    building: '건물/장소',
    nature: '자연',
    vehicle: '탈것',
    food: '음식',
    object: '물건',
    abstract: '추상/개념',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-lg bg-bg-primary rounded-t-2xl max-h-[90vh] overflow-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-bg-primary p-4 border-b border-border-default flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">{name}</h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 카테고리 */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-accent-primary/20 text-accent-primary rounded-full text-sm">
              {categoryLabels[category] || category}
            </span>
            {trend && (
              <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs
                              ${trend === 'up' ? 'bg-accent-success/20 text-accent-success' :
                                trend === 'down' ? 'bg-accent-danger/20 text-accent-danger' :
                                'bg-bg-tertiary text-text-muted'}`}>
                <TrendingUp size={12} />
                {trend === 'up' ? '증가' : trend === 'down' ? '감소' : '유지'}
              </span>
            )}
          </div>

          {/* 일반적 의미 */}
          {meaning && (
            <div className="p-4 bg-bg-secondary rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={16} className="text-accent-secondary" />
                <h4 className="text-sm font-medium text-text-primary">일반적 의미</h4>
              </div>
              <p className="text-sm text-text-secondary">{meaning}</p>
            </div>
          )}

          {/* 개인적 의미 */}
          <div className="p-4 bg-bg-secondary rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-accent-primary" />
                <h4 className="text-sm font-medium text-text-primary">나만의 의미</h4>
              </div>
              <button onClick={onEdit} className="text-accent-primary text-sm">
                <Edit3 size={14} />
              </button>
            </div>
            <p className="text-sm text-text-secondary">
              {personalMeaning || '아직 정의하지 않았어요. 탭하여 추가하세요.'}
            </p>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-bg-secondary rounded-xl text-center">
              <p className="text-2xl font-bold text-accent-primary">{frequency}</p>
              <p className="text-xs text-text-muted">등장 횟수</p>
            </div>
            <div className="p-3 bg-bg-secondary rounded-xl text-center">
              <p className="text-sm font-medium text-text-primary">{formatDate(firstSeen)}</p>
              <p className="text-xs text-text-muted">첫 등장</p>
            </div>
            <div className="p-3 bg-bg-secondary rounded-xl text-center">
              <p className="text-sm font-medium text-text-primary">{formatDate(lastSeen)}</p>
              <p className="text-xs text-text-muted">최근 등장</p>
            </div>
          </div>

          {/* 메모 */}
          {notes && (
            <div className="p-4 bg-bg-secondary rounded-xl">
              <h4 className="text-sm font-medium text-text-primary mb-2">메모</h4>
              <p className="text-sm text-text-secondary">{notes}</p>
            </div>
          )}

          {/* 관련 꿈 */}
          {relatedDreams.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-2">
                관련 꿈 ({relatedDreams.length})
              </h4>
              <div className="space-y-2">
                {relatedDreams.slice(0, 3).map((dream, index) => (
                  <div
                    key={index}
                    className="p-3 bg-bg-secondary rounded-xl"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={12} className="text-text-muted" />
                      <span className="text-xs text-text-muted">{formatDate(dream.createdAt)}</span>
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-2">{dream.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="sticky bottom-0 p-4 bg-bg-primary border-t border-border-default">
          <Button onClick={onClose} variant="secondary" fullWidth>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
