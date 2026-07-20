/* Express Airways Common — Shared Auth, Animations, Toast, API, Tracker */
(function() {
  'use strict';

  var API = 'https://script.google.com/macros/s/AKfycbybXfKdhOFdXIOa2RTaF5YHeFWKYt6IU2_F87IH1LzvIzhU7UVEd4aVmK8_vKuAlBVp/exec';
  var AUTH_KEY = 'ea_session';

  /* ---- DOM helpers ---- */
  function $(id) { return document.getElementById(id); }
  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return document.querySelectorAll(s); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function hideEl(id) { var el = $(id); if (el) el.classList.add('hidden'); }
  function showEl(id) { var el = $(id); if (el) el.classList.remove('hidden'); }

  /* ---- Animation system ---- */
  var animationCSS = document.createElement('style');
  animationCSS.textContent =
    '.page-fade { animation:pageFade 0.5s ease }' +
    '@keyframes pageFade { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }' +
    '.fade-in-up { opacity:0; transform:translateY(24px); transition:opacity 0.6s ease, transform 0.6s ease }' +
    '.fade-in-up.visible { opacity:1; transform:translateY(0) }' +
    '.hero-bg-animated { position:absolute; inset:0; z-index:0; overflow:hidden }' +
    '.hero-bg-animated::before { content:""; position:absolute; inset:-50%; width:200%; height:200%; background:radial-gradient(ellipse 40% 40% at 30% 20%,rgba(79,140,255,0.08),transparent),radial-gradient(ellipse 30% 30% at 70% 80%,rgba(0,212,170,0.06),transparent); animation:bgDrift 20s ease-in-out infinite }' +
    '@keyframes bgDrift { 0%{transform:translate(0,0) rotate(0deg)} 25%{transform:translate(2%,-1%) rotate(1deg)} 50%{transform:translate(-1%,2%) rotate(-1deg)} 75%{transform:translate(1%,-2%) rotate(0.5deg)} 100%{transform:translate(0,0) rotate(0deg)} }' +
    '.float-particle { position:absolute; border-radius:50%; pointer-events:none; opacity:0.15; background:var(--accent) }' +
    '@keyframes floatUp { 0%{transform:translateY(100vh) scale(0)} 100%{transform:translateY(-100px) scale(1)} }' +
    '.card-hover { transition:transform 0.3s ease, box-shadow 0.3s ease }' +
    '.card-hover:hover { transform:translateY(-4px); box-shadow:0 12px 40px rgba(0,0,0,0.4) }' +
    '.glow-pulse { animation:glowPulse 3s ease-in-out infinite }' +
    '@keyframes glowPulse { 0%,100%{box-shadow:0 0 20px var(--accent-glow)} 50%{box-shadow:0 0 40px var(--accent-glow),0 0 60px var(--accent-glow)} }' +
    '.anim-shimmer{background:linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent);background-size:200% 100%;animation:shimmer 2.5s infinite}@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}' +
    '.anim-pulse{animation:pulse 2s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}' +
    '.anim-bounce{animation:bounce 2s ease infinite}@keyframes bounce{0%,20%,50%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}60%{transform:translateY(-4px)}}' +
    '.anim-scale-in{opacity:0;transform:scale(0.9);animation:scaleIn 0.4s ease forwards}@keyframes scaleIn{to{opacity:1;transform:scale(1)}}' +
    '.anim-slide-in-left{opacity:0;transform:translateX(-30px);animation:slideInLeft 0.5s ease forwards}@keyframes slideInLeft{to{opacity:1;transform:translateX(0)}}' +
    '.anim-slide-in-right{opacity:0;transform:translateX(30px);animation:slideInRight 0.5s ease forwards}@keyframes slideInRight{to{opacity:1;transform:translateX(0)}}' +
    '.anim-rotate{animation:rotate 8s linear infinite}@keyframes rotate{to{transform:rotate(360deg)}}' +
    '.card-glow:hover{box-shadow:0 0 30px var(--accent-glow),0 0 60px var(--accent-glow);transform:translateY(-4px)}' +
    '.hover-lift{transition:transform 0.3s ease,box-shadow 0.3s ease}.hover-lift:hover{transform:translateY(-6px);box-shadow:0 16px 48px rgba(0,0,0,0.5)}' +
    '.btn-shimmer{position:relative;overflow:hidden}.btn-shimmer::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);background-size:200% 100%;animation:shimmer 2.5s infinite}' +
    '.glow-text{text-shadow:0 0 20px var(--accent-glow),0 0 40px var(--accent-glow)}' +
    '.typewriter{border-right:2px solid var(--accent);overflow:hidden;white-space:nowrap;animation:typewriter 3s steps(40) 1s forwards,blink-caret 0.75s step-end infinite}@keyframes typewriter{from{width:0}to{width:100%}}@keyframes blink-caret{50%{border-color:transparent}}' +
    '.count-up{display:inline-block;animation:countUp 0.6s ease forwards}@keyframes countUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}' +
    '.float-card{animation:floatCard 4s ease-in-out infinite}@keyframes floatCard{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}' +
    '.rainbow-text{background:linear-gradient(90deg,#4f8cff,#00d4aa,#fbbf24,#ec4899,#4f8cff);background-size:300% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:rainbowShift 4s linear infinite}@keyframes rainbowShift{0%{background-position:0% 50%}100%{background-position:300% 50%}}' +
    '.confetti-piece{position:fixed;width:8px;height:8px;z-index:10001;pointer-events:none}@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}';
  document.head.appendChild(animationCSS);

  function initAnimations() {
    /* Fade-in-up on scroll */
    var els = qsa('.fade-in-up');
    if (els.length > 0) {
      var obs = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
      }, { threshold: 0.1 });
      els.forEach(function(el) { obs.observe(el); });
    }
    /* Floating particles in hero */
    var heroBgs = qsa('.hero-bg-animated');
    heroBgs.forEach(function(bg) {
      for (var i = 0; i < 12; i++) {
        var p = document.createElement('div');
        p.className = 'float-particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.width = p.style.height = (2 + Math.random() * 4) + 'px';
        p.style.animation = 'floatUp ' + (15 + Math.random() * 20) + 's linear ' + (Math.random() * 15) + 's infinite';
        p.style.opacity = 0.08 + Math.random() * 0.12;
        bg.appendChild(p);
      }
    });
    /* Page fade-in */
    document.body.classList.add('page-fade');
  }

  /* ---- Global card hover effects ---- */
  function initCardEffects() {
    document.addEventListener('mouseover', function(e) {
      var card = e.target.closest('.card, .section-card, .country-card, .joke-card, .quote-card, .weather-current, .forecast-card, .holding-card, .route-card, .profile-card, .stat-card, .crypto-card, .book-card, .tv-card, .fact-card, .activity-card, .preset-btn, .category-btn');
      if (card) { card.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease'; card.style.transform = 'translateY(-4px)'; card.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'; }
    });
    document.addEventListener('mouseout', function(e) {
      var card = e.target.closest('.card, .section-card, .country-card, .joke-card, .quote-card, .weather-current, .forecast-card, .holding-card, .route-card, .profile-card, .stat-card, .crypto-card, .book-card, .tv-card, .fact-card, .activity-card, .preset-btn, .category-btn');
      if (card) { card.style.transform = ''; card.style.boxShadow = ''; }
    });
  }

  /* ---- EA_TRACKER ---- */
  var EA_TRACKER = {
    API_URL: API,
    initialized: false,
    init: function(page) {
      if (this.initialized) return;
      this.initialized = true;
      this.page = page || window.location.pathname;
      this.fingerprint = this.getFingerprint();
      var self = this;
      this.getIP().then(function(ip) { self.ip = ip; self.send(); });
      this.send();
    },
    getFingerprint: function() {
      var c = document.createElement('canvas'); c.width = 200; c.height = 50;
      var t = c.getContext('2d'); t.textBaseline = 'top'; t.font = '14px Arial';
      t.fillStyle = '#f60'; t.fillRect(125, 1, 62, 20);
      t.fillStyle = '#069'; t.fillText('EA' + navigator.userAgent.length, 2, 15);
      t.fillStyle = 'rgba(102,204,0,0.7)'; t.fillText('ExpressAirways', 4, 17);
      var n = c.toDataURL(); var r = '';
      try { var i = document.createElement('canvas').getContext('webgl'); if (i) { var o = i.getExtension('WEBGL_debug_renderer_info'); if (o) r = i.getParameter(o.UNMASKED_RENDERER_WEBGL) + '|' + i.getParameter(o.UNMASKED_VENDOR_WEBGL); } } catch(e) {}
      var a = window.screen.width + 'x' + window.screen.height + 'x' + window.screen.colorDepth, s = Intl.DateTimeFormat().resolvedOptions().timeZone, l = navigator.language, ua = navigator.userAgent, raw = [n, r, a, s, l, ua].join('|||');
      var h = 0;
      for (var e = 0; e < raw.length; e++) { var p = raw.charCodeAt(e); h = (h << 5) - h + p; h |= 0; }
      return Math.abs(h).toString(16);
    },
    getIP: function() {
      return fetch('https://api.ipify.org?format=json', { cache: 'no-store' }).then(function(r) { return r.json(); }).then(function(d) { return d.ip; }).catch(function() { return ''; });
    },
    send: function() {
      var self = this;
      var e = { action: 'track', fingerprint: this.fingerprint, ip: this.ip || '', ua: navigator.userAgent, screen: window.screen.width + 'x' + window.screen.height + 'x' + window.screen.colorDepth, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, lang: navigator.language, page: this.page };
      var q = Object.entries(e).map(function(kv) { return encodeURIComponent(kv[0]) + '=' + encodeURIComponent(kv[1] || ''); }).join('&');
      fetch(this.API_URL + '?' + q + '&t=' + Date.now(), { mode: 'no-cors' }).catch(function() {});
    }
  };

  /* ---- AUTH SYSTEM ---- */
  var authListeners = [];
  var currentUser = null;

  function getStoredUser() {
    try {
      var raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (data && data.user && data.expires > Date.now()) return data.user;
      if (data && data.user) { localStorage.removeItem(AUTH_KEY); return null; }
      /* Legacy: some pages stored {username} format */
      if (data && data.username) {
        var legacyUser = { name: data.username, email: data.username, id: data.username, role: 'user' };
        var legacyData = { user: legacyUser, expires: Date.now() + 604800000 };
        localStorage.setItem(AUTH_KEY, JSON.stringify(legacyData));
        return legacyUser;
      }
      return null;
    } catch(e) { return null; }
  }

  function setUser(user) {
    if (!user) { localStorage.removeItem(AUTH_KEY); currentUser = null; notify(null); return; }
    var data = { user: user, expires: Date.now() + 604800000 };
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
    currentUser = user;
    notify(user);
    /* Manually dispatch for file:// cross-tab sync */
    try { window.dispatchEvent(new Event('ea-auth-changed')); } catch(e) {}
  }

  function notify(user) {
    currentUser = user;
    for (var i = 0; i < authListeners.length; i++) { try { authListeners[i](user); } catch(e) {} }
    /* Update nav across all pages */
    updateGlobalNav(user);
  }

  function onAuthChange(fn) {
    authListeners.push(fn);
    if (currentUser) fn(currentUser);
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY);
    currentUser = null;
    notify(null);
    try { window.dispatchEvent(new Event('ea-auth-changed')); } catch(e) {}
  }

  function updateGlobalNav(user) {
    var loginBtns = qsa('.nav-login-btn, #loginBtn, .nav-btn[onclick*="auth-modal"]');
    var signupBtns = qsa('.nav-signup-btn, #signupBtn');
    var userMenus = qsa('.nav-user-menu, #userMenu');
    var avatarEls = qsa('.nav-avatar-initials, #avatarInitials');
    var nameEls = qsa('.nav-dropdown-name, #dropdownName');
    var emailEls = qsa('.nav-dropdown-email, #dropdownEmail');
    var loginwalls = qsa('.loginwall, #loginwall');
    var navAuths = qsa('#nav-auth');

    if (user) {
      loginBtns.forEach(function(b) { b.classList.add('hidden'); });
      signupBtns.forEach(function(b) { b.classList.add('hidden'); });
      userMenus.forEach(function(m) { m.classList.remove('hidden'); });
      navAuths.forEach(function(n) { n.innerHTML = '<span class="nav-user" style="font-size:13px;font-weight:600;padding:4px 12px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06)">' + esc(user.name || 'User') + '</span><button class="nav-btn" onclick="window.authLogout();window.Toast(\'info\',\'Signed out\')" style="margin-left:8px;padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:#f0f4ff;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit">Logout</button>'; });
      loginwalls.forEach(function(w) { w.classList.add('hidden'); });
      var init = (user.name || 'U').split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
      avatarEls.forEach(function(a) { a.textContent = init || 'U'; });
      nameEls.forEach(function(n) { n.textContent = user.name || 'User'; });
      emailEls.forEach(function(e) { e.textContent = user.email || ''; });
    } else {
      loginBtns.forEach(function(b) { b.classList.remove('hidden'); });
      signupBtns.forEach(function(b) { b.classList.remove('hidden'); });
      userMenus.forEach(function(m) { m.classList.add('hidden'); });
      navAuths.forEach(function(n) { n.innerHTML = '<button class="nav-btn" onclick="window.showAuthModal&&window.showAuthModal()||(window.location.href=\'../account/index.html\')" style="padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:#f0f4ff;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit">Login</button>'; });
      loginwalls.forEach(function(w) { w.classList.remove('hidden'); });
    }
  }

  /* ---- TOAST ---- */
  function Toast(type, message, duration) {
    duration = duration || (type === 'error' ? 10000 : type === 'success' ? 8000 : 6000);
    var container = $('#toastContainer') || (function() {
      var c = document.createElement('div'); c.id = 'toastContainer'; c.className = 'toast-container';
      Object.assign(c.style, { position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' });
      document.body.appendChild(c); return c;
    })();
    var icons = { success: '\u2713', error: '\u2715', warning: '\u26A0', info: '\u2139' };
    var t = document.createElement('div');
    t.style.cssText = 'display:flex;align-items:center;gap:10px;padding:14px 20px;border-radius:12px;background:var(--bg-secondary,#0d1230);border:1px solid var(--border,rgba(255,255,255,0.06));box-shadow:0 8px 32px rgba(0,0,0,0.4);font-size:13px;font-weight:500;pointer-events:auto;max-width:400px;min-width:280px;animation:toastIn 0.35s ease forwards';
    t.innerHTML = '<span>' + (icons[type] || '') + '</span><span>' + message + '</span>';
    if (type === 'success') t.style.borderLeft = '3px solid #00d4aa';
    else if (type === 'error') t.style.borderLeft = '3px solid #ef4444';
    else if (type === 'warning') t.style.borderLeft = '3px solid #fbbf24';
    else t.style.borderLeft = '3px solid #4f8cff';
      if (type === 'success') { try { if (window.showConfetti) window.showConfetti(); } catch(e) {} }
    container.appendChild(t);
    setTimeout(function() { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(function() { t.remove(); }, 300); }, duration);
  }

  /* ---- API ---- */
  async function api(method, params, body) {
    for (var i = 0; i <= 1; i++) {
      try {
        var url = method === 'GET' ? API + '?' + new URLSearchParams(params) + '&t=' + Date.now() : API + '?t=' + Date.now();
        var controller = new AbortController();
        var timeout = setTimeout(function() { controller.abort(); }, 5000);
        var opts = { method: method, cache: 'no-store', headers: {}, signal: controller.signal };
        if (method === 'POST') { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body || {}); }
        var r = await fetch(url, opts);
        clearTimeout(timeout);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
      } catch(e) {
        if (i === 1) return null;
        await new Promise(function(r) { setTimeout(r, 1000 * (i + 1)); });
      }
    }
    return null;
  }

  /* ---- INIT ---- */
  document.addEventListener('DOMContentLoaded', function() {
    /* Init tracker */
    EA_TRACKER.API_URL = API;
    EA_TRACKER.init(window.location.pathname);

    /* Init auth from storage */
    currentUser = getStoredUser();
    if (currentUser) notify(currentUser);

    /* Listen for cross-tab auth changes (file:// dispatch) */
    window.addEventListener('ea-auth-changed', function() {
      var u = getStoredUser();
      if ((u && !currentUser) || (!u && currentUser) || (u && currentUser && u.email !== currentUser.email)) {
        currentUser = u;
        notify(u);
        Toast('info', u ? 'Session restored' : 'Signed out');
      }
    });
    /* Also listen for native storage events (server/origin pages) */
    window.addEventListener('storage', function(e) {
      if (e.key === AUTH_KEY) {
        var u = e.newValue ? (JSON.parse(e.newValue).user || null) : null;
        currentUser = u;
        notify(u);
      }
    });

    /* Heartbeat */
    setInterval(function() {
      var u = getStoredUser();
      fetch(API + '?action=heartbeat&user=' + encodeURIComponent((u && (u.email || '')) || '') + '&t=' + Date.now(), { mode: 'no-cors' }).catch(function() {});
    }, 60000);

    /* Init animations */
    initAnimations();
    initCardEffects();

    /* Page transitions for internal links */
    document.addEventListener('click', function(e) {
      var a = e.target.closest('a[href]');
      if (a && a.href && a.href.indexOf(window.location.host) > -1 && !a.hasAttribute('target') && !a.classList.contains('no-transition')) {
        var href = a.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('javascript:')) {
          e.preventDefault();
          var dest = a.href;
          document.body.style.opacity = '0';
          document.body.style.transform = 'translateY(10px)';
          document.body.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          setTimeout(function() { window.location.href = dest; }, 350);
        }
      }
    });

    /* Add glow-text to hero headlines */
    qsa('.hero-headline, .hero-title').forEach(function(el) { el.classList.add('glow-text'); });

    /* Add shimmer to primary buttons */
    qsa('.btn-primary').forEach(function(btn) { btn.classList.add('btn-shimmer'); });

    /* Animate stat numbers */
    qsa('.stat-number, .hero-badge').forEach(function(el) { el.classList.add('count-up'); });

    /* Add hover effects to footer links */
    qsa('.footer-col a').forEach(function(el) { el.classList.add('hover-lift'); });

    /* User menu dropdown toggle */
    document.addEventListener('click', function(e) {
      var um = e.target.closest('.user-avatar, #userMenu > *');
      if (um) {
        var dd = document.querySelector('.user-dropdown, #userDropdown');
        if (dd) dd.classList.toggle('hidden');
      } else {
        var dds = qsa('.user-dropdown, #userDropdown');
        dds.forEach(function(d) { d.classList.add('hidden'); });
      }
    });

    /* Logout buttons */
    document.addEventListener('click', function(e) {
      if (e.target.closest('#logoutBtn, .nav-logout-btn')) { e.preventDefault(); logout(); Toast('info', 'Signed out'); }
    });
  });

  /* ---- ERROR REPORTING ---- */
  function reportError(source, error, detail) {
    try {
      var user = getStoredUser();
      var data = {
        action: 'audit.event',
        eventType: 'error',
        source: source || '',
        error: (error && error.message) || (typeof error === 'string' ? error : '') || 'Unknown error',
        detail: detail || '',
        user: (user && (user.email || '')) || '',
        page: window.location.pathname,
        ua: navigator.userAgent,
        url: window.location.href
      };
      var qs = Object.entries(data).map(function(kv) { return encodeURIComponent(kv[0]) + '=' + encodeURIComponent(kv[1] || ''); }).join('&');
      fetch(API + '?' + qs + '&t=' + Date.now(), { mode: 'no-cors' }).catch(function() {});
    } catch(e) {}
  }

  /* ---- POPUP / ALERT SYSTEM ---- */
  function showAlert(title, message, type) {
    type = type || 'info';
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(8,12,26,0.85);backdrop-filter:blur(12px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.3s ease';
    var colors = { info: '#4f8cff', success: '#00d4aa', error: '#ef4444', warning: '#fbbf24' };
    var color = colors[type] || '#4f8cff';
    var icons = { info: '\u2139\uFE0F', success: '\u2705', error: '\u274C', warning: '\u26A0\uFE0F' };
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card,#0d1230);border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:24px;padding:40px;max-width:440px;width:100%;text-align:center;animation:scaleIn 0.3s ease;box-shadow:0 24px 80px rgba(0,0,0,0.5)';
    card.innerHTML = '<div style="font-size:48px;margin-bottom:16px">' + (icons[type]||'\u2139\uFE0F') + '</div><h3 style="font-size:22px;font-weight:800;margin-bottom:8px;color:' + color + '">' + title + '</h3><p style="font-size:14px;color:var(--text-secondary,#8892b0);line-height:1.6;margin-bottom:24px">' + message + '</p><button class="btn btn-primary" style="padding:12px 32px;font-size:15px;border-radius:12px;background:linear-gradient(135deg,' + color + ',' + color + 'dd);border:none;color:#fff;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.3s ease;box-shadow:0 4px 20px ' + color + '44" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 8px 30px ' + color + '66\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">OK</button>';
    var closeBtn = card.querySelector('button');
    closeBtn.addEventListener('click', function() { overlay.style.opacity = '0'; setTimeout(function() { overlay.remove(); }, 300); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) { overlay.style.opacity = '0'; setTimeout(function() { overlay.remove(); }, 300); } });
    card.addEventListener('click', function(e) { e.stopPropagation(); });
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  /* ---- CONFETTI ---- */
  function showConfetti() {
    var colors = ['#4f8cff','#00d4aa','#fbbf24','#ec4899','#8b5cf6','#06b6d4','#f97316'];
    for (var i = 0; i < 60; i++) {
      var c = document.createElement('div');
      c.style.cssText = 'position:fixed;width:' + (4+Math.random()*6) + 'px;height:' + (4+Math.random()*6) + 'px;background:' + colors[Math.floor(Math.random()*colors.length)] + ';border-radius:' + (Math.random()>0.5?'50%':'2px') + ';z-index:10001;pointer-events:none;left:' + Math.random()*100 + '%;top:-20px;animation:confettiFall ' + (2+Math.random()*3) + 's linear ' + (Math.random()*2) + 's forwards';
      document.body.appendChild(c);
      setTimeout(function(el) { el.remove(); }, 6000, c);
    }
  }

  /* ---- PAGE TRANSITION ---- */
  function navigateTo(url) {
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(10px)';
    document.body.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    setTimeout(function() { window.location.href = url; }, 350);
  }

  /* ---- EXPORT GLOBALS ---- */
  window.commonAPI = API;
  window.$ = $;
  window.qs = qs;
  window.qsa = qsa;
  window.esc = esc;
  window.hideEl = hideEl;
  window.showEl = showEl;
  window.Toast = Toast;
  window.api = api;
  window.authGetUser = getStoredUser;
  window.authSetUser = setUser;
  window.authLogout = logout;
  window.authOnChange = onAuthChange;
  window.EA_TRACKER = EA_TRACKER;
  window.currentUser = null;
  window.showModal = function(id) { var el = $(id); if (el) { el.classList.remove('hidden'); document.body.style.overflow = 'hidden'; function handler(ev) { if (ev.target === el) { window.hideModal(id); } } el.addEventListener('click', handler); } };
  window.hideModal = function(id) { var el = $(id); if (el) el.classList.add('hidden'); document.body.style.overflow = ''; };
  window.showAlert = showAlert;
  window.showConfetti = showConfetti;
  window.navigateTo = navigateTo;
  window.reportError = reportError;
})();
