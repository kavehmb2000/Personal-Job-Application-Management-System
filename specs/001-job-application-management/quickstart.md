# Quickstart Validation: Personal Job Application Management

## Prerequisites

- Node.js 22 LTS or later.
- PostgreSQL 17 or compatible PostgreSQL version supported by the project.
- A Google account for authentication.
- Google OAuth credentials when testing Google OIDC and Google Drive integration.
- Google Drive API enabled for the OAuth project when testing Drive-backed Artefacts.
- Local environment values configured according to `.env.example`.
- Never commit credentials or other secrets.

## Setup and run

1. Install project dependencies:

   ```text
   npm install
   ```
2. Configure the local environment from 
```text
   .env.example.
   ```
3. Start PostgreSQL.
4. Apply the current Prisma migration:   
```text
   npx prisma migrate dev
   ```
5. Seed the development database:
```text
   npx prisma db seed
   ```
6. Verify that the database contains the canonical lifecycle configuration:

- DISCOVERED
- SUBMITTED
- IN_PROGRESS
- OFFER
- CLOSED
- CANCELLED
- REJECTED

and the fourteen allowed lifecycle transitions defined by the domain model.

7. Start the development server:
   ```text
   npm run dev
   ```
8. Sign in using the configured owner Google account.

9. Run the verification commands as implementation progresses:
```text
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
   ```
## End-to-end validation scenarios
### 1. Capture and progress an Opportunity
1. Create an Opportunity with company, position, location/country, source, discovery date, and optional job URL.
2. Confirm that the initial lifecycle state is DISCOVERED.
3. Confirm that the Kanban card presents the concise Opportunity information defined by the specification.
4. Move the Opportunity through valid lifecycle transitions using the accessible transition control.
5. Attempt an invalid lifecycle transition.
6. Confirm that the invalid transition is rejected.
7. Confirm that a successful lifecycle transition creates the corresponding OpportunityEvent.
8. Confirm that remaining in the same lifecycle state does not create an artificial lifecycle transition.

Expected:

- Valid transitions succeed.
- Invalid transitions are rejected.
- Lifecycle state and historical OpportunityEvents remain distinct.
- Terminal states cannot be moved forward through unsupported transitions.
### 2. Record a formal Submission
1.  Create an Opportunity in DISCOVERED.
2. Create or select the Artefacts required for the Submission.
3. Record the formal Submission, including its free-form submission method.
4. Confirm that the Opportunity moves to SUBMITTED.
5. Confirm that the Submission identifies the selected Artefacts.
6. Attempt to create a second Submission for the same Opportunity.

Expected:

- An Opportunity has zero or one formal Submission.
- The Submission method is stored as a string.
- The Submission is associated with the Opportunity and selected Artefacts.
- A second Submission for the same Opportunity is rejected.
- A later reapplication is represented by a new Opportunity.
### 3. Restore complete Opportunity context
1. Add an OpportunityNote.
2. Add one or more OpportunityEvents where appropriate.
3. Add a UserAction.
4. Schedule an event, such as an interview, recruiter call, presentation, challenge deadline, or follow-up.
5. Add a Contact and associate it with the Opportunity.
6. Record a Communication.
7. Associate relevant Artefacts with the Opportunity, event, Submission, or communication.
8. Open the Opportunity Workspace.

Expected:

- The Workspace presents the current Opportunity state and its relevant context with minimal navigation.
- Lifecycle history is represented by OpportunityEvents.
- Notes remain distinct from historical events.
- UserActions remain distinct from ScheduledEvents.
- Communications and Contacts remain distinct domain concepts.
- Scheduled interviews are represented through the scheduled-event model rather than a separate Interview persistence model.
### 4. Preserve reusable Artefacts and Submission history
1. Create an Artefact representing a CV.
2.   Associate it with multiple Opportunities where appropriate. 
3. Create another CV Artefact or update the relevant Artefact according to the implemented Artefact workflow. 
4. Submit one Opportunity using the selected CV Artefact. 
5. Associate later materials with the relevant Opportunity, Event, Submission, or Communication. 
6. Inspect the original Submission.

Expected:

- Artefacts can be reused across Opportunities through explicit associations.
- Submission records retain their selected Artefact references.
- Later materials do not silently create another Submission.
- A new formal application attempt is represented by a new Opportunity.
### 5. Validate optimistic concurrency
1. Open the same Opportunity in two browser sessions. 
2. Save a change in the first session. 
3. Attempt to save a conflicting change from the stale second session. 
4. Inspect the response and resulting data.

