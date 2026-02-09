# Migrating Local Database to Production

This guide shows how to transfer your local SQLite database (with all users, events, and attendance) to your production deployment.

## Option 1: Copy Database File (Easiest - SQLite only)

If you're deploying to Railway or Render with SQLite:

### Step 1: Export your local database
```bash
# Make a backup copy
cp pcpoints.sqlite pcpoints-backup.sqlite
```

### Step 2: Upload to your deployment platform

**For Railway:**
1. Go to Railway dashboard → Your project → Settings
2. Find "Volumes" or "Persistent Storage" section
3. Upload `pcpoints.sqlite` file
4. Set the path where it should be mounted (usually `/app` or project root)

**For Render:**
1. Use Render's Persistent Disk feature
2. SSH into your service or use Render's file browser
3. Upload `pcpoints.sqlite` to the persistent disk location

**Note:** This only works if your production platform supports file uploads. Railway and Render may not have direct file upload, so see Option 2.

---

## Option 2: Export Data and Re-import (Recommended)

### Step 1: Export users from local database

Create a script to export your data:

```bash
# Export users to JSON
sqlite3 pcpoints.sqlite "SELECT id, name, username, email, password_hash, role_level, must_change_password, is_active FROM users;" > users-export.txt
```

Or use this Node.js script (see `export-data.js` below).

### Step 2: Import into production

After deploying, you can:
- Use the CSV import script if you still have the CSV
- Use a migration script to insert users directly
- Manually create users through the admin panel

---

## Option 3: Use Migration Script (Best for Production)

I'll create a script that exports your local data and can import it into production.
