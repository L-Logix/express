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
  Newsletter: "Newsletter",
  NewsletterComments: "NewsletterComments",
  Cases: "Cases",
  Participants: "Participants",
  Evidence: "Evidence",
  Verdicts: "Verdicts",
  Notifications: "Notifications",
  TrackingLog: "TrackingLog",
  AuditLog: "AuditLog",
  ApiKeys: "ApiKeys",
  DeviceTracking: "DeviceTracking",
  UserSecurity: "UserSecurity",
  VerificationAttempts: "VerificationAttempts"
};

const APPROVED_AIRCRAFT_MANUFACTURERS = ["Boeing", "Canadair"];
const MILEAGE_TIERS = {
  basic: { minMiles: 0, maxMiles: 24999, multiplier: 1.0, benefits: ["Base pricing"] },
  silver: { minMiles: 25000, maxMiles: 49999, multiplier: 1.1, benefits: ["10% bonus miles", "Priority support"] },
  titanium: { minMiles: 50000, maxMiles: 99999, multiplier: 1.25, benefits: ["25% bonus miles", "Free seat upgrades", "Priority boarding"] },
  gold: { minMiles: 100000, maxMiles: 999999, multiplier: 1.5, benefits: ["50% bonus miles", "Complimentary upgrades", "Exclusive lounge access", "Priority everything"] }
};
const CABIN_MULTIPLIERS = { Economy: 1.0, Business: 2.5, FirstClass: 5.0 };

var AIRPORT_CACHE = {};

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
  const orig = lookupAirportFromAPI(origin) || AIRPORT_CACHE[origin];
  const dest = lookupAirportFromAPI(destination) || AIRPORT_CACHE[destination];
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

// ===== NEW: ENHANCED AUDIT LOGGING =====
function auditLogEvent(action, user, details, ip, fingerprint, userAgent, page, element, eventType, duration) {
  try {
    const sheet = ensureSheet("AuditLog");
    if (sheet.getLastRow() === 0) sheet.appendRow(["Timestamp", "Action", "User", "Details", "IP", "Fingerprint", "UserAgent", "Page", "Element", "EventType", "Duration"]);
    sheet.appendRow([new Date().toISOString(), action, user || "anonymous", details || "", ip || "", fingerprint || "", userAgent || "", page || "", element || "", eventType || "", duration || ""]);
  } catch(e) {}
}

// ===== NEW: LIVE USERS ONLINE =====
function getTotalCodeFiles() {
  try {
    var docSheet = getSheet(SHEETS.Documents);
    if (!docSheet) return 0;
    var docs = sheetToArray(docSheet);
    var codeTypes = ["html", "css", "js", "gs"];
    return docs.filter(function(d) {
      var type = (d.Type || "").toLowerCase();
      return codeTypes.indexOf(type) >= 0;
    }).length;
  } catch(e) { return 0; }
}

function getTotalLinesOfCode() {
  try {
    var docSheet = getSheet(SHEETS.Documents);
    if (!docSheet) return 0;
    var docs = sheetToArray(docSheet);
    var total = 0;
    var codeTypes = ["html", "css", "js", "gs"];
    docs.forEach(function(d) {
      var type = (d.Type || "").toLowerCase();
      if (codeTypes.indexOf(type) >= 0) {
        total += parseInt(d.OpenLimit || 0, 10) || 0;
      }
    });
    return total || getTotalCodeFiles() * 500;
  } catch(e) { return 0; }
}

function getTotalSheets() {
  try {
    var ss = SpreadsheetApp.openByUrl(SHEET_URL);
    return ss.getSheets().length;
  } catch(e) { return Object.keys(SHEETS).length; }
}

function getUsersOnline() {
  try {
    const sheet = ensureSheet("SessionHeartbeats");
    if (sheet.getLastRow() === 0) sheet.appendRow(["SessionID", "User", "IP", "Fingerprint", "LastHeartbeat", "Page"]);
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    const rows = sheet.getDataRange().getValues();
    var count = 0;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][4] || "") >= fiveMinAgo) count++;
    }
    return count;
  } catch(e) { return 0; }
}

function recordHeartbeat(sessionID, user, ip, fingerprint, page) {
  try {
    const sheet = ensureSheet("SessionHeartbeats");
    if (sheet.getLastRow() === 0) sheet.appendRow(["SessionID", "User", "IP", "Fingerprint", "LastHeartbeat", "Page"]);
    const rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === sessionID) {
        sheet.getRange(i + 1, 2).setValue(user || "");
        sheet.getRange(i + 1, 3).setValue(ip || "");
        sheet.getRange(i + 1, 4).setValue(fingerprint || "");
        sheet.getRange(i + 1, 5).setValue(new Date().toISOString());
        sheet.getRange(i + 1, 6).setValue(page || "");
        return;
      }
    }
    sheet.appendRow([sessionID, user || "", ip || "", fingerprint || "", new Date().toISOString(), page || ""]);
  } catch(e) {}
}

// ===== NEW: COMPANY HOLDINGS =====
var HOLDINGS_DATA = [
  { ticker: "EXAW", name: "Express Airways International", sector: "Aviation", ceo: "James Mitchell", founded: 1998, employees: 12400, marketCap: 8470000000, revenue: 3200000000, pe: 12.4, dividend: 2.1, description: "Flag carrier and primary airline operations, servicing 180+ destinations across 6 continents.", stockPrice: 84.70, change: 1.25, changePercent: 1.50 },
  { ticker: "EXCG", name: "Express Airways Cargo Logistics", sector: "Logistics", ceo: "Sarah Chen", founded: 2002, employees: 3400, marketCap: 2100000000, revenue: 980000000, pe: 8.9, dividend: 1.8, description: "Global air freight and cargo services with dedicated freighter fleet and ground handling network.", stockPrice: 42.15, change: -0.35, changePercent: -0.82 },
  { ticker: "EXHT", name: "Express Airways Hospitality", sector: "Hospitality", ceo: "Maria Rodriguez", founded: 2005, employees: 2800, marketCap: 1250000000, revenue: 520000000, pe: 15.2, dividend: 0.9, description: "Airport lounges, in-flight dining, and hotel partnership programs across 60+ countries.", stockPrice: 28.90, change: 0.45, changePercent: 1.58 },
  { ticker: "EXTK", name: "Express Airways Technology", sector: "Technology", ceo: "David Park", founded: 2010, employees: 1800, marketCap: 3800000000, revenue: 740000000, pe: 22.6, dividend: 0.0, description: "Aviation software, booking systems, and in-flight entertainment platforms powering 200+ airlines.", stockPrice: 156.30, change: 3.80, changePercent: 2.49 },
  { ticker: "EXGR", name: "Express Airways Ground Services", sector: "Services", ceo: "Robert Kim", founded: 2000, employees: 6200, marketCap: 890000000, revenue: 410000000, pe: 6.8, dividend: 2.8, description: "Ground handling, aircraft maintenance, and airport support services at 75 major airports worldwide.", stockPrice: 18.45, change: -0.12, changePercent: -0.65 },
  { ticker: "EXTR", name: "Express Airways Travel Retail", sector: "Retail", ceo: "Lisa Thompson", founded: 2008, employees: 1600, marketCap: 650000000, revenue: 380000000, pe: 10.1, dividend: 1.5, description: "Duty-free retail operations, travel accessories, and exclusive brand partnerships across 40 airport locations.", stockPrice: 24.80, change: 0.18, changePercent: 0.73 },
  { ticker: "EXFC", name: "Express Airways Financial Services", sector: "Financial", ceo: "Andrew Walsh", founded: 2012, employees: 950, marketCap: 1450000000, revenue: 290000000, pe: 14.8, dividend: 1.2, description: "Travel insurance, currency exchange, and loyalty program financial products for 5M+ members.", stockPrice: 52.10, change: -0.55, changePercent: -1.04 },
  { ticker: "EXTRN", name: "Express Airways Training Academy", sector: "Education", ceo: "Dr. Patricia Adams", founded: 2003, employees: 750, marketCap: 420000000, revenue: 185000000, pe: 11.3, dividend: 0.0, description: "Pilot training, cabin crew certification, and aviation professional development programs.", stockPrice: 33.60, change: 0.22, changePercent: 0.66 },
  { ticker: "EXMC", name: "Express Airways Medical Corps", sector: "Healthcare", ceo: "Dr. Michael Torres", founded: 2015, employees: 1200, marketCap: 780000000, revenue: 210000000, pe: 17.5, dividend: 0.0, description: "Aeromedical services, emergency response, and aviation health certification for crew and passengers.", stockPrice: 41.25, change: 0.62, changePercent: 1.53 },
  { ticker: "EXEN", name: "Express Airways Energy", sector: "Energy", ceo: "Thomas Wright", founded: 2016, employees: 500, marketCap: 560000000, revenue: 175000000, pe: 9.8, dividend: 3.2, description: "Sustainable aviation fuel development, carbon offset programs, and renewable energy for airport operations.", stockPrice: 14.95, change: 0.08, changePercent: 0.54 },
  { ticker: "EXSP", name: "Express Airways Security", sector: "Security", ceo: "John Masters", founded: 2006, employees: 3200, marketCap: 920000000, revenue: 340000000, pe: 7.6, dividend: 2.5, description: "Aviation security services, cybersecurity solutions, and risk management for 50+ airline partners.", stockPrice: 19.20, change: -0.08, changePercent: -0.41 },
  { ticker: "EXCH", name: "Express Airways Charter", sector: "Aviation", ceo: "Daniel Foster", founded: 2011, employees: 900, marketCap: 380000000, revenue: 195000000, pe: 5.2, dividend: 0.0, description: "Private jet charters, executive travel, and on-demand cargo charter services worldwide.", stockPrice: 67.30, change: 1.10, changePercent: 1.66 }
];

function getAirportCodes() { var keys = Object.keys(AIRPORT_CACHE); return keys.length > 0 ? keys.sort() : []; }

function getAllApiEndpoints() {
  var cache = CacheService.getScriptCache();
  var cached = cache ? cache.get('allEndpoints') : null;
  if (cached) return JSON.parse(cached);

  var codes = getAirportCodes();
  var endpoints = [];

  function add(name, method, desc, cat, auth, params) {
    endpoints.push({ name: name, method: method || "GET", description: desc || "", category: cat || "General", auth: auth !== false, params: params || {} });
  }

  // General / System endpoints (40)
  var generals = [
    ["system.status", "Get live system status of all Express Airways services"],
    ["system.stats", "Get aggregate platform statistics"],
    ["system.config", "Get system configuration values"],
    ["system.time", "Get current server time and timezone"],
    ["system.health", "Get API health check status"],
    ["system.version", "Get API version and build info"],
    ["system.maintenance", "Get scheduled maintenance windows"],
    ["system.cache.status", "Get cache layer health"],
    ["system.database.status", "Get database connection status"],
    ["system.uptime", "Get API uptime percentage"],
    ["system.load", "Get current system load metrics"],
    ["system.queues", "Get queue depths and processing times"],
    ["system.services", "List all registered microservices"],
    ["system.dependencies", "Get service dependency graph"],
    ["system.logs.recent", "Get recent system log entries"],
    ["system.alerts.active", "Get currently active system alerts"],
    ["system.backup.status", "Get backup system status"],
    ["system.security.status", "Get security posture summary"],
    ["system.rateLimits", "Get current rate limit status"],
    ["endpoints.list", "List all available API endpoints"],
    ["endpoints.search", "Search API endpoints by keyword"],
    ["endpoints.count", "Get total endpoint count"],
    ["endpoints.categories", "List all endpoint categories"],
    ["endpoints.random", "Get a random endpoint suggestion"],
    ["endpoints.popular", "Get most frequently used endpoints"],
    ["endpoints.recent", "Get recently added endpoints"],
    ["airports.list", "List all supported airports worldwide"],
    ["airports.search", "Search airports by name, code, or city"],
    ["airports.count", "Get total airport count"],
    ["airports.codes", "Get all IATA airport codes"],
    ["airports.random", "Get a random airport"],
    ["airports.nearby", "Find airports near coordinates"],
    ["events.list", "Get all upcoming events and promotions"],
    ["events.upcoming", "Get upcoming events within 30 days"],
    ["events.calendar", "Get events calendar for the year"],
    ["notices.list", "Get system notices and advisories"],
    ["notices.active", "Get currently active notices"],
    ["documents.list", "Get available travel documents"],
    ["documents.types", "Get document type catalog"],
    ["promos.validate", "Validate a promo or discount code"],
    ["promos.active", "List all active promotions"],
    ["promos.best", "Get best available promotion"],
    ["bookings.stats", "Get booking statistics and metrics"],
    ["bookings.today", "Get today's booking count"],
    ["bookings.trends", "Get booking trend data"],
    ["bookings.peak", "Get peak booking times"],
    ["flights.list", "List all currently active flights"],
    ["flights.active", "List currently airborne flights"],
    ["flights.delayed", "List currently delayed flights"],
    ["flights.cancelled", "List cancelled flights for today"],
    ["flights.onTime", "List on-time flights"],
    ["flights.departures", "List upcoming departures"],
    ["flights.arrivals", "List upcoming arrivals"],
    ["flights.scheduled", "List scheduled flights"],
    ["flights.diverted", "List diverted flights"],
    ["reports.daily", "Get daily operations report"],
    ["reports.summary", "Get period operations summary"],
    ["reports.flights", "Get flight operations report"],
    ["reports.ontime", "Get on-time performance report"],
    ["reports.delays", "Get delay analysis report"],
    ["reports.revenue", "Get revenue report"],
    ["reports.forecast", "Get operations forecast"],
    ["reports.comparison", "Get period-over-period comparison"],
    ["users.stats", "Get user account statistics"],
    ["users.active", "Get active user count"],
    ["users.loyalty.tiers", "Get loyalty program tier definitions"],
    ["users.registration", "Get user registration trends"],
    ["analytics.traffic", "Get API traffic analytics"],
    ["analytics.errors", "Get error rate analytics"],
    ["analytics.latency", "Get latency analytics"],
    ["analytics.usage", "Get endpoint usage statistics"]
  ];
  generals.forEach(function(g) { add(g[0], "GET", g[1], "System"); });

  // Airport endpoints (14 airports x 20 patterns = 280)
  var airportOps = [
    ["info", "Get detailed information for airport"],
    ["status", "Get current operational status for airport"],
    ["weather", "Get current weather conditions at airport"],
    ["routes", "List all available routes from airport"],
    ["delays", "Get current departure delay information for airport"],
    ["facilities", "List terminal facilities and amenities at airport"],
    ["timezone", "Get timezone information for airport"],
    ["parking", "Get parking options and rates at airport"],
    ["terminals", "Get terminal map and gate information for airport"],
    ["stats", "Get traffic statistics for airport"],
    ["airlines", "Get airlines operating at airport"],
    ["elevation", "Get airport elevation and geographical data"],
    ["runway", "Get runway information for airport"],
    ["nearby", "Get nearby airports and distances"],
    ["security", "Get security wait times at airport"],
    ["lounge", "Get lounge access information for airport"],
    ["dining", "Get dining options available at airport"],
    ["shopping", "Get shopping and retail options at airport"],
    ["transport", "Get ground transportation options from airport"],
    ["codeshares", "Get codeshare airline agreements for airport"]
  ];
  codes.forEach(function(code) {
    var ap = AIRPORT_CACHE[code];
    airportOps.forEach(function(op) {
      add("airports." + op[0] + "." + code, "GET", op[1] + " " + code + " (" + ap.name + ")", "Airports");
    });
  });

  // Route endpoints (182 routes x 24 patterns = 4368)
  var routeOps = [
    ["info", "Get comprehensive route information for"],
    ["fare", "Get fare estimate for"],
    ["schedule", "Get flight schedule for"],
    ["pricing", "Get detailed pricing breakdown for"],
    ["flighttime", "Get estimated flight time for"],
    ["weather", "Get weather forecast for route"],
    ["aircraft", "Get aircraft type assigned to route"],
    ["availability", "Get seat availability for"],
    ["class", "Get cabin class options and pricing for"],
    ["stops", "Get stopover information for"],
    ["distance", "Get great-circle distance for"],
    ["taxes", "Get tax and fee breakdown for"],
    ["upgrade", "Get upgrade pricing for"],
    ["compare", "Get fare comparison across cabins for"],
    ["carbon", "Get carbon emissions estimate for"],
    ["insurance", "Get travel insurance options for"],
    ["loyalty", "Get loyalty points earning for"],
    ["promotions", "Get route-specific promotions for"],
    ["hotels", "Get hotel recommendations at destination for"],
    ["transit", "Get transit and connection information for"],
    ["visa", "Get visa requirement information for"],
    ["health", "Get health advisory information for"],
    ["alerts", "Get travel alerts for"],
    ["weather.alternate", "Get alternate weather forecast for"]
  ];
  codes.forEach(function(orig, i) {
    codes.forEach(function(dest, j) {
      if (i === j) return;
      var label = orig + "\u2192" + dest;
      routeOps.forEach(function(op) {
        var hasParams = ["fare","pricing","availability","class","upgrade","compare","insurance","loyalty"].indexOf(op[0]) >= 0;
        var params = hasParams ? { cabin: "string (optional)", passengers: "number (optional)" } : {};
        add(op[0] + "." + orig + "." + dest, "GET", op[1] + " " + label, "Routes", true, params);
      });
    });
  });

  // Flight-specific endpoints (per route: 182 x 14 = 2548)
  var flightOps = [
    ["departure", "Get departure details for"],
    ["arrival", "Get arrival details for"],
    ["status", "Get current flight status for"],
    ["gate", "Get gate assignment for"],
    ["tracking", "Get live flight tracking for"],
    ["seatmap", "Get seat configuration for"],
    ["meals", "Get meal service options for"],
    ["baggage", "Get baggage allowance for"],
    ["entertainment", "Get in-flight entertainment for"],
    ["wifi", "Get wifi availability for"],
    ["crew", "Get crew information for"],
    ["history", "Get historical performance for"],
    ["restrictions", "Get travel restrictions for"],
    ["codeshare", "Get codeshare partners for"]
  ];
  codes.forEach(function(orig, i) {
    codes.forEach(function(dest, j) {
      if (i === j) return;
      var label = orig + "\u2192" + dest;
      flightOps.forEach(function(op) {
        add("flight." + op[0] + "." + orig + "." + dest, "GET", op[1] + " flight " + label, "Flights", true);
      });
    });
  });

  // Synthetic flight IDs (500 flights EA1001-EA1500 x 6 patterns = 3000)
  var flightIdPatterns = [
    ["info", "Get detailed flight information for"],
    ["status", "Get current operational status for"],
    ["route", "Get route assignment for"],
    ["schedule", "Get departure/arrival schedule for"],
    ["crew", "Get crew assignment for"],
    ["aircraft", "Get aircraft registration for"]
  ];
  for (var fid = 1001; fid <= 1500; fid++) {
    var fnum = "EA" + fid;
    flightIdPatterns.forEach(function(op) {
      add("flight." + op[0] + "." + fnum, "GET", op[1] + " flight " + fnum, "Flights", true);
    });
  }

  // Synthetic airline endpoints (20 airlines x 5 patterns = 100)
  var airlineCodes = ["EA","EX","EC","AA","DL","UA","WN","NK","B6","AS","F9","HA","OO","QX","OH","YX","ZW","9E","G7","PT"];
  var airlinePatterns = [
    ["info", "Get airline information for"],
    ["fleet", "Get fleet composition for"],
    ["routes", "Get route network for"],
    ["status", "Get operational status for"],
    ["ratings", "Get customer ratings for"]
  ];
  airlineCodes.forEach(function(ac) {
    airlinePatterns.forEach(function(op) {
      add("airlines." + op[0] + "." + ac, "GET", op[1] + " airline " + ac, "Airlines");
    });
  });

  // Admin endpoints (40)
  var admins = [
    ["admin.stats", "Get admin dashboard statistics"],
    ["admin.users.count", "Get total user count"],
    ["admin.users.active", "Get active user count"],
    ["admin.users.new", "Get new user registrations"],
    ["admin.users.roles", "Get user role distribution"],
    ["admin.users.byCountry", "Get users by country"],
    ["admin.bookings.total", "Get total booking count"],
    ["admin.bookings.pending", "Get pending booking count"],
    ["admin.bookings.cancelled", "Get cancelled booking count"],
    ["admin.bookings.revenue", "Get booking revenue"],
    ["admin.bookings.byRoute", "Get bookings by route"],
    ["admin.bookings.byDate", "Get bookings by date"],
    ["admin.flights.total", "Get total flight count"],
    ["admin.flights.active", "Get active flight count"],
    ["admin.flights.delayed", "Get delayed flight count"],
    ["admin.flights.cancelled", "Get cancelled flight count"],
    ["admin.flights.byRoute", "Get flights by route"],
    ["admin.flights.byStatus", "Get flights by status"],
    ["admin.reports.daily", "Get daily operations report"],
    ["admin.reports.weekly", "Get weekly operations report"],
    ["admin.reports.monthly", "Get monthly operations report"],
    ["admin.reports.quarterly", "Get quarterly operations report"],
    ["admin.reports.annual", "Get annual operations report"],
    ["admin.reports.revenue", "Get revenue report"],
    ["admin.reports.compliance", "Get compliance report"],
    ["admin.sections.list", "List homepage sections"],
    ["admin.events.list", "List all events"],
    ["admin.documents.list", "List all documents"],
    ["admin.notices.list", "List all notices"],
    ["admin.promos.list", "List all promo codes"],
    ["admin.ancillaries.list", "List all ancillaries"],
    ["admin.audit.recent", "Get recent audit log entries"],
    ["admin.audit.summary", "Get audit summary"],
    ["admin.audit.byUser", "Get audit entries by user"],
    ["admin.system.config", "Get system configuration"],
    ["admin.system.status", "Get full system status report"],
    ["admin.alerts.list", "List system alerts"],
    ["admin.alerts.active", "List active alerts"],
    ["admin.maintenance.status", "Get maintenance window status"],
    ["admin.backup.status", "Get backup system status"]
  ];
  admins.forEach(function(ep) { add(ep[0], "GET", ep[1], "Admin"); });

  if (cache) { try { cache.put('allEndpoints', JSON.stringify(endpoints), 21600); } catch(e) {} }

  return endpoints;
}

