/* global React, GRADES, GRADES_META */
const { useState, useMemo } = React;

function gnum(str) {
  const n = parseFloat(String(str).replace(",", "."));
  return isNaN(n) ? null : n;
}
function fmtNL(n, d = 1) {
  if (n == null) return "—";
  return n.toFixed(d).replace(".", ",");
}
function fmtDatumKort(iso) {
  if (!iso) return "—";
  const M = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${M[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

const SOORT_LABEL = { SE: "Schoolexamen", PO: "Praktische opdracht", HD: "Handelingsdeel" };

const NAAM2KEY = {
  "Bedrijfseconomie": "beco", "Biologie": "biologie", "Engels": "engels",
  "Frans": "frans", "Natuurkunde": "natuurkunde", "Nederlands": "nederlands",
  "Scheikunde": "scheikunde", "Wiskunde B": "wiskundeb", "Levensbeschouwing": "levensbeschouwing",
};

function progTag(p) {
  if (!p) return null;
  if (p.type === "veilig") return `✓ ${p.waarde} vast`;
  if (p.type === "doel") return `doel ${p.waarde}`;
  return `± ${p.waarde}`;
}
function ProgDetail({ p }) {
  if (!p) return null;
  const base = {
    veilig: ["Staat al binnen", `Kan niet meer lager dan een ${p.waarde} worden — wat je op pwwk3 ook haalt.`],
    doel: ["Minimaal nodig op pwwk3", `Een ${p.waarde} om voldoende te staan · weegt ${p.weging}×.`],
    onzeker: ["Voorlopig", `Laagst mogelijke nu een ${p.waarde} · weegt ${p.weging}×.`],
  }[p.type];
  return (
    <div className="prog prog--detail" data-t={p.type}>
      <div className="prog-num">{p.waarde}</div>
      <div className="prog-body">
        <div className="pl">{p.label || base[0]}</div>
        <div className="pt">{p.lijn || base[1]}{p.extra ? <span className="pe">{p.extra}</span> : null}</div>
      </div>
    </div>
  );
}

function prettyKop(kop, i) {
  if (!kop) return `Toets ${i + 1}`;
  const m = String(kop).match(/^(\d+)\s*-\s*v5(\d)$/i);
  if (m) return `Toets ${m[1]} · periode ${m[2]}`;
  return kop;
}

function GradeRow({ vak }) {
  const [open, setOpen] = useState(false);
  const gem = gnum(vak.gemiddelde);
  const numeriek = vak.toetsen.filter((t) => t.n != null);
  const isHD = vak.toetsen.length > 0 && numeriek.length === 0; // bv. LO
  const klasse = gem == null ? "none" : gem >= 5.5 ? "pass" : "fail";
  const prog = PROGNOSE[NAAM2KEY[vak.naam]];

  return (
    <div className="gr-card" data-open={open} style={{ "--c": vak.kleur }}>
      <button className="gr-main" onClick={() => setOpen((v) => !v)}>
        <span className="gr-badge">{vak.code}</span>
        <span className="gr-name">
          {vak.naam}
          {prog && <span className={"gr-tag t-" + prog.type}>{progTag(prog)}</span>}
          {vak.volledig !== vak.naam && <span className="full">{vak.volledig}</span>}
        </span>
        <span className="gr-chips">
          {numeriek.length > 0 ? (
            numeriek.map((t, i) => (
              <span className="gchip" key={i} data-fail={t.n < 5.5}>
                <b>{t.cijfer}</b><small>{t.soort}</small>
              </span>
            ))
          ) : (
            <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              {isHD ? `${vak.toetsen.length}× afgerond · handelingsdeel` : "—"}
            </span>
          )}
        </span>
        <span className="gr-avg">
          {gem == null ? (
            <span className="avg-num none">{isHD ? "voldaan" : "—"}</span>
          ) : (
            <span className={"avg-num " + klasse}>{vak.gemiddelde}</span>
          )}
          <svg className="gr-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </span>
      </button>

      {open && (
        <div className="gr-detail">
          <ProgDetail p={prog} />
          {gem != null && (
            <div className="barline">
              <span className="lab">1</span>
              <span className="track">
                <i style={{ width: (gem / 10) * 100 + "%", background: klasse === "pass" ? "var(--pass)" : "var(--fail)" }} />
                <span className="thr" style={{ left: "55%" }} title="voldoende vanaf 5,5" />
              </span>
              <span className="lab">10</span>
            </div>
          )}
          {vak.toetsen.length > 0 && (
            <table className="gr-table">
              <thead>
                <tr><th>Toets</th><th>Type</th><th>Weging</th><th>Datum</th><th style={{ textAlign: "right" }}>Cijfer</th></tr>
              </thead>
              <tbody>
                {vak.toetsen.map((t, i) => (
                  <tr key={i}>
                    <td>{prettyKop(t.kop, i)}</td>
                    <td><span className="typ">{SOORT_LABEL[t.soort] || t.soort}</span></td>
                    <td>{t.w ? `${t.w}×` : "—"}</td>
                    <td style={{ color: "var(--ink-soft)" }}>{fmtDatumKort(t.datum)}</td>
                    <td className="c" style={{ textAlign: "right", color: t.n != null && t.n < 5.5 ? "var(--fail)" : t.n != null && t.n >= 5.5 ? "var(--pass)" : "var(--ink-soft)" }}>{t.cijfer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {vak.portfolioNote && <div className="note-frans">📁 {vak.portfolioNote}</div>}
          {gem != null && (
            <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 10 }}>
              SE-gemiddelde = gewogen gemiddelde van bovenstaande cijfers.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Cijfers() {
  const [sort, setSort] = useState("vak");

  const cijferVakken = GRADES.filter((v) => gnum(v.gemiddelde) != null);
  const gems = cijferVakken.map((v) => gnum(v.gemiddelde));
  const overall = gems.reduce((a, b) => a + b, 0) / gems.length;
  const voldoende = cijferVakken.filter((v) => gnum(v.gemiddelde) >= 5.5).length;
  const onvold = cijferVakken.filter((v) => gnum(v.gemiddelde) < 5.5);
  const hoogste = cijferVakken.reduce((a, b) => (gnum(b.gemiddelde) > gnum(a.gemiddelde) ? b : a));
  const laagste = cijferVakken.reduce((a, b) => (gnum(b.gemiddelde) < gnum(a.gemiddelde) ? b : a));

  const sorted = useMemo(() => {
    const arr = [...GRADES];
    if (sort === "hoog") arr.sort((a, b) => (gnum(b.gemiddelde) ?? -1) - (gnum(a.gemiddelde) ?? -1));
    if (sort === "laag") arr.sort((a, b) => (gnum(a.gemiddelde) ?? 99) - (gnum(b.gemiddelde) ?? 99));
    return arr;
  }, [sort]);

  return (
    <section>
      <div className="stats">
        <div className="stat hero-stat">
          <div className="k">Gemiddelde SE-cijfer</div>
          <div className="v">{fmtNL(overall)}</div>
          <div className="sub">over {cijferVakken.length} vakken met een cijfer</div>
        </div>
        <div className="stat">
          <div className="k">Vakken voldoende</div>
          <div className="v" style={{ color: "var(--pass)" }}>{voldoende}<span style={{ fontSize: 20, color: "var(--ink-faint)" }}>/{cijferVakken.length}</span></div>
          <div className="sub">{onvold.length === 0 ? "alles boven de 5,5" : onvold.map((v) => v.naam).join(", ") + " onder de 5,5"}</div>
        </div>
        <div className="stat">
          <div className="k">Sterkste vak</div>
          <div className="v" style={{ color: hoogste.kleur }}>{hoogste.gemiddelde}</div>
          <div className="sub">{hoogste.naam}</div>
        </div>
        <div className="stat">
          <div className="k">Meeste aandacht</div>
          <div className="v" style={{ color: laagste.kleur }}>{laagste.gemiddelde}</div>
          <div className="sub">{laagste.naam}</div>
        </div>
      </div>

      <div className="sec-head">
        <h2>Cijfers per vak</h2>
        <div className="hr" />
        <div className="gr-sort">
          <button data-on={sort === "vak"} onClick={() => setSort("vak")}>Op vak</button>
          <button data-on={sort === "hoog"} onClick={() => setSort("hoog")}>Hoog → laag</button>
          <button data-on={sort === "laag"} onClick={() => setSort("laag")}>Laag → hoog</button>
        </div>
      </div>

      <div className="gr-list">
        {sorted.map((v) => <GradeRow key={v.naam} vak={v} />)}
      </div>

      <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 18, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>SE = schoolexamen · PO = praktische opdracht · HD = handelingsdeel</span>
        <span>· Klas {GRADES_META.klas} · bijgewerkt {fmtDatumKort(GRADES_META.peildatum)}</span>
      </div>
    </section>
  );
}

Object.assign(window, { Cijfers });
