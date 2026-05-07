---
status: ready
priority: p1
issue_id: "004"
tags: [security, admin, api, p0]
dependencies: ["003"]
---

# Restrict admin gallery scope and secure gallery endpoint

Limit gallery visibility and operations to admin-managed assets only.

## Problem Statement

Gallery endpoint currently enumerates all image files under `public/`. That is over-broad and increases data exposure.

## Findings

- `listAllPublicImages` recursively scans the whole `public` tree.
- `GET /api/admin/images/gallery` is callable without auth in its handler.
- Admin UI can expose and manipulate non-admin assets if backend scope is too broad.

## Proposed Solutions

### Option 1: Scope to `public/admin-images` only + auth gate

**Approach:** Restrict gallery store listing root to `public/admin-images`, protect gallery endpoint with same auth policy as mutate endpoints.

**Pros:**
- Least privilege.
- Minimal behavior ambiguity.

**Cons:**
- Existing UI expectations over full gallery must be adapted.

**Effort:** 3-5 hours

**Risk:** Low

---

### Option 2: Keep full gallery but add per-path allowlist rules

**Approach:** Permit multiple subtrees with explicit allowlist.

**Pros:**
- More flexible for future media tooling.

**Cons:**
- More complexity and higher misconfig risk.

**Effort:** 1 day

**Risk:** Medium

## Recommended Action

Take Option 1 for V1. Keep scope narrow and predictable.

## Technical Details

**Affected files:**
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/api/admin/images/gallery.ts`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/api/admin/images/publicGalleryStore.ts`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/app/admin/adminPublicGallery.ts`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/AdminImagesPage.tsx`

## Resources

- Audit findings from 2026-03-10

## Acceptance Criteria

- [ ] Gallery endpoint requires valid admin auth
- [ ] Listing returns only files under `public/admin-images`
- [ ] Move/rename/delete reject paths outside allowed subtree
- [ ] Tests cover traversal and scope constraints

## Work Log

### 2026-03-10 - Todo creation

**By:** Codex

**Actions:**
- Scoped data exposure issue and tied it to auth-hardening dependency.

**Learnings:**
- Gallery scope and auth should share the same policy boundary.

## Notes

- Depends on issue 003 to avoid policy drift.
