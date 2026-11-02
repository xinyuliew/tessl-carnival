import { describe, expect, it } from 'vitest';
import bottledThunderDefault, {
  ATTRACT_RADIUS,
  BUTTON,
  MAX_SPARKS,
  MAX_SUBSTEP,
  MOUTH_Y,
  ROUND_SECONDS,
  SPARK_LIFETIME,
  bottleAt,
  bottledThunder,
  capture,
  claimFinalScore,
  createState,
  isOnButton,
  moveLantern,
  multiplierFor,
  pressLantern,
  releaseLantern,
  spawnSpark,
  startRound,
  step,
  toCanvasPoint,
  type BottledThunderState,
  type Spark,
  type SpellSymbol,
} from './game';

/** A round in play with no sparks, and no new ones for a long while. */
function playing(): BottledThunderState {
  const state = createState();
  startRound(state);
  state.spawnTimer = 1000;
  return state;
}

function spark(overrides: Partial<Spark> = {}): Spark {
  return {
    x: 400,
    y: 200,
    vx: 0,
    vy: 0,
    symbol: 'circle',
    age: 0,
    guided: false,
    trail: [],
    ...overrides,
  };
}

function bottle(state: BottledThunderState, symbol: SpellSymbol) {
  const found = state.bottles.find((b) => b.symbol === symbol);
  if (!found) throw new Error(`no ${symbol} bottle`);
  return found;
}

