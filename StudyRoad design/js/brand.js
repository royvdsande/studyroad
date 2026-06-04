/* StudyRoad — shared brand tokens applier.
   Reads persisted brand prefs (set by the Tweaks panel) and applies them
   as CSS variables on every page so the look stays consistent. */
(function () {
  var KEY = 'studyroad-brand';
  function clampHue(h) { return ((h % 360) + 360) % 360; }
  function apply(b) {
    if (!b) return;
    var root = document.documentElement.style;
    if (b.accent) {
      root.setProperty('--accent', b.accent);
      if (b.accent600) root.setProperty('--accent-600', b.accent600);
      if (b.accent700) root.setProperty('--accent-700', b.accent700);
      if (b.accent50) root.setProperty('--accent-50', b.accent50);
      if (b.accent100) root.setProperty('--accent-100', b.accent100);
    }
    if (b.radius != null) {
      root.setProperty('--r-xs', (b.radius * 0.55) + 'px');
      root.setProperty('--r-sm', (b.radius * 0.8) + 'px');
      root.setProperty('--r', b.radius + 'px');
      root.setProperty('--r-lg', (b.radius * 1.4) + 'px');
      root.setProperty('--r-xl', (b.radius * 1.85) + 'px');
    }
  }
  try {
    var stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    apply(stored);
  } catch (e) {}
  // Expose for the tweaks panel
  window.StudyRoadBrand = {
    apply: apply,
    save: function (b) { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch (e) {} apply(b); },
    clampHue: clampHue
  };
})();
