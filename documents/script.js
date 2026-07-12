var allDocs = [];
var currentCategory = 'All';
var requestingDocId = null;

document.addEventListener('DOMContentLoaded', function() {
  EA_Auth.init();
  EA_Audit.init();
  loadDocuments();
});

function loadDocuments() {
  showLoader(true);
  fetch(BASE_API + '?action=getDocuments')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      showLoader(false);
      if (data.status === 'success' || data.success) {
        var list = data.data || data.documents || data.results || [];
        allDocs = list;
        renderFilters();
        renderDocs();
        if (allDocs.length) {
          EA_Toast.success('Loaded ' + allDocs.length + ' documents');
        }
      } else {
        allDocs = [];
        renderFilters();
        renderDocs();
      }
    })
    .catch(function(err) {
      console.error('[EA Documents] Load error:', err);
      showLoader(false);
      allDocs = [];
      renderFilters();
      renderDocs();
      document.getElementById('doc-grid').innerHTML = '<div class="no-docs"><h3>Unable to load documents</h3><p>Please try again later.</p></div>';
    });
}



function renderFilters() {
  var categories = ['All'];
  allDocs.forEach(function(d) {
    if (categories.indexOf(d.category) === -1) categories.push(d.category);
  });
  var html = '';
  categories.forEach(function(c) {
    var active = c === currentCategory ? 'active' : '';
    html += '<button class="doc-filter-btn ' + active + '" onclick="filterCategory(\'' + c + '\')">' + c + '</button>';
  });
  document.getElementById('doc-filters').innerHTML = html;
}

function filterCategory(cat) {
  currentCategory = cat;
  renderFilters();
  renderDocs();
}

function renderDocs() {
  var grid = document.getElementById('doc-grid');
  var filtered = currentCategory === 'All' ? allDocs : allDocs.filter(function(d) { return d.category === currentCategory; });
  if (!filtered.length) {
    grid.innerHTML = '<div class="no-docs"><h3>No documents found</h3><p>No documents in this category</p></div>';
    return;
  }
  var html = '';
  filtered.forEach(function(d) {
    var badgeClass = d.classification === 'public' ? 'public' : (d.classification === 'confidential' ? 'confidential' : 'restricted');
    var badgeLabel = d.classification.charAt(0).toUpperCase() + d.classification.slice(1);
    html += '<div class="doc-card" onclick="openDoc(\'' + d.id + '\')">';
    html += '<span class="doc-icon">' + (d.icon || '&#128196;') + '</span>';
    html += '<div class="doc-title">' + d.title + '</div>';
    html += '<div class="doc-desc">' + d.description + '</div>';
    html += '<div class="doc-meta">';
    html += '<span class="doc-category">' + d.category + '</span>';
    html += '<span class="doc-badge ' + badgeClass + '">' + badgeLabel + '</span>';
    html += '</div>';
    if (d.classification !== 'public') html += '<div class="doc-lock">&#128274;</div>';
    html += '</div>';
  });
  grid.innerHTML = html;
}

function openDoc(id) {
  var doc = allDocs.find(function(d) { return d.id === id; });
  if (!doc) { EA_Toast.error('Document not found'); return; }
  EA_Audit.track('doc_click', {id: id, title: doc.title, classification: doc.classification});
  if (doc.classification === 'public') {
    viewDocument(doc);
  } else {
    requestingDocId = id;
    EA_Modal.open('request-modal');
  }
}

function viewDocument(doc) {
  var grid = document.getElementById('doc-grid');
  grid.innerHTML = '<div class="doc-view"><h2>' + doc.title + '</h2><div class="doc-view-meta">' + doc.id + ' &middot; ' + doc.category + ' &middot; ' + doc.classification.toUpperCase() + '</div><div class="doc-view-body">' + doc.content + '</div><div class="doc-view-footer"><button class="btn btn-secondary" onclick="loadDocuments();renderFilters();renderDocs()">&larr; Back to Documents</button><button class="btn btn-primary" onclick="EA_Toast.success(\'Download started\')">Download</button></div></div>';
}

function submitDocRequest() {
  var email = document.getElementById('req-email').value.trim();
  var reason = document.getElementById('req-reason').value.trim();
  if (!email || !reason) {
    EA_Toast.warning('Please fill in all fields');
    return;
  }
  var payload = {
    action: 'requestDoc',
    documentId: requestingDocId,
    email: email,
    reason: reason,
    fingerprint: window.EA_TRACKER ? window.EA_TRACKER.fingerprint : 'unknown'
  };
  fetch(BASE_API, {method: 'POST', body: JSON.stringify(payload)})
    .then(function(r) { return r.json(); })
    .then(function(data) {
      EA_Modal.close('request-modal');
      if (data.status === 'success' || data.success) {
        EA_Toast.success('Request submitted successfully');
        EA_Audit.track('doc_request', {id: requestingDocId, email: email});
      } else {
        EA_Toast.success('Request submitted for review');
      }
      document.getElementById('req-email').value = '';
      document.getElementById('req-reason').value = '';
    })
    .catch(function(err) {
      console.error('[EA Documents] Request error:', err);
      EA_Toast.success('Request submitted for review');
      EA_Modal.close('request-modal');
      document.getElementById('req-email').value = '';
      document.getElementById('req-reason').value = '';
    });
}

function showLoader(show) {
  var el = document.getElementById('loader');
  if (el) {
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }
}
