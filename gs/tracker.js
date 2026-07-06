const EA_TRACKER = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyfr1k04IqvPSHND5I47ZowM8EAUmBuFR4pKJVWDdsB0ZCr4pMrCLxFME1v70aLbyWo/exec',
  initialized: false,

  init(page) {
    if (this.initialized) return;
    this.initialized = true;
    this.page = page || window.location.pathname;
    this.fingerprint = this.getFingerprint();
    this.getIP().then(ip => {
      this.ip = ip;
      this.send();
    });
    this.send();
  },

  getFingerprint() {
    const canvas = document.createElement('canvas');
    canvas.width = 200; canvas.height = 50;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('EA' + navigator.userAgent.length, 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('ExpressAirways', 4, 17);
    const canvasFp = canvas.toDataURL();

    let glFp = '';
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) glFp = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) + '|' + gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
      }
    } catch(e) {}

    const screenRes = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lang = navigator.language;
    const ua = navigator.userAgent;
    const raw = [canvasFp, glFp, screenRes, tz, lang, ua].join('|||');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) { const chr = raw.charCodeAt(i); hash = ((hash << 5) - hash) + chr; hash |= 0; }
    return Math.abs(hash).toString(16);
  },

  async getIP() {
    try {
      const r = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
      const d = await r.json();
      return d.ip;
    } catch(e) { return ''; }
  },

  send() {
    const data = {
      action: 'track',
      fingerprint: this.fingerprint,
      ip: this.ip,
      ua: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lang: navigator.language,
      page: this.page,
      user: window.currentUser ? (window.currentUser.email || window.currentUser.Email || '') : ''
    };
    const qs = Object.entries(data).map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v||'')).join('&');
    fetch(this.API_URL + '?' + qs + '&t=' + Date.now(), { mode: 'no-cors' }).catch(() => {});
  }
};
