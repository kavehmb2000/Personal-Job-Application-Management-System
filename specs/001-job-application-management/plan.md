# Implementation Plan: Personal Job Application Management

## Overview

This plan implements the Personal Job Application Management System according to the current `spec.md` and `data-model.md`.

The implementation is organized around the simplified domain model:

- `Opportunity` is the primary aggregate root.
- `Artefact` is the second aggregate root.
- Lifecycle is a value/configuration concept.
- Significant Opportunity activity is represented through events.
- User actions and scheduled events are distinct from historical events.
- The MVP prioritizes operational usefulness over exhaustive modeling.

T001–T016 were completed before the current domain simplification and remain unchanged.

Tasks T017 onward supersede the previous implementation plan where they conflict with the current specification or data model.

---

## Phase 1 — Project Foundation

### T001 — Initialize project repository
**Status:** Complete

### T002 — Establish initial project specification
**Status:** Complete

### T003 — Configure TypeScript, ESLint, Prettier and import aliases
**Status:** Complete

### T004 — Add environment configuration and runtime validation
**Status:** Complete

### T005 — Configure Vitest and Playwright
**Status:** Complete

### T006 — Configure PWA foundation
**Status:** Complete

### T007 — Establish development tooling and formatting workflow
**Status:** Complete

### T008 — Configure Prisma and PostgreSQL development environment
**Status:** Complete

### T009 — Establish authentication foundation
**Status:** Complete

### T010 — Establish application shell and responsive layout
**Status:** Complete

### T011 — Establish persistence/infrastructure boundaries
**Status:** Complete

### T012 — Establish initial domain/API structure
**Status:** Complete

### T013 — Establish document-storage abstraction
**Status:** Complete

### T014 — Establish initial testing infrastructure
**Status:** Complete

### T015 — Establish initial application workspace foundation
**Status:** Complete

### T016 — Establish initial development slice and verification
**Status:** Complete

---

# Phase 2 — Simplified Opportunity Domain

## T017 — Replace Application domain with Opportunity

**Goal:** Establish Opportunity as the primary aggregate root and remove terminological ambiguity between an opportunity and an actual submitted application.

### Scope

- Introduce `Opportunity` as the canonical domain concept.
- Rename/refactor existing Application references where appropriate.
- Implement:
    - identity;
    - owner;
    - company;
    - position;
    - URL;
    - location;
    - country;
    - source;
    - role family;
    - fit score;
    - priority;
    - notes collection;
    - next action;
    - lifecycle state.
- Preserve archive and optimistic-concurrency behavior.
- Remove MVP fields explicitly rejected by the current specification:
    - company URL;
    - workplace mode;
    - employment type;
    - salary;
    - visa/sponsorship;
    - relocation.

### Acceptance

- An Opportunity can be created before submission.
- Notes are represented as a collection.
- An Opportunity can be archived and restored.
- Concurrent edits are version protected.
- No Application terminology remains in the core Opportunity API/domain.

---

## T018 — Implement Opportunity lifecycle state machine

**Goal:** Make the lifecycle an explicit, deterministic finite-state machine.

### States

- `Discovered`
- `Submitted`
- `InProgress`
- `Offer`
- `Closed`
- `Cancelled`
- `Rejected`

### Allowed transitions

```text
Discovered
    ├──> Submitted
    ├──> Closed
    └──> Cancelled

Submitted
    ├──> InProgress
    ├──> Closed
    ├──> Cancelled
    └──> Rejected

InProgress
    ├──> Offer
    ├──> Closed
    ├──> Cancelled
    └──> Rejected

Offer
    ├──> Closed
    ├──> Cancelled
    └──> Rejected
```

There is:

- no `InProgress -> InProgress` lifecycle transition;
- no `Offer -> InProgress` transition;
- no outgoing transition from terminal states.

An Opportunity may remain `InProgress` while any number of non-state-changing events occur.

### Acceptance

A complete transition-matrix test demonstrates that every valid transition succeeds and every invalid transition fails.

---

## T019 — Implement Opportunity state-change events

