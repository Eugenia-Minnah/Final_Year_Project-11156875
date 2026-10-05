# HostelScout

A full-stack web application for university students in Ghana to find, compare, book, and message the owners of **verified, off-campus** private hostels near their campus — with real travel distance, not just a static directory.

Built as a final-year project (BSc Computing/IT, University of Ghana).

> Formerly named "Smart Hostel Finder" — renamed to HostelScout partway through development after discovering the original name was already in use by an existing, unrelated site.

---

## What makes this "smart"

Unlike a plain hostel listing site, this application calculates **real road-network distance and driving time** (via the OSRM routing engine) between a student's selected campus and every hostel with known coordinates — live, on every search — the same kind of result you'd get from Google or Yandex Maps, not a straight-line guess. If the routing service is ever unreachable, the app automatically falls back to a straight-line estimate rather than failing outright. A hostel is never permanently tied to one university: the same physical hostel can appear in searches from multiple nearby campuses, each with its own correctly recalculated distance.

---

## Stack

| Layer | Technology |
| --- | --- |
| Database | PostgreSQL |
| Backend | Node.js + Express (JavaScript) |
| Frontend | HTML, CSS, vanilla JavaScript (no framework) |
| Payments | Paystack (card + Mobile Money) |
| Maps & distance | Leaflet.js + OpenStreetMap for maps (free, no API key); OSRM for real road-distance/driving-time routing |
| Email | Nodemailer via Gmail SMTP (optional) |

---

## Core features

- **Region → University → Campus** cascading search, with real road-distance and driving-time calculation to every hostel
- **Role-based access**: separate student, hostel owner, and admin portals with independent login pages and dashboards — a student can never see owner-management tools and vice versa
- **Booking flow** with real Paystack deposit payments (card + Mobile Money)
- **In-app chat** — a student can message a hostel's owner directly from the hostel's page; both sides have a dedicated inbox to view and reply to conversations
- **Reviews** — students can rate and review hostels they've engaged with (one review per student per hostel)
- **Admin verification workflow** — new hostel listings require admin approval before appearing as "Verified"
- **Hostel claiming, with proof of ownership** — an owner can request ownership of a directory-researched listing by uploading proof (a business registration certificate, a utility bill, or a photo of themselves at the hostel); an admin reviews the proof and approves or rejects before ownership transfers
- **Refund tracking for cancelled bookings** — if a student cancels a booking whose deposit was already paid, it's flagged "Refund pending" instead of silently staying marked "Paid"; an admin can mark it "Refunded" once they've manually sent the money back (no live payment-API refund call is made automatically — this is a deliberate choice, see Known limitations)
- **Photo uploads** for hostel listings (owner-managed)
- **In-app notifications** — students and owners are notified of booking confirmations, hostel approvals, claim decisions, and new chat messages
- **Self-service profile pages** for students and owners (edit name/phone/campus, change password)
- **Password reset** via email (falls back to console-logging the link in local development if email isn't configured)
- **Pagination** on the full hostel search page
- **Featured hostels** curation for the landing page, separate from the full searchable database

## Real hostel data

This project deliberately avoids fabricated demo data. Every hostel currently in the seed data was individually researched and verified — real coordinates (sourced from OpenStreetMap and cross-checked contact numbers), confirmed off-campus status, and documented sources. Where a hostel's location or off-campus status couldn't be verified, it was excluded rather than guessed. See `database/seed_real_hostels_batch*.sql` for the full research trail and sourcing notes.

**Known limitation:** research coverage is strongest in major metro areas (Accra, Kumasi, Cape Coast) where OpenStreetMap has dense hostel-level tagging. Smaller regional towns (e.g. Koforidua, Ho, Wa) had far less verifiable data available, and several regions have zero seeded hostels as a result — this is intentional (avoiding fabrication) rather than an oversight.

---

## Folder structure

```text
hostelscout/
  database/
    schema.sql                  -> base tables (current — includes all columns/constraints below)
    *.sql                       -> incremental migrations (run in date order -- see Setup below)
  backend/
    server.js                   -> Express entry point
    db.js                       -> PostgreSQL connection pool (auto-detects local vs. hosted DB for SSL)
    middleware/auth.js          -> JWT auth + role guards
    routes/
      auth.js                   -> signup / login / profile / password reset
      hostels.js                -> search, create/edit, verification, claims (+ proof upload)
      bookings.js               -> booking + Paystack payment flow + cancellation/refund tracking
      locations.js               -> region/university/campus lookups
      notifications.js          -> in-app notifications
      chat.js                   -> student <-> owner messaging
    utils/
      geocode.js / paystack.js / mailer.js / notify.js
      routing.js                -> real road-distance/driving-time via OSRM, with straight-line fallback
    scripts/
      geocode-missing-hostels.js
  frontend/
    index.html                  -> public landing page (featured hostels)
    explore.html                -> full search page (all hostels, filters, pagination, map)
    student-login.html / student-dashboard.html / student-profile.html / student-inbox.html
    owner-login.html / owner-dashboard.html / owner-profile.html / owner-inbox.html
    admin-login.html / admin.html
    add-hostel.html / edit-hostel.html / hostel.html
    payment-callback.html
    images/                     -> hero-bg.jpg, auth-photo.jpg (site photography)
    js/                         -> one file per page/feature, plus shared helpers (api.js, map.js, inbox.js, etc.)
    css/style.css
```

---

## Setup

### 1. Database

Create the database, then run the migrations **in this order** (schema first, then chronologically):

```bash
psql -U postgres -c "CREATE DATABASE smart_hostel_finder;"
cd database
psql -U postgres -d smart_hostel_finder -f schema.sql
psql -U postgres -d smart_hostel_finder -f regions_universities_schema.sql
psql -U postgres -d smart_hostel_finder -f regions_universities_seed.sql
psql -U postgres -d smart_hostel_finder -f migrate_hostels_to_campus.sql
psql -U postgres -d smart_hostel_finder -f redesign_location_hierarchy.sql
psql -U postgres -d smart_hostel_finder -f fix_campus_coordinates.sql
psql -U postgres -d smart_hostel_finder -f add_distance_and_amenities.sql
psql -U postgres -d smart_hostel_finder -f add_hostel_coordinates.sql
psql -U postgres -d smart_hostel_finder -f add_room_deposit.sql
psql -U postgres -d smart_hostel_finder -f add_password_reset.sql
psql -U postgres -d smart_hostel_finder -f add_bookings_reviews_admin.sql
psql -U postgres -d smart_hostel_finder -f add_hostel_contact_fields.sql
psql -U postgres -d smart_hostel_finder -f seed_real_hostels_batch1_greater_accra.sql
psql -U postgres -d smart_hostel_finder -f remove_fabricated_demo_hostels.sql
psql -U postgres -d smart_hostel_finder -f add_featured_hostels.sql
psql -U postgres -d smart_hostel_finder -f seed_real_hostels_batch2_3_ashanti_central.sql
psql -U postgres -d smart_hostel_finder -f seed_real_hostels_batch7_9_northern_uppereast.sql
psql -U postgres -d smart_hostel_finder -f add_real_coordinates_and_sample_rooms.sql
psql -U postgres -d smart_hostel_finder -f remove_stream_street_hostel.sql
psql -U postgres -d smart_hostel_finder -f add_booking_payments.sql
psql -U postgres -d smart_hostel_finder -f add_hostel_claims.sql
psql -U postgres -d smart_hostel_finder -f add_notifications.sql
psql -U postgres -d smart_hostel_finder -f fix_broken_seed_password.sql
psql -U postgres -d smart_hostel_finder -f add_chat.sql
```

If any migration errors saying a column/table already exists, that's harmless -- it means it was already applied (this is common since `schema.sql` itself already contains the final, current definition of every table — the numbered migrations after it exist as a historical record of how the schema evolved, not because they're all individually required on a brand-new database); move on to the next one.

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` -- at minimum set `DATABASE_URL` (your real Postgres password) and `JWT_SECRET` (any random string). `PAYSTACK_SECRET_KEY` (free test key from paystack.com) is required for the payment flow to work; `EMAIL_USER`/`EMAIL_APP_PASSWORD` are optional (password reset falls back to printing the link to the terminal if unset).

```
npm install
npm start
```

Runs at `http://localhost:5000` -- this single server serves both the API and the frontend.