describe('bottled thunder', () => {
  it('is registered as bottled-thunder, as a named and default export', () => {
    expect(bottledThunder.id).toBe('bottled-thunder');
    expect(bottledThunderDefault).toBe(bottledThunder);
  });

  it('starts on the instructions, with a full round ahead', () => {
    const state = createState();
    expect(state.phase).toBe('intro');
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.score).toBe(0);
    expect(state.bottles.map((b) => b.symbol)).toEqual(['circle', 'triangle', 'diamond']);
  });

  it('does not run the clock or attract before the round starts', () => {
    const state = createState();
    expect(pressLantern(state, 100, 100)).toBe(false);
    expect(state.lantern.held).toBe(false);
    step(state, 5);
    expect(state.timeLeft).toBe(ROUND_SECONDS);
  });

  it('starts a round from the start control with the lantern off', () => {
    const state = createState();
    expect(isOnButton(BUTTON.x + 5, BUTTON.y + 5)).toBe(true);
    expect(isOnButton(BUTTON.x - 5, BUTTON.y)).toBe(false);
    startRound(state);
    expect(state.phase).toBe('playing');
    expect(state.lantern.held).toBe(false);
  });

  it('scales pointer positions to the canvas', () => {
    const rect = { left: 100, top: 50, width: 400, height: 250 };
    expect(toCanvasPoint(300, 175, rect)).toEqual({ x: 400, y: 250 });
    expect(toCanvasPoint(100, 50, rect)).toEqual({ x: 0, y: 0 });
  });

  it('pulls nearby sparks towards the held lantern', () => {
    const state = playing();
    state.sparks = [spark({ x: 400, y: 200 })];
    pressLantern(state, 500, 200);
    step(state, 0.1);
    expect(state.sparks[0].vx).toBeGreaterThan(0);
    expect(state.sparks[0].x).toBeGreaterThan(400);
    expect(state.sparks[0].guided).toBe(true);
  });

  it('leaves sparks outside the radius alone', () => {
    const state = playing();
    state.sparks = [spark({ x: 100, y: 150 })];
    pressLantern(state, 100 + ATTRACT_RADIUS + 50, 150);
    step(state, 0.1);
    expect(state.sparks[0].vx).toBe(0);
    expect(state.sparks[0].guided).toBe(false);
  });

  it('lets sparks coast once released, without pulling them further', () => {
    const state = playing();
    state.sparks = [spark({ x: 400, y: 150 })];
    pressLantern(state, 500, 150);
    step(state, 0.1);
    releaseLantern(state);
    const { vx } = state.sparks[0];
    moveLantern(state, 100, 150);
    step(state, 0.1);
    expect(state.sparks[0].vx).toBeCloseTo(vx);
    expect(state.sparks[0].vy).toBeGreaterThan(0);
  });

  it('does not penalise an empty release', () => {
    const state = playing();
    state.streak = 4;
    pressLantern(state, 400, 200);
    releaseLantern(state);
    step(state, 0.1);
    expect(state.streak).toBe(4);
    expect(state.score).toBe(0);
  });

  it('scores a spark that falls into its matching bottle', () => {
    const state = playing();
    const target = bottle(state, 'triangle');
    state.sparks = [
      spark({ symbol: 'triangle', x: target.x, y: MOUTH_Y - 5, vy: 200, guided: true }),
    ];
    step(state, 0.1);
    expect(state.sparks).toHaveLength(0);
    expect(state.score).toBe(10);
    expect(state.streak).toBe(1);
    expect(target.pulse).toBeGreaterThan(0);
  });

  it('consumes a spark in the wrong bottle and breaks the streak', () => {
    const state = playing();
    state.streak = 5;
    const wrong = bottle(state, 'diamond');
    state.sparks = [spark({ symbol: 'circle', x: wrong.x, y: MOUTH_Y - 5, vy: 200, guided: true })];
    step(state, 0.1);
    expect(state.sparks).toHaveLength(0);
    expect(state.score).toBe(0);
    expect(state.streak).toBe(0);
    expect(multiplierFor(state.streak)).toBe(1);
    expect(state.feedback.some((f) => f.kind === 'bad')).toBe(true);
  });

  it('bounces a spark off the shelf between bottles', () => {
    const state = playing();
    const between = (state.bottles[0].x + state.bottles[1].x) / 2;
    expect(bottleAt(state, between)).toBeUndefined();
    state.sparks = [spark({ x: between, y: MOUTH_Y - 2, vy: 200, guided: true })];
    step(state, 0.05);
    expect(state.sparks).toHaveLength(1);
    expect(state.sparks[0].y).toBeLessThan(MOUTH_Y);
  });

  it('raises the multiplier every third capture in a row, up to 4x', () => {
    const state = playing();
    const target = bottle(state, 'circle');
    const points: number[] = [];
    for (let i = 0; i < 12; i++) points.push(capture(state, spark(), target));
    expect(points).toEqual([10, 10, 10, 20, 20, 20, 30, 30, 30, 40, 40, 40]);
    expect(capture(state, spark(), target)).toBe(40);
    expect(multiplierFor(100)).toBe(4);
  });

  it('loses a spark that outlives its lifetime and resets the streak', () => {
    const state = playing();
    state.streak = 3;
    state.sparks = [spark({ age: SPARK_LIFETIME - 0.01 })];
    step(state, 0.05);
    expect(state.sparks).toHaveLength(0);
    expect(state.streak).toBe(0);
  });

  it('never holds more than the spark limit', () => {
    const state = playing();
    let n = 0;
    const random = () => (n++ % 10) / 10;
    for (let i = 0; i < MAX_SPARKS + 5; i++) spawnSpark(state, random);
    expect(state.sparks).toHaveLength(MAX_SPARKS);
    expect(spawnSpark(state, random)).toBeNull();
  });

  it('introduces sparks gradually, using the injected randomness', () => {
    const state = createState();
    startRound(state);
    step(state, 0.4, () => 0);
    expect(state.sparks).toHaveLength(0);
    step(state, 0.2, () => 0);
    expect(state.sparks).toHaveLength(1);
    expect(state.sparks[0].symbol).toBe('circle');
  });

  it('keeps unguided sparks drifting above the bottles', () => {
    const state = playing();
    state.sparks = [spark({ y: 250, vy: 300 })];
    step(state, 1);
    expect(state.sparks[0].y).toBeLessThan(MOUTH_Y);
  });

  it('does not let one large step skip past a bottle mouth', () => {
    const state = playing();
    const target = bottle(state, 'diamond');
    state.sparks = [
      spark({ symbol: 'diamond', x: target.x, y: MOUTH_Y - 40, vy: 380, guided: true }),
    ];
    step(state, 2);
    expect(state.score).toBe(10);
    expect(state.sparks).toHaveLength(0);
  });

  it('does not let one large step skip past a spark lifetime', () => {
    const state = playing();
    state.streak = 2;
    state.sparks = [spark()];
    step(state, SPARK_LIFETIME + 5);
    expect(state.sparks).toHaveLength(0);
    expect(state.streak).toBe(0);
    expect(MAX_SUBSTEP).toBeLessThan(0.02);
  });

  it('ends after 45 seconds and hands over the score exactly once', () => {
    const state = playing();
    state.score = 70;
    pressLantern(state, 400, 200);
    step(state, ROUND_SECONDS - 1);
    expect(state.phase).toBe('playing');
    expect(claimFinalScore(state)).toBeUndefined();
    step(state, 5);
    expect(state.phase).toBe('over');
    expect(state.timeLeft).toBe(0);
    expect(state.lantern.held).toBe(false);
    expect(claimFinalScore(state)).toBe(70);
    expect(claimFinalScore(state)).toBeUndefined();
    step(state, 1);
    expect(claimFinalScore(state)).toBeUndefined();
  });

  it('replays as a fresh round', () => {
    const state = playing();
    state.sparks = [spark()];
    step(state, ROUND_SECONDS);
    claimFinalScore(state);
    startRound(state);
    expect(state.phase).toBe('playing');
    expect(state.score).toBe(0);
    expect(state.streak).toBe(0);
    expect(state.sparks).toHaveLength(0);
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.reported).toBe(false);
    expect(state.lantern.held).toBe(false);
  });
});
