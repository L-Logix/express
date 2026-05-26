const SHEET_URL = 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit';
const SHEET_NAMES = {
  USERS: 'Users',
  SESSIONS: 'Sessions',
  CASES: 'Cases',
  PARTICIPANTS: 'Participants',
  EVIDENCE: 'Evidence',
  VERDICTS: 'Verdicts',
  NOTICES: 'Notices',
  AUDIT: 'AuditLogs',
  CONFIG: 'Config'
};
const SESSION_TTL_MINUTES = 360;

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Express Airways Judicial OS')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doOptions(e) {
  return addCorsHeaders(ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON));
}

function doPost(e) {
  try {
    const request = parseJsonRequest(e);
    const action = request.action;
    if (!action) {
      return jsonResponse({ success: false, error: 'Missing action parameter.' });
    }
    const result = handleAction(action, request.payload || {});
    return result && result instanceof ContentService.TextOutput ? result : jsonResponse(result);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message || 'Request processing failed.' });
  }
}

function addCorsHeaders(output) {
  if (!output) return output;
  try {
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  } catch (error) {
    // Header injection may not be available in all environments.
  }
  return output;
}

function jsonResponse(payload) {
  return addCorsHeaders(ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON));
}

function parseJsonRequest(e) {
  if (!e) return { action: '', payload: {} };
  const raw = e.postData && e.postData.contents ? e.postData.contents : null;
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return { action: e.parameter && e.parameter.action, payload: e.parameter };
    }
  }
  return { action: e.parameter && e.parameter.action, payload: e.parameter || {} };
}

function handleAction(action, payload) {
  switch ((action || '').toString().trim()) {
    case 'register': return actionRegister(payload);
    case 'login': return actionLogin(payload);
    case 'sessionInfo': return actionSessionInfo(payload);
    case 'getActiveCases': return actionGetActiveCases(payload);
    case 'getCaseDetail': return actionGetCaseDetail(payload);
    case 'submitVerdict': return actionSubmitVerdict(payload);
    case 'fetchAudit': return actionFetchAudit(payload);
    case 'addEvidence': return actionAddEvidence(payload);
    case 'addNotice': return actionAddNotice(payload);
    default: return { success: false, error: `Unknown action: ${action}` };
  }
}

function actionRegister(payload) {
  const fullName = normalizeText(payload.fullName);
  const email = normalizeText(payload.email).toLowerCase();
  const password = payload.password || '';
  if (!fullName || !email || !password) {
    return { success: false, error: 'Full name, email, and password are required.' };
  }
  const usersSheet = getSheet(SHEET_NAMES.USERS);
  if (!usersSheet) return { success: false, error: 'Users sheet is missing.' };
  const existing = getUserByEmail(email);
  if (existing) return { success: false, error: 'Email is already registered.' };

  const salt = createSalt();
  const passwordHash = hashPassword(password, salt);
  const userId = `USR-${Utilities.getUuid().slice(0, 8).toUpperCase()}`;

  appendRow(usersSheet, {
    UserID: userId,
    FullName: fullName,
    Email: email,
    PasswordHash: passwordHash,
    PasswordSalt: salt,
    SystemRole: 'User',
    Approved: 'FALSE',
    CreatedAt: new Date().toISOString()
  });
  auditLog('register', `${fullName} <${email}>`, null, 'New account registration.');
  return { success: true, message: 'Registration completed. Await administrative approval.' };
}

function actionLogin(payload) {
  const email = normalizeText(payload.email).toLowerCase();
  const password = payload.password || '';
  if (!email || !password) return { success: false, error: 'Email and password are required.' };
  const user = getUserByEmail(email);
  if (!user) return { success: false, error: 'Invalid credentials.' };
  if (!verifyPassword(password, user.PasswordSalt, user.PasswordHash)) {
    return { success: false, error: 'Invalid credentials.' };
  }
  if ((user.Approved || '').toString().toLowerCase() !== 'true') {
    return { success: false, error: 'Account is not approved by administration.' };
  }
  const token = createSessionToken(user.UserID);
  auditLog('login', user.FullName, null, 'User authenticated.');
  return { success: true, token, user: sanitizeUser(user) };
}

function actionSessionInfo(payload) {
  const user = getUserFromToken(payload.token);
  if (!user) return { success: false, error: 'Invalid session.' };
  return { success: true, user: sanitizeUser(user) };
}

