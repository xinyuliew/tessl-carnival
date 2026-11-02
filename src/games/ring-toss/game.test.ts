import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  LANDING_LIFETIME,
  NECK_RADIUS,
  RINGS_PER_ROUND,
  SWAY_AMPLITUDE,
  THROWER,
  bottleAt,
  createState,
  step,
  sway,
  toss,
  type RingTossState,
} from './game';

/** Throws at (x, y) with no sway, and lets the ring land. */
function throwAndLand(state: RingTossState, x: number, y: number) {
  state.time = 0;
  expect(toss(state, x, y)).toBe(true);
  step(state, FLIGHT_TIME);
}

describe('ring toss', () => {
  it('starts with a full set of rings, no score and a grid of bottles', () => {
    const state = createState();
    expect(state.rings).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles).toHaveLength(15);
  });

  it('scores more for bottles further back', () => {
    const { bottles } = createState();
    const back = bottles.reduce((a, b) => (b.y < a.y ? b : a));
    const front = bottles.reduce((a, b) => (b.y > a.y ? b : a));
    expect(back.points).toBeGreaterThan(front.points);
    for (const a of bottles) {
      for (const b of bottles) {
        if (a.y < b.y) expect(a.points).toBeGreaterThan(b.points);
      }
    }
  });

  it('uses one ring per throw', () => {
    const state = createState();
    expect(toss(state, 400, 200)).toBe(true);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
    expect(state.ring).not.toBeNull();
  });

  it('throws one ring at a time', () => {
    const state = createState();
    toss(state, 400, 200);
    expect(toss(state, 400, 200)).toBe(false);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
  });

  it('cannot throw once the rings run out', () => {
    const state = createState();
    state.rings = 0;
    expect(toss(state, 400, 200)).toBe(false);
    expect(state.ring).toBeNull();
  });

  it('scores a ring that lands on a bottle neck and keeps it on the bottle', () => {
    const state = createState();
    const bottle = state.bottles[0];
    throwAndLand(state, bottle.x + NECK_RADIUS - 1, bottle.y);
    expect(state.score).toBe(bottle.points);
    expect(bottle.rings).toBe(1);
    expect(state.ring).toBeNull();
  });

  it('scores nothing for a ring that misses every neck', () => {
    const state = createState();
    throwAndLand(state, 5, 5);
    expect(state.score).toBe(0);
    expect(state.bottles.every((b) => b.rings === 0)).toBe(true);
  });

  it('adds up the points from every ringed bottle', () => {
    const state = createState();
    const back = state.bottles[0];
    const front = state.bottles[state.bottles.length - 1];
    throwAndLand(state, back.x, back.y);
    throwAndLand(state, front.x, front.y);
    throwAndLand(state, back.x, back.y);
    expect(state.score).toBe(back.points * 2 + front.points);
  });

  it('only scores once the ring has landed', () => {
    const state = createState();
    const bottle = state.bottles[0];
    state.time = 0;
    toss(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(bottle.points);
  });

  it('ages landing feedback only from the moment the ring lands', () => {
    const state = createState();
    toss(state, 400, 200);
    step(state, FLIGHT_TIME - 0.1);
    expect(state.landings).toHaveLength(0);
    step(state, 0.3);
    expect(state.landings).toHaveLength(1);
    expect(state.landings[0].age).toBeCloseTo(0.2);
  });

  it('keeps landing feedback for its full lifetime after a large step', () => {
    const state = createState();
    toss(state, 400, 200);
    step(state, FLIGHT_TIME + 0.5);
    expect(state.landings).toHaveLength(1);
    expect(state.landings[0].age).toBeCloseTo(0.5);
    step(state, LANDING_LIFETIME - 0.5 - 0.01);
    expect(state.landings).toHaveLength(1);
    step(state, 0.02);
    expect(state.landings).toHaveLength(0);
  });

  it('drops landing feedback when a step reaches past its lifetime', () => {
    const state = createState();
    toss(state, 400, 200);
    step(state, FLIGHT_TIME + LANDING_LIFETIME + 0.1);
    expect(state.landings).toHaveLength(0);
  });

  it('sways the throw sideways over time', () => {
    const state = createState();
    expect(sway(state)).toBe(0);
    state.time = 0.5;
    expect(sway(state)).not.toBe(0);
    expect(Math.abs(sway(state))).toBeLessThanOrEqual(SWAY_AMPLITUDE);
    const aimX = 400;
    toss(state, aimX, 200);
    expect(state.ring?.toX).toBe(aimX + sway(state));
  });

  it('never throws backwards, even when aimed below the thrower', () => {
    const state = createState();
    toss(state, 400, THROWER.y + 50);
    expect(state.ring?.toY).toBeLessThan(THROWER.y);
  });

  it('keeps playing while the last ring is in the air', () => {
    const state = createState();
    state.rings = 1;
    toss(state, 400, 200);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
  });

  it('ends the round when the last ring lands', () => {
    const state = createState();
    for (let i = 0; i < RINGS_PER_ROUND; i++) throwAndLand(state, 5, 5);
    expect(state.rings).toBe(0);
    expect(state.phase).toBe('over');
    expect(toss(state, 400, 200)).toBe(false);
  });

  it('finds the bottle under a landing, or none for a miss', () => {
    const { bottles } = createState();
    const bottle = bottles[3];
    expect(bottleAt(bottles, bottle.x, bottle.y + NECK_RADIUS)).toBe(bottle);
    expect(bottleAt(bottles, bottle.x + NECK_RADIUS + 1, bottle.y)).toBeUndefined();
  });
});
