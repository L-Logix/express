/**
 * Walter Dog's Game Spot — GAS Backend (Expanded)
 * Full IP geolocation, advanced tracking, approval flow
 */

var CONFIG = {
  SHEET_ID: '1cTwJqzqNQc4S2voK7G3_ovrqcJazKJEkamM7X_MKIG8',
  SESSION_TTL_MINUTES: 1440,
};

/* ─── IP GEOLOCATION ──────────────────────────────────── */

function getIPInfo_(ip) {
  if (!ip) return {};
  try {
    var url = 'http://ip-api.com/json/' + encodeURIComponent(ip) + '?fields=status,country,regionName,city,zip,lat,lon,isp,org,as,proxy,hosting,mobile,query';
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var data = JSON.parse(response.getContentText());
    if (data && data.status === 'success') {
      return {
        country: data.country || '',
        region: data.regionName || '',
        city: data.city || '',
        zip: data.zip || '',
        lat: data.lat || 0,
        lng: data.lon || 0,
        isp: data.isp || '',
        org: data.org || '',
        asn: data.as || '',
        isMobile: data.mobile || false,
        isProxy: data.proxy || false,
        isHosting: data.hosting || false,
        query: data.query || ip || '',
      };
    }
  } catch(e) {}
  return {};
}

/* ─── TABLE SETUP ─────────────────────────────────────── */

function sheetSetup() {
  var ss = CONFIG.SHEET_ID ? SpreadsheetApp.openById(CONFIG.SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  var defs = {
    Games: ['id','name','description','coverUrl','gameUrl','genre','platform','rating','releaseYear','developer','players','featured','createdAt'],
    Reviews: ['id','gameId','userId','userName','avatar','rating','text','date'],
    Comments: ['id','gameId','userId','userName','avatar','text','date'],
    Users: ['id','username','password','email','role','approved','joinDate','lastLogin','lastIP','fingerprint','userAgent','screenRes','timezone','language','totalLogins','totalSessions','preferences'],
    Sessions: ['id','userId','loginTime','lastHeartbeat','logoutTime','ip','fingerprint','userAgent','page','duration'],
    AuditLog: ['id','userId','userName','timestamp','action','eventType','page','element','detailsJSON','ip','fingerprint','userAgent','duration'],
    GameAnalytics: ['id','gameId','userId','openTime','closeTime','durationSec','scrollDepth','interactions','source','userAgent'],
    GameSessions: ['id','userId','username','gameId','gameName','fingerprint','ip','country','region','city','zip','lat','lng','openTime','closeTime','durationSec','scrollDepth','interactions','source'],
    GameRequests: ['id','userId','userName','gameName','gameUrl','genre','description','reason','status','createdAt','reviewedBy','reviewedAt'],
    UserPreferences: ['id','userId','favoriteGenres','lastPlayedJSON','suggestedJSON','settingsJSON','updatedAt'],
    Achievements: ['id','name','description','icon','gameId','category','points','rarity','secret','createdAt'],
    UserAchievements: ['id','userId','achievementId','gameId','unlockedAt','progress','maxProgress'],
    UserGames: ['id','userId','gameId','status','playTimeMin','lastPlayed','rating','notes'],
    Friends: ['id','userId','friendId','status','createdAt','updatedAt'],
    FriendRequests: ['id','fromUserId','toUserId','message','status','createdAt'],
    Notifications: ['id','userId','type','title','message','link','read','createdAt'],
    Reports: ['id','reporterId','targetType','targetId','reason','details','status','createdAt','resolvedAt'],
    Feed: ['id','userId','eventType','targetType','targetId','dataJSON','createdAt'],
    GameSeries: ['id','name','description','coverUrl','gameCount'],
    Platforms: ['id','name','icon','company','releaseYear','gameCount'],
    Developers: ['id','name','description','website','logoUrl','foundedYear','country','gameCount'],
    Publishers: ['id','name','description','website','logoUrl','foundedYear','country','gameCount'],
    Categories: ['id','name','description','icon','priority','gameCount'],
    Leaderboards: ['id','name','type','period','entries'],
    DeviceTracking: ['id','fingerprint','ip','ua','screen','tz','lang','country','region','city','zip','lat','lng','isp','org','asn','isMobile','isProxy','isHosting','isVpn','firstSeen','lastSeen','visitCount','pageViews','userId'],
    TrackingLog: ['id','fingerprint','ip','ua','screen','tz','lang','page','eventType','element','detailsJSON','timestamp','country','region','city','zip','lat','lng','isp','org','asn','isMobile','isProxy','isHosting','userId','username','sessionId'],
    SessionHeartbeats: ['id','userId','fingerprint','ip','page','timestamp','duration','country','region','city','lat','lng','isp','org','asn'],
    ContentWarnings: ['id','name','description','severity'],
    GameCategorizations: ['id','gameId','categoryId'],
    GameSeriesEntries: ['id','gameId','seriesId','order'],
    Contacts: ['id','userId','userName','name','email','subject','message','status','createdAt','resolvedAt','notes'],
    Notices: ['id','title','message','type','active','createdAt','expiresAt','createdBy'],
  };
  var results = [];
  Object.keys(defs).forEach(function(name) {
    var headers = defs[name];
    var sh = ss.getSheetByName(name);
    if (sh) {
      var existing = sh.getDataRange().getValues();
      if (existing.length > 0 && existing[0].join('').trim().length > 0) {
        results.push(name + ' exists'); return;
      }
      sh.clear();
    } else {
      sh = ss.insertSheet(name);
    }
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    results.push(name + ' ready');
  });
  return { success: true, message: 'Database fully initialized.' };
}

/* ─── DO GET ──────────────────────────────────────────── */

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    return handleApiGet_(e);
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle("Walter Dog's Game Spot")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

function handleApiGet_(e) {
  var params = e.parameter;
  var action = params.action;

  if (action === 'track') {
    trackEvent_(
      params.fingerprint || '', params.ip || '', params.ua || '',
      params.screen || '', params.tz || '', params.lang || '',
      params.page || '', params.eventType || '', params.element || '',
      parseJSON_(params.details || '{}'),
      params.userId || '', params.username || '', params.sessionId || ''
    );
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'audit.event') {
    auditLog_('', '', params.event || 'event', 'audit', params.page || '', '', parseJSON_(params.detail || '{}'), params.ip || '', params.fingerprint || '', params.ua || '', 0);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'heartbeat') {
    var session = validateSession(params.token);
    if (session) recordHeartbeat(params.token, params.page || '');
    return ContentService.createTextOutput(JSON.stringify({ success: !!session }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'users.online') {
    try {
      var beats = getAllData_('SessionHeartbeats');
      var fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
      var count = 0;
      for (var i = 0; i < beats.length; i++) {
        if (String(beats[i].timestamp || '') >= fiveMinAgo) count++;
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, online: count }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(e) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, online: 0 }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (action === 'getSystemStatus' || action === 'system.overview') {
    try {
      var games = getAllData_('Games');
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        stats: {
          totalGames: games.length,
          totalUsers: getAllData_('Users').length,
          totalReviews: getAllData_('Reviews').length,
          online: 0
        }
      })).setMimeType(ContentService.MimeType.JSON);
    } catch(e) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'System unavailable' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (action === 'getStats') {
    return ContentService.createTextOutput(JSON.stringify({ success: true, totalUsers: getAllData_('Users').length, totalGames: getAllData_('Games').length, totalReviews: getAllData_('Reviews').length, totalNotifications: getAllData_('Notifications').length }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ─── TABLE HELPERS ───────────────────────────────────── */

function getSheet_(name) {
  var ss = CONFIG.SHEET_ID ? SpreadsheetApp.openById(CONFIG.SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Table "' + name + '" not found. Run sheetSetup() first.');
  return sh;
}

function getAllData_(sheetName, filterFn) {
  var sh = getSheet_(sheetName);
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h) { return h.toString().trim(); });
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) obj[headers[j]] = data[i][j];
    obj._row = i + 1;
    if (!filterFn || filterFn(obj)) rows.push(obj);
  }
  return rows;
}

function getNextId_(sheetName) {
  var data = getAllData_(sheetName);
  var max = 0;
  for (var i = 0; i < data.length; i++) {
    var n = Number(data[i].id);
    if (n > max) max = n;
  }
  return max + 1;
}

function appendRow_(sheetName, rowObj) {
  var sh = getSheet_(sheetName);
  var headers = sh.getDataRange().getValues()[0] || [];
  var row = headers.map(function(h) { return rowObj[h] !== undefined ? rowObj[h] : ''; });
  sh.appendRow(row);
  var data = sh.getDataRange().getValues();
  return data.length - 1;
}

function updateCell_(sheetName, row, field, value) {
  var sh = getSheet_(sheetName);
  var headers = sh.getDataRange().getValues()[0] || [];
  var col = headers.indexOf(field) + 1;
  if (col > 0) sh.getRange(row, col).setValue(value);
}

function paginate_(data, page, limit) {
  page = Math.max(1, Number(page) || 1);
  limit = Math.min(100, Math.max(1, Number(limit) || 20));
  var start = (page - 1) * limit;
  var items = data.slice(start, start + limit);
  return { items: items, page: page, limit: limit, total: data.length, totalPages: Math.ceil(data.length / limit) };
}

function sanitize_(s) {
  return String(s).replace(/<[^>]*>/g, '').trim();
}

function parseJSON_(str, def) {
  try { return JSON.parse(str); } catch(e) { return def || {}; }
}

/* ─── PASSWORD HASHING ───────────────────────────────── */

function hashPassword_(password) {
  var salt = '';
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < 16; i++) salt += chars.charAt(Math.floor(Math.random() * chars.length));
  var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, (salt + password));
  var hex = hash.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  return salt + '$' + hex;
}

function verifyPassword_(password, stored) {
  if (!stored || stored.indexOf('$') === -1) return false;
  var parts = stored.split('$');
  var salt = parts[0];
  var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, (salt + password));
  var hex = hash.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  return hex === parts[1];
}

/* ─── AUTH ────────────────────────────────────────────── */

function registerUser(username, password, email, ip, fingerprint, ua, screenRes, tz, lang) {
  var users = getAllData_('Users');
  for (var i = 0; i < users.length; i++) {
    if (users[i].username && users[i].username.toLowerCase() === username.toLowerCase())
      return { success: false, error: 'Username already taken' };
    if (users[i].email && users[i].email.toLowerCase() === email.toLowerCase())
      return { success: false, error: 'Email already registered' };
  }
  var id = getNextId_('Users');
  var hashed = hashPassword_(password);
  var isFirst = users.length === 0;
  appendRow_('Users', {
    id: id, username: username, password: hashed, email: email,
    role: isFirst ? 'ADMIN' : 'USER', approved: isFirst ? 'ALLOW' : 'PENDING',
    joinDate: new Date().toISOString(), lastLogin: '',
    lastIP: ip || '', fingerprint: fingerprint || '', userAgent: ua || '',
    screenRes: screenRes || '', timezone: tz || '', language: lang || '',
    totalLogins: 0, totalSessions: 0, preferences: '{}'
  });
  auditLog_(id, username, 'register', 'auth', '', '', { method: 'register' }, ip, fingerprint, ua, 0);
  trackEvent_(fingerprint, ip, ua, screenRes, tz, lang, 'register', 'auth', 'register', { username: username });
  if (isFirst) {
    return { success: true, message: 'Welcome! You are the first user and have been granted Admin access. You can now sign in.' };
  }
  return { success: true, message: 'Registration submitted. Your account requires manual approval. You will not be notified when approved. Please check back later to sign in.' };
}

