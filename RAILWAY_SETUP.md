# Railway Setup: Persistent Database + Local Logins

This guide gets your app running on Railway with:

1. **All local logins working** — same usernames/emails and passwords as on your machine.
2. **Database that persists** — survives every new deployment; no data loss on redeploy.

---

## Why this works

- **Persistent storage:** Railway’s default filesystem is ephemeral (wiped on each deploy). Using a **Volume** gives you a permanent disk. The app will use a SQLite file on that volume.
- **Same logins:** You restore your local `backup.sql` (exported from your current `pcpoints.sqlite`) into that persistent database. All users and password hashes move over, so everyone can log in on the Railway app with the same credentials.

---

## Step-by-step (do in this order)

### 1. Create persistent storage (Volume)

So the database is never wiped on deploy:

1. [Railway Dashboard](https://railway.app) → your project.
2. **+ New** → **Volume**.
3. Name: `pcpoints-data`.
4. **Mount Path:** `/data`.
5. **Attach** the volume to your **web service** (this app).

### 2. Point the app at the volume

1. Open your **web service** → **Variables**.
2. Add:
   ```bash
   DATABASE_PATH=/data/pcpoints.sqlite
   ```
3. Also set (if not already):
   ```bash
   JWT_SECRET=<random-32-byte-hex>
   NODE_ENV=production
   ```
   Generate JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

After the next deploy, the app will create/use the database at `/data/pcpoints.sqlite` on the volume. **That file persists across all future deployments.**

### 3. Export your local database

On your machine (project root):

```bash
node export-sql.js
```

This creates `backup.sql` with all users, events, and attendance (including password hashes).

### 4. Restore backup on Railway (so local logins work)

The restore **must run on Railway’s servers** (where `/data` exists), not on your laptop. The app runs the restore automatically on startup when `RESTORE_SQL_URL` is set.

1. Upload `backup.sql` to a **secret** [GitHub Gist](https://gist.github.com):
   - New secret gist → paste contents of `backup.sql` → Create → click **Raw** → copy the raw URL.

2. In Railway → your service → **Variables**, add (temporarily):
   ```bash
   RESTORE_SQL_URL=https://gist.githubusercontent.com/.../raw/.../backup.sql
   ```

3. **Deploy** (push a commit or trigger a redeploy). When the app starts, it will run the restore once and then start the server. In the deploy logs you should see: `Restore complete: N users, ...`

4. **Remove** `RESTORE_SQL_URL` from Variables and redeploy (so the restore is not run on every startup).

Your Railway app now has the same users and passwords as locally. Everyone can log in with **username** (e.g. NetID) or **email** and their usual password.

### 5. Done

- The database lives at `/data/pcpoints.sqlite` on the volume and **persists across every new deployment**.
- All logins that work locally work on the Railway app.

---

## Quick reference

| Goal | What to do |
|------|------------|
| Database persists across deploys | Create Volume, mount `/data`, set `DATABASE_PATH=/data/pcpoints.sqlite`. |
| Local logins work on Railway | Export `backup.sql` locally, put it at a URL, set `RESTORE_SQL_URL`, **deploy** (restore runs on startup), then remove the variable. |

For more detail and troubleshooting, see **RAILWAY_MIGRATION.md** and **MIGRATE_TO_CLOUD.md**.
