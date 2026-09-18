# Devora.js for VS Code

Snippets and Command Palette shortcuts for [Devora.js](https://github.com) projects.

## Features

### Snippets

- `devora-route` — route file skeleton (`renderMode`, `meta()`, `loader`, default export component)
- `devora-route-action` — same, plus a form `action` with `ctx.verifyCsrf()`
- `devora-serverfn` — shared backend server function skeleton (`serverFn`, typed input, `ctx.requireAuth()`)

### Commands

Run from the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) — each shells out to your project's
own `devora` CLI in an integrated terminal, so it always reflects your installed CLI version:

- **Devora: Start Dev Server** — `devora dev` (or `--app=<name>` if you pick one)
- **Devora: Build App** — `devora build` (or `--app=<name>` if you pick one)
- **Devora: New App** — `devora new <name>` (the CLI itself prompts for the auth mode)
- **Devora: New Route** — prompts for an app, a route path, and a render mode, then creates the
  route file for you (there's no CLI command for this — routes are just files)

The package-manager prefix (`pnpm exec devora` / `yarn devora` / `npx devora`) is picked
automatically from whichever lockfile is present at the workspace root.

## Not in this pass

No sidebar view and no inline diagnostics yet — planned for a later release.

## Development

```sh
npm install
npm run compile
```

Then press `F5` in VS Code to open an Extension Development Host with the extension loaded.
