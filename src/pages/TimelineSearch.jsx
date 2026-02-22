/**
 * 통합 검색 타임라인 페이지
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Calendar, Sparkles } from 'lucide-react';
import {
  PageContainer, PageHeader, Card, Input, EmptyState,
} from '../components/common';
import BottomNav from '../components/common/BottomNav';
import useDreams from '../hooks/useDreams';
import useCheckIn from '../hooks/useCheckIn';
import useSymbols from '../hooks/useSymbols';
import { EMOTIONS } from '../constants/emotions';
import { searchTimeline } from '../lib/services/timelineSearchService';
import { formatFriendlyDate } from '../lib/utils/date';

const RANGE_OPTIONS = [
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
  { value: '90d', label: '최근 90일' },
  { value: 'all', label: '전체 기간' },
];

export default function TimelineSearch() {
  const navigate = useNavigate();
  const { dreams } = useDreams();
  const { logs } = useCheckIn();
  const { symbols } = useSymbols();

  const [query, setQuery] = useState('');
  const [range, setRange] = useState('30d');
  const [emotionId, setEmotionId] = useState('all');
  const [symbolName, setSymbolName] = useState('all');

  const results = useMemo(() => {
    return searchTimeline({
      dreams,
      logs,
      filters: {
        query,
        range,
        emotionId,
        symbolName,
      },
    });
  }, [dreams, logs, query, range, emotionId, symbolName]);

  return (
    <>
      <PageContainer className="pb-24">
        <PageHeader
          title="통합 검색"
          subtitle="꿈·감정·심볼 타임라인"
          leftAction={(
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          )}
        />

        <section className="space-y-3 mb-6">
          <Input
            placeholder="키워드 검색 (꿈 내용, 이벤트, 심볼...)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            leftIcon={Search}
          />

          <Card padding="md">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FilterSelect
                label="기간"
                value={range}
                onChange={setRange}
                options={RANGE_OPTIONS}
              />
              <FilterSelect
                label="감정"
                value={emotionId}
                onChange={setEmotionId}
                options={[
                  { value: 'all', label: '전체 감정' },
                  ...EMOTIONS.map(emotion => ({
                    value: emotion.id,
                    label: `${emotion.emoji} ${emotion.name}`,
                  })),
                ]}
              />
              <FilterSelect
                label="심볼"
                value={symbolName}
                onChange={setSymbolName}
                options={[
                  { value: 'all', label: '전체 심볼' },
                  ...symbols.map(symbol => ({
                    value: symbol.name,
                    label: `${symbol.name} (${symbol.count})`,
                  })),
                ]}
              />
            </div>
          </Card>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">타임라인</h2>
            <span className="text-sm text-[var(--text-muted)]">{results.length}건</span>
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon={Search}
              title="검색 결과가 없어요"
              description="필터를 완화하거나 다른 키워드로 시도해보세요."
            />
          ) : (
            <div className="space-y-3">
              {results.map(result => (
                <TimelineItem
                  key={result.id}
                  item={result}
                  onOpen={() => {
                    if (result.type === 'dream') {
                      navigate(`/dream?id=${result.sourceId}`);
                      return;
                    }
                    navigate('/checkin');
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </PageContainer>

      <BottomNav />
    </>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-xs text-[var(--text-muted)] mb-1.5">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TimelineItem({ item, onOpen }) {
  const isDream = item.type === 'dream';

  return (
    <Card padding="md" hover onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isDream
                ? 'bg-violet-500/20 text-violet-300'
                : 'bg-blue-500/20 text-blue-300'
            }`}
            >
              {isDream ? '꿈' : '체크인'}
            </span>
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatFriendlyDate(item.date)}
            </span>
          </div>

          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{item.content}</p>

          <div className="flex flex-wrap gap-1.5">
            {(item.symbols || []).slice(0, 3).map(symbol => (
              <span
                key={`${item.id}:${symbol}`}
                className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300"
              >
                #{symbol}
              </span>
            ))}
            {(item.emotions || []).slice(0, 2).map(emotion => (
              <span
                key={`${item.id}:${emotion}`}
                className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
              >
                {emotion}
              </span>
            ))}
          </div>
        </div>

        <Sparkles className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 mt-1" />
      </div>
    </Card>
  );
}
