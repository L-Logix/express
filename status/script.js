var statusIntervals = [];

document.addEventListener('DOMContentLoaded', function() {
  EA_Auth.init();
  EA_Audit.init();
  loadAll();
  statusIntervals.push(setInterval(loadSystemStatus, 15000));
  statusIntervals.push(setInterval(loadOnlineUsers, 10000));
  statusIntervals.push(setInterval(loadStats, 30000));
  statusIntervals.push(setInterval(loadAudit, 20000));
});

function loadAll() {
  showLoader(true);
  var count = 0, total = 4;
  function done() { count++; if (count >= total) showLoader(false); }
  loadSystemStatus(done);
  loadOnlineUsers(done);
  loadStats(done);
  loadAudit(done);
}

var SERVICES = [
  {id:'booking',name:'Booking Engine',icon:'&#128197;',desc:'Flight search, reservations, and ticketing system'},
  {id:'payment',name:'Payment Gateway',icon:'&#128176;',desc:'Payment processing, refunds, and billing'},
  {id:'notifications',name:'Notifications',icon:'&#128276;',desc:'Email, SMS, and push notification delivery'},
  {id:'checkin',name:'Check-In System',icon:'&#128195;',desc:'Online and airport kiosk check-in services'},
  {id:'baggage',name:'Baggage Tracking',icon:'&#128174;',desc:'Real-time baggage location and tracing'},
  {id:'flights',name:'Flight Operations',icon:'&#9992;',desc:'Flight scheduling, dispatch, and monitoring'},
  {id:'crew',name:'Crew Management',icon:'&#128100;',desc:'Crew scheduling, qualifications, and tracking'},
  {id:'api',name:'API Gateway',icon:'&#128279;',desc:'External API access and partner integrations'},
  {id:'database',name:'Database Cluster',icon:'&#128451;',desc:'Primary database systems and data storage'},
  {id:'auth',name:'Authentication',icon:'&#128274;',desc:'User authentication, SSO, and access control'}
];

function loadSystemStatus(cb) {
  fetch(BASE_API + '?action=getSystemStatus')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var services = [];
      if (data.status === 'success' || data.success) {
        services = data.data || data.services || data.results || [];
      }
      renderServices(services);
      updateSummary(services);
      if (cb) cb();
    })
    .catch(function(err) {
      console.error('[EA Status] System status error:', err);
      renderServices([]);
      updateSummary([]);
      if (cb) cb();
    });
}

function renderServices(apiServices) {
  var grid = document.getElementById('status-grid');
  var serviceMap = {};
  if (apiServices.length) {
    apiServices.forEach(function(s) { serviceMap[s.id || s.name] = s; });
  }
  var html = '';
  SERVICES.forEach(function(svc) {
    var api = serviceMap[svc.id] || serviceMap[svc.name];
    var status = 'operational';
    var uptime = '99.9%';
    var desc = svc.desc;
    if (api) {
      status = (api.status || 'operational').toLowerCase();
      uptime = api.uptime || '99.9%';
      desc = api.description || svc.desc;
    }
    html += '<div class="status-service">';
    html += '<div class="service-name"><span class="service-icon">' + svc.icon + '</span>' + svc.name + '</div>';
    html += '<div class="service-desc">' + desc + '</div>';
    html += '<div class="service-meta">';
    html += '<span class="status-badge ' + status + '"><span class="status-indicator ' + status + '" style="width:8px;height:8px;display:inline-block"></span> ' + status.charAt(0).toUpperCase() + status.slice(1) + '</span>';
    html += '<span class="service-uptime">&#11088; ' + uptime + ' uptime</span>';
    html += '</div></div>';
  });
  grid.innerHTML = html;
}

function updateSummary(services) {
  var summary = document.getElementById('status-summary');
  var hasDegraded = false, hasDown = false;
  services.forEach(function(s) {
    var st = (s.status || '').toLowerCase();
    if (st === 'down' || st === 'error') hasDown = true;
    if (st === 'degraded' || st === 'warning') hasDegraded = true;
  });
  var cls = 'operational', text = 'All Systems Operational';
  if (hasDown) { cls = 'down'; text = 'Service Disruption Detected'; }
  else if (hasDegraded) { cls = 'degraded'; text = 'Some Services Degraded'; }
  summary.innerHTML = '<span class="status-indicator ' + cls + '"></span> ' + text;
}

