# MMS — Complete System, Hosting History & Email Setup

**Live site:** https://www.ccri-research.io  
**Project:** Manuscript Management System (MMS)  
**Hosting:** Hostinger VPS with CloudPanel  
**Prepared for:** Faculty review

This document explains:
1. How the system works (user / journal / paper flow)
2. Full history of how we hosted it on Hostinger (steps + commands)
3. How email was configured (Hostinger mailbox + code)

---

# Part A — How the system works

## A1. Big picture

1. A person creates an account.
2. They can **request a journal**. Site admin approves → that person becomes **Journal Manager**.
3. Authors submit papers to a journal.
4. Editors and reviewers handle peer review.
5. Accepted papers go through copyediting / production → proof → publish.

One platform. Many journals. Each journal has its own staff and papers.

## A2. Roles

| Role | Main job |
|------|----------|
| Site Admin | Approves journal requests; platform control |
| Journal Manager | Runs their journal (settings, staff) |
| Editor / EIC | Screens papers, assigns reviewers, decisions |
| Reviewer | Review invitations and reports |
| Author | Submit, revise, approve proof |
| Copyeditor / Production | Prepare accepted papers and proofs |

## A3. Starting a journal

```
Register → Request a journal → Site Admin reviews
     ↓ approve                      ↓ reject
Journal created                  Request ends
Requester = Journal Manager
Journal appears on public site
```

## A4. Paper lifecycle

```
Submit → Screen → Invite reviewers → Reviews
→ Decision (reject / revise / accept)
→ If revise: author uploads revision → back to editor
→ If accept: copyedit / production → proof → publish
```

Emails are sent at key steps (see Part C).

## A5. Live check

| Action | Where |
|--------|--------|
| Public journals | https://www.ccri-research.io/ |
| Request a journal | After login → Request a journal |
| Admin approval | Admin → Requests |
| Submit paper | Author dashboard |
| Review / decide | Editor / Reviewer areas |

---

# Part B — Hosting history (start to end)

This is the real path we followed to put MMS on Hostinger.

## B1. What we used

| Item | Value |
|------|--------|
| Domain | `www.ccri-research.io` |
| Panel | Hostinger VPS → **CloudPanel** |
| Site user | `ccri-research` |
| Site folder | `/home/ccri-research/htdocs/www.ccri-research.io` |
| App type | Node.js |
| App port | **3001** (CloudPanel proxies public HTTPS → this port) |
| Process manager | **PM2** process name `mms-api` |
| Database | **PostgreSQL** (not MySQL) |
| Code repository | GitHub: `https://github.com/zainulhassan55/mms.git` |
| Local API port (dev) | 4000 |
| Live API port | 3001 |

## B2. Architecture on the VPS

```
Internet (HTTPS)
      ↓
CloudPanel / Nginx (SSL for www.ccri-research.io)
      ↓
Node app on 127.0.0.1:3001  (PM2: mms-api)
      ├── Serves built frontend (dist)
      ├── Serves /api/* backend
      └── Talks to PostgreSQL
```

Same Node process serves both the website UI and the API.

---

## B3. Step-by-step hosting history

### Step 1 — Professor / CloudPanel: create the site

In CloudPanel:

1. Create site for domain **www.ccri-research.io**
2. Site user: **ccri-research**
3. App: **Node.js** (Node 24 LTS)
4. App port: **3001**
5. Enable **SSL** (Let’s Encrypt) for HTTPS
6. Create / enable **PostgreSQL** database for this site
7. Enable SSH / Web Terminal for the site user (or a user with write access to the site folder)

**Result:** empty site folder ready for files:

`/home/ccri-research/htdocs/www.ccri-research.io`

---

### Step 2 — Access the server

We used CloudPanel **Web Terminal** / SSH as a user that can write the site folder (finally as site context / `ccri-research`).

Check location:

```bash
pwd
ls -la /home/ccri-research/htdocs/www.ccri-research.io
whoami
```

**Note:** Early SSH attempts from a personal PC sometimes failed with “banner exchange timeout”. Web Terminal in CloudPanel was the reliable way to run commands on the VPS.

---

### Step 3 — Put the project code on the server

First time the folder was empty / not a git repo. We connected it to GitHub and pulled `main`.

Typical first-time setup:

```bash
cd /home/ccri-research/htdocs/www.ccri-research.io

# If folder is empty / new:
git init
git remote add origin https://github.com/zainulhassan55/mms.git
git fetch origin main
git checkout -f main
# or:
git reset --hard origin/main
```

