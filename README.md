# Green Color Networks — Online Shop & Back Office

A complete e-commerce platform for a Safaricom products reseller: storefront,
M-Pesa (Daraja) payments, order fulfilment, support desk and a full admin
back-office — all configurable from the admin UI, no code changes needed.

## Stack

| Layer     | Choice                                          |
| --------- | ----------------------------------------------- |
| Framework | Next.js 15 (App Router, TypeScript, SSR)        |
| Styling   | Tailwind CSS v4 (Safaricom-derived design system) |
| Database  | SQLite via Prisma (file on a persistent volume) |
| Auth      | Phone-number accounts, bcrypt, iron-session cookies |
| Payments  | Safaricom Daraja — STK Push, callback, push query |
| Images    | Stored in DB (BLOB), served via `/api/img/[id]` |

## Run locally

```bash
npm install
npx prisma migrate dev      # creates prisma/gcn.sqlite
node scripts/bootstrap.mjs  # admin + demo catalog (idempotent)
npm run dev                 # http://localhost:3000
```

`.env` (see `.env.example`):

```ini
SESSION_SECRET="a-long-random-secret-min-32-chars"
APP_URL=http://localhost:3000
DATABASE_URL=file:./gcn.sqlite
ADMIN_NAME=Green Admin
ADMIN_PHONE=254700000000
ADMIN_PASSWORD="Admin#2026"     # NOTE: quote values containing #
MPESA_SIMULATE=true             # true = demo M-Pesa, no Daraja call
```

**Default admin** (created on first boot only): phone `254700000000`,
password from `ADMIN_PASSWORD`. Log in at `/admin/login` and change it under
Admin → Staff.

`MPESA_SIMULATE=true` lets you demo the entire purchase flow (STK prompt →
payment → receipt → fulfilment) offline: after ~6 seconds the pending payment
auto-confirms with a `SIM…` receipt.

## Admin back office (`/admin`)

- **Dashboard** — revenue today/7d/30d, 14-day chart, orders-by-status, top
  products, low-stock + new-message alerts, CSV exports.
- **Orders** — filter/search, payment audit trail, fulfil (process → complete
  with Safaricom top-up ref), cancel/refund (restores stock).
- **Products** — full CRUD, image upload (JPEG/PNG/WebP ≤ 4 MB, magic-byte
  checked), dynamic fields per category, stock tracking, featured flag.
- **Categories** — create/edit categories, decide whether products need photos,
  whether stock is tracked, whether items are instant top-ups, and define the
  custom fields (e.g. Size GB, Validity) every product in the category fills in.
- **Customers / Support inbox / Staff / Audit log / Settings.**
- **Settings (admin only)** — business info (till number, contacts, hours,
  announcement bar), M-Pesa Daraja credentials (sandbox/production, till or
  paybill, consumer key/secret, passkey — encrypted at rest, masked on screen,
  write-only) + “Check credentials” / “Send KSh 1 test push” buttons, SEO text,
  and off-site database backups (see below).

Roles: **ADMIN** = everything; **STAFF** = orders, products, categories,
customers, support (no settings/staff/audit). Every mutation is audit-logged.

## Database backups (Admin → Settings → Backups)

The whole database (orders, catalog, customers, settings) lives in one SQLite
file, so backing it up is one thing: snapshot that file and ship it
somewhere else. Configured entirely from the admin UI — no env vars, no
redeploy:

1. Get a bucket from any S3-compatible provider: AWS S3, Cloudflare R2,
   Backblaze B2, DigitalOcean Spaces, or a self-hosted MinIO.
2. Admin → Settings → Backups → fill in the endpoint (leave blank for real
   AWS S3), region, bucket name, access key ID and secret access key.
3. **Back up now** to confirm it actually works before trusting the schedule.
4. Turn on **Enable scheduled backups** and set an interval (hours) and how
   many recent backups to keep — older ones are pruned automatically.

Each backup uses SQLite's `VACUUM INTO` to take a consistent snapshot even
while the app keeps serving traffic, so it's safe to run at any time. The
schedule is driven by the running web server itself (checked every 15
minutes against the last recorded run) — no separate worker or cron service
needed. Credentials are AES-256-GCM encrypted at rest, the same as Daraja
credentials, and the secret key is write-only once saved.

To restore, download the backup object from your bucket and replace the
volume's SQLite file with it while the app is stopped.

## Going live with M-Pesa (Daraja)

1. Create an app at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
   → get **Consumer Key**, **Consumer Secret** and **Passkey** (Lipa na M-Pesa Online).
2. For a **till**: open *M-Pesa For Business* app → your till → *Manage My
   Till/APIs* → activate **Lipa na M-Pesa Online (API)**. (For paybill: the
   Daraja portal registers the callback URL instead.)
3. On the deployed site: Admin → Settings → M-Pesa →
   - Environment: **Production**
   - Transaction type: **CustomerBuyGoodsOnline** (till) or CustomerPayBillOnline
   - **Paybill**: Shortcode = your paybill number, paste key/secret/passkey.
   - **Till (Buy Goods)**: this needs **two different numbers** — per
     Safaricom's own Daraja FAQ, Shortcode must be the **Store/HO number
     issued at Go Live**, and the separate **Till Number** field must hold
     the actual till number customers dial. Entering the till number in
     both is the single most common cause of Daraja error 2002 ("Agent
     number and Store number entered do not match") — STK Push silently
     "succeeds" (`ResponseCode: 0`) but never reaches the phone.
   - Callback base URL = your site URL (pre-filled automatically)
   - Save → **Check credentials** → **Send KSh 1 test push** (waits ~10s and
     confirms Daraja's actual result, not just that the request was accepted).
4. Set `MPESA_SIMULATE=false` in the environment so real Daraja calls are made.

Payments are reconciled three ways: Daraja callback → payment record; browser
polling → STK Push Query (if the callback is silent); and a manual audit trail
in the order view. Amount mismatches are flagged and never auto-complete.

## Deploying (Railway)

The repo ships a `Dockerfile` (build → `scripts/start.mjs`: migrate deploy →
bootstrap → `next start`).

1. Create a project + service from this repo/directory (Dockerfile detected).
2. Add a **volume mounted at `/data`**.
3. Set variables:
   - `SESSION_SECRET` (strong, 32+ chars) — also encrypts stored Daraja secrets
   - `DATABASE_URL=file:/data/gcn.sqlite`
   - `ADMIN_NAME`, `ADMIN_PHONE`, `ADMIN_PASSWORD` (quoted if it contains `#`)
   - `APP_URL=https://<your-domain>` (set after generating the domain)
   - `MPESA_SIMULATE=false` for real payments
4. Generate a domain, health check `/api/health` returns `{"ok":true}`.

## Security notes

CSRF double-submit tokens on all mutations · httpOnly signed session cookies ·
login lockout after 5 failures · rate limiting (auth/checkout/support) ·
bcrypt password hashing · AES-256-GCM encryption for Daraja secrets ·
upload type/size validation · unguessable order/ticket codes · security
headers · full audit log. `robots.txt` blocks `/admin`, `/account`, `/api`.

## Project layout

```
prisma/            schema + migrations
scripts/           start.mjs (prod), bootstrap.mjs (seed)
src/lib/           db, session, settings (encrypted), daraja, validation, rate limit, audit
src/app/(store)/   storefront pages
src/app/admin/     back office
src/app/api/       REST endpoints (incl. /api/mpesa/callback)
src/components/    design-system + store + admin components
```
