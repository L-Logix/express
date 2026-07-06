(function() {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbyfr1k04IqvPSHND5I47ZowM8EAUmBuFR4pKJVWDdsB0ZCr4pMrCLxFME1v70aLbyWo/exec';

  let state = { user: null, documents: [], filteredDocs: [], currentFilter: 'all', currentSort: 'latest', searchQuery: '' };

  const Toast = {
    show(message, type, duration) {
      duration = duration || 8000;
      const container = document.getElementById('toastContainer');
      const icons = { success: '\u2713', error: '\u2715', warning: '\u26A0', info: '\u2139' };
      const t = document.createElement('div');
      t.className = 'toast ' + (type || 'info');
      t.innerHTML = '<span>' + (icons[type] || '') + '</span><span>' + message + '</span>';
      container.appendChild(t);
      setTimeout(() => {
        t.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => t.remove(), 300);
      }, duration);
    },
    success(m) { this.show(m, 'success', 8000); },
    error(m) { this.show(m, 'error', 10000); },
    warning(m) { this.show(m, 'warning', 8000); },
    info(m) { this.show(m, 'info', 6000); }
  };

  async function loadSystemStatus() {
    try {
      const r = await fetch(API + '?action=getSystemStatus&t=' + Date.now(), { cache: 'no-store' });
      const d = await r.json();
      if (d.success && d.status) {
        const container = document.getElementById('systemStatusContent');
        if (!container) return;
        const services = d.status;
        const statusColors = { OPERATIONAL: 'var(--success)', DEGRADED: 'var(--warning)', OUTAGE: 'var(--danger)', MAINTENANCE: 'var(--text-muted)' };
        container.innerHTML = Object.entries(services)
          .filter(([k]) => k !== 'timestamp')
          .map(([k, v]) => '<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:var(--radius-sm);background:var(--bg-glass)">' +
            '<span style="width:8px;height:8px;border-radius:50%;background:' + (statusColors[v] || 'var(--text-muted)') + '"></span>' +
            '<span style="font-size:13px;font-weight:500">' + k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()) + '</span>' +
            '<span style="font-size:11px;color:var(--text-secondary)">' + v + '</span></div>'
          ).join('');
      }
    } catch(e) {}
  }

  const Stats = {
    async refresh() {
      try {
        const r = await fetch(API + '?action=getStats&t=' + Date.now(), { cache: 'no-store' });
        const d = await r.json();
        if (d.success && d.stats) {
          const s = d.stats;
          document.getElementById('statDocuments').textContent = s.totalDocuments || 0;
          document.getElementById('statBookings').textContent = s.totalBookings || 0;
          document.getElementById('statUsers').textContent = s.totalUsers || 0;
          document.getElementById('statToday').textContent = s.todayVisitors || 0;
          document.getElementById('dashDocuments').textContent = s.totalDocuments || 0;
          document.getElementById('dashBookings').textContent = s.totalBookings || 0;
          document.getElementById('dashUsers').textContent = s.totalUsers || 0;
          document.getElementById('dashTodayBookings').textContent = s.todayBookings || 0;
          document.getElementById('dashPending').textContent = s.pendingRequests || 0;
          if (document.getElementById('dashCases')) document.getElementById('dashCases').textContent = s.totalCases || 0;
        }
      } catch(e) {}
      loadSystemStatus();
    },
    startPolling() {
      this.refresh();
      setInterval(() => this.refresh(), 15000);
    }
  };

  function showSection(section) {
    document.querySelectorAll('[data-section]').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-section="' + section + '"]')?.classList.add('active');
    document.getElementById('heroSection').classList.toggle('hidden', section !== 'home');
    document.getElementById('dashboardSection').classList.toggle('hidden', section !== 'dashboard');
    document.getElementById('docsSection').classList.toggle('hidden', section !== 'docs');
    if (section === 'docs') loadDocuments();
    if (section === 'dashboard') Stats.refresh();
  }

  function showModal(id) { document.getElementById(id).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  function hideModal(id) { document.getElementById(id).classList.add('hidden'); document.body.style.overflow = ''; }

  async function loadDocuments() {
    document.getElementById('docCount').textContent = 'Loading documents...';
    document.getElementById('docsGrid').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><div class="spinner" style="margin:0 auto 16px"></div><p>Loading documents...</p></div>';
    try {
      const r = await fetch(API + '?action=getDocuments&t=' + Date.now(), { cache: 'no-store' });
      const d = await r.json();
      state.documents = d.documents || [];
      applyFilters();
      renderDocs();
    } catch(e) {
      state.documents = [];
      renderDocs();
    }
  }

  function applyFilters() {
    let docs = [...state.documents];
    if (state.currentFilter !== 'all') docs = docs.filter(d => d.type === state.currentFilter);
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      docs = docs.filter(d => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q));
    }
    if (state.currentSort === 'az') docs.sort((a, b) => a.title.localeCompare(b.title));
    else if (state.currentSort === 'za') docs.sort((a, b) => b.title.localeCompare(a.title));
    else docs.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    state.filteredDocs = docs;
  }

  function renderDocs() {
    const grid = document.getElementById('docsGrid');
    const docs = state.filteredDocs;
    document.getElementById('docCount').textContent = docs.length + ' document' + (docs.length !== 1 ? 's' : '') + ' available';
    if (docs.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 24px;color:var(--text-muted)"><h3 style="font-size:20px;color:var(--text-secondary);margin-bottom:8px">No documents found</h3><p>Try adjusting your search</p></div>';
      return;
    }
    const typeIcons = { document: '\uD83D\uDCC4', presentation: '\uD83D\uDCCA', spreadsheet: '\uD83D\uDCC8', pdf: '\uD83D\uDCD5', image: '\uD83D\uDDBC', video: '\uD83C\uDFAC' };
    const colors = ['#4f8cff','#00d4aa','#fbbf24','#ef4444','#a78bfa'];
    grid.innerHTML = docs.map(doc => {
      const ci = doc.id ? doc.id.charCodeAt(doc.id.length-1) % colors.length : 0;
      const exhausted = doc.openLimit > 0 && doc.opens >= doc.openLimit;
      return '<div class="doc-card" style="border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);overflow:hidden;transition:var(--transition);cursor:pointer" data-id="' + doc.id + '">' +
        '<div style="position:relative;width:100%;height:160px;background:var(--bg-secondary);overflow:hidden">' +
        '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:48px;background:linear-gradient(135deg,' + colors[ci] + '22,' + colors[(ci+1)%colors.length] + '22)">' + (typeIcons[doc.type] || '\uD83D\uDCC4') + '</div>' +
        '<span style="position:absolute;top:10px;left:10px;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;text-transform:uppercase;background:rgba(8,12,26,0.8);backdrop-filter:blur(8px)">' + doc.type + '</span>' +
        '<span style="position:absolute;bottom:10px;right:10px;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600;background:rgba(8,12,26,0.8);backdrop-filter:blur(8px);color:' + (exhausted ? 'var(--danger)' : 'var(--success)') + '">' +
        (exhausted ? 'Exhausted' : (doc.openLimit > 0 ? doc.opens + '/' + doc.openLimit + ' opens' : 'Unlimited')) + '</span></div>' +
        '<div style="padding:16px"><h3 style="font-size:16px;font-weight:600;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(doc.title) + '</h3>' +
        '<p style="font-size:13px;color:var(--text-secondary);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12px">' + esc(doc.description) + '</p>' +
        '<div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:11px;color:var(--text-muted);padding:3px 8px;border-radius:4px;background:var(--bg-glass)">' + esc(doc.category || 'General') + '</span>' +
        '<button class="btn btn-primary btn-sm doc-open-btn" data-id="' + doc.id + '" ' + (exhausted ? 'disabled' : '') + '>' + (exhausted ? 'Exhausted' : 'Open') + '</button></div></div></div>';
    }).join('');
    grid.querySelectorAll('.doc-open-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const doc = state.documents.find(d => d.id === btn.dataset.id);
        if (doc) openDoc(doc);
      });
    });
  }

  function openDoc(doc) {
    document.getElementById('viewerTitle').textContent = doc.title;
    document.getElementById('viewerType').textContent = doc.type;
    const body = document.getElementById('viewerBody');
    const urls = { document: 'https://docs.google.com/document/d/' + doc.fileId + '/preview', presentation: 'https://docs.google.com/presentation/d/' + doc.fileId + '/embed', spreadsheet: 'https://docs.google.com/spreadsheets/d/' + doc.fileId + '/preview', pdf: 'https://docs.google.com/viewer?url=' + encodeURIComponent(doc.fileId) + '&embedded=true', image: doc.fileId };
    const url = urls[doc.type] || urls.document;
    body.innerHTML = '<iframe src="' + url + '" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms" loading="lazy" style="width:100%;height:100%;border:none"></iframe>';
    showModal('docViewerModal');
    fetch(API + '?action=trackOpen&docId=' + encodeURIComponent(doc.id) + '&user=' + encodeURIComponent(state.user?.email || '') + '&timestamp=' + Date.now(), { mode: 'no-cors' }).catch(() => {});
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  document.addEventListener('DOMContentLoaded', () => {
    EA_TRACKER.API_URL = API;
    EA_TRACKER.init('/docs/');

    const userData = localStorage.getItem('ea_docs_user');
    if (userData) {
      try { state.user = JSON.parse(userData); updateUI(); } catch(e) { localStorage.removeItem('ea_docs_user'); }
    }

    document.querySelectorAll('[data-section]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); showSection(el.dataset.section); });
    });

    document.getElementById('heroDashboard').onclick = () => showSection('dashboard');
    document.getElementById('heroDocs').onclick = () => { if (state.user) showSection('docs'); else { switchTab('login'); showModal('authModal'); } };

    document.getElementById('loginBtn').onclick = () => { switchTab('login'); showModal('authModal'); };
    document.getElementById('signupBtn').onclick = () => { switchTab('signup'); showModal('authModal'); };

    document.getElementById('authModalClose').onclick = () => hideModal('authModal');
    document.getElementById('userAvatar').addEventListener('click', function(e) {
      e.stopPropagation();
      const dd = document.querySelector('.user-dropdown');
      if (dd) {
        dd.classList.toggle('hidden');
        if (!dd.classList.contains('hidden')) setTimeout(() => document.addEventListener('click', function close() { dd.classList.add('hidden'); document.removeEventListener('click', close); }), 100);
      }
    });

    document.getElementById('authModal').addEventListener('click', e => { if (e.target === document.getElementById('authModal')) hideModal('authModal'); });

    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    document.getElementById('loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      if (!email || !password) return Toast.error('Please fill in all fields');
      try {
        const r = await fetch(API + '?action=login&email=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(password) + '&t=' + Date.now(), { cache: 'no-store' });
        const d = await r.json();
        if (d.success) {
          state.user = d.user;
          localStorage.setItem('ea_docs_user', JSON.stringify(d.user));
          updateUI();
          hideModal('authModal');
          Toast.success('Welcome back, ' + d.user.name + '!');
          showSection('docs');
        } else Toast.error(d.message || 'Login failed');
      } catch(e) { Toast.error('Connection error'); }
    });

    document.getElementById('signupForm').addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('signupName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      const confirm = document.getElementById('signupConfirm').value;
      if (!name || !email || !password || !confirm) return Toast.error('Please fill in all fields');
      if (password !== confirm) return Toast.error('Passwords do not match');
      if (password.length < 8) return Toast.error('Password must be at least 8 characters');
      try {
        const r = await fetch(API + '?action=signup&fullName=' + encodeURIComponent(name) + '&email=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(password) + '&t=' + Date.now(), { cache: 'no-store' });
        const d = await r.json();
        if (d.success) {
          Toast.success('Account created! Please sign in.');
          switchTab('login');
        } else Toast.error(d.message || 'Signup failed');
      } catch(e) { Toast.error('Connection error'); }
    });

    document.getElementById('viewerClose').onclick = () => { hideModal('docViewerModal'); document.getElementById('viewerBody').innerHTML = '<div class="viewer-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:var(--text-muted)"><div class="spinner"></div><p>Loading document...</p></div>'; };

    document.getElementById('logoutBtn').onclick = e => {
      e.preventDefault();
      state.user = null;
      localStorage.removeItem('ea_docs_user');
      updateUI();
      Toast.info('Signed out');
      showSection('home');
    };

    document.getElementById('themeToggle').onclick = () => {
      document.documentElement.classList.toggle('light');
      Toast.info('Theme toggled');
    };

    const searchInput = document.getElementById('searchInput');
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { state.searchQuery = searchInput.value.trim(); applyFilters(); renderDocs(); }, 250);
    });

    document.getElementById('sortSelect').addEventListener('change', e => { state.currentSort = e.target.value; applyFilters(); renderDocs(); });

    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.currentFilter = chip.dataset.filter;
        applyFilters();
        renderDocs();
      });
    });

    Stats.startPolling();

    createParticles();
  });

  function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('loginForm').classList.toggle('active', tab === 'login');
    document.getElementById('signupForm').classList.toggle('active', tab === 'signup');
    document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
    document.getElementById('signupForm').classList.toggle('hidden', tab !== 'signup');
  }

  function updateUI() {
    const loggedIn = !!state.user;
    document.getElementById('loginBtn').classList.toggle('hidden', loggedIn);
    document.getElementById('signupBtn').classList.toggle('hidden', loggedIn);
    document.getElementById('userMenu').classList.toggle('hidden', !loggedIn);
    if (loggedIn && state.user) {
      document.getElementById('avatarInitials').textContent = (state.user.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      document.getElementById('dropdownName').textContent = state.user.name;
      document.getElementById('dropdownEmail').textContent = state.user.email;
    }
  }

  function createParticles() {
    const container = document.querySelector('.hero-particles');
    if (!container) return;
    for (let i = 0; i < 50; i++) {
      const p = document.createElement('div');
      p.style.cssText = 'position:absolute;width:' + (Math.random()*3+1) + 'px;height:' + (Math.random()*3+1) + 'px;background:var(--accent);border-radius:50%;left:' + Math.random()*100 + '%;opacity:' + (Math.random()*0.5+0.1) + ';animation:particleFloat ' + (Math.random()*15+10) + 's linear infinite;animation-delay:' + Math.random()*10 + 's';
      container.appendChild(p);
    }
  }
})();
