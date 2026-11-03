# Whack-a-Mole

Moles pop up from a grid of nine holes. Whack as many as you can before the clock runs out.

## How to play

- Click a mole while it's up to whack it.
- Each mole stays up for 1 second, then drops back down.
- Moles pop up every second at the start, and faster as the round goes on, down
  to one every 0.35 seconds by the end.
- A round lasts 30 seconds. Click on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. A whacked mole can't be scored again, and
clicking an empty hole or a mole that has dropped scores nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `popUp`, `whack`, `holeAt`,
  `popInterval`, `timeLeft`) and the `whackAMole` entry, the default export the
  midway finds.
- `game.test.ts`: tests for the game logic.