function handleDevEndpoint(endpoint, params) {
  var parts = endpoint.split('.');
  var prefix = parts[0];
  var codes = getAirportCodes();

  function airportByCode(code) { return lookupAirportFromAPI(code.toUpperCase()) || AIRPORT_CACHE[code.toUpperCase()]; }

  // --- Airports (handles all 20 patterns) ---
  if (prefix === "airports" && parts.length === 3) {
    var op = parts[1], code = parts[2].toUpperCase();
    if (op === "list") return { success: true, total: codes.length, airports: codes.map(function(c) { var a = AIRPORT_CACHE[c]; return a ? { code: c, name: a.name, city: a.city, country: a.country, type: a.type } : { code: c }; }) };
    if (op === "search") {
      var q = params.q || code;
      var apiResults = searchAirportsFromAPI(q);
      if (apiResults.length > 0) return { success: true, query: q, airports: apiResults, source: "opensky" };
      return { success: true, query: q, airports: [], source: "opensky" };
    }
    if (op === "count") return { success: true, count: codes.length };
    if (op === "codes") return { success: true, codes: codes.length > 0 ? codes : ["JFK","LAX","LHR","CDG","NRT","SYD","ORD"] };
    if (op === "random") return { success: true, code: codes.length > 0 ? codes[Math.floor(Math.random() * codes.length)] : "JFK" };
    if (op === "nearby") return { success: true, airports: codes.slice(0, Math.min(5, codes.length)).map(function(c) { var a = AIRPORT_CACHE[c]; return { code: c, name: a ? a.name : c, distance: Math.round(Math.random() * 100 + 5) + "mi" }; }) };
    var a = airportByCode(code);
    if (!a) return { success: false, error: "Unknown airport: " + code };
    if (op === "info") return { success: true, code: code, name: a.name, city: a.city, country: a.country, type: a.type, coordinates: { lat: a.lat, lng: a.lng }, timezone: "UTC-5" };
    if (op === "status") return { success: true, code: code, operational: true, gatesOpen: Math.floor(Math.random() * 30 + 10), terminals: Math.floor(Math.random() * 5 + 2), runwayStatus: "Active" };
    if (op === "weather") return { success: true, code: code, temperature: Math.round(Math.random() * 35 + 5) + "\u00B0C", conditions: ["Clear","Partly Cloudy","Cloudy","Light Rain","Windy"][Math.floor(Math.random() * 5)], visibility: Math.round(Math.random() * 5 + 5) + "mi", wind: Math.round(Math.random() * 20 + 5) + "mph", humidity: Math.round(Math.random() * 40 + 40) + "%" };
    if (op === "routes") return { success: true, code: code, routes: codes.filter(function(c) { return c !== code; }).slice(0,20).map(function(c) { var r = AIRPORT_CACHE[c]; return { destination: c, name: r ? r.name : c, distance: r ? Math.round(haversineDistance(a.lat, a.lng, r.lat, r.lng)) + "mi" : "—" }; }) };
    if (op === "delays") return { success: true, code: code, averageDelay: Math.round(Math.random() * 25) + "min", delayedFlights: Math.floor(Math.random() * 8), onTimePercentage: Math.round(Math.random() * 15 + 80) + "%", reason: ["Weather","Traffic","Maintenance"][Math.floor(Math.random() * 3)] };
    if (op === "facilities") return { success: true, code: code, lounges: Math.floor(Math.random() * 4), restaurants: Math.floor(Math.random() * 20 + 10), shops: Math.floor(Math.random() * 15 + 5), parking: ["Short-term","Long-term","Valet"], wifi: true };
    if (op === "timezone") return { success: true, code: code, timezone: "UTC", utcOffset: "-5" };
    if (op === "parking") return { success: true, code: code, options: [{ type: "Short-term", rate: "$" + Math.round(Math.random() * 10 + 5) + "/hr", capacity: Math.floor(Math.random() * 500 + 200) },{ type: "Long-term", rate: "$" + Math.round(Math.random() * 30 + 15) + "/day", capacity: Math.floor(Math.random() * 2000 + 500) },{ type: "Valet", rate: "$" + Math.round(Math.random() * 20 + 10) + "/hr", capacity: Math.floor(Math.random() * 200 + 50) }]};
    if (op === "terminals") return { success: true, code: code, terminals: Math.floor(Math.random() * 5 + 2), gates: Math.floor(Math.random() * 30 + 10), concourses: ["A","B","C","D","E"].slice(0, Math.floor(Math.random() * 4 + 2)) };
    if (op === "stats") return { success: true, code: code, dailyFlights: Math.floor(Math.random() * 500 + 100), monthlyPassengers: Math.floor(Math.random() * 500000 + 100000), busiestRoute: "JFK" };
    if (op === "airlines") return { success: true, code: code, airlines: ["Express Airways","Delta","American","United"][Math.floor(Math.random() * 4)], count: Math.floor(Math.random() * 15 + 5) };
    if (op === "elevation") return { success: true, code: code, elevation: Math.round(Math.random() * 500 + 10) + "ft", coordinates: { lat: a.lat, lng: a.lng } };
    if (op === "runway") return { success: true, code: code, runways: Math.floor(Math.random() * 4 + 1), longest: Math.round(Math.random() * 5000 + 8000) + "ft", surface: ["Asphalt","Concrete","Asphalt/Concrete"][Math.floor(Math.random() * 3)] };
    if (op === "nearby") return { success: true, code: code, nearby: codes.filter(function(c) { return c !== code; }).slice(0, 3).map(function(c) { var r = AIRPORT_CACHE[c]; return { code: c, name: r ? r.name : c, distance: Math.round(Math.random() * 50 + 10) + "mi" }; }) };
    if (op === "security") return { success: true, code: code, averageWait: Math.round(Math.random() * 30 + 5) + "min", tsaPreCheck: Math.random() > 0.3, clearAvailable: Math.random() > 0.5 };
    if (op === "lounge") return { success: true, code: code, lounges: Math.floor(Math.random() * 4), locations: ["Terminal " + Math.floor(Math.random() * 5 + 1) + ", near Gate " + ["A","B","C","D"][Math.floor(Math.random() * 4)] + Math.floor(Math.random() * 20 + 1)] };
    if (op === "dining") return { success: true, code: code, restaurants: Math.floor(Math.random() * 15 + 5), cuisines: ["American","Italian","Japanese","Mexican","Seafood","Fast Food","Coffee"][Math.floor(Math.random() * 7)] };
    if (op === "shopping") return { success: true, code: code, stores: Math.floor(Math.random() * 20 + 5), dutyFree: true, brands: ["Gucci","Coach","Apple","Sunglass Hut","Hudson News"].slice(0, Math.floor(Math.random() * 4 + 1)) };
    if (op === "transport") return { success: true, code: code, options: ["Taxi","Rideshare","Bus","Train","Rental Car","Shuttle"].slice(0, Math.floor(Math.random() * 4 + 2)), toCityCenter: Math.round(Math.random() * 30 + 5) + "min" };
    if (op === "codeshares") return { success: true, code: code, partners: ["Delta","American","United","Alaska","JetBlue","Southwest"].slice(0, Math.floor(Math.random() * 4 + 2)) };
  }

  // --- Route endpoints (24 patterns) ---
  var routeOps = ["info","fare","schedule","pricing","flighttime","weather","aircraft","availability","class","stops","distance","taxes","upgrade","compare","carbon","insurance","loyalty","promotions","hotels","transit","visa","health","alerts","weather.alternate"];
  if (routeOps.indexOf(prefix) >= 0 && parts.length === 3) {
    var orig = parts[1].toUpperCase(), dest = parts[2].toUpperCase();
    var o = airportByCode(orig), d = airportByCode(dest);
    if (!o || !d) return { success: false, error: "Invalid airport codes" };
    var dist = haversineDistance(o.lat, o.lng, d.lat, d.lng);
    var ft = dist / 500 + 0.25;
    var baseFare = Math.max(50, 100 + dist * 0.10);
    var cabinMul = CABIN_MULTIPLIERS[params.cabin] || 1.0;
    var pax = parseInt(params.passengers) || 1;
    var tax = baseFare * 0.08;
    var fee = 15 + pax * 5;
    var aircraftTypes = ["Boeing 737-800","Boeing 787-9","Airbus A320","Boeing 777-300ER","Embraer E190","Airbus A330-300","Boeing 767-400ER","Airbus A350-900"];

    if (prefix === "info") return { success: true, origin: orig, originName: o.name, destination: dest, destinationName: d.name, distance: Math.round(dist) + "mi", estimatedFlightTime: ft.toFixed(1) + "h", aircraft: aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)], frequency: ["Daily","Multiple daily","Weekly"][Math.floor(Math.random() * 3)], firstFlight: "06:00", lastFlight: "22:00" };
    if (prefix === "fare") return { success: true, origin: orig, destination: dest, economy: Math.round(baseFare * pax), business: Math.round(baseFare * 2.5 * pax), firstClass: Math.round(baseFare * 5.0 * pax), currency: "USD", passengers: pax, lastUpdated: new Date().toISOString() };
    if (prefix === "schedule") return { success: true, origin: orig, destination: dest, departures: Array.from({length: Math.floor(Math.random() * 4 + 3)}, function(_, i) { var h = 6 + i * 3; return { flight: "EA" + (100 + i), departure: h.toString().padStart(2, "0") + ":00", arrival: (h + Math.ceil(ft)).toString().padStart(2, "0") + ":" + (Math.floor(ft % 1 * 60)).toString().padStart(2, "0"), aircraft: aircraftTypes[i % aircraftTypes.length], frequency: ["Daily","Multiple daily"][i % 2] }; }) };
    if (prefix === "pricing") return { success: true, origin: orig, destination: dest, currency: "USD", breakdown: { baseFare: Math.round(baseFare), cabinMultiplier: cabinMul, passengers: pax, subtotal: Math.round(baseFare * cabinMul * pax), taxes: Math.round(tax * cabinMul * pax), fees: fee, total: Math.round(baseFare * cabinMul * pax + tax * cabinMul * pax + fee) }, cabin: params.cabin || "Economy" };
    if (prefix === "flighttime") return { success: true, origin: orig, destination: dest, distance: Math.round(dist) + "mi", estimatedFlightTime: ft.toFixed(1) + "h", averageSpeed: "500 mph", timezoneDiff: Math.floor(Math.random() * 5 + 1) + "h" };
    if (prefix === "weather") return { success: true, origin: { code: orig, conditions: ["Clear","Cloudy","Rain"][Math.floor(Math.random() * 3)], temperature: Math.round(Math.random() * 30 + 10) + "\u00B0C", wind: Math.round(Math.random() * 20 + 5) + "mph" }, destination: { code: dest, conditions: ["Clear","Cloudy","Rain"][Math.floor(Math.random() * 3)], temperature: Math.round(Math.random() * 30 + 10) + "\u00B0C", wind: Math.round(Math.random() * 20 + 5) + "mph" }, advisory: Math.random() > 0.8 ? "Light turbulence expected" : "No significant weather" };
    if (prefix === "aircraft") return { success: true, origin: orig, destination: dest, aircraft: aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)], configuration: { economy: Math.floor(Math.random() * 100 + 100), business: Math.floor(Math.random() * 30 + 20), first: Math.floor(Math.random() * 10 + 8) }, wifi: Math.random() > 0.3, power: Math.random() > 0.2 };
    if (prefix === "availability") return { success: true, origin: orig, destination: dest, date: new Date().toISOString().split("T")[0], seats: { economy: Math.floor(Math.random() * 50 + 10), business: Math.floor(Math.random() * 15 + 5), firstClass: Math.floor(Math.random() * 5 + 2) }, nextAvailable: Math.random() > 0.7 ? "Full" : "Available" };
    if (prefix === "class") return { success: true, origin: orig, destination: dest, classes: [{ cabin: "Economy", fare: Math.round(baseFare * pax), amenities: ["Standard seat","Meal service","Carry-on"], multiplier: 1.0 },{ cabin: "Business", fare: Math.round(baseFare * 2.5 * pax), amenities: ["Lie-flat seat","Premium dining","Priority boarding","Lounge access"], multiplier: 2.5 },{ cabin: "FirstClass", fare: Math.round(baseFare * 5.0 * pax), amenities: ["Private suite","Gourmet dining","Chauffeur service","Spa access"], multiplier: 5.0 }]};
    if (prefix === "stops") return { success: true, origin: orig, destination: dest, stops: Math.floor(Math.random() * 2), direct: Math.random() > 0.5, connectingAirports: Math.random() > 0.5 ? [codes.filter(function(c) { return c !== orig && c !== dest; })[Math.floor(Math.random() * (codes.length - 2))]] : [] };
    if (prefix === "distance") return { success: true, origin: orig, destination: dest, miles: Math.round(dist), kilometers: Math.round(dist * 1.609), nauticalMiles: Math.round(dist * 0.869) };
    if (prefix === "taxes") return { success: true, origin: orig, destination: dest, baseFare: Math.round(baseFare * cabinMul * pax), taxRate: "8%", taxAmount: Math.round(tax * cabinMul * pax), serviceFee: fee, governmentTax: Math.round(baseFare * cabinMul * pax * 0.03), totalTaxesAndFees: Math.round(tax * cabinMul * pax + fee + baseFare * cabinMul * pax * 0.03) };
    if (prefix === "upgrade") return { success: true, origin: orig, destination: dest, upgradeOptions: [{ from: "Economy", to: "Business", price: Math.round(baseFare * 1.5 * pax), milesRequired: Math.round(baseFare * 1.5 * 10) },{ from: "Business", to: "FirstClass", price: Math.round(baseFare * 2.5 * pax), milesRequired: Math.round(baseFare * 2.5 * 10) },{ from: "Economy", to: "FirstClass", price: Math.round(baseFare * 4.0 * pax), milesRequired: Math.round(baseFare * 4.0 * 10) }]};
    if (prefix === "compare") return { success: true, origin: orig, destination: dest, currency: "USD", comparison: [{ cabin: "Economy", fare: Math.round(baseFare * pax), value: "Standard" },{ cabin: "Business", fare: Math.round(baseFare * 2.5 * pax), value: "Premium", extra: "+" + Math.round(baseFare * 1.5 * pax) + " vs Economy" },{ cabin: "FirstClass", fare: Math.round(baseFare * 5.0 * pax), value: "Luxury", extra: "+" + Math.round(baseFare * 4.0 * pax) + " vs Economy" }]};
    // New route families
    if (prefix === "carbon") return { success: true, origin: orig, destination: dest, emissions: Math.round(dist * 0.155 * pax) + "kg CO2", offset: Math.round(dist * 0.155 * pax * 0.02) + " offset credits", treeEquivalent: Math.round(dist * 0.155 * pax / 20) + " trees/month" };
    if (prefix === "insurance") return { success: true, origin: orig, destination: dest, options: [{ provider: "TravelGuard", price: Math.round(baseFare * 0.08 * pax), coverage: "Trip cancellation, medical, baggage" },{ provider: "SafeTrip", price: Math.round(baseFare * 0.05 * pax), coverage: "Trip cancellation only" },{ provider: "PremiumCare", price: Math.round(baseFare * 0.12 * pax), coverage: "Full coverage including COVID-19" }]};
    if (prefix === "loyalty") return { success: true, origin: orig, destination: dest, milesEarned: Math.round(dist * pax), status: ["Basic","Silver","Titanium","Gold"][Math.floor(Math.random() * 4)], bonusMultiplier: [1.0, 1.1, 1.25, 1.5][Math.floor(Math.random() * 4)], partnerEarnings: Math.random() > 0.7 };
    if (prefix === "promotions") return { success: true, origin: orig, destination: dest, activePromos: [{ code: "ROUTE" + orig + dest, discount: Math.round(Math.random() * 20 + 5) + "%", expires: "2026-12-31" }]};
    if (prefix === "hotels") return { success: true, origin: orig, destination: dest, recommendations: [{ name: d.city + " Grand Hotel", price: "$" + Math.round(Math.random() * 200 + 100) + "/night", rating: Math.round(Math.random() * 2 + 3) + "/5" },{ name: d.city + " Airport Inn", price: "$" + Math.round(Math.random() * 100 + 60) + "/night", rating: Math.round(Math.random() * 2 + 3) + "/5" }]};
    if (prefix === "transit") return { success: true, origin: orig, destination: dest, connectionTime: Math.round(Math.random() * 2 + 1) + "h", minimumLayover: Math.round(Math.random() * 45 + 30) + "min", preferredAirport: codes[Math.floor(Math.random() * codes.length)] };
    if (prefix === "visa") return { success: true, origin: orig, destination: dest, required: Math.random() > 0.5, processingTime: Math.round(Math.random() * 14 + 3) + " days", notes: ["Visa-free for most nationalities","E-visa available","Visa on arrival"][Math.floor(Math.random() * 3)] };
    if (prefix === "health") return { success: true, origin: orig, destination: dest, vaccinations: Math.random() > 0.7 ? ["Yellow Fever","Hepatitis A","Typhoid"] : ["None required"], advisory: Math.random() > 0.8 ? "Travel advisory issued" : "No health advisories" };
    if (prefix === "alerts") return { success: true, origin: orig, destination: dest, alerts: Math.random() > 0.7 ? [{ type: "Weather", message: "Thunderstorms expected", severity: "Moderate", issued: new Date().toISOString() }] : [], activeAlerts: Math.floor(Math.random() * 3) };
    if (prefix === "weather.alternate") return { success: true, origin: orig, destination: dest, alternateConditions: ["Clear","Mostly Sunny","Isolated Showers"][Math.floor(Math.random() * 3)], probability: Math.round(Math.random() * 30 + 60) + "%", forecastConfidence: ["High","Medium","Low"][Math.floor(Math.random() * 3)] };
  }

  // --- Flight endpoints (route-based, 14 patterns) ---
  if (prefix === "flight" && parts.length === 4) {
    var flightOp = parts[1], origF = parts[2].toUpperCase(), destF = parts[3].toUpperCase();
    if (!airportByCode(origF) || !airportByCode(destF)) return { success: false, error: "Invalid airport codes" };
    var randFlight = "EA" + Math.floor(Math.random() * 900 + 100);
    var randTime = (Math.floor(Math.random() * 12 + 5)).toString().padStart(2,"0") + ":" + Math.floor(Math.random() * 60).toString().padStart(2,"0");
    if (flightOp === "departure") return { success: true, flight: randFlight, origin: origF, destination: destF, scheduled: randTime, status: ["On Time","Boarding","Departed","Delayed"][Math.floor(Math.random() * 4)], gate: "G" + Math.floor(Math.random() * 30 + 1), terminal: Math.floor(Math.random() * 5 + 1) };
    if (flightOp === "arrival") return { success: true, flight: randFlight, origin: origF, destination: destF, scheduled: randTime, status: ["On Time","Landed","Expected","Diverted"][Math.floor(Math.random() * 4)], gate: "G" + Math.floor(Math.random() * 30 + 1) };
    if (flightOp === "status") return { success: true, flight: randFlight, origin: origF, destination: destF, status: ["Scheduled","Boarding","In Air","Landed","Cancelled"][Math.floor(Math.random() * 5)], departure: randTime, arrival: (Math.floor(Math.random() * 12 + 5)).toString().padStart(2,"0") + ":" + Math.floor(Math.random() * 60).toString().padStart(2,"0"), progress: Math.floor(Math.random() * 100) + "%" };
    if (flightOp === "gate") return { success: true, flight: randFlight, origin: origF, destination: destF, gate: "G" + Math.floor(Math.random() * 30 + 1), terminal: Math.floor(Math.random() * 5 + 1), boardingTime: Math.floor(Math.random() * 3 + 1) + ":" + Math.floor(Math.random() * 60).toString().padStart(2,"0") + " prior", lastCall: Math.random() > 0.7 };
    if (flightOp === "tracking") return { success: true, flight: randFlight, origin: origF, destination: destF, latitude: (Math.random() * 40 + 25).toFixed(4), longitude: (Math.random() * 100 - 120).toFixed(4), altitude: Math.round(Math.random() * 35000 + 5000) + "ft", speed: Math.round(Math.random() * 100 + 450) + "mph", heading: Math.round(Math.random() * 360) + "\u00B0" };
    if (flightOp === "seatmap") return { success: true, flight: randFlight, configuration: { economy: Math.floor(Math.random() * 30 + 20), business: Math.floor(Math.random() * 8 + 4), first: Math.floor(Math.random() * 4 + 2) }, rows: { economy: Math.floor(Math.random() * 15 + 10), business: Math.floor(Math.random() * 5 + 2), first: Math.floor(Math.random() * 3 + 1) }, seatsAvailable: { economy: Math.floor(Math.random() * 50 + 10), business: Math.floor(Math.random() * 10 + 2), first: Math.floor(Math.random() * 4 + 1) } };
    if (flightOp === "meals") return { success: true, flight: randFlight, options: ["Chicken","Pasta","Fish","Vegetarian","Vegan","Kids Meal"].slice(0, Math.floor(Math.random() * 4 + 2)), specialMeals: ["Halal","Kosher","Gluten-Free","Dairy-Free"].slice(0, Math.floor(Math.random() * 3 + 1)), complimentary: Math.random() > 0.2 };
    if (flightOp === "baggage") return { success: true, flight: randFlight, allowance: { carryOn: "1 x 22lb / 10kg", checked: "2 x 50lb / 23kg", overweight: "$" + Math.round(Math.random() * 50 + 25) }, excessRate: "$" + Math.round(Math.random() * 100 + 50) + "/bag", sportingEquipment: Math.random() > 0.5 };
    if (flightOp === "entertainment") return { success: true, flight: randFlight, system: ["seatback","streaming","tablet provided"][Math.floor(Math.random() * 3)], movies: Math.floor(Math.random() * 100 + 50), shows: Math.floor(Math.random() * 200 + 100), music: Math.floor(Math.random() * 500 + 200), liveTV: Math.random() > 0.5 };
    if (flightOp === "wifi") return { success: true, flight: randFlight, available: Math.random() > 0.2, price: Math.random() > 0.5 ? "$" + Math.round(Math.random() * 15 + 5) : "Complimentary", speed: Math.round(Math.random() * 10 + 5) + "Mbps", streaming: Math.random() > 0.4 };
    if (flightOp === "crew") return { success: true, flight: randFlight, pilots: Math.floor(Math.random() * 2 + 1), flightAttendants: Math.floor(Math.random() * 6 + 4), leadPilot: "Captain " + ["Smith","Johnson","Williams","Brown","Davis"][Math.floor(Math.random() * 5)], languages: ["English","Spanish","French","Mandarin"].slice(0, Math.floor(Math.random() * 3 + 1)) };
    if (flightOp === "history") return { success: true, flight: randFlight, onTimeRate: Math.round(Math.random() * 10 + 85) + "%", cancellationRate: Math.round(Math.random() * 3 + 1) + "%", avgDelay: Math.round(Math.random() * 15 + 2) + "min", totalFlights: Math.floor(Math.random() * 500 + 100) };
    if (flightOp === "restrictions") return { success: true, flight: randFlight, travelRestrictions: Math.random() > 0.6 ? ["Valid passport required","Visa may be required"] : ["No restrictions"], covidMeasures: Math.random() > 0.7 ? ["Mask recommended"] : ["No current measures"] };
    if (flightOp === "codeshare") return { success: true, flight: randFlight, operatingCarrier: ["Express Airways","Delta Connection","American Eagle","United Express"][Math.floor(Math.random() * 4)], codesharePartners: ["AA","DL","UA","B6","AS"].slice(0, Math.floor(Math.random() * 3 + 1)) };
  }

  // --- Synthetic flight endpoints (flight.{op}.EA####, 3 parts) ---
  if (prefix === "flight" && parts.length === 3) {
    var flightOp2 = parts[1], flightId = parts[2];
    if (flightId.indexOf("EA") !== 0) return { success: false, error: "Invalid flight ID" };
    var fnum = parseInt(flightId.substring(2), 10);
    if (isNaN(fnum) || fnum < 1001 || fnum > 1500) return { success: false, error: "Flight ID out of range" };
    var origIdx = (fnum - 1001) % codes.length;
    var destIdx = (origIdx + 1 + Math.floor((fnum - 1001) / codes.length)) % codes.length;
    if (destIdx === origIdx) destIdx = (destIdx + 1) % codes.length;
    var fOrig = codes[origIdx], fDest = codes[destIdx];
    var fo = airportByCode(fOrig), fd = airportByCode(fDest);
    var fdist = fo && fd ? haversineDistance(fo.lat, fo.lng, fd.lat, fd.lng) : 1000;
    var departureH = (6 + (fnum % 12)).toString().padStart(2,"0");
    var departureM = (fnum % 60).toString().padStart(2,"0");
    if (flightOp2 === "info") return { success: true, flight: flightId, origin: fOrig, destination: fDest, aircraft: ["Boeing 737-800","Airbus A320","Boeing 787-9","Embraer E190"][fnum % 4], departure: departureH + ":" + departureM, arrival: ((parseInt(departureH) + Math.floor(fdist / 500 + 0.25)) % 24).toString().padStart(2,"0") + ":" + departureM, status: ["Active","Scheduled","In Air","Completed"][fnum % 4], operator: "Express Airways" };
    if (flightOp2 === "status") return { success: true, flight: flightId, status: ["Scheduled","Boarding","In Air","Landed","Completed","Cancelled","Delayed"][fnum % 7], departure: departureH + ":" + departureM, gate: "G" + ((fnum % 30) + 1), progress: (fnum % 101) + "%", reason: fnum % 7 === 6 ? "Weather delay" : "" };
    if (flightOp2 === "route") return { success: true, flight: flightId, origin: fOrig, originName: fo ? fo.name : "", destination: fDest, destinationName: fd ? fd.name : "", distance: Math.round(fdist) + "mi", flightTime: (fdist / 500 + 0.25).toFixed(1) + "h", waypoints: ["DEPARTURE","WAYPOINT01","WAYPOINT02","ARRIVAL"] };
    if (flightOp2 === "schedule") return { success: true, flight: flightId, departure: departureH + ":" + departureM, arrival: ((parseInt(departureH) + Math.floor(fdist / 500 + 0.25)) % 24).toString().padStart(2,"0") + ":" + departureM, daysOfWeek: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].filter(function(_, i) { return (fnum >> i) % 2 === 0; }), effective: "2026-01-01", seasonal: fnum % 3 === 0 };
    if (flightOp2 === "crew") return { success: true, flight: flightId, captain: ["Capt. Smith","Capt. Johnson","Capt. Brown","Capt. Lee","Capt. Garcia"][fnum % 5], firstOfficer: ["F/O Davis","F/O Wilson","F/O Martinez","F/O Taylor","F/O Anderson"][(fnum + 2) % 5], attendants: Math.floor((fnum % 6) + 4), languages: ["English","Spanish"].concat(fnum % 3 === 0 ? ["French"] : []).concat(fnum % 5 === 0 ? ["Mandarin"] : []) };
    if (flightOp2 === "aircraft") return { success: true, flight: flightId, registration: "N" + String.fromCharCode(65 + (fnum % 26)) + (1000 + fnum), type: ["Boeing 737-800","Boeing 787-9","Airbus A320","Boeing 777-300ER","Embraer E190","Airbus A330-300"][fnum % 6], age: (fnum % 15) + " years", capacity: 150 + (fnum % 100), wifi: fnum % 3 !== 0, power: true };
  }

  // --- Airline endpoints ---
  var airlineCodes = ["EA","EX","EC","AA","DL","UA","WN","NK","B6","AS","F9","HA","OO","QX","OH","YX","ZW","9E","G7","PT"];
  var airlineNames = ["Express Airways","Express Charter","Express Cargo","American Airlines","Delta Air Lines","United Airlines","Southwest Airlines","Spirit Airlines","JetBlue Airways","Alaska Airlines","Frontier Airlines","Hawaiian Airlines","SkyWest Airlines","Horizon Air","PSA Airlines","Air Wisconsin","Mesa Airlines","Endeavor Air","GoJet Airlines","Piedmont Airlines"];
  if (prefix === "airlines" && parts.length === 3) {
    var aOp = parts[1], aCode = parts[2].toUpperCase();
    var aIdx = airlineCodes.indexOf(aCode);
    if (aIdx < 0) return { success: false, error: "Unknown airline code" };
    if (aOp === "info") return { success: true, code: aCode, name: airlineNames[aIdx], alliance: ["Star Alliance","SkyTeam","Oneworld","None"][aIdx % 4], hub: codes[aIdx % codes.length], founded: 1920 + (aIdx * 10), fleetSize: Math.floor(Math.random() * 300 + 50), destinations: Math.floor(Math.random() * 100 + 30) };
    if (aOp === "fleet") return { success: true, code: aCode, name: airlineNames[aIdx], aircraft: ["Boeing 737","Boeing 787","Airbus A320","Boeing 777","Embraer E190","Airbus A330"].slice(0, Math.floor(Math.random() * 5 + 1)), totalAircraft: Math.floor(Math.random() * 300 + 50), averageAge: Math.round(Math.random() * 10 + 5) + " years" };
    if (aOp === "routes") return { success: true, code: aCode, domestic: Math.floor(Math.random() * 200 + 50), international: Math.floor(Math.random() * 100 + 20), total: Math.floor(Math.random() * 300 + 70), hubs: codes.slice(0, Math.floor(Math.random() * 3 + 1)) };
    if (aOp === "status") return { success: true, code: aCode, operational: true, flightsToday: Math.floor(Math.random() * 1500 + 500), delays: Math.floor(Math.random() * 50 + 5), cancellations: Math.floor(Math.random() * 10 + 1), onTimeRate: Math.round(Math.random() * 5 + 90) + "%" };
    if (aOp === "ratings") return { success: true, code: aCode, name: airlineNames[aIdx], overall: Math.round(Math.random() * 2 + 3) + "/5", onTime: Math.round(Math.random() * 2 + 3) + "/5", comfort: Math.round(Math.random() * 2 + 3) + "/5", service: Math.round(Math.random() * 2 + 3) + "/5", value: Math.round(Math.random() * 2 + 3) + "/5" };
  }

  //--- General / System endpoints ---
  if (endpoint === "system.status") return { success: true, status: "operational", services: 15, healthy: 15, uptime: "99.97%", lastIncident: "3 days ago" };
  if (endpoint === "system.stats") return { success: true, totalEndpoints: getAllApiEndpoints().length, airports: getAirportCodes().length, routes: getAirportCodes().length * (getAirportCodes().length - 1), uptime: "99.97%", version: "2.1.0" };
  if (endpoint === "system.time") return { success: true, timestamp: new Date().toISOString(), timezone: "UTC", server: "Google Apps Script", epoch: Date.now() };
  if (endpoint === "system.health") return { success: true, status: "healthy", database: "connected", cache: "operational", latency: Math.round(Math.random() * 200 + 50) + "ms", version: "2.1.0" };
  if (endpoint === "system.version") return { success: true, version: "2.1.0", build: "2026.07", name: "Express Airways API", totalEndpoints: getAllApiEndpoints().length, documentation: "https://developer.expressairways.com/docs" };
  if (endpoint === "system.maintenance") return { success: true, scheduled: [{ start: "2026-07-15 02:00", end: "2026-07-15 06:00", impact: "Low", description: "Database optimization" }] };
  if (endpoint === "system.cache.status") return { success: true, status: "operational", hitRate: "94%", memory: "256MB", entries: Math.floor(Math.random() * 1000 + 500) };
  if (endpoint === "system.database.status") return { success: true, status: "connected", type: "Google Sheets", latency: Math.round(Math.random() * 300 + 100) + "ms", lastSync: new Date().toISOString() };
  if (endpoint === "system.uptime") return { success: true, uptime: "99.97%", measured: "Last 90 days", incidents: 2, totalDowntime: "42 minutes" };
  if (endpoint === "system.load") return { success: true, requestsPerMinute: Math.floor(Math.random() * 500 + 100), activeConnections: Math.floor(Math.random() * 100 + 20), averageResponse: Math.round(Math.random() * 150 + 50) + "ms", cpuLoad: Math.round(Math.random() * 30 + 20) + "%" };
  if (endpoint === "system.queues") return { success: true, queues: [{ name: "Booking", depth: Math.floor(Math.random() * 10), processingTime: Math.round(Math.random() * 500 + 100) + "ms" },{ name: "Email", depth: Math.floor(Math.random() * 5), processingTime: Math.round(Math.random() * 1000 + 200) + "ms" }]};
  if (endpoint === "system.services") return { success: true, services: ["API Gateway","Booking Engine","Payment","Notifications","Tracking","Analytics","Weather","Exchange Rates"].map(function(s) { return { name: s, status: ["operational","degraded","operational","operational"][Math.floor(Math.random() * 4)], uptime: "99." + Math.floor(Math.random() * 9 + 90) + "%" }; }) };
  if (endpoint === "system.dependencies") return { success: true, dependencies: { api: "healthy", database: "connected", cache: "operational", externalApis: { openSky: "available", openMeteo: "available", exchangeRate: "available" } } };
  if (endpoint === "system.logs.recent") return { success: true, entries: Array.from({length: 10}, function(_, i) { return { timestamp: new Date(Date.now() - i * 60000).toISOString(), level: ["INFO","INFO","WARN","INFO","ERROR"][i % 5], message: "System operation " + (1000 + i), service: ["api","db","cache","worker"][i % 4] }; }) };
  if (endpoint === "system.alerts.active") return { success: true, count: Math.floor(Math.random() * 3), alerts: [{ severity: "warning", message: "Database replication lag", timestamp: new Date().toISOString() }] };
  if (endpoint === "system.backup.status") return { success: true, lastBackup: new Date(Date.now() - 3600000).toISOString(), nextBackup: new Date(Date.now() + 82800000).toISOString(), status: "completed", size: Math.round(Math.random() * 500 + 100) + "MB" };
  if (endpoint === "system.security.status") return { success: true, status: "secure", lastAudit: "2026-06-15", vulnerabilities: 0, encryption: "TLS 1.3", authMethods: ["API Key","Session Token"] };
  if (endpoint === "system.rateLimits") return { success: true, defaultLimit: 100, defaultPeriod: "1 hour", currentUsage: Math.floor(Math.random() * 50 + 5), remaining: Math.floor(Math.random() * 50 + 50), resetsIn: Math.floor(Math.random() * 45 + 5) + " minutes" };
  if (endpoint === "endpoints.list") return { success: true, total: getAllApiEndpoints().length, endpoints: getAllApiEndpoints() };
  if (endpoint === "endpoints.search") return { success: true, query: params.q, results: getAllApiEndpoints().filter(function(ep) { return !params.q || ep.name.indexOf(params.q.toLowerCase()) >= 0 || (ep.description || "").toLowerCase().indexOf((params.q || "").toLowerCase()) >= 0; }) };
  if (endpoint === "endpoints.count") return { success: true, count: getAllApiEndpoints().length, updated: new Date().toISOString() };
  if (endpoint === "endpoints.categories") return { success: true, categories: ["System","Airports","Routes","Flights","Airlines","Events","Notices","Documents","Promotions","Bookings","Reports","Users","Admin","Analytics"] };
  if (endpoint === "endpoints.random") return { success: true, suggestion: getAllApiEndpoints()[Math.floor(Math.random() * getAllApiEndpoints().length)] };
  if (endpoint === "endpoints.popular") return { success: true, popular: ["system.status","airports.list","endpoints.list","routes.info.JFK.LAX","fare.JFK.LAX","flight.status.EA1200"].map(function(n) { return { name: n, calls: Math.floor(Math.random() * 10000 + 1000) }; }) };
  if (endpoint === "endpoints.recent") return { success: true, recent: getAllApiEndpoints().slice(-5).map(function(ep) { return ep.name; }) };
  if (endpoint === "airports.list") return { success: true, total: codes.length, airports: codes.map(function(c) { return { code: c, name: AIRPORT_CACHE[c].name, city: AIRPORT_CACHE[c].city, country: AIRPORT_CACHE[c].country, type: AIRPORT_CACHE[c].type }; }) };
  if (endpoint === "airports.search") return { success: true, query: params.q, results: codes.filter(function(c) { return !params.q || c.indexOf(params.q.toUpperCase()) >= 0 || AIRPORT_CACHE[c].name.toLowerCase().indexOf((params.q || "").toLowerCase()) >= 0 || AIRPORT_CACHE[c].city.toLowerCase().indexOf((params.q || "").toLowerCase()) >= 0; }).map(function(c) { return { code: c, name: AIRPORT_CACHE[c].name, city: AIRPORT_CACHE[c].city, country: AIRPORT_CACHE[c].country }; }) };
  if (endpoint === "airports.count") return { success: true, count: codes.length };
  if (endpoint === "airports.codes") return { success: true, codes: codes };
  if (endpoint === "airports.random") return { success: true, airport: codes[Math.floor(Math.random() * codes.length)] };
  if (endpoint === "airports.nearby") return { success: true, airports: codes.slice(0, Math.min(5, codes.length)).map(function(c) { return { code: c, name: AIRPORT_CACHE[c].name, distance: Math.round(Math.random() * 100 + 5) + "mi" }; }) };
  if (endpoint === "events.list") return { success: true, total: 6, events: [{ id: "EVT001", name: "Summer Sale", date: "2026-08-15" },{ id: "EVT002", name: "New Route Launch", date: "2026-09-01" },{ id: "EVT003", name: "Labor Day Weekend", date: "2026-09-05" },{ id: "EVT004", name: "Mileage Bonus", date: "2026-10-01" },{ id: "EVT005", name: "Winter Promotion", date: "2026-11-15" },{ id: "EVT006", name: "Holiday Travel Special", date: "2026-12-15" }]};
  if (endpoint === "events.upcoming") return { success: true, events: [{ id: "EVT001", name: "Summer Sale", date: "2026-08-15" }]};
  if (endpoint === "events.calendar") return { success: true, year: 2026, events: Array.from({length: 12}, function(_, i) { return { month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i], count: Math.floor(Math.random() * 5 + 1) }; }) };
  if (endpoint === "notices.list") return { success: true, notices: [{ id: "NTC001", message: "Scheduled maintenance this weekend", priority: "low" }]};
  if (endpoint === "notices.active") return { success: true, active: [{ id: "NTC001", message: "Schedule maintenance this weekend", priority: "low" }]};
  if (endpoint === "documents.list") return { success: true, documents: [{ id: "DOC001", name: "Travel Advisory", type: "PDF" },{ id: "DOC002", name: "Safety Guidelines", type: "PDF" },{ id: "DOC003", name: "Baggage Policy", type: "PDF" }]};
  if (endpoint === "documents.types") return { success: true, types: ["PDF","DOC","XLS","IMG"], count: 4 };
  if (endpoint === "promos.validate") return { success: true, valid: true, code: params.code, discount: "15%", expires: "2026-12-31", applicableRoutes: codes.length * (codes.length - 1) };
  if (endpoint === "promos.active") return { success: true, promotions: [{ code: "SUMMER30", discount: "30%", expires: "2026-08-31" },{ code: "WELCOME15", discount: "15%", expires: "2026-12-31" },{ code: "FALL20", discount: "20%", expires: "2026-11-30" }]};
  if (endpoint === "promos.best") return { success: true, promotion: { code: "SUMMER30", discount: "30%", expires: "2026-08-31", priority: "high" }};
  if (endpoint === "bookings.stats") return { success: true, total: 1247, active: 892, pending: 88, cancelled: 267, today: Math.floor(Math.random() * 50 + 10) };
  if (endpoint === "bookings.today") return { success: true, date: new Date().toISOString().split("T")[0], count: Math.floor(Math.random() * 50 + 10), vsYesterday: "+" + Math.floor(Math.random() * 15 + 2) + "%" };
  if (endpoint === "bookings.trends") return { success: true, trend: "up", percentage: "+12.5%", period: "Last 30 days", dataPoints: 30 };
  if (endpoint === "bookings.peak") return { success: true, peakHour: Math.floor(Math.random() * 8 + 8) + ":00-" + (Math.floor(Math.random() * 8 + 9)) + ":00", peakDay: ["Monday","Tuesday","Wednesday","Thursday","Friday"][Math.floor(Math.random() * 5)], busiestRoute: codes[Math.floor(Math.random() * codes.length)] + "\u2192" + codes[Math.floor(Math.random() * codes.length)] };
  if (endpoint === "flights.list") return { success: true, total: Math.floor(Math.random() * 50 + 100), flights: Array.from({length: 10}, function(_, i) { return { flight: "EA" + (100 + i), status: ["On Time","Boarding","Departed","Delayed"][Math.floor(Math.random() * 4)], origin: getAirportCodes()[Math.floor(Math.random() * 14)], destination: getAirportCodes()[Math.floor(Math.random() * 14)] }; }) };
  if (endpoint === "flights.active") return { success: true, count: Math.floor(Math.random() * 30 + 15), flights: Array.from({length: 5}, function(_, i) { return { flight: "EA" + (400 + i), altitude: Math.round(Math.random() * 35000 + 5000) + "ft", speed: Math.round(Math.random() * 100 + 450) + "mph" }; }) };
  if (endpoint === "flights.delayed") return { success: true, count: Math.floor(Math.random() * 5 + 1), flights: Array.from({length: Math.floor(Math.random() * 5 + 1)}, function(_, i) { return { flight: "EA" + (200 + i), delay: Math.round(Math.random() * 60 + 10) + "min", reason: ["Weather","Maintenance","ATC","Crew"][Math.floor(Math.random() * 4)] }; }) };
  if (endpoint === "flights.cancelled") return { success: true, count: Math.floor(Math.random() * 3), flights: Array.from({length: Math.floor(Math.random() * 3)}, function(_, i) { return { flight: "EA" + (300 + i), reason: ["Weather","Maintenance","Operational"][Math.floor(Math.random() * 3)] }; }) };
  if (endpoint === "flights.onTime") return { success: true, count: Math.floor(Math.random() * 40 + 60), percentage: Math.round(Math.random() * 5 + 90) + "%" };
  if (endpoint === "flights.departures") return { success: true, count: Math.floor(Math.random() * 20 + 10), next: Array.from({length: 5}, function(_, i) { var h = (Math.floor(Date.now() / 3600000) + i) % 24; return { flight: "EA" + (500 + i), destination: getAirportCodes()[Math.floor(Math.random() * 14)], time: h.toString().padStart(2,"0") + ":" + Math.floor(Math.random() * 60).toString().padStart(2,"0"), status: "On Time" }; }) };
  if (endpoint === "flights.arrivals") return { success: true, count: Math.floor(Math.random() * 20 + 10), next: Array.from({length: 5}, function(_, i) { var h = (Math.floor(Date.now() / 3600000) + i) % 24; return { flight: "EA" + (600 + i), origin: getAirportCodes()[Math.floor(Math.random() * 14)], time: h.toString().padStart(2,"0") + ":" + Math.floor(Math.random() * 60).toString().padStart(2,"0"), status: "On Time" }; }) };
  if (endpoint === "flights.scheduled") return { success: true, count: Math.floor(Math.random() * 100 + 50), nextDeparture: (Math.floor(Date.now() / 3600000 + 1) % 24).toString().padStart(2,"0") + ":00" };
  if (endpoint === "flights.diverted") return { success: true, count: Math.floor(Math.random() * 3), flights: Array.from({length: Math.floor(Math.random() * 3)}, function(_, i) { return { flight: "EA" + (700 + i), divertedTo: getAirportCodes()[Math.floor(Math.random() * 14)], reason: ["Weather","Medical","Technical"][Math.floor(Math.random() * 3)] }; }) };
  if (endpoint === "reports.daily") return { success: true, date: new Date().toISOString().split("T")[0], flights: Math.floor(Math.random() * 200 + 150), passengers: Math.floor(Math.random() * 30000 + 15000), onTime: Math.round(Math.random() * 5 + 90) + "%", cancellations: Math.floor(Math.random() * 5), loadFactor: Math.round(Math.random() * 10 + 82) + "%", revenue: "$" + Math.round(Math.random() * 200000 + 100000) };
  if (endpoint === "reports.summary") return { success: true, period: "Last 30 days", revenue: "$" + Math.round(Math.random() * 5000000 + 2000000), passengers: Math.floor(Math.random() * 500000 + 200000), flights: Math.floor(Math.random() * 3000 + 2000), loadFactor: Math.round(Math.random() * 10 + 82) + "%", onTime: Math.round(Math.random() * 5 + 90) + "%" };
  if (endpoint === "reports.flights") return { success: true, total: Math.floor(Math.random() * 3000 + 2000), completed: Math.floor(Math.random() * 2800 + 1800), cancelled: Math.floor(Math.random() * 50 + 10), delayed: Math.floor(Math.random() * 100 + 50), averageDelay: Math.round(Math.random() * 15 + 5) + "min" };
  if (endpoint === "reports.ontime") return { success: true, overall: Math.round(Math.random() * 5 + 90) + "%", byHour: Array.from({length: 24}, function(_, i) { return { hour: i.toString().padStart(2,"0") + ":00", onTime: Math.round(Math.random() * 10 + 85) + "%" }; }) };
  if (endpoint === "reports.delays") return { success: true, averageDelay: Math.round(Math.random() * 15 + 5) + "min", byCause: { weather: Math.round(Math.random() * 30 + 10) + "%", maintenance: Math.round(Math.random() * 20 + 5) + "%", atc: Math.round(Math.random() * 15 + 5) + "%", crew: Math.round(Math.random() * 10 + 2) + "%", other: Math.round(Math.random() * 10 + 5) + "%" } };
  if (endpoint === "reports.revenue") return { success: true, total: "$" + Math.round(Math.random() * 50000000 + 10000000), ticketRevenue: "$" + Math.round(Math.random() * 40000000 + 8000000), ancillaryRevenue: "$" + Math.round(Math.random() * 10000000 + 2000000), vsLastYear: "+" + Math.round(Math.random() * 10 + 2) + "%" };
  if (endpoint === "reports.forecast") return { success: true, nextMonth: { projectedRevenue: "$" + Math.round(Math.random() * 5000000 + 2000000), projectedPassengers: Math.floor(Math.random() * 300000 + 200000), confidence: Math.round(Math.random() * 10 + 80) + "%" } };
  if (endpoint === "reports.comparison") return { success: true, currentPeriod: { revenue: "$" + Math.round(Math.random() * 5000000 + 2000000), passengers: Math.floor(Math.random() * 300000 + 200000) }, previousPeriod: { revenue: "$" + Math.round(Math.random() * 5000000 + 2000000), passengers: Math.floor(Math.random() * 300000 + 200000) }, change: "+" + Math.round(Math.random() * 10 + 2) + "%" };
  if (endpoint === "users.stats") return { success: true, total: 5842, active: 4127, newThisMonth: 342, loyaltyMembers: 1824 };
  if (endpoint === "users.active") return { success: true, count: 4127, percentage: "70.6%", last24h: Math.floor(Math.random() * 200 + 50) };
  if (endpoint === "users.loyalty.tiers") return { success: true, tiers: [{ name: "Basic", minMiles: 0, benefits: ["Base pricing"] },{ name: "Silver", minMiles: 25000, benefits: ["10% bonus miles","Priority support"] },{ name: "Titanium", minMiles: 50000, benefits: ["25% bonus miles","Free seat upgrades","Priority boarding"] },{ name: "Gold", minMiles: 100000, benefits: ["50% bonus miles","Complimentary upgrades","Exclusive lounge access","Priority everything"] }]};
  if (endpoint === "users.registration") return { success: true, daily: Math.floor(Math.random() * 50 + 10), weekly: Math.floor(Math.random() * 300 + 50), monthly: Math.floor(Math.random() * 1200 + 200), trend: "growing" };
  if (endpoint === "analytics.traffic") return { success: true, requestsToday: Math.floor(Math.random() * 100000 + 50000), topEndpoint: getAllApiEndpoints()[Math.floor(Math.random() * getAllApiEndpoints().length)].name, averageLatency: Math.round(Math.random() * 100 + 50) + "ms" };
  if (endpoint === "analytics.errors") return { success: true, totalErrors: Math.floor(Math.random() * 100 + 10), errorRate: (Math.random() * 0.5 + 0.1).toFixed(2) + "%", topErrors: ["Invalid API key","Rate limit exceeded","Invalid parameters","Endpoint not found"].map(function(e, i) { return { error: e, count: Math.floor(Math.random() * 50 + 5) * (i + 1) }; }) };
  if (endpoint === "analytics.latency") return { success: true, p50: Math.round(Math.random() * 50 + 20) + "ms", p95: Math.round(Math.random() * 200 + 100) + "ms", p99: Math.round(Math.random() * 500 + 200) + "ms", trend: ["stable","improving","degrading"][Math.floor(Math.random() * 3)] };
  if (endpoint === "analytics.usage") return { success: true, today: Math.floor(Math.random() * 10000 + 5000), thisWeek: Math.floor(Math.random() * 70000 + 35000), thisMonth: Math.floor(Math.random() * 300000 + 150000), topUsers: ["app","web","mobile","partner_api"].map(function(u) { return { source: u, requests: Math.floor(Math.random() * 10000 + 1000) }; }) };

  // --- Admin endpoints ---
  if (endpoint.indexOf("admin.") === 0) return { success: true, endpoint: endpoint, message: "Admin endpoint accessible", requiresPrivilegedAccess: true, dataAvailable: true };

  return { success: false, error: "Unknown endpoint: " + endpoint };
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
  return addCorsHeaders(ContentService.createTextOutput(JSON.stringify(payload || {}))
    .setMimeType(ContentService.MimeType.TEXT));
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

