/**
 * 행동 가이드 컴포넌트
 */
import { CheckCircle, Circle } from 'lucide-react';
import { useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export default function ActionGuide({ actions = [], onComplete }) {
  const [completedIds, setCompletedIds] = useState([]);

  const handleToggle = async (actionId) => {
    let newCompleted;
    if (completedIds.includes(actionId)) {
      newCompleted = completedIds.filter(id => id !== actionId);
    } else {
      newCompleted = [...completedIds, actionId];
    }

    setCompletedIds(newCompleted);
    onComplete?.(newCompleted);

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // 웹에서는 무시
    }
  };

  if (!actions.length) {
    return null;
  }

  const completionRate = (completedIds.length / actions.length) * 100;

  return (
    <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-text-primary">오늘의 추천 행동</h3>
        <span className="text-xs text-text-muted">
          {completedIds.length}/{actions.length} 완료
        </span>
      </div>

      {/* 진행률 바 */}
      <div className="h-1.5 bg-bg-tertiary rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent-primary to-accent-success rounded-full transition-all"
          style={{ width: `${completionRate}%` }}
        />
      </div>

      {/* 행동 목록 */}
      <div className="space-y-2">
        {actions.map((action) => {
          const isCompleted = completedIds.includes(action.id);
          return (
            <button
              key={action.id}
              onClick={() => handleToggle(action.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all
                          ${isCompleted
                            ? 'bg-accent-success/10 border border-accent-success/30'
                            : 'bg-bg-tertiary hover:bg-bg-tertiary/80'
                          }`}
            >
              {isCompleted ? (
                <CheckCircle size={20} className="text-accent-success flex-shrink-0" />
              ) : (
                <Circle size={20} className="text-text-muted flex-shrink-0" />
              )}

              <div className="flex-1 text-left">
                <p className={`text-sm ${isCompleted ? 'text-accent-success line-through' : 'text-text-primary'}`}>
                  {action.text}
                </p>
                {action.tip && !isCompleted && (
                  <p className="text-xs text-text-muted mt-0.5">{action.tip}</p>
                )}
              </div>

              {action.emoji && (
                <span className="text-lg">{action.emoji}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 완료 메시지 */}
      {completionRate === 100 && (
        <div className="mt-4 p-3 bg-accent-success/10 rounded-lg text-center">
          <span className="text-2xl">🎉</span>
          <p className="text-sm text-accent-success mt-1">모든 행동을 완료했어요!</p>
        </div>
      )}
    </div>
  );
}
