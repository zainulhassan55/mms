# MMS — How the System Works

**Site:** https://www.ccri-research.io  
**Purpose:** Online platform to host journals and manage papers from submission to publication (similar idea to EasyChair / CMT, for journals).

---

## 1. Big picture

1. A person creates an account on the website.
2. They can **request a journal**. Site admin approves → that person becomes **Journal Manager** of that journal.
3. Authors submit papers to a journal.
4. Editors and reviewers handle peer review.
5. Accepted papers go through copyediting / production → proof → publish.

One platform. Many journals. Each journal has its own staff and papers.

---

## 2. Who does what

| Role | Main job |
|------|----------|
| **Site Admin** | Approves new journal requests; overall platform control |
| **Journal Manager** | Sets up and runs their journal (settings, staff) |
| **Editor / EIC** | Screens papers, assigns reviewers, records decisions |
| **Reviewer** | Accepts invitations and submits review reports |
| **Author** | Submits papers, uploads revisions, checks proofs |
| **Copyeditor / Production** | Prepares accepted papers and sends proofs |

---

## 3. Starting a journal (platform flow)

```
User registers → Request a journal → Site Admin reviews
        ↓ approve                         ↓ reject
Journal is created                    Request ends
Requester becomes Journal Manager
Journal appears on the public site
```

- Anyone signed in can request a journal.
- Only **Site Admin** can approve or reject.
- After approval, the journal is active and ready for submissions.

---

## 4. Paper lifecycle (editorial flow)

```
Author submits paper
        ↓
Editor screens (desk reject / ask format fix / send to review)
        ↓
Reviewers invited → accept/decline → submit reviews
        ↓
Editor recommends → EIC / Journal decision
        ↓
   ┌────┼────────────────┐
Reject  Revision asked   Accept
           ↓                ↓
     Author revises    Copyedit / Production
           ↓                ↓
     Back to editor    Proof to author
                            ↓
                       Publish
```

### Short meaning of each step

1. **Submit** — Author uploads manuscript and files.
2. **Screen** — Editor checks scope and basic quality.
3. **Review** — Reviewers are invited; they report recommendations.
4. **Decision** — Accept, revise, or reject (author is notified).
5. **Revision** — If asked, author uploads a revised version; review continues.
6. **Production** — Accepted paper is prepared; proof sent to author.
7. **Publish** — Final version is published in the journal/issue.

Emails are sent at key points (see Section 8).

---

## 5. Day-to-day by role

**Author**  
Register → open a journal → submit paper → track status → revise if asked → approve proof.

**Journal Manager**  
Request journal (or receive approval) → configure journal → add editors/reviewers → oversee workflow.

**Editor**  
Open assigned papers → invite reviewers → read reports → recommend or decide.

**Reviewer**  
Receive invitation → accept/decline → read paper → submit review.

**Site Admin**  
Approve/reject journal requests → manage users when needed → keep the platform running.

---

## 6. What this is (and is not)

| This system is | This system is not |
|----------------|--------------------|
| A shared platform for many journals | One single fixed journal only |
| Request → admin permission to open a journal | Anyone automatically becoming a live journal host |
| Full path: submit → review → decide → produce → publish | Only a file upload form |

---

## 7. Live check (quick)

| Action | Where |
|--------|--------|
| Public journals | Home page of the site |
| Request a journal | **Request a journal** (after login) |
| Admin approval queue | Admin → **Requests** |
| Submit a paper | Author dashboard → new submission |
| Review / decide | Editor / Reviewer areas after login |

---

## 8. Email configuration (Hostinger + code)

The system sends workflow emails (submission received, reviewer invite, decisions, proofs, journal request notices, etc.).  
Email is **not** hard-coded. It uses a Hostinger mailbox + SMTP settings in the server environment file.

### A. Overall idea

```
MMS API (Node on VPS)
        ↓
Reads SMTP settings from server/.env
        ↓
Connects to Hostinger SMTP (smtp.hostinger.com)
        ↓
Sends from mailbox (e.g. noreply@ccri-research.io)
        ↓
User receives email in Gmail / Outlook / etc.
```