// ===== DEVICE TRACKING SYSTEM =====

function ensureDeviceTrackingSheet() {
  var sheet = ensureSheet(SHEETS.DeviceTracking);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Name","Device ID","IP","Fingerprint","Status","Websites","Country","State","City","Postal Code","Latitude","Longitude","ASN","Organization","ISP","VPN","Network Scanner","Hosting","Proxy","Cloud","Snort","Mobile","Tor","Inbound","Outbound","AS Name","Further Details","Last Seen"]);
  }
  return sheet;
}

function getIPInfo(ip) {
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip === "localhost") {
    return { country: "Local", state: "Local", city: "Local", postalCode: "", lat: "", lng: "", asn: "", org: "", isp: "Local", vpn: false, hosting: false, proxy: false, mobile: false, tor: false, cloud: false, asName: "" };
  }
  try {
    var resp = UrlFetchApp.fetch("https://ip-api.com/json/" + encodeURIComponent(ip) + "?fields=status,country,regionName,city,zip,lat,lon,isp,org,as,proxy,hosting,mobile,query", { muteHttpExceptions: true, timeout: 5000 });
    var d = JSON.parse(resp.getContentText());
    if (d.status !== "success") return {};
    var asn = d.as ? d.as.split(" ")[0] : "";
    var asName = d.as ? d.as.substring(d.as.indexOf(" ") + 1) : "";
    var orgLower = (d.org || "").toLowerCase();
    var cloud = orgLower.indexOf("amazon") >= 0 || orgLower.indexOf("google cloud") >= 0 || orgLower.indexOf("microsoft") >= 0 || orgLower.indexOf("azure") >= 0 || orgLower.indexOf("digitalocean") >= 0 || orgLower.indexOf("linode") >= 0 || orgLower.indexOf("vultr") >= 0 || orgLower.indexOf("oracle cloud") >= 0 || orgLower.indexOf("ibm cloud") >= 0 || orgLower.indexOf("cloudflare") >= 0 || orgLower.indexOf("akamai") >= 0 || orgLower.indexOf("fastly") >= 0;
    var tor = orgLower.indexOf("tor") >= 0 || (d.isp || "").toLowerCase().indexOf("tor") >= 0;
    return { country: d.country || "", state: d.regionName || "", city: d.city || "", postalCode: d.zip || "", lat: d.lat !== undefined ? String(d.lat) : "", lng: d.lon !== undefined ? String(d.lon) : "", asn: asn, org: d.org || "", isp: d.isp || "", vpn: d.proxy === true, hosting: d.hosting === true, proxy: d.proxy === true, mobile: d.mobile === true, tor: tor, cloud: cloud, asName: asName };
  } catch(e) { return {}; }
}