function actionGetActiveCases(payload) {
  const user = getUserFromToken(payload.token);
  if (!user) return { success: false, error: 'Invalid session token.' };
  const allCases = sheetToArray(getSheet(SHEET_NAMES.CASES));
  const participants = sheetToArray(getSheet(SHEET_NAMES.PARTICIPANTS));
  const userAccess = participants.filter(row => row.UserID === user.UserID);
  const assignedCaseIds = userAccess.map(row => normalizeText(row.CaseID));
  const accessibleCases = allCases.filter(row => {
    const caseId = normalizeText(row.CaseID);
    return assignedCaseIds.includes(caseId) || isAdmin(user);
  }).map(row => formatCaseForResponse(row, user, participants));
  return { success: true, user: sanitizeUser(user), cases: accessibleCases };
}

function actionGetCaseDetail(payload) {
  const user = getUserFromToken(payload.token);
  if (!user) return { success: false, error: 'Invalid session token.' };
  const caseId = normalizeText(payload.caseId);
  if (!caseId) return { success: false, error: 'Case ID is required.' };
  const caseRow = findRow(getSheet(SHEET_NAMES.CASES), row => normalizeText(row.CaseID) === caseId);
  if (!caseRow) return { success: false, error: 'Case not found.' };
  if (!canAccessCase(user, caseId)) return { success: false, error: 'Access denied.' };
  const evidence = sheetToArray(getSheet(SHEET_NAMES.EVIDENCE)).filter(row => normalizeText(row.CaseID) === caseId);
  const notices = sheetToArray(getSheet(SHEET_NAMES.NOTICES)).filter(row => normalizeText(row.CaseID) === caseId);
  const verdicts = sheetToArray(getSheet(SHEET_NAMES.VERDICTS)).filter(row => normalizeText(row.CaseID) === caseId);
  return { success: true, case: caseRow, evidence, notices, verdicts };
}

function actionSubmitVerdict(payload) {
  const user = getUserFromToken(payload.token);
  if (!user) return { success: false, error: 'Invalid session token.' };
  const caseId = normalizeText(payload.caseId);
  if (!caseId) return { success: false, error: 'Case ID is required.' };
  if (!canJudgeCase(user, caseId)) return { success: false, error: 'User is not authorized to submit verdicts on this case.' };
  const declarations = payload.declarations || {};
  const required = ['neutrality', 'evidence', 'recording', 'exParte'];
  const missing = required.filter(key => !declarations[key]);
  if (missing.length) {
    return { success: false, error: `Missing required declarations: ${missing.join(', ')}.` };
  }
  if (!payload.audioLink) return { success: false, error: 'Audio recording link is required.' };
  if (!payload.verdictReasoning) return { success: false, error: 'Judicial reasoning is required.' };
  const verdictId = `VERDICT-${Utilities.getUuid().slice(0, 8).toUpperCase()}`;
  appendRow(getSheet(SHEET_NAMES.VERDICTS), {
    VerdictID: verdictId,
    CaseID: caseId,
    Outcome: payload.verdictOutcome || 'Pending',
    SentenceSummary: payload.sentenceSummary || '',
    Reasoning: payload.verdictReasoning || '',
    EvidenceCited: payload.evidenceCited || '',
    RejectedEvidence: payload.rejectedEvidence || '',
    AudioLink: payload.audioLink || '',
    VideoLink: payload.videoLink || '',
    SubmittedBy: user.FullName || user.Email,
    SubmittedAt: new Date().toISOString(),
    ProceduralReview: JSON.stringify(declarations)
  });
  updateCaseStatus(caseId, 'Verdict Issued');
  auditLog('verdict', user.FullName, caseId, `Verdict issued: ${payload.verdictOutcome}`);
  notifyCaseParticipants(caseId, `Verdict Issued: ${caseId}`, `A verdict has been recorded for ${caseId}. Outcome: ${payload.verdictOutcome}.`, user.Email);
  return { success: true, message: 'Verdict has been recorded successfully.' };
}

function actionFetchAudit(payload) {
  const user = getUserFromToken(payload.token);
  if (!user) return { success: false, error: 'Invalid session token.' };
  const audit = sheetToArray(getSheet(SHEET_NAMES.AUDIT));
  const filtered = audit.filter(row => {
    if (!payload.caseId) return isAdmin(user);
    return normalizeText(row.CaseID) === normalizeText(payload.caseId);
  });
  return { success: true, audit: filtered.slice(0, 50) };
}

