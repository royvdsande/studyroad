#!/usr/bin/env node
/* =================================================================
   BUILD — bouwt een zelfstandig (single-file) dashboard.
   Inlinet styles.css + alle scripts in één HTML, zodat het bestand
   los te openen / te hosten is. Output: ../../index.html (repo-root).
   Gebruik:  node build.js
   ================================================================= */
"use strict";
const fs = require("fs");
const path = require("path");

const SRC = __dirname;
const OUT = path.resolve(SRC, "..", "..", "index.html");

const read = (f) => fs.readFileSync(path.join(SRC, f), "utf8");
// Voorkom dat ingebedde "</script>" de inline-scripts breekt.
const safe = (s) => s.replace(/<\/script>/gi, "<\\/script>");
// Externe babel-scripts krijgen elk hun eigen scope. Bij inlinen draaien ze
// in dezelfde globale scope, dus isoleren we ze in een IIFE (anders botst bv.
// `const { useState } = React;` tussen de bestanden). Cross-file delen gebeurt
// netjes via window (Object.assign(window, …)).
const iife = (s) => `;(function () {\n${safe(s)}\n})();`;

const css = read("styles.css");
const dataJsx = read("data.jsx");
const gradesData = read("grades-data.js");
const effects = read("effects.js");
const components = read("components.jsx");
const grades = read("grades.jsx");
const v6 = read("v6.jsx");
const app = read("app.jsx");

const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Examen-dashboard · V5c</title>
  <meta name="description" content="Persoonlijk examen-dashboard: proefwerkweek 3, V6-vooruitblik en cijfers — met voortgang, planning en speelse animaties." />
  <meta name="theme-color" content="#221f1b" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%23221f1b'/%3E%3Ctext x='50' y='68' font-family='Bricolage Grotesque,Arial,sans-serif' font-size='52' font-weight='800' fill='%23fffdf9' text-anchor='middle'%3EP3%3C/text%3E%3C/svg%3E" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
  <style>
${css}
  </style>
</head>
<body>
  <template id="__bundler_thumbnail" data-bg-color="#2a2622">
    <svg viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="800" fill="#2a2622" />
      <rect x="470" y="300" width="260" height="200" rx="40" fill="#faf7f1" transform="rotate(-4 600 400)" />
      <text x="600" y="430" font-family="Bricolage Grotesque, sans-serif" font-size="120" font-weight="800" fill="#2a2622" text-anchor="middle" transform="rotate(-4 600 400)">P3</text>
    </svg>
  </template>
  <div id="root"></div>

  <script src="https://unpkg.com/react@18.3.1/umd/react.development.js" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin="anonymous"></script>

  <script type="text/babel" data-presets="react">
${iife(dataJsx)}
  </script>
  <script>
${safe(gradesData)}
  </script>
  <script>
${safe(effects)}
  </script>
  <script type="text/babel" data-presets="react">
${iife(components)}
  </script>
  <script type="text/babel" data-presets="react">
${iife(grades)}
  </script>
  <script type="text/babel" data-presets="react">
${iife(v6)}
  </script>
  <script type="text/babel" data-presets="react">
${iife(app)}
  </script>
</body>
</html>
`;

fs.writeFileSync(OUT, html, "utf8");
console.log("Built", OUT, "(" + html.length + " bytes)");
