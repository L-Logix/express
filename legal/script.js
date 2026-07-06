const API = 'https://script.google.com/macros/s/AKfycbyfr1k04IqvPSHND5I47ZowM8EAUmBuFR4pKJVWDdsB0ZCr4pMrCLxFME1v70aLbyWo/exec';
const STORAGE_KEY = 'ea_legal_token';

let currentUser = null;
let currentToken = null;
let currentCase = null;

EA_TRACKER.API_URL = API;
EA_TRACKER.init('/legal/');

function toast(msg, type) {
  const container = document.getElementById('toastContainer');
  const icons = { success: '\u2713', error: '\u2715', warning: '\u26A0', info: '\u2139' };
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'info');
  t.innerHTML = '<span>' + (icons[type] || '') + '</span><span>' + msg + '</span>';
  container.appendChild(t);
  setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 6000);
}

function showLoading(on) { document.getElementById('loadingOverlay')?.classList.toggle('hidden', !on); }

async function api(action, payload) {
  const params = new URLSearchParams({ action, ...payload });
  showLoading(true);
  try {
    const r = await fetch(API + '?' + params.toString() + '&t=' + Date.now(), { cache: 'no-store' });
    const d = await r.json();
    if (!d.success && d.message) toast(d.message, 'error');
    return d;
  } catch(e) { toast('Connection error', 'error'); return { success: false }; }
  finally { showLoading(false); }
}

function updateSession(isAuth) {
  const el = document.getElementById('sessionStatus');
  if (isAuth && currentUser) {
    el.textContent = currentUser.FullName + ' authenticated';
    el.className = 'session-badge authenticated';
  } else {
    el.textContent = 'Unauthenticated';
    el.className = 'session-badge';
  }
}

async function restoreSession() {
  const token = localStorage.getItem(STORAGE_KEY);
  if (!token) return;
  currentToken = token;
  const result = await api('sessionInfo', { token });
  if (result.success && result.user) {
    currentUser = result.user;
    updateSession(true);
    loadCases();
    loadAudit();
  } else { clearSession(); }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  currentToken = null;
  currentUser = null;
  updateSession(false);
}

async function loadCases() {
  if (!currentToken) {
    renderCases([]);
    return;
  }
  const result = await api('getActiveCases', { token: currentToken });
  if (result.success) {
    if (result.user) { currentUser = result.user; updateSession(true); }
    renderCases(result.cases || []);
  } else renderCases([]);
}

function renderCases(items) {
  const container = document.getElementById('caseCards');
  container.innerHTML = '';
  document.getElementById('caseCount').textContent = 'Cases ' + items.length;
  if (!items.length) { container.innerHTML = '<div class="card" style="text-align:center;padding:40px;color:var(--text-muted)">No cases available</div>'; return; }
  items.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'case-card animate-in';
    card.style.animationDelay = (idx * 0.05) + 's';
    card.innerHTML = '<div class="case-card-title">' + esc(item.Title || 'Case') + '</div>' +
      '<p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:12px">' + esc(item.Charges || item.Description || '') + '</p>' +
      '<div class="case-card-meta"><span><b>Docket</b> ' + esc(item.ExternalDocket || item.CaseID || '—') + '</span><span><b>Status</b> ' + esc(item.Status || 'Filed') + '</span></div>';
    card.onclick = () => openCase(item);
    container.appendChild(card);
  });
}

