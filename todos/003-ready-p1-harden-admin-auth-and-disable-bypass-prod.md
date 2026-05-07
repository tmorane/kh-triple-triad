---
status: ready
priority: p1
issue_id: "003"
tags: [security, admin, auth, p0]
dependencies: []
---

# Harden admin auth and force bypass off in production

Remove risky auth bypass defaults and enforce strict admin authorization in production.

## Problem Statement

Admin image endpoints can be exposed if bypass flags are misconfigured. This is unacceptable before public V1.

## Findings

- `.env.example` sets bypass flags to true by default.
- Client and server both support bypass switches.
- `/admin/images` gives powerful file operations.
- Current behavior is convenient in local dev but too risky for production.

## Proposed Solutions

### Option 1: Keep bypass but force production hard-off

**Approach:** Ignore bypass env in production, require authenticated allowlisted admin always.

**Pros:**
- Preserves local DX.
- Strong production safety.

**Cons:**
- Requires careful tests for both modes.

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Remove bypass feature entirely

**Approach:** Delete bypass logic in client and server.

**Pros:**
- Simplest mental model.

**Cons:**
- Slower local iteration for admin tooling.

**Effort:** 3-5 hours

**Risk:** Medium

## Recommended Action

Apply Option 1 now: production hard-off, local bypass optional, and update docs/env examples with safe defaults.

## Technical Details

**Affected files:**
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/.env.example`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/app/admin/adminClientAccess.ts`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/api/admin/images/generate.ts`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/api/admin/images/move.ts`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/api/admin/images/rename.ts`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/api/admin/images/delete.ts`

## Resources

- Security audit notes from 2026-03-10

## Acceptance Criteria

- [ ] Production mode ignores bypass toggles
- [ ] Unauthorized calls return 401/403 on all admin mutating endpoints
- [ ] `.env.example` uses secure defaults
- [ ] Admin integration tests cover auth denied and auth allowed paths

## Work Log

### 2026-03-10 - Todo creation

**By:** Codex

**Actions:**
- Converted auth-risk findings into a release-blocking security task.

**Learnings:**
- Bypass convenience must be strictly bounded by environment.

## Notes

- Treat as release blocker.
