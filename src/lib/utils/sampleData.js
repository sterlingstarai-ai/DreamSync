/**
 * 샘플 데이터 로드 유틸리티
 * 온보딩/디버그 시 빈 상태 대신 데모 데이터를 볼 수 있도록 제공
 */
import { generateId } from './id';
import { getTodayString } from './date';
import useDreamStore from '../../store/useDreamStore';
import useCheckInStore from '../../store/useCheckInStore';
import useSymbolStore from '../../store/useSymbolStore';

/**
 * 샘플 데이터를 스토어에 로드
 * @param {string} userId
 */
export function loadSampleData(userId) {
  const today = getTodayString();
  const yesterday = offsetDate(today, -1);
  const twoDaysAgo = offsetDate(today, -2);

  // 꿈 데이터
  const dreams = [
    {
      id: generateId(),
      userId,
      content: '넓은 바다에서 수영을 하고 있었다. 물이 맑고 따뜻했고, 돌고래가 옆에서 같이 헤엄쳤다.',
      voiceUrl: null,
      analysis: {
        symbols: [
          { name: '바다', meaning: '무의식, 감정의 깊이', category: 'nature' },
          { name: '돌고래', meaning: '지혜, 유희, 자유', category: 'animal' },
        ],
        emotions: [
          { name: '평온', intensity: 0.8 },
          { name: '자유', intensity: 0.7 },
        ],
        themes: ['자유', '탐험'],
        intensity: 6,
        interpretation: '내면의 감정이 안정되어 있으며 새로운 가능성을 탐색하고 있습니다.',
      },
      createdAt: `${yesterday}T07:30:00.000Z`,
      updatedAt: `${yesterday}T07:31:00.000Z`,
    },
    {
      id: generateId(),
      userId,
      content: '높은 산 정상에서 일출을 보고 있었다. 구름 위로 빛이 퍼지면서 눈물이 났다.',
      voiceUrl: null,
      analysis: {
        symbols: [
          { name: '산', meaning: '목표, 성취, 도전', category: 'nature' },
          { name: '일출', meaning: '새로운 시작, 희망', category: 'nature' },
        ],
        emotions: [
          { name: '감동', intensity: 0.9 },
          { name: '성취감', intensity: 0.8 },
        ],
        themes: ['성취', '감동'],
        intensity: 8,
        interpretation: '최근의 노력이 결실을 맺고 있으며 내적 성장을 경험하고 있습니다.',
      },
      createdAt: `${twoDaysAgo}T06:45:00.000Z`,
      updatedAt: `${twoDaysAgo}T06:46:00.000Z`,
    },
  ];

  // 체크인 데이터
  const checkIns = [
    {
      id: generateId(),
      userId,
      date: yesterday,
      condition: 4,
      emotions: ['편안함', '감사'],
      stressLevel: 2,
      events: ['운동', '친구만남'],
      note: null,
      sleep: null,
      createdAt: `${yesterday}T21:00:00.000Z`,
    },
    {
      id: generateId(),
      userId,
      date: twoDaysAgo,
      condition: 3,
      emotions: ['보통', '기대'],
      stressLevel: 3,
      events: ['업무'],
      note: null,
      sleep: null,
      createdAt: `${twoDaysAgo}T21:00:00.000Z`,
    },
  ];

  // 심볼 데이터
  const symbols = [
    {
      id: generateId(),
      userId,
      name: '바다',
      meaning: '무의식, 감정의 깊이',
      count: 3,
      dreamIds: [dreams[0].id],
      firstSeen: twoDaysAgo,
      lastSeen: yesterday,
      createdAt: `${twoDaysAgo}T07:00:00.000Z`,
      updatedAt: `${yesterday}T07:30:00.000Z`,
    },
    {
      id: generateId(),
      userId,
      name: '산',
      meaning: '목표, 성취, 도전',
      count: 2,
      dreamIds: [dreams[1].id],
      firstSeen: twoDaysAgo,
      lastSeen: twoDaysAgo,
      createdAt: `${twoDaysAgo}T06:45:00.000Z`,
      updatedAt: `${twoDaysAgo}T06:46:00.000Z`,
    },
  ];

  // 스토어에 주입
  const dreamStore = useDreamStore.getState();
  const checkInStore = useCheckInStore.getState();
  const symbolStore = useSymbolStore.getState();

  useDreamStore.setState({ dreams: [...dreams, ...dreamStore.dreams] });
  useCheckInStore.setState({ logs: [...checkIns, ...checkInStore.logs] });
  useSymbolStore.setState({ symbols: [...symbols, ...symbolStore.symbols] });
}

/**
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} days
 * @returns {string}
 */
function offsetDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
