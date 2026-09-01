# Tasks: Personal Job Application Management

**Input**: Design documents from `specs/001-job-application-management/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md), and [opportunity-api.openapi.yaml](./contracts/opportunity-api.openapi.yaml)

**Tests**: Included because the plan requires Vitest integration/domain coverage, Playwright desktop/mobile coverage, and contract validation for the critical workflows.

**Organization**: Tasks are grouped by implementation dependency and user-facing capability. The Opportunity-centric domain model, zero-or-one Submission invariant, explicit ownership boundary, lifecycle transition graph, and provider-neutral storage boundary are foundational and must not be bypassed.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the single Next.js App Router TypeScript application and its developer tooling.

- [x] T001 Initialize the Next.js App Router TypeScript project and package scripts in `package.json`
- [x] T002 Create the planned application, component, library, Prisma, public, and test directory structure in `app/`, `components/`, `lib/`, `prisma/`, `public/`, and `tests/`
- [x] T003 [P] Configure TypeScript, ESLint, Prettier, and import aliases in `tsconfig.json`, `eslint.config.mjs`, and `prettier.config.mjs`
- [x] T004 [P] Add environment variable template and runtime validation in `.env.example` and `lib/config/env.ts`
- [x] T005 [P] Configure Vitest unit/integration projects and Playwright desktop/mobile projects in `vitest.config.ts` and `playwright.config.ts`
- [x] T006 [P] Add the PWA manifest, icons placeholders, and service-worker build configuration in `public/manifest.webmanifest`, `public/icons/`, and `next.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement common persistence, ownership, authentication, validation, errors, provider interfaces, and page shell required by every story.

**⚠️ CRITICAL**: Complete this phase before starting any user-story phase.

- [x] T007 Define the Prisma datasource, generators, common enums, ownership/account records, audit events, lifecycle statuses, and migration baseline in `prisma/schema.prisma`
- [x] T008 Create the initial migration and seed configured-owner-safe default statuses and role families in `prisma/migrations/` and `prisma/seed.ts`
- [x] T009 [P] Implement Auth.js Google OIDC configuration, configured-owner admission, and server session helpers in `lib/auth/auth.ts` and `app/api/auth/[...nextauth]/route.ts`
- [x] T010 [P] Implement explicit current-owner resolution and repository scoping helpers in `lib/auth/current-owner.ts` and `lib/repositories/owner-scope.ts`
- [x] T011 [P] Implement shared Zod request validation, typed domain errors, HTTP error mapping, and safe audit logging in `lib/validation/`, `lib/domain/errors.ts`, and `lib/services/audit-service.ts`
- [x] T012 [P] Define the provider-neutral `StorageProvider` interface, provider reference types, and fake provider test double in `lib/storage/storage-provider.ts` and `tests/fakes/storage-provider.ts`
- [x] T013 [P] Implement reusable optimistic-concurrency version/ETag parsing and conflict response helpers in `lib/domain/concurrency.ts` and `lib/services/conflict-service.ts`
- [x] T014 Implement authenticated route/layout protection and the responsive application shell in `app/(authenticated)/layout.tsx`, `app/layout.tsx`, and `middleware.ts`
- [x] T015 Implement shared accessible UI primitives, empty/error/loading states, and online/offline availability indicator in `components/ui/` and `components/shared/connection-status.tsx`
- [x] T016 Add foundational authentication, owner-isolation, validation, and concurrency tests in `tests/integration/auth.test.ts`, `tests/unit/owner-scope.test.ts`, and `tests/unit/concurrency.test.ts`

**Checkpoint**: An authenticated configured owner reaches a responsive shell; unauthorized requests are denied; all repositories can require owner scope.

---

# Phase 3: Canonical Opportunity Domain and Persistence

**Purpose**: Establish the revised Opportunity-centric Prisma model before implementing repositories or services.

### Tests

- [x] T017 [P] Add Prisma/domain regression tests for the canonical Opportunity fields, seven lifecycle states, fourteen allowed lifecycle transitions, terminal-state rules, Submission cardinality, and ownership boundaries in `tests/unit/domain/opportunity.test.ts`, `tests/unit/domain/opportunity-lifecycle.test.ts`, and `tests/unit/owner-scope.test.ts`
- [x] T018 [P] Add persistence/schema regression tests confirming the canonical Opportunity fields, lifecycle status persistence, archive/restore behavior, versioning, and ownership boundaries in `tests/integration/opportunity-persistence.test.ts`

