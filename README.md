# Carnival Arcade

A local browser arcade built during the **Build your own software factory with
context** workshop at **AI Native DevCon NYC**.

I started from [Tessl Carnival](https://github.com/tesslio/tessl-carnival) and
used coding agents to add three games, a sunset midway, and fixes from code
review. Water Cannon was included in the starter.

## Games

| Booth                                                  | Description                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| [Water Cannon](src/games/water-cannon/README.md)       | Shoot moving targets with 15 shots.                         |
| [Ring Toss](src/games/ring-toss/README.md)             | Throw eight rings onto bottles. Farther rows score more.    |
| [Whack-a-Mole](src/games/whack-a-mole/README.md)       | Hit moles in a 30-second round as they appear faster.       |
| [Bottled Thunder](src/games/bottled-thunder/README.md) | Guide sparks into matching bottles with a magnetic lantern. |

## Run locally

Requires Node.js 24.

```sh
git clone https://github.com/xinyuliew/tessl-carnival.git
cd tessl-carnival
npm ci
npm run dev
```

Open the URL printed in the terminal. Walk with WASD, arrow keys, or a click.
Press **E** near a booth to play. Scores are saved in your browser.

## Development

TypeScript, Vite, HTML Canvas, and Vitest.
Run `npm run check` to validate changes and `npm run build` to build the app.

[MIT license](LICENSE). Original starter attribution is retained.
