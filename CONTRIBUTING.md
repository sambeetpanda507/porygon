# Contributing to P0rygon

Thanks for considering a contribution.

## Getting set up

```sh
pnpm install
pnpm dev
```

See [README.md](README.md) for the full project layout and available scripts.

## Workflow

1. Fork the repo and create a branch off `main` for your change.
2. Keep changes focused — one logical change per pull request.
3. Add or update Playwright coverage under [apps/web/e2e](apps/web/e2e) for any behavior change.
4. Run the checks below before opening a PR:
   ```sh
   pnpm build
   pnpm test:e2e
   ```
5. Open a pull request describing what changed and why.

## Reporting bugs / proposing features

Open a GitHub issue with steps to reproduce (for bugs) or the problem you're trying to solve (for features). Screenshots/recordings of the canvas or simulation help a lot.

## Code style

- TypeScript throughout, no implicit `any`.
- Keep the simulation engine ([packages/simulator](packages/simulator)) framework-agnostic — it should never import React or Next.js.
- Favor small, composable components in [packages/ui](packages/ui) over one-off UI inside `apps/web`.