### Implementation

- [x] T019 Reconcile `prisma/schema.prisma` with `data-model.md`, including `Opportunity`, `OpportunityNote`, `LifecycleStatus`, `LifecycleTransition`, `RoleFamily`, and all revised supporting models; remove obsolete Application-centric models and fields
- [x] T020 Remove the obsolete Opportunity priority concept completely from the Prisma schema, including the `ApplicationPriority` enum, `Opportunity.priority`, and any related indexes or seed data
- [x] T021 Rename `Opportunity.nextActionTitle` to the canonical `Opportunity.nextAction` field and preserve `nextActionDueAt` as defined by `data-model.md`
- [x] T022 Verify that `Submission.method` remains `String?` and does not introduce an invented submission-method enum
- [x] T023 Seed the seven canonical lifecycle states and all fourteen allowed transitions in `prisma/seed.ts`, with no `In Progress → In Progress`, no `Offer → In Progress`, and no outgoing transitions from terminal states
- [x] T024 Reconcile the active Prisma migration with the revised schema in `prisma/migrations/`, preserving the obsolete migration backup outside the active migration history
- [x] T025 Verify the development database can be rebuilt from the active migration and seeded successfully using the revised schema

**Checkpoint**: Prisma and seed data represent exactly the revised Opportunity-centric model defined by `spec.md` and `data-model.md`.

---

# Phase 4: Opportunity Aggregate and Lifecycle

**Purpose**: Implement the core Opportunity aggregate, lifecycle transitions, notes, and historical events.

### Tests

- [x] T026 [P] Add Opportunity repository tests for create, read, update, archive, restore, owner isolation, and optimistic-concurrency conflicts in `tests/unit/opportunity-repository.test.ts`
- [x] T027 [P] Add lifecycle transition tests covering all fourteen valid transitions and invalid transitions in `tests/unit/lifecycle-service.test.ts`
- [x] T028 [P] Add lifecycle transaction tests proving that a successful state change and its corresponding OpportunityEvent are committed together in `tests/integration/lifecycle-transition.test.ts`
- [x] T029 [P] Add tests proving that `In Progress → In Progress` is not a lifecycle transition and that non-state-changing events can occur while the Opportunity remains in the same state in `tests/unit/opportunity-event.test.ts`
- [x] T030 [P] Add OpportunityNote tests proving notes are independently editable and are not automatically converted into OpportunityEvents in `tests/unit/opportunity-note.test.ts`

### Implementation

- [x] T031 Implement owner-scoped- Opportunity, OpportunityNote, LifecycleStatus, LifecycleTransition, and RoleFamily repositories in `lib/repositories/`
- [x] T032 Implement Opportunity create/update/archive service with initial Discovered state and optimistic-concurrency checks in lib/services/opportunity-service.ts
- [x] T033 Implement lifecycle transition service using persisted `LifecycleTransition` rules in `lib/services/lifecycle-service.ts`
- [x] T034 Implement atomic lifecycle transition plus corresponding state-changing OpportunityEvent creation in `lib/services/lifecycle-service.ts`
- [x] T035 Implement significant non-state-changing OpportunityEvent creation with chronological history and optional contextual Artefact associations in `lib/services/opportunity-event-service.ts`
- [x] T036 Implement OpportunityNote create/update behavior independently of OpportunityEvent history in `lib/services/opportunity-note-service.ts`

**Checkpoint**: An Opportunity can move only through the canonical fourteen-transition FSM, while significant history remains distinct from notes and ordinary CRUD changes.

---

# Phase 5: Submission and Artefact Domain

**Purpose**: Implement the two primary aggregate roots and their relationships.

### Tests

