# Constitution — Personal Job Application Management System

## Preamble

This project is a personal, single-user Job Application Management System intended to manage a complex European job search across multiple professional profiles, CV variants, application artifacts, communications, interviews, preparation activities, and reusable professional evidence.

The system exists to reduce cognitive overhead and preserve context. It is not intended to become a generic ATS, CRM, project-management platform, or demonstration of architectural sophistication.

This constitution establishes the enduring principles that govern product design, specification, architecture, implementation, and evolution of the system.

Detailed functional requirements belong in specifications. Detailed architecture and technology choices belong in Architecture & Technology Stack decisions. Implementation tasks belong in the task plan.

---

## Article I — User Value Above Technology

The system MUST optimize for the user's ability to manage a complex job search effectively.

Technical sophistication MUST NOT be treated as a product objective in itself.

When multiple designs provide substantially the same user value, the simpler design MUST be preferred.

New technologies, frameworks, infrastructure, abstractions, or integrations MUST justify their complexity through a concrete user or engineering benefit.

**Implication:** The project SHOULD favor understandable solutions over fashionable or unnecessarily elaborate ones.

---

## Article II — Personal System, Multi-Device Access

The system MUST be designed for a single user while supporting access from multiple personal devices.

The architecture MUST NOT introduce multi-tenancy, organizational administration, roles, or collaboration features unless a future requirement makes them genuinely necessary.

The user SHOULD be able to access important job-search information without carrying a primary development or work computer.

**Implication:** Mobile and browser access are product requirements, not secondary conveniences.

---

## Article III — Context Is the Core Product

The primary value of the system is preserving and presenting the context surrounding each job opportunity.

For any opportunity, the system SHOULD make it possible to understand:

* what the opportunity is;
* why it was pursued;
* what was submitted;
* what has happened;
* what is happening next;
* what preparation has been completed;
* what remains to be done;
* which professional evidence is relevant.

The system SHOULD minimize the amount of information the user must reconstruct from memory, email, files, browser history, or external applications.

---

## Article IV — Information Should Be Stored Once and Reused

Reusable professional assets MUST be represented independent of individual applications whenever practical.

Examples include:

* CV versions;
* cover-letter versions;
* documents;
* portfolio/evidence items.

Applications SHOULD reference reusable assets rather than creating unnecessary copies.

Historical associations MUST nevertheless remain trustworthy: the system MUST be able to determine which version of an asset was associated with a particular submission.

---

## Article V — Current State and Historical Record Are Different Concepts

The current application status represents **where the opportunity is now**.

The timeline and historical records represent **what happened**.

The system MUST preserve important historical events independently of the current state.

Status changes, submissions, communications, interviews, challenges, and other significant interactions SHOULD be reconstructable chronologically.

Changing the current state MUST NOT erase relevant historical information.

---

## Article VI — Progressive Complexity

The MVP MUST contain the smallest coherent set of capabilities that provides meaningful value.

Complexity SHOULD be introduced only when justified by:

1. a concrete user requirement;
2. a demonstrated operational problem; or
3. a clear architectural necessity.

Features that can be deferred without compromising the core workflow SHOULD be deferred.

The system MUST NOT introduce infrastructure or abstractions merely because they may become useful someday.

---

## Article VII — Simplicity of User Interfaces

The user interface SHOULD expose the information required for the user's immediate decision rather than exposing all available metadata simultaneously.

Different views have different purposes.

The Kanban SHOULD provide a concise operational overview.

The Application Workspace SHOULD provide complete context.

The Timeline SHOULD provide history.

The Dashboard SHOULD provide aggregate information.

Libraries SHOULD provide reusable assets.

Information SHOULD be stored when useful even when it is intentionally omitted from a particular visual representation.

---

## Article VIII — The Application Workspace Is the Primary Context

The Application Workspace MUST be treated as the central interaction surface of the product.

A user opening an application SHOULD be able to reach, with minimal navigation:

* job information;
* current status;
* next event;
* documents;
* communications;
* timeline;
* interviews;
* preparation;
* notes;
* relevant links;
* evidence;
* contacts.

The Workspace SHOULD reduce context switching rather than merely provide links to separate database screens.

---

## Article IX — The Kanban Is an Overview, Not a Database Dump

The Kanban MUST remain intentionally simple.

A card SHOULD primarily communicate:

* position;
* company;
* country/location;
* next event.

The column communicates the current status and SHOULD therefore not be redundantly displayed as primary card information.

Role family, fit score, priority, days in status, and similar metadata MAY exist in the domain and MAY be used for filtering, search, reporting, or other views, but SHOULD NOT unnecessarily clutter Kanban cards.

The Kanban MUST remain useful at a glance.

---

## Article X — Explicit Next Actions, Distinct From Events

A future event and a user action are different concepts.

For example:

> Interview tomorrow

and:

> Prepare system-design examples

represent different kinds of information.

The system SHOULD preserve this distinction.

