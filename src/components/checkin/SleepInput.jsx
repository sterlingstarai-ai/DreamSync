/**
 * 수면 정보 입력 컴포넌트
 */
import { useState } from 'react';
import { Moon, Sun, Clock } from 'lucide-react';

export default function SleepInput({ value, onChange }) {
  const [bedTime, setBedTime] = useState(value?.bedTime || '23:00');
  const [wakeTime, setWakeTime] = useState(value?.wakeTime || '07:00');
  const [quality, setQuality] = useState(value?.quality || 3);

  const handleChange = (field, newValue) => {
    const updated = {
      bedTime: field === 'bedTime' ? newValue : bedTime,
      wakeTime: field === 'wakeTime' ? newValue : wakeTime,
      quality: field === 'quality' ? newValue : quality,
    };

    if (field === 'bedTime') setBedTime(newValue);
    if (field === 'wakeTime') setWakeTime(newValue);
    if (field === 'quality') setQuality(newValue);

    // 수면 시간 계산
    const [bedH, bedM] = updated.bedTime.split(':').map(Number);
    const [wakeH, wakeM] = updated.wakeTime.split(':').map(Number);

    let bedMinutes = bedH * 60 + bedM;
    let wakeMinutes = wakeH * 60 + wakeM;

    // 자정 넘어가는 경우 처리
    if (wakeMinutes < bedMinutes) {
      wakeMinutes += 24 * 60;
    }

    updated.duration = wakeMinutes - bedMinutes;
    onChange?.(updated);
  };

  // 수면 시간 계산
  const calculateDuration = () => {
    const [bedH, bedM] = bedTime.split(':').map(Number);
    const [wakeH, wakeM] = wakeTime.split(':').map(Number);

    let bedMinutes = bedH * 60 + bedM;
    let wakeMinutes = wakeH * 60 + wakeM;

    if (wakeMinutes < bedMinutes) {
      wakeMinutes += 24 * 60;
    }

    const duration = wakeMinutes - bedMinutes;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;

    return `${hours}시간 ${minutes > 0 ? `${minutes}분` : ''}`;
  };

  const qualityLabels = ['', '매우 나쁨', '나쁨', '보통', '좋음', '매우 좋음'];

  return (
    <div className="p-4 bg-bg-secondary border border-border-default rounded-xl space-y-4">
      <label className="block text-sm text-text-secondary">수면 정보</label>

      {/* 취침/기상 시간 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Moon size={14} className="text-accent-primary" />
            <span className="text-xs text-text-muted">취침 시간</span>
          </div>
          <input
            type="time"
            value={bedTime}
            onChange={(e) => handleChange('bedTime', e.target.value)}
            className="w-full p-3 bg-bg-tertiary border border-border-default rounded-lg
                       text-text-primary text-center
                       focus:outline-none focus:border-accent-primary"
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sun size={14} className="text-accent-warning" />
            <span className="text-xs text-text-muted">기상 시간</span>
          </div>
          <input
            type="time"
            value={wakeTime}
            onChange={(e) => handleChange('wakeTime', e.target.value)}
            className="w-full p-3 bg-bg-tertiary border border-border-default rounded-lg
                       text-text-primary text-center
                       focus:outline-none focus:border-accent-primary"
          />
        </div>
      </div>

      {/* 수면 시간 표시 */}
      <div className="flex items-center justify-center gap-2 py-2 bg-bg-tertiary rounded-lg">
        <Clock size={16} className="text-text-muted" />
        <span className="text-text-primary font-medium">{calculateDuration()}</span>
      </div>

      {/* 수면 품질 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-muted">수면 품질</span>
          <span className="text-xs text-accent-primary">{qualityLabels[quality]}</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              onClick={() => handleChange('quality', num)}
              className={`flex-1 py-3 rounded-lg text-xl transition-all
                          ${num <= quality
                            ? 'bg-accent-primary'
                            : 'bg-bg-tertiary'
                          }`}
            >
              {num <= quality ? '⭐' : '☆'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
