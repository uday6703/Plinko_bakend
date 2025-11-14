# Deploying the backend to Render

This document contains step-by-step instructions to deploy the `backend` service to Render using a managed PostgreSQL database.

1) Commit these changes and push to your GitHub repo (branch `main`):

   - `backend/prisma/schema.prisma` now targets `postgresql`.
   - A `render.yaml` manifest was added to define the web service + managed DB.

2) (Optional) Create Prisma migrations locally:

   - If you have a Postgres database available locally or on Render, set `DATABASE_URL` to that value in `backend/.env` (or export it in your shell), then run:

     ```powershell
     cd backend
     npx prisma generate
     npx prisma migrate dev --name init
     ```

   - Commit the generated `prisma/migrations/` folder to the repo. This allows `npx prisma migrate deploy` to run during Render deploy.

3) Deploy on Render (UI):

   - Go to https://dashboard.render.com and create a new service by connecting your GitHub repo.
   - Render will detect `render.yaml` and offer to create the `plinko-backend` web service and the `plinko-db` Postgres database.
   - Alternatively, create a Web Service manually and set:
     - Root Directory: `backend`
     - Environment: `Node`
     - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
     - Start Command: `npm start`
   - Set environment variables for the service:
     - `DATABASE_URL` &mdash; use the connection string for the created Postgres DB (Render provides it in the dashboard).
     - `FRONTEND_URL` &mdash; the URL of your frontend (if deployed), or the development URL while testing.
     - `NODE_ENV=production`

4) Render migration step:

   - The build command includes `npx prisma migrate deploy`, which will apply committed migrations to your Render Postgres DB during deploy. Ensure `prisma/migrations` is committed in your repo.

5) Verify deployment:

   - Open the service URL from Render and hit `GET /api/health` to confirm the backend is running.
   - Check logs in the Render dashboard for `npx prisma generate` and `npx prisma migrate deploy` outputs.

Notes & tips
 - If you prefer to keep using SQLite, you can set `DATABASE_URL="file:./dev.db"` in Render, but the DB file is ephemeral and will be lost on redeploys.
 - If `npx prisma migrate deploy` fails on Render, you can run migrations manually against the Render Postgres instance using a local `DATABASE_URL` pointing at it, then push the migration files.

## Environment variables

Create a `.env` file in `backend/` or set environment variables in the Render dashboard. Required variables:

- `DATABASE_URL` — Postgres connection string provided by Render (or your DB). Example: `postgresql://user:pass@host:5432/dbname`
- `FRONTEND_URL` — URL of the frontend site (e.g. `https://pinko-frontend-1kqm.vercel.app` or `http://localhost:3000`)
- `PORT` — optional; defaults to `5000`.

I added a `.env.example` file to the `backend/` directory showing these values — copy it to `.env` and fill in your DB connection before running migrations locally.
