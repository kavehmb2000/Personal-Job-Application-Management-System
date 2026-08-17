# Feature Specification: Personal Job Opportunity Management

**Feature Branch**: `001-job-application-management`
**Status**: Draft — simplified MVP
**Created**: 2026-08-17

## 1. Purpose

The Personal Job Opportunity Management System is a single-user, multi-device application for managing a personal job search.

Its purpose is to reduce cognitive overhead by preserving the context surrounding each job opportunity:

* what the opportunity is;
* why it is interesting;
* how well it fits;
* what research was performed;
* which CV and other artefacts are relevant;
* what has been submitted;
* what has happened;
* what needs attention;
* what happens next;
* and what was learned from the process.

The system is intentionally not a generic ATS, CRM, project-management system, or workflow engine.

The MVP follows an **Opportunity-Centric, Event-Oriented** domain model.

---

## 2. Core Concepts

### 2.1 Opportunity

An **Opportunity** represents one job opportunity being considered or pursued.

An Opportunity exists before an application is submitted.

A new application or resubmission for the same position is represented by a separate Opportunity.

The Opportunity is the primary aggregate root and the central unit of user interaction.

### 2.2 Artefact

An **Artefact** is an immutable piece of professional or opportunity-related information that can be associated with an Opportunity.

Examples include:

* CV;
* cover letter;
* job description;
* company research;
* presentation;
* portfolio item;
* university diploma;
* language certificate;
* requested additional document;
* interview preparation material;
* assignment;
* voice recording;
* short video;
* other externally stored material.

For the MVP, an Artefact may simply contain a textual/Markdown representation or a link to a file stored in Google Drive.

An Artefact is immutable. If its content changes, a new Artefact is created.

### 2.3 Note

An Opportunity has zero or more independent Notes.

A Note is free-form context belonging to the Opportunity. It is not a lifecycle event.

Notes may contain observations, thoughts, reminders, lessons learned, or other information that does not justify a distinct event.

### 2.4 Event

An Event records a significant occurrence involving an Opportunity.

Events preserve historical context independently of the Opportunity's current state.

Events may be:

* lifecycle events;
* communications;
* interviews;
* assignments;
* document requests;
* document submissions;
* invitations;
* other significant interactions.

Not every piece of information must become an Event. In particular, ordinary Notes are not Events.

### 2.5 Current State

The Opportunity's current state answers:

> Where is this opportunity now?

The Event history answers:

> What happened?

Changing the current state MUST NOT erase historical events.

---

# 3. Lifecycle

The MVP uses a deliberately small finite state machine.

## 3.1 States

The default states are:

1. **Discovered**
2. **Submitted**
3. **In Progress**
4. **Offer**
5. **Closed**

`Closed` represents opportunities that will no longer receive active attention.

Closure may occur because of:

* cancellation;
* rejection;
* no response;
* poor fit;
* dead opportunity;
* user decision not to continue;
* other terminal circumstances.

The specific reason is recorded as contextual information/event data rather than requiring a separate lifecycle state.

### Offer

`Offer` is intentionally not immediately treated as a terminal state.

An offer may subsequently be:

* accepted;
* rejected by the user;
* withdrawn;
* otherwise concluded.

For the MVP, an accepted offer remains in the **Offer** column and receives a clear visual distinction in the UI.

---

## 3.2 Valid State Transitions

The lifecycle is:

```text
Discovered
   ├──→ Submitted
   └──→ Closed

Submitted
   ├──→ In Progress
   └──→ Closed

In Progress
   ├──→ In Progress
   ├──→ Offer
   └──→ Closed

Offer
   ├──→ Offer
   └──→ Closed
```

`In Progress → In Progress` is not normally a meaningful state transition and does not create a lifecycle event.

The important principle is that **almost all non-state-changing activity occurs while the Opportunity is In Progress**.

The system MUST prevent invalid lifecycle transitions.

---

# 4. User Workflow

## 4.1 Discover

