/**
 * Timeline Search Service
 *
 * 꿈/체크인 데이터를 통합 검색해 타임라인 결과로 반환한다.
 */
import { getTodayString } from '../utils/date';
import { EVENTS } from '../../constants/events';
import { EMOTIONS } from '../../constants/emotions';

function toDayNumber(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getTime();
}

function normalize(value) {
  return String(value || '').toLowerCase();
}

function includesQuery(haystack, query) {
  if (!query) return true;
  return normalize(haystack).includes(query);
}

function getRangeDays(range) {
  if (range === '7d') return 7;
  if (range === '30d') return 30;
  if (range === '90d') return 90;
  return Number.POSITIVE_INFINITY;
}

const EVENT_NAME_BY_ID = Object.fromEntries(EVENTS.map(event => [event.id, event.name]));
const EMOTION_NAME_BY_ID = Object.fromEntries(EMOTIONS.map(emotion => [emotion.id, emotion.name]));

function matchesDateRange(date, rangeDays) {
  if (!date || !Number.isFinite(rangeDays)) return true;
  const today = toDayNumber(getTodayString());
  const diff = Math.floor((today - toDayNumber(date)) / (24 * 60 * 60 * 1000));
  return diff >= 0 && diff < rangeDays;
}

function buildDreamSearchText(dream) {
  const symbolText = (dream.analysis?.symbols || [])
    .map(symbol => `${symbol.name} ${symbol.meaning || ''}`)
    .join(' ');
  const emotionText = (dream.analysis?.emotions || [])
    .map(emotion => emotion.name || emotion.type || '')
    .join(' ');
  const themeText = (dream.analysis?.themes || []).join(' ');
  return `${dream.content || ''} ${symbolText} ${emotionText} ${themeText}`;
}

function buildCheckInSearchText(log) {
  const emotionNames = (log.emotions || [])
    .map(id => `${id} ${EMOTION_NAME_BY_ID[id] || ''}`)
    .join(' ');
  const eventNames = (log.events || [])
    .map(id => `${id} ${EVENT_NAME_BY_ID[id] || ''}`)
    .join(' ');
  return `${log.note || ''} ${emotionNames} ${eventNames}`;
}

/**
 * 통합 타임라인 검색
 * @param {Object} params
 * @param {Array} [params.dreams=[]]
 * @param {Array} [params.logs=[]]
 * @param {Object} [params.filters]
 * @param {string} [params.filters.query]
 * @param {string} [params.filters.emotionId] - 'all' or emotion id
 * @param {string} [params.filters.symbolName] - 'all' or symbol name
 * @param {string} [params.filters.range]
*/
export function searchTimeline({
  dreams = [],
  logs = [],
  filters = {},
}) {
  const query = normalize(filters.query || '').trim();
  const emotionId = filters.emotionId || 'all';
  const symbolName = filters.symbolName || 'all';
  const rangeDays = getRangeDays(filters.range || '30d');

  const dreamItems = dreams
    .filter((dream) => {
      const dreamDate = dream.date || (dream.createdAt || '').split('T')[0];
      if (!matchesDateRange(dreamDate, rangeDays)) return false;

      const symbols = dream.analysis?.symbols || [];
      if (symbolName !== 'all' && !symbols.some(symbol => symbol.name === symbolName)) {
        return false;
      }

      if (emotionId !== 'all') {
        const emotionName = EMOTION_NAME_BY_ID[emotionId] || '';
        const dreamEmotions = (dream.analysis?.emotions || []).map(
          emotion => `${emotion.name || emotion.type || ''} ${emotion.id || ''}`.toLowerCase(),
        );
        const hasEmotion = dreamEmotions.some(
          value => value.includes(emotionId.toLowerCase()) || (emotionName && value.includes(emotionName.toLowerCase())),
        );
        if (!hasEmotion) return false;
      }

      return includesQuery(buildDreamSearchText(dream), query);
    })
    .map((dream) => ({
      id: `dream:${dream.id}`,
      type: 'dream',
      date: dream.date || (dream.createdAt || '').split('T')[0],
      createdAt: dream.createdAt || null,
      title: '꿈 기록',
      content: dream.content,
      symbols: (dream.analysis?.symbols || []).map(symbol => symbol.name),
      emotions: (dream.analysis?.emotions || []).map(emotion => emotion.name || emotion.type || ''),
      sourceId: dream.id,
    }));

  const checkInItems = logs
    .filter((log) => {
      if (!matchesDateRange(log.date, rangeDays)) return false;
      if (symbolName !== 'all') return false;
      if (emotionId !== 'all' && !(log.emotions || []).includes(emotionId)) return false;
      return includesQuery(buildCheckInSearchText(log), query);
    })
    .map((log) => ({
      id: `checkin:${log.id}`,
      type: 'checkin',
      date: log.date,
      createdAt: log.createdAt || null,
      title: '저녁 체크인',
      content: `컨디션 ${log.condition}/5 · 스트레스 ${log.stressLevel}/5`,
      emotions: (log.emotions || []).map(id => EMOTION_NAME_BY_ID[id] || id),
      events: (log.events || []).map(id => EVENT_NAME_BY_ID[id] || id),
      sourceId: log.id,
    }));

  return [...dreamItems, ...checkInItems].sort((a, b) => {
    const aSort = `${a.date} ${a.createdAt || '00:00:00'}`;
    const bSort = `${b.date} ${b.createdAt || '00:00:00'}`;
    return bSort.localeCompare(aSort);
  });
}

export default {
  searchTimeline,
};