function loginUser(username, password, ip, fingerprint, ua, screenRes, tz, lang) {
  var users = getAllData_('Users');
  // Auto-promote first user to ADMIN on login if no admin exists
  var hasAdmin = false;
  for (var ni = 0; ni < users.length; ni++) { if (users[ni].role === 'ADMIN') { hasAdmin = true; break; } }
  for (var i = 0; i < users.length; i++) {
    if (users[i].username && users[i].username.toLowerCase() === username.toLowerCase() && verifyPassword_(password, users[i].password)) {
      if (!hasAdmin && users[i].role !== 'ADMIN') {
        updateCell_('Users', users[i]._row, 'role', 'ADMIN');
        updateCell_('Users', users[i]._row, 'approved', 'ALLOW');
        users[i].role = 'ADMIN';
        users[i].approved = 'ALLOW';
      }
      if (users[i].approved !== 'ALLOW') {
        return { success: false, error: 'Your account has not been approved yet. Please wait for manual approval.' };
      }
      updateCell_('Users', users[i]._row, 'lastLogin', new Date().toISOString());
      updateCell_('Users', users[i]._row, 'lastIP', ip || '');
      updateCell_('Users', users[i]._row, 'fingerprint', fingerprint || '');
      updateCell_('Users', users[i]._row, 'userAgent', ua || '');
      updateCell_('Users', users[i]._row, 'screenRes', screenRes || '');
      updateCell_('Users', users[i]._row, 'timezone', tz || '');
      updateCell_('Users', users[i]._row, 'language', lang || '');
      updateCell_('Users', users[i]._row, 'totalLogins', (Number(users[i].totalLogins) || 0) + 1);
      var token = createSession_(users[i].id, ip, fingerprint, ua, 'home');
      trackDevice_(fingerprint, ip, ua, screenRes, tz, lang, users[i].id);
      auditLog_(users[i].id, username, 'login', 'auth', '', '', { method: 'login' }, ip, fingerprint, ua, 0);
      trackEvent_(fingerprint, ip, ua, screenRes, tz, lang, 'login', 'auth', 'login', { username: username }, users[i].id, username, token);
      return { success: true, userId: users[i].id, token: token, username: username, email: users[i].email, role: users[i].role || 'USER' };
    }
  }
  return { success: false, error: 'Invalid username or password' };
}

function validateSession(token) {
  if (!token) return null;
  var sessions = getAllData_('Sessions');
  var now = Date.now();
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].id === token && !sessions[i].logoutTime) {
      var loginMs = new Date(sessions[i].loginTime).getTime();
      if ((now - loginMs) < CONFIG.SESSION_TTL_MINUTES * 60000) {
        updateCell_('Sessions', sessions[i]._row, 'lastHeartbeat', new Date().toISOString());
        return { userId: sessions[i].userId, username: sessions[i].username || '' };
      }
    }
  }
  return null;
}

function checkSession(token) {
  return validateSession(token);
}

function logoutUser(token) {
  var sessions = getAllData_('Sessions');
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].id === token && !sessions[i].logoutTime) {
      updateCell_('Sessions', sessions[i]._row, 'logoutTime', new Date().toISOString());
      var loginMs = new Date(sessions[i].loginTime).getTime();
      var dur = Math.round((Date.now() - loginMs) / 1000);
      updateCell_('Sessions', sessions[i]._row, 'duration', dur);
      auditLog_(sessions[i].userId, '', 'logout', 'auth', '', '', {}, sessions[i].ip, sessions[i].fingerprint, '', dur);
      return { success: true };
    }
  }
  return { success: false };
}

function getUser(userId) {
  var users = getAllData_('Users');
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].id) === String(userId)) {
      return {
        id: users[i].id, username: users[i].username, email: users[i].email,
        joinDate: users[i].joinDate, lastLogin: users[i].lastLogin,
        totalLogins: users[i].totalLogins, preferences: users[i].preferences
      };
    }
  }
  return null;
}

function getUserProfile(userId) {
  var u = getUser(userId);
  if (!u) return { success: false, error: 'User not found' };
  var reviews = getAllData_('Reviews', function(r) { return String(r.userId) === String(userId); });
  var comments = getAllData_('Comments', function(c) { return String(c.userId) === String(userId); });
  var achievements = getAllData_('UserAchievements', function(a) { return String(a.userId) === String(userId); });
  var friends = getAllData_('Friends', function(f) { return String(f.userId) === String(userId) && f.status === 'accepted'; });
  return {
    success: true,
    profile: {
      id: u.id, username: u.username, joinDate: u.joinDate, lastLogin: u.lastLogin,
      totalLogins: u.totalLogins,
      stats: {
        reviews: reviews.length,
        comments: comments.length,
        achievements: achievements.length,
        friends: friends.length,
      }
    }
  };
}

function getUserStats(token) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var userId = session.userId;
  var reviews = getAllData_('Reviews', function(r) { return String(r.userId) === String(userId); });
  var comments = getAllData_('Comments', function(c) { return String(c.userId) === String(userId); });
  var achievements = getAllData_('UserAchievements', function(a) { return String(a.userId) === String(userId); });
  var analytics = getAllData_('GameAnalytics', function(a) { return String(a.userId) === String(userId); });
  var totalPlaySec = 0;
  for (var i = 0; i < analytics.length; i++) totalPlaySec += Number(analytics[i].durationSec) || 0;
  var gamesPlayed = {};
  for (var i = 0; i < analytics.length; i++) gamesPlayed[analytics[i].gameId] = true;
  var userGames = getAllData_('UserGames', function(g) { return String(g.userId) === String(userId); });
  var friends = getAllData_('Friends', function(f) { return String(f.userId) === String(userId) && f.status === 'accepted'; });
  var totalRating = 0;
  for (var i = 0; i < reviews.length; i++) totalRating += Number(reviews[i].rating) || 0;
  return {
    success: true,
    stats: {
      reviews: reviews.length,
      comments: comments.length,
      achievements: achievements.length,
      gamesPlayed: Object.keys(gamesPlayed).length,
      totalPlayTimeMin: Math.round(totalPlaySec / 60),
      totalPlayTimeHours: Math.round(totalPlaySec / 3600 * 10) / 10,
      avgRating: reviews.length ? Math.round(totalRating / reviews.length * 10) / 10 : 0,
      gamesOwned: userGames.length,
      friends: friends.length,
      wishlist: userGames.filter(function(g) { return g.status === 'wantToPlay'; }).length,
      favorites: userGames.filter(function(g) { return g.status === 'favorite'; }).length,
    }
  };
}

function getUserGameStats(token) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var userId = session.userId;
  var analytics = getAllData_('GameAnalytics', function(a) { return String(a.userId) === String(userId); });
  var byGame = {};
  for (var i = 0; i < analytics.length; i++) {
    var gId = analytics[i].gameId;
    if (!byGame[gId]) byGame[gId] = { plays: 0, totalSec: 0, maxScroll: 0, totalInteractions: 0 };
    byGame[gId].plays++;
    byGame[gId].totalSec += Number(analytics[i].durationSec) || 0;
    if (Number(analytics[i].scrollDepth) > byGame[gId].maxScroll) byGame[gId].maxScroll = Number(analytics[i].scrollDepth);
    byGame[gId].totalInteractions += Number(analytics[i].interactions) || 0;
  }
  var gameStats = [];
  Object.keys(byGame).forEach(function(gameId) {
    var game = getGame(gameId);
    gameStats.push({
      gameId: gameId,
      gameName: game ? game.name : 'Unknown',
      plays: byGame[gameId].plays,
      totalPlayTimeMin: Math.round(byGame[gameId].totalSec / 60),
      maxScroll: byGame[gameId].maxScroll,
      totalInteractions: byGame[gameId].totalInteractions,
    });
  });
  gameStats.sort(function(a, b) { return b.totalPlayTimeMin - a.totalPlayTimeMin; });
  return { success: true, gameStats: gameStats };
}

function getUserReviewHistory(token) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var reviews = getAllData_('Reviews', function(r) { return String(r.userId) === String(session.userId); });
  reviews.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  return { success: true, reviews: reviews };
}

function getUserCommentHistory(token) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var comments = getAllData_('Comments', function(c) { return String(c.userId) === String(session.userId); });
  comments.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  return { success: true, comments: comments };
}

function updateUserPreferences(token, prefsObj) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var allPrefs = getAllData_('UserPreferences');
  var found = false;
  for (var i = 0; i < allPrefs.length; i++) {
    if (String(allPrefs[i].userId) === String(session.userId)) {
      if (prefsObj.favoriteGenres !== undefined) updateCell_('UserPreferences', allPrefs[i]._row, 'favoriteGenres', prefsObj.favoriteGenres);
      if (prefsObj.settings !== undefined) updateCell_('UserPreferences', allPrefs[i]._row, 'settingsJSON', JSON.stringify(prefsObj.settings));
      updateCell_('UserPreferences', allPrefs[i]._row, 'updatedAt', new Date().toISOString());
      found = true;
      break;
    }
  }
  if (!found) {
    appendRow_('UserPreferences', {
      id: getNextId_('UserPreferences'), userId: session.userId,
      favoriteGenres: prefsObj.favoriteGenres || '',
      lastPlayedJSON: '[]', suggestedJSON: '[]',
      settingsJSON: JSON.stringify(prefsObj.settings || {}),
      updatedAt: new Date().toISOString()
    });
  }
  return { success: true };
}

function getUserByUsername(username) {
  var users = getAllData_('Users');
  for (var i = 0; i < users.length; i++) {
    if (users[i].username && users[i].username.toLowerCase() === username.toLowerCase()) {
      return { success: true, user: { id: users[i].id, username: users[i].username } };
    }
  }
  return { success: false, error: 'User not found' };
}

function createSession_(userId, ip, fingerprint, ua, page) {
  var token = generateToken_();
  var user = getUser(userId);
  appendRow_('Sessions', {
    id: token, userId: userId, loginTime: new Date().toISOString(),
    lastHeartbeat: new Date().toISOString(), logoutTime: '',
    ip: ip || '', fingerprint: fingerprint || '', userAgent: ua || '',
    page: page || '', duration: 0
  });
  var sessions = getAllData_('Sessions');
  updateCell_('Users', getUserRow_(userId), 'totalSessions', sessions.filter(function(s) { return String(s.userId) === String(userId); }).length);
  return token;
}

function getUserRow_(userId) {
  var users = getAllData_('Users');
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].id) === String(userId)) return users[i]._row;
  }
  return -1;
}

function generateToken_() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var result = 'WDS';
  for (var i = 0; i < 40; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

/* ─── GAMES ───────────────────────────────────────────── */

function getGames() { return getAllData_('Games'); }

function getGame(id) {
  var games = getGames();
  for (var i = 0; i < games.length; i++) { if (String(games[i].id) === String(id)) return games[i]; }
  return null;
}

function getFeaturedGames() {
  return getAllData_('Games', function(g) { return String(g.featured).toUpperCase() === 'TRUE'; });
}

function searchGames(query) {
  var q = query.toString().toLowerCase().trim();
  if (!q) return getGames();
  return getAllData_('Games', function(g) {
    return (g.name && g.name.toLowerCase().includes(q)) ||
           (g.description && g.description.toLowerCase().includes(q)) ||
           (g.genre && g.genre.toLowerCase().includes(q)) ||
           (g.developer && g.developer.toLowerCase().includes(q));
  });
}

/* ─── REVIEWS ─────────────────────────────────────────── */

function getReviews(gameId) {
  return getAllData_('Reviews', function(r) { return String(r.gameId) === String(gameId); });
}

function getGameRating(gameId) {
  var reviews = getReviews(gameId);
  if (!reviews.length) return { avg: 0, count: 0 };
  var sum = 0;
  for (var i = 0; i < reviews.length; i++) sum += Number(reviews[i].rating || 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

function addReview(gameId, token, rating, text) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var existing = getAllData_('Reviews', function(r) { return String(r.gameId) === String(gameId) && String(r.userId) === String(session.userId); });
  if (existing.length > 0) return { success: false, error: 'You already reviewed this game' };
  var id = getNextId_('Reviews');
  appendRow_('Reviews', {
    id: id, gameId: gameId, userId: session.userId, userName: session.username,
    avatar: '', rating: Math.min(5, Math.max(1, Number(rating))),
    text: text, date: new Date().toISOString()
  });
  auditLog_(session.userId, session.username, 'review.submit', 'engagement', 'game=' + gameId, '', { gameId: gameId, rating: rating }, '', '', '', 0);
  addFeedEntry_(session.userId, 'review', 'game', gameId, { gameId: gameId, rating: rating });
  return { success: true, id: id };
}

/* ─── COMMENTS ────────────────────────────────────────── */

function getComments(gameId) {
  return getAllData_('Comments', function(c) { return String(c.gameId) === String(gameId); });
}

function addComment(gameId, token, text) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var id = getNextId_('Comments');
  appendRow_('Comments', {
    id: id, gameId: gameId, userId: session.userId, userName: session.username,
    avatar: '', text: text, date: new Date().toISOString()
  });
  auditLog_(session.userId, session.username, 'comment.post', 'engagement', 'game=' + gameId, '', { gameId: gameId }, '', '', '', 0);
  addFeedEntry_(session.userId, 'comment', 'game', gameId, { gameId: gameId });
  return { success: true, id: id };
}

/* ─── HEARTBEAT ───────────────────────────────────────── */

function recordHeartbeat(token, page) {
  var session = validateSession(token);
  if (!session) return { success: false };
  var sessions = getAllData_('Sessions');
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].id === token) {
      updateCell_('Sessions', sessions[i]._row, 'lastHeartbeat', new Date().toISOString());
      updateCell_('Sessions', sessions[i]._row, 'page', page || '');
      appendRow_('SessionHeartbeats', {
        id: getNextId_('SessionHeartbeats'), userId: session.userId,
        fingerprint: sessions[i].fingerprint || '', ip: sessions[i].ip || '',
        page: page || '', timestamp: new Date().toISOString(), duration: 0
      });
      return { success: true };
    }
  }
  return { success: false };
}

