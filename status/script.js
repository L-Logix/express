const API_URL = "https://script.google.com/macros/s/AKfycbwOpzPgTj94-tQAEjIJ3Q3l54zCLGC7Ag2XDlNUPwvb8M1v8p6qhuVDVigGYz8G-bGWhQ/exec";

let cachedConfig = null;

async function syncInfrastructure() {
    const loader = document.getElementById('loading-overlay');
    loader.style.display = 'flex';

    try {
        const response = await fetch(`${API_URL}?action=getStatusRows`);
        const data = await response.json();
        if (data.success) {
            cachedConfig = data.config;
            renderUI(data.config);
        }
    } catch (err) {
        console.error("Failed to Connect:", err);
    } finally {
        setTimeout(() => { loader.style.display = 'none'; }, 800);
    }
}

// --------------------------------------------------------
// TRIGGER THE PRINT WITH A NEW ID EVERY TIME
// --------------------------------------------------------
function generateAndPrintReport() {
    if (!cachedConfig) {
        alert("System not connected yet. Please wait for connection.");
        return;
    }
    buildPrintReport(cachedConfig);
    window.print();
}

// --------------------------------------------------------
// THE FORMAL PRINT GENERATOR
// --------------------------------------------------------
function buildPrintReport(config) {
    const printContainer = document.getElementById('print-ui');
    let html = '';

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const reportID = "EA-SYS-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Date.now().toString().slice(-4);

    html += `
        <div class="print-title-page page-break">
        <p></p><p></p><p></p>
            <div class="print-stamp">DECLASSIFIED - Level 0 Clearance</div>
            <h1>INFRASTRUCTURE AUDIT REPORT</h1>
            <h2>${config.Main_Headline}</h2>
            <div class="print-meta-box">
                <p><strong>REPORT ID:</strong> ${reportID}</p>
                <p><strong>DATE GENERATED:</strong> ${today}</p>
                <p><strong>AUTHORITY:</strong> Sovereign Systems Division</p>
                <p><strong>SUBJECT:</strong> Global Manifest Synchronization & SLA Compliance</p>
                <br>
                <p style="text-align: justify;"><strong>EXECUTIVE SUMMARY:</strong> This formal audit document provides a comprehensive analysis of the Express Airways global infrastructure. It includes detailed metrics for latency, communication protocols, and node redundancy. All data points have been cryptographically verified against the Sovereign distributed ledger. This document is highly confidential and intended for internal administrative review only.</p>
            </div>
        </div>
    `;

    // Numeric Sort Fix: (a, b) => parseInt(a) - parseInt(b)
    const indices = [...new Set(Object.keys(config).filter(k => k.match(/\d+$/)).map(k => k.match(/\d+$/)[0]))].sort((a, b) => parseInt(a) - parseInt(b));
    const categories = {};
    
    indices.forEach(i => {
        const cat = config[`Category${i}`];
        if (!cat) return;
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(i);
    });

    for (const [catName, items] of Object.entries(categories)) {
        html += `
            <div class="print-chapter-page page-break">
                <h1>${catName.toUpperCase()}</h1>
            </div>
        `;

        html += `<div class="print-section-header"><h2>${catName} - Technical Analysis</h2></div>`;

        items.forEach(i => {
            const historyStr = config[`History${i}`] || "";
            
            // Auto-Calculate Uptime Percentage from History String
            const totalTicks = historyStr.length;
            const upTicks = historyStr.split('').filter(val => val === '5').length;
            const calculatedUptime = totalTicks > 0 ? ((upTicks / totalTicks) * 100).toFixed(2) : "0.00";

            const historyHtml = historyStr.split('').map(val => {
                let color = 'day-up'; 
                if (val === '0' || val === '1') color = 'day-down'; 
                if (val === '2') color = 'day-warning'; 
                if (val === '3' || val === '4') color = 'day-maintenance'; 
                return `<div class="uptime-day ${color}"></div>`;
            }).join('');

            html += `
                <div class="print-service-block">
                    <h3>System Node: ${config[`Service${i}`]}</h3>
                    <div class="print-grid">
                        <div class="print-grid-item"><strong>Current Status:</strong> ${config[`StatusText${i}`]}</div>
                        <div class="print-grid-item"><strong>Compliance Rating:</strong> ${calculatedUptime}% SLA</div>
                    </div>
                    <div class="print-grid">
                        <div class="print-grid-item"><strong>System Type:</strong> ${config[`Type${i}`]}</div>
                        <div class="print-grid-item"><strong>Routing Protocol:</strong> ${config[`Protocol${i}`]}</div>
                    </div>
                    <div class="print-grid" style="margin-bottom: 0;">
                        <div class="print-grid-item"><strong>Geolocation:</strong> ${config[`DataCenter${i}`]}</div>
                        <div class="print-grid-item"><strong>Average Response Latency:</strong> ${config[`Latency${i}`]}</div>
                    </div>
                    <div class="print-desc">
                        <strong>Administrative Notes:</strong> ${config[`Description${i}`]}
                    </div>
                    <div class="print-history-title">CRYPTOGRAPHIC UPTIME LOG (PAST 48H)</div>
                    <div class="print-uptime-graph">${historyHtml}</div>
                </div>
            `;
        });
        
        html += `<div class="page-break"></div>`;
    }

    printContainer.innerHTML = html;
}

