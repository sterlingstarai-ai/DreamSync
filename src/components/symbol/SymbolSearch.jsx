/**
 * 심볼 검색 컴포넌트
 */
import { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';

const categories = [
  { id: 'all', label: '전체', emoji: '🔮' },
  { id: 'water', label: '물', emoji: '💧' },
  { id: 'fire', label: '불', emoji: '🔥' },
  { id: 'sky', label: '하늘', emoji: '🌌' },
  { id: 'animal', label: '동물', emoji: '🐾' },
  { id: 'person', label: '사람', emoji: '👤' },
  { id: 'building', label: '건물', emoji: '🏢' },
  { id: 'nature', label: '자연', emoji: '🌿' },
  { id: 'vehicle', label: '탈것', emoji: '🚗' },
  { id: 'food', label: '음식', emoji: '🍎' },
  { id: 'object', label: '물건', emoji: '📦' },
  { id: 'abstract', label: '추상', emoji: '✨' },
];

export default function SymbolSearch({ onSearch, onCategoryChange }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    onSearch?.(value, selectedCategory);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    onCategoryChange?.(categoryId);
    onSearch?.(query, categoryId);
  };

  const clearSearch = () => {
    setQuery('');
    onSearch?.('', selectedCategory);
  };

  return (
    <div className="space-y-3">
      {/* 검색 입력 */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="심볼 검색..."
          className="w-full pl-10 pr-20 py-3 bg-bg-secondary border border-border-default rounded-xl
                     text-text-primary placeholder-text-muted
                     focus:outline-none focus:border-accent-primary"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              onClick={clearSearch}
              className="p-1.5 text-text-muted hover:text-text-primary"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg transition-colors
                        ${showFilters ? 'bg-accent-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* 카테고리 필터 */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 bg-bg-secondary rounded-xl">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors
                          ${selectedCategory === category.id
                            ? 'bg-accent-primary text-white'
                            : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80'
                          }`}
            >
              <span>{category.emoji}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 선택된 필터 표시 */}
      {selectedCategory !== 'all' && !showFilters && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">필터:</span>
          <button
            onClick={() => handleCategoryChange('all')}
            className="flex items-center gap-1 px-2 py-1 bg-accent-primary/20 text-accent-primary rounded-full text-xs"
          >
            {categories.find(c => c.id === selectedCategory)?.emoji}
            {categories.find(c => c.id === selectedCategory)?.label}
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
