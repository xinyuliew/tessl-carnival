# Carnival Arcade

[![MIT license](https://img.shields.io/badge/license-MIT-b9a9d9)](LICENSE)

Carnival Arcade is a small browser carnival. You walk around a sunny midway of
tents, rides and game booths, and step up to a booth to play its game. Each game
keeps its best scores in your browser, and empty booths say "coming soon" until
a game fills them.

It ships with one game, the **water cannon**. Each game lives in its own folder,
and the midway finds it there, so adding a game touches no shared file.

Source: [github.com/xinyuliew/tessl-carnival](https://github.com/xinyuliew/tessl-carnival)

## Run it

You need git and Node 24 (see `.nvmrc`). In a clone:

```bash
npm ci
npm run dev
```

Then open http://localhost:5173.

The repository also has a development container (`.devcontainer/`) for GitHub
Codespaces or VS Code: it uses Node 24, runs `npm ci`, and forwards port 5173.
Run `npm run dev` in its terminal.

## Controls

- **Walk:** WASD or the arrow keys, or click where you want to go.
- **Play:** walk up to a booth and press **E**, **Enter** or **Space**. Click
  a booth to walk to it and again to play. The list of booths in the corner
  takes you straight to a game.
- **Leave a game:** select **Back to the midway**.

Each game's own controls and scoring are in its README, such as
[`src/games/water-cannon/README.md`](src/games/water-cannon/README.md).

## Commands

| Command          | What it does                                              |
| ---------------- | --------------------------------------------------------- |
| `npm run dev`    | Run the carnival locally                                  |
| `npm run format` | Format the repo with Prettier, skipping `.prettierignore` |
| `npm run check`  | Lint, check formatting, type-check and test everything    |
| `npm run build`  | Build the site into `dist/`                               |
| `npm run test`   | Run the tests once                                        |

## How it's built

TypeScript, Vite and plain HTML canvas, with Vitest for the game logic. No UI
framework and no native dependencies, so `npm ci` is the whole setup.

- `index.html` and `src/main.ts`: the page, the router and the midway's overlay.
- `src/share.ts`: the repository link and the share links on the midway.
- `src/midway/`: the walkable midway. Every registered game gets a booth along
  the avenue.
- `src/carnival/`: the shared base every game uses: the game registry, scores,
  prizes and theme.
- `src/games/<game-id>/`: one folder per game. The water cannon is the pattern
  to copy.
- `skills/add-carnival-game/`: step-by-step guidance for adding a game, written
  for coding agents and people alike.

[`AGENTS.md`](AGENTS.md) has the house rules every game follows.

## Add a game

1. Create `src/games/<game-id>/` with `game.ts`, `game.test.ts` and `README.md`,
   copying `src/games/water-cannon/`.
2. Export the game's `CarnivalGame` as the default export of `game.ts`, with an
   `id` that matches the folder name. Its booth appears on the midway by itself.
3. Keep the game logic in plain, tested functions, record each round's score
   with `recordScore`, and draw with the shared `theme`.
4. Run `npm run format` and `npm run check`.

[`skills/add-carnival-game/SKILL.md`](skills/add-carnival-game/SKILL.md) has
the details.

## Deployment

`.github/workflows/ci.yml` runs `npm run check` and `npm run build` on every
pull request and every push to `main`.

`.github/workflows/pages.yml` deploys the built site to GitHub Pages on every
push to `main`, once Pages is switched on: in **Settings → Pages**, set
**Source** to **GitHub Actions**. While Pages is off or unavailable for the
account, the workflow skips the deploy with a notice instead of failing. The
site isn't published at the moment, so run it locally to play.

The build uses relative asset paths (`vite.config.ts`), so it works from any
GitHub Pages URL.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md), and the
[code of conduct](CODE_OF_CONDUCT.md). For security problems, see
[`SECURITY.md`](SECURITY.md).

## License

MIT. See [`LICENSE`](LICENSE).
