# Data Model: Personal Job Application Management

## 1. Modeling Principles

The domain is **Opportunity-centric and event-oriented**.

An `Opportunity` represents one job opportunity discovered by the user and all relevant context accumulated around it.

An `Artefact` represents an immutable piece of professional or opportunity-related information that may be associated with one or more Opportunities.

The model distinguishes:

1. Current lifecycle state — where the Opportunity is now.
2. Domain events — significant things that happened.
3. User actions — things the user needs to do.
4. Scheduled events — things expected to happen at a particular time.
5. Artefacts — persistent information or files associated with an Opportunity.

Not every change to an Opportunity is a domain event, and not every domain event changes lifecycle state.

The MVP has two primary aggregate roots:

- `Opportunity`
- `Artefact`

Lifecycle configuration, notes, actions, scheduled events, and other supporting concepts do not become independent aggregates merely because they have persistence requirements.

---

## 2. Identity and Ownership

The MVP has one authenticated user.

Core records retain an explicit `ownerId` boundary so authorization does not become implicitly coupled to authentication infrastructure.

The MVP does not implement multi-tenancy, organizations, collaboration, RBAC, billing, or user administration.

Persistent records have an immutable `id`. Independently editable records maintain `createdAt`, `updatedAt`, and an optimistic-concurrency `version` where required.

Archived records use `archivedAt`.

---

## 3. Opportunity Aggregate

### 3.1 Opportunity

`Opportunity` is the primary aggregate root.

It represents one job opportunity from discovery through submission and subsequent recruitment activity.

An Opportunity may exist entirely in the discovery phase and does not require a submission.

A reapplication or distinct later attempt is represented by a new Opportunity.

### Core fields

| Field | Rules |
|---|---|
| `id` | Immutable unique identifier |
| `ownerId` | Owner boundary |
| `version` | Optimistic concurrency version |
| `createdAt` | Date/time the Opportunity was added to the system |
| `updatedAt` | Last modification time |
| `archivedAt` | Optional archive timestamp |
| `companyName` | Required |
| `positionTitle` | Required |
| `jobUrl` | Optional |
| `location` | Optional |
| `country` | Optional |
| `source` | Optional source such as LinkedIn, Indeed, Glassdoor, referral, etc. |
| `roleFamily` | Optional classification |
| `fitScore` | Optional score |
| `priority` | Optional |
| `status` | Required current lifecycle state |
| `nextAction` | Optional user action requiring attention |
| `nextActionDueAt` | Optional due date |

### Notes

Notes are a **collection**, not a single notes field.

An Opportunity may therefore have zero or more notes, each independently editable.

### Deliberately omitted MVP fields

The following are not first-class Opportunity fields in the MVP:

- company URL;
- workplace mode;
- employment type;
- salary;
- visa/sponsorship information;
- relocation information.

If relevant, such information may remain in the captured job description, company research, notes, or other Artefacts.

---

## 4. Opportunity Lifecycle

Lifecycle is a **value/configuration concept**, not an aggregate.

The default lifecycle states are:

- `Discovered`
- `Submitted`
- `In Progress`
- `Offer`
- `Closed`
- `Cancelled`
- `Rejected`

### 4.1 State machine

```text
Discovered
    ├──► Submitted
    └──► Closed / Cancelled

Submitted
    ├──► In Progress
    └──► Closed / Cancelled / Rejected

In Progress
    ├──► Offer
    └──► Closed / Cancelled / Rejected

Offer
    └──► Closed / Cancelled / Rejected
```

There is:

- no `In Progress → In Progress` lifecycle transition;
- no `Offer → In Progress` transition;
- no outgoing transition from terminal states.

An Opportunity may remain `In Progress` while any number of non-state-changing events occur.

### 4.2 Lifecycle transition rules

| From | Allowed transition |
|---|---|
| Discovered | Submitted |
| Discovered | Closed |
| Discovered | Cancelled |
| Submitted | In Progress |
| Submitted | Closed |
| Submitted | Cancelled |
| Submitted | Rejected |
| In Progress | Offer |
| In Progress | Closed |
| In Progress | Cancelled |
| In Progress | Rejected |
| Offer | Closed |
| Offer | Cancelled |
| Offer | Rejected |

`Closed`, `Cancelled`, and `Rejected` are terminal states.

The UI may combine those three states into a single **Closed / Terminal** Kanban column while retaining their distinct semantic states.

`Offer` remains a dedicated Kanban column.

An accepted offer remains in `Offer`. Acceptance is an internal outcome/marker and is not a separate lifecycle state in the MVP.

---

## 5. Lifecycle Configuration

Lifecycle configuration contains the semantic identity, label, and ordering of lifecycle states.

The user may customize labels and ordering where supported, but the system must retain enough semantic identity to validate transitions and interpret historical data.

Lifecycle configuration is not an aggregate.

---

