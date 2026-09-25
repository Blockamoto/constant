# Constant

Constant is the operating system for **Constant Limited**: a small, auditable company engine with a human-friendly front end.

The aim is not to turn the company into a spreadsheet maze. It is to keep the moving parts visible, make routine work automatable, and leave a durable record of what happened and why.

## First milestone

The initial platform is deliberately small:

- company setup and readiness
- obligations and recurring compliance
- finance and tax workflow
- operational automations
- an audit trail for scheduled-agent activity
- a GitHub capability smoke test for scheduled runs

The immediate company path is:

1. establish Constant Limited's operating record
2. obtain the organisation identifiers needed for third-party accounts, including D-U-N-S
3. create the organisation Play Console account
4. use that account to ship Proximity under Constant rather than an individual's public identity

## Run locally

```bash
npm start
```

Then open `http://localhost:3000`.

No runtime dependencies are required for the first version.

## Deploy

The repository includes `render.yaml`. Connect the repository to Render and create the declared web service.

## Repository safety

This repository is public. **Do not commit credentials, tax records, bank details, personal identifiers, API keys, private correspondence, or private company documents.**

The UI can represent the *status* of private workflows without storing their sensitive payloads here. Integrations and private data storage will be added behind explicit boundaries rather than leaking company records into source control.

## Structure

- `server.mjs` - tiny Node server and API shell
- `public/` - the Constant dashboard
- `data/` - non-sensitive operational state
- `docs/` - architecture, roadmap, and test protocols

## Status

Bootstrap phase. The first scheduled pass should run the GitHub scheduled-capability smoke test in `docs/GITHUB-SCHEDULE-SMOKE-TEST.md` and record what a scheduled ChatGPT run can actually read and write.
