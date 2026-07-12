var currentTab = 'emergency';
var systemStatus = {};

var TAB_CONFIG = [
  {id:'emergency',icon:'&#128680;',label:'Emergency Services'},
  {id:'medical',icon:'&#127973;',label:'Medical Services'},
  {id:'security',icon:'&#128737;',label:'Security'},
  {id:'fuel',icon:'&#9981;',label:'Fuel Services'}
];

document.addEventListener('DOMContentLoaded', function() {
  EA_Auth.init();
  EA_Audit.init();
  renderTabs();
  loadSystemStatus();
});

function renderTabs() {
  var html = '';
  TAB_CONFIG.forEach(function(tab) {
    var active = tab.id === currentTab ? 'active' : '';
    html += '<button class="ops-tab ' + active + '" onclick="switchTab(\'' + tab.id + '\')"><span class="tab-icon">' + tab.icon + '</span>' + tab.label + '</button>';
  });
  document.getElementById('ops-tabs').innerHTML = html;
}

function switchTab(id) {
  currentTab = id;
  renderTabs();
  renderContent();
  EA_Audit.track('tab_switch', {tab: id});
}

function loadSystemStatus() {
  fetch(BASE_API + '?action=getSystemStatus')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.status === 'success' || data.success) {
        systemStatus = data.data || data.status || {};
      }
      renderContent();
    })
    .catch(function(err) {
      console.error('[EA Ops] Status error:', err);
      renderContent();
    });
}

function renderContent() {
  var container = document.getElementById('ops-content');
  switch(currentTab) {
    case 'emergency': container.innerHTML = renderEmergency(); break;
    case 'medical': container.innerHTML = renderMedical(); break;
    case 'security': container.innerHTML = renderSecurity(); break;
    case 'fuel': container.innerHTML = renderFuel(); break;
  }
}

function renderEmergency() {
  var contacts = [
    {label:'Emergency Hotline',value:'Available 24/7 — Contact local emergency services first, then notify crew'},
    {label:'Security Operations',value:'Monitored 24/7 — Report to nearest security personnel'},
    {label:'Aircraft Incident',value:'Immediate response — Follow crew and emergency personnel instructions'},
    {label:'Crisis Management',value:'Crisis team dispatch available through operations command'},
    {label:'Safety Reporting',value:'safety@expressairways.com — Anonymous reporting available'}
  ];
  var procedures = [
    {title:'Medical Emergency',text:'Contact the nearest medical facility via ground crew. Administer first aid if trained. Notify the captain immediately. Complete EMS-1 form within 24 hours.'},
    {title:'Security Threat',text:'Follow STP-101 protocol. Alert security operations immediately. Do not engage. Evacuate area if safe to do so. Wait for security personnel.'},
    {title:'Fire Emergency',text:'Activate nearest fire alarm. Evacuate according to posted evacuation plan. Contact emergency services. Do not use elevators. Proceed to assembly point.'},
    {title:'Aircraft Incident',text:'Initiate emergency response per ERP manual. Contact ATC. Alert emergency services. Deploy emergency equipment. Account for all personnel.'},
    {title:'Bomb Threat',text:'Follow BTP-201 protocol. Do not touch suspicious items. Evacuate area. Contact security immediately. Do not use radios within 100m.'}
  ];
  var html = '<div class="ops-section">';
  html += '<div class="emergency-banner"><span class="emergency-number">&#128222; EMERGENCY: 911</span><span class="emergency-label">For life-threatening emergencies, call 911 immediately</span></div>';
  html += '<p style="margin-top:12px;padding:12px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;font-weight:600;text-align:center;color:#ef4444">&#9888; Contact local emergency services for immediate assistance</p>';
  html += '<h2>&#128680; Emergency Contacts</h2><p class="subtitle">24/7 emergency contact information for all Express Airways operations</p>';
  html += '<ul class="ops-contact-list">';
  contacts.forEach(function(c) {
    html += '<li><span class="contact-label">' + c.label + '</span><span class="contact-value">' + c.value + '</span></li>';
  });
  html += '</ul></div>';
  html += '<div class="ops-section"><h2>&#128221; Emergency Procedures</h2><p class="subtitle">Standard operating procedures for emergency situations</p><div class="ops-grid">';
  procedures.forEach(function(p) {
    html += '<div class="ops-card"><span class="ops-card-icon">&#128196;</span><div class="ops-card-title">' + p.title + '</div><div class="ops-card-text">' + p.text + '</div></div>';
  });
  html += '</div></div>';
  html += '<div class="ops-section"><h2>&#128200; Current Status</h2><p class="subtitle">System-wide operational status</p><div class="ops-card"><span class="ops-card-icon">&#128200;</span><div class="ops-card-title">Operations Status: ' + (systemStatus.overall || 'ACTIVE') + '</div><div class="ops-card-text">All emergency services are fully staffed and operational. Response times are within standard benchmarks. ' + (systemStatus.message || 'No active emergencies reported.') + '</div><div class="ops-card-meta"><span class="status-dot green"></span> Last updated: ' + new Date().toLocaleTimeString() + '</div></div></div>';
  return html;
}

