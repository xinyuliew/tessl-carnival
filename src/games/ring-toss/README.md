# Ring Toss

Land rings on the necks of the bottles at the back of the booth.

## How to play

- Move the mouse to aim. The circle shows where the ring will land.
- Your aim sways gently from side to side, so time your throw. The circle
  includes the sway.
- Click to throw a ring. One ring is in the air at a time.
- You have 8 rings. The round ends when the last ring lands.
- Click again on the round over screen to play another round.

## Scoring

A ring scores when it lands within 14 px of the centre of a bottle neck. A ring
that misses every neck scores nothing. Bottles further back score more:

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

There are five bottles in each row, and a bottle can hold more than one ring.
Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `toss`, `step`, `sway`, `bottleAt`)
  and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
