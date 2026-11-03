import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

/** Seconds in one round. */
export const ROUND_LENGTH = 30;
/** Seconds a mole stays up before it drops back down. */
export const UP_TIME = 1;
/** Seconds a whacked mole stays on screen, dazed, before it drops. */
export const WHACKED_TIME = 0.3;
/** Seconds between pop-ups at the start of the round, and at the end. */
export const FIRST_INTERVAL = 1;
export const LAST_INTERVAL = 0.35;
export const POINTS_PER_MOLE = 10;

const COLUMNS = 3;
const ROWS = 3;
export const HOLE_RADIUS = 48;
const GRID = { left: 200, top: 130, spacingX: 200, spacingY: 120 } as const;

export interface Hole {
  x: number;
  y: number;
  mole: 'down' | 'up' | 'whacked';
  /** Seconds left before the mole drops back down. */
  timer: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  /** Seconds since the round started. */
  elapsed: number;
  /** Seconds until the next mole pops up. */
  nextPop: number;
  score: number;
  misses: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const holes: Hole[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      holes.push({
        x: GRID.left + column * GRID.spacingX,
        y: GRID.top + row * GRID.spacingY,
        mole: 'down',
        timer: 0,
      });
    }
  }
  return { holes, elapsed: 0, nextPop: 0.5, score: 0, misses: 0, phase: 'playing' };
}

/** Seconds between pop-ups: shrinks steadily from the first to the last interval. */
export function popInterval(elapsed: number): number {
  const progress = Math.min(Math.max(elapsed / ROUND_LENGTH, 0), 1);
  return FIRST_INTERVAL + (LAST_INTERVAL - FIRST_INTERVAL) * progress;
}

export function timeLeft(state: WhackAMoleState): number {
  return Math.max(ROUND_LENGTH - state.elapsed, 0);
}

/** The index of the hole under a point, or -1 when there is none. */
export function holeAt(state: WhackAMoleState, x: number, y: number): number {
  return state.holes.findIndex((hole) => Math.hypot(x - hole.x, y - hole.y) <= HOLE_RADIUS);
}

/** Pops a mole up from a random empty hole. Returns false if every hole is busy. */
export function popUp(state: WhackAMoleState, random: () => number = Math.random): boolean {
  const empty = state.holes.filter((hole) => hole.mole === 'down');
  if (empty.length === 0) return false;
  const hole = empty[Math.min(Math.floor(random() * empty.length), empty.length - 1)];
  hole.mole = 'up';
  hole.timer = UP_TIME;
  return true;
}

/** Whacks the mole in a hole. Returns the points scored, 0 for a miss. */
export function whack(state: WhackAMoleState, index: number): number {
  const hole = state.holes[index];
  if (state.phase !== 'playing' || !hole || hole.mole !== 'up') return 0;
  hole.mole = 'whacked';
  hole.timer = WHACKED_TIME;
  state.score += POINTS_PER_MOLE;
  return POINTS_PER_MOLE;
}

/** Slack for floating-point drift, so splitting a step never changes when things happen. */
const EPSILON = 1e-9;

/**
 * Advances the game by `dt` seconds. A long step plays out in order, one event
 * at a time, so it ends the same as the same time split into short steps.
 */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random) {
  let remaining = dt;
  while (state.phase === 'playing' && remaining > 0) {
    // Move to the next event: a mole dropping, a pop-up, the end of the round
    // or the end of this step, whichever comes first.
    let span = Math.min(remaining, state.nextPop, ROUND_LENGTH - state.elapsed);
    for (const hole of state.holes) {
      if (hole.mole !== 'down') span = Math.min(span, hole.timer);
    }
    span = Math.max(span, 0);
    remaining -= span;
    state.elapsed += span;
    state.nextPop -= span;

    for (const hole of state.holes) {
      if (hole.mole === 'down') continue;
      hole.timer -= span;
      if (hole.timer > EPSILON) continue;
      if (hole.mole === 'up') state.misses += 1;
      hole.mole = 'down';
      hole.timer = 0;
    }

    if (state.elapsed >= ROUND_LENGTH - EPSILON) {
      state.elapsed = ROUND_LENGTH;
      for (const hole of state.holes) {
        hole.mole = 'down';
        hole.timer = 0;
      }
      state.phase = 'over';
      return;
    }

    while (state.nextPop <= EPSILON) {
      popUp(state, random);
      state.nextPop += popInterval(state.elapsed);
    }
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const hole of state.holes) {
    if (hole.mole !== 'down') {
      const dazed = hole.mole === 'whacked';
      ctx.fillStyle = colors.wood;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y - 10, HOLE_RADIUS * 0.7, Math.PI, 0);
      ctx.lineTo(hole.x + HOLE_RADIUS * 0.7, hole.y + 6);
      ctx.lineTo(hole.x - HOLE_RADIUS * 0.7, hole.y + 6);
      ctx.fill();
      ctx.fillStyle = colors.text;
      ctx.font = canvasFont('body', 'bold');
      ctx.textAlign = 'center';
      ctx.fillText(dazed ? 'x  x' : '•  •', hole.x, hole.y - 16);
      if (dazed) {
        ctx.fillStyle = colors.accent;
        ctx.fillText(`+${POINTS_PER_MOLE}`, hole.x, hole.y - HOLE_RADIUS - 12);
      }
    }
    // The front lip of the hole, drawn over the mole's base.
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y + 12, HOLE_RADIUS, HOLE_RADIUS * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(timeLeft(state))}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description:
    'Whack the moles before they duck back down. They get quicker as the clock runs out.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
      const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
      whack(state, holeAt(state, x, y));
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
