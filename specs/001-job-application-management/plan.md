# Implementation Plan: Personal Job Application Management

## 1. Overview

This plan defines the implementation roadmap for the Personal Job Application Management MVP.

The system is a single-user, responsive web application for managing job Opportunities from discovery through submission, activity, offer, and terminal outcomes. The implementation uses an Opportunity-centric domain model and deliberately separates lifecycle state, historical events, notes, user actions, scheduled events, communications, contacts, and reusable Artefacts.

The implementation is organized into thirteen phases. Phases 1–8 establish the foundation, domain, operational context, and API surface. Phase 9 provides the primary operational UI. Phases 10–12 complete storage, recovery, responsive/mobile, and bounded offline capabilities. Phase 13 provides final integration and hardening.

The executable task list is maintained in `tasks.md`. This document provides the higher-level architectural and delivery plan and should remain consistent with `tasks.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, the OpenAPI contract, and the active Prisma schema.

---

## 2. Architecture

### 2.1 Application Architecture

The MVP is implemented as a modular monolith:

* Next.js App Router
* React
* TypeScript
* PostgreSQL
* Prisma
* Auth.js with Google OIDC
* Google Drive as the initial external storage provider
* provider-neutral `StorageProvider` abstraction
* responsive PWA
* bounded read-only offline support

The application is not decomposed into microservices. Domain services and repositories provide separation of concerns while keeping deployment and development straightforward.

### 2.2 Domain Architecture

`Opportunity` is the central domain concept.

An Opportunity represents a job opportunity throughout its lifecycle and replaces the former Application-centric aggregate.

The Opportunity context includes:

* Opportunity
* OpportunityNote
* OpportunityEvent
* Submission
* Artefact associations
* UserAction
* ScheduledEvent
* Contact
* Communication

Kanban, Workspace, search, and dashboard are derived projections/read models rather than additional aggregate roots.

### 2.3 Ownership

Every persisted record that requires authorization is owner-scoped.

`OwnerAccount` represents the permitted principal. Google OIDC establishes identity; current-owner resolution establishes authorization.

The explicit `ownerId` boundary is required even though the MVP has only one permitted owner. It provides a clean authorization boundary and leaves room for future SaaS evolution without prematurely implementing multi-tenancy.

### 2.4 Storage

Storage is provider-neutral at the domain boundary.

`StorageProvider` isolates:

* provider authorization
* provider identifiers
* metadata retrieval
* content retrieval
* export retrieval
* provider failures

Google Drive is the initial provider. Google-specific concepts must not leak into Opportunity or Artefact domain logic.

### 2.5 Concurrency

Independently editable aggregate roots use optimistic concurrency.

Updates operate against the version observed by the client. A stale version produces a conflict rather than silently overwriting newer data.

---

# 3. Phase Roadmap

## Phase 1 — Setup / Shared Infrastructure

**Purpose:** Scaffold the Next.js application and establish common developer tooling.

This phase establishes:

* Next.js App Router application structure
* TypeScript configuration
* ESLint and Prettier
* environment configuration
* Vitest
* Playwright
* PWA manifest and service-worker foundation
* application/component/library/test directory structure

**Tasks:** T001–T006

**Status:** Complete.

**Outcome:** The repository has the shared application and development infrastructure required by subsequent phases.

---

## Phase 2 — Foundational / Blocking Prerequisites

**Purpose:** Establish persistence, authentication, authorization, validation, concurrency, storage boundaries, and the authenticated application shell.

This phase establishes:

* Prisma foundation and ownership records
* lifecycle status infrastructure
* audit events
* Google OIDC authentication
* configured-owner admission
* current-owner resolution
* repository owner scoping
* Zod validation
* domain errors and HTTP error mapping
* provider-neutral storage interfaces
* optimistic concurrency
* authenticated route protection
* responsive application shell
* shared UI primitives
* connection/offline indicator
* foundational tests

**Tasks:** T007–T016

**Status:** Complete.

**Checkpoint:** An authenticated configured owner can reach the protected application shell, unauthorized access is denied, and repositories can consistently enforce owner scope.

---

## Phase 3 — Canonical Opportunity Domain and Persistence

**Purpose:** Establish the revised Opportunity-centric Prisma model and canonical lifecycle configuration.

This phase reconciles the database model with the revised domain design.

It establishes:

* Opportunity
* OpportunityNote
* OpportunityEvent
* LifecycleStatus
* LifecycleTransition
* RoleFamily
* Submission relationships
* supporting contextual models
* canonical Opportunity fields
* seven lifecycle states
* fourteen valid lifecycle transitions
* archive/restore behavior
* versioning
* zero-or-one Submission invariant
* removal of obsolete Application-centric concepts

The phase explicitly avoids inventing domain concepts that are not supported by the specification. For example, `Submission.method` remains a nullable string rather than becoming an enum.

**Tasks:** T017–T025

**Status:** Complete.

**Checkpoint:** Prisma schema, migration, and seed data represent the canonical Opportunity-centric model.

---

## Phase 4 — Opportunity Aggregate and Lifecycle

**Purpose:** Implement the core Opportunity aggregate, lifecycle state machine, notes, and historical events.

This phase implements:

* owner-scoped Opportunity persistence
* Opportunity CRUD
* archive and restore
* optimistic concurrency
* lifecycle transitions
* persisted transition rules
* atomic lifecycle transition plus historical event creation
* significant non-state-changing OpportunityEvents
* OpportunityNotes

The lifecycle implementation uses the persisted fourteen-transition graph.

Important invariants include:

* `In Progress → In Progress` is not a lifecycle transition
* `Offer → In Progress` is invalid
* `Closed`, `Cancelled`, and `Rejected` are terminal
* terminal states have no outgoing transitions
* state-changing transitions create corresponding historical events
* ordinary edits and note edits do not automatically become historical events

**Tasks:** T026–T036

**Status:** Complete.

**Checkpoint:** Opportunities follow the canonical lifecycle FSM while historical events remain distinct from notes and ordinary CRUD changes.

---

## Phase 5 — Submission and Artefact Domain

**Purpose:** Implement formal Submission and reusable Artefact domain behavior.

This phase establishes:

* Artefact repository/service
* reusable Artefact identity
* Artefact associations
* archive/restore
* Submission repository/service
* zero-or-one Submission per Opportunity
* transactional Submission creation
* Submission-to-Artefact references
* reapplication through a new Opportunity

Artefacts may represent:

* CVs
* cover letters
* job descriptions
* company research
* presentations
* portfolio evidence
* transcripts
* certificates
* audio
* video
* other reusable material

Artefact associations do not automatically create domain events.

**Tasks:** T037–T046

**Status:** Complete.

**Checkpoint:** Artefacts are reusable domain records and each Opportunity can have zero or one formal Submission.

---

## Phase 6 — Operational Context

**Purpose:** Implement the contextual records surrounding an Opportunity without creating competing lifecycle models.

This phase establishes:

* UserAction
* ScheduledEvent
* Contact
* OpportunityContact
* Communication
* CommunicationArtefact
* ScheduledEventContact
* their repositories and services
* cross-owner association validation

The concepts remain deliberately distinct:

* `OpportunityEvent` records historical activity.
* `OpportunityNote` records contextual notes.
* `UserAction` represents work the user needs to perform.
* `ScheduledEvent` represents something expected at a particular time.
* `Communication` represents manually recorded communication.
* `Contact` provides lightweight person/context information.

The MVP does not become a general-purpose CRM.

**Tasks:** T047–T058

**Status:** Complete.

**Checkpoint:** Operational context remains semantically separated from lifecycle state and historical event records.

---

## Phase 7 — Opportunity Context and Service Composition

**Purpose:** Provide a coherent Opportunity Workspace read model.

This phase composes:

* Opportunity information
* current lifecycle state
* next action
* next scheduled event
* notes
* historical events
* Submission
* Artefacts
* UserActions
* ScheduledEvents
* Contacts
* Communications

The composed context is exposed through service-level DTOs/read models so Prisma implementation details do not leak into API or UI components.

`nextAction` and `nextActionDueAt` remain explicit Opportunity-level information. They do not replace the richer UserAction model.

**Tasks:** T059–T066

**Status:** Complete.

**Checkpoint:** The Opportunity Workspace has one coherent context surface while preserving the semantic distinctions of the domain.

---

## Phase 8 — API Contracts and HTTP Surface

**Purpose:** Expose the Opportunity-centric domain through validated, owner-scoped, concurrency-aware HTTP operations.

This phase establishes:

* Opportunity CRUD endpoints
* lifecycle transition endpoint
* Submission endpoint
* Opportunity event endpoints
* Opportunity note endpoints
* UserAction endpoints
* ScheduledEvent endpoints
* Contact endpoints
* Communication endpoints
* Artefact endpoints
* association endpoints
* reconciled OpenAPI contract
* contract tests

All HTTP operations use the revised Opportunity-centric domain and repository/service boundaries.

No API route should depend on the obsolete Application-centric model.

**Tasks:** T067–T077

**Status:** Complete.

**Checkpoint:** The HTTP surface consistently exposes the revised domain model.

---

## Phase 9 — Kanban, Workspace, Search, and Dashboard

**Purpose:** Build the primary operational UI around derived Opportunity projections.

This phase establishes:

* Kanban projection
* seven lifecycle columns
* terminal grouping
* dedicated Offer column
* accepted-Offer indication
* next scheduled event on cards
* accessible lifecycle movement
* Opportunity list
* Opportunity creation/editing
* archive
* lifecycle transition UI
* responsive Opportunity Workspace
* Opportunity detail route
* PostgreSQL-native search
* core search filters
* operational dashboard

The dashboard emphasizes:

* actionable Opportunities
* upcoming ScheduledEvents
* overdue UserActions
* Offers

Archived Opportunities are excluded from normal operational views while remaining retained and historically accessible.

Playwright coverage for the complete lifecycle and Workspace remains intentionally deferred from this phase and is completed later through the final integration/hardening work.

**Tasks:** T078–T090

**Status:** Implementation complete; Phase remains open because T079 and T080 are deferred.

**Checkpoint:** Kanban, Workspace, search, and dashboard views are implemented and covered by the available automated unit/integration coverage. Full browser workflow validation remains outstanding.

---

## Phase 10 — Storage and Artefact Integration

**Purpose:** Connect Artefacts to external storage while preserving the provider-neutral domain boundary.

This phase establishes:

* fake `StorageProvider` integration coverage
* Google Drive adapter
* Google Drive authorization and revocation
* storage-related audit events
* provider-neutral Artefact retrieval
* metadata/content retrieval
* failure-safe provider references
* Artefact library UI

Google Drive identifiers, scopes, and provider-specific concepts remain confined to the storage layer.

**Tasks:** T091–T097

**Status:** Planned.

**Checkpoint:** Google Drive operates as the initial storage provider without coupling domain logic to Google Drive.

---

## Phase 11 — Export, Archive, Deletion, and Audit

**Purpose:** Provide safe recovery and lifecycle-management capabilities while preserving historical context.

This phase establishes:

* portable ZIP export
* structured domain-data export
* lifecycle-history export
* event/action/scheduled-event export
* communication export
* Artefact metadata and provider-reference export
* authorized binary retrieval
* explicit manifest entries for unavailable binaries
* Opportunity archive/restore
* Artefact archive/restore
* permanent-deletion preview
* explicit deletion confirmation
* relationship analysis
* destructive-operation audit trail
* failure-safe deletion behavior

External storage failures must not cause data to disappear silently from exports.

**Tasks:** T098–T105

**Status:** Planned.

**Checkpoint:** The user can export, archive, restore, and explicitly delete retained data without silently losing historical relationships.

---

## Phase 12 — Responsive PWA and Bounded Offline Read Access

**Purpose:** Complete the responsive/mobile experience while preserving the deliberately limited offline model.

This phase establishes:

* responsive Kanban
* responsive Workspace
* accessible mobile navigation
* mobile quick-entry controls
* bounded read-only caching
* previously viewed critical Opportunity/workspace data
* stale-data indication
* offline mutation blocking
* per-user cache clearance
* exclusion of external-storage binaries from offline caching by default

Offline mode remains strictly read-only.

The MVP does **not** introduce:

* mutation queues
* synchronization
* offline conflict resolution
* offline uploads
* offline lifecycle transitions
* general offline document storage

**Tasks:** T106–T114

**Status:** Planned.

**Checkpoint:** Desktop and mobile workflows are usable and previously viewed critical information remains available in bounded read-only offline mode.

---

## Phase 13 — Final Integration and Hardening

**Purpose:** Verify that the implementation, domain model, API contracts, tests, and documentation describe the same MVP.

This phase provides final coverage for:

* domain invariants
* ownership
* lifecycle
* Submission uniqueness
* OpportunityEvent semantics
* UserAction/ScheduledEvent separation
* Artefact associations
* optimistic concurrency
* PostgreSQL integration
* complete Playwright workflows
* query-performance smoke tests
* accessibility
* production build
* complete automated validation
* specification/documentation reconciliation
* obsolete terminology removal
* final Quickstart validation
* final MVP verification record

The final documentation pass ensures that:

* `spec.md`
* `data-model.md`
* `plan.md`
* `quickstart.md`
* `research.md`
* OpenAPI contracts
* Prisma schema
* implementation

all describe the same Opportunity-centric MVP.

**Tasks:** T115–T123

**Status:** Planned.

**Checkpoint:** The repository provides a coherent, tested, documented Opportunity-centric MVP.

---

# 4. Phase Dependencies

The implementation dependency order is:

```text
Phase 1 — Setup
      ↓