**Goal:** Preserve lifecycle history without turning the timeline into a CRUD audit log.

### Scope

Implement domain events for significant lifecycle transitions:

- Opportunity created;
- Opportunity submitted;
- Opportunity entered In Progress;
- Offer received;
- Opportunity closed;
- Opportunity cancelled;
- Opportunity rejected.

State changes and their corresponding events must be persisted consistently.

### Acceptance

- A successful state transition creates the corresponding event.
- A failed transition creates neither state change nor event.
- Events remain immutable.
- Historical events survive later Opportunity edits.

---

## T020 — Implement non-state-changing Opportunity events

**Goal:** Record meaningful recruitment activity even when lifecycle state does not change.

### Examples

- interview scheduled;
- interview completed;
- additional documents requested;
- transcript requested;
- diploma/certificate requested;
- language-proficiency proof requested;
- challenge received;
- challenge submitted;
- significant communication;
- other custom recruitment events.

### Scope

- Implement a small extensible event model.
- Permit multiple events while Opportunity remains in the same lifecycle state.
- Allow event descriptions and attached Artefacts.
- Do not automatically create events for ordinary CRUD changes.
- Do not treat note creation/editing as an event.

### Acceptance

An Opportunity in `InProgress` can accumulate multiple significant events without changing lifecycle state.

---

# Phase 3 — Artefact Domain

## T021 — Implement Artefact aggregate

**Goal:** Replace the previous versioned DocumentAsset model with a simpler immutable Artefact concept.

### Scope

Artefact supports:

- immutable ID;
- owner;
- name;
- type;
- description;
- optional Markdown/text content;
- optional external URL;
- optional provider-neutral storage reference;
- MIME type;
- archive state.

Artefacts may represent:

- CVs;
- cover letters;
- job descriptions;
- company research;
- presentations;
- portfolio evidence;
- transcripts;
- certificates;
- audio;
- video;
- other professional material.

### Rules

- Artefacts are immutable in substantive content.
- There is no Artefact versioning in the MVP.
- If content changes materially, create another Artefact.
- Google Drive identifiers remain outside the domain.

### Acceptance

An Artefact can exist independently of an Opportunity and remains identifiable through its immutable ID.

---

## T022 — Implement Opportunity–Artefact associations

**Goal:** Allow Artefacts to provide context to Opportunities without introducing unnecessary domain events.

### Scope

- Associate multiple Artefacts with an Opportunity.
- Allow one Artefact to be reused across multiple Opportunities.
- Keep association metadata minimal.
- Association/removal does not automatically create timeline events.

### Acceptance

The same CV, research document, or evidence Artefact can be associated with multiple Opportunities without duplication.

---

## T023 — Implement Submission

**Goal:** Represent the actual act of applying without recreating the old Application/Submission complexity.

### Scope

An Opportunity has zero or one Submission.

Submission records:

- submitted date/time;
- method;
- notes;
- submitted CV Artefact;
- optional cover-letter Artefact.

Creating a Submission must move:

```text
Discovered -> Submitted
```

A second Submission for the same Opportunity is forbidden.

Reapplication creates another Opportunity.

### Acceptance

A submitted Opportunity retains the exact Artefact identities used for submission.

---

# Phase 4 — Operational Context

## T024 — Implement Opportunity actions

**Goal:** Distinguish things the user needs to do from things that happened.

### Scope

Support lightweight actions such as:

- prepare interview;
- send requested transcript;
- complete challenge;
- review company research;
- prepare presentation.

Actions support:

- title;
- description;
- status;
- priority;
- due date;
- completion date;
- optimistic concurrency.

### Acceptance

An Opportunity can have multiple outstanding actions independently of lifecycle state.

---

## T025 — Implement scheduled events

**Goal:** Represent future events separately from historical events and actions.

### Scope

Support scheduled items such as:

- interviews;
- recruiter calls;
- presentations;
- challenge deadlines;
- follow-ups.

Where applicable, retain:

- date/time;
- time zone;
- type;
- platform;
- meeting URL;
- related contacts;
- notes.