### 3. Test accounts

| Role | Email | Password |
| --- | --- | --- |
| Student | `student@example.com` | `password123` |
| Owner | `owner@example.com` | `password123` |
| Admin | `admin@example.com` | `password123` |

Admin has no public link -- go directly to `/admin-login.html`. A handful of additional pre-seeded student accounts (for testing multiple reviewers/bookers at once) also use `password123` — see `database/seed_real_hostels_batch1_greater_accra.sql` for the full list.

---

## Deployment

The backend is a single Node/Express server that also serves the frontend, so it deploys as one unit — no separate frontend hosting needed. Two things specifically matter when deploying somewhere other than localhost:

- **Database SSL**: `db.js` automatically enables SSL for any `DATABASE_URL` that isn't `localhost`/`127.0.0.1`, which is what hosted Postgres providers (Railway, Render, etc.) require.
- **`trust proxy`**: `server.js` sets this so password-reset and Paystack payment links are generated with the correct `https://` scheme once behind a hosting platform's reverse proxy — without it, those links would incorrectly use `http://`.

**Uploaded files (hostel photos, claim-proof documents) are stored on local disk**, not a third-party service like Cloudinary — this was a deliberate choice for this project. That means the hosting platform needs to provide **persistent storage**, or uploaded files will be lost on every restart/redeploy. Confirm your host supports this (e.g. Railway's "Volumes" feature, mounted to `backend/uploads`) before relying on uploads surviving long-term.

---

## Known limitations (honest, for the record)

- **Road-distance relies on a free public routing service (OSRM's demo server)**, which has no uptime guarantee. If it's ever down or slow, the app automatically falls back to a straight-line distance estimate rather than failing — so distances stay available, just less precise, during an outage.
- **Hostel claim verification is manual.** An admin reviews the owner's uploaded proof (certificate, bill, or photo) and approves or rejects based on their own judgement — there's no automated identity/document verification.
- **Refunds are tracked, not automated.** Cancelling a paid booking flags it for an admin to refund manually (e.g. via Paystack's own dashboard or Mobile Money) and mark as done — the app does not call a live payment-API refund on the student's behalf.
- **Coverage is uneven across Ghana** -- see "Real hostel data" above.
- **One photo per hostel**, not a gallery.
- **Geocoding must happen in the browser, not the backend** -- OpenStreetMap's free Nominatim service blocks automated server-to-server geocoding requests per its usage policy; only human-triggered browser requests are allowed. `backend/utils/geocode.js` is unused for this reason -- see `frontend/js/geocode-client.js` for the actual (working) implementation.

---

## Not yet built

Wishlist/favoriting, owner analytics (view/booking counts), an admin profile page, and a dedicated automated test suite.
