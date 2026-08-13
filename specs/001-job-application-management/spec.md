# Feature Specification: Personal Job Application Management

**Feature Branch**: `001-job-application-management`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "Build a single-user, multi-device personal job application management system that preserves application context, submitted materials, communications, preparation, and history."

## Clarifications

### Session 2026-08-13

- Q: How should the user remove an application or reusable asset from normal use while preserving recovery and data ownership? → A: Archive by default; allow confirmed permanent deletion.
- Q: If the same record is edited from two personal devices, how should the system handle a conflicting save? → A: Detect conflict; let user review and choose.
- Q: Can one job opportunity have more than one submission record, such as a reapplication or a later requested resubmission? → A: Create a separate opportunity for every resubmission.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture and progress an opportunity (Priority: P1)

The user records a newly discovered job opportunity, adds its essential details and relevant materials, prepares an application, records the submission, and moves it through the job-search lifecycle without losing the materials or history associated with it.

**Why this priority**: Capturing opportunities and reliably tracking their current state and submitted materials is the system's core value.

**Independent Test**: Create an opportunity, assign a reusable CV and cover letter, record a submission, move it through statuses, and verify the workspace and chronological history retain the complete record.

**Acceptance Scenarios**:

1. **Given** a discovered job, **When** the user records its company, position, location, source, discovery date, status, and job link, **Then** it appears in the corresponding Kanban column and has an Application Workspace.
2. **Given** a prepared opportunity, **When** the user records a submission with a CV and optional cover letter version, **Then** the submission date, method, notes, and exact submitted asset versions are retained in its history.
3. **Given** an application on the Kanban, **When** the user moves it to another lifecycle status, **Then** its current status changes and a dated status-change event is added to its timeline.

---

### User Story 2 - Restore full application context (Priority: P1)

The user opens an application and can understand what it is, what has happened, what is upcoming, which materials and evidence matter, and what preparation remains without navigating through disconnected records.

**Why this priority**: Restoring context quickly is the primary differentiator of this personal system and reduces job-search cognitive overhead.

**Independent Test**: Open an application containing a submission, communication, interview, preparation task, note, link, contact, document, and evidence item; verify all can be viewed and managed from its workspace.

**Acceptance Scenarios**:

1. **Given** an application with associated records, **When** the user opens its workspace, **Then** job information, current status, next event, timeline, documents, interviews, preparation, notes, links, evidence, contacts, and communications are available with minimal navigation.
2. **Given** an upcoming interview and unfinished preparation tasks, **When** the user views the workspace, **Then** the event is shown separately from the actions the user still needs to complete.
3. **Given** historical activity entered out of order, **When** the user views the timeline, **Then** events appear chronologically with their dates, types, descriptions, and associated context.

---

### User Story 3 - Reuse and preserve professional assets (Priority: P1)

The user maintains reusable CVs, cover letters, documents, and portfolio evidence, connects them to multiple applications, and can always determine exactly what was submitted for a particular application.

**Why this priority**: The user manages several professional profiles and specialized variants; avoiding duplicate data while protecting submission history is essential.

**Independent Test**: Create reusable asset versions, link each to several applications, update the library with a later version, and verify earlier submissions still identify their original versions.

**Acceptance Scenarios**:

1. **Given** a reusable CV or cover-letter version, **When** the user associates it with multiple applications, **Then** each association refers to the same identifiable version without requiring duplicate library records.
2. **Given** a previously submitted asset version, **When** the user later adds or changes a newer library version, **Then** the earlier submission remains associated with the version originally used.
3. **Given** a reusable evidence item, **When** the user links it to relevant applications, **Then** it can be viewed in each application workspace while being maintained once in the evidence library.

---

### User Story 4 - Stay oriented across devices (Priority: P2)

The user uses a desktop browser or mobile device to see active work, upcoming interviews, outstanding actions, and the most relevant application details, and can quickly capture a new opportunity or update progress.

**Why this priority**: Multi-device and mobile access allow the user to manage the search without carrying a primary work computer.

**Independent Test**: On desktop and mobile layouts, view the Kanban, open application details and documents, complete a preparation task, add a note or event, change status, and add an opportunity; confirm recently opened critical information remains readable during a temporary connection loss where it was previously available.

**Acceptance Scenarios**:

