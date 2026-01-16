/**
 * Nexus Scheduler - Visitor Tracking Script
 * Version: 1.0.0
 * 
 * Embed this script on all pages of your Webflow site:
 * <script src="https://yourdomain.com/scheduler/tracker.js" defer></script>
 */
(function() {
  'use strict';
  
  const TRACKER_VERSION = '1.0.0';
  const API_BASE = (function() {
    // Auto-detect the base URL from the script src
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src && src.includes('tracker.js')) {
        return src.replace('/tracker.js', '');
      }
    }
    // Fallback - will be replaced during deployment
    return window.NEXUS_API_BASE || '/scheduler';
  })();
  
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const STORAGE_PREFIX = 'nxs_';
  
  // =============================================
  // FINGERPRINTING (lightweight, privacy-conscious)
  // =============================================
  function generateFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Nexus', 2, 15);
      }
      const canvasData = canvas.toDataURL().slice(-50);
      
      const components = [
        navigator.userAgent || '',
        navigator.language || '',
        screen.colorDepth || '',
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        !!window.sessionStorage,
        !!window.localStorage,
        !!window.indexedDB,
        navigator.hardwareConcurrency || '',
        canvasData
      ];
      
      return hashCode(components.join('|||'));
    } catch (e) {
      return hashCode(navigator.userAgent + Math.random());
    }
  }
  
  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'fp_' + Math.abs(hash).toString(36);
  }
  
  // =============================================
  // STORAGE HELPERS
  // =============================================
  function getItem(key) {
    try {
      return localStorage.getItem(STORAGE_PREFIX + key);
    } catch (e) {
      return null;
    }
  }
  
  function setItem(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, value);
    } catch (e) {}
  }
  
  function getSessionItem(key) {
    try {
      return sessionStorage.getItem(STORAGE_PREFIX + key);
    } catch (e) {
      return null;
    }
  }
  
  function setSessionItem(key, value) {
    try {
      sessionStorage.setItem(STORAGE_PREFIX + key, value);
    } catch (e) {}
  }
  
  function getVisitorId() {
    let id = getItem('visitor_id');
    if (!id) {
      id = 'v_' + generateUUID();
      setItem('visitor_id', id);
    }
    return id;
  }
  
  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  function getSession() {
    let session = null;
    try {
      session = JSON.parse(getSessionItem('session') || 'null');
    } catch (e) {}
    
    const now = Date.now();
    
    if (!session || (now - session.lastActivity) > SESSION_TIMEOUT) {
      session = {
        id: 's_' + generateUUID(),
        startedAt: now,
        lastActivity: now,
        pageCount: 0,
        isNew: true
      };
    } else {
      session.isNew = false;
    }
    
    session.lastActivity = now;
    session.pageCount++;
    setSessionItem('session', JSON.stringify(session));
    
    return session;
  }
  
  // =============================================
  // UTM & ATTRIBUTION
  // =============================================
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function(key) {
      const value = params.get(key);
      if (value) {
        utm[key.replace('utm_', '')] = value;
      }
    });
    
    // Store first touch UTM
    if (Object.keys(utm).length > 0 && !getItem('first_utm')) {
      setItem('first_utm', JSON.stringify(utm));
      setItem('first_utm_time', new Date().toISOString());
    }
    
    return utm;
  }
  
  function getFirstTouchUTM() {
    try {
      return JSON.parse(getItem('first_utm') || '{}');
    } catch (e) {
      return {};
    }
  }
  
  function getLandingPage() {
    let landing = getItem('landing_page');
    if (!landing) {
      landing = window.location.href;
      setItem('landing_page', landing);
    }
    return landing;
  }

  function getReferrer() {
    // Get the original referrer (first touch)
    let firstReferrer = getItem('first_referrer');
    const currentReferrer = document.referrer || '';
    
    // Store first external referrer if not already stored
    if (!firstReferrer && currentReferrer) {
      // Check if referrer is external (different domain)
      try {
        const referrerHost = new URL(currentReferrer).hostname;
        const currentHost = window.location.hostname;
        
        // Only store if it's from a different domain
        if (referrerHost !== currentHost && !referrerHost.includes(currentHost) && !currentHost.includes(referrerHost)) {
          firstReferrer = currentReferrer;
          setItem('first_referrer', firstReferrer);
        }
      } catch (e) {
        // If URL parsing fails, store it anyway
        firstReferrer = currentReferrer;
        setItem('first_referrer', firstReferrer);
      }
    }
    
    return {
      current: currentReferrer,
      first: firstReferrer || currentReferrer || null
    };
  }

  function getClientTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      return null;
    }
  }
  
  // =============================================
  // DEVICE DETECTION
  // =============================================
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    let browser = 'unknown';
    let os = 'unknown';
    
    // Device type
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      deviceType = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';
    }
    
    // Browser detection
    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
    else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('Edg') > -1) browser = 'Edge';
    else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) browser = 'Opera';
    
    // OS detection
    if (ua.indexOf('Windows') > -1) os = 'Windows';
    else if (ua.indexOf('Mac') > -1) os = 'macOS';
    else if (ua.indexOf('Linux') > -1) os = 'Linux';
    else if (ua.indexOf('Android') > -1) os = 'Android';
    else if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) os = 'iOS';
    
    return {
      deviceType: deviceType,
      browser: browser,
      os: os,
      screenResolution: screen.width + 'x' + screen.height,
      userAgent: ua
    };
  }
  
  // =============================================
  // TRACKING FUNCTIONS
  // =============================================
  function track(event, data) {
    data = data || {};
    
    const visitorId = getVisitorId();
    const session = getSession();
    const fingerprint = generateFingerprint();
    const device = getDeviceInfo();
    const utm = getUTMParams();
    const firstUtm = getFirstTouchUTM();
    const referrerData = getReferrer();
    
    const payload = {
      event: event,
      visitorId: visitorId,
      sessionId: session.id,
      fingerprint: fingerprint,
      timestamp: new Date().toISOString(),
      isNewSession: session.isNew,
      data: Object.assign({
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
        referrer: referrerData.first || referrerData.current || '',
        currentReferrer: referrerData.current || '',
        landingPage: getLandingPage(),
        clientTimezone: getClientTimezone(),
        utm: utm,
        firstTouchUtm: firstUtm,
        device: device
      }, data)
    };
    
    // Send tracking data
    sendTrackingData(payload);
    
    return payload;
  }
  
  function sendTrackingData(payload) {
    const url = API_BASE + '/api/track';
    const data = JSON.stringify(payload);
    
    // Use sendBeacon for reliability (doesn't block page unload)
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return;
      } catch (e) {}
    }
    
    // Fallback to fetch
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data,
      keepalive: true
    }).catch(function() {});
  }
  
  // =============================================
  // PAGE VIEW TRACKING
  // =============================================
  let pageViewStart = Date.now();
  let maxScrollDepth = 0;
  let hasTrackedPageView = false;
  
  function trackPageView() {
    if (hasTrackedPageView) return;
    hasTrackedPageView = true;
    
    track('page_view', {
      pageViewStart: pageViewStart
    });
  }
  
  function trackPageLeave() {
    const timeOnPage = Math.round((Date.now() - pageViewStart) / 1000);
    track('page_leave', {
      timeOnPage: timeOnPage,
      scrollDepth: maxScrollDepth
    });
  }
  
  function updateScrollDepth() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    ) - window.innerHeight;
    
    if (docHeight > 0) {
      const scrollPercent = Math.min(100, Math.round((scrollTop / docHeight) * 100));
      maxScrollDepth = Math.max(maxScrollDepth, scrollPercent);
    }
  }
  
  // =============================================
  // PUBLIC API (for scheduler integration)
  // =============================================
  window.NexusTracker = {
    // Core tracking
    track: track,
    
    // Form-specific tracking
    trackFormOpened: function() {
      return track('form_opened', { step: 0 });
    },
    
    trackStepStarted: function(step) {
      return track('step_started', { step: step });
    },
    
    trackStepCompleted: function(step, data) {
      return track('step_completed', Object.assign({ step: step }, data || {}));
    },
    
    trackFormSubmitted: function(data) {
      return track('form_submitted', data || {});
    },
    
    trackFormAbandoned: function(step) {
      return track('form_abandoned', { step: step });
    },
    
    // Getters for scheduler to use
    getVisitorId: getVisitorId,
    getSessionId: function() { return getSession().id; },
    getFingerprint: generateFingerprint,
    getFirstTouchUTM: getFirstTouchUTM,
    getLandingPage: getLandingPage,
    getDeviceInfo: getDeviceInfo,
    
    // Attribution data bundle
    getAttribution: function() {
      return {
        visitorId: getVisitorId(),
        sessionId: getSession().id,
        fingerprint: generateFingerprint(),
        firstTouchUtm: getFirstTouchUTM(),
        currentUtm: getUTMParams(),
        landingPage: getLandingPage(),
        referrer: document.referrer,
        device: getDeviceInfo()
      };
    },
    
    // Version
    version: TRACKER_VERSION
  };
  
  // =============================================
  // INITIALIZE
  // =============================================
  function init() {
    // Track page view
    pageViewStart = Date.now();
    maxScrollDepth = 0;
    hasTrackedPageView = false;
    
    // Delay page view tracking slightly to capture more context
    setTimeout(trackPageView, 100);
    
    // Track scroll depth
    let scrollTimeout;
    window.addEventListener('scroll', function() {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateScrollDepth, 100);
    }, { passive: true });
    
    // Track page leave
    window.addEventListener('beforeunload', trackPageLeave);
    
    // Track visibility changes
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        trackPageLeave();
      }
    });
    
    // Handle SPA navigation (history changes)
    const originalPushState = history.pushState;
    history.pushState = function() {
      trackPageLeave();
      originalPushState.apply(this, arguments);
      
      // Reset for new page
      pageViewStart = Date.now();
      maxScrollDepth = 0;
      hasTrackedPageView = false;
      setTimeout(trackPageView, 100);
    };
    
    // Also handle popstate (back/forward)
    window.addEventListener('popstate', function() {
      pageViewStart = Date.now();
      maxScrollDepth = 0;
      hasTrackedPageView = false;
      setTimeout(trackPageView, 100);
    });
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