- [x] T037 [P] Add Submission tests for zero-or-one cardinality, successful submission transition, reapplication through a new Opportunity, and immutable identification of the selected CV/cover-letter Artefacts in `tests/unit/submission-service.test.ts`
- [x] T038 [P] Add Artefact tests for independent identity, reusable associations, representation validation, and archive/restore behavior in `tests/unit/artefact-service.test.ts`
- [x] T039 [P] Add ownership tests preventing an Opportunity from referencing another owner's Artefacts in `tests/integration/artefact-ownership.test.ts`
- [x] T040 [P] Add tests for OpportunityArtefact, EventArtefact, and CommunicationArtefact associations without treating association changes as automatic domain events in `tests/unit/artefact-associations.test.ts`

### Implementation

- [x] T041 Implement owner-scoped Artefact repository and service for creation, retrieval, association, archive, and restore in `lib/repositories/artefact-repository.ts` and `lib/services/artefact-service.ts`
- [x] T042 Implement OpportunityArtefact and EventArtefact association operations in `lib/services/artefact-association-service.ts`
- [x] T043 Implement Submission repository and service enforcing zero-or-one Submission per Opportunity in `lib/repositories/submission-repository.ts` and `lib/services/submission-service.ts`
- [x] T044 Implement transactional formal Submission creation that changes `Discovered` to `Submitted` and creates the corresponding historical event
- [x] T045 Ensure selected Submission Artefact references remain identifiable independently of later Artefact creation or association changes
- [x] T046 Implement the reapplication rule: a later application attempt is represented by a new Opportunity rather than a second Submission

**Checkpoint**: Artefacts are reusable domain records, while each Opportunity can have zero or one formal Submission.

---

# Phase 6: Operational Context

**Purpose**: Implement UserAction, ScheduledEvent, Contact, Communication, and their associations without turning them into competing lifecycle models.

### Tests

- [x] T047 [P] Add UserAction tests for status, priority, due date, completion, optimistic concurrency, and owner isolation in `tests/unit/user-action-service.test.ts`
- [x] T048 [P] Add ScheduledEvent tests for event types, time/timezone handling, Opportunity association, and contact association in `tests/unit/scheduled-event-service.test.ts`
- [x] T049 [P] Add Contact and OpportunityContact tests for owner isolation and association integrity in `tests/unit/contact-service.test.ts`
- [x] T050 [P] Add Communication and CommunicationArtefact tests for Opportunity ownership, occurredAt chronology, optional free-form contact and subject, optional body, Artefact association, and optional OpportunityEvent creation in `tests/unit/communication-service.test.ts`
- [x] T051 [P] Add cross-owner association integration tests for Opportunity, Contact, ScheduledEvent, Communication, Artefact, and Submission relationships in `tests/integration/domain-ownership.test.ts`

### Implementation

- [x] T052 Implement owner-scoped UserAction repository and service in `lib/repositories/user-action-repository.ts` and `lib/services/user-action-service.ts`
- [x] T053 Implement ScheduledEvent repository and service, including `ScheduledEventContact`, in `lib/repositories/scheduled-event-repository.ts` and `lib/services/scheduled-event-service.ts`
- [x] T054 Implement Contact and OpportunityContact repositories/services in `lib/repositories/contact-repository.ts` and `lib/services/contact-service.ts`
- [x] T055 Implement ScheduledEventContact association operations with explicit cross-owner validation between the ScheduledEvent's Opportunity owner and the Contact owner
- [x] T056 Implement Opportunity-scoped Communication and CommunicationArtefact repositories/services in `lib/repositories/communication-repository.ts` and `lib/services/communication-service.ts`
- [x] T057 Implement lightweight Opportunity-scoped communications using a free-form contact text field without introducing a CommunicationContact association or CRM aggregate
- [x] T058 Ensure significant communications may create OpportunityEvents while Communication records remain semantically distinct from historical event records

**Checkpoint**: Historical events, user actions, scheduled events, communications, contacts, notes, and lifecycle state remain distinct concepts.

---

# Phase 7: Opportunity Context and Service Composition

**Purpose**: Provide a coherent Opportunity Workspace read model without collapsing distinct domain concepts.

### Tests

