// Korean (한국어)
import type { Translations } from './en';

export const ko: Translations = {
  welcome: {
    title: '인증받고 Blockchain-Ads 접속하기',
    description: '접속은 일정을 예약하고 자격 심사를 통과한 인증된 광고주에게만 제한됩니다. 규정 준수 확인과 예산 임계값이 적용됩니다.',
    callWill: '이 통화에서:',
    confirmGoals: '캠페인 목표를 확인합니다',
    determineEligibility: '접속 자격을 결정합니다',
    cta: '인증받기',
  },

  details: {
    firstName: '이름',
    lastName: '성',
    email: '이메일 주소',
    website: '웹사이트 URL',
    websitePlaceholder: 'https://',
    industry: '브랜드가 속한 산업은?',
    heardFrom: '처음 어디서 저희를 알게 되셨나요?',
    select: '선택...',
    continue: '계속',
    processing: '처리 중...',
  },

  industries: {
    financeFintech: '금융 & 핀테크',
    gaming: '게임',
    saasTech: 'SaaS & 기술',
    aiTech: 'AI & 신흥 기술',
    blockchainCrypto: '블록체인 & 암호화폐',
    iGaming: 'iGaming',
    regulated: '규제 산업',
    other: '기타',
  },

  sources: {
    google: 'Google/검색 엔진',
    social: '소셜 미디어 (LinkedIn, Twitter/X)',
    ai: 'ChatGPT/Perplexity (기타 AI 도구)',
    website: '다른 웹사이트/제3자 기사',
    referral: '친구 또는 동료 추천',
    other: '기타',
  },

  qualification: {
    goal: '회사/브랜드의 목표는 무엇인가요?',
    budget: '광고 예산',
    role: '자신을 가장 잘 설명하는 것은?',
    back: '뒤로',
    continue: '계속',
    processing: '처리 중...',
  },

  objectives: {
    brandAwareness: '브랜드 인지도',
    websiteTraffic: '웹사이트 트래픽',
    downloads: '다운로드/가입',
    sales: '판매/입금',
  },

  budgets: {
    high: '500K+',
    medium: '100K-500K',
    low: '10K-100K',
  },

  roles: {
    brand: '브랜드/광고주',
    agency: '마케팅 에이전시',
    affiliate: '제휴사',
  },

  calendar: {
    title: '통화 시간 선택',
    timezone: '시간은 현지 시간대로 표시됩니다',
    selectDate: '시간을 보려면 날짜를 선택하세요',
    loading: '로딩 중...',
    noSlots: '이 날짜에는 이용 가능한 시간이 없습니다',
    availableTimes: '이용 가능한 시간',
    confirm: '확인',
    confirmPrompt: '{date} {time}에 인증 통화를 확인하시겠습니까?',
    booking: '예약 중...',
    back: '뒤로',
  },

  days: {
    su: '일',
    mo: '월',
    tu: '화',
    we: '수',
    th: '목',
    fr: '금',
    sa: '토',
  },

  months: {
    january: '1월',
    february: '2월',
    march: '3월',
    april: '4월',
    may: '5월',
    june: '6월',
    july: '7월',
    august: '8월',
    september: '9월',
    october: '10월',
    november: '11월',
    december: '12월',
  },

  success: {
    title: '미팅 확정',
    emailSent: '캘린더 초대가 전송되었습니다:',
    dateTime: '날짜 및 시간',
    guest: '참석자',
    seeStories: '성공 사례 보기',
    manageBooking: '내 예약 관리',
    needChange: '변경이 필요하신가요? 확인 이메일에서 언제든지 일정을 변경하거나 취소할 수 있습니다.',
  },

  common: {
    error: '문제가 발생했습니다',
    tryAgain: '다시 시도해 주세요',
    close: '닫기',
  },

  manage: {
    title: '예약 관리',
    enterEmail: '이메일 주소 입력',
    sendCode: '인증 코드 전송',
    enterCode: '인증 코드 입력',
    verify: '확인',
    yourBooking: '내 예약',
    reschedule: '일정 변경',
    cancel: '예약 취소',
    cancelled: '이 예약은 취소되었습니다',
    confirmCancel: '이 예약을 취소하시겠습니까?',
  },
};
