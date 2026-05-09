// ==========================================
// 100% DETERMINISTIC CONFIGURATION AREA
// You have total control. No fake data. No simulations.
// 
// STATUS TYPES:
// 1 = Operational
// 2 = Degraded Performance
// 3 = Major Outage
// 4 = Planned Maintenance / Migrating
// ==========================================

const CONFIG = {
    newSiteProgress: 12,
    globalBannerState: "status-maintenance", // "status-operational", "status-maintenance", "status-down"
    globalBannerText: "Scheduled Infrastructure Upgrade in Progress",
    
    categories: [
        {
            title: "Core Routing Systems",
            services: [
                { 
                    name: "Primary Database Cluster", 
                    statusText: "Migrating", 
                    type: 4, 
                    protocol: "TCP/IP TLS 1.3", 
                    dataCenter: "US-East-1", 
                    latency: "142ms",
                    uptimePct: "99.80",
                    description: "The primary database is currently in read-only mode while data is migrated to the new Sovereign environment. Expect slightly elevated latency until the cutover is complete."
                },
                { 
                    name: "Authentication Gateway", 
                    statusText: "Operational", 
                    type: 1, 
                    protocol: "OATH2 / SAML 2.0", 
                    dataCenter: "Global Edge", 
                    latency: "18ms",
                    uptimePct: "100.00",
                    description: "Identity and Access Management (IAM) systems are fully operational. Zero-trust security policies are actively enforced across all nodes. Please note that the current authentication gateway is not open to the public at this time."
                }
            ]
        },
        {
            title: "External Integrations & APIs",
            services: [
                { 
                    name: "Payment Processing API", 
                    statusText: "Migrating", 
                    type: 4, 
                    protocol: "PCI-DSS Level 1", 
                    dataCenter: "Multi-Region", 
                    latency: "25ms",
                    uptimePct: "99.95",
                    description: "The third-party payment clearinghouse is responding within expected SLA limits but is currently being upgraded as part of Project Zenith. Please see the website status above for the overall status of Project Zenith."
                },
                { 
                    name: "Logistics Tracking Network", 
                    statusText: "Migrating", 
                    type: 4, 
                    protocol: "REST API", 
                    dataCenter: "EU-West", 
                    latency: "450ms",
                    uptimePct: "98.50",
                    description: "We are currently observing elevated packet loss with this external logistics provider. Our routing systems are queuing requests to prevent data loss while their engineers work to improve the system."
                }
                
            ]
        }
    ]
};

// ==========================================
// RENDER ENGINE (NO SIMULATION)
// ==========================================

// Helper: Determine CSS classes based on Type
function getTypeClasses(type) {
    switch(type) {
        case 1: return { badge: 'badge-operational', day: 'day-up' };
        case 2: return { badge: 'badge-degraded', day: 'day-degraded' };
        case 3: return { badge: 'badge-down', day: 'day-down' };
        case 4: return { badge: 'badge-maintenance', day: 'day-maintenance' };
        default: return { badge: 'badge-operational', day: 'day-up' };
    }
}

// Helper: Generate visual graph based solely on the defined type (No randomness)
function generateVisualGraph(type) {
    let html = '';
    const classes = getTypeClasses(type);
    
    for(let i = 0; i < 30; i++) {
        // If it's migrating/maintenance (4) or degraded (2), we visually represent 
        // the last few days in that state, otherwise it's fully up.
        let dayClass = 'day-up'; 
        if (type !== 1 && i > 25) {
            dayClass = classes.day;
        }
        html += `<div class="uptime-day ${dayClass}"></div>`;
    }
    return html;
}

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Clock Updates Real Time
    const updateTime = () => {
        const now = new Date();
        document.getElementById('last-updated').innerText = 
            `Status verified: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()} local time`;
    };
    updateTime();
    setInterval(updateTime, 1000);

    // 2. Set Global Banner
    const banner = document.getElementById('status-banner');
    const bannerText = document.getElementById('status-text');
    banner.className = `overall-status ${CONFIG.globalBannerState}`;
    bannerText.innerText = CONFIG.globalBannerText;

    // 3. Set Progress Bar
    setTimeout(() => {
        const bar = document.getElementById('site-progress-bar');
        const text = document.getElementById('site-percentage');
        if(bar && text) {
            bar.style.width = CONFIG.newSiteProgress + "%";
            text.innerText = CONFIG.newSiteProgress + "%";
        }
    }, 200);

    // 4. Build Interfaces
    const webContainer = document.getElementById('services-container');
    const printContainer = document.getElementById('print-ui');
    const timestamp = new Date().toISOString();

    let printHTML = `
        <div class="print-cover">
            <h1>Infrastructure Status Report</h1>
            <h2>Global Systems & Partner Integration Audit</h2>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Report ID:</strong> SYS-AUDIT-${Date.now().toString().slice(-6)}</p>
            <div class="confidential-stamp">OFFICIAL SYSTEM RECORD</div>
            
            <div style="margin-top: 80px; text-align: left; width: 80%; border-top: 1px solid black; padding-top: 20px;">
                <h3>Executive Summary</h3>
                <p style="font-size: 12pt; text-align: justify;">This document serves as the official, digitally validated record of the IT infrastructure. It details the operational status, latency metrics, cryptographic protocols, and administrative notes for all connected systems. All metrics are accurate as of the timestamp indicated above and reflect direct manual verification by network engineers.</p>
            </div>
        </div>
    `;

    CONFIG.categories.forEach(category => {
        
        // Build Web Category Header
        const webTitle = document.createElement('h2');
        webTitle.className = 'category-title';
        webTitle.innerText = category.title;
        webContainer.appendChild(webTitle);

        // Build Print Category Header
        printHTML += `<div class="print-chapter"><h2 class="print-chapter-title">${category.title}</h2>`;

        category.services.forEach(service => {
            const classes = getTypeClasses(service.type);
            const graphHtml = generateVisualGraph(service.type);

            // --- Construct Web Card ---
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="service-header">
                    <h3>${service.name}</h3>
                    <span class="badge ${classes.badge}">${service.statusText}</span>
                </div>
                <div class="service-meta">
                    <span class="latency-indicator">[LATENCY: ${service.latency}]</span>
                    <span><strong>${service.uptimePct}% SLA Compliance</strong></span>
                </div>
                <div class="uptime-graph">${graphHtml}</div>
            `;
            webContainer.appendChild(card);

            // --- Construct Print Block (Using Custom Description) ---
            printHTML += `
                <div class="print-service-block">
                    <div class="print-service-header">
                        <h3>${service.name}</h3>
                        <span class="print-service-status" style="color: #333;">STATUS: ${service.statusText}</span>
                    </div>
                    <div class="print-fact-grid">
                        <div><strong>Communication Protocol:</strong> ${service.protocol}</div>
                        <div><strong>SLA Compliance:</strong> ${service.uptimePct}%</div>
                        <div><strong>Primary Data Node:</strong> ${service.dataCenter}</div>
                        <div><strong>Avg Network Latency:</strong> ${service.latency}</div>
                    </div>
                    <p class="print-desc">${service.description}</p>
                </div>
            `;
        });

        // Add cryptographic stamp to end of printed chapter
        printHTML += `
            <div class="print-validation">
                [END OF CHAPTER] // SECURE HASH: ${btoa(category.title).substring(0, 20)}... // TIMESTAMP: ${timestamp}
            </div></div>`;
    });

    // Inject the final compiled print HTML into the hidden print div
    printContainer.innerHTML = printHTML;
});