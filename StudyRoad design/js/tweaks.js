/* ============================================================
   StudyRoad — lightweight Tweaks panel (vanilla)
   Toggled from the toolbar. Persists brand accent + radius to
   localStorage via window.StudyRoadBrand so every page matches.
   ============================================================ */
(function () {
  var ACCENTS = [
    { name: 'Cobalt', accent: '#2b5ce6', accent600: '#2350cf', accent700: '#1c41ad', accent50: '#eef3fe', accent100: '#dde7fd' },
    { name: 'Royal',  accent: '#1e4fd0', accent600: '#1a45b8', accent700: '#15399a', accent50: '#eef2fd', accent100: '#d9e3fb' },
    { name: 'Sky',    accent: '#2f7ad6', accent600: '#2569bd', accent700: '#1d549b', accent50: '#eef6fd', accent100: '#d6e8fa' },
    { name: 'Indigo', accent: '#4f46e5', accent600: '#4338ca', accent700: '#372fae', accent50: '#f0effe', accent100: '#e1defd' }
  ];
  var DEFAULT = { accent: '#2b5ce6', radius: 13 };
  var KEY = 'studyroad-brand';
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }

  // Styles
  var css = document.createElement('style');
  css.textContent = [
    '.sr-tweaks{position:fixed;right:18px;bottom:18px;z-index:9000;width:268px;background:#fff;border:1px solid var(--gray-200);border-radius:16px;box-shadow:var(--sh-lg);font-family:var(--font-sans);opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .2s,transform .2s}',
    '.sr-tweaks.open{opacity:1;transform:none;pointer-events:auto}',
    '.sr-tweaks-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid var(--gray-100)}',
    '.sr-tweaks-head h4{font-family:var(--font-display);font-size:14px;font-weight:700}',
    '.sr-tweaks-x{width:28px;height:28px;border:none;background:none;border-radius:8px;cursor:pointer;color:var(--gray-400);display:grid;place-items:center}',
    '.sr-tweaks-x:hover{background:var(--gray-100);color:var(--ink)}',
    '.sr-tweaks-body{padding:14px 15px 16px}',
    '.sr-tweaks-label{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--gray-400);margin-bottom:9px}',
    '.sr-swatches{display:flex;gap:9px;margin-bottom:18px}',
    '.sr-swatch{width:40px;height:40px;border-radius:11px;cursor:pointer;border:2px solid transparent;position:relative;transition:transform .12s}',
    '.sr-swatch:hover{transform:scale(1.06)}',
    '.sr-swatch.sel{border-color:var(--ink)}',
    '.sr-swatch.sel::after{content:"";position:absolute;inset:0;margin:auto;width:13px;height:13px;background:#fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.3)}',
    '.sr-range-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}',
    '.sr-range-val{font-size:12px;font-weight:700;color:var(--gray-600)}',
    '.sr-range{width:100%;-webkit-appearance:none;height:5px;border-radius:5px;background:var(--gray-200);outline:none}',
    '.sr-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--accent);cursor:pointer;box-shadow:var(--sh-sm)}',
    '.sr-range::-moz-range-thumb{width:18px;height:18px;border:none;border-radius:50%;background:var(--accent);cursor:pointer}',
    '.sr-reset{margin-top:18px;width:100%;height:36px;border:1px solid var(--gray-200);background:#fff;border-radius:9px;font-family:inherit;font-size:13px;font-weight:600;color:var(--gray-600);cursor:pointer}',
    '.sr-reset:hover{background:var(--gray-50)}'
  ].join('');
  document.head.appendChild(css);

  var cur = Object.assign({}, DEFAULT, read());
  var selAccent = cur.accent || DEFAULT.accent;
  var selRadius = cur.radius || DEFAULT.radius;

  var panel = document.createElement('div');
  panel.className = 'sr-tweaks';
  panel.innerHTML =
    '<div class="sr-tweaks-head"><h4>Tweaks</h4><button class="sr-tweaks-x" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
    '<div class="sr-tweaks-body">' +
      '<div class="sr-tweaks-label">Brand accent</div><div class="sr-swatches"></div>' +
      '<div class="sr-range-row"><div class="sr-tweaks-label" style="margin-bottom:0">Corner radius</div><span class="sr-range-val"></span></div>' +
      '<input type="range" class="sr-range" min="8" max="20" step="1">' +
      '<button class="sr-reset">Reset to default</button>' +
    '</div>';
  document.body.appendChild(panel);

  var swatchWrap = panel.querySelector('.sr-swatches');
  ACCENTS.forEach(function (a) {
    var s = document.createElement('div');
    s.className = 'sr-swatch' + (a.accent === selAccent ? ' sel' : '');
    s.style.background = a.accent; s.title = a.name; s.dataset.accent = a.accent;
    s.addEventListener('click', function () {
      selAccent = a.accent;
      swatchWrap.querySelectorAll('.sr-swatch').forEach(function (x) { x.classList.toggle('sel', x === s); });
      save();
    });
    swatchWrap.appendChild(s);
  });

  var range = panel.querySelector('.sr-range');
  var rangeVal = panel.querySelector('.sr-range-val');
  range.value = selRadius; rangeVal.textContent = selRadius + 'px';
  range.addEventListener('input', function () { selRadius = +range.value; rangeVal.textContent = selRadius + 'px'; save(); });

  function save() {
    var a = ACCENTS.filter(function (x) { return x.accent === selAccent; })[0] || ACCENTS[0];
    var brand = { accent: a.accent, accent600: a.accent600, accent700: a.accent700, accent50: a.accent50, accent100: a.accent100, radius: selRadius };
    if (window.StudyRoadBrand) window.StudyRoadBrand.save(brand);
  }
  panel.querySelector('.sr-reset').addEventListener('click', function () {
    selAccent = DEFAULT.accent; selRadius = DEFAULT.radius;
    range.value = selRadius; rangeVal.textContent = selRadius + 'px';
    swatchWrap.querySelectorAll('.sr-swatch').forEach(function (x) { x.classList.toggle('sel', x.dataset.accent === selAccent); });
    save();
  });

  // Host protocol
  function close() { panel.classList.remove('open'); window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); }
  panel.querySelector('.sr-tweaks-x').addEventListener('click', close);
  window.addEventListener('message', function (e) {
    var t = e && e.data && e.data.type;
    if (t === '__activate_edit_mode') panel.classList.add('open');
    else if (t === '__deactivate_edit_mode') panel.classList.remove('open');
  });
  window.parent.postMessage({ type: '__edit_mode_available' }, '*');
})();
