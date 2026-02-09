# Deployment Guide

This guide will help you deploy the PC Points app to a public cloud platform.

## Quick Start (Recommended: Railway or Render)

Both platforms offer free tiers and make deployment very easy. SQLite works fine for small-to-medium deployments.

### Option 1: Railway (Easiest - Recommended)

1. **Sign up** at https://railway.app (free tier available)
2. **Create new project** → "Deploy from GitHub repo"
3. **Connect your GitHub repo** (push your code to GitHub first)
4. **Railway auto-detects** Node.js and deploys
5. **Set environment variables:**
   - Go to Variables tab
   - Add: `JWT_SECRET` (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - Add: `NODE_ENV=production`
6. **Get your public URL** from Railway dashboard
7. **Done!** Your app is live

**Note:** Railway provides persistent storage, so SQLite will work fine. The database file persists between deployments.

### Option 2: Render (Also Easy)

1. **Sign up** at https://render.com (free tier available)
2. **Create a new Web Service**
3. **Connect GitHub** and select your repo
4. **Settings:**
   - Name: `pcpoints-app`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - **Add Persistent Disk** (for SQLite database):
     - Go to Settings → Persistent Disk
     - Mount path: `/opt/render/project/src`
     - This keeps your database file between deployments
5. **Environment Variables:**
   - `JWT_SECRET`: (generate random string)
   - `NODE_ENV`: `production`
6. **Deploy!**

### Option 3: Heroku

1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Login: `heroku login`
3. Create app: `heroku create pcpoints-app`
4. Set config: 
   ```bash
   heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   heroku config:set NODE_ENV=production
   ```
5. Deploy: `git push heroku main`

**Note:** Heroku's filesystem is ephemeral, so SQLite will reset on each deploy. Consider PostgreSQL (see below).

## Quick Deploy Options

### Option 1: Render (Recommended - Free Tier Available)

1. **Create a Render account** at https://render.com
2. **Create a new PostgreSQL database:**
   - Go to Dashboard → New → PostgreSQL
   - Name it `pcpoints-db`
   - Note the connection string (Internal Database URL)

3. **Create a new Web Service:**
   - Go to Dashboard → New → Web Service
   - Connect your GitHub repository (or deploy from GitHub)
   - Settings:
     - **Name:** `pcpoints-app`
     - **Environment:** Node
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Environment Variables:**
       ```
       JWT_SECRET=<generate-a-random-secret-string>
       DATABASE_URL=<from-postgres-database>
       NODE_ENV=production
       ```

4. **Deploy!** Render will automatically deploy your app.

### Option 2: Railway (Easy Setup)

1. **Create a Railway account** at https://railway.app
2. **Create a new project** → Deploy from GitHub
3. **Add PostgreSQL database:**
   - Click "+ New" → Database → PostgreSQL
   - Railway automatically sets `DATABASE_URL`

4. **Set environment variables:**
   - Go to Variables tab
   - Add `JWT_SECRET` (generate a random string)
   - Add `NODE_ENV=production`

5. **Deploy!** Railway auto-detects Node.js and deploys.

### Option 3: Heroku (Classic Option)

1. **Install Heroku CLI:** https://devcenter.heroku.com/articles/heroku-cli
2. **Login:** `heroku login`
3. **Create app:** `heroku create pcpoints-app`
4. **Add PostgreSQL:** `heroku addons:create heroku-postgresql:mini`
5. **Set environment variables:**
   ```bash
   heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   heroku config:set NODE_ENV=production
   ```
6. **Deploy:** `git push heroku main`

## Database Options

### SQLite (Current - Works Fine!)

SQLite works great for small-to-medium deployments. Most platforms support it:
- ✅ **Railway**: Persistent storage included
- ✅ **Render**: Use Persistent Disk feature
- ⚠️ **Heroku**: Ephemeral filesystem (data resets on deploy) - use PostgreSQL instead

### PostgreSQL (For Larger Scale or Heroku)

If you need PostgreSQL (e.g., for Heroku or larger deployments):

1. **Add PostgreSQL database** on your platform
2. **Install pg:** `npm install pg`
3. **Update db.js** to use PostgreSQL (contact support for migration script)
4. **Migrate data** from SQLite to PostgreSQL

For now, SQLite is recommended as it's simpler and works on most platforms.

## Environment Variables

Set these in your hosting platform:

- `JWT_SECRET`: A strong random string (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `DATABASE_URL`: PostgreSQL connection string (auto-set by most platforms)
- `NODE_ENV`: Set to `production`
- `PORT`: Usually auto-set by platform

## Security Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS (automatic on most platforms)
- [ ] Database credentials are secure (not in code)
- [ ] CORS is configured correctly
- [ ] Cookie settings are secure (httpOnly, sameSite)

## Post-Deployment

1. **Bootstrap admin account:**
   - Visit: `https://your-app-url.com/api/bootstrap-admin`
   - POST with: `{ "name": "...", "username": "...", "email": "...", "password": "..." }`

2. **Test login** and verify everything works

3. **Import existing data** if needed (use import scripts)

## Troubleshooting

- **Database connection errors:** Check `DATABASE_URL` is set correctly
- **Permission errors:** Verify environment variables are set
- **Build fails:** Check Node.js version (should be 18+)
- **CORS errors:** Verify CORS settings in server.js

## Support

For issues, check:
- Server logs in your hosting platform dashboard
- Browser console for frontend errors
- Database connection status
