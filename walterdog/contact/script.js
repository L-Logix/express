(function () {
  'use strict';

  var GAS_URL = 'https://script.google.com/macros/s/AKfycbybXfKdhOFdXIOa2RTaF5YHeFWKYt6IU2_F87IH1LzvIzhU7UVEd4aVmK8_vKuAlBVp/exec';

  function setupContactForm() {
    var form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = document.getElementById('contactName')?.value.trim();
      var email = document.getElementById('contactEmail')?.value.trim();
      var subject = document.getElementById('contactSubject')?.value.trim();
      var message = document.getElementById('contactMessage')?.value.trim();
      if (!name || !email || !subject || !message) {
        showToast('Please fill in all fields', 'error');
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Sending...';
      try {
        var token = localStorage.getItem('wds_token') || '';
        var payload = { action: 'submitContact', args: JSON.stringify([token, name, email, subject, message]), t: Date.now() };
        var qs = Object.keys(payload).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(payload[k]); }).join('&');
        var r = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: qs });
        var data = await r.json();
        if (data && data.success) {
          showToast('Message sent! We\'ll get back to you soon.', 'success');
          form.reset();
        } else {
          showToast(data && data.error ? data.error : 'Failed to send message', 'error');
        }
      } catch (err) {
        showToast('Network error. Please try again.', 'error');
      }
      btn.disabled = false;
      btn.textContent = 'Send Message';
    });
  }

  function showToast(message, type) {
    if (!type) type = 'info';
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    var icons = { success: '&#10003;', error: '&#10007;', info: '&#8505;' };
    toast.innerHTML = '<span>' + (icons[type] || icons.info) + '</span> ' + message;
    container.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('toast-out');
      setTimeout(function () { toast.remove(); }, 400);
    }, 3500);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toastContainer';
    document.body.appendChild(container);
    setupContactForm();
  });
})();