function loadOnlineUsers(cb) {
  fetch(BASE_API + '?action=users.online')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var count = 0;
      if (data.status === 'success' || data.success) {
        count = data.count || data.users || data.online || 0;
        if (typeof count === 'object') count = count.length || 0;
      }
      document.getElementById('online-count').textContent = count || 0;
      if (cb) cb();
    })
    .catch(function(err) {
      console.error('[EA Status] Online users error:', err);
      document.getElementById('online-count').textContent = 0;
      if (cb) cb();
    });
}

function loadStats(cb) {
  fetch(BASE_API + '?action=getStats')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var stats = {};
      if (data.status === 'success' || data.success) {
        stats = data.data || data.stats || data;
      }
      renderStats(stats);
      if (cb) cb();
    })
    .catch(function(err) {
      console.error('[EA Status] Stats error:', err);
      renderStats({});
      if (cb) cb();
    });
}

function renderStats(stats) {
  var container = document.getElementById('status-stats');
  var items = [
    {icon:'&#128100;',label:'Total Users',value:stats.totalUsers || stats.users || 'N/A'},
    {icon:'&#128197;',label:'Total Bookings',value:stats.totalBookings || stats.bookings || 'N/A'},
    {icon:'&#128196;',label:'Documents',value:stats.totalDocuments || stats.documents || 'N/A'},
    {icon:'&#9992;',label:'Daily Flights',value:stats.dailyFlights || stats.flights || 'N/A'},
    {icon:'&#128176;',label:'Revenue (MTD)',value:stats.revenue || 'N/A'},
    {icon:'&#128200;',label:'System Uptime',value:stats.uptime || 'N/A'}
  ];
  var html = '';
  items.forEach(function(item) {
    html += '<div class="stat-card"><span class="stat-icon">' + item.icon + '</span><div class="stat-value">' + item.value + '</div><div class="stat-label">' + item.label + '</div></div>';
  });
  container.innerHTML = html;
}

function loadAudit(cb) {
  fetch(BASE_API + '?action=fetchAudit')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var entries = [];
      if (data.status === 'success' || data.success) {
        entries = data.data || data.audit || data.entries || data.results || [];
      }
      renderAudit(entries);
      renderTimeline(entries);
      if (cb) cb();
    })
    .catch(function(err) {
      console.error('[EA Status] Audit error:', err);
      document.getElementById('audit-content').innerHTML = '<div class="audit-entry"><span class="audit-event" style="color:var(--text-muted)">No audit data available.</span></div>';
      if (cb) cb();
    });
}

function renderAudit(entries) {
  if (!entries.length) {
    document.getElementById('audit-content').innerHTML = '<div class="audit-entry"><span class="audit-event" style="color:var(--text-muted)">No audit data available.</span></div>';
    return;
  }
  var html = '';
  var maxEntries = Math.min(entries.length, 15);
  for (var i = 0; i < maxEntries; i++) {
    var e = entries[i];
    var ts = e.timestamp || e.time || '';
    var time = ts ? new Date(ts).toLocaleTimeString() : 'just now';
    html += '<div class="audit-entry"><span class="audit-event">' + (e.event || e.action || 'event') + '</span><span class="audit-page">' + (e.page || e.path || '') + '</span><span class="audit-time">' + time + '</span></div>';
  }
  document.getElementById('audit-content').innerHTML = html;
}

function renderTimeline(entries) {
  var container = document.getElementById('timeline-content');
  var events = [];
  if (entries && entries.length) {
    for (var i = 0; i < Math.min(entries.length, 10); i++) {
      var e = entries[i];
      var st = e.event === 'login' || e.event === 'pageview' ? 'info' : (e.event === 'error' ? 'error' : 'success');
      var ts = e.timestamp || e.time || '';
      var time = ts ? new Date(ts).toLocaleString() : 'recently';
      events.push({type:st,title:e.event || 'event',desc:e.page || '',time:time});
    }
  }
  var html = '';
  events.forEach(function(ev) {
    html += '<div class="timeline-item"><div class="timeline-dot ' + ev.type + '"></div><div class="timeline-content"><div class="timeline-title">' + ev.title + '</div><div class="timeline-desc">' + ev.desc + '</div><div class="timeline-time">' + ev.time + '</div></div></div>';
  });
  container.innerHTML = html;
}

function showLoader(show) {
  var el = document.getElementById('loader');
  if (el) {
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }
}
