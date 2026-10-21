# Deploying Wanderlust Pro (free tier)

The app has two parts, and each goes to a different host:

| Part | Folder | Host | Free? |
|---|---|---|---|
| Frontend (React + Vite) | `client/` | **Vercel** | yes |
| API (Express) | `server/` | **Render** | yes (sleeps after 15 min idle) |
| Database (MongoDB) | — | **MongoDB Atlas** | yes (M0, 512 MB) |

You need: a GitHub account, a Vercel account, a Render account, an Atlas account.
All three can sign in with GitHub.

---

## 1. MongoDB Atlas (database)

1. Go to https://cloud.mongodb.com → **Create** a free **M0** cluster.
2. **Database Access** → *Add New Database User* → username + password (save them).
3. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`).
4. **Clusters → Connect → Drivers** → copy the string, it looks like:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/wanderlust_pro?retryWrites=true&w=majority
   ```
   Replace `USER`/`PASSWORD` and keep `/wanderlust_pro` as the database name.

> ⚠️ Use a password with no `@ : / ?` characters, or URL-encode them.

---

## 2. Push the code to GitHub

```bash
cd ~/Documents/wanderlust-pro
git add .
git commit -m "Production ready: deploy config, hardened API"
git branch -M main
# create an empty repo called wanderlust-pro on github.com first, then:
git remote add origin https://github.com/<your-username>/wanderlust-pro.git
git push -u origin main
```

---

## 3. API on Render

1. https://dashboard.render.com → **New → Blueprint** → pick your repo.
   Render reads `render.yaml` and creates the `wanderlust-api` service.
   (No blueprint? Use **New → Web Service**, root directory `server`,
   build `npm install`, start `npm start`.)
2. In the service → **Environment**, set:
   | Key | Value |
   |---|---|
   | `MONGO_URI` | the Atlas string from step 1 |
   | `CLIENT_URL` | your Vercel URL, e.g. `https://wanderlust-pro.vercel.app` (add more, comma separated, once you know the final domain) |
   | `JWT_SECRET` | any long random string (`openssl rand -hex 32`) |
3. Deploy. When it finishes, open `https://<service>.onrender.com/api/health` — you should see `{"success":true,...}`.
4. Seed the demo data **once** from your machine against Atlas:
   ```bash
   cd server
   MONGO_URI="mongodb+srv://..." npm run seed
   ```

---

## 4. Frontend on Vercel

1. https://vercel.com/new → import the same GitHub repo.
2. **Root Directory:** `client`
   Framework preset: **Vite** (auto-detected) · Build: `npm run build` · Output: `dist`
   (`client/vercel.json` already declares this, plus SPA rewrites.)
3. **Environment Variable** (Production + Preview):
   ```
   VITE_API_URL = https://<your-service>.onrender.com/api
   ```
4. Deploy. Vercel prints your link, e.g. `https://wanderlust-pro.vercel.app`.
5. Go back to Render and put that exact URL in `CLIENT_URL`, then **Manual Deploy → Restart**.

Open the Vercel link — the site is live.

---

## 5. Deploying from the VS Code terminal instead

```bash
# Frontend (interactive login the first time)
cd ~/Documents/wanderlust-pro/client
npx vercel login
npx vercel --prod
# when asked, set the env var:
npx vercel env add VITE_API_URL production     # paste https://<api>.onrender.com/api
npx vercel --prod                               # redeploy so the value is baked in
```

```bash
# API (Render CLI, optional — the dashboard is easier)
brew install render
render login
render deploys create <service-id> --wait
```

---

## 6. Checklist after the first deploy

- [ ] `https://<api>/api/health` returns success
- [ ] Home page shows stays (if empty, the seed step was skipped)
- [ ] Login works and stays logged in after a refresh (cookies need `CLIENT_URL` to match exactly)
- [ ] Browser console has no CORS errors
- [ ] Images upload (Render's disk is ephemeral — connect Cloudinary for production storage by setting `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET`)

## Common deploy problems

| Symptom | Cause / fix |
|---|---|
| `CORS: https://... is not allowed` | `CLIENT_URL` on Render doesn't match the Vercel domain exactly (no trailing slash). Restart after changing. |
| Login works then logs out on refresh | Same as above — the cookie is rejected when the origin doesn't match. |
| 502 / app sleeping | Render free tier sleeps after 15 min; the first request takes ~30 s. |
| `MongoServerError: bad auth` | Wrong Atlas password, or the password contains characters that need URL-encoding. |
| Blank page on refresh of `/listings/...` | `client/vercel.json` rewrites are missing — keep that file. |
| Images 404 after a while | Render's filesystem is ephemeral — use Cloudinary. |
