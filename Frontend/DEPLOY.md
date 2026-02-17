# Deploying PENNIT Frontend on Hostinger

## 1. GitHub deployment (recommended after fix)

- **Build command:** `npm run build`  
  Uses `npx vite build` so the build runs without relying on execute permission on `node_modules/.bin/vite`.

- **Start command (if Hostinger runs Node):** `npm start`  
  Serves the `dist/` folder with `serve` (SPA mode, port from `PORT` env).

- **Node version:** Set Node to 18+ in Hostinger (or use `engines` in package.json).

- **Environment:** Set `VITE_API_URL` to your backend API URL (e.g. `https://your-api.hostinger.com`) so the frontend can call the API.

---

## 2. Alternative: build locally and upload `dist/`

If the Hostinger Node build still fails or you prefer static hosting:

1. **Build on your machine:**
   ```bash
   cd Frontend
   npm ci
   npm run build
   ```

2. **Upload the contents of the `dist/` folder** to your Hostinger web root (e.g. `public_html`) via File Manager or FTP.

3. **Configure the server** so all routes fall back to `index.html` (SPA). In `.htaccess` (Apache) add:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

4. **Set the API URL:** Before building, set `VITE_API_URL` in `.env` (or in Hostinger env) to your production API URL so the built assets use the correct backend.

---

## Summary of package.json changes

| Script   | Before           | After                |
|----------|------------------|----------------------|
| `dev`    | `vite`           | `npx vite`           |
| `build`  | `vite build`     | `npx vite build`     |
| `preview`| `vite preview`   | `npx vite preview`   |
| `start`  | (none)           | `npx serve -s dist -l ${PORT:-3000}` |

The `serve` dependency was added so `npm start` can serve the built app in production. Using `npx` avoids "Permission denied" on `node_modules/.bin/vite` during the build step.
