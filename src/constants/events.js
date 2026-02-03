/**
 * 이벤트 목록
 * 체크인에서 오늘 있었던 일 선택
 */

export const EVENTS = [
  // 업무/학업
  { id: 'work_busy', name: '바쁜 하루', emoji: '💼', category: 'work' },
  { id: 'work_success', name: '업무 성과', emoji: '🎯', category: 'work' },
  { id: 'work_meeting', name: '회의', emoji: '🗣️', category: 'work' },
  { id: 'work_deadline', name: '마감', emoji: '⏰', category: 'work' },
  { id: 'work_conflict', name: '업무 갈등', emoji: '😤', category: 'work' },

  // 관계
  { id: 'social_friends', name: '친구 만남', emoji: '👫', category: 'social' },
  { id: 'social_family', name: '가족 시간', emoji: '👨‍👩‍👧', category: 'social' },
  { id: 'social_date', name: '데이트', emoji: '💑', category: 'social' },
  { id: 'social_conflict', name: '갈등/다툼', emoji: '💔', category: 'social' },
  { id: 'social_alone', name: '혼자 시간', emoji: '🧘', category: 'social' },

  // 건강/운동
  { id: 'health_exercise', name: '운동', emoji: '🏃', category: 'health' },
  { id: 'health_sick', name: '아픔/불편', emoji: '🤒', category: 'health' },
  { id: 'health_good_sleep', name: '숙면', emoji: '😴', category: 'health' },
  { id: 'health_bad_sleep', name: '불면/악몽', emoji: '😵', category: 'health' },
  { id: 'health_meal', name: '맛있는 식사', emoji: '🍽️', category: 'health' },

  // 여가/취미
  { id: 'hobby_entertainment', name: '영화/드라마', emoji: '🎬', category: 'hobby' },
  { id: 'hobby_game', name: '게임', emoji: '🎮', category: 'hobby' },
  { id: 'hobby_reading', name: '독서', emoji: '📚', category: 'hobby' },
  { id: 'hobby_music', name: '음악', emoji: '🎵', category: 'hobby' },
  { id: 'hobby_travel', name: '여행/외출', emoji: '✈️', category: 'hobby' },

  // 특별 이벤트
  { id: 'special_good_news', name: '좋은 소식', emoji: '🎉', category: 'special' },
  { id: 'special_bad_news', name: '나쁜 소식', emoji: '😔', category: 'special' },
  { id: 'special_achievement', name: '성취', emoji: '🏆', category: 'special' },
  { id: 'special_change', name: '변화', emoji: '🔄', category: 'special' },
  { id: 'special_nothing', name: '특별한 일 없음', emoji: '📅', category: 'special' },
];

export const EVENT_CATEGORIES = {
  work: { name: '업무/학업', color: '#3b82f6' },
  social: { name: '관계', color: '#ec4899' },
  health: { name: '건강', color: '#10b981' },
  hobby: { name: '여가', color: '#f59e0b' },
  special: { name: '특별', color: '#8b5cf6' },
};

/**
 * ID로 이벤트 찾기
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getEventById(id) {
  return EVENTS.find(e => e.id === id);
}

/**
 * 카테고리별 이벤트 그룹화
 * @returns {Object}
 */
export function getEventsByCategory() {
  return EVENTS.reduce((acc, event) => {
    if (!acc[event.category]) {
      acc[event.category] = [];
    }
    acc[event.category].push(event);
    return acc;
  }, {});
}
