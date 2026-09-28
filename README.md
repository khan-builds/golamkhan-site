# Golam Khan — Personal Site & Fomo Intern Desk

Source for [golamkhan.com](https://golamkhan.com) and its `/tool` intern workspace. The site includes a personal portfolio, shared team schedule, time clock, reimbursements, CRM, and a separately gated admin portal.

## Privacy and deployment

This public repository contains application source only. It does not contain production database records, intern PINs, the admin code, or your private Google Calendar timetable. The class schedule seed file is intentionally empty in this public copy. Keep real class times and all team records in a private database.

Before deploying your own copy:

1. Create a separate Sites project and D1 database; do not point a fork at the production database.
2. Replace `project_id` in `.openai/hosting.json` with the new project ID.
3. Configure the `DB` binding and set `INTERN_PINS` and `ADMIN_PORTAL_CODE` as deployment secrets. Never commit their values.
4. Add your own class schedule privately after deployment.

The public repository is a source-code snapshot, not a mirror of production data.

## Local development

Requires Node.js `>=22.13.0`.

```sh
npm ci
npm run dev
```

Local preview sign-in uses the Sites development identity simulator. The intern desk also needs a local D1 database and development-only PINs to exercise authenticated routes. Do not use production credentials in a local `.env` file or commit `.env*` files.

## Checks

```sh
npm run lint
npx tsc --noEmit
npm run build
```

## Stack

Next-compatible app structure using Vinext, React, TypeScript, Cloudflare Workers, and D1/Drizzle. See `db/schema.ts` and `drizzle/` for the team workspace schema and migration.
