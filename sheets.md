# Express Airways Sheets Documentation

## Overview

Express Airways uses Google Sheets as its database backend. All data is stored in a single spreadsheet at:
https://docs.google.com/spreadsheets/d/1J39EDm_hZWFtQ-fFg2WZQul9sIP6zca7ooWOrXUhdao/edit

Each sheet (tab) stores a specific type of data. The first row of each sheet contains column headers. Data rows follow the header order.

## Sheets Reference

### Users
Stores all user accounts.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | UserID | Text | Unique user identifier (e.g., USR-XXXXXXXX) |
| B | FullName | Text | User's full name |
| C | Email | Text | User email address (lowercase) |
| D | Password | Text | Plain text or SHA-256 hashed password |
| E | Role | Text | User role (User, Admin, Travel Agent, etc.) |
| F | Miles | Number | Loyalty miles balance |
| G | Status | Number | Account status (1=Active, 2=Suspended, 3=Disabled, 4=Banned) |
| H | JoinDate | Date | Account creation date |
| I | Timestamp | DateTime | Last update timestamp |
| J | UpdatedAt | DateTime | Last modification timestamp |

### Bookings
Stores all flight bookings.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | BookingRef | Text | Unique booking reference (timestamp-based) |
| B | Email | Text | Booking owner email |
| C | Status | Text | CONFIRMED, PENDING_REVIEW, CANCELLED |
| D | Origin | Text | Origin airport IATA code |
| E | Destination | Text | Destination airport IATA code |
| F | DepartDate | Date | Departure date |
| G | FlightTimes | Text | Estimated flight time |
| H | ServiceType | Text | EA (Express Airways Intl), EX (Explore Airways Domestic), EC (Express Charter) |
| I | Passengers | Number | Number of passengers |
| J | TotalPrice | Number | Total booking price in USD |
| K | PaymentMethod | Text | credit, cash, miles |
| L | PaxName | Text | Comma-separated passenger names |
| M | PaxDOB | Text | Comma-separated passenger dates of birth |
| N | PaxGender | Text | Comma-separated passenger genders |
| O | PaxPassport | Text | Comma-separated passenger passport numbers |
| P | PaxPhone | Text | Comma-separated passenger phone numbers |
| Q | PaxCabin | Text | Economy, Business, FirstClass |
| R | Timestamp | DateTime | Booking creation timestamp |

### Seats
Aircraft seat configurations.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | SeatID | Text | Seat identifier (e.g., 1A, 12B) |
| B | Aircraft | Text | Aircraft model |
| C | Row | Number | Row number |
| D | Column | Text | Seat position (A, B, C, D, E, F) |
| E | Type | Text | Window, Aisle, Middle |
| F | Available | Boolean | Whether seat is available |
| G | Price | Number | Seat price in USD |

### SeatAssignments
Maps bookings to specific seats.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | BookingRef | Text | Booking reference |
| B | Seat | Text | Seat identifier |
| C | PaxName | Text | Passenger name |
| D | Email | Text | Passenger email |
| E | Timestamp | DateTime | Assignment timestamp |

### Ancillaries
Available ancillary services (extras).

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Type | Text | Service type identifier |
| B | Description | Text | Service description |
| C | Price | Number | Price in USD |

### AncillaryBookings
Ancillary services purchased with bookings.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | BookingRef | Text | Booking reference |
| B | Type | Text | Ancillary type |
| C | Price | Number | Price paid |
| D | Email | Text | Customer email |
| E | Timestamp | DateTime | Purchase timestamp |

### PromoCodes
Discount/promotional codes.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Code | Text | Promo code string |
| B | DiscountPercent | Number | Percentage discount (0-100) |
| C | DiscountDollars | Number | Fixed dollar discount |
| D | MaxUses | Number | Maximum times code can be used |
| E | UsedCount | Number | Times code has been used |
| F | ExpiryDate | Date | Code expiration date |
| G | Active | Boolean | Whether code is active |

### Sections
Homepage section cards.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Title | Text | Section card title |
| B | Description | Text | Section card description |
| C | Image | Text | Image URL for card |
| D | Link | Text | Page link for card |
| E | ButtonText | Text | Button label text |

### Events
Upcoming events and promotions.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Date | Date | Event date |
| B | Title | Text | Event title |
| C | Description | Text | Event description |
| D | Link | Text | Event information link |
| E | Image | Text | Event image URL |

