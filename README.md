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
