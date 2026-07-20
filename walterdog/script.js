(function () {
  'use strict';

  var GAS_URL = 'https://script.google.com/macros/s/AKfycbybXfKdhOFdXIOa2RTaF5YHeFWKYt6IU2_F87IH1LzvIzhU7UVEd4aVmK8_vKuAlBVp/exec';
  var CONFIG = {
    PARTICLE_COUNT: 80, CONNECTION_DIST: 120, PARTICLE_SPEED: 0.6,
    HEARTBEAT_INTERVAL: 30000, TRACKING_VERSION: '2.0',
  };

  var state = {
    games: [], currentPage: 'home', selectedGenre: 'all', selectedSort: 'featured',
    searchQuery: '', currentGameId: null, isLoading: true,
    user: null, token: null, trackingConsented: false,
    gameAnalyticsId: null, gameOpenTime: null, gameStartScroll: 0,
    pageStartTime: Date.now(), viewMode: 'grid', perPage: 12, currentPageNum: 1,
    sessions: { clicks: 0, scrolls: 0, searches: 0, filters: 0, modals: 0, keypresses: 0, mouseMoves: 0, idleTime: 0, lastActive: Date.now() },
    leaderboardTab: 'topRated', leaderboardPeriod: 'all',
    achievementFilter: 'all', notificationCount: 0,
    communityTab: 'global', profileTab: 'games', lastPage: 'home',
    categories: ['featured','trending','newReleases','hiddenGems','topRated','mostPlayed'],
    lastGeoData: null, role: 'USER',
  };

  function callGAS(func) {
    var args = Array.prototype.slice.call(arguments, 1);
    var payload = { action: func, args: JSON.stringify(args), t: Date.now() };
    var qs = Object.keys(payload).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(payload[k]); }).join('&');
    return fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: qs })
      .then(function (r) {
        if (!r.ok) throw new Error('Server error ' + r.status);
        return r.text();
      })
      .then(function (t) {
        var d = JSON.parse(t);
        if (d && d.error) throw new Error(d.error);
        return d;
      })
      .catch(function (e) { throw new Error('Invalid response from server'); });
  }

  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function escapeHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  var fingerprint = '';
  var clientIP = '';

  function generateFingerprint() {
    try {
      var canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 50;
      var ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('WD' + navigator.userAgent.length, 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('WalterDog', 4, 17);
      var canvasFp = canvas.toDataURL();
      var glFp = '';
      try {
        var gl = document.createElement('canvas').getContext('webgl');
        if (gl) { var ext = gl.getExtension('WEBGL_debug_renderer_info'); if (ext) glFp = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) + '|' + gl.getParameter(ext.UNMASKED_VENDOR_WEBGL); }
      } catch (e) {}
      var screenRes = window.screen.width + 'x' + window.screen.height + 'x' + window.screen.colorDepth;
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      var lang = navigator.language;
      var ua = navigator.userAgent;
      var raw = [canvasFp, glFp, screenRes, tz, lang, ua].join('|||');
      var hash = 0;
      for (var i = 0; i < raw.length; i++) { var chr = raw.charCodeAt(i); hash = ((hash << 5) - hash) + chr; hash |= 0; }
      fingerprint = Math.abs(hash).toString(16);
    } catch (e) { fingerprint = 'unknown-' + Date.now(); }
  }

  function fetchIP() {
    return fetch('https://api.ipify.org?format=json')
      .then(function (r) { return r.json(); })
      .then(function (d) { clientIP = d.ip || ''; })
      .catch(function () {});
  }

  function getDeviceProfile() {
    return { fingerprint: fingerprint, ip: clientIP, ua: navigator.userAgent, screen: window.screen.width + 'x' + window.screen.height + 'x' + window.screen.colorDepth, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, lang: navigator.language };
  }

  function checkTrackingConsent() {
    var consented = localStorage.getItem('wds_tracking_consent');
    if (consented === 'true') { state.trackingConsented = true; return true; }
    var overlay = document.getElementById('consentOverlay');
    if (overlay) overlay.style.display = 'flex';
    return false;
  }

  function acceptTracking() {
    state.trackingConsented = true;
    localStorage.setItem('wds_tracking_consent', 'true');
    var overlay = document.getElementById('consentOverlay');
    if (overlay) { overlay.classList.add('fade-out'); setTimeout(function () { overlay.style.display = 'none'; overlay.classList.remove('fade-out'); }, 500); }
    startTracking();
  }

  var trackingInterval = null;
  var scrollTimer = null;
  var lastScrollDepth = 0;
  var maxScrollDepth = 0;
  var scrollDepthLogged = {};
  var clickLogTimer = null;
  var clickLogBuffer = [];
  var heartbeatTimer = null;

  function startTracking() {
    if (!state.trackingConsented) return;
    logEvent('page.view', state.currentPage, '', { url: window.location.href, referrer: document.referrer });
    window.addEventListener('scroll', function () {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var depth = Math.round((window.scrollY + window.innerHeight) / Math.max(document.body.scrollHeight, 1) * 100);
        if (depth > maxScrollDepth) maxScrollDepth = depth;
        state.sessions.scrolls++;
        logEvent('scroll', state.currentPage, '', { depth: depth, maxDepth: maxScrollDepth });
      }, 3000);
    });
    document.addEventListener('click', function (e) {
      state.sessions.clicks++;
      var el = e.target;
      var tag = el.tagName || '';
      var id = el.id || '';
      var cls = (typeof el.className === 'string' ? el.className : '') || '';
      var text = (el.textContent || '').trim().substring(0, 60);
      clickLogBuffer.push({ action: 'click', page: state.currentPage, element: tag + '#' + id, details: { class: cls, text: text, x: e.clientX, y: e.clientY } });
      if (clickLogTimer) clearTimeout(clickLogTimer);
      clickLogTimer = setTimeout(function () {
        for (var k = 0; k < clickLogBuffer.length; k++) { var ev = clickLogBuffer[k]; logEvent(ev.action, ev.page, ev.element, ev.details); }
        clickLogBuffer = [];
      }, 500);
    });
    heartbeatTimer = setInterval(function () {
      if (state.token) { callGAS('recordHeartbeat', state.token, state.currentPage).catch(function () {}); }
      logEvent('heartbeat', state.currentPage, '', { sessionClicks: state.sessions.clicks, sessionScrolls: state.sessions.scrolls });
    }, CONFIG.HEARTBEAT_INTERVAL);
    window.addEventListener('beforeunload', function () {
      logEvent('page.leave', state.currentPage, '', { timeOnPage: Math.round((Date.now() - state.pageStartTime) / 1000), maxScrollDepth: maxScrollDepth, totalClicks: state.sessions.clicks });
    });
  }

  function logEvent(action, page, element, detailsObj) {
    if (!state.trackingConsented) return;
    var details = detailsObj || {};
    if (state.lastGeoData) { details.geo = state.lastGeoData; }
    try {
      var payload = { action: 'track', fingerprint: fingerprint, ip: clientIP, ua: navigator.userAgent, page: page || state.currentPage, element: element || '', eventType: action, details: JSON.stringify(details), t: Date.now() };
      if (state.token) payload.token = state.token;
      var qs = Object.keys(payload).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(String(payload[k] || '')); }).join('&');
      fetch(GAS_URL + '?' + qs, { method: 'GET', mode: 'no-cors' }).then(function (r) {
        if (r.type === 'opaque') return;
        r.text().then(function (t) { try { var d = JSON.parse(t); if (d && d.geo) state.lastGeoData = d.geo; } catch (e) {} });
      }).catch(function () {});
    } catch (e) {}
  }

  function checkSession() {
    var token = localStorage.getItem('wds_token');
    if (!token) return Promise.resolve(null);
    state.token = token;
    return callGAS('validateSession', token).then(function (user) {
      if (user && user.userId) { state.user = user; updateAuthUI(); return user; }
      state.token = null; state.user = null; localStorage.removeItem('wds_token'); updateAuthUI(); return null;
    }).catch(function () { return null; });
  }

  function openLoginModal() {
    var overlay = document.getElementById('authOverlay');
    if (overlay) { overlay.style.display = 'flex'; document.getElementById('loginForm').style.display = 'block'; document.getElementById('signupForm').style.display = 'none'; document.getElementById('loginTab').classList.add('active'); document.getElementById('signupTab').classList.remove('active'); }
  }

  function openSignupModal() {
    var overlay = document.getElementById('authOverlay');
    if (overlay) { overlay.style.display = 'flex'; document.getElementById('signupForm').style.display = 'block'; document.getElementById('loginForm').style.display = 'none'; document.getElementById('signupTab').classList.add('active'); document.getElementById('loginTab').classList.remove('active'); }
  }

  function closeAuthModal() { var overlay = document.getElementById('authOverlay'); if (overlay) overlay.style.display = 'none'; }

  function updateAuthUI() {
    var loginBtn = document.getElementById('loginBtn');
    var registerBtn = document.getElementById('registerBtn');
    var userMenu = document.getElementById('userMenu');
    var userNameDisplay = document.getElementById('userNameDisplay');
    var notifBell = document.getElementById('notifBell');
    var adminLink = document.getElementById('dropAdminPanel');
    if (state.user) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (registerBtn) registerBtn.style.display = 'none';
      if (userMenu) userMenu.style.display = 'flex';
      if (userNameDisplay) userNameDisplay.textContent = state.user.username || 'User';
      if (notifBell) notifBell.style.display = 'flex';
      if (adminLink) adminLink.style.display = state.role === 'ADMIN' ? 'block' : 'none';
      loadNotifications();
      loadDashboard();
    } else {
      if (loginBtn) loginBtn.style.display = 'flex';
      if (registerBtn) registerBtn.style.display = 'flex';
      if (userMenu) userMenu.style.display = 'none';
      if (notifBell) notifBell.style.display = 'none';
      if (adminLink) adminLink.style.display = 'none';
      var dash = document.getElementById('dashboardSection');
      if (dash) dash.style.display = 'none';
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    var username = document.getElementById('loginUsername').value.trim();
    var password = document.getElementById('loginPassword').value;
    if (!username || !password) { showToast('Please fill in all fields', 'error'); return; }
    var btn = e.target.querySelector('button[type="submit"]') || e.target;
    btn.disabled = true; btn.textContent = 'Signing in...';
    var dp = getDeviceProfile();
    callGAS('loginUser', username, password, dp.ip, dp.fingerprint, dp.ua, dp.screen, dp.tz, dp.lang).then(function (res) {
      if (res.success) {
        state.token = res.token; state.user = { userId: res.userId, username: res.username };
        localStorage.setItem('wds_token', res.token);
        updateAuthUI(); closeAuthModal(); showToast('Welcome back, ' + res.username, 'success');
        logEvent('login', state.currentPage, '', { username: res.username });
        loadNotifications();
      } else { showToast(res.error || 'Login failed', 'error'); }
    }).catch(function (err) { showToast('Connection error: ' + err.message, 'error'); }).finally(function () { btn.disabled = false; btn.textContent = 'Sign In'; });
  }

  function handleSignup(e) {
    e.preventDefault();
    var username = document.getElementById('signupUsername').value.trim();
    var password = document.getElementById('signupPassword').value;
    var email = document.getElementById('signupEmail').value.trim();
    if (!username || !password || !email) { showToast('Please fill in all fields', 'error'); return; }
    if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    var btn = e.target.querySelector('button[type="submit"]') || e.target;
    btn.disabled = true; btn.textContent = 'Creating account...';
    var dp = getDeviceProfile();
    callGAS('registerUser', username, password, email, dp.ip, dp.fingerprint, dp.ua, dp.screen, dp.tz, dp.lang).then(function (res) {
      if (res.success) {
        showToast('Registration submitted. Your account requires manual approval. You will not be notified when approved. Please check back later to sign in.', 'info');
        logEvent('register', state.currentPage, '', { username: username });
        document.getElementById('signupForm').reset();
      } else { showToast(res.error || 'Registration failed', 'error'); }
    }).catch(function (err) { showToast('Connection error: ' + err.message, 'error'); }).finally(function () { btn.disabled = false; btn.textContent = 'Create Account'; });
  }

  function handleLogout() {
    if (state.token) callGAS('logoutUser', state.token).catch(function () {});
    state.token = null; state.user = null; state.gameAnalyticsId = null;
    localStorage.removeItem('wds_token');
    updateAuthUI(); showToast('Signed out', 'info');
    logEvent('logout', state.currentPage, '', {});
    document.getElementById('notifDropdown').style.display = 'none';
  }

  function showLoadingOverlay() {
    var overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex'; overlay.classList.remove('fade-out');
    void overlay.offsetWidth; overlay.classList.add('fade-in');
    typewriterEffect();
  }

  function hideLoadingOverlay() {
    var overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    overlay.classList.remove('fade-in'); overlay.classList.add('fade-out');
    setTimeout(function () { overlay.style.display = 'none'; overlay.classList.remove('fade-out'); }, 600);
  }

  var typewriterTimer = null;
  function typewriterEffect() {
    var el = document.getElementById('typewriterText');
    if (!el) return;
    var text = "Walter Dog's Game Spot";
    el.textContent = ''; el.style.visibility = 'visible';
    var i = 0;
    if (typewriterTimer) clearInterval(typewriterTimer);
    typewriterTimer = setInterval(function () {
      if (i < text.length) { el.textContent += text.charAt(i); i++; }
      else { clearInterval(typewriterTimer); typewriterTimer = null; var sub = document.getElementById('loadingSubtitle'); if (sub) { sub.style.opacity = '1'; sub.style.transform = 'translateY(0)'; } startDotAnimation(); }
    }, 60);
  }

  var dotInterval = null;
  function startDotAnimation() {
    var dots = document.getElementById('loadingDots');
    if (!dots) return;
    var count = 0;
    if (dotInterval) clearInterval(dotInterval);
    dotInterval = setInterval(function () { count = (count + 1) % 4; dots.textContent = '.'.repeat(count); }, 400);
  }
  function stopDotAnimation() { if (dotInterval) { clearInterval(dotInterval); dotInterval = null; } }

  var particles = [], particleCanvas, particleCtx, animFrameId;
  function initParticles() {
    particleCanvas = document.getElementById('particleCanvas');
    if (!particleCanvas) return;
    particleCtx = particleCanvas.getContext('2d');
    resizeParticleCanvas();
    window.addEventListener('resize', resizeParticleCanvas);
    createParticles();
    animateParticles();
  }
  function resizeParticleCanvas() { particleCanvas.width = window.innerWidth; particleCanvas.height = window.innerHeight; }
  function createParticles() {
    particles = [];
    for (var i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
      particles.push({ x: Math.random() * particleCanvas.width, y: Math.random() * particleCanvas.height, vx: (Math.random() - 0.5) * CONFIG.PARTICLE_SPEED, vy: (Math.random() - 0.5) * CONFIG.PARTICLE_SPEED, size: Math.random() * 2 + 0.5, alpha: Math.random() * 0.5 + 0.2 });
    }
  }
  function animateParticles() {
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = particleCanvas.width;
      if (p.x > particleCanvas.width) p.x = 0;
      if (p.y < 0) p.y = particleCanvas.height;
      if (p.y > particleCanvas.height) p.y = 0;
      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      particleCtx.fillStyle = 'rgba(0, 240, 255, ' + p.alpha + ')';
      particleCtx.fill();
      for (var j = i + 1; j < particles.length; j++) {
        var p2 = particles[j];
        var dx = p.x - p2.x, dy = p.y - p2.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.CONNECTION_DIST) {
          particleCtx.beginPath();
          particleCtx.moveTo(p.x, p.y);
          particleCtx.lineTo(p2.x, p2.y);
          particleCtx.strokeStyle = 'rgba(123, 47, 252, ' + ((1 - dist / CONFIG.CONNECTION_DIST) * 0.15) + ')';
          particleCtx.lineWidth = 0.5;
          particleCtx.stroke();
        }
      }
    }
    animFrameId = requestAnimationFrame(animateParticles);
  }
  var DOM = {};
  function cacheDOM() {
    var ids = ['navbar','gameGrid','featuredGrid','suggestionsGrid','trendingGrid','newReleasesGrid','hiddenGemsGrid','modalOverlay','modalClose','modalBody','searchInput','genreFilter','sortFilter','toastContainer','hamburger','navMenu','currentYear','navLogo','heroExplore','heroLearn','loginBtn','authClose','authOverlay','authForm','loginForm','signupForm','switchToSignup','switchToLogin','consentAccept','consentOverlay','gameRequestForm','statGames','statPlayers','statReviews','viewGrid','viewList','pagination','resultsInfo','notifBell','notifBadge','notifDropdown','notifDropdownBody','notifMarkAllRead','userDropdown','dropMyGames','dropMyReviews','dropMyFriends','dropMyAchievements','dropSettings','dropLogout','contactOverlay','contactClose','contactForm','contactName','contactEmail','contactSubject','contactMessage','footerContact','userNameDisplay','leaderboardPeriod','leaderboardContainer','leaderboardTabs','achievementGameFilter','achievementStats','achievementsContainer','communityFeed','friendSearchInput','sendFriendRequestBtn','friendRequestForm','categoriesGrid','categoryGames','categoryGamesGrid','categoryTitle','profileHeader','profileAvatar','profileUsername','profileMeta','profileStatsRow','profileTabs','profileContent','openRequestGameBtn','requestGameOverlay','requestGameClose','reqGameName','reqGenre','reqGameUrl','reqDescription','reqReason','dashboardSection'];
    for (var k = 0; k < ids.length; k++) { DOM[ids[k]] = document.getElementById(ids[k]); }
    DOM.navLinks = document.querySelectorAll('.nav-link');
    DOM.pages = document.querySelectorAll('.page');
    DOM.leaderboardTabEls = document.querySelectorAll('#leaderboardTabs .tab-item');
    DOM.communityTabEls = document.querySelectorAll('.community-tabs .tab-item');
    DOM.profileTabEls = document.querySelectorAll('#profileTabs .tab-item');
    DOM.catCards = document.querySelectorAll('.category-card');
    DOM.footerLinks = document.querySelectorAll('.footer-link');
    DOM.navDropdownItems = document.querySelectorAll('.nav-dropdown-item');
  }

  function renderStars(rating) {
    var full = Math.floor(rating), half = rating % 1 >= 0.5;
    var html = '<span class="stars">';
    for (var i = 1; i <= 5; i++) {
      if (i <= full) html += '<span class="star filled"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></span>';
      else if (i === full + 1 && half) html += '<span class="star half"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></span>';
      else html += '<span class="star"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></span>';
    }
    html += '</span><span class="rating-number">' + rating + '</span>';
    return html;
  }

  function genTagClass(genre) {
    var g = (genre || '').toLowerCase();
    if (['arcade', 'action', 'shooter'].indexOf(g) >= 0) return 'tag-magenta';
    if (['rpg', 'strategy'].indexOf(g) >= 0) return 'tag-purple';
    if (['puzzle'].indexOf(g) >= 0) return 'tag-green';
    if (['racing', 'sports'].indexOf(g) >= 0) return 'tag-yellow';
    return 'tag-cyan';
  }

  function createGameCard(game) {
    var card = document.createElement('div');
    card.className = 'game-card';
    card.style.animationDelay = (Math.random() * 0.3) + 's';
    var favClass = state.user && localStorage.getItem('fav_' + game.id) ? ' action-btn-active' : '';
    var wishClass = state.user && localStorage.getItem('wish_' + game.id) ? ' action-btn-active' : '';
    var playClass = state.user && localStorage.getItem('play_' + game.id) ? ' action-btn-active' : '';
    card.innerHTML =
      (game.featured === 'TRUE' ? '<div class="game-card-featured">FEATURED</div>' : '') +
      '<div class="game-card-players">' + (game.players || 'N/A') + ' players</div>' +
      '<img class="game-card-image" src="' + (game.coverUrl || '') + '" alt="' + (game.name || '') + '" loading="lazy" onerror="this.parentElement.classList.add(\'no-image\')">' +
      '<div class="game-card-body">' +
        '<div class="game-card-title">' + (game.name || 'Untitled') + '</div>' +
        '<div class="game-card-meta">' +
          '<span>' + (game.releaseYear || '') + '</span><span>&middot;</span><span>' + (game.developer || 'Unknown') + '</span>' +
        '</div>' +
        '<div class="game-card-tags">' +
          '<span class="tag ' + genTagClass(game.genre) + '">' + (game.genre || 'General') + '</span>' +
          '<span class="tag tag-cyan">' + (game.platform || 'Web') + '</span>' +
        '</div>' +
        '<div class="game-card-rating">' + renderStars(game.rating || 0) + '</div>' +
        (state.user ? '<div class="game-card-actions">' +
          '<span class="card-action fav-btn' + favClass + '" data-gid="' + game.id + '" data-type="fav" title="Favorites"><svg width="14" height="14" viewBox="0 0 24 24" fill="' + (favClass ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>' +
          '<span class="card-action wish-btn' + wishClass + '" data-gid="' + game.id + '" data-type="wish" title="Wishlist"><svg width="14" height="14" viewBox="0 0 24 24" fill="' + (wishClass ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></span>' +
          '<span class="card-action play-btn-small' + playClass + '" data-gid="' + game.id + '" data-type="play" title="Played"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></span>' +
        '</div>' : '') +
      '</div>';
    card.addEventListener('click', function (e) {
      if (e.target.closest('.card-action')) return;
      openGameModal(game.id, game.genre);
    });
    return card;
  }

  function renderGameGrid(games, container) {
    var grid = container || DOM.gameGrid;
    grid.innerHTML = '';
    if (!games || games.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4"/><path d="M14 12h4"/><circle cx="8" cy="10" r="1" fill="currentColor"/></svg></div><h3>NO GAMES FOUND</h3><p>Try adjusting your filters or search query</p></div>';
      if (DOM.resultsInfo) DOM.resultsInfo.textContent = '';
      return;
    }
    var displayGames = games;
    if (state.perPage > 0 && displayGames.length > state.perPage) {
      var start = (state.currentPageNum - 1) * state.perPage;
      displayGames = games.slice(start, start + state.perPage);
    }
    for (var i = 0; i < displayGames.length; i++) grid.appendChild(createGameCard(displayGames[i]));
    renderPagination(games.length);
    if (DOM.resultsInfo) {
      var showing = Math.min(games.length, state.perPage > 0 ? state.perPage : games.length);
      DOM.resultsInfo.textContent = 'Showing ' + showing + ' of ' + games.length + ' games';
    }
  }

  function renderPagination(total) {
    if (!DOM.pagination) return;
    DOM.pagination.innerHTML = '';
    if (state.perPage <= 0 || total <= state.perPage) return;
    var pages = Math.ceil(total / state.perPage);
    if (pages <= 1) return;
    for (var i = 1; i <= pages; i++) {
      var btn = document.createElement('span');
      btn.className = 'page-btn' + (i === state.currentPageNum ? ' active' : '');
      btn.textContent = i;
      btn.addEventListener('click', function (p) { return function () { state.currentPageNum = p; renderGameGrid(getFilteredGames()); }; }(i));
      DOM.pagination.appendChild(btn);
    }
  }

  function renderSection(containerId, games, limit) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var parent = el.closest('.section') || el.parentElement;
    if (!games || games.length === 0) { if (parent) parent.style.display = 'none'; return; }
    if (parent) parent.style.display = 'block';
    var slice = limit ? games.slice(0, limit) : games;
    el.innerHTML = '';
    for (var i = 0; i < slice.length; i++) el.appendChild(createGameCard(slice[i]));
  }
  function openGameModal(gameId, genre) {
    state.currentGameId = gameId;
    state.gameOpenTime = Date.now();
    state.gameStartScroll = window.scrollY;
    var body = document.getElementById('modalBody');
    body.innerHTML = '<div class="loading-spinner" style="padding:4rem"><div class="spinner"></div></div>';
    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    if (state.token) {
      callGAS('logGameOpen', gameId, state.token, state.searchQuery ? 'search' : (state.selectedGenre !== 'all' ? 'filter' : 'browse')).then(function (res) { if (res && res.analyticsId) state.gameAnalyticsId = res.analyticsId; }).catch(function () {});
    }
    logEvent('game.open', 'game=' + gameId, '', { gameId: gameId, genre: genre });
    state.sessions.modals++;
    loadGameDetail(gameId);
  }

  function closeGameModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
    if (state.token && state.gameAnalyticsId && state.gameOpenTime) {
      var dur = Math.round((Date.now() - state.gameOpenTime) / 1000);
      callGAS('logGameClose', state.gameAnalyticsId, state.token, dur, maxScrollDepth, state.sessions.clicks % 100).catch(function () {});
    }
    logEvent('game.close', 'game=' + state.currentGameId, '', { duration: state.gameOpenTime ? Math.round((Date.now() - state.gameOpenTime) / 1000) : 0 });
    state.gameAnalyticsId = null; state.gameOpenTime = null; state.currentGameId = null;
  }

  async function loadGameDetail(id) {
    try {
      var calls = [callGAS('getGame', id), callGAS('getGameRating', id), callGAS('getAchievements', id), callGAS('getGameSeriesByGame', id), callGAS('getSimilarGames', id)];
      var results = await Promise.all(calls);
      var game = results[0], rating = results[1], achievements = results[2], series = results[3], similar = results[4];
      if (!game) { document.getElementById('modalBody').innerHTML = '<div class="empty-state" style="padding:4rem"><h3>GAME NOT FOUND</h3></div>'; return; }
      renderGameDetail(game, rating, achievements, series, similar);
    } catch (err) {
      document.getElementById('modalBody').innerHTML = '<div class="empty-state" style="padding:4rem"><h3>ERROR LOADING GAME</h3><p>' + err.message + '</p></div>';
    }
  }

  function renderGameDetail(game, rating, achievements, series, similar) {
    var g = game;
    var favClass = state.user && localStorage.getItem('fav_' + g.id) ? ' action-btn-active' : '';
    var wishClass = state.user && localStorage.getItem('wish_' + g.id) ? ' action-btn-active' : '';
    var playClass = state.user && localStorage.getItem('play_' + g.id) ? ' action-btn-active' : '';
    var ratingDist = '';
    if (rating && rating.distribution) {
      ratingDist = '<div class="rating-dist"><h4 class="form-heading">Rating Distribution</h4>';
      for (var s = 5; s >= 1; s--) {
        var count = rating.distribution[s] || 0;
        var pct = rating.count > 0 ? (count / rating.count * 100) : 0;
        ratingDist += '<div class="dist-row"><span class="dist-label">' + s + '</span><div class="dist-bar"><div class="dist-fill" style="width:' + pct + '%"></div></div><span class="dist-count">' + count + '</span></div>';
      }
      ratingDist += '</div>';
    }
    var achieveHtml = '';
    if (achievements && achievements.length > 0) {
      achieveHtml = '<div class="modal-section"><h3 class="section-subtitle"><span style="color:var(--neon-green)">//</span> Achievements</h3><div class="achieve-list">';
      for (var a = 0; a < Math.min(achievements.length, 8); a++) {
        var ach = achievements[a];
        achieveHtml += '<div class="achieve-item"><span class="achieve-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M12 2v6"/><path d="M12 14v8"/><path d="M8 22h8"/></svg></span><span class="achieve-name">' + (ach.name || ach.achievement || '') + '</span><span class="achieve-rarity tag tag-' + (ach.rarity === 'legendary' ? 'magenta' : ach.rarity === 'epic' ? 'purple' : ach.rarity === 'rare' ? 'yellow' : 'green') + '">' + (ach.rarity || 'common') + '</span></div>';
      }
      achieveHtml += '</div></div>';
    }
    var seriesHtml = '';
    if (series && series.length > 0) {
      seriesHtml = '<div class="modal-section"><h3 class="section-subtitle"><span style="color:var(--neon-yellow)">//</span> Series</h3><div class="series-list">' + series.map(function (s) { return '<span class="series-item">' + (s.name || s) + '</span>'; }).join('') + '</div></div>';
    }
    var similarHtml = '';
    if (similar && similar.length > 0) {
      similarHtml = '<div class="modal-section"><h3 class="section-subtitle"><span style="color:var(--neon-cyan)">//</span> Similar Games</h3><div class="similar-grid">';
      for (var sg = 0; sg < Math.min(similar.length, 5); sg++) {
        similarHtml += '<div class="similar-card" data-sid="' + (similar[sg].id || '') + '"><img src="' + (similar[sg].coverUrl || '') + '" alt="" onerror="this.style.display=\'none\'"><div class="similar-name">' + (similar[sg].name || '') + '</div></div>';
      }
      similarHtml += '</div></div>';
    }
    var addReviewHtml = state.user
      ? '<div class="add-review-form" id="addReviewForm">' +
          '<h4 class="form-heading">WRITE A REVIEW</h4>' +
          '<div class="form-group"><label class="form-label">Rating</label><div class="star-rating-input" id="starRatingInput">' +
          '<input type="radio" id="rstar5" name="reviewRating" value="5"><label for="rstar5"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></label>' +
          '<input type="radio" id="rstar4" name="reviewRating" value="4"><label for="rstar4"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></label>' +
          '<input type="radio" id="rstar3" name="reviewRating" value="3"><label for="rstar3"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></label>' +
          '<input type="radio" id="rstar2" name="reviewRating" value="2"><label for="rstar2"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></label>' +
          '<input type="radio" id="rstar1" name="reviewRating" value="1"><label for="rstar1"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></label>' +
          '</div></div>' +
          '<div class="form-group"><label class="form-label">Review</label><textarea class="form-textarea" id="reviewText" placeholder="Share your thoughts..." rows="3"></textarea></div>' +
          '<button class="btn-submit" id="submitReview">Submit Review</button>' +
        '</div>'
      : '<div class="empty-state" style="padding:1.5rem;text-align:center"><p><a href="#" onclick="window.WDSopenLogin ? window.WDSopenLogin() : null;return false" style="color:var(--neon-cyan);text-decoration:underline">Sign in</a> to write a review.</p></div>';
    var addCommentHtml = state.user
      ? '<div class="add-comment-form" id="addCommentForm">' +
          '<h4 class="form-heading">LEAVE A COMMENT</h4>' +
          '<div class="form-group"><label class="form-label">Comment</label><textarea class="form-textarea" id="commentText" placeholder="Join the discussion..." rows="2"></textarea></div>' +
          '<button class="btn-submit" id="submitComment">Post Comment</button>' +
        '</div>'
      : '<div class="empty-state" style="padding:1.5rem;text-align:center"><p><a href="#" onclick="window.WDSopenLogin ? window.WDSopenLogin() : null;return false" style="color:var(--neon-cyan);text-decoration:underline">Sign in</a> to leave a comment.</p></div>';
    document.getElementById('modalBody').innerHTML =
      '<div class="modal-header">' +
        '<img src="' + (g.coverUrl || '') + '" alt="' + (g.name || '') + '" onerror="this.style.display=\'none\'">' +
        '<div class="modal-header-overlay"></div>' +
        '<div class="modal-header-badge"><span class="tag ' + genTagClass(g.genre) + '" style="font-size:0.8rem;padding:5px 16px">' + (g.genre || 'General') + '</span></div>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="modal-top-actions">' +
          (state.user ? '<span class="modal-action-btn fav-btn' + favClass + '" data-gid="' + g.id + '" data-type="fav" title="Favorite"><svg width="16" height="16" viewBox="0 0 24 24" fill="' + (favClass ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>' : '') +
          (state.user ? '<span class="modal-action-btn wish-btn' + wishClass + '" data-gid="' + g.id + '" data-type="wish" title="Wishlist"><svg width="16" height="16" viewBox="0 0 24 24" fill="' + (wishClass ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></span>' : '') +
          (state.user ? '<span class="modal-action-btn play-btn-small' + playClass + '" data-gid="' + g.id + '" data-type="play" title="Played"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></span>' : '') +
          '<span class="modal-action-btn" id="shareGameBtn" title="Share"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></span>' +
          '<span class="modal-action-btn" id="reportGameBtn" title="Report"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>' +
        '</div>' +
        '<h2 class="modal-title">' + (g.name || 'Untitled') + '</h2>' +
        '<div class="modal-meta">' +
          '<span class="modal-meta-item"><span style="color:var(--neon-yellow)">*</span> ' + (g.rating || 'N/A') + '</span>' +
          '<span class="modal-meta-item"><span style="color:var(--neon-cyan)">@</span> ' + (g.releaseYear || 'TBA') + '</span>' +
          '<span class="modal-meta-item"><span style="color:var(--neon-magenta)">#</span> ' + (g.developer || 'Unknown') + '</span>' +
          '<span class="modal-meta-item"><span style="color:var(--neon-green)">~</span> ' + (g.players || 'N/A') + ' players</span>' +
          '<span class="modal-meta-item"><span style="color:var(--neon-purple)">+</span> ' + (g.platform || 'Web') + '</span>' +
          (g.publisher ? '<span class="modal-meta-item"><span style="color:var(--neon-cyan)">#</span> ' + g.publisher + '</span>' : '') +
          (g.contentWarning ? '<span class="modal-meta-item"><span style="color:var(--neon-red)">!</span> ' + g.contentWarning + '</span>' : '') +
        '</div>' +
        '<p class="modal-description">' + (g.description || 'No description available.') + '</p>' +
        '<div class="modal-actions">' +
          '<a href="' + (g.gameUrl || '#') + '" target="_blank" rel="noopener" class="play-btn">PLAY NOW</a>' +
        '</div>' +
        (ratingDist || '') +
        (achieveHtml || '') +
        (seriesHtml || '') +
        (similarHtml || '') +
        '<div class="review-section" id="reviewSection">' +
          '<div class="review-section-header">' +
            '<h3 class="section-subtitle"><span style="color:var(--neon-cyan)">//</span> Reviews</h3>' +
            '<div class="review-controls">' +
              '<select class="filter-select" id="reviewFilterRating"><option value="0">All Ratings</option><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select>' +
              '<select class="filter-select" id="reviewSort"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="highest">Highest</option><option value="lowest">Lowest</option></select>' +
            '</div>' +
          '</div>' +
          '<div class="review-summary">' +
            '<div class="review-big-score"><div class="score">' + (rating.avg || 0) + '</div><div class="label">' + (rating.count || 0) + ' reviews</div></div>' +
            '<div>' + renderStars(rating.avg || 0) + '</div>' +
          '</div>' +
          '<div class="review-list" id="reviewList"><div class="loading-spinner"><div class="spinner"></div></div></div>' +
          addReviewHtml +
        '</div>' +
        '<div class="comment-section" id="commentSection">' +
          '<div class="comment-section-header">' +
            '<h3 class="section-subtitle"><span style="color:var(--neon-magenta)">//</span> Comments</h3>' +
            '<select class="filter-select" id="commentSort"><option value="newest">Newest</option><option value="oldest">Oldest</option></select>' +
          '</div>' +
          '<div class="comment-list" id="commentList"><div class="loading-spinner"><div class="spinner"></div></div></div>' +
          addCommentHtml +
        '</div>' +
      '</div>';
    loadReviews(g.id);
    loadComments(g.id);
    if (state.user) { setupReviewSubmit(g.id); setupCommentSubmit(g.id); }
    setupCardActions();
    var shareBtn = document.getElementById('shareGameBtn');
    if (shareBtn) shareBtn.addEventListener('click', function () { if (navigator.share) { navigator.share({ title: g.name, url: window.location.href }); } else { navigator.clipboard.writeText(window.location.href).then(function () { showToast('Link copied!', 'success'); }); } });
    var reportBtn = document.getElementById('reportGameBtn');
    if (reportBtn) reportBtn.addEventListener('click', function () { showToast('Game reported. Thank you.', 'info'); callGAS('reportGame', g.id, state.token || 'anonymous', 'reported').catch(function () {}); });
    var simCards = document.querySelectorAll('.similar-card');
    for (var si = 0; si < simCards.length; si++) {
      simCards[si].addEventListener('click', function () { var sid = this.dataset.sid; if (sid) { closeGameModal(); setTimeout(function () { openGameModal(sid); }, 300); } });
    }
    var reviewFilter = document.getElementById('reviewFilterRating');
    var reviewSort = document.getElementById('reviewSort');
    var commentSort = document.getElementById('commentSort');
    if (reviewFilter) reviewFilter.addEventListener('change', function () { loadReviews(g.id); });
    if (reviewSort) reviewSort.addEventListener('change', function () { loadReviews(g.id); });
    if (commentSort) commentSort.addEventListener('change', function () { loadComments(g.id); });
  }

  async function loadReviews(gameId) {
    var list = document.getElementById('reviewList');
    if (!list) return;
    try {
      var reviews = await callGAS('getReviews', gameId);
      if (!reviews || reviews.length === 0) { list.innerHTML = '<div class="empty-state" style="padding:2rem"><p>No reviews yet. Be the first!</p></div>'; return; }
      var filterVal = document.getElementById('reviewFilterRating').value || '0';
      var sortVal = document.getElementById('reviewSort').value || 'newest';
      if (filterVal !== '0') { reviews = reviews.filter(function (r) { return Number(r.rating) === Number(filterVal); }); }
      reviews.sort(function (a, b) {
        if (sortVal === 'newest') return new Date(b.date || 0) - new Date(a.date || 0);
        if (sortVal === 'oldest') return new Date(a.date || 0) - new Date(b.date || 0);
        if (sortVal === 'highest') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        if (sortVal === 'lowest') return (Number(a.rating) || 0) - (Number(b.rating) || 0);
        return 0;
      });
      list.innerHTML = reviews.map(function (r) {
        var canUpvote = state.user && r.userId !== state.user.userId;
        return '<div class="review-card">' +
          '<div class="review-header">' +
            '<div class="review-avatar">' + (r.userName || 'A')[0].toUpperCase() + '</div>' +
            '<span class="review-user">' + (r.userName || 'Anonymous') + '</span>' +
            renderStars(Number(r.rating) || 0) +
            '<span class="review-date">' + formatDate(r.date) + '</span>' +
          '</div>' +
          '<div class="review-text">' + (r.text || '') + '</div>' +
          '<div class="review-footer">' +
            (canUpvote ? '<span class="vote-btn upvote" data-rid="' + (r.id || '') + '" data-type="review"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg> <span class="vote-count">' + (r.upvotes || 0) + '</span></span>' : '') +
            (canUpvote ? '<span class="vote-btn downvote" data-rid="' + (r.id || '') + '" data-type="review"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg> <span class="vote-count">' + (r.downvotes || 0) + '</span></span>' : '') +
          '</div>' +
        '</div>';
      }).join('');
      setupVoteButtons();
    } catch (err) { if (list) list.innerHTML = '<div class="empty-state" style="padding:2rem"><p>Could not load reviews</p></div>'; }
  }

  function setupReviewSubmit(gameId) {
    var btn = document.getElementById('submitReview');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      var ratingEl = document.querySelector('input[name="reviewRating"]:checked');
      var text = document.getElementById('reviewText').value.trim();
      if (!ratingEl) { showToast('Please select a rating', 'error'); return; }
      if (!text) { showToast('Please write a review', 'error'); return; }
      btn.disabled = true; btn.textContent = 'Submitting...';
      try {
        var res = await callGAS('addReview', gameId, state.token, Number(ratingEl.value), text);
        if (res && res.success) { showToast('Review submitted', 'success'); logEvent('review.submit', 'game=' + gameId, '', {}); document.getElementById('reviewText').value = ''; var checked = document.querySelector('input[name="reviewRating"]:checked'); if (checked) checked.checked = false; loadReviews(gameId); }
        else { showToast(res && res.error ? res.error : 'Failed to submit', 'error'); }
      } catch (err) { showToast('Error: ' + err.message, 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Submit Review'; }
    });
  }

  async function loadComments(gameId) {
    var list = document.getElementById('commentList');
    if (!list) return;
    try {
      var comments = await callGAS('getComments', gameId);
      if (!comments || comments.length === 0) { list.innerHTML = '<div class="empty-state" style="padding:2rem"><p>No comments yet.</p></div>'; return; }
      var sortVal = document.getElementById('commentSort').value || 'newest';
      comments.sort(function (a, b) {
        if (sortVal === 'newest') return new Date(b.date || 0) - new Date(a.date || 0);
        return new Date(a.date || 0) - new Date(b.date || 0);
      });
      list.innerHTML = comments.map(function (c) {
        var canUpvote = state.user && c.userId !== state.user.userId;
        return '<div class="comment-card">' +
          '<div class="comment-avatar">' + (c.userName || 'A')[0].toUpperCase() + '</div>' +
          '<div class="comment-content">' +
            '<div class="comment-user">' + (c.userName || 'Anonymous') + '</div>' +
            '<div class="comment-text">' + (c.text || '') + '</div>' +
            '<div class="comment-date">' + formatDate(c.date) + '</div>' +
            '<div class="comment-footer">' +
              (canUpvote ? '<span class="vote-btn upvote" data-rid="' + (c.id || '') + '" data-type="comment"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg> <span class="vote-count">' + (c.upvotes || 0) + '</span></span>' : '') +
              (canUpvote ? '<span class="vote-btn downvote" data-rid="' + (c.id || '') + '" data-type="comment"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg> <span class="vote-count">' + (c.downvotes || 0) + '</span></span>' : '') +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
      setupVoteButtons();
    } catch (err) { if (list) list.innerHTML = '<div class="empty-state" style="padding:2rem"><p>Could not load comments</p></div>'; }
  }

  function setupCommentSubmit(gameId) {
    var btn = document.getElementById('submitComment');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      var text = document.getElementById('commentText').value.trim();
      if (!text) { showToast('Please write a comment', 'error'); return; }
      btn.disabled = true; btn.textContent = 'Posting...';
      try {
        var res = await callGAS('addComment', gameId, state.token, text);
        if (res && res.success) { showToast('Comment posted', 'success'); logEvent('comment.submit', 'game=' + gameId, '', {}); document.getElementById('commentText').value = ''; loadComments(gameId); }
        else { showToast(res && res.error ? res.error : 'Failed to post', 'error'); }
      } catch (err) { showToast('Error: ' + err.message, 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Post Comment'; }
    });
  }
  function setupVoteButtons() {
    var btns = document.querySelectorAll('.vote-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', async function () {
        if (!state.token) { showToast('Sign in to vote', 'error'); return; }
        var type = this.dataset.type;
        var id = this.dataset.rid;
        var isUpvote = this.classList.contains('upvote');
        var endpoint = type === 'review' ? 'voteReview' : 'voteComment';
        try {
          var res = await callGAS(endpoint, id, state.token, isUpvote);
          if (res && res.success) {
            this.querySelector('.vote-count').textContent = res.newCount || Number(this.querySelector('.vote-count').textContent) + (isUpvote ? 1 : -1);
            showToast('Vote recorded', 'success');
          }
        } catch (err) { showToast('Error voting', 'error'); }
      });
    }
  }

  function setupCardActions() {
    var favBtns = document.querySelectorAll('.fav-btn');
    var wishBtns = document.querySelectorAll('.wish-btn');
    var playBtns = document.querySelectorAll('.play-btn-small');
    for (var f = 0; f < favBtns.length; f++) {
      favBtns[f].addEventListener('click', function () { toggleCardAction(this, 'fav', 'Favorite'); });
    }
    for (var w = 0; w < wishBtns.length; w++) {
      wishBtns[w].addEventListener('click', function () { toggleCardAction(this, 'wish', 'Wishlist'); });
    }
    for (var p = 0; p < playBtns.length; p++) {
      playBtns[p].addEventListener('click', function () { toggleCardAction(this, 'play', 'Played'); });
    }
  }

  async function toggleCardAction(el, type, label) {
    if (!state.token) { showToast('Sign in to ' + label.toLowerCase(), 'error'); return; }
    var gid = el.dataset.gid;
    var key = type + '_' + gid;
    var active = localStorage.getItem(key);
    var action = active ? 'remove' : 'add';
    try {
      var res = await callGAS('toggleAction', gid, state.token, type, action);
      if (res && res.success) {
        if (action === 'add') { localStorage.setItem(key, '1'); el.classList.add('action-btn-active'); el.querySelector('svg').setAttribute('fill', 'currentColor'); showToast('Added to ' + label, 'success'); }
        else { localStorage.removeItem(key); el.classList.remove('action-btn-active'); el.querySelector('svg').setAttribute('fill', 'none'); showToast('Removed from ' + label, 'info'); }
      } else { showToast(res && res.error ? res.error : 'Failed', 'error'); }
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  }

  function formatDate(d) {
    if (!d) return '';
    try {
      var dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d).slice(0, 10);
      return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return String(d).slice(0, 10); }
  }

  var FILTER_STATE = { genre: 'all', year: 'all', sort: 'new', view: 'grid', page: 1 };
  var searchTimeout = null;

  function initSearch() {
    var sb = document.getElementById('searchInput');
    if (!sb) return;
    sb.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        state.searchQuery = sb.value.trim();
        FILTER_STATE.page = 1;
        if (state.searchQuery.length >= 2 || state.searchQuery.length === 0) { loadGames(); logEvent('search', 'query=' + state.searchQuery, '', { query: state.searchQuery }); }
      }, 400);
    });
  }

  function initFilterButtons() {
    var genreBtns = document.querySelectorAll('.genre-btn');
    for (var g = 0; g < genreBtns.length; g++) {
      genreBtns[g].addEventListener('click', function () {
        var genre = this.dataset.genre || 'all';
        FILTER_STATE.genre = genre; FILTER_STATE.page = 1;
        document.querySelectorAll('.genre-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        loadGames();
      });
    }
    var sortEl = document.getElementById('sortSelect');
    if (sortEl) {
      sortEl.addEventListener('change', function () { FILTER_STATE.sort = this.value; FILTER_STATE.page = 1; loadGames(); });
    }
    var viewToggles = document.querySelectorAll('.view-toggle');
    for (var v = 0; v < viewToggles.length; v++) {
      viewToggles[v].addEventListener('click', function () {
        var view = this.dataset.view || 'grid';
        FILTER_STATE.view = view;
        document.querySelectorAll('.view-toggle').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        var grid = document.getElementById('gameGrid');
        if (grid) { grid.className = view === 'grid' ? 'game-grid' : 'game-grid list-view'; }
      });
    }
    var yearEl = document.getElementById('yearSelect');
    if (yearEl) {
      yearEl.addEventListener('change', function () { FILTER_STATE.year = this.value; FILTER_STATE.page = 1; loadGames(); });
    }
  }

  function initNav() {
    var dropdownToggles = document.querySelectorAll('.nav-link[data-toggle="dropdown"]');
    for (var i = 0; i < dropdownToggles.length; i++) {
      dropdownToggles[i].addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var parent = this.closest('.nav-item');
        var wasOpen = parent.classList.contains('open');
        document.querySelectorAll('.nav-item.open').forEach(function (n) { n.classList.remove('open'); });
        if (!wasOpen) parent.classList.add('open');
      });
    }
    document.addEventListener('click', function () {
      document.querySelectorAll('.nav-item.open').forEach(function (n) { n.classList.remove('open'); });
    });
    var dropdownItems = document.querySelectorAll('.nav-dropdown-item');
    for (var d = 0; d < dropdownItems.length; d++) {
      dropdownItems[d].addEventListener('click', function (e) {
        var page = this.dataset.page;
        if (page) {
          e.preventDefault();
          document.querySelectorAll('.nav-item.open').forEach(function (n) { n.classList.remove('open'); });
          state.currentPage = page;
          showPage(page);
        }
      });
    }
    var hamburger = document.getElementById('hamburger');
    if (hamburger) {
      hamburger.addEventListener('click', function () {
        document.querySelector('.nav-links').classList.toggle('open');
      });
    }
    // Hero buttons
    var heroExplore = document.getElementById('heroExplore');
    if (heroExplore) heroExplore.addEventListener('click', function () { showPage('games'); });
    var heroLearn = document.getElementById('heroLearn');
    if (heroLearn) heroLearn.addEventListener('click', function () {
      if (!state.token) { openAuthModal(); return; }
      var featured = document.getElementById('featuredSection');
      if (featured) featured.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function updateNavActive(page) {
    qsa('.nav-link[data-page]').forEach(function (l) { l.classList.toggle('active', l.dataset.page === page); });
    qsa('.nav-dropdown-item').forEach(function (d) {
      var dd = d.closest('.nav-item');
      if (dd) dd.querySelector('.nav-link').classList.toggle('active', d.dataset.page === page);
    });
  }

  function showPage(page) {
    if (!state.token && page !== 'home') {
      openAuthModal();
      return;
    }
    var pageMap = { home: 'pageHome', games: 'pageGames', leaderboards: 'pageLeaderboards', leaderboard: 'pageLeaderboards', achievements: 'pageAchievements', achievement: 'pageAchievements', community: 'pageCommunity', profile: 'pageProfile', categories: 'pageCategories', category: 'pageCategories', admin: 'pageAdmin' };
    var targetId = pageMap[page] || 'pageHome';
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) { pages[i].classList.toggle('active', pages[i].id === targetId); }
    state.currentPage = page;
    updateNavActive(page);
    if (page === 'leaderboards' || page === 'leaderboard') loadLeaderboard();
    else if (page === 'achievements' || page === 'achievement') loadAchievementsPage();
    else if (page === 'community') loadCommunity();
    else if (page === 'profile') loadProfile();
    else if (page === 'games') loadGames();
    else if (page === 'categories' || page === 'category') initCategories();
    else if (page === 'admin') loadAdminTab('dashboard');
    else if (page === 'home') loadHomeContent();
  }

  function loadHomeContent() {
    var showGames = !!state.token;
    var sections = ['featuredSection', 'trendingSection', 'newReleasesSection', 'hiddenGemsSection'];
    for (var i = 0; i < sections.length; i++) {
      var el = document.getElementById(sections[i]);
      if (el) el.style.display = showGames ? '' : 'none';
    }
    if (state.token) {
      loadDashboard();
    } else {
      var ds = document.getElementById('dashboardSection');
      if (ds) ds.style.display = 'none';
    }
    var hero = document.getElementById('heroExplore');
    if (hero) hero.textContent = state.token ? 'Explore Games' : 'Sign In to Play';
    var heroStats = document.querySelector('.hero-stats');
    if (heroStats) heroStats.style.display = state.token ? 'flex' : 'none';
  }

  function getFilteredGames() {
    var games = state.games || [];
    if (state.searchQuery) {
      var q = state.searchQuery.toLowerCase();
      games = games.filter(function (g) { return (g.name || '').toLowerCase().indexOf(q) >= 0 || (g.genre || '').toLowerCase().indexOf(q) >= 0 || (g.developer || '').toLowerCase().indexOf(q) >= 0; });
    }
    if (state.selectedGenre && state.selectedGenre !== 'all') {
      games = games.filter(function (g) { return (g.genre || '').toLowerCase() === state.selectedGenre.toLowerCase(); });
    }
    if (state.selectedSort === 'rating') games.sort(function (a, b) { return (Number(b.rating) || 0) - (Number(a.rating) || 0); });
    else if (state.selectedSort === 'name') games.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
    else if (state.selectedSort === 'newest') games.sort(function (a, b) { return (Number(b.releaseYear) || 0) - (Number(a.releaseYear) || 0); });
    else games.sort(function (a, b) { return (Number(b.rating) || 0) - (Number(a.rating) || 0); });
    return games;
  }

  async function loadGames() {
    try {
      var genreEl = document.getElementById('genreFilter');
      if (genreEl && genreEl.options.length <= 1) {
        var genres = await callGAS('getGenres');
        if (genres && genres.length > 0) {
          for (var gi = 0; gi < genres.length; gi++) {
            var opt = document.createElement('option');
            opt.value = genres[gi].toLowerCase();
            opt.textContent = genres[gi];
            genreEl.appendChild(opt);
          }
        }
      }
      var data = await callGAS('getAllGames');
      if (!data || data.length === 0) { DOM.gameGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:4rem"><div class="icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4"/><path d="M14 12h4"/><circle cx="8" cy="10" r="1" fill="currentColor"/></svg></div><h3 style="font-family:var(--font-heading);margin-bottom:0.5rem">NO GAMES FOUND</h3><p style="font-family:var(--font-alt);color:var(--text-muted)">The game library is empty. Check back later!</p></div>'; return; }
      state.games = data;
      var featured = data.filter(function (g) { return g.featured === 'TRUE' || g.featured === true; });
      var trending = data.filter(function (g) { return g.trending === 'TRUE' || g.trending === true; });
      var newRels = data.filter(function (g) { return Number(g.releaseYear) >= 2024; });
      var hidden = data.filter(function (g) { return g.hidden === 'TRUE' || g.hidden === true; });
      if (featured.length > 0) renderSection('featuredGrid', featured, 6);
      if (trending.length > 0) renderSection('trendingGrid', trending, 6);
      if (newRels.length > 0) renderSection('newReleasesGrid', newRels, 6);
      if (hidden.length > 0) renderSection('hiddenGemsGrid', hidden, 6);
      // Hero stats
      var avgRating = 0;
      for (var ri = 0; ri < data.length; ri++) avgRating += Number(data[ri].rating) || 0;
      avgRating = data.length > 0 ? (avgRating / data.length).toFixed(1) : 'N/A';
      if (DOM.statGames) DOM.statGames.textContent = data.length;
      if (DOM.statPlayers) DOM.statPlayers.textContent = '1.2K';
      if (DOM.statReviews) DOM.statReviews.textContent = avgRating;
      // All games page
      var filtered = getFilteredGames();
      renderGameGrid(filtered, DOM.gameGrid);
    } catch (err) {
      if (DOM.gameGrid) DOM.gameGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:4rem"><h3>COULD NOT LOAD GAMES</h3><p style="font-family:var(--font-alt);color:var(--text-muted)">' + err.message + '</p></div>';
    }
  }

  async function loadDashboard() {
    var ds = document.getElementById('dashboardSection');
    if (!ds) return;
    ds.style.display = 'block';
    ds.innerHTML = '<div class="dashboard-grid"><div class="dashboard-welcome dashboard-card"><h3><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Welcome back, <span id="welcomeUser">Player</span></h3><p style="color:var(--text-secondary);font-family:var(--font-alt);font-size:0.9rem">Here is your gaming overview.</p></div><div class="dashboard-card"><h3><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4"/><path d="M14 12h4"/></svg> Your Stats</h3><div class="dashboard-stats"><div class="dash-stat"><span class="dash-stat-num" id="statGames">0</span><span class="dash-stat-label">Games Played</span></div><div class="dash-stat"><span class="dash-stat-num" id="statReviews">0</span><span class="dash-stat-label">Reviews</span></div><div class="dash-stat"><span class="dash-stat-num" id="statAchievements">0</span><span class="dash-stat-label">Achievements</span></div><div class="dash-stat"><span class="dash-stat-num" id="statSessions">1</span><span class="dash-stat-label">Sessions</span></div></div></div><div class="dashboard-card"><h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Session Tracking</h3><div id="trackingStats"><div class="loading-spinner"><div class="spinner"></div></div></div></div><div class="dashboard-card"><h3><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 22V2h4v20"/></svg> Leaderboard</h3><div id="miniLeaderboard"><div class="loading-spinner"><div class="spinner"></div></div></div><a href="#" class="dashboard-link" onclick="showPage(\'leaderboards\');return false">View Full Leaderboard <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></a></div><div class="dashboard-card"><h3><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg> Recommended</h3><div id="dashboardRecs"><div class="loading-spinner"><div class="spinner"></div></div></div></div><div class="dashboard-card"><h3><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Activity Feed</h3><div id="activityFeed"><div class="loading-spinner"><div class="spinner"></div></div></div></div><div class="dashboard-card"><h3><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Quick Actions</h3><div class="dashboard-actions" id="quickActions"></div></div></div>';
    try {
      var userData = await callGAS('getUserDashboard', state.token);
      var leaderData = await callGAS('getLeaderboard');
      if (userData) {
        var wn = document.getElementById('welcomeUser'); if (wn) wn.textContent = userData.userName || 'Player';
        var sg = document.getElementById('statGames'); if (sg) sg.textContent = userData.gamesPlayed || 0;
        var sr = document.getElementById('statReviews'); if (sr) sr.textContent = userData.reviewsWritten || 0;
        var sa = document.getElementById('statAchievements'); if (sa) sa.textContent = userData.achievements || 0;
        var ss = document.getElementById('statSessions'); if (ss) ss.textContent = state.sessions.visits || 1;
      }
      var lb = document.getElementById('miniLeaderboard');
      if (lb && leaderData && leaderData.length > 0) {
        lb.innerHTML = leaderData.slice(0, 5).map(function (u, i) {
          return '<div class="lb-snippet-item"><span class="lb-snippet-rank">#' + (i + 1) + '</span><span class="lb-snippet-name">' + (u.userName || 'Player') + '</span><span class="lb-snippet-score">' + (u.points || 0) + '</span></div>';
        }).join('');
      }
      var recsEl = document.getElementById('dashboardRecs');
      if (recsEl) {
        try {
          var recs = await callGAS('getRecommendations', state.token, 4);
          if (recs && recs.length > 0) {
            recsEl.innerHTML = '<div class="similar-grid">' + recs.map(function (r) {
              return '<div class="similar-card" onclick="openGameModal(\'' + (r.id || '') + '\',\'' + (r.genre || '') + '\')"><img src="' + (r.coverUrl || '') + '" alt="" onerror="this.style.display=\'none\'"><div class="similar-name">' + (r.name || '') + '</div></div>';
            }).join('') + '</div>';
          } else recsEl.innerHTML = '<div class="empty-state"><p>Play more games for recommendations!</p></div>';
        } catch (e) { recsEl.innerHTML = '<div class="empty-state"><p>No recommendations yet.</p></div>'; }
      }
      var feedEl = document.getElementById('activityFeed');
      if (feedEl) {
        try {
          var feed = await callGAS('getActivityFeed', state.token, 10);
          if (feed && feed.length > 0) {
            feedEl.innerHTML = feed.map(function (f) {
              return '<div class="activity-item"><span class="act-user">' + (f.userName || '') + '</span><span class="act-text">' + (f.text || '') + '</span><span class="act-time">' + formatDate(f.date) + '</span></div>';
            }).join('');
          } else feedEl.innerHTML = '<div class="empty-state"><p>No activity yet.</p></div>';
        } catch (e) { feedEl.innerHTML = '<div class="empty-state"><p>Could not load activity.</p></div>'; }
      }
      var actions = document.getElementById('quickActions');
      if (actions) {
        actions.innerHTML = '<a href="#" class="dash-action-btn" onclick="showPage(\'games\');return false">Browse Games</a><a href="#" class="dash-action-btn" onclick="showPage(\'profile\');return false">View Profile</a><a href="#" class="dash-action-btn" onclick="openGameRequestModal();return false">Request Game</a>';
      var trackingEl = document.getElementById('trackingStats');
      if (trackingEl) {
        trackingEl.innerHTML = '<div class="dashboard-stats"><div class="dash-stat"><span class="dash-stat-num">' + state.sessions.clicks + '</span><span class="dash-stat-label">Clicks</span></div><div class="dash-stat"><span class="dash-stat-num">' + state.sessions.keypresses + '</span><span class="dash-stat-label">Keypresses</span></div><div class="dash-stat"><span class="dash-stat-num">' + state.sessions.mouseMoves + '</span><span class="dash-stat-label">Mouse Moves</span></div><div class="dash-stat"><span class="dash-stat-num">' + Math.round(state.sessions.idleTime / 1000) + 's</span><span class="dash-stat-label">Idle</span></div><div class="dash-stat"><span class="dash-stat-num">' + state.sessions.searches + '</span><span class="dash-stat-label">Searches</span></div><div class="dash-stat"><span class="dash-stat-num">' + state.sessions.filters + '</span><span class="dash-stat-label">Filters</span></div></div>';
      }
      }
    } catch (err) { ds.innerHTML = '<div class="empty-state" style="padding:2rem"><p>Could not load dashboard</p></div>'; }
  }

  async function loadLeaderboard() {
    var lb = document.getElementById('leaderboardContainer');
    if (!lb) return;
    try {
      var data = await callGAS('getLeaderboard');
      if (!data || data.length === 0) { lb.innerHTML = '<div class="empty-state" style="padding:3rem"><p>No leaderboard data yet</p></div>'; return; }
      var html = '<table class="leaderboard-table"><thead><tr><th>Rank</th><th>Player</th><th>Points</th><th>Games</th><th>Achievements</th></tr></thead><tbody>';
      for (var i = 0; i < data.length; i++) {
        var u = data[i];
        var cls = i < 3 ? ' class="highlight-row"' : '';
        html += '<tr' + cls + '><td class="rank-cell">#' + (i + 1) + '</td><td>' + (u.userName || 'Player') + '</td><td>' + (u.points || 0) + '</td><td>' + (u.gamesPlayed || 0) + '</td><td>' + (u.achievements || 0) + '</td></tr>';
      }
      html += '</tbody></table>';
      lb.innerHTML = html;
    } catch (err) { lb.innerHTML = '<div class="empty-state" style="padding:3rem"><p>Error loading leaderboard</p></div>'; }
    // Bind leaderboard tabs
    var tabs = document.querySelectorAll('#leaderboardTabs .tab-item');
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].addEventListener('click', function () {
        document.querySelectorAll('#leaderboardTabs .tab-item').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        state.leaderboardTab = this.dataset.lbtab;
        loadLeaderboard();
      });
    }
    var periodEl = document.getElementById('leaderboardPeriod');
    if (periodEl) {
      periodEl.addEventListener('change', function () { state.leaderboardPeriod = this.value; loadLeaderboard(); });
    }
  }

  async function loadAchievementsPage() {
    var ac = document.getElementById('achievementsContainer');
    if (!ac) return;
    var user = state.user;
    try {
      var allAch = await callGAS('getAllAchievements');
      var userAch = state.token ? (await callGAS('getUserAchievements', state.token)) || [] : [];
      var userAchMap = {};
      for (var i = 0; i < userAch.length; i++) { userAchMap[userAch[i].id || userAch[i].achievementId] = true; }
      if (!allAch || allAch.length === 0) { ac.innerHTML = '<div class="empty-state" style="padding:3rem"><p>No achievements configured yet</p></div>'; return; }
      ac.innerHTML = '<div class="achieve-summary">' +
        '<div class="achieve-progress-circle"><svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="35" fill="none" stroke="var(--border-color)" stroke-width="6"/><circle cx="40" cy="40" r="35" fill="none" stroke="var(--neon-green)" stroke-width="6" stroke-dasharray="220" stroke-dashoffset="' + (220 - 220 * userAch.length / Math.max(allAch.length, 1)) + '" stroke-linecap="round" transform="rotate(-90 40 40)"/><text x="40" y="40" text-anchor="middle" dominant-baseline="central" fill="currentColor" font-size="18" font-weight="700">' + userAch.length + '/' + allAch.length + '</text></svg></div>' +
        '<div class="achieve-stats"><span class="achieve-pct">' + Math.round(userAch.length / Math.max(allAch.length, 1) * 100) + '%</span><span class="achieve-label">Complete</span></div></div>' +
        '<div class="achieve-grid">' +
        allAch.map(function (a) {
          var unlocked = userAchMap[a.id || a.achievementId];
          var rarity = a.rarity || 'common';
          return '<div class="achieve-card' + (unlocked ? '' : ' locked') + '">' +
            '<div class="achieve-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="' + (unlocked ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M12 2v6"/><path d="M12 14v8"/><path d="M8 22h8"/></svg></div>' +
            '<div class="achieve-card-name">' + (a.name || '') + '</div>' +
            '<div class="achieve-card-desc">' + (a.description || '') + '</div>' +
            '<span class="tag tag-' + (rarity === 'legendary' ? 'magenta' : rarity === 'epic' ? 'purple' : rarity === 'rare' ? 'yellow' : 'green') + '">' + rarity + '</span>' +
          '</div>';
        }).join('') + '</div>';
    } catch (err) { ac.innerHTML = '<div class="empty-state" style="padding:3rem"><p>Error loading achievements</p></div>'; }
    // Bind achievement game filter
    var gameFilter = document.getElementById('achievementGameFilter');
    if (gameFilter) gameFilter.addEventListener('change', function () { state.achievementFilter = this.value; loadAchievementsPage(); });
  }

  async function loadCommunity() {
    var cm = document.getElementById('communityFeed');
    if (!cm) return;
    try {
      var tab = state.communityTab || 'global';
      var data;
      if (tab === 'friends' && state.token) data = await callGAS('getFriendActivity', state.token, 30);
      else if (tab === 'requests' && state.token) data = await callGAS('getFriendRequests', state.token);
      else data = await callGAS('getGlobalActivity', 30);
      if (!data || data.length === 0) { cm.innerHTML = '<div class="empty-state" style="padding:3rem"><p>' + (tab === 'requests' ? 'No pending friend requests' : 'No community activity yet') + '</p></div>'; return; }
      cm.innerHTML = data.map(function (f) {
        return '<div class="feed-card"><div class="feed-avatar">' + (f.userName || 'A')[0].toUpperCase() + '</div><div class="feed-content"><div class="feed-user">' + (f.userName || 'Anonymous') + '</div><div class="feed-text">' + (f.text || '') + '</div><div class="feed-date">' + formatDate(f.date) + '</div></div></div>';
      }).join('');
      // Show friend request form on requests tab
      var frForm = document.getElementById('friendRequestForm');
      if (frForm) frForm.style.display = tab === 'requests' ? 'block' : 'none';
    } catch (err) { cm.innerHTML = '<div class="empty-state" style="padding:3rem"><p>Error loading community</p></div>'; }
    // Bind community tabs
    var tabs = document.querySelectorAll('.community-tabs .tab-item');
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].addEventListener('click', function () {
        document.querySelectorAll('.community-tabs .tab-item').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        state.communityTab = this.dataset.commTab || this.dataset.commtab || 'global';
        loadCommunity();
      });
    }
    // Friend request send
    var friendBtn = document.getElementById('sendFriendRequestBtn');
    if (friendBtn) {
      friendBtn.addEventListener('click', async function () {
        if (!state.token) { showToast('Sign in to send friend requests', 'error'); return; }
        var username = document.getElementById('friendSearchInput').value.trim();
        if (!username) { showToast('Enter a username', 'error'); return; }
        friendBtn.disabled = true; friendBtn.textContent = 'Sending...';
        try {
          var res = await callGAS('sendFriendRequest', state.token, username);
          if (res && res.success) { showToast('Friend request sent!', 'success'); document.getElementById('friendSearchInput').value = ''; }
          else { showToast(res && res.error ? res.error : 'Failed to send', 'error'); }
        } catch (err) { showToast('Error: ' + err.message, 'error'); }
        finally { friendBtn.disabled = false; friendBtn.textContent = 'Send Request'; }
      });
    }
  }

  async function loadProfile() {
    if (!state.token) { document.getElementById('profileContent').innerHTML = '<div class="empty-state" style="padding:3rem"><p>Sign in to view your profile</p></div>'; return; }
    var pc = document.getElementById('profileContent');
    if (!pc) return;
    try {
      var data = await callGAS('getProfile', state.token);
      if (!data) { pc.innerHTML = '<div class="empty-state" style="padding:3rem"><p>Could not load profile</p></div>'; return; }
      var stats = data.stats || {};
      pc.innerHTML = '<div class="profile-header-card">' +
        '<div class="profile-avatar-large">' + (data.userName || 'P')[0].toUpperCase() + '</div>' +
        '<div class="profile-info"><h2>' + (data.userName || 'Player') + '</h2><p>' + (data.bio || 'No bio set') + '</p></div>' +
      '</div>' +
      '<div class="profile-stats-grid">' +
        '<div class="stat-card"><div class="stat-value">' + (stats.gamesPlayed || 0) + '</div><div class="stat-label">Games Played</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + (stats.reviewsWritten || 0) + '</div><div class="stat-label">Reviews</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + (stats.achievements || 0) + '</div><div class="stat-label">Achievements</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + (stats.favorites || 0) + '</div><div class="stat-label">Favorites</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + (stats.wishlist || 0) + '</div><div class="stat-label">Wishlist</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + (stats.points || 0) + '</div><div class="stat-label">Total Points</div></div>' +
      '</div>';
      if (data.favorites && data.favorites.length > 0) {
        pc.innerHTML += '<h3 class="section-subtitle" style="margin-top:1.5rem"><span style="color:var(--neon-red)">//</span> Favorite Games</h3><div class="similar-grid">' +
          data.favorites.map(function (g) {
            return '<div class="similar-card" onclick="openGameModal(\'' + (g.id || '') + '\',\'' + (g.genre || '') + '\')"><img src="' + (g.coverUrl || '') + '" alt="" onerror="this.style.display=\'none\'"><div class="similar-name">' + (g.name || '') + '</div></div>';
          }).join('') + '</div>';
      }
      logEvent('profile.view', '', '', {});
    } catch (err) { pc.innerHTML = '<div class="empty-state" style="padding:3rem"><p>Error loading profile</p></div>'; }
    // Bind profile tabs
    var ptabs = document.querySelectorAll('#profileTabs .tab-item');
    for (var pt = 0; pt < ptabs.length; pt++) {
      ptabs[pt].addEventListener('click', function () {
        document.querySelectorAll('#profileTabs .tab-item').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        state.profileTab = this.dataset.ptab || 'games';
        loadProfileTab(state.profileTab);
      });
    }
  }

  async function loadProfileTab(tab) {
    var pc = document.getElementById('profileContent');
    if (!pc || !state.token) return;
    try {
      var data;
      if (tab === 'games') data = await callGAS('getUserGames', state.token);
      else if (tab === 'reviews') data = await callGAS('getUserReviews', state.token);
      else if (tab === 'comments') data = await callGAS('getUserComments', state.token);
      else if (tab === 'friends') data = await callGAS('getFriends', state.token);
      else if (tab === 'achievements') data = await callGAS('getUserAchievements', state.token);
      if (!data || data.length === 0) { pc.innerHTML = '<div class="empty-state" style="padding:2rem"><p>No ' + tab + ' yet</p></div>'; return; }
      if (tab === 'games') {
        pc.innerHTML = '<div class="game-grid">' + data.map(function (g) {
          return '<div class="game-card" onclick="openGameModal(\'' + (g.id || '') + '\',\'' + (g.genre || '') + '\')"><div class="game-card-body"><div class="game-card-title">' + (g.name || '') + '</div></div></div>';
        }).join('') + '</div>';
      } else if (tab === 'reviews') {
        pc.innerHTML = data.map(function (r) {
          return '<div class="review-card"><div class="review-header"><span class="review-user">' + (r.gameName || 'Game') + '</span>' + renderStars(Number(r.rating) || 0) + '<span class="review-date">' + formatDate(r.date) + '</span></div><div class="review-text">' + (r.text || '') + '</div></div>';
        }).join('');
      } else if (tab === 'comments') {
        pc.innerHTML = data.map(function (c) {
          return '<div class="comment-card"><div class="comment-content"><div class="comment-text">' + (c.text || '') + '</div><div class="comment-date">' + formatDate(c.date) + '</div></div></div>';
        }).join('');
      } else if (tab === 'friends') {
        pc.innerHTML = data.map(function (f) {
          return '<div class="feed-card"><div class="feed-avatar">' + (f.userName || 'F')[0].toUpperCase() + '</div><div class="feed-content"><div class="feed-user">' + (f.userName || 'Friend') + '</div><div class="feed-text">' + (f.status || 'connected') + '</div></div></div>';
        }).join('');
      } else if (tab === 'achievements') {
        pc.innerHTML = data.map(function (a) {
          return '<div class="achieve-item"><span class="achieve-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M12 2v6"/><path d="M12 14v8"/><path d="M8 22h8"/></svg></span><span class="achieve-name">' + (a.name || a.achievement || '') + '</span></div>';
        }).join('');
      }
    } catch (err) { pc.innerHTML = '<div class="empty-state" style="padding:2rem"><p>Error loading ' + tab + '</p></div>'; }
  }

  function initCategories() {
    var cat = document.getElementById('categoriesGrid');
    if (!cat) return;
    var genreList = ['action', 'adventure', 'rpg', 'shooter', 'strategy', 'simulation', 'sports', 'racing', 'fighting', 'platformer', 'puzzle', 'horror', 'sandbox', 'open-world', 'stealth', 'survival', 'rhythm', 'educational'];
    cat.innerHTML = '<div class="categories-grid">' +
      genreList.map(function (g) {
        return '<div class="category-card" onclick="state.selectedGenre=\'' + g + '\';showPage(\'games\');document.getElementById(\'gamesTab\').click()">' +
          '<div class="category-name">' + g.charAt(0).toUpperCase() + g.slice(1) + '</div>' +
        '</div>';
      }).join('') + '</div>';
  }

  function openGameRequestModal() {
    var overlay = document.getElementById('requestGameOverlay');
    if (overlay) overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeGameRequestModal() {
    var overlay = document.getElementById('requestGameOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  function initGameRequest() {
    var form = document.getElementById('gameRequestForm');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = document.getElementById('reqGameName').value.trim();
      var genre = document.getElementById('reqGenre').value;
      var url = document.getElementById('reqGameUrl').value.trim();
      var desc = document.getElementById('reqDescription').value.trim();
      var reason = document.getElementById('reqReason').value.trim();
      if (!name || !genre) { showToast('Please provide game name and genre', 'error'); return; }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Submitting...';
      try {
        var res = await callGAS('requestGame', state.token || 'anonymous', 'request', name, genre, url, desc, reason);
        if (res && res.success) { showToast('Game request submitted!', 'success'); form.reset(); closeGameRequestModal(); logEvent('game.request', 'name=' + name, '', {}); }
        else { showToast(res && res.error ? res.error : 'Failed to submit', 'error'); }
      } catch (err) { showToast('Error: ' + err.message, 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Submit Request'; }
    });
    var closeBtn = document.getElementById('requestGameClose');
    if (closeBtn) closeBtn.addEventListener('click', closeGameRequestModal);
  }

  function showToast(message, type) {
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var colors = { success: 'var(--neon-green)', error: 'var(--neon-red)', info: 'var(--neon-cyan)' };
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = 'background:var(--darker-bg);border:1px solid ' + (colors[type] || 'var(--border-color)') + ';color:var(--text-color);padding:12px 20px;border-radius:8px;margin-bottom:8px;animation:slideIn 0.3s ease;font-family:var(--font-mono);font-size:0.85rem;box-shadow:0 4px 12px rgba(0,0,0,0.4);position:relative';
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(function () { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300); }, 3000);
  }
  function openSubmitGameModal() {
    var overlay = document.getElementById('submitGameOverlay');
    if (overlay) overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeSubmitGameModal() {
    var overlay = document.getElementById('submitGameOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  function initSubmitGame() {
    var form = document.getElementById('submitGameForm');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = document.getElementById('subGameName').value.trim();
      var repo = document.getElementById('subGameRepo').value.trim();
      var genre = document.getElementById('subGameGenre').value;
      var platform = document.getElementById('subGamePlatform').value;
      var desc = document.getElementById('subGameDesc').value.trim();
      if (!name || !repo) { showToast('Please provide game name and GitHub repo URL', 'error'); return; }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Submitting...';
      try {
        var res = await callGAS('submitGameFromRepo', state.token || 'anonymous', name, repo, genre, platform, desc);
        if (res && res.success) { showToast('Game submitted! It will be reviewed for inclusion.', 'success'); form.reset(); closeSubmitGameModal(); logEvent('game.submit', 'name=' + name + ',repo=' + repo, '', {}); }
        else { showToast(res && res.error ? res.error : 'Failed to submit', 'error'); }
      } catch (err) { showToast('Error: ' + err.message, 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Submit Game'; }
    });
    var closeBtn = document.getElementById('submitGameClose');
    if (closeBtn) closeBtn.addEventListener('click', closeSubmitGameModal);
    var overlay = document.getElementById('submitGameOverlay');
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeSubmitGameModal(); });
  }

  function loadNotifications() {
    var bell = document.getElementById('notifBell');
    var badge = document.getElementById('notifBadge');
    if (!bell || !state.token) return;
    callGAS('getNotifications', state.token).then(function (notifs) {
      if (notifs && notifs.length > 0) {
        var unread = notifs.filter(function (n) { return !n.read; }).length;
        if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'flex' : 'none'; }
        var body = document.getElementById('notifDropdownBody');
        if (body) {
          body.innerHTML = notifs.slice(0, 10).map(function (n) {
            return '<div class="notif-item' + (n.read ? '' : ' unread') + '">' +
              '<div class="notif-text">' + (n.text || '') + '</div>' +
              '<div class="notif-date">' + formatDate(n.date) + '</div></div>';
          }).join('');
        }
      }
    }).catch(function () {});
    // Notif bell toggle
    bell.addEventListener('click', function (e) { e.stopPropagation(); var dd = document.getElementById('notifDropdown'); if (dd) { dd.style.display = dd.style.display === 'block' ? 'none' : 'block'; } });
    var markAll = document.getElementById('notifMarkAllRead');
    if (markAll) markAll.addEventListener('click', function () { callGAS('markAllNotificationsRead', state.token).then(function () { loadNotifications(); }).catch(function () {}); });
  }

  function trackScrollDepth() {
    var docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight);
    var winHeight = window.innerHeight;
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var depthPct = Math.min(100, Math.round((scrollTop + winHeight) / docHeight * 100));
    if (depthPct > maxScrollDepth) maxScrollDepth = depthPct;
    var thresholds = [25, 50, 75, 90, 100];
    for (var i = 0; i < thresholds.length; i++) {
      if (depthPct >= thresholds[i] && !scrollDepthLogged[thresholds[i]]) {
        scrollDepthLogged[thresholds[i]] = true;
        logEvent('scroll.depth', depthPct + '%', '', { depth: thresholds[i] });
      }
    }
  }

  function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(function () {
      if (state.token) {
        callGAS('heartbeat', state.token, maxScrollDepth, state.sessions.clicks, state.currentGameId || '').catch(function () {});
      }
      logEvent('heartbeat', '', '', { activeTime: Date.now() });
    }, 30000);
  }

  function initAuthForms() {
    var loginForm = document.getElementById('loginForm');
    var signupForm = document.getElementById('signupForm');
    var switchToLogin = document.getElementById('switchToLogin');
    var switchToSignup = document.getElementById('switchToSignup');
    var loginTab = document.getElementById('loginTab');
    var signupTab = document.getElementById('signupTab');
    var authClose = document.getElementById('authClose');
    var authOverlay = document.getElementById('authOverlay');
    if (authClose) authClose.addEventListener('click', closeAuthModal);
    if (authOverlay) authOverlay.addEventListener('click', function (e) { if (e.target === authOverlay) closeAuthModal(); });
    if (loginTab) loginTab.addEventListener('click', function () { loginTab.classList.add('active'); signupTab.classList.remove('active'); loginForm.style.display = 'block'; signupForm.style.display = 'none'; });
    if (signupTab) signupTab.addEventListener('click', function () { signupTab.classList.add('active'); loginTab.classList.remove('active'); signupForm.style.display = 'block'; loginForm.style.display = 'none'; });
    if (switchToSignup) switchToSignup.addEventListener('click', function (e) { e.preventDefault(); signupTab.click(); });
    if (switchToLogin) switchToLogin.addEventListener('click', function (e) { e.preventDefault(); loginTab.click(); });
    if (loginForm) {
      loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var username = document.getElementById('loginUsername').value.trim();
        var password = document.getElementById('loginPassword').value;
        if (!username || !password) { showToast('Please fill in all fields', 'error'); return; }
        var btn = loginForm.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Signing In...';
        var dp = getDeviceProfile();
        try {
          var res = await callGAS('loginUser', username, password, dp.ip, dp.fingerprint, dp.ua, dp.screen, dp.tz, dp.lang);
          if (res && res.token) {
            state.token = res.token; state.role = res.role || 'USER';
            state.user = { userId: res.userId, username: res.username, role: state.role };
            localStorage.setItem('wds_token', res.token);
            localStorage.setItem('wds_user', JSON.stringify(state.user));
            document.cookie = 'wds_token=' + res.token + ';path=/;max-age=604800';
            document.cookie = 'wds_username=' + res.username + ';path=/;max-age=604800';
            closeAuthModal();
            handleAuthChange();
            showToast('Welcome back, ' + res.username + '!', 'success');
            logEvent('auth.login', 'username=' + username, '', {});
          } else {
            showToast(res && res.error ? res.error : 'Login failed', 'error');
          }
        } catch (err) { showToast('Error: ' + err.message, 'error'); }
        finally { btn.disabled = false; btn.textContent = 'Sign In'; }
      });
    }
    if (signupForm) {
      signupForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var username = document.getElementById('signupUsername').value.trim();
        var email = document.getElementById('signupEmail').value.trim();
        var password = document.getElementById('signupPassword').value;
        if (!username || !email || !password) { showToast('Please fill in all fields', 'error'); return; }
        if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
        var btn = signupForm.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Creating Account...';
        var dp = getDeviceProfile();
        try {
          var res = await callGAS('registerUser', username, password, email, dp.ip, dp.fingerprint, dp.ua, dp.screen, dp.tz, dp.lang);
          if (res && res.success) {
            showToast(res.message || 'Registration submitted. Your account requires manual approval. You will not be notified when approved. Please check back later to sign in.', 'info');
            logEvent('auth.register', 'username=' + username, '', {});
            signupForm.reset();
          } else {
            showToast(res && res.error ? res.error : 'Registration failed', 'error');
          }
        } catch (err) { showToast('Error: ' + err.message, 'error'); }
        finally { btn.disabled = false; btn.textContent = 'Create Account'; }
      });
    }
  }

  function openAuthModal() {
    var overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeAuthModal() {
    var overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  function handleAuthChange() {
    var isLoggedIn = !!state.token;
    var loginBtn = document.getElementById('loginBtn');
    var registerBtn = document.getElementById('registerBtn');
    var userMenu = document.getElementById('userMenu');
    var userNameDisplay = document.getElementById('userNameDisplay');
    var notifBell = document.getElementById('notifBell');
    var adminLink = document.getElementById('dropAdminPanel');
    if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'inline-flex';
    if (registerBtn) registerBtn.style.display = isLoggedIn ? 'none' : 'inline-flex';
    if (userMenu) userMenu.style.display = isLoggedIn ? 'flex' : 'none';
    if (userNameDisplay && state.user) userNameDisplay.textContent = state.user.username || 'User';
    if (notifBell) notifBell.style.display = isLoggedIn ? 'flex' : 'none';
    if (adminLink) adminLink.style.display = isLoggedIn && state.role === 'ADMIN' ? 'block' : 'none';
    var homeLink = document.querySelector('.nav-link[data-page="home"]');
    if (homeLink) homeLink.textContent = isLoggedIn ? 'Dashboard' : 'Home';
    // Show/hide restricted nav items
    var restricted = ['gamesDropdownToggle', 'communityDropdownToggle', 'sponsorsDropdownToggle', 'navSearch'];
    for (var ri = 0; ri < restricted.length; ri++) {
      var el = document.getElementById(restricted[ri]);
      if (el) el.style.display = isLoggedIn ? '' : 'none';
    }
    closeAuthModal();
    if (isLoggedIn) {
      loadDashboard();
      loadNotifications();
      startHeartbeat();
    }
  }

  function openContactModal() {
    var overlay = document.getElementById('contactOverlay');
    if (overlay) overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeContactModal() {
    var overlay = document.getElementById('contactOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  function initContact() {
    var form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = document.getElementById('contactName').value.trim();
      var email = document.getElementById('contactEmail').value.trim();
      var subject = document.getElementById('contactSubject').value.trim();
      var msg = document.getElementById('contactMessage').value.trim();
      if (!name || !email || !subject || !msg) { showToast('Please fill in all fields', 'error'); return; }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Sending...';
      try {
        var res = await callGAS('contact', name, email, subject, msg, state.token || 'anonymous');
        if (res && res.success) { showToast('Message sent!', 'success'); form.reset(); closeContactModal(); }
        else { showToast(res && res.error ? res.error : 'Failed to send', 'error'); }
      } catch (err) { showToast('Error: ' + err.message, 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Send Message'; }
    });
  }

  function loadConsent() {
    if (localStorage.getItem('wds_tracking_consent') === 'true') {
      state.trackingConsented = true;
      startTracking();
      return;
    }
    var overlay = document.getElementById('consentOverlay');
    if (overlay) overlay.style.display = 'flex';
    var btn = document.getElementById('consentAccept');
    if (btn) btn.addEventListener('click', acceptTracking);
  }

  /* ─── ADMIN ─────────────────────────────────────────── */

  var adminPageFuncs = {};

  function loadAdminTab(tab) {
    var body = document.getElementById('adminBody');
    if (!body) return;
    if (adminPageFuncs[tab]) { adminPageFuncs[tab](body); return; }
    body.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    if (tab === 'dashboard') adminTabDashboard(body);
    else if (tab === 'users') adminTabUsers(body);
    else if (tab === 'games') adminTabGames(body);
    else if (tab === 'notices') adminTabNotices(body);
    else if (tab === 'requests') adminTabRequests(body);
    else if (tab === 'tracking') adminTabTracking(body);
    else if (tab === 'contacts') adminTabContacts(body);
    else if (tab === 'reports') adminTabReports(body);
    else if (tab === 'submit-game') adminTabSubmitGame(body);
    else if (tab === 'sheet') adminTabSheet(body);
    else body.innerHTML = '<p>Unknown tab</p>';
  }

  function adminTabDashboard(body) {
    callGAS('adminGetDashboard', state.token).then(function (res) {
      if (!res || !res.success) { body.innerHTML = '<p style="color:var(--neon-red)">Failed to load dashboard.</p>'; return; }
      var s = res.stats || {};
      var html = '<div class="admin-dashboard-grid">' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + (s.users || 0) + '</div><div class="admin-stat-label">Total Users</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + (s.pendingUsers || 0) + '</div><div class="admin-stat-label">Pending Approval</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + (s.games || 0) + '</div><div class="admin-stat-label">Total Games</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + (s.reviews || 0) + '</div><div class="admin-stat-label">Total Reviews</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + (s.comments || 0) + '</div><div class="admin-stat-label">Comments</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + (s.sessions || 0) + '</div><div class="admin-stat-label">Sessions</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + (s.pendingRequests || 0) + '</div><div class="admin-stat-label">Pending Requests</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + (s.newContacts || 0) + '</div><div class="admin-stat-label">New Contacts</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + (s.activeNotices || 0) + '</div><div class="admin-stat-label">Active Notices</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + (s.devicesTracked || 0) + '</div><div class="admin-stat-label">Devices Tracked</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + (s.eventsTracked || 0) + '</div><div class="admin-stat-label">Events Tracked</div></div>' +
        '</div><hr style="border-color:var(--border-color);margin:1.5rem 0"><p style="color:var(--text-secondary);font-size:0.85rem">Select a tab above to manage data directly.</p>';
      body.innerHTML = html;
    }).catch(function () { body.innerHTML = '<p style="color:var(--neon-red)">Error loading dashboard.</p>'; });
  }

  function adminTabUsers(body) {
    callGAS('adminGetAllUsers', state.token).then(function (res) {
      if (!res || !res.success) { body.innerHTML = '<p style="color:var(--neon-red)">Failed to load users.</p>'; return; }
      var html = '<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Approved</th><th>Joined</th><th>Logins</th><th>Actions</th></tr></thead><tbody>';
      for (var i = 0; i < res.users.length; i++) {
        var u = res.users[i];
        var isPending = u.approved === 'PENDING';
        var isRejected = u.approved === 'REJECTED';
        html += '<tr><td>' + u.id + '</td><td>' + escapeHtml(u.username) + '</td><td>' + escapeHtml(u.email) + '</td><td>' + (u.role || 'USER') + '</td><td>' +
          (isPending ? '<span style="color:var(--neon-yellow)">PENDING</span>' : isRejected ? '<span style="color:var(--neon-red)">REJECTED</span>' : '<span style="color:var(--neon-green)">' + u.approved + '</span>') +
          '</td><td>' + (u.joinDate ? u.joinDate.slice(0, 10) : '') + '</td><td>' + (u.totalLogins || 0) + '</td><td>';
        if (u.role !== 'ADMIN') {
          if (isPending) html += '<button class="btn-outline admin-action" data-action="approve" data-uid="' + u.id + '" style="font-size:0.75rem;padding:3px 8px">Approve</button> ';
          html += '<button class="btn-outline admin-action" data-action="role" data-uid="' + u.id + '" data-role="' + (u.role === 'ADMIN' ? 'USER' : 'ADMIN') + '" style="font-size:0.75rem;padding:3px 8px">' + (u.role === 'ADMIN' ? 'Demote' : 'Make Admin') + '</button>';
        }
        html += '</td></tr>';
      }
      html += '</tbody></table></div>';
      body.innerHTML = html;
      qsa('.admin-action', body).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var action = this.dataset.action;
          var uid = this.dataset.uid;
          if (action === 'approve') {
            callGAS('approveUser', state.token, uid).then(function (r) { if (r && r.success) { showToast('Approved ' + r.username, 'success'); loadAdminTab('users'); } else showToast('Failed', 'error'); });
          } else if (action === 'role') {
            var newRole = this.dataset.role;
            callGAS('setUserRole', state.token, uid, newRole).then(function (r) { if (r && r.success) { showToast(r.username + ' is now ' + r.role, 'success'); loadAdminTab('users'); } else showToast('Failed', 'error'); });
          }
        });
      });
    }).catch(function () { body.innerHTML = '<p style="color:var(--neon-red)">Error loading users.</p>'; });
  }

  function adminTabGames(body) {
    callGAS('adminGetSheetData', state.token, 'Games').then(function (res) {
      if (!res || !res.success) { body.innerHTML = '<p style="color:var(--neon-red)">Failed to load games.</p>'; return; }
      renderAdminSheet(body, res.data, 'Games');
    }).catch(function () { body.innerHTML = '<p style="color:var(--neon-red)">Error loading games.</p>'; });
  }

  function adminTabNotices(body) {
    callGAS('adminGetAllNotices', state.token).then(function (res) {
      if (!res || !res.success) { body.innerHTML = '<p style="color:var(--neon-red)">Failed to load notices.</p>'; return; }
      var html = '<h3 style="margin-bottom:1rem">Notices <button class="btn-outline" id="addNoticeBtn" style="font-size:0.8rem;margin-left:1rem">+ Add Notice</button></h3>';
      html += '<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>ID</th><th>Title</th><th>Message</th><th>Type</th><th>Active</th><th>Expires</th><th>Actions</th></tr></thead><tbody>';
      for (var i = 0; i < res.notices.length; i++) {
        var n = res.notices[i];
        html += '<tr><td>' + n.id + '</td><td>' + escapeHtml(n.title || '') + '</td><td>' + escapeHtml((n.message || '').slice(0, 50)) + '</td><td>' + (n.type || 'info') + '</td><td>' + (n.active === 'TRUE' ? 'Yes' : 'No') + '</td><td>' + (n.expiresAt ? n.expiresAt.slice(0, 10) : '-') + '</td>' +
          '<td><button class="btn-outline admin-notice-action" data-nid="' + n.id + '" data-action="delete" style="font-size:0.75rem;padding:3px 8px;color:var(--neon-red)">Delete</button></td></tr>';
      }
      html += '</tbody></table></div>';
      body.innerHTML = html;
      var addBtn = document.getElementById('addNoticeBtn');
      if (addBtn) addBtn.addEventListener('click', function () {
        var title = prompt('Notice title:');
        if (!title) return;
        var msg = prompt('Notice message:');
        if (!msg) return;
        var type = prompt('Type (info/warning/error):', 'info');
        var expires = prompt('Expires (YYYY-MM-DDTHH:MM, leave blank for no expiry):');
        callGAS('addNotice', state.token, title, msg, type || 'info', expires || '').then(function (r) { if (r && r.success) { showToast('Notice added', 'success'); loadAdminTab('notices'); } else showToast('Failed', 'error'); });
      });
      qsa('.admin-notice-action', body).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var nid = this.dataset.nid;
          var action = this.dataset.action;
          if (action === 'delete') {
            if (!confirm('Delete this notice?')) return;
            callGAS('deleteNotice', state.token, nid).then(function (r) { if (r && r.success) { showToast('Deleted', 'success'); loadAdminTab('notices'); } else showToast('Failed', 'error'); });
          }
        });
      });
    }).catch(function () { body.innerHTML = '<p style="color:var(--neon-red)">Error loading notices.</p>'; });
  }

  function adminTabRequests(body) {
    callGAS('adminGetAllGameRequests', state.token).then(function (res) {
      if (!res || !res.success) { body.innerHTML = '<p style="color:var(--neon-red)">Failed to load requests.</p>'; return; }
      var html = '<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>ID</th><th>Game</th><th>User</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
      for (var i = 0; i < res.requests.length; i++) {
        var r = res.requests[i];
        html += '<tr><td>' + r.id + '</td><td>' + escapeHtml(r.gameName || '') + '</td><td>' + escapeHtml(r.username || '') + '</td><td>' + (r.status || 'pending') + '</td><td>' + (r.createdAt ? r.createdAt.slice(0, 10) : '') + '</td>' +
          '<td><button class="btn-outline admin-req-action" data-rid="' + r.id + '" data-status="approved" style="font-size:0.75rem;padding:3px 8px">Approve</button> ' +
          '<button class="btn-outline admin-req-action" data-rid="' + r.id + '" data-status="rejected" style="font-size:0.75rem;padding:3px 8px;color:var(--neon-red)">Reject</button></td></tr>';
      }
      html += '</tbody></table></div>';
      body.innerHTML = html;
      qsa('.admin-req-action', body).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var rid = this.dataset.rid;
          var status = this.dataset.status;
          callGAS('adminReviewGameRequest', state.token, rid, status).then(function (r) { if (r && r.success) { showToast('Request ' + status, 'success'); loadAdminTab('requests'); } else showToast('Failed', 'error'); });
        });
      });
    }).catch(function () { body.innerHTML = '<p style="color:var(--neon-red)">Error loading requests.</p>'; });
  }

  function adminTabTracking(body) {
    callGAS('adminGetTrackingStats', state.token).then(function (res) {
      if (!res || !res.success) { body.innerHTML = '<p style="color:var(--neon-red)">Failed to load tracking data.</p>'; return; }
      var s = res.stats;
      var html = '<div class="admin-dashboard-grid"><div class="admin-stat-card"><div class="admin-stat-number">' + s.devices + '</div><div class="admin-stat-label">Devices</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + s.events + '</div><div class="admin-stat-label">Events</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + s.heartbeats + '</div><div class="admin-stat-label">Heartbeats</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + s.uniqueIPs + '</div><div class="admin-stat-label">Unique IPs</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-number">' + s.uniqueFingerprints + '</div><div class="admin-stat-label">Unique Fingerprints</div></div></div>';
      html += '<h3 style="margin-top:1.5rem">Event Types</h3><div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>Type</th><th>Count</th></tr></thead><tbody>';
      for (var et in s.eventTypes) { html += '<tr><td>' + et + '</td><td>' + s.eventTypes[et] + '</td></tr>'; }
      html += '</tbody></table></div>';
      html += '<h3 style="margin-top:1.5rem">Locations</h3><div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>Country</th><th>Count</th></tr></thead><tbody>';
      for (var loc in s.locations) { html += '<tr><td>' + loc + '</td><td>' + s.locations[loc] + '</td></tr>'; }
      html += '</tbody></table></div>';
      html += '<h3 style="margin-top:1.5rem">Browsers</h3><div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>Browser</th><th>Count</th></tr></thead><tbody>';
      for (var br in s.browsers) { html += '<tr><td>' + br + '</td><td>' + s.browsers[br] + '</td></tr>'; }
      html += '</tbody></table></div>';
      body.innerHTML = html;
    }).catch(function () { body.innerHTML = '<p style="color:var(--neon-red)">Error loading tracking data.</p>'; });
  }

  function adminTabContacts(body) {
    callGAS('adminGetAllContacts', state.token).then(function (res) {
      if (!res || !res.success) { body.innerHTML = '<p style="color:var(--neon-red)">Failed to load contacts.</p>'; return; }
      var html = '<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Subject</th><th>Date</th></tr></thead><tbody>';
      for (var i = 0; i < res.contacts.length; i++) {
        var c = res.contacts[i];
        html += '<tr><td>' + c.id + '</td><td>' + escapeHtml(c.name || '') + '</td><td>' + escapeHtml(c.email || '') + '</td><td>' + escapeHtml((c.subject || '').slice(0, 40)) + '</td><td>' + (c.createdAt ? c.createdAt.slice(0, 10) : '') + '</td></tr>';
      }
      html += '</tbody></table></div>';
      body.innerHTML = html;
    }).catch(function () { body.innerHTML = '<p style="color:var(--neon-red)">Error loading contacts.</p>'; });
  }

  function adminTabReports(body) {
    callGAS('adminGetAllReports', state.token).then(function (res) {
      if (!res || !res.success) { body.innerHTML = '<p style="color:var(--neon-red)">Failed to load reports.</p>'; return; }
      var html = '<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>ID</th><th>User</th><th>Target</th><th>Reason</th><th>Date</th></tr></thead><tbody>';
      for (var i = 0; i < res.reports.length; i++) {
        var r = res.reports[i];
        html += '<tr><td>' + r.id + '</td><td>' + escapeHtml(r.reporter || '') + '</td><td>' + escapeHtml(r.targetId || '') + '</td><td>' + escapeHtml((r.reason || '').slice(0, 50)) + '</td><td>' + (r.createdAt ? r.createdAt.slice(0, 10) : '') + '</td></tr>';
      }
      html += '</tbody></table></div>';
      body.innerHTML = html;
    }).catch(function () { body.innerHTML = '<p style="color:var(--neon-red)">Error loading reports.</p>'; });
  }

  function adminTabSubmitGame(body) {
    body.innerHTML = '<h3 style="margin-bottom:1rem">Submit a Game from GitHub</h3><form id="adminSubmitGameForm"><div class="form-group"><label class="form-label">Game Name *</label><input class="form-input" id="adminSubGameName" required></div><div class="form-group"><label class="form-label">GitHub Repo URL *</label><input class="form-input" id="adminSubGameRepo" placeholder="https://github.com/username/repo" required></div><div class="form-row"><div class="form-group" style="flex:1"><label class="form-label">Genre</label><select class="form-input" id="adminSubGameGenre"><option>General</option><option>Arcade</option><option>Action</option><option>RPG</option><option>Strategy</option><option>Puzzle</option><option>Racing</option><option>Shooter</option><option>Sports</option><option>Adventure</option></select></div><div class="form-group" style="flex:1"><label class="form-label">Platform</label><select class="form-input" id="adminSubGamePlatform"><option>Web</option><option>HTML5</option><option>JavaScript</option><option>WASM</option></select></div></div><div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="adminSubGameDesc" rows="3"></textarea></div><button type="submit" class="btn-submit">Submit Game</button></form>' +
      '<hr style="border-color:var(--border-color);margin:2rem 0"><h3 style="margin-bottom:1rem">Add Game Directly</h3><form id="adminAddGameForm"><div class="form-row"><div class="form-group" style="flex:1"><label class="form-label">Name *</label><input class="form-input" id="adminAddGameName" required></div><div class="form-group" style="flex:1"><label class="form-label">Genre</label><input class="form-input" id="adminAddGameGenre" placeholder="General"></div></div><div class="form-row"><div class="form-group" style="flex:1"><label class="form-label">Cover URL</label><input class="form-input" id="adminAddGameCover"></div><div class="form-group" style="flex:1"><label class="form-label">Game URL</label><input class="form-input" id="adminAddGameUrl"></div></div><div class="form-row"><div class="form-group" style="flex:1"><label class="form-label">Developer</label><input class="form-input" id="adminAddGameDev"></div><div class="form-group" style="flex:1"><label class="form-label">Platform</label><select class="form-input" id="adminAddGamePlatform"><option>Web</option><option>HTML5</option><option>JavaScript</option><option>WASM</option></select></div></div><div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="adminAddGameDesc" rows="3"></textarea></div><button type="submit" class="btn-submit">Add Game</button></form>' +
      '<hr style="border-color:var(--border-color);margin:2rem 0"><h3 style="margin-bottom:1rem">Update Game</h3><form id="adminUpdateGameForm"><div class="form-group"><label class="form-label">Game ID *</label><input class="form-input" id="adminUpdateGameId" placeholder="Enter game ID" required></div><div class="form-group"><label class="form-label">Updates (JSON)</label><textarea class="form-textarea" id="adminUpdateGameJson" rows="4" placeholder=\'{"name":"New Name","rating":4.5}\'></textarea></div><button type="submit" class="btn-submit">Update Game</button></form>';
    setTimeout(function () {
      initCustomSelects();
      var sf = document.getElementById('adminSubmitGameForm');
      if (sf) sf.addEventListener('submit', function (e) { e.preventDefault(); var name = document.getElementById('adminSubGameName').value.trim(); var repo = document.getElementById('adminSubGameRepo').value.trim(); if (!name || !repo) { showToast('Name and repo required', 'error'); return; } var genre = document.getElementById('adminSubGameGenre').value; var plat = document.getElementById('adminSubGamePlatform').value; var desc = document.getElementById('adminSubGameDesc').value.trim(); callGAS('submitGameFromRepo', state.token, name, repo, genre, plat, desc).then(function (r) { if (r && r.success) { showToast(r.message || 'Game submitted!', 'success'); } else showToast('Failed: ' + (r.error || 'Unknown'), 'error'); }); });
      var af = document.getElementById('adminAddGameForm');
      if (af) af.addEventListener('submit', function (e) { e.preventDefault(); var data = { name: document.getElementById('adminAddGameName').value.trim(), coverUrl: document.getElementById('adminAddGameCover').value.trim(), gameUrl: document.getElementById('adminAddGameUrl').value.trim(), genre: document.getElementById('adminAddGameGenre').value.trim() || 'General', platform: document.getElementById('adminAddGamePlatform').value, developer: document.getElementById('adminAddGameDev').value.trim(), description: document.getElementById('adminAddGameDesc').value.trim() }; if (!data.name) { showToast('Name required', 'error'); return; } callGAS('adminAddGame', state.token, JSON.stringify(data)).then(function (r) { if (r && r.success) { showToast('Game added! ID: ' + r.gameId, 'success'); af.reset(); } else showToast('Failed: ' + (r.error || 'Unknown'), 'error'); }); });
      var uf = document.getElementById('adminUpdateGameForm');
      if (uf) uf.addEventListener('submit', function (e) { e.preventDefault(); var gid = document.getElementById('adminUpdateGameId').value.trim(); var updates = document.getElementById('adminUpdateGameJson').value.trim(); if (!gid || !updates) { showToast('Game ID and updates required', 'error'); return; } try { JSON.parse(updates); } catch (e) { showToast('Invalid JSON', 'error'); return; } callGAS('adminUpdateGame', state.token, gid, updates).then(function (r) { if (r && r.success) { showToast('Game updated!', 'success'); } else showToast('Failed: ' + (r.error || 'Unknown'), 'error'); }); });
    }, 100);
  }

  function adminTabSheet(body) {
    var sheets = ['Games','Reviews','Comments','Users','Sessions','AuditLog','GameAnalytics','GameSessions','GameRequests','UserPreferences','Achievements','UserAchievements','UserGames','Friends','FriendRequests','Notifications','Reports','Feed','GameSeries','Platforms','Developers','Publishers','Categories','Leaderboards','DeviceTracking','TrackingLog','SessionHeartbeats','ContentWarnings','GameCategorizations','GameSeriesEntries','Contacts','Notices'];
    var html = '<div class="form-group"><label class="form-label">Select Sheet</label><select class="form-input" id="adminSheetSelector">';
    for (var i = 0; i < sheets.length; i++) { html += '<option value="' + sheets[i] + '">' + sheets[i] + '</option>'; }
    html += '</select><button class="btn-outline" id="adminLoadSheet" style="margin-top:0.5rem">Load Sheet</button></div><div id="adminSheetData"></div>';
    body.innerHTML = html;
    document.getElementById('adminLoadSheet').addEventListener('click', function () {
      var sn = document.getElementById('adminSheetSelector').value;
      var dataDiv = document.getElementById('adminSheetData');
      dataDiv.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
      callGAS('adminGetSheetData', state.token, sn).then(function (res) {
        if (!res || !res.success) { dataDiv.innerHTML = '<p style="color:var(--neon-red)">Failed.</p>'; return; }
        renderAdminSheet(dataDiv, res.data, sn);
      }).catch(function () { dataDiv.innerHTML = '<p style="color:var(--neon-red)">Error.</p>'; });
    });
  }

  function renderAdminSheet(container, data, sheetName) {
    if (!data || !data.length) { container.innerHTML = '<p>No data.</p>'; return; }
    var headers = Object.keys(data[0]).filter(function (k) { return k !== '_row'; });
    var html = '<div style="overflow-x:auto;max-height:500px;overflow-y:auto"><table class="admin-table"><thead><tr>';
    for (var h = 0; h < headers.length; h++) { html += '<th>' + headers[h] + '</th>'; }
    html += '<th>Actions</th></tr></thead><tbody>';
    for (var i = 0; i < data.length; i++) {
      html += '<tr>';
      for (var h = 0; h < headers.length; h++) {
        var val = data[i][headers[h]] !== undefined ? String(data[i][headers[h]]) : '';
        html += '<td>' + escapeHtml(val.slice(0, 100)) + '</td>';
      }
      html += '<td><button class="btn-outline admin-del-row" data-sheet="' + sheetName + '" data-row="' + data[i]._row + '" style="font-size:0.7rem;padding:2px 6px;color:var(--neon-red)">Del</button></td>';
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    container.innerHTML = html;
    qsa('.admin-del-row', container).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Delete this row?')) return;
        var sn = this.dataset.sheet;
        var row = this.dataset.row;
        callGAS('adminDeleteRow', state.token, sn, row).then(function (r) { if (r && r.success) { showToast('Deleted', 'success'); adminTabSheet(); } else showToast('Failed', 'error'); });
      });
    });
  }

  function initAdminPage() {
    var adminBtns = document.querySelectorAll('[data-admintab]');
    for (var i = 0; i < adminBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var tab = this.dataset.admintab;
          loadAdminTab(tab);
          qsa('[data-admintab]').forEach(function (b) { b.classList.remove('active'); });
          this.classList.add('active');
        });
      })(adminBtns[i]);
    }
  }

  /* ─── NOTICES ───────────────────────────────────────── */

  function loadActiveNotices() {
    callGAS('getActiveNotices').then(function (res) {
      if (!res || !res.length) return;
      var overlay = document.getElementById('noticesOverlay');
      var body = document.getElementById('noticesBody');
      if (!overlay || !body) return;
      var html = '';
      for (var i = 0; i < res.length; i++) {
        var n = res[i];
        var color = n.type === 'error' ? 'var(--neon-red)' : n.type === 'warning' ? 'var(--neon-yellow)' : 'var(--neon-cyan)';
        html += '<div class="notice-card" style="border-left:3px solid ' + color + ';padding:0.75rem;margin-bottom:0.75rem;background:var(--bg-secondary);border-radius:8px">' +
          '<h4 style="color:' + color + ';margin:0 0 0.25rem;font-size:0.95rem">' + escapeHtml(n.title || 'Notice') + '</h4>' +
          '<p style="color:var(--text-secondary);font-size:0.85rem;margin:0">' + escapeHtml(n.message || '') + '</p></div>';
      }
      body.innerHTML = html;
      overlay.style.display = 'flex';
    }).catch(function () {});
  }

  function closeNotices() {
    var overlay = document.getElementById('noticesOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  function renderParticles() {
    var canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var particles = [];
    var count = Math.min(80, Math.floor(window.innerWidth / 20));
    for (var i = 0; i < count; i++) {
      particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, size: Math.random() * 2 + 1, opacity: Math.random() * 0.5 + 0.2 });
    }
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.fillStyle = 'rgba(79, 140, 255, ' + p.opacity + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(animate);
    }
    animate();
    window.addEventListener('resize', function () { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
  }

  function initCookies() {
    var c = document.cookie.split(';');
    for (var i = 0; i < c.length; i++) {
      var p = c[i].trim().split('=');
      if (p[0] === 'wds_token' && p[1] && !state.token) state.token = p[1];
      if (p[0] === 'wds_username' && p[1] && !state.user) state.user = { username: p[1] };
    }
  }

  function initHeavyTracking() {
    document.addEventListener('mousemove', function (e) {
      state.sessions.mouseMoves++;
      if (state.sessions.mouseMoves % 100 === 0) logEvent('track.mousemove', '', '', { x: e.clientX, y: e.clientY, total: state.sessions.mouseMoves });
    });
    document.addEventListener('keydown', function (e) {
      state.sessions.keypresses++;
      if (state.sessions.keypresses % 50 === 0) logEvent('track.keypress', '', '', { key: e.key, total: state.sessions.keypresses });
    });
    setInterval(function () {
      var now = Date.now();
      var idle = now - state.sessions.lastActive;
      if (idle > 5000) { state.sessions.idleTime += 5000; }
      state.sessions.lastActive = now;
    }, 5000);
    if ('viewport' in window && 'visualViewport' in window) {
      window.visualViewport.addEventListener('resize', function () {
        logEvent('track.viewport', '', '', { width: window.innerWidth, height: window.innerHeight, scale: window.visualViewport.scale });
      });
    }
    if (navigator.getBattery) {
      navigator.getBattery().then(function (b) {
        b.addEventListener('levelchange', function () { logEvent('track.battery', '', '', { level: b.level * 100, charging: b.charging }); });
        b.addEventListener('chargingchange', function () { logEvent('track.battery', '', '', { level: b.level * 100, charging: b.charging }); });
      });
    }
    if (navigator.connection) {
      navigator.connection.addEventListener('change', function () {
        logEvent('track.connection', '', '', { type: navigator.connection.effectiveType, downlink: navigator.connection.downlink, rtt: navigator.connection.rtt });
      });
    }
    if (navigator.deviceMemory) logEvent('track.memory', '', '', { memory: navigator.deviceMemory });
    if (screen.orientation) {
      screen.orientation.addEventListener('change', function () {
        logEvent('track.orientation', '', '', { type: screen.orientation.type, angle: screen.orientation.angle });
      });
    }
    if (document.fonts) {
      document.fonts.ready.then(function () {
        var fonts = [];
        for (var j = 0; j < document.fonts.size; j++) { try { fonts.push(document.fonts.item(j).family); } catch (e) {} }
        logEvent('track.fonts', '', '', { fonts: fonts.join(',') });
      });
    }
    logEvent('track.device', '', '', {
      ua: navigator.userAgent, language: navigator.language, platform: navigator.platform,
      cores: navigator.hardwareConcurrency || 0, memory: navigator.deviceMemory || 0,
      touchPoints: navigator.maxTouchPoints || 0, cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack || 'unspecified'
    });
  }

  function initCustomSelects() {
    var selects = document.querySelectorAll('select.filter-select, select.form-input');
    for (var si = 0; si < selects.length; si++) {
      var sel = selects[si];
      if (sel.dataset.customSelect === 'true') continue;
      sel.dataset.customSelect = 'true';
      var wrapper = document.createElement('div');
      wrapper.className = 'custom-select-wrapper';
      sel.parentNode.insertBefore(wrapper, sel);
      wrapper.appendChild(sel);
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'custom-select-toggle';
      toggle.innerHTML = '<span class="custom-select-value">' + (sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '') + '</span><svg class="custom-select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
      wrapper.appendChild(toggle);
      var menu = document.createElement('div');
      menu.className = 'custom-select-menu';
      for (var oi = 0; oi < sel.options.length; oi++) {
        var opt = document.createElement('div');
        opt.className = 'custom-select-option' + (sel.options[oi].disabled ? ' disabled' : '') + (oi === sel.selectedIndex ? ' selected' : '');
        opt.textContent = sel.options[oi].text;
        opt.dataset.value = sel.options[oi].value;
        opt.dataset.index = oi;
        opt.addEventListener('click', function () {
          var idx = parseInt(this.dataset.index);
          sel.selectedIndex = idx;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          menu.style.display = 'none';
          toggle.querySelector('.custom-select-value').textContent = this.textContent;
          qsa('.custom-select-option', menu).forEach(function (o) { o.classList.remove('selected'); });
          this.classList.add('selected');
        });
        menu.appendChild(opt);
      }
      wrapper.appendChild(menu);
      toggle.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var m = this.nextElementSibling;
        var allMenus = document.querySelectorAll('.custom-select-menu');
        for (var mi = 0; mi < allMenus.length; mi++) { if (allMenus[mi] !== m) allMenus[mi].style.display = 'none'; }
        m.style.display = m.style.display === 'block' ? 'none' : 'block';
      });
    }
    document.addEventListener('click', function () {
      qsa('.custom-select-menu').forEach(function (m) { m.style.display = 'none'; });
    });
  }

  function init() {
    cacheDOM();
    state.sessions.visits = Number(localStorage.getItem('wds_visits') || '0') + 1;
    localStorage.setItem('wds_visits', String(state.sessions.visits));
    logEvent('page.load', '', '', { referrer: document.referrer || 'direct' });
    renderParticles();
    initSearch();
    initFilterButtons();
    initNav();
    initAuthForms();
    initGameRequest();
    initSubmitGame();
    initContact();
    loadConsent();
    initCookies();
    var savedToken = localStorage.getItem('wds_token') || state.token;
    var savedUser = localStorage.getItem('wds_user');
    if (!savedUser && state.user) savedUser = JSON.stringify(state.user);
    if (savedToken && savedUser) {
      try { state.token = savedToken; state.user = JSON.parse(savedUser); state.role = state.user.role || 'USER'; handleAuthChange(); } catch (e) { localStorage.removeItem('wds_token'); localStorage.removeItem('wds_user'); }
    }
    initAdminPage();
    loadActiveNotices();
    window.addEventListener('scroll', trackScrollDepth);
    window.addEventListener('click', function () {
      state.sessions.clicks++;
      state.sessions.lastActive = Date.now();
      if (state.user) {
        var depths = [100, 500, 1000];
        if (depths.indexOf(state.sessions.clicks) >= 0) logEvent('clicks.milestone', String(state.sessions.clicks), '', { clicks: state.sessions.clicks });
      }
    });
    initHeavyTracking();
    setTimeout(initCustomSelects, 500);
    var overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeGameModal(); });
    var requestOverlay = document.getElementById('requestGameOverlay');
    if (requestOverlay) requestOverlay.addEventListener('click', function (e) { if (e.target === requestOverlay) closeGameRequestModal(); });
    var contactOverlay = document.getElementById('contactOverlay');
    if (contactOverlay) contactOverlay.addEventListener('click', function (e) { if (e.target === contactOverlay) closeContactModal(); });
    var noticesOverlay = document.getElementById('noticesOverlay');
    if (noticesOverlay) noticesOverlay.addEventListener('click', function (e) { if (e.target === noticesOverlay) closeNotices(); });
    var logoutBtn = document.getElementById('dropLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        state.token = null; state.user = null; state.role = 'USER';
        localStorage.removeItem('wds_token'); localStorage.removeItem('wds_user');
        document.cookie = 'wds_token=;path=/;max-age=0';
        document.cookie = 'wds_username=;path=/;max-age=0';
        handleAuthChange();
        showToast('Signed out', 'info');
        logEvent('auth.logout', '', '', {});
      });
    }
    var loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.addEventListener('click', openAuthModal);
    var registerBtn = document.getElementById('registerBtn');
    if (registerBtn) registerBtn.addEventListener('click', function () { openAuthModal(); var st = document.getElementById('signupTab'); if (st) st.click(); });
    var userDropdownToggle = document.getElementById('userNameDisplay');
    if (userDropdownToggle) {
      userDropdownToggle.addEventListener('click', function (e) { e.stopPropagation(); var dd = document.getElementById('userDropdown'); if (dd) dd.style.display = dd.style.display === 'block' ? 'none' : 'block'; });
      document.addEventListener('click', function () { var dd = document.getElementById('userDropdown'); if (dd) dd.style.display = 'none'; });
    }
    // Bind user dropdown items
    var dropItems = ['dropMyGames', 'dropMyReviews', 'dropMyFriends', 'dropMyAchievements', 'dropSettings'];
    var dropPages = ['games', 'profile', 'community', 'achievements', 'profile'];
    for (var di = 0; di < dropItems.length; di++) {
      (function (id, pg) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('click', function () { document.getElementById('userDropdown').style.display = 'none'; showPage(pg); });
      })(dropItems[di], dropPages[di]);
    }
    // Footer links
    var footerLinks = document.querySelectorAll('.footer-link');
    for (var fl = 0; fl < footerLinks.length; fl++) {
      footerLinks[fl].addEventListener('click', function (e) {
        e.preventDefault();
        var pg = this.dataset.page;
        if (pg) { if (!state.token && pg !== 'home') { openAuthModal(); return; } showPage(pg); }
      });
    }
    var navLogo = document.getElementById('navLogo');
    if (navLogo) navLogo.addEventListener('click', function (e) { e.preventDefault(); showPage('home'); });
    var footerContact = document.getElementById('footerContact');
    if (footerContact) footerContact.addEventListener('click', function (e) { e.preventDefault(); openContactModal(); });
    // Open request game modal from nav and page button
    var dropRequest = document.getElementById('dropRequestGame');
    if (dropRequest) dropRequest.addEventListener('click', function (e) { e.preventDefault(); openGameRequestModal(); });
    var openReqBtn = document.getElementById('openRequestGameBtn');
    if (openReqBtn) openReqBtn.addEventListener('click', openGameRequestModal);
    // Close modals on X buttons
    var requestClose = document.getElementById('requestGameClose');
    if (requestClose) requestClose.addEventListener('click', closeGameRequestModal);
    var contactClose = document.getElementById('contactClose');
    if (contactClose) contactClose.addEventListener('click', closeContactModal);
    var noticesClose = document.getElementById('noticesClose');
    if (noticesClose) noticesClose.addEventListener('click', closeNotices);
    // Close auth on escape
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAuthModal(); closeGameRequestModal(); closeContactModal(); closeGameModal(); closeNotices(); } });
    window.WDSopenLogin = openAuthModal;
    hideLoadingOverlay();
    initCategories();
    loadGames();
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();