function trackHeartbeat_(userId, fingerprint, ip, page, geo) {
  try {
    appendRow_('SessionHeartbeats', {
      id: getNextId_('SessionHeartbeats'),
      userId: userId || '',
      fingerprint: fingerprint || '',
      ip: ip || '',
      page: page || '',
      timestamp: new Date().toISOString(),
      duration: 0,
      country: geo.country || '',
      region: geo.region || '',
      city: geo.city || '',
      lat: geo.lat || 0,
      lng: geo.lng || 0,
      isp: geo.isp || '',
      org: geo.org || '',
      asn: geo.asn || ''
    });
  } catch(e) {}
}

/* ─── AUDIT LOG ───────────────────────────────────────── */

function auditLog_(userId, userName, action, eventType, page, element, detailsObj, ip, fingerprint, ua, duration) {
  try {
    var id = getNextId_('AuditLog');
    appendRow_('AuditLog', {
      id: id, userId: userId || '', userName: userName || '',
      timestamp: new Date().toISOString(), action: action || '',
      eventType: eventType || '', page: page || '', element: element || '',
      detailsJSON: detailsObj ? JSON.stringify(detailsObj) : '',
      ip: ip || '', fingerprint: fingerprint || '', userAgent: ua || '',
      duration: duration || 0
    });
  } catch(e) {}
}

function logAuditEvent(token, action, eventType, page, element, detailsObj, duration) {
  var session = validateSession(token);
  if (!session) return { success: false };
  auditLog_(session.userId, session.username, action, eventType, page, element, detailsObj, '', '', '', duration || 0);
  return { success: true };
}

/* ─── GAME ANALYTICS ──────────────────────────────────── */

function logGameOpen(gameId, token, source) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var id = getNextId_('GameAnalytics');
  appendRow_('GameAnalytics', {
    id: id, gameId: gameId, userId: session.userId,
    openTime: new Date().toISOString(), closeTime: '', durationSec: 0,
    scrollDepth: 0, interactions: 0, source: source || 'browse', userAgent: ''
  });
  auditLog_(session.userId, session.username, 'game.open', 'gameplay', 'game=' + gameId, '', { gameId: gameId, source: source }, '', '', '', 0);
  addFeedEntry_(session.userId, 'gamePlay', 'game', gameId, { gameId: gameId, source: source });
  return { success: true, analyticsId: id };
}

function logGameClose(analyticsId, token, durationSec, scrollDepth, interactions) {
  var session = validateSession(token);
  if (!session) return { success: false };
  var records = getAllData_('GameAnalytics');
  for (var i = 0; i < records.length; i++) {
    if (String(records[i].id) === String(analyticsId)) {
      updateCell_('GameAnalytics', records[i]._row, 'closeTime', new Date().toISOString());
      updateCell_('GameAnalytics', records[i]._row, 'durationSec', Number(durationSec) || 0);
      updateCell_('GameAnalytics', records[i]._row, 'scrollDepth', Number(scrollDepth) || 0);
      updateCell_('GameAnalytics', records[i]._row, 'interactions', Number(interactions) || 0);
      auditLog_(session.userId, session.username, 'game.close', 'gameplay', 'game=' + records[i].gameId, '', { analyticsId: analyticsId, durationSec: durationSec }, '', '', '', Number(durationSec) || 0);
      return { success: true };
    }
  }
  return { success: false };
}

function trackGameSession_(userId, username, gameId, gameName, fingerprint, ip, geo, openTime, closeTime, durationSec, scrollDepth, interactions, source) {
  try {
    appendRow_('GameSessions', {
      id: getNextId_('GameSessions'),
      userId: userId || '',
      username: username || '',
      gameId: gameId || '',
      gameName: gameName || '',
      fingerprint: fingerprint || '',
      ip: ip || '',
      country: geo.country || '',
      region: geo.region || '',
      city: geo.city || '',
      zip: geo.zip || '',
      lat: geo.lat || 0,
      lng: geo.lng || 0,
      openTime: openTime || new Date().toISOString(),
      closeTime: closeTime || '',
      durationSec: Number(durationSec) || 0,
      scrollDepth: Number(scrollDepth) || 0,
      interactions: Number(interactions) || 0,
      source: source || ''
    });
  } catch(e) {}
}

/* ─── GAME SUGGESTIONS ────────────────────────────────── */

function getUserSuggestions(token) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in', games: [] };
  var userId = session.userId;

  var analytics = getAllData_('GameAnalytics', function(a) { return String(a.userId) === String(userId); });
  var playedIds = {};
  var genreCounts = {};
  var maxScore = 0;
  for (var i = 0; i < analytics.length; i++) {
    var gId = analytics[i].gameId;
    playedIds[gId] = true;
    var game = getGame(gId);
    if (game && game.genre) {
      genreCounts[game.genre] = (genreCounts[game.genre] || 0) + (Number(analytics[i].durationSec) || 30);
      if (Number(analytics[i].durationSec) > maxScore) maxScore = Number(analytics[i].durationSec);
    }
  }

  var reviewsData = getAllData_('Reviews', function(r) { return String(r.userId) === String(userId); });
  for (var i = 0; i < reviewsData.length; i++) {
    var game = getGame(reviewsData[i].gameId);
    if (game && game.genre) {
      genreCounts[game.genre] = (genreCounts[game.genre] || 0) + Number(reviewsData[i].rating) * 20;
    }
  }

  var userGames = getAllData_('UserGames', function(g) { return String(g.userId) === String(userId); });
  for (var i = 0; i < userGames.length; i++) {
    if (userGames[i].status === 'wantToPlay' || userGames[i].status === 'favorite') {
      var game = getGame(userGames[i].gameId);
      if (game && game.genre) {
        genreCounts[game.genre] = (genreCounts[game.genre] || 0) + 50;
      }
    }
  }

  var allGames = getGames();
  var scored = [];
  for (var i = 0; i < allGames.length; i++) {
    var game = allGames[i];
    if (playedIds[game.id]) continue;
    var score = (genreCounts[game.genre] || 0) + (game.featured === 'TRUE' ? 15 : 0);
    scored.push({ game: game, score: score });
  }

  scored.sort(function(a, b) { return b.score - a.score; });
  var suggested = scored.slice(0, 8).map(function(s) { return s.game; });

  var prefs = getAllData_('UserPreferences', function(p) { return String(p.userId) === String(userId); });
  if (prefs.length > 0) {
    updateCell_('UserPreferences', prefs[0]._row, 'suggestedJSON', JSON.stringify(suggested.map(function(g) { return g.id; })));
  }

  return { success: true, games: suggested };
}

/* ─── GAME REQUESTS ───────────────────────────────────── */

function submitGameRequest(token, gameName, gameUrl, genre, description, reason) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var id = getNextId_('GameRequests');
  appendRow_('GameRequests', {
    id: id, userId: session.userId, userName: session.username,
    gameName: gameName, gameUrl: gameUrl || '', genre: genre || '',
    description: description || '', reason: reason || '',
    status: 'pending', createdAt: new Date().toISOString(), reviewedBy: '', reviewedAt: ''
  });
  auditLog_(session.userId, session.username, 'game.request', 'engagement', '', '', { gameName: gameName }, '', '', '', 0);
  return { success: true, id: id };
}

function getMyGameRequests(token) {
  var session = validateSession(token);
  if (!session) return [];
  return getAllData_('GameRequests', function(r) { return String(r.userId) === String(session.userId); });
}

/* ─── DEVICE TRACKING ─────────────────────────────────── */

function trackDevice_(fingerprint, ip, ua, screen, tz, lang, userId) {
  if (!fingerprint && !ip) return;
  try {
    var geo = getIPInfo_(ip);
    var existing = getAllData_('DeviceTracking', function(d) { return d.fingerprint === fingerprint && fingerprint; });
    if (existing.length > 0) {
      var rec = existing[0];
      updateCell_('DeviceTracking', rec._row, 'lastSeen', new Date().toISOString());
      updateCell_('DeviceTracking', rec._row, 'visitCount', (Number(rec.visitCount) || 0) + 1);
      updateCell_('DeviceTracking', rec._row, 'ip', ip || '');
      updateCell_('DeviceTracking', rec._row, 'ua', ua || '');
      updateCell_('DeviceTracking', rec._row, 'screen', screen || '');
      updateCell_('DeviceTracking', rec._row, 'tz', tz || '');
      updateCell_('DeviceTracking', rec._row, 'lang', lang || '');
      if (geo.country) updateCell_('DeviceTracking', rec._row, 'country', geo.country);
      if (geo.region) updateCell_('DeviceTracking', rec._row, 'region', geo.region);
      if (geo.city) updateCell_('DeviceTracking', rec._row, 'city', geo.city);
      if (geo.lat) updateCell_('DeviceTracking', rec._row, 'lat', geo.lat);
      if (geo.lng) updateCell_('DeviceTracking', rec._row, 'lng', geo.lng);
      if (geo.isp) updateCell_('DeviceTracking', rec._row, 'isp', geo.isp);
      if (geo.org) updateCell_('DeviceTracking', rec._row, 'org', geo.org);
      if (geo.asn) updateCell_('DeviceTracking', rec._row, 'asn', geo.asn);
      if (geo.isMobile) updateCell_('DeviceTracking', rec._row, 'isMobile', geo.isMobile);
      if (geo.isProxy) updateCell_('DeviceTracking', rec._row, 'isProxy', geo.isProxy);
      if (geo.isHosting) updateCell_('DeviceTracking', rec._row, 'isHosting', geo.isHosting);
      if (userId !== undefined) updateCell_('DeviceTracking', rec._row, 'userId', userId);
    } else {
      appendRow_('DeviceTracking', {
        id: getNextId_('DeviceTracking'), fingerprint: fingerprint || '',
        ip: ip || '', ua: ua || '', screen: screen || '', tz: tz || '',
        lang: lang || '', country: geo.country || '', region: geo.region || '',
        city: geo.city || '', zip: geo.zip || '', lat: geo.lat || 0, lng: geo.lng || 0,
        isp: geo.isp || '', org: geo.org || '', asn: geo.asn || '',
        isMobile: geo.isMobile || false, isProxy: geo.isProxy || false,
        isHosting: geo.isHosting || false, isVpn: false,
        firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(),
        visitCount: 1, pageViews: 1,
        userId: userId || ''
      });
    }
  } catch(e) {}
}

function trackEvent_(fingerprint, ip, ua, screen, tz, lang, page, eventType, element, detailsObj, userId, username, sessionId) {
  try {
    var geo = getIPInfo_(ip);
    appendRow_('TrackingLog', {
      id: getNextId_('TrackingLog'), fingerprint: fingerprint || '',
      ip: ip || '', ua: ua || '', screen: screen || '', tz: tz || '',
      lang: lang || '', page: page || '', eventType: eventType || '',
      element: element || '', detailsJSON: detailsObj ? JSON.stringify(detailsObj) : '',
      timestamp: new Date().toISOString(), country: geo.country || '',
      region: geo.region || '', city: geo.city || '', zip: geo.zip || '',
      lat: geo.lat || 0, lng: geo.lng || 0,
      isp: geo.isp || '', org: geo.org || '', asn: geo.asn || '',
      isMobile: geo.isMobile || false, isProxy: geo.isProxy || false,
      isHosting: geo.isHosting || false,
      userId: userId || '', username: username || '', sessionId: sessionId || ''
    });
  } catch(e) {}
}

