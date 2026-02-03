/**
 * 감정 목록 (한글)
 * 체크인 및 꿈 분석에서 사용
 */

export const EMOTIONS = [
  { id: 'happy', name: '행복한', emoji: '😊', color: '#10b981' },
  { id: 'peaceful', name: '평온한', emoji: '😌', color: '#3b82f6' },
  { id: 'excited', name: '설레는', emoji: '🤩', color: '#f59e0b' },
  { id: 'grateful', name: '감사한', emoji: '🙏', color: '#8b5cf6' },
  { id: 'hopeful', name: '희망찬', emoji: '🌟', color: '#06b6d4' },
  { id: 'loved', name: '사랑받는', emoji: '🥰', color: '#ec4899' },
  { id: 'confident', name: '자신있는', emoji: '💪', color: '#14b8a6' },
  { id: 'calm', name: '차분한', emoji: '🧘', color: '#6366f1' },

  { id: 'anxious', name: '불안한', emoji: '😰', color: '#f97316' },
  { id: 'sad', name: '슬픈', emoji: '😢', color: '#64748b' },
  { id: 'angry', name: '화난', emoji: '😠', color: '#ef4444' },
  { id: 'stressed', name: '스트레스', emoji: '😫', color: '#dc2626' },
  { id: 'tired', name: '피곤한', emoji: '😴', color: '#94a3b8' },
  { id: 'lonely', name: '외로운', emoji: '🥺', color: '#78716c' },
  { id: 'confused', name: '혼란스러운', emoji: '😵‍💫', color: '#a855f7' },
  { id: 'frustrated', name: '답답한', emoji: '😤', color: '#f43f5e' },

  { id: 'neutral', name: '무덤덤한', emoji: '😐', color: '#9ca3af' },
  { id: 'curious', name: '궁금한', emoji: '🤔', color: '#0ea5e9' },
  { id: 'nostalgic', name: '그리운', emoji: '🥹', color: '#d946ef' },
  { id: 'surprised', name: '놀란', emoji: '😲', color: '#eab308' },
];

export const EMOTION_CATEGORIES = {
  positive: ['happy', 'peaceful', 'excited', 'grateful', 'hopeful', 'loved', 'confident', 'calm'],
  negative: ['anxious', 'sad', 'angry', 'stressed', 'tired', 'lonely', 'confused', 'frustrated'],
  neutral: ['neutral', 'curious', 'nostalgic', 'surprised'],
};

/**
 * ID로 감정 찾기
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getEmotionById(id) {
  return EMOTIONS.find(e => e.id === id);
}

/**
 * 이름으로 감정 찾기
 * @param {string} name
 * @returns {Object|undefined}
 */
export function getEmotionByName(name) {
  return EMOTIONS.find(e => e.name === name);
}

/**
 * 감정이 긍정적인지 확인
 * @param {string} id
 * @returns {boolean}
 */
export function isPositiveEmotion(id) {
  return EMOTION_CATEGORIES.positive.includes(id);
}
