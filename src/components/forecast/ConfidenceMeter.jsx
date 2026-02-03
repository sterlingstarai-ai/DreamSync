/**
 * 신뢰도 미터 컴포넌트
 */
import { getConfidenceLevel } from '../../lib/scoring';

export default function ConfidenceMeter({ value, size = 'md', light = false, showLabel = true }) {
  const confidence = value || 0;
  const { level } = getConfidenceLevel(confidence);

  // 색상 결정
  const getColor = () => {
    if (confidence >= 80) return 'text-accent-success';
    if (confidence >= 60) return 'text-accent-secondary';
    if (confidence >= 40) return 'text-accent-warning';
    return 'text-accent-danger';
  };

  const getBgColor = () => {
    if (confidence >= 80) return 'bg-accent-success';
    if (confidence >= 60) return 'bg-accent-secondary';
    if (confidence >= 40) return 'bg-accent-warning';
    return 'bg-accent-danger';
  };

  const sizeClasses = {
    sm: {
      container: 'w-10 h-10',
      text: 'text-xs',
      label: 'text-[10px]',
    },
    md: {
      container: 'w-14 h-14',
      text: 'text-sm',
      label: 'text-xs',
    },
    lg: {
      container: 'w-20 h-20',
      text: 'text-lg',
      label: 'text-sm',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div className="flex flex-col items-center">
      {/* 원형 미터 */}
      <div className={`relative ${sizes.container}`}>
        {/* 배경 원 */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={light ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)'}
            strokeWidth="3"
          />
          {/* 진행 원 */}
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${confidence * 0.97} 97`}
            className={light ? 'text-white' : getColor()}
          />
        </svg>

        {/* 중앙 텍스트 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${sizes.text} ${light ? 'text-white' : getColor()}`}>
            {Math.round(confidence)}
          </span>
        </div>
      </div>

      {/* 레이블 */}
      {showLabel && (
        <span className={`mt-1 ${sizes.label} ${light ? 'text-white/80' : 'text-text-muted'}`}>
          신뢰도 {level}
        </span>
      )}
    </div>
  );
}