/* ─── ACHIEVEMENTS ────────────────────────────────────── */

function getAchievements(gameId) {
  if (gameId) return getAllData_('Achievements', function(a) { return String(a.gameId) === String(gameId); });
  return getAllData_('Achievements');
}

function getUserAchievements(userId) {
  var ua = getAllData_('UserAchievements', function(a) { return String(a.userId) === String(userId); });
  var achievements = getAllData_('Achievements');
  var map = {};
  for (var i = 0; i < achievements.length; i++) map[achievements[i].id] = achievements[i];
  var result = [];
  for (var i = 0; i < ua.length; i++) {
    var ach = map[ua[i].achievementId] || {};
    result.push({
      id: ua[i].id, achievementId: ua[i].achievementId, gameId: ua[i].gameId,
      name: ach.name || '', description: ach.description || '',
      icon: ach.icon || '', points: ach.points || 0, rarity: ach.rarity || '',
      secret: ach.secret || false, unlockedAt: ua[i].unlockedAt,
      progress: ua[i].progress, maxProgress: ua[i].maxProgress
    });
  }
  return result;
}

function unlockAchievement(token, achievementId) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var achievements = getAllData_('Achievements', function(a) { return String(a.id) === String(achievementId); });
  if (!achievements.length) return { success: false, error: 'Achievement not found' };
  var ach = achievements[0];
  var existing = getAllData_('UserAchievements', function(u) { return String(u.userId) === String(session.userId) && String(u.achievementId) === String(achievementId); });
  if (existing.length > 0) return { success: false, error: 'Already unlocked' };
  var id = getNextId_('UserAchievements');
  appendRow_('UserAchievements', {
    id: id, userId: session.userId, achievementId: achievementId,
    gameId: ach.gameId || '', unlockedAt: new Date().toISOString(),
    progress: ach.maxProgress || 1, maxProgress: ach.maxProgress || 1
  });
  auditLog_(session.userId, session.username, 'achievement.unlock', 'achievement', 'game=' + ach.gameId, '', { achievementId: achievementId, name: ach.name }, '', '', '', 0);
  addFeedEntry_(session.userId, 'achievement', 'achievement', achievementId, { achievementId: achievementId, name: ach.name, gameId: ach.gameId });
  addNotification_(session.userId, 'achievement', 'Achievement Unlocked!', 'You earned "' + ach.name + '" (' + (ach.points || 0) + ' pts)', '', false);
  return { success: true, id: id, name: ach.name, points: ach.points || 0 };
}

function getRarestAchievements() {
  var all = getAllData_('Achievements');
  var userAch = getAllData_('UserAchievements');
  var counts = {};
  for (var i = 0; i < userAch.length; i++) {
    counts[userAch[i].achievementId] = (counts[userAch[i].achievementId] || 0) + 1;
  }
  var users = getAllData_('Users');
  var totalUsers = users.length || 1;
  var scored = [];
  for (var i = 0; i < all.length; i++) {
    var unlocked = counts[all[i].id] || 0;
    var pct = Math.round((unlocked / totalUsers) * 1000) / 10;
    scored.push({ achievement: all[i], unlockedCount: unlocked, unlockPercent: pct });
  }
  scored.sort(function(a, b) { return a.unlockedCount - b.unlockedCount; });
  return scored.slice(0, 10);
}

/* ─── USER GAMES (wishlist/favorites/played) ──────────── */

function getUserGames(token, status) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var list = getAllData_('UserGames', function(g) {
    return String(g.userId) === String(session.userId) && (!status || g.status === status);
  });
  var enriched = [];
  for (var i = 0; i < list.length; i++) {
    var game = getGame(list[i].gameId);
    enriched.push({
      id: list[i].id, gameId: list[i].gameId, status: list[i].status,
      playTimeMin: list[i].playTimeMin, lastPlayed: list[i].lastPlayed,
      rating: list[i].rating, notes: list[i].notes,
      gameName: game ? game.name : 'Unknown',
      gameCover: game ? game.coverUrl : '',
      gameGenre: game ? game.genre : '',
    });
  }
  return { success: true, games: enriched };
}

function addUserGame(token, gameId, status) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var valid = { played: true, playing: true, wantToPlay: true, favorite: true };
  if (!valid[status]) return { success: false, error: 'Invalid status' };
  var existing = getAllData_('UserGames', function(g) { return String(g.userId) === String(session.userId) && String(g.gameId) === String(gameId); });
  if (existing.length > 0) {
    updateCell_('UserGames', existing[0]._row, 'status', status);
    updateCell_('UserGames', existing[0]._row, 'lastPlayed', new Date().toISOString());
    return { success: true, id: existing[0].id, updated: true };
  }
  var id = getNextId_('UserGames');
  appendRow_('UserGames', {
    id: id, userId: session.userId, gameId: gameId, status: status,
    playTimeMin: 0, lastPlayed: new Date().toISOString(), rating: 0, notes: ''
  });
  addFeedEntry_(session.userId, 'userGame.' + status, 'game', gameId, { gameId: gameId, status: status });
  return { success: true, id: id, updated: false };
}

function updateUserGame(token, gameId, updates) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var existing = getAllData_('UserGames', function(g) { return String(g.userId) === String(session.userId) && String(g.gameId) === String(gameId); });
  if (!existing.length) return { success: false, error: 'Game not in your list' };
  var rec = existing[0];
  if (updates.status !== undefined) updateCell_('UserGames', rec._row, 'status', updates.status);
  if (updates.playTimeMin !== undefined) updateCell_('UserGames', rec._row, 'playTimeMin', Number(updates.playTimeMin));
  if (updates.rating !== undefined) updateCell_('UserGames', rec._row, 'rating', Math.min(5, Math.max(0, Number(updates.rating))));
  if (updates.notes !== undefined) updateCell_('UserGames', rec._row, 'notes', sanitize_(updates.notes));
  updateCell_('UserGames', rec._row, 'lastPlayed', new Date().toISOString());
  return { success: true };
}

function removeUserGame(token, gameId) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var existing = getAllData_('UserGames', function(g) { return String(g.userId) === String(session.userId) && String(g.gameId) === String(gameId); });
  if (!existing.length) return { success: false, error: 'Game not in your list' };
  var sh = getSheet_('UserGames');
  sh.deleteRow(existing[0]._row);
  return { success: true };
}

function getFavorites(token) { return getUserGames(token, 'favorite'); }

function getWishlist(token) { return getUserGames(token, 'wantToPlay'); }

function getPlayedHistory(token) { return getUserGames(token, 'played'); }

/* ─── FRIENDS ─────────────────────────────────────────── */

function getFriends(token) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var friends = getAllData_('Friends', function(f) { return String(f.userId) === String(session.userId) && f.status === 'accepted'; });
  var result = [];
  for (var i = 0; i < friends.length; i++) {
    var u = getUser(friends[i].friendId);
    result.push({
      id: friends[i].id, friendId: friends[i].friendId,
      username: u ? u.username : 'Unknown',
      since: friends[i].createdAt
    });
  }
  return { success: true, friends: result };
}

function getFriendRequests(token) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var sent = getAllData_('FriendRequests', function(r) { return String(r.fromUserId) === String(session.userId); });
  var received = getAllData_('FriendRequests', function(r) { return String(r.toUserId) === String(session.userId); });
  var enrich = function(list) {
    return list.map(function(r) {
      var from = getUser(r.fromUserId);
      var to = getUser(r.toUserId);
      return {
        id: r.id, fromUserId: r.fromUserId, toUserId: r.toUserId,
        fromUsername: from ? from.username : 'Unknown',
        toUsername: to ? to.username : 'Unknown',
        message: r.message, status: r.status, createdAt: r.createdAt
      };
    });
  };
  return { success: true, sent: enrich(sent), received: enrich(received) };
}

function sendFriendRequest(token, toUserId) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  if (String(session.userId) === String(toUserId)) return { success: false, error: 'Cannot friend yourself' };
  var target = getUser(toUserId);
  if (!target) return { success: false, error: 'User not found' };
  var existing = getAllData_('FriendRequests', function(r) { return String(r.fromUserId) === String(session.userId) && String(r.toUserId) === String(toUserId) && r.status === 'pending'; });
  if (existing.length > 0) return { success: false, error: 'Request already sent' };
  var friends = getAllData_('Friends', function(f) { return (String(f.userId) === String(session.userId) && String(f.friendId) === String(toUserId)) || (String(f.userId) === String(toUserId) && String(f.friendId) === String(session.userId)); });
  if (friends.length > 0 && friends[0].status === 'accepted') return { success: false, error: 'Already friends' };
  var id = getNextId_('FriendRequests');
  appendRow_('FriendRequests', {
    id: id, fromUserId: session.userId, toUserId: toUserId,
    message: '', status: 'pending', createdAt: new Date().toISOString()
  });
  addNotification_(toUserId, 'friendRequest', 'Friend Request', session.username + ' wants to be friends!', '', false);
  return { success: true, id: id };
}

function acceptFriendRequest(token, requestId) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var requests = getAllData_('FriendRequests', function(r) { return String(r.id) === String(requestId) && String(r.toUserId) === String(session.userId); });
  if (!requests.length) return { success: false, error: 'Request not found' };
  var req = requests[0];
  updateCell_('FriendRequests', req._row, 'status', 'accepted');
  var fid = getNextId_('Friends');
  appendRow_('Friends', { id: fid, userId: req.fromUserId, friendId: req.toUserId, status: 'accepted', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  var fid2 = getNextId_('Friends');
  appendRow_('Friends', { id: fid2, userId: req.toUserId, friendId: req.fromUserId, status: 'accepted', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  var fromUser = getUser(req.fromUserId);
  addNotification_(req.fromUserId, 'friendAccept', 'Friend Request Accepted', session.username + ' accepted your friend request!', '', false);
  return { success: true };
}

function rejectFriendRequest(token, requestId) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var requests = getAllData_('FriendRequests', function(r) { return String(r.id) === String(requestId) && String(r.toUserId) === String(session.userId); });
  if (!requests.length) return { success: false, error: 'Request not found' };
  updateCell_('FriendRequests', requests[0]._row, 'status', 'rejected');
  return { success: true };
}

function removeFriend(token, friendId) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var sh = getSheet_('Friends');
  var friends = getAllData_('Friends', function(f) { return (String(f.userId) === String(session.userId) && String(f.friendId) === String(friendId)) || (String(f.userId) === String(friendId) && String(f.friendId) === String(session.userId)); });
  for (var i = 0; i < friends.length; i++) {
    sh.deleteRow(friends[i]._row);
  }
  return { success: true };
}

function getFriendActivity(token) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var friends = getAllData_('Friends', function(f) { return String(f.userId) === String(session.userId) && f.status === 'accepted'; });
  var friendIds = {};
  for (var i = 0; i < friends.length; i++) friendIds[friends[i].friendId] = true;
  var feed = getAllData_('Feed', function(f) { return friendIds[f.userId]; });
  feed.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  var enriched = [];
  for (var i = 0; i < Math.min(feed.length, 50); i++) {
    var u = getUser(feed[i].userId);
    enriched.push({
      id: feed[i].id, userId: feed[i].userId,
      username: u ? u.username : 'Unknown',
      eventType: feed[i].eventType, targetType: feed[i].targetType,
      targetId: feed[i].targetId, data: parseJSON_(feed[i].dataJSON),
      createdAt: feed[i].createdAt
    });
  }
  return { success: true, activity: enriched };
}

/* ─── NOTIFICATIONS ───────────────────────────────────── */

function addNotification_(userId, type, title, message, link, read) {
  try {
    var id = getNextId_('Notifications');
    appendRow_('Notifications', {
      id: id, userId: userId, type: type, title: title || '',
      message: message || '', link: link || '', read: read ? 'TRUE' : 'FALSE',
      createdAt: new Date().toISOString()
    });
  } catch(e) {}
}

