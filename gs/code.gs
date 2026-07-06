const SHEET_URL = "https://docs.google.com/spreadsheets/d/1J39EDm_hZWFtQ-fFg2WZQul9sIP6zca7ooWOrXUhdao/edit";
const SESSION_TTL_MINUTES = 360;

const SHEETS = {
  Users: "Users",
  Bookings: "Bookings",
  Seats: "Seats",
  SeatAssignments: "SeatAssignments",
  Ancillaries: "Ancillaries",
  AncillaryBookings: "AncillaryBookings",
  PromoCodes: "PromoCodes",
  Sections: "Sections",
  Events: "Events",
  Documents: "Documents",
  DocRequests: "DocRequests",
  Notices: "Notices",
  Contact: "Contact",
  Issues: "Issues",
  Reviews: "Reviews",
  Referrals: "Referrals",
  Config: "Config",
  SystemStatus: "SystemStatus",
  Sessions: "Sessions",
  Cases: "Cases",
  Participants: "Participants",
  Evidence: "Evidence",
  Verdicts: "Verdicts",
  Notifications: "Notifications",
  TrackingLog: "TrackingLog",
  AuditLog: "AuditLog",
  ApiKeys: "ApiKeys"
};

const APPROVED_AIRCRAFT_MANUFACTURERS = ["Boeing", "Canadair"];
const MILEAGE_TIERS = {
  basic: { minMiles: 0, maxMiles: 24999, multiplier: 1.0, benefits: ["Base pricing"] },
  silver: { minMiles: 25000, maxMiles: 49999, multiplier: 1.1, benefits: ["10% bonus miles", "Priority support"] },
  titanium: { minMiles: 50000, maxMiles: 99999, multiplier: 1.25, benefits: ["25% bonus miles", "Free seat upgrades", "Priority boarding"] },
  gold: { minMiles: 100000, maxMiles: 999999, multiplier: 1.5, benefits: ["50% bonus miles", "Complimentary upgrades", "Exclusive lounge access", "Priority everything"] }
};
const CABIN_MULTIPLIERS = { Economy: 1.0, Business: 2.5, FirstClass: 5.0 };

const AIRPORT_CACHE = {
  JFK: {name: "John F. Kennedy", lat: 40.6413, lng: -73.7781, type: "international", city: "New York", country: "USA"},
  LAX: {name: "Los Angeles International", lat: 33.9425, lng: -118.4081, type: "international", city: "Los Angeles", country: "USA"},
  LHR: {name: "London Heathrow", lat: 51.4700, lng: -0.4543, type: "international", city: "London", country: "UK"},
  CDG: {name: "Paris Charles de Gaulle", lat: 49.0097, lng: 2.5479, type: "international", city: "Paris", country: "France"},
  NRT: {name: "Tokyo Narita", lat: 35.7653, lng: 140.3931, type: "international", city: "Tokyo", country: "Japan"},
  SYD: {name: "Sydney", lat: -33.9461, lng: 151.1772, type: "international", city: "Sydney", country: "Australia"},
  ORD: {name: "Chicago O'Hare", lat: 41.9742, lng: -87.9073, type: "international", city: "Chicago", country: "USA"},
  DFW: {name: "Dallas/Fort Worth", lat: 32.8975, lng: -97.0380, type: "international", city: "Dallas", country: "USA"},
  MIA: {name: "Miami International", lat: 25.7959, lng: -80.2870, type: "domestic", city: "Miami", country: "USA"},
  BOS: {name: "Boston Logan", lat: 42.3656, lng: -71.0096, type: "domestic", city: "Boston", country: "USA"},
  SFO: {name: "San Francisco", lat: 37.6213, lng: -122.3790, type: "domestic", city: "San Francisco", country: "USA"},
  SEA: {name: "Seattle-Tacoma", lat: 47.4502, lng: -122.3088, type: "domestic", city: "Seattle", country: "USA"},
  DEN: {name: "Denver", lat: 39.8561, lng: -104.6737, type: "domestic", city: "Denver", country: "USA"},
  ATL: {name: "Atlanta", lat: 33.6407, lng: -84.4277, type: "domestic", city: "Atlanta", country: "USA"}
};

function getSheet(name) {
  const ss = SpreadsheetApp.openByUrl(SHEET_URL);
  return ss.getSheetByName(name);
}

function ensureSheet(name) {
  const ss = SpreadsheetApp.openByUrl(SHEET_URL);
  let sheet = ss.getSheetByName(name);
  if (!sheet) { sheet = ss.insertSheet(name); }
  return sheet;
}

function sheetToArray(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (!data || data.length === 0) return [];
  const headers = data[0].map(h => (h || "").toString().replace(/^\uFEFF/, "").trim());
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
    return obj;
  });
}

function getHeaderIndexMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, idx) => { if (h) map[h.toString().trim()] = idx + 1; });
  return map;
}

function buildRowByHeaders(sheet, dataObj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.map(h => {
    const key = h ? h.toString().trim() : "";
    if (!key) return "";
    return dataObj[key] !== undefined ? dataObj[key] : "";
  });
}

function findInSheet(sheet, key, value) {
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const keyIndex = headers.indexOf(key);
  if (keyIndex === -1) return { row: -1, data: null };
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][keyIndex] == value) return { row: i + 1, data: rows[i] };
  }
  return { row: -1, data: null };
}

function updateSheetCell(sheet, row, col, value) { sheet.getRange(row, col).setValue(value); }
function updateSheetByHeader(sheet, row, field, value) {
  const map = getHeaderIndexMap(sheet);
  if (!map[field]) return false;
  sheet.getRange(row, map[field]).setValue(value);
  return true;
}

function normalizeText(v) { return (v || "").toString().replace(/^\uFEFF/, "").trim(); }
function parseJsonField(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch(e) { return fallback; }
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateFlightTime(origin, destination) {
  const orig = AIRPORT_CACHE[origin];
  const dest = AIRPORT_CACHE[destination];
  if (!orig || !dest) return 0;
  const distance = haversineDistance(orig.lat, orig.lng, dest.lat, dest.lng);
  return distance / 500 + 0.25;
}

function calculateLoyaltyTier(miles) {
  if (miles >= 100000) return { tier: "gold", multiplier: 1.5, display: "Gold" };
  if (miles >= 50000) return { tier: "titanium", multiplier: 1.25, display: "Titanium" };
  if (miles >= 25000) return { tier: "silver", multiplier: 1.1, display: "Silver" };
  return { tier: "basic", multiplier: 1.0, display: "Basic" };
}

function generateApiKey() { return "EA" + Array.from({length:32}, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random()*36)]).join(""); }

function getApiKeyRecord(key) {
  const sheet = getSheet(SHEETS.ApiKeys);
  if (!sheet) return null;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === key) return { row: i + 1, data: { Key: String(rows[i][0]||""), Email: String(rows[i][1]||""), Name: String(rows[i][2]||""), CreatedAt: String(rows[i][3]||""), LastUsed: String(rows[i][4]||""), Status: String(rows[i][5]||""), RequestCount: Number(rows[i][6])||0, LastReactivation: String(rows[i][7]||""), Notes: String(rows[i][8]||"") } };
  }
  return null;
}

function getApiKeysByEmail(email) {
  const sheet = getSheet(SHEETS.ApiKeys);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const results = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]||"").toLowerCase() === email.toLowerCase()) {
      results.push({ row: i + 1, data: { Key: String(rows[i][0]||""), Email: String(rows[i][1]||""), Name: String(rows[i][2]||""), CreatedAt: String(rows[i][3]||""), LastUsed: String(rows[i][4]||""), Status: String(rows[i][5]||""), RequestCount: Number(rows[i][6])||0, LastReactivation: String(rows[i][7]||""), Notes: String(rows[i][8]||"") } });
    }
  }
  return results;
}

function validateApiKey(key) {
  const rec = getApiKeyRecord(key);
  if (!rec) return { valid: false, error: "Invalid API key" };
  cleanExpiredKeys();
  const updated = getApiKeyRecord(key);
  if (!updated) return { valid: false, error: "API key has been removed" };
  if (updated.data.Status === "removed") return { valid: false, error: "API key has been permanently removed" };
  if (updated.data.Status === "inactive") return { valid: false, error: "API key is inactive. Reactivate it in the Developer Portal." };
  const sheet = getSheet(SHEETS.ApiKeys);
  updateSheetCell(sheet, updated.row, 5, new Date().toISOString());
  updateSheetCell(sheet, updated.row, 7, (updated.data.RequestCount || 0) + 1);
  return { valid: true, record: updated.data };
}

