(function() {
  'use strict';
  var API = 'https://script.google.com/macros/s/AKfycbyfr1k04IqvPSHND5I47ZowM8EAUmBuFR4pKJVWDdsB0ZCr4pMrCLxFME1v70aLbyWo/exec';

  function audit(action, details, element) {
    var user = (window.currentUser || {}).email || '';
    var data = { action: 'audit.event', eventType: action, user: user, details: details || '', page: '/flights/', element: element || '', ua: navigator.userAgent, fingerprint: window.EA_TRACKER ? window.EA_TRACKER.fingerprint : '', ip: window.EA_TRACKER ? window.EA_TRACKER.ip : '' };
    fetch(API + '?' + Object.entries(data).map(function(e) { return encodeURIComponent(e[0]) + '=' + encodeURIComponent(e[1]); }).join('&') + '&t=' + Date.now(), { mode: 'no-cors' }).catch(function(){});
    console.log('[AUDIT]', action, details);
  }

  document.addEventListener('click', function(e) {
    var el = e.target;
    var text = el.textContent || el.innerText || '';
    audit('click', text.trim().slice(0, 100), (el.tagName || '') + (el.className ? '.' + el.className.split(' ')[0] : ''));
  });

  var maxScroll = 0;
  document.addEventListener('scroll', function() {
    var scrollPct = Math.round(window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100);
    if (scrollPct > maxScroll) { maxScroll = scrollPct; if (maxScroll % 25 === 0) audit('scroll', maxScroll + '%', 'page'); }
  });

  audit('pageview', '/flights/', '');

  var state = { user: null, loggedIn: false };
  var KEY = 'ea_session';

  function getUser() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (data && data.user && data.expires > Date.now()) {
        window.currentUser = data.user;
        return data.user;
      }
      if (data && data.user) { localStorage.removeItem(KEY); }
    } catch(e) { console.error('[AUTH]', e); }
    return null;
  }

  function setUser(user) {
    if (!user) { localStorage.removeItem(KEY); window.currentUser = null; return; }
    var data = { user: user, expires: Date.now() + 604800000 };
    localStorage.setItem(KEY, JSON.stringify(data));
    window.currentUser = user;
  }

  function showAuth() {
    var overlay = document.getElementById('authModal');
    if (overlay) { overlay.classList.remove('hidden'); overlay.style.display = 'flex'; }
  }
  function hideAuth() {
    var overlay = document.getElementById('authModal');
    if (overlay) { overlay.classList.add('hidden'); overlay.style.display = 'none'; }
  }

  function showToast(msg, type) {
    type = type || 'info';
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(function() {
      toast.style.animation = 'toastOut 0.35s ease forwards';
      setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
    }, 3500);
  }

  function api(method, params) {
    try {
      var url = API + '?' + Object.entries(params).map(function(e) { return encodeURIComponent(e[0]) + '=' + encodeURIComponent(e[1]); }).join('&') + '&t=' + Date.now();
      return fetch(url, { cache: 'no-store' }).then(function(r) {
        if (!r.ok) { console.error('[API ERROR]', method, params, r.status); return null; }
        return r.json();
      }).catch(function(e) { console.error('[API ERROR]', method, params, e); return null; });
    } catch(e) { console.error('[API ERROR]', method, params, e); return Promise.resolve(null); }
  }

  function renderFlights(flights) {
    var container = document.getElementById('flightsList');
    if (!container) return;
    if (!flights || flights.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">No flights currently available</div>';
      return;
    }
    container.innerHTML = '<div class="flight-table">' + flights.map(function(f) {
      var statusClass = (f.status || 'scheduled').toLowerCase().replace(/\s+/g, '-');
      return '<div class="flight-row"><div class="flight-cell">' + (f.flight || f.flightNumber || '') + '</div><div class="flight-cell">' + (f.origin || '') + ' \u2192 ' + (f.destination || '') + '</div><div class="flight-cell"><span class="status-badge status-' + statusClass + '">' + (f.status || 'Scheduled') + '</span></div><div class="flight-cell">' + (f.gate || '--') + '</div><div class="flight-cell">' + (f.departureTime || f.departure || '--:--') + '</div></div>';
    }).join('') + '</div>';
  }

  function init() {
    var user = getUser();
    state.user = user;
    state.loggedIn = !!user;
    window.currentUser = user;

    var loginwall = document.getElementById('loginwall');
    var loginBtn = document.getElementById('loginBtn');
    var signupBtn = document.getElementById('signupBtn');
    var userMenu = document.getElementById('userMenu');

    if (state.loggedIn) {
      if (loginwall) loginwall.classList.add('hidden');
      if (loginBtn) loginBtn.classList.add('hidden');
      if (signupBtn) signupBtn.classList.add('hidden');
      if (userMenu) userMenu.classList.remove('hidden');
      var av = document.getElementById('avatarInitials');
      if (av) av.textContent = (user.name || 'U').split(' ').map(function(w){return w[0]}).join('').toUpperCase().slice(0,2);
      var dn = document.getElementById('dropdownName');
      if (dn) dn.textContent = user.name;
    } else {
      if (loginwall) loginwall.classList.remove('hidden');
    }
  }

  function loadData() {
    var flightsError = document.getElementById('flightsError');
    api('GET', { action: 'flights.list' }).then(function(flightsData) {
      if (flightsData && flightsData.success) {
        renderFlights(flightsData.flights || []);
      } else {
        if (flightsError) { flightsError.classList.remove('hidden'); flightsError.innerHTML = '<h2>Failed to load flight data</h2><p>Please try again later.</p>'; }
      }
    });
  }

  function hideLoader() {
    var loader = document.getElementById('globalLoader');
    if (loader) { loader.classList.add('fade-out'); setTimeout(function(){loader.style.display='none'}, 600); }
  }

  document.addEventListener('DOMContentLoaded', function() {
    if (window.EA_TRACKER) { window.EA_TRACKER.init('/flights/'); }

    setInterval(function() {
      var user = getUser();
      api('GET', { action: 'heartbeat', user: (user||{}).email || '', fingerprint: (window.EA_TRACKER||{}).fingerprint||'', page: '/flights/', session: (user||{}).email || (window.EA_TRACKER||{}).fingerprint||'' });
    }, 60000);

    init();
    loadData();
    hideLoader();

    var fsDate = document.getElementById('fsDate');
    if (fsDate) {
      var today = new Date();
      fsDate.value = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    }

    document.getElementById('loginBtn').addEventListener('click', function() { showAuth(); });
    document.getElementById('signupBtn').addEventListener('click', function() { showAuth(); });

    document.querySelectorAll('.auth-tab').forEach(function(t) {
      t.addEventListener('click', function() {
        document.querySelectorAll('.auth-tab').forEach(function(x){x.classList.remove('active')});
        t.classList.add('active');
        document.getElementById('loginForm').classList.toggle('hidden', t.dataset.tab !== 'login');
        document.getElementById('signupForm').classList.toggle('hidden', t.dataset.tab !== 'signup');
      });
    });

    document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var email = document.getElementById('loginEmail').value.trim();
      var password = document.getElementById('loginPassword').value;
      var submitBtn = document.getElementById('loginSubmitBtn');
      var loginError = document.getElementById('loginError');
      audit('login_attempt', email, 'loginForm');
      submitBtn.classList.add('loading');
      api('GET', { action: 'login', email: email, password: password }).then(function(d) {
        submitBtn.classList.remove('loading');
        if (d && d.success) {
          setUser(d.user);
          state.user = d.user;
          state.loggedIn = true;
          audit('login_success', email, 'loginForm');
          hideAuth();
          init();
          showToast('Signed in successfully', 'success');
        } else {
          audit('login_failed', email + ' - ' + ((d||{}).message||'error'), 'loginForm');
          loginError.textContent = (d && d.message) || 'Login failed. Please try again.';
          loginError.classList.remove('hidden');
        }
      });
    });

    document.getElementById('signupForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var name = document.getElementById('signupName').value.trim();
      var email = document.getElementById('signupEmail').value.trim();
      var pw = document.getElementById('signupPassword').value;
      var cf = document.getElementById('signupConfirm').value;
      var submitBtn = document.getElementById('signupSubmitBtn');
      var signupError = document.getElementById('signupError');
      if (pw !== cf) { signupError.textContent = 'Passwords do not match'; signupError.classList.remove('hidden'); return; }
      submitBtn.classList.add('loading');
      api('GET', { action: 'signup', fullName: name, email: email, password: pw }).then(function(d) {
        submitBtn.classList.remove('loading');
        if (d && d.success) {
          audit('signup_success', email, 'signupForm');
          document.querySelector('[data-tab="login"]').click();
          var loginError = document.getElementById('loginError');
          loginError.textContent = 'Account created! Please sign in.';
          loginError.classList.remove('hidden');
          loginError.style.color = 'var(--success)';
        } else {
          signupError.textContent = (d && d.message) || 'Signup failed. Please try again.';
          signupError.classList.remove('hidden');
        }
      });
    });

    document.getElementById('logoutBtn').addEventListener('click', function() {
      localStorage.removeItem(KEY);
      window.currentUser = null;
      state.user = null;
      state.loggedIn = false;
      audit('logout', '', 'logoutBtn');
      init();
      showToast('Signed out', 'info');
    });

    document.getElementById('userMenu').addEventListener('click', function(e) {
      e.stopPropagation();
      var dd = document.querySelector('.user-dropdown');
      if (dd) dd.classList.toggle('hidden');
    });
    document.addEventListener('click', function() {
      var dd = document.querySelector('.user-dropdown');
      if (dd) dd.classList.add('hidden');
    });

    document.getElementById('authModal').addEventListener('click', function(e) {
      if (e.target === this) hideAuth();
    });

    document.getElementById('searchFlightsBtn').addEventListener('click', function() {
      var origin = document.getElementById('fsOrigin').value.trim().toUpperCase();
      var dest = document.getElementById('fsDest').value.trim().toUpperCase();
      var date = document.getElementById('fsDate').value;
      var passengers = document.getElementById('fsPassengers').value;
      var cabin = document.getElementById('fsCabin').value;
      if (!origin || !dest) { showToast('Please enter origin and destination', 'warning'); return; }
      var btn = this;
      btn.classList.add('loading');
      api('GET', { action: 'flights.list', origin: origin, destination: dest, date: date, passengers: passengers, cabin: cabin }).then(function(data) {
        btn.classList.remove('loading');
        var results = document.getElementById('flightSearchResults');
        results.classList.remove('hidden');
        if (data && data.success && data.flights && data.flights.length > 0) {
          results.innerHTML = '<div class="card" style="padding:20px"><h4 style="font-size:16px;font-weight:700;margin-bottom:12px;text-align:center">Search Results (' + origin + ' \u2192 ' + dest + ')</h4>' +
            '<div class="flight-table">' + data.flights.map(function(f) {
              var sc = (f.status || 'scheduled').toLowerCase().replace(/\s+/g, '-');
              return '<div class="flight-row"><div class="flight-cell">' + (f.flight || f.flightNumber || '') + '</div><div class="flight-cell">' + (f.origin || origin) + ' \u2192 ' + (f.destination || dest) + '</div><div class="flight-cell"><span class="status-badge status-' + sc + '">' + (f.status || 'Scheduled') + '</span></div><div class="flight-cell">' + (f.departureTime || f.departure || '--:--') + '</div><div class="flight-cell">$' + (f.fare || f.price || '--') + '</div></div>';
            }).join('') + '</div></div>';
        } else {
          results.innerHTML = '<div class="card" style="padding:20px;text-align:center"><p style="color:var(--text-secondary)">No flights found for ' + origin + ' to ' + dest + ' on ' + date + '. Please try different dates or routes.</p></div>';
        }
      });
    });

    document.getElementById('searchRouteBtn').addEventListener('click', function() {
      var origin = document.getElementById('reOrigin').value.trim().toUpperCase();
      var dest = document.getElementById('reDest').value.trim().toUpperCase();
      if (!origin || !dest) { showToast('Please enter origin and destination', 'warning'); return; }
      var btn = this;
      btn.classList.add('loading');
      api('GET', { action: 'routes.list', origin: origin, destination: dest }).then(function(data) {
        btn.classList.remove('loading');
        var result = document.getElementById('routeResult');
        result.classList.remove('hidden');
        if (data && data.success) {
          var r = data.route || data;
          result.innerHTML = '<div class="route-card"><h4 style="font-size:16px;font-weight:700;margin-bottom:8px">' + origin + ' \u2192 ' + dest + '</h4>' +
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px">' +
            '<div><span style="font-size:11px;color:var(--text-muted);display:block;text-transform:uppercase;letter-spacing:0.5px">Distance</span><span style="font-size:16px;font-weight:700;font-family:var(--font-mono)">' + (r.distance || '--') + ' mi</span></div>' +
            '<div><span style="font-size:11px;color:var(--text-muted);display:block;text-transform:uppercase;letter-spacing:0.5px">Flight Time</span><span style="font-size:16px;font-weight:700;font-family:var(--font-mono)">' + (r.flightTime || r.duration || '--') + '</span></div>' +
            '<div><span style="font-size:11px;color:var(--text-muted);display:block;text-transform:uppercase;letter-spacing:0.5px">Est. Fare</span><span style="font-size:16px;font-weight:700;font-family:var(--font-mono)">$' + (r.fare || r.price || '--') + '</span></div></div></div>';
        } else {
          result.innerHTML = '<p style="color:var(--text-secondary)">Route information not found for ' + origin + ' to ' + dest + '.</p>';
        }
      });
    });

    document.getElementById('trackCargoBtn').addEventListener('click', function() {
      var tracking = document.getElementById('cargoInput').value.trim();
      if (!tracking) { showToast('Please enter a tracking number', 'warning'); return; }
      var btn = this;
      btn.classList.add('loading');
      api('GET', { action: 'cargo.status', tracking: tracking }).then(function(data) {
        btn.classList.remove('loading');
        var result = document.getElementById('cargoResult');
        result.classList.remove('hidden');
        if (data && data.success) {
          var c = data.cargo || data;
          result.innerHTML = '<div class="route-card"><h4 style="font-size:16px;font-weight:700;margin-bottom:8px">Cargo ' + tracking + '</h4>' +
            '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px">' +
            '<div><span style="font-size:11px;color:var(--text-muted);display:block">Status</span><span class="status-badge status-' + ((c.status||'pending').toLowerCase().replace(/\s+/g,'')) + '">' + (c.status || 'Pending') + '</span></div>' +
            '<div><span style="font-size:11px;color:var(--text-muted);display:block">Origin</span><span style="font-size:14px;font-weight:600">' + (c.origin || '--') + '</span></div>' +
            '<div><span style="font-size:11px;color:var(--text-muted);display:block">Destination</span><span style="font-size:14px;font-weight:600">' + (c.destination || '--') + '</span></div>' +
            '<div><span style="font-size:11px;color:var(--text-muted);display:block">Weight</span><span style="font-size:14px;font-weight:600">' + (c.weight || '--') + ' kg</span></div></div></div>';
        } else {
          result.innerHTML = '<p style="color:var(--text-secondary)">Cargo not found for tracking number: ' + tracking + '</p>';
        }
      });
    });
  });
})();