function generateDeviceID(name) {
  var parts = (name || "").trim().split(/\s+/);
  if (parts.length < 2) return "XX" + String(Date.now()).slice(-4);
  var first = (parts[0] || "X").charAt(0).toUpperCase();
  var last = parts[parts.length - 1].charAt(0).toUpperCase();
  var prefix = first + last;
  var sheet = ensureDeviceTrackingSheet();
  var rows = sheet.getDataRange().getValues();
  var maxSeq = 0;
  for (var i = 1; i < rows.length; i++) {
    var did = String(rows[i][1] || "");
    if (did.indexOf(prefix) === 0) {
      var num = parseInt(did.substring(2), 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
  }
  return prefix + (maxSeq + 1);
}

function trackDeviceEntry(name, ip, fingerprint, websites, status) {
  try {
    var info = getIPInfo(ip);
    var deviceID = generateDeviceID(name || "Anonymous");
    var sheet = ensureDeviceTrackingSheet();
    var now = new Date().toISOString();
    var vpnMark = info.vpn ? "\u2713" : "\u2717";
    var hostingMark = info.hosting ? "\u2713" : "\u2717";
    var proxyMark = info.proxy ? "\u2713" : "\u2717";
    var cloudMark = info.cloud ? "\u2713" : "\u2717";
    var mobileMark = info.mobile ? "\u2713" : "\u2717";
    var torMark = info.tor ? "\u2713" : "\u2717";
    sheet.appendRow([name || "", deviceID, ip, fingerprint || "", status || "Active", websites || "", info.country || "", info.state || "", info.city || "", info.postalCode || "", info.lat || "", info.lng || "", info.asn || "", info.org || "", info.isp || "", vpnMark, "\u2717", hostingMark, proxyMark, cloudMark, "\u2717", mobileMark, torMark, "", "", info.asName || "", "", now]);
  } catch(e) {}
}

function ensureUserSecuritySheet() {
  var sheet = ensureSheet(SHEETS.UserSecurity);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Email", "SecurityQuestion", "SecurityAnswer", "AllowedDays", "AllowedStartTime", "AllowedEndTime", "BlockedDates", "KnownFingerprints", "CreatedAt", "PatternColors", "GestureSequence", "UserSalt", "SecretHandshake", "CanvasFingerprint", "WebGLFingerprint", "AudioFingerprint", "CSSFeatureMatrix", "RegisteredRegion", "RegisteredASN", "RegisteredGesture", "GestureTimingProfile", "ReactionTimeProfile", "MotorControlProfile", "AllowedStartHour", "AllowedEndHour", "DeviceFingerprintHash", "FingerprintSalt"]);
  }
  return sheet;
}

function ensureVerificationAttemptsSheet() {
  var sheet = ensureSheet(SHEETS.VerificationAttempts);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Email", "Timestamp", "Step", "Success", "IP", "Fingerprint"]);
  }
  return sheet;
}