### Documents
Available documents for viewing/download.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | ID | Text | Unique document identifier |
| B | Title | Text | Document title |
| C | Description | Text | Document description |
| D | Type | Text | Document type (document, pdf, presentation, spreadsheet, image) |
| E | FileID | Text | File URL or Google Drive file ID |
| F | Thumbnail | Text | Thumbnail image URL |
| G | Category | Text | Document category (General, Aviation, Legal, Technical, etc.) |
| H | OpenLimit | Number | Maximum number of opens allowed (0=unlimited) |
| I | Opens | Number | Current open count |
| J | Available | Boolean | Whether document is publicly available |
| K | RequiresRequest | Boolean | Whether access request is required |

### DocRequests
Document access requests from users.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Timestamp | DateTime | Request timestamp |
| B | UserEmail | Text | Requester email |
| C | UserName | Text | Requester name |
| D | DocID | Text | Document identifier |
| E | DocTitle | Text | Document title |
| F | Reason | Text | Reason for access |
| G | Department | Text | Requesting department |
| H | Status | Text | pending, approved, denied |

### Notices
System notices and advisories.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Title | Text | Notice title |
| B | Message | Text | Notice message body |
| C | Severity | Text | info, warning, critical |
| D | Timestamp | DateTime | Notice creation timestamp |

### Contact
Contact form submissions.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Name | Text | Submitter name |
| B | Email | Text | Submitter email |
| C | Message | Text | Message content |
| D | Timestamp | DateTime | Submission timestamp |

### Issues
Bug reports and support issues.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | IssueID | Text | Unique issue identifier |
| B | Email | Text | Reporter email |
| C | Subject | Text | Issue subject |
| D | Description | Text | Issue description |
| E | Severity | Text | low, normal, high, critical |
| F | Status | Text | OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| G | Created | DateTime | Creation timestamp |
| H | Updated | DateTime | Last update timestamp |

### Reviews
Flight reviews submitted by users.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Timestamp | DateTime | Review submission time |
| B | BookingRef | Text | Associated booking reference |
| C | Email | Text | Reviewer email |
| D | Rating | Number | Rating (1-5) |
| E | Comment | Text | Review comment |
| F | Date | Date | Flight date |

### Referrals
User referral tracking.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Timestamp | DateTime | Referral timestamp |
| B | ReferrerEmail | Text | Referring user email |
| C | RefereeEmail | Text | Referred user email |
| D | Status | Text | PENDING, COMPLETED, REWARDED |
| E | Date | Date | Referral date |

### Config
Key-value configuration pairs.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Key | Text | Configuration key |
| B | Value | Text | Configuration value |

### SystemStatus
System service status indicators.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Key | Text | Service name (e.g., bookingEngine, payment, seats) |
| B | Value | Text | Service status (OPERATIONAL, DEGRADED, DOWN) |

### Sessions
User authentication sessions.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | SessionID | Text | Unique session identifier |
| B | UserID | Text | Associated user ID |
| C | Token | Text | Session token (UUID) |
| D | ExpiresAt | DateTime | Session expiration time |
| E | CreatedAt | DateTime | Session creation time |

### Cases
Legal cases in the judicial system.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | CaseID | Text | Unique case identifier |
| B | Title | Text | Case title |
| C | Type | Text | Case type |
| D | Status | Text | OPEN, CLOSED, APPEALED |
| E | FiledBy | Text | Person who filed the case |
| F | FiledAgainst | Text | Person/entity case is against |
| G | Description | Text | Case description |
| H | CreatedAt | DateTime | Creation timestamp |
| I | UpdatedAt | DateTime | Last update timestamp |

### Participants
Case participants.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | ParticipantID | Text | Unique participant identifier |
| B | CaseID | Text | Associated case |
| C | UserID | Text | Participant user ID |
| D | Email | Text | Participant email |
| E | Role | Text | Role in case |
| F | JoinedAt | DateTime | When participant joined |

### Evidence
Case evidence items.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | EvidenceID | Text | Unique evidence identifier |
| B | CaseID | Text | Associated case |
| C | UploadedBy | Text | Who uploaded the evidence |
| D | Type | Text | Evidence type (Document, Image, Audio, Video) |
| E | Title | Text | Evidence title |
| F | Link | Text | Evidence file link |
| G | Category | Text | Evidence category |
| H | Timestamp | DateTime | Upload timestamp |
| I | Notes | Text | Additional notes |

### Verdicts
Case verdicts and judgments.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | VerdictID | Text | Unique verdict identifier |
| B | CaseID | Text | Associated case |
| C | Outcome | Text | Verdict outcome |
| D | SentenceSummary | Text | Sentence summary |
| E | Reasoning | Text | Judicial reasoning |
| F | EvidenceCited | Text | Evidence referenced in ruling |
| G | RejectedEvidence | Text | Evidence not considered |
| H | AudioLink | Text | Audio recording link |
| I | VideoLink | Text | Video recording link |
| J | SubmittedBy | Text | Judge/official who submitted |
| K | SubmittedAt | DateTime | Submission timestamp |
| L | ProceduralReview | Text | Procedural review notes (JSON) |