If `.env` already existed, we backed it up before hard reset so secrets were not lost:

```bash
cp server/.env /tmp/mms-server.env.bak
git fetch origin main
git reset --hard origin/main
cp /tmp/mms-server.env.bak server/.env
```

---

### Step 4 — Create production environment file

```bash
cd /home/ccri-research/htdocs/www.ccri-research.io/server
cp .env.example .env
nano .env
```

Production values (secrets shown as placeholders):

```env
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@127.0.0.1:5432/DB_NAME?schema=public
PORT=3001
JWT_SECRET=long-random-secret
DEMO_MODE=false
ADMIN_EMAIL=your-admin@email.com
ADMIN_SEED_PASSWORD=strong-password
SEED_DEMO_STAFF=false

EMAIL_DELIVERY=true
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@ccri-research.io
SMTP_PASS=********
MAIL_FROM=noreply@ccri-research.io
MAIL_FROM_NAME=CCRI Research Editorial Office
JOURNAL_NAME=CCRI Research
FRONTEND_URL=https://www.ccri-research.io
FRONTEND_BASE=/
```

Important:

- `PORT=3001` must match CloudPanel Node port.
- `FRONTEND_URL` must be the public HTTPS URL.
- `FRONTEND_BASE=/` means the app runs at domain root (not `/mms`).
- `DATABASE_URL` must be the CloudPanel PostgreSQL connection string.

---

### Step 5 — Install dependencies and build

From site root:

```bash
cd /home/ccri-research/htdocs/www.ccri-research.io

# Frontend
npm ci
npm run build

# Backend
cd server
npm ci
npx prisma generate
npx prisma db push
npm run build
cd ..
```

Meaning:

| Command | Purpose |
|---------|---------|
| `npm ci` | Clean install from lockfile |
| `npm run build` (root) | Build React/Vite frontend into `dist/` |
| `npx prisma generate` | Generate DB client |
| `npx prisma db push` | Apply schema to PostgreSQL |
| `npm run build` (server) | Compile TypeScript API to `server/dist/` |

If Prisma had permission issues on generated files, ownership/permissions were fixed for the site user (example pattern):

```bash
# only if needed
chmod -R u+rwX server/node_modules/.prisma || true
```

---

### Step 6 — First database seed (admin account)

To create the first Editor-in-Chief / admin on live:

```bash
cd /home/ccri-research/htdocs/www.ccri-research.io/server
# Ensure ADMIN_EMAIL and ADMIN_SEED_PASSWORD are set in .env
npm run db:seed
```

**Warning:** seed is for bootstrap / clean demo. Do **not** re-run seed on live casually — it can wipe/rebuild demo data depending on seed script.

Later we cleaned live DB and kept a real admin (EIC) email for testing.

---

### Step 7 — Start the app with PM2

```bash
cd /home/ccri-research/htdocs/www.ccri-research.io

pm2 start server/dist/index.js --name mms-api --cwd /home/ccri-research/htdocs/www.ccri-research.io/server
pm2 save
pm2 status
```

Health check:

```bash
curl -sf http://127.0.0.1:3001/api/health
```

Expected idea: `{ "ok": true, "database": "connected" }`

Then open in browser:

https://www.ccri-research.io/

CloudPanel/Nginx forwards public traffic to port 3001.

---

### Step 8 — CloudPanel Node settings to verify

In CloudPanel site settings, confirm:

| Setting | Expected |
|---------|----------|
| Node.js version | 24 LTS (or installed Node used by site) |
| App Port | 3001 |
| Root / app path | site root (avoid double path that caused 502) |
| SSL | Enabled (HTTPS) |

Problems we hit and fixed during hosting:

| Problem | Fix |
|---------|-----|
| MySQL offered by default | Use **PostgreSQL** for MMS |
| Empty / wrong `DATABASE_URL` | Copy correct CloudPanel DB credentials into `.env` |
| Wrong CloudPanel root path (double path) → 502 | Set correct site document/app root |
| App hung / “Failed to fetch” | Restart PM2 (`pm2 restart mms-api`) |
| Site first under `/mms` | Later moved to domain root (`FRONTEND_BASE=/`) |
| SSH from PC timeout | Use CloudPanel Web Terminal |

---

### Step 9 — Move from `/mms` to domain root

Originally the app was served under `https://www.ccri-research.io/mms/`.

Later we changed it to root:

