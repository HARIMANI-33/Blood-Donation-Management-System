# Blood Bank Management System - Backend API

REST API server built with **Node.js**, **Express.js**, and **TypeScript**.

## Project Architecture

```text
backend/
├── src/
│   ├── config/         # App configuration & environment loaders
│   ├── controllers/    # Request handlers & response formatters
│   ├── middleware/     # Custom Express middlewares (404, error handler)
│   ├── routes/         # REST API route definitions
│   ├── services/       # Core business logic layer
│   ├── models/         # Database models and TypeScript interfaces
│   ├── utils/          # Helper functions and shared utilities
│   └── app.ts          # Express application setup & server entry
├── .env.example        # Environment variable template
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript compiler options
└── README.md           # Backend documentation
```

## Available Scripts

In the `backend` directory, you can run:

- **`npm run dev`**: Starts the server in development mode with automatic hot reloading (`ts-node-dev`).
- **`npm run build`**: Cleans the `dist/` directory and compiles TypeScript into JavaScript.
- **`npm start`**: Runs the compiled production build from `dist/app.js`.

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure your environment variables if needed:
   - `PORT`: Server port (default: `5000`)
   - `NODE_ENV`: `development` | `production`
   - `CLIENT_URL`: URL of the frontend application (for CORS)

## Health Check Endpoint

- **Method:** `GET`
- **Path:** `/api/health`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Blood Bank API is running"
  }
  ```

## Auth Endpoints

- **`POST /api/auth/register`** — body: `{ name, email, password, phone?, bloodGroup? }` → creates a user and returns `{ user, token }`.
- **`POST /api/auth/login`** — body: `{ email, password }` → returns `{ user, token }`.
- **`GET /api/auth/me`** — requires `Authorization: Bearer <token>` → returns the current user.

## Dashboard Endpoint

- **`GET /api/dashboard/stats`** — requires `Authorization: Bearer <token>` → returns `{ totalUsers, totalDonors, byBloodGroup }`.

## Database Setup

This project uses PostgreSQL. Before starting the server, create the database and run the schema:

```bash
createdb blood_bank_db
psql -U postgres -d blood_bank_db -f ../database/schema.sql
```

Then set `DB_*` and `JWT_SECRET` in your `.env` (see `.env.example`).
