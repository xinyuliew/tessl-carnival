# Contributing

Thanks for helping build Carnival Arcade.

## Issues

Open an issue in
[this repository](https://github.com/xinyuliew/tessl-carnival/issues) with one
of the templates:

- **Bug report:** something is broken, or behaves differently from what you
  expected.
- **Game or feature idea:** a new booth, or a change to the midway or a game.

Keep each issue to one change, and say how you'll know it's done.

## Pull requests

1. Branch from `main`. Nobody pushes to `main` directly: every change goes
   through a pull request, and CI must pass before it merges.
2. Follow the house rules in [`AGENTS.md`](AGENTS.md): each game lives in its
   own folder, records scores through `recordScore`, draws with the shared
   theme, keeps its logic in tested plain functions, cleans up after itself,
   and has a README that matches the code. One game per change.
3. To add a game, follow
   [`skills/add-carnival-game/SKILL.md`](skills/add-carnival-game/SKILL.md).
4. Before you open the pull request, run `npm run format`, then
   `npm run check` and `npm run build`.
5. In the pull request, say what changed and how to try it, and end with
   `Closes #<issue number>` when it finishes an issue.

Don't add dependencies without a good reason: `npm ci` is the whole setup and
should stay quick.

## Security

Don't post security problems in public. See [`SECURITY.md`](SECURITY.md).

Everyone here follows the [code of conduct](CODE_OF_CONDUCT.md).