function actionAddEvidence(payload) {
  const user = getUserFromToken(payload.token);
  if (!user) return { success: false, error: 'Invalid session token.' };
  const caseId = normalizeText(payload.caseId);
  if (!caseId) return { success: false, error: 'Case ID is required.' };
  if (!canAccessCase(user, caseId)) return { success: false, error: 'Access denied.' };
  const evidenceId = `EVID-${Utilities.getUuid().slice(0, 8).toUpperCase()}`;
  appendRow(getSheet(SHEET_NAMES.EVIDENCE), {
    EvidenceID: evidenceId,
    CaseID: caseId,
    UploadedBy: user.FullName || user.Email,
    Type: payload.type || 'Document',
    Title: payload.title || 'Evidence item',
    Link: payload.link || '',
    Category: payload.category || 'General',
    Timestamp: new Date().toISOString(),
    Notes: payload.notes || ''
  });
  auditLog('evidence', user.FullName, caseId, `Evidence added: ${evidenceId}`);
  notifyCaseParticipants(caseId, `Evidence Uploaded: ${caseId}`, `New evidence has been registered for case ${caseId}.`, user.Email);
  return { success: true, message: 'Evidence registered successfully.' };
}

function actionAddNotice(payload) {
  const user = getUserFromToken(payload.token);
  if (!user) return { success: false, error: 'Invalid session token.' };
  const caseId = normalizeText(payload.caseId);
  if (!caseId) return { success: false, error: 'Case ID is required.' };
  if (!payload.message) return { success: false, error: 'Notice message is required.' };
  appendRow(getSheet(SHEET_NAMES.NOTICES), {
    NoticeID: `NOTICE-${Utilities.getUuid().slice(0, 8).toUpperCase()}`,
    CaseID: caseId,
    Sender: user.FullName || user.Email,
    Recipient: payload.recipient || 'All participants',
    Message: payload.message,
    Type: payload.type || 'Procedural Notice',
    CreatedAt: new Date().toISOString()
  });
  auditLog('notice', user.FullName, caseId, `Notice posted: ${payload.message}`);
  notifyCaseParticipants(caseId, `Notice Posted: ${caseId}`, payload.message, user.Email);
  return { success: true, message: 'Notice added successfully.' };
}

function getSheet(name) {
  try {
    const ss = SpreadsheetApp.openByUrl(SHEET_URL);
    return ss.getSheetByName(name);
  } catch (error) {
    return null;
  }
}

function sheetToArray(sheet) {
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (!values || !values.length) return [];
  const headers = values[0].map(header => normalizeText(header));
  return values.slice(1).map(row => {
    const item = {};
    headers.forEach((header, index) => {
      if (header) item[header] = row[index];
    });
    return item;
  });
}

function getSheetHeaders(sheet) {
  if (!sheet) return [];
  const values = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues();
  return values[0].map(header => normalizeText(header));
}

function appendRow(sheet, record) {
  if (!sheet) return;
  const headers = getSheetHeaders(sheet);
  const row = headers.map(header => record[header] || '');
  sheet.appendRow(row);
}

function findRow(sheet, predicate) {
  const rows = sheetToArray(sheet);
  return rows.find(predicate);
}

function normalizeText(value) {
  if (value === undefined || value === null) return '';
  return value.toString().replace(/\uFEFF/g, '').trim();
}

function createSalt() {
  return Utilities.getUuid().replace(/-/g, '');
}

function hashPassword(password, salt) {
  const raw = `${salt}:${password}`;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
}

function verifyPassword(password, salt, hash) {
  return hashPassword(password, salt) === normalizeText(hash);
}

function createSessionToken(userId) {
  const token = Utilities.getUuid();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60000).toISOString();
  const sheet = getSheet(SHEET_NAMES.SESSIONS);
  if (!sheet) throw new Error('Sessions sheet not found.');
  appendRow(sheet, {
    SessionID: `SES-${Utilities.getUuid().slice(0, 8).toUpperCase()}`,
    UserID: userId,
    Token: token,
    ExpiresAt: expiresAt,
    CreatedAt: new Date().toISOString()
  });
  return token;
}

function getUserByEmail(email) {
  if (!email) return null;
  const rows = sheetToArray(getSheet(SHEET_NAMES.USERS));
  return rows.find(row => normalizeText(row.Email).toLowerCase() === normalizeText(email).toLowerCase()) || null;
}

