# Smart Hostel Finder

A full-stack web application for university students in Ghana to find, compare, and book **verified, off-campus** private hostels near their campus — with real distance calculation, not just a static directory.

Built as a final-year project (BSc Computing/IT, University of Ghana).

---

## What makes this "smart"

Unlike a plain hostel listing site, this application calculates the **real geographic distance** (Haversine formula) between a student's selected campus and every hostel with known coordinates — live, on every search. A hostel is never permanently tied to one university: the same physical hostel can appear in searches from multiple nearby campuses, each with its own correctly recalculated distance.

---

## Stack

| Layer | Technology |
|---|---|
| Database | PostgreSQL |
| Backend | Node.js + Express (JavaScript) |
| Frontend | HTML, CSS, vanilla JavaScript (no framework) |
| Payments | Paystack (card + Mobile Money) |
| Maps | Leaflet.js + OpenStreetMap (free, no API key) |
| Email | Nodemailer via Gmail SMTP (optional) |

---

## Core features

- **Region → University → Campus** cascading search, with real-time distance calculation to every hostel
- **Role-based access**: separate student, hostel owner, and admin portals with independent login pages and dashboards — a student can never see owner-management tools and vice versa
- **Booking flow** with real Paystack deposit payments (card + Mobile Money)
- **Reviews** — students can rate and review hostels they've engaged with
- **Admin verification workflow** — new hostel listings require admin approval before appearing as "Verified"
- **Hostel claiming** — an owner can request ownership of a directory-researched listing; an admin reviews and approves before ownership transfers
- **Photo uploads** for hostel listings (owner-managed)
- **In-app notifications** — students and owners are notified of booking confirmations, hostel approvals, and claim decisions
- **Self-service profile pages** for students and owners (edit name/phone/campus, change password)
- **Password reset** via email (falls back to console-logging the link in local development if email isn't configured)
- **Pagination** on the full hostel search page
- **Featured hostels** curation for the landing page, separate from the full searchable database

## Real hostel data

This project deliberately avoids fabricated demo data. Every hostel currently in the seed data was individually researched and verified — real coordinates (sourced from OpenStreetMap and cross-checked contact numbers), confirmed off-campus status, and documented sources. Where a hostel's location or off-campus status couldn't be verified, it was excluded rather than guessed. See `database/seed_real_hostels_batch*.sql` for the full research trail and sourcing notes.

**Known limitation:** research coverage is strongest in major metro areas (Accra, Kumasi, Cape Coast) where OpenStreetMap has dense hostel-level tagging. Smaller regional towns (e.g. Koforidua, Ho, Wa) had far less verifiable data available, and several regions have zero seeded hostels as a result — this is intentional (avoiding fabrication) rather than an oversight.

---

## Folder structure

```
smart-hostel-finder/
  database/
    schema.sql                  -> base tables
    *.sql                       -> incremental migrations (run in date order -- see Setup below)
  backend/
    server.js                   -> Express entry point
    db.js                       -> PostgreSQL connection pool
    middleware/auth.js          -> JWT auth + role guards
    routes/
      auth.js                   -> signup / login / profile / password reset
      hostels.js                -> search, create/edit, verification, claims
      bookings.js               -> booking + Paystack payment flow
      locations.js              -> region/university/campus lookups
      notifications.js          -> in-app notifications
    utils/
      geocode.js / paystack.js / mailer.js / notify.js
    scripts/
      geocode-missing-hostels.js
  frontend/
    index.html                  -> public landing page (featured hostels)
    explore.html                -> full search page (all hostels, filters, pagination, map)
    student-login.html / student-dashboard.html / student-profile.html
    owner-login.html / owner-dashboard.html / owner-profile.html
    admin-login.html / admin.html
    add-hostel.html / edit-hostel.html / hostel.html
    payment-callback.html
    js/                         -> one file per page/feature, plus shared helpers (api.js, map.js, etc.)
    css/style.css
```

---

## Setup

### 1. Database

Create the database, then run the migrations **in this order** (schema first, then chronologically):

```
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
```

If any migration errors saying a column/table already exists, that's harmless -- it means it was already applied; move on to the next one.

### 2. Backend

```
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
|---|---|---|
| Student | `student@example.com` | `password123` |
| Owner | `owner@example.com` | `password123` |
| Admin | `admin@example.com` | `password123` |

Admin has no public link -- go directly to `/admin-login.html`.

---

## Known limitations (honest, for the record)

- **Distance is straight-line ("as the crow flies"), not real walking/driving distance.** Getting actual routing requires a paid API (Google Directions); "View Route" instead opens Google Maps directions in a new tab as a practical middle ground.
- **Hostel claim verification is manual.** An admin approving a claim currently relies on their own judgement (e.g. calling the phone number on file), not an automated identity check.
- **Coverage is uneven across Ghana** -- see "Real hostel data" above.
- **One photo per hostel**, not a gallery.
- **Geocoding must happen in the browser, not the backend** -- OpenStreetMap's free Nominatim service blocks automated server-to-server geocoding requests per its usage policy; only human-triggered browser requests are allowed. `backend/utils/geocode.js` is unused for this reason -- see `frontend/js/geocode-client.js` for the actual (working) implementation.

---

## Not yet built

Wishlist/favoriting, owner-to-student in-app chat, owner analytics (view/booking counts), an admin profile page, and a dedicated automated test suite.
