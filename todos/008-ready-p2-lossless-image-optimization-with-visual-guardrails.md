---
status: ready
priority: p2
issue_id: "008"
tags: [performance, assets, quality, p1]
dependencies: []
---

# Optimize image assets with no visible quality loss

Reduce asset weight while preserving visual fidelity for cards, boards, packs, and UI art.

## Problem Statement

`public/` is very heavy (~189 MB). We need image optimization, but quality must remain visually unchanged.

## Findings

- Large PNG/JPG assets dominate build size.
- Some files are multi-megabyte backgrounds and board effects.
- User requirement is explicit: no quality degradation.

## Proposed Solutions

### Option 1: Lossless optimization + format policy

**Approach:**
- Apply lossless optimizers (`oxipng`, `zopflipng`, `jpegtran`/`mozjpeg -copy all -optimize` lossless mode).
- Keep original dimensions and color profiles.
- Use per-asset visual checks before commit.

**Pros:**
- Safe quality guarantee.
- Good byte savings for many assets.

**Cons:**
- Savings lower than aggressive lossy methods.

**Effort:** 1 day

**Risk:** Low

---

### Option 2: Controlled near-lossless with objective threshold

**Approach:** Use near-lossless WebP/AVIF with strict SSIM/PSNR floor and manual visual review.

**Pros:**
- Bigger savings possible.

**Cons:**
- Higher risk of subtle artifacts.

**Effort:** 1-2 days

**Risk:** Medium

## Recommended Action

Use Option 1 for V1. Add a quality gate script that rejects changes if dimensions/profile differ or visual diff exceeds threshold.

## Technical Details

**Candidate folders:**
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/public/cards`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/public/splashart`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/public/splashart-shiny`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/public/ui`

## Acceptance Criteria

- [ ] Image optimization uses lossless path by default
- [ ] No visible degradation in A/B review screenshots
- [ ] Dimensions and alpha behavior remain identical
- [ ] Total `public/` size reduced with report before/after

## Work Log

### 2026-03-10 - Todo creation

**By:** Codex

**Actions:**
- Added explicit quality guardrails per user request.

**Learnings:**
- Byte savings and visual integrity must be measured together, not separately.

## Notes

- Do not switch to lossy defaults for V1.