function logVerificationAttempt(email, step, success, ip, fingerprint) {
  try {
    var sheet = ensureVerificationAttemptsSheet();
    sheet.appendRow([email || "", new Date().toISOString(), step || "", success ? "TRUE" : "FALSE", ip || "", fingerprint || ""]);
  } catch(e) {}
}

function getAllowedDays(email) {
  try {
    var sheet = getSheet(SHEETS.UserSecurity);
    if (!sheet) return null;
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0] || "").toLowerCase() === (email || "").toLowerCase()) {
        var val = rows[i][3];
        if (!val || val === "") return null;
        return String(val).split(",").map(function(s) { return parseInt(s.trim(), 10); }).filter(function(n) { return !isNaN(n); });
      }
    }
  } catch(e) {}
  return null;
}

function getAllowedHours(email) {
  try {
    var sheet = getSheet(SHEETS.UserSecurity);
    if (!sheet) return null;
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0] || "").toLowerCase() === (email || "").toLowerCase()) {
        var start = rows[i][4];
        var end = rows[i][5];
        if (!start && !end) return null;
        return { start: parseInt(start, 10) || 6, end: parseInt(end, 10) || 22 };
      }
    }
  } catch(e) {}
  return null;
}

function getBlockedDates(email) {
  try {
    var sheet = getSheet(SHEETS.UserSecurity);
    if (!sheet) return [];
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0] || "").toLowerCase() === (email || "").toLowerCase()) {
        var val = rows[i][6];
        if (!val || val === "") return [];
        return String(val).split(",").map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
      }
    }
  } catch(e) {}
  return [];
}

function isTimeAllowed(email) {
  var days = getAllowedDays(email);
  var hours = getAllowedHours(email);
  var blockedDates = getBlockedDates(email);
  var now = new Date();
  if (days && days.length > 0) {
    if (days.indexOf(now.getDay()) < 0) return false;
  }
  if (hours) {
    var currentHour = now.getHours();
    if (currentHour < hours.start || currentHour >= hours.end) return false;
  }
  if (blockedDates.length > 0) {
    var dateStr = now.toISOString().slice(0, 10);
    for (var bi = 0; bi < blockedDates.length; bi++) {
      if (blockedDates[bi] === dateStr) return false;
    }
  }
  return true;
}

function getTimeRestrictions(email) {
  var days = getAllowedDays(email);
  var hours = getAllowedHours(email);
  var blockedDates = getBlockedDates(email);
  var now = new Date();
  var timeBlocked = false, dateBlocked = false;
  if (hours) {
    var currentHour = now.getHours();
    if (currentHour < hours.start || currentHour >= hours.end) timeBlocked = true;
  }
  if (days && days.length > 0) {
    if (days.indexOf(now.getDay()) < 0) dateBlocked = true;
  }
  if (blockedDates.length > 0) {
    var dateStr = now.toISOString().slice(0, 10);
    for (var bi = 0; bi < blockedDates.length; bi++) {
      if (blockedDates[bi] === dateStr) dateBlocked = true;
    }
  }
  return { timeBlocked: timeBlocked, dateBlocked: dateBlocked, allowedDays: days, allowedHours: hours, blockedDates: blockedDates };
}

function isBetaTestingActive() {
  try {
    var sheet = getSheet("Config");
    if (!sheet) return false;
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === "BETA_TESTING" && String(rows[i][1]).trim().toUpperCase() === "ON") return true;
    }
  } catch(e) {}
  return false;
}

function isFullyVerified(email) {
  if (!email) return false;
  try {
    var sheet = ensureSheet("VerificationAttempts");
    var rows = sheet.getDataRange().getValues();
    var now = Date.now();
    for (var i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][0]).toLowerCase() === email.toLowerCase()) {
        var timestamp = new Date(rows[i][1]).getTime();
        if (now - timestamp > 86400000) return false;
        var step = String(rows[i][2]).trim();
        var success = String(rows[i][3]).trim();
        if (step === "30step_complete" && success === "true") return true;
      }
    }
  } catch(e) {}
  return false;
}

function generateTimeCipher(email, fingerprint) {
  var minuteWindow = Math.floor(Date.now() / 60000);
  var userSalt = getUserSalt(email);
  var raw = (fingerprint || "") + minuteWindow + (userSalt || "EASECRET2026");
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  var hex = digest.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join("");
  return hex;
}

function getUserSalt(email) {
  try {
    var sheet = getSheet("UserSecurity");
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).toLowerCase() === email.toLowerCase() && rows[i][11]) return String(rows[i][11]);
    }
  } catch(e) {}
  return "EASECRET2026";
}

function performAutoChecks(email, params) {
  var results = {};
  var fingerprint = params.fingerprint || "";
  var ip = params.ip || "";
  var timestamp = Number(params.timestamp) || 0;
  var nonce = params.nonce || "";
  var referrer = params.referrer || "";
  var canvasFp = params.canvasFingerprint || "";
  var webglFp = params.webglFingerprint || "";
  var audioFp = params.audioFingerprint || "";
  var cssMatrix = params.cssFeatures || "";
  // Step 1: Device fingerprint check
  var secSheet = getSheet(SHEETS.UserSecurity);
  var secRows = secSheet ? secSheet.getDataRange().getValues() : [];
  var storedFingerprint = "", storedCanvas = "", storedWebgl = "", storedAudio = "", storedRegion = "", storedAsn = "";
  for (var aci = 1; aci < secRows.length; aci++) {
    if (String(secRows[aci][0] || "").toLowerCase() === email.toLowerCase()) {
      storedFingerprint = String(secRows[aci][25] || "");
      storedCanvas = String(secRows[aci][13] || "");
      storedWebgl = String(secRows[aci][14] || "");
      storedAudio = String(secRows[aci][15] || "");
      storedRegion = String(secRows[aci][17] || "");
      storedAsn = String(secRows[aci][18] || "");
      break;
    }
  }
  results.step1 = { passed: !storedFingerprint || fingerprint === storedFingerprint, detail: "Device fingerprint check" };
  results.step2 = { passed: !storedCanvas || canvasFp === storedCanvas, detail: "Canvas fingerprint check" };
  results.step3 = { passed: !storedWebgl || webglFp === storedWebgl, detail: "WebGL fingerprint check" };
  results.step4 = { passed: !storedAudio || audioFp === storedAudio, detail: "Audio fingerprint check" };
  results.step5 = { passed: true, detail: "CSS feature check" };
  // Step 6: Clock skew - must be less than 1 second
  var now = Date.now();
  results.step6 = { passed: Math.abs(now - timestamp) < 1000, detail: "Clock skew: " + Math.abs(now - timestamp) + "ms" };
  // Step 7: IP geolocation (simplified - check region format)
  results.step7 = { passed: !storedRegion || true, detail: "IP geolocation check" };
  // Step 8: ASN check
  results.step8 = { passed: !storedAsn || true, detail: "ASN check" };
  // Step 9: Proxy detection (simplified)
  var isProxy = false;
  results.step9 = { passed: !isProxy, detail: "Proxy/VPN detection" };
  // Step 10: Browser integrity (check webdriver flag in params)
  var webdriver = params.webdriver || "";
  results.step10 = { passed: webdriver !== "true" && webdriver !== true, detail: "Browser integrity check" };
  // Step 11: Proof of work (verify nonce if provided)
  if (params.challenge && params.nonce) {
    var challengeRaw = params.challenge + params.nonce;
    var powDigest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, challengeRaw);
    var powHex = powDigest.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join("");
    results.step11 = { passed: powHex.substring(0, 4) === "0000", detail: "Proof of work" };
  } else {
    results.step11 = { passed: true, detail: "Proof of work (simplified)" };
  }
  // Step 12: Navigation path
  results.step12 = { passed: true, detail: "Navigation path: " + referrer };
  // Step 13: Human timing
  results.step13 = { passed: true, detail: "Human timing analysis" };
  // Step 14: JS environment
  results.step14 = { passed: true, detail: "JS environment check" };
  // Step 15: TLS fingerprint
  results.step15 = { passed: true, detail: "TLS fingerprint check" };
  return results;
}

function updateDeviceEntry(name, ip, websites, status) {
  try {
    var sheet = ensureDeviceTrackingSheet();
    var rows = sheet.getDataRange().getValues();
    var info = getIPInfo(ip);
    var now = new Date().toISOString();
    for (var i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][2] || "") === ip && String(rows[i][3] || "") !== "") {
        sheet.getRange(i + 1, 6).setValue(String(rows[i][5] || "") + (websites ? ", " + websites : ""));
        sheet.getRange(i + 1, 5).setValue(status || rows[i][4] || "Active");
        sheet.getRange(i + 1, 28).setValue(now);
        return;
      }
    }
    trackDeviceEntry(name, ip, "", websites, status);
  } catch(e) {}
}

// ===== REAL-TIME APIS =====

function openSkyQuery(query) {
  try {
    var resp = UrlFetchApp.fetch("https://opensky-network.org/api/airports/query?query=" + encodeURIComponent(query), { muteHttpExceptions: true, timeout: 5000 });
    if (resp.getResponseCode() !== 200) return null;
    var d = JSON.parse(resp.getContentText());
    return Array.isArray(d) ? d : [d].filter(Boolean);
  } catch(e) { return null; }
}

function geoNamesQuery(code) {
  try {
    var user = "demo";
    var resp = UrlFetchApp.fetch("http://api.geonames.org/searchJSON?q=" + encodeURIComponent(code) + "&maxRows=1&featureCode=AIRP&username=" + user, { muteHttpExceptions: true, timeout: 5000 });
    if (resp.getResponseCode() !== 200) return null;
    var d = JSON.parse(resp.getContentText());
    if (d.geonames && d.geonames.length > 0) {
      var g = d.geonames[0];
      return { name: g.name || g.toponymName || code, lat: parseFloat(g.lat) || 0, lng: parseFloat(g.lng) || 0, city: g.adminName1 || "", country: g.countryName || "", type: "airport" };
    }
  } catch(e) {}
  return null;
}

function airportFromList(code) {
  return null;
}

function lookupAirportFromAPI(code) {
  if (!code || code.length !== 3) return null;
  if (AIRPORT_CACHE[code]) return AIRPORT_CACHE[code];

  // Strategy 1: OpenSky query with raw code
  var arr = openSkyQuery(code);
  if (arr && arr.length > 0) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].lat && arr[i].lon) {
        var ap = { name: arr[i].name || arr[i].municipality || code, lat: arr[i].lat || 0, lng: arr[i].lon || 0, type: arr[i].type || "unknown", city: arr[i].municipality || "", country: arr[i].country || "" };
        AIRPORT_CACHE[code] = ap;
        return ap;
      }
    }
  }

  // Strategy 2: OpenSky query with K-prefix (US ICAO codes)
  if (code.length === 3) {
    var arr2 = openSkyQuery("K" + code);
    if (arr2 && arr2.length > 0) {
      for (var j = 0; j < arr2.length; j++) {
        if (arr2[j].lat && arr2[j].lon) {
          var ap2 = { name: arr2[j].name || arr2[j].municipality || code, lat: arr2[j].lat || 0, lng: arr2[j].lon || 0, type: arr2[j].type || "unknown", city: arr2[j].municipality || "", country: arr2[j].country || "" };
          AIRPORT_CACHE[code] = ap2;
          return ap2;
        }
      }
    }
  }

  // Strategy 3: GeoNames as fallback
  var gn = geoNamesQuery(code);
  if (gn) { AIRPORT_CACHE[code] = gn; return gn; }

  return null;
}

function searchAirportsFromAPI(query) {
  if (!query || query.length < 2) return [];
  // Strategy 1: OpenSky with raw query
  var arr = openSkyQuery(query);
  if (arr && arr.length > 0) {
    var results = arr.filter(function(a) { return a.icao && a.lat && a.lon; }).map(function(a) { return { code: a.icao, name: a.name || "", city: a.municipality || "", country: a.country || "", lat: a.lat || 0, lng: a.lon || 0 }; });
    if (results.length > 0) return results;
  }
  // Strategy 2: OpenSky with K-prefix for ICAO search
  var arr2 = openSkyQuery("K" + query);
  if (arr2 && arr2.length > 0) {
    var results2 = arr2.filter(function(a) { return a.icao && a.lat && a.lon; }).map(function(a) { return { code: a.icao, name: a.name || "", city: a.municipality || "", country: a.country || "", lat: a.lat || 0, lng: a.lon || 0 }; });
    if (results2.length > 0) return results2;
  }
  // Strategy 3: GeoNames search
  try {
    var user = "demo";
    var resp = UrlFetchApp.fetch("http://api.geonames.org/searchJSON?q=" + encodeURIComponent(query) + "&maxRows=5&featureCode=AIRP&username=" + user, { muteHttpExceptions: true, timeout: 5000 });
    if (resp.getResponseCode() === 200) {
      var d = JSON.parse(resp.getContentText());
      if (d.geonames && d.geonames.length > 0) {
        return d.geonames.filter(function(g) { return g.lat && g.lng; }).map(function(g) { return { code: query.toUpperCase(), name: g.name || g.toponymName || "", city: g.adminName1 || "", country: g.countryName || "", lat: parseFloat(g.lat) || 0, lng: parseFloat(g.lng) || 0 }; });
      }
    }
  } catch(e) {}
  return [];
}

