# ADR 0001: Stack Assignment

Status: Accepted

## Decision
- TypeScript owns compiler frontend and developer tooling.
- Rust owns backend mapping, auditing, emitting, and simulation.
- C owns runtime bridge interface defined by the spec.
- C++ owns future HDL generation and DRC enforcement.

## Rationale
Each language is aligned with a concrete system boundary and tooling ecosystem.