### Notifications
User notification records.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | NotificationID | Text | Unique notification identifier |
| B | UserID | Text | Target user |
| C | Email | Text | Target email |
| D | Type | Text | Notification type |
| E | Title | Text | Notification title |
| F | Message | Text | Notification body |
| G | Link | Text | Related link |
| H | Read | Boolean | Whether notification has been read |
| I | CreatedAt | DateTime | Creation timestamp |

### TrackingLog
Page view and visit tracking.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Timestamp | DateTime | Visit timestamp |
| B | IP | Text | Visitor IP address |
| C | Fingerprint | Text | Browser fingerprint hash |
| D | UserAgent | Text | Browser user agent string |
| E | Screen | Text | Screen resolution |
| F | Timezone | Text | Browser timezone |
| G | Language | Text | Browser language |
| H | Page | Text | Page visited |
| I | User | Text | Logged-in user email |
| J | Extra | Text | Additional tracking data |

### AuditLog
Comprehensive event audit trail.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Timestamp | DateTime | Event timestamp |
| B | Action | Text | Action identifier (e.g., login, booking, pageview, click) |
| C | User | Text | User email or identifier |
| D | Details | Text | Event details/description |
| E | IP | Text | IP address |
| F | Fingerprint | Text | Browser fingerprint |
| G | UserAgent | Text | Browser user agent |
| H | Page | Text | Page where event occurred |
| I | Element | Text | Element that triggered the event |
| J | EventType | Text | Type of event (click, scroll, pageview, login, etc.) |
| K | Duration | Text | Duration (for timed events) |

### ApiKeys
Developer API keys.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Key | Text | API key string (EA-prefixed) |
| B | Email | Text | Key owner email |
| C | Name | Text | Key name/label |
| D | CreatedAt | DateTime | Key creation timestamp |
| E | LastUsed | DateTime | Last usage timestamp |
| F | Status | Text | active, inactive, removed |
| G | RequestCount | Number | Total API requests made |
| H | LastReactivation | DateTime | Last reactivation timestamp |
| I | Notes | Text | Additional notes |

### DeviceTracking
Device and visitor intelligence tracking.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Name | Text | Device name |
| B | Device ID | Text | Auto-generated device identifier |
| C | IP | Text | IP address |
| D | Fingerprint | Text | Browser fingerprint |
| E | Status | Text | Active, Inactive |
| F | Websites | Text | Pages/sites visited |
| G | Country | Text | Geolocated country |
| H | State | Text | Geolocated state/region |
| I | City | Text | Geolocated city |
| J | Postal Code | Text | ZIP/postal code |
| K | Latitude | Text | Approximate latitude |
| L | Longitude | Text | Approximate longitude |
| M | ASN | Text | Autonomous System Number |
| N | Organization | Text | ISP organization name |
| O | ISP | Text | Internet Service Provider |
| P | VPN | Boolean | VPN/proxy detection (checkmark or cross) |
| Q | Network Scanner | Boolean | Network scanner flag |
| R | Hosting | Boolean | Hosting/datacenter detection |
| S | Proxy | Boolean | Proxy detection |
| T | Cloud | Boolean | Cloud provider detection |
| U | Snort | Boolean | Snort IDS flag |
| V | Mobile | Boolean | Mobile connection detection |
| W | Tor | Boolean | Tor exit node detection |
| X | Inbound | Text | Inbound traffic info |
| Y | Outbound | Text | Outbound traffic info |
| Z | AS Name | Text | Full AS organization name |
| AA | Further Details | Text | Additional network details |
| AB | Last Seen | DateTime | Last activity timestamp |

### SessionHeartbeats
Live user session heartbeats (auto-managed).

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | SessionID | Text | Session or fingerprint identifier |
| B | User | Text | User email |
| C | IP | Text | IP address |
| D | Fingerprint | Text | Browser fingerprint |
| E | LastHeartbeat | DateTime | Last heartbeat timestamp |
| F | Page | Text | Current page URL |

## Usage Notes

1. **Auto-creation**: Sheets are automatically created by the `setupSheet()` function when first needed.
2. **Row 1**: Always contains column headers. Do not modify headers without updating the code.
3. **Data types**: All data is stored as text. Numeric values are parsed by the application code.
4. **API Keys**: The `AuditLog` and `TrackingLog` sheets grow quickly. Consider periodic cleanup.
5. **SessionHeartbeats**: Auto-managed by the system. Users are considered "online" if their heartbeat is within 5 minutes.
6. **DeviceTracking**: Updated on each page view. IP geolocation data is fetched via ip-api.com.
