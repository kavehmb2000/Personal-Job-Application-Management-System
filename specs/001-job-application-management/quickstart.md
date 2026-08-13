# Quickstart Validation: Personal Job Application Management

## Prerequisites

- Node.js 22 LTS and the selected package manager.
- A PostgreSQL database configured for the application.
- Google OAuth client credentials with the local and deployed redirect URIs registered.
- Google Drive API enabled for the OAuth project; request only the chosen least-privilege scope.
- Environment values for the owner email, database connection, application session secret, and Google credentials. Never commit credentials.

## Setup and run

1. Install project dependencies using the package manager selected in implementation.
2. Configure local environment variables from the project's example environment file.
3. Apply Prisma migrations and seed default lifecycle statuses and role families.
4. Run the development server and sign in using the configured owner Google account.
5. Run unit/integration tests, then Playwright end-to-end tests. The task plan will provide exact commands after the project is scaffolded.

## End-to-end validation scenarios

### 1. Capture, submit, and move an application

1. Create an opportunity with company, position, country/location, source, discovery date, job URL, and Discovered status.
2. Confirm its Kanban card shows only position, company, location, and next-event state.
3. Add a CV and optional cover-letter library version; record the one formal submission.
4. Change status by accessible control and by drag interaction.
5. Confirm the Workspace shows the correct status and chronological system-generated submission and status-change events.

Expected: all changes save online, immutable submission snapshots remain visible, and the Kanban is not cluttered by excluded metadata.

### 2. Restore complete context

1. Add a contact, manual communication, interview, preparation task, Markdown note, relevant link, application document, and evidence item.
2. Open the Application Workspace.
3. Confirm each context category is available with minimal navigation; confirm upcoming event and next action are visually distinct.

Expected: the workspace restores current state, history, materials, and unfinished preparation in one application-oriented view.

### 3. Preserve reusable assets and historical submissions

1. Associate one CV and one evidence item with two applications.
2. Add a later CV version after submitting the first application.
3. Add a recruiter-requested updated CV or take-home document, linking it to an appropriate timeline event or communication; inspect the first submission and reusable library.

Expected: both applications can use shared assets, the formal Submission continues to identify the original CV version, and the later material is application activity rather than another Submission. Attempting a second formal submission on the same Application is rejected with guidance to create a new Application.

### 4. Validate conflict protection

1. Open the same application on two browser sessions.
2. Save a change in the first session.
3. Save a conflicting change with the stale version from the second session.
4. Review and resolve through the conflict UI.

Expected: the stale save is rejected, neither change is silently lost, and the user can choose the resulting value.

### 5. Validate mobile and temporary offline use

1. In a mobile viewport, view the Kanban and an Application Workspace, open an attached CV/document, review preparation and timeline, view an upcoming interview/event, then add a quick note/event/task, complete a task, and change status while online.
2. Reopen selected critical data, then temporarily disable connectivity.
3. Revisit the cached workspace.

Expected: previously cached read-only information is visible with its last-refresh indication; creates, edits, uploads, and status changes are unavailable offline.

### 6. Validate privacy, storage, and recovery

1. Attempt sign-in with a Google account other than the configured owner.
2. Connect Drive using the approved least-privilege, user-selected-file flow and associate a document.
3. Simulate a provider failure while reading a document reference.
4. Archive an application, restore it, then inspect permanent-deletion confirmation.
5. Request an export.

Expected: non-owner access is denied; Drive failure preserves metadata/history; archive is reversible; deletion requires confirmation; export contains structured JSON and/or CSV, a manifest, document metadata/provider references, every binary retrievable under granted authorization, and an explicit manifest reason for each unavailable binary.

## Contract and model references

- [Data model](./data-model.md)
- [Browser API contract](./contracts/application-api.openapi.yaml)
- [Specification](./spec.md)
