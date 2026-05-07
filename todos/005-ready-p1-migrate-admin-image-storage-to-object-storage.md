---
status: ready
priority: p1
issue_id: "005"
tags: [architecture, deployment, admin, storage, p0]
dependencies: ["003", "004"]
---

# Move admin image persistence from local filesystem to object storage

Replace local `public/` writes with durable object storage compatible with serverless deployments.

## Problem Statement

Current admin image generation writes files to project filesystem. This is fragile in production serverless runtimes and can break persistence expectations.

## Findings

- Generate/delete/move/rename operations currently rely on file writes in `public/admin-images`.
- Serverless function filesystems are not a reliable durable storage layer.
- V1 needs deterministic persistence and predictable asset URLs.

## Proposed Solutions

### Option 1: S3-compatible storage (R2/S3/B2) + metadata index

**Approach:** Upload generated files to object storage, store metadata manifest in DB/table or object index, serve signed/public URLs.

**Pros:**
- Production-ready durability.
- Scales with asset volume.

**Cons:**
- Requires storage setup and env config.

**Effort:** 1-2 days

**Risk:** Medium

---

### Option 2: Keep local write for now, switch deployment target

**Approach:** Deploy to a persistent VM/container with writable disk.

**Pros:**
- Smaller code changes.

**Cons:**
- Higher ops burden, weaker long-term path.

**Effort:** 1 day

**Risk:** High

## Recommended Action

Implement Option 1. Use S3-compatible storage and keep the admin gallery backed by object listing/metadata.

## Technical Details

**Affected files/components:**
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/api/admin/images/publicGalleryStore.ts`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/api/admin/images/generate.ts`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/api/admin/images/move.ts`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/api/admin/images/rename.ts`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/api/admin/images/delete.ts`

## Resources

- Vercel function docs on file system/runtime limits

## Acceptance Criteria

- [ ] Admin generate stores images in object storage, not local `public/`
- [ ] Gallery list/move/rename/delete work against object storage backend
- [ ] Migration path for existing `public/admin-images` assets is documented
- [ ] End-to-end admin smoke test passes in production-like env

## Work Log

### 2026-03-10 - Todo creation

**By:** Codex

**Actions:**
- Captured deployment architecture blocker and linked upstream security dependencies.

**Learnings:**
- Storage architecture must be fixed before public launch.

## Notes

- Release blocker for hosted production.
