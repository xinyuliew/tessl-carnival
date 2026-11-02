import { describe, expect, it } from 'vitest';
import {
  FIRST_INTERVAL,
  LAST_INTERVAL,
  POINTS_PER_MOLE,
  ROUND_LENGTH,
  UP_TIME,
  WHACKED_TIME,
  createState,
  holeAt,
  popInterval,
  popUp,
  step,
  timeLeft,
  whack,
} from './game';

const first = () => 0;
const upCount = (state: ReturnType<typeof createState>) =>
  state.holes.filter((hole) => hole.mole !== 'down').length;

/** A seeded random source, so two runs pop moles from the same holes. */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
};

/** Runs `seconds` of play in steps of `size`, from a fresh round or `from` seconds in. */
const play = (seconds: number, size: number, from = 0) => {
  const state = createState();
  state.elapsed = from;
  const random = seeded(7);
  let left = seconds;
  while (left > 1e-12) {
    const dt = Math.min(size, left);
    step(state, dt, random);
    left -= dt;
  }
  return state;
};

const expectSameGame = (
  actual: ReturnType<typeof createState>,
  expected: ReturnType<typeof createState>,
) => {
  expect(actual.phase).toBe(expected.phase);
  expect(actual.misses).toBe(expected.misses);
  expect(actual.score).toBe(expected.score);
  expect(actual.elapsed).toBeCloseTo(expected.elapsed, 9);
  expect(actual.nextPop).toBeCloseTo(expected.nextPop, 9);
  expect(actual.holes.map((hole) => hole.mole)).toEqual(expected.holes.map((hole) => hole.mole));
  actual.holes.forEach((hole, i) => expect(hole.timer).toBeCloseTo(expected.holes[i].timer, 9));
};

describe('whack-a-mole', () => {
  it('starts with every mole down, no score and the full clock', () => {
    const state = createState();
    expect(state.holes).toHaveLength(9);
    expect(upCount(state)).toBe(0);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(timeLeft(state)).toBe(ROUND_LENGTH);
  });

  it('pops a mole up after a short wait', () => {
    const state = createState();
    step(state, 0.4, first);
    expect(upCount(state)).toBe(0);
    step(state, 0.2, first);
    expect(state.holes[0].mole).toBe('up');
  });

  it('only pops moles from empty holes', () => {
    const state = createState();
    for (let i = 0; i < state.holes.length; i++) expect(popUp(state, first)).toBe(true);
    expect(upCount(state)).toBe(9);
    expect(popUp(state, first)).toBe(false);
  });

  it('scores a whacked mole once', () => {
    const state = createState();
    popUp(state, first);
    expect(whack(state, 0)).toBe(POINTS_PER_MOLE);
    expect(whack(state, 0)).toBe(0);
    expect(state.score).toBe(POINTS_PER_MOLE);
    expect(state.holes[0].mole).toBe('whacked');
  });

  it('scores nothing for an empty hole or a click off the holes', () => {
    const state = createState();
    expect(whack(state, 0)).toBe(0);
    expect(whack(state, -1)).toBe(0);
    expect(state.score).toBe(0);
  });

  it('finds the hole under a click', () => {
    const state = createState();
    const hole = state.holes[4];
    expect(holeAt(state, hole.x + 10, hole.y - 10)).toBe(4);
    expect(holeAt(state, 0, 0)).toBe(-1);
  });

  it('drops a mole that nobody whacks, counts a miss, and it can no longer be whacked', () => {
    const state = createState();
    state.nextPop = ROUND_LENGTH;
    popUp(state, first);
    step(state, UP_TIME - 0.1);
    expect(state.holes[0].mole).toBe('up');
    step(state, 0.2);
    expect(state.holes[0].mole).toBe('down');
    expect(state.misses).toBe(1);
    expect(whack(state, 0)).toBe(0);
    expect(state.score).toBe(0);
  });

  it('clears a whacked mole without counting a miss', () => {
    const state = createState();
    state.nextPop = ROUND_LENGTH;
    popUp(state, first);
    whack(state, 0);
    step(state, WHACKED_TIME + 0.01);
    expect(state.holes[0].mole).toBe('down');
    expect(state.misses).toBe(0);
  });

  it('pops moles up faster as the round goes on', () => {
    expect(popInterval(0)).toBe(FIRST_INTERVAL);
    expect(popInterval(ROUND_LENGTH / 2)).toBeLessThan(FIRST_INTERVAL);
    expect(popInterval(ROUND_LENGTH)).toBeCloseTo(LAST_INTERVAL);

    const popsIn = (from: number, seconds: number) => {
      const state = createState();
      state.elapsed = from;
      state.nextPop = 0.01;
      let pops = 0;
      for (let t = 0; t < seconds; t += 0.05) {
        const before = upCount(state);
        step(state, 0.05, first);
        // Whack everything so holes are always free to pop again.
        state.holes.forEach((_, i) => whack(state, i));
        if (upCount(state) > before) pops += 1;
      }
      return pops;
    };
    expect(popsIn(ROUND_LENGTH - 6, 5)).toBeGreaterThan(popsIn(0, 5));
  });

  it('ends the round when the clock runs out and clears the board', () => {
    const state = createState();
    for (let t = 0; t < ROUND_LENGTH - 0.05; t += 0.05) step(state, 0.05, first);
    expect(state.phase).toBe('playing');
    step(state, 0.1, first);
    expect(state.phase).toBe('over');
    expect(timeLeft(state)).toBe(0);
    expect(upCount(state)).toBe(0);
  });

  it('ignores whacks and time once the round is over', () => {
    const state = createState();
    popUp(state, first);
    state.score = 30;
    step(state, ROUND_LENGTH, first);
    expect(whack(state, 0)).toBe(0);
    step(state, 5, first);
    expect(state.score).toBe(30);
    expect(state.elapsed).toBe(ROUND_LENGTH);
    expect(upCount(state)).toBe(0);
  });

  it('plays out a long step in order, so overdue moles still drop and count as misses', () => {
    const state = createState();
    step(state, 2, first);
    // The first mole popped at 0.5s and dropped at 1.5s. The second popped
    // just before 1.5s and is still up.
    expect(state.misses).toBe(1);
    expect(upCount(state)).toBe(1);
    const secondPop = 0.5 + popInterval(0.5);
    expect(state.holes.find((hole) => hole.mole === 'up')?.timer).toBeCloseTo(
      UP_TIME - (2 - secondPop),
    );
  });

  it('ends a long step the same as the same time in short steps', () => {
    for (const seconds of [2, 5, 12.3]) {
      expectSameGame(play(seconds, seconds), play(seconds, 1 / 64));
      expectSameGame(play(seconds, 0.7), play(seconds, 1 / 64));
    }
  });

  it('counts misses up to the end of the round when a long step runs past it', () => {
    const long = play(5, 5, ROUND_LENGTH - 3);
    const short = play(5, 1 / 64, ROUND_LENGTH - 3);
    expect(long.phase).toBe('over');
    expect(long.elapsed).toBe(ROUND_LENGTH);
    expect(long.misses).toBeGreaterThan(0);
    expectSameGame(long, short);
  });
});
