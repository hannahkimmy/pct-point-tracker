# Quick Deployment Guide

## 🚀 Deploy in 5 Minutes (Railway - Recommended)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Deploy on Railway
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway auto-detects Node.js and starts deploying

### Step 3: Set Up Persistent Storage (IMPORTANT!)
**Your database will be wiped on each deploy unless you do this:**

1. **Create a Volume:**
   - Railway Dashboard → Your Project → **+ New** → **Volume**
   - Name: `pcpoints-data`
   - Mount path: `/data`

2. **Set Environment Variables:**
   - Go to your service → **Variables** tab
   - Add these variables:
     - `JWT_SECRET`: Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
     - `NODE_ENV`: `production`
     - `DATABASE_PATH`: `/data/pcpoints.sqlite` ← **This makes your database persist!**

### Step 4: Get Your URL
1. Railway provides a public URL automatically
2. Click "Settings" → "Generate Domain" for a custom domain (optional)

### Step 5: Migrate Your Local Data (Optional but Recommended!)

If you have users/data in your local database that you want to keep:

**Option A: Export and Import (Recommended)**
1. **On your local machine**, export your data:
   ```bash
   npm run export:data
   ```
   This creates `exported-users.json`, `exported-events.json`, and `exported-attendance.json`

2. **Upload these files** to your Railway deployment:
   - Use Railway's file browser or SSH
   - Or add them temporarily to your repo (then remove after import)

3. **In Railway**, run the import:
   ```bash
   npm run import:data
   ```

**Option B: Bootstrap New Admin (if you don't have local data)**
1. Visit: `https://your-app-url.railway.app/api/bootstrap-admin`
2. Use a tool like Postman or curl:
   ```bash
   curl -X POST https://your-app-url.railway.app/api/bootstrap-admin \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Your Name",
       "username": "yourusername",
       "email": "your@email.com",
       "password": "yourpassword"
     }'
   ```
3. This creates the VP Comms (level 3) admin account

### Step 6: Login and Use!
Visit your Railway URL and login with your existing credentials (if you migrated) or the new admin account.

---

## 🔧 Alternative: Render

1. Go to https://render.com
2. New → Web Service → Connect GitHub
3. Settings:
   - Build: `npm install`
   - Start: `npm start`
   - **Important:** Add Persistent Disk (Settings → Persistent Disk)
     - Mount: `/opt/render/project/src`
4. Add environment variables (same as Railway)
5. Deploy!

---

## 📝 Pre-Deployment Checklist

- [ ] Code is pushed to GitHub
- [ ] `JWT_SECRET` is set (strong random string)
- [ ] `NODE_ENV=production` is set
- [ ] `.env` file is NOT committed (should be in .gitignore)
- [ ] Database file (`*.sqlite`) is NOT committed (should be in .gitignore)

---

## 🆘 Troubleshooting

**App won't start:**
- Check logs in Railway/Render dashboard
- Verify Node.js version (needs 18+)
- Check environment variables are set

**Database errors:**
- On Railway: Database persists automatically
- On Render: Make sure Persistent Disk is configured
- On Heroku: Use PostgreSQL (SQLite won't work)

**Can't login:**
- Make sure you've run `/api/bootstrap-admin` first
- Check server logs for errors

---

## 🔐 Security Notes

- ✅ JWT_SECRET should be a strong random string
- ✅ Never commit `.env` or database files
- ✅ Use HTTPS (automatic on Railway/Render)
- ✅ Change default JWT_SECRET before deploying

---

## 📞 Need Help?

Check the full `DEPLOYMENT.md` for more details and PostgreSQL migration options.
