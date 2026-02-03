/**
 * 심볼 태그 컴포넌트
 */

// 심볼 이모지 매핑
const symbolEmojis = {
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

export default function SymbolTag({ symbol, size = 'md', showMeaning = false, onClick }) {
  const { name, category, meaning, frequency } = typeof symbol === 'string'
    ? { name: symbol, category: 'abstract' }
    : symbol;

  const emoji = symbolEmojis[category] || '💭';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center gap-1 bg-bg-tertiary border border-border-default
                  rounded-full text-text-primary transition-colors
                  ${onClick ? 'hover:border-accent-primary cursor-pointer' : ''}
                  ${sizeClasses[size]}`}
    >
      <span>{emoji}</span>
      <span>{name}</span>
      {frequency && frequency > 1 && (
        <span className="text-text-muted">×{frequency}</span>
      )}
      {showMeaning && meaning && (
        <span className="text-text-muted ml-1">- {meaning}</span>
      )}
    </Tag>
  );
}