- [x] T059 [P] Add Opportunity Workspace projection tests for current state, next action, next scheduled event, notes, events, Artefacts, actions, scheduled events, communications, contacts, and Submission in `tests/unit/opportunity-context-service.test.ts`
- [x] T060 [P] Add integration tests proving the Workspace projection respects owner boundaries and does not expose records from another owner in `tests/integration/opportunity-context.test.ts`
- [x] T061 [P] Add tests proving that `nextAction` and `nextActionDueAt` remain consistent with the explicitly maintained Opportunity-level next-action information while UserAction remains the richer actionable record

### Implementation

- [x] T062 Implement the composed Opportunity context service in `lib/services/opportunity-context-service.ts`
- [x] T063 Implement owner-scoped aggregation of Opportunity, current lifecycle state, notes, recent events, Submission, Artefacts, UserActions, ScheduledEvents, Contacts, and Communications
- [x] T064 Implement next scheduled-event selection for Workspace/Kanban projections
- [x] T065 Implement Opportunity-level next-action handling using `nextAction` and `nextActionDueAt` without replacing the UserAction model
- [x] T066 Define service-level DTOs/read models so Prisma types do not leak into API or UI components in `lib/domain/` and `lib/services/`

**Checkpoint**: The Opportunity Workspace has one coherent context surface while preserving the semantic distinctions established by the data model.

---

# Phase 8: API Contracts and HTTP Surface

**Purpose**: Expose the revised domain through validated, owner-scoped, concurrency-aware API operations.

### Tests

- [x] T067 [P] Reconcile the OpenAPI contract with Opportunity-centric resources, lifecycle transitions, Submission, OpportunityEvent, OpportunityNote, Artefact, UserAction, ScheduledEvent, Contact, Communication, search, export, and storage operations in `specs/001-job-application-management/contracts/`
- [x] T068 [P] Add contract tests for Opportunity CRUD, lifecycle transitions, Submission uniqueness, optimistic concurrency, notes, and events in `tests/contract/opportunities.contract.test.ts`
- [x] T069 [P] Add contract tests for Artefacts, UserActions, ScheduledEvents, Contacts, Communications, and Workspace retrieval in `tests/contract/opportunity-context.contract.test.ts`

### Implementation

- [x] T070 Rename the API contract filename from the legacy application-oriented name to an Opportunity-oriented name and update references in the specification documents and tooling
- [x] T071 Implement `GET`/`POST /api/opportunities` in `app/api/opportunities/route.ts`
- [x] T072 Implement `GET`/`PATCH`/`DELETE /api/opportunities/[opportunityId]` with owner scoping and optimistic-concurrency handling in `app/api/opportunities/[opportunityId]/route.ts`
- [x] T073 Implement `POST /api/opportunities/[opportunityId]/transition` using the lifecycle service in `app/api/opportunities/[opportunityId]/transition/route.ts`
- [x] T074 Implement `POST /api/opportunities/[opportunityId]/submission` with zero-or-one enforcement and appropriate conflict responses
- [x] T075 Implement Opportunity event and note endpoints under `app/api/opportunities/[opportunityId]/`
- [x] T076 Implement UserAction, ScheduledEvent, Contact, and Communication endpoints under the appropriate Opportunity-scoped API routes
- [x] T077 Implement Artefact creation/retrieval and association endpoints under `app/api/artefacts/` and the relevant Opportunity subroutes

**Checkpoint**: All API operations use the revised domain model and no route depends on an obsolete Application-centric repository or service.

---

# Phase 9: Kanban, Workspace, Search, and Dashboard

**Purpose**: Build the primary operational UI around derived Opportunity views.

### Prerequisite

- [x] T078a - Add authentication entry point

### Tests

- [x] T078 [P] Add Kanban projection tests for the seven lifecycle states, terminal grouping, dedicated Offer column, accepted-Offer indication, and next scheduled event in `tests/unit/kanban-service.test.ts`
- [ ] T079 [P] Add Playwright coverage for Opportunity capture, lifecycle progression, Submission, and historical context in `tests/e2e/opportunity-lifecycle.spec.ts` — **deferred**
- [ ] T080 [P] Add Playwright coverage for the complete Opportunity Workspace in `tests/e2e/opportunity-workspace.spec.ts` — **deferred**
- [x] T081 [P] Add search/filter integration tests for company, position, role family, country/location, lifecycle state, and source in `tests/integration/search-service.test.ts`
- [x] T082 [P] Add dashboard projection and UI tests for actionable Opportunities, upcoming ScheduledEvents, overdue UserActions, and Offers in `tests/unit/dashboard-service.test.ts` and `tests/unit/dashboard.test.tsx`

