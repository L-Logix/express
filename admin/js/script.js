(function() {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbyfr1k04IqvPSHND5I47ZowM8EAUmBuFR4pKJVWDdsB0ZCr4pMrCLxFME1v70aLbyWo/exec';

  let state = { user: null, currentTable: null, tableData: [], allTables: {}, searchQuery: '' };

  const SHEET_META = {
    Users: { icon: '👤', cols: ["UserID","FullName","Email","Password","Role","Miles","Status","JoinDate","Timestamp","UpdatedAt"] },
    Bookings: { icon: '🎫', cols: ["BookingRef","Email","Status","Origin","Destination","DepartDate","FlightTimes","ServiceType","Passengers","TotalPrice","PaymentMethod","PaxName","PaxDOB","PaxGender","PaxPassport","PaxPhone","PaxCabin","Timestamp"] },
    Sections: { icon: '📋', cols: ["Title","Description","Image","Link","ButtonText"] },
    Events: { icon: '📅', cols: ["Date","Title","Description","Link","Image"] },
    Documents: { icon: '📄', cols: ["ID","Title","Description","Type","FileID","Thumbnail","Category","OpenLimit","Opens","Available","RequiresRequest"] },
    PromoCodes: { icon: '🏷️', cols: ["Code","DiscountPercent","DiscountDollars","MaxUses","UsedCount","ExpiryDate","Active"] },
    Notices: { icon: '📢', cols: ["Title","Message","Severity","Timestamp"] },
    Config: { icon: '⚙️', cols: ["Key","Value"] },
    SystemStatus: { icon: '🔌', cols: ["Key","Value"] },
    Ancillaries: { icon: '➕', cols: ["Type","Description","Price"] },
    Contact: { icon: '✉️', cols: ["Name","Email","Message","Timestamp"] },
    Issues: { icon: '⚠️', cols: ["IssueID","Email","Subject","Description","Severity","Status","Created","Updated"] },
    DocRequests: { icon: '🔑', cols: ["Timestamp","UserEmail","UserName","DocID","DocTitle","Reason","Department","Status"] },
    Notifications: { icon: '🔔', cols: ["NotificationID","UserID","Email","Type","Title","Message","Link","Read","CreatedAt"] },
    Cases: { icon: '⚖️', cols: ["CaseID","Title","Type","Status","FiledBy","FiledAgainst","Description","CreatedAt","UpdatedAt"] },
    Participants: { icon: '👥', cols: ["ParticipantID","CaseID","UserID","Email","Role","JoinedAt"] },
    Evidence: { icon: '📎', cols: ["EvidenceID","CaseID","UploadedBy","Type","Title","Link","Category","Timestamp","Notes"] },
    Verdicts: { icon: '📜', cols: ["VerdictID","CaseID","Outcome","SentenceSummary","Reasoning","EvidenceCited","RejectedEvidence","AudioLink","VideoLink","SubmittedBy","SubmittedAt","ProceduralReview"] },
    Reviews: { icon: '⭐', cols: ["Timestamp","BookingRef","Email","Rating","Comment","Date"] },
    Referrals: { icon: '🔗', cols: ["Timestamp","ReferrerEmail","RefereeEmail","Status","Date"] }
  };

  const SIDEBAR_ORDER = ["Users","Bookings","Sections","Events","Documents","PromoCodes","Notices","Config","SystemStatus","Ancillaries","Contact","Issues","DocRequests","Notifications","Cases","Participants","Evidence","Verdicts","Reviews","Referrals"];

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function $(id) { return document.getElementById(id); }
  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return document.querySelectorAll(s); }

  function Toast(type, message, duration) {
    duration = duration || (type === 'error' ? 10000 : type === 'success' ? 6000 : 6000);
    const container = $('toastContainer');
    const icons = {success:'\u2713',error:'\u2715',warning:'\u26A0',info:'\u2139'};
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<span>' + (icons[type]||'') + '</span><span>' + message + '</span>';
    container.appendChild(t);
    setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, duration);
  }

  async function apiGet(params) {
    const url = API + '?' + new URLSearchParams(params) + '&t=' + Date.now();
    try { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) return null; return await r.json(); } catch(e) { return null; }
  }

  function post(body) { return apiGet(body); }

  function showEl(id) { const el = $(id); if (el) el.classList.remove('hidden'); }
  function hideEl(id) { const el = $(id); if (el) el.classList.add('hidden'); }

  async function adminLogin(email, password) {
    const d = await post({ action: 'admin.login', email, password });
    if (d && d.success) {
      state.user = d.user;
      localStorage.setItem('ea_admin', JSON.stringify(d.user));
      hideEl('loginScreen');
      showEl('adminApp');
      Toast('success', 'Welcome, ' + d.user.name);
      loadDashboard();
      return true;
    }
    Toast('error', d && d.message ? d.message : 'Login failed');
    return false;
  }

  function adminLogout() {
    state.user = null;
    localStorage.removeItem('ea_admin');
    showEl('loginScreen');
    hideEl('adminApp');
    Toast('info', 'Signed out');
  }

  async function loadDashboard() {
    const d = await post({ action: 'admin.getAllTables' });
    if (d && d.success) {
      state.allTables = d.tables || {};
      renderStats();
    }
    if (state.currentTable) loadTable(state.currentTable);
  }

  function renderStats() {
    const grid = $('statsGrid');
    if (!grid) return;
    const counts = {};
    for (const [key, rows] of Object.entries(state.allTables)) {
      if (Array.isArray(rows)) counts[key] = rows.length;
    }
    const top = ['Users','Bookings','Documents','Issues','Contact','PromoCodes','Events','Cases'];
    grid.innerHTML = top.map(k => '<div class="admin-stat-card"><div class="admin-stat-number">' + (counts[k]||0) + '</div><div class="admin-stat-label">' + k + '</div></div>').join('');
  }

  function selectTable(tableName) {
    state.currentTable = tableName;
    state.searchQuery = '';
    qsa('.admin-sidebar-item').forEach(el => el.classList.toggle('active', el.dataset.table === tableName));
    loadTable(tableName);
  }

  async function loadTable(tableName) {
    const d = await post({ action: 'admin.getTable', sheet: tableName });
    if (d && d.success) {
      state.tableData = d.rows || [];
    } else {
      state.tableData = [];
    }
    renderTable();
  }

  function renderTable() {
    const container = $('tableContainer');
    const meta = SHEET_META[state.currentTable];
    if (!meta) { container.innerHTML = '<p style="color:var(--text-muted)">No table definition found</p>'; return; }

    let data = state.tableData;
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      data = data.filter(row => Object.values(row).some(v => String(v||'').toLowerCase().includes(q)));
    }

    const headers = meta.cols;
    const displayName = state.currentTable;

    $('tableTitle').textContent = displayName + ' (' + data.length + ' rows)';

    if (data.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:60px 24px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:16px">' + meta.icon + '</div><p>No data in ' + displayName + '</p></div>';
      return;
    }

    let html = '<div class="data-table-wrap"><table class="data-table"><thead><tr>';
    headers.forEach(h => { html += '<th>' + esc(h) + '</th>'; });
    html += '<th style="width:120px">Actions</th></tr></thead><tbody>';

    data.forEach((row, idx) => {
      html += '<tr>';
      headers.forEach(h => {
        let val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
        if (val.length > 40) val = val.slice(0, 40) + '...';
        if (h === 'Timestamp' || h === 'CreatedAt' || h === 'UpdatedAt' || h === 'JoinDate') {
          if (val) { try { const d = new Date(val); if (!isNaN(d)) val = d.toLocaleString(); } catch(e) {} }
        }
        html += '<td title="' + esc(row[h]||'') + '">' + esc(val) + '</td>';
      });
      html += '<td class="actions-cell">' +
        '<button class="btn btn-sm btn-ghost" onclick="editRow(\'' + state.currentTable + '\',' + (idx+2) + ')" title="Edit">\u270F\uFE0F</button>' +
        '<button class="btn btn-sm btn-ghost" style="color:var(--danger)" onclick="deleteRow(\'' + state.currentTable + '\',' + (idx+2) + ')" title="Delete">\u2716</button>' +
        '</td></tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  window.selectTable = selectTable;
  window.adminLogout = adminLogout;

  window.editRow = function(sheet, rowNum) {
    const data = state.tableData[rowNum - 2];
    if (!data) return Toast('error', 'Row not found');
    const meta = SHEET_META[sheet];
    if (!meta) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    let fields = '';
    meta.cols.forEach(h => {
      const val = data[h] !== undefined && data[h] !== null ? String(data[h]) : '';
      fields += '<div class="form-group"><label class="form-label">' + esc(h) + '</label><input class="form-input edit-field" data-field="' + esc(h) + '" value="' + esc(val) + '"></div>';
    });

    overlay.innerHTML = '<div class="modal modal-lg"><button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">\u00D7</button>' +
      '<div class="modal-header"><h3>Edit Row</h3><p>' + esc(sheet) + ' - Row ' + rowNum + '</p></div>' +
      fields +
      '<button class="btn btn-primary btn-full save-edit-btn">Save Changes</button></div>';
    document.body.appendChild(overlay);

    overlay.querySelector('.save-edit-btn').onclick = async () => {
      const updates = {};
      overlay.querySelectorAll('.edit-field').forEach(el => {
        const field = el.dataset.field;
        const val = el.value;
        updates[field] = val;
      });
      const d = await post({ action: 'admin.updateRow', sheet, rowNum, updates });
      if (d && d.success) {
        Toast('success', 'Row updated');
        overlay.remove();
        loadTable(sheet);
      } else Toast('error', d && d.message ? d.message : 'Update failed');
    };
  };

  window.deleteRow = async function(sheet, rowNum) {
    if (!confirm('Delete this row? This cannot be undone.')) return;
    const d = await post({ action: 'admin.deleteRow', sheet, rowNum });
    if (d && d.success) {
      Toast('success', 'Row deleted');
      loadTable(sheet);
    } else Toast('error', d && d.message ? d.message : 'Delete failed');
  };

  window.addRow = function() {
    const sheet = state.currentTable;
    const meta = SHEET_META[sheet];
    if (!meta) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    let fields = '';
    meta.cols.forEach(h => {
      if (h === 'Timestamp' || h === 'CreatedAt' || h === 'UpdatedAt') {
        fields += '<div class="form-group"><label class="form-label">' + esc(h) + '</label><input class="form-input add-field" data-field="' + esc(h) + '" value="' + new Date().toISOString() + '"></div>';
      } else if (h === 'ID') {
        fields += '<div class="form-group"><label class="form-label">' + esc(h) + '</label><input class="form-input add-field" data-field="' + esc(h) + '" value="' + Date.now() + '"></div>';
      } else {
        fields += '<div class="form-group"><label class="form-label">' + esc(h) + '</label><input class="form-input add-field" data-field="' + esc(h) + '" placeholder="Enter ' + esc(h) + '"></div>';
      }
    });

    overlay.innerHTML = '<div class="modal modal-lg"><button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">\u00D7</button>' +
      '<div class="modal-header"><h3>Add Row</h3><p>' + esc(sheet) + '</p></div>' +
      fields +
      '<button class="btn btn-primary btn-full save-add-btn">Add Row</button></div>';
    document.body.appendChild(overlay);

    overlay.querySelector('.save-add-btn').onclick = async () => {
      const row = {};
      overlay.querySelectorAll('.add-field').forEach(el => {
        row[el.dataset.field] = el.value;
      });
      const d = await post({ action: 'admin.addRow', sheet, row });
      if (d && d.success) {
        Toast('success', 'Row added');
        overlay.remove();
        loadTable(sheet);
      } else Toast('error', d && d.message ? d.message : 'Add failed');
    };
  };

  document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('ea_admin');
    if (saved) {
      try {
        state.user = JSON.parse(saved);
        hideEl('loginScreen');
        showEl('adminApp');
        loadDashboard();
      } catch(e) { localStorage.removeItem('ea_admin'); }
    }

    $('loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const email = $('loginEmail').value.trim();
      const password = $('loginPassword').value;
      if (!email || !password) return Toast('error', 'Please fill in all fields');
      await adminLogin(email, password);
    });

    $('logoutBtn').addEventListener('click', adminLogout);

    $('searchInput').addEventListener('input', () => {
      state.searchQuery = $('searchInput').value.trim();
      renderTable();
    });

    const sidebar = $('sidebarNav');
    SIDEBAR_ORDER.forEach(name => {
      const meta = SHEET_META[name];
      const item = document.createElement('button');
      item.className = 'admin-sidebar-item';
      item.dataset.table = name;
      item.innerHTML = '<span>' + (meta ? meta.icon : '📁') + '</span><span>' + name + '</span>';
      item.addEventListener('click', () => selectTable(name));
      sidebar.appendChild(item);
    });

    $('refreshBtn').addEventListener('click', () => {
      if (state.currentTable) loadTable(state.currentTable);
      Toast('info', 'Refreshed');
    });

    $('toggleSidebar').addEventListener('click', () => {
      const sb = qs('.admin-sidebar');
      if (sb) sb.style.display = sb.style.display === 'none' ? '' : 'none';
    });

    $('adminAvatarBtn')?.addEventListener('click', () => {
      const dd = qs('.user-dropdown');
      if (dd) dd.classList.toggle('hidden');
    });
  });
})();