function getNotifications(token) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var notifs = getAllData_('Notifications', function(n) { return String(n.userId) === String(session.userId); });
  notifs.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  notifs = notifs.map(function(n) {
    return { id: n.id, type: n.type, title: n.title, message: n.message, link: n.link, read: n.read === 'TRUE', createdAt: n.createdAt };
  });
  return { success: true, notifications: notifs };
}

function markNotificationRead(token, notificationId) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var notifs = getAllData_('Notifications', function(n) { return String(n.id) === String(notificationId) && String(n.userId) === String(session.userId); });
  if (notifs.length) updateCell_('Notifications', notifs[0]._row, 'read', 'TRUE');
  return { success: true };
}

function markAllNotificationsRead(token) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var notifs = getAllData_('Notifications', function(n) { return String(n.userId) === String(session.userId) && n.read !== 'TRUE'; });
  for (var i = 0; i < notifs.length; i++) updateCell_('Notifications', notifs[i]._row, 'read', 'TRUE');
  return { success: true, count: notifs.length };
}

function getUnreadNotificationCount(token) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var notifs = getAllData_('Notifications', function(n) { return String(n.userId) === String(session.userId) && n.read !== 'TRUE'; });
  return { success: true, count: notifs.length };
}

/* ─── REPORTS ─────────────────────────────────────────── */

function submitReport(token, targetType, targetId, reason, details) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var validTargets = { game: true, review: true, comment: true, user: true };
  if (!validTargets[targetType]) return { success: false, error: 'Invalid target type' };
  var id = getNextId_('Reports');
  appendRow_('Reports', {
    id: id, reporterId: session.userId, targetType: targetType,
    targetId: targetId, reason: reason || '', details: details || '',
    status: 'pending', createdAt: new Date().toISOString(), resolvedAt: ''
  });
  return { success: true, id: id };
}

function getReports(token) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var reports = getAllData_('Reports');
  reports.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return { success: true, reports: reports };
}

/* ─── CONTACTS ────────────────────────────────────────── */

function submitContact(token, name, email, subject, message) {
  var session = token ? validateSession(token) : null;
  var userId = session ? session.userId : '';
  var userName = session ? session.username : '';
  var id = getNextId_('Contacts');
  appendRow_('Contacts', {
    id: id, userId: userId, userName: userName,
    name: name || '', email: email || '', subject: subject || '',
    message: message || '', status: 'new',
    createdAt: new Date().toISOString(), resolvedAt: '', notes: ''
  });
  return { success: true, id: id };
}

function getContacts(token) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var all = getAllData_('Contacts');
  var mine = all.filter(function(c) { return String(c.userId) === String(session.userId); });
  return { success: true, contacts: mine };
}

/* ─── FEED ────────────────────────────────────────────── */

function addFeedEntry_(userId, eventType, targetType, targetId, dataObj) {
  try {
    var id = getNextId_('Feed');
    appendRow_('Feed', {
      id: id, userId: userId, eventType: eventType,
      targetType: targetType || '', targetId: targetId || '',
      dataJSON: dataObj ? JSON.stringify(dataObj) : '',
      createdAt: new Date().toISOString()
    });
  } catch(e) {}
}

function getFeed(token, page, limit) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var feed = getAllData_('Feed', function(f) { return String(f.userId) === String(session.userId); });
  feed.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  var enriched = feed.map(function(f) {
    var u = getUser(f.userId);
    return { id: f.id, userId: f.userId, username: u ? u.username : 'Unknown', eventType: f.eventType, targetType: f.targetType, targetId: f.targetId, data: parseJSON_(f.dataJSON), createdAt: f.createdAt };
  });
  return { success: true, feed: paginate_(enriched, page, limit) };
}

function getGlobalFeed(page, limit) {
  var feed = getAllData_('Feed');
  feed.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  var enriched = feed.map(function(f) {
    var u = getUser(f.userId);
    return { id: f.id, userId: f.userId, username: u ? u.username : 'Unknown', eventType: f.eventType, targetType: f.targetType, targetId: f.targetId, data: parseJSON_(f.dataJSON), createdAt: f.createdAt };
  });
  return { success: true, feed: paginate_(enriched, page, limit) };
}

function getGameFeed(gameId, page, limit) {
  var feed = getAllData_('Feed', function(f) { return f.targetType === 'game' && String(f.targetId) === String(gameId); });
  feed.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  var enriched = feed.map(function(f) {
    var u = getUser(f.userId);
    return { id: f.id, userId: f.userId, username: u ? u.username : 'Unknown', eventType: f.eventType, targetType: f.targetType, targetId: f.targetId, data: parseJSON_(f.dataJSON), createdAt: f.createdAt };
  });
  return { success: true, feed: paginate_(enriched, page, limit) };
}

/* ─── GAME SERIES ─────────────────────────────────────── */

function getGameSeries() {
  return getAllData_('GameSeries');
}

function getSeriesGames(seriesId) {
  var entries = getAllData_('GameSeriesEntries', function(e) { return String(e.seriesId) === String(seriesId); });
  entries.sort(function(a, b) { return Number(a.order) - Number(b.order); });
  var games = [];
  for (var i = 0; i < entries.length; i++) {
    var game = getGame(entries[i].gameId);
    if (game) { game._order = entries[i].order; games.push(game); }
  }
  return games;
}

function getGameSeriesByGame(gameId) {
  var entries = getAllData_('GameSeriesEntries', function(e) { return String(e.gameId) === String(gameId); });
  var series = [];
  for (var i = 0; i < entries.length; i++) {
    var allSeries = getAllData_('GameSeries', function(s) { return String(s.id) === String(entries[i].seriesId); });
    if (allSeries.length) series.push(allSeries[0]);
  }
  return series;
}

/* ─── PLATFORMS ───────────────────────────────────────── */

function getPlatforms() { return getAllData_('Platforms'); }

function getPlatformGames(platformId) {
  return getAllData_('Games', function(g) { return String(g.platform) === String(platformId); });
}

/* ─── DEVELOPERS & PUBLISHERS ─────────────────────────── */

function getDevelopers() { return getAllData_('Developers'); }

function getDeveloperGames(developerId) {
  return getAllData_('Games', function(g) { return String(g.developer) === String(developerId); });
}

function getDeveloper(developerId) {
  var devs = getAllData_('Developers', function(d) { return String(d.id) === String(developerId); });
  return devs.length ? devs[0] : null;
}

function getPublishers() { return getAllData_('Publishers'); }

function getPublisherGames(publisherId) {
  return getAllData_('Games', function(g) { return String(g.publisher) === String(publisherId); });
}

function getPublisher(publisherId) {
  var pubs = getAllData_('Publishers', function(p) { return String(p.id) === String(publisherId); });
  return pubs.length ? pubs[0] : null;
}

/* ─── CATEGORIES ──────────────────────────────────────── */

function getCategories() {
  var cats = getAllData_('Categories');
  cats.sort(function(a, b) { return Number(a.priority) - Number(b.priority); });
  return cats;
}

function getCategoryGames(categoryId) {
  var entries = getAllData_('GameCategorizations', function(e) { return String(e.categoryId) === String(categoryId); });
  var games = [];
  var seen = {};
  for (var i = 0; i < entries.length; i++) {
    if (seen[entries[i].gameId]) continue;
    seen[entries[i].gameId] = true;
    var game = getGame(entries[i].gameId);
    if (game) games.push(game);
  }
  return games;
}

function getFeaturedByCategory(categoryId) {
  var games = getCategoryGames(categoryId);
  return games.filter(function(g) { return String(g.featured).toUpperCase() === 'TRUE'; });
}

function getTrendingGames() {
  var analytics = getAllData_('GameAnalytics');
  var counts = {};
  var now = Date.now();
  var weekAgo = now - 7 * 86400000;
  for (var i = 0; i < analytics.length; i++) {
    var t = new Date(analytics[i].openTime).getTime();
    if (t >= weekAgo) {
      counts[analytics[i].gameId] = (counts[analytics[i].gameId] || 0) + 1;
    }
  }
  var sorted = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });
  var games = [];
  for (var i = 0; i < Math.min(sorted.length, 20); i++) {
    var game = getGame(sorted[i]);
    if (game) games.push(game);
  }
  return games;
}

function getNewReleases(days) {
  days = Number(days) || 30;
  var cutoff = new Date(Date.now() - days * 86400000).toISOString();
  return getAllData_('Games', function(g) { return g.createdAt && g.createdAt >= cutoff; });
}

function getHiddenGems() {
  var allGames = getGames();
  var analytics = getAllData_('GameAnalytics');
  var playCounts = {};
  for (var i = 0; i < analytics.length; i++) {
    playCounts[analytics[i].gameId] = (playCounts[analytics[i].gameId] || 0) + 1;
  }
  var gems = [];
  for (var i = 0; i < allGames.length; i++) {
    var g = allGames[i];
    var plays = playCounts[g.id] || 0;
    if (plays > 0 && plays < 20 && Number(g.rating) >= 4) {
      gems.push(g);
    }
  }
  gems.sort(function(a, b) { return Number(b.rating) - Number(a.rating); });
  return gems;
}

function getMostPlayedGames() {
  var analytics = getAllData_('GameAnalytics');
  var playCounts = {};
  var totalDurations = {};
  for (var i = 0; i < analytics.length; i++) {
    playCounts[analytics[i].gameId] = (playCounts[analytics[i].gameId] || 0) + 1;
    totalDurations[analytics[i].gameId] = (totalDurations[analytics[i].gameId] || 0) + (Number(analytics[i].durationSec) || 0);
  }
  var sorted = Object.keys(playCounts).sort(function(a, b) { return playCounts[b] - playCounts[a] || totalDurations[b] - totalDurations[a]; });
  var games = [];
  for (var i = 0; i < Math.min(sorted.length, 50); i++) {
    var game = getGame(sorted[i]);
    if (game) games.push(game);
  }
  return games;
}

function getTopRatedGames(minReviews) {
  minReviews = Number(minReviews) || 3;
  var allReviews = getAllData_('Reviews');
  var reviewCounts = {};
  var ratingSums = {};
  for (var i = 0; i < allReviews.length; i++) {
    reviewCounts[allReviews[i].gameId] = (reviewCounts[allReviews[i].gameId] || 0) + 1;
    ratingSums[allReviews[i].gameId] = (ratingSums[allReviews[i].gameId] || 0) + Number(allReviews[i].rating || 0);
  }
  var eligible = [];
  Object.keys(reviewCounts).forEach(function(gameId) {
    if (reviewCounts[gameId] >= minReviews) {
      var avg = Math.round((ratingSums[gameId] / reviewCounts[gameId]) * 10) / 10;
      eligible.push({ gameId: gameId, avg: avg, count: reviewCounts[gameId] });
    }
  });
  eligible.sort(function(a, b) { return b.avg - a.avg || b.count - a.count; });
  var games = [];
  for (var i = 0; i < Math.min(eligible.length, 50); i++) {
    var game = getGame(eligible[i].gameId);
    if (game) { game._avgRating = eligible[i].avg; game._reviewCount = eligible[i].count; games.push(game); }
  }
  return games;
}

/* ─── LEADERBOARDS ────────────────────────────────────── */

