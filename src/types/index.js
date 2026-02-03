/**
 * DreamSync 타입 정의 (JSDoc)
 * 1단계: 로컬 스토리지 기반
 */

/**
 * @typedef {Object} Dream
 * @property {string} id - UUID
 * @property {string} userId - 사용자 ID
 * @property {string} content - 꿈 내용 (텍스트)
 * @property {string} [voiceUrl] - 음성 녹음 URL (선택)
 * @property {DreamAnalysis} [analysis] - AI 분석 결과
 * @property {string} createdAt - ISO 날짜 문자열
 * @property {string} updatedAt - ISO 날짜 문자열
 */

/**
 * @typedef {Object} DreamAnalysis
 * @property {Symbol[]} symbols - 추출된 심볼 목록
 * @property {Emotion[]} emotions - 감정 분석
 * @property {string[]} themes - 주요 테마
 * @property {number} intensity - 감정 강도 (1-10)
 * @property {string} summary - 요약 해석
 * @property {string[]} questions - 자기성찰 질문
 */

/**
 * @typedef {Object} Symbol
 * @property {string} name - 심볼 이름
 * @property {string} meaning - 일반적 의미
 * @property {string} [personalMeaning] - 개인화된 의미
 * @property {number} frequency - 출현 빈도
 */

/**
 * @typedef {Object} Emotion
 * @property {string} name - 감정 이름 (한글)
 * @property {number} intensity - 강도 (1-10)
 * @property {string} [color] - 표시 색상
 */

/**
 * @typedef {Object} DailyLog
 * @property {string} id - UUID
 * @property {string} userId - 사용자 ID
 * @property {string} date - YYYY-MM-DD 형식
 * @property {number} condition - 컨디션 (1-5)
 * @property {string[]} emotions - 선택한 감정들
 * @property {number} stressLevel - 스트레스 레벨 (1-5)
 * @property {string[]} events - 오늘의 이벤트
 * @property {string} [note] - 메모 (선택)
 * @property {SleepData} [sleep] - 수면 데이터 (Phase 2)
 * @property {string} createdAt - ISO 날짜 문자열
 */

/**
 * @typedef {Object} SleepData
 * @property {number} duration - 수면 시간 (분)
 * @property {number} quality - 수면 품질 (1-5)
 * @property {string} [bedTime] - 취침 시간
 * @property {string} [wakeTime] - 기상 시간
 * @property {string} source - 데이터 소스 ('manual' | 'healthkit' | 'healthconnect')
 */

/**
 * @typedef {Object} WearableSleepSummary
 * @property {string} date - YYYY-MM-DD (사용자 로컬 기준)
 * @property {number|null} totalSleepMinutes - 총 수면 시간 (분)
 * @property {number|null} sleepQualityScore - 0~10 추정값
 * @property {number|null} remMinutes - REM 수면 (분)
 * @property {number|null} deepMinutes - 딥 수면 (분)
 * @property {number|null} hrvMs - 심박변이도 (ms)
 * @property {string|null} [bedTime] - 취침 시간
 * @property {string|null} [wakeTime] - 기상 시간
 * @property {'manual'|'healthkit'|'healthconnect'} source - 데이터 소스
 * @property {string} fetchedAt - ISO 8601 타임스탬프
 */

/**
 * @typedef {Object} PersonalSymbol
 * @property {string} id - UUID
 * @property {string} userId - 사용자 ID
 * @property {string} name - 심볼 이름
 * @property {string} meaning - 개인화된 의미
 * @property {number} count - 등장 횟수
 * @property {string[]} dreamIds - 관련 꿈 ID 목록
 * @property {string} firstSeen - 첫 등장 날짜
 * @property {string} lastSeen - 마지막 등장 날짜
 * @property {string} createdAt - ISO 날짜 문자열
 * @property {string} updatedAt - ISO 날짜 문자열
 */

