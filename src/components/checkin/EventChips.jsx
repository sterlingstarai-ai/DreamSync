/**
 * 이벤트 선택 칩 컴포넌트
 */
import { useState } from 'react';
import { EVENTS } from '../../constants/events';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export default function EventChips({ value = [], onChange, maxSelect = 5 }) {
  const [selected, setSelected] = useState(value);

  const handleToggle = async (eventId) => {
    let newSelected;

    if (selected.includes(eventId)) {
      newSelected = selected.filter(id => id !== eventId);
    } else if (selected.length < maxSelect) {
      newSelected = [...selected, eventId];
    } else {
      return; // 최대 개수 도달
    }

    setSelected(newSelected);
    onChange?.(newSelected);

    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // 웹에서는 무시
    }
  };

  // 카테고리별 그룹화
  const groupedEvents = EVENTS.reduce((acc, event) => {
    const category = event.category || '기타';
    if (!acc[category]) acc[category] = [];
    acc[category].push(event);
    return acc;
  }, {});

  return (
    <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm text-text-secondary">오늘 있었던 일</label>
        <span className="text-xs text-text-muted">{selected.length}/{maxSelect}</span>
      </div>

      {Object.entries(groupedEvents).map(([category, events]) => (
        <div key={category} className="mb-4 last:mb-0">
          <h4 className="text-xs text-text-muted mb-2">{category}</h4>
          <div className="flex flex-wrap gap-2">
            {events.map((event) => {
              const isSelected = selected.includes(event.id);
              return (
                <button
                  key={event.id}
                  onClick={() => handleToggle(event.id)}
                  disabled={!isSelected && selected.length >= maxSelect}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all
                              ${isSelected
                                ? 'bg-accent-primary text-white'
                                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80'
                              }
                              ${!isSelected && selected.length >= maxSelect
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                              }`}
                >
                  {event.emoji} {event.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