Upcoming events SHOULD communicate what is happening.

Preparation and next-action mechanisms SHOULD communicate what the user needs to do.

The interface SHOULD surface each in the context where it is most useful.

---

## Article XI — Domain Integrity Over UI Convenience

Business rules and domain invariants MUST NOT depend exclusively on a particular client implementation.

Client applications MAY present, simplify, cache, or combine information for usability, but the authoritative business rules MUST remain independent of the user interface.

The system SHOULD support multiple clients without duplicating core domain logic unnecessarily.

---

## Article XII — Integration-Ready, Integration-Independent MVP

The domain SHOULD be designed so that future integrations can be added without restructuring the core product.

Potential future integrations may include:

* email;
* calendars;
* job sources;
* GitHub;
* cloud storage;
* AI capabilities.

However, the MVP MUST NOT depend on those integrations unless they are part of an explicitly approved requirement.

Manual workflows are acceptable when they provide the required user value without unnecessary integration complexity.

Future capability MUST NOT become present-day architecture tax without a concrete reason.

---

## Article XIII — External Services Are Boundaries, Not Domain Concepts

External providers SHOULD be isolated behind clear application or infrastructure boundaries.

The core domain SHOULD NOT become tightly coupled to a specific provider merely because that provider is used by the initial implementation.

External services may change.

The underlying job-search concepts should remain stable.

For example, document storage is a domain capability; a particular cloud-storage provider is an implementation detail.

---

## Article XIV — Privacy, Security, and Ownership

The system contains highly personal professional information and potentially sensitive documents.

Privacy and security MUST be treated as first-class requirements.

The system SHOULD follow least-privilege principles when accessing external services.

The user MUST retain practical ownership and recoverability of their data.

Data SHOULD NOT become inaccessible solely because the application is unavailable.

The design SHOULD support reliable backup and export of important structured data and documents.

---

## Article XV — Deterministic Core, Optional Intelligence

The core application MUST remain useful without artificial intelligence.

AI MAY later enhance capabilities such as:

* requirement extraction;
* CV recommendation;
* evidence recommendation;
* preparation generation;
* communication summarization;
* interview preparation;
* qualification analysis.

Such capabilities SHOULD be implemented as additional services or capabilities around the core domain rather than making AI a prerequisite for basic operation.

AI output MUST NOT silently replace authoritative user-entered information.

---

## Article XVI — Specifications Precede Implementation

Requirements SHOULD be expressed and clarified before implementation begins.

Implementation MUST follow the agreed specification and recorded architectural decisions.

Ambiguities, contradictions, and significant scope changes SHOULD be resolved explicitly rather than being silently encoded in implementation.

The project SHOULD use GitHub Spec Kit artifacts as the primary mechanism for maintaining this specification-driven development process.

---

## Article XVII — Decisions Must Be Explicit

Significant architectural, technological, and product trade-offs MUST be documented.

Decisions SHOULD record:

* the problem;
* relevant alternatives;
* the chosen approach;
* the rationale;
* important consequences;
* conditions under which the decision may be revisited.

Architectural choices MUST NOT become accidental commitments merely because they happened to appear first in code.

Detailed architecture and technology choices belong in the project's Architecture & Technology Stack decision artifacts, not in this constitution.

---

## Article XVIII — Testability and Maintainability

The system MUST remain understandable and maintainable by its sole developer.

Code SHOULD favor:

* clear boundaries;
* meaningful names;
* explicit behavior;
* automated tests for important business rules;
* small, comprehensible components;
* predictable failure modes.

Testing SHOULD prioritize domain behavior and critical workflows over superficial coverage metrics.

---

## Article XIX — Reliability Over Feature Count

A small system that reliably preserves application history is more valuable than a large system with fragile automation.

Critical information MUST NOT depend on best-effort behavior when a deterministic alternative exists.

The system SHOULD fail safely, preserve existing information, and make errors visible to the user.

---

## Article XX — Evolution Without Overengineering

The architecture SHOULD permit future growth, but future possibilities MUST NOT dictate present complexity.

A design is considered successful when it provides a clean path toward future capabilities while remaining appropriately small for the current problem.

The project SHOULD prefer:

> **simple now, extensible where cheap, redesign where genuinely necessary**

over speculative generalization.

---

## Governance

This constitution supersedes conflicting informal assumptions about the project.

New requirements MAY extend or refine the constitution, but changes MUST be intentional and documented.

When a proposed feature conflicts with a constitutional principle, the specification SHOULD explicitly identify the conflict and document why the principle is being retained, modified, or overridden.

The constitution itself SHOULD remain relatively stable. Detailed requirements, implementation techniques, technology choices, and UI details belong in downstream specification artifacts.

---

## Foundational Rule

When faced with competing implementation or product choices, apply this rule first:

> **Choose the simplest design that preserves the user's actual outcome, the integrity of the domain, and the long-term maintainability of the system.**

This project exists to make a complicated job search simpler—not to make a complicated software system.
