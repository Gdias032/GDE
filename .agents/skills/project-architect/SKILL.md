---
name: project-architect
description: Analyze and maintain a persistent architectural map of the current project. Use when understanding the codebase, planning substantial changes, onboarding into a project, investigating architecture, or determining where new functionality belongs.
---

# Project Architect

## Purpose

Maintain a persistent understanding of the project's architecture using the `.project-context/` directory.

The project context is the architectural memory of the repository.

Before making substantial changes, consult the project context first.

---

## Project Context Location

The persistent project context is located at:

`.project-context/`

Expected files:

- `README.md`
- `architecture.md`
- `modules.md`
- `dependencies.md`
- `data-flow.md`
- `decisions.md`
- `known-issues.md`

---

## Initial Project Analysis

If `.project-context/` does not exist or is empty:

1. Analyze the repository structure.
2. Inspect the project's configuration files.
3. Identify the main entry points.
4. Identify the main application modules.
5. Identify important dependencies.
6. Identify databases and persistence mechanisms.
7. Identify APIs and external integrations.
8. Identify authentication and authorization mechanisms.
9. Identify important data flows.
10. Identify architectural patterns.
11. Identify important configuration files.
12. Generate the project context files.

Do not modify application source code during this analysis.

---

## Before Making Changes

Before implementing a substantial change:

1. Read `.project-context/README.md`.
2. Read the relevant architectural documentation.
3. Identify the modules involved.
4. Identify the files most likely to require modification.
5. Inspect the actual source files before making assumptions.
6. Check whether the existing project context is outdated.

The project context is a guide, not a substitute for inspecting source code.

Never rely exclusively on the project context when modifying code.

---

## Architecture

Maintain:

`.project-context/architecture.md`

Document:

- overall architecture
- architectural patterns
- application layers
- major components
- entry points
- important infrastructure
- communication between components

---

## Modules

Maintain:

`.project-context/modules.md`

For each important module document:

- name
- location
- responsibility
- dependencies
- important files
- relationships with other modules

---

## Dependencies

Maintain:

`.project-context/dependencies.md`

Document important:

- frameworks
- libraries
- databases
- APIs
- external services
- development tools

Do not list every trivial dependency.

Focus on dependencies that affect architecture or development decisions.

---

## Data Flow

Maintain:

`.project-context/data-flow.md`

Document important flows such as:

- user requests
- API requests
- authentication
- database operations
- background jobs
- external service communication
- important state transitions

Use simple text or Mermaid diagrams when useful.

---

## Architectural Decisions

Maintain:

`.project-context/decisions.md`

Record important architectural decisions.

For each decision include:

- decision
- reason
- affected components
- consequences

Do not record trivial implementation details.

---

## Known Issues

Maintain:

`.project-context/known-issues.md`

Document important known architectural or technical issues.

Include:

- issue
- affected area
- current workaround
- potential solution if known

---

## Updating the Context

After substantial architectural changes:

1. Determine whether the project structure changed.
2. Determine whether module responsibilities changed.
3. Determine whether dependencies changed.
4. Determine whether data flows changed.
5. Determine whether an architectural decision was introduced.
6. Update the appropriate `.project-context/` files.

Do not update every context file after every small code change.

---

## Accuracy Rules

The project context must reflect the actual repository.

Never invent:

- modules
- dependencies
- architecture
- APIs
- data flows
- architectural decisions

When something is uncertain, explicitly mark it as:

`Assumption:`

When documentation conflicts with source code, prioritize the actual source code and update the documentation.

---

## Scope

This skill is primarily for understanding and documenting the project.

Do not modify application code merely because the project context is outdated.

Update the project context when appropriate.

---

## Recommended Workflow

For substantial tasks:

1. Load project context.
2. Understand the architecture.
3. Identify relevant modules.
4. Inspect relevant source files.
5. Plan the change.
6. Implement the change.
7. Validate the change.
8. Update project context if the architecture changed.