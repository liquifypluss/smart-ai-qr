# Smart AI QR — Customer Review Frontend

Mobile-first React, Vite and TypeScript review page. English, Hindi and Hinglish reviews are generated entirely in the browser with deterministic phrase libraries. No backend or AI API is needed.

## Local development

Use Node.js 22 and npm.

```sh
npm install
npm run dev
```

Open `http://localhost:5173/smart-ai-qr/`. For phones on the same Wi-Fi, open `http://YOUR_COMPUTER_IP:5173/smart-ai-qr/` instead. Allow the development server through the computer's firewall if needed.

## Checks and production build

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

The production preview uses the GitHub Pages base path: `http://localhost:4173/smart-ai-qr/`.

## GitHub Pages

Create a **public** repository called `smart-ai-qr` with no auto-generated README or files, and push this project's `main` branch. In **Settings → Pages → Build and deployment**, select **GitHub Actions**. The included workflow builds and deploys automatically on pushes to `main`; it can also be started manually from **Actions**.

After the workflow succeeds, check its deployment URL. With a standard user repository, it is normally `https://YOUR_USERNAME.github.io/smart-ai-qr/`. The configured Vite production base is `/smart-ai-qr/`.

The repository currently has no `package-lock.json` because npm registry DNS was unavailable in the development environment. The workflow uses `npm install`; after a successful local install, commit the generated `package-lock.json` and switch the workflow install step to `npm ci` for repeatable installs.

## Customize

Edit `src/config/business.ts` for the business name, logo, location, color, category, choices and HTTPS `destinationUrl`. The demo destination is `null`, so successful copying shows a confirmation without redirecting. Only an explicit Rewrite replaces an edited review. Language and rating are optional.

Inline SVGs and local phrase rules live in `src/components` and `src/review`. Real iOS Safari, Android Chrome and in-app browser testing is still required. Clipboard APIs work best over HTTPS; LAN HTTP may require the manual copy fallback.

## Coolify staging on Hostinger KVM2

Deploy this **frontend only** in a new, isolated Coolify application. Do not reuse an existing application's domain, container, volumes, host port mapping, or proxy route.

- Source: `https://github.com/liquifypluss/smart-ai-qr`, branch `main`
- Build pack: **Nixpacks**, output/site type: **Static** (not a Node web server)
- Base Directory: `/`
- Node.js: `22` (declared in `.nvmrc`)
- Install Command: `npm install --no-audit --no-fund`
- Build Command: `npm run build:staging`
- Publish Directory: `dist` (some Coolify screens display this as `/dist`)
- Internal Nginx port: `80`; **no host port mapping**
- Start Command: not needed for static output
- Environment variables: **none required** by the current frontend

Use a dedicated staging hostname, such as `qr-staging.example.com` under a domain you own. Point its DNS A record to the VPS public IPv4 address. Enter `https://qr-staging.example.com` in the **new application's** Coolify Domains setting, then deploy to obtain HTTPS through the existing Coolify proxy. Limit staging access using your proxy's available authentication/access-control feature; a noindex header alone does not protect a staging site.

The staging build uses `/` for asset URLs, while the existing `npm run build` preserves the GitHub Pages base path `/smart-ai-qr/`. For a local staging build, run:

```sh
npm install
npm test
npm run build:staging
```

Verify that `dist/index.html` references `/assets/...` and that those files exist in `dist/assets/`. Open your staging hostname and check branding, brand/rating selection, Rewrite, language switching, clipboard access, Google Fonts, and the WhatsApp quote link. The demo review destination is currently `null`, so Copy Review cannot redirect to a business review site yet. Real-device checks remain necessary.

The repository has no lockfile yet; for reproducible installs, generate and commit `package-lock.json` from a trusted `npm install`, then switch Coolify and CI install commands to `npm ci`. The current staging setup does not require secrets, a backend, database, Dockerfile, or Docker Compose.