function getLeaderboard(type, period, limit) {
  type = type || 'rating';
  period = period || 'allTime';
  limit = Math.min(100, Number(limit) || 20);
  if (type === 'rating') {
    var allGames = getGames();
    var reviews = getAllData_('Reviews');
    var ratings = {};
    for (var i = 0; i < reviews.length; i++) {
      if (!ratings[reviews[i].gameId]) ratings[reviews[i].gameId] = { sum: 0, count: 0 };
      ratings[reviews[i].gameId].sum += Number(reviews[i].rating) || 0;
      ratings[reviews[i].gameId].count++;
    }
    var entries = [];
    for (var i = 0; i < allGames.length; i++) {
      var r = ratings[allGames[i].id];
      var avg = r ? Math.round((r.sum / r.count) * 10) / 10 : 0;
      entries.push({ gameId: allGames[i].id, gameName: allGames[i].name, value: avg, count: r ? r.count : 0, coverUrl: allGames[i].coverUrl });
    }
    entries.sort(function(a, b) { return b.value - a.value || b.count - a.count; });
    return entries.slice(0, limit);
  }
  if (type === 'plays') {
    var analytics = getAllData_('GameAnalytics');
    var pCounts = {};
    for (var i = 0; i < analytics.length; i++) {
      pCounts[analytics[i].gameId] = (pCounts[analytics[i].gameId] || 0) + 1;
    }
    var entries = [];
    var gamesMap = {};
    var allGames = getGames();
    for (var i = 0; i < allGames.length; i++) gamesMap[allGames[i].id] = allGames[i];
    Object.keys(pCounts).forEach(function(gid) {
      var g = gamesMap[gid];
      if (g) entries.push({ gameId: gid, gameName: g.name, value: pCounts[gid], coverUrl: g.coverUrl });
    });
    entries.sort(function(a, b) { return b.value - a.value; });
    return entries.slice(0, limit);
  }
  if (type === 'reviews') {
    var reviewsList = getAllData_('Reviews');
    var rCounts = {};
    for (var i = 0; i < reviewsList.length; i++) {
      rCounts[reviewsList[i].gameId] = (rCounts[reviewsList[i].gameId] || 0) + 1;
    }
    var entries = [];
    var gamesMap = {};
    var allGames = getGames();
    for (var i = 0; i < allGames.length; i++) gamesMap[allGames[i].id] = allGames[i];
    Object.keys(rCounts).forEach(function(gid) {
      var g = gamesMap[gid];
      if (g) entries.push({ gameId: gid, gameName: g.name, value: rCounts[gid], coverUrl: g.coverUrl });
    });
    entries.sort(function(a, b) { return b.value - a.value; });
    return entries.slice(0, limit);
  }
  if (type === 'achievements') {
    var ua = getAllData_('UserAchievements');
    var aCounts = {};
    for (var i = 0; i < ua.length; i++) {
      aCounts[ua[i].userId] = (aCounts[ua[i].userId] || 0) + 1;
    }
    var entries = [];
    Object.keys(aCounts).forEach(function(uid) {
      var u = getUser(uid);
      if (u) entries.push({ userId: uid, userName: u.username, value: aCounts[uid] });
    });
    entries.sort(function(a, b) { return b.value - a.value; });
    return entries.slice(0, limit);
  }
  return [];
}

function getGameLeaderboard(gameId, type, limit) {
  type = type || 'rating';
  limit = Math.min(50, Number(limit) || 10);
  if (type === 'rating') {
    var reviews = getAllData_('Reviews', function(r) { return String(r.gameId) === String(gameId); });
    reviews.sort(function(a, b) { return Number(b.rating) - Number(a.rating) || new Date(a.date) - new Date(b.date); });
    return reviews.slice(0, limit).map(function(r) { return { userId: r.userId, userName: r.userName, rating: r.rating, date: r.date }; });
  }
  if (type === 'playtime') {
    var analytics = getAllData_('GameAnalytics', function(a) { return String(a.gameId) === String(gameId); });
    var userTimes = {};
    for (var i = 0; i < analytics.length; i++) {
      userTimes[analytics[i].userId] = (userTimes[analytics[i].userId] || 0) + (Number(analytics[i].durationSec) || 0);
    }
    var entries = [];
    Object.keys(userTimes).forEach(function(uid) {
      var u = getUser(uid);
      if (u) entries.push({ userId: uid, userName: u.username, value: Math.round(userTimes[uid] / 60), unit: 'min' });
    });
    entries.sort(function(a, b) { return b.value - a.value; });
    return entries.slice(0, limit);
  }
  return [];
}

function getUserLeaderboardRank(token, type) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var lb = getLeaderboard(type, 'allTime', 1000);
  var rank = -1;
  for (var i = 0; i < lb.length; i++) {
    if (String(lb[i].userId || lb[i].gameId) === String(session.userId)) {
      rank = i + 1;
      break;
    }
  }
  return { success: true, rank: rank, total: lb.length };
}

/* ─── ADVANCED SEARCH ─────────────────────────────────── */

function advancedSearch(params) {
  params = params || {};
  var games = getGames();
  var q = (params.query || '').toString().toLowerCase().trim();
  if (q) {
    games = games.filter(function(g) {
      return (g.name && g.name.toLowerCase().includes(q)) ||
             (g.description && g.description.toLowerCase().includes(q)) ||
             (g.genre && g.genre.toLowerCase().includes(q)) ||
             (g.developer && g.developer.toLowerCase().includes(q));
    });
  }
  if (params.genre) games = games.filter(function(g) { return String(g.genre).toLowerCase() === String(params.genre).toLowerCase(); });
  if (params.platform) games = games.filter(function(g) { return String(g.platform).toLowerCase() === String(params.platform).toLowerCase(); });
  if (params.developer) games = games.filter(function(g) { return String(g.developer).toLowerCase() === String(params.developer).toLowerCase(); });
  if (params.publisher) games = games.filter(function(g) { return String(g.publisher).toLowerCase() === String(params.publisher).toLowerCase(); });
  if (params.yearMin) games = games.filter(function(g) { return Number(g.releaseYear) >= Number(params.yearMin); });
  if (params.yearMax) games = games.filter(function(g) { return Number(g.releaseYear) <= Number(params.yearMax); });
  if (params.ratingMin) games = games.filter(function(g) { return Number(g.rating) >= Number(params.ratingMin); });
  if (params.ratingMax) games = games.filter(function(g) { return Number(g.rating) <= Number(params.ratingMax); });
  if (params.tags) {
    var tags = String(params.tags).toLowerCase().split(',');
    games = games.filter(function(g) {
      var desc = (g.name + ' ' + g.description + ' ' + g.genre).toLowerCase();
      for (var t = 0; t < tags.length; t++) {
        if (desc.indexOf(tags[t].trim()) === -1) return false;
      }
      return true;
    });
  }
  var sort = (params.sort || '').toLowerCase();
  if (sort === 'rating') games.sort(function(a, b) { return Number(b.rating) - Number(a.rating); });
  else if (sort === 'rating_asc') games.sort(function(a, b) { return Number(a.rating) - Number(b.rating); });
  else if (sort === 'name') games.sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
  else if (sort === 'year') games.sort(function(a, b) { return Number(b.releaseYear) - Number(a.releaseYear); });
  else if (sort === 'year_asc') games.sort(function(a, b) { return Number(a.releaseYear) - Number(b.releaseYear); });
  else if (sort === 'players') games.sort(function(a, b) { return Number(b.players) - Number(a.players); });
  else if (sort === 'newest') games.sort(function(a, b) { return String(b.createdAt || '').localeCompare(a.createdAt || ''); });
  return paginate_(games, params.page, params.limit);
}

/* ─── CONTENT WARNINGS ────────────────────────────────── */

function getContentWarnings() {
  return getAllData_('ContentWarnings');
}

function getGameContentWarnings(gameId) {
  return getAllData_('ContentWarnings', function(w) { return String(w.gameId) === String(gameId); });
}

/* ─── DISTRIBUTION STATS ──────────────────────────────── */

function getGenreDistribution() {
  var games = getGames();
  var dist = {};
  for (var i = 0; i < games.length; i++) {
    var g = games[i].genre || 'Unknown';
    dist[g] = (dist[g] || 0) + 1;
  }
  var result = [];
  Object.keys(dist).forEach(function(k) { result.push({ label: k, count: dist[k] }); });
  result.sort(function(a, b) { return b.count - a.count; });
  return result;
}

function getPlatformDistribution() {
  var games = getGames();
  var dist = {};
  for (var i = 0; i < games.length; i++) {
    var p = games[i].platform || 'Unknown';
    dist[p] = (dist[p] || 0) + 1;
  }
  var result = [];
  Object.keys(dist).forEach(function(k) { result.push({ label: k, count: dist[k] }); });
  result.sort(function(a, b) { return b.count - a.count; });
  return result;
}

function getYearDistribution() {
  var games = getGames();
  var dist = {};
  for (var i = 0; i < games.length; i++) {
    var y = games[i].releaseYear || 'Unknown';
    dist[y] = (dist[y] || 0) + 1;
  }
  var result = [];
  Object.keys(dist).forEach(function(k) { result.push({ label: k, count: dist[k] }); });
  result.sort(function(a, b) { return String(a.label).localeCompare(String(b.label)); });
  return result;
}

function getRatingDistribution(gameId) {
  var reviews = getAllData_('Reviews', function(r) { return String(r.gameId) === String(gameId); });
  var dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (var i = 0; i < reviews.length; i++) {
    var r = Math.round(Number(reviews[i].rating) || 0);
    if (r >= 1 && r <= 5) dist[r]++;
  }
  return { distribution: dist, total: reviews.length };
}

function getStats() {
  var games = getGames();
  var users = getAllData_('Users');
  var reviews = getAllData_('Reviews');
  var comments = getAllData_('Comments');
  var analytics = getAllData_('GameAnalytics');
  var totalPlaySec = 0;
  for (var i = 0; i < analytics.length; i++) totalPlaySec += Number(analytics[i].durationSec) || 0;
  var achievements = getAllData_('Achievements');
  var userAchievements = getAllData_('UserAchievements');
  var reports = getAllData_('Reports');
  var friendRequests = getAllData_('FriendRequests');
  var friends = getAllData_('Friends');
  return {
    success: true,
    stats: {
      games: games.length,
      users: users.length,
      reviews: reviews.length,
      comments: comments.length,
      totalPlays: analytics.length,
      totalPlayTimeHours: Math.round(totalPlaySec / 3600 * 10) / 10,
      achievements: achievements.length,
      achievementsUnlocked: userAchievements.length,
      reports: reports.length,
      friendRequests: friendRequests.length,
      friendships: friends.filter(function(f) { return f.status === 'accepted'; }).length,
      avgRating: reviews.length ? Math.round(reviews.reduce(function(s, r) { return s + Number(r.rating || 0); }, 0) / reviews.length * 10) / 10 : 0,
    }
  };
}

function getGameStats(gameId) {
  var game = getGame(gameId);
  if (!game) return { success: false, error: 'Game not found' };
  var analytics = getAllData_('GameAnalytics', function(a) { return String(a.gameId) === String(gameId); });
  var totalPlays = analytics.length;
  var totalDuration = 0;
  for (var i = 0; i < analytics.length; i++) totalDuration += Number(analytics[i].durationSec) || 0;
  var avgPlayTime = totalPlays ? Math.round((totalDuration / totalPlays) * 10) / 10 : 0;
  var reviews = getAllData_('Reviews', function(r) { return String(r.gameId) === String(gameId); });
  var totalReviews = reviews.length;
  var totalRating = 0;
  var ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (var i = 0; i < reviews.length; i++) {
    var r = Math.round(Number(reviews[i].rating) || 0);
    totalRating += Number(reviews[i].rating) || 0;
    if (r >= 1 && r <= 5) ratingDist[r]++;
  }
  var avgRating = totalReviews ? Math.round((totalRating / totalReviews) * 10) / 10 : 0;
  return {
    success: true,
    stats: {
      totalPlays: totalPlays,
      avgPlayTimeSec: avgPlayTime,
      avgPlayTimeMin: Math.round(avgPlayTime / 60 * 10) / 10,
      totalReviews: totalReviews,
      avgRating: avgRating,
      ratingDistribution: ratingDist,
    }
  };
}

/* ─── ADMIN ───────────────────────────────────────────── */

function isAdmin_(token) {
  var session = validateSession(token);
  if (!session) return null;
  var users = getAllData_('Users');
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].id) === String(session.userId) && users[i].role === 'ADMIN') {
      return { userId: users[i].id, username: users[i].username, role: 'ADMIN' };
    }
  }
  return null;
}

function checkAdmin(token) {
  var admin = isAdmin_(token);
  return { success: !!admin, role: admin ? 'ADMIN' : 'NONE' };
}

function adminGetSheetData(token, sheetName) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var valid = ['Games','Reviews','Comments','Users','Sessions','AuditLog','GameAnalytics','GameSessions','GameRequests','UserPreferences','Achievements','UserAchievements','UserGames','Friends','FriendRequests','Notifications','Reports','Feed','GameSeries','Platforms','Developers','Publishers','Categories','Leaderboards','DeviceTracking','TrackingLog','SessionHeartbeats','ContentWarnings','GameCategorizations','GameSeriesEntries','Contacts','Notices'];
  if (valid.indexOf(sheetName) < 0) return { success: false, error: 'Invalid sheet' };
  var data = getAllData_(sheetName);
  return { success: true, data: data, count: data.length };
}

