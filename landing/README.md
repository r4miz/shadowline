# Shadowline marketing site

Standalone Next.js 16 site for the public landing page. No prices on the page,
contact details only. Deploy it separately from the app (on Vercel, set the
project root directory to `landing`).

```bash
cd landing
npm install
npm run dev      # http://localhost:3100
npm run build
```

Edit `site.config.ts` for the name, contact details and booking link. Copy
`.env.example` to `.env.local` to enable the contact form email.

Design tokens live in `app/globals.css` and mirror the app's `src/app/globals.css`.
