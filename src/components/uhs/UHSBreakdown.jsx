/**
 * UHS 상세 분석 컴포넌트
 *
 * ⚠️ 중요: 의료/진단/치료 표현 절대 금지
 */
import { X, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { UHS_DISCLAIMER } from '../../lib/scoring';
import { Button } from '../common';

const componentConfig = {
  sleep: {
    label: '수면',
    emoji: '😴',
    weight: '35%',
    description: '수면 시간과 품질을 기반으로 계산됩니다.',
    tips: [
      '7-8시간의 수면을 목표로 해보세요',
      '일정한 취침/기상 시간을 유지하세요',
      '잠들기 전 스마트폰 사용을 줄여보세요',
    ],
  },
  stress: {
    label: '스트레스',
    emoji: '😤',
    weight: '25%',
    description: '업무와 대인관계 스트레스를 반영합니다.',
    tips: [
      '짧은 휴식을 자주 가져보세요',
      '깊은 호흡이나 명상을 시도해보세요',
      '신뢰할 수 있는 사람과 대화해보세요',
    ],
  },
  dream: {
    label: '꿈 패턴',
    emoji: '💭',
    weight: '15%',
    description: '꿈의 강도와 심볼 다양성을 분석합니다.',
    tips: [
      '꿈을 꾸준히 기록해보세요',
      '반복되는 심볼에 주목해보세요',
      '꿈 일기 작성 습관을 들여보세요',
    ],
  },
  mood: {
    label: '기분 안정성',
    emoji: '🎭',
    weight: '15%',
    description: '일주일간 기분 변동폭을 측정합니다.',
    tips: [
      '매일 간단한 기분 체크를 해보세요',
      '기분에 영향을 주는 요인을 파악해보세요',
      '규칙적인 생활 리듬이 도움됩니다',
    ],
  },
  prediction: {
    label: '예측 정확도',
    emoji: '🎯',
    weight: '10%',
    description: '예보와 실제 상태의 일치도입니다.',
    tips: [
      '체크인을 꾸준히 해주세요',
      '데이터가 쌓일수록 정확해집니다',
      '예보를 참고하되 과신하지 마세요',
    ],
  },
};

export default function UHSBreakdown({ breakdown, trends, onClose }) {
  if (!breakdown) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-lg bg-bg-primary rounded-t-2xl max-h-[90vh] overflow-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-bg-primary p-4 border-b border-border-default flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">웰니스 지수 상세</h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 각 구성요소 */}
          {Object.entries(componentConfig).map(([key, config]) => {
            const value = breakdown[key] || 0;
            const trend = trends?.[key];

            const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
            const trendColor = trend === 'up' ? 'text-accent-success' :
                              trend === 'down' ? 'text-accent-danger' : 'text-text-muted';

            return (
              <div
                key={key}
                className="p-4 bg-bg-secondary border border-border-default rounded-xl"
              >
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{config.emoji}</span>
                    <div>
                      <h4 className="font-medium text-text-primary">{config.label}</h4>
                      <span className="text-xs text-text-muted">가중치 {config.weight}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {trend && (
                      <TrendIcon size={16} className={trendColor} />
                    )}
                    <span className="text-2xl font-bold text-text-primary">
                      {Math.round(value)}
                    </span>
                  </div>
                </div>

                {/* 프로그레스 바 */}
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${
                      value >= 80 ? 'bg-accent-success' :
                      value >= 60 ? 'bg-accent-secondary' :
                      value >= 40 ? 'bg-accent-warning' : 'bg-accent-danger'
                    }`}
                    style={{ width: `${value}%` }}
                  />
                </div>

                {/* 설명 */}
                <p className="text-sm text-text-secondary mb-3">{config.description}</p>

                {/* 팁 */}
                {value < 70 && (
                  <div className="space-y-1">
                    <p className="text-xs text-text-muted">💡 개선 팁</p>
                    <ul className="text-xs text-text-secondary space-y-1">
                      {config.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-accent-primary">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}

          {/* 면책 조항 */}
          <div className="flex items-start gap-2 p-3 bg-bg-tertiary rounded-lg">
            <Info size={14} className="text-text-muted flex-shrink-0 mt-0.5" />
            <p className="text-xs text-text-muted">{UHS_DISCLAIMER}</p>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="sticky bottom-0 p-4 bg-bg-primary border-t border-border-default">
          <Button onClick={onClose} variant="secondary" fullWidth>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