function adminUpdateCell(token, sheetName, row, field, value) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  try {
    updateCell_(sheetName, Number(row), field, value);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function adminDeleteRow(token, sheetName, row) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  try {
    var sh = getSheet_(sheetName);
    sh.deleteRow(Number(row));
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function adminAddRow(token, sheetName, jsonData) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  try {
    var obj = parseJSON_(jsonData, {});
    obj.id = getNextId_(sheetName);
    appendRow_(sheetName, obj);
    return { success: true, id: obj.id };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addNotice(token, title, message, type, expiresAt) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var id = getNextId_('Notices');
  appendRow_('Notices', {
    id: id, title: title || '', message: message || '', type: type || 'info',
    active: 'TRUE', createdAt: new Date().toISOString(),
    expiresAt: expiresAt || '', createdBy: admin.username
  });
  return { success: true, id: id };
}

function getActiveNotices() {
  var all = getAllData_('Notices');
  var now = new Date().toISOString();
  return all.filter(function(n) {
    if (n.active !== 'TRUE') return false;
    if (n.expiresAt && n.expiresAt < now) return false;
    return true;
  });
}

function updateNotice(token, noticeId, updates) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var notices = getAllData_('Notices', function(n) { return String(n.id) === String(noticeId); });
  if (!notices.length) return { success: false, error: 'Notice not found' };
  var n = notices[0];
  if (updates.title !== undefined) updateCell_('Notices', n._row, 'title', updates.title);
  if (updates.message !== undefined) updateCell_('Notices', n._row, 'message', updates.message);
  if (updates.type !== undefined) updateCell_('Notices', n._row, 'type', updates.type);
  if (updates.active !== undefined) updateCell_('Notices', n._row, 'active', updates.active ? 'TRUE' : 'FALSE');
  if (updates.expiresAt !== undefined) updateCell_('Notices', n._row, 'expiresAt', updates.expiresAt);
  return { success: true };
}

function deleteNotice(token, noticeId) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var notices = getAllData_('Notices', function(n) { return String(n.id) === String(noticeId); });
  if (!notices.length) return { success: false, error: 'Notice not found' };
  try { getSheet_('Notices').deleteRow(notices[0]._row); return { success: true }; }
  catch(e) { return { success: false, error: e.toString() }; }
}

function approveUser(token, userId) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var users = getAllData_('Users', function(u) { return String(u.id) === String(userId); });
  if (!users.length) return { success: false, error: 'User not found' };
  updateCell_('Users', users[0]._row, 'approved', 'ALLOW');
  addNotification_(userId, 'system', 'Account Approved', 'Your account has been approved! You can now sign in.', '', false);
  return { success: true, username: users[0].username };
}

function rejectUser(token, userId) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var users = getAllData_('Users', function(u) { return String(u.id) === String(userId); });
  if (!users.length) return { success: false, error: 'User not found' };
  updateCell_('Users', users[0]._row, 'approved', 'REJECTED');
  return { success: true, username: users[0].username };
}

function setUserRole(token, userId, role) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  if (['USER','ADMIN'].indexOf(role) < 0) return { success: false, error: 'Invalid role' };
  var users = getAllData_('Users', function(u) { return String(u.id) === String(userId); });
  if (!users.length) return { success: false, error: 'User not found' };
  updateCell_('Users', users[0]._row, 'role', role);
  return { success: true, username: users[0].username, role: role };
}

function submitGameFromRepo(token, name, repo, genre, platform, desc) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var id = getNextId_('Games');
  appendRow_('Games', {
    id: id, name: name, description: desc || '',
    coverUrl: '', gameUrl: 'repo:' + repo,
    genre: genre || 'General', platform: platform || 'Web',
    rating: 0, releaseYear: new Date().getFullYear(),
    developer: session.username || 'Community',
    players: 0, featured: 'FALSE', createdAt: new Date().toISOString()
  });
  addFeedEntry_(session.userId, 'game.submit', 'game', id, { name: name, repo: repo });
  return { success: true, gameId: id, message: 'Game submitted! An admin will review and publish it.' };
}

function adminAddGame(token, gameDataJson) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var g = parseJSON_(gameDataJson, {});
  if (!g.name) return { success: false, error: 'Game name required' };
  g.id = getNextId_('Games');
  g.createdAt = new Date().toISOString();
  if (!g.rating) g.rating = 0;
  if (!g.players) g.players = 0;
  if (!g.featured) g.featured = 'FALSE';
  if (!g.platform) g.platform = 'Web';
  if (!g.genre) g.genre = 'General';
  appendRow_('Games', g);
  return { success: true, gameId: g.id };
}

function adminUpdateGame(token, gameId, gameDataJson) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var updates = parseJSON_(gameDataJson, {});
  var games = getAllData_('Games', function(g) { return String(g.id) === String(gameId); });
  if (!games.length) return { success: false, error: 'Game not found' };
  var g = games[0];
  var fields = ['name','description','coverUrl','gameUrl','genre','platform','rating','releaseYear','developer','publisher','players','featured','contentWarning'];
  for (var i = 0; i < fields.length; i++) {
    if (updates[fields[i]] !== undefined) updateCell_('Games', g._row, fields[i], updates[fields[i]]);
  }
  return { success: true };
}

function adminGetAllUsers(token) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var users = getAllData_('Users');
  var safe = users.map(function(u) { return { id: u.id, username: u.username, email: u.email, role: u.role || 'USER', approved: u.approved || 'PENDING', joinDate: u.joinDate, lastLogin: u.lastLogin, totalLogins: u.totalLogins, totalSessions: u.totalSessions, lastIP: u.lastIP || '' }; });
  return { success: true, users: safe };
}

function adminGetTrackingStats(token) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var dt = getAllData_('DeviceTracking');
  var tl = getAllData_('TrackingLog');
  var sh = getAllData_('SessionHeartbeats');
  var devices = dt.length;
  var events = tl.length;
  var heartbeats = sh.length;
  var uniqueIPs = {};
  var uniqueFps = {};
  for (var i = 0; i < dt.length; i++) { if (dt[i].ip) uniqueIPs[dt[i].ip] = true; if (dt[i].fingerprint) uniqueFps[dt[i].fingerprint] = true; }
  var eventTypes = {};
  for (var i = 0; i < tl.length; i++) { var et = tl[i].eventType || 'unknown'; eventTypes[et] = (eventTypes[et] || 0) + 1; }
  var locations = {};
  for (var i = 0; i < dt.length; i++) { var c = dt[i].country || 'Unknown'; locations[c] = (locations[c] || 0) + 1; }
  var browsers = {};
  for (var i = 0; i < dt.length; i++) {
    var ua = dt[i].ua || '';
    if (ua.indexOf('Chrome') >= 0) browsers['Chrome'] = (browsers['Chrome'] || 0) + 1;
    else if (ua.indexOf('Firefox') >= 0) browsers['Firefox'] = (browsers['Firefox'] || 0) + 1;
    else if (ua.indexOf('Safari') >= 0) browsers['Safari'] = (browsers['Safari'] || 0) + 1;
    else if (ua.indexOf('Edge') >= 0) browsers['Edge'] = (browsers['Edge'] || 0) + 1;
    else browsers['Other'] = (browsers['Other'] || 0) + 1;
  }
  return { success: true, stats: { devices: devices, events: events, heartbeats: heartbeats, uniqueIPs: Object.keys(uniqueIPs).length, uniqueFingerprints: Object.keys(uniqueFps).length, eventTypes: eventTypes, locations: locations, browsers: browsers } };
}

function adminGetAllGameRequests(token) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var requests = getAllData_('GameRequests');
  requests.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return { success: true, requests: requests };
}

function adminReviewGameRequest(token, requestId, status) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var requests = getAllData_('GameRequests', function(r) { return String(r.id) === String(requestId); });
  if (!requests.length) return { success: false, error: 'Request not found' };
  updateCell_('GameRequests', requests[0]._row, 'status', status);
  updateCell_('GameRequests', requests[0]._row, 'reviewedBy', admin.username);
  updateCell_('GameRequests', requests[0]._row, 'reviewedAt', new Date().toISOString());
  if (requests[0].userId) addNotification_(requests[0].userId, 'gameRequest', 'Game Request ' + status, 'Your request for "' + (requests[0].gameName || '') + '" was ' + status, '', false);
  return { success: true };
}

function adminGetAllContacts(token) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var all = getAllData_('Contacts');
  all.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return { success: true, contacts: all };
}

function adminGetAllReports(token) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var all = getAllData_('Reports');
  all.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return { success: true, reports: all };
}

function adminGetAllNotices(token) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var all = getAllData_('Notices');
  all.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return { success: true, notices: all };
}

function adminGetDashboard(token) {
  var admin = isAdmin_(token);
  if (!admin) return { success: false, error: 'Admin access required' };
  var stats = getStats();
  if (stats && stats.stats) {
    var dt = getAllData_('DeviceTracking');
    var tl = getAllData_('TrackingLog');
    var pending = getAllData_('Users', function(u) { return u.approved === 'PENDING'; });
    var reqs = getAllData_('GameRequests', function(r) { return r.status === 'pending'; });
    var contacts = getAllData_('Contacts', function(c) { return c.status === 'new'; });
    var activeNotices = getActiveNotices();
    stats.stats.pendingUsers = pending.length;
    stats.stats.pendingRequests = reqs.length;
    stats.stats.newContacts = contacts.length;
    stats.stats.devicesTracked = dt.length;
    stats.stats.eventsTracked = tl.length;
    stats.stats.activeNotices = activeNotices.length;
  }
  return stats;
}

function getUserLeaderboard(type, period, limit) {
  limit = Math.min(100, Number(limit) || 50);
  var users = getAllData_('Users');
  var reviews = getAllData_('Reviews');
  var userAch = getAllData_('UserAchievements');
  var analytics = getAllData_('GameAnalytics');

  var reviewCounts = {}, reviewSums = {};
  for (var i = 0; i < reviews.length; i++) {
    var uid = reviews[i].userId || '';
    reviewCounts[uid] = (reviewCounts[uid] || 0) + 1;
    reviewSums[uid] = (reviewSums[uid] || 0) + Number(reviews[i].rating || 0);
  }
  var achCounts = {};
  for (var i = 0; i < userAch.length; i++) {
    achCounts[userAch[i].userId || ''] = (achCounts[userAch[i].userId || ''] || 0) + 1;
  }
  var playCounts = {};
  for (var i = 0; i < analytics.length; i++) {
    playCounts[analytics[i].userId || ''] = (playCounts[analytics[i].userId || ''] || 0) + 1;
  }

  var entries = [];
  for (var i = 0; i < users.length; i++) {
    var uid = String(users[i].id);
    var avgRating = reviewCounts[uid] ? Math.round((reviewSums[uid] / reviewCounts[uid]) * 10) / 10 : 0;
    var points = Math.round((reviewCounts[uid] || 0) * 10 + (achCounts[uid] || 0) * 25 + (playCounts[uid] || 0) * 5 + avgRating * 2);
    entries.push({
      userId: uid,
      userName: users[i].username || 'Player',
      points: points,
      gamesPlayed: playCounts[uid] || 0,
      achievements: achCounts[uid] || 0,
      reviews: reviewCounts[uid] || 0
    });
  }
  entries.sort(function(a, b) { return b.points - a.points; });
  return entries.slice(0, limit);
}

/* ─── MISSING FRONTEND FUNCTIONS ──────────────────────── */

function getGenres() {
  var games = getGames();
  var seen = {};
  for (var i = 0; i < games.length; i++) {
    var g = String(games[i].genre || 'Other').split(/[,;\/]/);
    for (var j = 0; j < g.length; j++) {
      var genre = g[j].trim();
      if (genre) seen[genre] = true;
    }
  }
  return Object.keys(seen).sort();
}

