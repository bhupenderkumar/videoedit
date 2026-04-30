// ── Transition Rendering Engine ─────────────────────────────────────────────
// Pluggable transition effects between video segments

export type TransitionType =
  | "crossfade" | "fade_black" | "cut" | "flash"
  | "wipe_left" | "wipe_right" | "wipe_up" | "wipe_down"
  | "zoom_blur" | "dissolve" | "circle_reveal"
  | "slide_push" | "spin";

type TransitionFn = (ctx: CanvasRenderingContext2D, progress: number, w: number, h: number) => void;

// ── Transition Implementations ─────────────────────────────────────────────

function crossfade(ctx: CanvasRenderingContext2D, p: number, w: number, h: number) {
  const alpha = p < 0.5 ? p : (1 - p);
  ctx.fillStyle = `rgba(0,0,0,${alpha * 0.4})`;
  ctx.fillRect(0, 0, w, h);
}

function fadeBlack(ctx: CanvasRenderingContext2D, p: number, w: number, h: number) {
  const alpha = p < 0.5 ? p * 2 : (1 - p) * 2;
  ctx.fillStyle = `rgba(0,0,0,${alpha * 0.8})`;
  ctx.fillRect(0, 0, w, h);
}

function flash(ctx: CanvasRenderingContext2D, p: number, w: number, h: number) {
  const alpha = Math.sin(p * Math.PI) * 0.5;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillRect(0, 0, w, h);
}

function cut(_ctx: CanvasRenderingContext2D, _p: number, _w: number, _h: number) {
  // No visual effect for cut
}

function wipeLeft(ctx: CanvasRenderingContext2D, p: number, w: number, h: number) {
  const wipeX = w * (1 - p);
  ctx.fillStyle = "#000";
  ctx.fillRect(wipeX, 0, w - wipeX, h);
  // Soft edge
  const grad = ctx.createLinearGradient(wipeX - 20, 0, wipeX + 20, 0);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.5)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(wipeX - 20, 0, 40, h);
}

function wipeRight(ctx: CanvasRenderingContext2D, p: number, w: number, h: number) {
  const wipeX = w * p;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, wipeX, h);
  const grad = ctx.createLinearGradient(wipeX - 20, 0, wipeX + 20, 0);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.5)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(wipeX - 20, 0, 40, h);
}

function wipeUp(ctx: CanvasRenderingContext2D, p: number, w: number, h: number) {
  const wipeY = h * (1 - p);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, wipeY, w, h - wipeY);
  const grad = ctx.createLinearGradient(0, wipeY - 20, 0, wipeY + 20);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.5)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, wipeY - 20, w, 40);
}

function wipeDown(ctx: CanvasRenderingContext2D, p: number, w: number, h: number) {
  const wipeY = h * p;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, wipeY);
  const grad = ctx.createLinearGradient(0, wipeY - 20, 0, wipeY + 20);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.5)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, wipeY - 20, w, 40);
}

function zoomBlur(ctx: CanvasRenderingContext2D, p: number, w: number, h: number) {
  const intensity = Math.sin(p * Math.PI);
  ctx.fillStyle = `rgba(0,0,0,${intensity * 0.6})`;
  ctx.fillRect(0, 0, w, h);
  // Radial lighten in center
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.3);
  grad.addColorStop(0, `rgba(255,255,255,${intensity * 0.15})`);
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function dissolve(ctx: CanvasRenderingContext2D, p: number, w: number, h: number) {
  const blockSize = 12;
  const threshold = p;
  ctx.fillStyle = "#000";
  for (let x = 0; x < w; x += blockSize) {
    for (let y = 0; y < h; y += blockSize) {
      // Deterministic pseudo-random using position
      const rand = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      const absRand = Math.abs(rand);
      if (absRand < threshold) {
        ctx.fillRect(x, y, blockSize, blockSize);
      }
    }
  }
}

function circleReveal(ctx: CanvasRenderingContext2D, p: number, w: number, h: number) {
  const maxRadius = Math.sqrt(w * w + h * h) / 2;
  const radius = maxRadius * (1 - p);
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.arc(w / 2, h / 2, Math.max(0, radius), 0, Math.PI * 2, true);
  ctx.fill("evenodd");
}

function slidePush(ctx: CanvasRenderingContext2D, p: number, w: number, h: number) {
  const offset = w * p;
  ctx.fillStyle = "#000";
  ctx.fillRect(w - offset, 0, offset, h);
  // Edge highlight
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(w - offset - 2, 0, 4, h);
}

function spin(ctx: CanvasRenderingContext2D, p: number, w: number, h: number) {
  const intensity = Math.sin(p * Math.PI);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(intensity * 0.1);
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = `rgba(0,0,0,${intensity * 0.5})`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ── Registry ───────────────────────────────────────────────────────────────

export const TRANSITIONS: Record<string, TransitionFn> = {
  crossfade,
  fade_black: fadeBlack,
  cut,
  flash,
  wipe_left: wipeLeft,
  wipe_right: wipeRight,
  wipe_up: wipeUp,
  wipe_down: wipeDown,
  zoom_blur: zoomBlur,
  dissolve,
  circle_reveal: circleReveal,
  slide_push: slidePush,
  spin,
};

export const TRANSITION_NAMES = Object.keys(TRANSITIONS).filter(k => k !== "cut");

export function getTransition(name: string): TransitionFn {
  return TRANSITIONS[name] || TRANSITIONS.crossfade;
}

export function drawTransition(ctx: CanvasRenderingContext2D, type: string, progress: number, w: number, h: number) {
  const fn = getTransition(type);
  fn(ctx, progress, w, h);
}

// ── Transition metadata for UI ─────────────────────────────────────────────

export const TRANSITION_INFO: { key: string; label: string; description: string }[] = [
  { key: "crossfade", label: "Crossfade", description: "Smooth blend between segments" },
  { key: "fade_black", label: "Fade to Black", description: "Fade through black" },
  { key: "cut", label: "Hard Cut", description: "Instant switch" },
  { key: "flash", label: "Flash", description: "White flash burst" },
  { key: "wipe_left", label: "Wipe Left", description: "Horizontal wipe to left" },
  { key: "wipe_right", label: "Wipe Right", description: "Horizontal wipe to right" },
  { key: "wipe_up", label: "Wipe Up", description: "Vertical wipe upward" },
  { key: "wipe_down", label: "Wipe Down", description: "Vertical wipe downward" },
  { key: "zoom_blur", label: "Zoom Blur", description: "Zoom blur through center" },
  { key: "dissolve", label: "Dissolve", description: "Pixel dissolve effect" },
  { key: "circle_reveal", label: "Circle Reveal", description: "Circle reveal from center" },
  { key: "slide_push", label: "Slide Push", description: "Push frame off screen" },
  { key: "spin", label: "Spin", description: "Rotational spin transition" },
];
