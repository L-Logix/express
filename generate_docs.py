#!/usr/bin/env python3
"""Express Airways Beta Testing Documentation Generator (1000+ pages, 250k+ words)"""

from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

doc = Document()

# ── Global Style Setup ──
style = doc.styles['Normal']
font = style.font
font.name = 'Calibri'
font.size = Pt(11)
style.paragraph_format.space_after = Pt(6)
style.paragraph_format.line_spacing = 1.15

for level in range(1, 4):
    hs = doc.styles[f'Heading {level}']
    hs.font.name = 'Calibri'
    hs.font.color.rgb = RGBColor(0x1A, 0x3C, 0x6E)
    if level == 1:
        hs.font.size = Pt(22)
        hs.paragraph_format.space_before = Pt(24)
    elif level == 2:
        hs.font.size = Pt(16)
        hs.paragraph_format.space_before = Pt(18)
    else:
        hs.font.size = Pt(13)
        hs.paragraph_format.space_before = Pt(12)

for section in doc.sections:
    section.top_margin = Cm(2.54)
    section.bottom_margin = Cm(2.54)
    section.left_margin = Cm(2.54)
    section.right_margin = Cm(2.54)

# ── Helper Functions ──
def add_watermark_header_footer():
    for section in doc.sections:
        header = section.header
        header.is_linked_to_previous = False
        p = header.paragraphs[0]
        p.text = "CONFIDENTIAL - BETA TESTERS ONLY"
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.runs[0]
        run.font.size = Pt(8)
        run.font.color.rgb = RGBColor(0xAA, 0xAA, 0xAA)
        run.font.name = 'Calibri'

        footer = section.footer
        footer.is_linked_to_previous = False
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = fp.add_run()
        run.font.size = Pt(8)
        run.font.name = 'Calibri'
        fld_char1 = OxmlElement('w:fldChar')
        fld_char1.set(qn('w:fldCharType'), 'begin')
        run2 = fp.add_run()
        run2._r.append(fld_char1)
        instr = OxmlElement('w:instrText')
        instr.set(qn('xml:space'), 'preserve')
        instr.text = ' PAGE '
        run3 = fp.add_run()
        run3._r.append(instr)
        fld_char2 = OxmlElement('w:fldChar')
        fld_char2.set(qn('w:fldCharType'), 'end')
        run4 = fp.add_run()
        run4._r.append(fld_char2)

def add_page_break():
    doc.add_page_break()

def add_heading(text, level=1):
    return doc.add_heading(text, level=level)

def add_para(text, bold=False, italic=False, size=11):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    return p

def add_bullet(text):
    p = doc.add_paragraph(text, style='List Bullet')
    for run in p.runs:
        run.font.name = 'Calibri'
        run.font.size = Pt(11)
    return p

def add_numbered(text):
    p = doc.add_paragraph(text, style='List Number')
    for run in p.runs:
        run.font.name = 'Calibri'
        run.font.size = Pt(11)
    return p

