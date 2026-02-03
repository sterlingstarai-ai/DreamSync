/**
 * 알림 설정 컴포넌트
 */
import { useState } from 'react';
import { Bell, Moon, Sun, Clock } from 'lucide-react';
import FeatureToggle from './FeatureToggle';

export default function NotificationSettings({ settings, onChange }) {
  const [morningReminder, setMorningReminder] = useState(settings?.morningReminder ?? true);
  const [eveningReminder, setEveningReminder] = useState(settings?.eveningReminder ?? true);
  const [morningTime, setMorningTime] = useState(settings?.morningTime || '07:00');
  const [eveningTime, setEveningTime] = useState(settings?.eveningTime || '22:00');

  const handleChange = (key, value) => {
    const newSettings = {
      morningReminder,
      eveningReminder,
      morningTime,
      eveningTime,
      [key]: value,
    };

    if (key === 'morningReminder') setMorningReminder(value);
    if (key === 'eveningReminder') setEveningReminder(value);
    if (key === 'morningTime') setMorningTime(value);
    if (key === 'eveningTime') setEveningTime(value);

    onChange?.(newSettings);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Bell size={18} className="text-text-muted" />
        <h3 className="font-medium text-text-primary">알림 설정</h3>
      </div>

      {/* 아침 알림 */}
      <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sun size={18} className="text-accent-warning" />
            <span className="text-text-primary">아침 꿈 기록 알림</span>
          </div>

          <div
            onClick={() => handleChange('morningReminder', !morningReminder)}
            className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
              morningReminder ? 'bg-accent-primary' : 'bg-bg-tertiary'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                morningReminder ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </div>
        </div>

        {morningReminder && (
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-text-muted" />
            <input
              type="time"
              value={morningTime}
              onChange={(e) => handleChange('morningTime', e.target.value)}
              className="px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg
                         text-text-primary text-sm focus:outline-none focus:border-accent-primary"
            />
          </div>
        )}
      </div>

      {/* 저녁 알림 */}
      <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Moon size={18} className="text-accent-primary" />
            <span className="text-text-primary">저녁 체크인 알림</span>
          </div>

          <div
            onClick={() => handleChange('eveningReminder', !eveningReminder)}
            className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
              eveningReminder ? 'bg-accent-primary' : 'bg-bg-tertiary'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                eveningReminder ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </div>
        </div>

        {eveningReminder && (
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-text-muted" />
            <input
              type="time"
              value={eveningTime}
              onChange={(e) => handleChange('eveningTime', e.target.value)}
              className="px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg
                         text-text-primary text-sm focus:outline-none focus:border-accent-primary"
            />
          </div>
        )}
      </div>
    </div>
  );
}
