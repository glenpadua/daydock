# Contributing

Thanks for contributing to DayDock.

## Development setup

```bash
pnpm install
pnpm tauri dev
```

## Before opening a PR

Run all checks locally:

```bash
pnpm -s tsc --noEmit
pnpm -s test
pnpm -s build
```

## Contribution guidelines

- Keep changes focused and explain user-facing behavior changes in the PR.
- Add or update tests when logic changes.
- Prefer generic markdown/Obsidian-compatible behavior over personal workflow assumptions.
- Follow existing code style and naming conventions.

## Reporting issues

Please include:
- expected behavior,
- actual behavior,
- reproduction steps,
- environment details (OS, app version/commit).
