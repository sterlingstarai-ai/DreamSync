/**
 * 심볼 카드 컴포넌트
 */
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// 카테고리별 색상
const categoryColors = {
  water: 'bg-blue-500/20 text-blue-400',
  fire: 'bg-red-500/20 text-red-400',
  sky: 'bg-indigo-500/20 text-indigo-400',
  animal: 'bg-amber-500/20 text-amber-400',
  person: 'bg-pink-500/20 text-pink-400',
  building: 'bg-gray-500/20 text-gray-400',
  nature: 'bg-green-500/20 text-green-400',
  vehicle: 'bg-cyan-500/20 text-cyan-400',
  food: 'bg-orange-500/20 text-orange-400',
  object: 'bg-purple-500/20 text-purple-400',
  abstract: 'bg-violet-500/20 text-violet-400',
};

// 카테고리별 이모지
const categoryEmojis = {
  water: '💧',
  fire: '🔥',
  sky: '🌌',
  animal: '🐾',
  person: '👤',
  building: '🏢',
  nature: '🌿',
  vehicle: '🚗',
  food: '🍎',
  object: '📦',
  abstract: '✨',
};

export default function SymbolCard({ symbol, onClick }) {
  const { name, category, meaning, frequency, trend, lastSeen } = symbol;

  const colorClass = categoryColors[category] || categoryColors.abstract;
  const emoji = categoryEmojis[category] || '💭';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-accent-success' : trend === 'down' ? 'text-accent-danger' : 'text-text-muted';

  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-bg-secondary border border-border-default rounded-xl
                 text-left transition-all hover:border-accent-primary/50 active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        {/* 이모지 */}
        <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${colorClass}`}>
          <span className="text-2xl">{emoji}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* 이름 */}
          <h4 className="font-medium text-text-primary">{name}</h4>

          {/* 의미 */}
          {meaning && (
            <p className="text-sm text-text-secondary line-clamp-1">{meaning}</p>
          )}

          {/* 빈도 & 트렌드 */}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-text-muted">
              {frequency}회 등장
            </span>
            {trend && (
              <div className="flex items-center gap-1">
                <TrendIcon size={12} className={trendColor} />
                <span className={`text-xs ${trendColor}`}>
                  {trend === 'up' ? '증가' : trend === 'down' ? '감소' : '유지'}
                </span>
              </div>
            )}
          </div>
        </div>

        <ChevronRight size={20} className="text-text-muted flex-shrink-0" />
      </div>
    </button>
  );
}