function cleanExpiredKeys() {
  const sheet = getSheet(SHEETS.ApiKeys);
  if (!sheet || sheet.getLastRow() < 2) return;
  const rows = sheet.getDataRange().getValues();
  const now = Date.now();
  for (let i = 1; i < rows.length; i++) {
    const status = String(rows[i][5]||"");
    const lastUsed = String(rows[i][4]||"");
    const lastReactivation = String(rows[i][7]||"");
    const refDate = lastReactivation || lastUsed || String(rows[i][3]||"");
    const refTime = new Date(refDate).getTime();
    if (isNaN(refTime)) continue;
    const daysSince = (now - refTime) / 86400000;
    if (status === "active" && daysSince >= 3) {
      updateSheetCell(sheet, i + 1, 6, "inactive");
      auditLog("dev.keyDeactivated", rows[i][1], "API key auto-deactivated after 3 days inactivity");
    } else if (status === "inactive" && daysSince >= 6) {
      updateSheetCell(sheet, i + 1, 6, "removed");
      auditLog("dev.keyRemoved", rows[i][1], "API key permanently removed after 6 days");
    }
  }
}

function getPublicEndpoints() {
  return [
    { name: "getSystemStatus", method: "GET", description: "Get live status of all Express Airways systems", auth: false },
    { name: "getStats", method: "GET", description: "Get aggregate statistics (bookings, users, documents)", auth: false },
    { name: "getConfig", method: "GET", description: "Get system configuration key-value pairs", auth: false },
    { name: "getSections", method: "GET", description: "Get homepage sections data", auth: false },
    { name: "getEvents", method: "GET", description: "Get upcoming events", auth: false },
    { name: "getNotices", method: "GET", description: "Get system notices", auth: false },
    { name: "getDocuments", method: "GET", description: "Get available documents", auth: false },
    { name: "validatePromo", method: "GET", description: "Validate a promo code", auth: false, params: { code: "string" } },
    { name: "getAirports", method: "GET", description: "Get list of supported airports", auth: false },
    { name: "calculateFare", method: "GET", description: "Estimate flight fare between two airports", auth: false, params: { origin: "string", destination: "string", cabin: "string (optional)", passengers: "number (optional)" } }
  ];
}

function getStatusValue(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 1; }

function addCorsHeaders(output) {
  if (!output) return output;
  try {
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  } catch(e) {}
  return output;
}

function respond(payload) {
  return addCorsHeaders(ContentService.createTextOutput(JSON.stringify(payload || {})).setMimeType(ContentService.MimeType.JSON));
}

function auditLog(action, user, details, ip, fingerprint) {
  try {
    const sheet = ensureSheet(SHEETS.AuditLog);
    if (sheet.getLastRow() === 0) sheet.appendRow(["Timestamp", "Action", "User", "Details", "IP", "Fingerprint", "UserAgent"]);
    sheet.appendRow([new Date().toISOString(), action, user || "anonymous", details || "", ip || "", fingerprint || "", ""]);
  } catch(e) {}
}

function logTracking(data) {
  try {
    const sheet = ensureSheet(SHEETS.TrackingLog);
    if (sheet.getLastRow() === 0) sheet.appendRow(["Timestamp", "IP", "Fingerprint", "UserAgent", "Screen", "Timezone", "Language", "Page", "User", "Extra"]);
    sheet.appendRow([
      new Date().toISOString(),
      data.ip || "",
      data.fingerprint || "",
      data.userAgent || "",
      data.screen || "",
      data.timezone || "",
      data.language || "",
      data.page || "",
      data.user || "",
      data.extra || ""
    ]);
  } catch(e) {}
}

function getAircraftConfig(distanceMiles) {
  if (distanceMiles > 5000) return { model: "Boeing 777", rows: 10, seatsPerRow: 10, manufacturer: "Boeing" };
  else if (distanceMiles > 2000) return { model: "Boeing 787", rows: 9, seatsPerRow: 9, manufacturer: "Boeing" };
  else if (distanceMiles > 500) return { model: "Boeing 737", rows: 8, seatsPerRow: 7, manufacturer: "Boeing" };
  return { model: "Canadair CRJ900", rows: 6, seatsPerRow: 5, manufacturer: "Canadair" };
}

function getDestinationWeather(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit`;
    const resp = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
    if (resp.getResponseCode() === 200) {
      const d = JSON.parse(resp.getContentText());
      return { temp: Math.round(d.current.temperature_2m), windSpeed: Math.round(d.current.wind_speed_10m), condition: getWeatherCondition(d.current.weather_code) };
    }
  } catch(e) {}
  return null;
}

function getWeatherCondition(code) {
  const m = {0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Foggy",48:"Foggy with rime",51:"Light drizzle",53:"Moderate drizzle",55:"Heavy drizzle",61:"Slight rain",63:"Moderate rain",65:"Heavy rain",71:"Slight snow",73:"Moderate snow",75:"Heavy snow",80:"Slight showers",81:"Moderate showers",82:"Violent showers",85:"Slight snow showers",86:"Heavy snow showers",95:"Thunderstorm"};
  return m[code] || "Unknown";
}

function getUserRecordByEmail(email) {
  const users = sheetToArray(getSheet(SHEETS.Users));
  return users.find(u => (u.Email || "").toString().toLowerCase() === (email || "").toString().toLowerCase()) || null;
}

function getExchangeRate(baseCurrency, targetCurrency) {
  try {
    const url = `https://api.exchangerate-api.com/v4/latest/${baseCurrency || "USD"}`;
    const resp = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
    if (resp.getResponseCode() === 200) return (JSON.parse(resp.getContentText()).rates[targetCurrency || "EUR"]) || 1;
  } catch(e) {}
  return 1;
}

function calculateBaseFare(origin, destination, serviceType, departDate, promoCode) {
  try {
    const orig = AIRPORT_CACHE[origin];
    const dest = AIRPORT_CACHE[destination];
    if (!orig || !dest) return 150;
    const distance = haversineDistance(orig.lat, orig.lng, dest.lat, dest.lng);
    let fare = 100 + (distance * 0.10);
    if (serviceType === "EA") fare *= 1.25;
    else if (serviceType === "EX") fare *= 0.95;
    else if (serviceType === "EC") fare *= 1.75;
    const dept = new Date(departDate);
    const dayOfWeek = dept.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) fare *= 1.15;
    fare *= 1.08;
    return Math.round(Math.max(fare, 50));
  } catch(e) { return 150; }
}

function applySurgePricing(departDate, baseFare) {
  const today = new Date();
  const depart = new Date(departDate);
  const daysUntil = Math.ceil((depart - today) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 3 && daysUntil > 0) return Math.round(baseFare * 1.35);
  if (daysUntil <= 7 && daysUntil > 0) return Math.round(baseFare * 1.20);
  if (daysUntil <= 0) return 0;
  return baseFare;
}

function checkBookingLimits(email, departDate) {
  const bookings = sheetToArray(getSheet(SHEETS.Bookings));
  const todayBookings = bookings.filter(b => {
    const bookDate = new Date(b.DepartDate || "").toDateString();
    const checkDate = new Date(departDate).toDateString();
    return b.Email === email && bookDate === checkDate && b.Status === "CONFIRMED";
  });
  return todayBookings.length < 2;
}

function readHeroConfig() {
  const hero = { headline: "Reliable. Sovereign. Global.", subheader: "Express Airways", image: "" };
  const configSheet = getSheet(SHEETS.Config);
  if (configSheet) {
    const rows = configSheet.getDataRange().getValues();
    const headers = (rows[0] || []).map(v => (v || "").toString().trim());
    const keyIdx = headers.indexOf("Key");
    const valIdx = headers.indexOf("Value");
    if (keyIdx >= 0 && valIdx >= 0) {
      for (let i = 1; i < rows.length; i++) {
        const key = (rows[i][keyIdx] || "").toString().trim();
        const val = rows[i][valIdx];
        if (key === "Hero_Image") hero.image = val || hero.image;
        if (key === "Main_Headline") hero.headline = val || hero.headline;
        if (key === "Sub_Header") hero.subheader = val || hero.subheader;
      }
    }
  }
  return hero;
}

function getSystemStatus() {
  try {
    const sheet = getSheet(SHEETS.SystemStatus);
    if (!sheet) return { bookingEngine: "OPERATIONAL", payment: "OPERATIONAL", seats: "OPERATIONAL", notifications: "OPERATIONAL", timestamp: new Date().toISOString() };
    const data = sheet.getDataRange().getValues();
    const status = {};
    for (let i = 1; i < data.length; i++) { if (data[i][0]) status[data[i][0]] = data[i][1]; }
    status.timestamp = new Date().toISOString();
    return status;
  } catch(e) { return { error: "Unable to fetch system status" }; }
}

