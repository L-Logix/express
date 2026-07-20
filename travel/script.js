(function() {
  'use strict';
  var API = 'https://script.google.com/macros/s/AKfycbybXfKdhOFdXIOa2RTaF5YHeFWKYt6IU2_F87IH1LzvIzhU7UVEd4aVmK8_vKuAlBVp/exec';

  function audit(action, details, element) {
    var user = (window.currentUser || {}).email || '';
    var data = { action: 'audit.event', eventType: action, user: user, details: details || '', page: '/travel/', element: element || '', ua: navigator.userAgent, fingerprint: window.EA_TRACKER ? window.EA_TRACKER.fingerprint : '', ip: window.EA_TRACKER ? window.EA_TRACKER.ip : '' };
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

  audit('pageview', '/travel/', '');

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

  var HOTEL_CITIES = ['London', 'Paris', 'Tokyo', 'New York', 'Dubai', 'Singapore', 'Sydney', 'Los Angeles', 'Hong Kong', 'Bangkok'];
  var HOTEL_NAMES = ['Grand Palace Hotel', 'Royal Suites', 'City View Inn', 'Harbor Lodge', 'Skyline Hotel', 'Paradise Resort', 'Urban Comfort', 'Elite Stay', 'Cosmo Hotel', 'The Grand'];
  var CURRENCY_NAMES = { 'USD':'US Dollar','EUR':'Euro','GBP':'British Pound','JPY':'Japanese Yen','AUD':'Australian Dollar','CAD':'Canadian Dollar','CHF':'Swiss Franc','CNY':'Chinese Yuan','HKD':'Hong Kong Dollar','SGD':'Singapore Dollar','KRW':'South Korean Won','INR':'Indian Rupee','MXN':'Mexican Peso','BRL':'Brazilian Real','ZAR':'South African Rand','NZD':'New Zealand Dollar','SEK':'Swedish Krona','NOK':'Norwegian Krone','DKK':'Danish Krone','AED':'UAE Dirham','SAR':'Saudi Riyal','TRY':'Turkish Lira','RUB':'Russian Ruble','MYR':'Malaysian Ringgit','PHP':'Philippine Peso','IDR':'Indonesian Rupiah','THB':'Thai Baht','VND':'Vietnamese Dong','NGN':'Nigerian Naira','EGP':'Egyptian Pound' };
  var airportCodes = ['JFK','LHR','CDG','DXB','SIN','NRT','LAX','DOH','HKG','SYD'];
  var airportCityMap = {'JFK':'New York, USA','LHR':'London, UK','CDG':'Paris, France','DXB':'Dubai, UAE','SIN':'Singapore','NRT':'Tokyo, Japan','LAX':'Los Angeles, USA','DOH':'Doha, Qatar','HKG':'Hong Kong','SYD':'Sydney, Australia'};
  var destInfo = {
    'JFK':'New York City — the Big Apple. Home to iconic landmarks like the Statue of Liberty, Times Square, Central Park, and world-class museums. Best visited in spring (Apr-Jun) or fall (Sep-Nov).',
    'LHR':'London — a historic capital with Big Ben, Buckingham Palace, the British Museum, and West End theatres. Mild climate year-round. Public transport is excellent.',
    'CDG':'Paris — the City of Light. Famous for the Eiffel Tower, Louvre Museum, Notre-Dame, and French cuisine. Spring and fall are ideal seasons.',
    'DXB':'Dubai — a futuristic city with Burj Khalifa, palm islands, luxury shopping, and desert safaris. Best visited Nov-Mar when temperatures are pleasant.',
    'SIN':'Singapore — a clean, modern city-state with Gardens by the Bay, Marina Bay Sands, diverse food culture, and year-round tropical climate.',
    'NRT':'Tokyo — a blend of ultra-modern and traditional. Visit Shibuya, Senso-ji Temple, Akihabara, and enjoy world-class dining. Best in spring (cherry blossoms) or fall.',
    'LAX':'Los Angeles — entertainment capital with Hollywood Walk of Fame, Universal Studios, beaches, and diverse neighborhoods. Mediterranean climate, warm year-round.',
    'DOH':'Doha — a rapidly growing Gulf city with the Museum of Islamic Art, Souq Waqif, and futuristic skyline. Best visited Nov-Apr.',
    'HKG':'Hong Kong — a dynamic city with Victoria Harbour, Disneyland, dim sum culture, and stunning skyline. Best in fall (Oct-Dec) for pleasant weather.',
    'SYD':'Sydney — Australia\'s harbor city with the Opera House, Harbour Bridge, Bondi Beach, and vibrant arts scene. Best in Australian spring (Sep-Nov) or fall (Mar-May).'
  };

  var _rates = {};

  function loadCurrencies() {
    api('GET', { action: 'exchange.rates' }).then(function(data) {
      var container = document.getElementById('currencyTable');
      var fromSel = document.getElementById('convFrom');
      var toSel = document.getElementById('convTo');
      if (data && data.success && data.rates) {
        _rates = data.rates;
        var currs = Object.keys(_rates).sort();
        container.innerHTML = '<table class="currency-table"><thead><tr><th>Currency</th><th>Code</th><th style="text-align:right">Rate (vs USD)</th></tr></thead><tbody>' +
          currs.map(function(c) {
            return '<tr><td>' + (CURRENCY_NAMES[c] || c) + '</td><td class="code">' + c + '</td><td class="rate">' + parseFloat(_rates[c]).toFixed(4) + '</td></tr>';
          }).join('') + '</tbody></table>';
        fromSel.innerHTML = currs.map(function(c) { return '<option value="' + c + '"' + (c==='USD'?' selected':'') + '>' + c + '</option>'; }).join('');
        toSel.innerHTML = currs.map(function(c) { return '<option value="' + c + '"' + (c==='EUR'?' selected':'') + '>' + c + '</option>'; }).join('');
      } else {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:30px">Currency data unavailable</p>';
      }
    });
  }

  function loadDestAirports() {
    var sel = document.getElementById('destAirportSelect');
    sel.innerHTML = '<option value="">Select an airport...</option>' +
      airportCodes.map(function(c) { return '<option value="' + c + '">' + c + ' - ' + (airportCityMap[c] || c) + '</option>'; }).join('');
  }

  function getFallbackTravelData() {
    return [
      { destination:'London', hotel:'The Savoy', price:299, rating:4.7, currency:'GBP' },
      { destination:'Paris', hotel:'Hotel Ritz', price:450, rating:4.8, currency:'EUR' },
      { destination:'Tokyo', hotel:'Park Hyatt Tokyo', price:380, rating:4.6, currency:'JPY' },
      { destination:'New York', hotel:'The Plaza', price:520, rating:4.7, currency:'USD' },
      { destination:'Dubai', hotel:'Burj Al Arab', price:650, rating:4.9, currency:'AED' },
      { destination:'Singapore', hotel:'Marina Bay Sands', price:340, rating:4.5, currency:'SGD' },
      { destination:'Sydney', hotel:'Shangri-La Sydney', price:310, rating:4.4, currency:'AUD' },
      { destination:'Los Angeles', hotel:'Beverly Wilshire', price:420, rating:4.5, currency:'USD' },
      { destination:'Hong Kong', hotel:'The Peninsula', price:480, rating:4.6, currency:'HKD' },
      { destination:'Bangkok', hotel:'Mandarin Oriental', price:220, rating:4.7, currency:'THB' }
    ];
  }

  function loadData() {
    api('GET', { action: 'travel.deals' }).then(function(travelData) {
      if (travelData && travelData.success && travelData.deals) {
        console.log('[TRAVEL] Deals loaded from API', travelData.deals.length);
      } else {
        var fallback = getFallbackTravelData();
        console.log('[TRAVEL] Using fallback travel data', fallback.length);
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
    loadCurrencies();
    loadDestAirports();
  }

  function hideLoader() {
    var loader = document.getElementById('globalLoader');
    if (loader) { loader.classList.add('fade-out'); setTimeout(function(){loader.style.display='none'}, 600); }
  }

  document.addEventListener('DOMContentLoaded', function() {
    if (window.EA_TRACKER) { window.EA_TRACKER.init('/travel/'); }

    setInterval(function() {
      var user = getUser();
      api('GET', { action: 'heartbeat', user: (user||{}).email || '', fingerprint: (window.EA_TRACKER||{}).fingerprint||'', page: '/travel/', session: (user||{}).email || (window.EA_TRACKER||{}).fingerprint||'' });
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

    document.getElementById('hotelSearchBtn').addEventListener('click', function() {
      var city = document.getElementById('hotelCity').value.trim();
      if (!city) { showToast('Please enter a city name', 'warning'); return; }
      var btn = this;
      btn.classList.add('loading');
      api('GET', { action: 'hotels.search', city: city }).then(function(data) {
        btn.classList.remove('loading');
        var results = document.getElementById('hotelResults');
        results.classList.remove('hidden');
        if (data && data.success && data.hotels && data.hotels.length > 0) {
          results.innerHTML = data.hotels.map(function(h) {
            var stars = '';
            for (var i = 0; i < (h.stars || Math.floor(Math.random()*3)+3); i++) stars += '★';
            return '<div class="hotel-card"><div class="hotel-name">' + (h.name || 'Hotel') + '</div><div class="hotel-city">' + (h.city || city) + '</div><div class="hotel-rating">' + stars + ' <span style="color:var(--text-secondary);font-weight:400">' + (h.rating || '4.0') + '</span></div><div style="margin-top:8px"><span class="hotel-price">$' + (h.price || Math.floor(Math.random()*200)+80) + '</span><span style="color:var(--text-muted);font-size:13px"> / night</span></div></div>';
          }).join('');
        } else {
          var cityHotels = [];
          var matchedCity = null;
          for (var i = 0; i < HOTEL_CITIES.length; i++) {
            if (HOTEL_CITIES[i].toLowerCase().indexOf(city.toLowerCase()) !== -1) { matchedCity = HOTEL_CITIES[i]; break; }
          }
          if (!matchedCity) { matchedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase(); }
          for (var h = 0; h < 4; h++) {
            var idx = Math.floor(Math.random() * HOTEL_NAMES.length);
            cityHotels.push({ name: HOTEL_NAMES[idx], city: matchedCity, stars: Math.floor(Math.random()*2)+3, rating: (3.5 + Math.random()*1.5).toFixed(1), price: Math.floor(Math.random()*200)+80 });
          }
          results.innerHTML = cityHotels.map(function(h) {
            var stars = '';
            for (var i = 0; i < h.stars; i++) stars += '★';
            return '<div class="hotel-card"><div class="hotel-name">' + h.name + '</div><div class="hotel-city">' + h.city + '</div><div class="hotel-rating">' + stars + ' <span style="color:var(--text-secondary);font-weight:400">' + h.rating + '</span></div><div style="margin-top:8px"><span class="hotel-price">$' + h.price + '</span><span style="color:var(--text-muted);font-size:13px"> / night</span></div></div>';
          }).join('');
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
        } else if (_rates[from] && _rates[to]) {
          var rate = _rates[to] / _rates[from];
          result.innerHTML = amount.toFixed(2) + ' ' + from + ' = <span style="color:var(--accent)">' + (amount * rate).toFixed(2) + ' ' + to + '</span>';
        } else {
          result.innerHTML = 'Conversion unavailable';
        }
      });
    });

    document.getElementById('currencySearch').addEventListener('input', function() {
      var q = this.value.trim().toUpperCase();
      var rows = document.querySelectorAll('#currencyTable tbody tr');
      rows.forEach(function(row) {
        var text = row.textContent.toUpperCase();
        row.style.display = text.indexOf(q) !== -1 ? '' : 'none';
      });
    });

    document.getElementById('insQuoteBtn').addEventListener('click', function() {
      var dest = document.getElementById('insDest').value.trim();
      var duration = parseInt(document.getElementById('insDuration').value) || 7;
      var travelers = parseInt(document.getElementById('insTravelers').value) || 1;
      if (!dest) { showToast('Please enter a destination', 'warning'); return; }
      var btn = this;
      btn.classList.add('loading');
      api('GET', { action: 'insurance.quote', destination: dest, duration: duration.toString(), travelers: travelers.toString() }).then(function(d) {
        btn.classList.remove('loading');
        var result = document.getElementById('insResult');
        result.classList.remove('hidden');
        if (d && d.success) {
          var q = d.quote || d;
          result.innerHTML = '<div class="insurance-card"><h4>' + (q.plan || 'Travel Insurance') + '</h4><p style="color:var(--text-secondary);font-size:13px;margin-bottom:8px">' + dest + ' | ' + duration + ' days | ' + travelers + ' traveler(s)</p><div class="price">$' + (q.premium || q.price || '49.99') + '</div><div style="margin-top:12px;display:grid;grid-template-columns:repeat(2,1fr);gap:8px">' +
            '<div class="info-item"><span class="info-label">Coverage</span><span class="info-value">$' + (q.coverage || '100,000') + '</span></div>' +
            '<div class="info-item"><span class="info-label">Deductible</span><span class="info-value">$' + (q.deductible || '0') + '</span></div>' +
            '<div class="info-item"><span class="info-label">Medical</span><span class="info-value">Included</span></div>' +
            '<div class="info-item"><span class="info-label">Cancelation</span><span class="info-value">Included</span></div></div></div>';
        } else {
          var base = 49.99 + (duration > 7 ? (duration - 7) * 3 : 0) + (travelers > 1 ? (travelers - 1) * 25 : 0);
          result.innerHTML = '<div class="insurance-card"><h4>Standard Travel Insurance</h4><p style="color:var(--text-secondary);font-size:13px;margin-bottom:8px">' + dest + ' | ' + duration + ' days | ' + travelers + ' traveler(s)</p><div class="price">$' + base.toFixed(2) + '</div><div style="margin-top:12px;display:grid;grid-template-columns:repeat(2,1fr);gap:8px">' +
            '<div class="info-item"><span class="info-label">Coverage</span><span class="info-value">$100,000</span></div>' +
            '<div class="info-item"><span class="info-label">Deductible</span><span class="info-value">$0</span></div>' +
            '<div class="info-item"><span class="info-label">Medical</span><span class="info-value">Included</span></div>' +
            '<div class="info-item"><span class="info-label">Cancelation</span><span class="info-value">Included</span></div></div></div>';
        }
      });
    });

    document.getElementById('destGuideBtn').addEventListener('click', function() {
      var sel = document.getElementById('destAirportSelect');
      var code = sel.value;
      if (!code) { showToast('Please select an airport', 'warning'); return; }
      var result = document.getElementById('destResult');
      result.classList.remove('hidden');
      var info = destInfo[code] || 'A beautiful destination with rich culture and attractions. Research local customs, cuisine, and must-see landmarks before your trip.';
      result.innerHTML = '<div class="guide-card"><h4 style="font-size:18px;font-weight:700;margin-bottom:8px">' + (airportCityMap[code] || code) + '</h4><p style="color:var(--text-secondary);font-size:14px;line-height:1.7">' + info + '</p></div>';
    });

    document.getElementById('passportBtn').addEventListener('click', function() {
      var country = document.getElementById('passportCountry').value.trim();
      if (!country) { showToast('Please enter a country name', 'warning'); return; }
      var btn = this;
      btn.classList.add('loading');
      var uc = country.charAt(0).toUpperCase() + country.slice(1).toLowerCase();
      api('GET', { action: 'passport.info', country: uc }).then(function(d) {
        btn.classList.remove('loading');
        var result = document.getElementById('passportResult');
        result.classList.remove('hidden');
        if (d && d.success) {
          var p = d.passport || d;
          result.innerHTML = '<div class="passport-card"><h4 style="font-size:18px;font-weight:700;margin-bottom:12px">' + uc + '</h4><div class="info-grid">' +
            '<div class="info-item"><span class="info-label">Visa Required</span><span class="info-value">' + (p.visaRequired || 'Check embassy') + '</span></div>' +
            '<div class="info-item"><span class="info-label">Passport Validity</span><span class="info-value">' + (p.validity || '6 months') + '</span></div>' +
            '<div class="info-item"><span class="info-label">Visa on Arrival</span><span class="info-value">' + (p.visaOnArrival || 'Varies') + '</span></div>' +
            '<div class="info-item"><span class="info-label">Vaccination</span><span class="info-value">' + (p.vaccination || 'Check requirements') + '</span></div></div></div>';
        } else {
          result.innerHTML = '<div class="passport-card"><h4 style="font-size:18px;font-weight:700;margin-bottom:12px">' + uc + '</h4><div class="info-grid">' +
            '<div class="info-item"><span class="info-label">Visa Required</span><span class="info-value">Depends on nationality</span></div>' +
            '<div class="info-item"><span class="info-label">Passport Validity</span><span class="info-value">6 months recommended</span></div>' +
            '<div class="info-item"><span class="info-label">Visa on Arrival</span><span class="info-value">Check embassy website</span></div>' +
            '<div class="info-item"><span class="info-label">Vaccination</span><span class="info-value">Consult travel clinic</span></div></div></div>';
        }
      });
    });
  });
})();