function getUserById(userId) {
  if (!userId) return null;
  const rows = sheetToArray(getSheet(SHEET_NAMES.USERS));
  return rows.find(row => normalizeText(row.UserID) === normalizeText(userId)) || null;
}

function getUserFromToken(token) {
  if (!token) return null;
  const session = findRow(getSheet(SHEET_NAMES.SESSIONS), row => normalizeText(row.Token) === normalizeText(token));
  if (!session) return null;
  if (new Date(normalizeText(session.ExpiresAt)) < new Date()) return null;
  return getUserById(normalizeText(session.UserID));
}

function sanitizeUser(user) {
  return {
    UserID: normalizeText(user.UserID),
    FullName: normalizeText(user.FullName),
    Email: normalizeText(user.Email),
    SystemRole: normalizeText(user.SystemRole),
    Approved: normalizeText(user.Approved)
  };
}

function isAdmin(user) {
  if (!user) return false;
  const role = normalizeText(user.SystemRole).toLowerCase();
  return role === 'admin' || role === 'express airways administration' || normalizeText(user.Email).toLowerCase().endsWith('@expressairways.com');
}

function canAccessCase(user, caseId) {
  if (!user || !caseId) return false;
  if (isAdmin(user)) return true;
  const participant = findRow(getSheet(SHEET_NAMES.PARTICIPANTS), row => normalizeText(row.CaseID) === caseId && normalizeText(row.UserID) === normalizeText(user.UserID));
  return !!participant;
}

function canJudgeCase(user, caseId) {
  if (!user || !caseId) return false;
  if (isAdmin(user)) return true;
  const participant = findRow(getSheet(SHEET_NAMES.PARTICIPANTS), row => normalizeText(row.CaseID) === caseId && /judge/i.test(normalizeText(row.Role)));
  return !!participant && normalizeText(participant.UserID) === normalizeText(user.UserID);
}

function formatCaseForResponse(caseRow, user, participants) {
  const caseId = normalizeText(caseRow.CaseID);
  const caseParticipants = participants.filter(row => normalizeText(row.CaseID) === caseId);
  const userParticipation = caseParticipants.find(row => normalizeText(row.UserID) === normalizeText(user.UserID));
  return {
    ...caseRow,
    userRole: userParticipation ? normalizeText(userParticipation.Role) : 'Observer',
    isJudge: userParticipation ? /judge/i.test(normalizeText(userParticipation.Role)) : false,
    participantCount: caseParticipants.length
  };
}

function updateCaseStatus(caseId, status) {
  const sheet = getSheet(SHEET_NAMES.CASES);
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(normalizeText);
  const statusIndex = headers.indexOf('Status');
  const caseIdIndex = headers.indexOf('CaseID');
  if (statusIndex < 0 || caseIdIndex < 0) return;
  for (let row = 1; row < values.length; row++) {
    if (normalizeText(values[row][caseIdIndex]) === caseId) {
      sheet.getRange(row + 1, statusIndex + 1).setValue(status);
      break;
    }
  }
}

function auditLog(action, user, caseId, details) {
  const sheet = getSheet(SHEET_NAMES.AUDIT);
  if (!sheet) return;
  appendRow(sheet, {
    AuditID: `AUDIT-${Utilities.getUuid().slice(0, 8).toUpperCase()}`,
    Action: normalizeText(action),
    User: normalizeText(user),
    CaseID: normalizeText(caseId),
    Details: normalizeText(details),
    Timestamp: new Date().toISOString()
  });
}

function notifyCaseParticipants(caseId, subject, message, senderEmail) {
  const participants = sheetToArray(getSheet(SHEET_NAMES.PARTICIPANTS)).filter(row => normalizeText(row.CaseID) === normalizeText(caseId));
  const users = sheetToArray(getSheet(SHEET_NAMES.USERS));
  const recipients = participants.map(participant => {
    const user = users.find(u => normalizeText(u.UserID) === normalizeText(participant.UserID));
    return user ? normalizeText(user.Email) : '';
  }).filter(email => email && email !== normalizeText(senderEmail));
  const uniqueRecipients = Array.from(new Set(recipients));
  uniqueRecipients.forEach(recipient => {
    try {
      // Email sending disabled; log intended notification instead
      Logger.log('notifyCaseParticipants intended to send to: ' + recipient + ' subject: ' + subject);
    } catch (error) {
      // Notification attempts should not block the primary workflow.
    }
  });
}
