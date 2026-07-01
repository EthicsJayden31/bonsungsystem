# Version.3 verified server connection

This note explains the final connection step between the public GitHub Pages UI and the external Version.3 server.

## When to use this

Use `Verify External Version.3 Server` when you only want to test a hosted server URL.

Use `Connect Verified Version.3 Server` when the server is ready for the public UI to use.

## Required server URL

The `server_url` input must be a real external HTTPS URL, for example:

```text
https://bonsung-version3.example.com
```

Do not use local addresses such as `http://127.0.0.1:4303` or `http://localhost:4303`.

## What the workflow checks

`Connect Verified Version.3 Server` runs these checks before changing the public UI configuration:

1. `verify:version3-release`
   - Confirms the URL is a public HTTPS URL.
   - Confirms transition-only flags are not being used for a real release.

2. `verify:version3-server`
   - Confirms the server answers `/health`.
   - Confirms login, accounts, roles, notices, one-way consultations, audit logs, export/import, backups, and data quality endpoints work.

## What changes after checks pass

After both checks pass, the workflow saves the verified URL as the GitHub repository variable:

```text
VERSION3_API_BASE_URL
```

If `deploy_pages` is true, it also dispatches `pages.yml`. The next GitHub Pages build receives the same value as:

```text
NEXT_PUBLIC_VERSION3_API_BASE_URL
```

That makes the public Version.3 UI use the verified external server instead of Apps Script or local preview data.

## After deployment

Open the temporary inspection page:

```text
https://ethicsjayden31.github.io/bonsungsystem/version3-inspection.html
```

Enter the same server URL and run the `/health` check. Then open `/login/` and sign in with a real Version.3 account.