function getSimilarGames(gameId) {
  var game = getGame(gameId);
  if (!game) return [];
  var genre = game.genre || '';
  var all = getGames();
  var scored = [];
  for (var i = 0; i < all.length; i++) {
    if (String(all[i].id) === String(gameId)) continue;
    var score = 0;
    if (all[i].genre && genre && all[i].genre.toLowerCase().indexOf(genre.toLowerCase()) >= 0) score += 10;
    if (String(all[i].featured).toUpperCase() === 'TRUE') score += 3;
    if (all[i].rating) score += Number(all[i].rating);
    scored.push({ game: all[i], score: score });
  }
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.slice(0, 6).map(function(s) { return s.game; });
}

function getUserDashboard(token) {
  var session = validateSession(token);
  if (!session) return { success: false, error: 'Must be logged in' };
  var stats = getUserStats(token);
  var recs = getUserSuggestions(token);
  var feed = getFeed(token);
  var notifs = getNotifications(token);
  var user = getUser(session.userId);
  return {
    success: true,
    user: user,
    stats: stats && stats.stats ? stats.stats : {},
    recommendations: recs && recs.games ? recs.games : [],
    feed: feed && feed.items ? feed.items : (feed || []),
    notifications: notifs && notifs.notifications ? notifs.notifications.slice(0, 5) : []
  };
}

function toggleAction(gameId, token, type, action) {
  if (type === 'favorite' || type === 'wantToPlay' || type === 'played') {
    return addUserGame(token, gameId, type);
  }
  return { success: false, error: 'Unknown action type' };
}

/* ─── DO POST ─────────────────────────────────────────── */

function doPost(e) {
  try {
    var params = e && e.parameter ? e.parameter : (e && e.postData ? JSON.parse(e.postData.contents) : {});
    var action = params.action || '';
    var ip = params.ip || '';
    var fingerprint = params.fingerprint || '';
    var ua = params.ua || '';
    var screen = params.screen || '';
    var tz = params.tz || '';
    var lang = params.lang || '';

    if (action === 'track') {
      var geo = getIPInfo_(ip);
      trackDevice_(fingerprint, ip, ua, screen, tz, lang);
      trackEvent_(fingerprint, ip, ua, screen, tz, lang, params.page || 'unknown', params.eventType || 'pageView', params.element || '', { referrer: params.referrer });
      if (params.eventType === 'game.open' && params.token) {
        logGameOpen(params.gameId, params.token, params.source || 'browse');
        var ga = getAllData_('GameAnalytics');
        var last = ga.length ? ga[ga.length - 1] : null;
        if (last) {
          var game = getGame(params.gameId);
          trackGameSession_(last.userId, '', params.gameId, game ? game.name : '', fingerprint, ip, geo, new Date().toISOString(), '', 0, 0, 0, params.source || 'browse');
        }
      }
      if (params.eventType === 'game.close' && params.analyticsId && params.token) {
        logGameClose(params.analyticsId, params.token, params.durationSec, params.scrollDepth, params.interactions);
      }
      if (params.eventType === 'heartbeat') {
        recordHeartbeat(params.token || '', params.page || '');
        var sess = params.token ? validateSession(params.token) : null;
        if (sess) trackHeartbeat_(sess.userId, fingerprint, ip, params.page || '', geo);
      }
      auditLog_('', '', 'page.view', 'tracking', params.page || '', '', { fingerprint: fingerprint, ip: ip, geo: geo }, ip, fingerprint, ua, 0);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'ok',
        geo: { country: geo.country || '', region: geo.region || '', city: geo.city || '', lat: geo.lat || 0, lng: geo.lng || 0, isp: geo.isp || '' }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'heartbeat') {
      recordHeartbeat(params.token || '', params.page || '');
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'trackEvent') {
      trackEvent_(fingerprint, ip, ua, screen, tz, lang, params.page || '', params.eventType || '', params.element || '', parseJSON_(params.details));
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'trackPageView') {
      trackDevice_(fingerprint, ip, ua, screen, tz, lang);
      trackEvent_(fingerprint, ip, ua, screen, tz, lang, params.page || 'unknown', 'pageView', '', { referrer: params.referrer });
      var dev = getAllData_('DeviceTracking', function(d) { return d.fingerprint === fingerprint && fingerprint; });
      if (dev.length > 0) {
        updateCell_('DeviceTracking', dev[0]._row, 'pageViews', (Number(dev[0].pageViews) || 0) + 1);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
    }

    var args = params.args ? JSON.parse(params.args) : [];
    var fn = dispatcher_[action];
    if (fn) {
      var result = fn.apply(null, args);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action: ' + action })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/* ─── DISPATCHER ──────────────────────────────────────── */

var dispatcher_ = {
  // Core
  getGames: getGames,
  getGame: getGame,
  getFeaturedGames: getFeaturedGames,
  searchGames: searchGames,
  getGameRating: getGameRating,
  getReviews: getReviews,
  addReview: addReview,
  getComments: getComments,
  addComment: addComment,
  registerUser: registerUser,
  loginUser: loginUser,
  validateSession: validateSession,
  checkSession: checkSession,
  logoutUser: logoutUser,
  recordHeartbeat: recordHeartbeat,
  logGameOpen: logGameOpen,
  logGameClose: logGameClose,
  getUserSuggestions: getUserSuggestions,
  submitGameRequest: submitGameRequest,
  getMyGameRequests: getMyGameRequests,
  updateUserPreferences: updateUserPreferences,
  logAuditEvent: logAuditEvent,
  getUser: getUser,
  getUserProfile: getUserProfile,
  getUserStats: getUserStats,
  getUserGameStats: getUserGameStats,
  getUserReviewHistory: getUserReviewHistory,
  getUserCommentHistory: getUserCommentHistory,
  // Achievements
  getAchievements: getAchievements,
  getUserAchievements: getUserAchievements,
  unlockAchievement: unlockAchievement,
  getRarestAchievements: getRarestAchievements,
  // User Games
  getUserGames: getUserGames,
  addUserGame: addUserGame,
  updateUserGame: updateUserGame,
  removeUserGame: removeUserGame,
  getFavorites: getFavorites,
  getWishlist: getWishlist,
  getPlayedHistory: getPlayedHistory,
  // Friends
  getFriends: getFriends,
  getFriendRequests: getFriendRequests,
  sendFriendRequest: sendFriendRequest,
  acceptFriendRequest: acceptFriendRequest,
  rejectFriendRequest: rejectFriendRequest,
  removeFriend: removeFriend,
  getFriendActivity: function(token, limit) {
    var r = getFriendActivity(token);
    var feed = r && r.activity ? r.activity : [];
    return feed.slice(0, Math.min(Number(limit) || 30, 100)).map(function(f) {
      return { userName: f.username || f.userName || 'Player', text: f.eventType || f.text || '', date: f.createdAt || f.date || new Date().toISOString() };
    });
  },
  // Notifications
  getNotifications: getNotifications,
  markNotificationRead: markNotificationRead,
  markAllNotificationsRead: markAllNotificationsRead,
  getUnreadNotificationCount: getUnreadNotificationCount,
  // Reports
  submitReport: submitReport,
  getReports: getReports,
  // Contacts
  submitContact: submitContact,
  getContacts: getContacts,
  // Feed
  getFeed: getFeed,
  getGlobalFeed: getGlobalFeed,
  getGameFeed: getGameFeed,
  // Game Series
  getGameSeries: getGameSeries,
  getSeriesGames: getSeriesGames,
  getGameSeriesByGame: getGameSeriesByGame,
  getGameSeriesAll: getGameSeries,
  // Platforms
  getPlatforms: getPlatforms,
  getPlatformGames: getPlatformGames,
  // Developers & Publishers
  getDevelopers: getDevelopers,
  getDeveloperGames: getDeveloperGames,
  getDeveloper: getDeveloper,
  getPublishers: getPublishers,
  getPublisherGames: getPublisherGames,
  getPublisher: getPublisher,
  // Categories
  getCategories: getCategories,
  getCategoryGames: getCategoryGames,
  getFeaturedByCategory: getFeaturedByCategory,
  getTrendingGames: getTrendingGames,
  getNewReleases: getNewReleases,
  getHiddenGems: getHiddenGems,
  getMostPlayedGames: getMostPlayedGames,
  getTopRatedGames: getTopRatedGames,
  // Leaderboards
  getLeaderboard: getUserLeaderboard,
  getGameLeaderboard: getGameLeaderboard,
  getUserLeaderboardRank: getUserLeaderboardRank,
  // Advanced Search
  advancedSearch: advancedSearch,
  // Content Warnings
  getContentWarnings: getContentWarnings,
  getGameContentWarnings: getGameContentWarnings,
  // Distribution & Stats
  getGenreDistribution: getGenreDistribution,
  getPlatformDistribution: getPlatformDistribution,
  getYearDistribution: getYearDistribution,
  getRatingDistribution: getRatingDistribution,
  getStats: getStats,
  getGameStats: getGameStats,
  getUserByUsername: getUserByUsername,
  // Admin
  checkAdmin: checkAdmin,
  adminGetSheetData: adminGetSheetData,
  adminUpdateCell: adminUpdateCell,
  adminDeleteRow: adminDeleteRow,
  adminAddRow: adminAddRow,
  addNotice: addNotice,
  getActiveNotices: getActiveNotices,
  updateNotice: updateNotice,
  deleteNotice: deleteNotice,
  approveUser: approveUser,
  rejectUser: rejectUser,
  setUserRole: setUserRole,
  submitGameFromRepo: submitGameFromRepo,
  adminAddGame: adminAddGame,
  adminUpdateGame: adminUpdateGame,
  adminGetAllUsers: adminGetAllUsers,
  adminGetTrackingStats: adminGetTrackingStats,
  adminGetAllGameRequests: adminGetAllGameRequests,
  adminReviewGameRequest: adminReviewGameRequest,
  adminGetAllContacts: adminGetAllContacts,
  adminGetAllReports: adminGetAllReports,
  adminGetAllNotices: adminGetAllNotices,
  adminGetDashboard: adminGetDashboard,
  // Frontend aliases
  getAllGames: getGames,
  getGenres: getGenres,
  getSimilarGames: getSimilarGames,
  getAllAchievements: function() { return getAchievements(null); },
  getGlobalActivity: function(limit) {
    var feed = getAllData_('Feed');
    feed.sort(function(a, b) { return new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0); });
    return feed.slice(0, Math.min(Number(limit) || 30, 100)).map(function(f) {
      var u = getUser(f.userId);
      return { userName: u ? u.username : (f.userName || 'Player'), text: f.text || f.action || f.eventType || '', date: f.createdAt || f.date || new Date().toISOString() };
    });
  },
  getActivityFeed: function(token, limit) {
    var session = validateSession(token);
    if (!session) return [];
    var feed = getAllData_('Feed', function(f) { return String(f.userId) === String(session.userId); });
    feed.sort(function(a, b) { return new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0); });
    return feed.slice(0, Math.min(Number(limit) || 30, 100)).map(function(f) {
      var u = getUser(f.userId);
      return { userName: u ? u.username : (f.userName || 'Player'), text: f.text || f.action || f.eventType || '', date: f.createdAt || f.date || new Date().toISOString() };
    });
  },
  getUserDashboard: getUserDashboard,
  getUserReviews: function(token) { var r = getUserReviewHistory(token); return r && r.reviews ? r.reviews : (r && r.success ? [] : r || []); },
  getUserComments: function(token) { var r = getUserCommentHistory(token); return r && r.comments ? r.comments : (r && r.success ? [] : r || []); },
  getProfile: function(token) {
    var session = validateSession(token);
    if (!session) return { success: false, error: 'Must be logged in' };
    var user = getUser(session.userId);
    return user || {};
  },
  getRecommendations: function(token, limit) { var r = getUserSuggestions(token); return r && r.games ? r.games : []; },
  reportGame: function(gameId, token, reason) { return submitReport(token, 'game', String(gameId), reason || 'reported', ''); },
  toggleAction: toggleAction,
  requestGame: function(token, action, name, genre, url, desc, reason) { return submitGameRequest(token, name, url, genre, desc, reason); },
  heartbeat: function(token, scrollDepth, clicks, gameId) { return recordHeartbeat(token, ''); },
  contact: function(name, email, subject, msg, token) { return submitContact(token, name, email, subject, msg); },
};