Phase 2 — Foundational
      ↓
Phase 3 — Canonical Domain / Prisma
      ├───────────────┐
      ↓               ↓
Phase 4              Phase 6
Opportunity          Operational
Lifecycle             Context
      ↓               ↓
      └───────┬───────┘
              ↓
Phase 5 — Submission / Artefacts
              ↓
Phase 7 — Context / Service Composition
              ↓
Phase 8 — API Contracts / HTTP
              ↓
Phase 9 — Kanban / Workspace / Search / Dashboard
              ├───────────────┐
              ↓               ↓
Phase 10                    Phase 12
Storage                     PWA / Offline
              ↓               ↓
Phase 11 — Export / Recovery
              └───────┬───────┘
                      ↓
Phase 13 — Final Integration / Hardening
```

More precisely:

* Phase 1 has no dependencies.
* Phase 2 depends on Phase 1 and blocks subsequent implementation.
* Phase 3 depends on Phase 2.
* Phase 4 depends on Phase 3.
* Phase 5 depends on the Opportunity model from Phase 3 and the lifecycle implementation from Phase 4 for formal Submission transitions.
* Phase 6 depends on the foundational domain from Phase 3 and can proceed in parallel with Phases 4–5 where there is no direct dependency.
* Phase 7 depends on Phases 4–6.
* Phase 8 depends on Phase 7 and the stabilized service contracts.
* Phase 9 depends on the relevant services and API contracts from Phases 7–8.
* Phase 10 depends on the Artefact model and StorageProvider foundation.
* Phase 11 depends on the completed domain and storage capabilities.
* Phase 12 depends primarily on the operational UI from Phase 9 and the PWA foundation from Phase 1.
* Phase 13 depends on all implementation phases.

---

# 5. Parallelization

The following work can be developed in parallel once its prerequisites are established:

* T017–T018
* T026–T030
* T037–T040
* T047–T051
* T059–T061
* T067–T069
* T078–T082
* T091–T092
* T098–T100
* T106–T108
* T115–T118

Parallel work must not bypass domain or ownership boundaries established by earlier phases.

---

# 6. Implementation Strategy

## 6.1 MVP First

Implementation proceeds from stable foundations toward user-facing capabilities:

1. Complete shared infrastructure.
2. Complete authentication, ownership, validation, and persistence foundations.
3. Establish the canonical Opportunity-centric data model.
4. Implement Opportunity lifecycle and historical events.
5. Implement Submission and Artefacts.
6. Implement operational context.
7. Compose the Opportunity Workspace read model.
8. Expose the domain through the API.
9. Build Kanban, Workspace, search, and dashboard.
10. Integrate external storage.
11. Implement export, archive, restore, deletion, and audit.
12. Complete responsive/mobile and bounded offline read access.
13. Perform final integration and hardening.

## 6.2 Vertical Slices

The preferred delivery approach is vertical and test-driven:

1. **Domain slice:** Opportunity → lifecycle → events → notes.
2. **Submission/asset slice:** Submission → Artefacts → associations.
3. **Operational-context slice:** actions → scheduled events → contacts → communications.
4. **API/UI slice:** API → Kanban → Workspace → search/dashboard.
5. **Storage slice:** Google Drive → Artefact retrieval → export.
6. **Device slice:** responsive/mobile → bounded offline read access.
7. **Recovery/hardening slice:** archive/delete → audit → performance → accessibility → documentation.

Each slice should be validated before progressing to dependent work.

---

# 7. Testing Strategy

Testing follows the architecture and risk profile of the system.

### Unit tests

Used for:

* domain invariants
* lifecycle rules
* services
* projections
* validation
* concurrency
* UI rendering where browser interaction is unnecessary

### Integration tests

Used for:

* PostgreSQL persistence
* owner isolation
* cross-aggregate relationships
* storage providers
* export
* archive/delete
* audit
* query performance

### Contract tests

Used for:

* OpenAPI compliance
* HTTP request/response behavior
* concurrency conflicts
* ownership behavior
* API resource semantics

### Playwright tests

Used for:

* critical end-to-end workflows
* desktop behavior
* mobile behavior
* responsive accessibility
* offline read-only behavior

The deferred Phase 9 Playwright tests are deliberately not treated as silently completed. They remain visible as outstanding work and are ultimately covered by the final end-to-end validation strategy.

---

# 8. Operational Invariants

The implementation must preserve the following invariants throughout all phases:

1. `Opportunity` is the canonical job-tracking aggregate.
2. Application-centric legacy concepts are not reintroduced.
3. There are exactly seven canonical lifecycle states.
4. Lifecycle behavior follows the persisted fourteen-transition graph.
5. Terminal states have no outgoing transitions.
6. `In Progress → In Progress` is not a lifecycle transition.
7. `Offer → In Progress` is invalid.
8. An accepted Offer remains in `Offer`.
9. An Opportunity has zero or one formal Submission.
10. Reapplication creates a new Opportunity.
11. `Submission.method` remains a nullable string.
12. Historical events are distinct from notes.
13. UserActions are distinct from ScheduledEvents.
14. Communications are distinct from historical events.
15. Artefact associations do not automatically create domain events.
16. Repository operations enforce owner scope.
17. Optimistic concurrency prevents stale writes.
18. Google Drive concepts do not leak into domain services.
19. Archived records disappear from normal operational views without losing retained history.
20. Offline mode is read-only.
21. No offline mutation queue or synchronization subsystem is introduced.
22. The MVP does not become a general-purpose CRM.

---

# 9. Explicitly Deferred Beyond MVP

The following capabilities remain outside the implementation sequence unless the specification is deliberately changed:

* Gmail synchronization
* Outlook synchronization
* calendar synchronization
* LinkedIn integration
* automatic job discovery
* job scraping
* browser extensions
* AI agents
* AI-generated CVs or cover letters
* automatic requirement extraction
* automatic interview detection
* workflow engines
* microservices
* dedicated search infrastructure
* sophisticated CRM functionality
* extensive analytics
* full offline synchronization
* offline mutation queues
* multi-user collaboration
* multi-tenancy
* RBAC
* billing
* user administration

These are deliberate non-goals rather than omitted implementation tasks.

---

# 10. Completion Criteria

The MVP is considered complete when:

* all required Phase 1–13 implementation tasks are completed or explicitly dispositioned;
* all required domain and integration tests pass;
* deferred Playwright coverage has been resolved through the final test strategy;
* linting passes;
* TypeScript type-checking passes;
* formatting passes;
* production build passes;
* API contract validation passes;
* desktop and mobile Playwright coverage passes;
* ownership boundaries are verified;
* lifecycle invariants are verified;
* Submission cardinality is verified;
* storage and export behavior is verified;
* archive/restore/deletion behavior is verified;
* bounded offline behavior is verified;
* documentation is reconciled;
* `quickstart.md` describes the final validation procedure;
* the final MVP verification results are recorded.

The executable source of truth for individual implementation tasks remains `tasks.md`.

The architectural rationale remains `research.md`.

The domain and product requirements remain `spec.md` and `data-model.md`.

This `plan.md` provides the roadmap connecting those artifacts.