/**
 * @typedef {Object} Forecast
 * @property {string} id - UUID
 * @property {string} userId - 사용자 ID
 * @property {string} date - YYYY-MM-DD 형식 (예보 대상 날짜)
 * @property {ForecastPrediction} prediction - 예측 내용
 * @property {ForecastActual} [actual] - 실제 결과 (체크인 후)
 * @property {number} [accuracy] - 정확도 (0-100)
 * @property {string} createdAt - ISO 날짜 문자열
 */

/**
 * @typedef {Object} ForecastPrediction
 * @property {number} condition - 예상 컨디션 (1-5)
 * @property {string[]} emotions - 예상 감정들
 * @property {number} confidence - 신뢰도 (0-100)
 * @property {string} summary - 예보 요약
 * @property {string[]} suggestions - 행동 제안
 * @property {string[]} cautions - 주의사항
 */

/**
 * @typedef {Object} ForecastActual
 * @property {number} condition - 실제 컨디션
 * @property {string[]} emotions - 실제 감정들
 */

/**
 * @typedef {Object} FeatureFlags
 * @property {boolean} healthkit - HealthKit 연동 활성화
 * @property {boolean} saju - 사주 분석 활성화
 * @property {boolean} uhs - UHS 스코어 표시
 * @property {boolean} b2b - B2B API 접근
 */

/**
 * @typedef {Object} User
 * @property {string} id - UUID
 * @property {string} email - 이메일
 * @property {string} [name] - 이름
 * @property {string} [avatar] - 아바타 URL
 * @property {UserSettings} settings - 사용자 설정
 * @property {boolean} onboardingCompleted - 온보딩 완료 여부
 * @property {string} createdAt - ISO 날짜 문자열
 */

/**
 * @typedef {Object} UserSettings
 * @property {boolean} notifications - 알림 활성화
 * @property {string} reminderTime - 체크인 알림 시간 (HH:mm)
 * @property {string} theme - 테마 ('dark' | 'light' | 'system')
 * @property {string} language - 언어 ('ko' | 'en')
 */

/**
 * @typedef {Object} UHSScore
 * @property {string} id - UUID
 * @property {string} userId - 사용자 ID
 * @property {string} date - YYYY-MM-DD 형식
 * @property {number} score - UHS 점수 (0-100)
 * @property {UHSBreakdown} breakdown - 세부 항목
 * @property {string} createdAt - ISO 날짜 문자열
 */

/**
 * @typedef {Object} UHSBreakdown
 * @property {number} sleep - 수면 점수
 * @property {number} emotion - 감정 점수
 * @property {number} dream - 꿈 품질 점수
 * @property {number} stress - 스트레스 점수 (역산)
 */

/**
 * @typedef {Object} WeeklyReport
 * @property {string} id - UUID
 * @property {string} userId - 사용자 ID
 * @property {string} weekStart - 주 시작일 (YYYY-MM-DD)
 * @property {string} weekEnd - 주 종료일 (YYYY-MM-DD)
 * @property {ReportSummary} summary - 주간 요약
 * @property {PatternInsight[]} patterns - 발견된 패턴
 * @property {string} createdAt - ISO 날짜 문자열
 */

/**
 * @typedef {Object} ReportSummary
 * @property {number} totalDreams - 기록된 꿈 수
 * @property {number} checkInRate - 체크인 완료율 (0-100)
 * @property {number} avgCondition - 평균 컨디션
 * @property {number} avgAccuracy - 예보 평균 정확도
 * @property {string[]} topEmotions - 상위 감정
 * @property {string[]} topSymbols - 상위 심볼
 */

/**
 * @typedef {Object} PatternInsight
 * @property {string} type - 패턴 유형 ('emotion' | 'symbol' | 'sleep' | 'event')
 * @property {string} description - 패턴 설명
 * @property {number} confidence - 신뢰도 (0-100)
 * @property {string} [suggestion] - 관련 제안
 */

export {};
