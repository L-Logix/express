(function() {
  'use strict';
  var API = 'https://script.google.com/macros/s/AKfycbybXfKdhOFdXIOa2RTaF5YHeFWKYt6IU2_F87IH1LzvIzhU7UVEd4aVmK8_vKuAlBVp/exec';

  function audit(action, details, element) {
    var user = (window.currentUser || {}).email || '';
    var data = { action: 'audit.event', eventType: action, user: user, details: details || '', page: '/airports/', element: element || '', ua: navigator.userAgent, fingerprint: window.EA_TRACKER ? window.EA_TRACKER.fingerprint : '', ip: window.EA_TRACKER ? window.EA_TRACKER.ip : '' };
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

  audit('pageview', '/airports/', '');

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

  var AIRPORT_CODES = ['JFK', 'LHR', 'CDG', 'DXB', 'SIN', 'NRT', 'LAX', 'DOH', 'HKG', 'SYD'];
  var COUNTRY_FLAGS = { 'US':'🇺🇸','GB':'🇬🇧','FR':'🇫🇷','AE':'🇦🇪','SG':'🇸🇬','JP':'🇯🇵','AU':'🇦🇺','QA':'🇶🇦','HK':'🇭🇰','CN':'🇨🇳','DE':'🇩🇪','IT':'🇮🇹','ES':'🇪🇸','CA':'🇨🇦','BR':'🇧🇷','IN':'🇮🇳','KR':'🇰🇷','NL':'🇳🇱','CH':'🇨🇭','SE':'🇸🇪' };
  var COUNTRY_NAMES = { 'US':'United States','GB':'United Kingdom','FR':'France','AE':'United Arab Emirates','SG':'Singapore','JP':'Japan','AU':'Australia','QA':'Qatar','HK':'Hong Kong','CN':'China','DE':'Germany','IT':'Italy','ES':'Spain','CA':'Canada','BR':'Brazil','IN':'India','KR':'South Korea','NL':'Netherlands','CH':'Switzerland','SE':'Sweden' };

  var loadedAirports = [];

  function getFallbackAirports() {
    return [
      { code:'JFK', name:'John F Kennedy International', city:'New York', country:'US', lat:40.6413, lng:-73.7781, timezone:'America/New_York' },
      { code:'LHR', name:'London Heathrow', city:'London', country:'GB', lat:51.4700, lng:-0.4543, timezone:'Europe/London' },
      { code:'CDG', name:'Charles de Gaulle', city:'Paris', country:'FR', lat:49.0097, lng:2.5479, timezone:'Europe/Paris' },
      { code:'DXB', name:'Dubai International', city:'Dubai', country:'AE', lat:25.2532, lng:55.3657, timezone:'Asia/Dubai' },
      { code:'SIN', name:'Singapore Changi', city:'Singapore', country:'SG', lat:1.3644, lng:103.9915, timezone:'Asia/Singapore' },
      { code:'NRT', name:'Narita International', city:'Tokyo', country:'JP', lat:35.7647, lng:140.3864, timezone:'Asia/Tokyo' },
      { code:'LAX', name:'Los Angeles International', city:'Los Angeles', country:'US', lat:33.9416, lng:-118.4085, timezone:'America/Los_Angeles' },
      { code:'DOH', name:'Hamad International', city:'Doha', country:'QA', lat:25.2731, lng:51.6081, timezone:'Asia/Qatar' },
      { code:'HKG', name:'Hong Kong International', city:'Hong Kong', country:'HK', lat:22.3080, lng:113.9185, timezone:'Asia/Hong_Kong' },
      { code:'SYD', name:'Sydney Kingsford Smith', city:'Sydney', country:'AU', lat:-33.9399, lng:151.1753, timezone:'Australia/Sydney' }
    ];
  }

  function loadAllAirports() {
    var placeholder = document.getElementById('airportsPlaceholder');
    var grid = document.getElementById('airportsGrid');
    var requests = AIRPORT_CODES.map(function(code) {
      return api('GET', { action: 'validateAirport', code: code });
    });
    Promise.all(requests).then(function(results) {
      placeholder.style.display = 'none';
      var allNull = results.every(function(r) { return r === null; });
      if (allNull) {
        var fallback = getFallbackAirports();
        loadedAirports = fallback;
        updateStats(fallback);
        renderAirports(fallback);
        return;
      }
      var valid = [];
      results.forEach(function(data, i) {
        if (data && data.success) {
          valid.push(data);
        } else {
          valid.push({ success:true, code:AIRPORT_CODES[i], name:'Unknown', city:'', country:'', lat:0, lng:0, timezone:'UTC' });
        }
      });
      loadedAirports = valid;
      updateStats(valid);
      renderAirports(valid);
    });
  }

  function renderAirports(list) {
    var grid = document.getElementById('airportsGrid');
    grid.innerHTML = '';
    list.forEach(function(ap) {
      var card = document.createElement('div');
      card.className = 'airport-card';
      var countryCode = (ap.country || '').substring(0,2).toUpperCase();
      var flag = COUNTRY_FLAGS[countryCode] || '🌐';
      var countryName = COUNTRY_NAMES[countryCode] || ap.country || 'Unknown';
      card.innerHTML =
        '<div class="airport-header">' +
          '<span class="airport-code">' + (ap.code || '--') + '</span>' +
          '<span class="airport-country">' + flag + ' ' + countryName + '</span>' +
        '</div>' +
        '<div class="airport-name">' + (ap.name || 'Unknown Airport') + '</div>' +
        '<div class="airport-city">' + (ap.city || ap.location || '') + '</div>' +
        '<div class="airport-details">' +
          '<div class="airport-detail"><span class="airport-detail-label">Latitude</span><span class="airport-detail-value">' + (ap.lat || '--') + '°</span></div>' +
          '<div class="airport-detail"><span class="airport-detail-label">Longitude</span><span class="airport-detail-value">' + (ap.lng || ap.lon || '--') + '°</span></div>' +
          '<div class="airport-detail"><span class="airport-detail-label">Timezone</span><span class="airport-detail-value">' + (ap.timezone || ap.tz || '--') + '</span></div>' +
          '<div class="airport-detail"><span class="airport-detail-label">Status</span><span class="airport-detail-value" style="color:var(--success)">Active</span></div>' +
        '</div>';
      grid.appendChild(card);
    });
  }

  function updateStats(airports) {
    var countries = {};
    airports.forEach(function(ap) {
      var c = (ap.country || '').substring(0,2).toUpperCase();
      if (c) countries[c] = true;
    });
    document.getElementById('totalAirports').textContent = airports.length;
    document.getElementById('countriesCovered').textContent = Object.keys(countries).length;
    document.getElementById('continentsCovered').textContent = Math.max(1, Math.ceil(Object.keys(countries).length / 2));
  }

  function loadCurrencyRates() {
    api('GET', { action: 'exchange.rates' }).then(function(data) {
      var container = document.getElementById('currencyRates');
      var fromSelect = document.getElementById('convFrom');
      var toSelect = document.getElementById('convTo');
      if (data && data.success && data.rates) {
        var rates = data.rates;
        container.innerHTML = '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:4px;padding:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);border-bottom:1px solid var(--border)"><span>Currency</span><span>Code</span><span style="text-align:right">Rate (vs USD)</span></div>';
        var currencies = Object.keys(rates).sort();
        fromSelect.innerHTML = '<option value="USD">USD</option>';
        toSelect.innerHTML = '<option value="EUR">EUR</option>';
        currencies.forEach(function(cur) {
          if (cur === 'USD') return;
          var rate = rates[cur];
          container.innerHTML += '<div class="currency-row"><span>' + cur + '</span><span class="currency-code">' + cur + '</span><span class="currency-rate" style="text-align:right">' + parseFloat(rate).toFixed(4) + '</span></div>';
          fromSelect.innerHTML += '<option value="' + cur + '">' + cur + '</option>';
          toSelect.innerHTML += '<option value="' + cur + '">' + cur + '</option>';
        });
        window._rates = rates;
      } else {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px">Exchange rates unavailable</p>';
      }
    });
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
    loadAllAirports();
    loadCurrencyRates();
  }

  function hideLoader() {
    var loader = document.getElementById('globalLoader');
    if (loader) { loader.classList.add('fade-out'); setTimeout(function(){loader.style.display='none'}, 600); }
  }

  document.addEventListener('DOMContentLoaded', function() {
    if (window.EA_TRACKER) { window.EA_TRACKER.init('/airports/'); }

    setInterval(function() {
      var user = getUser();
      api('GET', { action: 'heartbeat', user: (user||{}).email || '', fingerprint: (window.EA_TRACKER||{}).fingerprint||'', page: '/airports/', session: (user||{}).email || (window.EA_TRACKER||{}).fingerprint||'' });
    }, 60000);

    init();
    hideLoader();

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

    document.getElementById('airportSearchBtn').addEventListener('click', function() {
      var q = document.getElementById('airportSearch').value.trim().toUpperCase();
      if (!q) { showToast('Please enter a search term', 'warning'); return; }
      var filtered = loadedAirports.filter(function(ap) {
        var code = (ap.code || '').toUpperCase();
        var name = (ap.name || '').toUpperCase();
        var city = (ap.city || '').toUpperCase();
        return code.indexOf(q) !== -1 || name.indexOf(q) !== -1 || city.indexOf(q) !== -1;
      });
      if (filtered.length > 0) {
        renderAirports(filtered);
        showToast('Found ' + filtered.length + ' airports', 'success');
      } else {
        showToast('No airports found for "' + q + '"', 'warning');
      }
    });

    document.getElementById('weatherBtn').addEventListener('click', function() {
      var code = document.getElementById('weatherAirportCode').value.trim().toUpperCase();
      if (!code) { showToast('Please enter an airport code', 'warning'); return; }
      var btn = this;
      btn.classList.add('loading');
      api('GET', { action: 'validateAirport', code: code }).then(function(ap) {
        if (ap && ap.success && ap.lat && ap.lng) {
          var lat = ap.lat;
          var lng = ap.lng;
          var weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto';
          return fetch(weatherUrl).then(function(r) { return r.json(); }).then(function(w) {
            btn.classList.remove('loading');
            var result = document.getElementById('weatherResult');
            result.classList.remove('hidden');
            if (w && w.current) {
              var c = w.current;
              var weatherCodes = { 0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Depositing rime fog',51:'Light drizzle',53:'Moderate drizzle',55:'Dense drizzle',61:'Slight rain',63:'Moderate rain',65:'Heavy rain',71:'Slight snow',73:'Moderate snow',75:'Heavy snow',80:'Slight rain showers',81:'Moderate rain showers',82:'Violent rain showers',95:'Thunderstorm',96:'Thunderstorm with slight hail',99:'Thunderstorm with heavy hail' };
              var desc = weatherCodes[c.weather_code] || 'Unknown';
              var windDir = ['N','NE','E','SE','S','SW','W','NW'][Math.round(c.wind_direction_10m / 45) % 8] || '--';
              result.innerHTML = '<div class="weather-card"><div style="display:flex;align-items:center;justify-content:center;gap:16px">' +
                '<span class="weather-temp">' + Math.round(c.temperature_2m) + '°C</span>' +
                '<div><div class="weather-desc">' + desc + '</div><div style="font-size:13px;color:var(--text-secondary)">Feels like ' + Math.round(c.apparent_temperature) + '°C</div></div></div>' +
                '<div class="weather-details"><div class="weather-detail-item"><span style="font-size:10px;text-transform:uppercase;color:var(--text-muted);display:block">Humidity</span><span style="font-size:14px;font-weight:600">' + c.relative_humidity_2m + '%</span></div>' +
                '<div class="weather-detail-item"><span style="font-size:10px;text-transform:uppercase;color:var(--text-muted);display:block">Wind</span><span style="font-size:14px;font-weight:600">' + c.wind_speed_10m + ' km/h ' + windDir + '</span></div>' +
                '<div class="weather-detail-item"><span style="font-size:10px;text-transform:uppercase;color:var(--text-muted);display:block">Precip.</span><span style="font-size:14px;font-weight:600">' + (c.precipitation || '0') + ' mm</span></div></div></div>';
            } else {
              result.innerHTML = '<p style="color:var(--text-secondary)">Weather data unavailable for ' + code + '</p>';
            }
          });
        } else {
          btn.classList.remove('loading');
          document.getElementById('weatherResult').classList.remove('hidden');
          document.getElementById('weatherResult').innerHTML = '<p style="color:var(--text-secondary)">Airport not found: ' + code + '</p>';
        }
      });
    });

    document.getElementById('convBtn').addEventListener('click', function() {
      var amount = parseFloat(document.getElementById('convAmount').value);
      var from = document.getElementById('convFrom').value;
      var to = document.getElementById('convTo').value;
      if (!amount || amount <= 0) { showToast('Please enter a valid amount', 'warning'); return; }
      var btn = this;
      btn.classList.add('loading');
      api('GET', { action: 'exchange.convert', from: from, to: to, amount: amount.toString() }).then(function(d) {
        btn.classList.remove('loading');
        var result = document.getElementById('convResult');
        result.classList.remove('hidden');
        if (d && d.success) {
          result.innerHTML = amount.toFixed(2) + ' ' + from + ' = <span style="color:var(--accent)">' + parseFloat(d.result || d.converted).toFixed(2) + ' ' + to + '</span>';
        } else if (window._rates) {
          var rate = window._rates[to] / window._rates[from];
          var converted = amount * rate;
          result.innerHTML = amount.toFixed(2) + ' ' + from + ' = <span style="color:var(--accent)">' + converted.toFixed(2) + ' ' + to + '</span> (rate: ' + rate.toFixed(6) + ')';
        } else {
          result.innerHTML = 'Conversion failed';
        }
      });
    });

    document.getElementById('nearbyBtn').addEventListener('click', function() {
      var code = document.getElementById('nearbyCode').value.trim().toUpperCase();
      if (!code) { showToast('Please enter an airport code', 'warning'); return; }
      var btn = this;
      btn.classList.add('loading');
      api('GET', { action: 'validateAirport', code: code }).then(function(ap) {
        if (ap && ap.success && ap.lat && ap.lng) {
          var nearby = loadedAirports.filter(function(a) {
            if ((a.code||'').toUpperCase() === code) return false;
            if (a.lat && a.lng) {
              var dlat = (a.lat - ap.lat) * 111;
              var dlng = (a.lng - ap.lng) * 111 * Math.cos(ap.lat * Math.PI / 180);
              var dist = Math.sqrt(dlat*dlat + dlng*dlng);
              return dist < 1000;
            }
            return false;
          });
          btn.classList.remove('loading');
          var result = document.getElementById('nearbyResult');
          result.classList.remove('hidden');
          if (nearby.length > 0) {
            result.innerHTML = '<h4 style="font-size:14px;font-weight:700;margin-bottom:12px">Nearby Airports near ' + code + '</h4>' +
              '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">' +
              nearby.map(function(a) {
                return '<div class="route-card" style="padding:12px;text-align:center"><span class="airport-code" style="font-size:18px">' + (a.code||'') + '</span><div style="font-size:13px;color:var(--text-secondary);margin-top:4px">' + (a.name||'') + '</div></div>';
              }).join('') + '</div>';
          } else {
            result.innerHTML = '<p style="color:var(--text-secondary)">No nearby airports found within 1000 km of ' + code + '</p>';
          }
        } else {
          btn.classList.remove('loading');
          document.getElementById('nearbyResult').classList.remove('hidden');
          document.getElementById('nearbyResult').innerHTML = '<p style="color:var(--text-secondary)">Airport not found: ' + code + '</p>';
        }
      });
    });
  });
})();
