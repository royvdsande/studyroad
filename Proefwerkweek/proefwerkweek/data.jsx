/* global window */
// =================================================================
//  DATA — Proefwerkweek 3 (V5) · V6 vooruitblik · prognoses
// =================================================================

// Lesuren (begin/eind) volgens het pwwk-rooster
const PERIODS = {
  1: ["8:30", "9:20"],
  2: ["9:40", "10:30"],
  3: ["10:50", "11:40"],
  4: ["12:00", "12:50"],
  5: ["13:10", "14:00"],
  6: ["14:20", "15:10"],
};

// Subject-kleuren — oklch, gelijke lichtheid/chroma, alleen de tint verschilt.
const KLEUR = {
  frans:       "oklch(0.64 0.15 35)",
  natuurkunde: "oklch(0.64 0.15 195)",
  beco:        "oklch(0.66 0.13 80)",
  engels:      "oklch(0.6 0.15 5)",
  scheikunde:  "oklch(0.62 0.14 150)",
  wiskundeb:   "oklch(0.58 0.15 255)",
  biologie:    "oklch(0.64 0.15 130)",
  nederlands:  "oklch(0.58 0.15 305)",
};

// -----------------------------------------------------------------
//  PROEFWERKWEEK 3 — di 23 jun t/m (uitloop) wo 1 jul 2026
//  status:  gemaakt | gepland | verplaatst | beslissen
//  besluit (operatie-privilege): nu | uitstellen   (default per vak)
// -----------------------------------------------------------------
const SUBJECTS = [
  {
    id: "frans", naam: "Frans", code: "FA", kleur: KLEUR.frans,
    status: "gemaakt", besluit: "gemaakt",
    datum: "2026-06-24", tijd: "10:50–12:50", duur: "100 min", type: "Schriftelijk",
    resultaat: "Gemaakt — ging goed",
    onderwerpen: ["Vocabulaire NF — H4 en H5", "Examenidioom FN", "Leesvaardigheid"],
  },
  {
    id: "natuurkunde", naam: "Natuurkunde", code: "NA", kleur: KLEUR.natuurkunde,
    status: "beslissen", besluit: "open",
    datum: null, tijd: null, duur: "50 min", type: "Schriftelijk",
    origineel: { datum: "2026-06-25", tijd: "10:50–11:40" },
    statusNote: "Gemist door operatie. Vermoedelijk verplaatst naar do 2 of vr 3 jul — kom je opdagen of stel je uit tot V6?",
    onderwerpen: ["H11 Medische beeldvorming", "Keuzeonderwerp — relativiteit"],
  },
  {
    id: "beco", naam: "Bedrijfseconomie", code: "BE", kleur: KLEUR.beco,
    status: "beslissen", besluit: "open",
    datum: null, tijd: null, duur: "100 min", type: "Schriftelijk",
    origineel: { datum: "2026-06-25", tijd: "12:00–14:00" },
    statusNote: "Gemist door operatie. Vermoedelijk verplaatst naar do 2 of vr 3 jul — kom je opdagen of stel je uit tot V6?",
    onderwerpen: ["§4.4 Kostprijs", "§4.5 Break-even analyse", "§2.1 Marktonderzoek", "§2.2 Marketingplan"],
  },
  {
    id: "engels", naam: "Engels", code: "EN", kleur: KLEUR.engels,
    status: "verplaatst", besluit: "nu",
    datum: "2026-07-01", tijd: "tijd volgt", duur: "100 min", type: "Schriftelijk",
    origineel: { datum: "2026-06-26", tijd: "10:50–12:50" },
    statusNote: "Verplaatst door het extreme weer: van vr 26 jun naar wo 1 jul.",
    notitie: "Eigen EN-NE woordenboek of combiboek toegestaan.",
    onderwerpen: ["Leesvaardigheid"],
  },
  {
    id: "scheikunde", naam: "Scheikunde", code: "SK", kleur: KLEUR.scheikunde,
    status: "verplaatst", besluit: "nu",
    datum: "2026-07-01", tijd: "tijd volgt", duur: "100 min", type: "Schriftelijk",
    origineel: { datum: "2026-06-26", tijd: "13:10–15:10" },
    statusNote: "Verplaatst door het extreme weer: van vr 26 jun naar wo 1 jul.",
    onderwerpen: ["H8 Ruimtelijke bouw van moleculen", "H10 Organische chemie", "H11 Reactiemechanismen"],
  },
  {
    id: "wiskundeb", naam: "Wiskunde B", code: "WB", kleur: KLEUR.wiskundeb,
    status: "gepland", besluit: "nu",
    datum: "2026-06-29", tijd: "8:30–10:30", duur: "100 min", type: "Schriftelijk",
    onderwerpen: ["H11 Integraalrekening", "H12 Goniometrische formules", "HK Voortgezette integraalrekening"],
  },
  {
    id: "nederlands", naam: "Nederlands", code: "NE", kleur: KLEUR.nederlands,
    status: "gepland", besluit: "nu",
    datum: "2026-06-29", tijd: "11:00–11:30", duur: "30 min", type: "Mondeling",
    statusNote: "Mondeling ingepland: maandag 29 juni, 11:00 uur.",
    onderwerpen: ["Poëzie", "Gelezen & behandelde literatuur", "Literatuurdossier voorbereiden"],
    notitie: "Gesprek van 30 min over poëzie en de literatuur van dit schooljaar. Romans mogen mee, zonder aantekeningen.",
  },
  {
    id: "biologie", naam: "Biologie", code: "BI", kleur: KLEUR.biologie,
    status: "gepland", besluit: "nu",
    datum: "2026-06-30", tijd: "10:50–11:40", duur: "50 min", type: "Schriftelijk",
    onderwerpen: ["H14 Zenuwstelsel", "H15 Waarnemen", "H16 Afweer"],
  },
];

