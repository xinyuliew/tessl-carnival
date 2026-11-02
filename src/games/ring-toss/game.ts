import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
/** How close to the centre of a neck a ring must land to stay on it. */
export const NECK_RADIUS = 14;
/** The throw sways from side to side by up to this many pixels. */
export const SWAY_AMPLITUDE = 40;
/** Radians per second of the sway. */
export const SWAY_SPEED = 3;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 40 } as const;
const COLUMNS = 5;
const COLUMN_SPACING = 110;
/** Back row first. Bottles further back score more. */
const ROWS = [
  { y: 120, points: 30 },
  { y: 200, points: 20 },
  { y: 280, points: 10 },
];

export interface Bottle {
  x: number;
  /** Where the neck is, which is where a ring has to land. */
  y: number;
  points: number;
  /** Rings resting on this bottle. */
  rings: number;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the throw. */
  age: number;
}

export interface Landing {
  x: number;
  y: number;
  /** The points this ring scored; 0 for a miss. */
  points: number;
  age: number;
}

export interface RingTossState {
  bottles: Bottle[];
  ring: Ring | null;
  landings: Landing[];
  rings: number;
  score: number;
  /** Seconds since the round started; drives the sway. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const left = WIDTH / 2 - (COLUMN_SPACING * (COLUMNS - 1)) / 2;
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: COLUMNS }, (_, i) => ({
      x: left + COLUMN_SPACING * i,
      y: row.y,
      points: row.points,
      rings: 0,
    })),
  );
  return {
    bottles,
    ring: null,
    landings: [],
    rings: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** How far the throw drifts sideways at this moment. */
export function sway(state: RingTossState): number {
  return SWAY_AMPLITUDE * Math.sin(state.time * SWAY_SPEED);
}

/** The bottle a ring landing at (x, y) rests on, or undefined for a miss. */
export function bottleAt(bottles: readonly Bottle[], x: number, y: number): Bottle | undefined {
  return bottles.find((b) => Math.hypot(x - b.x, y - b.y) <= NECK_RADIUS);
}

/** Throws one ring towards the aim point. Returns false if nothing was thrown. */
export function toss(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.rings === 0 || state.ring) return false;
  state.ring = {
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX + sway(state),
    toY: Math.min(aimY, THROWER.y - 1),
    age: 0,
  };
  state.rings -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  const ring = state.ring;
  if (ring) {
    ring.age += dt;
    if (ring.age >= FLIGHT_TIME) {
      const bottle = bottleAt(state.bottles, ring.toX, ring.toY);
      if (bottle) {
        bottle.rings += 1;
        state.score += bottle.points;
      }
      state.landings.push({ x: ring.toX, y: ring.toY, points: bottle?.points ?? 0, age: 0 });
      state.ring = null;
    }
  }

  for (const landing of state.landings) landing.age += dt;
  state.landings = state.landings.filter((l) => l.age < 0.8);

  if (state.rings === 0 && !state.ring) state.phase = 'over';
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  ctx.strokeStyle = theme.colors.accent;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.ellipse(x, y, 16 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(40, row.y + 44, WIDTH - 80, 8);
    ctx.fillStyle = colors.muted;
    ctx.font = canvasFont('small', 'bold');
    ctx.textAlign = 'left';
    ctx.fillText(`${row.points}`, 12, row.y + 50);
  }

  for (const bottle of state.bottles) {
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 14, bottle.y + 14, 28, 30);
    ctx.fillRect(bottle.x - 5, bottle.y, 10, 14);
    ctx.fillStyle = colors.surface;
    ctx.fillRect(bottle.x - 6, bottle.y - 4, 12, 5);
    for (let i = 0; i < bottle.rings; i++) drawRing(ctx, bottle.x, bottle.y + 10 - i * 3);
  }

  for (const landing of state.landings) {
    ctx.globalAlpha = 1 - landing.age / 0.8;
    ctx.fillStyle = landing.points > 0 ? colors.accent : colors.danger;
    ctx.font = canvasFont('body', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(
      landing.points > 0 ? `+${landing.points}` : 'Miss',
      landing.x,
      landing.y - 20 - landing.age * 30,
    );
  }
  ctx.globalAlpha = 1;

  // The ring in flight, arcing up and shrinking as it travels away.
  if (state.ring) {
    const t = Math.min(state.ring.age / FLIGHT_TIME, 1);
    const x = state.ring.fromX + (state.ring.toX - state.ring.fromX) * t;
    const y =
      state.ring.fromY + (state.ring.toY - state.ring.fromY) * t - Math.sin(t * Math.PI) * 80;
    drawRing(ctx, x, y, 1.6 - t * 0.6);
  }

  if (state.phase === 'playing') {
    // Where the next ring will land, sway included.
    const x = aim.x + sway(state);
    const y = Math.min(aim.y, THROWER.y - 1);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, NECK_RADIUS, 0, Math.PI * 2);
    ctx.moveTo(x - 20, y);
    ctx.lineTo(x + 20, y);
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x, y + 20);
    ctx.stroke();
    if (!state.ring && state.rings > 0) drawRing(ctx, THROWER.x, THROWER.y, 1.6);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.rings}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description: 'Land rings on the bottle necks. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: ROWS[1].y };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        toss(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
