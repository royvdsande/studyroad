/* global React, SUBJECTS, examTijd, fmtDatum, dagenTot, PERIODS */
const { useState } = React;

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 6.5" />
  </svg>
);

// ---- Progress ring (SVG, geen gradient) ----
function Ring({ pct, size = 58, stroke = 7, color = "var(--gold)", track = "rgba(250,247,241,0.18)", label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <div className="ring-wrap">
      <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.2,0.8,0.2,1)" }}
        />
        <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle"
          fill="currentColor" style={{ fontFamily: "var(--ff-display)", fontSize: size * 0.3, fontWeight: 700 }}>
          {Math.round(pct)}
        </text>
      </svg>
      {label}
    </div>
  );
}

// ---- urgentie-kleur voor dag-chip ----
function urgency(dagen) {
  if (dagen == null) return { bg: "var(--bg-2)", fg: "var(--ink-soft)" };
  if (dagen < 0) return { bg: "var(--bg-2)", fg: "var(--ink-faint)" };
  if (dagen <= 2) return { bg: "color-mix(in oklab, var(--tomato) 16%, var(--paper))", fg: "var(--tomato)" };
  if (dagen <= 6) return { bg: "color-mix(in oklab, var(--gold) 22%, var(--paper))", fg: "oklch(0.45 0.1 80)" };
  return { bg: "var(--bg-2)", fg: "var(--ink-soft)" };
}

// ---- Prognosebanner ----
const PROG_COPY = {
  veilig:  { label: "Staat al binnen", ctx: "kan niet meer lager — wat je ook haalt" },
  doel:    { label: "Minimaal nodig",  ctx: "om voldoende te blijven staan" },
  onzeker: { label: "Voorlopig",       ctx: "laagst mogelijke cijfer nu" },
};
function Prognose({ p }) {
  if (!p) return null;
  const c = PROG_COPY[p.type];
  return (
    <div className="prog" data-t={p.type}>
      <div className="prog-num">{p.waarde}</div>
      <div className="prog-body">
        <div className="pl">{p.label || c.label}</div>
        <div className="pt">
          {p.lijn ? p.lijn : <React.Fragment>{c.ctx}{p.weging ? <span className="pw"> · weegt {p.weging}×</span> : null}</React.Fragment>}
          {p.extra ? <span className="pe">{p.extra}</span> : null}
        </div>
      </div>
    </div>
  );
}

// ---- Vakkaart ----
function SubjectCard({ subj, done, notes, onToggle, onNote }) {
  const [openNote, setOpenNote] = useState(false);
  const t = examTijd(subj.periodes);
  const total = subj.onderwerpen.length;
  const checked = subj.onderwerpen.filter((_, i) => done[`${subj.id}::${i}`]).length;
  const pct = total ? (checked / total) * 100 : 0;
  const dagen = dagenTot(subj.datum);
  const u = urgency(dagen);
  const dCijfer = subj.datum ? new Date(subj.datum + "T00:00:00").getDate() : null;
  const dNaam = subj.datum ? fmtDatum(subj.datum).split(" ")[0] : null;

  return (
    <div className={"card" + (pct === 100 ? " done" : "")} style={{ "--c": subj.kleur }}>
      <div className="card-top">
        <div className="mono-badge">{subj.code}</div>
        <div className="card-head">
          <div className="card-name">{subj.naam}</div>
          <div className="card-meta">
            <span className="mono">{subj.duur || "—"}</span>
            {t && <span className="mono">{t.start}–{t.eind}</span>}
          </div>
        </div>
        {subj.datum ? (
          <div className="daychip" style={{ background: u.bg, color: u.fg }}>
            <small>{dNaam}</small>{dCijfer} jun
          </div>
        ) : (
          <div className="daychip" style={{ background: "var(--bg-2)", color: "var(--ink-soft)" }}>
            <small>datum</small>volgt
          </div>
        )}
      </div>

      <Prognose p={PROGNOSE[subj.id]} />

      <ul className="checklist">
        {subj.onderwerpen.map((o, i) => {
          const on = !!done[`${subj.id}::${i}`];
          return (
            <li key={i}>
              <button className="check" data-on={on} onClick={() => onToggle(subj.id, i)}>
                <span className="box"><Check /></span>
                <span className="check-label">{o}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {subj.notitie && (
        <div className="tip">
          <span style={{ fontSize: 14 }}>💡</span>
          <span>{subj.notitie}</span>
        </div>
      )}

      <div className="card-foot">
        <div className="foot-row">
          <span style={{ color: "var(--ink-soft)" }}>
            {checked} / {total} onderwerpen
          </span>
          <b style={{ color: pct === 100 ? subj.kleur : "var(--ink-soft)" }}>
            {pct === 100 ? "klaar!" : Math.round(pct) + "%"}
          </b>
        </div>
        <div className="bar"><i style={{ width: pct + "%" }} /></div>
        <button className="note-toggle" onClick={() => setOpenNote((v) => !v)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5h16M4 12h16M4 19h10" />
          </svg>
          {notes[subj.id] ? "Notitie bewerken" : "Notitie toevoegen"}
          {notes[subj.id] && <span style={{ width: 6, height: 6, borderRadius: "50%", background: subj.kleur }} />}
        </button>
        {openNote && (
          <div className="note-box">
            <textarea
              placeholder="Bijv. formules nog oefenen, samenvatting H10 maken…"
              value={notes[subj.id] || ""}
              onChange={(e) => onNote(subj.id, e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Ring, SubjectCard, urgency, Check, Prognose });
