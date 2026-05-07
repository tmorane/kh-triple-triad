---
status: ready
priority: p1
issue_id: "002"
tags: [tests, shop, progression, p0]
dependencies: []
---

# Fix failing shop integration tests against current economy values

Restore test reliability by aligning expectations with current shop rules.

## Problem Statement

`bun test` is failing 3 integration tests in shop flows, blocking release confidence.

## Findings

- Failing assertions are in:
  - `src/app/App.integration.test.tsx:820`
  - `src/app/App.integration.test.tsx:852`
  - `src/app/App.integration.test.tsx:917`
- Current domain values differ from expected values in tests:
  - Prices/rates now defined in `src/domain/progression/shop.ts`.
- Smoke test in browser confirms current UI behavior is coherent with domain constants.

## Proposed Solutions

### Option 1: Update expected values in tests

**Approach:** Keep business values as source of truth and update assertions accordingly.

**Pros:**
- Fastest and deterministic.
- Preserves domain logic already covered by unit tests.

**Cons:**
- If economy changed unintentionally, this could mask a regression.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Revert domain prices/rates to legacy values

**Approach:** Change `shop.ts` constants back to historical values.

**Pros:**
- Keeps old expectations unchanged.

**Cons:**
- Likely conflicts with current product tuning.

**Effort:** 1-2 hours

**Risk:** Medium

## Recommended Action

Take Option 1, but first confirm with product intent that new prices/rates are expected for V1. Then update only the affected assertions.

## Technical Details

**Affected files:**
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/app/App.integration.test.tsx`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/domain/progression/shop.ts`

## Resources

- Test output from `bun run test`

## Acceptance Criteria

- [ ] All shop integration tests pass
- [ ] `bun run test` passes end-to-end
- [ ] No mismatch remains between tested values and `shop.ts` constants

## Work Log

### 2026-03-10 - Todo creation

**By:** Codex

**Actions:**
- Captured failing test locations and linked domain source of truth.

**Learnings:**
- Failures are expectation drift, not runtime crashes.

## Notes

- Pair with issue 001 so CI goes fully green.