function renderMedical() {
  var facilities = [
    {name:'JFK Medical Center',location:'Terminal 4, JFK Airport',services:'Emergency care, pharmacy, dental, COVID-19 testing',hours:'24/7',contact:'Contact airport staff for medical assistance — Dial 911 for emergencies'},
    {name:'LAX Health Services',location:'Terminal B, LAX Airport',services:'Urgent care, travel clinic, prescriptions',hours:'05:00 - 23:00',contact:'Visit Terminal B medical office or ask any crew member for directions'},
    {name:'Heathrow Medical Centre',location:'Terminal 5, LHR Airport',services:'Full medical care, ambulance dispatch',hours:'24/7',contact:'Follow airport signs to Medical Services or ask staff for assistance'},
    {name:'Dubai Airport Clinic',location:'Terminal 3, DXB Airport',services:'Emergency care, travel medicine, pharmacy',hours:'24/7',contact:'Located in Terminal 3 — Airport staff can provide directions'},
    {name:'Singapore Medical Hub',location:'Terminal 2, SIN Airport',services:'General practice, specialist referrals',hours:'06:00 - 22:00',contact:'Visit Terminal 2 medical suite or contact ground staff'},
    {name:'Frankfurt Medical Station',location:'Terminal 1, FRA Airport',services:'Emergency services, occupational health',hours:'24/7',contact:'Contact airport operations for medical assistance'}
  ];
  var healthInfo = [
    {title:'Travel Health Guidelines',text:'Ensure vaccinations are up to date. Carry a personal first-aid kit. Stay hydrated during flights. Report any symptoms to cabin crew immediately. Review destination-specific health advisories before travel.'},
    {title:'First Aid Kits',text:'All Express Airways aircraft are equipped with comprehensive first-aid kits and AEDs. Crew members are trained in basic first aid and CPR. Kits are located in the forward and aft galleys.'},
    {title:'Medical Clearance',text:'Passengers with medical conditions requiring special assistance should complete a MEDIF form at least 48 hours before departure. Contact medical@expressairways.com for support.'},
    {title:'Quarantine Procedures',text:'Passengers showing symptoms of communicable diseases will be isolated per CDC/ICAO guidelines. Designated quarantine areas are available at all major hub airports.'}
  ];
  var html = '<div class="ops-section"><h2>&#127973; Medical Facilities</h2><p class="subtitle">Medical facilities available at major Express Airways hub airports</p><div class="ops-grid">';
  facilities.forEach(function(f) {
    html += '<div class="ops-card"><span class="ops-card-icon">&#127973;</span><div class="ops-card-title">' + f.name + '</div><div class="ops-card-text"><strong>Location:</strong> ' + f.location + '<br><strong>Services:</strong> ' + f.services + '<br><strong>Hours:</strong> ' + f.hours + '<br><strong>Contact:</strong> ' + f.contact + '</div></div>';
  });
  html += '</div></div><div class="ops-section"><h2>&#128138; Health Information</h2><p class="subtitle">Important health and safety information for passengers and crew</p><div class="ops-grid">';
  healthInfo.forEach(function(h) {
    html += '<div class="ops-card"><span class="ops-card-icon">&#128138;</span><div class="ops-card-title">' + h.title + '</div><div class="ops-card-text">' + h.text + '</div></div>';
  });
  html += '</div></div><div class="ops-section"><h2>&#128200; Current Health Alerts</h2><p class="subtitle">Active health advisories</p><div class="ops-card"><span class="ops-card-icon">&#128200;</span><div class="ops-card-title">No Active Alerts</div><div class="ops-card-text">There are currently no active health advisories or disease outbreaks affecting Express Airways operations. Standard travel health precautions are recommended.</div><div class="ops-card-meta"><span class="status-dot green"></span> Last updated: ' + new Date().toLocaleTimeString() + '</div></div></div>';
  return html;
}

