import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 45;
export const POINTS_PER_CAPTURE = 10;
export const MAX_MULTIPLIER = 4;
export const CAPTURES_PER_LEVEL = 3;
export const MAX_SPARKS = 7;
export const SPARK_LIFETIME = 9;
export const SPARK_RADIUS = 12;
export const ATTRACT_RADIUS = 150;
export const ATTRACT_ACCEL = 1100;
export const MAX_SPEED = 380;
/** Gravity on a spark the lantern has touched, so a released spark settles downwards. */
export const COAST_GRAVITY = 140;
/** The longest piece of time the simulation moves in one go, in seconds. */
export const MAX_SUBSTEP = 1 / 120;

/** The inside of the glass cabinet. */
export const CABINET = { left: 30, right: WIDTH - 30, top: 56 } as const;
/** Sparks the lantern has never touched drift above this line. */
export const DRIFT_FLOOR = 280;
/** The shelf the bottles stand in; a spark scores by crossing it inside a mouth. */
export const MOUTH_Y = 360;
export const MOUTH_HALF_WIDTH = 30;

export const SYMBOLS = ['circle', 'triangle', 'diamond'] as const;
export type SpellSymbol = (typeof SYMBOLS)[number];

export interface Bottle {
  x: number;
  symbol: SpellSymbol;
  /** 1 just after a capture, fading to 0. */
  pulse: number;
}

export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  symbol: SpellSymbol;
  /** Seconds since the spark appeared. */
  age: number;
  /** True once the lantern has pulled it, which lets it leave the drifting zone. */
  guided: boolean;
  trail: { x: number; y: number }[];
}

export interface Feedback {
  text: string;
  x: number;
  y: number;
  kind: 'good' | 'bad';
  age: number;
}

export interface Lantern {
  x: number;
  y: number;
  held: boolean;
}

export interface BottledThunderState {
  phase: 'intro' | 'playing' | 'over';
  bottles: Bottle[];
  sparks: Spark[];
  feedback: Feedback[];
  lantern: Lantern;
  score: number;
  /** Consecutive correct captures. */
  streak: number;
  timeLeft: number;
  /** Seconds until the next spark appears. */
  spawnTimer: number;
  captures: number;
  /** True once the final score has been handed to the score board. */
  reported: boolean;
}

export type Random = () => number;

function createBottles(): Bottle[] {
  return SYMBOLS.map((symbol, i) => ({ x: (WIDTH / 4) * (i + 1), symbol, pulse: 0 }));
}

/** A new booth, showing the instructions and the start control. */
export function createState(): BottledThunderState {
  return {
    phase: 'intro',
    bottles: createBottles(),
    sparks: [],
    feedback: [],
    lantern: { x: WIDTH / 2, y: 200, held: false },
    score: 0,
    streak: 0,
    timeLeft: ROUND_SECONDS,
    spawnTimer: 0.5,
    captures: 0,
    reported: false,
  };
}

/** Starts a fresh round. The lantern starts switched off. */
export function startRound(state: BottledThunderState): void {
  const fresh = createState();
  Object.assign(state, fresh, { phase: 'playing', lantern: { ...state.lantern, held: false } });
}

/** The multiplier for the next correct capture, given the current streak. */
export function multiplierFor(streak: number): number {
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(streak / CAPTURES_PER_LEVEL));
}

/** Seconds between new sparks: slow at first, a little quicker as the round goes on. */
export function spawnInterval(elapsed: number): number {
  return Math.max(0.8, 1.8 - elapsed * 0.03);
}

export function moveLantern(state: BottledThunderState, x: number, y: number): void {
  state.lantern.x = Math.min(Math.max(x, 0), WIDTH);
  state.lantern.y = Math.min(Math.max(y, 0), HEIGHT);
}

/** Turns the lantern's pull on. Returns false when no round is being played. */
export function pressLantern(state: BottledThunderState, x: number, y: number): boolean {
  moveLantern(state, x, y);
  if (state.phase !== 'playing') return false;
  state.lantern.held = true;
  return true;
}

/** Turns the pull off. Sparks keep their speed and coast. Releasing never costs points. */
export function releaseLantern(state: BottledThunderState): void {
  state.lantern.held = false;
}

