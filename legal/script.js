const STORAGE_KEY = 'express_judicial_token';
let currentUser = null;
let currentToken = null;
let currentCase = null;
const demoCases = [
  {
    CaseID: 'MWA-2026-05',
    Title: 'Meaillwood Air v. Express Airways Group',
    InternalRef: 'MWA-2026-05',
    ExternalDocket: 'MWA-EAG-518B',
    Classification: 'Civil Litigation',
    Status: 'Active Trial',
    AssignedJudge: 'Hon. Arnav Bhat',
    Charges: 'Procedural misconduct; contractual violations; operational damages',
    Plaintiff: 'Meaillwood Air',
    Defendant: 'Express Airways Group',
    FilingDate: '2026-05-10',
    isJudge: false,
    userRole: 'Observer'
  },
  {
    CaseID: 'EAG-CR-302',
    Title: 'State v. Express Airways Security',
    InternalRef: 'EAG-CR-302',
    ExternalDocket: 'CR-EAG-302A',
    Classification: 'Criminal-Style',
    Status: 'Awaiting Verdict',
    AssignedJudge: 'Hon. Lara Monroe',
    Charges: 'Unauthorized access, evidence tampering',
    Plaintiff: 'State Prosecution',
    Defendant: 'Express Airways Security',
    FilingDate: '2026-04-06',
    isJudge: false,
    userRole: 'Observer'
  }
];

function init() {
  bindAuthControls();
  restoreSession();
  refreshCases();
  loadAuditLog();
}

document.addEventListener('DOMContentLoaded', init);

function bindAuthControls() {
  document.getElementById('toggle-auth').addEventListener('click', () => {
    document.getElementById('auth-panel').classList.toggle('active');
  });
  document.getElementById('login-tab').addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('signup-tab').addEventListener('click', () => switchAuthTab('signup'));
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('signup-form').addEventListener('submit', handleSignup);
  document.getElementById('refresh-cases').addEventListener('click', refreshCases);
  document.getElementById('submit-verdict').addEventListener('click', submitVerdict);
}

function switchAuthTab(tab) {
  const loginTab = document.getElementById('login-tab');
  const signupTab = document.getElementById('signup-tab');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  if (tab === 'login') {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
  } else {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
  }
}

function restoreSession() {
  const token = localStorage.getItem(STORAGE_KEY);
  if (!token) {
    updateSessionStatus(false);
    return;
  }
  currentToken = token;
  fetchApi('sessionInfo', {}).then(result => {
    if (result.success && result.user) {
      currentUser = result.user;
      updateSessionStatus(true);
      refreshCases();
    } else {
      clearSession();
    }
  });
}

function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showFeedback('Email and password are required.', 'danger');
  fetchApi('login', { email, password }).then(result => {
    if (!result.success) return;
    currentToken = result.token;
    currentUser = result.user;
    localStorage.setItem(STORAGE_KEY, currentToken);
    updateSessionStatus(true);
    showFeedback('Authentication successful. Case registry loading.', 'success');
    refreshCases();
  });
}

function handleSignup(event) {
  event.preventDefault();
  const fullName = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  if (!fullName || !email || !password) return showFeedback('All registration fields are required.', 'danger');
  fetchApi('register', { fullName, email, password }).then(result => {
    if (!result.success) return;
    showFeedback('Account created. Sign in to proceed.', 'success');
    switchAuthTab('login');
  });
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  currentToken = null;
  currentUser = null;
  updateSessionStatus(false);
}

function updateSessionStatus(isAuth) {
  const status = document.getElementById('session-status');
  if (isAuth && currentUser) {
    status.textContent = `${currentUser.FullName || currentUser.Email} authenticated`;
    status.className = 'status-pill status-success';
  } else {
    status.textContent = 'Unauthenticated';
    status.className = 'status-pill status-neutral';
  }
}

