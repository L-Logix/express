(function () {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbyfr1k04IqvPSHND5I47ZowM8EAUmBuFR4pKJVWDdsB0ZCr4pMrCLxFME1v70aLbyWo/exec';
  const STORAGE_KEY = 'ea_dev_key';
  const STORAGE_EMAIL = 'ea_dev_email';

  let currentKey = localStorage.getItem(STORAGE_KEY) || '';
  let currentEmail = localStorage.getItem(STORAGE_EMAIL) || '';

  function $(id) { return document.getElementById(id); }

  function showEl(id) { const el = $(id); if (el) { el.style.display = ''; el.classList.remove('hidden'); } }

  function hideEl(id) { const el = $(id); if (el) { el.style.display = 'none'; el.classList.add('hidden'); } }

  function qs(s) { return document.querySelector(s); }

  function qsa(s) { return document.querySelectorAll(s); }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function toast(type, msg) {
    const c = $('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<span>' + msg + '</span>';
    c.appendChild(t);
    const dur = type === 'error' ? 10000 : 8000;
    setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, dur);
  }

  async function api(action, extra) {
    const p = new URLSearchParams({ action: action, ...(extra || {}) });
    try {
      const r = await fetch(API + '?' + p.toString() + '&t=' + Date.now(), { cache: 'no-store' });
      return await r.json();
    } catch (e) { return { success: false, message: 'Network error' }; }
  }

  async function loadEndpoints() {
    const d = await api('dev.listEndpoints');
    if (!d || !d.success) return;
    const container = $('endpointsList');
    if (!container) return;
    container.innerHTML = '';
    (d.endpoints || []).forEach((ep, i) => {
      const div = document.createElement('div');
      div.className = 'endpoint-card card';
      div.dataset.method = ep.method;
      div.dataset.auth = ep.auth ? 'protected' : 'public';
      div.style.marginBottom = '12px';
      div.style.animationDelay = (i * 0.05) + 's';
      div.innerHTML = '<div class="endpoint-header" style="display:flex;align-items:center;gap:12px;margin-bottom:8px">' +
        '<span class="endpoint-method" style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;background:' + (ep.method === 'GET' ? 'rgba(79,140,255,0.2)' : 'rgba(0,212,170,0.2)') + ';color:' + (ep.method === 'GET' ? 'var(--accent)' : 'var(--success)') + '">' + esc(ep.method) + '</span>' +
        '<code style="font-size:14px;font-weight:600;font-family:var(--font-mono)">' + esc(ep.name) + '</code>' +
        '<span style="font-size:10px;padding:2px 8px;border-radius:4px;background:' + (ep.auth ? 'rgba(239,68,68,0.15)' : 'rgba(0,212,170,0.15)') + ';color:' + (ep.auth ? 'var(--danger)' : 'var(--success)') + '">' + (ep.auth ? 'Key Required' : 'Public') + '</span></div>' +
        '<p style="color:var(--text-secondary);font-size:13px;margin-bottom:8px">' + esc(ep.description || '') + '</p>' +
        (ep.params ? '<div style="font-size:12px;color:var(--text-muted)">Params: ' + Object.entries(ep.params).map(([k, v]) => '<code style="color:var(--accent)">' + k + '</code>: ' + v).join(', ') + '</div>' : '') +
        '<button class="btn btn-ghost btn-sm try-btn" data-ep="' + esc(ep.name) + '" style="margin-top:8px;font-size:12px">Try it &rarr;</button></div>';
      container.appendChild(div);
    });
    qsa('.try-btn').forEach(b => b.addEventListener('click', () => {
      $('consoleEndpoint').value = b.dataset.ep;
      $('consoleSection').scrollIntoView({ behavior: 'smooth' });
    }));
  }

  async function handleKeyRegistration() {
    const name = $('regName').value.trim();
    const email = $('regEmail').value.trim();
    if (!name || !email) return toast('error', 'Name and email required');
    if (!email.includes('@')) return toast('error', 'Valid email required');
    const d = await api('dev.registerKey', { name, email });
    if (d && d.success) {
      currentKey = d.key;
      currentEmail = email;
      localStorage.setItem(STORAGE_KEY, currentKey);
      localStorage.setItem(STORAGE_EMAIL, currentEmail);
      showKeyPanel();
      toast('success', 'API key generated! Copy it now.');
      loadEndpoints();
    } else {
      toast('error', d.message || 'Registration failed');
      hideEl('registerForm');
      showEl('keyEmailSection');
    }
  }

  async function showKeyPanel() {
    if (!currentKey) { hideEl('keyPanel'); showEl('keyEmailSection'); return; }
    const d = await api('dev.getKeyInfo', { key: currentKey });
    if (!d || !d.success) {
      hideEl('keyPanel');
      showEl('keyEmailSection');
      return;
    }
    showEl('keyPanel');
    hideEl('registerForm');
    hideEl('keyEmailSection');
    $('keyDisplay').textContent = d.key;
    $('keyRequests').textContent = d.requestCount || 0;
    $('keyCreated').textContent = d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—';
    $('keyLastUsed').textContent = d.lastUsed ? new Date(d.lastUsed).toLocaleDateString() : '—';
    const statusEl = $('keyStatus');
    statusEl.textContent = d.status.charAt(0).toUpperCase() + d.status.slice(1);
    statusEl.style.color = d.status === 'active' ? 'var(--success)' : d.status === 'inactive' ? 'var(--warning)' : 'var(--danger)';
    $('reactivateKeyBtn').style.display = d.status === 'inactive' ? '' : 'none';
    $('revokeKeyBtn').style.display = d.status === 'removed' ? 'none' : '';
    hideEl('keyEmailSection');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (currentKey) showKeyPanel();

    $('heroGetStarted').addEventListener('click', () => {
      if (currentKey) showKeyPanel();
      else { showEl('keySection'); $('keySection').scrollIntoView({ behavior: 'smooth' }); }
    });
    $('heroViewDocs').addEventListener('click', () => $('docsSection').scrollIntoView({ behavior: 'smooth' }));
    $('devGetStartedBtn').addEventListener('click', () => {
      if (currentKey) showKeyPanel();
      else { showEl('keySection'); $('keySection').scrollIntoView({ behavior: 'smooth' }); }
    });

    $('regKeyBtn').addEventListener('click', handleKeyRegistration);

    $('copyKeyBtn').addEventListener('click', () => {
      navigator.clipboard.writeText($('keyDisplay').textContent).then(() => toast('success', 'Copied to clipboard')).catch(() => toast('error', 'Failed to copy'));
    });

    $('regenKeyBtn').addEventListener('click', async () => {
      if (!confirm('Regenerating will invalidate your current key. Continue?')) return;
      const d = await api('dev.regenKey', { key: currentKey, email: currentEmail });
      if (d && d.success) {
        currentKey = d.key;
        localStorage.setItem(STORAGE_KEY, currentKey);
        showKeyPanel();
        toast('success', 'Key regenerated');
      } else toast('error', d.message || 'Regeneration failed');
    });

    $('revokeKeyBtn').addEventListener('click', async () => {
      if (!confirm('Revoke this API key? This cannot be undone.')) return;
      const d = await api('dev.revokeKey', { key: currentKey, email: currentEmail });
      if (d && d.success) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_EMAIL);
        currentKey = '';
        currentEmail = '';
        hideEl('keyPanel');
        showEl('registerForm');
        showEl('keyEmailSection');
        toast('warning', 'Key revoked');
      } else toast('error', d.message || 'Revocation failed');
    });

    $('reactivateKeyBtn').addEventListener('click', async () => {
      const d = await api('dev.reactivateKey', { key: currentKey, email: currentEmail });
      if (d && d.success) {
        showKeyPanel();
        toast('success', 'Key reactivated');
      } else toast('error', d.message || 'Reactivation failed');
    });

    $('lookupKeyBtn').addEventListener('click', async () => {
      const email = $('lookupEmail').value.trim();
      if (!email || !email.includes('@')) return toast('error', 'Valid email required');
      currentEmail = email;
      localStorage.setItem(STORAGE_EMAIL, currentEmail);
      const d = await api('dev.listKeys', { email });
      if (d && d.success && d.keys && d.keys.length > 0) {
        const keysHtml = d.keys.map(k =>
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-secondary);border-radius:var(--radius-sm);margin-bottom:8px">' +
          '<span><code style="font-family:var(--font-mono);font-size:12px">' + esc(k.key.substring(0, 16)) + '...</code><br><small style="color:var(--text-muted)">' + esc(k.name || '—') + ' &middot; ' + esc(k.status) + '</small></span>' +
          '<button class="btn btn-sm btn-outline" data-lookup-key="' + esc(k.key) + '">Select</button></div>'
        ).join('');
        $('keyEmailSection').querySelector('.key-list')?.remove();
        const listDiv = document.createElement('div');
        listDiv.className = 'key-list';
        listDiv.style.marginTop = '16px';
        listDiv.innerHTML = keysHtml;
        $('keyEmailSection').appendChild(listDiv);
        listDiv.querySelectorAll('[data-lookup-key]').forEach(btn => btn.addEventListener('click', function () {
          currentKey = this.dataset.lookupKey;
          localStorage.setItem(STORAGE_KEY, currentKey);
          showKeyPanel();
        }));
        toast('success', 'Found ' + d.keys.length + ' key(s)');
      } else {
        toast('error', (d && d.message) || 'No keys found for this email');
      }
    });

    $('registerNewKeyBtn').addEventListener('click', () => {
      hideEl('keyEmailSection');
      showEl('registerForm');
      $('keySection').scrollIntoView({ behavior: 'smooth' });
    });

    $('switchToLookupBtn').addEventListener('click', () => {
      hideEl('registerForm');
      showEl('keyEmailSection');
      $('keySection').scrollIntoView({ behavior: 'smooth' });
    });

    $('consoleSendBtn').addEventListener('click', async () => {
      const key = $('consoleKey').value.trim();
      const endpoint = $('consoleEndpoint').value;
      if (!key && endpoint.startsWith('dev.')) return toast('error', 'API key required for this endpoint');
      const params = { action: endpoint };
      if (key) params.key = key;
      if (endpoint === 'dev.apiFare') {
        params.origin = $('consoleOrigin').value.trim().toUpperCase();
        params.destination = $('consoleDest').value.trim().toUpperCase();
        params.cabin = $('consoleCabin').value;
        params.passengers = $('consolePax').value || 1;
      }
      const qs = new URLSearchParams(params);
      showEl('consoleResult');
      $('consoleResponse').textContent = 'Loading...';
      try {
        const r = await fetch(API + '?' + qs.toString() + '&t=' + Date.now(), { cache: 'no-store' });
        const d = await r.json();
        $('consoleResponse').textContent = JSON.stringify(d, null, 2);
      } catch (e) {
        $('consoleResponse').textContent = 'Error: ' + e.message;
      }
    });

    $('consoleEndpoint').addEventListener('change', function () {
      $('consoleExtraParams').style.display = this.value === 'dev.apiFare' ? '' : 'none';
    });

    $('copyExampleBtn').addEventListener('click', () => {
      const code = $('codeExample').textContent;
      navigator.clipboard.writeText(code).then(() => toast('success', 'Copied')).catch(() => toast('error', 'Failed'));
    });

    qsa('[data-filter]').forEach(btn => btn.addEventListener('click', function () {
      qsa('[data-filter]').forEach(b => { b.className = 'btn btn-sm ' + (b === this ? 'btn-primary' : 'btn-outline'); });
      const filter = this.dataset.filter;
      qsa('.endpoint-card').forEach(c => {
        if (filter === 'all') { c.style.display = ''; return; }
        if (filter === 'GET' || filter === 'POST') { c.style.display = c.dataset.method === filter ? '' : 'none'; return; }
        c.style.display = c.dataset.auth === filter ? '' : 'none';
      });
    }));

    qsa('.code-tab').forEach(tab => tab.addEventListener('click', function () {
      qsa('.code-tab').forEach(t => { t.className = 'code-tab btn btn-sm ' + (t === this ? 'btn-primary' : 'btn-outline'); });
      const lang = this.dataset.lang;
      const examples = {
        javascript: '// JavaScript - Node.js\nconst API = \'https://script.google.com/macros/s/AKfycbyfr1k04IqvPSHND5I47ZowM8EAUmBuFR4pKJVWDdsB0ZCr4pMrCLxFME1v70aLbyWo/exec\';\n\nasync function getStatus(key) {\n  const url = API + \'?action=dev.apiStatus&key=\' + key + \'&t=\' + Date.now();\n  const r = await fetch(url);\n  const d = await r.json();\n  console.log(d);\n}',
        python: '# Python\nimport requests, time\n\nAPI = \'https://script.google.com/macros/s/AKfycbyfr1k04IqvPSHND5I47ZowM8EAUmBuFR4pKJVWDdsB0ZCr4pMrCLxFME1v70aLbyWo/exec\'\n\ndef get_status(api_key):\n    url = f\'{API}?action=dev.apiStatus&key={api_key}&t={int(time.time()*1000)}\'\n    r = requests.get(url)\n    return r.json()',
        curl: '# cURL\ncurl \'https://script.google.com/macros/s/AKfycbyfr1k04IqvPSHND5I47ZowM8EAUmBuFR4pKJVWDdsB0ZCr4pMrCLxFME1v70aLbyWo/exec?action=dev.apiStatus&key=YOUR_API_KEY&t=$(date +%s%3N)\''
      };
      $('codeExample').querySelector('code').textContent = examples[lang] || examples.javascript;
    }));

    loadEndpoints();
  });
})();