/** Scales a pointer position on the page to the canvas's own coordinates. */
export function toCanvasPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * WIDTH,
    y: ((clientY - rect.top) / rect.height) * HEIGHT,
  };
}

/** Adds a spark near the clouds, unless the cabinet is already full. */
export function spawnSpark(state: BottledThunderState, random: Random = Math.random): Spark | null {
  if (state.sparks.length >= MAX_SPARKS) return null;
  const direction = random() < 0.5 ? -1 : 1;
  const spark: Spark = {
    x: CABINET.left + 50 + random() * (CABINET.right - CABINET.left - 100),
    y: CABINET.top + 40,
    vx: direction * (30 + random() * 40),
    vy: 20 + random() * 20,
    symbol: SYMBOLS[Math.min(SYMBOLS.length - 1, Math.floor(random() * SYMBOLS.length))],
    age: 0,
    guided: false,
    trail: [],
  };
  state.sparks.push(spark);
  return spark;
}

function breakStreak(state: BottledThunderState, text: string, x: number, y: number) {
  state.streak = 0;
  state.feedback.push({ text, x, y, kind: 'bad', age: 0 });
}

/** Scores a spark entering a bottle. Returns the points it earned. */
export function capture(state: BottledThunderState, spark: Spark, bottle: Bottle): number {
  if (spark.symbol !== bottle.symbol) {
    breakStreak(state, 'Wrong bottle!', bottle.x, MOUTH_Y - 30);
    return 0;
  }
  const points = POINTS_PER_CAPTURE * multiplierFor(state.streak);
  state.score += points;
  state.streak += 1;
  state.captures += 1;
  bottle.pulse = 1;
  state.feedback.push({ text: `+${points}`, x: bottle.x, y: MOUTH_Y - 30, kind: 'good', age: 0 });
  return points;
}

/** The bottle whose mouth a spark crossing the shelf at `x` falls into, if any. */
export function bottleAt(state: BottledThunderState, x: number): Bottle | undefined {
  return state.bottles.find((bottle) => Math.abs(x - bottle.x) <= MOUTH_HALF_WIDTH);
}

/** Moves one spark by a short `h` seconds. Returns false when the spark is gone. */
function moveSpark(state: BottledThunderState, spark: Spark, h: number): boolean {
  spark.age += h;
  if (spark.age >= SPARK_LIFETIME) {
    breakStreak(state, 'Escaped!', spark.x, spark.y);
    return false;
  }

  const { lantern } = state;
  const dx = lantern.x - spark.x;
  const dy = lantern.y - spark.y;
  const distance = Math.hypot(dx, dy);
  if (lantern.held && distance <= ATTRACT_RADIUS) {
    spark.guided = true;
    if (distance > 1) {
      spark.vx += (dx / distance) * ATTRACT_ACCEL * h;
      spark.vy += (dy / distance) * ATTRACT_ACCEL * h;
    }
    // A little drag, so sparks gather at the lantern instead of orbiting it.
    const drag = 1 - Math.min(1, 2.5 * h);
    spark.vx *= drag;
    spark.vy *= drag;
  } else if (spark.guided) {
    spark.vy += COAST_GRAVITY * h;
  }

  const speed = Math.hypot(spark.vx, spark.vy);
  if (speed > MAX_SPEED) {
    spark.vx *= MAX_SPEED / speed;
    spark.vy *= MAX_SPEED / speed;
  }

  const previousY = spark.y;
  spark.x += spark.vx * h;
  spark.y += spark.vy * h;

  if (spark.x < CABINET.left + SPARK_RADIUS) {
    spark.x = CABINET.left + SPARK_RADIUS;
    spark.vx = Math.abs(spark.vx);
  } else if (spark.x > CABINET.right - SPARK_RADIUS) {
    spark.x = CABINET.right - SPARK_RADIUS;
    spark.vx = -Math.abs(spark.vx);
  }
  if (spark.y < CABINET.top + SPARK_RADIUS) {
    spark.y = CABINET.top + SPARK_RADIUS;
    spark.vy = Math.abs(spark.vy);
  }

  if (!spark.guided) {
    if (spark.y > DRIFT_FLOOR) {
      spark.y = DRIFT_FLOOR;
      spark.vy = -Math.abs(spark.vy);
    }
    return true;
  }

  if (previousY < MOUTH_Y && spark.y >= MOUTH_Y) {
    const bottle = bottleAt(state, spark.x);
    if (bottle) {
      capture(state, spark, bottle);
      return false;
    }
    // The shelf between bottles: bounce off it, losing some energy.
    spark.y = MOUTH_Y - (spark.y - MOUTH_Y);
    spark.vy = -Math.abs(spark.vy) * 0.5;
    spark.vx *= 0.8;
  }
  return true;
}

