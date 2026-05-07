---
status: ready
priority: p2
issue_id: "011"
tags: [legal, privacy, compliance, p1]
dependencies: []
---

# Add privacy and data handling policy pages

Complete legal/compliance surface with explicit privacy/data handling disclosures.

## Problem Statement

Current legal page focuses on IP/fan-game disclaimer but does not clearly document personal data handling for account/auth/profile sync.

## Findings

- Account flow includes email/password auth and cloud profile synchronization.
- Existing legal route is `Mentions IP` only.
- No dedicated privacy notice linked in navigation.

## Proposed Solutions

### Option 1: Add dedicated privacy page + link from legal/account

**Approach:** Create concise privacy page covering collected data, purpose, retention, third-party processors, user controls.

**Pros:**
- Clear and sufficient for V1 transparency.

**Cons:**
- Needs business/legal validation of wording.

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Merge privacy text into existing IP page only

**Approach:** Expand current legal page with privacy section.

**Pros:**
- Fewer routes.

**Cons:**
- Mixed concerns and weaker discoverability.

**Effort:** 1-2 hours

**Risk:** Medium

## Recommended Action

Implement Option 1. Keep IP and privacy concerns separate and easy to find.

## Technical Details

**Affected files:**
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/LegalIpPage.tsx`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages` (new privacy page)
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/App.tsx` (route + nav link)

## Acceptance Criteria

- [ ] Privacy page exists and is reachable from UI
- [ ] Policy covers auth data, cloud profile, and third-party services
- [ ] Data deletion/export path is documented for users
- [ ] Wording is reviewed and approved before launch

## Work Log

### 2026-03-10 - Todo creation

**By:** Codex

**Actions:**
- Added compliance todo based on account/cloud feature surface.

**Learnings:**
- Privacy transparency is required for trust even in a fan-game context.

## Notes

- Final wording should be validated by owner before publication.
