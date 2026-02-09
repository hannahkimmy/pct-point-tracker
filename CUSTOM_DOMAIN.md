# Custom domain: pct-point-tracker.app

Your app uses **relative URLs** for the API (`/api/...`), so no code changes are needed. You only need to attach the custom domain in your hosting provider.

## On Railway

1. Open [Railway Dashboard](https://railway.app) → your project → your **web service**.
2. Go to **Settings** → **Networking** (or **Domains**).
3. Under **Custom Domain**, click **Add custom domain** (or **Generate domain** if you want Railway’s default first).
4. Enter: **pct-point-tracker.app**
5. Railway will show DNS instructions, for example:
   - **CNAME**: `pct-point-tracker.app` → `your-app.up.railway.app`  
   Or if you use a subdomain like `www`:
   - **CNAME**: `www.pct-point-tracker.app` → `your-app.up.railway.app`
6. In your **domain registrar** (where you bought pct-point-tracker.app), add the CNAME record(s) exactly as Railway shows.
7. Wait for DNS to propagate (often 5–30 minutes). Railway will issue SSL for your domain automatically.

After DNS is correct, the app will be available at **https://pct-point-tracker.app**.

## If you don’t own pct-point-tracker.app yet

- Buy the domain from a registrar (e.g. Namecheap, Google Domains, Cloudflare, etc.).
- Then follow the steps above and point the domain to Railway via the CNAME they give you.

## Cookie / auth note

The app sets cookies with `sameSite: 'lax'`. As long as users always use **https://pct-point-tracker.app** (and not a mix of www vs non-www or an old Railway URL), login and sessions will work. If you use both `pct-point-tracker.app` and `www.pct-point-tracker.app`, add both in Railway and pick one as canonical (e.g. redirect www → non-www) so cookies are consistent.
