---
status: ready
priority: p2
issue_id: "010"
tags: [reliability, monitoring, frontend, p1]
dependencies: ["006"]
---

# Add runtime error boundary and basic monitoring hooks

Introduce production error capture and graceful crash handling in the React app shell.

## Problem Statement

There is no explicit app-level ErrorBoundary or monitoring integration in startup code, reducing observability during launch.

## Findings

- `src/main.tsx` bootstraps app directly without ErrorBoundary wrapper.
- No telemetry/incident channel is wired in startup path.
- Silent failures would be hard to triage post-launch.

## Proposed Solutions

### Option 1: Lightweight ErrorBoundary + pluggable reporter

**Approach:** Add boundary around app tree and route uncaught UI errors to a minimal reporting adapter.

**Pros:**
- Immediate resilience gain.
- Keeps vendor choice open.

**Cons:**
- Needs fallback UI copy and manual verification.

**Effort:** 3-5 hours

**Risk:** Low

---

### Option 2: Full observability stack now

**Approach:** Integrate full tracing/perf/error stack before launch.

**Pros:**
- Deep diagnostics.

**Cons:**
- Too large for current window.

**Effort:** 1-2 days

**Risk:** Medium

## Recommended Action

Implement Option 1 now, then expand observability iteratively.

## Technical Details

**Affected files:**
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/main.tsx`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src` (new ErrorBoundary component)

## Acceptance Criteria

- [ ] App tree wrapped by ErrorBoundary
- [ ] Boundary renders user-safe fallback screen
- [ ] Caught errors are sent to reporting adapter/log channel
- [ ] Manual crash simulation confirms expected behavior

## Work Log

### 2026-03-10 - Todo creation

**By:** Codex

**Actions:**
- Added reliability task with clear MVP boundary.

**Learnings:**
- A small boundary gives disproportionate launch protection.

## Notes

- Pair with issue 006 so checks include this path.