The user searches external sources such as LinkedIn, Indeed, Glassdoor, Relocate.me, company websites, or other sources.

The user manually decides whether a job is interesting.

The user creates an Opportunity and records:

* company;
* position;
* location;
* source;
* source URL;
* job description/content;
* date added.

The Opportunity enters `Discovered`.

No automated job scraping or discovery is required.

---

## 4.2 Evaluate and Prepare

While the Opportunity is `Discovered`, the user may:

* evaluate personal fit;
* record a fit score;
* identify relevant skills;
* record why the opportunity is interesting;
* research the company;
* identify a suitable CV;
* prepare a cover letter;
* identify relevant professional evidence;
* add Notes;
* attach or create Artefacts;
* record useful links;
* optionally ask an AI system for advice outside the application's core workflow.

The system MUST allow this information to exist without requiring the Opportunity to advance to another state.

If the user decides not to continue, the Opportunity moves directly to `Closed`.

---

## 4.3 Submit

When the user decides to pursue the opportunity, they follow the source URL and submit the application externally.

The user records the successful submission.

The Opportunity changes:

```text
Discovered → Submitted
```

The system records a lifecycle event containing the submission information.

The submission may include:

* submission date/time;
* method;
* brief process note;
* submitted CV Artefact;
* submitted cover-letter Artefact, if applicable;
* relevant submitted Artefacts.

The MVP does not attempt to automate submission.

---

## 4.4 Progress

When the employer/recruiter responds positively or the process otherwise moves forward:

```text
Submitted → In Progress
```

An Opportunity may remain `In Progress` for an extended period.

During this period the user may record any significant activity, including:

* recruiter contact;
* interview invitation;
* interview;
* technical assignment;
* coding challenge;
* request for documents;
* request for diploma;
* request for university transcript;
* request for language certificate;
* request for additional information;
* submission of additional materials;
* follow-up;
* preparation;
* lessons learned.

These activities do not require new lifecycle states.

They are represented by Events and/or Artefacts attached to the Opportunity.

---

## 4.5 Offer

When an offer is received:

```text
In Progress → Offer
```

An Offer event records the occurrence and relevant information.

The Opportunity remains visible in the dedicated Offer column.

If the user accepts the offer, the Opportunity remains in the Offer column for the MVP but receives a distinct visual indication.

If the offer is rejected, withdrawn, or otherwise concluded without acceptance, the Opportunity may move to `Closed`.

---

## 4.6 Closure

An Opportunity may move to `Closed` from:

* `Discovered`;
* `Submitted`;
* `In Progress`;
* `Offer`.

The closure reason is recorded as contextual information and/or an Event.

Examples:

* not a good fit;
* nationality restriction;
* dead application link;
* rejected;
* no response;
* user cancelled;
* offer rejected;
* opportunity disappeared.

These reasons do not require separate lifecycle states in the MVP.

---

# 5. User Stories

## US-001 — Capture an Opportunity

**Priority: P1**

Given a job discovered externally, the user can create an Opportunity quickly and preserve the essential information needed to reconsider it later.

### Acceptance

The user can record:

* company;
* position;
* location;
* country;
* source;
* source URL;
* job description/content;
* date added.

The Opportunity appears in the `Discovered` Kanban column.

---

## US-002 — Evaluate an Opportunity

**Priority: P1**

The user can record fit assessment, research, Notes, relevant Artefacts, and preparation information without changing the lifecycle state.

---

## US-003 — Submit an Opportunity

**Priority: P1**

The user can record that an Opportunity was successfully submitted.

The system changes the state to `Submitted` and records the submission as historical information.

---

## US-004 — Manage an Active Opportunity

**Priority: P1**

The user can manage all significant activity around an Opportunity while it is `In Progress`.

The system must not require every possible activity to correspond to a dedicated domain entity.

---

## US-005 — Track an Offer

**Priority: P1**

The user can record an offer and see it separately from ordinary active Opportunities.

