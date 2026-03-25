# Always-On Server Deployment (Render)

This backend is designed to run as a long-lived Node process (HTTP server, WebSocket, cron jobs).
Use an always-on host for production instead of Vercel Functions.

## 1. Deploy with Blueprint

1. Push this repo to GitHub.
2. In Render, choose Blueprint deploy.
3. Select the repo root. Render will detect `render.yaml`.
4. Confirm the web service settings:
   - Root directory: `server`
   - Build command: `npm install`
   - Start command: `npm run start`
   - Health check: `/api/v1/health`
5. Keep the persistent disk mounted at `/var/data`.

## 2. Required Environment Variables

Set these in Render service settings:

- `CLIENT_ORIGIN` = your frontend URL (or comma-separated URLs)
- `NEWS_API_KEY` = your news provider key

Generated automatically by blueprint:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

Configured by blueprint:

- `NODE_ENV=production`
- `DB_PATH=/var/data/farols.db`
- `REFRESH_COOKIE_SAMESITE=none`

## 3. Frontend API URL

Set frontend env to your always-on backend URL:

- `VITE_API_URL=https://<your-render-service>.onrender.com/api/v1`

If your frontend uses cookies across domains, keep HTTPS and production cookie settings enabled.

## 4. Verify After Deploy

Check these URLs:

- `https://<your-render-service>.onrender.com/api/v1/health`
- `https://<your-render-service>.onrender.com/api/health`

Both should return JSON with `status: "ok"`.
