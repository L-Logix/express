(function() {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbyfr1k04IqvPSHND5I47ZowM8EAUmBuFR4pKJVWDdsB0ZCr4pMrCLxFME1v70aLbyWo/exec';

  const CACHE_TTL = 30000;
  const cache = {};

  function cached(key, fetcher, ttl) {
    const now = Date.now();
    if (cache[key] && now - cache[key].time < (ttl || CACHE_TTL)) return Promise.resolve(cache[key].data);
    return fetcher().then(data => { cache[key] = { data, time: now }; return data; }).catch(() => null);
  }

  function bustCache(key) { delete cache[key]; }

  let state = {
    user: null,
    userBookings: [],
    sections: [],
    events: [],
    documents: [],
    exchangeRate: 1,
    selectedCurrency: 'USD',
    currentStep: 1,
    totalSteps: 4,
    booking: {
      origin: '', destination: '', departDate: '', serviceType: 'EA',
      passengers: 1, paxCabin: 'Economy', promoCode: '', paymentMethod: 'cash',
      selectedSeat: '', ancillaries: [], passengersDetails: [],
      agreeTerms: false, agreePrivacy: false, agreePolicy: false
    },
    flightTime: 0, distance: 0, baseFare: 0, surgeFare: 0, totalFare: 0,
    weatherInfo: null, promoDiscount: 0, milesEarned: 0, milesBalance: 0,
    airportCache: {},
    _loading: false
  };

  const AIRPORT_DB = {
    JFK:{name:"John F. Kennedy",lat:40.6413,lng:-73.7781,city:"New York",country:"USA",type:"international"},
    LAX:{name:"Los Angeles International",lat:33.9425,lng:-118.4081,city:"Los Angeles",country:"USA",type:"international"},
    LHR:{name:"London Heathrow",lat:51.4700,lng:-0.4543,city:"London",country:"UK",type:"international"},
    CDG:{name:"Paris Charles de Gaulle",lat:49.0097,lng:2.5479,city:"Paris",country:"France",type:"international"},
    NRT:{name:"Tokyo Narita",lat:35.7653,lng:140.3931,city:"Tokyo",country:"Japan",type:"international"},
    SYD:{name:"Sydney",lat:-33.9461,lng:151.1772,city:"Sydney",country:"Australia",type:"international"},
    ORD:{name:"Chicago O'Hare",lat:41.9742,lng:-87.9073,city:"Chicago",country:"USA",type:"international"},
    DFW:{name:"Dallas/Fort Worth",lat:32.8975,lng:-97.0380,city:"Dallas",country:"USA",type:"international"},
    MIA:{name:"Miami International",lat:25.7959,lng:-80.2870,city:"Miami",country:"USA",type:"domestic"},
    BOS:{name:"Boston Logan",lat:42.3656,lng:-71.0096,city:"Boston",country:"USA",type:"domestic"},
    SFO:{name:"San Francisco",lat:37.6213,lng:-122.3790,city:"San Francisco",country:"USA",type:"domestic"},
    SEA:{name:"Seattle-Tacoma",lat:47.4502,lng:-122.3088,city:"Seattle",country:"USA",type:"domestic"},
    DEN:{name:"Denver",lat:39.8561,lng:-104.6737,city:"Denver",country:"USA",type:"domestic"},
    ATL:{name:"Atlanta",lat:33.6407,lng:-84.4277,city:"Atlanta",country:"USA",type:"domestic"},
    IAD:{name:"Washington Dulles",lat:38.9531,lng:-77.4475,city:"Washington",country:"USA",type:"international"},
    EWR:{name:"Newark Liberty",lat:40.6895,lng:-74.1745,city:"Newark",country:"USA",type:"international"},
    FRA:{name:"Frankfurt",lat:50.0379,lng:8.5622,city:"Frankfurt",country:"Germany",type:"international"},
    DXB:{name:"Dubai International",lat:25.2532,lng:55.3657,city:"Dubai",country:"UAE",type:"international"},
    HND:{name:"Tokyo Haneda",lat:35.5494,lng:139.7798,city:"Tokyo",country:"Japan",type:"international"},
    SIN:{name:"Singapore Changi",lat:1.3644,lng:103.9915,city:"Singapore",country:"Singapore",type:"international"}
  };

  const CURRENCY_SYMBOLS = {USD:'$',EUR:'€',GBP:'£',JPY:'¥',AUD:'A$'};

  function Toast(type, message, duration) {
    duration = duration || (type === 'error' ? 10000 : type === 'success' ? 8000 : type === 'warning' ? 8000 : 6000);
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = {success:'\u2713',error:'\u2715',warning:'\u26A0',info:'\u2139'};
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<span>' + (icons[type]||'') + '</span><span>' + message + '</span>';
    container.appendChild(t);
    setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, duration);
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function $(id) { return document.getElementById(id); }
  function showEl(id) { const el = $(id); if (el) el.classList.remove('hidden'); }
  function hideEl(id) { const el = $(id); if (el) el.classList.add('hidden'); }
  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return document.querySelectorAll(s); }

  function debounce(fn, ms) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  async function api(method, params, body, retries) {
    retries = retries || 1;
    for (let i = 0; i <= retries; i++) {
      try {
        const url = method === 'GET' ? API + '?' + new URLSearchParams(params) + '&t=' + Date.now() : API + '?t=' + Date.now();
        const opts = { method, cache: 'no-store', headers: {} };
        if (method === 'POST') { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body || {}); }
        const r = await fetch(url, opts);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
      } catch(e) {
        if (i === retries) return null;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
    return null;
  }

  function get(params) { return api('GET', params); }
  function post(body) { return api('GET', body); }

  function haversine(lat1, lng1, lat2, lng2) {
    const R = 3959;
    const dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function flightTime(distance) { return (distance / 500) + 0.25; }

  function lookupAirport(code) {
    code = (code||'').toUpperCase().trim();
    if (AIRPORT_DB[code]) return AIRPORT_DB[code];
    return state.airportCache[code] || null;
  }

  async function searchAirports(query) {
    if (!query || query.length < 2) return [];
    const results = [];
    const q = query.toUpperCase();
    for (const [code, ap] of Object.entries(AIRPORT_DB)) {
      if (code.startsWith(q) || ap.city.toUpperCase().startsWith(q) || ap.name.toUpperCase().includes(q)) results.push({code,...ap});
    }
    return cached('airports:' + query, async () => {
      try {
        const r = await fetch('https://opensky-network.org/api/airports/query?query=' + encodeURIComponent(query));
        if (r.ok) {
          const data = await r.json();
          if (data && data.length > 0) {
            for (const ap of data) {
              if (ap.icao && !results.find(x => x.code === ap.icao)) results.push({code:ap.icao,name:ap.name||'',lat:ap.lat||0,lng:ap.lng||0,city:ap.municipality||'',country:ap.country||'',type:'airport'});
            }
          }
        }
      } catch(e) {}
      return results;
    }, 60000);
  }

  async function getWeather(lat, lng) {
    return cached('weather:' + lat + ',' + lng, async () => {
      try {
        const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng + '&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit');
        if (r.ok) {
          const d = await r.json();
          const codes = {0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Foggy",48:"Foggy",51:"Light drizzle",53:"Moderate drizzle",55:"Heavy drizzle",61:"Slight rain",63:"Moderate rain",65:"Heavy rain",71:"Slight snow",73:"Moderate snow",75:"Heavy snow",80:"Slight showers",81:"Moderate showers",82:"Violent showers",85:"Light snow showers",86:"Heavy snow showers",95:"Thunderstorm"};
          return { temp: Math.round(d.current.temperature_2m), wind: Math.round(d.current.wind_speed_10m), condition: codes[d.current.weather_code] || "Unknown" };
        }
      } catch(e) {}
      return null;
    }, 300000);
  }

  async function loadExchangeRate() {
    const cached = localStorage.getItem('ea_exchange_rate');
    if (cached) { const c = JSON.parse(cached); if (Date.now() - c.time < 3600000) { state.exchangeRate = c.rate; return; } }
    try {
      const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (r.ok) {
        const d = await r.json();
        state.exchangeRate = d.rates;
        localStorage.setItem('ea_exchange_rate', JSON.stringify({ rate: state.exchangeRate, time: Date.now() }));
      }
    } catch(e) {}
  }

  function formatPrice(usd) {
    const rate = state.exchangeRate && state.exchangeRate[state.selectedCurrency] ? state.exchangeRate[state.selectedCurrency] : 1;
    const sym = CURRENCY_SYMBOLS[state.selectedCurrency] || '$';
    const converted = usd * rate;
    if (state.selectedCurrency === 'JPY') return sym + Math.round(converted).toLocaleString();
    return sym + converted.toFixed(2);
  }

  function calculateFare(origin, dest, serviceType, departDate, cabin, passengers, promoDiscount) {
    if (!origin || !dest) return { base: 0, surge: 0, total: 0, milesEarned: 0, distance: 0, flightTime: 0 };
    const o = lookupAirport(origin), d = lookupAirport(dest);
    if (!o || !d) return { base: 0, surge: 0, total: 0, milesEarned: 0, distance: 0, flightTime: 0 };
    const dist = haversine(o.lat, o.lng, d.lat, d.lng);
    let fare = 100 + (dist * 0.10);
    if (serviceType === 'EA') fare *= 1.25;
    else if (serviceType === 'EX') fare *= 0.95;
    else if (serviceType === 'EC') fare *= 1.75;
    const dow = new Date(departDate).getDay();
    if (dow === 5 || dow === 6 || dow === 0) fare *= 1.15;
    fare *= 1.08;
    const baseFare = Math.round(Math.max(fare, 50));
    const cabinMul = {Economy:1,Business:2.5,FirstClass:5};
    let surge = baseFare;
    const daysUntil = Math.ceil((new Date(departDate) - new Date()) / 86400000);
    if (daysUntil <= 3 && daysUntil > 0) surge = Math.round(baseFare * 1.35);
    else if (daysUntil <= 7 && daysUntil > 0) surge = Math.round(baseFare * 1.20);
    const perPax = surge * (cabinMul[cabin] || 1);
    const total = Math.round(perPax * (passengers || 1) * (1 - (promoDiscount || 0) / 100));
    const milesEarned = Math.round(dist);
    return { base: baseFare, surge, total, milesEarned, distance: Math.round(dist), flightTime: flightTime(dist) };
  }

  async function loadLiveState() {
    const d = await cached('liveState', () => get({ action: 'getLiveState' }), 15000);
    if (!d || !d.success) return;
    if (d.hero) {
      const h = d.hero;
      if (h.image) $('heroBg').style.backgroundImage = 'url(' + h.image + ')';
      if (h.headline) {
        const parts = h.headline.split('. ');
        if (parts.length >= 2) { $('heroLine1').textContent = parts[0] + '.'; $('heroLine2').textContent = parts.slice(1).join('. '); }
        else { $('heroLine1').textContent = h.headline; $('heroLine2').textContent = ''; }
      }
      if (h.subheader) $('heroSub').textContent = h.subheader;
    }
    if (d.sections && d.sections.length > 0) {
      state.sections = d.sections;
      const grid = $('sectionsGrid');
      if (grid) {
        grid.innerHTML = d.sections.map(s => '<a href="' + esc(s.Link||'#') + '" class="section-card"' + (s.Link && s.Link!=='#' ? '' : ' onclick="return false"') + '>' +
          (s.Image ? '<img src="' + esc(s.Image) + '" alt="' + esc(s.Title) + '" loading="lazy">' : '') +
          '<div class="section-card-body"><h3>' + esc(s.Title||'') + '</h3><p>' + esc(s.Description||'') + '</p></div></a>'
        ).join('');
      }
    }
    if (d.events) {
      state.events = d.events;
      const scroll = $('eventsScroll');
      if (scroll) {
        scroll.innerHTML = d.events.map(e => '<div class="event-card">' +
          (e.image ? '<img src="' + esc(e.image) + '" alt="' + esc(e.title) + '" loading="lazy">' : '') +
          '<div class="event-card-body"><div class="event-date">' + esc(e.date||'') + '</div>' +
          '<h4>' + esc(e.title||'') + '</h4><p>' + esc(e.description||'') + '</p></div></div>'
        ).join('');
      }
    }
    if (d.documents) {
      state.documents = d.documents;
      updateDocuments();
    }
    if (d.stats) {
      ['Users','Bookings','Documents'].forEach(k => {
        const el = $('stat' + k);
        if (el) el.textContent = d.stats['total' + k] || 0;
      });
    }
  }

  function updateDocuments() {
    const docs = state.documents;
    const grid = $('docsVault');
    if (!grid) return;
    if (!docs || docs.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">No documents available</div>';
      return;
    }
    const icons = {document:'\uD83D\uDCC4',presentation:'\uD83D\uDCCA',spreadsheet:'\uD83D\uDCC8',pdf:'\uD83D\uDCD5',image:'\uD83D\uDDBC'};
    const colors = ['#4f8cff','#00d4aa','#fbbf24','#a78bfa','#ef4444'];
    grid.innerHTML = docs.map((doc, idx) => {
      const ci = idx % colors.length;
      const isConf = doc.confidential === 'TRUE' || doc.requiresRequest === true || doc.requiresRequest === 'TRUE';
      return '<div class="doc-card-vault" style="position:relative" data-id="' + esc(doc.id) + '" data-conf="' + isConf + '">' +
        (isConf ? '<div class="doc-lock">\uD83D\uDD12</div>' : '') +
        '<div class="doc-icon">' + (icons[doc.type]||'\uD83D\uDCC4') + '</div>' +
        '<h4>' + esc(doc.title) + '</h4>' +
        '<p>' + (doc.description||'').slice(0,80) + '</p>' +
        '<div style="margin-top:8px;display:flex;gap:6px">' +
        '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:' + colors[ci] + '22;color:' + colors[ci] + ';font-weight:600">' + esc(doc.category||'General') + '</span>' +
        (isConf ? '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(239,68,68,0.15);color:var(--danger);font-weight:600">Confidential</span>' : '') +
        '</div></div>';
    }).join('');
    grid.querySelectorAll('.doc-card-vault').forEach(el => {
      el.addEventListener('click', () => {
        const doc = docs.find(d => String(d.id) === String(el.dataset.id));
        if (!doc) return;
        if (el.dataset.conf === 'true') showDocRequestModal(doc);
        else window.open(doc.fileId || doc.link || '#', '_blank');
      });
    });
  }

  function showDocRequestModal(doc) {
    const existing = qs('.modal-overlay.doc-request');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay doc-request';
    overlay.innerHTML = '<div class="modal modal-sm"><button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">\u00D7</button>' +
      '<div class="modal-header"><h3>Request Document Access</h3><p>' + esc(doc.title) + '</p></div>' +
      '<div class="form-group"><label class="form-label">Your Email</label><input type="email" class="form-input" id="docReqEmail" placeholder="you@expressairways.com" value="' + esc(state.user ? state.user.email : '') + '"></div>' +
      '<div class="form-group"><label class="form-label">Reason for Access</label><textarea class="form-input" id="docReqReason" rows="3" placeholder="Why do you need access to this document?"></textarea></div>' +
      '<button class="btn btn-primary btn-full" id="docReqSubmit">Submit Request</button></div>';
    document.body.appendChild(overlay);
    $('docReqSubmit').onclick = async () => {
      const email = $('docReqEmail').value.trim();
      const reason = $('docReqReason').value.trim();
      if (!email || !reason) return Toast('error', 'Please fill in all fields');
      const d = await post({ action: 'requestDoc', user: email, docTitle: doc.title || doc.id, reason, userName: state.user ? state.user.name : '' });
      if (d && d.success) { Toast('success', 'Access request submitted'); overlay.remove(); }
      else Toast('error', d && d.message ? d.message : 'Request failed');
    };
  }

  function updateNavAuth() {
      hideEl('loginBtn'); hideEl('signupBtn'); hideEl('userMenu');
    if (state.user) {
      showEl('userMenu');
      if (state.user) {
        $('avatarInitials').textContent = (state.user.name || 'U').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
        $('dropdownName').textContent = state.user.name;
        $('dropdownEmail').textContent = state.user.email;
        $('milesDisplay').textContent = (state.user.miles || 0).toLocaleString() + ' miles';
        $('tierDisplay').textContent = state.user.loyaltyTier || 'Basic';
      }
    } else {
      showEl('loginBtn'); showEl('signupBtn');
    }
  }

  async function login(email, password) {
    const d = await post({ action: 'login', email, password });
    if (d && d.success) {
      state.user = d.user;
      localStorage.setItem('ea_user', JSON.stringify(d.user));
      updateNavAuth();
      hideEl('authModal');
      document.body.style.overflow = '';
      Toast('success', 'Welcome back, ' + d.user.name + '!');
      showPortal();
      return true;
    }
    Toast('error', d && d.message ? d.message : 'Login failed');
    return false;
  }

  async function signup(fullName, email, password) {
    const d = await post({ action: 'signup', fullName, email, password });
    if (d && d.success) { Toast('success', 'Account created! Please sign in.'); switchAuthTab('login'); return true; }
    Toast('error', d && d.message ? d.message : 'Signup failed');
    return false;
  }

  function logout() {
    state.user = null;
    localStorage.removeItem('ea_user');
    updateNavAuth();
    Toast('info', 'Signed out');
    showSection('home');
  }

  function switchAuthTab(tab) {
    qsa('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    hideEl('loginForm'); hideEl('signupForm');
    showEl(tab + 'Form');
  }

  function showSection(section) {
    qsa('[data-section]').forEach(el => el.classList.remove('active'));
    qs('[data-section="' + section + '"]')?.classList.add('active');
    ['portalSection','contactSection','travelAgentSection','bookingWizardSection'].forEach(id => { const el = $(id); if (el) el.style.display = 'none'; });
    if (section === 'home') {
      $('sectionsSection').style.display = '';
      $('bookingCard').style.display = '';
    } else if (section === 'portal') {
      $('sectionsSection').style.display = 'none';
      $('bookingCard').style.display = 'none';
      $('portalSection').style.display = '';
      updatePortal();
    } else if (section === 'contact') {
      $('sectionsSection').style.display = 'none';
      $('bookingCard').style.display = 'none';
      $('contactSection').style.display = '';
    } else if (section === 'travelAgent') {
      $('sectionsSection').style.display = 'none';
      $('bookingCard').style.display = 'none';
      $('travelAgentSection').style.display = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showPortal() { showSection('portal'); }

  async function updatePortal() {
    if (!state.user) return;
    const tabs = ['bookings','events','documents','settings'];
    tabs.forEach(t => hideEl(t + 'Tab'));
    showEl('bookingsTab');
    qsa('.portal-tab').forEach(el => el.classList.toggle('active', el.dataset.portal === 'bookings'));
    loadUserBookings();
    loadUserProfile();
    updateDocuments();
  }

  async function loadUserBookings() {
    const list = $('bookingsList');
    if (!list) return;
    list.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner" style="margin:0 auto"></div></div>';
    const d = await get({ action: 'getUserBookings', email: state.user.email });
    if (d && d.success) { state.userBookings = d.bookings || []; renderBookings(); }
    else list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">No bookings found</div>';
  }

  function renderBookings() {
    const list = $('bookingsList');
    if (!list) return;
    if (state.userBookings.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><p>No bookings yet. Start planning your next flight!</p></div>';
      return;
    }
    list.innerHTML = state.userBookings.map(b => {
      const statusClass = (b.Status||'').toLowerCase();
      return '<div class="booking-card-item">' +
        '<div class="booking-card-header"><span class="booking-ref">' + esc(b.BookingRef||'') + '</span>' +
        '<span class="booking-status ' + statusClass + '">' + esc(b.Status||'PENDING') + '</span></div>' +
        '<div class="booking-details">' +
        esc(b.Origin||'') + ' \u2192 ' + esc(b.Destination||'') + ' | ' + esc(b.DepartDate||'') + '<br>' +
        'Service: ' + esc(b.ServiceType||'EA') + ' | Cabin: ' + esc(b.PaxCabin||'Economy') + ' | Passengers: ' + (b.Passengers||1) + '<br>' +
        'Total: ' + formatPrice(parseFloat(b.TotalPrice)||0) + (b.PaymentMethod === 'miles' ? ' (Miles)' : '') +
        '</div>' +
        '<div class="booking-actions">' +
        '<button class="btn btn-sm btn-primary" onclick="viewETicket(\'' + b.BookingRef + '\')">eTicket</button>' +
        (b.Status !== 'CANCELLED' ? '<button class="btn btn-sm btn-outline" onclick="manageBooking(\'' + b.BookingRef + '\')">Change</button><button class="btn btn-sm btn-outline" style="color:var(--danger)" onclick="cancelBooking(\'' + b.BookingRef + '\')">Cancel</button>' : '') +
        '</div></div>';
    }).join('');
  }

  function getBookingDetail(ref) {
    return (state.userBookings || []).find(b => b.BookingRef === ref) || null;
  }

  window.viewETicket = async function(ref) {
    const b = getBookingDetail(ref);
    if (!b) return Toast('error', 'Booking not found');
    showETicket(b);
  };

  window.manageBooking = async function(ref) {
    const b = getBookingDetail(ref);
    if (!b) return Toast('error', 'Booking not found');
    showManageModal(b);
  };

  window.cancelBooking = async function(ref) {
    if (!confirm('Cancel booking ' + ref + '?')) return;
    const d = await post({ action: 'cancel', bookingRef: ref, email: state.user.email });
    if (d && d.success) { Toast('success', 'Booking cancelled'); loadUserBookings(); }
    else Toast('error', d && d.message ? d.message : 'Cancellation failed');
  };

  function showETicket(b) {
    const existing = qs('.modal-overlay.eticket-modal');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay eticket-modal';
    overlay.style.alignItems = 'flex-start';
    overlay.style.padding = '80px 20px 40px';
    overlay.innerHTML = '<div class="eticket" id="eticketPrint">' +
      '<div class="eticket-header"><h2>Express Airways</h2><p class="eticket-ref">Electronic Ticket | Booking Reference: ' + esc(b.BookingRef||'') + '</p></div>' +
      '<div class="eticket-body">' +
      '<div class="eticket-section"><h3>Flight Itinerary</h3>' +
      '<div class="eticket-row"><span class="label">From</span><span class="value">' + esc(b.Origin) + ' - ' + esc(lookupAirport(b.Origin) ? lookupAirport(b.Origin).city + ', ' + lookupAirport(b.Origin).country : '') + '</span></div>' +
      '<div class="eticket-row"><span class="label">To</span><span class="value">' + esc(b.Destination) + ' - ' + esc(lookupAirport(b.Destination) ? lookupAirport(b.Destination).city + ', ' + lookupAirport(b.Destination).country : '') + '</span></div>' +
      '<div class="eticket-row"><span class="label">Departure</span><span class="value">' + esc(b.DepartDate||'TBD') + '</span></div>' +
      '<div class="eticket-row"><span class="label">Service</span><span class="value">' + (b.ServiceType === 'EA' ? 'Express Airways (International)' : b.ServiceType === 'EX' ? 'Explore Airways (Domestic)' : 'Express Charter') + '</span></div>' +
      '<div class="eticket-row"><span class="label">Cabin</span><span class="value">' + esc(b.PaxCabin||'Economy') + '</span></div>' +
      '<div class="eticket-row"><span class="label">Passengers</span><span class="value">' + (b.Passengers||1) + '</span></div></div>' +
      passengerManifestHTML(b) +
      '<div class="eticket-section"><h3>Payment Summary</h3>' +
      '<div class="eticket-row"><span class="label">Total Paid</span><span class="value">' + formatPrice(parseFloat(b.TotalPrice)||0) + '</span></div>' +
      '<div class="eticket-row"><span class="label">Payment Method</span><span class="value">' + esc(b.PaymentMethod||'Credit') + '</span></div></div>' +
      '</div>' +
      '<div class="eticket-footer">' +
      '<p><strong>Important:</strong> Arrive 2h (domestic) / 3h (international) before departure. Valid photo ID required. Baggage: 1 carry-on (7kg) + 1 checked (23kg) per passenger.</p>' +
      '<p style="margin-top:8px">Express Airways | ' + new Date().getFullYear() + ' | All rights reserved</p></div></div>' +
      '<div style="display:flex;gap:12px;margin-top:16px;justify-content:center;flex-wrap:wrap">' +
      '<button class="btn btn-primary" onclick="window.print()">\uD83D\uDDA8\uFE0F Print eTicket</button>' +
      '<button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  function passengerManifestHTML(b) {
    const names = (b.PaxName||'').split(',').filter(n => n.trim());
    if (names.length === 0) return '<div class="eticket-section"><h3>Passenger Details</h3><p style="color:var(--text-muted);font-size:13px">Details will be added before departure.</p></div>';
    return '<div class="eticket-section"><h3>Passengers</h3>' +
      names.map((n, i) => '<div style="background:var(--bg-glass);border-radius:8px;padding:12px;margin-bottom:8px">' +
        '<p><strong>Passenger ' + (i+1) + ':</strong> ' + esc(n.trim()) + '</p></div>'
      ).join('') + '</div>';
  }

  function showManageModal(b) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal modal-lg"><button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">\u00D7</button>' +
      '<div class="modal-header"><h3>Manage Booking</h3><p>' + esc(b.BookingRef) + '</p></div>' +
      '<div class="form-group"><label class="form-label">Departure Date</label><input type="date" class="form-input" id="manageDate" value="' + esc(b.DepartDate||'') + '"></div>' +
      '<div class="form-group"><label class="form-label">Cabin</label><select class="form-input" id="manageCabin"><option value="Economy" ' + ((b.PaxCabin||'Economy') === 'Economy' ? 'selected' : '') + '>Economy</option><option value="Business" ' + ((b.PaxCabin||'') === 'Business' ? 'selected' : '') + '>Business</option><option value="FirstClass" ' + ((b.PaxCabin||'') === 'FirstClass' ? 'selected' : '') + '>First Class</option></select></div>' +
      '<div class="form-group"><label class="form-label">Passenger Names</label><input class="form-input" id="manageNames" value="' + esc(b.PaxName||'') + '"></div>' +
      '<button class="btn btn-primary btn-full" id="manageSaveBtn">Save Changes</button></div>';
    document.body.appendChild(overlay);
    $('manageSaveBtn').onclick = async () => {
      const departDate = $('manageDate').value;
      const cabin = $('manageCabin').value;
      const names = $('manageNames').value;
      if (!departDate) return Toast('error', 'Departure date required');
      const d = await post({ action: 'admin.updateBooking', bookingRef: b.BookingRef, departDate, cabin, paxName: names, email: state.user.email });
      if (d && d.success) { Toast('success', 'Booking updated'); overlay.remove(); loadUserBookings(); }
      else Toast('error', d && d.message ? d.message : 'Update failed');
    };
  }

  async function loadUserProfile() {
    if (!state.user) return;
    const d = await get({ action: 'getUser', email: state.user.email });
    if (d && d.success && d.user) {
      state.user.miles = d.user.miles || 0;
      state.user.loyaltyTier = d.user.loyaltyTier || 'Basic';
      state.milesBalance = d.user.miles || 0;
      updateNavAuth();
      $('settingsName').value = d.user.name || '';
      $('settingsEmail').value = d.user.email || '';
      $('settingsMiles').textContent = (d.user.miles || 0).toLocaleString();
      $('settingsTier').textContent = d.user.loyaltyTier || 'Basic';
    }
  }

  async function saveAccountSettings() {
    const name = $('settingsName').value.trim();
    if (!name) return Toast('error', 'Name required');
    const d = await post({ action: 'admin.updateUser', email: state.user.email, fullName: name });
    if (d && d.success) { state.user.name = name; localStorage.setItem('ea_user', JSON.stringify(state.user)); updateNavAuth(); Toast('success', 'Account updated'); }
    else Toast('error', d && d.message ? d.message : 'Update failed');
  }

  function switchPortalTab(tab) {
    qsa('.portal-tab').forEach(el => el.classList.toggle('active', el.dataset.portal === tab));
    ['bookings','events','documents','settings'].forEach(t => hideEl(t + 'Tab'));
    showEl(tab + 'Tab');
    if (tab === 'bookings') loadUserBookings();
    if (tab === 'documents') updateDocuments();
  }

  function initBooking() {
    state.currentStep = 1;
    const today = new Date();
    const returnDate = new Date(today);
    returnDate.setDate(returnDate.getDate() + 3);
    const todayStr = today.toISOString().split('T')[0];
    const retStr = returnDate.toISOString().split('T')[0];
    state.booking = { origin:'', destination:'', departDate:'', serviceType:'EA', passengers:1, paxCabin:'Economy', promoCode:'', paymentMethod:'cash', selectedSeat:'', ancillaries:[], passengersDetails:[], agreeTerms:false, agreePrivacy:false, agreePolicy:false, tripType:'round' };
    updateBookingUI();
    updateSteps();
    const di = $('dateInput');
    if (di) { di.setAttribute('min', todayStr); if (!di.value) di.value = todayStr; }
    const ri = $('returnDateInput');
    if (ri) { ri.setAttribute('min', todayStr); if (!ri.value) ri.value = retStr; }
    const cs = $('carrierSelect');
    if (cs) { cs.value = state.booking.serviceType; $('charterTimeRow').style.display = 'none'; }
    $('extraFieldsRow').style.display = 'none';
  }

  const searchOrigin = debounce(async function() {
    const val = $('originInput').value.trim();
    const list = $('originList');
    if (!list || val.length < 2) { list.innerHTML = ''; return; }
    const results = await searchAirports(val);
    list.innerHTML = results.map(r => '<option value="' + r.code + ' - ' + r.city + ', ' + r.country + '">').join('');
  }, 250);

  const searchDest = debounce(async function() {
    const val = $('destInput').value.trim();
    const list = $('destList');
    if (!list || val.length < 2) { list.innerHTML = ''; return; }
    const results = await searchAirports(val);
    list.innerHTML = results.map(r => '<option value="' + r.code + ' - ' + r.city + ', ' + r.country + '">').join('');
  }, 250);

  function parseAirportInput(val) {
    const parts = (val||'').trim().split(' - ');
    return parts[0].toUpperCase().trim();
  }

  async function updateFarePreview() {
    const origin = parseAirportInput($('originInput') ? $('originInput').value : '');
    const dest = parseAirportInput($('destInput') ? $('destInput').value : '');
    const departDate = $('dateInput') ? $('dateInput').value : '';
    const serviceType = state.booking.serviceType;
    const cabin = $('cabinSelect') ? $('cabinSelect').value : 'Economy';
    const pax = parseInt($('paxInput') ? $('paxInput').value : 1) || 1;
    const promo = $('promoInput') ? $('promoInput').value : '';

    state.booking.origin = origin; state.booking.destination = dest; state.booking.departDate = departDate;
    state.booking.paxCabin = cabin; state.booking.passengers = pax; state.booking.promoCode = promo;

    if (origin && dest && origin.length === 3 && dest.length === 3) {
      const oData = lookupAirport(origin);
      const dData = lookupAirport(dest);
      if (oData && dData) {
        state.distance = Math.round(haversine(oData.lat, oData.lng, dData.lat, dData.lng));
        $('distanceDisplay').textContent = state.distance.toLocaleString() + ' mi';
        $('flightTimeDisplay').textContent = flightTime(state.distance).toFixed(1) + 'h';
        $('extraFieldsRow').style.display = '';

        const weather = await getWeather(dData.lat, dData.lng);
        if (weather) { state.weatherInfo = weather; $('weatherDisplay').innerHTML = '\uD83C\uDF26\uFE0F ' + weather.condition + ', ' + weather.temp + '\u00B0F'; }
        else $('weatherDisplay').innerHTML = '';

        let promoDiscount = 0;
        const ps = $('promoStatus');
        if (promo) {
          const pRes = await post({ action: 'validatePromo', code: promo });
          if (pRes && pRes.success) { promoDiscount = pRes.discountPercent || 0; ps.textContent = (promoDiscount > 0 ? promoDiscount + '% off!' : 'Valid!'); ps.style.color = 'var(--success)'; }
          else { ps.textContent = 'Invalid code'; ps.style.color = 'var(--danger)'; }
        } else { ps.textContent = ''; }
        state.promoDiscount = promoDiscount;

        if (departDate) {
          const fare = calculateFare(origin, dest, serviceType, departDate, cabin, pax, promoDiscount);
          state.baseFare = fare.base; state.surgeFare = fare.surge; state.totalFare = fare.total; state.milesEarned = fare.milesEarned;
          $('totalDisplay').textContent = formatPrice(fare.total);
          $('milesEarnedDisplay').textContent = fare.milesEarned.toLocaleString();
        }
      }
    } else {
      $('extraFieldsRow').style.display = 'none';
    }
  }

  function updateSteps() {
    for (let i = 1; i <= state.totalSteps; i++) {
      const dot = qs('.step-dot[data-step="' + i + '"]');
      if (dot) { dot.classList.toggle('active', i === state.currentStep); dot.classList.toggle('completed', i < state.currentStep); }
      const line = qs('.step-line[data-step="' + i + '"]');
      if (line) line.classList.toggle('completed', i < state.currentStep);
    }
    for (let i = 1; i <= state.totalSteps; i++) {
      const step = $('step' + i);
      if (step) step.classList.toggle('active', i === state.currentStep);
    }
  }

  function updateBookingUI() {
    $('stepIndicators').innerHTML = '';
    for (let i = 1; i <= state.totalSteps; i++) {
      if (i > 1) $('stepIndicators').insertAdjacentHTML('beforeend', '<div class="step-line" data-step="' + i + '"></div>');
      $('stepIndicators').insertAdjacentHTML('beforeend', '<div class="step-dot" data-step="' + i + '"></div>');
    }
  }

  function validateBooking() {
    return new Promise((resolve) => {
      const pd = state.booking.passengersDetails;
      if (pd.length === 0) { Toast('error', 'Please fill in passenger details'); return resolve(false); }
      for (const p of pd) {
        if (!p.name || !p.dob || !p.gender || !p.passport || !p.phone) { Toast('error', 'Complete all passenger fields'); return resolve(false); }
      }
      if (!state.booking.agreeTerms || !state.booking.agreePrivacy || !state.booking.agreePolicy) { Toast('error', 'Please agree to Terms, Privacy, and Booking Policy'); return resolve(false); }
      resolve(true);
    });
  }

  async function submitBooking() {
    const valid = await validateBooking();
    if (!valid) return;
    const btn = $('bookingSubmit');
    if (btn) { btn.disabled = true; btn.textContent = 'Booking...'; }

    const pd = state.booking.passengersDetails;
    const d = await post({
      action: 'booking', email: state.user.email,
      origin: state.booking.origin, destination: state.booking.destination, departDate: state.booking.departDate,
      serviceType: state.booking.serviceType, passengers: state.booking.passengers, paxCabin: state.booking.paxCabin,
      paymentMethod: state.booking.paymentMethod, promoCode: state.booking.promoCode,
      paxName: pd.map(p=>p.name).join(','), paxDOB: pd.map(p=>p.dob).join(','), paxGender: pd.map(p=>p.gender).join(','),
      paxPassport: pd.map(p=>p.passport).join(','), paxPhone: pd.map(p=>p.phone).join(',')
    });

    if (btn) { btn.disabled = false; btn.textContent = 'Confirm & Book'; }

    if (d && d.success) {
      Toast('success', 'Booking confirmed! Ref: ' + d.bookingRef);
      state.currentStep = 4;
      updateSteps();
      $('confirmationRef').textContent = d.bookingRef;
      $('confirmationFare').textContent = formatPrice(d.totalFare || state.totalFare);
      $('confirmationMiles').textContent = (d.milesEarned || state.milesEarned || 0).toLocaleString();
      $('confirmationStatus').textContent = 'CONFIRMED';
      const sb = { ...d, Origin: state.booking.origin, Destination: state.booking.destination, DepartDate: state.booking.departDate, ServiceType: state.booking.serviceType, Passengers: state.booking.passengers, PaxCabin: state.booking.paxCabin, PaymentMethod: state.booking.paymentMethod, PaxName: pd.map(p=>p.name).join(','), PaxDOB: pd.map(p=>p.dob).join(','), PaxGender: pd.map(p=>p.gender).join(','), PaxPassport: pd.map(p=>p.passport).join(','), PaxPhone: pd.map(p=>p.phone).join(','), TotalPrice: d.totalFare || state.totalFare };
      state.userBookings.unshift(sb);
      if (d.milesEarned) state.milesBalance = (state.milesBalance || 0) + d.milesEarned;
      updateNavAuth();
    } else {
      Toast('error', d && d.message ? d.message : 'Booking failed');
    }
  }

  async function submitContact() {
    const name = $('contactName').value.trim();
    const email = $('contactEmail').value.trim();
    const message = $('contactMessage').value.trim();
    if (!name || !email || !message) return Toast('error', 'Please fill in all fields');
    const d = await post({ action: 'contact', name, email, message });
    if (d && d.success) { Toast('success', 'Message sent!'); $('contactName').value = ''; $('contactEmail').value = ''; $('contactMessage').value = ''; }
    else Toast('error', d && d.message ? d.message : 'Failed to send message');
  }

  async function submitTravelAgent() {
    const email = $('agentEmail').value.trim();
    const name = $('agentName').value.trim();
    const agency = $('agentAgency').value.trim();
    if (!email || !name || !agency) return Toast('error', 'Please fill in all fields');
    const d = await post({ action: 'admin.updateUser', email, fullName: name, role: 'Travel Agent', status: 5 });
    if (d && d.success) { Toast('success', 'Travel agent profile created!'); $('agentEmail').value = ''; $('agentName').value = ''; $('agentAgency').value = ''; }
    else Toast('error', d && d.message ? d.message : 'Registration failed');
  }

  function handleBookingNav(direction) {
    if (direction === -1) {
      if (state.currentStep === 2) {
        $('bookingWizardSection').style.display = 'none';
        $('bookingCard').style.display = '';
        state.currentStep = 1;
        updateSteps();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      state.currentStep--;
      updateSteps();
      return;
    }
    if (state.currentStep === 2) {
      $('passengersContainer').querySelectorAll('[data-pax]').forEach(el => {
        state.booking.passengersDetails[parseInt(el.dataset.idx)][el.dataset.pax] = el.value;
      });
      const count = state.booking.passengers;
      let ex = state.booking.passengersDetails;
      while (ex.length < count) ex.push({ name:'', dob:'', gender:'', passport:'', phone:'' });
      while (ex.length > count) ex.pop();
      state.booking.passengersDetails = ex;
      $('passengersContainer').innerHTML = ex.map((p, i) =>
        '<div class="passenger-card"><h4>Passenger ' + (i+1) + '</h4>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">Full Name</label><input class="form-input" data-pax="name" data-idx="' + i + '" value="' + esc(p.name) + '"></div>' +
        '<div class="form-group"><label class="form-label">Date of Birth</label><input class="form-input" type="date" data-pax="dob" data-idx="' + i + '" value="' + esc(p.dob) + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">Gender</label><select class="form-input" data-pax="gender" data-idx="' + i + '"><option value="Male" ' + (p.gender==='Male'?'selected':'') + '>Male</option><option value="Female" ' + (p.gender==='Female'?'selected':'') + '>Female</option><option value="Other" ' + (p.gender==='Other'?'selected':'') + '>Other</option></select></div>' +
        '<div class="form-group"><label class="form-label">Passport</label><input class="form-input" type="password" data-pax="passport" data-idx="' + i + '" value="' + esc(p.passport) + '"></div></div>' +
        '<div class="form-group"><label class="form-label">Phone</label><input class="form-input" data-pax="phone" data-idx="' + i + '" value="' + esc(p.phone) + '"></div></div>'
      ).join('');
      $('passengersContainer').querySelectorAll('[data-pax]').forEach(el => {
        el.addEventListener('change', () => { state.booking.passengersDetails[parseInt(el.dataset.idx)][el.dataset.pax] = el.value; });
      });
    }
    state.currentStep++;
    updateSteps();
    if (state.currentStep === 3) updatePaymentSummary();
  }

  function updatePaymentSummary() {
    const ma = state.user ? (state.user.miles || 0) : 0;
    const mn = Math.floor(state.totalFare / 0.015);
    $('paySummaryTotal').textContent = formatPrice(state.totalFare);
    $('paySummaryMiles').textContent = state.milesEarned.toLocaleString();
    $('payMilesAvailable').textContent = ma.toLocaleString();
    $('payMilesNeeded').textContent = mn.toLocaleString();
    const sfx = $('payMilesSuffix');
    if (ma >= mn) { sfx.textContent = ' (Sufficient!)'; sfx.style.color = 'var(--success)'; }
    else { sfx.textContent = ' (Need ' + mn.toLocaleString() + ')'; sfx.style.color = 'var(--danger)'; }
  }

  function selectPayment(method) {
    state.booking.paymentMethod = method;
    qsa('.carrier-option[data-payment]').forEach(el => el.classList.toggle('selected', el.dataset.payment === method));
  }

  function setTripType(type) {
    state.booking.tripType = type;
    qsa('.trip-tab').forEach(t => t.classList.toggle('active', t.dataset.trip === type));
    $('returnDateGroup').style.display = type === 'oneway' ? 'none' : '';
  }

  function swapAirports() {
    const o = $('originInput').value;
    const d = $('destInput').value;
    $('originInput').value = d;
    $('destInput').value = o;
    updateFarePreview();
  }

  async function searchFlights() {
    if (state._loading) return;
    const origin = parseAirportInput($('originInput').value);
    const dest = parseAirportInput($('destInput').value);
    if (!origin || !dest || origin.length !== 3 || dest.length !== 3) return Toast('error', 'Enter valid airport codes');
    if (origin === dest) return Toast('error', 'Origin and destination cannot be the same');
    const departDate = $('dateInput').value;
    if (!departDate) return Toast('error', 'Select a departure date');
    const tripType = (qs('.trip-tab.active') || {}).dataset.trip || 'round';
    if (tripType === 'round') {
      const returnDate = $('returnDateInput').value;
      if (!returnDate) return Toast('error', 'Select a return date');
      if (new Date(returnDate) <= new Date(departDate)) return Toast('error', 'Return must be after departure');
    }
    if (!state.user) return Toast('error', 'Sign in to continue');
    if (!lookupAirport(origin) || !lookupAirport(dest)) return Toast('error', 'Unknown airport code');

    state._loading = true;
    const btn = $('searchFlightsBtn');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }

    state.booking.origin = origin; state.booking.destination = dest; state.booking.departDate = departDate;
    state.booking.paxCabin = $('cabinSelect').value; state.booking.passengers = parseInt($('paxInput').value) || 1;
    state.booking.promoCode = $('promoInput').value; state.booking.serviceType = $('carrierSelect').value;
    state.booking.tripType = tripType;

    await updateFarePreview();

    const count = state.booking.passengers;
    let ex = state.booking.passengersDetails;
    while (ex.length < count) ex.push({ name:'', dob:'', gender:'', passport:'', phone:'' });
    while (ex.length > count) ex.pop();
    state.booking.passengersDetails = ex;

    $('passengersContainer').innerHTML = ex.map((p, i) =>
      '<div class="passenger-card"><h4>Passenger ' + (i+1) + '</h4>' +
      '<div class="form-row"><div class="form-group"><label class="form-label">Full Name</label><input class="form-input" data-pax="name" data-idx="' + i + '" value="' + esc(p.name) + '"></div>' +
      '<div class="form-group"><label class="form-label">Date of Birth</label><input class="form-input" type="date" data-pax="dob" data-idx="' + i + '" value="' + esc(p.dob) + '"></div></div>' +
      '<div class="form-row"><div class="form-group"><label class="form-label">Gender</label><select class="form-input" data-pax="gender" data-idx="' + i + '"><option value="Male" ' + (p.gender==='Male'?'selected':'') + '>Male</option><option value="Female" ' + (p.gender==='Female'?'selected':'') + '>Female</option><option value="Other" ' + (p.gender==='Other'?'selected':'') + '>Other</option></select></div>' +
      '<div class="form-group"><label class="form-label">Passport</label><input class="form-input" type="password" data-pax="passport" data-idx="' + i + '" value="' + esc(p.passport) + '"></div></div>' +
      '<div class="form-group"><label class="form-label">Phone</label><input class="form-input" data-pax="phone" data-idx="' + i + '" value="' + esc(p.phone) + '"></div></div>'
    ).join('');
    $('passengersContainer').querySelectorAll('[data-pax]').forEach(el => {
      el.addEventListener('change', () => { state.booking.passengersDetails[parseInt(el.dataset.idx)][el.dataset.pax] = el.value; });
    });

    $('bookingCard').style.display = 'none';
    $('bookingWizardSection').style.display = '';
    state.currentStep = 2;
    updateSteps();
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    state._loading = false;
    setTimeout(() => window.scrollTo({ top: $('bookingWizardSection').offsetTop - 80, behavior: 'smooth' }), 150);
  }

  function showModal(id) {
    const el = $(id);
    if (!el) return;
    el.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const handler = function(e) { if (e.target === el) { hideModal(id); el.removeEventListener('click', handler); } };
    el.addEventListener('click', handler);
  }
  function hideModal(id) {
    const el = $(id);
    if (el) el.classList.add('hidden');
    document.body.style.overflow = '';
  }

  window.showModal = showModal;
  window.hideModal = hideModal;

  window.resetHome = function() {
    $('bookingCard').style.display = '';
    $('bookingWizardSection').style.display = 'none';
    state.currentStep = 1;
    state.booking.passengersDetails = [];
    state.booking.agreeTerms = false; state.booking.agreePrivacy = false; state.booking.agreePolicy = false;
    ['agreeTerms','agreePrivacy','agreePolicy'].forEach(id => { const el = $(id); if (el) el.checked = false; });
    $('promoStatus').textContent = '';
    $('extraFieldsRow').style.display = 'none';
    updateSteps();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.setTripType = setTripType;
  window.swapAirports = swapAirports;
  window.handleBookingNav = handleBookingNav;
  window.selectPayment = selectPayment;
  window.switchAuthTab = switchAuthTab;

  document.addEventListener('DOMContentLoaded', () => {
    EA_TRACKER.API_URL = API;
    EA_TRACKER.init('/');

    const savedUser = localStorage.getItem('ea_user');
    if (savedUser) { try { state.user = JSON.parse(savedUser); updateNavAuth(); } catch(e) { localStorage.removeItem('ea_user'); } }

    loadLiveState();
    loadExchangeRate();
    initBooking();

    setInterval(loadLiveState, 20000);

    const ud = $('userMenu');
    if (ud) {
      ud.addEventListener('click', e => {
        e.stopPropagation();
        const dd = qs('.user-dropdown');
        if (dd) {
          dd.classList.toggle('hidden');
          if (!dd.classList.contains('hidden')) setTimeout(() => document.addEventListener('click', function close() { dd.classList.add('hidden'); document.removeEventListener('click', close); }), 100);
        }
      });
    }

    qsa('[data-section]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); const s = el.dataset.section; if (s === 'settings') { showSection('portal'); switchPortalTab('settings'); } else { showSection(s); } }));
    $('loginBtn')?.addEventListener('click', () => { showModal('authModal'); switchAuthTab('login'); });
    $('signupBtn')?.addEventListener('click', () => { showModal('authModal'); switchAuthTab('signup'); });
    qsa('.auth-tab').forEach(tab => tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab)));
    $('authModal')?.querySelector('.modal-close')?.addEventListener('click', () => hideModal('authModal'));

    $('loginForm')?.addEventListener('submit', async e => { e.preventDefault(); await login($('loginEmail').value.trim(), $('loginPassword').value); });
    $('signupForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('signupName').value.trim();
      const email = $('signupEmail').value.trim();
      const pw = $('signupPassword').value;
      const cf = $('signupConfirm').value;
      if (!name || !email || !pw || !cf) return Toast('error', 'Fill in all fields');
      if (pw !== cf) return Toast('error', 'Passwords do not match');
      if (pw.length < 8) return Toast('error', 'Password must be 8+ characters');
      await signup(name, email, pw);
    });

    $('logoutBtn')?.addEventListener('click', e => { e.preventDefault(); logout(); });

    $('originInput')?.addEventListener('input', searchOrigin);
    $('destInput')?.addEventListener('input', searchDest);
    ['originInput','destInput','dateInput','returnDateInput','cabinSelect','paxInput','promoInput','carrierSelect'].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('change', updateFarePreview);
    });

    $('carrierSelect')?.addEventListener('change', function() {
      $('charterTimeRow').style.display = this.value === 'EC' ? '' : 'none';
      state.booking.serviceType = this.value;
      updateFarePreview();
    });

    $('contactSubmit')?.addEventListener('click', submitContact);
    $('agentSubmit')?.addEventListener('click', submitTravelAgent);
    $('settingsSave')?.addEventListener('click', saveAccountSettings);

    qsa('.portal-tab').forEach(el => el.addEventListener('click', () => switchPortalTab(el.dataset.portal)));

    $('searchFlightsBtn')?.addEventListener('click', searchFlights);
    $('bookingSubmit')?.addEventListener('click', submitBooking);

    ['agreeTerms','agreePrivacy','agreePolicy'].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('change', () => { state.booking[id] = el.checked; });
    });

  });
})();
