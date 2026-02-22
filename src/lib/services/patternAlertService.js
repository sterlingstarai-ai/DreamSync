/**
 * Pattern Alert Service
 *
 * 최근 데이터에서 상태 악화 시그널을 탐지해 조기 경보를 생성한다.
 */

const SEVERITY_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1,
};

const NEGATIVE_DREAM_KEYWORDS = ['불안', '공포', '두려움', '악몽', '스트레스'];

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function safeLower(value) {
  return String(value || '').toLowerCase();
}

function hasNegativeDreamSignal(dream) {
  const emotionNames = (dream.analysis?.emotions || [])
    .map(e => safeLower(e.name || e.type))
    .join(' ');
  const themes = (dream.analysis?.themes || []).map(t => safeLower(t)).join(' ');
  const content = safeLower(dream.content);

  return NEGATIVE_DREAM_KEYWORDS.some(keyword => {
    const normalized = keyword.toLowerCase();
    return emotionNames.includes(normalized) || themes.includes(normalized) || content.includes(normalized);
  });
}

/**
 * 패턴 경보 탐지
 * @param {Object} params
 * @param {Array} [params.recentLogs=[]]
 * @param {Array} [params.recentDreams=[]]
 */
export function detectPatternAlerts({ recentLogs = [], recentDreams = [] }) {
  const alerts = [];
  const sortedLogs = [...recentLogs].sort((a, b) => b.date.localeCompare(a.date));
  const lastLogs = sortedLogs.slice(0, 3);

  if (lastLogs.length >= 3) {
    const avgCondition = average(lastLogs.map(log => log.condition || 0));
    const avgStress = average(lastLogs.map(log => log.stressLevel || 0));

    if (avgCondition > 0 && avgCondition <= 2.5) {
      alerts.push({
        id: 'condition-drop',
        severity: avgCondition <= 2 ? 'high' : 'medium',
        title: '컨디션 저하 신호',
        description: `최근 3일 평균 컨디션이 ${avgCondition.toFixed(1)}/5 입니다.`,
        recommendation: '오늘은 부담을 줄이고 회복 루틴(산책, 가벼운 스트레칭)을 먼저 실행해보세요.',
      });
    }

    if (avgStress >= 4) {
      alerts.push({
        id: 'stress-spike',
        severity: 'high',
        title: '스트레스 급증 신호',
        description: `최근 3일 평균 스트레스가 ${avgStress.toFixed(1)}/5 입니다.`,
        recommendation: '오늘 일정에서 반드시 10분 이상 이완 시간을 블록으로 확보하세요.',
      });
    }

    const sleepLogs = lastLogs.filter(log => typeof log.sleep?.duration === 'number');
    if (sleepLogs.length >= 2) {
      const avgSleepHours = average(sleepLogs.map(log => log.sleep.duration / 60));
      if (avgSleepHours < 6) {
        alerts.push({
          id: 'sleep-deficit',
          severity: avgSleepHours < 5.5 ? 'high' : 'medium',
          title: '수면 부족 신호',
          description: `최근 수면 평균이 ${avgSleepHours.toFixed(1)}시간입니다.`,
          recommendation: '취침 시간을 30분 앞당기고 카페인 섭취를 저녁 이후 제한해보세요.',
        });
      }
    }
  }

  const sortedDreams = [...recentDreams].sort((a, b) => {
    const aDate = a.createdAt || `${a.date}T00:00:00`;
    const bDate = b.createdAt || `${b.date}T00:00:00`;
    return bDate.localeCompare(aDate);
  });
  const lastDreams = sortedDreams.slice(0, 5);
  const intenseDreamCount = lastDreams.filter(dream => (dream.analysis?.intensity || 0) >= 8).length;
  const negativeDreamCount = lastDreams.filter(hasNegativeDreamSignal).length;

  if (intenseDreamCount >= 2 || negativeDreamCount >= 2) {
    alerts.push({
      id: 'nightmare-pattern',
      severity: intenseDreamCount >= 3 || negativeDreamCount >= 3 ? 'high' : 'medium',
      title: '악몽/고강도 꿈 패턴',
      description: `최근 꿈에서 고강도/부정 신호가 ${Math.max(intenseDreamCount, negativeDreamCount)}회 감지됐습니다.`,
      recommendation: '취침 전 자극적인 콘텐츠를 줄이고, 잠들기 전에 짧은 호흡 명상을 시도해보세요.',
    });
  }

  const sortedAlerts = alerts.sort(
    (a, b) => (SEVERITY_WEIGHT[b.severity] || 0) - (SEVERITY_WEIGHT[a.severity] || 0),
  );

  if (sortedAlerts.length >= 2) {
    sortedAlerts.unshift({
      id: 'compound-risk',
      severity: 'high',
      title: '복합 악화 신호 감지',
      description: '컨디션/스트레스/수면 신호가 동시에 악화되고 있습니다.',
      recommendation: '오늘 목표를 최소화하고 회복 중심으로 하루를 설계해보세요.',
    });
  }

  return sortedAlerts;
}

/**
 * 상단 배너용 요약
 * @param {Array} alerts
 */
export function summarizePatternAlerts(alerts = []) {
  if (!alerts.length) {
    return {
      hasAlert: false,
      severity: 'low',
      message: '안정적인 패턴입니다.',
    };
  }

  const top = alerts[0];
  return {
    hasAlert: true,
    severity: top.severity || 'medium',
    message: top.title,
  };
}

export default {
  detectPatternAlerts,
  summarizePatternAlerts,
};