function createSalt() { return Utilities.getUuid().replace(/-/g, ""); }
function hashPassword(password, salt) {
  const raw = `${salt}:${password}`;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join("");
}
function verifyPassword(password, salt, hash) { return hashPassword(password, salt) === normalizeText(hash); }
function createSessionToken(userId) {
  const token = Utilities.getUuid();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60000).toISOString();
  const sheet = ensureSheet(SHEETS.Sessions);
  if (sheet.getLastRow() === 0) sheet.appendRow(["SessionID", "UserID", "Token", "ExpiresAt", "CreatedAt"]);
  sheet.appendRow([`SES-${Utilities.getUuid().slice(0,8).toUpperCase()}`, userId, token, expiresAt, new Date().toISOString()]);
  return token;
}
function getUserByEmail(email) {
  if (!email) return null;
  return sheetToArray(getSheet(SHEETS.Users)).find(row => normalizeText(row.Email).toLowerCase() === normalizeText(email).toLowerCase()) || null;
}
function getUserById(userId) {
  if (!userId) return null;
  return sheetToArray(getSheet(SHEETS.Users)).find(row => normalizeText(row.UserID || row.Email) === normalizeText(userId)) || null;
}
function getUserFromToken(token) {
  if (!token) return null;
  const session = sheetToArray(getSheet(SHEETS.Sessions)).find(row => normalizeText(row.Token) === normalizeText(token));
  if (!session) return null;
  if (new Date(normalizeText(session.ExpiresAt)) < new Date()) return null;
  return getUserById(normalizeText(session.UserID));
}
function isAdmin(user) {
  if (!user) return false;
  const role = normalizeText(user.Role || user.SystemRole || "").toLowerCase();
  return role === "admin" || role === "administrator" || role === "express airways administration";
}

function setupSheet() {
  const ss = SpreadsheetApp.openByUrl(SHEET_URL);
  const schema = {
    Users: ["UserID","FullName","Email","Password","Role","Miles","Status","JoinDate","Timestamp","UpdatedAt"],
    Bookings: ["BookingRef","Email","Status","Origin","Destination","DepartDate","FlightTimes","ServiceType","Passengers","TotalPrice","PaymentMethod","PaxName","PaxDOB","PaxGender","PaxPassport","PaxPhone","PaxCabin","Timestamp"],
    Seats: ["SeatID","Aircraft","Row","Column","Type","Available","Price"],
    SeatAssignments: ["BookingRef","Seat","PaxName","Email","Timestamp"],
    Ancillaries: ["Type","Description","Price"],
    AncillaryBookings: ["BookingRef","Type","Price","Email","Timestamp"],
    PromoCodes: ["Code","DiscountPercent","DiscountDollars","MaxUses","UsedCount","ExpiryDate","Active"],
    Sections: ["Title","Description","Image","Link","ButtonText"],
    Events: ["Date","Title","Description","Link","Image"],
    Documents: ["ID","Title","Description","Type","FileID","Thumbnail","Category","OpenLimit","Opens","Available","RequiresRequest"],
    DocRequests: ["Timestamp","UserEmail","UserName","DocID","DocTitle","Reason","Department","Status"],
    Notices: ["Title","Message","Severity","Timestamp"],
    Contact: ["Name","Email","Message","Timestamp"],
    Issues: ["IssueID","Email","Subject","Description","Severity","Status","Created","Updated"],
    Reviews: ["Timestamp","BookingRef","Email","Rating","Comment","Date"],
    Referrals: ["Timestamp","ReferrerEmail","RefereeEmail","Status","Date"],
    Config: ["Key","Value"],
    SystemStatus: ["Key","Value"],
    Sessions: ["SessionID","UserID","Token","ExpiresAt","CreatedAt"],
    Cases: ["CaseID","Title","Type","Status","FiledBy","FiledAgainst","Description","CreatedAt","UpdatedAt"],
    Participants: ["ParticipantID","CaseID","UserID","Email","Role","JoinedAt"],
    Evidence: ["EvidenceID","CaseID","UploadedBy","Type","Title","Link","Category","Timestamp","Notes"],
    Verdicts: ["VerdictID","CaseID","Outcome","SentenceSummary","Reasoning","EvidenceCited","RejectedEvidence","AudioLink","VideoLink","SubmittedBy","SubmittedAt","ProceduralReview"],
    Notifications: ["NotificationID","UserID","Email","Type","Title","Message","Link","Read","CreatedAt"],
    TrackingLog: ["Timestamp","IP","Fingerprint","UserAgent","Screen","Timezone","Language","Page","User","Extra"],
    AuditLog: ["Timestamp","Action","User","Details","IP","Fingerprint","UserAgent"],
    ApiKeys: ["Key","Email","Name","CreatedAt","LastUsed","Status","RequestCount","LastReactivation","Notes"]
  };
  const seed = {
    Config: [
      ["Hero_Image","https://wallpapercave.com/wp/wp4615633.jpg"],
      ["Main_Headline","Reliable. Sovereign. Global."],
      ["Sub_Header","Express Airways"],
      ["SystemName","Express Airways NextGen"],
      ["Version","2.0.0"]
    ],
    SystemStatus: [
      ["bookingEngine","OPERATIONAL"],
      ["payment","OPERATIONAL"],
      ["seats","OPERATIONAL"],
      ["notifications","OPERATIONAL"],
      ["tracking","OPERATIONAL"]
    ],
    Sections: [
      ["Book a Flight","Search routes, select seats, and book your next journey with Express Airways.","https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600","#booking","Book Now"],
      ["Operations Hub","Access documents, real-time analytics, and system monitoring tools.","https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600","docs/","Open Hub"],
      ["Infrastructure Status","Live monitoring of all Express Airways services and systems.","https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600","status/","View Status"]
    ],
    Events: [
      [Utilities.formatDate(new Date(Date.now()+86400000*7), Session.getScriptTimeZone(), "yyyy-MM-dd"),"New Route Launch","Express Airways launches direct flights to Tokyo Narita from JFK","","https://images.unsplash.com/photo-1542296332-2e4473faf563?w=300"],
      [Utilities.formatDate(new Date(Date.now()+86400000*30), Session.getScriptTimeZone(), "yyyy-MM-dd"),"Mileage Bonus Weekend","Earn double miles on all international flights for 72 hours","","https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=300"],
      [Utilities.formatDate(new Date(Date.now()+86400000*60), Session.getScriptTimeZone(), "yyyy-MM-dd"),"Fleet Expansion","Express Airways welcomes three new Boeing 787 Dreamliners","","https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=300"]
    ],
    Notices: [
      ["Welcome to Express Airways","Experience next-generation flight services with our unified platform.","info",new Date()]
    ],
    PromoCodes: [
      ["WELCOME10",10,0,100,0,Utilities.formatDate(new Date(Date.now()+86400000*365), Session.getScriptTimeZone(), "yyyy-MM-dd"),"TRUE"]
    ],
    Users: [
      ["USR-ADMIN-001","Admin User","admin@expressairways.com","kingswood1","Admin",100000,1,new Date(),new Date(),new Date()],
      ["USR-DEMO-001","Demo User","demo@expressairways.com","demo1234","User",5000,1,new Date(),new Date(),new Date()]
    ]
  };
  let created = [], skipped = [], seeded = [];
  for (const [name, headers] of Object.entries(schema)) {
    let sheet = ss.getSheetByName(name);
    if (sheet) { skipped.push(name); continue; }
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    created.push(name);
    if (seed[name]) {
      for (const row of seed[name]) { sheet.appendRow(row); }
      seeded.push(name);
    }
  }
  const msg = "Setup complete: " + created.length + " sheets created (" + created.join(", ") + "), " + skipped.length + " already existed, " + seeded.length + " seeded with default data.";
  SpreadsheetApp.getUi().alert(msg);
  return msg;
}

