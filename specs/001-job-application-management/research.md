# Research: Personal Job Application Management

## Decision 1: Use a modular-monolith responsive web application

**Decision**: Use one Next.js App Router application written in TypeScript and deployed as one Node.js service, with an installable responsive PWA as the MVP client.

**Rationale**: A single codebase provides the browser and mobile-responsive experience, server-rendered authenticated views, and mutation endpoints without the overhead of a separate SPA and API. It directly supports the single-user scope and constitution's simplicity rule. [Next.js App Router documentation](https://nextjs.org/docs/app) describes the application model; [deployment guidance](https://nextjs.org/docs/app/getting-started/deploying) supports Node.js deployment.

**Alternatives considered**:

- Separate SPA and API: rejected because it adds auth, deployment, and contract overhead without user value.
- Separate native MAUI client: explicitly deferred. The PWA must serve mobile Kanban, Workspace, document access, preparation, timeline, upcoming events, and quick status/event/task/note entry; reconsider native only when a required capability cannot be delivered adequately in the PWA.
- Static site: rejected because authenticated records and mutations require server capabilities.

## Decision 2: Use PostgreSQL with Prisma for the system of record

**Decision**: Use managed PostgreSQL and Prisma ORM with committed, reviewed schema migrations.

**Rationale**: The domain has many normalized, relational, chronological records and needs structured filters, dashboard aggregates, immutable submission snapshots, and full-text search. PostgreSQL handles these in one database; Prisma provides typed access and migrations. PostgreSQL documents built-in full-text querying and ranking in its [text search controls](https://www.postgresql.org/docs/current/textsearch-controls.html). Prisma's current [PostgreSQL quickstart](https://www.prisma.io/docs/next/quickstart/postgresql) supports the selected ORM.

**Alternatives considered**:

- SQLite: rejected for shared hosted, multi-device access.
- Document database: rejected because relationships, history, filters, and reporting would be more complex.
- Separate search infrastructure: rejected by explicit MVP exclusion.

## Decision 3: Use Google OIDC and constrained owner access

**Decision**: Authenticate with Google OpenID Connect authorization-code flow, use secure server-managed sessions, and allow only the configured owner for the MVP. Keep the external identity mapping separate from core domain entities and apply ownership/authorization through an explicit boundary.

**Rationale**: Google sign-in is a stated product constraint. Server-side OAuth avoids exposing long-lived credentials to the browser; configured-owner access implements the single-user boundary without roles. Explicit ownership avoids treating data as globally ownerless and leaves a clean future seam for multi-tenancy without building it now. Google's [OpenID Connect guide](https://developers.google.com/identity/openid-connect/openid-connect) recommends using a prewritten library and documents the server flow.

**Alternatives considered**:

- Password accounts: rejected because they add credential management contrary to the stated Google-auth MVP.
- Browser-managed implicit tokens: rejected for increased handling risk and complexity.
- Multi-user authorization model: rejected by scope.

## Decision 4: Keep Drive provider-specific behavior behind a storage boundary

**Decision**: Define a `StorageProvider` interface; implement `GoogleDriveStorageProvider` for initial file upload, selection, metadata lookup, download/reference generation, and deletion where authorized.

**Rationale**: Core records store provider-neutral document metadata and references, while the Drive adapter stores provider IDs and handles OAuth tokens. Request the narrow `drive.file` scope and use user-selected files where applicable. Google recommends `drive.file` with Picker for a safer, user-controlled scope in its [Drive authorization guide](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

**Alternatives considered**:

- Put Drive IDs and concepts into the core document model: rejected because it prevents later provider replacement.
- Broad Drive access scope: rejected because it violates least privilege.
- Store documents only in application storage: rejected because the requested initial provider is Drive and recoverability benefits from user-controlled copies.

## Decision 5: Provide bounded read-only offline fallback

**Decision**: Deliver an installable PWA that caches the app shell plus previously viewed critical workspace summaries, timelines, preparation notes, and selected document metadata. Display the last successful refresh time, disable all writes offline, and do not queue mutations.

**Rationale**: This meets the practical read-only offline requirement without creating synchronization or conflict-resolution complexity. Service workers can intercept requests and serve cached responses; cache contents are only as fresh as the prior access, as documented by [MDN's service-worker guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) and [PWA caching guidance](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching). Cached user data is cleared on sign-out; document binaries are not cached by default.

**Alternatives considered**:

- Full offline-first synchronization and mutation queue: rejected as explicitly outside MVP scope.
- Network-only behavior: rejected because it fails the stated temporary-connectivity goal.
- Cache every Drive file: rejected for privacy, storage, eviction, and implementation cost.

## Decision 6: Resolve concurrent edits explicitly with optimistic concurrency

**Decision**: Editable records expose a version token. Writes include the token; stale writes are rejected and both the server record and user draft are retained for comparison and explicit resolution. Append-only activity records are created independently to reduce conflicts.

**Rationale**: The user explicitly chose review-before-overwrite. `ETag` and `If-Match` semantics provide standard optimistic locking; a failed condition returns `412 Precondition Failed`, as documented by [MDN conditional requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests) and [RFC 9110 §13.1.1](https://www.rfc-editor.org/rfc/rfc9110#section-13.1.1).

**Alternatives considered**:

- Last-write-wins: rejected because it can silently lose personal career information.
- Edit locks: rejected as fragile and unnecessary for one user.
- Automatic field merge/CRDTs: rejected as unjustified complexity.

## Decision 7: Export a portable snapshot and document manifest

**Decision**: Provide an authenticated on-demand ZIP portable backup with structured JSON and/or CSV records, a manifest, document metadata, provider references, checksums where available, and every Google Drive binary retrievable under the granted authorization. Each unavailable binary has a manifest entry with its reference, retained metadata, and reason it could not be included.

**Rationale**: A references-only export is not a complete backup. Including retrievable binaries gives the user practical recovery while manifesting exceptions honestly, without requiring a background backup system.

**Alternatives considered**:

- Database-only backup: rejected because it is not user-friendly or independently useful.
- Automatic external backup/sync: deferred as unnecessary operational complexity.

## Decision 9: Model one formal submission per pursued opportunity

**Decision**: `Application` represents one pursued job opportunity and has zero or one `Submission`. A Submission is only the original formal application to the employer and snapshots the CV and optional cover-letter versions used. A later attempt at the same role is a new Application.

**Rationale**: The lifecycle remains comprehensible and preserves exact formal-application history without speculative multi-submission complexity. Updated CVs, extra information, coding challenges, take-homes, presentations, and interview material are later lifecycle activity represented by TimelineEvent, Communication, DocumentAsset/ApplicationDocument, Interview, and PreparationTask as appropriate.

**Alternatives considered**:

- Generic multi-submission model: rejected because no concrete MVP requirement needs it and it mislabels later employer interactions as applications.
- Treat every sent artifact as a submission: rejected because it loses the distinction between applying and progressing an existing pursuit.

## Decision 8: Test domain behavior and the primary user journeys

**Decision**: Use Vitest for domain and service tests, integration tests for persistence/auth/storage boundaries, and Playwright for end-to-end desktop and mobile viewport journeys.

**Rationale**: This prioritizes the constitution's critical workflow behavior: submissions, history, status changes, exports, conflicts, and storage failures. Playwright supports device emulation in its [test tooling documentation](https://playwright.dev/docs/codegen).

**Alternatives considered**:

- UI-only test suite: rejected because invariants must not depend on a client.
- Coverage-only target: rejected because meaningful workflow validation is more valuable.