1. **Given** active applications, **When** the user opens the home page, **Then** they see a concise Kanban whose cards primarily show position, company, country/location, and next event.
2. **Given** the user is on a mobile device, **When** they need to update an application, **Then** they can perform the supported quick actions with low interaction cost.
3. **Given** the user previously viewed critical application information or frequently used documents, **When** connectivity is temporarily unavailable, **Then** those previously accessed items remain readable where practical and the system clearly indicates that fresh data may be unavailable.

### Edge Cases

- A job is discovered but has no application date, contact, salary, CV, or cover letter; it remains a valid opportunity in the Discovered state.
- An application has no next event or no next action; the workspace and Kanban show an unambiguous empty state rather than misleading information.
- A reusable asset is unavailable at its external location after submission; the application still retains its version identity and submission metadata.
- A status is changed by dragging a Kanban card but the update cannot be saved; the user is informed and the displayed state does not falsely imply success.
- A user requests permanent deletion of an application or reusable asset; the system requires explicit confirmation and explains any historical records or external documents affected before deleting it.
- An interview crosses time zones or has only a start time; its displayed schedule remains unambiguous and supports incomplete optional details.
- A communication has no known recipient, body, attachment, or linked contact; the user can retain the known information without inventing missing details.
- An application is marked Closed / No Response after a long delay; its prior activities remain visible and it can be found by search and filters.
- The user reapplies or resubmits for the same job; they create a separate opportunity record so its lifecycle, submitted assets, and history are independently traceable.
- Export is requested while some externally stored documents cannot be retrieved; the export identifies those items and preserves their links and metadata.
- The same record is changed from two devices before either update is synchronized; the system detects the conflict, retains both versions for review, and does not silently overwrite either change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support one personal user and access to their information from multiple personal devices, without multi-tenancy, collaboration, organizational administration, or complex roles.
- **FR-002**: The system MUST protect the user's job-search information and documents, use least-privilege access for connected external services, and authenticate the user through their Google account for the MVP.
- **FR-003**: The system MUST allow the user to create, view, edit, search, filter, archive, and restore job opportunities before or after an application is submitted; permanent deletion MUST require explicit confirmation.
- **FR-004**: Each opportunity MUST support company, position title, job URL, company URL, location, country, workplace arrangement, employment type, optional salary, optional visa sponsorship, optional relocation information, source, discovery date, application date, current status, priority, fit score, target role family, assigned CV, cover letter, recruiter/contact, and free-form notes.
- **FR-005**: The system MUST provide the default lifecycle statuses Discovered, Preparing, Ready to Apply, Applied, Recruiter Contact, Screening, Interview, Technical Challenge, Final Interview, Offer, Rejected, Withdrawn, and Closed / No Response.
- **FR-006**: The user MUST be able to configure the labels and order of lifecycle statuses without removing the ability to identify applications already assigned to a status.
- **FR-007**: The home page MUST provide an Application Kanban organized by current status, and users MUST be able to move applications between statuses by dragging or an equivalent accessible interaction.
- **FR-008**: A Kanban card MUST primarily show position, company, country/location, and next event; it MUST NOT prominently repeat status or display role family, fit score, priority, days in status, application date, or detailed next actions.
- **FR-009**: Selecting a Kanban card MUST open its Application Workspace.
- **FR-010**: The Application Workspace MUST bring together job information, current status, next event, chronological timeline, documents, interviews, preparation, notes, relevant links, evidence/portfolio, contacts, and communications with minimal navigation.
- **FR-011**: An Application represents one pursued job opportunity and MUST have at most one formal Submission. That Submission records the original act of applying: submission date/time, immutable CV version used, optional immutable cover-letter version used, submission method, and submission notes. A reapplication, later attempt at the same role, or resubmission after closure/rejection/no response MUST be a new Application, not a second Submission.
- **FR-012**: The system MUST preserve the exact version identity of every reusable asset associated with a submission even when later asset versions are added or changed.
- **FR-013**: The system MUST provide reusable CV records with name, role family, version, creation date, last-modified date, file reference, notes, and emphasized skills; it MUST support the stated initial role families and allow the user to add others.
- **FR-014**: The system MUST provide reusable cover-letter records with generic, company-specific, or position-specific variant type; version; optional company and position; file and/or text; notes; and creation/update information.
- **FR-015**: The system MUST support application-associated documents with name, type, version, file or external link, optional description, optional status, and application association. Later employer-requested materials (for example updated CVs, additional information, coding challenges, take-home submissions, presentations, and interview materials) are recorded as application documents and linked through the appropriate timeline, communication, interview, or preparation records; they are not additional Submissions.
- **FR-016**: The system MUST support reusable documents and assets without unnecessary duplication, including CVs, cover letters, portfolio items, presentations, coding challenges, job descriptions, company information, interview notes, and preparation notes.
- **FR-017**: The system MUST store documents through a provider-independent document-storage capability and initially support the user's Google Drive documents without making Google Drive concepts part of the core job-search records.
- **FR-018**: Each application MUST have a chronological timeline of important user-recorded and system-recorded events.
- **FR-019**: Timeline events MUST support date/time, event type, title, description, optional related contact, attached documents, optional communication content, and optional external link.
- **FR-020**: The system MUST automatically add timeline events for status changes and submissions, and allow the user to add other important events such as discovery, invitations, challenges, interviews, rejections, offers, notes, and replies.
- **FR-021**: The system MUST support manually entered communication records with date/time, incoming or outgoing direction, sender, recipient, subject, body and/or notes, attachments, optional contact, and related application.
- **FR-022**: The MVP MUST NOT automatically synchronize Gmail or Outlook messages, extract statuses from email, or detect interviews from email.
- **FR-023**: The system MUST support lightweight application contacts with the useful details needed for recruiters, hiring managers, interviewers, referrals, and HR contacts, without becoming a general-purpose sales CRM.
- **FR-024**: The system MUST support interviews associated with applications, including type, date, start/end time, time zone, platform, meeting URL, interviewers, preparation status, notes, outcome, and follow-up actions.
- **FR-025**: Upcoming interviews and other future events MUST be prominently visible in the relevant application workspace and dashboard.
- **FR-026**: The system MUST distinguish a future event from a user action; actions and events MUST be independently recordable and viewable.
- **FR-027**: The system MUST provide application preparation tasks with title, description, status, priority, due date, and completion date, and allow users to complete and update them.
- **FR-028**: The system MUST provide free-form Markdown preparation notes and relevant links with title, URL, category, and description for each application.
- **FR-029**: The system MUST provide reusable evidence/portfolio items with title, description, URL, category, technologies, skills demonstrated, business impact, and relevant role types.
- **FR-030**: The user MUST be able to associate multiple reusable evidence/portfolio items with an application and maintain each item once for reuse across applications.
- **FR-031**: The dashboard MUST provide a simple overview of active applications, applications this month, upcoming interviews, applications awaiting response, outstanding technical challenges, offers, rejections, applications by role family and country, conversion between major stages, average time between important stages, applications requiring action, and upcoming events.
- **FR-032**: The system MUST provide full-text search across company, position, application notes, preparation notes, communication notes, document metadata, and evidence metadata.
- **FR-033**: The system MUST support filtering applications by company, position, role family, country, status, CV used, application date, priority, fit score, interview state, challenge state, sponsorship, and source.
- **FR-034**: Desktop and mobile experiences MUST support viewing the Kanban, application details, CVs and documents, preparation, notes, timelines, and upcoming interviews.
- **FR-035**: On mobile devices, the user MUST be able to add an opportunity, add a quick event, note, or task, complete a preparation task, change an application status, and view documents with low interaction cost.
- **FR-036**: Previously viewed critical application information and bounded, user-recent document access SHOULD remain readable during temporary connectivity loss where practical. The MVP MUST not queue offline mutations, synchronize offline changes, or provide full offline document storage.
- **FR-037**: The user MUST be able to create a portable backup export containing structured application and related data, JSON and/or CSV representations where appropriate, a manifest, document metadata, provider references, and every document binary retrievable from Google Drive under the granted authorization. For each binary that cannot be retrieved, the manifest MUST explain its unavailability while retaining associated metadata and reference; references alone are not a complete backup.
- **FR-038**: The MVP MUST NOT include calendar synchronization, LinkedIn integration, automatic job scraping or discovery, AI agents, AI-generated CVs or cover letters, browser extensions, microservices, elaborate workflow engines, or separate search infrastructure.
- **FR-039**: The data model MUST allow future optional assistance such as job-requirement extraction, CV and evidence recommendations, preparation suggestions, communication summaries, and interview analysis without making any such assistance authoritative or required for core workflows.
- **FR-040**: The system MUST preserve existing historical information when records are edited, status changes occur, connected services fail, or a user closes an application; archiving MUST preserve the associated history until the user explicitly confirms permanent deletion.
- **FR-042**: The MVP MUST implement one configured personal user only, while keeping domain-data ownership and authorization boundaries explicit and keeping external authentication identity separate from core job-search entities. This is a SaaS-compatible boundary, not multi-tenancy, organizations, RBAC, billing, user management, collaboration, or administration.
- **FR-041**: When conflicting edits to the same record are received from different personal devices, the system MUST retain both versions for user review and require the user to choose the resulting value; it MUST NOT silently overwrite either edit.

