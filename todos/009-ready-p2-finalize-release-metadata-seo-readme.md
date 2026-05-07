---
status: ready
priority: p2
issue_id: "009"
tags: [release, docs, seo, branding, p1]
dependencies: []
---

# Finalize release metadata, branding, and README

Replace scaffold leftovers and publish a real operator/developer README.

## Problem Statement

`index.html` and top README still show Vite scaffold markers, hurting product credibility and onboarding.

## Findings

- `index.html` title is `tmp_vite_scaffold_20260222`.
- Favicon is still `/vite.svg`.
- README starts as a generic Vite template before project-specific docs.

## Proposed Solutions

### Option 1: Minimal release polish pass

**Approach:** Update title, description, favicon, social metadata, and rewrite README intro/ops sections.

**Pros:**
- High impact, low effort.

**Cons:**
- Requires final naming decisions.

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Full content marketing page docs

**Approach:** Add deep product docs, screenshots, architecture diagrams, FAQ.

**Pros:**
- Strong external presentation.

**Cons:**
- Scope creep before V1.

**Effort:** 1-2 days

**Risk:** Medium

## Recommended Action

Execute Option 1 now. Keep it sharp and release-focused.

## Technical Details

**Affected files:**
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/index.html`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/README.md`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/public` (favicon assets)

## Acceptance Criteria

- [ ] HTML title and metadata reflect final product name
- [ ] Favicon and OG image are project-specific
- [ ] README starts with project purpose and quickstart
- [ ] README includes env/setup/deploy/troubleshooting sections

## Work Log

### 2026-03-10 - Todo creation

**By:** Codex

**Actions:**
- Captured release polish requirements as a focused p2.

**Learnings:**
- Metadata polish is cheap and prevents avoidable trust loss.

## Notes

- Do after blockers, before launch announcement.
