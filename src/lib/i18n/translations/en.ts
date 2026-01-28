// English (Default)
export const en = {
  // Welcome Step
  welcome: {
    title: 'Get Verified & Access Blockchain-Ads',
    description: 'Access is limited to verified advertisers only that schedule and pass the qualification. Compliance checks and budget thresholds apply.',
    callWill: 'This call will:',
    confirmGoals: 'Confirm your campaign goals',
    determineEligibility: 'Determine eligibility for access',
    cta: 'Get Verified',
  },

  // Details Step (Step 1)
  details: {
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Your email address',
    website: 'Website URL',
    websitePlaceholder: 'https://',
    industry: 'What industry is the brand in?',
    heardFrom: 'Where did you first hear about us?',
    select: 'Select...',
    continue: 'Continue',
    processing: 'Processing...',
  },

  // Industries
  industries: {
    financeFintech: 'Finance & Fintech',
    gaming: 'Gaming',
    saasTech: 'SaaS & Tech',
    aiTech: 'AI & Emerging Tech',
    blockchainCrypto: 'Blockchain & Crypto',
    iGaming: 'iGaming',
    regulated: 'Regulated Industries',
    other: 'Other',
  },

  // Sources
  sources: {
    google: 'Google/Search Engines',
    social: 'Social Media (LinkedIn, Twitter/X)',
    ai: 'ChatGPT/Perplexity (Other AI Tools)',
    website: 'Another Website/Third Party Article',
    referral: 'Friend or Colleague Referral',
    other: 'Other',
  },

  // Qualification Step (Step 2)
  qualification: {
    goal: 'What is the goal for your company/brand?',
    budget: 'Your advertising budget',
    role: 'How would you best describe yourself?',
    back: 'Back',
    continue: 'Continue',
    processing: 'Processing...',
  },

  // Objectives
  objectives: {
    brandAwareness: 'Brand Awareness',
    websiteTraffic: 'Website Traffic',
    downloads: 'Downloads/Sign Ups',
    sales: 'Sales/Deposits',
  },

  // Budgets
  budgets: {
    high: '500K+',
    medium: '100K-500K',
    low: '10K-100K',
  },

  // Roles
  roles: {
    brand: 'Brand/Advertiser',
    agency: 'Marketing Agency',
    affiliate: 'Affiliate',
  },

  // Calendar Step (Step 3)
  calendar: {
    title: 'Pick a time for your call',
    timezone: 'Times are shown in your local timezone',
    selectDate: 'Select a date to view times',
    loading: 'Loading...',
    noSlots: 'No available slots for this date',
    availableTimes: 'Available Times',
    confirm: 'Confirm',
    confirmPrompt: 'Confirm your verification call for {date} at {time}?',
    booking: 'Booking...',
    back: 'Back',
  },

  // Day names (short)
  days: {
    su: 'Su',
    mo: 'Mo',
    tu: 'Tu',
    we: 'We',
    th: 'Th',
    fr: 'Fr',
    sa: 'Sa',
  },

  // Month names
  months: {
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
  },

  // Success Step
  success: {
    title: 'Meeting Confirmed',
    emailSent: 'A calendar invitation has been sent to',
    dateTime: 'Date & Time',
    guest: 'Guest',
    seeStories: 'See Success Stories',
    manageBooking: 'Manage my booking',
    needChange: 'Need to change? Reschedule or cancel anytime from your confirmation email.',
  },

  // Common
  common: {
    error: 'Something went wrong',
    tryAgain: 'Please try again',
    close: 'Close',
  },

  // Manage Booking
  manage: {
    title: 'Manage Your Booking',
    enterEmail: 'Enter your email address',
    sendCode: 'Send Verification Code',
    enterCode: 'Enter verification code',
    verify: 'Verify',
    yourBooking: 'Your Booking',
    reschedule: 'Reschedule',
    cancel: 'Cancel Booking',
    cancelled: 'This booking has been cancelled',
    confirmCancel: 'Are you sure you want to cancel this booking?',
  },
};

export type Translations = typeof en;
