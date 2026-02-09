# Migrate Your Database to Railway (Persistent)

This guide gets your **existing local SQLite database** onto Railway so it **persists** across deploys.

---

## Part 1: Make the database persist on Railway

Railway’s app filesystem is ephemeral, so the DB file is lost on each deploy. Use a **Volume** so the DB lives on persistent storage.

### 1. Create a Volume

1. Open [Railway Dashboard](https://railway.app) → your project.
2. Click **+ New** → **Volume**.
3. Name it (e.g. `pcpoints-data`).
4. Set **Mount Path**: `/data`.
5. Attach the volume to your **web service** (the one running this app).

### 2. Point the app at the volume

1. Open your **service** → **Variables**.
2. Add:
   ```bash
   DATABASE_PATH=/data/pcpoints.sqlite
   ```
3. Redeploy (or let Railway redeploy when you add the variable).

After this, the app will use `/data/pcpoints.sqlite` on the volume, and the database will persist across deployments.

---

## Part 2: Migrate your existing local data

You have two ways to get your current `pcpoints.sqlite` (or exported data) onto Railway.

### Option A: SQL backup via URL (recommended)

Good if you have a lot of data and don’t want to commit export files to git.

**Step 1 – Export locally**

```bash
# From your project root (uses DATABASE_PATH if set, else pcpoints.sqlite)
node export-sql.js
```

This creates `backup.sql`.

**Step 2 – Put the backup somewhere reachable**

- **GitHub Gist:** Create a secret gist, paste the contents of `backup.sql`, then use the “Raw” URL.
- Or any HTTPS URL only you can access (e.g. private S3, etc.).

**Step 3 – Restore on Railway**

The restore must run on Railway (where `/data` exists), not locally. The app runs it automatically on startup when `RESTORE_SQL_URL` is set.

1. In Railway → your service → **Variables**, add (temporarily):
   ```bash
   RESTORE_SQL_URL=https://gist.githubusercontent.com/.../raw/.../backup.sql
   ```
   Use your actual raw URL.

2. **Deploy** (or trigger a redeploy). On startup the app will restore from the URL, then start the server. Check deploy logs for: `Restore complete: N users, ...`

3. Remove `RESTORE_SQL_URL` from Variables and redeploy (so the restore isn’t run again).

Your existing database is now in `/data/pcpoints.sqlite` on Railway and will persist.

---

### Option B: JSON export/import (no URL needed)

Good for smaller datasets. You’ll run export locally and import on Railway using the existing scripts.

**Step 1 – Export locally**

```bash
node export-data.js
```

This creates `exported-users.json`, `exported-events.json`, `exported-attendance.json`.

**Step 2 – Get the files onto Railway and import**

- **Option B1 – One-off run with files in repo (temporary):**
  1. Add the three JSON files to the repo (e.g. in a `migration/` folder).
  2. Commit and push so Railway deploys with those files.
  3. In `import-data.js`, ensure it looks for the files in that path (e.g. `migration/exported-users.json`), or run from project root and move files to root.
  4. Run:
     ```bash
     railway run node import-data.js
     ```
  5. Remove the JSON files from the repo, commit and push again (they contain password hashes).

- **Option B2 – Use a single JSON export:**  
  If you have `export-single-json.js` and `import-from-single-json.js`, you can export one file locally, add it temporarily to the repo, run the import on Railway, then remove it (same idea as above).

**Step 3 – Bootstrap if no users yet**

If the DB was empty on Railway and you didn’t import users, create the first admin:

```bash
curl -X POST https://your-app.railway.app/api/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{"name":"Your Name","username":"admin","email":"you@example.com","password":"your-password"}'
```

---

## Summary

| Step | Action |
|------|--------|
| 1 | Create a **Volume** on Railway, mount path `/data`, attach to your service. |
| 2 | Set **Variable** `DATABASE_PATH=/data/pcpoints.sqlite` and redeploy. |
| 3 | Export locally: `node export-sql.js` (or `node export-data.js`). |
| 4 | Restore on Railway: Option A → `RESTORE_SQL_URL` + `railway run node restore-from-url.js`, or Option B → put JSON in repo, `railway run node import-data.js`, then remove JSON. |
| 5 | (Optional) Remove `RESTORE_SQL_URL` or the export files and redeploy. |

After this, your database lives on Railway’s persistent volume and survives redeploys.

---

## Can't log in after restore?

1. **Restore may have failed** — Ensure `RESTORE_SQL_URL` is set and **deploy** (restore runs on startup). In deploy logs you should see: `Restore complete: N users, ...`. If you see an error or 0 users, the DB may be empty; fix the backup URL or volume and redeploy.

2. **Same database** — The **web service** must have `DATABASE_PATH=/data/pcpoints.sqlite` set (and the volume mounted at `/data`). If that variable is missing, the running app uses an ephemeral DB and won't see the restored data.

3. **Login** — Use **username** (e.g. NetID like `aadarsh3`) or **email** plus password. For CSV-imported members the password is `pctattendance`. Avoid extra spaces.

4. **Cookies** — Use the same Railway URL in the browser; don't mix www vs non-www or different domains.