// -----------------------------------------------------------------
//  V6 — VOLGEND JAAR  (uit het PTA VWO 6, alleen jouw examenvakken)
//  moment: per1 | pwwk1 | per2 | pwwk2   ·   wf = officiële weegfactor
// -----------------------------------------------------------------
const MOMENT_META = {
  per1:  { label: "Periode 1", kort: "Per 1", order: 1, seizoen: "najaar" },
  pwwk1: { label: "Proefwerkweek 1", kort: "Pwwk 1", order: 2, seizoen: "najaar" },
  per2:  { label: "Periode 2", kort: "Per 2", order: 3, seizoen: "winter" },
  pwwk2: { label: "Proefwerkweek 2", kort: "Pwwk 2", order: 4, seizoen: "voorjaar" },
};

const V6 = [
  { id: "natuurkunde", naam: "Natuurkunde", code: "NA", kleur: KLEUR.natuurkunde, toetsen: [
    { ond: "6-v61", moment: "pwwk1", wf: 35, soort: "Schriftelijk", duur: "100 min", herkansbaar: true,
      stof: "H1 Basisvaardigheden · H2 Beweging · H3 Krachten · H5 Elektrische systemen · H7 Cirkelbewegingen · H8 Arbeid en energie · H10 Elektromagnetisme · stencil horizontale worp" },
    { ond: "7-v62", moment: "per2", wf: 0, soort: "Handelingsdeel", duur: "—", herkansbaar: false,
      stof: "Praktische vaardigheden: proef/opdracht uitvoeren en vragen beantwoorden." },
    { ond: "8-v62", moment: "pwwk2", wf: 35, soort: "Schriftelijk", duur: "100 min", herkansbaar: true,
      stof: "H4 Stoffen en materialen · H9 Trillingen en golven · H11 Medische beeldvorming · H12 Astrofysica · H13 Quantumwereld · keuzeonderwerp 1 · stencil materialen" },
  ]},
  { id: "scheikunde", naam: "Scheikunde", code: "SK", kleur: KLEUR.scheikunde, toetsen: [
    { ond: "5-v61", moment: "pwwk1", wf: 28, soort: "Schriftelijk", duur: "100 min", herkansbaar: true,
      stof: "Nova H1, H4, H5, H6, H7, H9, H13, H15" },
    { ond: "6-v62", moment: "per2", wf: 14, soort: "Praktische opdracht", duur: "—", herkansbaar: false,
      stof: "PO Nova H1, H4, H7, H9, H13 — practicum in activiteitendagen na pwwk1" },
    { ond: "7-v62", moment: "pwwk2", wf: 28, soort: "Schriftelijk", duur: "100 min", herkansbaar: true,
      stof: "Nova H1, H2, H3, H8, H10, H11, H12, H14" },
  ]},
  { id: "biologie", naam: "Biologie", code: "BI", kleur: KLEUR.biologie, toetsen: [
    { ond: "5-v61", moment: "pwwk1", wf: 35, soort: "Schriftelijk", duur: "100 min", herkansbaar: true,
      stof: "H17 DNA · H18 Eiwit + herhaling H1–H4, H13–H16" },
    { ond: "6-v62", moment: "pwwk2", wf: 35, soort: "Schriftelijk", duur: "100 min", herkansbaar: true,
      stof: "H19 Sport · H20 Planten + herhaling H5–H12" },
  ]},
  { id: "wiskundeb", naam: "Wiskunde B", code: "WB", kleur: KLEUR.wiskundeb, toetsen: [
    { ond: "5-v61", moment: "pwwk1", wf: 30, soort: "Schriftelijk", duur: "150 min", herkansbaar: true,
      stof: "Getal en Ruimte VWO B: H1 t/m H14 en H16" },
    { ond: "6-v62", moment: "pwwk2", wf: 35, soort: "Schriftelijk", duur: "150 min", herkansbaar: true,
      stof: "Getal en Ruimte VWO B: H1 t/m H16" },
  ]},
  { id: "beco", naam: "Bedrijfseconomie", code: "BE", kleur: KLEUR.beco, toetsen: [
    { ond: "5-v61", moment: "per1", wf: 10, soort: "Schriftelijk", duur: "40 min", herkansbaar: false,
      stof: "De BV (break-evenanalyse) · De NV (eigen vermogen, jaarrekening en kengetallen)" },
    { ond: "6-v61", moment: "pwwk1", wf: 30, soort: "Schriftelijk", duur: "100 min", herkansbaar: true,
      stof: "De NV (kengetallen) · de BV (kostprijs) · de eenmanszaak" },
    { ond: "7-v62", moment: "pwwk2", wf: 30, soort: "Schriftelijk", duur: "100 min", herkansbaar: true,
      stof: "De NV (jaarrekening, opties) · De BV (kostprijs, personeel) · Geldzaken (krediet, hypotheken, sparen en beleggen)" },
  ]},
  { id: "engels", naam: "Engels", code: "EN", kleur: KLEUR.engels, toetsen: [
    { ond: "5-v61", moment: "pwwk1", wf: 20, soort: "Schriftelijk", duur: "50 min", herkansbaar: false,
      stof: "Literatuurgeschiedenis (E2 en E3)" },
    { ond: "6-v62", moment: "per2", wf: 25, soort: "Luistervaardigheid", duur: "60 min", herkansbaar: false,
      stof: "Cito Kijk- en Luistertoets" },
    { ond: "7-v62", moment: "pwwk2", wf: 25, soort: "Schriftelijk", duur: "100 min", herkansbaar: true,
      stof: "Schrijfvaardigheid — een formele brief schrijven" },
  ]},
  { id: "frans", naam: "Frans", code: "FA", kleur: KLEUR.frans, toetsen: [
    { ond: "5-v61", moment: "pwwk1", wf: 25, soort: "Schriftelijk", duur: "100 min", herkansbaar: true,
      stof: "Schrijfvaardigheid — (in)formele brief, gebaseerd op het schrijfportfolio V5 + schrijfopdrachten V6" },
    { ond: "6-v62", moment: "per2", wf: 20, soort: "Luistervaardigheid", duur: "60 min", herkansbaar: false,
      stof: "Cito Kijk- en Luistervaardigheid" },
    { ond: "7-v62", moment: "per2", wf: 0, soort: "Handelingsdeel", duur: "40 min", herkansbaar: false,
      stof: "Examenvocabulaire" },
    { ond: "8-v62", moment: "pwwk2", wf: 25, soort: "Mondeling", duur: "30 min", herkansbaar: false,
      stof: "Spreek- en uitspraaktoets: gesprek, tekst voorlezen en eigen onderwerp" },
  ]},
  { id: "nederlands", naam: "Nederlands", code: "NE", kleur: KLEUR.nederlands, toetsen: [
    { ond: "5-v61", moment: "pwwk1", wf: 10, soort: "Computer", duur: "100 min", herkansbaar: true,
      stof: "Een zakelijke tekst redigeren: fouten in spelling, stijl en formulering verbeteren" },
    { ond: "6-v62", moment: "per2", wf: 20, soort: "Mondeling (PO)", duur: "10 min", herkansbaar: false,
      stof: "Spreekbeurtproject — onderzoek naar kenmerken van een goede presentatie + individuele presentatie" },
    { ond: "7-v62", moment: "pwwk2", wf: 30, soort: "Computer", duur: "150 min", herkansbaar: true,
      stof: "Essayproject — persoonlijk onderzoek o.b.v. bronnen en drie zelfgekozen romans" },
  ]},
];