## 6. Opportunity Events

An Opportunity maintains a chronological history of significant events.

### 6.1 State-changing events

State-changing operations produce corresponding historical events, for example:

- Opportunity created
- Opportunity submitted
- Opportunity entered In Progress
- Offer received
- Opportunity closed
- Opportunity cancelled
- Opportunity rejected

The event records the fact that the lifecycle transition occurred.

### 6.2 Non-state-changing events

A significant event may occur without changing the Opportunity's lifecycle state.

Examples include:

- interview scheduled;
- interview completed;
- additional documents requested;
- university transcript requested;
- language proficiency proof requested;
- diploma/certificate requested;
- technical challenge received;
- technical challenge submitted;
- communication received;
- communication sent;
- other significant recruitment interaction.

For example:

> Employer requested university transcript.

The Opportunity may remain `In Progress`; the request is nevertheless valuable historical information and may create a corresponding user action.

### 6.3 What is not automatically an event

The following are not automatically timeline events:

- editing an ordinary Opportunity field;
- editing a note;
- creating or completing an ordinary user action;
- associating an Artefact with an Opportunity;
- removing an Artefact association;
- other insignificant administrative changes.

The timeline is intended to preserve meaningful history, not to become a CRUD audit log.

### 6.4 OpportunityEvent

`OpportunityEvent` belongs to the Opportunity aggregate.

| Field | Rules |
|---|---|
| `id` | Immutable |
| `opportunityId` | Required |
| `occurredAt` | Required |
| `type` | Required event type |
| `title` | Required |
| `description` | Optional Markdown/text |
| `createdAt` | Required |
| `systemGenerated` | Indicates whether generated by a domain operation |

An event may reference relevant Artefacts and other contextual records.

The MVP should keep the event-type catalogue small and extensible rather than attempting to enumerate every possible recruitment interaction.

---

## 7. Submission

A `Submission` represents the formal act of applying for an Opportunity.

An Opportunity has **zero or one Submission**.

A Submission is created when the Opportunity successfully moves from `Discovered` to `Submitted`.

### Fields

| Field | Rules |
|---|---|
| `id` | Immutable |
| `opportunityId` | Unique; maximum one Submission |
| `submittedAt` | Required |
| `method` | Optional free-form text |
| `notes` | Optional |
| `cvArtefactId` | Optional/required according to the submission context |
| `coverLetterArtefactId` | Optional |

The Artefacts used for submission must remain identifiable even if other Artefacts are subsequently created.

A later reapplication creates a new Opportunity rather than another Submission.

---

## 8. Artefact Aggregate

`Artefact` is an **aggregate root**, not a value object.

It has independent identity because it:

- can exist independently of an Opportunity;
- can be reused across Opportunities;
- may be a large external resource;
- must remain independently addressable;
- may outlive an individual Opportunity.

An Artefact is immutable with respect to its substantive content.

If its content changes materially, a new Artefact is created.

### Core fields

| Field | Rules |
|---|---|
| `id` | Immutable identity |
| `ownerId` | Owner boundary |
| `createdAt` | Creation timestamp |
| `name` | Required |
| `type` | Required |
| `description` | Optional |
| `content` | Optional text/Markdown content |
| `externalUrl` | Optional |
| `storageReference` | Optional provider-neutral reference |
| `mimeType` | Optional |
| `archivedAt` | Optional |

An Artefact must have at least one meaningful representation:

- textual content;
- external URL;
- storage reference.

### 8.1 Artefact types

The MVP does not require an exhaustive taxonomy.

Possible types include:

- CV
- Cover Letter
- Job Description
- Company Research
- Presentation
- Portfolio Evidence
- Transcript
- Certificate
- Audio
- Video
- Other

The type is primarily used for organization, display, and filtering.

---

## 9. Artefact Storage

The MVP does not need to store arbitrary binaries directly.

An Artefact may reference a file stored in Google Drive.

Examples include:

- PDF CV;
- interview recording;
- short video;
- presentation;
- scanned certificate.

The domain uses provider-neutral storage references.

Google Drive identifiers, scopes, and other provider-specific concepts remain outside the core domain.

---

## 10. Opportunity–Artefact Association

An Artefact may be associated with one or more Opportunities.

The association is **not automatically a domain event**.

It exists to answer questions such as:

- Which job description belongs to this Opportunity?
- Which CV was considered?
- Which company research was prepared?
- Which presentation was prepared?
- Which transcript was requested?
- Which evidence is relevant?

The association should remain minimal in the MVP.

No Artefact versioning is required.

---

## 11. User Actions

A user action represents something the user needs to do.

Examples:

- prepare interview examples;
- send transcript;
- complete coding challenge;
- review company research;
- send requested document.

Actions are distinct from lifecycle states and historical events.

An action may contain:

- `id`;
- `opportunityId`;
- title;
- description;
- status;
- priority;
- due date;
- completed date;
- version.