### Key Entities *(include if feature involves data)*

- **Opportunity / Application**: A job opportunity and its current job-search state; may exist before submission and brings all related context together. A reapplication or resubmission is represented by a separate record.
- **Submission**: The optional, single dated record of originally applying for an opportunity, including immutable identities of the submitted asset versions and submission details. Later employer-requested materials use the applicable lifecycle entities instead.
- **Lifecycle Status**: A user-configurable workflow state used to organize current application progress on the Kanban.
- **Timeline Event**: A dated historical record of a significant event or system action connected to an application.
- **Document Asset**: A reusable or application-specific file or external reference, with type, version, metadata, and optional application association.
- **CV**: A reusable, versioned professional resume tailored to one or more role families.
- **Cover Letter**: A reusable, versioned generic, company-specific, or position-specific letter.
- **Communication**: A manually recorded incoming or outgoing message associated with an application and optionally a contact.
- **Contact**: A lightweight person record relevant to an application, such as a recruiter or interviewer.
- **Interview**: A scheduled or completed application event with participants, schedule, preparation state, outcome, and follow-up actions.
- **Preparation Task**: A user action needed to prepare for an application, with status, priority, and dates.
- **Preparation Note / Relevant Link**: Application context entered as Markdown notes or categorized web links.
- **Evidence / Portfolio Item**: A reusable project, presentation, article, publication, or other professional evidence that can be linked to several applications.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can record a newly discovered opportunity with its required core details and see it on the Kanban in under 2 minutes.
- **SC-002**: A user can open an active application and identify its position, company, current status, next event, latest history, submitted materials, and unfinished preparation in under 30 seconds.
- **SC-003**: A user can record a submission, including its exact CV and optional cover-letter version, in under 1 minute; a later review identifies the originally submitted versions in 100% of tested submissions.
- **SC-004**: In usability testing of a representative large job search, the user can locate an application by free-text search or the specified filters in no more than 3 interactions after opening search or filters.
- **SC-005**: A user can complete the common mobile tasks of viewing an application, completing a preparation task, changing status, or adding a quick note/event in no more than 4 interactions from the relevant primary view.
- **SC-006**: The dashboard identifies every application with an upcoming event within the next 14 days and every open preparation task past its due date in the test data set.
- **SC-007**: A complete export makes 100% of structured application records readable independently of the application, includes every retrievable authorized document binary, and identifies every referenced document and reason any binary could not be included.
- **SC-008**: Previously accessed critical information remains readable in a simulated temporary connectivity loss for at least 90% of the representative items selected for offline availability.

## Assumptions

- The MVP serves one user only; access from multiple personal devices refers to the same user's authenticated account.
- Google account sign-in and Google Drive are initial external dependencies; document storage remains conceptually provider-independent.
- Manual entry is the accepted MVP workflow for communications, interviews, discovered opportunities, and status updates.
- CV, cover-letter, and document versions are immutable once used in a recorded submission; corrections are made by adding a new version rather than altering the historical association.
- Configurable statuses are limited to a simple personal workflow configuration and do not introduce workflow automation, approvals, or complex rules.
- “Frequently used documents” and “critical application information” for temporary read-only access are determined by the user's recent access and saved application context; full offline editing and conflict synchronization are excluded.
- Export is a portable backup: it includes structured records, manifest, metadata, provider references, and all binaries retrievable under granted authorization; unavailable binaries remain documented in the manifest with their references and reason.
- Future AI features remain optional suggestions and never overwrite or silently alter user-entered records.