/**
 * Advances the game by `dt` seconds, in substeps of at most MAX_SUBSTEP, so a
 * large `dt` can't carry a spark past a bottle's mouth or past its lifetime.
 */
export function step(state: BottledThunderState, dt: number, random: Random = Math.random): void {
  for (const bottle of state.bottles) bottle.pulse = Math.max(0, bottle.pulse - dt * 2.5);
  for (const item of state.feedback) item.age += dt;
  state.feedback = state.feedback.filter((item) => item.age < 0.9);
  if (state.phase !== 'playing') return;

  let remaining = Math.min(Math.max(dt, 0), state.timeLeft);
  while (remaining > 0) {
    const h = Math.min(remaining, MAX_SUBSTEP);
    remaining -= h;
    state.timeLeft = Math.max(0, state.timeLeft - h);

    state.spawnTimer -= h;
    if (state.spawnTimer <= 0) {
      spawnSpark(state, random);
      state.spawnTimer = spawnInterval(ROUND_SECONDS - state.timeLeft);
    }

    state.sparks = state.sparks.filter((spark) => moveSpark(state, spark, h));
    if (state.timeLeft <= 0) break;
  }

  for (const spark of state.sparks) {
    spark.trail.push({ x: spark.x, y: spark.y });
    if (spark.trail.length > 8) spark.trail.shift();
  }

  if (state.timeLeft <= 0) {
    state.phase = 'over';
    state.lantern.held = false;
  }
}

/** The round's final score, the first time it is asked for after the round ends. */
export function claimFinalScore(state: BottledThunderState): number | undefined {
  if (state.phase !== 'over' || state.reported) return undefined;
  state.reported = true;
  return state.score;
}

/** The start and replay control, drawn on the canvas. */
export const BUTTON = { x: WIDTH / 2 - 90, y: 330, width: 180, height: 48 } as const;

export function isOnButton(x: number, y: number): boolean {
  return (
    x >= BUTTON.x && x <= BUTTON.x + BUTTON.width && y >= BUTTON.y && y <= BUTTON.y + BUTTON.height
  );
}

const SYMBOL_COLORS: Record<SpellSymbol, string> = {
  circle: theme.colors.water,
  triangle: theme.colors.accent,
  diamond: theme.colors.stripeA,
};

function symbolPath(
  ctx: CanvasRenderingContext2D,
  symbol: SpellSymbol,
  x: number,
  y: number,
  size: number,
) {
  ctx.beginPath();
  if (symbol === 'circle') {
    ctx.arc(x, y, size, 0, Math.PI * 2);
  } else if (symbol === 'triangle') {
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.95, y + size * 0.75);
    ctx.lineTo(x - size * 0.95, y + size * 0.75);
    ctx.closePath();
  } else {
    ctx.moveTo(x, y - size * 1.1);
    ctx.lineTo(x + size * 0.85, y);
    ctx.lineTo(x, y + size * 1.1);
    ctx.lineTo(x - size * 0.85, y);
    ctx.closePath();
  }
}

