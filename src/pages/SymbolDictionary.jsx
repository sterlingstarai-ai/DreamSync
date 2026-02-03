/**
 * 심볼 사전 페이지
 */
import { useState } from 'react';
import { Search, Book, X, Edit2, Check, Moon } from 'lucide-react';
import {
  PageContainer, PageHeader, Card, Input, Button, Modal, EmptyState, useToast
} from '../components/common';
import BottomNav from '../components/common/BottomNav';
import useSymbols from '../hooks/useSymbols';
import { formatFriendlyDate } from '../lib/utils/date';

export default function SymbolDictionary() {
  const toast = useToast();
  const {
    displaySymbols,
    topSymbols,
    searchQuery,
    totalCount,
    stats,
    search,
    clearSearch,
    editSymbolMeaning,
    removeSymbol,
  } = useSymbols();

  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMeaning, setEditedMeaning] = useState('');

  const handleSelectSymbol = (symbol) => {
    setSelectedSymbol(symbol);
    setEditedMeaning(symbol.meaning);
    setIsEditing(false);
  };

  const handleSaveMeaning = () => {
    if (!editedMeaning.trim()) {
      toast.warning('의미를 입력해주세요');
      return;
    }
    editSymbolMeaning(selectedSymbol.id, editedMeaning.trim());
    toast.success('저장되었습니다');
    setIsEditing(false);
    setSelectedSymbol({ ...selectedSymbol, meaning: editedMeaning.trim() });
  };

  const handleDeleteSymbol = () => {
    removeSymbol(selectedSymbol.id);
    setSelectedSymbol(null);
    toast.success('삭제되었습니다');
  };

  return (
    <>
      <PageContainer className="pb-24">
        <PageHeader
          title="심볼 사전"
          subtitle={`${totalCount}개의 심볼`}
        />

        {/* 검색 */}
        <div className="relative mb-6">
          <Input
            placeholder="심볼 검색..."
            value={searchQuery}
            onChange={(e) => search(e.target.value)}
            leftIcon={Search}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--bg-tertiary)]"
            >
              <X className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          )}
        </div>

        {totalCount === 0 ? (
          <EmptyState
            icon={Book}
            title="아직 심볼이 없어요"
            description="꿈을 기록하면 AI가 자동으로 심볼을 추출해요"
          />
        ) : (
          <div className="space-y-6">
            {/* 자주 등장하는 심볼 */}
            {!searchQuery && topSymbols.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-[var(--text-muted)] mb-3">
                  자주 등장하는 심볼
                </h2>
                <div className="flex flex-wrap gap-2">
                  {topSymbols.slice(0, 6).map((symbol) => (
                    <button
                      key={symbol.id}
                      onClick={() => handleSelectSymbol(symbol)}
                      className="px-4 py-2 rounded-xl bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors"
                    >
                      {symbol.name}
                      <span className="text-xs ml-1.5 text-violet-400/60">
                        {symbol.count}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 심볼 목록 */}
            <section>
              {searchQuery && (
                <p className="text-sm text-[var(--text-muted)] mb-3">
                  "{searchQuery}" 검색 결과 ({displaySymbols.length}개)
                </p>
              )}

              {displaySymbols.length === 0 && searchQuery ? (
                <EmptyState
                  icon={Search}
                  title="검색 결과가 없어요"
                  description="다른 키워드로 검색해보세요"
                />
              ) : (
                <div className="space-y-2">
                  {displaySymbols.map((symbol) => (
                    <SymbolListItem
                      key={symbol.id}
                      symbol={symbol}
                      onClick={() => handleSelectSymbol(symbol)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* 심볼 상세 모달 */}
        <Modal
          isOpen={!!selectedSymbol}
          onClose={() => setSelectedSymbol(null)}
          title={selectedSymbol?.name}
          size="md"
        >
          {selectedSymbol && (
            <div className="space-y-4">
              {/* 통계 */}
              <div className="flex gap-4 py-3 border-b border-[var(--border-color)]">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {selectedSymbol.count}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">등장 횟수</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[var(--text-primary)]">
                    {formatFriendlyDate(selectedSymbol.firstSeen)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">첫 등장</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[var(--text-primary)]">
                    {formatFriendlyDate(selectedSymbol.lastSeen)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">최근 등장</p>
                </div>
              </div>

              {/* 의미 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[var(--text-muted)]">
                    개인화된 의미
                  </p>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-1 rounded hover:bg-[var(--bg-tertiary)]"
                  >
                    <Edit2 className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedMeaning}
                      onChange={(e) => setEditedMeaning(e.target.value)}
                      className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] resize-none"
                      rows={3}
                      placeholder="이 심볼이 당신에게 어떤 의미인지 적어보세요..."
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsEditing(false);
                          setEditedMeaning(selectedSymbol.meaning);
                        }}
                      >
                        취소
                      </Button>
                      <Button size="sm" onClick={handleSaveMeaning}>
                        <Check className="w-4 h-4" />
                        저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[var(--text-secondary)]">
                    {selectedSymbol.meaning}
                  </p>
                )}
              </div>

              {/* 관련 꿈 수 */}
              <div className="pt-3 border-t border-[var(--border-color)]">
                <p className="text-sm text-[var(--text-muted)]">
                  관련 꿈 {selectedSymbol.dreamIds?.length || 0}개
                </p>
              </div>

              {/* 삭제 버튼 */}
              <Button
                variant="danger"
                fullWidth
                onClick={handleDeleteSymbol}
              >
                심볼 삭제
              </Button>
            </div>
          )}
        </Modal>
      </PageContainer>

      <BottomNav />
    </>
  );
}

/**
 * 심볼 목록 아이템
 */
function SymbolListItem({ symbol, onClick }) {
  return (
    <Card padding="md" hover onClick={onClick}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
          <Moon className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--text-primary)]">
              {symbol.name}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
              {symbol.count}회
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] truncate">
            {symbol.meaning}
          </p>
        </div>
      </div>
    </Card>
  );
}
