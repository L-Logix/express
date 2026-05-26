# Express Airways Judicial & Litigation Management System

This folder contains a complete App Script-backed judicial operating system prototype for Express Airways.
It is designed as a secure tribunal portal, litigation archive, evidentiary management engine, and procedural record system.

## Contents

- `index.html` — main HTML service interface
- `style.html` — grey-blue judicial UI styling
- `script.html` — vanilla JavaScript client behavior
- `code.gs` — Apps Script backend, CORS handling, Sheets integration, authentication, audit logging, verdict submission

## Deployment Notes

1. Create a new Google Apps Script project.
2. Add the files from this folder into the script project.
3. Set `SHEET_URL` in `code.gs` to the URL of the target Google Spreadsheet.
4. Deploy as a web app with access set to the appropriate internal audience.

## Required Google Sheets Setup

Create a Google Spreadsheet with the following sheets and header rows exactly.

### Users

| UserID | FullName | Email | PasswordHash | PasswordSalt | SystemRole | Approved | CreatedAt |

### Sessions

| SessionID | UserID | Token | ExpiresAt | CreatedAt |

### Cases

| CaseID | Title | Type | Status | InternalRef | ExternalDocket | Classification | AssignedJudge | Charges | FilingDate | Plaintiff | Defendant | Description | CreatedAt |

### Participants

| ParticipantID | CaseID | UserID | Role | Status | AssignedAt |

### Evidence

| EvidenceID | CaseID | UploadedBy | Type | Title | Link | Category | Timestamp | Notes |

### Verdicts

| VerdictID | CaseID | Outcome | SentenceSummary | Reasoning | EvidenceCited | RejectedEvidence | AudioLink | VideoLink | SubmittedBy | SubmittedAt | ProceduralReview |

### Notices

| NoticeID | CaseID | Sender | Recipient | Message | Type | CreatedAt |

### AuditLogs

| AuditID | Action | User | CaseID | Details | Timestamp |

### Config (optional)

| Key | Value |

## Google Sheets Integration

The system treats Google Sheets as:

- a relational datastore for case files and participants
- an audit ledger for every procedural action
- a live archive for verdicts, evidence, and notices
- a session store for Apps Script session tokens

### Recommended data flow

- User registration writes to `Users`
- Login creates a token row in `Sessions`
- Case metadata is stored in `Cases`
- Per-case role assignments are stored in `Participants`
- Evidence metadata is captured in `Evidence`
- Verdict submissions are recorded in `Verdicts`
- Notices are archived in `Notices`
- All actions are logged in `AuditLogs`

## Google Drive and Notifications

- Evidence uploads should be stored in Google Drive and the file link stored in the `Evidence.Link` field.
- The backend uses `MailApp.sendEmail` to notify participants when new evidence, notices, or verdicts are recorded.

## Sheet Setup Summary

Create the following sheets:

- `Users`
- `Sessions`
- `Cases`
- `Participants`
- `Evidence`
- `Verdicts`
- `Notices`
- `AuditLogs`
- `Config` (optional)

Populate the header row exactly as shown above. Then update `SHEET_URL` in `legal/code.gs` with your spreadsheet URL.

Once configured, deploy the Apps Script web app and authenticate to see the judicial dashboard.
