/**
 * 컨디션 슬라이더 컴포넌트
 */
import { useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const conditionLabels = {
  1: { emoji: '😫', label: '매우 나쁨' },
  2: { emoji: '😔', label: '나쁨' },
  3: { emoji: '😐', label: '보통' },
  4: { emoji: '😊', label: '좋음' },
  5: { emoji: '🤩', label: '매우 좋음' },
};

export default function ConditionSlider({ value, onChange, label = "오늘의 컨디션" }) {
  const [localValue, setLocalValue] = useState(value || 3);

  const handleChange = async (newValue) => {
    setLocalValue(newValue);
    onChange?.(newValue);

    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // 웹에서는 무시
    }
  };

  const current = conditionLabels[localValue];

  return (
    <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
      <label className="block text-sm text-text-secondary mb-4">{label}</label>

      {/* 이모지 표시 */}
      <div className="text-center mb-4">
        <span className="text-5xl">{current.emoji}</span>
        <p className="text-text-primary mt-2 font-medium">{current.label}</p>
      </div>

      {/* 슬라이더 버튼 */}
      <div className="flex justify-between gap-2">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            onClick={() => handleChange(num)}
            className={`flex-1 py-3 rounded-lg text-2xl transition-all
                        ${localValue === num
                          ? 'bg-accent-primary scale-110'
                          : 'bg-bg-tertiary hover:bg-bg-tertiary/80'
                        }`}
          >
            {conditionLabels[num].emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