function openCase(item) {
  currentCase = item;
  document.getElementById('caseDetail').classList.remove('hidden');
  document.getElementById('caseTitle').textContent = item.Title || 'Case file';
  document.getElementById('caseMeta').textContent = (item.Classification || '') + ' \u00B7 ' + (item.Status || 'Filed');
  document.getElementById('caseStatusBadge').textContent = item.Status || 'Filed';
  document.getElementById('caseDocket').textContent = item.ExternalDocket || item.InternalRef || item.CaseID || '—';
  document.getElementById('caseClassification').textContent = item.Classification || '—';
  document.getElementById('casePlaintiff').textContent = item.Plaintiff || item.Prosecution || '—';
  document.getElementById('caseDefendant').textContent = item.Defendant || '—';
  document.getElementById('caseJudge').textContent = item.AssignedJudge || '—';
  document.getElementById('caseFilingDate').textContent = item.FilingDate || '—';
  document.getElementById('caseDescription').textContent = item.Charges || item.Description || 'The tribunal file includes claims, evidence, participants, and procedural directives.';

  const evidence = item.Evidence || [];
  const el = document.getElementById('evidenceList');
  if (evidence.length) {
    el.innerHTML = evidence.map(e => '<div class="evidence-item"><strong>' + esc(e.id || e.EvidenceID || 'Evidence') + '</strong><p style="color:var(--text-secondary);font-size:0.85rem;margin-top:4px">' + esc(e.title || e.Title || e.Type || '') + '</p></div>').join('');
  } else {
    el.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem">No evidence records</div>';
  }

  const isJudge = item.isJudge || (currentUser && currentUser.FullName === item.AssignedJudge) || (currentUser && /judge/i.test(currentUser.SystemRole || ''));
  document.getElementById('verdictSection').classList.toggle('hidden', !isJudge);
  loadAudit(item.CaseID);
}

async function loadAudit(caseId) {
  if (!currentToken) { document.getElementById('auditLog').innerHTML = '<div style="padding:12px;color:var(--text-muted)">Authenticate to view audit logs</div>'; return; }
  const result = await api('fetchAudit', { token: currentToken, caseId });
  if (result.success) {
    const log = document.getElementById('auditLog');
    if (!result.audit || !result.audit.length) { log.innerHTML = '<div style="padding:12px;color:var(--text-muted)">No audit events</div>'; return; }
    log.innerHTML = result.audit.slice(0, 15).map(a =>
      '<div class="audit-item"><strong>' + esc(a.Action || 'Audit') + '</strong> \u2014 ' + esc(a.User || a.UserName || 'System') + (a.CaseID ? ' \u00B7 ' + esc(a.CaseID) : '') + '<div style="color:var(--text-muted);font-size:0.8rem;margin-top:4px">' + esc(a.Details || a.Message || '') + '</div><time style="color:var(--text-muted);font-size:0.75rem;display:block;margin-top:4px">' + esc(a.Timestamp || a.CreatedAt || '') + '</time></div>'
    ).join('');
  }
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

document.addEventListener('DOMContentLoaded', () => {
  restoreSession();

  document.getElementById('heroSignIn').onclick = () => { switchTab('login'); document.querySelector('aside .card')?.scrollIntoView({ behavior: 'smooth' }); setTimeout(() => document.getElementById('loginEmail')?.focus(), 500); };
  document.getElementById('heroRegister').onclick = () => { switchTab('signup'); document.querySelector('aside .card')?.scrollIntoView({ behavior: 'smooth' }); setTimeout(() => document.getElementById('signupName')?.focus(), 500); };

  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) return toast('Email and password required', 'error');
    const result = await api('login', { email, password });
    if (result.success) {
      currentToken = result.token || '';
      currentUser = result.user;
      localStorage.setItem(STORAGE_KEY, currentToken);
      updateSession(true);
      toast('Authentication successful', 'success');
      loadCases();
      loadAudit();
    }
  });

  document.getElementById('signupForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    if (!name || !email || !password) return toast('All fields required', 'error');
    const result = await api('register', { fullName: name, email, password });
    if (result.success) {
      toast('Account created. Sign in to proceed.', 'success');
      switchTab('login');
    }
  });

  document.getElementById('refreshCases').onclick = loadCases;

  document.getElementById('submitVerdict').addEventListener('click', async () => {
    if (!currentCase) return toast('Select a case first', 'error');
    const reasoning = document.getElementById('verdictReasoning').value.trim();
    if (!reasoning) return toast('Judicial reasoning required', 'error');
    const result = await api('submitVerdict', {
      token: currentToken,
      caseId: currentCase.CaseID,
      verdictOutcome: document.getElementById('verdictOutcome').value,
      sentenceSummary: document.getElementById('sentenceSummary').value.trim(),
      verdictReasoning: reasoning,
      audioLink: document.getElementById('audioLink').value.trim()
    });
    if (result.success) {
      toast('Verdict recorded', 'success');
      loadCases();
    }
  });
});

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signupForm').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('loginForm').classList.toggle('active', tab === 'login');
  document.getElementById('signupForm').classList.toggle('active', tab === 'signup');
}