1. Frontend Vite `base` → `/`
2. Router without `/mms` basename
3. `FRONTEND_BASE=/` in live `.env`
4. Brand/logo links to public home `/`
5. Old `/mms/...` URLs redirect to `/...`
6. Rebuild + restart PM2

Public site is now:

https://www.ccri-research.io/

---

### Step 10 — How we update the live site now

**On local PC (development):**

```bash
# work, test locally
git add .
git commit -m "message"
git push origin main
```

**On VPS (CloudPanel Web Terminal):**

```bash
cd /home/ccri-research/htdocs/www.ccri-research.io
bash scripts/deploy-vps.sh
```

`scripts/deploy-vps.sh` does:

```bash
git fetch origin main
git checkout main
git reset --hard origin/main
npm ci
npm run build
cd server
npm ci
npx prisma generate
npx prisma db push
npm run build
cd ..
pm2 restart mms-api --update-env
```

There is also a GitHub Actions workflow (`.github/workflows/deploy.yml`) meant to deploy over SSH on push to `main`. When SSH from GitHub/PC is blocked, **manual `deploy-vps.sh` in Web Terminal** is the reliable method.

---

### Step 11 — Useful live commands (cheatsheet)

```bash
# Go to site
cd /home/ccri-research/htdocs/www.ccri-research.io

# Deploy update
bash scripts/deploy-vps.sh

# Process status / logs
pm2 status
pm2 logs mms-api --lines 100
pm2 restart mms-api --update-env

# Health
curl -sf http://127.0.0.1:3001/api/health

# Edit secrets
nano server/.env
```

---

# Part C — Email configuration (Hostinger + code)

## C1. Idea

```
MMS API on VPS
  → reads SMTP from server/.env
  → Hostinger SMTP (smtp.hostinger.com)
  → sends as noreply@ccri-research.io
  → users receive mail
```

## C2. Create mailbox on Hostinger

1. Hostinger / domain email area for **ccri-research.io**
2. Create mailbox, e.g. `noreply@ccri-research.io`
3. Set strong password
4. Confirm mailbox works (webmail login optional)

## C3. SMTP values used

| Setting | Value |
|---------|--------|
| Host | `smtp.hostinger.com` |
| Port | `465` (SSL) |
| Secure | `true` |
| User | `noreply@ccri-research.io` |
| Pass | mailbox password |

## C4. Put into live `server/.env`

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

Then:

```bash
pm2 restart mms-api --update-env
```

## C5. How code sends email

| File | Role |
|------|------|
| `server/src/lib/mail.ts` | Nodemailer + SMTP; HTML layout; From address; delivery switch |
| `server/src/lib/workflowEmails.ts` | Message content for each workflow event |
| Routes (auth, manuscripts, journal-requests, …) | Call notify functions when events happen |

`EMAIL_DELIVERY=false` → log only (local demo).  
`EMAIL_DELIVERY=true` → real send via Hostinger.

## C6. Events that send email (examples)

- Welcome / account created  
- Password reset  
- Submission received  
- Screening / formatting / desk reject  
- Reviewer invite / accept-decline / review submitted  
- Editor recommendation → EIC  
- Final decision to author  
- Revision received / routed  
- Copyedit / production / proof / published  
- Journal request submitted / approved / rejected  
- Deadline reminders (if enabled)

## C7. Test email

```bash
cd /home/ccri-research/htdocs/www.ccri-research.io/server
npx tsx scripts/test-mail.ts your-email@example.com
```

If SMTP 535 (login failed): wrong `SMTP_PASS` → fix `.env` → restart PM2.

## C8. Security

- Keep `SMTP_PASS`, `DATABASE_URL`, `JWT_SECRET` only in `server/.env` on VPS  
- Do not commit `.env` to GitHub  
- Same code locally and live; only `.env` differs  

---

# Part D — Summary timeline

1. Built MMS locally (React + Express + Prisma + PostgreSQL)  
2. Professor created CloudPanel site + Node port 3001 + SSL + DB access  
3. Code placed on VPS via GitHub (`main`)  
4. Created `server/.env` for production  
5. `npm ci` / build / Prisma / PM2 start  
6. Seeded first admin; later cleaned live data for real EIC testing  
7. Configured Hostinger mailbox + SMTP → real workflow emails  
8. Moved public URL from `/mms` to domain root  
9. Added journal-request flow (EasyChair/CMT-style platform)  
10. Ongoing updates: `git push` locally → `bash scripts/deploy-vps.sh` on VPS  

---

*Prepared for faculty review — Manuscript Management System (MMS) on Hostinger VPS.*