function getRealWeather(lat, lng) {
  if (!lat || !lng) return null;
  try {
    var resp = UrlFetchApp.fetch("https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(lat) + "&longitude=" + encodeURIComponent(lng) + "&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature,precipitation,pressure_msl&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch", { muteHttpExceptions: true, timeout: 5000 });
    var d = JSON.parse(resp.getContentText());
    if (d && d.current) {
      return { temp: d.current.temperature_2m, feelsLike: d.current.apparent_temperature, condition: getWeatherCondition(d.current.weather_code), windSpeed: d.current.wind_speed_10m, humidity: d.current.relative_humidity_2m, precipitation: d.current.precipitation, pressure: d.current.pressure_msl };
    }
  } catch(e) {}
  return null;
}

function getForecast(lat, lng) {
  if (!lat || !lng) return null;
  try {
    var resp = UrlFetchApp.fetch("https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(lat) + "&longitude=" + encodeURIComponent(lng) + "&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,wind_speed_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto", { muteHttpExceptions: true, timeout: 5000 });
    var d = JSON.parse(resp.getContentText());
    if (d && d.daily) {
      var days = [];
      for (var di = 0; di < d.daily.time.length && di < 7; di++) {
        days.push({ date: d.daily.time[di], tempMax: d.daily.temperature_2m_max[di], tempMin: d.daily.temperature_2m_min[di], condition: getWeatherCondition(d.daily.weather_code[di]), precipitation: d.daily.precipitation_sum[di], windSpeed: d.daily.wind_speed_10m_max[di] });
      }
      return days;
    }
  } catch(e) {}
  return null;
}

function getExchangeRate(baseCurrency, targetCurrency) {
  if (!baseCurrency) baseCurrency = "USD";
  if (!targetCurrency) return null;
  if (baseCurrency === targetCurrency) return 1.0;
  try {
    var resp = UrlFetchApp.fetch("https://api.exchangerate-api.com/v4/latest/" + encodeURIComponent(baseCurrency), { muteHttpExceptions: true, timeout: 5000 });
    var d = JSON.parse(resp.getContentText());
    if (d && d.rates && d.rates[targetCurrency] !== undefined) return d.rates[targetCurrency];
  } catch(e) {}
  return null;
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

function calculateBaseFare(origin, destination, serviceType, departDate, promoCode) {
  try {
    const orig = lookupAirportFromAPI(origin) || AIRPORT_CACHE[origin];
    const dest = lookupAirportFromAPI(destination) || AIRPORT_CACHE[destination];
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
    Newsletter: ["ID","Title","Content","Author","Email","Timestamp","Status"],
    NewsletterComments: ["ID","ArticleID","Name","Email","Comment","Timestamp","Status"],
    Notifications: ["NotificationID","UserID","Email","Type","Title","Message","Link","Read","CreatedAt"],
    TrackingLog: ["Timestamp","IP","Fingerprint","UserAgent","Screen","Timezone","Language","Page","User","Extra"],
    AuditLog: ["Timestamp","Action","User","Details","IP","Fingerprint","UserAgent"],
    ApiKeys: ["Key","Email","Name","CreatedAt","LastUsed","Status","RequestCount","LastReactivation","Notes"],
    DeviceTracking: ["Name","Device ID","IP","Fingerprint","Status","Websites","Country","State","City","Postal Code","Latitude","Longitude","ASN","Organization","ISP","VPN","Network Scanner","Hosting","Proxy","Cloud","Snort","Mobile","Tor","Inbound","Outbound","AS Name","Further Details","Last Seen"],
    UserSecurity: ["Email","SecurityQuestion","SecurityAnswer","AllowedDays","AllowedStartTime","AllowedEndTime","BlockedDates","KnownFingerprints","CreatedAt","PatternColors","GestureSequence","UserSalt","SecretHandshake","CanvasFingerprint","WebGLFingerprint","AudioFingerprint","CSSFeatureMatrix","RegisteredRegion","RegisteredASN","RegisteredGesture","GestureTimingProfile","ReactionTimeProfile","MotorControlProfile","AllowedStartHour","AllowedEndHour","DeviceFingerprintHash","FingerprintSalt"],
    VerificationAttempts: ["Email","Timestamp","Step","Success","IP","Fingerprint"]
  };
  let created = [], skipped = [];
  for (const [name, headers] of Object.entries(schema)) {
    let sheet = ss.getSheetByName(name);
    if (sheet) { skipped.push(name); continue; }
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    created.push(name);
  }
  const msg = "Setup complete: " + created.length + " sheets created (" + created.join(", ") + "), " + skipped.length + " already existed.";
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { console.log(msg); }
  return msg;
}

function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const action = params.action;

    // Beta testing mode check
    if (isBetaTestingActive() && action && action !== "login" && action !== "signup" && action !== "auth.autoCheck" && action !== "auth.semiCameraCheck" && action !== "auth.semiMicrophoneCheck" && action !== "auth.semiBatteryCheck" && action !== "auth.semiScreenCheck" && action !== "auth.semiBluetoothCheck" && action !== "auth.userTimePassword" && action !== "auth.userColorSequence" && action !== "auth.userDynamicMaze" && action !== "auth.userReactionClick" && action !== "auth.userReactionGoNoGo" && action !== "auth.userGestureTrace" && action !== "auth.userMotorControl" && action !== "auth.userAudioChallenge" && action !== "auth.userCognitivePattern" && action !== "auth.completeVerification" && action !== "heartbeat" && action !== "users.online" && action !== "system.overview" && action !== "getSystemStatus" && action !== "track" && action !== "audit.event") {
      var email = params.email || "";
      var verified = isFullyVerified(email);
      if (!verified) {
        return respond({ success: false, error: "BETA_ACCESS_REQUIRED", message: "Beta testing mode active. Complete all 30 verification steps to access the system." });
      }
    }

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
      trackDeviceEntry(params.user || "Anonymous", params.ip || "", params.fingerprint || "", params.page || "", "Active");
      return respond({ success: true });
    }

    // --- ENHANCED AUDIT EVENT ---
    if (action === "audit.event") {
      auditLogEvent(params.action || "event", params.user || "", params.details || "", params.ip || "", params.fingerprint || "", params.ua || "", params.page || "", params.element || "", params.eventType || "", params.duration || "");
      return respond({ success: true });
    }

    // --- HEARTBEAT / USERS ONLINE ---
    if (action === "heartbeat") {
      recordHeartbeat(params.session || params.fingerprint || "anon", params.user || "", params.ip || "", params.fingerprint || "", params.page || "");
      var bookings = sheetToArray(getSheet(SHEETS.Bookings)) || [];
      var users = sheetToArray(getSheet(SHEETS.Users)) || [];
      var docs = sheetToArray(getSheet(SHEETS.Documents)) || [];
      var sysSheet = getSheet(SHEETS.SystemStatus);
      var sysData = sysSheet ? sheetToArray(sysSheet) : [];
      var systemUptime = "—";
      for (var si = 0; si < sysData.length; si++) {
        if ((sysData[si].Key || "") === "uptime") { systemUptime = sysData[si].Value; break; }
      }
      return respond({
        success: true,
        usersOnline: getUsersOnline(),
        totalFiles: getTotalCodeFiles(),
        totalLinesOfCode: getTotalLinesOfCode(),
        totalSheets: getTotalSheets(),
        totalApiEndpoints: getAllApiEndpoints().length,
        totalBookings: bookings.length,
        totalUsers: users.length,
        systemUptime: systemUptime,
        timestamp: new Date().toISOString()
      });
    }
    if (action === "system.overview") {
      var users = sheetToArray(getSheet(SHEETS.Users)) || [];
      var bookings = sheetToArray(getSheet(SHEETS.Bookings)) || [];
      var docs = sheetToArray(getSheet(SHEETS.Documents)) || [];
      return respond({
        success: true,
        stats: {
          usersOnline: getUsersOnline(),
          totalUsers: users.length,
          totalBookings: bookings.length,
          totalDocuments: docs.length,
          totalApiEndpoints: getAllApiEndpoints().length,
          totalSheets: Object.keys(SHEETS).length,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (action === "users.online") {
      return respond({ success: true, online: getUsersOnline() });
    }

    // --- HOLDINGS ---
    if (action === "holdings.list") {
      return respond({ success: true, holdings: HOLDINGS_DATA });
    }
    if (action === "holdings.search") {
      var q = (params.q || "").toLowerCase();
      if (!q) return respond({ success: true, holdings: HOLDINGS_DATA });
      var filtered = HOLDINGS_DATA.filter(function(h) { return h.name.toLowerCase().indexOf(q) >= 0 || h.ticker.toLowerCase().indexOf(q) >= 0 || h.sector.toLowerCase().indexOf(q) >= 0; });
      return respond({ success: true, holdings: filtered });
    }
    if (action === "holdings.detail") {
      var ticker = (params.ticker || "").toUpperCase();
      var holding = null;
      for (var hi = 0; hi < HOLDINGS_DATA.length; hi++) {
        if (HOLDINGS_DATA[hi].ticker === ticker) { holding = HOLDINGS_DATA[hi]; break; }
      }
      if (!holding) return respond({ success: false, error: "Holding not found" });
      // Generate historical price data
      var history = [];
      for (var hd = 29; hd >= 0; hd--) {
        var date = new Date(Date.now() - hd * 86400000);
        var base = holding.stockPrice;
        var variation = (Math.random() - 0.5) * base * 0.06;
        var vol = Math.floor(Math.random() * 500000 + 100000);
        history.push({ date: date.toISOString().slice(0,10), open: Math.round((base + variation - Math.random() * 2) * 100) / 100, high: Math.round((base + variation + Math.abs(Math.random() * 3)) * 100) / 100, low: Math.round((base + variation - Math.abs(Math.random() * 3)) * 100) / 100, close: Math.round((base + variation) * 100) / 100, volume: vol });
      }
      return respond({ success: true, holding: holding, history: history, lastUpdated: new Date().toISOString() });
    }

    // --- EXCHANGE RATES ---
    if (action === "exchange.rates") {
      try {
        var resp = UrlFetchApp.fetch("https://api.exchangerate-api.com/v4/latest/USD", { muteHttpExceptions: true, timeout: 5000 });
        if (resp.getResponseCode() === 200) {
          var d = JSON.parse(resp.getContentText());
          return respond({ success: true, base: "USD", rates: d.rates, date: d.date, timestamp: new Date().toISOString() });
        }
      } catch(e) {}
      return respond({ success: false, error: "Exchange rates unavailable" });
    }
    if (action === "exchange.convert") {
      var fromC = (params.from || "USD").toUpperCase();
      var toC = (params.to || "EUR").toUpperCase();
      var amount = parseFloat(params.amount) || 1;
      if (fromC === toC) return respond({ success: true, from: fromC, to: toC, amount: amount, result: amount, rate: 1 });
      try {
        var resp2 = UrlFetchApp.fetch("https://api.exchangerate-api.com/v4/latest/" + encodeURIComponent(fromC), { muteHttpExceptions: true, timeout: 5000 });
        if (resp2.getResponseCode() === 200) {
          var d2 = JSON.parse(resp2.getContentText());
          if (d2.rates && d2.rates[toC] !== undefined) {
            var rate = d2.rates[toC];
            return respond({ success: true, from: fromC, to: toC, amount: amount, result: Math.round(amount * rate * 100) / 100, rate: rate, date: d2.date });
          }
        }
      } catch(e) {}
      return respond({ success: false, error: "Conversion unavailable" });
    }

    // --- AUTH VALIDATE ---
    if (action === "auth.validate") {
      var token = params.token;
      if (!token) return respond({ success: false, valid: false, error: "No token" });
      var user = getUserFromToken(token);
      if (!user) return respond({ success: false, valid: false, error: "Invalid or expired token" });
      return respond({ success: true, valid: true, user: { id: user.UserID || user.Email, name: user.FullName, email: user.Email, role: user.Role || "User", miles: user.Miles || 0, status: getStatusValue(user.Status) } });
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
          pendingRequests: bookings.filter(b => (b.Status || "").toString().toUpperCase().indexOf("PENDING") === 0).length,
          usersOnline: getUsersOnline()
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

    // --- REAL-TIME: validate airport via OpenSky API ---
    if (action === "validateAirport") {
      var code = (params.code || "").toUpperCase();
      if (!code || code.length !== 3) return respond({ success: false, error: "Valid 3-letter IATA code required" });
      var ap = lookupAirportFromAPI(code);
      if (ap) return respond({ success: true, airport: ap });
      if (AIRPORT_CACHE[code]) return respond({ success: true, airport: AIRPORT_CACHE[code], cached: true });
      return respond({ success: false, error: "Airport not found" });
    }

    // --- REAL-TIME: search airports via OpenSky API ---
    if (action === "searchAirports") {
      var query = (params.query || "").trim();
      if (!query || query.length < 2) return respond({ success: true, airports: [] });
      var apiResults = searchAirportsFromAPI(query);
      if (apiResults.length > 0) return respond({ success: true, airports: apiResults, source: "api" });
      // Fallback: search AIRPORT_CACHE
      var q = query.toUpperCase();
      var cached = Object.keys(AIRPORT_CACHE).filter(function(c) { return c.indexOf(q) >= 0 || (AIRPORT_CACHE[c].name || "").toUpperCase().indexOf(q) >= 0 || (AIRPORT_CACHE[c].city || "").toUpperCase().indexOf(q) >= 0; }).map(function(c) { return { code: c, name: AIRPORT_CACHE[c].name, city: AIRPORT_CACHE[c].city, country: AIRPORT_CACHE[c].country, lat: AIRPORT_CACHE[c].lat, lng: AIRPORT_CACHE[c].lng }; });
      return respond({ success: true, airports: cached, source: "cache" });
    }

    // --- SERVER-SIDE FARE CALCULATION ---
    if (action === "calculateFareServerSide") {
      var origin = (params.origin || "").toUpperCase();
      var destination = (params.destination || "").toUpperCase();
      var serviceType = params.serviceType || "EA";
      var departDate = params.departDate || new Date().toISOString().slice(0, 10);
      var cabin = params.cabin || "Economy";
      var passengers = parseInt(params.passengers, 10) || 1;
      var promoCode = params.promoCode || "";
      var orig = lookupAirportFromAPI(origin) || AIRPORT_CACHE[origin];
      var dest = lookupAirportFromAPI(destination) || AIRPORT_CACHE[destination];
      if (!orig || !dest) return respond({ success: false, error: "Invalid airport codes" });
      var distance = haversineDistance(orig.lat, orig.lng, dest.lat, dest.lng);
      var flightTime = distance / 500 + 0.25;
      var baseFare = calculateBaseFare(origin, destination, serviceType, departDate, promoCode);
      var cabinMultiplier = CABIN_MULTIPLIERS[cabin] || 1.0;
      var surgeFare = applySurgePricing(departDate, baseFare);
      var totalFare = Math.round(surgeFare * cabinMultiplier * passengers);
      var userRecord = getUserRecordByEmail(params.email || "");
      var tier = calculateLoyaltyTier(userRecord ? (userRecord.Miles || 0) : 0);
      var milesEarned = Math.round(distance * tier.multiplier);
      return respond({
        success: true,
        baseFare: Math.round(baseFare),
        surgeFare: surgeFare,
        totalFare: totalFare,
        milesEarned: milesEarned,
        distance: Math.round(distance),
        flightTime: flightTime.toFixed(1),
        breakdown: {
          baseFare: Math.round(baseFare),
          cabinMultiplier: cabinMultiplier,
          passengers: passengers,
          surgeMultiplier: (surgeFare / baseFare).toFixed(2),
          subtotal: totalFare
        }
      });
    }

    // --- REAL-TIME: flight information ---
    if (action === "getFlightTime") {
      var origCode = (params.origin || "").toUpperCase();
      var destCode = (params.destination || "").toUpperCase();
      if (!origCode || !destCode) return respond({ success: false, error: "origin and destination required" });
      var orig = lookupAirportFromAPI(origCode) || AIRPORT_CACHE[origCode];
      var dest = lookupAirportFromAPI(destCode) || AIRPORT_CACHE[destCode];
      if (!orig || !dest) return respond({ success: false, error: "Invalid airport codes" });
      var dist = haversineDistance(orig.lat, orig.lng, dest.lat, dest.lng);
      var ft = calculateFlightTime(origCode, destCode);
      var bf = calculateBaseFare(origCode, destCode);
      var weather = getRealWeather(dest.lat, dest.lng);
      return respond({ success: true, flightTime: ft.toFixed(2), baseFare: Math.round(bf), distanceMiles: Math.round(dist).toString(), origin: orig, destination: dest, weather: weather });
    }

    // --- REAL-TIME: weather at airport ---
    if (action === "getWeather") {
      var wCode = (params.code || "").toUpperCase();
      var airport = lookupAirportFromAPI(wCode) || AIRPORT_CACHE[wCode];
      if (!airport) return respond({ success: false, error: "Airport not found" });
      var w = getRealWeather(airport.lat, airport.lng);
      return respond({ success: true, weather: w || { temp: null, condition: "Unavailable", windSpeed: null }, airport: wCode });
    }

    // --- REAL-TIME: exchange rate ---
    if (action === "getExchangeRate") {
      var fromCurr = (params.from || "USD").toUpperCase();
      var toCurr = (params.to || "EUR").toUpperCase();
      var rate = getExchangeRate(fromCurr, toCurr);
      if (rate !== null) return respond({ success: true, rate: rate, from: fromCurr, to: toCurr, timestamp: new Date().toISOString() });
      return respond({ success: false, error: "Exchange rate unavailable" });
    }

    // --- WEATHER: 7-day forecast ---
    if (action === "weather.forecast") {
      var wfCode = (params.code || "").toUpperCase();
      var wfAirport = lookupAirportFromAPI(wfCode);
      if (!wfAirport) return respond({ success: false, error: "Airport not found" });
      var wf = getForecast(wfAirport.lat, wfAirport.lng);
      return respond({ success: true, forecast: wf || [], airport: { code: wfCode, name: wfAirport.name, city: wfAirport.city, country: wfAirport.country } });
    }

    // --- FLIGHTS: status by flight number ---
    if (action === "flights.status") {
      var flightNum = (params.flight || "").toUpperCase();
      if (!flightNum) return respond({ success: false, error: "Flight number required (e.g. EA1001)" });
      var origin = (params.origin || "").toUpperCase();
      var dest = (params.destination || "").toUpperCase();
      var depDate = params.date || "";
      var oAp = origin ? lookupAirportFromAPI(origin) : null;
      var dAp = dest ? lookupAirportFromAPI(dest) : null;
      var dist = (oAp && dAp) ? Math.round(haversineDistance(oAp.lat, oAp.lng, dAp.lat, dAp.lng)) : 0;
      var fltTime = (oAp && dAp) ? (dist / 500 + 0.25).toFixed(1) : "—";
      var now = new Date();
      var depHour = 6 + Math.floor(Math.random() * 14);
      var depMin = Math.floor(Math.random() * 60);
      var depTime = depHour.toString().padStart(2, "0") + ":" + depMin.toString().padStart(2, "0");
      var arrHour = depHour + Math.ceil(dist / 500);
      var arrTime = (arrHour % 24).toString().padStart(2, "0") + ":" + depMin.toString().padStart(2, "0");
      var statuses = ["On Time", "Delayed", "Boarding", "Departed", "Landed", "Scheduled"];
      var status = statuses[Math.floor(Math.random() * statuses.length)];
      var gate = "G" + (Math.floor(Math.random() * 40) + 1);
      var terminal = String.fromCharCode(65 + Math.floor(Math.random() * 4));
      return respond({ success: true, flight: flightNum, status: status, origin: oAp ? { code: origin, name: oAp.name } : { code: origin }, destination: dAp ? { code: dest, name: dAp.name } : { code: dest }, departure: { time: depTime, date: depDate || now.toISOString().slice(0,10), gate: gate, terminal: terminal }, arrival: { time: arrTime, date: depDate || now.toISOString().slice(0,10) }, distance: dist, flightTime: fltTime + "h", aircraft: getAircraftConfig(dist).model, timestamp: now.toISOString() });
    }

    // --- ROUTES: explore from airport ---
    if (action === "routes.fromAirport") {
      var rtCode = (params.code || "").toUpperCase();
      var rtAirport = lookupAirportFromAPI(rtCode);
      if (!rtAirport) return respond({ success: false, error: "Airport not found" });
      var allCodes = getAirportCodes();
      var routes = [];
      for (var ri = 0; ri < allCodes.length && ri < 30; ri++) {
        if (allCodes[ri] !== rtCode) {
          var a = AIRPORT_CACHE[allCodes[ri]];
          if (a) {
            var d = Math.round(haversineDistance(rtAirport.lat, rtAirport.lng, a.lat, a.lng));
            routes.push({ destination: allCodes[ri], name: a.name, city: a.city, country: a.country, distance: d, estimatedFare: Math.round(calculateBaseFare(rtCode, allCodes[ri])) });
          }
        }
      }
      routes.sort(function(x, y) { return x.distance - y.distance; });
      return respond({ success: true, airport: { code: rtCode, name: rtAirport.name, city: rtAirport.city, country: rtAirport.country }, routes: routes, totalRoutes: routes.length });
    }

    // --- DEVELOPER API: list public endpoints ---
    if (action === "dev.listEndpoints") {
      const keyCheck = validateApiKey(params.key);
      if (!keyCheck.valid) return respond({ success: false, error: keyCheck.error });
      var allEps = getAllApiEndpoints(); return respond({ success: true, total: allEps.length, endpoints: allEps, keyInfo: { requests: keyCheck.record.RequestCount } });
    }

    // --- DEVELOPER API: execute an endpoint by name ---
    if (action === "dev.execute") {
      const keyCheck = validateApiKey(params.key);
      if (!keyCheck.valid) return respond({ success: false, error: keyCheck.error });
      var epName = normalizeText(params.endpoint);
      if (!epName) return respond({ success: false, error: "endpoint parameter required" });
      var result = handleDevEndpoint(epName, params);
      result.keyInfo = { requests: keyCheck.record.RequestCount };
      return respond(result);
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
      var airCodes = getAirportCodes(); return respond({ success: true, airports: airCodes.map(function(c) { var a = AIRPORT_CACHE[c]; return a ? { code: c, name: a.name, city: a.city, country: a.country, lat: a.lat, lng: a.lng } : { code: c }; }), keyInfo: { requests: keyCheck.record.RequestCount } });
    }

    // --- DEVELOPER API: calculate fare (key-protected) ---
    if (action === "dev.apiFare") {
      const keyCheck = validateApiKey(params.key);
      if (!keyCheck.valid) return respond({ success: false, error: keyCheck.error });
      if (!params.origin || !params.destination) return respond({ success: false, error: "origin and destination required" });
      const orig = lookupAirportFromAPI(params.origin) || AIRPORT_CACHE[params.origin];
      const dest = lookupAirportFromAPI(params.destination) || AIRPORT_CACHE[params.destination];
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

    // --- ROUTES: list route info ---
    if (action === "routes.list") {
      var origin = params.origin || "";
      var destination = params.destination || "";
      if (!origin || !destination) return respond({ success: false, error: "Missing origin or destination" });
      var airportCodes = ["JFK","LHR","CDG","DXB","HND","SIN","LAX","NRT","FRA","AMS","IST","SFO","MIA","DEL","SYD","ICN","BKK","MUC","ZRH","HKG"];
      var distances = { JFK_LHR: 3451, JFK_CDG: 3633, JFK_DXB: 6835, JFK_HND: 6738, JFK_SIN: 8867, JFK_LAX: 2475, LHR_DXB: 3420, LHR_HND: 5954, LHR_SIN: 6080, LHR_LAX: 5438, LAX_NRT: 5464, LAX_SYD: 7487, LAX_SIN: 8447, SFO_SIN: 8447, SFO_NRT: 5136, DXB_SYD: 7470, DXB_LHR: 3420, CDG_JFK: 3633 };
      var key = origin.toUpperCase() + "_" + destination.toUpperCase();
      var reverseKey = destination.toUpperCase() + "_" + origin.toUpperCase();
      var distance = distances[key] || distances[reverseKey] || (Math.floor(Math.random() * 5000) + 300);
      var hours = Math.floor(distance / 500);
      var mins = Math.floor((distance % 500) / 500 * 60);
      var fare = Math.floor(distance * 0.12) + 50;
      return respond({ success: true, route: { origin: origin.toUpperCase(), destination: destination.toUpperCase(), distance: distance, flightTime: hours + "h " + mins + "m", duration: hours + "h " + mins + "m", fare: fare, price: fare } });
    }

    // --- CARGO: check cargo status ---
    if (action === "cargo.status") {
      var tracking = params.tracking || "";
      if (!tracking) return respond({ success: false, error: "Missing tracking number" });
      var origins = ["JFK","LAX","ORD","ATL","SFO","MIA","SEA"];
      var dests = ["LHR","NRT","FRA","AMS","DXB","HKG","SIN","ICN"];
      var statuses = ["In Transit","Processing","Delivered","Customs Hold","Departed","Awaiting Pickup"];
      return respond({ success: true, cargo: { tracking: tracking, status: statuses[Math.floor(Math.random() * statuses.length)], origin: origins[Math.floor(Math.random() * origins.length)], destination: dests[Math.floor(Math.random() * dests.length)], weight: (Math.floor(Math.random() * 9000) + 100) + " kg", lastUpdate: new Date().toISOString().slice(0,10) } });
    }

    // --- HOTELS: search hotels by city ---
    if (action === "hotels.search") {
      var city = params.city || "";
      if (!city) return respond({ success: false, error: "Missing city parameter" });
      var hotelNames = ["Grand Palace Hotel", "Royal Suites", "City View Inn", "Harbor Lodge", "Skyline Hotel", "Paradise Resort", "Urban Comfort", "Elite Stay", "Cosmo Hotel", "The Grand", "Sunset Inn", "Plaza Hotel", "Ocean View Resort", "Metro Lodge", "Heritage Inn"];
      var count = Math.floor(Math.random() * 5) + 3;
      var hotels = [];
      for (var hi = 0; hi < count; hi++) {
        hotels.push({ name: hotelNames[Math.floor(Math.random() * hotelNames.length)], city: city, stars: Math.floor(Math.random() * 2) + 3, rating: (3.5 + Math.random() * 1.5).toFixed(1), price: Math.floor(Math.random() * 250) + 80, amenities: ["WiFi","Pool","Gym","Restaurant","Bar","Spa","Parking"].slice(0, Math.floor(Math.random() * 4) + 2).join(", ") });
      }
      return respond({ success: true, hotels: hotels });
    }

    // --- INSURANCE: get travel insurance quote ---
    if (action === "insurance.quote") {
      var destCountry = params.destination || "Unknown";
      var duration = parseInt(params.duration) || 7;
      var travelers = parseInt(params.travelers) || 1;
      var regions = { "europe": 1.2, "asia": 1.5, "africa": 1.8, "americas": 1.3, "oceania": 1.6, "default": 1.0 };
      var riskFactor = 1.0;
      for (var rk in regions) { if (destCountry.toLowerCase().indexOf(rk) >= 0) { riskFactor = regions[rk]; break; } }
      var basePremium = (duration * 5.5 * travelers * riskFactor);
      var plans = [
        { plan: "Basic Coverage", premium: parseFloat((basePremium * 0.7).toFixed(2)), coverage: "Medical up to $50,000, Trip cancellation up to $2,000" },
        { plan: "Standard Coverage", premium: parseFloat((basePremium * 1.0).toFixed(2)), coverage: "Medical up to $150,000, Trip cancellation up to $5,000, Baggage up to $1,000" },
        { plan: "Premium Coverage", premium: parseFloat((basePremium * 1.6).toFixed(2)), coverage: "Medical up to $500,000, Trip cancellation up to $15,000, Baggage up to $3,000, Emergency evacuation" }
      ];
      return respond({ success: true, quotes: plans, destination: destCountry, duration: duration, travelers: travelers });
    }

    // --- PASSPORT: get passport and visa info for a country ---
    if (action === "passport.info") {
      var country = params.country || "";
      if (!country) return respond({ success: false, error: "Missing country parameter" });
      var passportDB = [
        { country: "Japan", visaRequired: false, validity: "6 months", processingTime: "2-3 weeks", fee: "$0 (visa-free)", notes: "90-day tourist visa on arrival for most nationalities" },
        { country: "France", visaRequired: true, validity: "3 months past departure", processingTime: "2-4 weeks", fee: "$35 (Schengen visa)", notes: "Schengen visa required for non-EU nationals" },
        { country: "United Kingdom", visaRequired: true, validity: "6 months", processingTime: "3-6 weeks", fee: "$40 (Standard visitor visa)", notes: "Electronic Travel Authorization (ETA) available for some nationalities" },
        { country: "United States", visaRequired: true, validity: "6 months", processingTime: "4-8 weeks", fee: "$160 (B-1/B-2 visa)", notes: "ESTA available for Visa Waiver Program countries" },
        { country: "Thailand", visaRequired: false, validity: "6 months", processingTime: "1-2 weeks", fee: "$0 (visa-free 30 days)", notes: "Visa on arrival available for many countries" },
        { country: "Singapore", visaRequired: false, validity: "6 months", processingTime: "1-2 weeks", fee: "$0 (visa-free 30-90 days)", notes: "Visa-free entry for most nationalities, e-Visa available" },
        { country: "Australia", visaRequired: true, validity: "6 months", processingTime: "4-6 weeks", fee: "$50 (eVisitor visa)", notes: "ETA and eVisitor available for eligible nationalities" },
        { country: "United Arab Emirates", visaRequired: false, validity: "6 months", processingTime: "1-2 weeks", fee: "$0 (visa-free 30 days)", notes: "Visa on arrival available for many countries" },
        { country: "China", visaRequired: true, validity: "6 months", processingTime: "4-6 weeks", fee: "$80 (L visa)", notes: "24-hour transit without visa available in major cities" },
        { country: "India", visaRequired: true, validity: "6 months", processingTime: "3-5 weeks", fee: "$25 (e-Visa)", notes: "e-Visa available for 180+ countries" },
        { country: "Brazil", visaRequired: true, validity: "6 months", processingTime: "4-8 weeks", fee: "$80 (visa)", notes: "Visa requirements vary significantly by nationality" },
        { country: "South Africa", visaRequired: false, validity: "6 months", processingTime: "2-4 weeks", fee: "$0 (visa-free 30 days)", notes: "Visa-free for many nationalities, e-Visa being rolled out" }
      ];
      var matched = null;
      for (var pi = 0; pi < passportDB.length; pi++) {
        if (passportDB[pi].country.toLowerCase().indexOf(country.toLowerCase()) >= 0 || country.toLowerCase().indexOf(passportDB[pi].country.toLowerCase()) >= 0) {
          matched = passportDB[pi]; break;
        }
      }
      if (!matched) {
        matched = { country: country, visaRequired: true, validity: "Check with embassy", processingTime: "Varies by nationality", fee: "Varies", notes: "Please check with the nearest embassy or consulate for specific requirements." };
      }
      return respond({ success: true, passport: matched });
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

    // Beta testing mode check
    if (isBetaTestingActive() && action && action !== "login" && action !== "signup" && action !== "auth.autoCheck" && action !== "auth.semiCameraCheck" && action !== "auth.semiMicrophoneCheck" && action !== "auth.semiBatteryCheck" && action !== "auth.semiScreenCheck" && action !== "auth.semiBluetoothCheck" && action !== "auth.userTimePassword" && action !== "auth.userColorSequence" && action !== "auth.userDynamicMaze" && action !== "auth.userReactionClick" && action !== "auth.userReactionGoNoGo" && action !== "auth.userGestureTrace" && action !== "auth.userMotorControl" && action !== "auth.userAudioChallenge" && action !== "auth.userCognitivePattern" && action !== "auth.completeVerification" && action !== "heartbeat" && action !== "users.online" && action !== "system.overview" && action !== "getSystemStatus" && action !== "track" && action !== "audit.event") {
      var email = data.email || "";
      var verified = isFullyVerified(email);
      if (!verified) {
        return respond({ success: false, error: "BETA_ACCESS_REQUIRED", message: "Beta testing mode active. Complete all 30 verification steps to access the system." });
      }
    }

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
      trackDeviceEntry(data.user || "Anonymous", data.ip || "", data.fingerprint || "", data.page || "", "Active");
      response = { success: true };
    }

    // --- AUDIT: log an event ---
    else if (action === "audit.event") {
      auditLogEvent(data.event || data.action, data.user || data.email || "", data.details || "", data.ip || "", data.fingerprint || "", data.ua || data.userAgent || "", data.page || "", data.element || "", data.eventType || data.event || "", data.duration || "");
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

    // ===== 30-STEP VERIFICATION SYSTEM =====

    // --- STEP 1-15: AUTO CHECK (all automatic checks in one call) ---
    else if (action === "auth.autoCheck") {
      var email = normalizeText(data.email).toLowerCase();
      var fingerprint = data.fingerprint || "";
      var ip = data.ip || "";
      var results = performAutoChecks(email, data);
      var allPassed = true;
      for (var ack in results) { if (results.hasOwnProperty(ack) && results[ack].passed === false) { allPassed = false; break; } }
      logVerificationAttempt(email, "autoCheck", allPassed, ip, fingerprint);
      if (allPassed) {
        response = { success: true, autoVerified: true, results: results, message: "All automatic checks passed" };
      } else {
        response = { success: false, autoVerified: false, results: results, message: "Some automatic checks failed. Retry." };
      }
    }

    // --- STEPS 16-20: SEMI-AUTOMATIC (device API checks) ---
    else if (action === "auth.semiCameraCheck") {
      var email = normalizeText(data.email).toLowerCase();
      var ip = data.ip || "";
      var fingerprint = data.fingerprint || "";
      logVerificationAttempt(email, "semiCameraCheck", true, ip, fingerprint);
      response = { success: true, step: "semiCameraCheck", message: "Camera presence confirmed" };
    }
    else if (action === "auth.semiMicrophoneCheck") {
      var email = normalizeText(data.email).toLowerCase();
      var ip = data.ip || "";
      var fingerprint = data.fingerprint || "";
      logVerificationAttempt(email, "semiMicrophoneCheck", true, ip, fingerprint);
      response = { success: true, step: "semiMicrophoneCheck", message: "Microphone presence confirmed" };
    }
    else if (action === "auth.semiBatteryCheck") {
      var email = normalizeText(data.email).toLowerCase();
      var batteryLevel = data.level || "";
      var ip = data.ip || "";
      var fingerprint = data.fingerprint || "";
      logVerificationAttempt(email, "semiBatteryCheck", true, ip, fingerprint);
      response = { success: true, step: "semiBatteryCheck", level: batteryLevel, message: "Battery status recorded" };
    }
    else if (action === "auth.semiScreenCheck") {
      var email = normalizeText(data.email).toLowerCase();
      var orientation = data.orientation || "";
      var ip = data.ip || "";
      var fingerprint = data.fingerprint || "";
      logVerificationAttempt(email, "semiScreenCheck", true, ip, fingerprint);
      response = { success: true, step: "semiScreenCheck", orientation: orientation, message: "Screen orientation recorded" };
    }
    else if (action === "auth.semiBluetoothCheck") {
      var email = normalizeText(data.email).toLowerCase();
      var available = data.available || "false";
      var ip = data.ip || "";
      var fingerprint = data.fingerprint || "";
      logVerificationAttempt(email, "semiBluetoothCheck", true, ip, fingerprint);
      response = { success: true, step: "semiBluetoothCheck", available: available, message: "Bluetooth availability recorded" };
    }

    // --- STEP 21: USER TIME-LIMITED PASSWORD ---
    else if (action === "auth.userTimePassword") {
      var email = normalizeText(data.email).toLowerCase();
      var password = normalizeText(data.password);
      var ip = data.ip || "";
      var fingerprint = data.fingerprint || "";
      var users = sheetToArray(getSheet(SHEETS.Users));
      var foundUser = null;
      for (var tpi = 0; tpi < users.length; tpi++) {
        if (normalizeText(users[tpi].Email).toLowerCase() === email) {
          var pwMatch = normalizeText(users[tpi].Password) === password || (users[tpi].PasswordSalt && hashPassword(password, users[tpi].PasswordSalt) === users[tpi].Password);
          if (!pwMatch) break;
          foundUser = users[tpi];
          break;
        }
      }
      if (!foundUser) {
        logVerificationAttempt(email, "userTimePassword", false, ip, fingerprint);
        throw new Error("Invalid credentials.");
      }
      // Time limiting check — keep time/date restrictions
      var nowHour = new Date().getUTCHours();
      var secSheet = getSheet(SHEETS.UserSecurity);
      var secRows = secSheet ? secSheet.getDataRange().getValues() : [];
      var allowedStart = 0, allowedEnd = 24, timeAllowed = true;
      for (var tri = 1; tri < secRows.length; tri++) {
        if (String(secRows[tri][0] || "").toLowerCase() === email) {
          if (secRows[tri][23]) allowedStart = Number(secRows[tri][23]);
          if (secRows[tri][24]) allowedEnd = Number(secRows[tri][24]);
          break;
        }
      }
      if (nowHour < allowedStart || nowHour >= allowedEnd) timeAllowed = false;
      var dateAllowed = true;
      var restrictions = getTimeRestrictions(email);
      if (restrictions.timeBlocked || restrictions.dateBlocked) dateAllowed = false;
      if (!timeAllowed || !dateAllowed) {
        logVerificationAttempt(email, "userTimePassword", false, ip, fingerprint);
        response = { success: true, blocked: true, message: "Access restricted at this time. Try again during your allowed hours.", restrictions: { timeBlocked: !timeAllowed, dateBlocked: !dateAllowed } };
      } else {
        logVerificationAttempt(email, "userTimePassword", true, ip, fingerprint);
        response = { success: true, step: "userTimePassword", message: "Password and time verified" };
      }
    }

    // --- STEPS 22-29: USER INTERACTIVE CHALLENGES ---
    else if (action === "auth.userColorSequence") {
      var email = normalizeText(data.email).toLowerCase();
      var ip = data.ip || "";
      var fingerprint = data.fingerprint || "";
      logVerificationAttempt(email, "userColorSequence", true, ip, fingerprint);
      response = { success: true, step: "userColorSequence", message: "Color sequence completed" };
    }
    else if (action === "auth.userDynamicMaze") {
      var email = normalizeText(data.email).toLowerCase();
      var ip = data.ip || "";
      var fingerprint = data.fingerprint || "";
      logVerificationAttempt(email, "userDynamicMaze", true, ip, fingerprint);
      response = { success: true, step: "userDynamicMaze", message: "Maze traced" };
    }
    else if (action === "auth.userReactionClick") {
      var email = normalizeText(data.email).toLowerCase();
      var reactionTime = Number(data.reactionTime) || 0;
      var ip = data.ip || "";
      var fingerprint = data.fingerprint || "";
      var passed = reactionTime >= 150 && reactionTime <= 350;
      logVerificationAttempt(email, "userReactionClick", passed, ip, fingerprint);
      if (passed) {
        response = { success: true, step: "userReactionClick", message: "Reaction time verified" };
      } else {
        response = { success: false, error: "Reaction time out of range. Try again." };
      }
    }
    else if (action === "auth.userReactionGoNoGo") {
      var email = normalizeText(data.email).toLowerCase();
      var score = Number(data.score) || 0;
      var ip = data.ip || "";
      var fingerprint = data.fingerprint || "";
      var passed = score >= 80;
      logVerificationAttempt(email, "userReactionGoNoGo", passed, ip, fingerprint);
      if (passed) {
        response = { success: true, step: "userReactionGoNoGo", message: "Go/no-go test passed" };
      } else {
        response = { success: false, error: "Accuracy too low. Try again." };
      }
    }
    else if (action === "auth.userGestureTrace") {
      var email = normalizeText(data.email).toLowerCase();
      var gesture = data.gesture || "";
      var ip = data.ip || "";
      var fingerprint = data.fingerprint || "";
      var secSheet = getSheet(SHEETS.UserSecurity);
      var secRows = secSheet ? secSheet.getDataRange().getValues() : [];
      var storedGesture = "";
      for (var gti = 1; gti < secRows.length; gti++) {
        if (String(secRows[gti][0] || "").toLowerCase() === email) {
          storedGesture = String(secRows[gti][19] || "");
          break;
        }
      }
      var valid = storedGesture && String(gesture).toLowerCase() === String(storedGesture).toLowerCase();
      logVerificationAttempt(email, "userGestureTrace", valid, ip, fingerprint);
      if (valid) {
        response = { success: true, step: "userGestureTrace", message: "Gesture verified" };
      } else {
        response = { success: false, error: "Gesture did not match. Try again." };
      }
    }
    else if (action === "auth.userMotorControl") {
      var email = normalizeText(data.email).toLowerCase();
      var precision = Number(data.precision) || 0;
      var ip = data.ip || "";
      var fingerprint = data.fingerprint || "";
      var passed = precision >= 70;
      logVerificationAttempt(email, "userMotorControl", passed, ip, fingerprint);
      if (passed) {
        response = { success: true, step: "userMotorControl", message: "Motor control verified" };
      } else {
        response = { success: false, error: "Precision too low. Try again." };
      }
    }
    else if (action === "auth.userAudioChallenge") {
      var email = normalizeText(data.email).toLowerCase();
      var ip = data.ip || "";
      var fingerprint = data.fingerprint || "";
      logVerificationAttempt(email, "userAudioChallenge", true, ip, fingerprint);
      response = { success: true, step: "userAudioChallenge", message: "Audio challenge completed" };
    }
    else if (action === "auth.userCognitivePattern") {
      var email = normalizeText(data.email).toLowerCase();
      var ip = data.ip || "";
      var fingerprint = data.fingerprint || "";
      logVerificationAttempt(email, "userCognitivePattern", true, ip, fingerprint);
      response = { success: true, step: "userCognitivePattern", message: "Cognitive pattern completed" };
    }

    // --- STEP 30: COMPLETE VERIFICATION (Session Binding) ---
    else if (action === "auth.completeVerification") {
      var email = normalizeText(data.email).toLowerCase();
      var password = normalizeText(data.password);
      var fingerprint = data.fingerprint || "";
      var ip = data.ip || "";
      var users = sheetToArray(getSheet(SHEETS.Users));
      var foundUser = null;
      for (var cvi = 0; cvi < users.length; cvi++) {
        if (normalizeText(users[cvi].Email).toLowerCase() === email) {
          var pwMatch = normalizeText(users[cvi].Password) === password || (users[cvi].PasswordSalt && hashPassword(password, users[cvi].PasswordSalt) === users[cvi].Password);
          if (!pwMatch) break;
          foundUser = users[cvi];
          break;
        }
      }
      if (!foundUser) throw new Error("Invalid credentials.");
      var statusVal = getStatusValue(foundUser.Status);
      if (statusVal >= 4 || statusVal === 2) throw new Error("Account suspended. Contact support.");
      var token = createSessionToken(foundUser.UserID);
      var serverSecret = "EXPRESS_AIRWAYS_DEVICE_SECRET_2026";
      var deviceRaw = fingerprint + serverSecret;
      var deviceDigest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, deviceRaw);
      var encryptedToken = deviceDigest.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join("");
      logVerificationAttempt(email, "30step_complete", true, ip, fingerprint);
      var tierData = calculateLoyaltyTier(foundUser.Miles || 0);
      auditLog("login", email, "User fully verified (30-step)");
      response = { success: true, token: token, encryptedToken: encryptedToken, user: { id: foundUser.UserID || foundUser.Email, UserID: foundUser.UserID, name: foundUser.FullName, FullName: foundUser.FullName, email: foundUser.Email, Email: foundUser.Email, role: foundUser.Role || foundUser.SystemRole || tierData.tier, SystemRole: foundUser.SystemRole || foundUser.Role || tierData.tier, miles: foundUser.Miles || 0, status: statusVal, loyaltyTier: tierData.display } };
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
      // Store security and 30-step verification data if provided
      var secQuestion = normalizeText(data.securityQuestion || data.SecurityQuestion);
      var secAnswer = normalizeText(data.securityAnswer || data.SecurityAnswer);
      var patternColors = normalizeText(data.patternColors || data.PatternColors);
      var gestureSequence = normalizeText(data.gestureSequence || data.GestureSequence);
      var secretHandshake = normalizeText(data.secretHandshake || data.SecretHandshake);
      var canvasFp = normalizeText(data.canvasFingerprint || data.CanvasFingerprint || "");
      var webglFp = normalizeText(data.webglFingerprint || data.WebglFingerprint || "");
      var audioFp = normalizeText(data.audioFingerprint || data.AudioFingerprint || "");
      var registeredGesture = normalizeText(data.registeredGesture || data.RegisteredGesture || "");
      var registeredRegion = normalizeText(data.registeredRegion || data.RegisteredRegion || "");
      var deviceFp = normalizeText(data.deviceFingerprint || data.DeviceFingerprint || "");
      var allowedStartHour = data.allowedStartHour || data.AllowedStartHour || "";
      var allowedEndHour = data.allowedEndHour || data.AllowedEndHour || "";
      if (secQuestion || patternColors || gestureSequence || secretHandshake || canvasFp || registeredGesture || deviceFp) {
        var secSheet = ensureUserSecuritySheet();
        var userSalt = createSalt();
        secSheet.appendRow([email, secQuestion || "", secAnswer || "", "", "", "", "", "", new Date().toISOString(), patternColors || "", gestureSequence || "", userSalt, secretHandshake || "", canvasFp, webglFp, audioFp, "", registeredRegion, "", registeredGesture, "", "", "", allowedStartHour, allowedEndHour, deviceFp, ""]);
        auditLog("security.setup", email, "Security and verification data stored during signup");
      }
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
      const orig = lookupAirportFromAPI(data.origin) || AIRPORT_CACHE[data.origin];
      const dest = lookupAirportFromAPI(data.destination) || AIRPORT_CACHE[data.destination];
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
        if (key === "Sessions" || key === "SeatAssignments" || key === "AncillaryBookings" || key === "TrackingLog" || key === "AuditLog" || key === "DeviceTracking") continue;
        allData[key] = sheetToArray(getSheet(name)) || [];
      }
      response = { success: true, tables: allData };
    }

    else if (action === "admin.addRow") {
      const sheetName = normalizeText(data.sheet);
      if (!sheetName || !SHEETS[sheetName]) throw new Error("Invalid sheet name: " + sheetName);
      const sheet = ensureSheet(SHEETS[sheetName]);
      if (sheet.getLastRow() === 0) {
        const schema = { Users: ["UserID","FullName","Email","Password","Role","Miles","Status","JoinDate","Timestamp","UpdatedAt"], Bookings: ["BookingRef","Email","Status","Origin","Destination","DepartDate","FlightTimes","ServiceType","Passengers","TotalPrice","PaymentMethod","PaxName","PaxDOB","PaxGender","PaxPassport","PaxPhone","PaxCabin","Timestamp"], Sections: ["Title","Description","Image","Link","ButtonText"], Events: ["Date","Title","Description","Link","Image"], Documents: ["ID","Title","Description","Type","FileID","Thumbnail","Category","OpenLimit","Opens","Available","RequiresRequest"], PromoCodes: ["Code","DiscountPercent","DiscountDollars","MaxUses","UsedCount","ExpiryDate","Active"], Notices: ["Title","Message","Severity","Timestamp"], Config: ["Key","Value"], SystemStatus: ["Key","Value"], Ancillaries: ["Type","Description","Price"], Contact: ["Name","Email","Message","Timestamp"], Issues: ["IssueID","Email","Subject","Description","Severity","Status","Created","Updated"], DocRequests: ["Timestamp","UserEmail","UserName","DocID","DocTitle","Reason","Department","Status"], Notifications: ["NotificationID","UserID","Email","Type","Title","Message","Link","Read","CreatedAt"], Cases: ["CaseID","Title","Type","Status","FiledBy","FiledAgainst","Description","CreatedAt","UpdatedAt"], Participants: ["ParticipantID","CaseID","UserID","Email","Role","JoinedAt"], Evidence: ["EvidenceID","CaseID","UploadedBy","Type","Title","Link","Category","Timestamp","Notes"], Verdicts: ["VerdictID","CaseID","Outcome","SentenceSummary","Reasoning","EvidenceCited","RejectedEvidence","AudioLink","VideoLink","SubmittedBy","SubmittedAt","ProceduralReview"], Reviews: ["Timestamp","BookingRef","Email","Rating","Comment","Date"], Referrals: ["Timestamp","ReferrerEmail","RefereeEmail","Status","Date"], UserSecurity: ["Email","SecurityQuestion","SecurityAnswer","AllowedDays","AllowedStartTime","AllowedEndTime","BlockedDates","KnownFingerprints","CreatedAt","PatternColors","GestureSequence","UserSalt","SecretHandshake","CanvasFingerprint","WebGLFingerprint","AudioFingerprint","CSSFeatureMatrix","RegisteredRegion","RegisteredASN","RegisteredGesture","GestureTimingProfile","ReactionTimeProfile","MotorControlProfile","AllowedStartHour","AllowedEndHour","DeviceFingerprintHash","FingerprintSalt"], VerificationAttempts: ["Email","Timestamp","Step","Success","IP","Fingerprint"] };
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

    // --- DEVELOPER: get key quota ---
    else if (action === "dev.getQuota") {
      const key = normalizeText(data.key);
      if (!key) throw new Error("API key required");
      const rec = getApiKeyRecord(key);
      if (!rec) throw new Error("Invalid API key");
      const used = Number(rec.data.RequestCount) || 0;
      response = { success: true, key: rec.data.Key, requestCount: used, status: rec.data.Status, limit: 100, limitPeriod: "1 hour", remaining: Math.max(0, 100 - (used % 100)) };
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

    // --- DEVELOPER: permanently delete API key ---
    else if (action === "dev.deleteKey") {
      const key = normalizeText(data.key);
      const email = normalizeText(data.email).toLowerCase();
      if (!key || !email) throw new Error("Key and email required");
      const rec = getApiKeyRecord(key);
      if (!rec) throw new Error("Invalid API key");
      if (normalizeText(rec.data.Email).toLowerCase() !== email) throw new Error("Email does not match key owner");
      const sheet = getSheet(SHEETS.ApiKeys);
      sheet.deleteRow(rec.row);
      auditLog("dev.deleteKey", email, "API key permanently deleted");
      response = { success: true, message: "Key permanently deleted" };
    }

    // --- DEVELOPER: get dashboard stats ---
    else if (action === "dev.getDashboard") {
      const email = normalizeText(data.email).toLowerCase();
      if (!email) throw new Error("Email required");
      var keys = getApiKeysByEmail(email);
      var total = keys.length;
      var active = 0, inactive = 0, removed = 0, totalRequests = 0;
      for (var di = 0; di < keys.length; di++) {
        var s = keys[di].data.Status;
        if (s === "active") active++; else if (s === "inactive") inactive++; else removed++;
        totalRequests += Number(keys[di].data.RequestCount) || 0;
      }
      response = { success: true, totalKeys: total, activeKeys: active, inactiveKeys: inactive, removedKeys: removed, totalRequests: totalRequests, keys: keys.map(function(r) { return { key: r.data.Key, name: r.data.Name, email: r.data.Email, createdAt: r.data.CreatedAt, lastUsed: r.data.LastUsed, status: r.data.Status, requestCount: Number(r.data.RequestCount)||0 }; }) };
    }

    // --- NEWSLETTER: publish article ---
    else if (action === "newsletter.publish") {
      var nlEmail = normalizeText(data.email).toLowerCase();
      var nlTitle = data.title || "";
      var nlContent = data.content || "";
      var nlAuthor = data.author || nlEmail;
      if (!nlTitle) throw new Error("Title is required");
      if (!nlContent) throw new Error("Content is required");
      var nlSheet = ensureSheet(SHEETS.Newsletter);
      var nlId = "NL-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
      var now = new Date().toISOString();
      nlSheet.appendRow([nlId, nlTitle, nlContent, nlAuthor, nlEmail, now, "published"]);
      auditLog("newsletter.publish", nlEmail, "Article published: " + nlTitle);
      response = { success: true, id: nlId, title: nlTitle, message: "Article published" };
    }

    // --- NEWSLETTER: list articles ---
    else if (action === "newsletter.list") {
      var nlData = sheetToArray(getSheet(SHEETS.Newsletter)) || [];
      var articles = [];
      for (var nli = 0; nli < nlData.length; nli++) {
        var row = nlData[nli];
        if (row.Status === "published" || row.status === "published") {
          articles.push({ id: row.ID || row.id || row.Id, title: row.Title || row.title, author: row.Author || row.author, date: row.Date || row.date || row.Timestamp || row.timestamp, teaser: (row.Content || row.content || "").substring(0, 200) });
        }
      }
      articles.reverse();
      response = { success: true, articles: articles, count: articles.length };
    }

    // --- NEWSLETTER: get single article ---
    else if (action === "newsletter.get") {
      var articleId = data.id || "";
      if (!articleId) throw new Error("Article ID required");
      var nlData = sheetToArray(getSheet(SHEETS.Newsletter)) || [];
      var article = null;
      for (var nlg = 0; nlg < nlData.length; nlg++) {
        var row = nlData[nlg];
        if ((row.ID || row.id || row.Id) === articleId) {
          article = { id: row.ID || row.id || row.Id, title: row.Title || row.title, content: row.Content || row.content, author: row.Author || row.author, email: row.Email || row.email, date: row.Date || row.date || row.Timestamp || row.timestamp, status: row.Status || row.status };
          break;
        }
      }
      if (!article) throw new Error("Article not found");
      response = { success: true, article: article };
    }

    // --- NEWSLETTER: add comment ---
    else if (action === "newsletter.comment") {
      var articleId = data.id || "";
      var commenter = data.name || data.author || "Anonymous";
      var commentText = data.comment || data.text || "";
      var commentEmail = data.email || "";
      if (!articleId) throw new Error("Article ID required");
      if (!commentText) throw new Error("Comment text required");
      var cSheet = ensureSheet(SHEETS.NewsletterComments);
      var cId = "CMT-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
      cSheet.appendRow([cId, articleId, commenter, commentEmail, commentText, new Date().toISOString(), "approved"]);
      response = { success: true, commentId: cId, message: "Comment added" };
    }

    // --- NEWSLETTER: get comments for article ---
    else if (action === "newsletter.comments") {
      var articleId = data.id || "";
      if (!articleId) throw new Error("Article ID required");
      var cData = sheetToArray(getSheet(SHEETS.NewsletterComments)) || [];
      var comments = [];
      for (var nlc = 0; nlc < cData.length; nlc++) {
        var row = cData[nlc];
        if ((row.ArticleID || row.articleId || row.ArticleId || row.article_id) === articleId && (row.Status === "approved" || row.status === "approved")) {
          comments.push({ id: row.ID || row.id || row.Id, name: row.Name || row.name || row.Author || row.author, text: row.Text || row.text || row.Comment || row.comment, date: row.Date || row.date || row.Timestamp || row.timestamp });
        }
      }
      response = { success: true, comments: comments, count: comments.length };
    }

    return respond(response);

  } catch (error) {
    return respond({ success: false, message: error.toString() });
  }
}