function renderSecurity() {
  var procedures = [
    {title:'Access Control',text:'Biometric verification required for all restricted areas. Multi-factor authentication for system access. All access attempts are logged and monitored in real-time.'},
    {title:'Baggage Screening',text:'All baggage undergoes CTX 3D scanning. Random secondary screening for 15% of bags. Explosive trace detection on all international flights.'},
    {title:'Passenger Screening',text:'Full-body scanners at all checkpoints. Advanced imaging technology deployed. Behavioral detection officers at major hubs. Random enhanced screening.'},
    {title:'Cyber Security',text:'Zero-trust network architecture. Real-time threat monitoring. Monthly penetration testing. Mandatory security training for all employees.'},
    {title:'Cargo Security',text:'100% cargo screening. Known shipper program. Chain of custody tracking. Physical security inspections.'},
    {title:'Emergency Response',text:'Rapid response teams at all hubs. Regular drills and exercises. Coordination with local law enforcement. 24/7 security command center.'}
  ];
  var waitTimes = [
    {checkpoint:'Standard Screening',time:'8-15 min',status:'normal'},
    {checkpoint:'Priority/TSA PreCheck',time:'3-5 min',status:'low'},
    {checkpoint:'International Connections',time:'12-25 min',status:'normal'},
    {checkpoint:'Premium Lounge Access',time:'1-3 min',status:'low'},
    {checkpoint:'Crew Security Check',time:'2-5 min',status:'low'},
    {checkpoint:'Cargo Screening',time:'15-30 min',status:'normal'}
  ];
  var html = '<div class="ops-section"><h2>&#128737; Security Procedures</h2><p class="subtitle">Security protocols and procedures across all Express Airways operations</p><div class="ops-grid">';
  procedures.forEach(function(p) {
    html += '<div class="ops-card"><span class="ops-card-icon">&#128737;</span><div class="ops-card-title">' + p.title + '</div><div class="ops-card-text">' + p.text + '</div></div>';
  });
  html += '</div></div><div class="ops-section"><h2>&#128197; Current Security Wait Times</h2><p class="subtitle">Estimated wait times at major hub security checkpoints</p><div class="ops-grid">';
  waitTimes.forEach(function(w) {
    var dotClass = w.status === 'low' ? 'green' : (w.status === 'normal' ? 'yellow' : 'red');
    html += '<div class="ops-card"><span class="ops-card-icon">&#128339;</span><div class="ops-card-title">' + w.checkpoint + '</div><div class="ops-card-text"><strong>Estimated Time:</strong> ' + w.time + '</div><div class="ops-card-meta"><span class="status-dot ' + dotClass + '"></span> ' + w.status.charAt(0).toUpperCase() + w.status.slice(1) + ' volume</div></div>';
  });
  html += '</div></div><div class="ops-section"><h2>&#128200; Security Status</h2><p class="subtitle">Overall security posture</p><div class="ops-card"><span class="ops-card-icon">&#128200;</span><div class="ops-card-title">Threat Level: ELEVATED (Yellow)</div><div class="ops-card-text">Enhanced security measures are in effect. All security personnel are at full staffing. Passengers should arrive at least 3 hours before international departures and 2 hours before domestic departures. Report any suspicious activity to security personnel immediately.</div><div class="ops-card-meta"><span class="status-dot yellow"></span> Last updated: ' + new Date().toLocaleTimeString() + '</div></div></div>';
  return html;
}

