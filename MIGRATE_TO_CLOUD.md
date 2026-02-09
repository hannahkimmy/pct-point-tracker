# Database Cloud Migration Guide

This guide will help you migrate your SQLite database (`backup.sql`) to Railway so that:

- **All your local logins work** on the Railway app (same users and passwords).
- **The database is persistent** and survives every new deployment.

For a single consolidated checklist, see **RAILWAY_SETUP.md**.

## Quick Start

Run the helper script:
```bash
./migrate-to-cloud.sh
```

Or follow the steps below. **Important:** Set up the Volume and `DATABASE_PATH` first so the database is persistent from the start; then restore your backup so logins work.

## Step-by-Step Migration

### Step 1: Upload Your Backup to GitHub Gist

1. Go to https://gist.github.com
2. Create a new **secret gist**
3. Name the file: `backup.sql`
4. Paste the contents of your `backup.sql` file
5. Click "Create secret gist"
6. Click "Raw" button to get the raw URL
7. Copy the URL (looks like: `https://gist.githubusercontent.com/username/gist-id/raw/backup.sql`)

### Step 2: Deploy to Railway

1. Push your code to GitHub (if not already)
2. Go to https://railway.app
3. Create New Project → "Deploy from GitHub repo"
4. Select your repository

### Step 3: Set Up Persistent Storage

1. Railway Dashboard → Your Project → "+ New" → "Volume"
2. Name: `pcpoints-data`
3. Mount Path: `/data`
4. Attach to your web service

### Step 4: Configure Environment Variables

In Railway → Your Service → Variables, add:

```
DATABASE_PATH=/data/pcpoints.sqlite
JWT_SECRET=<generate-random-secret>
NODE_ENV=production
RESTORE_SQL_URL=<your-gist-raw-url>
```

Generate JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Restore Database

The restore runs **on Railway** when the app starts (not via `railway run` on your machine, since `/data` only exists on Railway). Add `RESTORE_SQL_URL` as in Step 4, then **deploy**. The app will restore once on startup. Check deploy logs for `Restore complete: N users, ...`

### Step 6: Clean Up

Remove `RESTORE_SQL_URL` variable after successful restore.

## Troubleshooting

See full guide in `RAILWAY_MIGRATION.md` for detailed troubleshooting.