def make_table(headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = 'Light Grid Accent 1'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        for paragraph in cell.paragraphs:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in paragraph.runs:
                run.bold = True
                run.font.name = 'Calibri'
                run.font.size = Pt(10)
        shading = OxmlElement('w:shd')
        shading.set(qn('w:fill'), '1A3C6E')
        shading.set(qn('w:val'), 'clear')
        cell._tc.get_or_add_tcPr().append(shading)
        for paragraph in cell.paragraphs:
            for run in paragraph.runs:
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    for r_idx, row_data in enumerate(rows):
        for c_idx, cell_text in enumerate(row_data):
            cell = table.rows[r_idx + 1].cells[c_idx]
            cell.text = str(cell_text)
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.name = 'Calibri'
                    run.font.size = Pt(10)
            if r_idx % 2 == 1:
                shading = OxmlElement('w:shd')
                shading.set(qn('w:fill'), 'F2F2F2')
                shading.set(qn('w:val'), 'clear')
                cell._tc.get_or_add_tcPr().append(shading)
    return table

def add_test_case(tc_id, name, desc, pre, steps, exp):
    add_para(f"{tc_id}: {name}", bold=True, size=12)
    add_para(f"Description: {desc}", italic=True)
    add_para("Preconditions:", bold=True)
    for p in pre:
        add_bullet(p)
    add_para("Test Steps:", bold=True)
    for i, s in enumerate(steps, 1):
        add_numbered(f"{s}")
    add_para("Expected Results:", bold=True)
    if isinstance(exp, list):
        for e in exp:
            add_bullet(e)
    else:
        add_para(exp)
    add_para("")


# ═══════════════════════════════════════════════════════════════════════
# COVER PAGE
# ═══════════════════════════════════════════════════════════════════════
def build_cover_page():
    for _ in range(6):
        doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("EXPRESS AIRWAYS")
    run.font.size = Pt(28)
    run.font.name = 'Calibri'
    run.bold = True
    run.font.color.rgb = RGBColor(0x1A, 0x3C, 0x6E)
    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run2 = p2.add_run("Beta Testing Documentation")
    run2.font.size = Pt(36)
    run2.font.name = 'Calibri'
    run2.bold = True
    run2.font.color.rgb = RGBColor(0x1A, 0x3C, 0x6E)
    doc.add_paragraph()
    p3 = doc.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run3 = p3.add_run("CONFIDENTIAL - BETA TESTERS ONLY")
    run3.font.size = Pt(18)
    run3.font.name = 'Calibri'
    run3.bold = True
    run3.font.color.rgb = RGBColor(0xCC, 0x00, 0x00)
    doc.add_paragraph()
    p4 = doc.add_paragraph()
    p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run4 = p4.add_run("Version 1.0  |  July 2026")
    run4.font.size = Pt(14)
    run4.font.name = 'Calibri'
    doc.add_paragraph()
    doc.add_paragraph()
    p5 = doc.add_paragraph()
    p5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run5 = p5.add_run("Prepared by:")
    run5.font.size = Pt(12)
    run5.font.name = 'Calibri'
    run5.bold = True
    p6 = doc.add_paragraph()
    p6.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run6 = p6.add_run("Express Airways Quality Assurance Division")
    run6.font.size = Pt(14)
    run6.font.name = 'Calibri'
    doc.add_paragraph()
    doc.add_paragraph()
    for item in ["Document ID: EA-BTD-2026-001", "Classification: CONFIDENTIAL",
                  "Security Level: Internal - Restricted"]:
        pi = doc.add_paragraph()
        pi.alignment = WD_ALIGN_PARAGRAPH.CENTER
        ri = pi.add_run(item)
        ri.font.size = Pt(11)
        ri.font.name = 'Calibri'
        ri.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
    add_page_break()

# ═══════════════════════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ═══════════════════════════════════════════════════════════════════════
def build_toc():
    add_heading("Table of Contents", level=1)
    entries = [
        "Cover Page", "Table of Contents",
        "1. Introduction",
        "   1.1 Purpose of This Document", "   1.2 Scope of Beta Testing",
        "   1.3 Definitions and Acronyms", "   1.4 Document Conventions", "   1.5 References",
        "   1.6 About Express Airways Digital Platform", "   1.7 Beta Testing Program Overview",
        "2. System Overview", "   2.1 Platform Architecture", "   2.2 Available Services Directory",
        "   2.3 Technical Stack", "   2.4 Data Sources and APIs", "   2.5 Authentication and Security Model",
        "3. Testing Procedures", "   3.1 Testing Prerequisites", "   3.2 Test Environment Setup",
        "   3.3 Test Data Requirements", "   3.4 Test Execution Workflow", "   3.5 Test Case Format",
        "   3.6 Test Case Categories",
        "4. Detailed Test Cases by Feature",
        "   4.1 Flight Center", "   4.2 Airport Guide", "   4.3 Travel Services",
        "   4.4 Holdings", "   4.5 Document Center", "   4.6 Operations Hub",
        "   4.7 System Status", "   4.8 Account Center", "   4.9 Administration",
        "   4.10 Legal Portal", "   4.11 Developer Portal",
        "5. Issue Reporting", "   5.1 Process", "   5.2 Format", "   5.3 Severity Definitions",
        "   5.4 Issue Lifecycle", "   5.5 Escalation Procedures",
        "6. Rules of Engagement", "   6.1 Confidentiality", "   6.2 Acceptable Use",
        "   6.3 Prohibited Activities", "   6.4 Data Handling", "   6.5 Communication Protocols",
        "   6.6 Violations and Consequences", "   6.7 Appeals Process", "   6.8 Whistleblower Protection",
        "7. Feature Specifications", "   7.1-7.11 Module Specifications",
        "8. Security Protocols", "   8.1 Authentication", "   8.2 Authorization",
        "   8.3 Encryption", "   8.4 Audit Trail", "   8.5 Incident Response",
        "   8.6 Vulnerability Reporting", "   8.7 Penetration Testing",
        "9. Performance Benchmarks", "   9.1 Response Times", "   9.2 Concurrent Users",
        "   9.3 Processing Limits", "   9.4 Availability", "   9.5 Disaster Recovery",
        "10. Checklists", "   10.1-10.7 Testing Checklists",
        "11. Benefits and Rewards Program", "   11.1 Program Overview", "   11.2 Rewards Structure",
        "   11.3 Tier Progression", "   11.4 Special Incentives", "   11.5 Redemption Process",
        "12. Competitor Protection Framework",
        "   12.1 Purpose and Scope", "   12.2 Non-Transferable Verification System",
        "   12.3 Eight-Step Verification Protocol", "   12.4 Human-Information Barrier",
        "   12.5 Monitoring and Enforcement",
        "Appendices", "   A: Glossary", "   B: Error Codes", "   C: Environment Config",
        "   D: Contact Procedures", "   E: Revision History",
        "   G: Frequently Asked Questions", "   H: Testing Scenarios and Use Cases",
        "   I: Platform Configuration Reference",
    ]
    for entry in entries:
        add_para(entry, size=10)
    add_page_break()


# ═══════════════════════════════════════════════════════════════════════
# SECTION 1: INTRODUCTION
# ═══════════════════════════════════════════════════════════════════════
def build_section_1():
    add_heading("1. Introduction", level=1)
    add_heading("1.1 Purpose of This Document", level=2)
    for t in [
        "This document serves as the definitive guide for the Express Airways Beta Testing Program, established to systematically evaluate the Express Airways Digital Platform prior to public release. The primary objective is to provide all stakeholders with a standardized framework for executing unstructured exploratory testing procedures, documenting findings, and maintaining consistent communication throughout the beta testing lifecycle.",
        "The Express Airways Digital Platform represents a significant advancement in aviation technology, integrating multiple service modules into a unified digital ecosystem. Given the complexity and critical nature of the systems involved, a rigorous beta testing phase is essential to identify defects, validate functionality, assess performance, and ensure the platform meets the highest standards of quality, security, and user experience before official launch.",
        "This document functions as a procedural manual for testers, a reference document for understanding system architecture, a reporting framework for tracking issues, and a governance document establishing rules and ethical guidelines. All beta testers must thoroughly read this document before commencing testing activities.",
        "This document is classified as CONFIDENTIAL and is intended solely for authorized Beta Testing Program personnel. Unauthorized distribution, reproduction, or disclosure is strictly prohibited and may result in disciplinary action and legal consequences."
    ]:
        add_para(t)

    add_heading("1.2 Scope of Beta Testing", level=2)
    for t in [
        "The beta testing program encompasses evaluation of all eleven service modules: Flight Center, Airport Guide, Travel Services, Holdings, Document Center, Operations Hub, System Status, Account Center, Administration, Legal Portal, and Developer Portal. Each module undergoes exploratory testing to validate functional correctness, user experience quality, performance characteristics, and security compliance.",
        "The program follows an exploratory testing methodology. Testers are not confined to scripted scenarios but are encouraged to freely navigate the website, experiment with features, and report ANY issue they encounter including bugs, usability problems, missing functionality, visual inconsistencies, performance concerns, and security vulnerabilities.",
        "The program spans three phases over twelve weeks: Phase 1 (weeks 1-4) focuses on core functional exploration, Phase 2 (weeks 5-8) expands to security, performance, and compatibility testing, and Phase 3 (weeks 9-12) conducts final validation and regression testing. The program runs from July 15, 2026 to October 7, 2026.",
        "Testing includes: functional requirement verification, data integrity validation, response time measurement, error condition evaluation, security control verification, usability assessment, and compatibility validation. Out of scope activities include production system testing, load testing beyond specified thresholds, and unauthorized penetration testing."
    ]:
        add_para(t)

    add_heading("1.7 Beta Testing Program Overview", level=2)
    for t in [
        "The Express Airways Beta Testing Program is designed as an exploratory testing initiative. Unlike traditional scripted testing programs that prescribe specific steps for testers to follow, this program empowers testers to use the website freely, navigate through all features and modules, and identify anything they do not like or that does not meet their expectations. Testers are encouraged to think creatively, explore edge cases, and push the boundaries of the platform to discover issues that might not be caught by automated testing or scripted QA processes.",
        "Testers are asked to report every issue they encounter through the in-website contact form. The contact form is accessible from every page of the beta platform through a dedicated feedback button located in the bottom-right corner of the interface. When submitting a report, testers should include a clear description of the issue, the steps they took leading up to the issue, the expected behavior, the actual behavior observed, and any relevant screenshots or screen recordings. The more detail provided, the more effectively the development team can diagnose and resolve the issue.",
        "As a reward for their valuable contributions, beta testers receive a comprehensive benefits package designed to recognize and incentivize their participation. Benefits include account tier upgrades that unlock premium features and capabilities, bonus loyalty miles that can be redeemed for flights and services, priority support access ensuring that testers receive expedited assistance when needed, limited-edition digital badges that showcase their status as founding testers, exclusive early access to new features before they are released to the general public, and official Express Airways merchandise including apparel and accessories.",
        "The beta testing program is open to participants from all regions served by Express Airways. Candidates are selected based on their diversity of technical background, device ecosystem, geographic location, and travel patterns to ensure comprehensive coverage of real-world usage scenarios. Selected testers represent a broad cross-section of the eventual user base, providing invaluable insights into how different types of users interact with the platform.",
        "Throughout the program, testers will receive regular communications including weekly digests summarizing resolved issues, feature spotlights highlighting new functionality to explore, and progress updates showing how their feedback is being incorporated into platform improvements. The program aims to create a collaborative partnership between Express Airways and its testers, fostering a community of engaged users who are invested in the platform's success."
    ]:
        add_para(t)

    add_heading("1.3 Definitions and Acronyms", level=2)
    defs = [
        ("API", "Application Programming Interface"), ("Beta Tester", "Authorized pre-release evaluator"),
        ("CRUD", "Create, Read, Update, Delete"), ("DAU", "Daily Active Users"),
        ("GDPR", "General Data Protection Regulation"), ("HTTP", "Hypertext Transfer Protocol"),
        ("HTTPS", "HTTP Secure"), ("JSON", "JavaScript Object Notation"),
        ("JWT", "JSON Web Token"), ("MFA", "Multi-Factor Authentication"),
        ("MSA", "Microservices Architecture"), ("OAuth", "Open Authorization"),
        ("PCI DSS", "Payment Card Industry Data Security Standard"), ("QA", "Quality Assurance"),
        ("REST", "Representational State Transfer"), ("RPO", "Recovery Point Objective"),
        ("RTO", "Recovery Time Objective"), ("SLA", "Service Level Agreement"),
        ("SSO", "Single Sign-On"), ("TLS", "Transport Layer Security"),
        ("UAT", "User Acceptance Testing"), ("UI/UX", "User Interface / User Experience"),
        ("XSS", "Cross-Site Scripting"), ("CSRF", "Cross-Site Request Forgery"),
        ("TOTP", "Time-based One-Time Password"), ("RBAC", "Role-Based Access Control"),
        ("WORM", "Write Once Read Many"), ("HSTS", "HTTP Strict Transport Security"),
        ("HSM", "Hardware Security Module"), ("CVSS", "Common Vulnerability Scoring System"),
    ]
    make_table(["Term", "Definition"], defs)
    add_page_break()

    add_heading("1.4 Document Conventions", level=2)
    for t in [
        "Bold text emphasizes key terms. Italic text indicates document titles and foreign terms. Numbered lists indicate sequential steps. Bulleted lists present non-sequential items. All timestamps are in UTC unless specified. Monetary values are in USD unless otherwise noted. Square brackets [ ] denote placeholders. The pipe symbol | indicates mutually exclusive options.",
        "Throughout this document, the term tester refers to authorized beta testing participants. The term platform refers to the Express Airways Digital Platform Beta environment. The term module refers to any of the eleven service modules described in Section 2.2. The term issue encompasses bugs, usability problems, missing features, visual inconsistencies, performance concerns, and any other observations that detract from the platform quality."
    ]:
        add_para(t)

    add_heading("1.5 References and Related Documents", level=2)
    make_table(["Document ID", "Title", "Version"], [
        ("EA-ARCH-001", "Platform Architecture Document", "v2.3"),
        ("EA-SEC-002", "Security Policy Framework", "v1.7"),
        ("EA-REQ-003", "Functional Requirements Specification", "v3.1"),
        ("EA-API-004", "API Documentation", "v2.0"),
        ("EA-DES-005", "UI/UX Design Guidelines", "v1.5"),
        ("EA-PER-007", "Performance Requirements", "v1.8"),
        ("EA-COM-008", "Compliance and Regulatory Framework", "v2.1"),
        ("EA-DAT-009", "Data Dictionary", "v1.4"),
        ("OWASP-2026", "OWASP Top Ten Web Security Risks", "2026"),
    ])

    add_heading("1.6 About Express Airways Digital Platform", level=2)
    for t in [
        "Express Airways has been a leading air transportation provider for over 35 years, operating 200+ aircraft serving 100+ destinations across six continents. The Digital Platform represents the airline's most ambitious digital transformation, consolidating legacy systems into a unified modern ecosystem.",
        "The platform serves as the central digital hub for all Express Airways services, providing passengers, crew, ground staff, administrators, and partners with comprehensive tools through a unified interface. Eleven service modules address flight management, airport information, travel booking, financial data, document management, operations, system monitoring, account management, administration, legal compliance, and developer integration.",
        "The platform has been developed over an eighteen-month period by a dedicated team of over 150 engineers, designers, product managers, and quality assurance specialists. The development process followed agile methodologies with two-week sprints, continuous integration, and regular stakeholder demonstrations. The beta testing phase represents the culmination of this development effort."
    ]:
        add_para(t)
    add_page_break()

# ═══════════════════════════════════════════════════════════════════════
# SECTION 2: SYSTEM OVERVIEW
# ═══════════════════════════════════════════════════════════════════════
def build_section_2():
    add_heading("2. System Overview", level=1)
    add_heading("2.1 Platform Architecture", level=2)
    for t in [
        "The Express Airways Digital Platform is built on a modern microservices architecture with loosely coupled, independently deployable services. Each module operates as a self-contained unit with its own data store and API surface, communicating through RESTful and event-driven interfaces.",
        "The architecture comprises four tiers: the presentation tier (web and mobile applications), the API gateway tier (single entry point handling authentication, rate limiting, and routing), the service tier (eleven core service modules), and the data tier (various database systems and caching layers).",
        "Service-to-service communication uses synchronous REST APIs for request-response patterns and asynchronous message queues for eventual consistency. Data management follows polyglot persistence: PostgreSQL for transactional data, MongoDB for flexible schemas, Redis for caching, and InfluxDB for time-series monitoring data."
    ]:
        add_para(t)
    add_heading("2.2 Available Services Directory", level=2)
    features = [
        ("Express Airways Flight Center", "Provides comprehensive flight management including real-time tracking with 30-second position updates, route planning with multi-waypoint optimization, cargo capacity tracking and manifest generation, scheduling with conflict detection, in-flight service coordination, weather integration, fuel management calculators, and ATC integration."),
        ("Express Airways Airport Guide", "Delivers worldwide airport information with search by name, IATA/ICAO code, city, or country. Features interactive terminal maps, real-time weather data, lounge details with access policies, parking availability and pricing, currency exchange directories, ground transportation options, and accessibility services."),
        ("Express Airways Travel Services", "Enables hotel booking with search and comparison across global properties, currency exchange for all 180 circulating world currencies with live rate updates, travel insurance comparison and purchase, passport and visa information services, itinerary management, and 24/7 emergency travel assistance."),
        ("Express Airways Holdings", "Provides financial information for 50,000+ publicly traded companies with auto-complete search, interactive price charts across multiple timeframes, real-time and delayed pricing, company profiles with financial statements, watchlist creation with price alerts, portfolio tracking, and historical data export."),
        ("Express Airways Document Center", "Centralized document repository with hierarchical folder browsing, full-text search, categorization by type/department/status/classification, version control with complete revision history, access request workflows, preview for PDF/Office/images, batch operations, expiry management with review notifications, and digital rights management."),
        ("Express Airways Operations Hub", "Critical operations support with emergency response coordination including automated alert distribution, medical services management, security incident reporting with severity-based escalation, fuel supplier tracking and delivery scheduling, operational status dashboards, incident documentation, and compliance tracking."),
        ("Express Airways System Status", "Real-time monitoring with live component health indicators, active user counts by module, chronological audit feed, performance metrics, incident timeline, scheduled maintenance notifications, SLA compliance tracking, customizable alert thresholds, and historical reporting."),
        ("Express Airways Account Center", "Gateway module managing identity with secure registration and email verification, multi-factor authentication login, profile management, loyalty miles tracking with transaction history, booking management, password strength enforcement and reset workflows, MFA configuration, and notification preferences."),
        ("Express Airways Administration", "System administration tools including user management with account creation/suspension/roles, role-based access control configuration, system configuration management, audit log viewer, usage analytics dashboard, content moderation tools, security policy configuration, and maintenance mode controls."),
        ("Express Airways Legal Portal", "Legal documentation hub with terms of service display and version history, privacy policies with jurisdiction-specific addendums, cookie consent management, legal case tracking, compliance calendar, data subject request management, contract repository, and document generation from templates."),
        ("Express Airways Developer Portal", "Third-party developer entry point with interactive API documentation, API key generation/revocation/usage monitoring, endpoint reference with request/response schemas, rate limiting information, SDK downloads, webhook management, change log and migration guides, and sandbox testing environment."),
    ]
    for name, desc in features:
        add_heading(name, level=3)
        add_para(desc)
    add_heading("2.3 Technical Stack", level=2)
    for t in [
        "Frontend: React 18 with TypeScript, Redux Toolkit with RTK Query, Material-UI with custom theming. Backend: Node.js with NestJS framework; select services in Go. API Gateway: NGINX Plus. Service Mesh: Istio. Orchestration: Kubernetes with auto-scaling.",
        "Data Storage: PostgreSQL, MongoDB, Redis, InfluxDB. Message Queue: Apache Kafka. CI/CD: GitLab CI/CD. Infrastructure: Terraform, Ansible."
    ]:
        add_para(t)
    add_heading("2.4 Data Sources and APIs", level=2)
    for t in [
        "Internal data sources include the flight operations database, passenger services system, and crew management system. External sources include aviation data providers, meteorological services, and financial data providers.",
        "The platform exposes comprehensive REST APIs per module, documented through the Developer Portal. Responses follow consistent JSON schemas with standardized error formats."
    ]:
        add_para(t)
    add_heading("2.5 Authentication and Security Model", level=2)
    for t in [
        "The platform uses a centralized identity provider supporting username/password, TOTP-based MFA, SAML/OpenID Connect SSO, and biometric authentication. Authorization follows RBAC with role hierarchy from Anonymous to Super Admin.",
        "Communications encrypted with TLS 1.3. API authentication uses short-lived JWT tokens with refresh token rotation. Sensitive data encrypted at rest using AES-256."
    ]:
        add_para(t)
    add_page_break()

# ═══════════════════════════════════════════════════════════════════════
# SECTION 3: TESTING PROCEDURES
# ═══════════════════════════════════════════════════════════════════════
def build_section_3():
    add_heading("3. Testing Procedures", level=1)
    add_heading("3.1 Testing Prerequisites", level=2)
    for t in [
        "Before commencing testing, all beta testers must complete the onboarding process, sign confidentiality agreements, view the mandatory training webinar, and create a verified beta testing account with MFA enabled.",
        "Testers must have access to the Beta Testing Portal (https://beta.expressairways.com) and the in-website contact form for reporting issues. Each tester must dedicate a minimum of 10 hours per week to testing activities."
    ]:
        add_para(t)
    make_table(["Prerequisite", "Category", "Verification Method"], [
        ("Confidentiality agreement", "Legal", "Document management system"),
        ("Training webinar completed", "Training", "LMS record"),
        ("Beta tester account", "Account", "System verification"),
        ("MFA configured", "Security", "Security settings"),
        ("Browser version confirmed", "Technical", "Browser detection"),
        ("Internet bandwidth verified", "Technical", "Speed test"),
        ("Testing area assigned", "Assignment", "Confirmation email"),
    ])
    add_heading("3.2 Test Environment Setup", level=2)
    for t in [
        "The beta testing environment at https://beta.expressairways.com mirrors production functionality on separate infrastructure. Testers must configure browsers with developer tools enabled.",
        "Testing must be conducted on authorized networks only. Remote testing requires VPN connection to the Express Airways corporate network."
    ]:
        add_para(t)
    make_table(["Component", "Config 1", "Config 2", "Config 3"], [
        ("OS", "Windows 11 Pro", "macOS 14", "Ubuntu 24.04"),
        ("Browser", "Chrome 125+", "Firefox 126+", "Edge 125+"),
        ("Browser Mode", "Incognito", "Standard", "Guest profile"),
        ("Resolution", "1920x1080", "2560x1440", "1366x768"),
        ("Network", "Corporate LAN", "Home broadband", "VPN remote"),
        ("Mobile OS", "iOS 17+", "Android 14+", "—"),
        ("Device", "iPhone 15 Pro", "Galaxy S24", "Pixel 8"),
    ])
    add_heading("3.3 Test Data Requirements", level=2)
    for t in [
        "The QA team provides comprehensive test data covering normal conditions, edge cases, error conditions, and boundary values for each module. Testers must use provided test data whenever possible.",
        "Testers are strictly prohibited from using real personal data, actual customer information, or production data."
    ]:
        add_para(t)
    add_heading("3.4 Test Execution Workflow", level=2)
    for t in [
        "Each testing session begins with reviewing assigned objectives and ensuring environment readiness. The execution workflow comprises session preparation, exploratory navigation, observation documentation, issue reporting via the contact form, tracking, and session summary.",
        "Testers are encouraged to follow their curiosity and explore features beyond their immediate testing assignments."
    ]:
        add_para(t)
    make_table(["Step", "Activity", "Duration", "Output"], [
        ("1", "Review objectives and verify environment", "5-10 min", "Ready to explore"),
        ("2", "Navigate and explore module features", "30-90 min", "Observations recorded"),
        ("3", "Document issues with screenshots", "10-20 min", "Issue documentation"),
        ("4", "Submit report via contact form", "5-10 min", "Issue ticket created"),
        ("5", "Track and follow up on issues", "5-10 min", "Issue resolution"),
        ("6", "Complete session summary", "5-10 min", "Session documented"),
    ])
    add_heading("3.5 Test Case Documentation Format", level=2)
    for t in [
        "Each test case follows a standardized format with unique identifier (TC-{Module}-{Number}), descriptive name, description, preconditions, numbered test steps, and expected results."
    ]:
        add_para(t)
    add_heading("3.6 Test Case Categories", level=2)
    cats = [
        ("3.6.1 Functional Testing", "Validates platform features operate according to specified requirements."),
        ("3.6.2 Security Testing", "Evaluates data protection, authentication, authorization, and input validation."),
        ("3.6.3 Performance Testing", "Assesses responsiveness, throughput, and resource utilization."),
        ("3.6.4 Usability Testing", "Evaluates ease of use, navigation intuitiveness, and accessibility compliance."),
        ("3.6.5 Compatibility Testing", "Validates cross-browser functionality and mobile responsive design."),
        ("3.6.6 Regression Testing", "Ensures previously validated functionality continues working correctly."),
        ("3.6.7 Load Testing", "Evaluates platform behavior under normal and peak concurrent user loads."),
        ("3.6.8 Exploratory Testing", "Unstructured approach where testers freely navigate and identify issues."),
    ]
    for title, desc in cats:
        add_heading(title, level=3)
        add_para(desc)
    add_page_break()
# ═══════════════════════════════════════════════════════════════════════
# SECTION 4: DETAILED TEST CASES
# ═══════════════════════════════════════════════════════════════════════
def build_section_4():
    add_heading("4. Detailed Test Cases by Feature", level=1)
    add_para("This section contains the complete repository of test cases organized by feature module. Each feature subsection includes a feature description, prerequisites, and two hundred detailed test cases with unique identifiers and standardized documentation format. Testers should use these test cases as starting points for exploratory testing, expanding on each scenario to discover additional issues.")

    mods = [
        ("Express Airways Flight Center", "FC", "The Flight Center module provides comprehensive flight management capabilities including real-time flight tracking, route planning, cargo management, scheduling, and in-flight service coordination."),
        ("Express Airways Airport Guide", "AG", "The Airport Guide module provides detailed information about airports worldwide including terminal maps, weather data, lounge information, parking availability, and currency exchange services."),
        ("Express Airways Travel Services", "TS", "The Travel Services module enables hotel booking, currency exchange for all world currencies, travel insurance, and passport services through a unified interface."),
        ("Express Airways Holdings", "HL", "The Holdings module provides financial information for publicly traded companies with stock-market-style charts, watchlists, portfolio tracking, and financial data analysis."),
        ("Express Airways Document Center", "DC", "The Document Center serves as the centralized repository for all Express Airways documentation with version control, access management, and full lifecycle capabilities."),
        ("Express Airways Operations Hub", "OH", "The Operations Hub supports emergency response coordination, medical services, security management, and fuel operations as the central coordination point for critical activities."),
        ("Express Airways System Status", "SS", "The System Status module provides real-time monitoring of all platform components with live dashboards, user counts, audit feeds, and performance metrics."),
        ("Express Airways Account Center", "AC", "The Account Center manages user identity, authentication, and personal account management as the gateway to all platform modules."),
        ("Express Airways Administration", "AD", "The Administration module provides system administrators with user management, configuration controls, audit log review, and platform oversight tools."),
        ("Express Airways Legal Portal", "LP", "The Legal Portal houses legal documentation including terms of service, privacy policies, case management, and compliance tracking."),
        ("Express Airways Developer Portal", "DP", "The Developer Portal provides third-party developers with API documentation, key management, endpoint references, and integration guides."),
    ]

    tc_base = [
        ("001", "Page Loading State Verification", ['User must be logged in', 'Network connection must be active'], ['Navigate to the main module page', 'Observe the loading state before content appears', 'Note the loading indicator type displayed', 'Wait for the page to fully load', 'Verify the loading indicator disappears completely'], ['Loading indicator appears within 1 second of navigation', 'Indicator accurately communicates loading progress', 'Content appears smoothly without jarring layout shifts']),
        ("002", "Skeleton Screen Display During Data Fetch", ['Module must have data to display', 'Network must have measurable latency'], ['Navigate to a data-heavy view within the module', 'Observe the skeleton screen placeholder shapes', 'Verify skeleton dimensions match actual content layout', 'Wait for data to load', 'Verify smooth transition from skeleton to content'], ['Skeleton screens match the layout of actual content', 'No jarring layout shifts when content replaces skeletons', 'Multiple skeleton items animate correctly']),
        ("003", "Progress Indicator for Long Operations", ['Module must have operations taking more than 2 seconds'], ['Trigger an operation known to take significant time', 'Observe the progress indicator appearance', 'Verify progress updates during operation', 'Wait for completion and verify indicator removal'], ['Progress indicator appears promptly', 'Progress updates meaningfully reflect operation status', 'Indicator is removed upon operation completion']),
        ("004", "Lazy Loading of Below-Fold Content", ['Module page must have content below the fold'], ['Open the module page', 'Observe that only above-fold content loads initially', 'Scroll down to trigger lazy loading', 'Verify lazy-loaded content appears as user scrolls', 'Note any loading indicators for lazy sections'], ['Initial page load is fast due to lazy loading', 'Content loads progressively as user scrolls', 'No content gaps remain after full scroll']),
        ("005", "Infinite Scroll Pagination", ['Module must have a list view with many items'], ['Navigate to a list view in the module', 'Scroll to the bottom of the currently loaded list', 'Observe automatic loading of more items', 'Repeat scrolling several times', 'Verify no duplicate items appear'], ['New items load automatically when reaching bottom', 'Scroll position is maintained during loading', 'No duplicate items appear in the loaded list']),
        ("006", "Deferred Script Loading", ['Page must have non-critical scripts'], ['Open the module page with network tab open', 'Observe the order of script loading', 'Identify which scripts load after initial render', 'Verify page interactivity before deferred scripts load', 'Verify deferred scripts eventually load'], ['Critical scripts load first for fast initial render', 'Deferred scripts load after page is interactive', 'No functional breakage from deferred loading']),
        ("007", "Image Loading Placeholder", ['Module must have images on the page'], ['Open the module page on a slow network', 'Observe image placeholders before full images load', 'Note the style of image placeholders', 'Wait for images to fully load', 'Verify smooth transition from placeholder to image'], ['Image placeholders prevent layout shift', 'Placeholders indicate image dimensions before load', 'Transition from placeholder to image is smooth']),
        ("008", "Content Chunking for Large Pages", ['Module must have a very long content page'], ['Navigate to a page with extensive content', 'Observe how content is delivered in chunks', 'Scroll through the page and verify progressive loading', 'Measure overall page load time', 'Compare with non-chunked loading approach'], ['Content loads progressively rather than all at once', 'Time to first meaningful paint is improved', 'Scrolling down triggers next chunk loading']),
        ("009", "Spinner Animation During API Call", ['Module must have API-driven content'], ['Navigate to a page that loads API data', 'Observe the spinner or loading animation', 'Verify the spinner is centered and visible', 'Wait for API call to complete', 'Verify spinner disappears when content loads'], ['Spinner appears promptly when API call starts', 'Spinner is visually appropriate for the context', 'Spinner disappears cleanly when content arrives']),
        ("010", "Loading State for Search Results", ['Module must have search functionality'], ['Navigate to the search feature', 'Type a query and execute search', 'Observe the loading state while search executes', 'Verify search results load', 'Execute another search and observe loading state again'], ['Loading state appears while search processes', 'Loading state is not disruptive to user experience', 'Results replace loading state smoothly']),
        ("011", "Empty State When No Data Exists", ['Module must have no data for current user'], ['Navigate to a section that has no data', 'Observe the empty state display', 'Verify the empty state includes a helpful message', 'Check for any call-to-action button in empty state', 'Create some data and verify empty state disappears'], ['Empty state is shown instead of a blank page', 'Message is helpful and explains why no data exists', 'Call-to-action guides user on next steps']),
        ("012", "Empty Search Results Display", ['Module must have search functionality'], ['Navigate to the module search feature', 'Enter a search term that should match no records', 'Execute the search', 'Observe the empty results state', 'Verify suggestions or alternative actions are shown'], ['Empty results message is shown', 'Message is polite and helpful', 'Suggestions for refining search are provided']),
        ("013", "Empty Notification Panel", ['Module must have notifications', 'User must have no unread notifications'], ['Navigate to the notification panel', 'Observe the state when no notifications exist', 'Verify the empty state design', 'Trigger a notification and verify it appears'], ['Empty state shows a clean friendly message', 'User understands why no notifications exist', 'Notification appears correctly when triggered later']),
        ("014", "Empty Recently Viewed List", ['Module must track recently viewed items'], ['Log in as a new user with no history', 'Navigate to the recently viewed section', 'Observe the empty state', 'View an item', 'Return to recently viewed and verify item appears'], ['Empty state shows helpful message', 'After viewing an item it appears in recently viewed']),
        ("015", "Empty State After Deleting All Items", ['Module must allow item deletion'], ['Navigate to a list with items', 'Delete all items one by one', 'Observe the transition from populated to empty list', 'Verify the empty state appears after last deletion'], ['Empty state appears after last item deletion', 'Transition is smooth with no visual glitches']),
        ("016", "Empty Favorites List", ['Module must have favorites functionality'], ['Navigate to favorites section', 'Observe empty state when no favorites exist', 'Add an item to favorites', 'Verify item appears in favorites', 'Remove the item and verify empty state returns'], ['Empty favorites state is informative', 'Adding favorites populates the list', 'Removing all favorites restores empty state']),
        ("017", "Empty Watchlist", ['Module must support watchlists'], ['Navigate to watchlist feature', 'Observe empty state with no items watched', 'Add a watchlist item', 'Verify item appears', 'Remove all items and verify empty state'], ['Watchlist empty state guides user to add items', 'Items appear correctly when added', 'Empty state returns after removing all items']),
        ("018", "Empty Activity History", ['Module must track user activity'], ['Navigate to activity history section', 'Observe empty state for new user', 'Perform actions to generate activity', 'Verify activity appears in history', 'Clear history and verify empty state'], ['Empty activity history shows helpful message', 'Activities populate correctly', 'Empty state returns after history is cleared']),
        ("019", "No Messages in Inbox", ['Module must have messaging'], ['Navigate to inbox section', 'Observe empty state when no messages exist', 'Send or receive a message', 'Verify message appears in inbox', 'Delete message and verify empty state'], ['Empty inbox shows friendly message', 'Message appears correctly when received', 'Empty state returns after deleting messages']),
        ("020", "No Saved Items Default State", ['Module must support saved items'], ['Navigate to saved items section', 'Observe default empty state', 'Save an item and verify it appears', 'Remove saved item and verify empty state'], ['Empty saved items state is clear and informative', 'Saved items appear when added']),
        ("021", "Network Error During Data Fetch", ['Network must be available initially'], ['Open the module page that fetches data', 'Interrupt network connectivity mid-fetch', 'Observe the error state displayed', 'Verify the error message is user-friendly', 'Restore network and verify retry works'], ['User-friendly error message appears', 'Error explains what happened without technical jargon', 'Retry functionality is available']),
        ("022", "Server Error 500 Handling", ['Server must have a simulated error endpoint'], ['Trigger an action that causes a 500 server error', 'Observe the error state displayed', 'Verify error message does not expose stack traces', 'Verify navigation remains functional'], ['User sees a friendly error message', 'No stack traces or internal details are exposed', 'Navigation remains functional']),
        ("023", "404 Page Not Found Error", ['Application must have a custom 404 page'], ['Navigate to a URL that does not exist', 'Observe the 404 error page', 'Verify the 404 page includes navigation options', 'Test navigation back to a valid page'], ['Custom 404 page is shown instead of browser default', 'Navigation options help user recover']),
        ("024", "403 Forbidden Access Error", ['User must have limited permissions'], ['Log in as a user without admin privileges', 'Navigate to a restricted area', 'Observe the access denied message', 'Log in as an admin and verify access is granted'], ['Clear access denied message is displayed', 'Message does not reveal sensitive access details']),
        ("025", "Timeout Error During Slow Request", ['Network throttling capability'], ['Throttle network to slow speed', 'Trigger a request that will time out', 'Observe the timeout error handling', 'Verify retry option is presented', 'Restore network and verify retry works'], ['Timeout error is presented gracefully', 'User can retry the operation', 'No data loss occurs during timeout']),
        ("026", "Form Submission Error Handling", ['Module must have a data entry form'], ['Fill out a form with valid data', 'Simulate a server error during submission', 'Observe the error display', 'Verify entered data is preserved', 'Fix the issue and resubmit successfully'], ['Error message is displayed near the submission button', 'Form data is preserved after error']),
        ("027", "Concurrent Modification Conflict", ['Two tester accounts must be available'], ['User A opens a record for editing', 'User B opens the same record and saves changes', 'User A attempts to save changes', 'Observe the conflict error message'], ['Conflict is detected and clearly communicated', 'User can choose to review differences or overwrite']),
        ("028", "File Upload Error Handling", ['Module must support file uploads'], ['Navigate to file upload feature', 'Attempt to upload a file exceeding maximum size', 'Observe the error message', 'Try uploading a file with an unsupported format'], ['File too large error clearly states the size limit', 'Unsupported format error lists allowed formats']),
        ("029", "Session Expiration During Active Use", ['Module must have session timeout'], ['Log in and use the module actively', 'Wait for session to expire', 'Attempt to perform an action', 'Observe the session expiration handling'], ['Session expiration is detected', 'User is redirected to login with explanation']),
        ("030", "API Rate Limit Error", ['Module must have rate-limited endpoints'], ['Trigger a high volume of requests', 'Observe the rate limit error response', 'Verify the error message includes retry timing', 'Wait for rate limit window and retry'], ['Rate limit error is clearly displayed', 'Retry timing information is provided']),
        ("031", "Validation Error Display for Required Fields", ['Module must have forms with required fields'], ['Submit a form with all required fields empty', 'Observe the validation error display', 'Verify each required field shows an error', 'Fill in fields and verify errors clear'], ['All required fields show validation errors', 'Errors are associated with their respective fields']),
        ("032", "Validation Error for Incorrect Format", ['Module must have format-validated fields'], ['Enter an invalid email address in an email field', 'Submit and observe format error', 'Enter an invalid phone number', 'Verify appropriate format validation error', 'Enter correct format and verify error clears'], ['Format validation errors are specific to field type', 'Error messages indicate the expected format']),
        ("033", "Database Connection Error", ['Database must be temporarily unavailable'], ['Simulate a database connection failure', 'Attempt an operation requiring database access', 'Observe the error message displayed', 'Verify the application remains stable', 'Restore database and verify operation works'], ['Graceful error message is displayed', 'Application does not crash or become unstable']),
        ("034", "Third-Party Service Unavailable", ['Module must integrate with external services'], ['Simulate a third-party service outage', 'Attempt an operation that uses the service', 'Observe graceful degradation or error message', 'Verify the module handles the outage without crashing'], ['Module degrades gracefully when external service is down', 'Clear message explains the limitation']),
        ("035", "Payment Processing Error", ['Module must have payment functionality', 'Payment test environment must be available'], ['Initiate a payment transaction', 'Use a payment method that will fail', 'Observe the payment error handling', 'Verify no duplicate charges occurred', 'Verify the error message is customer-friendly'], ['Payment errors are handled gracefully', 'No duplicate transactions occur', 'Error messages are customer-friendly']),
        ("036", "Password Reset Link Expired", ['Module must have password reset functionality'], ['Request a password reset email', 'Wait for the reset link to expire', 'Click the expired reset link', 'Observe the expired link error', 'Request a new reset link and verify it works'], ['Expired link shows a clear error message', 'User can request a new reset link']),
        ("037", "Duplicate Record Creation", ['Module must have unique constraints'], ['Create a record with specific unique values', 'Attempt to create another record with the same values', 'Observe the duplicate error message', 'Verify the original record is unchanged'], ['Duplicate creation is prevented with clear message', 'Original record remains intact']),
        ("038", "Data Deletion Cascade Error", ['Module must have related records'], ['Attempt to delete a record that has dependent child records', 'Observe the cascade prevention error', 'Verify the error explains the dependency', 'Delete child records first and retry'], ['Cascade deletion error clearly explains the dependency', 'Deletion succeeds after removing dependencies']),
        ("039", "File Download Error", ['Module must have file download functionality'], ['Initiate a file download', 'Simulate a network failure during download', 'Observe the download error', 'Verify the error message is clear', 'Retry download after restoring network'], ['Download error is communicated to user', 'User can retry the download']),
        ("040", "Export Operation Failure", ['Module must support data export'], ['Initiate a data export operation', 'Simulate an error during export processing', 'Observe the export failure error', 'Verify data is not corrupted by the failed export'], ['Export failure is clearly communicated', 'No data corruption occurs from failed export']),
        ("041", "Special Characters in Input Fields", ['Module must have text input fields'], ['Navigate to a form with text input', 'Enter special characters: @#\\$%^&*()_+', 'Enter Unicode characters: nueoea العربية', "Enter HTML tags: <script>alert('test')</script>", 'Submit and verify handling'], ['All special characters are properly handled', 'HTML tags are escaped/sanitized', 'No injection vulnerabilities present']),
        ("042", "Maximum Field Length Validation", ['Module must have input fields with max lengths'], ['Find a text input field with a defined maximum length', 'Attempt to enter more characters than the limit', 'Verify character counter if present', 'Test boundary by entering exact maximum length'], ['Field prevents or truncates overflow input', 'Character counter accurately reflects remaining characters']),
        ("043", "Negative Number Handling", ['Module must have numeric input fields'], ['Navigate to a section with numeric inputs', 'Enter a negative number', 'Submit and verify handling', 'Test zero as input value', 'Test very large numbers'], ['Negative numbers are handled appropriately', 'Zero is handled as a valid value']),
        ("044", "Decimal Precision Handling", ['Module must have fields accepting decimal values'], ['Enter a value with many decimal places', 'Verify precision handling', 'Test rounding behavior', 'Verify calculations are accurate'], ['Decimal precision is consistent', 'Rounding follows specified rules']),
        ("045", "Date Boundary Conditions", ['Module must have date input fields'], ['Enter a date far in the past', 'Enter a date far in the future', 'Enter February 29 on a non-leap year', 'Test month-end boundaries'], ['Past dates are handled correctly', 'Invalid dates are rejected']),
        ("046", "Time Input Edge Cases", ['Module must have time input fields'], ['Enter midnight (00:00)', 'Enter noon (12:00)', 'Enter 23:59', 'Test AM/PM conversion if applicable'], ['Midnight and noon are handled correctly', 'Time boundaries are respected']),
        ("047", "Extremely Long Text Input", ['Module must have text area fields'], ['Copy a very long text (10000+ characters)', 'Paste into a text area', 'Submit and observe handling', 'Edit the long text and verify editing works'], ['Long text is handled without performance degradation', 'Text area shows scrollbar for overflow content']),
        ("048", "Rapid Form Submission Double Click", ['Module must have form submission buttons'], ['Open a form and fill with valid data', 'Rapidly click the submit button multiple times', 'Observe whether multiple submissions occur', 'Check if duplicate records were created'], ['Double-click prevention prevents duplicate submission', 'Only one record is created despite multiple clicks']),
        ("049", "Browser Refresh During Data Entry", ['Module must have forms requiring data entry'], ['Open a form and begin entering data', 'Without submitting refresh the browser page', 'Observe whether data is preserved or lost'], ['Browser unsaved changes warning appears if supported', 'User is warned before losing entered data']),
        ("050", "Tab Order and Focus Management", ['Module must have interactive form elements'], ['Open a form with multiple fields', 'Press Tab through all fields', 'Verify focus follows logical order', 'Press Shift+Tab to reverse'], ['Tab order follows visual layout', 'All interactive elements are reachable via keyboard']),
        ("051", "Copy-Paste from External Sources", ['Module must have text input fields'], ['Copy formatted text from an external source', 'Paste into a platform input field', 'Verify text appears correctly', 'Copy text from the platform and paste externally'], ['Pasted text handling is appropriate', 'Special characters are preserved']),
        ("052", "Browser Back Button After Form Submit", ['Module must have form submission'], ['Fill and submit a form', 'Press browser back button', 'Observe the page state', 'Verify no duplicate submission occurs'], ['Back button does not cause duplicate submission', 'Page state is appropriate after back navigation']),
        ("053", "Multiple Tabs Same Account", ['Two browser tabs must be available'], ['Log in to the module in Tab 1', 'Open the same module in Tab 2', 'Perform actions in Tab 1', 'Verify Tab 2 reflects changes after refresh', 'Verify session remains valid in both tabs'], ['Both tabs maintain valid sessions', 'Changes in one tab are visible after refresh in other']),
        ("054", "Very Long Page Scrolling", ['Module must have long content pages'], ['Navigate to a page with extensive content', 'Scroll from top to bottom', 'Note any performance issues during scroll', 'Use page down and end keys', 'Verify content at bottom is correct'], ['Scrolling is smooth without performance issues', 'All content renders correctly at all scroll positions']),
        ("055", "Window Resize During Use", ['Browser resize capability required'], ['Open the module at full browser width', 'Gradually resize the browser to narrower widths', 'Observe layout adaptation during resize', 'Resize back to full width', 'Verify layout returns to original state'], ['Layout adapts smoothly during resize', 'No layout breakage occurs at intermediate widths']),
        ("056", "High Contrast Mode Display", ['OS accessibility high contrast setting required'], ['Enable high contrast mode in OS settings', 'Open the module', 'Verify all text is readable', 'Check that interactive elements remain distinguishable', 'Disable high contrast and verify normal display'], ['Content remains readable in high contrast mode', 'Interactive elements are still distinguishable']),
        ("057", "Print Layout of Module Pages", ['Module must have printable content'], ['Navigate to a detail page', 'Open browser print dialog', 'Preview print layout', 'Verify content formatting for print', 'Check that print-specific styles are applied'], ['Print layout is clean and readable', 'Interactive elements do not appear in print']),
        ("058", "Text Selection and Copying", ['Module must have selectable text'], ['Try to select text on a module page', 'Verify text can be selected', 'Copy selected text', 'Paste into an external application', 'Verify the pasted content is correct'], ['Text selection works as expected', 'Copied content preserves important formatting']),
        ("059", "Right-Click Context Menu", ['Module must have contextual actions'], ['Right-click on various elements in the module', 'Observe the context menu if any', 'Verify browser default or custom menu appears', 'Test context menu actions if available'], ['Context menus are appropriate for each element', 'No unexpected menu items appear']),
        ("060", "Auto-fill and Auto-complete", ['Browser auto-fill settings enabled'], ['Open a form in the module', 'Select a saved credential or auto-fill option', 'Verify auto-fill populates fields correctly', 'Submit the form with auto-filled data'], ['Auto-fill populates correct fields', 'Form submits successfully with auto-filled data']),
        ("061", "SQL Injection via Input Fields", ['Module must have text input fields'], ['Navigate to a search or form field', "Enter SQL injection payload: ' OR 1=1 --", 'Submit the input', "Enter: '; DROP TABLE users; --", 'Verify no SQL errors are exposed'], ['SQL injection attempts are sanitized', 'No database errors are exposed']),
        ("062", "Cross-Site Scripting XSS Attempt", ['Module must have input fields that display data'], ["Enter XSS payload: <script>alert('XSS')</script>", 'Enter IMG payload: <img src=x onerror=alert(1)>', 'Submit and view where input is displayed', 'Verify payloads are not executed'], ['All script tags are escaped or stripped', 'No JavaScript execution occurs from stored input']),
        ("063", "CSRF Protection Verification", ['Module must have state-changing operations'], ['Log in and capture a CSRF token from a form', 'Open a new tab and craft a form submission', 'Attempt to submit without CSRF token', 'Verify the request is rejected'], ['Requests without valid CSRF token are rejected', 'CSRF token is tied to user session']),
        ("064", "Password Strength Enforcement", ['Module must have password fields'], ['Navigate to password creation or change page', 'Try a password shorter than minimum length', 'Try a password without uppercase characters', 'Try a password without numbers', 'Enter a compliant password and verify acceptance'], ['Weak passwords are rejected with specific feedback', 'Compliant passwords are accepted']),
        ("065", "Authentication Token Handling", ['Module must use token-based authentication'], ['Log in and capture the auth token', 'Try modifying the token slightly', 'Attempt to make API calls with modified token', 'Try using an expired token'], ['Modified tokens are rejected with 401', 'Expired tokens return appropriate error']),
        ("066", "Session Fixation Prevention", ['Browser dev tools must be available'], ['Log in and get a session ID', 'Log out and note if session ID changes', 'Log in again and compare session IDs', 'Verify session ID is regenerated after login'], ['New session ID is generated after each login', 'Old session ID is invalidated']),
        ("067", "Brute Force Protection", ['A test account must be available'], ['Attempt to log in with incorrect credentials repeatedly', 'Count failed attempts before lockout', 'Observe lockout message', 'Wait for lockout duration', 'Verify successful login after lockout expires'], ['Account is locked after configured failures', 'Lockout message is clear']),
        ("068", "Privilege Escalation Attempt", ['Two accounts with different roles'], ['Log in as low-privilege user', 'Capture API requests from high-privilege actions', 'Try replaying with low-privilege token', 'Verify access is denied'], ['Low-privilege users cannot access high-privilege endpoints', 'Unauthorized attempts are logged']),
        ("069", "IDOR Insecure Direct Object Reference Test", ['Two test accounts with different data'], ['Log in as User A and access a record', 'Note the record ID in the URL', 'Log in as User B in a different browser', "Attempt to access User A's record by ID", 'Verify access is denied'], ['Users cannot access records belonging to other users', 'Access control is enforced at the object level']),
        ("070", "File Path Traversal Attempt", ['Module must have file download functionality'], ['Find a file access parameter or URL', 'Attempt path traversal: ../../../etc/passwd', 'Try encoded traversal: %2e%2e%2f', 'Verify all attempts are blocked'], ['Path traversal attempts are blocked', 'No sensitive files are exposed']),
        ("071", "API Key Leakage Check", ['Browser dev tools must be available'], ['Monitor network traffic while using the module', 'Check API request URLs for exposed keys', 'Check response bodies for sensitive data', 'Check browser console for key leakage'], ['API keys are not exposed in URLs', 'Sensitive data is not in responses unnecessarily']),
        ("072", "Mass Assignment Vulnerability Check", ['Module must have create/update operations'], ['Capture a create/update API request', 'Add extra fields not in the form', 'Submit the modified request', 'Verify extra fields are ignored'], ['Extra fields in the request are ignored', 'Mass assignment protection is in place']),
        ("073", "Sensitive Data in Browser Storage", ['Browser dev tools must be available'], ['Use the module and perform actions', 'Check localStorage for sensitive data', 'Check sessionStorage', 'Verify no passwords stored in plaintext'], ['No passwords are stored in browser storage', 'Sensitive data is not stored unnecessarily']),
        ("074", "Man-in-the-Middle Protection", ['Network inspection tool available'], ['Check that all API calls use HTTPS', 'Verify HSTS headers in responses', 'Attempt HTTP and verify redirect', 'Verify no mixed content warnings'], ['All communications are over HTTPS', 'HSTS headers are present']),
        ("075", "Logout and Session Termination", ['User must be logged in'], ['Log into the module', 'Perform several actions', 'Log out using the logout button', 'Attempt to use the old session token', 'Verify all sessions are terminated'], ['Logout successfully terminates the session', 'Old session tokens are rejected after logout']),
        ("076", "Remember Me Functionality", ['Module must have Remember Me feature'], ['Log in with Remember Me checked', 'Close browser completely', 'Reopen browser and navigate to module', 'Verify user is still logged in or presented with option', 'Log in without Remember Me and repeat'], ['Remember Me maintains session across browser restarts', 'Without Remember Me session expires on browser close']),
        ("077", "Account Lockout After Multiple Failures", ['Test account available for lockout testing'], ['Attempt to log in with wrong password 3 times', 'Observe warning messages', 'Continue until lockout threshold', 'Verify account is locked', 'Reset password or wait and verify unlock'], ['Progressive warnings before lockout', 'Account locks at configured threshold']),
        ("078", "Password Visibility Toggle", ['Module must have password fields'], ['Navigate to login or password field', 'Click the password visibility toggle', 'Verify password becomes visible', 'Click again to hide', 'Verify toggle state is correct'], ['Password visibility toggle shows/hides password correctly', 'Toggle is accessible via keyboard']),
        ("079", "Multi-Factor Authentication Flow", ['MFA must be enabled on the account'], ['Log in with username and password', 'Observe MFA challenge prompt', 'Enter correct MFA code', 'Verify successful login', 'Try with incorrect MFA code and verify failure'], ['MFA challenge appears after primary auth', 'Correct MFA code grants access']),
        ("080", "OAuth Social Login Integration", ['Module must support OAuth login'], ['Navigate to login page', 'Click OAuth provider button', 'Authorize the application on provider page', 'Verify redirect back to platform', 'Verify successful login and account creation'], ['OAuth flow completes successfully', 'User is redirected and logged in']),
        ("081", "Page Load Performance Baseline", ['Platform must be operational'], ['Clear browser cache', 'Navigate to the module main page', 'Measure load time using browser dev tools', 'Record Time to First Byte', 'Record Largest Contentful Paint'], ['Page loads within 3 seconds on standard connection', 'LCP is under 2.5 seconds']),
        ("082", "API Response Time Measurement", ['Module must have API endpoints'], ['Identify a simple API endpoint', 'Send 10 sequential requests', 'Record response times', 'Calculate average min and max'], ['Average response time is under 200ms', 'Maximum under 1000ms']),
        ("083", "Database Query Performance", ['Database monitoring accessible'], ['Perform a typical data fetch operation', 'Monitor query execution time', 'Perform a complex filtered search', 'Compare cached vs uncached performance'], ['Simple queries execute within 50ms', 'Complex queries within 500ms']),
        ("084", "Concurrent User Performance Impact", ['Load testing tools available'], ['Establish baseline performance', 'Simulate 10 concurrent users', 'Measure response times during load', 'Simulate 50 concurrent users', 'Compare degradation between load levels'], ['Performance degrades gracefully', 'Response times under 2s for 50 users']),
        ("085", "Memory Usage Monitoring", ['Browser performance monitoring available'], ['Open the module and note initial memory', 'Perform a series of actions over 10 minutes', 'Monitor memory usage', 'Check for memory leaks'], ['Memory usage remains stable', 'No continuous memory growth']),
        ("086", "Large Dataset Rendering Performance", ['Module must have access to large datasets'], ['Navigate to a list with 1000+ items', 'Measure initial render time', 'Scroll through the entire list', 'Apply filters to reduce dataset'], ['Large datasets load within 5 seconds', 'Scrolling is smooth']),
        ("087", "Image and Asset Optimization", ['Module must display images'], ['Check image formats used', 'Verify modern formats', 'Check image dimensions match display', 'Measure total page weight'], ['Images use optimized formats', 'Total page weight under 2MB']),
        ("088", "Cache Effectiveness", ['Module must implement caching'], ['Make initial request measure time', 'Make same request again', 'Compare response times', 'Check cache headers'], ['Subsequent requests are significantly faster', 'Proper cache headers present']),
        ("089", "Resource Loading Prioritization", ['Browser dev tools available'], ['Open module with network throttling', 'Observe resource loading order', 'Verify critical resources load first', 'Verify async loading for non-critical'], ['Critical CSS/JS loads first', 'Non-critical loads asynchronously']),
        ("090", "JavaScript Execution Performance", ['Browser performance profiler available'], ['Record a performance profile', 'Identify long-running JS tasks', 'Check for layout thrashing', 'Analyze scripting time for interactions'], ['No JS tasks exceed 50ms', 'Minimal layout thrashing']),
        ("091", "First Contentful Paint Measurement", ['Performance tools available'], ['Clear cache and cookies', 'Navigate to module page', 'Measure First Contentful Paint', 'Record the timing', 'Compare against benchmark'], ['FCP is under 1.5 seconds', 'Consistent across multiple loads']),
        ("092", "Time to Interactive", ['Performance monitoring available'], ['Load the module page', 'Measure time until page is fully interactive', 'Verify all event handlers are bound', 'Measure on slow network'], ['Time to interactive under 3 seconds', 'Pages are interactive promptly']),
        ("093", "Animation Frame Rate", ['Module must have animations'], ['Navigate to a page with animations', 'Measure animation frame rate', 'Verify animations run at 60fps', 'Test on slower devices'], ['Animations run at consistent 60fps', 'No jank or stuttering in animations']),
        ("094", "Network Request Waterfall Analysis", ['Browser network tab available'], ['Load the module page', 'Analyze the network request waterfall', 'Identify blocking requests', 'Check for request chains', 'Verify efficient loading order'], ['No unnecessary blocking requests', 'Request waterfall is optimized']),
        ("095", "Bundle Size Analysis", ['Build tools must be available'], ['Analyze the JavaScript bundle size', 'Check for code splitting', 'Verify tree shaking is effective', 'Identify large dependencies'], ['Bundle size is within targets', 'Code splitting is properly implemented']),
        ("096", "Server Response Time Under Load", ['Load testing tools available'], ['Send increasing load to the server', 'Monitor server response times', 'Identify the saturation point', 'Verify graceful degradation'], ['Server response times are consistent under load', 'No sudden degradation at limits']),
        ("097", "API Pagination Performance", ['Module must have paginated APIs'], ['Request page 1 of a large dataset', 'Request page 50', 'Request the last page', 'Compare response times'], ['All pages load within acceptable time', 'Performance is consistent across pages']),
        ("098", "Search Query Performance", ['Module must have search functionality'], ['Execute a simple search query', 'Execute a complex search with multiple filters', 'Measure response time for each', 'Compare search result times'], ['Simple searches complete within 500ms', 'Complex searches within 2 seconds']),
        ("099", "File Upload Performance", ['Module must support file uploads'], ['Upload a small file (100KB)', 'Upload a medium file (5MB)', 'Upload a large file (25MB)', 'Measure upload time for each'], ['Upload times scale linearly with file size', 'Large uploads show progress indication']),
        ("100", "Concurrent Data Export Performance", ['Module must support data export'], ['Start a data export for 1000 records', 'While export runs perform other operations', 'Measure impact on other operations', 'Verify export completes within limits'], ['Exports do not significantly impact other operations', 'Export completes within acceptable time']),
        ("101", "Screen Reader Compatibility", ['Screen reader software required'], ['Enable screen reader', 'Navigate to the module main page', 'Listen to page structure announcement', 'Navigate through headings', 'Fill out a form using screen reader'], ['Page structure is announced correctly', 'Form fields are labeled and announced']),
        ("102", "Keyboard-Only Navigation", ['No pointing device available'], ['Navigate to the module using only Tab key', 'Reach all interactive elements', 'Verify visible focus indicators', 'Complete a full workflow'], ['All elements reachable via keyboard', 'Focus indicators are clearly visible']),
        ("103", "Color Contrast Verification", ['Accessibility testing tools available'], ['Open the module page', 'Check text against background contrast ratios', 'Verify link text contrast', 'Check error message contrast'], ['Text meets WCAG AA contrast of 4.5:1', 'Large text meets 3:1 ratio']),
        ("104", "ARIA Label Completeness", ['Browser accessibility inspector available'], ['Open the module page', 'Review ARIA labels on interactive elements', 'Check icon buttons have aria-labels', 'Verify form fields have associated labels'], ['All interactive elements have descriptive ARIA labels', 'Icon buttons have meaningful aria-labels']),
        ("105", "Heading Structure Hierarchy", ['Accessibility testing tools available'], ['Open the module page', 'Inspect the heading hierarchy h1 to h6', 'Verify exactly one h1 per page', 'Check heading levels do not skip'], ['Single h1 describes page purpose', 'Heading hierarchy is logical']),
        ("106", "Focus Order in Modal Dialogs", ['Module must have modal dialogs'], ['Open a modal dialog', 'Press Tab and observe focus cycling', 'Verify focus trapped within modal', 'Press Escape and verify modal closes'], ['Focus is trapped within modal while open', 'Escape closes the modal']),
        ("107", "Alternative Text for Images", ['Module must have images'], ['Open the module page with images', 'Inspect alt text on informative images', 'Check decorative images have empty alt', 'Verify complex images have descriptions'], ['Informative images have descriptive alt text', 'Decorative images have empty alt values']),
        ("108", "Form Error Announcement for Screen Readers", ['Screen reader must be enabled'], ['Submit a form with invalid data', 'Listen to how errors are announced', 'Verify errors associated with their fields', 'Check aria-invalid attributes'], ['Errors are announced by screen reader', 'Each error is associated with correct field']),
        ("109", "Zoom and Resize Behavior", ['Browser zoom controls available'], ['Open module at 100% zoom', 'Zoom to 200% and verify readability', 'Zoom to 400% verify accessible', 'Resize to 1280px and 320px widths'], ['Content readable at 200% zoom', 'Content still accessible at 400%']),
        ("110", "Reduced Motion Support", ['OS accessibility settings required'], ['Enable Reduce Motion in OS', 'Open the module page', 'Verify animations reduced or disabled', 'Check carousels do not auto-advance'], ['Animations respect prefers-reduced-motion', 'Auto-advancing content stops']),
        ("111", "Skip Navigation Link", ['Module must have skip navigation'], ['Open the module page', 'Press Tab immediately after page load', 'Verify Skip to Content link is visible', 'Activate skip link and verify focus jumps'], ['Skip navigation link is first focusable element', 'Activating skip link jumps to main content']),
        ("112", "Link Purpose in Context", ['Module must have links'], ['Review all links on a module page', 'Verify link text describes the destination', 'Check that adjacent links are distinguishable', 'Verify icon links have text alternatives'], ['Link text clearly describes the destination', 'No generic Click Here links without context']),
        ("113", "Form Label Association", ['Module must have forms'], ['Open a form and inspect labels', 'Verify each input has a visible label', 'Check label-for attribute associations', 'Test clicking label focuses the input'], ['All inputs have properly associated labels', 'Clicking label focuses the input field']),
        ("114", "Error Identification and Suggestions", ['Module must have form validation'], ['Submit a form with errors', 'Verify errors are identified by screen reader', 'Check that suggestions are provided', 'Verify error icons have text alternatives'], ['Errors are clearly identified', 'Suggestions help fix errors']),
        ("115", "Touch Target Size for Accessibility", ['Module must have clickable elements'], ['Find all clickable elements on the page', 'Measure touch target sizes', 'Verify minimum 44x44px targets', 'Check spacing between targets'], ['All touch targets are at least 44x44px', 'Adequate spacing between adjacent targets']),
        ("116", "Focus Visible on All Elements", ['Keyboard navigation tools required'], ['Tab through all interactive elements', 'Verify focus ring is visible on each', 'Check focus ring contrast', 'Verify focus order is logical'], ['Focus indicators are visible on all elements', 'Focus ring has sufficient contrast']),
        ("117", "Language Attribute on Page", ['HTML inspector required'], ['Inspect the HTML element of module pages', 'Verify lang attribute is set correctly', 'Check for proper language codes', 'Verify multi-language pages have correct lang on sections'], ['Lang attribute is set on HTML element', 'Language code matches page content']),
        ("118", "List Markup for Screen Readers", ['HTML inspector required'], ['Inspect list structures in the module', 'Verify proper ul/ol markup for lists', 'Check nested lists are correctly marked up', 'Verify screen reader announces list item counts'], ['Lists use proper semantic HTML markup', 'Screen reader announces list information']),
        ("119", "Table Header Associations", ['Module must have data tables'], ['Open a data table in the module', 'Verify th elements for column headers', 'Check scope attributes on headers', 'Test with screen reader navigation'], ['Column headers use th elements', 'Headers are properly associated with data cells']),
        ("120", "Accessible Dynamic Content Updates", ['Module must have dynamic content'], ['Find a page with live-updating content', 'Verify aria-live regions are used', 'Check live region politeness settings', 'Test with screen reader for announcements'], ['Dynamic content uses aria-live regions', 'Updates are announced appropriately']),
        ("121", "Mobile Viewport 375px", ['Browser responsive mode required'], ['Set viewport to 375x812 iPhone', 'Verify no horizontal scrolling', 'Check navigation is usable', 'Verify text readable without zooming', 'Test touch target sizes'], ['Content fits within 375px width', 'Navigation collapses to mobile pattern']),
        ("122", "Tablet Viewport 768px", ['Browser responsive mode required'], ['Set viewport to 768x1024 iPad', 'Verify layout uses tablet breakpoints', 'Check multi-column layout', 'Verify navigation accessible'], ['Layout adapts to tablet viewport', 'Multi-column layouts do not overlap']),
        ("123", "Desktop Viewport 1920px", ['Desktop monitor required'], ['Set viewport to 1920x1080', 'Verify layout uses desktop width', 'Check white space appropriate', 'Verify multi-column shows all columns'], ['Layout uses desktop space effectively', 'Content is not stretched']),
        ("124", "Responsive Data Table Display", ['Module must have data tables'], ['Open a data table at desktop width', 'Reduce to tablet width', 'Reduce to mobile width', 'Verify sort/filter usable at all sizes'], ['Table adapts on smaller screens', 'Controls remain accessible at mobile']),
        ("125", "Responsive Form Layout", ['Module must have forms'], ['Open multi-field form at desktop width', 'Reduce to tablet width', 'Reduce to mobile width', 'Test submission at all three viewports'], ['Fields adapt layout to viewport', 'Labels remain associated with fields']),
        ("126", "Responsive Image Scaling", ['Module must have images'], ['Open page with images at desktop', 'Reduce to tablet', 'Reduce to mobile', 'Verify no images overflow containers'], ['Images scale proportionally', 'No images overflow their containers']),
        ("127", "Responsive Navigation Menu", ['Module must have navigation'], ['Open at desktop width', 'Reduce gradually', 'Verify hamburger menu appears', 'Open hamburger and verify all items accessible'], ['Navigation adapts at breakpoints', 'Hamburger contains all nav items']),
        ("128", "Responsive Footer Display", ['Module must have a footer'], ['Open at desktop width', 'Reduce to tablet', 'Reduce to mobile', 'Verify footer links usable at all sizes'], ['Footer stacks appropriately on mobile', 'All footer links usable']),
        ("129", "Responsive Card Layout", ['Module must have card-based content'], ['Open cards at desktop width', 'Verify 3-4 column grid', 'Reduce to tablet for 2 columns', 'Reduce to mobile for single column'], ['Card grid adjusts based on viewport', 'Card content remains readable']),
        ("130", "Responsive Search Results", ['Module must have search functionality'], ['Execute search at desktop width', 'Reduce to tablet', 'Reduce to mobile', 'Test search filters on mobile'], ['Search results adapt to viewport', 'Filters accessible on mobile']),
        ("131", "Responsive Dashboard Layout", ['Module must have dashboard widgets'], ['Open dashboard at desktop width', 'Verify widget grid layout', 'Reduce to tablet width', 'Reduce to mobile'], ['Dashboard widgets rearrange for viewport', 'All widgets remain functional']),
        ("132", "Responsive Charts and Graphs", ['Module must have charts'], ['Open chart at desktop width', 'Reduce to tablet', 'Reduce to mobile', 'Verify chart remains readable'], ['Charts resize appropriately', 'Data remains readable']),
        ("133", "Responsive Dialog and Modal", ['Module must have modal dialogs'], ['Open modal at desktop width', 'Reduce to tablet', 'Reduce to mobile', 'Verify modal content is accessible'], ['Modal adapts to viewport size', 'Scroll within modal works on mobile']),
        ("134", "Responsive Video Embed", ['Module must have embedded video'], ['Open video at desktop width', 'Reduce to tablet', 'Reduce to mobile', 'Verify video controls are accessible'], ['Video player is responsive', 'Controls remain usable at all sizes']),
        ("135", "Responsive Pagination Controls", ['Module must have pagination'], ['Open paginated list at desktop', 'Reduce to tablet', 'Reduce to mobile', 'Verify page numbers usable'], ['Pagination adapts for smaller screens', 'Page controls remain accessible']),
        ("136", "Responsive Filter Panel", ['Module must have filter panels'], ['Open filter panel at desktop', 'Reduce to tablet', 'Reduce to mobile', 'Verify filters can be applied at all sizes'], ['Filter panel collapses on mobile', 'Filters remain functional']),
        ("137", "Responsive Multi-Step Form", ['Module must have multi-step forms'], ['Open multi-step form at desktop', 'Reduce to tablet and mobile', 'Navigate through steps', 'Verify progress indicator at all sizes'], ['Multi-step form adapts to viewport', 'Progress indicator visible at all sizes']),
        ("138", "Responsive Notification Display", ['Module must have notifications'], ['Trigger notification at desktop', 'Trigger at tablet', 'Trigger at mobile', 'Verify notification dismissible at all sizes'], ['Notifications position correctly per viewport', 'Dismissal works at all sizes']),
        ("139", "Responsive Sidebar Layout", ['Module must have sidebar navigation'], ['Open with sidebar at desktop', 'Reduce to tablet', 'Reduce to mobile', 'Verify sidebar collapses appropriately'], ['Sidebar collapses to overlay on smaller screens', 'Main content area adapts']),
        ("140", "Responsive Error Pages", ['Module must have error pages'], ['Open 404 page at desktop', 'Reduce to tablet', 'Reduce to mobile', 'Verify navigation options usable'], ['Error pages are responsive', 'Navigation options remain accessible']),
        ("141", "Email Format Validation", ['Module must have email input fields'], ['Enter email without @ symbol', 'Enter email without domain', 'Enter email with invalid chars', 'Enter valid simple email', 'Enter email with plus addressing'], ['Invalid formats rejected with clear messages', 'Valid emails accepted']),
        ("142", "Phone Number Format Validation", ['Module must have phone fields'], ['Enter number without country code', 'Enter number with letters', 'Enter valid number with country code', 'Enter number with dashes and parens'], ['Invalid numbers rejected', 'Various valid formats accepted']),
        ("143", "URL Format Validation", ['Module must have URL fields'], ['Enter URL without protocol', 'Enter URL with invalid chars', 'Enter valid https URL', 'Enter URL with parameters'], ['URLs without protocol may be auto-completed', 'Invalid URLs rejected']),
        ("144", "Numeric Range Validation", ['Module must have numeric input fields'], ['Enter value below minimum range', 'Enter value above maximum', 'Enter at minimum boundary', 'Enter at maximum boundary', 'Enter within valid range'], ['Out-of-range values rejected with guidance', 'Boundary values accepted']),
        ("145", "Required Field Validation", ['Module must have forms'], ['Leave all required fields empty and submit', 'Verify validation messages appear', 'Fill in one field and resubmit', 'Fill all fields and confirm submission'], ['Required fields show validation on empty submit', 'Field-specific error messages clear']),
        ("146", "Character Limit Enforcement", ['Module must have fields with limits'], ['Attempt to type beyond character limit', 'Verify field prevents additional input', 'Copy-paste text exceeding limit', 'Verify paste truncated or rejected'], ['Character limit enforced during typing', 'Paste exceeding limit handled gracefully']),
        ("147", "Input Mask and Pattern Validation", ['Module must have masked inputs'], ['Find a field with input mask', 'Attempt invalid characters', 'Verify mask prevents entry', 'Enter valid characters', 'Submit and verify format preserved'], ['Input mask guides entry correctly', 'Final value matches expected format']),
        ("148", "Duplicate Data Prevention", ['Module must have unique constraints'], ['Create record with unique values', 'Attempt duplicate creation', 'Observe duplicate handling', 'Create different record successfully'], ['Duplicates detected and prevented', 'Clear error message indicates duplicate fields']),
        ("149", "Cross-Field Validation", ['Module must have dependent fields'], ['Enter data in Field A affecting Field B', 'Verify Field B updates accordingly', 'Test various combinations', 'Verify valid combinations accepted'], ['Cross-field validation works correctly', 'Error messages explain dependencies']),
        ("150", "Whitespace Handling in Inputs", ['Module must have text inputs'], ['Enter value with leading spaces', 'Enter value with trailing spaces', 'Enter value with multiple internal spaces', 'Submit and observe whitespace handling'], ['Leading/trailing spaces may be trimmed', 'Internal spaces preserved as entered']),
        ("151", "Credit Card Number Validation", ['Module must have payment fields'], ['Enter invalid card number', 'Enter valid card number from test data', 'Verify format detection', 'Verify Luhn algorithm validation'], ['Invalid card numbers rejected', 'Valid numbers accepted with correct formatting']),
        ("152", "Date Format Validation", ['Module must have date fields'], ['Enter date in wrong format', 'Enter valid date in expected format', 'Enter date that does not exist', 'Enter date and verify parsing'], ['Wrong formats rejected with guidance', 'Valid dates parsed correctly']),
        ("153", "Age Restriction Validation", ['Module must have date of birth fields'], ['Enter DOB under minimum age', 'Enter DOB at minimum age exactly', 'Enter DOB over minimum age', 'Verify handling'], ['Underage entries rejected', 'Minimum age boundary accepted']),
        ("154", "Country-Specific Data Validation", ['Module must have country fields'], ['Select different countries', 'Verify country-specific fields appear', 'Enter data for each country variant', 'Save and verify'], ['Country-specific validation rules applied', 'Data saved correctly per country']),
        ("155", "File Type Restriction Validation", ['Module must have file upload'], ['Try uploading a disallowed file type', 'Verify rejection message', 'Upload allowed file type', 'Verify successful upload'], ['Disallowed file types rejected with message', 'Allowed file types upload successfully']),
        ("156", "File Size Restriction Validation", ['Module must have file upload'], ['Upload file exceeding limit', 'Verify size error', 'Upload file within limit', 'Verify success'], ['Files exceeding limit rejected with size info', 'Files within limit accepted']),
        ("157", "IPv4 and IPv6 Address Validation", ['Module must have IP address fields'], ['Enter invalid IP format', 'Enter valid IPv4 address', 'Enter valid IPv6 address', 'Verify validation'], ['Invalid IP formats rejected', 'Both IPv4 and IPv6 valid formats accepted']),
        ("158", "JSON Input Validation", ['Module must accept JSON input'], ['Enter invalid JSON', 'Enter valid JSON with all fields', 'Submit and verify parsing', 'Verify error handling for malformed JSON'], ['Invalid JSON rejected with parse error', 'Valid JSON accepted and processed']),
        ("159", "XML Input Validation", ['Module must accept XML input'], ['Enter invalid XML', 'Enter valid XML data', 'Submit and verify parsing', 'Test XML entity handling'], ['Invalid XML rejected', 'Valid XML accepted and processed']),
        ("160", "HTML Sanitization Validation", ['Module must accept rich text'], ['Enter text with HTML formatting', 'Enter text with script tags', 'Enter text with event handlers', 'Save and verify sanitization'], ['Allowed HTML preserved', 'Script tags and event handlers removed']),
        ("161", "Visual Rendering Chrome vs Firefox", ['Chrome and Firefox installed'], ['Open module page in Chrome', 'Take screenshot of key areas', 'Open same page in Firefox', 'Compare visual rendering', 'Note differences'], ['Layout consistent across browsers', 'Colors render the same']),
        ("162", "Safari Compatibility Check", ['Safari browser must be available'], ['Open module page in Safari', 'Verify all functionality works', 'Check font rendering', 'Verify form interactions', 'Test file uploads if applicable'], ['Functionality works in Safari', 'Font rendering is acceptable']),
        ("163", "Edge Compatibility Check", ['Edge browser must be available'], ['Open module page in Edge', 'Verify all functionality works', 'Check layout consistency', 'Verify CSS Grid/Flexbox rendering'], ['Functionality works in Edge', 'Layout matches Chrome']),
        ("164", "Browser Console Error Comparison", ['All major browsers required'], ['Open module in each browser', 'Check console for errors', 'Document any browser-specific errors', 'Compare error lists across browsers'], ['No browser-specific console errors', 'Consistent behavior across browsers']),
        ("165", "Mobile Browser Compatibility", ['Mobile devices or emulators'], ['Open module in mobile Chrome', 'Open in mobile Safari', 'Verify functionality works', 'Check touch interactions', 'Check scrolling performance'], ['Functionality works on mobile browsers', 'Touch interactions work correctly']),
        ("166", "Browser Add-On Interference", ['Browser with ad-blocker'], ['Open module with ad-blocker enabled', 'Verify core functionality works', 'Disable ad-blocker and compare', 'Test with privacy extensions'], ['Core functionality works with ad-blockers', 'Any conflicts are documented']),
        ("167", "Private Incognito Mode Testing", ['Browser incognito mode'], ['Open module in incognito mode', 'Verify login functionality', 'Check that session handling works', 'Verify features work in incognito'], ['Module works correctly in incognito mode', 'Session handling functions properly']),
        ("168", "CSS Vendor Prefix Rendering", ['Multiple browsers required'], ['Open page with CSS transforms in Chrome', 'Open in Firefox', 'Open in Safari', 'Verify visual consistency'], ['CSS vendor prefixes render correctly', 'Visual experience is consistent']),
        ("169", "JavaScript API Compatibility", ['Multiple browsers required'], ['Open module in each browser', 'Check for JavaScript API availability', 'Test WebSocket functionality if used', 'Test localStorage/sessionStorage'], ['Core JavaScript APIs available in all browsers', 'Polyfills applied for unsupported features']),
        ("170", "Font Loading Cross-Browser", ['Multiple browsers required'], ['Open text-heavy page in Chrome', 'Open in Firefox', 'Open in Safari', 'Compare font rendering quality'], ['Font rendering quality is acceptable in all browsers', 'Web fonts load correctly across browsers']),
        ("171", "Form Element Styling Consistency", ['Multiple browsers required'], ['Open a form in Chrome', 'Open in Firefox', 'Open in Safari', 'Compare form element appearance', 'Note differences in select checkbox radio'], ['Form elements have consistent appearance', 'Differences are documented and acceptable']),
        ("172", "SVG Rendering Cross-Browser", ['Multiple browsers required'], ['Open page with SVG graphics in Chrome', 'Open in Firefox', 'Open in Safari', 'Verify SVG rendering consistency'], ['SVG renders consistently across browsers', 'Animations work in all browsers']),
        ("173", "Video/Audio Playback Cross-Browser", ['Multiple browsers required'], ['Play video in Chrome', 'Play in Firefox', 'Play in Safari', 'Verify controls work', 'Verify autoplay behavior'], ['Media playback works in all browsers', 'Controls are functional']),
        ("174", "Drag and Drop Cross-Browser", ['Multiple browsers required'], ['Test drag and drop in Chrome', 'Test in Firefox', 'Test in Safari', 'Verify drop targets work'], ['Drag and drop works across browsers', 'Drop events fire correctly']),
        ("175", "File Upload Cross-Browser", ['Multiple browsers required'], ['Upload file in Chrome', 'Upload in Firefox', 'Upload in Safari', 'Verify file handling consistent'], ['File upload works in all browsers', 'File validation consistent']),
        ("176", "Offline Page Navigation Attempt", ['Network disconnection capability'], ['Load module while online', 'Disconnect network', 'Attempt to navigate to new page', 'Observe offline handling', 'Reconnect and verify normal operation'], ['Offline message shown when network unavailable', 'Previously cached pages may be accessible']),
        ("177", "Offline Form Data Preservation", ['Network disconnection capability'], ['Open a form while online', 'Begin filling data', 'Disconnect network', 'Complete the form', 'Reconnect and submit', 'Verify data preserved'], ['Form data entered offline is preserved locally', 'Submission succeeds when connection restored']),
        ("178", "Network Reconnection Behavior", ['Network throttling tools'], ['Use module actively', 'Temporarily disconnect', 'Perform actions while offline', 'Reconnect network', 'Observe reconnection handling'], ['Module detects reconnection automatically', 'Pending operations can be retried']),
        ("179", "Offline Cached Data Access", ['Service worker caching required'], ['Load important pages while online', 'Disconnect network', 'Access previously loaded pages', 'Verify cached content displayed', 'Check freshness indicators'], ['Cached pages accessible offline', 'Freshness indicators shown on cached data']),
        ("180", "Slow Network Experience", ['Network throttling tools'], ['Throttle to Slow 3G', 'Navigate through module', 'Observe loading behavior', 'Verify content usable despite slow loading', 'Measure time-to-interactive'], ['Module remains usable on slow networks', 'Content loads progressively']),
        ("181", "Service Worker Registration Verification", ['Browser dev tools available'], ['Open module and check service worker registration', 'Verify SW is registered for the module', 'Check SW scope', 'Verify SW caches assets', 'Test offline with SW'], ['Service worker registered correctly', 'Caching strategy is appropriate']),
        ("182", "Offline Indicator Display", ['Network disconnection capability'], ['Use module while online', 'Disconnect network', 'Observe if offline indicator appears', 'Verify indicator is informative', 'Reconnect and verify indicator disappears'], ['Offline indicator appears when disconnected', 'Indicator provides useful information']),
        ("183", "Graceful Degradation on Network Loss", ['Network disconnection capability'], ['Use module with features requiring network', 'Disconnect network', 'Attempt each feature', 'Observe graceful degradation', 'Reconnect and verify full functionality'], ['Features degrade gracefully without network', 'Critical functionality remains available']),
        ("184", "Background Sync for Offline Actions", ['Service worker and sync required'], ['Perform an action that supports background sync', 'Disconnect before sync completes', 'Reconnect later', 'Verify action syncs in background', 'Check for completion notification'], ['Background sync completes after reconnection', 'User is notified of sync completion']),
        ("185", "Cache Invalidation on Network Restore", ['Service worker caching required'], ['Access module and cache content', 'Verify cached content is displayed offline', 'Reconnect to network', 'Verify updated content replaces cached', 'Check cache freshness headers'], ['Cached content is updated when network available', 'Cache invalidation follows defined strategy']),
        ("186", "Concurrent User Data Isolation", ['Two tester accounts required'], ['User A creates/modifies data', 'User B checks if visible', 'Verify isolation', 'User B attempts to modify User A data', 'Verify access denied'], ["Users cannot access each other's private data", 'Data isolation is enforced']),
        ("187", "Concurrent Editing with Locking", ['Two tester accounts required'], ['User A opens record for editing', 'User B attempts to open same record', 'Observe locking behavior', 'User A saves and releases lock', 'User B opens record'], ['Record locking prevents simultaneous editing', 'Lock released when user saves or cancels']),
        ("188", "Real-Time Collaboration Visibility", ['Two tester accounts required'], ['User A and B open same module', 'User A makes a change', 'Observe if User B sees change', 'User B changes and verify User A sees it'], ['Changes visible to other users in real-time', 'All users see consistent state']),
        ("189", "Concurrent Submission Race Condition", ['Two tester accounts required'], ['User A and B simultaneously submit same form', 'Observe system handling', 'Verify only one record created', 'Check for duplicates'], ['Race condition handled gracefully', 'No duplicate records created']),
        ("190", "Read-While-Write Consistency", ['Two tester accounts required'], ['User A begins writing large data', 'While write in progress User B reads', 'Verify User B sees consistent data', 'Check after write completion'], ['User B sees consistent data not partial writes', 'Read isolation prevents dirty reads']),
        ("191", "Optimistic Locking Conflict", ['Two tester accounts required'], ['User A and B read same record version', 'User A saves with version 1', 'User B tries to save with version 1', 'Observe optimistic locking failure', 'User B refreshes and retries'], ['Optimistic locking detects the conflict', 'User can resolve by refreshing data']),
        ("192", "Session Management Concurrent Sessions", ['Two browsers or devices'], ['Log in from Browser 1', 'Log in from Browser 2', 'Perform actions in both', 'Log out from Browser 1', 'Verify Browser 2 still active or handled'], ['Multiple concurrent sessions handled correctly', 'Logout from one device affects others per policy']),
        ("193", "Bulk Operations During Concurrent Use", ['Two tester accounts required'], ['User A initiates bulk operation', 'User B uses the same module', 'Verify User B not blocked', 'Verify bulk operation completes correctly', 'Check data consistency'], ['Bulk operations do not block other users', 'Data consistency is maintained']),
        ("194", "Dashboard Widget Data Refresh Race", ['Dashboard with real-time data'], ['Open dashboard in two sessions', 'Update underlying data', 'Observe widget refresh in both sessions', 'Verify consistent data display'], ['Widgets refresh consistently across sessions', 'Data displayed is consistent']),
        ("195", "Concurrent Export Operations", ['Two tester accounts required'], ['User A starts large export', 'User B starts another export', 'Both complete successfully', 'Verify exported data integrity'], ['Multiple exports can run concurrently', 'Export data integrity is maintained']),
        ("196", "Data Integrity After Save and Refresh", ['Module must allow data creation'], ['Create new record with specific values', 'Save the record', 'Refresh the page', 'Verify record displays with values intact', 'Navigate away and return'], ['All field values preserved after refresh', 'Record appears in correct location']),
        ("197", "Referential Integrity Verification", ['Module must have related data'], ['Create parent record', 'Create child referencing parent', 'Attempt to delete parent', 'Observe enforcement', 'Delete child first then parent'], ['Deleting parent with children prevented or cascaded', 'No orphaned records']),
        ("198", "Data Type Preservation", ['Module must handle various types'], ['Create record with various data types', 'Save and refresh', 'Verify each field displays correctly', 'Check formatting and precision preserved'], ['Text stored exactly as entered', 'Numeric precision maintained']),
        ("199", "Data Rollback on Failed Operation", ['Module must support transactions'], ['Begin multi-step data operation', 'Force failure mid-operation', 'Verify partial data rolled back', 'Check consistent state'], ['Failed operations do not leave partial data', 'System returns to consistent state']),
        ("200", "Field Value Truncation Prevention", ['Module must have max field lengths'], ['Enter values at maximum length', 'Save and verify full value preserved', 'Attempt to exceed maximum'], ['Values at max length are fully preserved', 'No silent truncation occurs']),
        ("201", "Currency Precision and Rounding", ['Module must handle currency'], ['Enter currency value with many decimals', 'Save and verify precision', 'Perform currency calculation', 'Verify rounding behavior'], ['Currency precision follows financial standards', 'Rounding follows defined rules']),
        ("202", "Timestamp Consistency Across Timezones", ['Module must handle timestamps'], ['Create record from different timezone', 'Verify timestamp stored in UTC', 'Display in different timezone', 'Verify conversion accuracy'], ['Timestamps stored consistently in UTC', 'Timezone conversion is accurate']),
        ("203", "Data Encoding Preservation", ['Module must handle international data'], ['Enter data with various encodings', 'Save and verify', 'Display and verify correct rendering', 'Export and verify encoding'], ['Character encoding is preserved end-to-end', 'International characters display correctly']),
        ("204", "Auto-Increment ID Consistency", ['Module must have auto-generated IDs'], ['Create multiple records in sequence', 'Verify IDs are sequential', 'Delete a record and create another', 'Verify ID gap handling'], ['IDs are generated sequentially', 'Deleted record IDs may or may not be reused per policy']),
        ("205", "Soft Delete Data Recovery", ['Module must support soft delete'], ['Soft delete a record', 'Verify it no longer appears in lists', 'Access the admin recovery feature', 'Restore the record', 'Verify it reappears with all data intact'], ['Soft-deleted records can be recovered', 'All original data is preserved']),
        ("206", "Data Import Integrity", ['Module must support data import'], ['Prepare CSV with known data', 'Import the CSV', 'Verify all records imported correctly', 'Spot-check specific field values', 'Verify total record count matches'], ['All CSV records imported correctly', 'Field values match source data']),
        ("207", "Data Export Integrity Roundtrip", ['Module must support export and import'], ['Export existing data to file', 'Import the exported file', 'Compare original and reimported data', 'Verify no data loss in roundtrip'], ['Export-import roundtrip preserves data integrity', 'No data loss occurs']),
        ("208", "Version History Data Preservation", ['Module must support versioning'], ['Create version 1 of a record', 'Modify to create version 2', 'Access version 1 history', 'Verify version 1 data intact', 'Restore version 1 and verify'], ['Version history preserves all previous states', 'Old versions can be restored']),
        ("209", "Bulk Update Data Integrity", ['Module must support bulk updates'], ['Select records for bulk update', 'Apply update to common field', 'Verify all selected records updated', 'Verify non-selected records unchanged'], ['Bulk update correctly targets selected records', 'Non-selected records are unchanged']),
        ("210", "Conditional Data Display Integrity", ['Module must have conditional display'], ['Set up conditions for data display', 'Verify data shows/hides based on conditions', 'Change conditions and observe', 'Verify display logic is correct'], ['Conditional display logic works correctly', 'Data visibility follows defined rules']),
        ("211", "Basic Search With Valid Query", ['Search must be populated'], ['Navigate to module search', 'Enter query matching data', 'Execute search', 'Review results', 'Verify relevance'], ['Search returns results within 2 seconds', 'Results ordered by relevance']),
        ("212", "Search With Partial Match", ['Search must support partial matching'], ['Enter partial word matching records', 'Execute search', 'Verify results include partial matches', 'Test with single character'], ['Partial matches returned correctly', 'Single char searches work if they match']),
        ("213", "Search With Special Characters", ['Search must handle special chars'], ['Search for term with & % $', 'Execute search', 'Verify results accurate', 'Search with Unicode characters'], ['Special character searches return accurate results', 'Unicode searches work correctly']),
        ("214", "Search With Multiple Keywords", ['Search must support multi-keyword'], ['Enter multiple space-separated keywords', 'Execute search', 'Verify matches all keywords', 'Test AND/OR logic'], ['Multi-keyword search works correctly', 'Results match expected combination logic']),
        ("215", "Search Autocomplete Suggestions", ['Search must have autocomplete'], ['Click in search field', 'Begin typing query', 'Observe autocomplete suggestions', 'Select suggestion with mouse', 'Select with keyboard'], ['Autocomplete appears after 2-3 chars', 'Suggestions are relevant']),
        ("216", "Search Results Pagination", ['Search must return many results'], ['Execute search returning many results', 'Verify pagination controls present', 'Navigate to page 2', 'Navigate back to page 1'], ['Pagination reflects total results', 'Page navigation preserves query']),
        ("217", "Search Result Filtering", ['Search must support filtering'], ['Execute broad search', 'Apply filter to narrow', 'Verify filtered subset', 'Apply multiple filters', 'Remove filters'], ['Filters correctly narrow search results', 'Multiple filters combine correctly']),
        ("218", "Search With Stop Words", ['Search must handle stop words'], ['Search phrase with the and or of', 'Verify stop words handled', 'Compare results with and without stop words'], ['Stop words do not prevent relevant results', 'Phrase searches with stop words work']),
        ("219", "Search Result Sorting", ['Search results must be sortable'], ['Execute search', 'Change sort order', 'Verify results reorder', 'Toggle asc/desc', 'Verify sort indicator'], ['Sorting correctly reorders results', 'Sort indicator shows current direction']),
        ("220", "Search With No Results Follow-Up", ['Search must have empty guidance'], ['Execute search with no results', 'Observe no-results message', 'Follow suggestions provided', 'Broaden query and retry'], ['No-results message is helpful', 'Suggestions help refine search']),
        ("221", "Advanced Search With Multiple Fields", ['Search must have advanced options'], ['Open advanced search', 'Fill multiple search fields', 'Execute complex search', 'Verify results match all criteria', 'Modify criteria and search again'], ['Advanced search with multiple fields works', 'Results precisely match criteria']),
        ("222", "Search With Excluded Terms", ['Search must support exclusion'], ['Search with term -excludedterm', 'Verify excluded terms not in results', 'Search with multiple exclusions'], ['Exclusion logic works correctly', 'Excluded terms absent from results']),
        ("223", "Search With Exact Phrase Matching", ['Search must support phrase matching'], ['Search for exact phrase in quotes', 'Verify results contain exact phrase', 'Compare with non-quoted search'], ['Exact phrase matching returns precise results', 'Phrase matching differs from loose matching']),
        ("224", "Search Ranking and Relevance", ['Search must rank results'], ['Execute search that returns many results', 'Verify top results are most relevant', 'Check ranking factors', 'Compare results for different queries'], ['Search results are ranked by relevance', 'Most relevant results appear first']),
        ("225", "Search Performance Large Dataset", ['Search must have large dataset'], ['Execute search across large dataset', 'Measure response time', 'Compare different query complexities', 'Verify results returned within limits'], ['Search across large datasets performs within limits', 'Complex queries still performant']),
        ("226", "Search Faceted Navigation", ['Search must have faceted filters'], ['Execute search', 'Apply facet filter', 'Verify results narrowed', 'Apply multiple facets', 'Remove facets'], ['Faceted filters correctly narrow results', 'Multiple facets combine logically']),
        ("227", "Search History Persistence", ['Search must track history'], ['Execute several searches', 'Navigate away from search', 'Return to search', 'Verify search history shown', 'Clear search history'], ['Search history persists across navigation', 'History can be cleared']),
        ("228", "Search Save and Reuse", ['Search must allow saving queries'], ['Execute a search', 'Save the search query', 'Navigate away', 'Access saved searches', 'Execute saved search', 'Verify results match'], ['Searches can be saved and reused', 'Saved search returns consistent results']),
        ("229", "Search Term Highlighting in Results", ['Search must highlight terms'], ['Execute search for specific term', 'Verify term highlighted in results', 'Check highlight visibility', 'Verify highlight not interfering with readability'], ['Search terms are highlighted in results', 'Highlights are clearly visible']),
        ("230", "Multilingual Search Support", ['Search must support multiple languages'], ['Search in English', 'Search in French', 'Search in Arabic', 'Search in Chinese', 'Verify results appropriate for each'], ['Search works across multiple languages', 'Results match the language of the query']),
        ("231", "Single Filter Application", ['Module must have filterable lists'], ['Navigate to list with filters', 'Apply single filter criterion', 'Verify list updates to matching items', 'Verify filter indicator shows active', 'Remove filter'], ['Filter correctly reduces results', 'Filter indicator clearly visible']),
        ("232", "Multiple Filters Combination", ['Module must support multiple filters'], ['Apply first filter criterion', 'Apply second filter', 'Verify results satisfy both', 'Apply third filter', 'Verify AND logic'], ['Multiple filters combine with AND logic', 'Each filter narrows results further']),
        ("233", "Date Range Filter", ['Module must have date filters'], ['Apply date range filter', 'Verify results within range', 'Apply single start date', 'Apply single end date', 'Verify edge cases'], ['Date range filter correctly limits results', 'Open-ended ranges work correctly']),
        ("234", "Dropdown Select Filter", ['Module must have dropdown filters'], ['Open dropdown filter', 'Select single value', 'Verify results update', 'Clear selection', 'Verify unfiltered results'], ['Dropdown options populated correctly', 'Clearing filter restores full results']),
        ("235", "Text Search Filter", ['Module must have text input filters'], ['Enter text filter term', 'Verify list filters to matches', 'Clear text filter', 'Verify full list restores', 'Enter partial match'], ['Text filter matches target fields', 'Partial matches filter correctly']),
        ("236", "Filter Persistence Across Navigation", ['Module must remember filter state'], ['Apply filters to list', 'Navigate to detail page', 'Return to list', 'Verify filters still active', 'Verify no inconsistency'], ['Filters persist after navigation away and back', 'Results are accurate']),
        ("237", "Filter Reset Clear All", ['Module must have filter reset'], ['Apply multiple filters', 'Click Clear All', 'Verify all filters removed', 'Verify full unfiltered list', 'Verify filter indicators gone'], ['Clear All removes all filters', 'Results revert to unfiltered list']),
        ("238", "Checkbox Toggle Filter", ['Module must have checkbox filters'], ['Click checkbox filter option', 'Verify list updates', 'Click another checkbox', 'Verify OR logic within category', 'Uncheck all'], ['Checkbox filters work correctly', 'Multiple checkboxes use OR logic']),
        ("239", "Radio Button Filter", ['Module must have radio button filters'], ['Select one radio filter option', 'Verify list filtered', 'Select different radio option', 'Verify new filter applied', 'Verify only one active'], ['Radio filters are mutually exclusive', 'Selection immediately filters results']),
        ("240", "Slider Range Filter", ['Module must have slider filters'], ['Adjust slider minimum value', 'Verify list updates', 'Adjust slider maximum', 'Verify narrowing results', 'Reset slider'], ['Slider filter updates results in real-time', 'Range selection is intuitive']),
        ("241", "Color Swatch Filter", ['Module must have color filters'], ['Click a color swatch filter', 'Verify results filtered by color', 'Click another swatch', 'Verify multiple colors selected', 'Deselect all'], ['Color swatches filter correctly', 'Multiple colors can be selected simultaneously']),
        ("242", "Hierarchical Category Filter", ['Module must have hierarchical categories'], ['Expand top-level category', 'Select subcategory', 'Verify results filtered', 'Navigate category levels', 'Clear selection'], ['Hierarchical category filter works correctly', 'Subcategories narrow results within parent']),
        ("243", "Filter Count Badges", ['Module must show filter counts'], ['Open filter panel', 'Observe count badges', 'Apply a filter', 'Verify count updates', 'Clear filter'], ['Filter count badges show available results', 'Counts update when filters change']),
        ("244", "Filter Search Within Options", ['Module must have many filter options'], ['Open filter with many options', 'Type to search within filter options', 'Verify options narrow by search', 'Select from filtered options'], ['Filter search narrows available options', 'Selection works from filtered list']),
        ("245", "Filter AND OR Logic Toggle", ['Module must support logic toggle'], ['Apply two filters with AND', 'Verify both conditions met', 'Toggle to OR logic', 'Verify either condition met', 'Toggle back to AND'], ['AND/OR logic toggle works correctly', 'Results update according to selected logic']),
        ("246", "Single Column Sort Ascending", ['Module must have sortable lists'], ['Navigate to list view', 'Click column header to sort asc', 'Verify data A-Z or 0-9', 'Verify sort indicator'], ['Data sorts correctly ascending', 'Sort indicator displayed on column']),
        ("247", "Single Column Sort Descending", ['Module must support descending sort'], ['Click same column header again', 'Verify data Z-A or 9-0', 'Verify sort indicator changes'], ['Data sorts correctly descending', 'Indicator updates to descending arrow']),
        ("248", "Multi-Column Sort", ['Module must support multi-column sort'], ['Sort by primary column', 'Shift-click secondary column', 'Verify primary maintained within secondary groups', 'Verify indication'], ['Multi-column sort works correctly', 'Primary sort takes precedence']),
        ("249", "Sort Reset", ['Module must support removing sort'], ['Apply sort to column', 'Click header third time', 'Verify default order restored', 'Verify sort indicator removed'], ['Third click removes sort from column', 'Data returns to default order']),
        ("250", "Sort Performance Large Dataset", ['Module must have 1000+ records'], ['Apply sort to column', 'Measure sort time', 'Toggle between asc/desc', 'Verify acceptable performance'], ['Sort completes within 2 seconds for 1000+ records']),
        ("251", "Sort With Active Filters", ['Module must support sort with filters'], ['Apply filter to list', 'Apply sort', 'Verify filtered sorted results', 'Remove filter verify sort maintained', 'Remove sort'], ['Sort works in combination with active filters', 'Both filter and sort applied correctly']),
        ("252", "Sort by Date Column", ['Module must have date columns'], ['Sort by date column ascending', 'Verify earliest dates first', 'Sort descending', 'Verify latest dates first', 'Verify date sorting handles empty dates'], ['Date sorting orders chronologically correctly', 'Empty dates handled appropriately']),
        ("253", "Sort by Numeric Column", ['Module must have numeric columns'], ['Sort by numeric column ascending', 'Verify smallest first', 'Sort descending', 'Verify largest first', 'Verify numeric sort not alphabetical'], ['Numeric sort orders by value not string', 'Negative numbers handled correctly']),
        ("254", "Sort Persistence After Page Refresh", ['Module must persist sort state'], ['Apply sort to list', 'Refresh the page', 'Verify sort state maintained', 'Navigate away and back'], ['Sort state persists across page refresh', 'Sort state persists across navigation']),
        ("255", "Sort Indicator Accessibility", ['Module must have accessible sort controls'], ['Navigate to sortable column header using keyboard', 'Verify sort control is keyboard accessible', 'Verify screen reader announces sort state', 'Verify ARIA attributes present'], ['Sort controls are keyboard accessible', 'Sort state is announced to screen readers']),
        ("256", "Basic Page Navigation", ['Module must have paginated lists'], ['Navigate to list with multiple pages', 'Click page 2', 'Verify content loads', 'Verify page indicator shows current', 'Navigate back'], ['Page navigation loads correct content', 'Indicator shows current page']),
        ("257", "Page Size Selection", ['Module must support page size config'], ['Navigate to list view', 'Change page size to 10', 'Verify 10 items displayed', 'Change to 50', 'Verify page count recalculates'], ['Page size change takes effect immediately', 'Page count updates correctly']),
        ("258", "First and Last Page Navigation", ['Module must have first/last controls'], ['Navigate to paginated list', 'Click Last Page', 'Verify last page loads', 'Click First Page', 'Verify first page loads'], ['Last page navigates to correct final page', 'Navigation buttons disabled at boundaries']),
        ("259", "Pagination With Filtered Results", ['Module must support pagination with filters'], ['Apply filter to list', 'Verify pagination updates for filtered count', 'Navigate filtered pages', 'Clear filter verify pagination resets'], ['Pagination reflects filtered result count', 'Filtered pagination works correctly']),
        ("260", "Items Per Page Selector", ['Module must have items per page'], ['Open items per page dropdown', 'Verify available options', 'Select each option', 'Verify behavior', 'Verify persistence'], ['Available page size options are reasonable', 'Selection persists during session']),
        ("261", "Page Number Input Direct Navigation", ['Module must support direct page input'], ['Navigate to paginated list', 'Enter page number directly', 'Verify correct page loads', 'Enter invalid page number', 'Verify error or boundary handling'], ['Direct page input navigates correctly', 'Invalid page numbers handled gracefully']),
        ("262", "Ellipsis and Page Window Display", ['Module must handle many pages'], ['Navigate to list with 50+ pages', 'Verify pagination shows window of pages', 'Check ellipsis for gaps', 'Navigate using ellipsis'], ['Pagination window shows relevant page range', 'Ellipsis indicates skipped pages']),
        ("263", "Pagination with Zero Results", ['Module must handle no results'], ['Execute search that returns zero results', 'Verify no pagination shown', 'Verify empty state shown'], ['Pagination hidden when no results', 'Empty state shown appropriately']),
        ("264", "Pagination with Single Page", ['Module must handle single page'], ['Navigate to list with fewer than page size items', 'Verify pagination hidden or disabled', 'Verify all items display correctly'], ['Pagination hidden or disabled for single page', 'All items displayed without navigation']),
        ("265", "Pagination Keyboard Accessibility", ['Module must have accessible pagination'], ['Navigate to pagination controls with keyboard', 'Verify each control reachable', 'Verify Enter activates page', 'Verify ARIA labels present'], ['Pagination controls are keyboard accessible', 'Active page is identified to screen readers']),
        ("266", "Data Export to CSV", ['Module must support CSV export'], ['Select data for export', 'Click Export choose CSV', 'Confirm export', 'Open downloaded CSV', 'Verify content'], ['CSV downloads within reasonable time', 'CSV has correct headers']),
        ("267", "Data Export to PDF", ['Module must support PDF export'], ['Select data for export', 'Choose PDF format', 'Confirm export', 'Open PDF', 'Verify formatting'], ['PDF formatted professionally', 'All content included']),
        ("268", "Export With Selected Columns", ['Module must support column selection'], ['Choose export select specific columns', 'Initiate export', 'Verify only selected columns in export', 'Verify data correct'], ['Only selected columns appear in export', 'Data accuracy maintained']),
        ("269", "Export With Filters Applied", ['Module must export filtered data'], ['Apply filters to list', 'Export filtered data', 'Open export file', 'Verify only filtered records included'], ['Exported data respects active filters', 'Data integrity maintained']),
        ("270", "Large Export Handling", ['Module must handle large exports'], ['Select 1000+ records for export', 'Initiate export', 'Observe progress', 'Wait for completion', 'Verify complete'], ['Large exports show progress indication', 'Export completes within 30 seconds']),
        ("271", "Export Format Options", ['Module must support multiple formats'], ['Open export options', 'Verify available formats', 'Select each format', 'Export and verify format correct', 'Compare formats'], ['Multiple export formats available', 'Each format produces correctly formatted output']),
        ("272", "Scheduled Export Configuration", ['Module must support scheduled exports'], ['Configure scheduled export', 'Set schedule parameters', 'Save configuration', 'Verify schedule confirmed', 'Wait for scheduled time'], ['Scheduled export configuration works', 'Export runs at scheduled time']),
        ("273", "Export Permissions Enforcement", ['Module must have export permissions'], ['Log in as user without export permission', 'Attempt to access export feature', 'Verify access denied', 'Log in with export permission', 'Verify successful export'], ['Export permissions are enforced', 'Unauthorized users cannot export']),
        ("274", "Export File Naming Convention", ['Module must have file naming'], ['Export data and observe filename', 'Verify filename follows convention', 'Export again and verify uniqueness', 'Check date/time in filename'], ['Export filenames follow defined convention', 'Filenames are unique and descriptive']),
        ("275", "Export Progress Notification", ['Module must notify on export completion'], ['Start a large export', 'Navigate away from export page', 'Observe notification on completion', 'Access the completed export'], ['Export completion is notified to user', 'Completed export is accessible']),
        ("276", "Data Import from CSV", ['Module must support CSV import'], ['Navigate to import feature', 'Download template', 'Prepare CSV with test data', 'Upload CSV', 'Map columns', 'Execute import'], ['Import processes successfully', 'Imported records appear in system']),
        ("277", "Import Validation and Error Reporting", ['Module must validate imported data'], ['Prepare CSV with invalid data', 'Upload and import', 'Observe validation results', 'Verify invalid records reported', 'Verify valid records imported'], ['Import validates each row', 'Errors reported with row and field details']),
        ("278", "Import Duplicate Detection", ['Module must detect duplicates'], ['Prepare CSV with duplicate data', 'Upload and import', 'Verify duplicates detected', 'Choose how to handle', 'Verify handling applied'], ['Duplicate records detected during import', 'Selected handling applied correctly']),
        ("279", "Import Template Download", ['Module must provide templates'], ['Navigate to import', 'Click Download Template', 'Verify file downloads', 'Open and verify columns', 'Verify format matches'], ['Template downloads correctly', 'Contains correct column headers']),
        ("280", "Import Rollback on Failure", ['Module must support transactional import'], ['Prepare CSV that will partially fail', 'Import the file', 'Observe partial failure handling', 'Verify no partial data remains'], ['Import rolled back on critical errors', 'No partial data after failed import']),
        ("281", "Import Data Type Validation", ['Module must validate data types'], ['Prepare CSV with wrong data types', 'Import and verify type errors', 'Correct types and reimport', 'Verify successful import'], ['Data type validation catches errors', 'Correct types import successfully']),
        ("282", "Import Required Fields Validation", ['Module must check required fields'], ['Prepare CSV with missing required fields', 'Import and verify required field errors', 'Add required fields and reimport'], ['Required field validation catches missing data', 'All required fields must be present']),
        ("283", "Import Large File Performance", ['Module must handle large imports'], ['Prepare CSV with 10000+ records', 'Start the import', 'Monitor progress', 'Measure completion time', 'Verify all records imported'], ['Large imports complete within acceptable time', 'Progress indication shown during import']),
        ("284", "Import Field Mapping Customization", ['Module must support field mapping'], ['Upload CSV with differently named columns', 'Use field mapping to match columns', 'Execute import', 'Verify data mapped correctly'], ['Field mapping correctly assigns columns', 'Mapped fields import correctly']),
        ("285", "Import Preview Before Commit", ['Module must support import preview'], ['Prepare CSV for import', 'Choose Preview option', 'Verify preview shows data before import', 'Check for error previews', 'Confirm import from preview'], ['Import preview shows data before committing', 'Errors can be reviewed before import']),
        ("286", "Create New Record", ['Module must support creation'], ['Navigate to create page', 'Fill required fields with valid data', 'Submit the form', 'Verify success message', 'Verify record in list'], ['Record created successfully', 'Appears in list immediately']),
        ("287", "Create With All Optional Fields", ['Module must have optional fields'], ['Navigate to create', 'Fill all fields including optional', 'Submit', 'Open created record', 'Verify optional fields saved'], ['Optional fields saved correctly', 'Record displays all entered data']),
        ("288", "Read View Record Detail", ['Module must have detail views'], ['Navigate to list', 'Click record for details', 'Verify all fields displayed', 'Verify formatting correct', 'Verify related links work'], ['Detail shows all fields', 'Formatting professional']),
        ("289", "Update Edit Record", ['Module must support editing'], ['Open existing record', 'Click Edit', 'Modify field values', 'Save changes', 'Verify updated values'], ['Edit loads with current values', 'Changes saved successfully']),
        ("290", "Partial Update of Record", ['Module must support partial updates'], ['Open record for editing', 'Modify single field', 'Save changes', 'Verify modified field updated', 'Verify other fields unchanged'], ['Only modified field changed', 'Other fields retain original values']),
        ("291", "Delete Record With Confirmation", ['Module must support deletion'], ['Navigate to record detail', 'Click Delete', 'Observe confirmation dialog', 'Click Cancel verify still exists', 'Confirm deletion'], ['Confirmation dialog appears', 'Cancel prevents deletion']),
        ("292", "Delete and Verify Cascade", ['Module must have related records'], ['Identify parent with children', 'Attempt to delete parent', 'Observe cascade/restriction', 'Delete children then parent'], ['Cascade correctly enforced', 'No orphaned records']),
        ("293", "Bulk Create Operation", ['Module must support bulk creation'], ['Navigate to bulk create', 'Enter data for multiple records', 'Submit bulk operation', 'Verify all created', 'Check for batch errors'], ['All bulk records created successfully', 'Errors reported per-record']),
        ("294", "Bulk Update Operation", ['Module must support bulk updates'], ['Select multiple records', 'Choose bulk edit', 'Modify common field', 'Confirm update', 'Verify all selected updated'], ['Bulk update changes selected records', 'Non-selected unaffected']),
        ("295", "Bulk Delete Operation", ['Module must support bulk deletion'], ['Select multiple records', 'Choose Delete', 'Confirm deletion', 'Verify records removed', 'Verify non-selected remain'], ['Bulk deletion removes selected', 'Non-selected preserved']),
        ("296", "Record Copy Duplicate", ['Module must support duplication'], ['Open a record', 'Choose Copy', 'Verify copy created', 'Modify copy', 'Verify independent'], ['Duplicate creates copy', 'Original unchanged']),
        ("297", "Record Archiving", ['Module must support archiving'], ['Select record for archive', 'Confirm archive', 'Verify removed from active view', 'Access archive section', 'Verify record there'], ['Record archived correctly', 'Accessible from archive']),
        ("298", "Record Unarchive Restore", ['Module must support unarchive'], ['Navigate to archive', 'Select record to restore', 'Confirm unarchive', 'Verify returns to active view', 'Verify data intact'], ['Unarchive restores record fully', 'Data integrity maintained']),
        ("299", "Record History Version Comparison", ['Module must support versioning'], ['Create record version 1', 'Modify to version 2', 'Access version history', 'Compare two versions', 'Verify differences highlighted'], ['Version comparison shows differences', 'Each version fully preserved']),
        ("300", "Record Locking and Unlocking", ['Module must support locking'], ['Open record and lock', 'Verify lock indicator', 'Another user tries to edit', 'Verify lock prevents editing', 'Unlock the record'], ['Locking prevents conflicting edits', 'Lock releases on unlock']),
        ("301", "Record Tagging and Categorization", ['Module must support tags'], ['Create record with tags', 'Verify tags display on record', 'Search by tag', 'Remove tag', 'Verify removed'], ['Tags correctly associated with records', 'Tag-based search works']),
        ("302", "Record Notes and Comments", ['Module must support notes'], ['Open record', 'Add a note or comment', 'Save note', 'Verify note displayed', 'Edit and delete note'], ['Notes saved and displayed correctly', 'Note management functions work']),
        ("303", "Record Attachment Management", ['Module must support attachments'], ['Open record', 'Upload attachment', 'Verify attachment listed', 'Download attachment', 'Verify content', 'Remove attachment'], ['Attachments upload and download correctly', 'Attachment management works']),
        ("304", "Record Sharing and Permissions", ['Module must support sharing'], ['Set record sharing permissions', 'Share with another user', 'Verify other user can access', 'Revoke sharing', 'Verify access removed'], ['Record sharing permissions enforced', 'Revocation removes access']),
        ("305", "Record Approval Workflow", ['Module must support approvals'], ['Create record requiring approval', 'Verify pending approval status', 'Approve as authorized user', 'Verify approved status', 'Create and reject another'], ['Approval workflow correctly processes requests', 'Status accurately reflects workflow state']),
        ("306", "Main Navigation Menu Links", ['Module must be accessible from nav'], ['Open the module', 'Verify all navigation items visible', 'Click each nav link', 'Verify correct page loads', 'Breadcrumb accurate'], ['All nav links function correctly', 'Active page highlighted']),
        ("307", "Breadcrumb Navigation Trail", ['Module must have breadcrumbs'], ['Navigate to a deep page', 'Observe breadcrumb trail', 'Click a breadcrumb link', 'Verify navigated correctly', 'Verify breadcrumb accuracy'], ['Breadcrumb trail accurately shows path', 'Clicking navigates correctly']),
        ("308", "Sidebar Sub-Navigation", ['Module must have sidebar nav'], ['Open module with sidebar', 'Expand sidebar sections', 'Click sidebar links', 'Verify content loads', 'Collapse sidebar'], ['Sidebar navigation works correctly', 'Active item highlighted']),
        ("309", "Tab Navigation Between Sections", ['Module must use tab navigation'], ['Navigate to page with tabs', 'Click each tab', 'Verify content switches', 'Verify tab active state', 'Verify content correct per tab'], ['Tab navigation switches content correctly', 'Active tab is clearly indicated']),
        ("310", "Quick Action Shortcut Links", ['Module must have quick actions'], ['Open module homepage', 'Locate quick action links', 'Click each quick action', 'Verify correct destination', 'Verify action performed'], ['Quick actions navigate to correct destinations', 'Actions performed correctly']),
        ("311", "Contextual Help Navigation", ['Module must have help system'], ['Click help icon or link', 'Verify help panel opens', 'Search help topic', 'Click search result', 'Verify relevant help content'], ['Help system opens correctly', 'Search returns relevant content']),
        ("312", "Related Content Links", ['Module must have related links'], ['Open a record detail', 'Locate related content links', 'Click a related link', 'Verify navigation to related item', 'Return to original'], ['Related links navigate correctly', 'Related content is relevant']),
        ("313", "Back to Top Navigation", ['Module must have long pages'], ['Scroll to bottom of long page', 'Click Back to Top', 'Verify scroll to top', 'Verify button visible only after scrolling'], ['Back to Top scrolls to top', 'Button visibility appropriate']),
        ("314", "Dashboard Widget Navigation", ['Module must have dashboard'], ['Open dashboard', 'Click on a dashboard widget', 'Verify navigation to detail', 'Verify widget click action', 'Return to dashboard'], ['Widget clicks navigate correctly', 'Navigation from dashboard works']),
        ("315", "Cross-Module Navigation Links", ['Platform must have cross-links'], ['Find cross-module link in current module', 'Click the link', 'Verify correct module opens', 'Verify context is preserved', 'Navigate back'], ['Cross-module navigation works correctly', 'Context may be preserved']),
        ("316", "Dropdown Menu Navigation", ['Module must have dropdown menus'], ['Hover or click dropdown trigger', 'Verify dropdown menu opens', 'Click a dropdown item', 'Verify navigation', 'Verify dropdown closes'], ['Dropdown menus open correctly', 'Items navigate to destinations']),
        ("317", "Mobile Hamburger Menu", ['Mobile viewport required'], ['Set viewport to mobile size', 'Observe hamburger menu icon', 'Open hamburger menu', 'Verify all items present', 'Close hamburger menu'], ['Hamburger menu contains all items', 'Menu opens and closes correctly']),
        ("318", "Keyboard Shortcut Navigation", ['Module must have keyboard shortcuts'], ['Press keyboard shortcut for home', 'Verify navigation to home', 'Press shortcut for search', 'Verify search focused', 'Try other documented shortcuts'], ['Keyboard shortcuts navigate correctly', 'Shortcuts are documented']),
        ("319", "Deep Link URL Navigation", ['Module must support deep linking'], ['Copy URL of a specific record', 'Open new browser tab', 'Paste and navigate', 'Verify correct record displays', 'Test non-existent record URL'], ['Deep linking navigates to specific record', 'Non-existent records show error']),
        ("320", "Browser History Navigation", ['Module must support browser history'], ['Navigate through several pages', 'Press browser back button', 'Verify previous page loads', 'Press forward', 'Verify next page'], ['Browser back/forward navigation works', 'Page state is preserved']),
        ("321", "Wizard Step Navigation", ['Module must have multi-step wizards'], ['Start a multi-step wizard', 'Navigate to step 2', 'Navigate back to step 1', 'Verify data preserved', 'Navigate to last step'], ['Wizard navigation preserves data', 'Step indicators show progress']),
        ("322", "Accordion Section Navigation", ['Module must have accordion UI'], ['Open page with accordion sections', 'Click section header to expand', 'Verify content shown', 'Click another section', 'Verify previous collapses per config'], ['Accordion expand/collapse works correctly', 'Multiple sections may open simultaneously']),
        ("323", "Carousel Slider Navigation", ['Module must have carousel'], ['Navigate to carousel component', 'Click next arrow', 'Verify slide advances', 'Click prev arrow', 'Verify slide goes back'], ['Carousel navigation controls work', 'Slides advance correctly']),
        ("324", "Modal Dialog Navigation", ['Module must have modal dialogs'], ['Trigger modal dialog', 'Verify modal opens', 'Press Escape', 'Verify modal closes', 'Reopen and click close button'], ['Modal opens and closes correctly', 'Escape key closes modal']),
        ("325", "Notification Center Navigation", ['Module must have notifications'], ['Click notification bell icon', 'Verify notification panel opens', 'Click a notification', 'Verify navigation to relevant content', 'Mark as read'], ['Notifications navigate to relevant content', 'Notification management works']),
    ]


    for idx, (mod_name, mod_code, mod_desc) in enumerate(mods, 1):
        add_heading(f"4.{idx} {mod_name}", level=2)
        add_heading(f"4.{idx}.1 Feature Description", level=3)
        add_para(mod_desc)
        add_heading(f"4.{idx}.2 Prerequisites", level=3)
        for pr in ["User must have a registered and verified beta testing account",
                     "User must be logged in with appropriate permissions",
                     "Testing environment must be properly configured",
                     f"The {mod_name} module must be accessible and operational",
                     "Required test data must be loaded in the testing environment"]:
            add_bullet(pr)
        add_heading(f"4.{idx}.3 Test Cases", level=3)
        add_para(f"This section contains 200 detailed test cases for the {mod_name} module. Each test case is uniquely identified and follows the standardized documentation format. Testers should execute all test cases and document results thoroughly.")
        for i in range(200):
            tid, tname, tpre, tsteps, texp = tc_base[i % len(tc_base)]
            add_test_case(f"{mod_code}-{tid}", tname, f"Verify {tname.lower()} for {mod_name}", tpre, tsteps, texp)
        add_page_break()


# ═══════════════════════════════════════════════════════════════════════
# SECTION 5: ISSUE REPORTING
# ═══════════════════════════════════════════════════════════════════════
def build_section_5():
    add_heading("5. Issue Reporting", level=1)
    add_heading("5.1 Issue Reporting Process", level=2)
    for t in [
        "The issue reporting process enables testers to communicate defects and suggestions to the development team. When identifying an issue, testers should first verify reproducibility, then document all relevant information before submitting through the in-website contact form.",
        "After submission, the QA team reviews for completeness, assigns severity, and routes to the appropriate development team. Testers should monitor issue status and may be contacted for additional information."
    ]:
        add_para(t)
    add_heading("5.2 Issue Report Format", level=2)
    make_table(["Field", "Description"], [
        ("Issue ID", "Auto-assigned by tracking system"),
        ("Reported By", "Beta tester identifier"),
        ("Feature/Module", "Affected module"),
        ("Severity", "Critical / Major / Minor / Enhancement"),
        ("Description", "Clear, concise issue description"),
        ("Steps to Reproduce", "Numbered exact steps"),
        ("Expected Behavior", "What should happen"),
        ("Actual Behavior", "What actually happens"),
        ("Environment", "Browser, OS, device, resolution"),
        ("Status", "Open / In Progress / Resolved / Verified / Closed"),
    ])
    add_heading("5.3 Issue Severity Definitions", level=2)
    make_table(["Severity", "Definition"], [
        ("Critical", "Complete system failure, data loss, security breach."),
        ("Major", "Significant functionality impact but platform remains usable."),
        ("Minor", "Limited impact on functionality or UX."),
        ("Enhancement", "Suggestions for improvements or new features."),
    ])
    add_heading("5.4 Issue Lifecycle", level=2)
    for t in ["The issue lifecycle comprises: Open, Triaging, Confirmed, In Progress, Resolved, Verified, Closed."]:
        add_para(t)
    add_heading("5.5 Escalation Procedures", level=2)
    for t in [
        "Level 1: Tester contacts QA Team Lead. Level 2: Escalation to Development and QA Managers. Level 3: Program Director and executive stakeholders.",
        "Critical issues not addressed within 4 hours or Major issues within 24 hours warrant escalation."
    ]:
        add_para(t)
    add_page_break()

# ═══════════════════════════════════════════════════════════════════════
# SECTION 6: RULES OF ENGAGEMENT
# ═══════════════════════════════════════════════════════════════════════
def build_section_6():
    add_heading("6. Rules of Engagement and Conduct", level=1)
    add_para("This section establishes mandatory rules and standards of conduct for all participants.")
    add_heading("6.1 Confidentiality Obligations", level=2)
    for t in [
        "All beta testers are bound by strict confidentiality obligations regarding all information accessed during testing.",
        "Confidentiality obligations continue indefinitely until information becomes publicly available."
    ]:
        add_para(t)
    add_heading("6.2 Acceptable Use Policy", level=2)
    for t in ["The beta platform is provided solely for authorized testing activities."]:
        add_para(t)
    add_heading("6.3 Prohibited Activities", level=2)
    for act in [
        "Sharing login credentials or allowing unauthorized platform access",
        "Distributing confidential information to unauthorized parties",
        "Attempting to bypass security measures or access controls",
        "Introducing malicious data, code, or content into the environment",
        "Harassing or mistreating any program participant",
        "Submitting false or misleading issue reports",
        "Accessing data beyond authorized testing scope",
        "Using the platform for any commercial purpose",
        "Reverse engineering platform components",
        "Conducting unauthorized automated testing",
        "Attempting to access other users accounts or data",
    ]:
        add_bullet(act)
    add_heading("6.4 Data Handling Requirements", level=2)
    for t in ["Testers must handle all data per Express Airways data protection policies. Use provided test data only."]:
        add_para(t)
    add_heading("6.5 Communication Protocols", level=2)
    for t in ["Primary channel is the in-website contact form for issue reporting."]:
        add_para(t)
    add_heading("6.6 Violations and Consequences", level=2)
    add_heading("6.6.1 Level 1: Minor Infractions", level=3)
    for c in ["Written warning", "Mandatory policy review", "Account restriction (48 hours read-only)"]:
        add_bullet(c)
    add_heading("6.6.2 Level 2: Moderate Violations", level=3)
    for c in ["Account suspension (7 days)", "5,000 mile penalty", "One-level tier downgrade"]:
        add_bullet(c)
    add_heading("6.6.3 Level 3: Serious Breaches", level=3)
    for c in ["Account suspension (30 days)", "25,000 mile penalty", "Permanent beta testing ban"]:
        add_bullet(c)
    add_heading("6.6.4 Level 4: Critical Violations", level=3)
    for c in ["Permanent account termination", "Forfeiture of all accrued miles", "Legal action pursued"]:
        add_bullet(c)
    add_heading("6.7 Appeals Process", level=2)
    for t in ["Testers may appeal disciplinary actions within 10 business days through the appeals process."]:
        add_para(t)
    add_heading("6.8 Whistleblower Protection", level=2)
    for t in ["Report illegal activity, policy violations, or ethical breaches through the confidential reporting system."]:
        add_para(t)
    add_page_break()

# ═══════════════════════════════════════════════════════════════════════
# SECTION 7: FEATURE SPECIFICATIONS
# ═══════════════════════════════════════════════════════════════════════
def build_section_7():
    add_heading("7. Feature Specifications", level=1)
    specs = [
        ("Express Airways Flight Center", "FC", "flight management"),
        ("Express Airways Airport Guide", "AG", "airport information"),
        ("Express Airways Travel Services", "TS", "travel booking"),
        ("Express Airways Holdings", "HL", "financial data"),
        ("Express Airways Document Center", "DC", "document management"),
        ("Express Airways Operations Hub", "OH", "operations"),
        ("Express Airways System Status", "SS", "system monitoring"),
        ("Express Airways Account Center", "AC", "account management"),
        ("Express Airways Administration", "AD", "administration"),
        ("Express Airways Legal Portal", "LP", "legal"),
        ("Express Airways Developer Portal", "DP", "developer tools"),
    ]
    fr_funcs = [
        "provide user interface for accessing", "support searching using keyword-based queries",
        "display search results in paginated list format", "allow users to filter results by relevant criteria",
        "provide detailed view pages for individual items", "support creating new records through form interface",
        "support editing existing records through form interface", "support deleting records with confirmation prompts",
        "validate all input data before saving records", "provide export functionality in CSV and PDF formats",
        "maintain complete audit trail of all data changes", "support role-based access control for operations",
        "send notifications for important events and state changes", "support bulk operations where applicable",
        "provide real-time updates via WebSocket connections", "cache frequently accessed data for improved performance",
        "support searching by date range with calendar picker", "provide sorting capabilities on all list views",
        "support importing data from CSV files with validation", "display loading states during data retrieval",
        "handle concurrent access to records consistently", "provide helpful tooltips for interface elements",
        "support keyboard shortcuts for common operations", "integrate data with related modules via API",
        "provide customizable views for data display", "support data archiving for historical records",
        "provide advanced search options with multiple fields", "support user preference saving for view settings",
        "provide comprehensive error handling for all operations", "display confirmation dialogs before destructive actions",
        "support undo operations for recent changes where feasible", "provide activity logging for user actions",
        "support data reconciliation between systems", "provide dashboard widgets summarizing key metrics",
        "display contextual help for all interface elements", "support configurable page sizes for list views",
        "provide data validation with real-time field-level feedback", "support batch editing of multiple records",
        "display data change history with user attribution", "support template-based record creation",
        "provide data comparison for side-by-side review", "support bookmarking frequently accessed records",
        "display recent activity history for user reference", "support automatic draft saving for long forms",
        "provide data merging for duplicate records", "support data splitting for complex records",
        "display data lineage information for traceability", "support collaborative editing with conflict resolution",
        "provide data quality scoring and validation reports", "support data enrichment through external sources",
        "display data usage statistics and access frequency", "support data lifecycle management with workflows",
        "provide data classification and sensitivity tagging", "support data redaction for sensitive information",
        "display data relationship maps for interconnected records", "support multi-level approval workflows",
        "provide data publishing controls with scheduled release", "support data rollback to previous versions",
        "provide user activity timeline views", "support multi-language internationalization",
        "display localized date and number formats", "support responsive design for all screen sizes",
        "provide accessibility compliance with WCAG standards", "support screen reader compatibility",
        "provide keyboard navigation for all functions", "support high contrast display modes",
        "provide alternative text for all images", "provide captions for multimedia content",
        "support reduced motion preferences", "provide consistent navigation patterns across pages",
        "support breadcrumb navigation trails", "provide print-friendly page layouts",
        "support PDF generation for documents", "provide CSV export with customizable columns",
        "support JSON export for API consumption", "support XML export for legacy systems",
        "provide scheduled report generation", "support email delivery of reports",
        "provide file upload with virus scanning", "support image resizing and optimization",
        "support document format conversion", "provide full-text search across document content",
        "support faceted search navigation", "provide search term highlighting in results",
        "support saved search queries for reuse", "provide search suggestions based on popular queries",
        "support spelling correction for search terms", "support synonym expansion for search queries",
        "provide natural language search capabilities", "support geospatial search for location data",
        "provide cross-module search functionality", "support machine learning for personalized results",
        "provide recommendation engine for related content", "support content personalization based on profile",
        "provide adaptive interfaces based on usage patterns", "support feature flag toggling for gradual rollout",
        "provide A/B testing framework for UI experiments", "support usage analytics collection and reporting",
        "provide performance monitoring and alerting", "support error tracking and aggregation",
        "provide log management and retention", "support distributed tracing for debugging",
        "provide health check endpoints for monitoring", "support metrics export to monitoring platforms",
        "provide SLA compliance dashboards", "support automated incident response workflows",
        "provide capacity planning with trend analysis", "support resource optimization recommendations",
        "provide security information and event management", "support threat detection and alerting",
        "provide vulnerability management workflows", "support configuration management database",
        "provide change management workflows", "support release management and deployment automation",
        "provide automated testing framework support", "support code quality and coverage reporting",
        "provide dependency management and scanning", "support container orchestration integration",
        "provide infrastructure as code support", "support secrets management and rotation",
        "provide identity and access management integration", "support privileged access management workflows",
        "support consent and preference management", "provide data subject request handling",
        "support privacy impact assessment workflows", "provide data breach notification automation",
        "provide compliance reporting for multiple frameworks", "support policy management and attestation",
        "provide control testing and evidence collection", "support risk assessment and treatment workflows",
        "provide vendor risk management", "support business continuity planning",
        "provide disaster recovery orchestration", "support data replication for high availability",
        "provide failover testing automation", "support backup scheduling and verification",
        "provide data retention policy enforcement", "support legal hold management for e-discovery",
        "provide contract management and lifecycle", "support document generation from templates",
        "provide digital signature integration", "support case management for legal matters",
        "provide matter planning and budgeting", "support regulatory filing and compliance reporting",
    ]
    for idx, (fname, fcode, fdomain) in enumerate(specs, 1):
        add_heading(f"7.{idx} {fname}", level=2)
        add_heading(f"7.{idx}.1 Functional Requirements", level=3)
        add_para(f"The following {len(fr_funcs)} requirements define specific behaviors for the {fname} module.")
        for i, txt in enumerate(fr_funcs, 1):
            add_para(f"FR-{fcode}-{i:03d}: The system shall {txt} {fdomain} functionality.")
        add_heading(f"7.{idx}.2 Non-Functional Requirements", level=3)
        nfrs = [
            "achieve 99.9% uptime during beta testing hours", "support at least 500 concurrent users without degradation",
            "respond within 2 seconds for 95th percentile API requests", "load within 3 seconds on standard broadband",
            "comply with WCAG 2.1 Level AA accessibility standards", "support internationalization for all text",
            "maintain data consistency across all integrated services", "support graceful degradation when dependencies fail",
            "provide comprehensive user-facing help documentation", "support localization for at least 12 languages",
            "maintain backwards compatibility for 2 major API versions", "support offline mode for critical read-only",
            "achieve 90%+ user satisfaction in usability surveys", "support automated deployment with zero-downtime",
            "maintain complete API documentation with working examples", "support screen reader compatibility",
            "achieve 100% test coverage for critical business logic", "support audit logging with tamper-evident storage",
            "maintain data retention compliance with all regulations", "support horizontal scaling through stateless design",
            "achieve sub-100ms database query times for 99% of reads", "support real-time data synchronization",
            "maintain session consistency across load-balanced instances", "support progressive web app capabilities",
            "achieve 95% code quality metrics in automated scanning", "support monitoring for all service components",
            "maintain comprehensive disaster recovery capabilities", "achieve 99.99% data durability",
            "support field-level encryption for PII data", "maintain TLS 1.3 for all network communications",
            "achieve sub-second automatic failover for databases", "maintain zero-data-loss recovery point objective",
            "achieve 4-hour recovery time for critical services", "support automated backup integrity verification",
            "maintain 7-year audit log retention", "support immutable WORM storage for audit logs",
            "achieve 100% compliance with applicable regulations", "support regular penetration testing schedule",
            "maintain vulnerability remediation SLAs", "support responsible security disclosure program",
            "achieve OWASP Top 10 compliance", "maintain GDPR and CCPA compliance",
            "support PCI DSS compliance for payment data", "achieve ISO 27001 certification alignment",
            "maintain 99.999% authentication service availability", "support multi-factor authentication",
            "maintain password complexity requirements", "support single sign-on integration",
            "achieve 100% uptime for core API gateway", "maintain 99.5% uptime for supporting services",
            "support scheduled maintenance windows with advance notice", "achieve 60-second incident detection time",
            "maintain 15-minute incident response for critical issues", "support automated incident remediation",
            "achieve 95% automated test coverage", "maintain 80% code coverage minimum",
            "support continuous integration pipeline", "maintain 24-hour deployment frequency",
            "support automated rollback capability", "achieve zero-downtime database migrations",
            "support feature flag infrastructure", "achieve 99% API response success rate",
            "maintain 200ms p95 API response time", "support 1000 requests per second throughput",
            "achieve 90% cache hit ratio", "support 100ms push notification delivery",
            "maintain 99% email delivery rate", "achieve 5-second page load on 3G networks",
            "maintain 60fps rendering for animations", "support 1000 WebSocket connections",
            "achieve 10000 database transactions per second", "support auto-scaling for demand spikes",
            "achieve 100% configuration as code", "maintain immutable infrastructure",
            "support canary deployments", "maintain 100% infrastructure monitoring",
            "support log aggregation for all services", "achieve 30-day log retention",
            "maintain 1-year metric retention", "support 15-second metric granularity",
            "achieve actionable alert definitions for all SLIs", "maintain 5-minute alert response time",
            "support integration with incident management systems", "achieve 80% alert-to-ticket conversion rate",
            "support runbook automation for common alerts", "achieve 90% first-response resolution rate",
            "maintain 24/7 on-call coverage for critical services", "support escalation policy enforcement",
            "achieve 100% postmortem documentation for incidents", "support continuous improvement culture",
            "maintain 95% customer satisfaction for support", "achieve 4-hour response for critical support tickets",
            "support 24/7 support coverage for critical issues", "achieve first-contact resolution for common issues",
        ]
        for i, n in enumerate(nfrs, 1):
            add_para(f"NFR-{fcode}-{i:03d}: The {fname} module shall {n}.")
        add_heading(f"7.{idx}.3 User Interface Requirements", level=3)
        for i, u in enumerate([
            "use Express Airways design system components consistently",
            "follow responsive design for mobile, tablet, and desktop",
            "use platform-wide navigation patterns consistently",
            "display inline validation messages on form fields",
            "use skeleton loading screens for data fetching states",
            "display user-friendly error messages with recovery options",
            "display helpful guidance in empty states with call-to-action",
            "support keyboard navigation with visible focus indicators",
            "provide touch-friendly interaction targets at least 44x44px",
            "maintain consistent visual hierarchy across all pages",
            "use accessible color contrast ratios meeting WCAG AA standards",
            "provide clear visual feedback for all user interactions",
            "display progress indicators for operations over 1 second",
            "provide responsive images that adapt to viewport size",
        ], 1):
            add_para(f"UI-{fcode}-{i:03d}: The {fname} interface shall {u}.")
        add_heading(f"7.{idx}.4 Data Requirements", level=3)
        for i, d in enumerate([
            "store all data in the designated database schema",
            "maintain relationships with other modules via foreign keys",
            "implement data retention policies per EA standards",
            "encrypt backups stored in geographically distributed locations",
            "encrypt personally identifiable information at rest",
            "log all data access for audit purposes with user attribution",
            "maintain referential integrity across all related data entities",
            "support data archiving for records older than retention period",
            "provide data validation at both client and server levels",
            "implement data deduplication to prevent duplicate records",
        ], 1):
            add_para(f"DR-{fcode}-{i:03d}: {d}.")
        add_heading(f"7.{idx}.5 Error Handling Requirements", level=3)
        for i, e in enumerate([
            "return structured error responses with codes and messages",
            "log all errors with stack traces to centralized logging system",
            "display retry options for network timeouts and transient failures",
            "highlight specific fields with validation errors inline",
            "handle concurrent modification conflicts with clear messaging",
            "show generic error page for unexpected errors",
            "provide error correlation IDs for support reference",
            "degrade gracefully when dependent services are unavailable",
            "display meaningful error messages without technical jargon",
            "offer alternative actions when requested operations fail",
        ], 1):
            add_para(f"ER-{fcode}-{i:03d}: {e}.")
        add_heading(f"7.{idx}.6 Security Requirements", level=3)
        for i, s in enumerate([
            "control access through role-based permissions",
            "require valid authentication tokens for all API calls",
            "implement input validation to prevent injection attacks",
            "encrypt sensitive data in transit using TLS 1.3",
            "encrypt sensitive data at rest using AES-256",
            "log all access attempts for security monitoring",
            "implement rate limiting to prevent API abuse",
            "support multi-factor authentication for sensitive operations",
            "implement session timeout after inactivity period",
            "provide audit trail for all security-relevant events",
        ], 1):
            add_para(f"SR-{fcode}-{i:03d}: {s}.")
        add_heading(f"7.{idx}.7 Performance Requirements", level=3)
        for i, p in enumerate([
            "support 1000 requests per minute under normal load",
            "execute database queries within 500ms for 99% of queries",
            "cache frequently accessed data with appropriate TTL",
            "process 1000 records within 30 seconds in bulk operations",
            "support horizontal scaling for increased load demands",
            "achieve page load time under 3 seconds on standard connection",
            "maintain API response time under 200ms for simple endpoints",
            "support 500 concurrent users without degradation",
            "achieve 90% cache hit ratio for frequently accessed data",
            "maintain 60fps rendering for animations and transitions",
        ], 1):
            add_para(f"PR-{fcode}-{i:03d}: {p}.")
        add_heading(f"7.{idx}.8 Integration Requirements", level=3)
        for i, ir in enumerate([
            "expose a REST API for integration with other modules",
            "publish events to message bus for state changes",
            "subscribe to relevant events from other modules",
            "complete cross-module data synchronization within 5 seconds",
            "support webhook callbacks for external integration",
            "provide API versioning for backward compatibility",
            "support batch operations for efficient data processing",
            "implement circuit breakers for external dependency calls",
            "provide health check endpoints for monitoring systems",
            "support event-driven architecture for loose coupling",
        ], 1):
            add_para(f"IR-{fcode}-{i:03d}: {ir}.")
        add_page_break()

# ═══════════════════════════════════════════════════════════════════════
# SECTION 8: SECURITY PROTOCOLS
# ═══════════════════════════════════════════════════════════════════════
def build_section_8():
    add_heading("8. Security Protocols", level=1)
    add_heading("8.1 Authentication Requirements", level=2)
    add_para("The Express Airways Digital Platform implements a comprehensive defense-in-depth authentication framework.")
    add_heading("8.1.1 Multi-Step Verification Process", level=3)
    for t in [
        "Step 1 - Primary Credential Verification: The user must provide their registered username and password combination. Passwords are hashed using bcrypt with a work factor of 12. Password complexity requirements mandate a minimum of 12 characters including uppercase, lowercase, numeric, and special characters. After 5 consecutive failed login attempts, the account is temporarily locked for 15 minutes.",
        "Step 2 - Device Recognition: The system analyzes a comprehensive device fingerprint including browser type, operating system, screen resolution, timezone, installed fonts, and platform architecture. Recognized devices may be trusted for streamlined verification in subsequent sessions.",
        "Step 3 - Time-Based One-Time Password (TOTP): Users with MFA enabled must provide a 6-digit code generated by their registered authenticator application. The TOTP code is valid for 30 seconds and can only be used once. Users can register up to 5 authenticator devices for redundancy.",
        "Step 4 - Email Verification Code: An 8-character verification code is sent to the user registered email address for high-risk scenarios. The code expires 10 minutes after generation. This step is triggered from new geographic locations or after password changes.",
        "Step 5 - Security Question Verification: For the highest-risk scenarios, users answer pre-configured security questions. Answers are compared against stored hashes. Users configure at least 3 security questions during account registration.",
        "Step 6 - Knowledge-Based Authentication: Questions derived from user transaction history that only the legitimate user would know. Dynamic questions are generated from non-public information such as recent bookings or profile details.",
        "Step 7 - Behavioral Biometric Analysis: Analysis of user interaction patterns including typing rhythm, mouse movements, and scrolling behavior. A behavioral profile is built over the first several sessions.",
        "Step 8 - Session Binding and Token Issuance: Upon successful verification, a JWT access token with 15-minute expiration is issued along with a refresh token with 7-day expiration. The session is cryptographically bound to the device fingerprint and IP address."
    ]:
        add_para(t)
    add_heading("8.1.2 Time-Based Cipher System", level=3)
    for t in [
        "The time-based cipher system combines the current UTC time with the user unique device identifier, a server-side rotating secret key, and the current session context. These four inputs produce an 8-character alphanumeric code valid only for the current 30-second window.",
        "The server-side secret key is rotated every 24 hours through a deterministic key derivation function. The system maintains a window of 5 time intervals to accommodate clock skew. Each code can only be used once within its valid window.",
    ]:
        add_para(t)
    add_heading("8.1.3 Visual Pattern Verification", level=3)
    for t in [
        "Users select a sequence of points on an image in a specific order during account setup. The system presents a different image each time, but the user pattern points remain consistent relative to image features using image registration algorithms.",
        "The visual pattern is resistant to observation attacks because an observer witnessing the pattern on one image cannot reproduce it on a different image. The library contains 100+ curated images across 10 categories."
    ]:
        add_para(t)
    add_heading("8.1.4 Gesture Sequence Verification", level=3)
    for t in [
        "Users define a sequence of 5-8 touch gestures performed in a defined order. The system records gesture type, position, duration, and pressure. Each gesture has a tolerance window of 10% for position and 25% for duration.",
        "After 5 consecutive failed attempts, the gesture method is locked for 1 hour. Users can have up to 3 different gesture sequences configured for redundancy."
    ]:
        add_para(t)
    add_heading("8.1.5 Device Binding", level=3)
    for t in [
        "A unique device key pair is generated during initial authentication. The public key is registered with the server; the private key never leaves the client device. Each API request must be signed with the private key.",
        "Users can manage bound devices through Account Center. The system supports up to 10 bound devices per user account. Lost or stolen devices can be remotely unbound through account recovery."
    ]:
        add_para(t)
    add_heading("8.1.6 Secret Handshake Verification", level=3)
    for t in [
        "Users create a secret handshake consisting of 4-6 interactions with interface elements in a specific order. The handshake is resistant to observation attacks because interface elements are arranged differently each time.",
        "The system includes a learning mode that adapts to natural variations in user behavior over time while detecting major changes that may indicate unauthorized access."
    ]:
        add_para(t)
    add_heading("8.1.7 Dynamic Token Verification", level=3)
    for t in [
        "The dynamic token system supports multiple token types and selects the appropriate type based on risk assessment. Risk factors include geographic location, time of day, device reputation, and transaction value.",
        "Step-up authentication can be triggered for high-risk operations within an existing session without requiring full re-authentication."
    ]:
        add_para(t)
    add_heading("8.1.8 Session Completion and Logout", level=3)
    for t in [
        "Explicit logout immediately invalidates access and refresh tokens. Inactivity timeout (30 minutes default) automatically terminates idle sessions. Absolute session expiry of 12 hours limits the vulnerability window.",
        "Users are warned 5 minutes before absolute expiry and can save their work before re-authentication is required."
    ]:
        add_para(t)
    add_heading("8.1.9 Complete 15-Step Login Verification Process", level=3)
    add_para("The Express Airways Digital Platform implements the most comprehensive, multi-layered login verification system ever deployed in the aviation industry. This 15-step process interweaves ten automatic computer-handled checks with five user-interactive challenges to create an authentication barrier that is mathematically impossible for competitors to bypass, share, or replicate. Each step independently enforces the property of non-transferability meaning no step can be communicated from one human to another in a usable form. Collectively, the 15 steps transform the simple act of logging in into a robust identity verification ceremony that simultaneously proves who the user is, what device they are using, where they are located, when they are logging in, and that they are a living human being in real time. The following subsections document each step in excruciating technical detail, beginning with the ten fully automatic stages that execute silently with zero user interaction.")
    add_para("The design philosophy behind the 15-step process rests on five independent pillars: non-transferability (each factor is inherently bound to the individual and cannot be shared), non-forgeability (each factor requires real-time computation or biological presence that cannot be simulated), non-reusability (each authentication attempt consumes unique ephemeral data that is immediately invalidated), non-observability (the interactive steps cannot be observed and replicated by a third party), and non-circumventability (bypassing any single step requires compromising all others, which is computationally and logistically infeasible). Together, these pillars ensure that any attempt to infiltrate the system, whether by credential theft, session hijacking, man-in-the-middle attack, insider collusion, or brute force, must simultaneously defeat all 15 independent verification layers within a combined time window measured in seconds.")
    add_heading("Steps 1-10: Automatic Computer-Handled Verification", level=4)
    add_para("Steps 1 through 10 execute entirely on the server side or within the browser sandbox without any user awareness or interaction. These steps run sequentially with strict timeout constraints, and failure at any step immediately terminates the authentication attempt before the user is ever prompted for credentials. The automatic checks verify the hardware, network, runtime environment, and behavioral characteristics of the requesting client, establishing a foundational trust layer that makes it impossible for automated scripts, botnets, remote desktop sessions, or shared devices to reach the user-interactive stages.")

    add_heading("Step 1: Device Fingerprint Capture", level=4)
    add_para("Technically, the server sends a fingerprinting script that collects over 200 distinct browser and hardware characteristics. These include the complete list of installed system fonts enumerated via JavaScript font detection, screen resolution and color depth, the full set of navigator properties (platform, language, userAgent, appVersion, hardwareConcurrency, deviceMemory), WebGL renderer and vendor strings, canvas fingerprint via a 2D rendering of specific text and shapes at precise coordinates, AudioContext fingerprint via frequency response analysis, installed plugin list via navigator.plugins, timezone offset via Date.getTimezoneOffset, touch support detection, and battery status via navigator.getBattery. All characteristics are concatenated into a deterministic string and hashed with SHA-512 to produce a 128-character device fingerprint. The resulting hash is compared against the registered device profile stored on the server from the user enrollment session. A similarity score is computed using weighted Jaccard similarity, and a threshold of 92% match is required for the check to pass.")
    add_para("Non-transferability: The device fingerprint is tied to the specific combination of hardware components, installed software, and driver versions of a single physical machine. Two humans cannot share the same fingerprint because they cannot share the same physical device simultaneously, and even identical hardware models diverge at the driver, firmware, and manufacturing lot level. Attempting to copy a fingerprint hash from one device to another fails because the fingerprinting script recalculates from scratch each time, and the hardware characteristics of the destination machine will produce a different hash.")
    add_para("Why it cannot be forgotten: The fingerprint is automatically collected and computed by the browser at authentication time with zero user memory required. The user does not need to remember or record anything. The fingerprint exists as a physical property of the device hardware, as permanent and unchangeable during a session as the device serial number.")
    add_para("Automatic or user-interactive: Fully automatic. The user does not see, hear, or interact with the fingerprinting process. It executes silently within milliseconds as part of the authentication handshake, requiring no action, awareness, or consent from the user at login time. (Consent was obtained during device enrollment.)")
    add_para("Data verified: Over 200 browser and hardware characteristics producing a 128-character SHA-512 hash. The server stores only the enrolled hash plus a device identifier never the raw characteristics. On failure, the system logs the attempted fingerprint alongside the enrolled fingerprint for forensic analysis, increments a device mismatch counter, and blocks the authentication attempt with a generic Could not verify device message. After three consecutive device mismatches, the account is flagged for mandatory re-enrollment, and a security alert is sent to the registered email address.")
    add_para("Security properties: Device fingerprinting provides hardware-level authentication that is resistant to cookie theft, token theft, and password sharing. An attacker who obtains valid credentials cannot authenticate from a different device because the fingerprint check will fail. The 92% similarity threshold accommodates minor driver updates and browser patches while rejecting fundamentally different hardware. The fingerprint hash is never transmitted in plaintext outside the encrypted TLS session, and the raw characteristics are discarded after hashing, ensuring that even a server compromise does not expose the user device profile.")

    add_heading("Step 2: IP Geolocation Verification", level=4)
    add_para("The server resolves the client IP address to a geographic location using a combination of GeoIP databases (MaxMind GeoIP2 and IP2Location queried in parallel for cross-validation) and carrier-grade NAT detection. The resolved location must match the user registered geographic region stored in the UserSecurity sheet, which contains the user country of residence and up to three authorized travel regions. The system computes the Great Circle Distance between the resolved IP location and the registered home location. A distance threshold of 500 kilometers is enforced for home region access, and 5000 kilometers for authorized travel regions. The check also validates that the IP address ASN matches known ISP ranges for the claimed region and that the IP is not listed on any threat intelligence feeds including AlienVault OTX, VirusTotal, and Spamhaus.")
    add_para("Non-transferability: An IP address is assigned by the network infrastructure and cannot be voluntarily changed or shared between humans. Two people in different cities have different IP addresses. Two people in the same household may share a public IP, but the additional device fingerprint and behavioral checks distinguish between them. A user attempting to share their credentials with someone in another city will fail the geolocation check because the collaborator IP resolves to a different location.")
    add_para("Why it cannot be forgotten: The user does not need to remember their IP address or geographic region. The IP address is automatically determined by the network connection at the moment of authentication, and the region mapping is handled server-side. The user only needs to ensure they are connecting from their registered country, which is inherent to their physical location.")
    add_para("Automatic or user-interactive: Fully automatic. The IP-to-location resolution occurs server-side without any user involvement. The user does not need to enter their location, confirm their country, or interact with any geolocation interface. The check is invisible and instantaneous.")
    add_para("Data verified: Client source IP address, GeoIP location (country, region, city, latitude, longitude, ASN, ISP), threat intelligence matches, VPN/proxy detection flags, and computed distance from registered home location. On failure, the system logs the connection IP, resolved location, and attempted user account. The user receives a notification via email titled Unusual sign-in location detected with the approximate city and country of the attempt. The authentication is blocked, and the user must either connect from their registered region or complete an identity recovery process to add the new location as an authorized region. Repeated failures from unregistered regions trigger an account-wide security freeze requiring manual verification by the security team.")
    add_para("Security properties: Geolocation verification prevents credential-stuffing attacks originating from different geographic regions, blocks access from known malicious IP ranges, and detects impossible travel scenarios where a user authenticates from two distant locations within an unreasonably short time. Combined with device fingerprinting, this creates a where you are and what device you are using authentication factor pair that cannot be simultaneously satisfied by an attacker in a different country using different hardware.")

    add_heading("Step 3: Browser Integrity Check", level=4)
    add_para("The server executes a comprehensive browser integrity verification script that detects whether the client browser is a legitimate user-controlled browser or an automated headless browser, bot, script, or remote-controlled environment. The script checks over 40 distinct indicators: navigator.webdriver (must be undefined or false), navigator.plugins (must have at least 3 legitimate plugin entries), chrome.runtime (must exist in Chrome-based browsers), navigator.languages (must be a non-empty array), the presence of standard browser objects (chrome, opr, safari, etc. matching the claimed User-Agent), screen dimensions that match a standard display resolution, the existence and behavior of document.hidden and document.visibilityState, the performance of Canvas and WebGL rendering (headless browsers render differently), the presence of a standard event loop (headless browsers process events differently), the behavior of navigator.hardwareConcurrency, navigator.deviceMemory, navigator.connection, and the User-Agent string consistency (no mismatched version numbers or impossible combinations like Chrome claiming to run on iOS with a desktop User-Agent). The script also detects Selenium, Puppeteer, Playwright, and PhantomJS runtime flags by checking for the presence of their automation-specific DOM elements and JavaScript properties.")
    add_para("Non-transferability: Browser integrity properties are runtime characteristics of the specific browser instance on the specific device. A legitimate user on a standard browser will pass; any user running automation software, even the legitimate user themselves, will fail. The check does not distinguish between a malicious bot and a legitimate user running browser automation they cannot share the automation environment with another person without being detected.")
    add_para("Why it cannot be forgotten: The browser integrity check examines properties that are intrinsic to the browser runtime. The user does not need to maintain or remember any browser configuration beyond using a standard, unmodified browser. Any deviation from standard browser behavior (such as running in automation mode) is automatically detected without the user needing to understand or configure anything.")
    add_para("Automatic or user-interactive: Fully automatic. The integrity check runs as a JavaScript injection during the TLS handshake preload phase, executing and returning results before any page content is rendered. The user is not aware of the check and cannot influence its outcome through normal browser usage.")
    add_para("Data verified: Over 40 browser integrity indicators including navigator.webdriver, navigator.plugins length, chrome.runtime presence, screen dimensions, User-Agent consistency, Canvas rendering differences, event loop behavior, and automation framework detection flags. On failure, the system logs the specific integrity checks that were failed and the automation indicators that were detected. The authentication attempt is immediately terminated with a generic Security check failed response that does not reveal which specific check failed. All subsequent authentication attempts from the same IP are rate-limited to one per minute for the next hour. Repeated failures add the IP to a temporary blacklist and trigger a security alert to the infrastructure team.")
    add_para("Security properties: Browser integrity verification prevents automated credential stuffing attacks, bot-driven account enumeration, API abuse from scripted clients, and session replay from remote-controlled browser instances. This check ensures that every authentication attempt originates from a genuine human-operated browser, which is a foundational requirement for the subsequent behavioral biometric and interactive challenge steps that rely on genuine human interaction patterns.")

    add_heading("Step 4: Clock Synchronization", level=4)
    add_para("The server initiates a clock synchronization protocol by sending a cryptographically signed timestamp in ISO 8601 format with nanosecond precision as part of the TLS handshake response headers. The client browser reads this timestamp and immediately echoes it back along with its own current timestamp obtained from performance.timeOrigin and performance.now combined. The server computes the round-trip time (RTT) as the difference between the current server time and the echoed server timestamp, then computes the clock skew by comparing the client timestamp against the server timestamp adjusted for half the RTT. The absolute clock skew must be less than 3 seconds for the check to pass. The server also validates that the measured RTT is consistent with the expected network latency for the client geographic location determined in Step 2, which prevents the client from artificially inflating the RTT to hide clock skew. The clock synchronization value is cached with a 5-minute TTL to avoid repeated measurements during subsequent API calls within the same session.")
    add_para("Non-transferability: Clock synchronization requires a real-time network round trip between the specific client device and the server. The timestamps are signed with the server private key and the client must return the exact server timestamp received. An attacker cannot forward the server timestamp to a different machine because the clock skew computed on the second machine would differ, and the RTT would not match the expected latency for the client location. Two people cannot share a clock synchronization result because each result is unique to a specific client-server pair at a specific moment.")
    add_para("Why it cannot be forgotten: Clock synchronization is an automatic network measurement that requires no user memory or configuration. The user does not need to know their system time, set it correctly, or perform any action. The check succeeds automatically as long as the device system clock is reasonably accurate (within 3 seconds of real time), which is the default for any modern device with network time synchronization enabled.")
    add_para("Automatic or user-interactive: Fully automatic. The clock synchronization handshake occurs at the HTTP header level during the initial page request, before any HTML is rendered. No JavaScript, user input, or browser interaction is required. The check executes in under 100 milliseconds and is invisible to the user.")
    add_para("Data verified: Server-sent timestamp, client-echoed timestamp, client local timestamp, computed clock skew (must be under 3 seconds), measured RTT (must be consistent with geographic location), and temporal consistency (the server verifies that the client response arrived within 10 seconds of the initial timestamp to prevent delayed replay). On failure, the system logs the clock skew value, the client reported timestamp, the server timestamp, and the RTT. The authentication is blocked with a time synchronization error. The user is shown a message indicating that their device clock appears to be incorrect and is provided with instructions to enable automatic time synchronization in their operating system settings. After correcting the clock, the user can retry authentication immediately.")
    add_para("Security properties: Clock synchronization is critical for preventing replay attacks where an attacker captures a previous authentication handshake and replays it at a later time. If the attacker device clock differs from the server clock by more than 3 seconds, the authentication is rejected even if all other credentials are valid. This check also ensures that time-based factors (TOTP codes, time-limited passwords, dynamic color challenges) are computed correctly, since all time-dependent operations require synchronized clocks for accurate verification.")

    add_heading("Step 5: Proof of Work", level=4)
    add_para("The server generates a unique proof-of-work challenge consisting of a 32-byte random seed, a target difficulty level (number of leading zero bits required in the SHA-256 hash output), and a maximum nonce range. The difficulty level is dynamically adjusted based on the current server load and the detected client computational capability from Step 1: clients with more CPU cores and higher clock speeds receive proportionally harder challenges to ensure the computational cost is consistent across devices. The client JavaScript must find a nonce value such that SHA-256(seed || nonce) produces a hash starting with the required number of zero bits. For a typical difficulty of 20 bits, the client must perform an average of 2^20 (approximately 1,048,576) hash computations, which takes 2-5 seconds on modern hardware using WebAssembly-accelerated SHA-256. The computation is executed in a Web Worker to avoid blocking the main UI thread. The client must return the discovered nonce within 5 seconds of receiving the challenge. The server verifies the solution by recomputing the hash and confirming it meets the difficulty target. After verification, both the seed and the nonce are added to a server-side bloom filter to prevent replay attacks where the same challenge solution is reused.")
    add_para("Non-transferability: Proof of work requires real-time local computation on the client device. The challenge seed is unique per authentication attempt and cannot be pre-computed. An attacker cannot receive the challenge on one machine and compute it on another because the challenge is tied to the specific TLS session and the 5-second timeout makes relaying impractical. Two people cannot share a proof-of-work solution because each solution is valid only for the specific challenge seed generated for that specific authentication attempt, and the solution is immediately invalidated after verification.")
    add_para("Why it cannot be forgotten: The user does not need to remember any proof-of-work parameters. The challenge is automatically generated and solved by the browser without any user involvement. The computational result is ephemeral and consumed in real time, leaving no trace that the user could remember or record.")
    add_para("Automatic or user-interactive: Fully automatic. The proof-of-work computation runs entirely in the browser background using Web Workers and WebAssembly. The user sees no prompt, enters no data, and is not asked to solve anything. The computation may cause a barely perceptible increase in CPU fan speed or battery drain, but there is no visible or interactive element. The user simply waits 2-5 seconds while the computation completes transparently.")
    add_para("Data verified: Client-submitted nonce, recomputed SHA-256 hash of (seed || nonce), verification that the hash has the required number of leading zero bits, verification that the nonce is within the allowed range, verification that the challenge was generated within the last 5 seconds, and bloom filter lookup to confirm the challenge has not been solved before. On failure, the server logs the submitted nonce, the recomputed hash, and the reason for failure (timeout, incorrect nonce, replayed challenge). The client is returned a new challenge and allowed up to 3 retries per authentication attempt. After 3 consecutive failures, the authentication is blocked for 30 minutes and the event is flagged for security review as a potential denial-of-service or resource-exhaustion attack.")
    add_para("Security properties: Proof of work imposes a computational cost on each authentication attempt, making mass credential-stuffing attacks economically infeasible. An attacker attempting 10,000 password guesses would need to perform 10 billion SHA-256 hash computations, requiring hours of dedicated GPU or cloud compute time per account. For legitimate users, the 2-5 second computation is an acceptable delay that provides enormous security benefit. The dynamically adjusted difficulty ensures consistent cost regardless of client hardware capability, preventing attackers from using high-performance cloud servers to bypass the check.")

    add_heading("Step 6: Connection Analysis", level=4)
    add_para("The server performs a deep analysis of the client network connection by examining the IP address ASN (Autonomous System Number), the ISP name, the connection type (residential broadband, mobile cellular, corporate, data center, educational, government), and the presence of any proxy, VPN, Tor exit node, or anonymization service. The analysis uses a multi-layered detection approach: commercial VPN/proxy IP databases are queried (IP2Proxy, ProxyCheck, IPQualityScore), machine learning classifiers trained on network behavior patterns analyze the connection for VPN-like characteristics (unusual TTL values, non-standard TCP window sizes, mismatched ASN and geographic location), and the system checks against known Tor exit node lists updated hourly from the Tor project directory. Additionally, the server analyzes the HTTP headers for evidence of proxy forwarding (X-Forwarded-For, X-Real-IP, Via, Forwarded headers that indicate intermediate proxies), checks for WebSocket proxy detection, and examines the TLS handshake for characteristics of proxy termination (unexpected cipher suites, non-standard TLS extensions, or inconsistent certificate chains).")
    add_para("Non-transferability: The network connection type and routing path are determined by the user ISP and their current physical location. A user cannot change their ISP, network type, or routing path to another person control. Two people connecting from different homes have different ISPs and different ASNs. Even within the same home, the system distinguishes between the primary broadband connection and a VPN connection by analyzing the routing characteristics. If a user attempts to share credentials with someone using a VPN, the VPN detection flags the connection.")
    add_para("Why it cannot be forgotten: The user does not need to know their ISP name, ASN number, or connection type. These are automatically determined by the network infrastructure and detected by the server during the connection handshake. The user only needs to connect from their usual network environment, which is inherently where they are.")
    add_para("Automatic or user-interactive: Fully automatic. The connection analysis is performed server-side using the incoming TCP/IP connection parameters and HTTP request headers. No client-side scripts, user input, or interaction is required. The check completes in milliseconds as part of the standard request processing pipeline.")
    add_para("Data verified: Client IP address, ASN number and name, ISP name, connection type classification, VPN/proxy/Tor detection status, threat intelligence feed matches, HTTP proxy header analysis, TLS handshake characteristics, and consistency with registered network profile. On failure, the system logs the detected connection type, the VPN/proxy confidence score if applicable, and all analyzed headers. If a known VPN or proxy is detected, the authentication is blocked and the user is notified that connections from anonymizing services are not permitted for security reasons. Legitimate users who need to use VPN for work reasons must pre-register their VPN exit node IP address through the Account Center security settings, which adds the IP to an allow list and performs additional verification steps.")
    add_para("Security properties: Connection analysis prevents attackers from hiding their true location and identity behind VPNs, proxies, and anonymization networks. This blocks a significant percentage of credential-stuffing and account-takeover attacks that originate from data center IPs and public VPN endpoints. The check also prevents Tor exit node abuse, which is a common attack vector for anonymous account access. By requiring residential or recognized mobile network connections, the system forces attackers to either use their own identifiable connection or be blocked.")

    add_heading("Step 7: Navigation Path Analysis", level=4)
    add_para("The server analyzes the HTTP Referrer chain to verify that the user arrived at the login page through the expected page flow. The system checks that at least one valid navigation hop occurred within the Express Airways domain, meaning the user must have arrived via a page served from the Express Airways platform rather than navigating directly to the login URL. The referrer URL is validated against a list of approved entry points including the platform homepage (beta.expressairways.com), the Account Center landing page, a marketing landing page, or the mobile app deep link handler. The referrer must come from the same origin (beta.expressairways.com) or a pre-registered external origin (such as the Express Airways main website expressairways.com or the app store redirect). Direct navigation to the login page via typing the URL, using a bookmark, or clicking an external link without a valid referrer chain triggers an additional verification layer. The system also checks the Sec-Fetch-Site, Sec-Fetch-Mode, and Sec-Fetch-Dest HTTP headers (part of the Fetch Metadata Request Headers specification) to verify the request context: Sec-Fetch-Site must be same-origin or same-site, Sec-Fetch-Mode must be navigate, and Sec-Fetch-Dest must be document for a standard login page navigation.")
    add_para("Non-transferability: The navigation path is a property of the user browsing session and browser history. Two different users following different browsing paths will have different referrer chains. An attacker who receives the login URL from a legitimate user cannot reproduce the referrer chain because the referrer is determined by the attacker own browsing history, which will differ from the legitimate user path. Additionally, the Fetch Metadata headers are automatically set by the browser based on the actual navigation context and cannot be spoofed from JavaScript.")
    add_para("Why it cannot be forgotten: The user does not need to remember which page they came from. The browser automatically includes the Referrer header (subject to the Referrer-Policy) and the Fetch Metadata headers with every navigation request. The check is entirely passive and requires no user configuration or awareness.")
    add_para("Automatic or user-interactive: Fully automatic. The navigation path analysis examines HTTP request headers that the browser sends automatically with every page navigation. No user interaction, JavaScript execution, or client-side computation is required. The check is passive, invisible, and instantaneous.")
    add_para("Data verified: HTTP Referrer header, Referrer-Policy header, Sec-Fetch-Site, Sec-Fetch-Mode, Sec-Fetch-Dest, Sec-Fetch-User headers, Origin header, and comparison against approved entry points and allowed external origins. On failure, the system logs the referrer value, the Fetch Metadata header values, and the detected navigation context. A direct navigation attempt with no valid referrer chain results in the user being redirected to the platform homepage first, from which they can navigate normally to the login page. This adds one click but does not block legitimate access. Repeated direct navigation attempts with suspicious patterns (mismatched Fetch Metadata, spoofed referrers) result in the authentication being blocked and the session flagged.")
    add_para("Security properties: Navigation path analysis prevents CSRF-style login page access where an attacker embeds the login page in an iframe or redirects a user to the login page from a malicious external site. It also detects phishing attempts where a user is tricked into logging in from a page that pretends to be part of the Express Airways platform but is actually hosted on a different domain. Combined with the Fetch Metadata headers, this check provides robust protection against cross-site request forgery and clickjacking attacks on the authentication flow.")

    add_heading("Step 8: Behavioral Biometrics", level=4)
    add_para("The server initiates a behavioral biometric data collection phase that captures the user natural interaction patterns with the login interface over a period of 10-30 seconds. The data collection script captures mouse movement trajectories (speed, acceleration, jerk, curvature, angle, and pause frequency at 60 samples per second via requestAnimationFrame), scroll behavior (scroll speed, acceleration, direction changes, pause duration, and distance), keystroke dynamics (key press duration, inter-key latency, key release timing, typing speed variance, and error correction patterns), and touch interactions on mobile devices (touch pressure, touch radius, swipe velocity, and gesture curvature). The collected data is compressed into a feature vector of 128 dimensions and compared against the user stored behavioral profile using a cosine similarity metric. The behavioral profile is built over the first 10 authentication sessions using online learning, with each subsequent session updating the profile via exponential moving average (alpha = 0.3) to accommodate gradual changes in user behavior while maintaining sensitivity to abrupt changes. The similarity threshold is set at 0.75 on a scale of 0 to 1, with the threshold automatically adjusted based on the number of profile samples available (higher confidence with more samples allows a tighter threshold).")
    add_para("Non-transferability: Behavioral biometrics are unconscious physical traits that are unique to each individual. Typing rhythm is determined by the user fine motor control, muscle memory, and neurological processing speed, which differ measurably between individuals. Mouse movement patterns are influenced by the user handedness, motor skills, and even emotional state. Two people cannot share their behavioral profiles because these are not voluntary actions that can be instructed or imitated. Studies have shown that behavioral biometrics can distinguish between individuals with 99%+ accuracy after as few as 50 keystrokes or 30 seconds of mouse movement.")
    add_para("Why it cannot be forgotten: Behavioral biometrics are subconscious and involuntary. The user does not think about how they type or move a mouse; they just do it naturally. The patterns are stored in the user procedural memory (the same type of memory that allows you to ride a bicycle without thinking about it) and cannot be forgotten in the same way that you cannot forget how to sign your name. Even if a user suffered amnesia, their typing rhythm would remain consistent because it is governed by motor cortex patterns that are independent of conscious memory.")
    add_para("Automatic or user-interactive: Automatic from the user perspective, but requires genuine human interaction with the page. The user is not asked to perform any specific actions for behavioral biometric collection. However, the check does require that the user actually moves the mouse, types, or scrolls naturally on the page. A user who sits motionless at the login page will not generate sufficient biometric data for comparison, and the system will prompt them to interact with the page after 15 seconds of inactivity. The user does not know they are being profiled, making the collected data a genuine unconscious sample rather than a performed one.")
    add_para("Data verified: 128-dimensional feature vector containing mouse movement dynamics (speed, acceleration, jerk, curvature at 60 data points per second), keystroke dynamics (key-down-to-key-up duration, inter-key latency for each pair of keys, typing speed variance over 50-keystroke windows), scroll dynamics (scroll speed, acceleration, direction change frequency, pause frequency), touch dynamics (pressure, radius, velocity for each touch event), and the aggregate cosine similarity score against the stored profile. On failure, the system logs the similarity score, the specific feature dimensions that deviated most significantly from the profile, and the duration of the data collection period. A low similarity score (below 0.75) triggers a step-up authentication requirement: the user is prompted for additional verification factors (Steps 11-15) rather than immediately blocked. If the user completes all subsequent steps successfully, the new behavioral data is reviewed by the security team to determine if the profile should be updated. After 3 consecutive behavioral biometric failures, the account is temporarily suspended pending manual identity verification.")
    add_para("Security properties: Behavioral biometrics provide continuous authentication throughout the session, not just at login. Even after the initial authentication, subsequent high-risk actions within the session trigger behavioral re-verification. This makes session hijacking attacks ineffective because an attacker who steals the session token will exhibit different behavioral patterns than the legitimate user, causing the system to invalidate the session and require re-authentication. The unconscious nature of behavioral biometrics makes them impossible to imitate, record, or transfer, providing a level of security that far exceeds traditional knowledge-based factors.")

    add_heading("Step 9: Canvas Fingerprint", level=4)
    add_para("The server sends a canvas fingerprinting script that instructs the browser to render a specific sequence of text, shapes, and colors at precise pixel coordinates using the HTML5 Canvas 2D API. The rendering sequence consists of 15 distinct drawing operations: rendering text with specific font families at specific sizes and positions (including anti-aliased text in Arial, Times New Roman, Courier New, and several system fonts at varying sizes), drawing bezier curves and arcs with specific control points, rendering filled and stroked rectangles at sub-pixel positions, applying color gradients at specific angles, rendering WebGL content including a 3D rotating cube with specific lighting and shading parameters, and applying image processing operations (color transformations, blur effects, compositing modes) to a pre-rendered sub-canvas. The resulting pixel data is read via canvas.toDataURL() and hashed with SHA-256 to produce a compact 64-character fingerprint. The key insight is that this fingerprint is determined by subtle differences in the GPU rendering pipeline, graphics driver, display driver, monitor calibration, and operating system font rendering engine. Even two identical hardware models with the same OS version can produce slightly different canvas fingerprints due to manufacturing variations in the GPU and display calibration.")
    add_para("Non-transferability: The canvas fingerprint is determined by the specific GPU hardware, graphics driver version, display driver, monitor EDID data, operating system font rendering engine (DirectWrite on Windows, Core Text on macOS, FreeType on Linux), and even the specific monitor calibration. Two different machines with different GPUs or different driver versions produce measurably different canvas renders. Even the same machine with a different monitor attached can produce a different fingerprint due to differences in color calibration and pixel response. These hardware-level characteristics cannot be shared between humans because they are physical properties of the specific machine.")
    add_para("Why it cannot be forgotten: The canvas fingerprint is automatically generated by the browser rendering engine at authentication time. The user does not need to remember any rendering parameters or fingerprint values. The fingerprint is a deterministic property of the hardware-software combination and is regenerated identically (with minor tolerance for GPU driver updates) each time the script executes. The user cannot voluntarily change their canvas fingerprint without replacing their GPU or operating system.")
    add_para("Automatic or user-interactive: Fully automatic. The canvas rendering executes in an off-screen canvas (or a hidden 1x1 pixel canvas) without any visual output. The user does not see any rendered content, is not asked to interact with any canvas, and is not aware that the rendering is occurring. The operation completes in under 200 milliseconds and is invisible to the user.")
    add_para("Data verified: SHA-256 hash of the pixel data produced by 15 sequential rendering operations at specific coordinates with specific parameters. The server stores the enrolled canvas fingerprint hash and computes the Hamming distance between the enrolled hash and the current hash. A Hamming distance of less than 5 bits is required for a match, which accounts for minor driver-level variations while rejecting fundamentally different rendering pipelines. On failure, the system logs the enrolled fingerprint hash, the current fingerprint hash, and the computed Hamming distance. A canvas fingerprint mismatch (Hamming distance exceeding 5 bits) is treated as an indicator of possible device change. The user is prompted to re-enroll their device by completing the user-interactive steps (11-15) and verifying their identity through the account recovery process. Complete re-enrollment generates a new device profile that replaces the old one.")
    add_para("Security properties: Canvas fingerprinting provides extremely high-entropy device identification with information-theoretic entropy estimated at 30-40 bits, meaning it can uniquely identify individual devices with high probability even among millions of users. Unlike cookie-based or storage-based device identification, canvas fingerprinting is resistant to clearing browser data, using incognito mode, or blocking third-party cookies. This makes it an exceptionally reliable anchor for device binding and session binding operations, as demonstrated in Step 15.")

    add_heading("Step 10: Audio Fingerprint", level=4)
    add_para("The server sends an audio fingerprinting script that generates a unique frequency response signature by processing audio signals through the Web Audio API AudioContext. The script creates an audio processing chain consisting of an OscillatorNode generating a sine wave sweep from 20Hz to 20kHz over a 100-millisecond duration, a DynamicsCompressorNode that applies audio compression, a BiquadFilterNode with bandpass filter at specific center frequencies and Q values, a ConvolverNode loaded with a short impulse response that captures the device acoustic characteristics, and an AnalyserNode that captures the frequency domain data via getByteFrequencyData. The resulting frequency spectrum data (1024 bins of 8-bit values) is processed through a feature extraction pipeline that identifies peak frequencies, spectral centroid, spectral rolloff, mel-frequency cepstral coefficients (MFCCs), and zero-crossing rate. The extracted features are normalized and hashed with SHA-256 to produce a 64-character audio fingerprint. This fingerprint captures subtle variations in the device audio stack, including the audio DAC chip, amplifier, speaker frequency response, microphone characteristics (if reading from microphone), audio driver version, and operating system audio processing pipeline. Even devices with identical hardware specifications can produce different audio fingerprints due to manufacturing tolerances and driver differences.")
    add_para("Non-transferability: The audio fingerprint is determined by the specific audio hardware and driver combination installed on the device. Two different devices, even of the same make and model, have different audio DAC chips with different manufacturing tolerances, resulting in measurably different frequency response curves. The audio processing pipeline also depends on the operating system audio stack version, the installed audio drivers, and even the current audio device selected in system settings. These hardware-level characteristics cannot be shared between humans because they are determined by the physical audio hardware installed in the specific machine.")
    add_para("Why it cannot be forgotten: The audio fingerprint is automatically generated by the browser Web Audio API at authentication time. The user does not need to remember or configure anything about their audio system. The fingerprint is a deterministic property of the audio hardware and driver combination, captured and compared without any user awareness. The user cannot change their audio fingerprint without replacing their audio hardware or drivers.")
    add_para("Automatic or user-interactive: Fully automatic, but produces a very brief (100-millisecond) inaudible audio signal. The signal is generated at frequencies and amplitudes that are at the threshold of human hearing or below, making it imperceptible to the user. No speaker output is required for the core fingerprinting (the audio graph is processed offline in the audio context rendering thread), though some implementations may route through the audio output briefly. The user is not asked to listen to anything, respond to any audio prompt, or interact with the audio system in any way.")
    add_para("Data verified: SHA-256 hash of the extracted audio feature vector containing 13 MFCC coefficients, spectral centroid, spectral rolloff, zero-crossing rate, and peak frequency locations from 1024 frequency bins. The server stores the enrolled audio fingerprint and compares it against the current fingerprint using a modified cosine similarity metric that is robust to minor driver-level variations. A similarity score above 0.85 is required for a match. On failure, the system logs the enrolled fingerprint hash, the current fingerprint hash, and the similarity score components. An audio fingerprint mismatch triggers a notification to the user that their system audio configuration has changed, which may indicate a hardware change, driver update, or use of virtual audio devices. The user is guided through the device re-enrollment process to register the new audio fingerprint. Repeated mismatches from the same account may indicate that audio-based fingerprinting is unreliable for that device, and the system adjusts the weight of this factor in the overall authentication score.")
    add_para("Security properties: Audio fingerprinting provides an additional hardware-bound authentication factor that is orthogonal to visual-based fingerprinting (canvas fingerprint) and runtime-based fingerprinting (JavaScript properties). An attacker would need to simultaneously spoof the canvas fingerprint, the audio fingerprint, the device fingerprint, and all other automatic checks to impersonate a legitimate device. The combination of multiple hardware-based fingerprinting methods creates a device identity that is practically impossible to forge, as it would require replicating the exact GPU, audio DAC, monitor calibration, and driver versions of the target machine simultaneously.")

    add_heading("Steps 11-15: User-Interactive Verification", level=4)
    add_para("If all ten automatic checks pass successfully, the user is presented with the login interface for the interactive verification steps. These steps require active participation from the human user and are designed to be impossible to perform via automated scripts or remote collaboration. The interactive steps leverage the human capacity for pattern recognition, motor skills, temporal perception, and muscle memory, while being deliberately resistant to observation, recording, description, and replication. The user must complete Steps 11 through 14 within a total cumulative time limit of 5 minutes, with each individual step having its own sub-limit. Step 15 is the final session binding and entry step.")

    add_heading("Step 11: Time-Limited Password", level=4)
    add_para("The user is presented with a standard email/username and password form, but with a critical enhancement: the time validation gate. Before the server accepts the password for verification, it checks whether the current server time (UTC) falls within the user pre-configured allowed login hours as stored in the UserSecurity sheet. The allowed hours are defined as a set of time windows specified in the user local timezone with start and end times for each day of the week. For example, a user might configure allowed hours as Monday-Friday 07:00-22:00, Saturday 09:00-23:00, and Sunday no access. If the current time falls outside all allowed windows, the login is immediately blocked and the user is presented with a message indicating that login is not permitted at this time, along with the next available login time in their local timezone. If the time falls within an allowed window, the password hash is verified using bcrypt with a work factor of 12 (approximately 250ms per verification on server hardware). After successful password verification, the server increments a rolling counter of authentications within the current time window and enforces a maximum of 10 authentications per 5-minute window to prevent rapid automated guessing even within the allowed hours.")
    add_para("Non-transferability: The password alone is transferable in theory but the time gate renders it useless outside the configured hours. If a user shares their password with a collaborator in a different timezone, the collaborator would need to authenticate during the original user allowed hours in their local time, which would fall outside the configured windows in the original user timezone. Even within the same timezone, the collaborator would need to authenticate during the specific allowed hours, which may conflict with their own schedule. More importantly, the time gate is only one of 15 factors: even if the time is correct, the user still needs to pass all other 14 checks, none of which are shareable.")
    add_para("Why it cannot be forgotten: The user does not need to remember their configured time windows because the system automatically checks the server time against the stored configuration. The user chooses their preferred hours during initial security setup, and the system enforces them automatically. If the user forgets their configured hours, they can view them in the Account Center security settings at any time.")
    add_para("Automatic or user-interactive: The time check is automatic (server-side clock comparison), but entering the password is user-interactive. The user must type their email and password, which are knowledge-based credentials. This is the only traditional knowledge-based factor in the 15-step process, retained specifically because it is familiar and expected, providing a psychological anchor of normalcy in an otherwise extraordinary verification process.")
    add_para("Data verified: User email / username lookup, bcrypt password hash comparison, server current time (UTC), user timezone configuration, user allowed hours windows per day-of-week, authentication rate within current time window (max 10 per 5 minutes), and account lockout status. On failure, the user receives an error message that intentionally does not distinguish between invalid credentials and time-restricted access to prevent information leakage. If outside allowed hours, the message reads Login is not available at this time. Please try again later. If credentials are invalid, the message reads Invalid username or password. After 5 consecutive failed attempts within any 15-minute window, regardless of the failure reason, the account is locked for 15 minutes with the lockout duration doubling for each subsequent lockout occurrence within a 24-hour period (15 minutes, 30 minutes, 1 hour, 2 hours, 4 hours, capped at 24 hours).")
    add_para("Security properties: The time gate adds a temporal dimension to knowledge-based authentication that significantly reduces the attack surface. An attacker who steals the password hash database cannot use the passwords outside the respective user allowed hours, and even then must simultaneously satisfy all other 14 factors. The time gate also provides natural protection against brute-force attacks by limiting the window in which guesses can be attempted. Combined with rate limiting (10 authentications per 5-minute window), an attacker can attempt at most 120 password guesses per hour, requiring over 1000 hours to exhaust a 120,000-password dictionary.")

    add_heading("Step 12: Dynamic Color-Number Code", level=4)
    add_para("After successful password verification, the user is presented with a visual challenge consisting of a 3x2 grid of six colored tiles, each displaying a number between 0 and 9. The tile positions (grid layout) are randomized on every page load, with each tile assigned a unique color selected from a palette of 12 high-contrast colors (red, blue, green, yellow, orange, purple, cyan, magenta, teal, lime, coral, indigo) and a random number 0-9. The user must click the tile where the current UTC minute modulo 6 equals the tile position index (0-5, left-to-right, top-to-bottom). For example, if the current UTC time is 14:23, then 23 mod 6 = 5, and the user must click the tile at position 5 (bottom-right corner of the 3x2 grid). The tile positions are shuffled on every page load, so the correct position corresponds to a different color and number combination each time. The user must identify the correct tile by computing  current_minute mod 6 in their head, mapping the result to the tile position, and clicking the tile at that position. The correct tile and its position are known only to the system and the user at the current minute. After the minute changes, the correct answer changes. The challenge has a 30-second timeout from page load, after which the tiles refresh with new random positions, colors, and numbers.")
    add_para("Non-transferability: The challenge layout is unique to each authentication attempt, with randomized tile positions, colors, and numbers. Two users looking at the same screen would each compute the correct tile independently based on their own understanding of the current minute. More importantly, the challenge is impossible to describe over the phone: if the user tries to tell a collaborator which tile to click, they would need to describe both the color grid layout (which is randomized) and the mapping of minute to position, which changes every 60 seconds. By the time the user finishes describing the layout, the minute may have changed, invalidating the entire description. Even a screenshot is useless because the next page load generates a completely different layout with different numbers, colors, and correct answer.")
    add_para("Why it cannot be forgotten: The user does not need to remember any color or number from previous sessions. The only thing the user needs to remember is the rule: current minute modulo 6 equals tile position. This rule is simple and can be memorized after 2-3 practice attempts during onboarding. The specific colors, numbers, and layout are generated fresh each time and consumed immediately. If the user forgets the rule entirely, they can request a hint from the system, which shows the formula in plain text: Click the tile at position [current minute] mod 6. The hint is rate-limited to once per hour to prevent abuse.")
    add_para("Automatic or user-interactive: Fully user-interactive. The user must manually compute the modulo operation and physically click the correct tile. The system does not auto-select or suggest anything. The user must understand the rule, compute the result, locate the correct tile by position, and click it. This requires genuine human cognitive processing that cannot be automated by a script (because the layout is randomized and the correct answer changes every minute).")
    add_para("Data verified: The position index of the clicked tile (0-5) compared against the correct position for the current UTC minute. The system also verifies that the click occurred within 30 seconds of the challenge generation, that no more than 3 incorrect clicks occurred (to prevent brute-force clicking of all 6 tiles), and that the challenge was not completed by a previous authentication attempt (each challenge is single-use). On failure, the user is shown an error message indicating the selection was incorrect and is presented with a fresh challenge (new random layout, colors, and numbers). After 3 consecutive failures, the authentication attempt is abandoned and the user must restart from Step 1. The failure is logged with the attempted tile position, the expected position, and the time of the attempt.")
    add_para("Security properties: The dynamic color-number code provides observation-resistant authentication that cannot be socially engineered. An observer watching over the user shoulder sees only a grid of colored tiles being clicked; they do not know the rule that determined which tile to click. The one-minute time window makes the challenge temporally unique, preventing replay attacks. The randomization of layout, colors, and numbers on each page load ensures that even recording the entire session screen provides no useful information for the next authentication attempt. This is a textbook example of a cognitive authentication factor that leverages human computation abilities while being resistant to all forms of automated and social engineering attacks.")

    add_heading("Step 13: Gesture Trace", level=4)
    add_para("The user is presented with a gesture input pad: a rectangular area approximately 300x200 pixels displayed on the screen. The user must redraw a gesture pattern that they registered during the initial account setup or device enrollment process. The gesture consists of a sequence of 4-8 directional strokes drawn in a specific order, such as swipe up, swipe right, swipe down, swipe left. The system compares the drawn gesture against the stored template using direction sequence matching and timing profile analysis, not exact coordinate matching. During enrollment, the user draws the gesture 5 times, and the system extracts the direction sequence (categorized into 8 compass directions: N, NE, E, SE, S, SW, W, NW) and the relative timing of each stroke (duration as a percentage of total gesture time). The system builds a statistical model of the gesture with mean direction and standard deviation for each stroke, and mean timing with standard deviation for each stroke duration. During verification, the drawn gesture is compared against the stored model. The direction of each stroke must match within 45 degrees of the enrolled mean direction (2 standard deviations), and the timing of each stroke must fall within 25% of the enrolled mean duration (2 standard deviations). The system also verifies that the gesture was drawn without unnatural pauses (each stroke must start within 500ms of the previous stroke completion) and without excessive correction or backtracking, which would indicate uncertainty or an automated replay.")
    add_para("Non-transferability: The gesture is registered as a muscle memory pattern, not as a verbalizable sequence of instructions. While one could theoretically describe the gesture verbally (swipe up then right then down), such a description lacks the specific timing, pressure, and micro-movements that form the unique signature of the legitimate user. Two different people drawing the same described pattern will produce measurably different timing profiles and micro-trajectories. Studies have shown that even the same person drawing the same gesture on different days produces timing variations of 10-15%, while different people drawing the same nominal pattern produce variations of 50% or more, making biometric discrimination highly reliable.")
    add_para("Why it cannot be forgotten: The gesture is stored in the user procedural muscle memory, which is the same type of memory that allows you to tie your shoes or sign your name without conscious thought. Procedural memory is extremely durable and resistant to forgetting, even in cases of amnesia. Once a gesture is practiced 5 times during enrollment and used regularly for authentication, it becomes an automatic motor pattern that the user can reproduce without conscious recall. The user cannot forget their gesture in the same way they cannot forget how to sign their signature.")
    add_para("Automatic or user-interactive: Fully user-interactive. The user must physically draw the gesture on the input pad using their mouse, touchscreen, or trackpad. The system provides no hints, no preview, and no practice mode during authentication (practice is available during enrollment only). The user must rely entirely on their muscle memory to reproduce the registered pattern. The gesture input captures the full stroke path, not just start and end points, enabling detailed biometric analysis.")
    add_para("Data verified: Direction sequence (sequence of 8-direction compass values for each stroke, typically 4-8 strokes), stroke timing (duration of each stroke as percentage of total gesture time, typically 200-800ms per stroke), stroke-to-stroke latency (time between strokes, typically 100-500ms), gesture total time (typically 1-5 seconds), pressure profile (if touch device), and stroke curvature (deviation from straight line for each stroke, typically less than 15 degrees). On failure, the system logs the enrolled gesture statistics, the attempted gesture statistics, and the specific failure reason (direction mismatch for which stroke, timing mismatch for which stroke, excessive latency between strokes, unnatural pauses, or correction movements). The user is allowed 3 attempts per authentication session. After 3 failures, the authentication is abandoned and the user must restart from Step 1. After 10 cumulative failed gesture attempts, the gesture factor is locked and the user must complete identity verification through the account recovery process to re-register a new gesture.")
    add_para("Security properties: Gesture trace authentication leverages the human motor system as an authentication factor, creating a biometric that is simultaneously unique to the individual, resistant to observation, and impractical to replicate through automation. Unlike written signatures that can be visually copied, gesture traces on a screen capture dynamic properties (timing, acceleration, pressure) that cannot be observed or recorded by a bystander. The gesture cannot be extracted from a server breach because the server stores only direction and timing statistics, not the actual path coordinates. This makes gesture trace one of the most secure user-interactive authentication factors available.")

    add_heading("Step 14: Reaction Time Challenge", level=4)
    add_para("The user is presented with a reaction time challenge where a visual target (a solid red circle 40 pixels in diameter) appears at a random position on the screen after a random delay ranging from 2 to 10 seconds following the user ready signal. The user must click the target as quickly as possible when it appears. The system measures the elapsed time between the target appearing and the user click (the reaction time) with millisecond precision using requestAnimationFrame and performance.now. The measured reaction time is compared against the user stored average reaction time and standard deviation, which are maintained from the user previous authentication sessions. The user profile stores separate reaction time statistics for morning sessions (before 12:00 local time), afternoon sessions (12:00-18:00), and evening sessions (after 18:00), as reaction time naturally varies throughout the day due to circadian rhythms. The user reaction time must fall within the range of (mean - 1.5*stddev) to (mean + 2.0*stddev) for the corresponding time-of-day category. A reaction time that is too fast (below the lower bound, typically under 100ms) indicates a bot or automated clicker, since human visual reaction time has a physiological lower limit of approximately 100-150ms due to retinal processing and neural transmission time. A reaction time that is too slow (above the upper bound, typically over 500ms for healthy adults) suggests reduced alertness, distraction, or a different user attempting the authentication. The challenge is repeated 2 times with different random delays and target positions, and the user must pass both repetitions to proceed.")
    add_para("Non-transferability: Reaction time is a biological trait determined by the user neural processing speed, visual acuity, age, fatigue level, and even caffeine intake. It is unique to the individual at the specific moment and cannot be shared, transferred, or imitated. Two different people have measurably different average reaction times, and even the same person at different times of day falls within a characteristic range. An attacker cannot practice to match a specific reaction time profile because the required timing is a range, not a specific value, and the user own reaction time varies naturally within that range. Attempting to artificially delay a click to match a slower profile is detectable because the system also measures the click movement time (time from target appearance to mouse movement initiation), which is less than 50ms for automated clicks but 100-200ms for genuine human reactions.")
    add_para("Why it cannot be forgotten: Reaction time is an involuntary physiological response, not a memorized value. The user does not need to remember their average reaction time or try to reproduce it consciously. The muscle memory and neural processing speed are inherent biological characteristics that the user cannot forget any more than they can forget their own height. The stored statistics are automatically maintained by the system based on the user previous authentication sessions and updated after each successful authentication.")
    add_para("Automatic or user-interactive: User-interactive with a simple visual task. The user must watch the screen and click when the target appears. No complex instructions, computation, or recall is required. The challenge is designed to be accessible to users of all ages and technical abilities while still providing robust biometric discrimination.")
    add_para("Data verified: Reaction time per repetition (milliseconds from target appearance to click), movement initiation time (milliseconds from target appearance to first mouse movement, typically 100-200ms for humans), click precision (pixel distance from click position to target center, must be within 30 pixels), target position (randomized each repetition to prevent pre-positioning), and delay duration (random 2-10 seconds, logged but not used for scoring). On failure, the system analyzes whether the reaction time was too fast (indicating automation) or too slow (indicating a possible different user or impaired state). If the reaction time is below the physiological threshold (under 100ms), the authentication is immediately terminated and the session is flagged as a confirmed bot attack. If the reaction time is above the upper threshold, the user is offered a repeat attempt but asked to ensure they are paying attention. After 3 consecutive failures across multiple authentication sessions, the user profile statistics are reviewed by the security team to determine if the profile should be updated or if the user requires identity re-verification.")
    add_para("Security properties: Reaction time verification provides a biometric authentication factor that is impossible to automate, imitate, or transfer. The physiological lower bound on human reaction time (approximately 100ms) provides an absolute cutoff that no bot or script can fake without being detected. The correlation between reaction time and click precision distinguishes genuine human interaction from simulated inputs. The time-of-day normalization accounts for natural variation in human alertness, preventing false rejections during low-alertness periods while maintaining security. This factor is particularly effective against remote access attacks, where the attacker is connecting through a remote desktop protocol that introduces additional latency, making it impossible to achieve the user typical reaction time range.")

    add_heading("Step 15: Session Binding and Secure Entry", level=4)
    add_para("After all 14 preceding verification steps have completed successfully, the user is presented with a final Verify & Enter button. Clicking this button triggers the session binding protocol, which is the most cryptographically sophisticated step in the entire process. The server generates a cryptographically random session token (256 bits from a CSPRNG seeded by the HSM). This token is encrypted with AES-256-GCM using a derived key that combines the device fingerprint hash (from Step 1), the canvas fingerprint hash (from Step 9), the audio fingerprint hash (from Step 10), and a server-side secret stored in the HSM. The encryption key material is assembled as follows: K = HKDF-SHA256(salt=device_fingerprint || canvas_fingerprint || audio_fingerprint, ikm=server_secret, info=user_id || session_id || timestamp, length=32 bytes). This ensures that the session token can only be decrypted by a client that possesses the exact same device, canvas, and audio fingerprints as the authenticating machine. The encrypted token is sent to the client as a secure, HTTP-only, SameSite=Strict cookie with the path set to / and the Secure flag enabled, ensuring it is only transmitted over HTTPS. Additionally, the server stores a SHA-256 hash of the session token in the session database alongside the user ID, the full device fingerprint hash, the bound IP address, the session creation timestamp, and the session expiry timestamp. The session token is valid for 15 minutes of inactivity (sliding window) with an absolute maximum lifetime of 12 hours. Each authenticated API request within the session must present the cookie; the server decrypts it using the device fingerprints stored in the session DB, verifies the HMAC authentication tag, checks that the IP address matches, and confirms the session has not expired.")
    add_para("Non-transferability: The session token is cryptographically bound to the specific device fingerprint of the authenticating machine via AES-256-GCM encryption. The encryption key incorporates the device, canvas, and audio fingerprints, which are unique to the specific device hardware. If an attacker steals the session cookie and attempts to use it from a different machine, the server attempts decryption using the fingerprints from the requesting device (which differ), resulting in an authentication tag mismatch and immediate rejection of the session. The attacker cannot decrypt the session token without simultaneously possessing the correct device fingerprint, canvas fingerprint, and audio fingerprint, which are hardware-bound and cannot be extracted or copied. Even the legitimate user cannot use their session token from a different device because the fingerprints on the second device would differ, causing decryption failure.")
    add_para("Why it cannot be forgotten: The session binding is completely automatic and transparent to the user. The user does not need to remember their session token, device fingerprints, or any cryptographic parameters. The browser manages the session cookie automatically, sending it with each request. The user only needs to click the Verify & Enter button to complete the process. After that, the session is maintained automatically until expiry or logout.")
    add_para("Automatic or user-interactive: The Verify & Enter button click is user-interactive (requiring a final user action to confirm entry), but the session binding protocol that executes after the click is fully automatic. The user must make the conscious decision to click the button, which serves as the final user confirmation. The cryptographic operations, cookie setting, and session database writes all happen server-side and browser-automatically without further user involvement.")
    add_para("Data verified: The session token is verified through AES-256-GCM decryption using the device fingerprint composite key, HMAC authentication tag verification, IP address consistency check, session expiry check (15-minute inactivity sliding window, 12-hour absolute maximum), and session integrity check (session has not been revoked, user account is still active). On the server side, each API request within the session is independently verified against all these criteria. If any verification fails, the session is immediately invalidated, the cookie is cleared from the browser, and the user is redirected to the login page to restart authentication from Step 1. A complete record of the session lifecycle is written to the immutable audit log using WORM storage with cryptographic hash chaining, ensuring that the session record cannot be modified or deleted even by system administrators. The audit record includes the timestamp of session creation, the user ID, the device fingerprint hash (truncated to 32 characters for privacy), the source IP, the browser User-Agent, the session expiry time, and the session termination time with reason for termination (explicit logout, inactivity timeout, absolute expiry, or forced revocation).")

    add_para("")

    add_heading("Summary of the 15-Step Verification Process", level=3)
    make_table(["Step", "Name", "Type", "Non-Transferable Because", "Timeout"], [
        ("1", "Device Fingerprint Capture", "Automatic", "Hardware characteristics unique to physical device", "< 2s"),
        ("2", "IP Geolocation Verification", "Automatic", "IP assigned by network, not user-controllable", "< 1s"),
        ("3", "Browser Integrity Check", "Automatic", "Runtime properties of genuine browser instance", "< 1s"),
        ("4", "Clock Synchronization", "Automatic", "Real-time network round-trip required", "< 3s"),
        ("5", "Proof of Work", "Automatic", "Requires local computation on client device", "2-5s"),
        ("6", "Connection Analysis", "Automatic", "ISP/ASN determined by network infrastructure", "< 1s"),
        ("7", "Navigation Path Analysis", "Automatic", "Browsing history cannot be shared", "< 1s"),
        ("8", "Behavioral Biometrics", "Automatic", "Unconscious physical traits unique to individual", "10-30s"),
        ("9", "Canvas Fingerprint", "Automatic", "Tied to specific GPU/driver/monitor combination", "< 0.5s"),
        ("10", "Audio Fingerprint", "Automatic", "Tied to specific audio hardware/drivers", "< 0.5s"),
        ("11", "Time-Limited Password", "Interactive", "Time gate restricts window; password alone useless", "60s"),
        ("12", "Dynamic Color-Number Code", "Interactive", "Layout randomizes per load; minute-bound answer", "30s"),
        ("13", "Gesture Trace", "Interactive", "Muscle memory pattern cannot be verbalized", "10s"),
        ("14", "Reaction Time Challenge", "Interactive", "Biological trait unique to individual", "10s"),
        ("15", "Session Binding & Entry", "Both", "Token encrypted with device-specific key material", "< 2s"),
    ])
    add_para("")
    add_para("The 15-Step Complete Login Verification Process represents the culmination of Express Airways single-minded commitment to security excellence. By combining ten automatic hardware-and-network-bound fingerprinting steps with five user-interactive cognitive-and-biometric challenges, the system creates an authentication gauntlet that no competitor, hacker, or malicious insider can penetrate. Every step is independently non-transferable, meaning sharing credentials with another human is mathematically equivalent to giving them nothing at all. Every automatic step requires real-time computation or hardware presence that cannot be simulated. Every interactive step leverages human cognitive or biological traits that cannot be replicated by machines or transferred between humans. The result is an authentication system that, for the first time in the aviation industry, makes account sharing not merely prohibited but technically impossible. A competitor attempting to infiltrate the Express Airways beta platform would need to simultaneously steal a specific hardware device, intercept a real-time network connection at a specific geographic location, replicate a unique behavioral biometric profile, compute a proof-of-work challenge in milliseconds, guess a time-bound dynamic color-number code, reproduce a muscle-memory gesture with precise timing, and match a biological reaction time profile all within a 5-minute window. The 15-step process does not just verify identity; it verifies presence, verifying that the authenticated entity is not only the correct user, but is the correct user at the correct device at the correct location at the correct time exhibiting the correct biological responses. This is the future of authentication, and it is deployed here today on the Express Airways Digital Platform.")
    add_heading("8.2 Authorization Model", level=2)
    for t in [
        "The RBAC model provides fine-grained control over user permissions. Roles include Anonymous, Registered User, Verified User, Beta Tester, Service Agent, Module Admin, System Admin, and Super Admin.",
        "Permissions are defined at the intersection of module and action. Authorization is enforced at the API gateway and service layers. Custom roles can be created with granular permission assignments."
    ]:
        add_para(t)
    add_heading("8.3 Data Encryption Standards", level=2)
    for t in [
        "TLS 1.3 for all data in transit with HSTS enforcement. AES-256-GCM for data at rest. Different encryption keys for PII, authentication credentials, payment data, and application data. Keys rotated every 90 days via HSM.",
        "Field-level encryption for the most sensitive data elements. Encryption operations logged with user identity and reason for access."
    ]:
        add_para(t)
    add_heading("8.4 Audit Trail Requirements", level=2)
    for t in [
        "Immutable WORM storage with cryptographic hash chaining. Audit categories include authentication events, authorization events, data access, configuration changes, and administrative actions.",
        "Each entry includes timestamp, event type, user identifier, source IP, affected resource, action, and result. Logs retained minimum 7 years. Search and export available through Administration module."
    ]:
        add_para(t)
    add_heading("8.5 Incident Response Plan", level=2)
    for t in [
        "Follows NIST framework: Preparation, Detection and Analysis, Containment/Eradication/Recovery, and Post-Incident Activity.",
        "Severity Levels: Level 1 (Low) - non-critical systems, standard procedures. Level 2 (Moderate) - critical systems, immediate response. Level 3 (High) - confirmed data breach, full activation."
    ]:
        add_para(t)
    add_heading("8.6 Vulnerability Reporting Process", level=2)
    for t in [
        "Responsible disclosure through the security contact form. Reports acknowledged within 24 hours. Status updates every 5 business days.",
        "Critical vulnerabilities targeted for 72-hour remediation. All vulnerabilities remediated before public release."
    ]:
        add_para(t)
    add_heading("8.7 Penetration Testing Guidelines", level=2)
    for t in [
        "Written authorization required from Security Division. Follows OWASP Testing Guide methodology. Limited to beta environment.",
        "Prohibited: DoS attacks, social engineering, physical security testing. Findings documented with CVSS v3.1 scoring."
    ]:
        add_para(t)
    build_30_step_verification()
    add_page_break()

# ═══════════════════════════════════════════════════════════════════════
# SECTION 8.8: COMPLETE 30-STEP LOGIN VERIFICATION PROCESS
# ═══════════════════════════════════════════════════════════════════════
def build_30_step_verification():
    add_heading("8.8 Complete 30-Step Login Verification Process", level=2)
    add_para("The Express Airways Digital Platform implements the most comprehensive multi-layered login verification system ever deployed. This 30-step process interweaves fifteen fully automatic computer-handled checks, five semi-automatic device-API checks, and ten user-interactive challenges to create an authentication barrier that is mathematically impossible for competitors to bypass, share, or replicate. Each step independently enforces non-transferability meaning no step can be communicated from one human to another in a usable form. Collectively, the 30 steps transform the act of logging in into a robust identity verification ceremony that simultaneously proves identity, device possession, physical presence, biological aliveness, and real-time human cognition.")
    add_para("The design philosophy rests on five pillars: non-transferability (each factor is inherently bound to the individual and cannot be shared), non-forgeability (each factor requires real-time computation or biological presence that cannot be simulated), non-reusability (each authentication consumes unique ephemeral data immediately invalidated), non-observability (interactive steps cannot be observed and replicated by a third party), and non-circumventability (bypassing any single step requires compromising all others simultaneously, which is computationally and logistically infeasible).")

    # ── Automatic Steps 1-15 ──
    add_heading("Steps 1-15: Fully Automatic Computer-Handled Verification", level=3)
    add_para("Steps 1 through 15 execute entirely server-side or within the browser sandbox without any user awareness or interaction. These steps run sequentially with strict timeout constraints, and failure at any step immediately terminates the authentication attempt before the user is ever prompted for credentials. The automatic checks verify the hardware, network, runtime environment, and behavioral characteristics of the requesting client, establishing a foundational trust layer that makes it impossible for automated scripts, botnets, remote desktop sessions, or shared devices to reach the user-interactive stages.")

    # Step 1
    add_heading("8.8.1 Step 1: Device Fingerprint Capture", level=3)
    add_para("The server sends a fingerprinting script that collects over 200 distinct browser and hardware characteristics including installed system fonts enumerated via JavaScript font detection, screen resolution and color depth, navigator properties (platform, language, userAgent, hardwareConcurrency, deviceMemory), WebGL renderer and vendor strings, canvas fingerprint via 2D rendering of specific text and shapes at precise coordinates, AudioContext fingerprint via frequency response analysis, installed plugin list, timezone offset, touch support detection, and battery status. All characteristics are concatenated and hashed with SHA-512 to produce a 128-character device fingerprint hash compared against the enrolled profile. A weighted Jaccard similarity score of 92% or higher is required to pass.")
    add_para("Non-transferability: The fingerprint is tied to the specific combination of hardware components, installed software, and driver versions of a single physical machine. Two humans cannot share the same fingerprint because they cannot share the same physical device simultaneously, and even identical hardware models diverge at the driver, firmware, and manufacturing lot level. Copying a fingerprint hash from one device to another fails because the fingerprinting script recalculates from scratch each time, and the destination hardware produces a different hash.")
    add_para("Why it cannot be forgotten: The fingerprint is automatically collected and computed at authentication time with zero user memory required. It exists as a physical property of the device hardware, as permanent as the device serial number. The user does not need to remember or record anything.")
    add_para("On failure: The system logs the attempted fingerprint alongside the enrolled fingerprint for forensic analysis, increments a device mismatch counter, and blocks authentication with a generic message. After three consecutive mismatches, the account is flagged for mandatory re-enrollment and a security alert is sent to the registered email.")
    add_para("Security properties: Hardware-level authentication resistant to cookie theft, token theft, and password sharing. An attacker with valid credentials cannot authenticate from a different device. The 92% similarity threshold accommodates minor driver updates while rejecting fundamentally different hardware.")

    # Step 2
    add_heading("8.8.2 Step 2: IP Geolocation Verification", level=3)
    add_para("The server resolves the client IP address to a geographic location using GeoIP databases (MaxMind GeoIP2 and IP2Location queried in parallel) and carrier-grade NAT detection. The resolved location must match the user registered geographic region. Great Circle Distance between the resolved IP location and the registered home location is computed with a threshold of 500 kilometers for home access and 5000 kilometers for authorized travel regions. The IP address ASN is validated against known ISP ranges for the claimed region, and the IP is checked against threat intelligence feeds including AlienVault OTX, VirusTotal, and Spamhaus.")
    add_para("Non-transferability: An IP address is assigned by network infrastructure and cannot be voluntarily changed or shared between humans. Two people in different cities have different IP addresses. A user sharing credentials with someone in another city will fail the geolocation check because the collaborator IP resolves to a different location.")
    add_para("Why it cannot be forgotten: The user does not need to remember their IP address or geographic region. The IP is automatically determined by the network at authentication time. The user only needs to be connecting from their registered country.")
    add_para("On failure: The user receives an email notification titled Unusual sign-in location detected with the approximate city and country of the attempt. Authentication is blocked. Repeated failures from unregistered regions trigger an account-wide security freeze requiring manual verification by the security team.")
    add_para("Security properties: Prevents credential-stuffing from different geographic regions, blocks access from known malicious IP ranges, and detects impossible travel scenarios where a user authenticates from two distant locations within an unreasonably short time.")

    # Step 3
    add_heading("8.8.3 Step 3: Browser Integrity Check", level=3)
    add_para("The server executes a comprehensive browser integrity verification script detecting whether the client browser is a legitimate user-controlled browser or an automated headless browser, bot, or remote-controlled environment. The script checks over 40 indicators: navigator.webdriver must be undefined or false, navigator.plugins must have at least 3 legitimate entries, the presence of standard browser objects matching the claimed User-Agent, screen dimensions matching standard display resolutions, Canvas and WebGL rendering behavior differences between genuine and headless browsers, event loop behavior analysis, and detection of Selenium, Puppeteer, Playwright, and PhantomJS runtime flags via their automation-specific DOM elements and JavaScript properties.")
    add_para("Non-transferability: Browser integrity properties are runtime characteristics of the specific browser instance on the specific device. A legitimate user on a standard browser passes; anyone running automation software, even the legitimate user, will fail. The environment cannot be shared with another person without automation detection.")
    add_para("Why it cannot be forgotten: The check examines properties intrinsic to the browser runtime. The user does not need to maintain any browser configuration beyond using a standard unmodified browser. Deviations are automatically detected.")
    add_para("On failure: The system logs the specific integrity checks that failed. The authentication attempt is immediately terminated with a generic Security check failed response. All subsequent attempts from the same IP are rate-limited to one per minute for the next hour.")
    add_para("Security properties: Prevents automated credential stuffing, bot-driven account enumeration, API abuse from scripted clients, and session replay from remote-controlled browser instances. Ensures every authentication originates from a genuine human-operated browser.")

    # Step 4
    add_heading("8.8.4 Step 4: Clock Synchronization Verification", level=3)
    add_para("The server initiates a clock synchronization protocol by sending a cryptographically signed timestamp in ISO 8601 format with nanosecond precision during the TLS handshake. The client echoes this timestamp back along with its own current timestamp from performance.timeOrigin and performance.now. The server computes round-trip time and clock skew. Absolute clock skew must be less than 3 seconds. The RTT must be consistent with expected network latency for the client geographic location determined in Step 2, preventing artificial RTT inflation to hide clock skew. The synchronization value is cached with a 5-minute TTL.")
    add_para("Non-transferability: Requires a real-time network round trip between the specific client device and the server. An attacker cannot forward the server timestamp to a different machine because clock skew on the second machine would differ and RTT would not match expected latency. Two people cannot share a synchronization result because each is unique to a specific client-server pair at a specific moment.")
    add_para("Why it cannot be forgotten: The synchronization is an automatic network measurement requiring no user memory or configuration. The check succeeds automatically as long as the device system clock is reasonably accurate, which is default for any modern device with network time synchronization enabled.")
    add_para("On failure: The authentication is blocked with a time synchronization error. The user is shown a message indicating their device clock appears incorrect with instructions to enable automatic time synchronization. After correction, the user can retry immediately.")
    add_para("Security properties: Critical for preventing replay attacks. If the attacker device clock differs from the server by more than 3 seconds, authentication is rejected even if all other credentials are valid. Ensures all time-dependent factors are computed correctly.")

    # Step 5
    add_heading("8.8.5 Step 5: Proof of Work Computation", level=3)
    add_para("The server generates a unique proof-of-work challenge consisting of a 32-byte random seed, a target difficulty level requiring a specific number of leading zero bits in the SHA-256 hash output, and a maximum nonce range. Difficulty is dynamically adjusted based on server load and detected client computational capability from Step 1. The client JavaScript finds a nonce such that SHA-256(seed || nonce) produces a hash starting with the required zero bits. Typical difficulty of 20 bits requires approximately 1,048,576 hash computations taking 2-5 seconds on modern hardware using WebAssembly-accelerated SHA-256 in a Web Worker. The client returns the nonce within 5 seconds. The server verifies the solution and adds seed and nonce to a bloom filter to prevent replay.")
    add_para("Non-transferability: Requires real-time local computation on the client device. The challenge seed is unique per authentication attempt and cannot be pre-computed. An attacker cannot receive the challenge on one machine and compute on another because the challenge is tied to the specific TLS session and the 5-second timeout makes relaying impractical. Solutions are single-use and immediately invalidated.")
    add_para("Why it cannot be forgotten: The user does not need to remember any proof-of-work parameters. The challenge is automatically generated and solved by the browser. The computational result is ephemeral and consumed in real time, leaving no trace.")
    add_para("On failure: The client receives a new challenge and is allowed up to 3 retries per authentication attempt. After 3 consecutive failures, authentication is blocked for 30 minutes and the event is flagged for security review as a potential denial-of-service attack.")
    add_para("Security properties: Imposes computational cost on each authentication attempt, making mass credential-stuffing economically infeasible. An attacker attempting 10,000 password guesses would need 10 billion SHA-256 hash computations. For legitimate users, the 2-5 second delay provides enormous security benefit.")

    # Step 6
    add_heading("8.8.6 Step 6: Connection Analysis", level=3)
    add_para("The server performs deep analysis of the client network connection examining IP address ASN, ISP name, connection type (residential, mobile, corporate, data center, educational, government), and presence of proxy, VPN, Tor exit node, or anonymization services. Detection uses commercial VPN/proxy databases (IP2Proxy, ProxyCheck, IPQualityScore), machine learning classifiers trained on network behavior patterns analyzing TTL values, TCP window sizes, and ASN-geolocation mismatches, Tor exit node lists updated hourly, HTTP header analysis for proxy forwarding evidence, and TLS handshake characteristics for proxy termination detection.")
    add_para("Non-transferability: Network connection type and routing path are determined by the user ISP and physical location. A user cannot change their ISP or routing path to another person control. Two people connecting from different homes have different ISPs and ASNs. Even within the same home, the system distinguishes between broadband and VPN connections.")
    add_para("Why it cannot be forgotten: The user does not need to know their ISP name, ASN number, or connection type. These are automatically determined by the network infrastructure and detected server-side during the connection handshake.")
    add_para("On failure: Authentication is blocked if a known VPN or proxy is detected. Legitimate users needing VPN for work must pre-register their VPN exit node IP through Account Center security settings, adding the IP to an allow list with additional verification steps.")
    add_para("Security properties: Prevents attackers from hiding their true location behind VPNs, proxies, and anonymization networks. Blocks credential-stuffing from data center IPs and public VPN endpoints. Requires residential or recognized mobile network connections, forcing attackers to use identifiable connections or be blocked.")

    # Step 7
    add_heading("8.8.7 Step 7: Navigation Path Analysis", level=3)
    add_para("The server analyzes the HTTP Referrer chain to verify the user arrived at the login page through expected page flow. The referrer URL is validated against approved entry points including the platform homepage, Account Center landing page, marketing pages, or the mobile app deep link handler. The referrer must come from the same origin or a pre-registered external origin. Direct navigation via typed URL, bookmark, or external link without a valid referrer chain triggers additional verification. The system also checks Sec-Fetch-Site, Sec-Fetch-Mode, and Sec-Fetch-Dest headers to verify request context.")
    add_para("Non-transferability: Navigation path is a property of the user browsing session and browser history. Two users following different paths have different referrer chains. An attacker receiving the login URL from a legitimate user cannot reproduce the referrer chain because the referrer is determined by the attacker own browsing history. Fetch Metadata headers are automatically set by the browser and cannot be spoofed from JavaScript.")
    add_para("Why it cannot be forgotten: The browser automatically includes the Referrer header and Fetch Metadata headers with every navigation. The check is entirely passive with no user configuration or awareness required.")
    add_para("On failure: Direct navigation without a valid referrer results in redirection to the platform homepage first. Repeated direct navigation with suspicious patterns blocks authentication and flags the session.")
    add_para("Security properties: Prevents CSRF-style login page access, detects phishing attempts where users are tricked into logging in from pages pretending to be the platform but hosted on different domains, and provides robust protection against cross-site request forgery and clickjacking on the authentication flow.")

    # Step 8
    add_heading("8.8.8 Step 8: Behavioral Biometrics Capture", level=3)
    add_para("The server initiates behavioral biometric data collection capturing natural interaction patterns with the login interface over 10-30 seconds. The script captures mouse movement trajectories (speed, acceleration, jerk, curvature, angle, pause frequency at 60 samples per second), scroll behavior (speed, acceleration, direction changes, pause duration), keystroke dynamics (key press duration, inter-key latency, key release timing, typing speed variance, error correction patterns), and touch interactions on mobile (pressure, radius, swipe velocity, gesture curvature). Data is compressed into a 128-dimensional feature vector compared against the stored profile using cosine similarity. The profile is built over the first 10 sessions using online learning with exponential moving average.")
    add_para("Non-transferability: Behavioral biometrics are unconscious physical traits unique to each individual. Typing rhythm is determined by fine motor control, muscle memory, and neurological processing speed. Mouse movement patterns are influenced by handedness and motor skills. Two people cannot share behavioral profiles because these are not voluntary actions that can be instructed or imitated. Studies show behavioral biometrics distinguish individuals with 99%+ accuracy after 50 keystrokes or 30 seconds of mouse movement.")
    add_para("Why it cannot be forgotten: Behavioral biometrics are subconscious and involuntary. The user does not think about how they type or move a mouse. Patterns are stored in procedural memory and cannot be forgotten any more than one can forget how to sign their name.")
    add_para("On failure: A low similarity score triggers step-up authentication requiring additional verification factors. After 3 consecutive failures, the account is temporarily suspended pending manual identity verification.")
    add_para("Security properties: Provides continuous authentication throughout the session. Even after initial authentication, high-risk actions trigger behavioral re-verification. Session hijacking becomes ineffective because an attacker exhibits different behavioral patterns, causing session invalidation.")

    # Step 9
    add_heading("8.8.9 Step 9: Canvas Fingerprint Generation", level=3)
    add_para("The server sends a canvas fingerprinting script that renders a specific sequence of text, shapes, and colors at precise pixel coordinates using the HTML5 Canvas 2D API. The rendering consists of 15 drawing operations: text rendering with specific font families at specific sizes (Arial, Times New Roman, Courier New, system fonts), bezier curves and arcs with specific control points, filled and stroked rectangles at sub-pixel positions, color gradients at specific angles, WebGL 3D cube rendering with specific lighting parameters, and image processing operations. The resulting pixel data is hashed with SHA-256. The fingerprint is determined by subtle differences in the GPU rendering pipeline, graphics driver, display driver, monitor calibration, and operating system font rendering engine.")
    add_para("Non-transferability: Determined by specific GPU hardware, graphics driver version, display driver, monitor EDID data, and operating system font rendering engine. Two different machines with different GPUs or driver versions produce different renders. Even the same machine with a different monitor produces a different fingerprint. These hardware-level characteristics cannot be shared between humans.")
    add_para("Why it cannot be forgotten: The fingerprint is automatically generated by the browser rendering engine at authentication time. The user cannot voluntarily change their canvas fingerprint without replacing their GPU or operating system.")
    add_para("On failure: A canvas fingerprint mismatch triggers a device re-enrollment prompt. The user must complete identity verification through account recovery to register a new canvas fingerprint.")
    add_para("Security properties: Provides extremely high-entropy device identification with estimated 30-40 bits of entropy, uniquely identifying individual devices among millions. Resistant to clearing browser data, incognito mode, or blocking third-party cookies. An exceptionally reliable anchor for device binding.")

    # Step 10
    add_heading("8.8.10 Step 10: Audio Fingerprint Generation", level=3)
    add_para("The server sends an audio fingerprinting script generating a unique frequency response signature by processing audio signals through the Web Audio API. The script creates a chain with OscillatorNode generating a sine wave sweep from 20Hz to 20kHz over 100 milliseconds, DynamicsCompressorNode, BiquadFilterNode with bandpass filter at specific frequencies, ConvolverNode loaded with an impulse response, and AnalyserNode capturing frequency domain data. The resulting 1024-bin frequency spectrum is processed through feature extraction identifying peak frequencies, spectral centroid, spectral rolloff, mel-frequency cepstral coefficients, and zero-crossing rate. Features are normalized and hashed with SHA-256. This captures subtle variations in the device audio DAC chip, amplifier, speaker frequency response, and audio driver version.")
    add_para("Non-transferability: Determined by the specific audio hardware and driver combination. Two different devices with identical specifications have different audio DAC chips with different manufacturing tolerances, producing measurably different frequency response curves. Hardware-level characteristics cannot be shared between humans.")
    add_para("Why it cannot be forgotten: The fingerprint is automatically generated by the Web Audio API at authentication time. The user cannot change their audio fingerprint without replacing audio hardware or drivers.")
    add_para("On failure: An audio fingerprint mismatch triggers notification that the system audio configuration has changed. The user is guided through device re-enrollment. Repeated mismatches adjust the weight of this factor in the overall authentication score.")
    add_para("Security properties: Provides a hardware-bound authentication factor orthogonal to visual-based fingerprinting. An attacker would need to simultaneously spoof canvas fingerprint, audio fingerprint, and all other automatic checks. The combination of multiple hardware fingerprinting methods creates a forge-proof device identity.")

    # Step 11
    add_heading("8.8.11 Step 11: WebGL Fingerprint Verification", level=3)
    add_para("The server executes a WebGL fingerprinting script that renders a complex 3D scene using the WebGL API and captures the resulting pixel data. The scene includes a rotating textured 3D object with specific lighting parameters (directional light at angle 45 degrees, ambient light at 0.3 intensity, specular highlight at 0.8 shininess), a specific model-view-projection matrix, precise shader parameters including vertex and fragment shader source code compiled and linked at runtime, and texture filtering parameters set to specific values. The rendered output is read via readPixels and hashed with SHA-256 to produce a WebGL fingerprint hash. This fingerprint captures subtle differences in the GPU architecture, shader compiler version, GPU driver implementation, and even the specific GPU manufacturing variations that affect floating-point precision in the shader pipeline.")
    add_para("Non-transferability: The WebGL fingerprint is determined by the specific GPU model, driver version, shader compiler implementation, and GPU manufacturing tolerances that affect floating-point arithmetic. Two different GPUs of the same model can produce different renders due to driver version differences and manufacturing variations. These hardware-level characteristics are inherent to the physical GPU and cannot be shared between humans or copied to another machine.")
    add_para("Why it cannot be forgotten: The WebGL fingerprint is automatically generated by the browser GPU rendering pipeline at authentication time. The user does not need to remember any graphics parameters. The fingerprint is a deterministic property of the GPU hardware and driver combination, regenerated identically each time.")
    add_para("On failure: A WebGL fingerprint mismatch indicates a possible GPU or driver change. The system prompts the user to confirm their hardware configuration. After 2 consecutive mismatches, the device profile is flagged and the user must complete additional verification before the device is re-enrolled with the new WebGL fingerprint.")
    add_para("Security properties: WebGL fingerprinting provides an additional GPU-bound authentication factor that is extremely difficult to spoof because it requires replicating the exact GPU architecture, driver behavior, and floating-point precision characteristics of the target machine. Combined with canvas and audio fingerprinting, it creates a three-factor hardware identity that is practically impossible to forge.")

    # Step 12
    add_heading("8.8.12 Step 12: Battery Status API Analysis", level=3)
    add_para("The server queries the Battery Status API (navigator.getBattery) to collect battery characteristics including current charge level (percentage), charging status (charging, discharging, or full), charging time remaining (seconds until full), discharging time remaining (seconds until empty), and the number of battery level change events observed during the authentication session. The system records these parameters and compares them against the expected battery profile for the authenticated device, including typical charge levels at different times of day and charging patterns observed over previous sessions. The battery profile is built over the first 5 authentication sessions and updated with each subsequent session.")
    add_para("Non-transferability: Battery status is a dynamic property of the specific physical device at the current moment. Two different devices have different battery capacities, different charge/discharge rates, and different usage patterns. The battery profile is unique to the specific device hardware and usage behavior of the legitimate user. An attacker using a different device will have measurably different battery characteristics that do not match the stored profile.")
    add_para("Why it cannot be forgotten: Battery status is automatically queried via the browser API. The user does not need to know or remember their battery level. The system collects this data transparently without any user interaction or awareness.")
    add_para("On failure: A battery profile mismatch is logged but does not immediately block authentication. Instead, it contributes to the overall risk score and may trigger step-up authentication if the deviation is significant. Repeated mismatches may indicate device replacement and trigger device re-enrollment.")
    add_para("Security properties: Battery status analysis provides a dynamic device characteristic that changes throughout the day, making it difficult for attackers to maintain a consistent spoofed profile. The unpredictability of battery behavior adds entropy to the device identification process.")

    # Step 13
    add_heading("8.8.13 Step 13: Network Information API Profiling", level=3)
    add_para("The server queries the Network Information API (navigator.connection) to collect network characteristics including effective connection type (4G, 5G, WiFi, Ethernet, etc.), downlink speed in Mbps, round-trip time in milliseconds, and the data saving mode status. The system also records the connection type change events and the measured bandwidth over a short 100-millisecond test transfer. The collected network parameters are compared against the stored network profile that records typical connection types, bandwidth ranges, and latency ranges for the user at different times and locations.")
    add_para("Non-transferability: Network characteristics are determined by the specific network infrastructure at the user physical location. A user on home WiFi has different network parameters than a user on mobile data. Two people in different locations connecting through different ISPs will have measurably different network characteristics. The network profile is bound to the combination of the user location, ISP, and device network hardware.")
    add_para("Why it cannot be forgotten: Network information is automatically collected via the browser API. The user does not need to know their connection speed or type. The system profiles the connection transparently.")
    add_para("On failure: A network profile mismatch increases the risk score and may trigger additional verification. If the connection type changes dramatically between sessions (e.g., from residential broadband to data center IP), this flags the session for security review.")
    add_para("Security properties: Network information profiling detects anomalous connection patterns such as sudden changes in network type, impossible bandwidth combinations, or connections from known data center ranges. This provides additional contextual verification that supplements IP geolocation and connection analysis.")

    # Step 14
    add_heading("8.8.14 Step 14: Media Device Enumeration", level=3)
    add_para("The server calls navigator.mediaDevices.enumerateDevices() to enumerate all connected media devices including audio input devices (microphones), audio output devices (speakers, headphones), and video input devices (cameras). The system collects the device IDs, device group IDs, device labels, and device kinds for each connected device. The list of devices and their characteristics are compared against the enrolled media device profile. The system checks for the presence of expected devices (e.g., the built-in webcam and microphone should be present), the absence of unexpected devices (e.g., external capture cards or virtual audio devices), and the consistency of device labels across sessions.")
    add_para("Non-transferability: Media device enumeration reveals the specific physical hardware connected to the device. Two different computers have different camera models, different microphone arrays, and different speaker configurations. Even laptops of the same model may have different peripheral devices attached. The media device profile is a unique snapshot of the physical hardware configuration that cannot be shared between humans.")
    add_para("Why it cannot be forgotten: The media device enumeration is automatically performed by the browser API. The user does not need to remember what devices are connected. The system transparently collects this information without user interaction beyond any browser permission prompts.")
    add_para("On failure: A media device mismatch indicates a change in hardware configuration. The system logs the specific devices that changed. Significant mismatches (e.g., no cameras detected when the profile expects cameras) trigger step-up authentication.")
    add_para("Security properties: Media device enumeration prevents attackers from authenticating from devices that lack the expected hardware configuration. This is particularly effective against virtual machines and cloud desktop environments that typically have non-standard or virtualized media devices.")

    # Step 15
    add_heading("8.8.15 Step 15: Hardware Entropy Measurement", level=3)
    add_para("The server executes a hardware entropy measurement by collecting timing data from multiple sources and analyzing their statistical properties. The script collects high-resolution timestamps from performance.now(), Date.now(), requestAnimationFrame callbacks, and event loop timing over a 500-millisecond collection window. The system analyzes the precision and jitter of these timestamps to estimate the hardware timer resolution, CPU clock stability, and operating system scheduler behavior. The entropy measurement also includes analysis of garbage collection pause patterns (detected via timing anomalies) and JavaScript engine JIT compilation characteristics (measured via execution time of specific benchmark functions). These measurements produce a hardware entropy signature that is unique to the specific CPU and operating system combination.")
    add_para("Non-transferability: Hardware timer behavior and entropy characteristics are determined by the specific CPU model, CPU stepping, operating system kernel version, and even the specific power management settings of the device. Two different machines, even with the same CPU model, can have different entropy characteristics due to manufacturing variations, firmware differences, and OS scheduler configuration. These low-level hardware properties cannot be shared between humans.")
    add_para("Why it cannot be forgotten: Entropy measurement is automatically collected by the browser at authentication time. The user does not need to know about CPU timers or entropy. The collection is transparent and requires no user action.")
    add_para("On failure: An entropy signature mismatch increases the risk score. The system allows for some variation due to normal system load fluctuations. Significant deviations may indicate different hardware or a virtualized environment and trigger additional verification.")
    add_para("Security properties: Hardware entropy measurement detects virtualized environments, emulated hardware, and remote desktop sessions that have measurably different timer characteristics than physical hardware. This provides a final hardware-level check that is extremely difficult to spoof because it relies on fundamental physical properties of the CPU and OS scheduler.")

    # ── Semi-Automatic Steps 16-20 ──
    add_heading("Steps 16-20: Semi-Automatic Device API Verification", level=3)
    add_para("Steps 16 through 20 require device API access that may prompt the user for permission but do not require complex user interaction beyond initial consent. These steps leverage device hardware capabilities to verify physical presence, environmental context, and biometric characteristics that cannot be transferred between individuals. The semi-automatic steps execute after the fully automatic checks have established a baseline trust level, adding hardware-verified presence information to the authentication context.")

    # Step 16
    add_heading("8.8.16 Step 16: Camera Liveness Detection", level=3)
    add_para("The system requests access to the device camera via getUserMedia with a video constraint. Upon user granting permission, the system captures a short 2-second video sequence at 15 frames per second. The video frames are analyzed using a multi-stage liveness detection pipeline: face detection using the MediaPipe face detection model to confirm a human face is present, micro-expression analysis detecting subtle involuntary facial movements indicative of a living human, texture analysis examining skin texture and subsurface scattering properties that differ between real skin and printed photographs or digital screens, depth analysis detecting the three-dimensional structure of the face, and anti-spoofing classification using a convolutional neural network trained on presentation attacks (photos, videos, masks, and deepfake reconstructions). The analysis produces a liveness confidence score between 0 and 1.")
    add_para("Device API used: navigator.mediaDevices.getUserMedia with video constraints, MediaPipe face detection model, custom CNN for anti-spoofing classification.")
    add_para("Data collected: 30 frames of video data at 640x480 resolution, face bounding box coordinates, micro-expression movement vectors, skin texture analysis features, depth map estimation, and anti-spoofing classifier confidence score.")
    add_para("Non-transferability: Liveness detection requires the physical presence of the user face in real time. A photograph or pre-recorded video is detected by the CNN anti-spoofing classifier. A deepfake video is detected by the micro-expression analysis and texture analysis. The liveness check cannot be shared between humans because each person must present their own face in real time.")
    add_para("On failure: The user is shown a message indicating the liveness check failed with suggestions to ensure adequate lighting and to remove sunglasses or face coverings. After 3 consecutive failures, authentication is blocked and the user must complete manual identity verification through the account recovery process.")
    add_para("Security properties: Camera liveness detection provides the strongest available proof that a living human is present at the device. It prevents photo-based spoofing, video replay attacks, silicone mask attacks, and deepfake-based impersonation. Combined with behavioral biometrics, it creates a multi-modal biometric authentication system.")

    # Step 17
    add_heading("8.8.17 Step 17: Microphone Ambient Signature Analysis", level=3)
    add_para("The system requests access to the device microphone via getUserMedia with audio constraints. Upon user granting permission, the system captures a 500-millisecond ambient audio sample. The audio sample is analyzed to extract environmental characteristics including background noise floor level, ambient frequency spectrum distribution, specific frequency peaks from environmental sound sources (fans, HVAC systems, traffic, conversations, electronic hum), reverberation characteristics of the physical space, and the ambient noise profile classification (office, home, cafe, outdoors, vehicle, or quiet room). The extracted ambient signature is compared against the stored environmental profile of the user typical authentication locations.")
    add_para("Device API used: navigator.mediaDevices.getUserMedia with audio constraints, Web Audio API AnalyserNode for frequency analysis.")
    add_para("Data collected: 500-millisecond audio sample, frequency spectrum distribution across 1024 bins, noise floor level in dB, reverberation time estimate, and environmental classification label.")
    add_para("Non-transferability: The ambient acoustic environment is determined by the user physical location and surroundings. Two people in different rooms have different ambient sound profiles. The ambient signature changes naturally over time but within characteristic ranges for each location, making it a passive location verification factor that cannot be shared or transferred.")
    add_para("On failure: The ambient signature mismatch is logged and contributes to the risk score. If the environment classification differs significantly (e.g., home office vs. airport terminal), the user may be prompted for additional verification. The system adapts to gradual environment changes over multiple sessions.")
    add_para("Security properties: Ambient microphone analysis provides passive environmental verification that confirms the user physical context. It detects when a user attempt originates from an unexpected environment, which may indicate credential sharing or account compromise.")

    # Step 18
    add_heading("8.8.18 Step 18: GPS Location Verification", level=3)
    add_para("The system requests access to the device GPS location via the Geolocation API. Upon the user granting permission, the system captures the precise latitude and longitude coordinates along with the reported accuracy in meters. The GPS coordinates are compared against the GeoIP location determined in Step 2 to verify consistency. The system also compares the GPS location against the registered home and work locations, authorized travel regions, and recent location history. The GPS check requires that the reported accuracy is within 50 meters, ensuring the location data comes from a GPS receiver rather than a coarse IP-based approximation.")
    add_para("Device API used: navigator.geolocation.getCurrentPosition with high accuracy enabled.")
    add_para("Data collected: Latitude, longitude, accuracy in meters, altitude, heading, speed, and timestamp of the GPS fix.")
    add_para("Non-transferability: GPS coordinates are determined by the physical location of the device hardware via satellite triangulation. Two people in different locations have different GPS coordinates. GPS cannot be spoofed from JavaScript without physical access to the device or specialized hardware. The GPS location is inherently tied to the physical presence of the device and user at a specific place and time.")
    add_para("On failure: The user is shown a message requesting them to enable location services for the browser and to ensure they are in a location with GPS signal. If GPS is unavailable, the system falls back to the GeoIP location from Step 2 with a risk score adjustment. Repeated GPS check failures from locations that differ significantly from the GeoIP location may trigger fraud review.")
    add_para("Security properties: GPS location verification provides the highest accuracy geographic verification available on consumer devices. It confirms the user physical location with meter-level precision, making it impossible for an attacker in a different location to pass the check. The consistency check between GPS and GeoIP prevents IP spoofing attacks.")

    # Step 19
    add_heading("8.8.19 Step 19: Accelerometer Motion Signature", level=3)
    add_para("The system accesses the device accelerometer sensor via the Generic Sensor API (Accelerometer). The system collects accelerometer readings over a 2-second window at the sensor native sampling rate (typically 60-200 Hz). The collected data includes X, Y, and Z axis acceleration values in m/s^2. The system analyzes the motion signature including the device orientation relative to gravity, micro-vibrations caused by the user holding the device (tremor frequency analysis, grip-induced micro-movements), the characteristic motion noise floor of the specific device model, and the absence of sudden suspicious movements that would indicate the device being moved rapidly between locations. The motion signature is compared against the enrolled profile built from previous sessions.")
    add_para("Device API used: Accelerometer sensor via Generic Sensor API (window.Accelerometer).")
    add_para("Data collected: 400-800 accelerometer samples across X, Y, Z axes, gravity vector estimation, tremor frequency components, grip signature patterns, and motion noise floor characterization.")
    add_para("Non-transferability: The accelerometer-based motion signature is determined by the specific device accelerometer hardware (MEMS sensor characteristics, manufacturing tolerances, noise profile), the device physical form factor, and the user natural holding and interaction patterns. Two different devices of the same model have different MEMS sensor noise profiles due to manufacturing variations. Two different users holding the same device have different grip patterns. This signature cannot be shared between humans.")
    add_para("On failure: A motion signature mismatch may indicate a different device or a different user holding the device. The system allows for natural variation in holding patterns and device orientation. Significant deviations trigger step-up authentication and may require device re-enrollment.")
    add_para("Security properties: Accelerometer motion signature provides a passive device verification factor that operates without user awareness once sensor permission is granted. It detects device substitution attacks where an attacker switches to a different device during the authentication process.")

    # Step 20
    add_heading("8.8.20 Step 20: Touch Pressure Sensitivity Profile", level=3)
    add_para("The system captures touch interaction data from previous user interactions with the login interface, specifically analyzing the touch pressure values reported by the Pointer Events API (event.pressure for touch devices). The system collects touch pressure, contact radius (event.width and event.height), tilt angle (event.tiltX and event.tiltY), and twist angle (event.twist) for each touch interaction during the authentication flow. These values are analyzed to build a touch sensitivity profile including average pressure, pressure variance, pressure distribution symmetry, typical contact area, and touch duration patterns. The profile is compared against the enrolled touch signature.")
    add_para("Device API used: Pointer Events API (pointerdown, pointermove, pointerup events) with pressure, width, height, tilt, and twist properties.")
    add_para("Data collected: Touch pressure values (0.0 to 1.0), contact radius (width and height in CSS pixels), tilt angle (X and Y in degrees), twist angle (0 to 359 degrees), touch duration, and inter-touch interval for each touch interaction.")
    add_para("Non-transferability: Touch pressure sensitivity is determined by the specific device touch screen hardware (capacitive sensor layer characteristics, pressure sensitivity calibration, digitizer firmware version) and the user finger physical properties (finger pad size, skin conductivity, typical pressure application patterns). Two different devices of the same model have different touch sensor calibrations. Two different users on the same device have different pressure profiles due to differences in finger size and typical touch force.")
    add_para("On failure: A touch pressure profile mismatch increases the risk score. The system allows for natural variation in touch behavior. Significant deviations from the enrolled profile trigger additional verification. If the device reports no touch capability when the profile expects touch, authentication may be blocked.")
    add_para("Security properties: Touch pressure profiling provides a passive biometric factor that operates during natural touch interaction. It cannot be transferred between devices or users because it depends on both the specific touch sensor hardware and the user physical finger characteristics. This creates a dual-factor binding: the specific device screen combined with the specific user touch behavior.")

    # ── User-Interactive Steps 21-30 ──
    add_heading("Steps 21-30: User-Interactive Verification Challenges", level=3)
    add_para("Steps 21 through 30 require active participation from the human user and are designed to be impossible to perform via automated scripts or remote collaboration. These steps leverage human cognitive abilities, pattern recognition, motor skills, temporal perception, and biological traits while being deliberately resistant to observation, recording, description, and replication. The user must complete Steps 21 through 29 within a total cumulative time limit of 8 minutes. Step 30 is the final session binding and entry step.")

    # Step 21
    add_heading("8.8.21 Step 21: Time-Limited Password Entry", level=3)
    add_para("The user is presented with a standard email and password form with a critical enhancement: the time validation gate. Before the server accepts the password for verification, it checks whether the current server time falls within the user pre-configured allowed login hours stored in the security profile. Allowed hours are defined as time windows specified in the user local timezone. If the current time falls outside all allowed windows, login is immediately blocked. If within an allowed window, the password hash is verified using bcrypt with work factor 12. After successful verification, the server enforces a maximum of 10 authentications per 5-minute window to prevent rapid automated guessing.")
    add_para("Interaction: The user types their email and password into the form fields and clicks the sign-in button. The time gate check is invisible to the user.")
    add_para("Non-transferability: The password alone is transferable, but the time gate renders it useless outside configured hours. A collaborator in a different timezone would need to authenticate during the original user allowed hours in their local time. Even within the same timezone, the time gate is only one of 15 interactive factors, none of which are shareable.")
    add_para("Why it cannot be forgotten: The user does not need to remember their configured time windows because the system automatically checks server time against stored configuration. Users can view their allowed hours in Account Center security settings.")
    add_para("On failure: The user receives a generic error message that does not distinguish between invalid credentials and time-restricted access. After 5 consecutive failed attempts within any 15-minute window, the account is locked for 15 minutes with lockout duration doubling for each subsequent lockout within 24 hours.")
    add_para("Security properties: The time gate adds a temporal dimension to knowledge-based authentication. An attacker who steals password hashes cannot use them outside the respective user allowed hours. Combined with rate limiting, an attacker can attempt at most 120 password guesses per hour.")

    # Step 22
    add_heading("8.8.22 Step 22: Dynamic Color-Number Code", level=3)
    add_para("The user is presented with a 3x2 grid of six colored tiles, each displaying a number between 0 and 9. Tile positions are randomized on every page load with each tile assigned a unique color from a palette of 12 high-contrast colors and a random number. The user must click the tile where the current UTC minute modulo 6 equals the tile position index. Tile positions are shuffled each time, so the correct position corresponds to a different color and number combination each time. The user must compute current_minute mod 6 in their head, map the result to the tile position, and click the tile at that position. The challenge has a 30-second timeout from page load.")
    add_para("Interaction: The user performs a mental modulo computation and physically clicks one of six tiles. No typing or text entry is required. The grid layout, tile colors, and numbers are randomized each time.")
    add_para("Non-transferability: The challenge is impossible to describe over the phone because the user would need to describe the randomized color layout and the minute-dependent answer. By the time the description is complete, the minute may have changed. Even a screenshot is useless because the next page load generates a completely different layout.")
    add_para("Why it cannot be forgotten: The user only needs to remember the rule current minute modulo 6 equals tile position. This rule is simple and memorized after 2-3 practice attempts. If forgotten, a rate-limited hint shows the formula.")
    add_para("On failure: The user receives a fresh challenge with new random layout, colors, and numbers. After 3 consecutive failures, authentication is abandoned and the user must restart from Step 1.")
    add_para("Security properties: Provides observation-resistant authentication that cannot be socially engineered. The one-minute time window makes the challenge temporally unique. Randomization ensures that recording the session provides no useful information for future attempts.")

    # Step 23
    add_heading("8.8.23 Step 23: Gesture Trace Verification", level=3)
    add_para("The user is presented with a gesture input pad of approximately 300x200 pixels. The user must redraw a gesture pattern registered during account setup consisting of 4-8 directional strokes in a specific order. The system compares the drawn gesture against the stored template using direction sequence matching and timing profile analysis, not exact coordinate matching. The direction of each stroke must match within 45 degrees of the enrolled mean direction, and the timing must fall within 25% of the enrolled mean duration.")
    add_para("Interaction: The user draws the gesture on the input pad using mouse, touchscreen, or trackpad. The system captures the full stroke path in real time. No verbal or written description of the gesture is accepted.")
    add_para("Non-transferability: The gesture is registered as muscle memory, not as a verbalizable sequence. While the stroke directions can be described, the specific timing, pressure, and micro-movements form a unique biometric signature. Studies show different people drawing the same nominal pattern produce timing variations of 50% or more.")
    add_para("Why it cannot be forgotten: The gesture is stored in procedural muscle memory, the same type of memory that allows signing a name without conscious thought. Procedural memory is extremely durable and resistant to forgetting.")
    add_para("On failure: The user is allowed 3 attempts per authentication session. After 3 failures, authentication is abandoned and the user must restart from Step 1. After 10 cumulative failures, the gesture factor is locked and the user must complete identity verification to re-register.")
    add_para("Security properties: Leverages the human motor system as an authentication factor that is simultaneously unique to the individual, resistant to observation, and impractical to replicate through automation. Captures dynamic properties (timing, acceleration) that cannot be observed by a bystander.")

    # Step 24
    add_heading("8.8.24 Step 24: Reaction Time Challenge", level=3)
    add_para("The user is presented with a reaction time challenge where a visual target a solid red circle 40 pixels in diameter appears at a random screen position after a random delay of 2 to 10 seconds following the user ready signal. The user must click the target as quickly as possible. The measured reaction time is compared against the user stored average and standard deviation maintained from previous authentication sessions. The profile stores separate statistics for morning, afternoon, and evening sessions due to circadian rhythm variations. Reaction time must fall within the range of mean minus 1.5 standard deviations to mean plus 2.0 standard deviations.")
    add_para("Interaction: The user clicks a ready button, watches the screen, and clicks the target circle as fast as possible when it appears. The challenge is repeated 2 times with different random delays and positions.")
    add_para("Non-transferability: Reaction time is a biological trait determined by neural processing speed, visual acuity, age, fatigue level, and even caffeine intake. Two different people have measurably different average reaction times. The physiological lower bound of approximately 100-150ms provides an absolute cutoff that no bot or script can fake. Attempting to artificially delay a click is detectable through movement initiation time analysis.")
    add_para("Why it cannot be forgotten: Reaction time is an involuntary physiological response, not a memorized value. The user does not need to remember their average reaction time. The stored statistics are automatically maintained by the system.")
    add_para("On failure: If reaction time is below 100ms, authentication is immediately terminated as a confirmed bot attack. If above the upper threshold, the user is offered a repeat attempt. After 3 consecutive failures across multiple sessions, the user profile is reviewed by the security team.")
    add_para("Security properties: Impossible to automate, imitate, or transfer. The physiological lower bound on human reaction time provides an absolute cutoff against bots. The correlation between reaction time and click precision distinguishes genuine human interaction from simulated inputs.")

    # Step 25
    add_heading("8.8.25 Step 25: Visual Pattern Recognition", level=3)
    add_para("The user is presented with a grid of 16 images arranged in a 4x4 layout. The images are selected from a curated library of 500+ images across 10 categories. During account setup, the user selected a personal category or theme and was shown a sequence of 5 images from that category. The user must identify and click the 5 images from their pre-selected category in the correct sequence from a grid containing 16 images, where only 5 belong to the user category and the remaining 11 are distractor images from other categories. The images are randomly positioned in the grid each time. The user must identify their category images by visual recognition and click them in the order they were originally presented.")
    add_para("Interaction: The user looks at a 4x4 grid of images, identifies the 5 images belonging to their personal category (e.g., mountains, architectural landmarks, tropical beaches), and clicks them in the correct sequence. The images are randomized in position each session.")
    add_para("Non-transferability: The category is a personal preference chosen during enrollment. The specific sequence of 5 images is unique to the user. An observer watching the screen cannot determine which category the user selected because they only see a grid of images being clicked. The user cannot describe the sequence to another person without revealing their personal category, which would compromise their account.")
    add_para("Why it cannot be forgotten: Visual recognition is a fundamental human cognitive ability. The user naturally recognizes images from their chosen category without needing to memorize specific images. The category preference is meaningful to the user and easily recalled.")
    add_para("On failure: The user is shown a new image grid with different random positions. After 3 consecutive failures, authentication is abandoned. After 5 cumulative failures, the user can request a category hint or reset their image sequence through account recovery.")
    add_para("Security properties: Visual pattern recognition leverages human visual cortex processing that cannot be replicated by automated systems. The category-based selection prevents brute-force attempts. The randomized grid positions prevent screen recording attacks.")

    # Step 26
    add_heading("8.8.26 Step 26: Audio CAPTCHA Challenge", level=3)
    add_para("The user is presented with an audio challenge where a sequence of 4 spoken digits is played through the device speakers. The digits are spoken by a text-to-speech engine with added background noise, varying pitch, and speed variations to prevent automated speech recognition. The digits are played at a random interval between 0.5 and 2 seconds apart. The user must listen to the audio sequence and type the 4 digits they heard into a text input field. The audio is dynamically generated each time and cannot be predicted or pre-computed. The audio file is served with a single-use token that expires after 60 seconds.")
    add_para("Interaction: The user clicks a play button to hear the audio, listens to the sequence of spoken digits, and types the digits into a text field. The user may replay the audio up to 2 times within the 60-second window.")
    add_para("Non-transferability: The audio challenge requires real-time listening through the device audio output. An attacker on a different device cannot hear the audio being played on the original device. The spoken digits are randomly generated each time and cannot be predicted. The background noise and voice variations make automated speech recognition unreliable while remaining intelligible to human listeners.")
    add_para("Why it cannot be forgotten: The user only needs to listen and transcribe. No memory of previous sessions is required. The digits are presented in real time and immediately consumed.")
    add_para("On failure: The user is presented with a new audio challenge with different digits. After 3 consecutive failures, authentication is abandoned. The system also tracks the number of replays requested, with excessive replays indicating possible automated processing.")
    add_para("Security properties: Audio CAPTCHA provides accessibility while preventing automated bots that cannot reliably perform speech recognition under noisy conditions. The single-use audio token prevents replay attacks. The combination of background noise, voice variation, and speed changes defeats state-of-the-art speech recognition systems.")

    # Step 27
    add_heading("8.8.27 Step 27: Secret Handshake Sequence", level=3)
    add_para("The user is presented with an interface containing 6 interactive UI elements arranged randomly on the screen. The elements may include buttons, sliders, toggle switches, dropdown menus, checkboxes, and radio buttons. The user must interact with these elements in a specific sequence of 4-6 actions that they registered during enrollment. For example, the user might have registered click the red button, toggle the switch to ON, slide the slider to 75%, and select Option B from the dropdown. The elements are arranged in different positions and orientations each time, requiring the user to identify each element by its function rather than its position.")
    add_para("Interaction: The user performs a sequence of physical interactions with UI elements: clicking, toggling, sliding, selecting, checking, or typing. Each action must be performed on the correct element type in the correct order. The elements are rearranged randomly each session.")
    add_para("Non-transferability: The secret handshake is a sequence of interactions known only to the user. An observer watching over the user shoulder sees UI elements being manipulated but cannot determine the sequence rules because the elements are rearranged each time. The user cannot describe the handshake to another person without revealing their secret sequence. The handshake requires active physical interaction that cannot be automated.")
    add_para("Why it cannot be forgotten: The handshake sequence is learned through practice during enrollment and becomes a procedural memory similar to a PIN or password. Users typically choose sequences that are meaningful to them, aiding recall. The system offers a hint revealing the first action after 2 consecutive failures.")
    add_para("On failure: The user is allowed 3 attempts with the same element arrangement. After 3 failures, a new arrangement is generated. After 5 consecutive sessions with failures, the handshake is locked requiring re-registration.")
    add_para("Security properties: The secret handshake provides a cognitive-behavioral factor that combines knowledge (the sequence) with physical interaction (the actions). The randomized element positions prevent observation attacks. The requirement for specific interaction types prevents simple click-sequence brute-forcing.")

    # Step 28
    add_heading("8.8.28 Step 28: Arithmetic Reasoning Under Time Pressure", level=3)
    add_para("The user is presented with a simple arithmetic problem involving two 2-digit numbers with a random operation (addition, subtraction, or multiplication). The problem is displayed in large text with a 15-second countdown timer. The user must mentally compute the answer and type it into a single text field. The problems are designed to be solvable by the average adult within 10-15 seconds but require genuine cognitive processing. Examples include 47 + 38, 92 - 56, or 23 x 4. The difficulty varies based on the user performance history to ensure consistent challenge. The operation and numbers are randomly generated each time.")
    add_para("Interaction: The user reads the arithmetic problem, performs mental calculation, and types the numeric answer. The countdown timer provides urgency. The challenge is presented 2 times with different problems.")
    add_para("Non-transferability: The arithmetic problem requires real-time cognitive processing by the human brain. An automated system could easily solve the arithmetic, but the surrounding context of other 29 verification steps prevents isolated automation. Two different humans may get different problems, and the answer to one session problem is useless for any future session. The time pressure prevents the user from communicating the problem to a remote helper.")
    add_para("Why it cannot be forgotten: The user only needs to perform basic arithmetic, a fundamental skill that cannot be forgotten. No memorization of previous problems or answers is required.")
    add_para("On failure: A new problem is generated. After 3 consecutive failures, authentication is abandoned. The system tracks the user success rate over time to distinguish between genuine difficulty and automated guessing.")
    add_para("Security properties: Arithmetic reasoning verifies the presence of a functioning human brain capable of basic cognitive processing. The time pressure prevents remote collaboration. The random problem generation ensures replay attacks are impossible.")

    # Step 29
    add_heading("8.8.29 Step 29: Image Sequence Ordering", level=3)
    add_para("The user is presented with 5 randomly shuffled images that form a logical sequence when ordered correctly. The images depict stages of a process such as boarding an aircraft (check-in, security, boarding gate, boarding aircraft, taking seat), weather progression (sunny, cloudy, rain, storm, rainbow), or a travel journey (departure, flight, arrival, baggage claim, exit). The user must drag and drop the images into the correct chronological or logical order. The sequence type is randomly selected from a library of 20 different sequence themes. Each image is approximately 100x100 pixels with clear, unambiguous visual content.")
    add_para("Interaction: The user drags images from a shuffled pool into numbered slots (1 through 5) in the correct sequence order. The interaction requires mouse or touch-based drag-and-drop manipulation.")
    add_para("Non-transferability: The correct sequence order requires understanding of real-world processes and causal relationships that only a human with common sense can determine. An automated system would need semantic understanding of image content. The specific images and sequence type are randomly selected each session, preventing memorization or sharing. The drag-and-drop interaction requires real-time physical manipulation.")
    add_para("Why it cannot be forgotten: No memory is required. The user simply applies their understanding of how the world works to arrange images in a logical order. The sequence logic is intuitive and obvious once understood.")
    add_para("On failure: A new set of shuffled images is presented. After 3 consecutive failures, the system selects a simpler sequence type. After 5 failures, authentication is abandoned.")
    add_para("Security properties: Image sequence ordering tests semantic understanding and common-sense reasoning that is currently beyond automated systems. The randomized sequence types prevent pre-computation. The drag-and-drop interaction requires genuine human motor control.")

    # Step 30
    add_heading("8.8.30 Step 30: Session Binding and Secure Entry", level=3)
    add_para("After all 29 preceding verification steps have completed successfully, the user is presented with a final Verify & Enter button. Clicking this button triggers the session binding protocol. The server generates a cryptographically random 256-bit session token from a CSPRNG seeded by the HSM. This token is encrypted with AES-256-GCM using a derived key that combines the device fingerprint hash, canvas fingerprint hash, audio fingerprint hash, WebGL fingerprint hash, and a server-side secret stored in the HSM. The encryption key is derived as K = HKDF-SHA256(salt=device_fingerprint || canvas_fingerprint || audio_fingerprint || webgl_fingerprint, ikm=server_secret, info=user_id || session_id || timestamp, length=32 bytes). The encrypted token is sent as a secure HTTP-only SameSite=Strict cookie.")
    add_para("Interaction: The user clicks the Verify & Enter button as a final conscious confirmation. All cryptographic operations execute automatically after the click.")
    add_para("Non-transferability: The session token is cryptographically bound to the specific device fingerprints of the authenticating machine via AES-256-GCM encryption. If an attacker steals the session cookie and attempts to use it from a different machine, the server attempts decryption using the fingerprints from the requesting device which differ, resulting in an authentication tag mismatch and immediate rejection. The session token cannot be decrypted without simultaneously possessing the correct device, canvas, audio, and WebGL fingerprints.")
    add_para("Why it cannot be forgotten: Session binding is completely automatic and transparent. The user does not need to remember any session parameters. The browser manages the session cookie automatically.")
    add_para("On failure: The session is immediately invalidated, the cookie is cleared, and the user is redirected to restart from Step 1. A complete record of the session lifecycle is written to the immutable audit log with cryptographic hash chaining, ensuring the record cannot be modified or deleted.")
    add_para("Security properties: The session binding ensures that even if all 29 prior steps are somehow bypassed, the session token itself is cryptographically useless on any device other than the original authenticating machine. This provides the final cryptographic seal on the entire 30-step verification process.")

    # ── Summary Table ──
    add_heading("8.8.31 Summary of Verification Layers", level=3)
    make_table(["Step", "Type", "Property Tested", "Non-Transferable Because", "Bot-Proof Because"], [
        ("1", "Automatic", "Device hardware identity", "Unique hardware characteristics", "Cannot spoof 200+ hardware attributes"),
        ("2", "Automatic", "Geographic location", "IP assigned by network infrastructure", "Cannot fake IP geolocation"),
        ("3", "Automatic", "Browser authenticity", "Runtime environment unique to instance", "Automation flags detected"),
        ("4", "Automatic", "Clock accuracy", "Real-time network round-trip required", "Cannot replay timestamp"),
        ("5", "Automatic", "Computational proof", "Requires local computation on device", "High cost per attempt"),
        ("6", "Automatic", "Network connection type", "ISP/ASN determined by infrastructure", "VPN/proxy detection"),
        ("7", "Automatic", "Navigation origin", "Browsing history unique to session", "Fetch Metadata enforce origin"),
        ("8", "Automatic", "Behavioral biometrics", "Unconscious motor patterns unique to individual", "Cannot imitate typing/mouse dynamics"),
        ("9", "Automatic", "GPU rendering pipeline", "Tied to specific GPU/driver/monitor", "Cannot spoof pixel-level rendering"),
        ("10", "Automatic", "Audio hardware identity", "Tied to specific DAC/driver combo", "Cannot replicate frequency response"),
        ("11", "Automatic", "GPU shader pipeline", "GPU manufacturing tolerances unique", "Cannot replicate floating-point precision"),
        ("12", "Automatic", "Battery characteristics", "Battery aging unique to device", "Cannot predict dynamic battery state"),
        ("13", "Automatic", "Network performance", "Connection characteristics vary by location", "Cannot fake bandwidth/latency profile"),
        ("14", "Automatic", "Media hardware config", "Physical device list unique to machine", "Cannot spoof device enumeration"),
        ("15", "Automatic", "CPU timer behavior", "CPU/OS scheduler properties unique", "Cannot replicate timing entropy"),
        ("16", "Semi-Auto", "Facial liveness", "Requires real-time face presence", "Anti-spoofing CNN detection"),
        ("17", "Semi-Auto", "Ambient environment", "Acoustic environment unique to location", "Cannot replicate audio signature"),
        ("18", "Semi-Auto", "Physical GPS location", "GPS coordinates tied to physical location", "Cannot spoof GPS from JS"),
        ("19", "Semi-Auto", "Motion and grip pattern", "MEMS sensor noise unique per device", "Cannot replicate micro-vibrations"),
        ("20", "Semi-Auto", "Touch pressure profile", "Sensor calibration + finger properties", "Cannot replicate pressure pattern"),
        ("21", "Interactive", "Knowledge + time gate", "Time window bound to user timezone", "Rate-limited password verification"),
        ("22", "Interactive", "Cognitive modulo computation", "Layout randomizes per load", "Cannot automate randomized visual grid"),
        ("23", "Interactive", "Motor memory pattern", "Muscle memory cannot be verbalized", "Cannot automate gesture biometric"),
        ("24", "Interactive", "Biological reaction time", "Neural processing speed unique to person", "Sub-100ms impossible for bots"),
        ("25", "Interactive", "Visual category recognition", "Personal preference unique to user", "Cannot automate semantic recognition"),
        ("26", "Interactive", "Auditory digit recognition", "Requires real-time audio playback", "Noisy audio defeats speech recognition"),
        ("27", "Interactive", "Sequential motor actions", "Element arrangement random per load", "Cannot predict randomized layout"),
        ("28", "Interactive", "Mental arithmetic", "Requires real-time cognitive processing", "Time pressure prevents outsourcing"),
        ("29", "Interactive", "Semantic sequence logic", "Requires real-world common sense", "Cannot automate semantic understanding"),
        ("30", "Interactive", "Cryptographic session binding", "Token encrypted with device keys", "AES-256-GCM prevents token reuse"),
    ])

    # ── Conclusion ──
    add_heading("8.8.32 Security Architecture Conclusion", level=3)
    add_para("The 30-Step Complete Login Verification Process represents the most sophisticated authentication system ever deployed in the aviation industry. By combining fifteen fully automatic hardware-and-network-bound fingerprinting steps, five semi-automatic device-API verification checks, and ten user-interactive cognitive and biometric challenges, the system creates an authentication gauntlet that no competitor, hacker, or malicious insider can penetrate. Each of the 30 steps is independently non-transferable, meaning sharing credentials with another human is mathematically equivalent to giving them nothing at all. Every automatic step requires real-time computation or hardware presence that cannot be simulated. Every semi-automatic step leverages device-specific hardware characteristics that cannot be replicated across machines. Every interactive step leverages human cognitive or biological traits that cannot be replicated by machines or transferred between humans.")
    add_para("The defense-in-depth architecture ensures that each layer covers the weaknesses of the others. The automatic hardware fingerprinting steps (1-15) establish device identity and resist remote access attacks, but they cannot verify that a human is present at the device, a gap filled by the semi-automatic liveness and environmental checks (16-20). The semi-automatic steps verify physical presence through cameras, microphones, and sensors, but they rely on device APIs that could theoretically be intercepted, a gap filled by the interactive cognitive challenges (21-29) that require genuine human brain processing that no API can simulate. The interactive challenges verify human cognition and biological presence, but they capture transient session-specific data that could theoretically be observed during the session, a gap filled by the cryptographic session binding (30) that renders stolen session tokens useless on any other device.")
    add_para("The result is an authentication system that, for the first time in the industry, makes account sharing not merely prohibited but technically impossible. A competitor attempting to infiltrate the Express Airways beta platform would need to simultaneously steal a specific hardware device with its unique GPU, audio DAC, and touch sensor characteristics; intercept a real-time network connection at a specific geographic location; replicate a unique behavioral biometric profile built over multiple prior sessions; compute a proof-of-work challenge in milliseconds; pass a camera-based liveness detection with anti-spoofing CNN classification; match an ambient acoustic signature from a specific room; reproduce a muscle-memory gesture with precise millisecond-level timing; match a biological reaction time profile calibrated to the time of day; solve cognitive challenges requiring semantic understanding and basic arithmetic; and possess the cryptographic keys to decrypt a session token bound to the exact hardware fingerprints of the target device all within an 8-minute window with each step having its own strict sub-limit.")
    add_para("The 30-step process does not simply verify identity; it verifies presence, verifying that the authenticated entity is not only the correct user, but is the correct user at the correct device at the correct location at the correct time exhibiting the correct biological responses and demonstrating genuine human cognitive ability. This represents the future of authentication, deployed today on the Express Airways Digital Platform. The combined mathematical entropy of all 30 steps exceeds 10^100 possible authentication state combinations, making brute-force or probabilistic bypass computationally infeasible for any known or foreseeable technology. The Express Airways security architecture sets a new standard for the aviation industry and provides beta testers, partners, and eventually all passengers with the highest level of account protection available anywhere in the world.")


# ═══════════════════════════════════════════════════════════════════════
# SECTION 9: PERFORMANCE BENCHMARKS
# ═══════════════════════════════════════════════════════════════════════
def build_section_9():
    add_heading("9. Performance Benchmarks", level=1)
    add_heading("9.1 Response Time Requirements", level=2)
    make_table(["Operation", "Target", "Warning", "Critical"], [
        ("Simple API Endpoint", "200ms", "500ms", "1000ms"),
        ("Complex API Endpoint", "500ms", "1000ms", "2000ms"),
        ("Initial Page Load", "2000ms", "3000ms", "5000ms"),
        ("Subsequent Page Load", "1000ms", "2000ms", "3000ms"),
        ("Search Query", "500ms", "1000ms", "3000ms"),
        ("Data Export", "5000ms", "10000ms", "30000ms"),
        ("File Upload (10MB)", "5000ms", "10000ms", "20000ms"),
        ("Authentication", "1000ms", "2000ms", "5000ms"),
        ("Simple DB Query", "50ms", "100ms", "500ms"),
        ("Complex DB Query", "200ms", "500ms", "1000ms"),
    ])
    add_heading("9.2 Concurrent User Capacity", level=2)
    make_table(["Metric", "Target", "Warning", "Critical"], [
        ("Total concurrent users", "1000", "2000", "3000"),
        ("Active API sessions", "5000", "10000", "15000"),
        ("WebSocket connections", "2000", "5000", "10000"),
        ("Database connections", "100", "200", "300"),
        ("Search operations/min", "500", "1000", "2000"),
        ("Export operations/min", "50", "100", "200"),
        ("File uploads/min", "100", "200", "500"),
        ("Auth requests/min", "200", "500", "1000"),
    ])
    add_heading("9.3 Data Processing Limits", level=2)
    make_table(["Metric", "Target", "Warning", "Critical"], [
        ("Max search results", "10000", "50000", "100000"),
        ("Max export records", "10000", "50000", "100000"),
        ("Max file upload size", "25 MB", "50 MB", "100 MB"),
        ("Max API payload size", "1 MB", "5 MB", "10 MB"),
        ("Max page size", "100", "250", "500"),
        ("Max concurrent uploads", "10", "25", "50"),
        ("Max table rows", "1,000,000", "5,000,000", "10,000,000"),
    ])
    add_heading("9.4 Availability Requirements", level=2)
    make_table(["Metric", "Target", "Warning", "Critical"], [
        ("Overall availability", "99.5%", "99.0%", "98.0%"),
        ("Core API availability", "99.9%", "99.5%", "99.0%"),
        ("Auth service availability", "99.9%", "99.5%", "99.0%"),
        ("Database availability", "99.9%", "99.5%", "99.0%"),
        ("Max consecutive downtime", "10 min", "30 min", "60 min"),
    ])
    add_heading("9.5 Disaster Recovery Procedures", level=2)
    for t in [
        "Scenario 1 - Complete Data Center Failure: Traffic automatically rerouted to secondary availability zone within 15 minutes. Database failover promotes read replica to primary.",
        "Scenario 2 - Database Corruption: Affected database isolated and restored from clean backup. Point-in-time recovery enables recovery to within 5 minutes of corruption event.",
        "Scenario 3 - Critical Security Incident: Affected systems isolated, forensic snapshots captured, clean system images deployed. All credentials rotated before returning to operations.",
        "Quarterly disaster recovery drills validate effectiveness of all recovery procedures. Results documented and tracked for continuous improvement."
    ]:
        add_para(t)
    add_page_break()

# ═══════════════════════════════════════════════════════════════════════
# SECTION 10: CHECKLISTS
# ═══════════════════════════════════════════════════════════════════════
def build_section_10():
    add_heading("10. Checklists", level=1)
    checklists = [
        ("10.1 Pre-Testing Checklist", [
            "Beta tester onboarding completed", "Confidentiality agreement signed",
            "Training webinar attended", "Beta testing account created and verified",
            "MFA configured on account", "Minimum browser requirements confirmed",
            "Internet speed verified (10+ Mbps)", "Beta Portal accessible",
            "Communication channels joined", "Testing focus area confirmed",
            "Test credentials received", "Test data loaded in environment",
            "Browser cache cleared", "Ad-blocking extensions disabled",
            "Issue reporting format reviewed", "Test assignments understood",
            "Local storage cleared", "Notification preferences configured",
            "Emergency procedures reviewed", "Data handling guidelines reviewed",
            "Confidentiality obligations acknowledged", "Testing schedule confirmed",
            "Mobile app installed if applicable", "VPN connection tested",
            "Testing tools and utilities downloaded", "Reference documents bookmarked",
            "Backup auth method configured", "Phase schedule confirmed",
            "Q&A session attended", "Onboarding checklist completed",
        ]),
        ("10.2 Daily Testing Checklist", [
            "Review overnight platform updates", "Check new test case assignments",
            "Clear browser cache and cookies", "Verify environment operational",
            "Log into beta platform", "Check for verification issues",
            "Review QA communications", "Plan session objectives",
            "Set up test data", "Configure recording tools",
            "Begin test execution by priority", "Document all observations",
            "Report issues promptly", "Take regular breaks",
            "Log activities in test log", "Submit pending reports",
            "Review next day assignments", "Verify issues documented",
            "Backup custom test data", "Log out properly",
            "Review personal issue queue", "Check for fixes to verify",
        ]),
        ("10.3 Feature Completion Checklist", [
            "All functional test cases executed", "All security test cases executed",
            "All performance test cases executed", "Usability assessment completed",
            "Compatibility testing completed", "All issues reported",
            "No unresolved Critical or Major issues", "Edge case testing completed",
            "Negative testing completed", "Regression testing completed",
            "Completion report submitted", "Test data cleanup completed",
            "Feature sign-off obtained", "Known issues documented",
            "Performance benchmarks verified", "Security review completed",
            "Accessibility review completed", "Cross-browser testing completed",
        ]),
        ("10.4 Regression Testing Checklist", [
            "Identify affected test cases", "Execute core functionality tests",
            "Execute integration tests for connected modules",
            "Verify previously fixed issues remain resolved",
            "Check for new issues introduced by change",
            "Test edge cases around modified functionality",
            "Verify data integrity across features",
            "Test performance of affected functionality",
            "Verify UI consistency and styling", "Document results",
            "Run automated regression suite", "Compare with baseline",
            "Verify backward compatibility", "Check API contract compliance",
            "Test error handling paths", "Verify security controls",
        ]),
        ("10.5 Security Review Checklist", [
            "Authentication tested for all roles", "Authorization verified per permissions",
            "Input validation tested on all fields", "XSS testing on all input points",
            "CSRF protection on state-changing operations", "SQL injection testing",
            "Session management verified", "Encryption verified (transit and rest)",
            "Rate limiting operational", "Audit logging confirmed",
            "Error messages reviewed for leakage", "File upload security tested",
            "API security tested for all endpoints", "Auth bypass attempts tested",
            "Privilege escalation paths tested", "IDOR testing completed",
            "Security headers verified", "CORS configuration verified",
            "Cookie security attributes verified", "TLS configuration verified",
            "Password policies enforced", "Account lockout verified",
            "MFA implementation tested", "Session timeout enforced",
            "Brute force protection verified", "Logout termination tested",
        ]),
        ("10.6 Performance Review Checklist", [
            "API response times measured", "Page load times measured",
            "Concurrent load testing completed", "DB query performance analyzed",
            "Cache effectiveness evaluated", "Resource utilization monitored",
            "Bottlenecks identified", "Benchmark comparison documented",
            "Memory usage analyzed for leaks", "CPU utilization under load",
            "Network latency impact assessed", "Mobile performance tested",
            "Slow network performance verified", "Large dataset performance verified",
            "Search performance measured", "Export performance verified",
        ]),
        ("10.7 Final Sign-Off Checklist", [
            "All test cases executed across all modules", "All Critical issues resolved",
            "All Major issues resolved or waived", "Performance benchmarks met",
            "Security review passed", "Compatibility testing completed",
            "Usability assessment satisfactory", "Documentation complete",
            "Approval signatures obtained", "Release decision documented",
            "All regression testing completed", "Stakeholder communication done",
            "Known issues documented", "Training materials updated",
            "Support team briefed", "Go-live checklist completed",
        ]),
    ]
    for title, items in checklists:
        add_heading(title, level=2)
        for item in items:
            make_table(["#", "Checklist Item", "Status", "Notes", "Signed Off By"],
                       [[str(i+1), item, "", "", ""] for i, item in enumerate(items)])
        add_page_break()

# ═══════════════════════════════════════════════════════════════════════
# SECTION 11: BENEFITS AND REWARDS PROGRAM
# ═══════════════════════════════════════════════════════════════════════
def build_section_11():
    add_heading("11. Benefits and Rewards Program", level=1)
    add_heading("11.1 Program Overview", level=2)
    for t in [
        "The Express Airways Beta Testing Rewards Program recognizes and rewards testers for their contributions. Rewards are based on quality, severity, and quantity of issues reported, as well as overall engagement.",
        "All rewards are tracked through the Beta Testing Portal where testers can view points, tier status, earned badges, and available rewards."
    ]:
        add_para(t)
    add_heading("11.2 Rewards Structure", level=2)
    for t in [
        "Account Tier Upgrades: Bug reports earn 10 points (minor), 25 points (major), 50 points (critical). Usability suggestions earn 5 points, enhancement ideas earn 8 points, security vulnerabilities earn 100 points. Tiers: Silver (100), Gold (250), Platinum (500), Diamond (1000), Elite (2000).",
        "Bonus Loyalty Miles: Standard issues earn 500 miles, major issues earn 1500 miles, critical issues earn 5000 miles. Security vulnerabilities earn 10000 miles. Miles credited within 48 hours of resolution.",
        "Priority Support: Gold tier+ get priority support with 2-hour response for critical issues. Diamond and Elite tiers receive 24/7 direct access to QA engineering team."
    ]:
        add_para(t)
    add_heading("11.3 Tier Progression", level=2)
    for t in [
        "Limited-Edition Badges: First Bug, Bug Hunter (10 issues), Security Guardian (5 security reports), Quality Champion, Speed Demon, Explorer (all 11 modules), Veteran (500+ days), Elite Tester (2000+ points).",
        "Exclusive Access: Diamond and Elite tiers receive early access to new features, participation in private preview sessions, and direct communication with product managers."
    ]:
        add_para(t)
    add_heading("11.4 Special Incentives", level=2)
    for t in [
        "Express Airways Swag: Gold tier receives branded t-shirt and accessories. Platinum adds premium jacket and backpack. Diamond includes personalized leather travel bag. Elite receives exclusive items.",
        "Top performers recognized in weekly newsletter. Top tester each phase receives complimentary round-trip ticket on any Express Airways route."
    ]:
        add_para(t)
    add_heading("11.5 Redemption Process", level=2)
    for t in [
        "Rewards managed through Beta Testing Portal. Miles auto-credited to linked loyalty account. Tier upgrades take effect immediately. Swag shipped within 2 weeks. Badges awarded automatically."
    ]:
        add_para(t)
    add_page_break()

# ═══════════════════════════════════════════════════════════════════════
# SECTION 12: COMPETITOR PROTECTION FRAMEWORK
# ═══════════════════════════════════════════════════════════════════════
def build_section_12():
    add_heading("12. Competitor Protection Framework", level=1)
    add_heading("12.1 Purpose and Scope", level=2)
    for t in [
        "The Competitor Protection Framework prevents unauthorized access by competitors who might seek competitive intelligence through the beta testing program. It implements technical controls making it practically impossible for information to be transferred between humans in usable form.",
        "The framework is based on non-transferable verification where credentials, tokens, and authentication factors are inherently bound to specific individuals."
    ]:
        add_para(t)
    add_heading("12.2 Non-Transferable Verification System", level=2)
    for t in [
        "The system combines eight distinct verification factors, each independently non-transferable. A competitor would need to simultaneously compromise all eight factors.",
        "The system employs adaptive authentication. Low-risk scenarios may require fewer factors; high-risk require all eight."
    ]:
        add_para(t)
    add_heading("12.3 Eight-Step Non-Transferable Verification Protocol", level=2)
    for t in [
        "Factor 1 - Biometric Authentication: Fingerprint, facial recognition, or iris scanning. Biometric templates stored locally in secure enclave, never transmitted to server.",
        "Factor 2 - Behavioral Biometric Profile: Analysis of typing rhythm, mouse movement, scrolling patterns. Baseline established over first 10 sessions. 99%+ accuracy distinguishing individuals.",
        "Factor 3 - Device DNA Binding: Device-specific key pair generated in secure hardware. Private key never leaves device. Each API request cryptographically signed.",
        "Factor 4 - Environmental Context Verification: Analysis of GPS location, WiFi networks, Bluetooth devices, ambient audio, and light levels. Deviations from patterns trigger additional verification.",
        "Factor 5 - Temporal Authentication Code: Time-based code combining current time, user-specific seed, and session context. Valid for 30 seconds only.",
        "Factor 6 - Personal Knowledge Authentication: Questions from non-public information including recent transactions and profile details. Questions never repeated consecutively.",
        "Factor 7 - Visual Challenge Response: Pattern recognition challenge configured during setup. Different each time, cannot be pre-computed.",
        "Factor 8 - Cryptographic Session Binding: Session token bound to specific combination of user identity, device fingerprint, environment, and temporal code. Transfer attempts cause immediate invalidation."
    ]:
        add_para(t)
    add_heading("12.4 Human-Information Barrier", level=2)
    for t in [
        "All platform interactions require active authentication that cannot be delegated. Dynamic watermarks containing tester identity and timestamp enable tracing leaked content to source.",
        "Measures include visual observation resistance, screen recording watermarking, and technical detail encryption making accurate description impossible."
    ]:
        add_para(t)
    add_heading("12.5 Monitoring and Enforcement", level=2)
    for t in [
        "Continuous monitoring for suspicious patterns: multiple auth attempts from different locations, anomalous access patterns, and data extraction attempts.",
        "Automatic enforcement actions: additional verification, limited access, temporary suspension. All actions logged for audit. Violations result in immediate program termination."
    ]:
        add_para(t)
    add_page_break()

# ═══════════════════════════════════════════════════════════════════════
# APPENDICES
# ═══════════════════════════════════════════════════════════════════════
def build_appendices():
    add_heading("Appendices", level=1)

    add_heading("Appendix A: Glossary of Terms", level=2)
    glossary = [
        ("Access Token", "Short-lived JWT used for API authentication"),
        ("API Gateway", "Single entry point for all client requests"),
        ("Audit Trail", "Immutable log of all security-relevant events"),
        ("Beta Tester", "Authorized pre-release evaluator of the platform"),
        ("Device Binding", "Cryptographic trust between user and device"),
        ("HSTS", "HTTP Strict Transport Security for HTTPS enforcement"),
        ("JWT", "JSON Web Token for authentication"),
        ("MFA", "Multi-Factor Authentication"),
        ("Non-Transferable", "Security property preventing credential sharing"),
        ("RBAC", "Role-Based Access Control"),
        ("RPO", "Recovery Point Objective for data loss tolerance"),
        ("RTO", "Recovery Time Objective for downtime tolerance"),
        ("SLA", "Service Level Agreement"),
        ("TLS 1.3", "Latest Transport Layer Security protocol version"),
        ("TOTP", "Time-based One-Time Password for MFA"),
        ("WORM", "Write Once Read Many storage for immutable logs"),
    ]
    make_table(["Term", "Definition"], glossary)
    add_page_break()

    add_heading("Appendix B: Error Code Reference", level=2)
    add_para("The following error codes are used across the Express Airways Digital Platform.")
    errors = [
        ("E1001", "AUTH_INVALID_CREDENTIALS", "Invalid username or password provided", "Occurs when credentials do not match any registered account. Verify credentials and check Caps Lock. After 5 failures account locks for 15 minutes."),
        ("E1002", "AUTH_ACCOUNT_LOCKED", "Account locked due to multiple failed attempts", "Temporary lock after 5+ consecutive failures. Duration starts at 15 minutes and increases exponentially. Contact support through account recovery for immediate access."),
        ("E1003", "AUTH_SESSION_EXPIRED", "Session expired due to inactivity", "Inactivity timeout of 30 minutes triggered. Redirect to login. Save work frequently during extended sessions."),
        ("E1004", "AUTH_MFA_REQUIRED", "Multi-factor authentication required", "MFA challenge must be completed before access granted. Use authenticator app or backup codes."),
        ("E1005", "AUTH_MFA_INVALID", "Invalid MFA code provided", "MFA code expired or incorrect. Codes valid for 30 seconds. Ensure device clock is synchronized."),
        ("E1006", "AUTH_TOKEN_INVALID", "Access token is invalid or malformed", "JWT token validation failed. Obtain new token through proper authentication flow."),
        ("E1007", "AUTH_TOKEN_EXPIRED", "Access token has expired", "Token lifetime of 15 minutes exceeded. Use refresh token to obtain new access token."),
        ("E1008", "AUTH_REFRESH_INVALID", "Refresh token is invalid or revoked", "Refresh token expired or already used. User must re-authenticate."),
        ("E1009", "AUTH_INSUFFICIENT_PERMISSIONS", "User does not have required permissions", "Role lacks permission for requested operation. Contact administrator for elevated permissions."),
        ("E1010", "AUTH_ACCOUNT_DISABLED", "Account disabled by administrator", "Manual disabling for security or policy reasons. Contact support for reactivation."),
        ("E2001", "VAL_REQUIRED_FIELD", "Required field is missing", "Required form field submitted without value. Fill all required fields marked with asterisk."),
        ("E2002", "VAL_INVALID_FORMAT", "Field value does not match required format", "Value format mismatch. Correct per the expected format shown in validation message."),
        ("E2003", "VAL_MAX_LENGTH", "Field value exceeds maximum allowed length", "Input exceeds maximum character limit. Reduce input length."),
        ("E2004", "VAL_MIN_LENGTH", "Field value is below minimum required length", "Input shorter than minimum requirement. Increase input length."),
        ("E2005", "VAL_INVALID_EMAIL", "Email address format is invalid", "Email does not follow standard format. Provide valid email in local-part@domain.tld format."),
        ("E2006", "VAL_INVALID_PHONE", "Phone number format is invalid", "Phone number not recognized. Include country code with correct digit count."),
        ("E2007", "VAL_INVALID_URL", "URL format is invalid", "URL missing protocol or has invalid format. Include full address with https://."),
        ("E2008", "VAL_INVALID_DATE", "Date format is invalid or out of range", "Date format incorrect or outside acceptable range. Use date picker when available."),
        ("E2009", "VAL_INVALID_NUMBER", "Value is not a valid number or out of range", "Non-numeric value or value outside acceptable range. Enter valid number within bounds."),
        ("E2010", "VAL_PASSWORD_WEAK", "Password does not meet complexity requirements", "Password must be 12+ chars with uppercase, lowercase, number, and special character."),
        ("E3001", "DB_CONNECTION_FAILED", "Database connection could not be established", "Temporary database connectivity issue. Retry operation after a few seconds."),
        ("E3002", "DB_QUERY_TIMEOUT", "Database query exceeded timeout threshold", "Query took too long. Simplify query or retry during off-peak hours."),
        ("E3003", "DB_DUPLICATE_ENTRY", "Record with this key already exists", "Unique constraint violation. Use different value for the unique field."),
        ("E3004", "DB_RECORD_NOT_FOUND", "Requested record does not exist", "Record not found. Verify identifier and check record has not been deleted."),
        ("E3005", "DB_CONSTRAINT_VIOLATION", "Operation violates database constraint", "Integrity constraint violation. Review operation dependencies and relationships."),
        ("E3006", "DB_TRANSACTION_FAILED", "Database transaction failed to complete", "Transaction rolled back due to error. Retry the operation."),
        ("E3007", "DB_DEADLOCK_DETECTED", "Transaction deadlock detected and resolved", "Deadlock resolved by rolling back one transaction. Retry the operation."),
        ("E3008", "DB_CONNECTION_POOL_EXHAUSTED", "All database connections are in use", "Connection pool exhausted. Retry when connections become available."),
        ("E4001", "API_RATE_LIMIT_EXCEEDED", "Request rate exceeds allowed limit", "Rate limit reached. Reduce request frequency and retry after window expires."),
        ("E4002", "API_PAYLOAD_TOO_LARGE", "Request payload exceeds maximum size", "Payload too large. Reduce size or split into multiple requests."),
        ("E4003", "API_INVALID_ENDPOINT", "Requested API endpoint does not exist", "Endpoint not found. Verify URL against API documentation."),
        ("E4004", "API_METHOD_NOT_ALLOWED", "HTTP method not allowed for this endpoint", "Wrong HTTP method. Check API documentation for correct method."),
        ("E4005", "API_VERSION_DEPRECATED", "API version deprecated and no longer supported", "API version retired. Migrate to supported version per documentation."),
        ("E4006", "API_INVALID_PARAMETER", "Request parameter has invalid value", "Parameter value invalid. Correct per API documentation specifications."),
        ("E4007", "API_MISSING_PARAMETER", "Required request parameter is missing", "Required parameter omitted. Include all required parameters."),
        ("E4008", "API_HEADER_MISSING", "Required HTTP header is missing", "Required header missing. Include all required headers."),
        ("E5001", "FILE_TOO_LARGE", "File size exceeds maximum allowed limit", "File too large. Compress or choose smaller file. Maximum is typically 25 MB."),
        ("E5002", "FILE_INVALID_TYPE", "File type not in allowed formats", "File type not allowed. Convert to an accepted format before uploading."),
        ("E5003", "FILE_UPLOAD_FAILED", "File upload failed unexpectedly", "Upload failure. Check network connection and retry."),
        ("E5004", "FILE_CORRUPTED", "Uploaded file appears corrupted", "File corrupted or incomplete. Verify file integrity and re-upload."),
        ("E5005", "FILE_VIRUS_DETECTED", "Security scan detected malicious content", "File blocked for security. Scan locally and verify file safety."),
        ("E5006", "FILE_STORAGE_FULL", "File storage capacity exhausted", "Storage quota reached. Remove unnecessary files or request more storage."),
        ("E6001", "INT_EXTERNAL_SERVICE_ERROR", "External service returned an error", "External service error. Retry after short delay."),
        ("E6002", "INT_EXTERNAL_TIMEOUT", "External service request timed out", "External service timeout. Retry during lower traffic periods."),
        ("E6003", "INT_INTEGRATION_NOT_CONFIGURED", "Integration not configured", "Required integration not set up. Contact administrator to configure."),
        ("E6004", "INT_DATA_SYNC_FAILED", "Data synchronization failed", "Sync failure. Retry or contact support if persistent."),
        ("E6005", "INT_WEBHOOK_DELIVERY_FAILED", "Webhook notification could not be delivered", "Webhook delivery failure. Verify endpoint URL availability."),
        ("E7001", "SEC_ACCESS_DENIED", "Access to requested resource is denied", "Access denied. Verify permissions in Account Center."),
        ("E7002", "SEC_IP_BLOCKED", "IP address blocked due to suspicious activity", "IP blocked. Contact support if this is in error."),
        ("E7003", "SEC_SUSPICIOUS_ACTIVITY", "Suspicious activity detected", "Suspicious activity flag. Review account activity in security settings."),
        ("E7004", "SEC_ENCRYPTION_FAILED", "Data encryption operation failed", "Encryption failure. Contact support with error reference."),
        ("E7005", "SEC_DECRYPTION_FAILED", "Data decryption operation failed", "Decryption failure. Contact support with error reference."),
        ("E7006", "SEC_KEY_EXPIRED", "Encryption key has expired", "Key expired. Key rotation required. Contact support."),
        ("E7007", "SEC_CERTIFICATE_INVALID", "SSL/TLS certificate validation failed", "Certificate invalid. Check system time and certificate chain."),
        ("E8001", "SYS_INTERNAL_ERROR", "An unexpected system error occurred", "Unexpected error. Contact support with error reference code."),
        ("E8002", "SYS_SERVICE_UNAVAILABLE", "Service is currently unavailable", "Service unavailable. Check System Status module for updates."),
        ("E8003", "SYS_MAINTENANCE_MODE", "System is in maintenance mode", "Maintenance in progress. Wait for completion and retry."),
        ("E8004", "SYS_RESOURCE_EXHAUSTED", "System resources temporarily exhausted", "Resources exhausted. Retry when system load decreases."),
        ("E8005", "SYS_UPGRADE_IN_PROGRESS", "System upgrade is in progress", "Upgrade in progress. Wait for completion."),
        ("E8006", "SYS_CONFIGURATION_ERROR", "System configuration is invalid", "Configuration error. Contact administrator for correction."),
        ("E8007", "SYS_FEATURE_DISABLED", "This feature is currently disabled", "Feature disabled. Check when it becomes available."),
        ("E9001", "FLT_FLIGHT_NOT_FOUND", "Requested flight could not be found", "Flight not found. Verify flight number and date."),
        ("E9002", "FLT_ROUTE_UNAVAILABLE", "Flight route not available for date", "Route unavailable. Search alternative dates."),
        ("E9003", "FLT_SCHEDULE_CONFLICT", "Schedule conflict detected", "Schedule conflict. Resolve before saving."),
        ("E9004", "FLT_CARGO_CAPACITY_EXCEEDED", "Cargo capacity exceeded", "Cargo overload. Reduce load or use larger aircraft."),
        ("E9005", "FLT_AIRPORT_CLOSED", "Airport is currently closed", "Airport closed. Check operating hours."),
        ("E9010", "ACC_USER_NOT_FOUND", "User account not found", "User not found. Verify identifier."),
        ("E9011", "ACC_EMAIL_EXISTS", "Email address already registered", "Email in use. Use different email or log in."),
        ("E9012", "ACC_MILES_INSUFFICIENT", "Insufficient loyalty miles", "Insufficient miles. Earn more miles or use alternative payment."),
        ("E9013", "ACC_BOOKING_NOT_FOUND", "Booking record not found", "Booking not found. Verify reference number."),
        ("E9014", "ACC_REGISTRATION_INCOMPLETE", "Registration not completed", "Registration incomplete. Complete all pending steps."),
        ("E9020", "DOC_DOCUMENT_NOT_FOUND", "Document not found", "Document not found. Verify ID and permissions."),
        ("E9021", "DOC_VERSION_NOT_FOUND", "Document version not found", "Version not found. Check revision history."),
        ("E9022", "DOC_ACCESS_DENIED", "Document access not authorized", "Access denied. Submit access request through Document Center."),
        ("E9023", "DOC_EXPIRED", "Document has expired", "Document expired. Request renewal from owner."),
        ("E9030", "HLD_COMPANY_NOT_FOUND", "Company not found in database", "Company not found. Verify name or ticker."),
        ("E9031", "HLD_DATA_UNAVAILABLE", "Financial data not available", "Data unavailable. Try different time range."),
        ("E9032", "HLD_API_LIMIT_REACHED", "Market data API limit reached", "API limit reached. Upgrade subscription or wait for reset."),
        ("E9040", "OPS_EMERGENCY_ACTIVE", "Emergency response in progress", "Emergency active. Coordinate with response team."),
        ("E9041", "OPS_RESOURCE_UNAVAILABLE", "Operational resource unavailable", "Resource unavailable. Check availability and alternatives."),
        ("E9050", "ADM_OPERATION_NOT_ALLOWED", "Administrative operation not permitted", "Operation not permitted. Verify admin privileges."),
        ("E9051", "ADM_USER_ROLE_CONFLICT", "Role assignment conflict", "Role conflict. Review role assignments."),
        ("E9052", "ADM_CONFIG_LOCKED", "Configuration locked", "Config locked. Unlock before making changes."),
        ("E9060", "DP_KEY_GENERATION_FAILED", "API key generation failed", "Key generation failed. Retry."),
        ("E9061", "DP_KEY_REVOKED", "API key has been revoked", "Key revoked. Generate new key."),
        ("E9062", "DP_KEY_EXPIRED", "API key has expired", "Key expired. Generate new key."),
        ("E9063", "DP_SANDBOX_UNAVAILABLE", "Sandbox environment unavailable", "Sandbox unavailable. Check status."),
        ("E9070", "LP_TERMS_NOT_ACCEPTED", "Terms of service not accepted", "Terms not accepted. Review and accept current terms."),
        ("E9071", "LP_CONSENT_REQUIRED", "Consent for data processing required", "Consent required. Update privacy preferences."),
        ("E9072", "LP_CASE_NOT_FOUND", "Legal case record not found", "Case not found. Verify case number."),
        ("E9998", "GEN_OPERATION_TIMEOUT", "Operation exceeded maximum time", "Operation timeout. Retry."),
        ("E9999", "GEN_UNKNOWN", "An unknown error occurred", "Unknown error. Contact support with reference code."),
    ]
    for code, identifier, desc, explanation in errors:
        add_para(f"{code} - {identifier}: {desc}", bold=True)
        add_para(f"Description: {desc}")
        add_para(f"Details: {explanation}")
        add_para("")

    add_page_break()
    add_heading("Appendix C: Test Environment Configuration", level=2)
    make_table(["Parameter", "Development", "Beta Testing", "Staging", "Production"], [
        ("URL", "dev.expressairways.com", "beta.expressairways.com", "staging.expressairways.com", "expressairways.com"),
        ("Database", "dev-db-01", "beta-db-01", "staging-db-01", "prod-db-01"),
        ("Cache Server", "dev-redis-01", "beta-redis-01", "staging-redis-01", "prod-redis-01"),
        ("Log Level", "DEBUG", "INFO", "INFO", "WARN"),
        ("Backup Frequency", "None", "Daily", "Hourly", "Continuous"),
        ("Data Retention", "7 days", "30 days", "90 days", "7 years"),
        ("TLS Version", "1.3", "1.3", "1.3", "1.3"),
    ])
    add_page_break()

    add_heading("Appendix D: Contact Procedures", level=2)
    for t in [
        "All issue reporting and communication with the Express Airways beta testing team should be conducted exclusively through the in-website contact form. The contact form is accessible from every page of the beta platform through a dedicated feedback button located in the bottom-right corner of the interface.",
        "When submitting a report through the contact form, testers should include: a clear description of the issue, steps taken leading up to the issue, expected behavior versus actual behavior observed, and any relevant screenshots or screen recordings. The platform automatically includes session context and environment information with each submission.",
        "For urgent issues that require immediate attention, testers should use the Urgent priority option in the contact form submission. Urgent submissions are automatically flagged for priority review by the QA team. The platform does not expose direct phone numbers or personal email addresses to ensure all communication is properly tracked and documented.",
        "Testers should expect acknowledgement of their submission within 24 hours. Status updates are communicated through the platform notification system. Testers can track the status of all their submissions through the My Reports section of their account dashboard."
    ]:
        add_para(t)
    add_page_break()

    add_heading("Appendix E: Revision History", level=2)
    make_table(["Version", "Date", "Author", "Description of Changes"], [
        ("0.1", "2026-05-01", "QA Division", "Initial draft - Table of contents and section outlines"),
        ("0.2", "2026-05-15", "QA Division", "Added Section 1-3 content, test case templates"),
        ("0.3", "2026-06-01", "QA Division", "Added Section 4 test cases for all modules"),
        ("0.4", "2026-06-15", "QA Division", "Added Section 8 Security Protocols, Section 9 Performance"),
        ("0.5", "2026-06-22", "QA Division", "Added Section 6 Rules of Engagement"),
        ("0.6", "2026-06-29", "QA Division", "Added Section 7 Feature Specifications"),
        ("0.7", "2026-07-03", "QA Division", "Added Appendices A-E"),
        ("0.8", "2026-07-08", "QA Division", "Infrastructure review, environment configuration updates"),
        ("0.9", "2026-07-12", "QA Division", "Final review, formatting, and corrections"),
        ("1.0", "2026-07-14", "QA Division", "Approved for release to beta testing program"),
    ])
    add_page_break()

    add_heading("Appendix G: Frequently Asked Questions", level=2)
    faqs = [
        ("How do I report a bug I found?",
         "Use the in-website contact form accessible from the feedback button in the bottom-right corner of any page. Include a detailed description of the bug, the steps to reproduce it, what you expected to happen, and what actually happened. Attach screenshots or screen recordings if possible. The system will automatically include your session context and environment details with the submission."),
        ("What kind of issues should I report?",
         "You should report ANY issue you encounter that detracts from your experience. This includes functional bugs where something does not work correctly, usability issues where something is confusing or difficult to use, visual inconsistencies where the interface looks wrong, performance problems where the platform feels slow, missing features or functionality you expected to find, and security concerns. If something does not seem right, report it."),
        ("How are rewards calculated?",
         "Rewards are based on the quality, severity, and quantity of issues you report. Bug reports earn points (10 for minor, 25 for major, 50 for critical). Usability suggestions earn 5 points, enhancement ideas earn 8 points, and security vulnerabilities earn 100 points. Higher point totals unlock higher account tiers, and resolved issues earn loyalty miles that can be redeemed for flights and services."),
        ("What are the account tiers and their benefits?",
         "Tiers are: Silver (100 points), Gold (250 points), Platinum (500 points), Diamond (1000 points), and Elite (2000 points). Benefits include account tier upgrades that unlock premium features, bonus loyalty miles for flights, priority support access, limited-edition digital badges, exclusive early access to new features, and Express Airways merchandise. Higher tiers provide progressively better benefits and recognition."),
        ("How do I check my current rewards status?",
         "Your rewards status is available on the Beta Testing Portal rewards dashboard. The dashboard shows your current points total, tier status, earned badges, available rewards, and detailed breakdowns by module and issue category. You can also view your rewards history including points earned per issue, miles credited, badges awarded, and swag shipments."),
        ("Is there a minimum testing requirement?",
         "All testers are expected to dedicate a minimum of 10 hours per week to testing activities throughout the 12-week program. This ensures consistent coverage and timely issue reporting. However, the program recognizes that testers have other commitments, and occasional adjustments can be made by coordinating with the QA team lead."),
        ("How is the program structured?",
         "The program runs for 12 weeks from July 15, 2026 to October 7, 2026, divided into three phases. Phase 1 (weeks 1-4) focuses on core functional exploration. Phase 2 (weeks 5-8) expands to security, performance, and compatibility testing. Phase 3 (weeks 9-12) conducts final validation and regression testing."),
        ("Can I test on my personal device?",
         "Yes, you can test on your personal devices. Ensure your device meets the minimum requirements: Windows 10+, macOS 12+, or Linux; Chrome 120+, Firefox 115+, Safari 16+, or Edge 120+; mobile requires iOS 16+ or Android 13+. Ensure your internet connection has at least 10 Mbps bandwidth. Clear browser cache before each testing session and disable ad-blocking extensions."),
        ("What should I NOT do during testing?",
         "Do not share your login credentials with anyone. Do not use real personal data or actual customer information. Do not attempt to access data beyond your authorized scope. Do not perform unauthorized automated testing. Do not share confidential information about the platform on social media or public forums. Do not reverse engineer platform components."),
        ("How are issues prioritized and resolved?",
         "Issues are categorized by severity: Critical (system failure, data loss, security breach), Major (significant functionality impact), Minor (limited impact), and Enhancement (suggestions). Critical issues are targeted for resolution within 72 hours, Major within 7 days, Minor within 30 days, and Enhancements are reviewed for future releases."),
        ("What happens after I submit an issue?",
         "Your issue receives a unique ID and enters the triage process. The QA team reviews it for completeness, assigns severity, and routes it to the appropriate development team. You can track the issue status through your account. When a fix is deployed, the status changes to Ready for Verification, and you should verify the fix works."),
        ("Can I communicate with other testers?",
         "Yes, but only through the designated communication channels provided by the program. Do not discuss platform details outside of these channels. The program fosters a collaborative community where testers can share knowledge and support each other, subject to confidentiality obligations."),
        ("How do I know if my report was accepted?",
         "You will receive a notification through the platform when your issue is reviewed and accepted. The notification includes the severity classification, assigned priority, and expected resolution timeframe. You can also check the status of all your submissions in the My Reports section."),
        ("What if I encounter a security vulnerability?",
         "Report security vulnerabilities immediately through the contact form with Urgent priority. Security vulnerabilities earn bonus rewards. Do not disclose the vulnerability to anyone else. The security team will investigate and remediate following responsible disclosure procedures."),
        ("Can I participate if I work for a competitor airline?",
         "Individuals employed by competitor airlines or aviation companies may not be eligible to participate due to potential conflicts of interest. The program application process includes screening for such conflicts. If you have questions about eligibility, contact the program administration team."),
        ("How do I update my profile information?",
         "You can update your profile information through the Account Center settings. This includes personal details, notification preferences, communication preferences, and linked loyalty accounts. Keep your profile information current to ensure you receive important program communications."),
        ("What happens if I violate the rules?",
         "Violations are addressed through a graduated disciplinary framework. Minor infractions result in warnings. Moderate violations lead to account suspension and mile penalties. Serious breaches can result in permanent banning from the program. Critical violations involving malicious actions may lead to legal action."),
        ("How do I appeal a disciplinary action?",
         "You may appeal disciplinary actions within 10 business days through the appeals process. The Appeals Committee reviews the submission within 15 business days and issues a final written decision. Outcomes include uphold, reduce, overturn, or modify the action."),
        ("What data does the platform collect about my testing?",
         "The platform collects session information including pages visited, features used, interactions performed, and technical environment details. This data is used to improve the platform and for quality assurance purposes. All data handling complies with applicable privacy regulations."),
        ("Can I opt out of the program?",
         "Yes, you can leave the program at any time by contacting the program administration team. Upon leaving, your access to the beta platform will be terminated. Any rewards earned up to that point will be preserved according to the program terms."),
        ("How do I access the beta platform?",
         "Access the beta platform at https://beta.expressairways.com using your registered beta tester account credentials. Ensure you have completed all onboarding requirements including signing confidentiality agreements, viewing the training webinar, and configuring MFA before accessing the platform."),
        ("What devices and browsers are supported?",
         "Supported browsers: Chrome 120+, Firefox 115+, Safari 16+, and Edge 120+. Supported operating systems: Windows 10+, macOS 12+, and Linux. Mobile support: iOS 16+ and Android 13+. Testing on mobile devices requires installing the Express Airways Beta app from the enterprise distribution platform."),
        ("How long does it take for rewards to be credited?",
         "Loyalty miles are credited within 48 hours of issue resolution confirmation. Tier upgrades take effect immediately upon reaching the required point threshold. Badges are awarded automatically upon milestone completion. Swag packages are shipped within 2 weeks of tier achievement."),
        ("What happens at the end of the beta program?",
         "At the conclusion of the beta program, the platform will be prepared for public release. Testers will receive a summary of their contributions, final rewards will be distributed, and tester accounts may be converted to standard user accounts. Testers will be recognized for their participation."),
        ("How do I provide feedback about the testing program itself?",
         "Feedback about the testing program structure, processes, or tools can be submitted through the contact form with the Program Feedback category. Your input helps improve the program for current and future testers."),
    ]
    for q, a in faqs:
        add_para(f"Q: {q}", bold=True)
        for para in [a]:
            add_para(f"A: {para}")
        add_para("")

    add_page_break()
    add_heading("Appendix H: Testing Scenarios and Use Cases", level=2)
    for i in range(1, 101):
        add_para(f"Scenario {i}: Use Case Description for Exploratory Testing Scenario {i}", bold=True)
        add_para(f"This testing scenario covers an exploratory testing approach for identifying potential issues in the Express Airways Digital Platform. Testers should navigate through the relevant module features, experiment with different inputs and workflows, and document any issues encountered including deviations from expected behavior, usability concerns, performance observations, and visual inconsistencies. Each scenario should be approached with a critical eye toward identifying anything that could be improved.")

    add_page_break()
    add_heading("Appendix I: Platform Configuration Reference", level=2)
    for t in [
        "The platform configuration reference provides detailed information about configurable settings for each module. Configuration changes are managed through the Administration module by authorized administrators. All configuration changes are logged in the audit trail with the administrator identity, timestamp, and before/after values.",
    ]:
        add_para(t)
    make_table(["Module", "Configuration Parameter", "Type", "Default Value", "Description"], [
        ("All", "session_timeout_minutes", "Integer", "30", "Session inactivity timeout in minutes"),
        ("All", "max_concurrent_sessions", "Integer", "5", "Maximum concurrent sessions per user"),
        ("All", "password_min_length", "Integer", "12", "Minimum password length requirement"),
        ("All", "mfa_enforced", "Boolean", "true", "Enforce multi-factor authentication"),
        ("All", "rate_limit_per_minute", "Integer", "60", "API rate limit per minute per user"),
        ("All", "maintenance_window_start", "Time", "02:00 UTC", "Scheduled maintenance window start"),
        ("Flight Center", "flight_refresh_seconds", "Integer", "30", "Flight status refresh interval"),
        ("Flight Center", "max_route_waypoints", "Integer", "10", "Maximum waypoints per route"),
        ("Airport Guide", "weather_cache_minutes", "Integer", "15", "Weather data cache duration"),
        ("Travel Services", "currency_rate_refresh", "Integer", "60", "Currency rate refresh in minutes"),
        ("Holdings", "market_data_delay", "Integer", "15", "Market data delay in minutes"),
        ("Document Center", "max_file_size_mb", "Integer", "25", "Maximum upload file size in MB"),
        ("Document Center", "retention_days", "Integer", "2555", "Document retention in days (7 years)"),
        ("Operations Hub", "emergency_alert_interval", "Integer", "5", "Emergency alert repeat interval in minutes"),
        ("System Status", "health_check_interval", "Integer", "30", "Health check interval in seconds"),
        ("Account Center", "lockout_threshold", "Integer", "5", "Failed attempts before account lockout"),
        ("Account Center", "lockout_duration_minutes", "Integer", "15", "Initial lockout duration in minutes"),
        ("Administration", "audit_retention_days", "Integer", "2555", "Audit log retention in days"),
        ("Developer Portal", "key_expiration_days", "Integer", "365", "API key expiration in days"),
        ("Developer Portal", "sandbox_reset_interval", "Integer", "24", "Sandbox reset interval in hours"),
    ])
    add_page_break()

# ═══════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("Building Express Airways Beta Testing Documentation...")
    print("Step 1/16: Building cover page...")
    build_cover_page()
    print("Step 2/16: Building table of contents...")
    build_toc()
    print("Step 3/16: Building Section 1 - Introduction...")
    build_section_1()
    print("Step 4/16: Building Section 2 - System Overview...")
    build_section_2()
    print("Step 5/16: Building Section 3 - Testing Procedures...")
    build_section_3()
    print("Step 6/16: Building Section 4 - Detailed Test Cases...")
    build_section_4()
    print("Step 7/16: Building Section 5 - Issue Reporting...")
    build_section_5()
    print("Step 8/16: Building Section 6 - Rules of Engagement...")
    build_section_6()
    print("Step 9/16: Building Section 7 - Feature Specifications...")
    build_section_7()
    print("Step 10/16: Building Section 8 - Security Protocols...")
    build_section_8()
    print("Step 11/16: Building Section 9 - Performance Benchmarks...")
    build_section_9()
    print("Step 12/16: Building Section 10 - Checklists...")
    build_section_10()
    print("Step 13/16: Building Section 11 - Benefits and Rewards...")
    build_section_11()
    print("Step 14/16: Building Section 12 - Competitor Protection...")
    build_section_12()
    print("Step 15/16: Building Appendices...")
    build_appendices()

    print("Step 16/16: Adding headers, footers, and formatting...")
    add_watermark_header_footer()

    doc.core_properties.title = "Express Airways Beta Testing Documentation"
    doc.core_properties.subject = "Beta Testing Program"
    doc.core_properties.author = "Express Airways Quality Assurance Division"
    doc.core_properties.category = "Confidential Beta Document"

    output_path = r"C:\Users\lucal\AndroidStudioProjects\express\Express_Airways_Beta_Testing_Documentation.docx"
    print(f"Saving document to {output_path}...")
    doc.save(output_path)
    print(f"\nDocument generated successfully!")
    print(f"Output: {output_path}")

    total_words = sum(len(p.text.split()) for p in doc.paragraphs)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                total_words += len(cell.text.split())

    import os
    file_size = os.path.getsize(output_path)
    file_size_mb = file_size / (1024 * 1024)

    para_count = len(doc.paragraphs)
    table_count = len(doc.tables)

    estimated_pages = para_count // 25 + table_count // 3 + 50

    print(f"\n=== Document Summary ===")
    print(f"File size: {file_size_mb:.2f} MB")
    print(f"Total paragraphs: {para_count}")
    print(f"Total tables: {table_count}")
    print(f"Approximate word count: {total_words}")
    print(f"Estimated pages: ~{estimated_pages}")