### Acceptance

The workspace can distinguish:

- what happened;
- what is scheduled;
- what I need to do.

---

## T026 — Implement lightweight communications and contacts

**Goal:** Capture useful communication context without creating a CRM.

### Scope

Communications:

- date/time;
- direction;
- sender;
- recipient;
- subject;
- body/notes;
- optional Artefact associations.

Contacts:

- name;
- role;
- organization;
- useful contact details.

No automatic Gmail/Outlook synchronization.

### Acceptance

The user can manually record meaningful communication and associate it with an Opportunity.

---

# Phase 5 — Workspace and Kanban

## T027 — Rebuild Opportunity Workspace

**Goal:** Make the Opportunity Workspace the primary context surface.

### Workspace must expose

- job information;
- lifecycle state;
- next scheduled event;
- outstanding actions;
- Artefacts;
- timeline;
- notes;
- communications;
- contacts;
- preparation information.

### Acceptance

A user can reconstruct the Opportunity context without navigating through separate database-oriented screens.

---

## T028 — Rebuild Kanban around the simplified lifecycle

**Goal:** Provide the concise operational overview defined by the constitution.

### Columns

- Discovered
- Submitted
- In Progress
- Offer
- Closed / Terminal

The terminal column visually groups:

- Closed;
- Cancelled;
- Rejected.

The underlying lifecycle state remains distinct.

### Cards

Cards primarily display:

- position;
- company;
- location/country;
- next scheduled event.

### Offer

Accepted Offers remain in the Offer column.

The UI provides a visual distinction for an accepted Offer, such as a badge or star.

### Acceptance

The Kanban remains understandable with approximately 30 active Opportunities without becoming a database dump.

---

## T029 — Implement core Opportunity search and filtering

**Goal:** Provide only the filters needed for practical MVP use.

### Core filters

- company;
- position;
- role family;
- country/location;
- lifecycle state;
- source.

Additional filtering remains deferred until real-world usage demonstrates a need.

### Acceptance

The user can rapidly locate an Opportunity among a realistic collection of records.

---

# Phase 6 — Operational Dashboard

## T030 — Implement actionable dashboard

**Goal:** Treat the dashboard as a calendar + briefcase rather than an analytics report.

### Primary information

- Opportunities requiring a decision;
- Submitted Opportunities awaiting response;
- In Progress Opportunities;
- upcoming scheduled events;
- overdue actions;
- Offers.

Closed, Cancelled, and Rejected Opportunities are excluded from the primary dashboard unless explicitly requested.

### Acceptance

Opening the dashboard immediately communicates:

> What do I need to decide?

and:

> What do I need to prepare or attend?

---

# Phase 7 — Storage and Export

## T031 — Implement Artefact storage boundary

**Goal:** Connect Artefacts to external storage without coupling the domain to Google Drive.

### Scope

- provider-neutral storage interface;
- Google Drive implementation;
- external references;
- metadata retrieval;
- least-privilege access.

### Acceptance

The domain remains independent of Google Drive concepts.

---

## T032 — Implement portable export

**Goal:** Preserve practical ownership and recoverability of job-search data.

### Export includes

- structured Opportunity data;
- lifecycle history;
- events;
- actions;
- scheduled events;
- Artefact metadata;
- provider references;
- every retrievable authorized binary.

Unavailable binaries must remain represented in the manifest with their reason for unavailability.

---

# Phase 8 — Reliability and Offline Read Access

## T033 — Implement optimistic concurrency and conflict resolution

**Goal:** Protect multi-device use without implementing offline synchronization.

### Scope

- version checking;
- conflict detection;
- current-value retrieval;
- user-visible resolution;
- no silent overwrites.

### Acceptance

Two conflicting updates are never silently merged or overwritten.

---

## T034 — Implement bounded read-only offline support

**Goal:** Preserve access to recently useful information during temporary connectivity loss.

### Scope

- previously accessed critical Opportunity information;
- bounded recent Artefact/document access;
- explicit stale-data indication.

