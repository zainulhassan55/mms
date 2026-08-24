# MMS backend (`server/`)

Separate from the React frontend. This API talks to PostgreSQL.

## One-time setup

### 1. Create your `.env`

```powershell
cd D:\Hassan\Websites\mms\server
copy .env.example .env
```

Open `server\.env` and set your PostgreSQL password plus:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/mms?schema=public"
PORT=4000
JWT_SECRET="change-me-to-a-long-random-string"
DEMO_MODE="false"
ADMIN_SEED_PASSWORD="admin123"
```

### 2. Install packages

```powershell
cd D:\Hassan\Websites\mms\server
npm install
```

### 3. Create tables + seed journals / bootstrap admin

```powershell
npx prisma db push
npm run db:seed
```

### 4. Start the API

```powershell
npm run dev
```

Open: http://localhost:4000/api/health

## Auth (JWT)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | Self-register (author, reviewer, editor, production) |
| POST | `/api/auth/login` | Email + password → token + user |
| GET | `/api/auth/me` | Current user (Bearer token) |
| POST | `/api/auth/change-password` | Change password while signed in |
| POST | `/api/auth/forgot-password` | Request reset |
| POST | `/api/auth/reset-password` | Complete reset |

Admin accounts are **not** self-registered. Seed creates:

- Email: `admin@publisher.example`
- Password: value of `ADMIN_SEED_PASSWORD` (default `admin123`)

Everyone else registers at `/register`, picks their role, then signs in and lands on that role’s dashboard only.

## Database tables (current)

| Table | Purpose |
|-------|---------|
| `User` | Authors, editors, reviewers, production, admin |
| `Journal` | Journal catalog |
| `Manuscript` | Submission + workflow status |
| `ManuscriptAuthor` | Co-author list |
| `ManuscriptFile` | File metadata |
| `ReviewInvitation` | Reviewer invites |
| `ReviewReport` | Submitted reviews |
| `EditorialDecision` | Accept / revision / reject |
| `ActivityEvent` | Timeline / notifications feed |
| `PortalSyncEvent` | Portal publish sync log |

Inspect in pgAdmin under **mms → Schemas → public → Tables**.

## Notes

- Never commit `.env`
- Keep `DEMO_MODE=false` for real multi-user auth