function refreshCases() {
  if (!currentToken) {
    renderCaseCards(demoCases);
    showFeedback('Use a registered account for full Google Sheets integration.', 'info');
    return;
  }
  fetchApi('getActiveCases', {}).then(result => {
    if (!result.success) return;
    if (result.user) {
      currentUser = result.user;
      updateSessionStatus(true);
    }
    if (Array.isArray(result.cases) && result.cases.length) {
      renderCaseCards(result.cases);
      showFeedback('Active cases loaded from Google Sheets.', 'success');
    } else {
      renderCaseCards([]);
      showFeedback('No accessible cases were found in the sheet.', 'warning');
    }
  });
}

function renderCaseCards(items) {
  const container = document.getElementById('case-cards');
  container.innerHTML = '';
  document.getElementById('case-count').textContent = `Cases ${items.length}`;
  if (!items.length) {
    container.innerHTML = '<div class="info-callout">No cases are available for the current session.</div>';
    return;
  }
  items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'case-card';
    card.innerHTML = `
      <h4>${item.Title}</h4>
      <p>${item.Charges || item.ChargesClaims || 'No summary available.'}</p>
      <div class="metadata">
        <span><strong>Docket</strong> ${item.ExternalDocket || item.InternalRef || item.CaseID || '—'}</span>
        <span><strong>Status</strong> ${item.Status || 'Filed'}</span>
        <span><strong>Judge</strong> ${item.AssignedJudge || 'TBD'}</span>
      </div>
      <div class="metadata">
        <span><strong>Plaintiff</strong> ${item.Plaintiff || item.Prosecution || '—'}</span>
        <span><strong>Defendant</strong> ${item.Defendant || '—'}</span>
      </div>
    `;
    card.addEventListener('click', () => openCaseDetail(item));
    container.appendChild(card);
  });
}

function openCaseDetail(item) {
  currentCase = item;
  document.getElementById('case-detail').classList.remove('hidden');
  document.getElementById('case-title').textContent = item.Title || 'Case file';
  document.getElementById('case-meta').textContent = `${item.Classification || 'Classification unavailable'} · ${item.Status || 'Filed'}`;
  document.getElementById('case-status-badge').textContent = item.Status || 'Filed';
  document.getElementById('case-docket').textContent = item.ExternalDocket || item.InternalRef || item.CaseID || '—';
  document.getElementById('case-classification').textContent = item.Classification || '—';
  document.getElementById('case-plaintiff').textContent = item.Plaintiff || item.Prosecution || '—';
  document.getElementById('case-defendant').textContent = item.Defendant || '—';
  document.getElementById('case-judge').textContent = item.AssignedJudge || '—';
  document.getElementById('case-filing-date').textContent = item.FilingDate || '—';
  document.getElementById('case-description').textContent = item.Charges || item.Description || 'The tribunal file includes claims, evidence, participants, and procedural directives.';
  renderEvidenceSection(item.Evidence || []);
  toggleJudgeWorkflow(item);
  loadAuditLog(item.CaseID);
}

function renderEvidenceSection(items) {
  const container = document.getElementById('evidence-list');
  container.innerHTML = '';
  const evidence = Array.isArray(items) && items.length ? items : [
    { id: 'EVID-001', title: 'Contract breach dossier', type: 'PDF', link: 'https://drive.google.com/preview' }
  ];
  evidence.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'evidence-item';
    item.innerHTML = `
      <div><strong>${entry.id || entry.EvidenceID || 'Evidence'}</strong></div>
      <div>${entry.title || entry.Title || entry.Type || 'Exhibit record'}</div>
      <div style="margin-top:10px; color: var(--muted);">${entry.type || entry.Type || 'Unknown format'} · ${entry.link ? `<a href="${entry.link}" target="_blank">Open file</a>` : 'Link unavailable'}</div>
    `;
    container.appendChild(item);
  });
}

function toggleJudgeWorkflow(caseItem) {
  const workflow = document.getElementById('judge-workflow');
  const judgeRole = caseItem.userRole || (currentUser ? currentUser.SystemRole : '') || '';
  const isJudge = /judge/i.test(judgeRole) || (currentUser && currentUser.FullName === caseItem.AssignedJudge);
  if (isJudge) {
    workflow.classList.remove('hidden');
  } else {
    workflow.classList.add('hidden');
  }
}

