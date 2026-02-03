/**
 * 날짜 유틸리티 함수
 */
import { format, formatDistanceToNow, startOfWeek, endOfWeek, isToday, isYesterday, parseISO, differenceInDays, addDays, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 오늘 날짜 (YYYY-MM-DD)
 * @returns {string}
 */
export function getTodayString() {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Date를 YYYY-MM-DD 문자열로
 * @param {Date} date
 * @returns {string}
 */
export function toDateString(date) {
  return format(date, 'yyyy-MM-dd');
}

/**
 * ISO 문자열을 표시용 포맷으로
 * @param {string} isoString
 * @param {string} formatStr - 기본: 'M월 d일'
 * @returns {string}
 */
export function formatDate(isoString, formatStr = 'M월 d일') {
  return format(parseISO(isoString), formatStr, { locale: ko });
}

/**
 * 상대적 시간 표시 (예: "3시간 전")
 * @param {string} isoString
 * @returns {string}
 */
export function formatRelative(isoString) {
  return formatDistanceToNow(parseISO(isoString), { addSuffix: true, locale: ko });
}

/**
 * 친근한 날짜 표시 (오늘, 어제, 또는 날짜)
 * @param {string} dateString - YYYY-MM-DD
 * @returns {string}
 */
export function formatFriendlyDate(dateString) {
  const date = parseISO(dateString);

  if (isToday(date)) return '오늘';
  if (isYesterday(date)) return '어제';

  const diff = differenceInDays(new Date(), date);
  if (diff < 7) return `${diff}일 전`;

  return format(date, 'M월 d일', { locale: ko });
}

/**
 * 시간 포맷 (HH:mm)
 * @param {string} isoString
 * @returns {string}
 */
export function formatTime(isoString) {
  return format(parseISO(isoString), 'HH:mm');
}

/**
 * 이번 주 시작일과 종료일
 * @returns {{ start: string, end: string }}
 */
export function getThisWeekRange() {
  const now = new Date();
  return {
    start: toDateString(startOfWeek(now, { weekStartsOn: 1 })), // 월요일 시작
    end: toDateString(endOfWeek(now, { weekStartsOn: 1 })),
  };
}

/**
 * 특정 주의 날짜 범위
 * @param {string} dateString - 주의 어느 날짜든
 * @returns {{ start: string, end: string }}
 */
export function getWeekRange(dateString) {
  const date = parseISO(dateString);
  return {
    start: toDateString(startOfWeek(date, { weekStartsOn: 1 })),
    end: toDateString(endOfWeek(date, { weekStartsOn: 1 })),
  };
}

/**
 * 최근 N일간의 날짜 목록
 * @param {number} days
 * @returns {string[]}
 */
export function getRecentDays(days = 7) {
  const result = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    result.push(toDateString(subDays(today, i)));
  }

  return result;
}

/**
 * 두 날짜 사이의 일수
 * @param {string} startDate
 * @param {string} endDate
 * @returns {number}
 */
export function daysBetween(startDate, endDate) {
  return differenceInDays(parseISO(endDate), parseISO(startDate));
}

/**
 * 날짜에 일수 더하기
 * @param {string} dateString
 * @param {number} days
 * @returns {string}
 */
export function addDaysToDate(dateString, days) {
  return toDateString(addDays(parseISO(dateString), days));
}

/**
 * 요일 이름 (한글)
 * @param {string} dateString
 * @returns {string}
 */
export function getDayName(dateString) {
  return format(parseISO(dateString), 'EEEE', { locale: ko });
}

/**
 * 짧은 요일 이름 (월, 화, 수...)
 * @param {string} dateString
 * @returns {string}
 */
export function getShortDayName(dateString) {
  return format(parseISO(dateString), 'EEE', { locale: ko });
}
