# Version.3 security preflight

This note captures the immediate security baseline for the public GitHub Pages UI and the separate Version.3 server.

## Applied baseline

- Next.js is pinned to `15.5.18`, the patched 15.x release from the May 2026 security release.
- React and React DOM are on `19.2.7`.
- `@next/eslint-plugin-next` and `eslint-config-next` match the Next.js version.
- PostCSS is overridden to `8.5.16` to avoid the current XSS advisory on older transitive versions.
- The GitHub Pages UI remains a static export with `images.unoptimized=true`, so it does not expose the Next Image Optimization API.
- Vercel builds keep Next.js server output enabled unless `GITHUB_PAGES=true`, allowing `/api/version3/*` to run as a Vercel Function.
- Dependabot is enabled for npm and GitHub Actions updates.

## Local checks

Run these before deployment:

```bash
pnpm run verify:security-baseline
pnpm run audit:prod
pnpm run typecheck
pnpm run lint
pnpm run build:pages
pnpm run verify:surfaces
```

## Operational follow-up

If the public app was online while using an affected Next.js release, rotate deployment secrets after redeploying the patched build. Prioritize `VERSION3_OWNER_INITIAL_PASSWORD`, `VERSION3_LOCAL_SERVER_PASSWORD`, `VERSION3_DATABASE_URL`, hosting tokens, and GitHub Pages deployment credentials.