An accepted offer remains in the Offer column but receives a distinct visual indication.

---

## US-006 — Close an Opportunity

**Priority: P1**

The user can close an Opportunity from any appropriate non-terminal stage.

The system preserves its complete historical context.

---

## US-007 — Reuse Artefacts

**Priority: P1**

The user can create an immutable Artefact and associate it with multiple Opportunities.

Changing an Artefact means creating another Artefact.

Historical associations remain unchanged.

---

## US-008 — Restore Context

**Priority: P1**

Opening an Opportunity provides enough information to understand:

* the job;
* current state;
* relevant Artefacts;
* Notes;
* latest activity;
* upcoming events;
* outstanding actions;
* preparation;
* history.

---

# 6. Opportunity Information

An Opportunity SHOULD contain only information that is genuinely useful to the user's workflow.

### Core job information

* company name;
* position title;
* location;
* country;
* role family;
* source;
* source URL;
* date added;
* job description;
* fit score;
* notes.

The following are deliberately excluded from the MVP as structured Opportunity fields:

* company URL;
* workplace mode;
* employment type;
* salary;
* visa sponsorship;
* relocation information.

Such information can remain in the job description or Notes when useful.

---

# 7. Notes

Each Opportunity MAY contain zero or more Notes.

Notes are independent records.

A Note contains:

* immutable `id`;
* `opportunityId`;
* Markdown content;
* creation timestamp;
* modification timestamp.

Notes are not Events.

Notes may contain:

* observations;
* research conclusions;
* personal assessment;
* lessons learned;
* reminders;
* miscellaneous context.

The MVP does not require note categories or elaborate note management.

---

# 8. Artefacts

Artefacts are immutable.

An Artefact may represent:

* text;
* Markdown;
* document;
* presentation;
* image;
* audio;
* video;
* external resource.

For the MVP, the application does not need to process arbitrary file formats.

An Artefact may simply reference a file in Google Drive.

The MVP should support:

* title/name;
* type;
* description;
* textual/Markdown content where applicable;
* external file/link reference;
* creation timestamp;
* immutable `id`.

If an Artefact changes, a new Artefact is created.

No Artefact versioning is required.

---

# 9. Events

Events provide the historical record around an Opportunity.

A lifecycle transition creates an appropriate lifecycle Event.

Examples include:

* Opportunity created;
* Opportunity submitted;
* Opportunity moved to In Progress;
* offer received;
* Opportunity closed;
* interview scheduled;
* interview completed;
* assignment received;
* assignment submitted;
* additional document requested;
* additional document submitted;
* recruiter contacted user;
* user sent follow-up.

The event model MUST remain extensible.

The system MUST NOT require every possible type of employer interaction to have a dedicated schema in the MVP.

A significant event can carry:

* occurrence date/time;
* type;
* title;
* description;
* optional Artefact associations;
* optional external link;
* optional contact information;
* optional structured contextual data where justified.

---

# 10. Kanban

The Kanban is an operational overview.

Default columns:

* Discovered
* Submitted
* In Progress
* Offer
* Closed

Closed opportunities do not require separate visual columns for:

* Rejected;
* Cancelled;
* No Response;
* other closure reasons.

Those distinctions remain available in the Opportunity history/context.

The card SHOULD primarily show:

* position;
* company;
* country/location;
* next relevant event/action.

The card SHOULD remain visually compact.

Accepted Offers remain in the Offer column and receive a distinct visual indicator.

The exact visual treatment is a UI decision and may be deferred.

---

# 11. Opportunity Workspace

The Opportunity Workspace is the primary interaction surface.

It SHOULD provide:

* job information;
* current state;
* fit assessment;
* source;
* relevant Artefacts;
* Notes;
* recent and upcoming Events;
* outstanding preparation/actions;
* contacts;
* links;
* submission information;
* historical timeline.

The Workspace should minimize navigation between disconnected records.

---

# 12. Dashboard

The MVP dashboard is intentionally action-oriented.

