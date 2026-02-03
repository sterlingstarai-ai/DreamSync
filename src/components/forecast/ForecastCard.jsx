/**
 * 오늘의 예보 카드 컴포넌트
 */
import { Sun, Cloud, CloudRain, Zap, AlertTriangle } from 'lucide-react';
import ConfidenceMeter from './ConfidenceMeter';

// 예보 타입별 아이콘 & 색상
const forecastStyles = {
  sunny: {
    icon: Sun,
    gradient: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-500/10',
    label: '맑음',
  },
  cloudy: {
    icon: Cloud,
    gradient: 'from-gray-400 to-gray-500',
    bgColor: 'bg-gray-500/10',
    label: '흐림',
  },
  rainy: {
    icon: CloudRain,
    gradient: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-500/10',
    label: '비',
  },
  stormy: {
    icon: Zap,
    gradient: 'from-purple-500 to-red-500',
    bgColor: 'bg-purple-500/10',
    label: '폭풍',
  },
  caution: {
    icon: AlertTriangle,
    gradient: 'from-orange-400 to-red-500',
    bgColor: 'bg-orange-500/10',
    label: '주의',
  },
};

export default function ForecastCard({ forecast, compact = false }) {
  if (!forecast) {
    return (
      <div className="p-6 bg-bg-secondary border border-border-default rounded-xl">
        <p className="text-center text-text-muted">
          아직 예보가 없어요. 꿈을 기록하고 체크인을 해보세요!
        </p>
      </div>
    );
  }

  const { type, summary, details, confidence, actions } = forecast;
  const style = forecastStyles[type] || forecastStyles.cloudy;
  const Icon = style.icon;

  if (compact) {
    return (
      <div className={`p-4 rounded-xl ${style.bgColor} border border-border-default`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full bg-gradient-to-br ${style.gradient}`}>
            <Icon size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-text-secondary">오늘의 컨디션 예보</p>
            <p className="font-medium text-text-primary">{summary}</p>
          </div>
          <ConfidenceMeter value={confidence} size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden">
      {/* 헤더 */}
      <div className={`p-6 bg-gradient-to-br ${style.gradient}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon size={32} className="text-white" />
            <div>
              <p className="text-white/80 text-sm">오늘의 예보</p>
              <p className="text-white text-xl font-bold">{style.label}</p>
            </div>
          </div>
          <ConfidenceMeter value={confidence} size="lg" light />
        </div>
      </div>

      {/* 요약 */}
      <div className="p-4">
        <p className="text-text-primary font-medium mb-2">{summary}</p>
        {details && (
          <p className="text-sm text-text-secondary">{details}</p>
        )}
      </div>

      {/* 행동 가이드 */}
      {actions && actions.length > 0 && (
        <div className="px-4 pb-4">
          <h4 className="text-xs text-text-muted mb-2">추천 행동</h4>
          <div className="space-y-2">
            {actions.map((action, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-bg-tertiary rounded-lg"
              >
                <span className="text-lg">{action.emoji || '💡'}</span>
                <span className="text-sm text-text-primary">{action.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
