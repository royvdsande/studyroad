/* global window */
// ============ ROOSTER & STOF — Proefwerkweek 3 ============
// Lesuren (begin/eind) volgens het pwwk-rooster
const PERIODS = {
  1: ["8:30", "9:20"],
  2: ["9:40", "10:30"],
  3: ["10:50", "11:40"],
  4: ["12:00", "12:50"],
  5: ["13:10", "14:00"],
  6: ["14:20", "15:10"],
};

// Examenweek loopt di 23 juni t/m di 30 juni 2026
const PWWK_START = new Date("2026-06-23T08:30:00");

// Vakken: stof uit het toetsoverzicht, gekoppeld aan het rooster (datum + lesuren).
// kleur via oklch — zelfde lichtheid/chroma, alleen de tint verschilt (harmonisch, plat, geen gradient).
const SUBJECTS = [
  {
    id: "frans",
    naam: "Frans",
    code: "FA",
    kleur: "oklch(0.64 0.15 35)",
    datum: "2026-06-24",
    periodes: [3, 4],
    duur: "100 min",
    type: "Schriftelijk",
    onderwerpen: [
      "Vocabulaire NF — H4 en H5",
      "Examenidioom FN",
      "Leesvaardigheid",
    ],
  },
  {
    id: "natuurkunde",
    naam: "Natuurkunde",
    code: "NA",
    kleur: "oklch(0.64 0.15 185)",
    datum: "2026-06-25",
    periodes: [3],
    duur: "50 min",
    type: "Schriftelijk",
    onderwerpen: [
      "H11 Medische beeldvorming",
      "Keuzeonderwerp — relativiteit",
    ],
  },
  {
    id: "beco",
    naam: "Bedrijfseconomie",
    code: "BE",
    kleur: "oklch(0.7 0.14 80)",
    datum: "2026-06-25",
    periodes: [4, 5],
    duur: "100 min",
    type: "Schriftelijk",
    onderwerpen: [
      "§4.4 Kostprijs",
      "§4.5 Break-even analyse",
      "§2.1 Marktonderzoek",
      "§2.2 Marketingplan",
    ],
  },
  {
    id: "engels",
    naam: "Engels",
    code: "EN",
    kleur: "oklch(0.62 0.15 5)",
    datum: "2026-06-26",
    periodes: [3, 4],
    duur: "100 min",
    type: "Schriftelijk",
    onderwerpen: ["Leesvaardigheid"],
    notitie: "Eigen EN-NE woordenboek of combiboek toegestaan.",
  },
  {
    id: "scheikunde",
    naam: "Scheikunde",
    code: "SK",
    kleur: "oklch(0.64 0.15 150)",
    datum: "2026-06-26",
    periodes: [5, 6],
    duur: "100 min",
    type: "Schriftelijk",
    onderwerpen: [
      "H8 Ruimtelijke bouw van moleculen",
      "H10 Organische chemie",
      "H11 Reactiemechanismen",
    ],
  },
  {
    id: "wiskundeb",
    naam: "Wiskunde B",
    code: "WB",
    kleur: "oklch(0.6 0.15 255)",
    datum: "2026-06-29",
    periodes: [1, 2],
    duur: "100 min",
    type: "Schriftelijk",
    onderwerpen: [
      "H11 Integraalrekening",
      "H12 Goniometrische formules",
      "HK Voortgezette integraalrekening",
    ],
  },
  {
    id: "biologie",
    naam: "Biologie",
    code: "BI",
    kleur: "oklch(0.66 0.15 130)",
    datum: "2026-06-30",
    periodes: [3],
    duur: "50 min",
    type: "Schriftelijk",
    onderwerpen: ["H14 Zenuwstelsel", "H15 Waarnemen", "H16 Afweer"],
  },
  {
    id: "nederlands",
    naam: "Nederlands",
    code: "NE",
    kleur: "oklch(0.6 0.15 305)",
    datum: null,
    periodes: [],
    duur: "30 min",
    type: "Mondeling",
    onderwerpen: [
      "Poëzie",
      "Gelezen & behandelde literatuur",
      "Literatuurdossier voorbereiden",
    ],
    notitie:
      "Mondeling gesprek van 30 minuten over poëzie en de literatuur van dit schooljaar. Datum wordt individueel ingepland.",
  },
];