### Excluded

- offline mutations;
- mutation queues;
- synchronization engine;
- full offline document library.

---

# Phase 9 — Testing and MVP Hardening

## T035 — Domain invariant and FSM test suite

Test:

- Opportunity creation;
- lifecycle transition matrix;
- terminal-state behavior;
- Offer behavior;
- Submission uniqueness;
- event generation;
- invalid transitions;
- optimistic concurrency.

This is the highest-value domain test suite.

---

## T036 — Artefact and association tests

Test:

- immutable Artefacts;
- Artefact identity;
- reuse across Opportunities;
- Opportunity–Artefact associations;
- storage-reference behavior;
- archive/restore.

---

## T037 — Opportunity Workspace and Kanban integration tests

Test:

- card projection;
- lifecycle columns;
- terminal grouping;
- Offer presentation;
- next-event projection;
- workspace context.

---

## T038 — End-to-end MVP workflow

Verify the complete real-world workflow:

```text
Discover opportunity
        |
        v
Create Opportunity
        |
        v
Review / research / prepare
        |
        v
Submit
        |
        v
In Progress
        |
        v
Events / actions / interviews / requests
        |
        v
Offer
        |
        v
Closed / Cancelled / Rejected
```

Also verify the alternate path:

```text
Discovered
    |
    v
Closed / Cancelled
```

and the reapplication rule:

```text
Previous Opportunity
    |
    v
Terminal

New Opportunity
    |
    v
New lifecycle
```

---

## T039 — Mobile workflow verification

Verify the primary mobile actions:

- create Opportunity;
- view Opportunity;
- change lifecycle state;
- add event;
- add note;
- add action;
- complete action;
- view Artefact;
- view upcoming event.

---

## T040 — MVP usability and cleanup pass

Use the running system with real job-search data.

Prioritize fixes based on actual usage rather than speculative features.

Explicitly defer features that do not demonstrate sufficient MVP value.

---

# Deferred Beyond MVP

The following remain explicitly outside the MVP unless real-world usage changes their priority:

- calendar synchronization;
- LinkedIn integration;
- automatic job discovery/scraping;
- browser extensions;
- Gmail/Outlook synchronization;
- AI agents;
- AI-generated CVs or cover letters;
- automatic requirement extraction;
- automatic interview detection;
- workflow engines;
- microservices;
- dedicated search infrastructure;
- sophisticated CRM functionality;
- full offline synchronization;
- multi-user collaboration;
- multi-tenancy;
- RBAC;
- billing;
- extensive analytics;
- elaborate lifecycle automation.

---

# Implementation Order

The recommended implementation sequence is:

1. T017 — Opportunity
2. T018 — Lifecycle FSM
3. T019 — State-change events
4. T020 — Non-state-changing events
5. T021 — Artefact
6. T022 — Artefact associations
7. T023 — Submission
8. T024 — Actions
9. T025 — Scheduled events
10. T026 — Communications and contacts
11. T027 — Workspace
12. T028 — Kanban
13. T029 — Search/filtering
14. T030 — Dashboard
15. T031 — Storage
16. T032 — Export
17. T033 — Concurrency
18. T034 — Offline read support
19. T035–T040 — Testing, integration and hardening

The implementation should remain vertical where practical: each completed slice should leave the system buildable, testable, and usable.

---

# MVP Completion Criterion

The MVP is considered operationally complete when the user can:

1. capture a job opportunity;
2. review and research it;
3. associate relevant Artefacts;
4. decide whether to pursue it;
5. submit it;
6. track it through In Progress;
7. record recruitment events and requests;
8. maintain actions and scheduled events;
9. receive and track an Offer;
10. close, cancel, or record rejection;
11. recover the complete context from the Opportunity Workspace;
12. use the Kanban and dashboard to determine what requires attention;
13. perform the core workflow from both desktop and mobile;
14. export the accumulated information;
15. trust that concurrent edits and historical information are not silently lost.

The guiding principle remains:

> **Build the smallest system that makes the real job search easier.**