### Implementation

- [x] T083 Implement Kanban query/projection in `lib/services/kanban-service.ts`
- [x] T084 Implement the concise Kanban board showing position, company, country/location, lifecycle column, and next scheduled event in `components/opportunities/kanban-board.tsx`
- [x] T085 Implement accessible equivalent lifecycle movement without relying exclusively on drag-and-drop
- [x] T086 Implement Opportunity list, create/edit, archive, and lifecycle-transition UI in `app/(authenticated)/opportunities/` and `components/opportunities/`. Archived Opportunities are excluded from normal operational views. Restore behavior is deferred to T103.
- [x] T087 Implement the responsive Opportunity Workspace in `components/opportunities/opportunity-workspace.tsx`
- [x] T088 Implement the Opportunity detail route in `app/(authenticated)/opportunities/[opportunityId]/page.tsx`
- [x] T089 Implement PostgreSQL-native search and the required core filters in `lib/services/search-service.ts` and `app/api/search/route.ts`
- [x] T090 Implement the operational dashboard projection and UI in `lib/services/dashboard-service.ts`, `components/dashboard/dashboard.tsx`, and `app/(authenticated)/dashboard/page.tsx`

**Checkpoint**: Kanban, Workspace, search, and dashboard views are implemented and covered by automated tests. Phase 9 remains open pending the deferred Playwright coverage in T079/T080.

---

# Phase 10: Storage and Artefact Integration

**Purpose**: Connect Artefacts to external storage without leaking provider-specific concepts into the domain.

### Tests

- [ ] T091 [P] Add fake-StorageProvider integration tests for metadata retrieval, content retrieval, missing references, authorization failures, and provider-independent behavior in `tests/integration/storage-provider.test.ts`
- [ ] T092 [P] Add Google Drive adapter tests for authorization, metadata retrieval, file retrieval, revocation, and failure-safe references in `tests/integration/google-drive-storage.test.ts`

### Implementation

- [ ] T093 Implement the Google Drive `StorageProvider` adapter in `lib/storage/google-drive-storage-provider.ts`
- [ ] T094 Implement Google Drive authorization/revocation flow and associated audit events in `app/api/storage/google-drive/` and `lib/storage/`
- [ ] T095 Implement provider-neutral Artefact metadata/content retrieval through `StorageProvider`
- [ ] T096 Ensure Google Drive identifiers, scopes, and provider-specific concepts remain outside Opportunity and Artefact domain services
- [ ] T097 Implement the Artefact library for CVs, cover letters, job descriptions, research, presentations, portfolio evidence, transcripts, certificates, audio, video, and other Artefact types in `app/(authenticated)/artefacts/` and `components/artefacts/`

**Checkpoint**: Google Drive works as the initial storage provider while the domain remains provider-neutral.

---

# Phase 11: Export, Archive, Deletion, and Audit

**Purpose**: Provide safe recovery and lifecycle management without compromising historical context.

### Tests

- [ ] T098 [P] Add export integration tests covering structured domain data, lifecycle history, events, actions, scheduled events, communications, Artefact metadata, provider references, and retrievable binaries in `tests/integration/export-service.test.ts`
- [ ] T099 [P] Add archive/restore/permanent-deletion tests covering historical relationships, explicit confirmation, owner isolation, and failure-safe behavior in `tests/integration/deletion-service.test.ts`
- [ ] T100 [P] Add audit coverage for sign-in, denied access, export, archive, restore, permanent deletion, and Drive authorization changes in `tests/integration/audit-events.test.ts`

### Implementation

