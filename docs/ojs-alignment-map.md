# MMS ↔ OJS 3.5 Alignment Map

Reference: *OJS Complete Workflow & Developer Blueprint* (OJS 3.5).  
Product decision: **evolve MMS** (do not rebuild OJS from scratch).

## Status / stage mapping

| OJS stage | MMS `ManuscriptStatus` | Notes |
|-----------|------------------------|--------|
| Draft | `draft` | Author wizard |
| Submission | `submitted`, `formatting_requested` | Screening inbox |
| Review | `under_review`, `revision_requested` | Peer review + revision cycles |
| Copyediting | `copyediting` *(new)* | After accept; before production |
| Production | `in_production`, `proof_sent`, `ready_for_publication` | Proofs / galleys |
| Published | `published` | Public article |
| Declined | `rejected` | Desk or post-review |

## Role mapping

| OJS role | MMS role | Scope |
|----------|----------|--------|
| Site Administrator | `admin` | Global |
| Journal Manager | `journal_manager` *(new)* | Per-journal membership |
| Journal / Section Editor | `editor` (legacy `office` → editor) | Per-journal + assignment |
| Author | `author` | Own submissions; can also hold journal membership |
| Reviewer | `reviewer` | Per-journal membership + invitation |
| Copyeditor | `copyeditor` *(new)* | Per-journal + assignment |
| Layout / Production | `production` | Per-journal membership |
| Reader | public (no login) | Published issues/articles only |

Global `User.role` remains the **primary workspace** role for navigation.  
`JournalMembership` adds **journal-scoped** permissions (OJS tenancy).

## Out of MVP (per blueprint caveats)

- OJS plugin ecosystem, subscriptions/APC payments  
- Seamless OJS database migration  
- Automatic Word→typesetting / guaranteed plagiarism check  
- Scopus / Web of Science indexing guarantees  

## Phase delivery checklist

1. Foundation: membership + journal settings + scoped RBAC  
2. Sections + stronger submission metadata  
3. First-class review rounds + anonymity file class  
4. Copyediting stage  
5. Issues, galleys, public pages  
6. Email templates, discussions, DOI deposit record  

## Site Admin / Journal Manager UI (OJS-aligned)

| OJS area | MMS location |
|----------|----------------|
| Hosted journals | Admin → **Journals** (create) |
| Journal settings | Admin/JM → **Settings** (tabs) |
| Masthead / Contact | Settings → Masthead, Contact |
| Workflow | Settings → Workflow |
| Sections | Settings → Sections |
| Users & Roles | Settings → Users & roles + Admin → **Users** |
| Prepared emails | Settings → Emails |
| Issues | Settings → Issues |
| Submissions | **Submissions** / editor queue |
| Copyediting | **Copyedit** queue |
| Production | **Production** queue |
| Public journal | `/mms/j/{code}` |

## Editorial operations (day-to-day)

| OJS operation | MMS |
|---------------|-----|
| Stage queue (Submission→…→Published) | Editor → Submissions stage tabs |
| Assign / reassign editor | Screening assign + manuscript “Assigned editor” |
| Invite / withdraw / remind reviewers | Editor manuscript invite panel |
| Editor recommendation (internal) | Handling editor → **Send recommendation to EIC** (author not notified) |
| Final decision to author | **Editor in Chief** (`admin`) only — may override reviewers/editor |
| Author revision return | Status `revision_submitted` → EIC **Route to editor** → next review round |
| Editorial decision → copyediting | EIC Accept moves to `copyediting` |
| Files by visibility | Submission files panel (author/staff/review) |
| Activity history | Manuscript History panel |
| Enroll users | Admin → Users (create + journal membership) |
| Send to production after copyedit | Copyedit panel → **Send to production** |
| Issue TOC publish + DOI | Settings → Issues → Publish (auto DOI if empty) |

### Verified end-to-end (seed staff)

- `MS-2026-0001` — submit → screen → review → accept → copyedit → production → issue 1.1 published  
- `MS-2026-0002` — + minor revision cycle + re-review → accept → production → issue 1.2 published  

