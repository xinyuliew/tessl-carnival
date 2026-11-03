# Carnival Arcade

[![MIT license](https://img.shields.io/badge/license-MIT-b9a9d9)](LICENSE)

Carnival Arcade is a local browser arcade with a walkable carnival midway.
Explore the tents and rides, step up to a booth, and play for a high score.
Scores stay in your browser on your computer. Empty booths say "coming soon"
until a new game fills them.

Run the app on your computer with Node.js and open it in your browser. Hosting,
GitHub Actions, and payment details are not needed to play locally. GitHub keeps
the source code and the history of the project; online hosting can be added later.

Source: [github.com/xinyuliew/tessl-carnival](https://github.com/xinyuliew/tessl-carnival)

## Booths we've built

| Booth               | How it plays                                                                                            | Round and scoring                                                 | Implementation                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| **Water Cannon**    | Aim with the mouse and fire water at moving targets on three rails.                                     | 15 shots; faster targets score 10, 20, or 30 points.              | [Controls and scoring](src/games/water-cannon/README.md)    |
| **Ring Toss**       | Time your gently swaying aim and throw rings onto bottle necks.                                         | 8 rings; back-row bottles score more, from 10 to 30 points.       | [Controls and scoring](src/games/ring-toss/README.md)       |
| **Whack-a-Mole**    | Click moles as they appear in nine holes, with less time between appearances as the round progresses.   | 30 seconds; each successful whack earns 10 points.                | [Controls and scoring](src/games/whack-a-mole/README.md)    |
| **Bottled Thunder** | Hold a magnetic lantern to attract living sparks, then release them into bottles with matching symbols. | 45 seconds; matching captures build a streak multiplier up to 4x. | [Controls and scoring](src/games/bottled-thunder/README.md) |

All four booths are included in this project. Each game has its own controls,
scoring rules, tests, and README.

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

## Local use and optional hosting

Local use is the project's primary setup. After installing dependencies, start
it with `npm run dev` and keep that terminal running while you play. Scores are
stored per browser and site address; using another browser or clearing site
data does not carry scores across.

To try a production build locally, run `npm run build`, then `npm run preview`
and open the address printed in the terminal.

The CI and GitHub Pages workflows remain available for future online releases.
They are separate from local play: an unavailable GitHub Actions service does
not stop the app running on your computer.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md), and the
[code of conduct](CODE_OF_CONDUCT.md). For security problems, see
[`SECURITY.md`](SECURITY.md).

## License

MIT. See [`LICENSE`](LICENSE).