// -----------------------------------------------------------------
//  EINDEXAMENS — CENTRAAL EXAMEN (V6, 2027)
//  Eerste tijdvak: vr 14 mei – di 1 jun 2027 · herkansing (2e tijdvak): 22–29 jun 2027
//  Per-vak data volgen in het definitieve rooster; duur is het vaste CE-format.
// -----------------------------------------------------------------
const CE_VENSTER = {
  eerste: "vr 14 mei – di 1 jun 2027", tweede: "di 22 – di 29 jun 2027",
  eersteIso: "2027-05-14", tweedeIso: "2027-06-22",
};
const EINDEXAMENS = [
  { id: "nederlands",  naam: "Nederlands",       code: "NE", kleur: KLEUR.nederlands,  duur: "3 uur" },
  { id: "natuurkunde", naam: "Natuurkunde",      code: "NA", kleur: KLEUR.natuurkunde, duur: "3 uur" },
  { id: "wiskundeb",   naam: "Wiskunde B",        code: "WB", kleur: KLEUR.wiskundeb,   duur: "3 uur" },
  { id: "scheikunde",  naam: "Scheikunde",        code: "SK", kleur: KLEUR.scheikunde,  duur: "3 uur" },
  { id: "biologie",    naam: "Biologie",          code: "BI", kleur: KLEUR.biologie,    duur: "3 uur" },
  { id: "beco",        naam: "Bedrijfseconomie",  code: "BE", kleur: KLEUR.beco,        duur: "3 uur" },
  { id: "engels",      naam: "Engels",            code: "EN", kleur: KLEUR.engels,      duur: "2,5 uur" },
  { id: "frans",       naam: "Frans",             code: "FA", kleur: KLEUR.frans,       duur: "2,5 uur" },
];

