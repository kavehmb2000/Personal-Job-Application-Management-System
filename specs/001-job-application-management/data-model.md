# Data Model: Personal Job Application Management

## Modeling conventions

- All records have immutable `id`, `createdAt`, and `updatedAt` fields.
- Independently editable records have an integer `version` used for optimistic concurrency. Mutations must supply the version read by the client.
- All timestamps are stored with timezone; the original IANA time zone is retained for interviews and events when supplied.
- Archived records have `archivedAt`; archive does not remove history. Permanent deletion requires explicit confirmation and documents affected relationships before execution.
- Provider-specific identifiers live only in adapter metadata; domain entities use provider-neutral names.
- Domain records that contain personal job-search data are owned through an explicit `ownerId` boundary. In the MVP every request resolves to the one configured owner; this is not a tenant, organization, role, or collaboration model.

## Identity and ownership

### Account and ownership boundary

`OwnerAccount` is the MVP's one permitted principal. It is an account/authorization record, not a core job-search entity. Core aggregate roots (`Application`, reusable `DocumentAsset`, `CVProfile`, `CoverLetter`, `EvidenceItem`, `Contact`, and `LifecycleStatus`) have `ownerId` referencing this boundary; dependent records inherit ownership through their root. This makes authorization checks explicit and keeps external identity separate from the domain while avoiding multi-tenancy implementation.

| Field | Rules |
|---|---|
| `id`, `googleSubject`, `email`, `displayName` | Google subject and normalized email are unique. Login is permitted only for the configured owner in the MVP. |
| `createdAt`, `lastSignInAt` | Audit and session context. |

### AuditEvent

Records security-sensitive actions: sign-in, export request, archive, permanent deletion, Drive authorization changes, and failed access attempts. It is append-only and includes actor, type, timestamp, target type/id, and safe metadata.

## Application aggregate

### Application

Represents one job opportunity and its current state. A reapplication or resubmission is a separate Application record.

| Fields | Rules |
|---|---|
| `id`, `ownerId`, `version`, `archivedAt` | Editable aggregate with archive-first lifecycle and explicit owner boundary. |
| `companyName`, `positionTitle` | Required; searchable. |
| `jobUrl`, `companyUrl`, `location`, `country` | URLs optional but valid if supplied; location/country independently optional after initial creation. |
| `workplaceMode`, `employmentType`, `salaryText`, `visaSponsorship`, `relocationText` | Structured enumerations where appropriate; optional detail preserved as text. |
| `source`, `discoveredAt`, `appliedAt` | Source and discovery date required; application date is derived/displayed from first submission but may be retained as a query projection. |
| `statusId`, `priority`, `fitScore`, `roleFamily`, `notesMarkdown` | Current status required; fit score range 0–100 when present. |
| `nextActionTitle`, `nextActionDueAt` | Optional; distinct from scheduled events. |

Relationships: one current `LifecycleStatus`; zero or one formal `Submission`; many timeline events, communications, interviews, preparation tasks/notes/links, contacts through associations, documents, and evidence associations.

### LifecycleStatus

Owner-configurable Kanban state.

| Fields | Rules |
|---|---|
| `id`, `name`, `sortOrder`, `isTerminal`, `isActive` | Name is unique among active statuses; default statuses seeded from spec. |

Status label and order can change. A status with assigned applications cannot be removed; it may be renamed, archived from future selection, or applications moved first. Changing status creates a TimelineEvent after a successful save.

### Submission (zero or one per Application)

The immutable record of the original formal act of applying for an Application. Enforce unique `applicationId`; this is intentionally not a generic multi-submission model.

| Fields | Rules |
|---|---|
| `id`, `applicationId`, `submittedAt`, `method`, `notes` | Required application and timestamp; method uses a controlled list plus optional text. |
| `cvSnapshot`, `coverLetterSnapshot` | Immutable JSON snapshots of versioned asset identity, display name, version label, source file reference, and checksum where known. Cover letter optional. |

No second Submission is created for the same Application. A reapplication, post-closure retry, or later attempt at the same role creates a new Application. Later employer-requested materials—including updated CVs, additional information, coding challenges, take-home submissions, presentations, and interview material—use `ApplicationDocument` and the relevant TimelineEvent, Communication, Interview, or PreparationTask rather than Submission.

### TimelineEvent

Append-only chronological history item.

| Fields | Rules |
|---|---|
| `id`, `applicationId`, `occurredAt`, `type`, `title`, `descriptionMarkdown` | Timestamp, type, and title required. |
| `contactId`, `communicationId`, `externalUrl`, `systemGenerated` | Optional associations/context. |

