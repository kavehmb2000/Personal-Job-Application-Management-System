# AI-Assisted Development Contract

## Purpose

This document defines how AI-assisted development is conducted for the Personal Job Application Management System.

The project uses a hybrid **Specification-Driven Development (SDD)** approach, based on GitHub Spec Kit, combined with **AI-assisted Test-Assisted Development (TADD)**.

The purpose of this contract is to ensure that AI assistance remains consistent with the project's specifications, domain model, implementation plan, testing strategy, and Git workflow.

This document governs the **development process**.

It does not replace:

- `constitution.md` — enduring product and architectural principles;
- `spec.md` — functional requirements;
- `data-model.md` — domain and persistence model;
- `research.md` — recorded research and design decisions;
- `plan.md` — implementation strategy;
- `tasks.md` — implementation tasks.

---

# 1. Authority and Source of Truth

The repository is the authoritative source for the current implementation.

The specification artifacts are the authoritative source for intended behavior and design.

The AI's previous responses, assumptions, generated code, or conversational memory are **not authoritative**.

When sources disagree:

1. Identify the discrepancy explicitly.
2. Determine which artifact is authoritative for the specific question.
3. Do not silently resolve contradictions by inventing behavior.
4. If the discrepancy represents a genuine design change, update the appropriate specification artifact before or alongside implementation.

The current repository MUST be inspected before making implementation decisions whenever the required information is available there.

The AI MUST NOT ask the developer to paste repository content that can first be inspected directly from the repository.

---

# 2. Specification-Driven Development

Implementation MUST follow the established Spec Kit workflow.

Before implementing a feature, the AI MUST consult the relevant existing artifacts, including where applicable:

- `constitution.md`;
- `spec.md`;
- `data-model.md`;
- `research.md`;
- `plan.md`;
- `tasks.md`;
- API contracts;
- `schema.prisma`;
- existing implementation;
- existing tests.

The AI MUST consider the actual current repository state rather than relying on an earlier version of the project.

Specifications precede implementation.

If implementation reveals that the specification is incomplete, contradictory, or incorrect, the discrepancy MUST be identified rather than silently encoded in code.

---

# 3. Slice-Based Development

Development is organized into **vertical implementation slices**.

A slice should represent a coherent, user-meaningful or architecturally meaningful increment of functionality.

Tasks are implementation planning units; they do not necessarily constitute individual development slices.

Multiple related tasks MAY be completed as one slice.

A slice SHOULD contain the smallest coherent combination of:

- domain/application logic;
- persistence/query logic where required;
- API behavior where required;
- UI behavior where required;
- automated tests.

Pure TDD is not required.

Feature implementation and its tests SHOULD be developed alongside each other.

The objective is not to artificially enforce a Red → Green → Refactor ceremony, but to ensure that every completed slice is both implemented and validated.

---

# 4. Slice Start Protocol

At the beginning of every slice or work chunk, the AI MUST provide:

## 4.1 Objective

A clear statement of:

- what is being implemented;
- what behavior is being achieved;
- which task(s) from `tasks.md` are addressed;
- what constitutes completion of the slice.

The relevant specification and project artifacts MUST be consulted first.

## 4.2 Implementation Strategy

Provide a concise overview of the implementation strategy.

Explain **why** that approach is appropriate, particularly where there are meaningful alternatives.

The strategy MUST respect:

- the constitution;
- the domain model;
- existing architecture;
- existing implementation patterns;
- simplicity and maintainability.

## 4.3 Change Surface

Provide a short list of:

- files to inspect/watch;
- files to modify;
- files to create;
- files to delete, if any.

The list SHOULD be based on the actual repository rather than speculative file names.

## 4.4 Missing Information

If information genuinely cannot be obtained from the repository, identify exactly what is missing.

The AI SHOULD inspect the online repository first.

The AI SHOULD ask the developer for additional information only when necessary.

The AI MUST NOT repeatedly ask for confirmation when the implementation decision is already sufficiently determined by the specifications and repository.

---

# 5. Implementation Rules

## 5.1 Use the Existing Domain

Implementation MUST use the established domain concepts.

The AI MUST NOT reintroduce obsolete concepts merely because they appear in older code.

