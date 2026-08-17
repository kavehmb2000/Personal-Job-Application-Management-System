# Research: Personal Job Application Management

## 1. Purpose

This document records the architectural and domain research decisions that support the current MVP. It is intentionally subordinate to `spec.md`, `data-model.md`, `plan.md`, and the active Prisma schema. It records the reasoning behind the selected design rather than restating those documents.

## 2. Architecture Direction

The MVP is a single-user responsive web application implemented as a modular monolith:

- Next.js + React + TypeScript
- PostgreSQL + Prisma
- Google OIDC authentication
- Google Drive as the initial external storage provider
- provider-neutral `StorageProvider` abstraction
- responsive PWA
- bounded read-only offline support

The architecture keeps explicit ownership boundaries even though the MVP has only one permitted owner. `ownerId` is an authorization boundary and future SaaS evolution point; it is not a multi-tenant implementation.

The application is intentionally not decomposed into microservices. Domain services and repositories provide the required separation while keeping deployment and development simple.

## 3. Opportunity-Centric Domain

The central domain concept is `Opportunity`. It represents a job opportunity/position being tracked from discovery through its eventual outcome.

This replaces the previous Application-centric design. The revised model deliberately does not recreate the former `Application` aggregate or its associated persistence model.

The Opportunity aggregate owns or relates to contextual records including:

- `OpportunityNote`
- `OpportunityEvent`
- `UserAction`
- `ScheduledEvent`
- `OpportunityArtefact`
- `Submission`
- `OpportunityContact`
- `Communication`

Derived views such as Kanban and Opportunity Workspace are read models, not additional aggregate roots.

## 4. Lifecycle State Machine

The lifecycle uses seven stable semantic states:

```text
DISCOVERED
SUBMITTED
IN_PROGRESS
OFFER
CLOSED
CANCELLED
REJECTED
```

`LifecycleStateKey` provides stable semantic identity while `LifecycleStatus` permits owner-scoped labels and ordering. `LifecycleTransition` persists the allowed state changes.

The FSM contains fourteen allowed transitions. The implementation must use the persisted transition graph rather than hard-code an alternative workflow.

Important conclusions:

- `In Progress → In Progress` is not a lifecycle transition.
- `Offer → In Progress` is invalid.
- `Closed`, `Cancelled`, and `Rejected` are terminal.
- Terminal states have no outgoing transitions.
- Significant activity can occur without changing lifecycle state.
- State-changing operations create corresponding historical `OpportunityEvent` records.
- An accepted Offer remains in `Offer` for the MVP and is visually distinguished rather than moved to a new state.

## 5. Submission

A formal submission is represented by `Submission` and is associated one-to-one with `Opportunity`.

The database enforces the zero-or-one rule through the unique Opportunity association. A Submission exists only after the user has successfully submitted externally; the MVP does not automate job submission.

`Submission.method` is intentionally a nullable string. The MVP does not invent or enforce an enum of submission methods because the real-world set of methods is not sufficiently known.

A Submission may reference the CV and cover-letter Artefacts used for that submission. A later application attempt is represented by a new Opportunity rather than a second Submission on the same Opportunity.

## 6. Historical Events, Notes, Actions, and Scheduled Events

The revised model separates concepts that were previously mixed together.

### OpportunityEvent

`OpportunityEvent` records historical domain/activity information. Examples include submission, lifecycle changes, interviews, document requests, challenges, communications, and custom significant events.

Not every edit is an event. In particular, association changes and ordinary note editing do not automatically create historical events.

### OpportunityNote

A note is contextual user-owned information. It is not automatically an OpportunityEvent.

### UserAction

A UserAction represents work the user needs to perform, such as preparing interview examples or sending a requested document. It has its own status, priority, due date, and completion information.

### ScheduledEvent

A ScheduledEvent represents something expected to happen at a particular time, such as an interview, recruiter call, presentation, challenge deadline, or follow-up.

Scheduled events are deliberately distinct from both UserActions and historical OpportunityEvents. An interview is therefore a valid domain concept without requiring a separate `Interview` persistence model.

## 7. Artefacts

`Artefact` is the generalized reusable asset/document concept. It can represent CVs, cover letters, job descriptions, company research, presentations, portfolio evidence, transcripts, certificates, audio, video, or other material.

Artefacts have independent identity and can be associated explicitly with:

- Opportunities through `OpportunityArtefact`
- OpportunityEvents through `EventArtefact`
- Submissions through their CV/cover-letter references
- Communications through `CommunicationArtefact`

The association itself is not a domain event.

Artefact immutability is a documented domain intention, but the MVP does not add elaborate application-level mechanisms to enforce immutable content changes. As a single-user MVP, that complexity is intentionally deferred.

## 8. Storage Boundary

Storage is provider-neutral at the domain boundary. `StorageProvider` owns provider-specific concerns such as authorization, provider identifiers, metadata retrieval, content retrieval, and export retrieval.

Google Drive is the initial implementation. Google Drive identifiers, scopes, and provider-specific concepts must not leak into Opportunity or Artefact domain logic.

