---
status: ready
priority: p2
issue_id: "007"
tags: [performance, frontend, bundling, p1]
dependencies: ["006"]
---

# Improve runtime performance with route-level lazy loading

Reduce initial JS payload and improve first load by splitting routes.

## Problem Statement

Build warns about large JS chunks (>500 kB). Current app imports all pages eagerly in `App.tsx`.

## Findings

- `vite build` warns for big chunks.
- `App.tsx` imports many page modules directly.
- First load includes code not needed for the landing path.

## Proposed Solutions

### Option 1: React.lazy on page routes + Suspense fallback

**Approach:** Convert page imports to lazy modules and keep critical shell eager.

**Pros:**
- Strong payload reduction.
- Standard approach with low maintenance.

**Cons:**
- Requires loading states per route transition.

**Effort:** 4-6 hours

**Risk:** Low

---

### Option 2: Manual chunk strategy only

**Approach:** Use rollup manualChunks without route lazy loading.

**Pros:**
- Fewer code changes.

**Cons:**
- Less user-visible gain on first route.

**Effort:** 2-3 hours

**Risk:** Medium

## Recommended Action

Implement Option 1, then tune chunking only if needed.

## Technical Details

**Affected files:**
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/App.tsx`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/vite.config.ts`

## Acceptance Criteria

- [ ] Home route JS payload decreases significantly vs baseline
- [ ] No route regression in navigation tests
- [ ] `bun run build` warning count reduced
- [ ] Suspense fallback UX is acceptable on desktop and mobile

## Work Log

### 2026-03-10 - Todo creation

**By:** Codex

**Actions:**
- Captured bundle-size optimization as post-blocker task.

**Learnings:**
- Route-level splitting is the highest ROI first move.

## Notes

- Not a blocker once CI/security blockers are fixed, but strongly recommended before traffic.
