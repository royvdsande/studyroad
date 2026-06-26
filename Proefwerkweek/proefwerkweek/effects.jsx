/* global window */
// =================================================================
//  VISUAL EFFECTS — confetti, sparkles, celebration toasts
// =================================================================

function resolveColor(c) {
  if (!c || !c.startsWith("var")) return c || "#e8b84a";
  const name = c.match(/var\((--[^)]+)\)/)?.[1];
  return name ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#e8b84a" : c;
}

function getCanvas() {
  let cv = document.getElementById("fx-canvas");
  if (!cv) {
    cv = document.createElement("canvas");
    cv.id = "fx-canvas";
    document.body.appendChild(cv);
  }
  cv.width = innerWidth;
  cv.height = innerHeight;
  return cv;
}

const activeBursts = [];

function tickEffects() {
  const cv = document.getElementById("fx-canvas");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, cv.width, cv.height);
  let alive = false;
  for (let i = activeBursts.length - 1; i >= 0; i--) {
    const b = activeBursts[i];
    b.age += 1;
    for (const p of b.parts) {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag;
      p.rot += p.vr;
      p.life -= p.decay;
      if (p.life > 0 && p.y < cv.height + 60) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.s / 2, 0, 6.28);
          ctx.fill();
        } else if (p.shape === "star") {
          drawStar(ctx, p.s);
        } else {
          ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.65);
        }
        ctx.restore();
      }
    }
    if (b.age > 180 || !alive) activeBursts.splice(i, 1);
  }
  if (activeBursts.length) requestAnimationFrame(tickEffects);
  else ctx.clearRect(0, 0, cv.width, cv.height);
}

function drawStar(ctx, size) {
  const r = size / 2;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const m = i % 2 ? r * 0.45 : r;
    const x = Math.cos(a) * m;
    const y = Math.sin(a) * m;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function spawnBurst(x, y, opts = {}) {
  const {
    count = 50,
    colors = ["#e8b84a", "#fff", "#2a2622", "#6ec9a8"],
    spread = 12,
    up = 10,
    gravity = 0.38,
    shapes = ["rect", "circle", "star"],
    decay = 0.014,
  } = opts;

  const parts = Array.from({ length: count }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * spread,
    vy: Math.random() * -up - 2,
    s: 4 + Math.random() * 7,
    rot: Math.random() * 6.28,
    vr: (Math.random() - 0.5) * 0.35,
    c: colors[(Math.random() * colors.length) | 0],
    shape: shapes[(Math.random() * shapes.length) | 0],
    life: 1,
    decay,
    g: gravity,
    drag: 0.985,
  }));

  const wasEmpty = activeBursts.length === 0;
  activeBursts.push({ parts, age: 0 });
  if (wasEmpty) requestAnimationFrame(tickEffects);
}

function fireConfetti(x, y, color) {
  const c = resolveColor(color);
  spawnBurst(x, y, {
    count: 85,
    colors: [c, resolveColor("var(--gold)"), "#fffdf9", "#2a2622", resolveColor("var(--teal)")],
    spread: 14,
    up: 14,
    gravity: 0.42,
    decay: 0.011,
  });
}

function fireSparkle(x, y, color) {
  const c = resolveColor(color);
  spawnBurst(x, y, {
    count: 14,
    colors: [c, "#fff"],
    spread: 6,
    up: 5,
    gravity: 0.25,
    decay: 0.04,
    shapes: ["circle", "star"],
  });
}

function fireMegaCelebration() {
  const w = innerWidth;
  const h = innerHeight;
  const palette = [
    resolveColor("var(--gold)"),
    resolveColor("var(--tomato)"),
    resolveColor("var(--teal)"),
    resolveColor("var(--pass)"),
    "#fffdf9",
    "#2a2622",
  ];
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      spawnBurst(w * (0.15 + Math.random() * 0.7), h * 0.25 + Math.random() * h * 0.2, {
        count: 120,
        colors: palette,
        spread: 18,
        up: 16,
        gravity: 0.35,
        decay: 0.009,
      });
    }, i * 180);
  }
}

let toastTimer = null;
function showToast(msg, kind = "success") {
  let el = document.getElementById("fx-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "fx-toast";
    el.className = "fx-toast";
    document.body.appendChild(el);
  }
  el.dataset.kind = kind;
  el.textContent = msg;
  el.dataset.show = "true";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.dataset.show = "false"; }, 3200);
}

function popElement(el) {
  if (!el) return;
  el.classList.remove("fx-pop");
  void el.offsetWidth;
  el.classList.add("fx-pop");
}

function wiggleCard(el) {
  if (!el) return;
  el.classList.remove("fx-wiggle");
  void el.offsetWidth;
  el.classList.add("fx-wiggle");
}

function shakeBadge(el) {
  if (!el) return;
  el.classList.remove("fx-shake");
  void el.offsetWidth;
  el.classList.add("fx-shake");
}

Object.assign(window, {
  fireConfetti, fireSparkle, fireMegaCelebration, showToast,
  popElement, wiggleCard, shakeBadge,
});