The MVP does not require a general local binary repository. An Artefact can contain Markdown content, an external URL, or a provider-backed storage reference according to the domain rules.

## 9. Ownership and Authentication

`OwnerAccount` represents the permitted principal. Google OIDC establishes identity, while owner resolution establishes whether the authenticated account is authorized to use the MVP.

Owner-scoped records carry or inherit an explicit ownership boundary. Repository operations must apply owner scope consistently rather than relying on callers to remember it.

This supports future multi-tenant SaaS evolution without prematurely implementing tenants, organizations, roles, collaboration, or billing.

## 10. Concurrency

Independently editable aggregate roots use optimistic concurrency. The client supplies the version it observed; a stale version causes the update to be rejected rather than silently overwriting newer data.

The conflict protocol should return enough information for the client to refresh and allow the user to resolve the conflict. The design does not require a sophisticated merge engine for the MVP.

## 11. Kanban, Workspace, Search, and Dashboard

Kanban and Workspace are projections of the domain rather than separate persistence models.

The Kanban primarily communicates current lifecycle state. A card is intentionally concise and should focus on position, company, country/location, and next scheduled event. `Offer` remains a dedicated column; accepted offers remain there with a visual distinction.

The Opportunity Workspace is the main context surface. It brings together job information, lifecycle state, next scheduled event, next actions, Artefacts, historical events, notes, communications, contacts, and related operational context.

Core MVP search/filter dimensions are:

- company
- position
- role family
- country/location
- lifecycle state
- source

The operational dashboard emphasizes actionable Opportunities, upcoming scheduled events, overdue actions, and Offers. Terminal Opportunities remain searchable and historically accessible.

## 12. Communications and Contacts

Communications are lightweight, manually entered records. The MVP does not synchronize Gmail or Outlook. A significant communication may also create an OpportunityEvent, but the communication record and historical event remain distinct.

Contacts provide lightweight contextual information for recruiters, hiring managers, interviewers, referrals, HR contacts, and similar people. The MVP does not attempt to become a general-purpose CRM.

## 13. Archive, Deletion, and Audit

Archiving removes records from normal operational views without destroying their retained history. Restoration is supported while the record remains retained.

Permanent deletion requires explicit confirmation and should identify relevant relationships and consequences before destructive execution.

`AuditEvent` records security-sensitive actions such as sign-in, denied access, export, archive, restore, permanent deletion, and Google Drive authorization changes.

## 14. Export and Recovery

Export is designed to be portable and provider-aware without coupling the domain to Google Drive. Structured records, lifecycle history, contextual records, Artefact metadata, and provider references should be represented.

When an external binary cannot be retrieved under the granted authorization, the export should retain the metadata/reference and explicitly record why the binary was unavailable rather than silently omitting it.

## 15. Offline Strategy

Offline support is deliberately bounded. The MVP may retain previously viewed critical information so it can be read when connectivity is temporarily unavailable.

Offline mode is read-only:

- no creates
- no edits
- no lifecycle transitions
- no uploads
- no mutation queue
- no synchronization subsystem
- no offline conflict-resolution workflow

Cached information must be identifiable as potentially stale. External-storage binaries are not treated as a general offline document repository.

## 16. Why the Revised Model Is Preferable

The Opportunity-centric model reduces several forms of accidental complexity present in the previous design.

First, one domain object represents the job opportunity throughout its lifecycle instead of separating discovery/application concerns into an Application-centric aggregate. Second, historical activity, future work, scheduled events, communications, and contextual notes have explicit semantics instead of being forced into a single timeline abstraction. Third, Artefact provides one reusable asset concept rather than separate persistence models for CVs, cover letters, documents, and evidence.

The result is a smaller set of domain concepts that can still represent the real workflow without prematurely encoding uncertain business rules.

## 17. Deliberate Non-Goals

The research supports keeping the following outside the MVP:

- automated job submission
- Gmail/Outlook synchronization
- calendar synchronization
- LinkedIn integration
- job scraping or automatic discovery
- browser extensions
- AI agents and automatic content generation
- automatic requirement extraction
- automatic interview detection
- workflow engines
- microservices
- dedicated search infrastructure
- full CRM functionality
- full offline synchronization
- offline mutation queues
- multi-user collaboration
- actual multi-tenancy
- RBAC
- billing

## 18. Research Conclusions

The current design favors explicit domain boundaries, a small number of stable aggregates, persisted lifecycle configuration, owner-scoped repositories, provider-neutral storage, and deliberately bounded MVP behavior.

Where the domain is uncertain, the MVP prefers simple representations over invented taxonomies. The clearest example is `Submission.method`: it remains a string rather than an enum. Similarly, the system uses the existing `ScheduledEventType.INTERVIEW` and `OpportunityEvent` concepts rather than creating a separate Interview persistence aggregate.

The authoritative implementation contract remains the combination of `spec.md`, `data-model.md`, `plan.md`, and the active Prisma schema. This document should be updated when research changes an architectural decision; it should not become a competing specification.
