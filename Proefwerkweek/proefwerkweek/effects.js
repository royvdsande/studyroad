/* =================================================================
   EFFECTS — speelse visuele effecten (confetti, sparkles, count-up)
   Vanilla JS, geen dependencies. Alles op window.Confetti / window.FX.
   Respecteert prefers-reduced-motion.
   ================================================================= */
(function () {
  "use strict";

  var reduce = false;
  try {
    reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) { reduce = false; }

  // Warme, vrolijke confetti-kleuren die bij het paper/ink-thema passen
  var COLORS = [
    "#e8643c", "#f0b429", "#3a9d8e", "#5b6fd6",
    "#d6477f", "#62b85a", "#9b59c6", "#f4a261",
    "#ef476f", "#06d6a0", "#ffd166", "#118ab2",
  ];

  var canvas = null, ctx = null, dpr = 1;
  var particles = [];
  var raf = null;

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.id = "__fx_confetti";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9998;";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
  }

  function resize() {
    if (!canvas) return;
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function emit(x, y, opts) {
    opts = opts || {};
    var count = opts.count == null ? 36 : opts.count;
    var spread = opts.spread == null ? Math.PI * 2 : opts.spread;
    var angle = opts.angle == null ? -Math.PI / 2 : opts.angle;
    var power = opts.power == null ? 9 : opts.power;
    var colors = opts.colors || COLORS;
    var scale = opts.scale == null ? 1 : opts.scale;

    for (var i = 0; i < count; i++) {
      var a = angle + (Math.random() - 0.5) * spread;
      var v = power * rand(0.45, 1.15);
      var shapeRoll = Math.random();
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: rand(0.16, 0.30),
        drag: rand(0.985, 0.995),
        size: rand(6, 13) * scale,
        color: pick(colors),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.32, 0.32),
        wob: rand(0, Math.PI * 2),
        wobSpeed: rand(0.05, 0.14),
        life: 0,
        ttl: rand(70, 130),
        shape: shapeRoll < 0.45 ? "rect" : shapeRoll < 0.78 ? "circle" : "ribbon",
      });
    }
    ensureCanvas();
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life++;
      p.vy += p.g;
      p.vx *= p.drag;
      p.wob += p.wobSpeed;
      p.x += p.vx + Math.sin(p.wob) * 0.7;
      p.y += p.vy;
      p.rot += p.vr;

      var alpha = p.life > p.ttl - 22 ? Math.max(0, (p.ttl - p.life) / 22) : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
      } else if (p.shape === "ribbon") {
        ctx.fillRect(-p.size / 2, -p.size * 0.18, p.size, p.size * 0.36);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (p.life >= p.ttl || p.y > window.innerHeight + 60) particles.splice(i, 1);
    }
    if (!particles.length) {
      cancelAnimationFrame(raf);
      raf = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function centerOf(el) {
    if (el && el.getBoundingClientRect) {
      var r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  var Confetti = {
    enabled: !reduce,

    // Kleine pop op een specifiek element (bijv. een vinkje)
    pop: function (el, opts) {
      if (reduce) return;
      var c = centerOf(el);
      emit(c.x, c.y, Object.assign({ count: 12, power: 6, spread: Math.PI * 2, scale: 0.8 }, opts || {}));
    },

    // Uitbarsting vanaf een element (bijv. een afgeronde kaart)
    burst: function (el, opts) {
      if (reduce) return;
      var c = centerOf(el);
      emit(c.x, c.y, Object.assign({ count: 46, power: 11, spread: Math.PI * 2 }, opts || {}));
    },

    // Vrije uitbarsting op coördinaten
    at: function (x, y, opts) {
      if (reduce) return;
      emit(x, y, opts);
    },

    // Twee kanonnen vanaf de onderhoeken — grote feestmomenten
    cannons: function () {
      if (reduce) return;
      var h = window.innerHeight, w = window.innerWidth;
      emit(0, h * 0.92, { count: 70, angle: -Math.PI / 3, spread: Math.PI / 4, power: 17 });
      emit(w, h * 0.92, { count: 70, angle: -Math.PI * 2 / 3, spread: Math.PI / 4, power: 17 });
      var self = this;
      setTimeout(function () {
        emit(w * 0.5, h * 0.2, { count: 60, angle: Math.PI / 2, spread: Math.PI, power: 9 });
      }, 180);
      setTimeout(function () {
        emit(0, h * 0.7, { count: 50, angle: -Math.PI / 3, spread: Math.PI / 4, power: 15 });
        emit(w, h * 0.7, { count: 50, angle: -Math.PI * 2 / 3, spread: Math.PI / 4, power: 15 });
      }, 420);
    },

    // Regen van bovenaf over de hele breedte (zachte, langere viering)
    rain: function (durationMs) {
      if (reduce) return;
      var end = Date.now() + (durationMs || 1400);
      (function tick() {
        var w = window.innerWidth;
        for (var k = 0; k < 4; k++) {
          emit(Math.random() * w, -10, { count: 1, angle: Math.PI / 2, spread: 0.6, power: rand(2, 5) });
        }
        if (Date.now() < end) setTimeout(tick, 90);
      })();
    },
  };

  // -------- count-up helper (voor losse, niet-React getallen) --------
  function countUp(opts) {
    var from = opts.from == null ? 0 : opts.from;
    var to = opts.to;
    var dur = opts.duration == null ? 850 : opts.duration;
    var decimals = opts.decimals == null ? 0 : opts.decimals;
    var onUpdate = opts.onUpdate || function () {};
    if (reduce || dur <= 0) { onUpdate(to); return; }
    var start = null;
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    function step(ts) {
      if (start == null) start = ts;
      var t = Math.min(1, (ts - start) / dur);
      var val = from + (to - from) * ease(t);
      onUpdate(parseFloat(val.toFixed(decimals)));
      if (t < 1) requestAnimationFrame(step);
      else onUpdate(to);
    }
    requestAnimationFrame(step);
  }

  window.Confetti = Confetti;
  window.FX = { reduce: reduce, countUp: countUp, colors: COLORS };
})();
