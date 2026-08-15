# Tasks: Personal Job Application Management

**Input**: Design documents from `specs/001-job-application-management/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md), and [application-api.openapi.yaml](./contracts/application-api.openapi.yaml)

**Tests**: Included because the plan requires Vitest integration/domain coverage, Playwright end-to-end coverage, and contract validation for the critical workflows.

**Organization**: Tasks are grouped by user story. The zero-or-one formal Submission invariant, explicit ownership boundary, and provider-neutral storage boundary are foundational and must not be bypassed.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the single Next.js modular monolith and its developer tooling.

- [ ] T001 Initialize the Next.js App Router TypeScript project and package scripts in `package.json`
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

## Phase 3: User Story 1 - Capture and progress an opportunity (Priority: P1) 🎯 MVP

**Goal**: Create an opportunity, record exactly one formal submission, and progress it through a concise Kanban without losing historical context.

**Independent Test**: Create an opportunity, create/select CV and optional cover-letter versions, record the formal submission, move it through statuses, and verify the workspace history shows immutable material snapshots and status-change events.

### Tests for User Story 1

- [ ] T017 [P] [US1] Add domain tests for Application lifecycle, status-event transaction, and archive rules in `tests/unit/application-service.test.ts`
- [ ] T018 [P] [US1] Add domain tests that reject a second Submission and preserve immutable CV/cover-letter snapshots in `tests/unit/submission-service.test.ts`
- [ ] T019 [P] [US1] Add API contract tests for application, status, and singular submission routes in `tests/contract/applications.contract.test.ts`
- [ ] T020 [P] [US1] Add Playwright capture/submit/status Kanban journey in `tests/e2e/application-lifecycle.spec.ts`

### Implementation for User Story 1

- [ ] T021 [US1] Add Application, Submission, TimelineEvent, and application-status relations with unique `Submission.applicationId` to `prisma/schema.prisma`
- [ ] T022 [P] [US1] Add DocumentAsset, CVProfile, CoverLetter, and submission-snapshot persistence types needed by formal submission in `prisma/schema.prisma`
- [ ] T023 [US1] Create the migration and owner-scoped repositories for applications, statuses, submissions, and timeline events in `prisma/migrations/` and `lib/repositories/application-repository.ts`
- [ ] T024 [US1] Implement Application create/update/archive/restore service with version checks in `lib/services/application-service.ts`
- [ ] T025 [US1] Implement formal Submission creation that snapshots selected assets, enforces one per Application, and appends its event transactionally in `lib/services/submission-service.ts`
- [ ] T026 [US1] Implement status transition service that appends a dated status-change event transactionally in `lib/services/status-service.ts`
- [ ] T027 [US1] Implement `GET`/`POST /api/applications` and `GET`/`PATCH /api/applications/[applicationId]` in `app/api/applications/route.ts` and `app/api/applications/[applicationId]/route.ts`
- [ ] T028 [P] [US1] Implement `POST /api/applications/[applicationId]/status` and ETag conflict handling in `app/api/applications/[applicationId]/status/route.ts`
- [ ] T029 [P] [US1] Implement `POST /api/applications/[applicationId]/submission` and 409 second-submission response in `app/api/applications/[applicationId]/submission/route.ts`
- [ ] T030 [US1] Implement the application create/edit form, immutable submission form, and explicit stale-save resolution UI in `components/applications/application-form.tsx`, `components/applications/submission-form.tsx`, and `components/shared/conflict-resolution-dialog.tsx`
- [ ] T031 [US1] Implement Kanban query/projection and concise accessible drag/equivalent status movement in `lib/services/kanban-service.ts` and `components/applications/kanban-board.tsx`
- [ ] T032 [US1] Implement application list and initial workspace routes in `app/(authenticated)/applications/page.tsx` and `app/(authenticated)/applications/[applicationId]/page.tsx`

**Checkpoint**: The core capture → one formal submission → progress workflow works online with chronology and conflict protection.

---

## Phase 4: User Story 2 - Restore full application context (Priority: P1)

**Goal**: Make the Application Workspace the coherent view of context, history, upcoming events, preparation, contacts, communications, documents, and evidence.

**Independent Test**: Open one populated Application and manage/view its communication, interview, task, note, link, contact, document, evidence, submission, and chronological timeline with events visually distinct from actions.

### Tests for User Story 2

- [ ] T033 [P] [US2] Add service tests for timeline ordering, future-event selection, and action/event separation in `tests/unit/workspace-service.test.ts`
- [ ] T034 [P] [US2] Add integration tests for application context relations and owner scoping in `tests/integration/workspace-context.test.ts`
- [ ] T035 [P] [US2] Add Playwright workspace-context journey in `tests/e2e/application-workspace.spec.ts`

### Implementation for User Story 2

- [ ] T036 [US2] Add Contact, ApplicationContact, Communication, Interview, InterviewParticipant, PreparationTask, PreparationNote, RelevantLink, ApplicationDocument, TimelineEventDocument, and ApplicationEvidence schema relations in `prisma/schema.prisma`
- [ ] T037 [US2] Create the context migration and owner-scoped repositories in `prisma/migrations/` and `lib/repositories/workspace-repository.ts`
- [ ] T038 [P] [US2] Implement TimelineEvent and Communication services, including manual event and attachment association, in `lib/services/timeline-service.ts` and `lib/services/communication-service.ts`
- [ ] T039 [P] [US2] Implement Interview, future-event projection, and participant services in `lib/services/interview-service.ts`
- [ ] T040 [P] [US2] Implement preparation task, Markdown note, relevant-link, and contact services in `lib/services/preparation-service.ts` and `lib/services/contact-service.ts`
- [ ] T041 [US2] Implement the workspace read model that returns all context in chronological/relevant order in `lib/services/workspace-service.ts`
- [ ] T042 [US2] Implement manual timeline-event and preparation-task endpoints in `app/api/applications/[applicationId]/timeline-events/route.ts` and `app/api/applications/[applicationId]/preparation-tasks/route.ts`
- [ ] T043 [US2] Implement workspace sections for history, next event, communications, contacts, interviews, documents, evidence, preparation tasks, notes, and links in `components/applications/workspace/`
- [ ] T044 [US2] Compose the responsive Application Workspace with distinct upcoming-event and next-action presentation in `app/(authenticated)/applications/[applicationId]/page.tsx`

**Checkpoint**: A single workspace restores complete present and historical application context with no mailbox synchronization.

---

## Phase 5: User Story 3 - Reuse and preserve professional assets (Priority: P1)

**Goal**: Manage reusable professional assets once, associate them with applications, and preserve the asset identities used in formal submissions.

**Independent Test**: Reuse a CV/evidence item across two applications, add a newer asset version, verify the original Submission snapshot remains unchanged, and attach later employer-requested material without creating a second Submission.

### Tests for User Story 3

- [ ] T045 [P] [US3] Add asset versioning, reuse, and immutable snapshot regression tests in `tests/unit/asset-service.test.ts`
- [ ] T046 [P] [US3] Add provider-boundary integration tests using the fake StorageProvider in `tests/integration/document-storage.test.ts`
- [ ] T047 [P] [US3] Add Playwright library/reuse/later-material journey in `tests/e2e/asset-library.spec.ts`

### Implementation for User Story 3

- [ ] T048 [US3] Complete reusable asset fields, EvidenceItem, and asset/application join constraints in `prisma/schema.prisma`
- [ ] T049 [US3] Create the asset/evidence migration and owner-scoped repositories in `prisma/migrations/` and `lib/repositories/asset-repository.ts`
- [ ] T050 [P] [US3] Implement CV and CoverLetter version management and selection service in `lib/services/professional-asset-service.ts`
- [ ] T051 [P] [US3] Implement EvidenceItem reuse and application-association service in `lib/services/evidence-service.ts`
- [ ] T052 [US3] Implement provider-neutral document attach/read/metadata workflow and `ApplicationDocument` association in `lib/services/document-service.ts`
- [ ] T053 [US3] Implement Google Drive adapter with user-selected least-privilege authorization, metadata, download, and failure-safe reference handling in `lib/storage/google-drive-storage-provider.ts`
- [ ] T054 [US3] Implement Drive authorization route and asset/document route handlers in `app/api/storage/google-drive/authorize/route.ts` and `app/api/assets/route.ts`
- [ ] T055 [US3] Implement CV, cover-letter, document, and evidence library pages/forms in `app/(authenticated)/library/page.tsx` and `components/library/`
- [ ] T056 [US3] Add application document/evidence association UI that directs later materials to context records rather than Submission in `components/applications/document-association-form.tsx`

**Checkpoint**: Reusable assets remain reusable, Google Drive stays behind its boundary, and only the original formal application is a Submission.

---

## Phase 6: User Story 4 - Stay oriented across devices (Priority: P2)

**Goal**: Provide a responsive installable PWA that supports mobile orientation and quick online capture while offering bounded read-only access to previously viewed critical information offline.

**Independent Test**: In desktop and mobile viewports, use Kanban, Workspace, document access, upcoming events, preparation, and quick status/event/task/note entry; then verify a previously viewed workspace is readable offline with mutations disabled.

### Tests for User Story 4

- [ ] T057 [P] [US4] Add Playwright mobile viewport tests for Kanban, quick entry, document access, and task completion in `tests/e2e/mobile-workflow.spec.ts`
- [ ] T058 [P] [US4] Add service-worker offline read-only and mutation-blocking tests in `tests/e2e/offline-readonly.spec.ts`
- [ ] T059 [P] [US4] Add responsive accessibility tests for keyboard-equivalent Kanban movement and quick actions in `tests/e2e/responsive-accessibility.spec.ts`

### Implementation for User Story 4

- [ ] T060 [US4] Implement mobile-responsive Kanban/workspace layouts and accessible quick-action affordances in `components/applications/kanban-board.tsx`, `components/applications/workspace/`, and `components/shared/quick-actions.tsx`
- [ ] T061 [US4] Implement mobile quick-create opportunity, event, note, task completion, and status controls in `components/applications/mobile-entry-sheet.tsx`
- [ ] T062 [US4] Implement bounded read-only cache policy for app shell and previously viewed critical workspace data, including last-refresh metadata, in `app/offline/service-worker.ts` and `lib/offline/cache-policy.ts`
- [ ] T063 [US4] Implement offline read-only UI and server-side/client-side mutation blocking with no queue or sync path in `app/offline/page.tsx`, `lib/offline/mutation-guard.ts`, and `components/shared/connection-status.tsx`
- [ ] T064 [US4] Clear per-user offline caches on sign-out and exclude Drive binary caching by default in `lib/offline/cache-clearance.ts` and `lib/auth/sign-out.ts`

**Checkpoint**: The PWA offers good mobile workflows and intentionally limited, safe offline reads without an offline mutation queue.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Complete discovery, dashboard, export, recovery, security, and end-to-end validation across all stories.

- [ ] T065 [P] Implement PostgreSQL full-text search projection and structured application filters in `lib/services/search-service.ts` and `app/api/search/route.ts`
- [ ] T066 [P] Implement dashboard metric queries and responsive overview for active work, events, challenges, stages, and conversions in `lib/services/dashboard-service.ts` and `app/(authenticated)/dashboard/page.tsx`
- [ ] T067 Implement portable ZIP export with JSON/CSV data, manifest, provider references, and all retrievable authorized document binaries in `lib/services/export-service.ts` and `app/api/exports/route.ts`
- [ ] T068 Add export tests for retrievable binaries and explicit unavailable-binary manifest entries in `tests/integration/export-service.test.ts`
- [ ] T069 Implement archive, restore, permanent-deletion preview/confirmation, and failure-safe document-reference handling in `lib/services/deletion-service.ts`, `app/api/applications/[applicationId]/route.ts`, and `components/applications/delete-confirmation-dialog.tsx`
- [ ] T070 [P] Add audit coverage for sign-in, export, archive, deletion, Drive authorization, and denied access in `tests/integration/audit-events.test.ts`
- [ ] T071 [P] Add realistic-personal-data query performance regression tests and synthetic larger-data smoke tests in `tests/integration/query-performance.test.ts`
- [ ] T072 Update user/developer setup and operational notes, including remaining architecture decisions and least-privilege Drive setup, in `ReadMe.md` and `specs/001-job-application-management/quickstart.md`
- [ ] T073 Run and record every quickstart validation scenario and the full test/lint/type-check suite in `specs/001-job-application-management/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** has no dependencies.
- **Foundational (Phase 2)** depends on Setup and blocks all stories.
- **US1** depends on Foundational and is the smallest deployable MVP slice.
- **US2** depends on Foundational and uses the Application aggregate from US1.
- **US3** depends on Foundational; formal Submission integration follows US1.
- **US4** depends on US1 and US2 because it makes their actual mobile/offline experience usable.
- **Polish** depends on the desired story phases; export additionally depends on US3's StorageProvider implementation.