function collectJudicialPayload() {
  return {
    caseId: currentCase ? currentCase.CaseID : null,
    verdictOutcome: document.getElementById('verdict-outcome').value,
    sentenceSummary: document.getElementById('sentence-summary').value.trim(),
    verdictReasoning: document.getElementById('verdict-reasoning').value.trim(),
    evidenceCited: document.getElementById('evidence-cited').value.trim(),
    rejectedEvidence: document.getElementById('rejected-evidence').value.trim(),
    audioLink: document.getElementById('audio-link').value.trim(),
    videoLink: document.getElementById('video-link').value.trim(),
    declarations: {
      neutrality: document.getElementById('declaration-neutrality').checked,
      evidence: document.getElementById('declaration-evidence').checked,
      recording: document.getElementById('declaration-recording').checked,
      exParte: document.getElementById('declaration-communication').checked
    }
  };
}

function submitVerdict() {
  if (!currentCase) return showFeedback('Select a case before submitting a verdict.', 'danger');
  const payload = collectJudicialPayload();
  const missing = [];
  if (!payload.declarations.neutrality) missing.push('judicial neutrality');
  if (!payload.declarations.evidence) missing.push('evidence review');
  if (!payload.declarations.recording) missing.push('recording confirmation');
  if (!payload.declarations.exParte) missing.push('ex parte declaration');
  if (!payload.audioLink) missing.push('audio recording link');
  if (!payload.verdictReasoning) missing.push('judicial reasoning');
  if (missing.length) return showFeedback(`Cannot submit verdict until: ${missing.join(', ')}.`, 'danger');

  fetchApi('submitVerdict', payload).then(result => {
    if (!result.success) return;
    showFeedback('Verdict recorded and notifications dispatched.', 'success');
    refreshCases();
  });
}

async function loadAuditLog(caseId = null) {
  if (!currentToken) {
    const placeholder = document.getElementById('audit-log');
    placeholder.innerHTML = '<div class="audit-row">Audit logs are available after authentication and Google Sheets setup.</div>';
    return;
  }
  const payload = caseId ? { caseId } : {};
  const result = await fetchApi('fetchAudit', payload);
  if (!result.success) return;
  renderAuditLog(result.audit || []);
}

function renderAuditLog(entries) {
  const container = document.getElementById('audit-log');
  container.innerHTML = '';
  if (!entries || !entries.length) {
    container.innerHTML = '<div class="audit-row">No audit events are available for the current filter.</div>';
    return;
  }
  entries.slice(0, 12).forEach(entry => {
    const row = document.createElement('div');
    row.className = 'audit-row';
    row.innerHTML = `
      <div><strong>${entry.Action || 'Audit'}</strong> — ${entry.UserName || entry.User || 'System'}${entry.CaseID ? ` · ${entry.CaseID}` : ''}</div>
      <div>${entry.Details || entry.Message || 'Recorded procedural action.'}</div>
      <time>${entry.Timestamp || entry.CreatedAt || new Date().toISOString()}</time>
    `;
    container.appendChild(row);
  });
}

function showFeedback(message, type = 'info') {
  const feedback = document.getElementById('feedback-line');
  feedback.textContent = message;
  feedback.style.borderColor = type === 'danger' ? '#ef5750' : type === 'success' ? '#3fcf8e' : type === 'warning' ? '#f3ae4b' : 'rgba(145, 173, 203, 0.12)';
  feedback.style.color = type === 'danger' ? '#ffd7d5' : type === 'success' ? '#d4f7e0' : type === 'warning' ? '#ffe7c2' : '#9bb8d4';
}

async function fetchApi(action, payload = {}) {
  const request = { action, payload: { ...payload, token: currentToken } };
  showLoading(true);
  try {
    const response = await fetch(window.location.href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    const result = await response.json();
    if (!result.success) {
      showFeedback(result.error || 'Action failed. Check deployment logs.', 'danger');
    }
    return result;
  } catch (error) {
    showFeedback(error.message || 'Unable to communicate with the judicial backend.', 'danger');
    return { success: false, error: error.message };
  } finally {
    showLoading(false);
  }
}

function showLoading(enabled) {
  document.getElementById('loading-overlay').classList.toggle('hidden', !enabled);
}
