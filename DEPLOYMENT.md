# Deploying the frontend (e.g. Hostinger)

## Why formatting can break in production

- **Tailwind purge**: In production, Tailwind removes “unused” CSS. Classes used only in dynamic `className` (e.g. template literals) can be missed and purged, so styles disappear. The project uses a **safelist** in `tailwind.config.js` so those classes are always included.
- **Asset paths**: If the app is not at the domain root, script/CSS paths like `/static/js/main.xxx.js` can 404. The project sets **`"homepage": "."`** in `package.json` so the build uses relative paths and works from any base URL.
- **Caching**: Browsers or Hostinger may cache old JS/CSS. After a new deploy, ask users to hard refresh (Ctrl+Shift+R / Cmd+Shift+R) or clear cache.

## Steps for Hostinger

1. **Build**
   ```bash
   cd cash-drop-app-frontend
   npm ci
   npm run build
   ```
2. **Upload** the contents of the `build` folder to your Hostinger document root (or the subfolder where the app should live).
3. **SPA routing**: For client-side routes (e.g. `/cd-dashboard`, `/cash-drop`) to work, the server must serve `index.html` for all non-file requests. On Hostinger (Apache), add a `.htaccess` in the same directory as `index.html`:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </RewriteEngine>
   </IfModule>
   ```
   If the app is in a subfolder (e.g. `https://example.com/app/`), set `RewriteBase /app/` and in `package.json` set `"homepage": "/app"`, then rebuild.
4. **Environment**: Set `REACT_APP_API_URL` (or your API base URL) when building, or in Hostinger’s env/config, so the frontend talks to the correct backend.

## After deploying

- Do a hard refresh (Ctrl+Shift+R) to avoid old cached assets.
- If styles still look wrong, open DevTools (F12) → Network, reload, and check that the main JS and CSS files return 200 (not 404). If they 404, fix the base path or `homepage` and rebuild.
