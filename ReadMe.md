# Personal Job Application Management System

A lightweight personal ATS, application CRM, and preparation workspace for managing a complex European job search across multiple professional profiles, CV variants, application documents, communications, interviews, and reusable professional evidence.

The system is designed for one user, but accessible across personal desktop and mobile devices.

## Why this project exists

Managing a large job search with several specialized CVs quickly becomes a context-management problem rather than a simple application-tracking problem.

For each opportunity, the system should make it easy to answer:

* What is the position and company?
* Where is it located?
* Why did I pursue it?
* Did I apply, and when?
* Which CV and cover letter did I use?
* What documents and evidence did I submit?
* What communications have occurred?
* What interviews or other events are coming?
* What preparation have I completed?
* What do I need to do next?
* What happened throughout the process?

The goal is to maintain a reliable, searchable record of the entire application journey while keeping day-to-day interaction fast and simple.

## Product Philosophy

This is deliberately **not** intended to become a generic enterprise ATS or CRM.

The guiding principle is:

> Choose the simplest design that preserves the user's actual outcome, the integrity of the domain, and the long-term maintainability of the system.

The product prioritizes:

* context preservation
* low cognitive overhead
* fast data entry
* strong visual overview
* reusable professional assets
* trustworthy historical records
* multi-device accessibility
* progressive complexity

See [`constitution.md`](constitution.md) for the project's governing principles.

## Core UX

### Application Kanban

The Kanban is the primary overview of the job search.

Each card intentionally remains simple:

* Position
* Company
* Country/location
* Next event

The Kanban column communicates the current status.

Additional application metadata such as role family, fit score, priority, and dates remains available where useful, but is deliberately kept out of the primary card presentation.

### Application Workspace

The Application Workspace is the central view for an individual opportunity.

It brings together:

* job information
* current status
* next event
* timeline
* documents
* communications
* interviews
* preparation
* notes
* relevant links
* evidence / portfolio
* contacts

The workspace should restore the complete context of an opportunity without requiring the user to search through multiple external systems.

### Reusable Libraries

Professional assets are managed independently and reused across applications.

Examples include:

* CV versions
* cover-letter versions
* documents
* portfolio / evidence items

The system must preserve the exact versions associated with historical submissions.

## Application Lifecycle

The initial workflow includes states such as:

```text
Discovered
    ↓
Evaluating
    ↓
Preparing
    ↓
Ready to Apply
    ↓
Applied
    ↓
Recruiter Contact
    ↓
Screening
    ↓
Interview
    ↓
Technical Challenge
    ↓
Final Interview
    ↓
Offer
```

Terminal outcomes include:

```text
Rejected
Withdrawn
Closed / No Response
```

The exact workflow is configurable where that adds value without introducing unnecessary complexity.

## Multi-Device Access

The system is intended to be usable from:

* desktop browsers
* mobile devices
* other personal devices in the future

Mobile access is particularly important for:

* viewing CVs and documents
* reviewing preparation
* completing preparation tasks
* checking the Kanban
* reviewing timelines
* viewing upcoming interviews
* taking notes
* changing application status
* adding opportunities and events

The system should remain useful even when the user does not have their main development/work laptop available.

## Data and Documents

Application data and documents are conceptually separate.

Structured application data contains information such as:

* applications
* status
* events
* communications
* interviews
* preparation
* contacts
* evidence associations

Documents are stored through an external storage abstraction.

The initial intended document provider is **Google Drive**.

The application should not become tightly coupled to a specific storage provider.

## Authentication

The initial authentication strategy is based on the user's Google identity.

The system is single-user by design. Multi-tenancy and enterprise identity management are intentionally outside the MVP scope.

## Development Method

This project uses **Spec-Driven Development with GitHub Spec Kit**.

The intended workflow is:

```text
Constitution
    ↓
Specification
    ↓
Clarification
    ↓
Architecture & Technology Decisions
    ↓
Plan
    ↓
Tasks
    ↓
Implementation
    ↓
Analysis / Review
```

Specifications and architectural decisions are treated as first-class project artifacts.

Implementation should follow explicit decisions rather than allowing architecture to emerge accidentally from code.

## Current Development Status

The project is currently in the **product specification / pre-architecture phase**.

Completed:

* product vision and scope established
* project constitution established
* initial MVP specification created
* clarification pass completed
* Spec Kit configured
* Codex configured as the Spec Kit coding agent

Next major step:

**Architecture & Technology Stack / implementation planning**

Concrete implementation technologies and detailed architecture should be documented through the appropriate decision and planning artifacts rather than prematurely embedded in the constitution.

## MVP Scope

The MVP is expected to include:

* application CRUD
* application Kanban
* application workspace
* status management
* reusable CV library
* reusable cover-letter library
* document associations
* timeline / event history
* communications
* interviews
* preparation tasks
* preparation notes
* relevant links
* contacts
* evidence / portfolio library
* dashboard
* search and filtering
* multi-device access
* Google-based authentication
* Google Drive document storage

The MVP deliberately excludes:

* email synchronization
* calendar synchronization
* LinkedIn integration
* automatic job scraping
* automatic application-status detection
* automatic interview detection
* AI agents
* AI-generated application materials
* browser extensions
* multi-user collaboration
* microservices and other unnecessary distributed infrastructure

Future AI capabilities may be added later without becoming dependencies of the core system.

## Repository Documentation

The most important project artifacts are:

| Artifact                             | Purpose                                      |
| ------------------------------------ | -------------------------------------------- |
| [`constitution.md`](constitution.md) | Governing product and engineering principles |
| Spec Kit specifications              | Detailed functional requirements             |
| Architecture & Technology Decisions  | Architectural and technology choices         |
| Plans / Tasks                        | Implementation planning and execution        |

The constitution is intentionally stable. Detailed requirements and implementation decisions belong in downstream artifacts.

## Development Principles

When making a change, ask:

1. Does this solve a real user problem?
2. Is there a simpler way to achieve the same outcome?
3. Does it preserve application history and context?
4. Does it unnecessarily increase operational or architectural complexity?
5. Does the change belong in the product, or is it merely an interesting technology?

The project should remain a **small, reliable personal system** rather than becoming a showcase for infrastructure or automation.

## License

This is a personal project. Licensing will be decided before public distribution, if public distribution becomes relevant.