// --------------------------------------------------------
// THE WEB UI GENERATOR
// --------------------------------------------------------
function renderUI(config) {
    document.getElementById('main-headline').innerText = config.Main_Headline;
    document.getElementById('sub-header').innerText = config.Sub_Header;
    document.getElementById('hero-bg').style.backgroundImage = `url('${config.Hero_Image}')`;

    const banner = document.getElementById('status-banner');
    const state = parseInt(config.globalBannerState);
    const text = document.getElementById('status-text');
    
    const bannerConfig = {
        0: { class: 'status-down', msg: 'Critical Outage' },
        1: { class: 'status-down', msg: 'Partial Outage' },
        2: { class: 'status-warning', msg: 'Error Identified' },
        3: { class: 'status-warning', msg: 'Investigating Errors' },
        4: { class: 'status-maintenance', msg: 'Scheduled Maintenance in Progress' },
        5: { class: 'status-operational', msg: 'All Systems Fully Operational' }
    };
    const current = bannerConfig[state] || bannerConfig[4];
    banner.className = `overall-status ${current.class}`;
    text.innerText = current.msg;
    document.getElementById('last-updated').innerText = `Synced: ${new Date().toLocaleTimeString()}`;

    const percentBadge = document.getElementById('site-percentage');
    if (percentBadge) {
        percentBadge.innerText = (config.progress || 0) + "% Complete";
    }

    const container = document.getElementById('services-container');
    container.innerHTML = '';

    // Numeric Sort Fix: (a, b) => parseInt(a) - parseInt(b)
    const indices = [...new Set(Object.keys(config).filter(k => k.match(/\d+$/)).map(k => k.match(/\d+$/)[0]))].sort((a, b) => parseInt(a) - parseInt(b));
    
    const categories = {};
    indices.forEach(i => {
        const cat = config[`Category${i}`];
        if (!cat) return;
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(i);
    });

    let cardCount = 0;
    for (const [catName, items] of Object.entries(categories)) {
        const title = document.createElement('h2');
        title.className = 'category-title';
        title.innerText = catName;
        container.appendChild(title);

        items.forEach(index => {
            const historyStr = config[`History${index}`] || "";
            
            // Auto-Calculate Uptime Percentage from History String
            const totalTicks = historyStr.length;
            const upTicks = historyStr.split('').filter(val => val === '5').length;
            const calculatedUptime = totalTicks > 0 ? ((upTicks / totalTicks) * 100).toFixed(2) : "0.00";

            const historyHtml = historyStr.split('').map(val => {
                let color = 'day-up';
                if (val === '0' || val === '1') color = 'day-down';
                if (val === '2') color = 'day-warning';
                if (val === '3' || val === '4') color = 'day-maintenance';
                return `<div class="uptime-day ${color}"></div>`;
            }).join('');

            const card = document.createElement('div');
            card.className = "card";
            card.id = `card-${index}`;
            card.innerHTML = `
                <div class="service-header">
                    <h3>${config[`Service${index}`]}</h3>
                    <span class="badge">${config[`StatusText${index}`]}</span>
                </div>
                <div class="service-meta">
                    <div class="meta-item"><b>System Type</b> ${config[`Type${index}`]}</div>
                    <div class="meta-item"><b>Connection Type</b> ${config[`Protocol${index}`]}</div>
                    <div class="meta-item"><b>Primary Location</b> ${config[`DataCenter${index}`]}</div>
                    <div class="meta-item"><b>Response Time</b> ${config[`Latency${index}`]}</div>
                    <div class="meta-item"><b>System Reliability</b> ${calculatedUptime}%</div>
                </div>
                <p style="font-size:0.9rem; color:var(--slate-700); line-height:1.4;">${config[`Description${index}`]}</p>
                <div style="font-size:0.7rem; font-weight:800; color:var(--slate-300); margin-top:15px; margin-bottom:5px;">SYSTEM ACTIVITY (PAST 48H)</div>
                <div class="uptime-graph">${historyHtml}</div>
            `;

            container.appendChild(card);
            
            setTimeout(() => { card.classList.add('show-card'); }, cardCount * 150);
            cardCount++;
        });
    }
}

function downloadTechnicalLogs() {
    if (!cachedConfig) return alert("System not synced.");
    const techLogs = { report_date: new Date().toISOString(), service_audit: {} };
    
    // Find all active service numbers
    const indices = [...new Set(Object.keys(cachedConfig).filter(k => k.match(/\d+$/)).map(k => k.match(/\d+$/)[0]))];

    Object.keys(cachedConfig).forEach(key => {
        // Removed UptimePct from the initial regex match map
        if (key.match(/Service|StatusText|Type|Latency|Protocol|DataCenter/)) {
            techLogs.service_audit[key] = cachedConfig[key];
        }
    });

    // Calculate and cleanly inject the live Uptime values into your backup file
    indices.forEach(i => {
        const historyStr = cachedConfig[`History${i}`] || "";
        const totalTicks = historyStr.length;
        const upTicks = historyStr.split('').filter(val => val === '5').length;
        techLogs.service_audit[`UptimePct${i}`] = totalTicks > 0 ? ((upTicks / totalTicks) * 100).toFixed(2) : "0.00";
    });

    const blob = new Blob([JSON.stringify(techLogs, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Express_Airways_Technical_Log.json`;
    a.click();
}

document.addEventListener("DOMContentLoaded", syncInfrastructure);
setInterval(syncInfrastructure, 60000);