Expected:

- The stale update is rejected.
- The system does not silently overwrite the newer version.
- The client receives sufficient information to refresh and resolve the conflict.
### 6. Validate mobile and bounded offline read access
1. Open the application in a mobile viewport. 
2. View the Kanban and an Opportunity Workspace. 
3. Review previously accessed Opportunity information, events, actions, scheduled events, and relevant Artefact metadata. 
4. Disable network connectivity. 
5. Revisit previously cached critical information.

Expected:

- The responsive UI remains usable on mobile. 
- Previously cached critical information remains readable. 
- Cached information is clearly identified as potentially stale. 
- Creates, edits, lifecycle transitions, uploads, and other mutations are unavailable offline. 
- There is no offline mutation queue or synchronization workflow.
### 7. Validate ownership and authentication
1. Sign in using the configured owner account. 
2. Create or inspect an Opportunity and related records. 
3. Attempt authentication with an account that is not configured as the owner. 
4. Attempt to access owner-scoped API resources without an authenticated owner session.

Expected:

- The configured owner can access the application. 
- Owner-scoped records are accessible only within the owner's scope. 
- Unauthorized or non-owner access is rejected. 
- Ownership remains represented explicitly in the domain model so the architecture can evolve toward multi-tenant SaaS without changing the current single-user behavior.
### 8. Validate Google Drive and provider-neutral storage
1. Authorize Google Drive using the configured OAuth flow and approved least-privilege scope. 
2. Create or associate an Artefact backed by Google Drive. 
3. Retrieve its metadata/content through the application's storage abstraction. 
4. Simulate an unavailable provider reference. 
5. Revoke or invalidate the Drive authorization and inspect the resulting behavior.

Expected:

- Google Drive is used through the provider-neutral StorageProvider abstraction. 
- Provider-specific identifiers do not become part of the domain model. 
- An unavailable external file does not silently destroy its Artefact metadata or historical associations. 
- Authorization failures are handled explicitly and safely.
### 9. Validate archive, restore, deletion, and export
1. Archive an Opportunity. 
2. Confirm that it is no longer presented as an active Opportunity. 
3. Restore it. 
4. Inspect its history and related records. 
5. Start the permanent-deletion workflow. 
6. Confirm that explicit confirmation is required. 
7. Request an export.

Expected:

- Archive is reversible.
- Restore preserves the Opportunity's historical context.
- Permanent deletion requires explicit confirmation.
- Export contains the structured domain data and relevant Artefact metadata/provider references.
- External binaries that cannot be retrieved are explicitly identified rather than silently omitted.
### Verification checklist
- [ ] Dependencies install successfully.
- [ ] PostgreSQL is reachable.
- [ ] Prisma migration succeeds.
- [ ] Prisma seed succeeds.
- [ ] Seven canonical lifecycle states exist.
- [ ] Fourteen allowed lifecycle transitions exist.
- [ ] Opportunity has no priority field.
- [ ] Submission method is stored as a string.
- [ ] Opportunity has zero or one Submission.
- [ ] Invalid lifecycle transitions are rejected.
- [ ] Successful lifecycle transitions create the corresponding OpportunityEvent.
- [ ] Owner isolation is enforced.
- [ ] Optimistic concurrency rejects stale updates.
- [ ] Artefacts can be associated with Opportunities and other supported contexts.
- [ ] UserActions and ScheduledEvents remain distinct.
- [ ] Contacts and Communications work within owner scope.
- [ ] Opportunity Workspace presents the relevant context.
- [ ] Kanban represents lifecycle state and next scheduled event.
- [ ] Search and core filters work.
- [ ] Google OIDC authentication works.
- [ ] Google Drive works through StorageProvider.
- [ ] Export works.
- [ ] Archive and restore work.
- [ ] Permanent deletion requires explicit confirmation.
- [ ] Mobile layouts work.
- [ ] Previously viewed critical information is readable offline.
- [ ] Mutations are blocked offline.
- [ ] npm run typecheck succeeds.
- [ ] npm run lint succeeds.
- [ ] npm test succeeds.
- [ ] npm run build succeeds.
- [ ] npm run test:e2e succeeds.
### Contract and model references
- Data model
- Specification
- Implementation plan
- API contract