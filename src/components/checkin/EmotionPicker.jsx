/**
 * 감정 선택 컴포넌트
 */
import { useState } from 'react';
import { EMOTIONS } from '../../constants/emotions';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export default function EmotionPicker({ value = [], onChange, maxSelect = 3 }) {
  const [selected, setSelected] = useState(value);

  const handleToggle = async (emotionId) => {
    let newSelected;

    if (selected.includes(emotionId)) {
      newSelected = selected.filter(id => id !== emotionId);
    } else if (selected.length < maxSelect) {
      newSelected = [...selected, emotionId];
    } else {
      // 최대 선택 개수 도달 - 가장 오래된 것 제거
      newSelected = [...selected.slice(1), emotionId];
    }

    setSelected(newSelected);
    onChange?.(newSelected);

    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // 웹에서는 무시
    }
  };

  return (
    <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm text-text-secondary">지금 느끼는 감정</label>
        <span className="text-xs text-text-muted">{selected.length}/{maxSelect}</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {EMOTIONS.map((emotion) => {
          const isSelected = selected.includes(emotion.id);
          return (
            <button
              key={emotion.id}
              onClick={() => handleToggle(emotion.id)}
              className={`flex flex-col items-center p-3 rounded-xl transition-all
                          ${isSelected
                            ? 'bg-accent-primary/20 border-2 border-accent-primary scale-105'
                            : 'bg-bg-tertiary border-2 border-transparent hover:bg-bg-tertiary/80'
                          }`}
            >
              <span className="text-2xl mb-1">{emotion.emoji}</span>
              <span className={`text-xs ${isSelected ? 'text-accent-primary' : 'text-text-secondary'}`}>
                {emotion.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