function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const action = params.action;

    // --- TRACKING ---
    if (action === "track") {
      logTracking({
        ip: params.ip || e.parameter.ip || "",
        fingerprint: params.fingerprint || "",
        userAgent: params.ua || "",
        screen: params.screen || "",
        timezone: params.tz || "",
        language: params.lang || "",
        page: params.page || "",
        user: params.user || "",
        extra: params.extra || ""
      });
      return respond({ success: true });
    }

    // --- STATS ---
    if (action === "getStats") {
      const bookings = sheetToArray(getSheet(SHEETS.Bookings)) || [];
      const users = sheetToArray(getSheet(SHEETS.Users)) || [];
      const docs = sheetToArray(getSheet(SHEETS.Documents)) || [];
      const tracks = sheetToArray(getSheet(SHEETS.TrackingLog)) || [];
      const requests = sheetToArray(getSheet(SHEETS.DocRequests)) || [];
      const cases = sheetToArray(getSheet(SHEETS.Cases)) || [];
      const today = new Date().toDateString();
      return respond({
        success: true,
        stats: {
          totalBookings: bookings.length,
          totalUsers: users.length,
          totalDocuments: docs.length,
          totalTracking: tracks.length,
          totalRequests: requests.length,
          totalCases: cases.length,
          todayBookings: bookings.filter(b => (b.DepartDate || "").toString() === today).length,
          todayVisitors: tracks.filter(t => (t.Timestamp || "").startsWith(new Date().toISOString().slice(0,10))).length,
          pendingRequests: bookings.filter(b => (b.Status || "").toString().toUpperCase().indexOf("PENDING") === 0).length
        }
      });
    }

    // --- SYSTEM STATUS ---
    if (action === "getSystemStatus") {
      return respond({ success: true, status: getSystemStatus() });
    }

    // --- CONFIG ---
    if (action === "getConfig") {
      const sheet = getSheet(SHEETS.Config);
      const config = {};
      if (sheet) {
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) { if (rows[i][0]) config[rows[i][0].toString().trim()] = rows[i][1]; }
      }
      return respond({ success: true, config });
    }

    // --- HERO ---
    if (action === "getHero") {
      return respond({ success: true, hero: readHeroConfig() });
    }

    // --- SECTIONS ---
    if (action === "getSections") {
      const sheet = getSheet(SHEETS.Sections);
      return respond({ success: true, sections: sheet ? sheetToArray(sheet) : [] });
    }

    // --- EVENTS ---
    if (action === "getEvents") {
      const sheet = getSheet(SHEETS.Events);
      const events = sheet ? sheetToArray(sheet).map(r => ({
        date: r.Date ? Utilities.formatDate(new Date(r.Date), Session.getScriptTimeZone(), "MMM dd, yyyy") : "",
        title: r.Title || "", description: r.Description || "", link: r.Link || "", image: r.Image || ""
      })) : [];
      return respond({ success: true, events });
    }

    // --- NOTICES ---
    if (action === "getNotices") {
      const sheet = getSheet(SHEETS.Notices);
      return respond({ success: true, notices: sheet ? sheetToArray(sheet) : [] });
    }

    // --- DOCUMENTS (for docs viewer) ---
    if (action === "getDocuments") {
      const sheet = getSheet(SHEETS.Documents);
      if (!sheet) return respond({ success: true, documents: [] });
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const documents = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const available = row[9] !== false && row[9] !== "FALSE" && row[9] !== "No";
        if (!available) continue;
        documents.push({
          id: String(row[0] || ""),
          title: String(row[1] || ""),
          description: String(row[2] || ""),
          type: String(row[3] || "document"),
          fileId: String(row[4] || ""),
          thumbnail: String(row[5] || ""),
          category: String(row[6] || "General"),
          openLimit: Number(row[7]) || 0,
          opens: Number(row[8]) || 0,
          requiresRequest: row[10] === true || row[10] === "TRUE" || row[10] === "Yes"
        });
      }
      return respond({ success: true, documents });
    }

    // --- DOCUMENT REQUESTS ---
    if (action === "getDocRequests") {
      const sheet = getSheet(SHEETS.DocRequests);
      const requests = sheet ? sheetToArray(sheet).filter(r => r["User Email"] === params.email || r.UserEmail === params.email) : [];
      return respond({ success: true, requests });
    }

    // --- GET USER ---
    if (action === "getUser") {
      const uSheet = getSheet(SHEETS.Users);
      const users = sheetToArray(uSheet);
      for (let u of users) {
        const sameEmail = (u.Email || "").toString().toLowerCase() === (params.email || "").toString().toLowerCase();
        const sameUserId = (u.UserID || "").toString() === (params.userId || "").toString();
        if (sameEmail || sameUserId) {
          const tierData = calculateLoyaltyTier(u.Miles || 0);
          return respond({ success: true, user: { id: u.UserID || u.Email, name: u.FullName, email: u.Email, role: u.Role || "basic", miles: u.Miles || 0, status: getStatusValue(u.Status), loyaltyTier: tierData.display } });
        }
      }
      return respond({ success: false, error: "User not found" });
    }

    // --- GET USER BOOKINGS ---
    if (action === "getUserBookings") {
      const bookingsSheet = getSheet(SHEETS.Bookings);
      const email = params.email;
      const userId = params.userId;
      let resolvedEmail = email;
      if (!resolvedEmail && userId) {
        const users = sheetToArray(getSheet(SHEETS.Users));
        const matchedUser = users.find(u => (u.UserID || "").toString() === userId.toString() || (u.Email || "").toString().toLowerCase() === userId.toString().toLowerCase());
        if (matchedUser) resolvedEmail = matchedUser.Email;
      }
      if (!resolvedEmail) return respond({ success: false, message: "email or userId is required" });
      const normalizedEmail = resolvedEmail.toString().toLowerCase();
      const bookings = sheetToArray(bookingsSheet).filter(r => (r.Email || "").toString().toLowerCase() === normalizedEmail);
      return respond({ success: true, bookings });
    }

    // --- GET ALL BOOKINGS (admin) ---
    if (action === "getAllBookings") {
      return respond({ success: true, bookings: sheetToArray(getSheet(SHEETS.Bookings)) || [] });
    }

    // --- GET ALL USERS (admin) ---
    if (action === "getAllUsers") {
      return respond({ success: true, users: sheetToArray(getSheet(SHEETS.Users)) || [] });
    }

    // --- PROMO CODES (admin) ---
    if (action === "getPromoCodes") {
      return respond({ success: true, promos: sheetToArray(getSheet(SHEETS.PromoCodes)) || [] });
    }

    // --- ANCILLARIES (admin) ---
    if (action === "getAncillariesAll") {
      return respond({ success: true, ancillaries: sheetToArray(getSheet(SHEETS.Ancillaries)) || [] });
    }

    // --- ADMIN STATS ---
    if (action === "getAdminStats") {
      const bookings = sheetToArray(getSheet(SHEETS.Bookings)) || [];
      const users = sheetToArray(getSheet(SHEETS.Users)) || [];
      const today = new Date().toDateString();
      return respond({ success: true, totalBookings: bookings.length, totalUsers: users.length, todayBookings: bookings.filter(b => (b.DepartDate || "").toString() === today).length, pendingRequests: bookings.filter(b => (b.Status || "").toString().toUpperCase().indexOf("PENDING") === 0).length });
    }

    // --- AUTH SESSION CHECK (docs) ---
    if (action === "checkLogin") {
      return respond({ loggedIn: false });
    }

    // --- LEGAL: getActiveCases ---
    if (action === "getActiveCases") {
      const user = getUserFromToken(params.token);
      if (!user) return respond({ success: false, error: "Invalid session" });
      const allCases = sheetToArray(getSheet(SHEETS.Cases));
      const participants = sheetToArray(getSheet(SHEETS.Participants));
      const userAccess = participants.filter(p => p.UserID === user.UserID || p.Email === user.Email);
      const accessible = allCases.filter(c => userAccess.some(a => a.CaseID === c.CaseID) || isAdmin(user));
      return respond({ success: true, user: { UserID: user.UserID, FullName: user.FullName, Email: user.Email, SystemRole: user.Role || "User" }, cases: accessible });
    }

    // --- LEGAL: getCaseDetail ---
    if (action === "getCaseDetail") {
      const user = getUserFromToken(params.token);
      if (!user) return respond({ success: false, error: "Invalid session" });
      const caseId = normalizeText(params.caseId);
      if (!caseId) return respond({ success: false, error: "CaseID required" });
      const cases = sheetToArray(getSheet(SHEETS.Cases));
      const caseRow = cases.find(c => normalizeText(c.CaseID) === caseId);
      if (!caseRow) return respond({ success: false, error: "Case not found" });
      const evidence = sheetToArray(getSheet(SHEETS.Evidence)).filter(e => normalizeText(e.CaseID) === caseId);
      const verdicts = sheetToArray(getSheet(SHEETS.Verdicts)).filter(v => normalizeText(v.CaseID) === caseId);
      return respond({ success: true, case: caseRow, evidence, verdicts });
    }

    // --- AUDIT LOG ---
    if (action === "fetchAudit") {
      const user = getUserFromToken(params.token);
      if (!user) return respond({ success: false, error: "Invalid session" });
      const audit = sheetToArray(getSheet(SHEETS.AuditLog));
      const filtered = params.caseId ? audit.filter(a => normalizeText(a.CaseID) === normalizeText(params.caseId)) : audit;
      return respond({ success: true, audit: filtered.slice(0, 50) });
    }

    // --- LIVE STATE (homepage+notices+status) ---
    if (action === "getLiveState") {
      const bSheet = sheetToArray(getSheet(SHEETS.Bookings)) || [];
      const uSheet = sheetToArray(getSheet(SHEETS.Users)) || [];
      const dSheet = sheetToArray(getSheet(SHEETS.Documents)) || [];
      return respond({
        success: true,
        hero: readHeroConfig(),
        sections: sheetToArray(getSheet(SHEETS.Sections)) || [],
        events: sheetToArray(getSheet(SHEETS.Events)) || [],
        notices: sheetToArray(getSheet(SHEETS.Notices)) || [],
        documents: dSheet,
        status: getSystemStatus(),
        stats: { totalUsers: uSheet.length, totalBookings: bSheet.length, totalDocuments: dSheet.length },
        timestamp: new Date().toISOString()
      });
    }

    // --- DEVELOPER API: list public endpoints ---
    if (action === "dev.listEndpoints") {
      return respond({ success: true, endpoints: getPublicEndpoints(), timestamp: new Date().toISOString() });
    }

    // --- DEVELOPER API: system status (key-protected) ---
    if (action === "dev.apiStatus") {
      const keyCheck = validateApiKey(params.key);
      if (!keyCheck.valid) return respond({ success: false, error: keyCheck.error });
      return respond({ success: true, status: getSystemStatus(), keyInfo: { requests: keyCheck.record.RequestCount } });
    }

    // --- DEVELOPER API: statistics (key-protected) ---
    if (action === "dev.apiStats") {
      const keyCheck = validateApiKey(params.key);
      if (!keyCheck.valid) return respond({ success: false, error: keyCheck.error });
      const bookings = sheetToArray(getSheet(SHEETS.Bookings)) || [];
      const users = sheetToArray(getSheet(SHEETS.Users)) || [];
      const docs = sheetToArray(getSheet(SHEETS.Documents)) || [];
      return respond({ success: true, stats: { totalBookings: bookings.length, totalUsers: users.length, totalDocuments: docs.length }, keyInfo: { requests: keyCheck.record.RequestCount } });
    }

    // --- DEVELOPER API: airports (key-protected) ---
    if (action === "dev.apiAirports") {
      const keyCheck = validateApiKey(params.key);
      if (!keyCheck.valid) return respond({ success: false, error: keyCheck.error });
      return respond({ success: true, airports: Object.entries(AIRPORT_CACHE).map(([code, info]) => ({ code, ...info })), keyInfo: { requests: keyCheck.record.RequestCount } });
    }

    // --- DEVELOPER API: calculate fare (key-protected) ---
    if (action === "dev.apiFare") {
      const keyCheck = validateApiKey(params.key);
      if (!keyCheck.valid) return respond({ success: false, error: keyCheck.error });
      if (!params.origin || !params.destination) return respond({ success: false, error: "origin and destination required" });
      const orig = AIRPORT_CACHE[params.origin];
      const dest = AIRPORT_CACHE[params.destination];
      if (!orig || !dest) return respond({ success: false, error: "Invalid airport codes" });
      const distance = haversineDistance(orig.lat, orig.lng, dest.lat, dest.lng);
      const baseFare = calculateBaseFare(params.origin, params.destination);
      const cabinMul = CABIN_MULTIPLIERS[params.cabin] || 1.0;
      const pax = parseInt(params.passengers) || 1;
      return respond({ success: true, origin: params.origin, destination: params.destination, distance: Math.round(distance), baseFare: Math.round(baseFare * cabinMul * pax), estimatedFlightTime: (distance / 500 + 0.25).toFixed(1) + "h", keyInfo: { requests: keyCheck.record.RequestCount } });
    }

    // --- DEV: get key info via GET (for quick status check) ---
    if (action === "dev.getKeyInfo") {
      return doPost({ parameter: params, postData: null });
    }

    // --- Forward unhandled actions to doPost (supports GET-based API calls from file://) ---
    if (action) return doPost({ parameter: params, postData: null });

    // --- LANDING PAGE (default) ---
    const response = { sections: [], config: {}, success: true };
    const sectionSheet = getSheet(SHEETS.Sections);
    if (sectionSheet) response.sections = sheetToArray(sectionSheet);
    const configSheet = getSheet(SHEETS.Config);
    if (configSheet) {
      const configData = configSheet.getDataRange().getValues();
      configData.forEach(row => { if (row[0]) response.config[row[0].toString().trim()] = row[1]; });
    }
    return respond(response);

  } catch (error) {
    return respond({ success: false, error: error.toString() });
  }
}