The MVP does not require a general-purpose task-management subsystem.

---

## 12. Scheduled Events

A scheduled event represents something expected to happen at a particular time.

Examples:

- interview;
- recruiter call;
- presentation;
- challenge deadline;
- follow-up date.

A scheduled event is distinct from:

- a historical domain event;
- a user action;
- the Opportunity lifecycle state.

For example:

```text
Scheduled event:
Interview — 25 August, 14:00

User action:
Prepare system-design examples

Historical event:
Interview scheduled
```

The Opportunity workspace may present these together while preserving their semantic distinction.

---

## 13. Communications

Communications are deliberately lightweight in the MVP.

A communication may contain:

- date/time;
- direction;
- sender;
- recipient;
- subject;
- body/notes;
- optional associated Artefacts.

Communications are manually entered.

The MVP does not automatically synchronize Gmail or Outlook.

A significant communication may also create an OpportunityEvent when useful, but communication storage and event history remain conceptually distinct.

---

## 14. Contacts

Contacts provide lightweight contextual information for people related to an Opportunity.

Examples:

- recruiter;
- hiring manager;
- interviewer;
- referral;
- HR contact.

The MVP does not attempt to become a general-purpose CRM.

---

## 15. Derived Views

The following are read models/projections rather than aggregate roots.

### 15.1 Kanban

The Kanban communicates the current operational state of Opportunities.

A card primarily shows:

- position;
- company;
- country/location;
- next scheduled event.

The current lifecycle state is represented by the column.

Terminal states may be visually grouped into `Closed / Terminal`.

`Offer` remains a dedicated column.

An accepted Offer remains in the Offer column and receives a visual distinction such as a badge/star.

### 15.2 Opportunity Workspace

The workspace is the primary context surface.

It provides access to:

- job information;
- current lifecycle state;
- next scheduled event;
- next actions;
- Artefacts;
- timeline;
- notes;
- communications;
- contacts;
- preparation;
- relevant links.

### 15.3 Operational Dashboard

The dashboard focuses on actionable Opportunities rather than historical dead ends.

It should primarily surface:

- Discovered Opportunities requiring a decision;
- Submitted Opportunities awaiting response;
- In Progress Opportunities;
- upcoming scheduled events;
- overdue actions;
- Offers.

Closed, Cancelled, and Rejected Opportunities remain searchable and historically accessible but are not primary dashboard concerns.

---

## 16. Search and Filtering

The MVP supports core search and filtering needed for daily operation.

Core filters should include at least:

- company;
- position;
- role family;
- country/location;
- lifecycle state;
- source.

Additional filters may be introduced later based on real-world use.

The data model should not force every potentially useful attribute into the initial UI.

---

## 17. Concurrency

Independently editable aggregate roots use optimistic concurrency.

An update must supply the version observed by the client.

If the stored version has changed:

1. the update is rejected;
2. the current record is returned;
3. the user's draft remains available;
4. the user explicitly resolves the conflict.

The system must never silently overwrite another device's changes.

---

## 18. Archiving and Deletion

Archiving removes an Opportunity or Artefact from normal operational views without destroying its history.

Restoration is possible while the record remains retained.

Permanent deletion requires explicit confirmation.

The system must identify relevant historical relationships and explain consequences before destructive deletion.

---

## 19. Storage Boundary

Storage is provider-independent at the domain level.

The storage infrastructure is responsible for:

- authorization;
- provider-specific identifiers;
- metadata retrieval;
- file retrieval;
- export.

Google Drive is the initial implementation.

Google Drive concepts must not leak into the Opportunity or Artefact domain model.

---

## 20. Core Domain Invariants

1. Every Opportunity has exactly one current lifecycle state.
2. Every Opportunity starts in `Discovered`.
3. An Opportunity may have at most one Submission.
4. A Submission exists only after a successful application submission.
5. Reapplication creates a new Opportunity.
6. Lifecycle transitions must follow the defined state machine.
7. `Closed`, `Cancelled`, and `Rejected` are terminal.
8. Terminal states have no outgoing transitions.
9. `Offer → In Progress` is invalid.
10. `In Progress → In Progress` is not a lifecycle transition.
11. Non-state-changing events may occur while an Opportunity remains in the same lifecycle state.
12. State-changing operations produce corresponding historical events.
13. Significant non-state-changing interactions may produce historical events.
14. Notes are not automatically timeline events.
15. Artefacts have independent immutable identity.
16. A substantive Artefact change creates a new Artefact.
17. Artefact association does not itself constitute a domain event.
18. Accepted Offers remain in the `Offer` lifecycle state.
19. Terminal Opportunities remain available for historical search and review.
20. The operational dashboard prioritizes actionable/non-terminal Opportunities.
21. External storage identifiers remain outside the core domain.
22. Concurrent edits must never silently overwrite one another.
