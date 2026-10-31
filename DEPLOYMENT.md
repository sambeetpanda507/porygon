# Deployment Plan

Porygon is **local-first**: the app itself needs no database, no server-side session storage, and no secrets at runtime — every diagram, share link, and simulation run lives in the visitor's own browser. That makes deployment close to "ship a Next.js app" with nothing extra to provision.

The one thing that does require a real Next.js server runtime (not a pure static export) is the favicon/app-icon generation in [apps/web/app/icon.tsx](apps/web/app/icon.tsx) and [apps/web/app/apple-icon.tsx](apps/web/app/apple-icon.tsx), which use `next/og`'s `ImageResponse`. So: deploy as a standard Next.js app, not `next export`.

## 1. Target platform

**Recommended: Vercel** — zero-config for Next.js (App Router, `next/og`, image optimization, per-PR preview deployments all work out of the box), and the project already has no server dependencies that would need extra infrastructure.

**Self-hosted alternative** (if Vercel isn't an option): any Node.js host (Docker container, Fly.io, Render, a VM) running `next start` behind a reverse proxy. Steps are the same build/start commands either way — see §4.

## 2. Monorepo build configuration

This is a pnpm workspace ([pnpm-workspace.yaml](pnpm-workspace.yaml)) with the Next.js app at `apps/web` and four workspace packages (`@porygon/canvas`, `@porygon/icons`, `@porygon/simulator`, `@porygon/ui`) consumed via `transpilePackages` in [apps/web/next.config.ts](apps/web/next.config.ts) — they're built from source at Next's build time, not pre-compiled, so no separate package build step is needed.

On Vercel:

- **Root Directory**: `apps/web`
- **Install Command**: `pnpm install --frozen-lockfile` (run from the repo root so workspace packages resolve)
- **Build Command**: `next build` (Vercel's Next.js preset detects this automatically once Root Directory is set)
- **Output**: managed automatically by Vercel's Next.js runtime (no manual output directory)
- **Node version**: 24.x (matches local dev — see [package.json](package.json) `packageManager` pin for pnpm 10)

No environment variables are required for a baseline deployment — there are no API keys, database URLs, or feature flags in the codebase today.

## 3. Pre-deploy checklist

Run from the repo root before every deploy:

```sh
pnpm install --frozen-lockfile
pnpm build                 # must succeed with zero type errors
pnpm test:e2e              # full Playwright suite (apps/web/e2e), chromium only
```

The e2e suite includes [phase8-landing-and-smoke.spec.ts](apps/web/e2e/phase8-landing-and-smoke.spec.ts), which is effectively a smoke test of the landing page and the `/design` canvas loading correctly — treat a failure here as a deploy blocker.

The existing [.github/workflows/ci.yml](.github/workflows/ci.yml) already runs `pnpm build` + `pnpm test:e2e` on every push to `main` and every PR, so a green CI run on `main` is the signal that a commit is deployable.

## 4. Deployment steps

### Option A — Vercel (recommended)

1. Import the GitHub repo into Vercel (`vercel.com/new` → select `porygon`).
2. Set **Root Directory** to `apps/web` in the project's Vercel settings.
3. Leave Install/Build commands on the Next.js defaults (Vercel auto-detects pnpm via `pnpm-lock.yaml` at the repo root).
4. Deploy. Vercel will:
   - Build a **Preview Deployment** for every PR (good for reviewing the canvas/animation changes visually before merge).
   - Build a **Production Deployment** automatically on every push to `main`.
5. Attach a custom domain under Project Settings → Domains, once ready.

### Option B — Self-hosted (Docker / VM)

```sh
pnpm install --frozen-lockfile
pnpm --filter @porygon/web build
pnpm --filter @porygon/web start   # runs `next start`, defaults to port 3000
```

Put this behind a reverse proxy (nginx/Caddy) for TLS termination, and run it under a process supervisor (systemd, pm2, or a container orchestrator) so it restarts on crash/reboot.

## 5. Rollback

- **Vercel**: every deployment is immutable and addressable — use the Vercel dashboard (or `vercel rollback`) to instantly re-promote a previous production deployment if a release regresses.
- **Self-hosted**: keep the previous build artifact (`apps/web/.next`) or redeploy the previous git tag/commit; since there's no database/migration step, rollback is just "run the old build again."

## 6. Post-deploy verification

1. Load the production URL and confirm the landing page renders (hero animation, feature sections).
2. Open `/design` and confirm the Excalidraw canvas mounts, the component library loads, and a basic drag-connect-simulate flow works.
3. Generate a share link and open it in an incognito window to confirm the read-only share flow works cross-session (this exercises the URL-fragment-based sharing path end-to-end, not just locally).
4. Check the favicon/app icon renders (validates the `next/og` icon routes deployed correctly).

## 7. Future considerations (not needed today, flag if scope grows)

- If a future feature needs server-side persistence (accounts, long share links via a backend instead of URL-encoded state), that would introduce a database and secrets — revisit this plan's "no environment variables needed" assumption at that point.
- If bundle size becomes a concern (Excalidraw + Mermaid/KaTeX chain is sizeable), consider route-level code-splitting/dynamic imports for `/design` so the landing page stays light.