function doPost(e) {
  try {
    let data;
    if (e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch(err) { data = e.parameter; }
    } else { data = e.parameter; }

    const action = data.action;
    data.ancillaries = parseJsonField(data.ancillaries, []);
    data.passengerDetails = parseJsonField(data.passengerDetails, []);
    let response = { success: false, message: "Unknown request" };

    // --- TRACKING ---
    if (action === "track") {
      logTracking({
        ip: data.ip || "", fingerprint: data.fingerprint || "", userAgent: data.userAgent || "",
        screen: data.screen || "", timezone: data.timezone || "", language: data.language || "",
        page: data.page || "", user: data.user || "", extra: data.extra || ""
      });
      response = { success: true };
    }

    // --- LOGIN ---
    else if (action === "login") {
      const users = sheetToArray(getSheet(SHEETS.Users));
      const email = normalizeText(data.email).toLowerCase();
      const password = normalizeText(data.password);
      for (let u of users) {
        if (normalizeText(u.Email).toLowerCase() === email) {
          const pwMatch = normalizeText(u.Password) === password || (u.PasswordSalt && hashPassword(password, u.PasswordSalt) === u.Password);
          if (!pwMatch) continue;
          const statusVal = getStatusValue(u.Status);
          if (statusVal >= 4) throw new Error("Account suspended. Contact support.");
          if (statusVal === 2) throw new Error("Account suspended. Contact support.");
          const token = createSessionToken(u.UserID);
          const tierData = calculateLoyaltyTier(u.Miles || 0);
          response = { success: true, token: token, user: { id: u.UserID || u.Email, UserID: u.UserID, name: u.FullName, FullName: u.FullName, email: u.Email, Email: u.Email, role: u.Role || u.SystemRole || tierData.tier, SystemRole: u.SystemRole || u.Role || tierData.tier, miles: u.Miles || 0, status: statusVal, loyaltyTier: tierData.display } };
          break;
        }
      }
      if (!response.success) throw new Error("Invalid credentials.");
      auditLog("login", email, "User login");
    }

    // --- SIGNUP ---
    else if (action === "signup") {
      const sheet = getSheet(SHEETS.Users);
      if (!sheet) throw new Error("Users sheet not found.");
      const fullName = normalizeText(data.fullName || data.FullName);
      const email = normalizeText(data.email || data.Email).toLowerCase();
      const password = normalizeText(data.password || data.Password);
      if (!fullName || !email || !password) throw new Error("Missing required signup fields.");
      const existing = sheetToArray(sheet);
      for (let u of existing) { if (normalizeText(u.Email).toLowerCase() === email) throw new Error("Email already registered."); }
      if (sheet.getLastRow() === 0) sheet.appendRow(["UserID", "FullName", "Email", "Password", "Role", "Miles", "Status", "JoinDate", "Timestamp", "UpdatedAt"]);
      const row = buildRowByHeaders(sheet, { UserID: `USR-${Date.now()}`, FullName: fullName, Email: email, Password: password, Role: data.role || data.Role || "User", Miles: 0, Status: 1, JoinDate: new Date(), Timestamp: new Date(), UpdatedAt: new Date() });
      sheet.appendRow(row);
      response = { success: true, user: { id: email, name: fullName, email: email, role: data.role || "User", miles: 0, status: 1, loyaltyTier: "Basic" } };
      auditLog("signup", email, "New account registration");
    }

    // --- LOGOUT ---
    else if (action === "logout") {
      auditLog("logout", data.email || "anonymous", "User logout");
      response = { success: true, message: "Logged out" };
    }

    // --- BOOKING ---
    else if (action === "booking") {
      const account = getUserRecordByEmail(data.email);
      const accountStatus = getStatusValue(account ? account.Status : 1);
      if (accountStatus === 2 || accountStatus === 4) throw new Error("Booking privileges suspended.");
      const bSheet = getSheet(SHEETS.Bookings);
      const bookingRef = String(Date.now());
      const orig = AIRPORT_CACHE[data.origin];
      const dest = AIRPORT_CACHE[data.destination];
      const distance = haversineDistance(orig ? orig.lat : 0, orig ? orig.lng : 0, dest ? dest.lat : 0, dest ? dest.lng : 0);
      let fare = calculateBaseFare(data.origin, data.destination, data.serviceType || "EA", data.departDate, data.promoCode);
      fare = applySurgePricing(data.departDate, fare);
      const cabinMultiplier = CABIN_MULTIPLIERS[data.paxCabin || data.cabin] || 1.0;
      fare *= cabinMultiplier;
      fare *= data.passengers || 1;
      const ancillariesTotal = (data.ancillaries || []).reduce((sum, anc) => sum + ((parseFloat(anc.price) || 0) * (data.passengers || 1)), 0);
      fare += ancillariesTotal;
      const uSheet = getSheet(SHEETS.Users);
      const users = sheetToArray(uSheet);
      let userTier = calculateLoyaltyTier(0);
      let userRowNum = -1;
      for (let i = 0; i < users.length; i++) {
        if (users[i].Email === data.email) { userTier = calculateLoyaltyTier(users[i].Miles || 0); userRowNum = i + 2; break; }
      }
      const milesEarned = Math.round(distance * userTier.multiplier);
      const canAutoApprove = checkBookingLimits(data.email, data.departDate);
      const bookingStatus = canAutoApprove ? "CONFIRMED" : "PENDING_REVIEW";
      if (bSheet.getLastRow() === 0) bSheet.appendRow(["BookingRef","Email","Status","Origin","Destination","DepartDate","FlightTimes","ServiceType","Passengers","TotalPrice","PaymentMethod","PaxName","PaxDOB","PaxGender","PaxPassport","PaxPhone","PaxCabin","Timestamp"]);
      const bookingRow = buildRowByHeaders(bSheet, { BookingRef: bookingRef, Email: data.email, Status: bookingStatus, Origin: data.origin, Destination: data.destination, DepartDate: data.departDate, FlightTimes: calculateFlightTime(data.origin, data.destination), ServiceType: data.serviceType || "EA", Passengers: data.passengers || 1, TotalPrice: Math.round(fare), PaymentMethod: data.paymentMethod || "credit", PaxName: data.paxName || "", PaxDOB: data.paxDOB || "", PaxGender: data.paxGender || "", PaxPassport: data.paxPassport || "", PaxPhone: data.paxPhone || "", PaxCabin: data.paxCabin || "Economy", Timestamp: new Date() });
      bSheet.appendRow(bookingRow);
      if (userRowNum > 0) {
        let milesDeduction = 0;
        if (data.paymentMethod === "miles") milesDeduction = Math.floor(Math.min(fare / 0.015, users[userRowNum - 2].Miles || 0));
        const currentMiles = users[userRowNum - 2].Miles || 0;
        const newMiles = currentMiles - milesDeduction + milesEarned;
        updateSheetByHeader(uSheet, userRowNum, "Miles", newMiles);
        updateSheetByHeader(uSheet, userRowNum, "Role", calculateLoyaltyTier(newMiles).display);
      }
      if (data.selectedSeat) {
        const seatSheet = ensureSheet(SHEETS.SeatAssignments);
        if (seatSheet.getLastRow() === 0) seatSheet.appendRow(["BookingRef","Seat","PaxName","Email","Timestamp"]);
        seatSheet.appendRow([bookingRef, data.selectedSeat, data.paxName, data.email, new Date()]);
      }
      if (data.ancillaries && data.ancillaries.length > 0) {
        const aSheet = ensureSheet(SHEETS.AncillaryBookings);
        if (aSheet.getLastRow() === 0) aSheet.appendRow(["BookingRef","Type","Price","Email","Timestamp"]);
        data.ancillaries.forEach(anc => aSheet.appendRow([bookingRef, anc.id || anc.type, anc.price || 0, data.email, new Date()]));
      }
      auditLog("booking", data.email, `Booking created: ${bookingRef}`);
      response = { success: true, bookingRef, bookingStatus, milesEarned, totalFare: Math.round(fare) };
    }

    // --- CANCEL BOOKING ---
    else if (action === "cancel") {
      const bSheet = getSheet(SHEETS.Bookings);
      const result = findInSheet(bSheet, "BookingRef", data.bookingRef);
      if (result.row > 0 && result.data[1] === data.email) {
        updateSheetCell(bSheet, result.row, 3, "CANCELLED");
        response = { success: true, message: "Booking cancelled." };
        auditLog("cancel", data.email, `Booking cancelled: ${data.bookingRef}`);
      }
    }

    // --- CONTACT ---
    else if (action === "contact") {
      const cSheet = ensureSheet(SHEETS.Contact);
      if (cSheet.getLastRow() === 0) cSheet.appendRow(["Name","Email","Message","Timestamp"]);
      cSheet.appendRow([data.name, data.email, data.message, new Date()]);
      response = { success: true, message: "Message sent." };
      auditLog("contact", data.email, "Contact form submitted");
    }

    // --- REPORT ISSUE ---
    else if (action === "reportIssue") {
      const iSheet = ensureSheet(SHEETS.Issues);
      if (iSheet.getLastRow() === 0) iSheet.appendRow(["IssueID","Email","Subject","Description","Severity","Status","Created","Updated"]);
      const issueId = "ISS-" + Math.random().toString(36).substr(2, 9).toUpperCase();
      iSheet.appendRow([issueId, data.email, data.subject, data.description, data.severity || "normal", "OPEN", new Date(), new Date()]);
      response = { success: true, issueId };
      auditLog("issue", data.email, `Issue reported: ${issueId}`);
    }

    // --- REVIEW ---
    else if (action === "review") {
      const rSheet = ensureSheet(SHEETS.Reviews);
      if (rSheet.getLastRow() === 0) rSheet.appendRow(["Timestamp","BookingRef","Email","Rating","Comment","Date"]);
      rSheet.appendRow([Date.now(), data.bookingRef, data.email, data.rating, data.comment, new Date()]);
      response = { success: true, message: "Review submitted." };
    }

    // --- REFERRAL ---
    else if (action === "referral") {
      const refSheet = ensureSheet(SHEETS.Referrals);
      if (refSheet.getLastRow() === 0) refSheet.appendRow(["Timestamp","ReferrerEmail","RefereeEmail","Status","Date"]);
      refSheet.appendRow([Date.now(), data.referrerEmail, data.refereeEmail, "PENDING", new Date()]);
      response = { success: true, message: "Referral sent." };
    }

    // --- DOCUMENT ACCESS REQUEST ---
    else if (action === "requestAccess" || action === "requestDoc") {
      const dSheet = ensureSheet(SHEETS.DocRequests);
      if (dSheet.getLastRow() === 0) dSheet.appendRow(["Timestamp","UserEmail","UserName","DocID","DocTitle","Reason","Department","Status"]);
      dSheet.appendRow([new Date().toISOString(), data.user || data.email, data.userName || "", data.docId || data.docTitle || "", data.docTitle || "", data.reason || "", data.department || "", "pending"]);
      response = { success: true, message: "Request submitted." };
      auditLog("docRequest", data.user || data.email, `Document request: ${data.docTitle || data.docId}`);
    }

    // --- TRACK OPEN (docs viewer) ---
    else if (action === "trackOpen") {
      const docSheet = getSheet(SHEETS.Documents);
      if (docSheet) {
        const rows = docSheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (String(rows[i][0]) === String(data.docId)) {
            const currentOpens = Number(rows[i][8]) || 0;
            docSheet.getRange(i + 1, 9).setValue(currentOpens + 1);
            break;
          }
        }
      }
      auditLog("trackOpen", data.user || "anonymous", `Document opened: ${data.docId}`);
      response = { success: true };
    }

    // --- PROMO VALIDATION ---
    else if (action === "validatePromo") {
      const pSheet = getSheet(SHEETS.PromoCodes);
      const promos = sheetToArray(pSheet);
      const promo = promos.find(p => normalizeText(p.Code).toUpperCase() === normalizeText(data.code).toUpperCase());
      if (!promo) response = { success: false, message: "Invalid promo code" };
      else if (promo.Active !== "TRUE" && promo.Active !== true) response = { success: false, message: "Promo code is inactive" };
      else if (parseInt(promo.UsedCount, 10) >= parseInt(promo.MaxUses, 10)) response = { success: false, message: "Usage limit exceeded" };
      else if (new Date(promo.ExpiryDate) < new Date()) response = { success: false, message: "Promo code has expired" };
      else response = { success: true, discountPercent: parseFloat(promo.DiscountPercent) || 0, discountDollars: parseFloat(promo.DiscountDollars) || 0, message: "Promo applied" };
    }

    // --- LEGAL: REGISTER ---
    else if (action === "register") {
      const fullName = normalizeText(data.fullName);
      const email = normalizeText(data.email).toLowerCase();
      const password = data.password || "";
      if (!fullName || !email || !password) throw new Error("Full name, email, and password required.");
      if (getUserByEmail(email)) throw new Error("Email already registered.");
      const sheet = ensureSheet(SHEETS.Users);
      if (sheet.getLastRow() === 0) sheet.appendRow(["UserID","FullName","Email","Password","PasswordSalt","Role","SystemRole","Approved","Miles","Status","CreatedAt"]);
      const salt = createSalt();
      const pwHash = hashPassword(password, salt);
      const userId = `USR-${Utilities.getUuid().slice(0,8).toUpperCase()}`;
      sheet.appendRow([userId, fullName, email, pwHash, salt, "User", "User", "TRUE", 0, 1, new Date().toISOString()]);
      auditLog("register", email, "New judicial account registration");
      response = { success: true, message: "Registration completed." };
    }

    // --- LEGAL: SESSION INFO ---
    else if (action === "sessionInfo") {
      const user = getUserFromToken(data.token);
      if (!user) response = { success: false, error: "Invalid session" };
      else response = { success: true, user: { UserID: user.UserID, FullName: user.FullName, Email: user.Email, SystemRole: user.SystemRole || user.Role || "User", Approved: "TRUE" } };
    }

    // --- LEGAL: SUBMIT VERDICT ---
    else if (action === "submitVerdict") {
      const user = getUserFromToken(data.token);
      if (!user) throw new Error("Invalid session token");
      const caseId = normalizeText(data.caseId);
      if (!caseId) throw new Error("Case ID required");
      if (!data.verdictReasoning) throw new Error("Judicial reasoning required");
      const vSheet = ensureSheet(SHEETS.Verdicts);
      if (vSheet.getLastRow() === 0) vSheet.appendRow(["VerdictID","CaseID","Outcome","SentenceSummary","Reasoning","EvidenceCited","RejectedEvidence","AudioLink","VideoLink","SubmittedBy","SubmittedAt","ProceduralReview"]);
      vSheet.appendRow([`VERDICT-${Utilities.getUuid().slice(0,8).toUpperCase()}`, caseId, data.verdictOutcome || "Pending", data.sentenceSummary || "", data.verdictReasoning || "", data.evidenceCited || "", data.rejectedEvidence || "", data.audioLink || "", data.videoLink || "", user.FullName || user.Email, new Date().toISOString(), JSON.stringify(data.declarations || {})]);
      auditLog("verdict", user.FullName, `Verdict for ${caseId}: ${data.verdictOutcome}`);
      response = { success: true, message: "Verdict recorded." };
    }

    // --- LEGAL: ADD EVIDENCE ---
    else if (action === "addEvidence") {
      const user = getUserFromToken(data.token);
      if (!user) throw new Error("Invalid session token");
      const caseId = normalizeText(data.caseId);
      if (!caseId) throw new Error("Case ID required");
      const eSheet = ensureSheet(SHEETS.Evidence);
      if (eSheet.getLastRow() === 0) eSheet.appendRow(["EvidenceID","CaseID","UploadedBy","Type","Title","Link","Category","Timestamp","Notes"]);
      const evId = `EVID-${Utilities.getUuid().slice(0,8).toUpperCase()}`;
      eSheet.appendRow([evId, caseId, user.FullName || user.Email, data.type || "Document", data.title || "Evidence item", data.link || "", data.category || "General", new Date().toISOString(), data.notes || ""]);
      auditLog("evidence", user.FullName, `Evidence added: ${evId} for case ${caseId}`);
      response = { success: true, message: "Evidence registered." };
    }

    // --- ADMIN ACTIONS ---
    else if (action === "admin.addPromo") {
      const pSheet = ensureSheet(SHEETS.PromoCodes);
      if (pSheet.getLastRow() === 0) pSheet.appendRow(["Code","DiscountPercent","DiscountDollars","MaxUses","UsedCount","ExpiryDate","Active"]);
      pSheet.appendRow([data.code || "", data.discountPercent || 0, data.discountDollars || 0, data.maxUses || 999, data.usedCount || 0, data.expiryDate || "", data.active ? "TRUE" : "FALSE"]);
      response = { success: true, message: "Promo added" };
      auditLog("admin", "admin", `Promo added: ${data.code}`);
    }

    else if (action === "admin.approveBooking") {
      const bSheet = getSheet(SHEETS.Bookings);
      const found = findInSheet(bSheet, "BookingRef", data.bookingRef);
      if (found.row > 0) { updateSheetByHeader(bSheet, found.row, "Status", data.status || "CONFIRMED"); response = { success: true, message: "Booking updated" }; }
      else response = { success: false, message: "Booking not found" };
    }

    else if (action === "admin.updateBooking") {
      const bSheet = getSheet(SHEETS.Bookings);
      const found = findInSheet(bSheet, "BookingRef", data.bookingRef);
      if (found.row > 0) {
        if (data.departDate) updateSheetByHeader(bSheet, found.row, "DepartDate", data.departDate);
        if (data.cabin) updateSheetByHeader(bSheet, found.row, "PaxCabin", data.cabin);
        if (data.paxName) updateSheetByHeader(bSheet, found.row, "PaxName", data.paxName);
        if (data.status) updateSheetByHeader(bSheet, found.row, "Status", data.status);
        updateSheetByHeader(bSheet, found.row, "UpdatedAt", new Date().toISOString());
        response = { success: true, message: "Booking updated" };
        auditLog("updateBooking", data.email || "unknown", "Booking updated: " + data.bookingRef);
      } else response = { success: false, message: "Booking not found" };
    }

    else if (action === "admin.updateUser") {
      const uSheet = getSheet(SHEETS.Users);
      const found = findInSheet(uSheet, "Email", data.email);
      if (found.row > 0) {
        if (data.fullName) updateSheetByHeader(uSheet, found.row, "FullName", data.fullName);
        if (data.role) updateSheetByHeader(uSheet, found.row, "Role", data.role);
        if (data.status !== undefined) updateSheetByHeader(uSheet, found.row, "Status", data.status);
        if (data.miles !== undefined) updateSheetByHeader(uSheet, found.row, "Miles", data.miles);
        response = { success: true, message: "User updated" };
      } else response = { success: false, message: "User not found" };
    }

    else if (action === "admin.addSection") {
      const sSheet = ensureSheet(SHEETS.Sections);
      if (sSheet.getLastRow() === 0) sSheet.appendRow(["Title","Description","Image","Link","ButtonText"]);
      sSheet.appendRow([data.title || "", data.description || "", data.image || "", data.link || "", data.buttonText || ""]);
      response = { success: true, message: "Section added" };
    }

    else if (action === "admin.addEvent") {
      const eSheet = ensureSheet(SHEETS.Events);
      if (eSheet.getLastRow() === 0) eSheet.appendRow(["Date","Title","Description","Link","Image"]);
      eSheet.appendRow([data.date || "", data.title || "", data.description || "", data.link || "", data.image || ""]);
      response = { success: true, message: "Event added" };
    }

    else if (action === "admin.addDocument") {
      const dSheet = ensureSheet(SHEETS.Documents);
      if (dSheet.getLastRow() === 0) dSheet.appendRow(["ID","Title","Description","Type","FileID","Thumbnail","Category","OpenLimit","Opens","Available","RequiresRequest"]);
      dSheet.appendRow([String(Date.now()), data.title || "", data.description || "", data.type || "document", data.fileId || "", data.thumbnail || "", data.category || "General", data.openLimit || 0, 0, data.available !== false ? "TRUE" : "FALSE", data.requiresRequest ? "TRUE" : "FALSE"]);
      response = { success: true, message: "Document added" };
    }

    else if (action === "admin.addAncillary") {
      const aSheet = ensureSheet(SHEETS.Ancillaries);
      if (aSheet.getLastRow() === 0) aSheet.appendRow(["Type","Description","Price"]);
      aSheet.appendRow([data.type || "", data.description || "", data.price || 0]);
      response = { success: true, message: "Ancillary added" };
    }

    else if (action === "admin.addNotice") {
      const nSheet = ensureSheet(SHEETS.Notices);
      if (nSheet.getLastRow() === 0) nSheet.appendRow(["Title","Message","Severity","Timestamp"]);
      nSheet.appendRow([data.title || "", data.message || "", data.severity || "info", new Date()]);
      response = { success: true, message: "Notice added" };
    }

    else if (action === "admin.updateSystemStatus") {
      const sSheet = ensureSheet(SHEETS.SystemStatus);
      if (sSheet.getLastRow() === 0) sSheet.appendRow(["Key","Value"]);
      const keys = data.status || {};
      Object.keys(keys).forEach(k => {
        const found = findInSheet(sSheet, "Key", k);
        if (found.row > 0) updateSheetCell(sSheet, found.row, 2, keys[k]);
        else sSheet.appendRow([k, keys[k]]);
      });
      response = { success: true, message: "System status updated" };
    }

    // --- GENERIC ADMIN CRUD ---
    else if (action === "admin.login") {
      const email = normalizeText(data.email).toLowerCase();
      const password = normalizeText(data.password);
      const users = sheetToArray(getSheet(SHEETS.Users));
      for (let u of users) {
        if (normalizeText(u.Email).toLowerCase() === email && normalizeText(u.Password) === password) {
          if (!isAdmin(u)) throw new Error("Access denied. Admin privileges required.");
          const tierData = calculateLoyaltyTier(u.Miles || 0);
          response = { success: true, user: { id: u.UserID || u.Email, name: u.FullName, email: u.Email, role: u.Role || "Admin", miles: u.Miles || 0, status: getStatusValue(u.Status), loyaltyTier: tierData.display } };
          auditLog("admin.login", email, "Admin login");
          break;
        }
      }
      if (!response.success) throw new Error("Invalid credentials or insufficient privileges.");
    }

    else if (action === "admin.getTable") {
      const sheetName = normalizeText(data.sheet);
      if (!sheetName || !SHEETS[sheetName]) throw new Error("Invalid sheet name: " + sheetName);
      const rows = sheetToArray(getSheet(SHEETS[sheetName]));
      response = { success: true, rows, sheet: sheetName };
    }

    else if (action === "admin.getAllTables") {
      const allData = {};
      for (const [key, name] of Object.entries(SHEETS)) {
        if (key === "Sessions" || key === "SeatAssignments" || key === "AncillaryBookings" || key === "TrackingLog" || key === "AuditLog") continue;
        allData[key] = sheetToArray(getSheet(name)) || [];
      }
      response = { success: true, tables: allData };
    }

    else if (action === "admin.addRow") {
      const sheetName = normalizeText(data.sheet);
      if (!sheetName || !SHEETS[sheetName]) throw new Error("Invalid sheet name: " + sheetName);
      const sheet = ensureSheet(SHEETS[sheetName]);
      if (sheet.getLastRow() === 0) {
        const schema = { Users: ["UserID","FullName","Email","Password","Role","Miles","Status","JoinDate","Timestamp","UpdatedAt"], Bookings: ["BookingRef","Email","Status","Origin","Destination","DepartDate","FlightTimes","ServiceType","Passengers","TotalPrice","PaymentMethod","PaxName","PaxDOB","PaxGender","PaxPassport","PaxPhone","PaxCabin","Timestamp"], Sections: ["Title","Description","Image","Link","ButtonText"], Events: ["Date","Title","Description","Link","Image"], Documents: ["ID","Title","Description","Type","FileID","Thumbnail","Category","OpenLimit","Opens","Available","RequiresRequest"], PromoCodes: ["Code","DiscountPercent","DiscountDollars","MaxUses","UsedCount","ExpiryDate","Active"], Notices: ["Title","Message","Severity","Timestamp"], Config: ["Key","Value"], SystemStatus: ["Key","Value"], Ancillaries: ["Type","Description","Price"], Contact: ["Name","Email","Message","Timestamp"], Issues: ["IssueID","Email","Subject","Description","Severity","Status","Created","Updated"], DocRequests: ["Timestamp","UserEmail","UserName","DocID","DocTitle","Reason","Department","Status"], Notifications: ["NotificationID","UserID","Email","Type","Title","Message","Link","Read","CreatedAt"], Cases: ["CaseID","Title","Type","Status","FiledBy","FiledAgainst","Description","CreatedAt","UpdatedAt"], Participants: ["ParticipantID","CaseID","UserID","Email","Role","JoinedAt"], Evidence: ["EvidenceID","CaseID","UploadedBy","Type","Title","Link","Category","Timestamp","Notes"], Verdicts: ["VerdictID","CaseID","Outcome","SentenceSummary","Reasoning","EvidenceCited","RejectedEvidence","AudioLink","VideoLink","SubmittedBy","SubmittedAt","ProceduralReview"], Reviews: ["Timestamp","BookingRef","Email","Rating","Comment","Date"], Referrals: ["Timestamp","ReferrerEmail","RefereeEmail","Status","Date"] };
        if (schema[sheetName]) sheet.appendRow(schema[sheetName]);
        else sheet.appendRow(["Key","Value"]);
      }
      const rowData = data.row || {};
      if (sheetName === "Users" && !rowData.UserID) rowData.UserID = "USR-" + Date.now();
      if (sheetName === "Users" && !rowData.JoinDate) rowData.JoinDate = new Date();
      if (sheetName === "Documents" && !rowData.ID) rowData.ID = String(Date.now());
      if (rowData.Timestamp === undefined || rowData.Timestamp === null) rowData.Timestamp = new Date();
      const builtRow = buildRowByHeaders(sheet, rowData);
      sheet.appendRow(builtRow);
      auditLog("admin.addRow", "admin", "Row added to " + sheetName);
      response = { success: true, message: "Row added to " + sheetName };
    }

    else if (action === "admin.updateRow") {
      const sheetName = normalizeText(data.sheet);
      const rowNum = parseInt(data.rowNum, 10);
      if (!sheetName || !SHEETS[sheetName]) throw new Error("Invalid sheet name");
      if (!rowNum || rowNum < 2) throw new Error("Invalid row number");
      const sheet = getSheet(SHEETS[sheetName]);
      if (!sheet) throw new Error("Sheet not found");
      const updates = data.updates || {};
      for (const [field, value] of Object.entries(updates)) {
        updateSheetByHeader(sheet, rowNum, field, value);
      }
      auditLog("admin.updateRow", "admin", "Row " + rowNum + " updated in " + sheetName);
      response = { success: true, message: "Row updated" };
    }

    else if (action === "admin.deleteRow") {
      const sheetName = normalizeText(data.sheet);
      const rowNum = parseInt(data.rowNum, 10);
      if (!sheetName || !SHEETS[sheetName]) throw new Error("Invalid sheet name");
      if (!rowNum || rowNum < 2) throw new Error("Invalid row number");
      const sheet = getSheet(SHEETS[sheetName]);
      if (!sheet) throw new Error("Sheet not found");
      sheet.deleteRow(rowNum);
      auditLog("admin.deleteRow", "admin", "Row " + rowNum + " deleted from " + sheetName);
      response = { success: true, message: "Row deleted" };
    }

    else if (action === "admin.verifyAdmin") {
      const email = normalizeText(data.email).toLowerCase();
      if (!email) throw new Error("Email required");
      const user = getUserByEmail(email);
      if (!user) throw new Error("User not found");
      if (!isAdmin(user)) throw new Error("Not an admin");
      response = { success: true, user: { email: user.Email, name: user.FullName, role: user.Role } };
    }

    // --- DEVELOPER: register API key ---
    else if (action === "dev.registerKey") {
      const name = normalizeText(data.name);
      const email = normalizeText(data.email).toLowerCase();
      if (!name || !email) throw new Error("Name and email required");
      if (!email.includes("@")) throw new Error("Valid email required");
      const sheet = ensureSheet(SHEETS.ApiKeys);
      if (sheet.getLastRow() === 0) sheet.appendRow(["Key","Email","Name","CreatedAt","LastUsed","Status","RequestCount","LastReactivation","Notes"]);
      const existingKeys = sheetToArray(sheet).filter(r => normalizeText(r.Email).toLowerCase() === email && r.Status !== "removed");
      if (existingKeys.length >= 3) throw new Error("Maximum 3 active keys per email. Revoke an existing key first.");
      const apiKey = generateApiKey();
      sheet.appendRow([apiKey, email, name, new Date().toISOString(), new Date().toISOString(), "active", 0, "", ""]);
      auditLog("dev.registerKey", email, "New API key registered");
      response = { success: true, key: apiKey, message: "API key created successfully" };
    }

    // --- DEVELOPER: get key info ---
    else if (action === "dev.getKeyInfo") {
      const key = normalizeText(data.key);
      if (!key) throw new Error("API key required");
      const rec = getApiKeyRecord(key);
      if (!rec) throw new Error("Invalid API key");
      response = { success: true, key: rec.data.Key, email: rec.data.Email, name: rec.data.Name, createdAt: rec.data.CreatedAt, lastUsed: rec.data.LastUsed, status: rec.data.Status, requestCount: rec.data.RequestCount, lastReactivation: rec.data.LastReactivation };
    }

    // --- DEVELOPER: list API keys by email ---
    else if (action === "dev.listKeys") {
      const email = normalizeText(data.email).toLowerCase();
      if (!email) throw new Error("Email required");
      const recs = getApiKeysByEmail(email);
      response = { success: true, keys: recs.map(function(r) { return { key: r.data.Key, name: r.data.Name, createdAt: r.data.CreatedAt, lastUsed: r.data.LastUsed, status: r.data.Status, requestCount: r.data.RequestCount }; }) };
    }

    // --- DEVELOPER: regenerate API key ---
    else if (action === "dev.regenKey") {
      const oldKey = normalizeText(data.key);
      const email = normalizeText(data.email).toLowerCase();
      if (!oldKey || !email) throw new Error("Key and email required");
      const rec = getApiKeyRecord(oldKey);
      if (!rec) throw new Error("Invalid API key");
      if (normalizeText(rec.data.Email).toLowerCase() !== email) throw new Error("Email does not match key owner");
      const newKey = generateApiKey();
      const sheet = getSheet(SHEETS.ApiKeys);
      updateSheetCell(sheet, rec.row, 1, newKey);
      updateSheetCell(sheet, rec.row, 5, new Date().toISOString());
      updateSheetCell(sheet, rec.row, 6, "active");
      updateSheetCell(sheet, rec.row, 7, 0);
      auditLog("dev.regenKey", email, "API key regenerated");
      response = { success: true, key: newKey, message: "Key regenerated" };
    }

    // --- DEVELOPER: revoke API key ---
    else if (action === "dev.revokeKey") {
      const key = normalizeText(data.key);
      const email = normalizeText(data.email).toLowerCase();
      if (!key || !email) throw new Error("Key and email required");
      const rec = getApiKeyRecord(key);
      if (!rec) throw new Error("Invalid API key");
      if (normalizeText(rec.data.Email).toLowerCase() !== email) throw new Error("Email does not match key owner");
      const sheet = getSheet(SHEETS.ApiKeys);
      updateSheetCell(sheet, rec.row, 6, "removed");
      auditLog("dev.revokeKey", email, "API key revoked");
      response = { success: true, message: "Key revoked" };
    }

    // --- DEVELOPER: reactivate API key ---
    else if (action === "dev.reactivateKey") {
      const key = normalizeText(data.key);
      const email = normalizeText(data.email).toLowerCase();
      if (!key || !email) throw new Error("Key and email required");
      const rec = getApiKeyRecord(key);
      if (!rec) throw new Error("Invalid API key");
      if (rec.data.Status === "removed") throw new Error("Key has been permanently removed and cannot be reactivated");
      if (normalizeText(rec.data.Email).toLowerCase() !== email) throw new Error("Email does not match key owner");
      const sheet = getSheet(SHEETS.ApiKeys);
      updateSheetCell(sheet, rec.row, 6, "active");
      updateSheetCell(sheet, rec.row, 5, new Date().toISOString());
      updateSheetCell(sheet, rec.row, 8, new Date().toISOString());
      auditLog("dev.reactivateKey", email, "API key reactivated");
      response = { success: true, message: "Key reactivated" };
    }

    return respond(response);

  } catch (error) {
    return respond({ success: false, message: error.toString() });
  }
}