Event types include discovery, submission, status change, communication, interview invitation/completion, challenge received/submitted, rejection, offer, note, and custom. `systemGenerated` events are created transactionally after their initiating status/submission save succeeds.

## Reusable assets and documents

### DocumentAsset

Provider-neutral document metadata for a reusable or application-specific item.

| Fields | Rules |
|---|---|
| `id`, `ownerId`, `version`, `name`, `documentType`, `versionLabel`, `description`, `status`, `isReusable` | Name/type required; external status optional. |
| `storageProvider`, `storageReference`, `externalUrl`, `originalFilename`, `mimeType`, `sizeBytes`, `checksum` | At least a storage reference or external URL is required; provider reference is adapter-owned. |
| `archivedAt` | Archive-first. |

`ApplicationDocument` joins a document to an application with a purpose and optional note. `TimelineEventDocument` joins event attachments. Existing snapshots prevent later edits from changing submitted identity.

`StorageProvider` owns provider-specific authorization, selection, metadata retrieval, download, and export retrieval. The Google Drive implementation uses the least-privilege user-selected-file flow; Drive IDs/scopes are not fields or concepts in core job-search entities.

### CVProfile

Reusable CV version with `name`, `roleFamily`, `versionLabel`, `createdOn`, `lastModifiedOn`, `notes`, `skillsEmphasized`, and one `DocumentAsset`. Initial role-family values are seeded; custom values are permitted.

### CoverLetter

Reusable cover-letter version with `variantType` (generic, company-specific, position-specific), `versionLabel`, optional company/position, optional Markdown text, notes, creation/update dates, and optional `DocumentAsset`.

### EvidenceItem

Reusable professional evidence with `title`, `description`, `url`, `category`, `technologies`, `skillsDemonstrated`, `businessImpact`, and `relevantRoleTypes`. `ApplicationEvidence` joins many items to many applications and may store a relevance note.

## Context and preparation

### Contact and ApplicationContact

`Contact` holds minimal useful person information: name, role type (recruiter, hiring manager, interviewer, referral, HR, other), organization, email, phone, profile URL, and notes. `ApplicationContact` associates it with an application and contextual role.

### Communication

Manual incoming/outgoing message record with `occurredAt`, direction, sender, recipient, subject, body/notes Markdown, optional contact, and application. Attachments use `CommunicationDocument`. No mailbox sync fields are present in MVP.

### Interview

Associated with an application. Includes type, scheduled date, start/end time, time zone, platform, meeting URL, preparation status, notes, outcome, and follow-up actions. `InterviewParticipant` relates optional contacts. A scheduled interview contributes to the application's calculated next event.

### PreparationTask

Application-specific action with title, description Markdown, status, priority, due date, completed date, and version. It is distinct from Interview and TimelineEvent.

### PreparationNote and RelevantLink

PreparationNote stores application Markdown context. RelevantLink stores title, URL, category, and description. Both are searchable.

## Derived read models and analytics

- **KanbanCard**: application ID, position, company, country/location, status column, and nearest future Interview or TimelineEvent. It deliberately excludes detailed metadata.
- **ApplicationWorkspace**: one application with all context ordered by time and relevance.
- **SearchDocument**: PostgreSQL search vector assembled from approved searchable fields: company, position, application notes, preparation notes, communication notes, document metadata, and evidence metadata.
- **DashboardMetrics**: calculated from current application state and chronological timestamps; includes stage conversion, average stage durations, upcoming events, overdue actions, challenges, offers, and rejections.

## Integrity rules and transitions

1. Status changes update `Application.statusId` only if the submitted version matches; on success append a status-change TimelineEvent.
2. A Submission requires a valid immutable CV snapshot and may include one cover-letter snapshot; successful creation appends a submission TimelineEvent.
3. Archive hides an Application or reusable asset from default views without erasing associated records. Restore is allowed while data remains. Permanent deletion requires confirmation and must either block when preserving required history is impossible or explain exactly what will be removed.
4. On a version mismatch, no change is persisted; return the current record and user draft for comparison. The user's resolution becomes a fresh versioned update.
5. Delete/authorization/storage failures never remove the database reference until the operation has succeeded or the user explicitly elects to remove a broken reference.
6. Export writes a manifest for every DocumentAsset. It includes a binary whenever StorageProvider can retrieve it under the granted authorization; otherwise the manifest retains metadata/reference and records why the binary was unavailable.
