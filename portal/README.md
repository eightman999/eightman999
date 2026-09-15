# eightman Development Portal

A current-state developer cockpit derived from `docs/DEVELOPMENT_PORTAL.md`.

The portal deliberately separates three dimensions:

- work state — what the project workflow says
- verification state — whether something can or must be tested
- runtime state — what a machine/service probe says

The UI is read-only. GitHub remains the source of truth for work; machines/services remain the source of truth for runtime state.

## Run

```bash
cd portal
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Data

The first implementation uses `src/data.ts` as a public, non-secret snapshot. Replace it later with a generated snapshot from GitHub + runtime probes.

Do not put credentials, Tailscale addresses, private hostnames, tokens, passwords, or other secrets in this public repository.