It should behave more like a combination of:

> calendar + briefcase

than an analytics system.

It should focus on:

* newly discovered Opportunities;
* Opportunities awaiting a decision;
* Submitted Opportunities awaiting response;
* In Progress Opportunities;
* upcoming events;
* outstanding preparation/actions;
* overdue actions;
* Offers.

Closed Opportunities are not a primary dashboard concern.

Historical closed opportunities remain searchable and accessible for lessons learned.

Advanced analytics such as:

* conversion rates;
* average stage duration;
* country statistics;
* role-family statistics;
* historical rejection analysis;

are deferred unless real-world use demonstrates value.

---

# 13. Search and Filtering

The MVP should provide core search and filtering.

Core filters include:

* company;
* position;
* role family;
* country;
* lifecycle state;
* source.

Additional filters may be added when demonstrated useful.

The system should avoid building an elaborate search subsystem.

---

# 14. Multi-Device Access

The system MUST support desktop and mobile browser use.

The user should be able to:

* create an Opportunity;
* change state;
* add a Note;
* add an Event;
* add/associate an Artefact;
* complete a preparation action;
* inspect an Opportunity;
* view upcoming events.

Mobile interaction should minimize unnecessary navigation.

---

# 15. Offline Behavior

The MVP provides bounded read-only offline support.

Previously accessed critical Opportunity information may remain readable during temporary connectivity loss.

The MVP does not provide:

* offline mutation queues;
* offline synchronization;
* full offline document storage;
* automatic conflict resolution.

---

# 16. External Services

The MVP may use Google authentication and Google Drive.

Google-specific concepts MUST remain outside the core Opportunity domain.

The core model deals with:

* Artefacts;
* external references;
* storage capabilities.

It does not expose Google Drive IDs or concepts as domain requirements.

---

# 17. Explicit MVP Exclusions

The MVP MUST NOT include:

* automatic job scraping;
* LinkedIn integration;
* Gmail/Outlook synchronization;
* calendar synchronization;
* browser extensions;
* AI agents;
* automatic CV generation;
* automatic cover-letter generation;
* source-code storage;
* complex workflow engines;
* microservices;
* separate search infrastructure;
* generic CRM functionality;
* multi-tenancy;
* collaboration;
* RBAC;
* elaborate analytics.

Source code can remain in GitHub or another external system and be represented by a link Artefact where relevant.

---

# 18. Privacy and Ownership

The system contains sensitive professional information.

It MUST:

* authenticate the user;
* enforce ownership boundaries;
* use least-privilege external access;
* preserve data during failures;
* support export/backup;
* avoid silently destroying historical information.

Archiving is preferred over deletion.

Permanent deletion requires explicit confirmation.

---

# 19. Concurrency

Editable records use optimistic concurrency.

If the same record is changed from two devices:

1. the system detects the version conflict;
2. neither change is silently discarded;
3. the user can review the conflicting values;
4. the user explicitly chooses the resulting value.

---

# 20. Success Criteria

### SC-001

A newly discovered Opportunity can be captured in under two minutes.

### SC-002

The user can understand an active Opportunity's current state, latest activity, next action/event, and relevant Artefacts in under 30 seconds.

### SC-003

A successful submission retains the identity of the Artefacts used for submission.

### SC-004

The user can locate an Opportunity using core search/filtering within a few interactions.

### SC-005

Common mobile operations require no more than a few interactions from the relevant primary view.

### SC-006

Upcoming Events and outstanding actions are visible without inspecting closed Opportunities.

### SC-007

Export preserves structured Opportunity history and Artefact references and retrieves available external files where authorization permits.

### SC-008

Previously accessed critical information remains readable during temporary connectivity loss where practical.

# 21. Guiding Principle

The system should implement:

**Opportunity-centric, event-oriented context management with the smallest domain model that reliably supports the real job-search workflow.**

The product exists to simplify the job search.

It must not turn the job search into a complicated software system.