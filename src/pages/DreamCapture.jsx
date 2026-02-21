/**
 * 꿈 기록 페이지
 */
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Moon, Mic, MicOff, Sparkles, X, ChevronDown, ChevronUp,
  Save, Loader2
} from 'lucide-react';
import {
  PageContainer, PageHeader, Card, Button, Textarea,
  EmptyState, useToast
} from '../components/common';
import BottomNav from '../components/common/BottomNav';
import useDreams from '../hooks/useDreams';
import useVoiceInput from '../hooks/useVoiceInput';
import { formatFriendlyDate } from '../lib/utils/date';
import { getIntensityLabel } from '../lib/ai/analyzeDream';
import analytics from '../lib/adapters/analytics';

export default function DreamCapture() {
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const {
    dreams, todayDreams, isLoading, isAnalyzing,
    error: dreamError, clearError: clearDreamError,
    createDream, getDreamById
  } = useDreams();

  // 에러 발생 시 토스트 표시
  useEffect(() => {
    if (dreamError) {
      toast.error(dreamError);
      clearDreamError();
    }
  }, [dreamError, toast, clearDreamError]);

  const [content, setContent] = useState('');
  const hasTrackedCreateStartRef = useRef(false);

  // URL에서 꿈 ID 확인 (lazy init)
  const initialDreamId = searchParams.get('id');
  const initialDream = initialDreamId ? getDreamById(initialDreamId) : null;
  const [selectedDreamId, setSelectedDreamId] = useState(initialDream ? initialDreamId : null);
  const [showAnalysis, setShowAnalysis] = useState(!!initialDream);

  // 음성 입력
  const {
    isSupported: voiceSupported,
    isListening,
    fullTranscript: _fullTranscript,
    toggleListening,
    clearTranscript,
    error: voiceError
  } = useVoiceInput({
    onResult: (text) => {
      setContent(prev => prev + text);
    }
  });

  const selectedDream = selectedDreamId ? getDreamById(selectedDreamId) : null;

  const trackCreateStart = (inputMethod = 'text') => {
    if (hasTrackedCreateStartRef.current) return;
    analytics.track(analytics.events.DREAM_CREATE_START, {
      input_method: inputMethod,
    });
    hasTrackedCreateStartRef.current = true;
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast.warning('꿈 내용을 입력해주세요');
      return;
    }

    if (content.trim().length < 10) {
      toast.warning('조금 더 자세히 적어주세요');
      return;
    }

    const dream = await createDream(content.trim());
    if (dream) {
      toast.success('꿈이 기록되었습니다', 'AI가 분석 중이에요');
      setContent('');
      clearTranscript();
      hasTrackedCreateStartRef.current = false;
      setSelectedDreamId(dream.id);
      setShowAnalysis(true);
    }
  };

  const handleViewDream = (dream) => {
    setSelectedDreamId(dream.id);
    setShowAnalysis(true);
  };

  return (
    <>
      <PageContainer className="pb-24">
        <PageHeader
          title="꿈 기록"
          subtitle={todayDreams.length > 0 ? `오늘 ${todayDreams.length}개 기록됨` : '오늘의 꿈을 기록해보세요'}
        />

        {/* Dream Input Section */}
        <section className="mb-6">
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-3">
              <Moon className="w-5 h-5 text-violet-400" />
              <span className="font-medium text-[var(--text-primary)]">
                어젯밤 어떤 꿈을 꾸셨나요?
              </span>
            </div>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => trackCreateStart('text')}
              placeholder="꿈에서 본 것, 느낀 감정, 등장인물 등을 자유롭게 적어주세요..."
              rows={6}
              className="mb-4"
            />

            <div className="flex items-center justify-between">
              {/* Voice Input */}
              {voiceSupported && (
                <Button
                  variant={isListening ? 'danger' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    trackCreateStart('voice');
                    toggleListening();
                  }}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      녹음 중지
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      음성으로 기록
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={handleSave}
                loading={isLoading}
                disabled={!content.trim() || isAnalyzing}
              >
                <Save className="w-4 h-4" />
                저장하기
              </Button>
            </div>

            {voiceError && (
              <p className="mt-2 text-sm text-red-400">{voiceError}</p>
            )}

            {isListening && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm">음성을 듣고 있어요...</span>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Analysis View */}
        {showAnalysis && selectedDream && (
          <section className="mb-6">
            <DreamAnalysisView
              dream={selectedDream}
              isAnalyzing={isAnalyzing && selectedDream.id === selectedDreamId}
              onClose={() => {
                setShowAnalysis(false);
                setSelectedDreamId(null);
              }}
            />
          </section>
        )}

        {/* Recent Dreams */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
            최근 기록
          </h2>

          {dreams.length === 0 ? (
            <EmptyState
              icon={Moon}
              title="아직 기록된 꿈이 없어요"
              description="첫 번째 꿈을 기록해보세요"
            />
          ) : (
            <div className="space-y-3">
              {dreams.slice(0, 10).map((dream) => (
                <DreamListItem
                  key={dream.id}
                  dream={dream}
                  isSelected={dream.id === selectedDreamId}
                  onClick={() => handleViewDream(dream)}
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

/**
 * 꿈 분석 결과 뷰
 */
function DreamAnalysisView({ dream, isAnalyzing, onClose }) {
  const { analysis } = dream;

  return (
    <Card variant="gradient" padding="lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <span className="font-semibold text-[var(--text-primary)]">
            AI 분석 결과
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="분석 결과 닫기"
          className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {isAnalyzing ? (
        <div className="flex items-center justify-center py-8 gap-3">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          <span className="text-[var(--text-secondary)]">분석 중...</span>
        </div>
      ) : analysis ? (
        <div className="space-y-4">
          {/* Summary */}
          <div>
            <p className="text-[var(--text-secondary)]">{analysis.summary}</p>
          </div>

          {/* Intensity */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-muted)]">감정 강도:</span>
            <span className="text-sm font-medium text-violet-400">
              {getIntensityLabel(analysis.intensity)} ({analysis.intensity}/10)
            </span>
          </div>

          {/* Symbols */}
          {analysis.symbols?.length > 0 && (
            <div>
              <p className="text-sm text-[var(--text-muted)] mb-2">발견된 심볼</p>
              <div className="flex flex-wrap gap-2">
                {analysis.symbols.map((symbol, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full bg-violet-500/10 text-violet-300 text-sm"
                  >
                    {symbol.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Emotions */}
          {analysis.emotions?.length > 0 && (
            <div>
              <p className="text-sm text-[var(--text-muted)] mb-2">감정</p>
              <div className="flex flex-wrap gap-2">
                {analysis.emotions.map((emotion, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full text-sm"
                    style={{
                      backgroundColor: `${emotion.color}20`,
                      color: emotion.color
                    }}
                  >
                    {emotion.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Themes */}
          {analysis.themes?.length > 0 && (
            <div>
              <p className="text-sm text-[var(--text-muted)] mb-2">테마</p>
              <div className="flex flex-wrap gap-2">
                {analysis.themes.map((theme, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-300 text-sm"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reflection Questions */}
          {analysis.questions?.length > 0 && (
            <div className="pt-4 border-t border-[var(--border-color)]">
              <p className="text-sm text-[var(--text-muted)] mb-2">자기성찰 질문</p>
              <ul className="space-y-2">
                {analysis.questions.map((q, i) => (
                  <li
                    key={i}
                    className="text-sm text-[var(--text-secondary)] flex items-start gap-2"
                  >
                    <span className="text-violet-400">•</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[var(--text-muted)] text-center py-4">
          분석 결과가 없습니다
        </p>
      )}
    </Card>
  );
}

/**
 * 꿈 목록 아이템
 */
function DreamListItem({ dream, isSelected, onClick }) {
  return (
    <Card
      padding="md"
      hover
      onClick={onClick}
      className={isSelected ? 'border-violet-500' : ''}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
          <Moon className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--text-primary)] line-clamp-2">
            {dream.content}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-[var(--text-muted)]">
              {formatFriendlyDate(dream.createdAt.split('T')[0])}
            </span>
            {dream.analysis && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                분석 완료
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
