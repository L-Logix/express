var holdingsData = [];
var allHoldings = [];

document.addEventListener('DOMContentLoaded', function() {
  EA_Auth.init();
  EA_Audit.init();
  loadHoldings();
});

function loadHoldings() {
  showLoader(true);
  fetch(BASE_API + '?action=holdings.list')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      showLoader(false);
      if (data.status === 'success' || data.success) {
        var list = data.data || data.holdings || data.results || [];
        allHoldings = list;
        holdingsData = list.slice();
        renderHoldings();
        EA_Toast.success('Loaded ' + list.length + ' holdings');
      } else {
        showLoader(false);
        document.getElementById('holdings-grid').innerHTML = '<div class="no-results"><h3>Unable to load holdings data</h3><p>Please try again later.</p></div>';
      }
    })
    .catch(function(err) {
      console.error('[EA Holdings] Failed to load:', err);
      showLoader(false);
      document.getElementById('holdings-grid').innerHTML = '<div class="no-results"><h3>Unable to load holdings data</h3><p>Please try again later.</p></div>';
    });
}



function renderHoldings() {
  var grid = document.getElementById('holdings-grid');
  var query = (document.getElementById('search-input').value || '').toLowerCase().trim();
  var filtered = allHoldings.filter(function(h) {
    if (!query) return true;
    return (h.ticker && h.ticker.toLowerCase().includes(query)) ||
           (h.name && h.name.toLowerCase().includes(query)) ||
           (h.sector && h.sector.toLowerCase().includes(query));
  });
  holdingsData = filtered;
  if (!filtered.length) {
    grid.innerHTML = '<div class="no-results"><h3>No holdings found</h3><p>Try adjusting your search query</p></div>';
    return;
  }
  var html = '';
  filtered.forEach(function(h) {
    var changeClass = (h.change || 0) >= 0 ? 'price-up' : 'price-down';
    var arrow = (h.change || 0) >= 0 ? '&#9650;' : '&#9660;';
    html += '<div class="holding-card" onclick="showDetail(\'' + h.ticker + '\')">';
    html += '<div class="holding-ticker">' + (h.ticker || 'N/A') + '</div>';
    html += '<div class="holding-name">' + (h.name || 'Unknown') + '</div>';
    html += '<div class="holding-sector">' + (h.sector || 'N/A') + '</div>';
    html += '<div class="holding-price">$' + (h.price || 0).toFixed(2) + '</div>';
    html += '<div class="holding-change ' + changeClass + '">' + arrow + ' $' + Math.abs(h.change || 0).toFixed(2) + ' (' + (h.changePercent || 0).toFixed(2) + '%)</div>';
    html += '</div>';
  });
  grid.innerHTML = html;
}

function showDetail(ticker) {
  showLoader(true);
  EA_Audit.track('holding_click', {ticker: ticker});
  fetch(BASE_API + '?action=holdings.detail&ticker=' + encodeURIComponent(ticker))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      showLoader(false);
      if (data.status === 'success' || data.success) {
        var h = data.data || data.holding || data;
        renderDetail(h);
      } else {
        EA_Toast.error('Unable to load holding details. Please try again later.');
      }
    })
    .catch(function(err) {
      console.error('[EA Holdings] Detail error:', err);
      showLoader(false);
      EA_Toast.error('Unable to load holding details. Please try again later.');
    });
}