/** A branching bolt, the same shape every time for the same seed. */
function drawBolt(ctx: CanvasRenderingContext2D, seed: number) {
  let s = seed * 9301 + 49297;
  const next = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  let x = CABINET.left + 80 + next() * (CABINET.right - CABINET.left - 160);
  let y = CABINET.top + 30;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i < 6; i++) {
    x += (next() - 0.5) * 50;
    y += 25 + next() * 15;
    ctx.lineTo(x, y);
    if (i === 2) {
      ctx.lineTo(x + (next() - 0.5) * 80, y + 40);
      ctx.moveTo(x, y);
    }
  }
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: BottledThunderState, time: number) {
  const { colors } = theme;

  ctx.fillStyle = colors.wood;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = colors.background;
  ctx.fillRect(CABINET.left, CABINET.top, CABINET.right - CABINET.left, HEIGHT - CABINET.top - 20);

  // Drifting clouds.
  ctx.fillStyle = colors.surface;
  for (let i = 0; i < 5; i++) {
    const span = CABINET.right - CABINET.left + 160;
    const x = CABINET.left - 80 + ((i * 170 + time * (12 + i * 3)) % span);
    const y = CABINET.top + 22 + (i % 2) * 14;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.arc(x + 28, y + 6, 20, 0, Math.PI * 2);
    ctx.arc(x - 26, y + 8, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  // A lightning accent flickers every couple of seconds.
  const flash = Math.floor(time / 2.4);
  const sinceFlash = time - flash * 2.4;
  if (sinceFlash < 0.25) {
    ctx.save();
    ctx.globalAlpha = 0.5 * (1 - sinceFlash / 0.25);
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    drawBolt(ctx, flash);
    ctx.restore();
  }

  // The shelf, with gaps for the bottle mouths.
  ctx.fillStyle = colors.wood;
  let shelfX = CABINET.left;
  for (const bottle of state.bottles) {
    ctx.fillRect(shelfX, MOUTH_Y, bottle.x - MOUTH_HALF_WIDTH - shelfX, 6);
    shelfX = bottle.x + MOUTH_HALF_WIDTH;
  }
  ctx.fillRect(shelfX, MOUTH_Y, CABINET.right - shelfX, 6);

  for (const bottle of state.bottles) {
    const top = MOUTH_Y;
    ctx.save();
    ctx.globalAlpha = 0.25 + bottle.pulse * 0.5;
    ctx.fillStyle = SYMBOL_COLORS[bottle.symbol];
    ctx.beginPath();
    ctx.roundRect(bottle.x - 60, top + 30, 120, 95, theme.radius);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 3 + bottle.pulse * 3;
    ctx.beginPath();
    ctx.moveTo(bottle.x - MOUTH_HALF_WIDTH, top - 8);
    ctx.lineTo(bottle.x - MOUTH_HALF_WIDTH, top + 30);
    ctx.lineTo(bottle.x - 60, top + 30);
    ctx.lineTo(bottle.x - 60, top + 125);
    ctx.lineTo(bottle.x + 60, top + 125);
    ctx.lineTo(bottle.x + 60, top + 30);
    ctx.lineTo(bottle.x + MOUTH_HALF_WIDTH, top + 30);
    ctx.lineTo(bottle.x + MOUTH_HALF_WIDTH, top - 8);
    ctx.stroke();
    ctx.fillStyle = colors.text;
    symbolPath(ctx, bottle.symbol, bottle.x, top + 78, 22);
    ctx.fill();
  }

  if (state.lantern.held) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(state.lantern.x, state.lantern.y, ATTRACT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = colors.accent;
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  for (const spark of state.sparks) {
    const color = SYMBOL_COLORS[spark.symbol];
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    for (let i = 1; i < spark.trail.length; i++) {
      ctx.globalAlpha = (i / spark.trail.length) * 0.5;
      ctx.lineWidth = (i / spark.trail.length) * 8;
      ctx.beginPath();
      ctx.moveTo(spark.trail[i - 1].x, spark.trail[i - 1].y);
      ctx.lineTo(spark.trail[i].x, spark.trail[i].y);
      ctx.stroke();
    }
    // Fade a spark in its last second, a warning that it's about to escape.
    const fading = Math.min(1, (SPARK_LIFETIME - spark.age) / 1);
    ctx.globalAlpha = 0.4 + 0.6 * fading;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, SPARK_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.background;
    symbolPath(ctx, spark.symbol, spark.x, spark.y, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // The lantern.
  if (state.phase === 'playing') {
    const { x, y, held } = state.lantern;
    ctx.fillStyle = colors.wood;
    ctx.fillRect(x - 4, y - 22, 8, 6);
    ctx.fillStyle = held ? colors.accent : colors.muted;
    ctx.beginPath();
    ctx.roundRect(x - 10, y - 16, 20, 28, 6);
    ctx.fill();
    ctx.fillStyle = colors.text;
    ctx.beginPath();
    ctx.arc(x, y - 2, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = canvasFont('title', 'bold');
  ctx.textAlign = 'center';
  for (const item of state.feedback) {
    ctx.globalAlpha = 1 - item.age / 0.9;
    ctx.fillStyle = item.kind === 'good' ? colors.accent : colors.danger;
    ctx.fillText(item.text, item.x, item.y - item.age * 30);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, CABINET.left, 36);
  ctx.textAlign = 'center';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}s`, WIDTH / 2, 36);
  ctx.textAlign = 'right';
  ctx.fillText(`Multiplier ${multiplierFor(state.streak)}x`, CABINET.right, 36);

  if (state.phase !== 'playing') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    if (state.phase === 'intro') {
      ctx.fillText('Bottled Thunder', WIDTH / 2, 130);
      ctx.fillStyle = colors.text;
      ctx.font = canvasFont('body');
      const lines = [
        'Hold the pointer down to switch on the lantern: nearby sparks bend towards it.',
        'Let go to release them, and they coast on and drop.',
        'Steer each spark into the bottle with its symbol: circle, triangle or diamond.',
        'Three right in a row raises your multiplier, up to 4x. You have 45 seconds.',
      ];
      lines.forEach((line, i) => ctx.fillText(line, WIDTH / 2, 185 + i * 30));
    } else {
      ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, 220);
      ctx.fillStyle = colors.text;
      ctx.font = canvasFont('body');
      ctx.fillText(`${state.captures} sparks bottled`, WIDTH / 2, 265);
    }
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.roundRect(BUTTON.x, BUTTON.y, BUTTON.width, BUTTON.height, theme.radius);
    ctx.fill();
    ctx.fillStyle = colors.background;
    ctx.font = canvasFont('body', 'bold');
    ctx.fillText(
      state.phase === 'intro' ? 'Start' : 'Play again',
      WIDTH / 2,
      BUTTON.y + BUTTON.height / 2 + 6,
    );
  }
}

export const bottledThunder: CarnivalGame = {
  id: 'bottled-thunder',
  name: 'Bottled Thunder',
  description:
    'Guide living sparks with a magnetic lantern into the bottles that match their symbols.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    // Stop touch drags from scrolling the page while the lantern is held.
    const touchAction = canvas.style.touchAction;
    canvas.style.touchAction = 'none';

    const state = createState();
    let capturedPointer: number | null = null;

    const pointFrom = (event: PointerEvent) =>
      toCanvasPoint(event.clientX, event.clientY, canvas.getBoundingClientRect());
    const releasePointer = () => {
      if (capturedPointer !== null && canvas.hasPointerCapture(capturedPointer)) {
        canvas.releasePointerCapture(capturedPointer);
      }
      capturedPointer = null;
    };

    const onMove = (event: PointerEvent) => {
      const { x, y } = pointFrom(event);
      moveLantern(state, x, y);
    };
    const onDown = (event: PointerEvent) => {
      const { x, y } = pointFrom(event);
      if (state.phase !== 'playing') {
        // The click on Start or Play again only starts the round.
        moveLantern(state, x, y);
        if (isOnButton(x, y)) startRound(state);
        return;
      }
      event.preventDefault();
      pressLantern(state, x, y);
      capturedPointer = event.pointerId;
      canvas.setPointerCapture(event.pointerId);
    };
    const onUp = () => {
      releaseLantern(state);
      releasePointer();
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('lostpointercapture', onUp);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't race through the round.
      const dt = Math.min(Math.max((time - last) / 1000, 0), 0.05);
      last = time;
      step(state, dt);
      const finalScore = claimFinalScore(state);
      if (finalScore !== undefined) {
        recordScore(bottledThunder.id, finalScore);
        releasePointer();
      }
      draw(ctx, state, time / 1000);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      releasePointer();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('lostpointercapture', onUp);
      canvas.style.touchAction = touchAction;
    };
  },
};

export default bottledThunder;