function renderFuel() {
  var fuelTypes = [
    {type:'Jet A',code:'JET-A',used:'Domestic US flights',freeze:-40,price:'$2.45/gal',status:'Available',desc:'Standard kerosene-type fuel for turbine engines. Used primarily for domestic operations within the United States. Flash point: 38°C (100°F).'},
    {type:'Jet A-1',code:'JET-A1',used:'International flights',freeze:-47,price:'$2.60/gal',status:'Available',desc:'International standard kerosene-type fuel with lower freezing point. Used for all international long-haul operations. Flash point: 38°C (100°F).'},
    {type:'AVGAS 100LL',code:'100LL',used:'Piston-engine aircraft',freeze:-58,price:'$4.80/gal',status:'Limited',desc:'Low-lead aviation gasoline for piston-engine aircraft. Used for training fleet and regional turboprop operations. Contains tetraethyl lead.'},
    {type:'Sustainable Aviation Fuel',code:'SAF',used:'All fleet (blended)',freeze:-47,price:'$3.85/gal',status:'Growing',desc:'Sustainable aviation fuel produced from renewable sources. Currently blended at up to 50% with Jet A-1. Part of Express Airways sustainability initiative.'}
  ];
  var pricing = [
    {hub:'JFK (New York)',jetA:'$2.55',jetA1:'$2.70',saf:'$3.95',avgas:'$4.90'},
    {hub:'LAX (Los Angeles)',jetA:'$2.40',jetA1:'$2.55',saf:'$3.80',avgas:'$4.75'},
    {hub:'ORD (Chicago)',jetA:'$2.35',jetA1:'$2.50',saf:'$3.75',avgas:'$4.70'},
    {hub:'LHR (London)',jetA:'N/A',jetA1:'$3.10',saf:'$4.20',avgas:'N/A'},
    {hub:'DXB (Dubai)',jetA:'N/A',jetA1:'$2.85',saf:'$3.95',avgas:'N/A'},
    {hub:'SIN (Singapore)',jetA:'N/A',jetA1:'$2.90',saf:'$4.00',avgas:'N/A'}
  ];
  var html = '<div class="ops-section"><h2>&#9981; Fuel Types & Specifications</h2><p class="subtitle">Fuel types available across the Express Airways network</p><div class="ops-grid">';
  fuelTypes.forEach(function(f) {
    var fuelClass = f.code === 'JET-A' ? 'jet-a' : (f.code === 'JET-A1' ? 'jet-a1' : 'avgas');
    if (f.code === 'SAF') fuelClass = 'jet-a1';
    html += '<div class="ops-card"><span class="ops-card-icon">&#9981;</span><div class="ops-card-title">' + f.type + ' (' + f.code + ')</div><div class="ops-card-text">' + f.desc + '<br><strong>Used for:</strong> ' + f.used + '<br><strong>Freeze point:</strong> -' + Math.abs(f.freeze) + '°C<br><strong>Price:</strong> ' + f.price + '</div><span class="fuel-type ' + fuelClass + '">' + f.status + '</span></div>';
  });
  html += '</div></div><div class="ops-section"><h2>&#128176; Hub Fuel Pricing</h2><p class="subtitle">Current fuel prices per gallon at major hubs (USD)</p><div class="ops-table-wrapper">';
  html += '<table class="ops-table"><thead><tr><th>Hub</th><th>Jet A</th><th>Jet A-1</th><th>SAF</th><th>AVGAS</th></tr></thead><tbody>';
  pricing.forEach(function(p) {
    html += '<tr><td><strong>' + p.hub + '</strong></td><td>' + p.jetA + '</td><td>' + p.jetA1 + '</td><td>' + p.saf + '</td><td>' + p.avgas + '</td></tr>';
  });
  html += '</tbody></table></div></div>';
  html += '<div class="ops-section"><h2>&#128200; Fuel Operations Status</h2><p class="subtitle">Fuel supply and operations status</p><div class="ops-card"><span class="ops-card-icon">&#128200;</span><div class="ops-card-title">Fuel Supply: ADEQUATE</div><div class="ops-card-text">Fuel reserves are at 94% capacity across all hubs. No supply disruptions expected. SAF blending ratio maintained at 35% across all eligible routes. Fuel hedging program is active through Q4 2026.</div><div class="ops-card-meta"><span class="status-dot green"></span> Last updated: ' + new Date().toLocaleTimeString() + '</div></div></div>';
  return html;
}

function showLoader(show) {
  var el = document.getElementById('loader');
  if (el) {
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }
}