- [ ] T101 Implement portable ZIP export containing structured data, lifecycle history, events, actions, scheduled events, communications, Artefact metadata, provider references, and retrievable authorized binaries in `lib/services/export-service.ts` and `app/api/exports/route.ts`
- [ ] T102 Include explicit manifest entries for authorized Artefacts whose external binaries are unavailable during export
- [ ] T103 Implement Opportunity and Artefact archive/restore behavior in the relevant domain services and API routes
- [ ] T104 Implement permanent-deletion preview and explicit confirmation with relationship analysis in `lib/services/deletion-service.ts`
- [ ] T105 Ensure destructive operations preserve the required audit trail and fail safely when external Artefact references cannot be removed or verified

**Checkpoint**: The user can export, archive, restore, and explicitly delete data without silently losing historical relationships.

---

# Phase 12: Responsive PWA and Bounded Offline Read Access

**Purpose**: Complete the responsive/mobile experience while preserving the deliberate read-only offline boundary.

### Tests

- [ ] T106 [P] Add Playwright mobile viewport coverage for Kanban, Opportunity Workspace, lifecycle movement, quick entry, Artefacts, scheduled events, and UserActions in `tests/e2e/mobile-workflow.spec.ts`
- [ ] T107 [P] Add offline-read tests proving previously viewed critical Opportunity information remains readable with stale-data indication and mutations are blocked in `tests/e2e/offline-readonly.spec.ts`
- [ ] T108 [P] Add responsive accessibility tests for keyboard-equivalent Kanban movement, focus management, forms, quick actions, and connection state in `tests/e2e/responsive-accessibility.spec.ts`

### Implementation

- [ ] T109 Implement responsive Kanban and Opportunity Workspace layouts with accessible mobile navigation in `components/opportunities/`
- [ ] T110 Implement mobile quick-entry controls for Opportunity creation, lifecycle transition, OpportunityEvent, OpportunityNote, UserAction, and ScheduledEvent creation in `components/opportunities/mobile-entry-sheet.tsx`
- [ ] T111 Implement bounded read-only caching for the app shell and previously viewed critical Opportunity/workspace data in `lib/offline/cache-policy.ts` and the service-worker configuration
- [ ] T112 Implement stale-data indication and offline read-only presentation in `components/shared/connection-status.tsx` and the relevant Workspace components
- [ ] T113 Block all mutations while offline and provide no mutation queue or synchronization path in `lib/offline/mutation-guard.ts`
- [ ] T114 Clear per-user offline caches on sign-out and exclude external-storage binaries from offline caching by default in `lib/offline/cache-clearance.ts`

**Checkpoint**: Desktop and mobile workflows are usable, previously viewed information remains available in bounded read-only offline mode, and no offline mutation/synchronization subsystem exists.

---

# Phase 13: Final Integration and Hardening

**Purpose**: Verify that implementation, domain model, API contracts, tests, and documentation describe the same MVP.

- [ ] T115 [P] Add complete domain regression coverage for ownership, lifecycle invariants, Submission uniqueness, OpportunityEvent semantics, UserAction/ScheduledEvent separation, Artefact associations, and optimistic concurrency in `tests/unit/`
- [ ] T116 [P] Add full PostgreSQL integration coverage for the Opportunity domain and contextual records in `tests/integration/`
- [ ] T117 [P] Add complete Playwright coverage for discovery through Submission, In Progress activity, Offer, and all terminal outcomes, including reapplication through a new Opportunity, in `tests/e2e/mvp-workflow.spec.ts`
- [ ] T118 [P] Add realistic-data query performance smoke tests for Kanban, Workspace, dashboard, and search in `tests/integration/query-performance.test.ts`
- [ ] T119 Run lint, type-check, unit tests, integration tests, API contract tests, production build, and Playwright desktop/mobile tests and resolve regressions
- [ ] T120 Reconcile `spec.md`, `data-model.md`, `plan.md`, `quickstart.md`, `research.md`, and the OpenAPI contract so that they use the same Opportunity-centric terminology and lifecycle model
- [ ] T121 Search the repository for obsolete domain-model names and remove remaining implementation/documentation references where they describe the current domain rather than historical migration material
- [ ] T122 Update `quickstart.md` with the final migration, seed, authentication, Google Drive authorization, export, archive/delete, and offline-read validation procedure
- [ ] T123 Record final MVP verification results and explicitly deferred capabilities in `quickstart.md`