function renderDetail(h) {
  document.getElementById('holdings-grid').style.display = 'none';
  var detail = document.getElementById('holding-detail');
  detail.style.display = 'block';
  var changeClass = (h.change || 0) >= 0 ? 'price-up' : 'price-down';
  var arrow = (h.change || 0) >= 0 ? '&#9650;' : '&#9660;';
  var history = h.history || [];
  var html = '<div class="detail-header">';
  html += '<div><h2>' + (h.name || 'Unknown') + '</h2><div class="ticker-big">' + (h.ticker || '') + ' &middot; ' + (h.sector || 'N/A') + '</div></div>';
  html += '<div class="detail-price-area"><div class="price">$' + (h.price || 0).toFixed(2) + '</div>';
  html += '<div class="change ' + changeClass + '">' + arrow + ' $' + Math.abs(h.change || 0).toFixed(2) + ' (' + (h.changePercent || 0).toFixed(2) + '%)</div></div></div>';
  html += '<div class="detail-description">' + (h.description || 'No description available.') + '</div>';
  html += '<div class="detail-info">';
  html += infoItem('CEO', h.ceo || 'N/A');
  html += infoItem('Founded', h.founded || 'N/A');
  html += infoItem('Employees', h.employees ? h.employees.toLocaleString() : 'N/A');
  html += infoItem('Market Cap', h.marketCap || 'N/A');
  html += infoItem('Revenue', h.revenue || 'N/A');
  html += infoItem('P/E Ratio', h.pe || 'N/A');
  html += '</div>';
  html += '<div class="chart-container"><div class="chart-title">30-Day Price History</div><canvas id="price-chart"></canvas></div>';
  html += '<div class="stats-grid">';
  html += statItem('Open', '$' + (history.length > 0 ? history[0] : h.price || 0).toFixed(2));
  html += statItem('Close', '$' + (history.length > 0 ? history[history.length-1] : h.price || 0).toFixed(2));
  html += statItem('High', '$' + Math.max.apply(null, history).toFixed(2));
  html += statItem('Low', '$' + Math.min.apply(null, history).toFixed(2));
  html += statItem('Dividend', h.dividend ? '$' + h.dividend.toFixed(2) : 'N/A');
  html += statItem('Avg Volume', (Math.floor(Math.random() * 5000000 + 1000000)).toLocaleString());
  html += '</div>';
  document.getElementById('detail-content').innerHTML = html;
  setTimeout(function() { drawChart(history); }, 100);
}

function infoItem(label, value) {
  return '<div class="detail-info-item"><div class="label">' + label + '</div><div class="value">' + value + '</div></div>';
}

function statItem(label, value) {
  return '<div class="stat-item"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + '</div></div>';
}

function closeDetail() {
  document.getElementById('holding-detail').style.display = 'none';
  document.getElementById('holdings-grid').style.display = 'grid';
}

function drawChart(data) {
  var canvas = document.getElementById('price-chart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width - 40 || 600;
  canvas.height = Math.min(300, canvas.width * 0.4);
  var w = canvas.width, h = canvas.height;
  var pad = {top: 20, bottom: 30, left: 50, right: 20};
  var chartW = w - pad.left - pad.right;
  var chartH = h - pad.top - pad.bottom;
  var min = Math.min.apply(null, data) * 0.995;
  var max = Math.max.apply(null, data) * 1.005;
  var range = max - min || 1;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.setLineDash([4,4]);
  for (var i = 0; i <= 4; i++) {
    var y = pad.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    var val = (max - (range / 4) * i);
    ctx.fillStyle = '#999';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val.toFixed(2), pad.left - 8, y + 4);
  }
  ctx.setLineDash([]);
  var gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  gradient.addColorStop(0, 'rgba(233,69,96,0.3)');
  gradient.addColorStop(1, 'rgba(233,69,96,0.01)');
  ctx.beginPath();
  data.forEach(function(p, i) {
    var x = pad.left + (i / (data.length - 1)) * chartW;
    var y = pad.top + chartH - ((p - min) / range) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.beginPath();
  data.forEach(function(p, i) {
    var x = pad.left + (i / (data.length - 1)) * chartW;
    var y = pad.top + chartH - ((p - min) / range) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  var last = data[data.length - 1];
  var lx = pad.left + chartW;
  var ly = pad.top + chartH - ((last - min) / range) * chartH;
  ctx.beginPath();
  ctx.arc(lx, ly, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#e94560';
  ctx.fill();
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#999';
  var step = Math.max(1, Math.floor(data.length / 5));
  for (var i = 0; i < data.length; i += step) {
    var x = pad.left + (i / (data.length - 1)) * chartW;
    ctx.fillText('D' + (i+1), x, pad.top + chartH + 18);
  }
}

function showLoader(show) {
  var el = document.getElementById('loader');
  if (el) {
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }
}
