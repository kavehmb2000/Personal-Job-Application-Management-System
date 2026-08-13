# Implementation Plan: Personal Job Application Management

**Branch**: `001-job-application-management` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-job-application-management/spec.md`

## Summary

Build a single-user, responsive personal job-search workspace that keeps each opportunity's current status, submitted materials, communications, interviews, preparation, evidence, and history together. Deliver it as one deployable web application with a concise Kanban, an application-centric workspace, reusable asset libraries, search/filtering, dashboard, export, Google sign-in, and a provider-independent document-storage boundary initially backed by Google Drive.

The implementation uses a modular monolith: Next.js App Router and TypeScript for responsive browser/mobile UI and authenticated server operations, PostgreSQL for normalized records and search, and Prisma ORM for data access and schema migrations. The app is an installable PWA with a deliberately limited, read-only offline fallback for previously viewed critical information. It has no separate API service, search service, workflow engine, background synchronization, or microservice.

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js 22 LTS

**Primary Dependencies**: Next.js App Router; React; Prisma ORM; PostgreSQL client; Auth.js with Google OpenID Connect provider; Zod validation; Workbox-based service worker tooling; Vitest; Playwright

**Storage**: Managed PostgreSQL for structured data; Google Drive through a `StorageProvider` boundary for user-selected documents; browser Cache Storage and IndexedDB only for read-only offline fallback

**Testing**: Vitest unit and integration tests; Playwright end-to-end tests with desktop and mobile device viewports; provider-boundary fakes for Google Drive

**Target Platform**: Modern desktop and mobile browsers; installable PWA; one Node.js web-service deployment

**Project Type**: Full-stack web application (single modular monolith)

**Performance Goals**: Kanban and Application Workspace become usable within 2 seconds, search/filter results within 1 second, and core create/update acknowledgement within 1 second under normal connectivity for realistic personal use: about 30 active applications and hundreds of historical applications. Larger synthetic data sets may be used in tests to detect obviously poor queries; they are not MVP capacity commitments.

**Constraints**: One configured personal user; Google account sign-in; explicit data ownership and authorization boundaries; least-privilege, user-selected Drive access; no Gmail/Outlook/calendar/LinkedIn integrations; no automatic scraping or AI in MVP; bounded read-only offline fallback only; every mutation requires an online successful save; optimistic conflict detection with explicit user resolution; export must preserve data ownership and include retrievable authorized binaries

**Scale/Scope**: One owner, roughly 30 active applications at a time, hundreds of historical applications over the product lifetime, and linked Drive documents. Optimize for maintainability, mobile quick entry, and responsive personal use—not high concurrency or SaaS traffic. Future multi-tenant SaaS evolution is a boundary consideration only, not MVP scope.

## Constitution Check

### Pre-design gates

| Constitutional gate | Result | Design response |
|---|---|---|
| Personal, single-user system with SaaS-compatible boundaries | Pass | One configured owner account, no tenants, roles, collaboration, or administration; domain ownership and authorization are explicit and external identity stays outside core entities. |
| Context is core; Workspace is primary | Pass | The application aggregate and workspace read model unite job details, history, events, preparation, documents, evidence, and communications. |
| Reuse assets while preserving history | Pass | Versioned assets are reused; each Application has zero or one formal Submission retaining immutable CV and optional cover-letter snapshots. Subsequent materials remain documents/events/communications. |
| Current state separate from history | Pass | Current status is stored separately; successful status changes and submissions append timeline events. |
| Kanban stays concise | Pass | Card projection is restricted to position, company, location, and next event. |
| Simple, integration-independent MVP | Pass | Modular monolith; manual communications; `StorageProvider` boundary; no sync engines or external search service. |
| Privacy, least privilege, recoverability | Pass | Google OIDC, configured-owner access, secure sessions, user-selected narrowly scoped Drive access, archive-first deletion, and portable export with retrievable binaries plus manifest entries for unavailable files. |
| Deterministic core; optional intelligence | Pass | No AI capability is required or implemented in MVP. |

**Gate result**: Pass. No constitutional violations require complexity tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-job-application-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── application-api.openapi.yaml
└── tasks.md                         # Created by $speckit-tasks
```

### Source Code (repository root)

```text
app/
├── (authenticated)/
│   ├── dashboard/
│   ├── applications/
│   │   └── [applicationId]/
│   ├── library/
│   ├── search/
│   └── settings/
├── api/
│   ├── applications/
│   ├── assets/
│   ├── exports/
│   ├── search/
│   └── storage/
├── auth/
├── offline/
├── layout.tsx
└── page.tsx

components/
├── applications/
├── dashboard/
├── library/
├── shared/
└── ui/

lib/
├── auth/
├── domain/
├── repositories/
├── services/
├── storage/
├── offline/
└── validation/

prisma/
├── schema.prisma
└── migrations/

public/
├── manifest.webmanifest
└── icons/

tests/
├── unit/
├── integration/
├── contract/
└── e2e/
```

**Structure Decision**: One Next.js application owns UI, authenticated route handlers, server-side domain services, and persistence. `lib/domain` holds business rules independent of the UI; `lib/storage` isolates Google Drive; `app/api` implements a pragmatic documented browser contract. The MVP has no separately deployable API service or native MAUI client. Ownership/authorization services are explicit so a future tenant boundary can be introduced without making it an MVP concern.

## Post-design Constitution Check

All pre-design gates remain satisfied. The PWA cache is read-only, bounded to previously viewed critical information, clearable on sign-out, and does not introduce offline mutation queues or synchronization. Search stays in PostgreSQL. Google Drive is isolated behind a storage boundary and accessed through user-selected least-privilege authorization. The zero-or-one Submission invariant preserves formal-application history without a generic multi-submission model. No additional services, tenants, native clients, or automation were added.

## Remaining Architecture Decisions

- **Export delivery mechanics**: decide during implementation whether small exports stream directly and larger exports use a short-lived in-process job/result; no external job service is authorized for the MVP.
- **Drive picker implementation**: select the supported Google Picker/Drive flow that works with the final OAuth library while retaining user-selected `drive.file` access.
- **Offline cache budget and eviction**: set conservative per-user limits and eviction behavior during implementation; the cache remains read-only and excludes mutation queues.

## Complexity Tracking

No constitutional violations or unjustified complexity introduced.