// Toetsen in de lesperiode vóór pwwk3
const PERIODE3 = [
  {
    id: "engels-lit",
    naam: "Engels — Literatuurgeschiedenis",
    code: "EN",
    kleur: "oklch(0.62 0.15 5)",
    wanneer: "Week 23",
    duur: "40 min",
    weging: "weegt 5%",
    type: "Schriftelijk",
    onderwerpen: ["Literatuurgeschiedenis"],
  },
  {
    id: "frans-portfolio",
    naam: "Frans — Portfolio",
    code: "FA",
    kleur: "oklch(0.64 0.15 35)",
    wanneer: "Periode 3",
    duur: null,
    weging: "Praktische opdracht",
    type: "Portfolio",
    onderwerpen: ["Schrijfopdrachten", "Literatuuropdrachten"],
  },
];

const DAGEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MAANDEN = [
  "jan", "feb", "mrt", "apr", "mei", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

function examTijd(periodes) {
  if (!periodes || periodes.length === 0) return null;
  const start = PERIODS[periodes[0]][0];
  const eind = PERIODS[periodes[periodes.length - 1]][1];
  return { start, eind, uren: periodes };
}

function fmtDatum(iso, lang) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (lang === "lang") {
    const dag = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"][d.getDay()];
    return `${dag} ${d.getDate()} ${MAANDEN[d.getMonth()]}`;
  }
  return `${DAGEN[d.getDay()]} ${d.getDate()} ${MAANDEN[d.getMonth()]}`;
}

function dagenTot(iso) {
  if (!iso) return null;
  const now = new Date();
  const d = new Date(iso + "T08:30:00");
  const ms = d - now;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// ---- Eerste toets: vroegste examen-datum/tijd uit het rooster ----
function firstExam() {
  let best = null;
  for (const s of SUBJECTS) {
    if (!s.datum || !s.periodes.length) continue;
    const [h, m] = PERIODS[s.periodes[0]][0].split(":").map(Number);
    const d = new Date(s.datum + "T00:00:00");
    d.setHours(h, m, 0, 0);
    if (!best || d < best.date) best = { date: d, subj: s };
  }
  return best;
}
const PWWK_FIRST = firstExam();

// ---- Cijferprognose per vak ----
// type "veilig"  = staat al vast, kan niet lager (waarde = gegarandeerd eindcijfer)
// type "doel"    = minimaal te halen op de toets om voldoende te blijven/worden
// type "onzeker" = laagst mogelijke nu, maar een cijfer ontbreekt nog
const PROGNOSE = {
  beco:        { type: "veilig",  waarde: "6,73", weging: 8 },
  biologie:    { type: "doel",    waarde: "6,2",  weging: 9 },
  engels:      { type: "onzeker", waarde: "5,52", weging: 3,
                 label: "Slechtste geval",
                 lijn: "Zelfs een 1 op de laatste toets (×3) levert nog een 5,52 op.",
                 extra: "Het literatuurcijfer (×5) moet nog komen en kan dit veranderen." },
  frans:       { type: "doel",    waarde: "4,5",  weging: 10, extra: "Plus nog een cijfer voor het literatuurportfolio (×5)." },
  natuurkunde: { type: "veilig",  waarde: "5,60", weging: 8 },
  nederlands:  { type: "doel",    waarde: "4,5",  weging: 15 },
  scheikunde:  { type: "veilig",  waarde: "5,83", weging: 10 },
  wiskundeb:   { type: "veilig",  waarde: "6,40", weging: 8 },
  levensbeschouwing: { type: "doel", waarde: "1,6", weging: 20 },
};

Object.assign(window, {
  PERIODS, PWWK_START, PWWK_FIRST, SUBJECTS, PERIODE3, DAGEN, MAANDEN, PROGNOSE,
  examTijd, fmtDatum, dagenTot,
});