### User Story Dependencies

```text
Setup → Foundational → US1 ─┬→ US2 ─→ US4
                            └→ US3 ─→ Polish/export
US2 + US3 ─────────────────────→ Polish/search/dashboard
```

### Parallel Opportunities

- T003–T006 can proceed after T001–T002.
- T009–T013 can proceed in parallel after the schema baseline is agreed.
- Each `[P]` test/service task within a story can proceed in parallel once its schema/repository prerequisites are complete.
- US2 context services and US3 asset services can be developed in parallel after US1's aggregate contracts are stable.

## Parallel Example: User Story 2

```text
Task: "Implement TimelineEvent and Communication services in lib/services/timeline-service.ts and lib/services/communication-service.ts"
Task: "Implement Interview service in lib/services/interview-service.ts"
Task: "Implement preparation and contact services in lib/services/preparation-service.ts and lib/services/contact-service.ts"
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete US1 and validate the formal-Submission invariant end to end.
3. Stop and demo the capture/progress workflow before expanding scope.

### Incremental Delivery

1. Add US2 to make context restoration useful.
2. Add US3 for reusable assets and Google Drive selection.
3. Add US4 for polished mobile/PWA behavior.
4. Finish search, dashboard, export, recovery, and full validation in the Polish phase.

All tasks use the required checklist format, sequential IDs, story labels for story work, and explicit file paths.