// -----------------------------------------------------------------
//  PROGNOSE per vak (peildatum pwwk3)
//  type:  veilig = staat vast · doel = minimaal nodig · onzeker = laagst mogelijk
// -----------------------------------------------------------------
const PROGNOSE = {
  beco:        { type: "veilig",  waarde: "6,73", weging: 8 },
  biologie:    { type: "doel",    waarde: "6,2",  weging: 9 },
  engels:      { type: "onzeker", waarde: "5,52", weging: 3,
                 label: "Slechtste geval",
                 lijn: "Zelfs een 1 op deze toets (×3) levert nog een 5,52 op." },
  frans:       { type: "veilig",  waarde: "5,9",  weging: 10,
                 label: "Toets gemaakt",
                 lijn: "Frans-toets is al gemaakt en ging goed; het literatuurdossier (5,9) staat ook binnen." },
  natuurkunde: { type: "veilig",  waarde: "5,60", weging: 8 },
  nederlands:  { type: "doel",    waarde: "4,5",  weging: 15 },
  scheikunde:  { type: "veilig",  waarde: "5,83", weging: 10 },
  wiskundeb:   { type: "veilig",  waarde: "6,40", weging: 8 },
};

// -----------------------------------------------------------------
//  Helpers
// -----------------------------------------------------------------
const DAGEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const DAGEN_LANG = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function fmtDatum(iso, lang) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  const dag = lang === "lang" ? DAGEN_LANG[d.getDay()] : DAGEN[d.getDay()];
  return `${dag} ${d.getDate()} ${MAANDEN[d.getMonth()]}`;
}

function dagenTot(iso) {
  if (!iso) return null;
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(iso + "T00:00:00");
  return Math.round((d - a) / 864e5);
}

// effectieve datum+tijd voor sortering (beslissen = null → achteraan)
function sortKey(s) {
  if (!s.datum) return Infinity;
  const t = (s.tijd && /^\d/.test(s.tijd)) ? s.tijd.split("–")[0] : "08:30";
  const [h, m] = t.split(":").map(Number);
  const d = new Date(s.datum + "T00:00:00");
  d.setHours(h || 0, m || 0);
  return d.getTime();
}

Object.assign(window, {
  PERIODS, KLEUR, SUBJECTS, V6, MOMENT_META, PROGNOSE, EINDEXAMENS, CE_VENSTER,
  DAGEN, DAGEN_LANG, MAANDEN, fmtDatum, dagenTot, sortKey,
});
