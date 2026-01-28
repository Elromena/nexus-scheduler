// Japanese (日本語)
import type { Translations } from './en';

export const ja: Translations = {
  welcome: {
    title: '認証を受けてBlockchain-Adsにアクセス',
    description: 'アクセスは、スケジュールを設定し資格審査に合格した認証済み広告主のみに限定されています。コンプライアンスチェックと予算の閾値が適用されます。',
    callWill: 'この通話では：',
    confirmGoals: 'キャンペーン目標を確認します',
    determineEligibility: 'アクセス資格を判定します',
    cta: '認証を受ける',
  },

  details: {
    firstName: '名',
    lastName: '姓',
    email: 'メールアドレス',
    website: 'ウェブサイトURL',
    websitePlaceholder: 'https://',
    industry: 'ブランドの業界は？',
    heardFrom: '当社を最初にどこで知りましたか？',
    select: '選択してください...',
    continue: '続ける',
    processing: '処理中...',
  },

  industries: {
    financeFintech: '金融＆フィンテック',
    gaming: 'ゲーム',
    saasTech: 'SaaS＆テック',
    aiTech: 'AI＆新興テック',
    blockchainCrypto: 'ブロックチェーン＆暗号資産',
    iGaming: 'iGaming',
    regulated: '規制産業',
    other: 'その他',
  },

  sources: {
    google: 'Google/検索エンジン',
    social: 'ソーシャルメディア (LinkedIn, Twitter/X)',
    ai: 'ChatGPT/Perplexity (その他のAIツール)',
    website: '他のウェブサイト/第三者記事',
    referral: '友人や同僚からの紹介',
    other: 'その他',
  },

  qualification: {
    goal: '会社/ブランドの目標は何ですか？',
    budget: '広告予算',
    role: 'あなたを最もよく表すのは？',
    back: '戻る',
    continue: '続ける',
    processing: '処理中...',
  },

  objectives: {
    brandAwareness: 'ブランド認知度',
    websiteTraffic: 'ウェブサイトトラフィック',
    downloads: 'ダウンロード/登録',
    sales: '売上/入金',
  },

  budgets: {
    high: '500K+',
    medium: '100K-500K',
    low: '10K-100K',
  },

  roles: {
    brand: 'ブランド/広告主',
    agency: 'マーケティング代理店',
    affiliate: 'アフィリエイト',
  },

  calendar: {
    title: '通話の時間を選択',
    timezone: '時間はお住まいのタイムゾーンで表示されています',
    selectDate: '日付を選択して時間を表示',
    loading: '読み込み中...',
    noSlots: 'この日付には空き枠がありません',
    availableTimes: '利用可能な時間',
    confirm: '確認',
    confirmPrompt: '{date} {time} の認証通話を確認しますか？',
    booking: '予約中...',
    back: '戻る',
  },

  days: {
    su: '日',
    mo: '月',
    tu: '火',
    we: '水',
    th: '木',
    fr: '金',
    sa: '土',
  },

  months: {
    january: '1月',
    february: '2月',
    march: '3月',
    april: '4月',
    may: '5月',
    june: '6月',
    july: '7月',
    august: '8月',
    september: '9月',
    october: '10月',
    november: '11月',
    december: '12月',
  },

  success: {
    title: 'ミーティング確認済み',
    emailSent: 'カレンダー招待を送信しました：',
    dateTime: '日時',
    guest: 'ゲスト',
    seeStories: '成功事例を見る',
    manageBooking: '予約を管理',
    needChange: '変更が必要ですか？確認メールからいつでも再スケジュールまたはキャンセルできます。',
  },

  common: {
    error: '問題が発生しました',
    tryAgain: 'もう一度お試しください',
    close: '閉じる',
  },

  manage: {
    title: '予約の管理',
    enterEmail: 'メールアドレスを入力',
    sendCode: '認証コードを送信',
    enterCode: '認証コードを入力',
    verify: '確認',
    yourBooking: 'あなたの予約',
    reschedule: '再スケジュール',
    cancel: '予約をキャンセル',
    cancelled: 'この予約はキャンセルされました',
    confirmCancel: 'この予約をキャンセルしてもよろしいですか？',
  },
};
