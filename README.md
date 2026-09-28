# CAMIKK HOLDINGS — LLC landing

Independent, bilingual LLC sales landing. The default language is Spanish; `?lang=en` renders English. The LLC purchase action is intentionally disabled until a secure checkout backend is connected. The USD 50 consultation opens the provided GoHighLevel calendar in a dialog.

## Local development

```bash
npm install
npm run dev -- -p 3057
```

Open `http://localhost:3057`. To use a different consultation calendar in production, set `NEXT_PUBLIC_GHL_CALENDAR_URL` using `.env.example` as a guide. Do not commit private environment files. Set `NEXT_PUBLIC_SITE_URL` only after this landing has its own final domain.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

The Playwright suite expects the local dev server on port 3057. It covers desktop, tablet, mobile, language switching, pricing, disabled checkout, and the consultation dialog. `test-results/` contains local screenshots and is ignored by Git.

## Assets and content

`public/images/camikk-logo.png` is the supplied original logo; it is not resampled or edited. `public/images/llc-documents-hero.png` is a newly generated editorial image. Localized copy lives in `src/locales/`. Initial state filing fees live in `src/data/stateFees.ts`. They are only a preview; the backend must validate the final price.

See `FRONTEND_HANDOFF.md` for integration points. No Vercel or GitHub publishing is configured for this project.
