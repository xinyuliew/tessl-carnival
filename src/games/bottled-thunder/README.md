# Bottled Thunder

A tiny storm is trapped in a glass cabinet. Use a magnetic lantern to guide its
living sparks into the bottles that match their symbols.

## How to play

- Click **Start** on the instructions screen to begin a 45-second round.
- The lantern follows your pointer. Hold the mouse button, or keep your finger
  down, to switch on its pull: sparks inside the dashed circle bend towards it.
  Only the pointer that switched the lantern on can steer or release it; a
  second finger on the glass does nothing until the first lets go.
- Let go to release the sparks. They keep their speed, coast on and drop
  towards the bottles.
- Each spark carries a symbol: a circle, a triangle or a diamond. Each bottle
  along the bottom has one of those symbols. Steer every spark into the bottle
  with its symbol. What counts is where the spark crosses the shelf: inside a
  bottle's mouth it drops in, anywhere else on the shelf it bounces off.
- Sparks you have not touched drift around under the clouds. Sparks appear one
  at a time, a little faster as the round goes on, and there are never more
  than 7 at once.
- A spark lasts 9 seconds. It fades in its last second, and then it escapes.
- When time runs out, click **Play again** for a fresh round. That click only
  starts the round; hold the pointer again to switch the lantern on.

## Scoring

- A spark in its matching bottle scores 10 points times the current multiplier.
- The multiplier starts at 1x. Every third correct capture in a row raises it
  by one for the captures after it, up to 4x: captures 1 to 3 score 10, 4 to 6
  score 20, 7 to 9 score 30, and every capture after that scores 40.
- A spark in the wrong bottle is lost and resets the streak and the multiplier
  to 1x. So does a spark that escapes.
- Releasing the lantern with nothing near it costs nothing.

Your final score is saved to the carnival's score board once, when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `startRound`, `pressLantern`,
  `moveLantern`, `releaseLantern`, `pointerDown`, `pointerMove`, `pointerUp`,
  `spawnSpark`, `step`, `capture`,
  `multiplierFor`, `claimFinalScore`) and the `bottledThunder` entry, the
  default export the midway finds.
- `game.test.ts`: tests for the game logic.
