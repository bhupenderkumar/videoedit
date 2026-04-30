// ── Slide Rendering Engine ──────────────────────────────────────────────────
// Extracted from EditedVideoPlayer.tsx — supports 10 school/business slide styles

export interface IntroSlide {
  title: string;
  subtitle: string;
  duration: number;
  style: SlideStyle;
  color: string;
  event_name?: string;
  event_date?: string;
  logo_url?: string;
  school_name?: string;
  tagline?: string;
  animation?: "typewriter" | "fade_up" | "scale_in" | "slide_left";
}

export type SlideStyle =
  | "gradient" | "minimal" | "bold" | "school"
  | "school_chalkboard" | "school_modern" | "school_festive"
  | "school_sports" | "school_graduation" | "school_cultural";

// ── Easing ─────────────────────────────────────────────────────────────────

function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t: number): number { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

// ── Individual style renderers ─────────────────────────────────────────────

function drawSchoolBoard(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, ep: number) {
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "#1a2e1a");
  grd.addColorStop(0.5, "#1d3420");
  grd.addColorStop(1, "#152a15");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.015)";
  for (let i = 0; i < 200; i++) {
    const x = (Math.sin(i * 17.3 + 0.5) * 0.5 + 0.5) * w;
    const y = (Math.cos(i * 23.7 + 0.3) * 0.5 + 0.5) * h;
    ctx.fillRect(x, y, 1 + ((i * 7 + 3) % 5) / 5, 1 + ((i * 11 + 7) % 5) / 5);
  }
  ctx.strokeStyle = "#5C4033";
  ctx.lineWidth = Math.max(8, w * 0.012);
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.strokeStyle = "#8B6914";
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, w - 28, h - 28);
}

function drawChalkboard(ctx: CanvasRenderingContext2D, w: number, h: number, ep: number) {
  // Dark green chalkboard
  const grd = ctx.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, "#2d5016");
  grd.addColorStop(0.3, "#1a3a0a");
  grd.addColorStop(0.7, "#1e4010");
  grd.addColorStop(1, "#163008");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  // Chalk dust texture
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  for (let i = 0; i < 300; i++) {
    const x = (Math.sin(i * 13.7) * 0.5 + 0.5) * w;
    const y = (Math.cos(i * 19.3) * 0.5 + 0.5) * h;
    ctx.fillRect(x, y, 1 + (i % 3), 1);
  }
  // Wooden frame
  const frameW = Math.max(12, w * 0.018);
  ctx.fillStyle = "#654321";
  ctx.fillRect(0, 0, frameW, h);
  ctx.fillRect(w - frameW, 0, frameW, h);
  ctx.fillRect(0, 0, w, frameW);
  ctx.fillRect(0, h - frameW, w, frameW);
  // Inner frame highlight
  ctx.strokeStyle = "#8B7355";
  ctx.lineWidth = 2;
  ctx.strokeRect(frameW, frameW, w - frameW * 2, h - frameW * 2);
  // Chalk tray
  ctx.fillStyle = "#5C4033";
  ctx.fillRect(w * 0.2, h - frameW - 8, w * 0.6, 6);
  // Chalk pieces
  const chalks = ["#FFFFFF", "#FFD700", "#FF69B4", "#87CEEB"];
  chalks.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(w * 0.3 + i * 30, h - frameW - 12, 18, 5);
  });
}

function drawModernSchool(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, ep: number) {
  // Clean white/blue gradient
  const grd = ctx.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, "#f0f4ff");
  grd.addColorStop(0.5, "#dce6ff");
  grd.addColorStop(1, "#c7d8ff");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  // Geometric shapes
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    const cx = w * (0.1 + i * 0.12);
    const cy = h * (0.2 + Math.sin(i * 1.5) * 0.3);
    const size = 20 + i * 15 + ep * 10;
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.866, cy + size * 0.5);
    ctx.lineTo(cx - size * 0.866, cy + size * 0.5);
    ctx.closePath();
    ctx.fillStyle = color || "#3b82f6";
    ctx.fill();
  }
  // Circles
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(w * (0.7 + i * 0.06), h * (0.15 + i * 0.12), 10 + i * 8, 0, Math.PI * 2);
    ctx.fillStyle = "#3b82f6";
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Bottom accent bar
  ctx.fillStyle = color || "#3b82f6";
  ctx.fillRect(0, h - 6, w * Math.min(1, ep * 2), 6);
}

