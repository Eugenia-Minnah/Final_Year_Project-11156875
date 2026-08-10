# Smart Hostel Finder

**Stack**
- Database: PostgreSQL (SQL)
- Backend: Node.js + Express (JavaScript)
- Frontend: HTML, CSS, vanilla JavaScript

**Folder structure**
```
smart-hostel-finder/
  database/
    schema.sql      -> creates all tables
    seed.sql        -> optional sample hostels
  backend/
    server.js       -> starts the API
    db.js           -> database connection
    routes/auth.js       -> signup / login
    routes/hostels.js    -> browse / search / create hostels
    middleware/auth.js   -> protects private routes
    .env.example
    package.json
  frontend/
    index.html      -> public landing page (Sign in / Get started buttons)
    signin.html      -> sign in form
    signup.html      -> create account form
    dashboard.html    -> the "web app" (only reachable after signing in)
    css/style.css
    js/api.js, landing.js, auth.js, dashboard.js
```