For example, if `Opportunity` is the canonical domain concept, new functionality MUST NOT introduce a parallel `Application` domain model.

## 5.2 Use Real Schema Definitions

When implementing persistence, tests, repositories, services, or API behavior:

- consult the current `prisma/schema.prisma`;
- use actual model names;
- use actual field names;
- use actual enum values;
- use actual relationships;
- use actual constraints.

The AI MUST NOT invent:

- fields;
- keys;
- enum values;
- relation names;
- database constraints;
- API properties.

Test data MUST use values that are valid according to the current schema and domain rules.

## 5.3 Preserve Existing Contracts

Existing completed functionality MUST NOT be changed merely for convenience.

In particular, historical completed tasks MUST remain intact unless the developer explicitly requests their modification or a specification change necessarily requires reconciliation.

Changes that affect an existing contract MUST be identified explicitly.

## 5.4 Prefer Existing Patterns

Before introducing a new implementation pattern, inspect the repository for an existing equivalent.

The AI SHOULD reuse:

- repository patterns;
- service patterns;
- validation patterns;
- error handling;
- authentication/ownership helpers;
- concurrency handling;
- UI primitives;
- test helpers;
- API conventions.

New abstractions SHOULD be introduced only when they provide clear value.

---

# 6. Domain Integrity

Business rules MUST remain independent of the UI.

UI components MUST NOT become the authoritative implementation of:

- lifecycle rules;
- ownership rules;
- optimistic concurrency;
- submission cardinality;
- domain invariants;
- other business rules.

Client-side behavior MAY simplify or combine domain information for usability, but authoritative rules MUST remain in appropriate domain/application services and APIs.

A UI interaction MUST use the existing authoritative domain operation rather than duplicating it.

---

# 7. Ownership and Security

Every implementation involving user-owned data MUST respect the project's ownership model.

Owner scoping MUST be enforced at the appropriate server-side boundary.

The AI MUST NOT rely solely on:

- hidden UI controls;
- route parameters;
- client-side filtering;
- client-side ownership assumptions.

Cross-owner access MUST be explicitly prevented and tested where relevant.

Security-sensitive behavior MUST follow the existing authentication, owner-resolution, validation, and authorization patterns.

---

# 8. Testing Strategy

Tests exist to validate behavior, not merely to increase coverage.

Testing priority is:

1. domain invariants;
2. business rules;
3. ownership boundaries;
4. persistence behavior;
5. API contracts;
6. critical user workflows;
7. important UI behavior.

Tests SHOULD be colocated with the appropriate testing layer:

- unit tests for deterministic domain/service behavior;
- integration tests for persistence and cross-component behavior;
- contract tests for API contracts;
- Playwright tests for critical end-to-end workflows.

A feature slice is not complete merely because its individual test passes.

### Test Database Isolation and Cleanup

Tests MUST NOT leave persistent test data in the development database.

Integration and persistence tests MUST use an isolated test database, a dedicated test schema, transactional rollback, or another explicit cleanup mechanism appropriate to the test layer.

Where tests intentionally use the configured development database, every test-created record MUST be reliably removed during test cleanup, including records created indirectly through related aggregates or fixtures.

Test cleanup MUST run even when a test fails.

Before manual application testing, the developer MUST be able to establish that no test-generated data remains in the development database.

A test run MUST therefore leave the development database in the same logical state in which it was found, except for explicitly documented seed/reference data.

Test fixtures MUST NOT use the real configured application owner identity in a way that can interfere with manual authentication or application testing.

If test execution reveals persistent test data in the development database, the issue MUST be treated as a test-infrastructure defect and corrected before continuing normal feature development.

The complete application test suite MUST pass before a phase is declared complete.

---

# 9. Test and Implementation Development

Tests and implementation are developed together within a slice.

The normal sequence is:

```text
Understand specification
        ↓
Inspect repository
        ↓
Define slice
        ↓
Implement feature + tests
        ↓
Run targeted tests
        ↓
Fix implementation/tests
        ↓
Run broader test suite
        ↓
Verify test database cleanup
        ↓
Typecheck
        ↓
Format
        ↓
Review diff