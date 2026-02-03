/**
 * Feature Flag 토글 컴포넌트
 */
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export default function FeatureToggle({
  label,
  description,
  enabled,
  onChange,
  disabled = false,
  badge,
}) {
  const handleToggle = async () => {
    if (disabled) return;

    onChange?.(!enabled);

    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // 웹에서는 무시
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={disabled}
      className={`w-full flex items-center justify-between p-4 bg-bg-secondary border border-border-default rounded-xl
                  transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-accent-primary/50'}`}
    >
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary">{label}</span>
          {badge && (
            <span className="px-2 py-0.5 bg-accent-primary/20 text-accent-primary text-xs rounded-full">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        )}
      </div>

      {/* 토글 스위치 */}
      <div
        className={`relative w-12 h-7 rounded-full transition-colors ${
          enabled ? 'bg-accent-primary' : 'bg-bg-tertiary'
        }`}
      >
        <div
          className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
    </button>
  );
}
