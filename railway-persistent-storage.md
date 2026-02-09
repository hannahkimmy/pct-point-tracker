# Fix: Database Persisting on Railway

## The Problem
Railway's filesystem is **ephemeral** — files get wiped on each deployment. Your `pcpoints.sqlite` database file is deleted every time Railway redeploys, so the database is **not** persistent by default.

## The Solution: Use a Railway Volume

Once you use a Volume and point the app at it with `DATABASE_PATH`, the database file lives on that volume. **The database then persists regardless of new deployments** — redeploys only replace app code, not the volume data.

### Option 1: Railway Volume (Recommended)

1. **In Railway Dashboard:**
   - Go to your project → **New** → **Volume**
   - Name it: `pcpoints-data`
   - Mount path: `/data`

2. **Set Environment Variable:**
   - Go to your service → **Variables**
   - Add: `DATABASE_PATH=/data/pcpoints.sqlite`

3. **Redeploy** - Railway will now save the database in persistent storage!

### Option 2: Use Railway's Persistent Disk (if available)

Some Railway plans include persistent disk. Check your service settings for "Persistent Disk" option.

---

## Quick Fix Steps:

1. **Create Volume:**
   - Railway Dashboard → Your Project → **+ New** → **Volume**
   - Name: `pcpoints-data`
   - Mount: `/data`

2. **Set DATABASE_PATH:**
   - Service → Variables → Add:
     ```
     DATABASE_PATH=/data/pcpoints.sqlite
     ```

3. **Redeploy** (or Railway will auto-redeploy when you add the variable)

4. **Re-import your data:**
   ```bash
   railway shell
   npm run import:csv:members
   ```

Now your database will persist across deployments.

For the full flow (persistent DB **and** restoring your local logins to Railway), see **RAILWAY_SETUP.md**.
