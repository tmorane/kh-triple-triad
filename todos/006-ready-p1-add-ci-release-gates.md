---
status: ready
priority: p1
issue_id: "006"
tags: [ci, release, quality, p0]
dependencies: ["001", "002", "003"]
---

# Add CI release gates for lint, typecheck, tests, and build

Create a mandatory CI pipeline so regressions cannot be merged silently.

## Problem Statement

There is no visible GitHub workflow gate. Release readiness currently depends on manual local checks.

## Findings

- No `.github/` workflow files found.
- Current required checks are known: `lint`, `typecheck`, `test`, `build`.
- Security-sensitive admin changes need enforced checks before merge.

## Proposed Solutions

### Option 1: Single release workflow

**Approach:** Add one workflow running all four checks on push/PR.

**Pros:**
- Simple and immediate.
- Covers core quality.

**Cons:**
- Longer single job runtime.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Split workflows by concern

**Approach:** Separate quality, test, and build jobs.

**Pros:**
- Better visibility by stage.

**Cons:**
- More setup/maintenance.

**Effort:** 2-4 hours

**Risk:** Low

## Recommended Action

Start with Option 1 now, then split later only if runtime becomes painful.

## Technical Details

**Affected files:**
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/.github/workflows/ci.yml` (new)
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/README.md` (document CI commands)

## Acceptance Criteria

- [ ] PRs run `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`
- [ ] Failing checks block merge
- [ ] Workflow uses pinned Bun version
- [ ] README includes local parity command list

## Work Log

### 2026-03-10 - Todo creation

**By:** Codex

**Actions:**
- Defined release gate task and linked required dependencies.

**Learnings:**
- CI absence is a process blocker, not just a convenience gap.

## Notes

- Hard release gate for V1.