**Checkpoint**: The repository's implementation, Prisma schema, API contracts, tests, and design documentation all describe the same Opportunity-centric MVP.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup** has no dependencies.
- **Phase 2 — Foundational** depends on Phase 1 and blocks all subsequent implementation.
- **Phase 3 — Canonical Domain and Persistence** depends on Phase 2 and must complete before domain services.
- **Phase 4 — Opportunity Aggregate and Lifecycle** depends on Phase 3.
- **Phase 5 — Submission and Artefact Domain** depends on Phase 3 and the Opportunity model; formal Submission transition depends on Phase 4.
- **Phase 6 — Operational Context** depends on Phase 3 and can proceed in parallel with Phases 4–5 where there is no direct dependency.
- **Phase 7 — Context and Service Composition** depends on Phases 4–6.
- **Phase 8 — API Surface** depends on Phase 7.
- **Phase 9 — UI projections** depends on the relevant services/API contracts from Phases 7–8.
- **Phase 10 — Storage** depends on the Artefact model and StorageProvider foundation.
- **Phase 11 — Export/recovery** depends on the completed domain and storage services.
- **Phase 12 — PWA/offline** depends on the operational UI from Phase 9.
- **Phase 13 — Final verification** depends on all implementation phases.

### Dependency Graph

```text
Setup
  ↓
Foundational
  ↓
Canonical Domain / Prisma
  ├───────────────┐
  ↓               ↓
Opportunity       Operational Context
Lifecycle         (Actions / Scheduled Events /
Events / Notes     Contacts / Communications)
  ↓               ↓
Submission + Artefacts
        ↓
Context + Service Composition
        ↓
API Contracts / HTTP
        ↓
Kanban / Workspace / Search / Dashboard
        ├─────────────────┐
        ↓                 ↓
   Storage           PWA / Offline
        ↓                 ↓
      Export / Recovery
        └────────┬────────┘
                 ↓
          Final Verification
```
### Parallel Opportunities
- T017–T018 can proceed in parallel once the canonical schema is available.
- T026–T030 can proceed in parallel once the relevant persistence contracts are established.
- T037–T040 can proceed in parallel.
- T047–T051 can proceed in parallel.
- T059–T061 can proceed in parallel once the supporting services exist.
- T067–T069 can proceed in parallel after the service contracts stabilize.
- T078–T082 can proceed in parallel once the corresponding projections/services exist.
- T091–T092 can proceed in parallel.
- T098–T100 can proceed in parallel.
- T106–T108 can proceed in parallel.
- T115–T118 can proceed in parallel during final hardening.
- 
## Implementation Strategy
### MVP First
1. Complete Setup and Foundational phases.
2. Reconcile and establish the canonical Opportunity-centric Prisma model.
3. Implement Opportunity lifecycle and historical events.
4. Implement Submission and Artefacts.
5. Implement operational context: actions, scheduled events, contacts, communications, and notes.
6. Expose the core domain through the API.
7. Build the Kanban and Opportunity Workspace.
8. Validate the complete online workflow before expanding storage, export, and offline concerns.
## Incremental Delivery
1. Domain slice: Opportunity → lifecycle → events → notes.
2. Submission/asset slice: Submission → Artefacts → associations.
3. Operational context slice: actions → scheduled events → contacts → communications.
4. API/UI slice: API → Kanban → Workspace → search/dashboard.
5. Storage slice: Google Drive → Artefact retrieval → export.
6. Device slice: responsive/mobile → bounded offline read access.
7. Hardening slice: archive/delete → audit → performance → accessibility → documentation.
## Explicitly Deferred Beyond MVP

The following remain outside the implementation task sequence unless the specification is deliberately changed:

-Gmail/Outlook synchronization;
-calendar synchronization;
- LinkedIn integration;
- automatic job discovery/scraping;
- browser extensions;
- AI agents;
- AI-generated CVs or cover letters;
- automatic requirement extraction;
- automatic interview detection;
- workflow engines;
- microservices;
- dedicated search infrastructure;
- sophisticated CRM functionality;
- extensive analytics;
- full offline synchronization;
- offline mutation queues;
- multi-user collaboration;
- multi-tenancy;
- RBAC;
- billing;
- user administration.