function drawFestive(ctx: CanvasRenderingContext2D, w: number, h: number, ep: number) {
  // Colorful gradient
  const grd = ctx.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, "#ff6b35");
  grd.addColorStop(0.25, "#f7c948");
  grd.addColorStop(0.5, "#ff4081");
  grd.addColorStop(0.75, "#7c4dff");
  grd.addColorStop(1, "#00bcd4");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  // Bunting triangles along top
  const buntingColors = ["#FF5722", "#FFEB3B", "#4CAF50", "#2196F3", "#E91E63", "#FF9800"];
  const triW = w / 12;
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = buntingColors[i % buntingColors.length];
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(i * triW, 0);
    ctx.lineTo(i * triW + triW / 2, 50 + Math.sin(i + ep * 4) * 10);
    ctx.lineTo(i * triW + triW, 0);
    ctx.fill();
  }
  // String
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let i = 0; i <= 12; i++) {
    ctx.lineTo(i * triW + triW / 2, 5 + Math.sin(i * 0.8 + ep * 3) * 3);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Confetti
  const confettiColors = ["#FF5722", "#FFEB3B", "#4CAF50", "#2196F3", "#E91E63", "#9C27B0"];
  for (let i = 0; i < 40; i++) {
    const cx = (Math.sin(i * 7.3 + ep * 2) * 0.5 + 0.5) * w;
    const cy = (Math.cos(i * 11.7 + ep * 3) * 0.5 + 0.5) * h;
    ctx.fillStyle = confettiColors[i % confettiColors.length];
    ctx.globalAlpha = 0.4 + Math.sin(ep * 5 + i) * 0.3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ep * Math.PI + i * 0.5);
    ctx.fillRect(-4, -2, 8, 4);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawSports(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, ep: number) {
  // Dynamic dark background
  const grd = ctx.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, "#0d1117");
  grd.addColorStop(0.5, "#161b22");
  grd.addColorStop(1, "#0d1117");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  // Diagonal energy lines
  ctx.globalAlpha = 0.15;
  const lineColors = ["#ff4444", "#ffaa00", "#44ff44"];
  for (let i = 0; i < 15; i++) {
    ctx.strokeStyle = lineColors[i % 3];
    ctx.lineWidth = 2 + (i % 3) * 2;
    ctx.beginPath();
    const startX = -w * 0.3 + i * w * 0.12;
    ctx.moveTo(startX + ep * w * 0.1, 0);
    ctx.lineTo(startX + w * 0.5 + ep * w * 0.1, h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Side accent bars
  ctx.fillStyle = color || "#ff4444";
  ctx.fillRect(0, 0, 5, h * Math.min(1, ep * 3));
  ctx.fillRect(w - 5, h - h * Math.min(1, ep * 3), 5, h);
  // Top/bottom energy strips
  ctx.fillStyle = color || "#ff4444";
  ctx.globalAlpha = 0.8;
  ctx.fillRect(0, 0, w * Math.min(1, ep * 2), 3);
  ctx.fillRect(w - w * Math.min(1, ep * 2), h - 3, w, 3);
  ctx.globalAlpha = 1;
}

function drawGraduation(ctx: CanvasRenderingContext2D, w: number, h: number, ep: number) {
  // Deep navy/gold gradient
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "#0a1628");
  grd.addColorStop(0.4, "#1a2744");
  grd.addColorStop(1, "#0a1628");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  // Gold accents
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 8; i++) {
    const cx = w * (0.15 + i * 0.1);
    const cy = h * 0.3 + Math.sin(i * 2) * h * 0.15;
    const size = 60 + i * 20;
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, size * ep, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Gold border frame
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, w - 40, h - 40);
  ctx.strokeStyle = "rgba(255,215,0,0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(25, 25, w - 50, h - 50);
  // Graduation cap icon (simple)
  const capX = w / 2, capY = h * 0.18;
  ctx.fillStyle = `rgba(255,215,0,${Math.min(1, ep * 2) * 0.6})`;
  // Cap top
  ctx.beginPath();
  ctx.moveTo(capX - 40, capY);
  ctx.lineTo(capX, capY - 20);
  ctx.lineTo(capX + 40, capY);
  ctx.lineTo(capX, capY + 10);
  ctx.closePath();
  ctx.fill();
  // Tassel
  ctx.strokeStyle = `rgba(255,215,0,${Math.min(1, ep * 2) * 0.5})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(capX + 30, capY - 5);
  ctx.lineTo(capX + 35, capY + 25 + Math.sin(ep * 4) * 5);
  ctx.stroke();
}

function drawCultural(ctx: CanvasRenderingContext2D, w: number, h: number, ep: number) {
  // Warm traditional gradient
  const grd = ctx.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, "#8B0000");
  grd.addColorStop(0.3, "#B22222");
  grd.addColorStop(0.6, "#CD853F");
  grd.addColorStop(1, "#8B4513");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  // Rangoli-style patterns (circles and petals)
  ctx.globalAlpha = 0.12;
  const centerX = w / 2, centerY = h / 2;
  const petals = 12;
  for (let ring = 0; ring < 4; ring++) {
    const radius = 60 + ring * 50;
    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * Math.PI * 2 + ep * Math.PI * 0.5;
      const px = centerX + Math.cos(angle) * radius;
      const py = centerY + Math.sin(angle) * radius * 0.6;
      ctx.fillStyle = ["#FFD700", "#FF6347", "#FF69B4", "#00CED1"][ring];
      ctx.beginPath();
      ctx.ellipse(px, py, 15 + ring * 3, 8 + ring * 2, angle, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Decorative border (paisley-inspired)
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.3;
  ctx.strokeRect(15, 15, w - 30, h - 30);
  // Corner decorations
  const cornerSize = 30;
  [[15, 15], [w - 15 - cornerSize, 15], [15, h - 15 - cornerSize], [w - 15 - cornerSize, h - 15 - cornerSize]].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx + cornerSize / 2, cy + cornerSize / 2, cornerSize / 2, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

function drawBold(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, ep: number) {
  const grd = ctx.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, color);
  grd.addColorStop(0.4, "#ec4899");
  grd.addColorStop(0.7, "#f59e0b");
  grd.addColorStop(1, "#06b6d4");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    const cx = w * (0.2 + i * 0.12), cy = h * (0.3 + Math.sin(i) * 0.2);
    ctx.arc(cx, cy, 30 + i * 20 + ep * 20, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMinimal(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, ep: number) {
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, w, h);
  const lineW = w * 0.3 * Math.min(1, ep * 2);
  ctx.fillStyle = color;
  ctx.fillRect(w / 2 - lineW / 2, h * 0.55, lineW, 2);
  ctx.globalAlpha = 0.3;
  ctx.fillRect(0, 0, w * 0.08 * Math.min(1, ep * 3), 2);
  ctx.fillRect(0, 0, 2, h * 0.08 * Math.min(1, ep * 3));
  ctx.fillRect(w - w * 0.08 * Math.min(1, ep * 3), h - 2, w * 0.08, 2);
  ctx.fillRect(w - 2, h - h * 0.08 * Math.min(1, ep * 3), 2, h * 0.08);
  ctx.globalAlpha = 1;
}

function drawGradientDefault(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, ep: number) {
  const grd = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h / 2, w * 0.7);
  grd.addColorStop(0, color);
  grd.addColorStop(0.6, "#1a1a2e");
  grd.addColorStop(1, "#09090b");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

// ── Background Style Registry ──────────────────────────────────────────────

type BgRenderer = (ctx: CanvasRenderingContext2D, w: number, h: number, color: string, ep: number) => void;

const STYLE_RENDERERS: Record<SlideStyle, BgRenderer> = {
  school:             drawSchoolBoard,
  school_chalkboard:  (ctx, w, h, c, ep) => drawChalkboard(ctx, w, h, ep),
  school_modern:      drawModernSchool,
  school_festive:     (ctx, w, h, c, ep) => drawFestive(ctx, w, h, ep),
  school_sports:      drawSports,
  school_graduation:  (ctx, w, h, c, ep) => drawGraduation(ctx, w, h, ep),
  school_cultural:    (ctx, w, h, c, ep) => drawCultural(ctx, w, h, ep),
  bold:               drawBold,
  minimal:            drawMinimal,
  gradient:           drawGradientDefault,
};

// ── Particle Overlay (shared) ──────────────────────────────────────────────

function drawParticles(ctx: CanvasRenderingContext2D, w: number, h: number, ep: number) {
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let i = 0; i < 15; i++) {
    const angle = ep * Math.PI * 1.5 + i * 0.7;
    const radius = 40 + i * 18;
    const px = w / 2 + Math.cos(angle) * radius;
    const py = h * 0.4 + Math.sin(angle) * radius * 0.4;
    const size = 1.5 + Math.sin(ep * 4 + i) * 1.5;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(0.5, size), 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Text animation helpers ─────────────────────────────────────────────────

function typewriterText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, ep: number) {
  const chars = Math.floor(text.length * Math.min(1, ep * 2));
  ctx.fillText(text.slice(0, chars), x, y, maxW);
}

function fadeUpText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, ep: number) {
  const offset = (1 - Math.min(1, ep * 2.5)) * 25;
  ctx.fillText(text, x, y + offset, maxW);
}

function scaleInText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, ep: number) {
  const scale = 0.5 + easeOutCubic(Math.min(1, ep * 2)) * 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillText(text, 0, 0, maxW / scale);
  ctx.restore();
}

// ── Main Slide Renderer ────────────────────────────────────────────────────

export function drawSlide(
  ctx: CanvasRenderingContext2D,
  slide: IntroSlide,
  w: number,
  h: number,
  progress: number
) {
  const color = slide.color || "#6d28d9";
  const ep = Math.min(1, progress);

  // Background
  const renderer = STYLE_RENDERERS[slide.style] || STYLE_RENDERERS.gradient;
  renderer(ctx, w, h, color, ep);

  // Particles (skip for modern/minimal styles)
  if (!["school_modern", "minimal"].includes(slide.style)) {
    drawParticles(ctx, w, h, ep);
  }

  // Title
  const titleAlpha = Math.min(1, ep * 3);
  const titleY = h * 0.42 + (1 - Math.min(1, ep * 2.5)) * 25;
  const titleSize = Math.round(Math.min(w / 11, h / 7));
  const isLightBg = ["school_modern"].includes(slide.style);
  const textColor = isLightBg ? "#1a1a2e" : "#ffffff";

  ctx.font = `700 ${titleSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = isLightBg ? `rgba(26,26,46,${titleAlpha})` : `rgba(255,255,255,${titleAlpha})`;
  ctx.shadowColor = isLightBg ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  // Apply text animation
  const displayTitle = slide.school_name || slide.title;
  if (slide.animation === "typewriter") {
    typewriterText(ctx, displayTitle, w / 2, titleY, w * 0.85, ep);
  } else if (slide.animation === "scale_in") {
    scaleInText(ctx, displayTitle, w / 2, titleY, w * 0.85, ep);
  } else {
    fadeUpText(ctx, displayTitle, w / 2, titleY, w * 0.85, ep);
  }

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Subtitle
  const subAlpha = Math.max(0, Math.min(1, (ep - 0.25) * 3));
  if (subAlpha > 0) {
    const subSize = Math.round(Math.min(w / 22, h / 14));
    ctx.font = `400 ${subSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = isLightBg ? `rgba(26,26,46,${subAlpha * 0.7})` : `rgba(255,255,255,${subAlpha * 0.7})`;
    ctx.fillText(slide.subtitle, w / 2, titleY + titleSize * 1.2, w * 0.8);
  }

  // Event name (if provided)
  if (slide.event_name) {
    const eventAlpha = Math.max(0, Math.min(1, (ep - 0.4) * 3));
    if (eventAlpha > 0) {
      const eventSize = Math.round(Math.min(w / 28, h / 18));
      ctx.font = `600 ${eventSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = isLightBg ? `rgba(59,130,246,${eventAlpha})` : `rgba(255,215,0,${eventAlpha})`;
      ctx.fillText(slide.event_name, w / 2, titleY + titleSize * 2, w * 0.7);
    }
  }

  // Event date (if provided)
  if (slide.event_date) {
    const dateAlpha = Math.max(0, Math.min(1, (ep - 0.5) * 3));
    if (dateAlpha > 0) {
      const dateSize = Math.round(Math.min(w / 32, h / 20));
      ctx.font = `400 ${dateSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = isLightBg ? `rgba(26,26,46,${dateAlpha * 0.5})` : `rgba(255,255,255,${dateAlpha * 0.5})`;
      ctx.fillText(slide.event_date, w / 2, titleY + titleSize * 2.6, w * 0.6);
    }
  }

  // Tagline (if provided)
  if (slide.tagline) {
    const tagAlpha = Math.max(0, Math.min(1, (ep - 0.55) * 3));
    if (tagAlpha > 0) {
      const tagSize = Math.round(Math.min(w / 30, h / 18));
      ctx.font = `italic 300 ${tagSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = isLightBg ? `rgba(26,26,46,${tagAlpha * 0.6})` : `rgba(255,255,255,${tagAlpha * 0.6})`;
      ctx.fillText(`"${slide.tagline}"`, w / 2, h * 0.82, w * 0.7);
    }
  }

  // Fade in/out
  if (ep < 0.12) {
    ctx.fillStyle = `rgba(0,0,0,${1 - ep / 0.12})`;
    ctx.fillRect(0, 0, w, h);
  } else if (ep > 0.88) {
    ctx.fillStyle = `rgba(0,0,0,${(ep - 0.88) / 0.12})`;
    ctx.fillRect(0, 0, w, h);
  }
}

// ── Style metadata for UI ──────────────────────────────────────────────────

export const SLIDE_STYLES: { key: SlideStyle; label: string; category: "general" | "school"; description: string }[] = [
  { key: "gradient", label: "Gradient", category: "general", description: "Classic radial gradient" },
  { key: "minimal", label: "Minimal", category: "general", description: "Clean dark with accent lines" },
  { key: "bold", label: "Bold", category: "general", description: "Multi-color energetic gradient" },
  { key: "school", label: "Classic School", category: "school", description: "Green board with wooden frame" },
  { key: "school_chalkboard", label: "Chalkboard", category: "school", description: "Dark green chalk board with chalk" },
  { key: "school_modern", label: "Modern School", category: "school", description: "Clean white/blue with shapes" },
  { key: "school_festive", label: "Festive", category: "school", description: "Colorful bunting and confetti" },
  { key: "school_sports", label: "Sports Day", category: "school", description: "Dynamic dark with energy lines" },
  { key: "school_graduation", label: "Graduation", category: "school", description: "Navy/gold with graduation cap" },
  { key: "school_cultural", label: "Cultural", category: "school", description: "Warm tones with rangoli patterns" },
];