### B. Step 1 — Create mailbox on Hostinger

1. Log in to **Hostinger** (or CloudPanel email area for the domain).
2. Open email / mailboxes for domain **ccri-research.io**.
3. **Create a mailbox**, for example:
   - Address: `noreply@ccri-research.io`
   - Set a strong password (save it securely).
4. Confirm the mailbox works (login to webmail once if needed).

This mailbox is the **sending account**. The app logs into SMTP with this address and password.

### C. Step 2 — Hostinger SMTP details we use

| Setting | Value used |
|---------|------------|
| SMTP host | `smtp.hostinger.com` |
| SMTP port | `465` (SSL) |
| Secure | `true` |
| Username | full mailbox, e.g. `noreply@ccri-research.io` |
| Password | mailbox password |

(Alternative often supported by Hostinger: port `587` with STARTTLS.)

### D. Step 3 — Put settings in the VPS app (server/.env)

On the Hostinger VPS, the API runs for site:

`/home/ccri-research/htdocs/www.ccri-research.io/server`

Edit **`server/.env`** (never commit this file to GitHub — it has secrets).

Required email lines:

```env
EMAIL_DELIVERY=true
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@ccri-research.io
SMTP_PASS=********
MAIL_FROM=noreply@ccri-research.io
MAIL_FROM_NAME=CCRI Research Editorial Office
FRONTEND_URL=https://www.ccri-research.io
FRONTEND_BASE=/
```

Meaning of the important flags:

| Variable | Meaning |
|----------|---------|
| `EMAIL_DELIVERY=true` | Actually send email (if `false`, only log to server console — useful for local demo) |
| `SMTP_*` | How to connect to Hostinger mail server |
| `MAIL_FROM` / `MAIL_FROM_NAME` | “From” name and address users see |
| `FRONTEND_URL` + `FRONTEND_BASE` | Used to build clickable links inside emails |

After saving `.env`, restart the API so it reloads settings:

```bash
pm2 restart mms-api --update-env
```

### E. Step 4 — How it works in code

1. **Mail engine** — `server/src/lib/mail.ts`  
   - Reads `EMAIL_DELIVERY` and `SMTP_*` from `.env`  
   - Uses **Nodemailer** to send mail through Hostinger SMTP  
   - Builds HTML email layout and “From” address  
   - Respects user notification preferences when applicable  

2. **Workflow messages** — `server/src/lib/workflowEmails.ts`  
   - Called from routes when something important happens  
   - Chooses recipient (author, reviewer, editor, admin, …)  
   - Sets subject + body + link into the app  

3. **Trigger points (examples)**  
   - Register / welcome  
   - Password reset  
   - Submission received  
   - Screening / formatting / desk reject  
   - Reviewer invite, accept/decline, review submitted  
   - Editor recommendation → EIC  
   - Final decision to author  
   - Revision received / routed  
   - Copyedit / production / proof / published  
   - Journal request submitted / approved / rejected  
   - Deadline reminders (if reminders enabled)

4. **Template idea**  
   Each journal can also store email template text in the database; the sending still goes through the same SMTP path.

### F. Step 5 — Test that email works

On the VPS (inside `server` folder):

```bash
npx tsx scripts/test-mail.ts your-email@example.com
```

Or trigger a real action in the website (e.g. submit a paper) and check the inbox (and spam folder).

If send fails with login error (SMTP 535): mailbox password in `.env` is wrong — update `SMTP_PASS` and restart PM2.

### G. Local vs live

| Environment | Typical setup |
|-------------|----------------|
| **Local PC (dev)** | `EMAIL_DELIVERY=false` → emails printed in terminal, no real send |
| **Live VPS** | `EMAIL_DELIVERY=true` + Hostinger SMTP → real emails |

Same code. Only `.env` changes.

### H. Security notes

- Mailbox password stays only in `server/.env` on the VPS.
- Do **not** put `SMTP_PASS` in GitHub.
- Users can turn off some notification types in their account settings; transactional mail (e.g. password reset) still sends.

---

*Prepared for faculty review — Manuscript Management System (MMS).*
