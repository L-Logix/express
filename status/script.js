const API = 'https://script.google.com/macros/s/AKfycbyfr1k04IqvPSHND5I47ZowM8EAUmBuFR4pKJVWDdsB0ZCr4pMrCLxFME1v70aLbyWo/exec';
let cachedStatus = null;

EA_TRACKER.API_URL = API;
EA_TRACKER.init('/status/');

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function fmtName(k) { return k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).replace('Banner State', 'Banner State').trim(); }

const STATUS_COLORS = { OPERATIONAL: '#00d4aa', DEGRADED: '#fbbf24', OUTAGE: '#ef4444', MAINTENANCE: '#8892b0', UNKNOWN: '#64748b' };

async function syncInfrastructure() {
  const loader = document.getElementById('loading-overlay');
  loader.style.display = 'flex';
  try {
    const r = await fetch(API + '?action=getSystemStatus&t=' + Date.now(), { cache: 'no-store' });
    const d = await r.json();
    if (d.success && d.status) {
      cachedStatus = d.status;
      renderUI(d.status);
    }
  } catch(e) { console.error('Sync error:', e); }
  setTimeout(() => { loader.style.display = 'none'; }, 500);
}

function renderUI(status) {
  const state = parseInt(status.globalBannerState) || 5;
  const bannerText = { 0:'Critical Outage', 1:'Partial Outage', 2:'Error Identified', 3:'Investigating Errors', 4:'Scheduled Maintenance', 5:'All Systems Operational' };
  const bannerClass = { 0:'#ef4444', 1:'#ef4444', 2:'#fbbf24', 3:'#fbbf24', 4:'#8892b0', 5:'#00d4aa' };
  const banner = document.getElementById('statusBanner');
  banner.style.borderLeftColor = bannerClass[state] || '#00d4aa';
  const dot = document.getElementById('bannerDot');
  if (dot) dot.style.background = bannerClass[state] || '#00d4aa';
  document.getElementById('statusText').textContent = bannerText[state] || 'All Systems Operational';
  document.getElementById('statusText').style.color = bannerClass[state] || '#00d4aa';
  document.getElementById('lastUpdated').textContent = status.timestamp ? 'Synced: ' + new Date(status.timestamp).toLocaleTimeString() : 'Synced: ' + new Date().toLocaleTimeString();

  const services = Object.entries(status).filter(([k]) => k !== 'timestamp' && k !== 'globalBannerState');
  const operational = services.filter(([,v]) => v === 'OPERATIONAL').length;
  const pct = services.length > 0 ? Math.round((operational / services.length) * 100) : 0;
  document.getElementById('sitePercentage').textContent = pct + '% Operational';

  const container = document.getElementById('servicesContainer');
  container.innerHTML = '';

  services.forEach(([key, val], idx) => {
    const color = STATUS_COLORS[val] || STATUS_COLORS.UNKNOWN;
    const card = document.createElement('div');
    card.className = 'animate-in';
    card.style.animationDelay = (idx * 0.06) + 's';
    card.innerHTML = '<div class="service-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<h3 class="service-name">' + esc(fmtName(key)) + '</h3>' +
      '<span class="service-status" style="background:' + color + '22;color:' + color + '">' + esc(val) + '</span></div></div>';
    container.appendChild(card);
  });
}

function generateReport() {
  if (!cachedStatus) { alert('System not synced yet. Please wait.'); return; }
  const report = { report_id: 'EA-AUDIT-' + Date.now().toString(36).toUpperCase(), generated: new Date().toISOString(), systems: {} };
  Object.entries(cachedStatus).filter(([k]) => k !== 'timestamp' && k !== 'globalBannerState').forEach(([k, v]) => {
    report.systems[fmtName(k)] = { status: v };
  });
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Express_Airways_Audit_Report.json';
  a.click();
}

document.addEventListener('DOMContentLoaded', syncInfrastructure);
setInterval(syncInfrastructure, 60000);
