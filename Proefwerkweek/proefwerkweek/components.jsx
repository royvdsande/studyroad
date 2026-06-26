/* global React, SUBJECTS, PROGNOSE, fmtDatum, dagenTot, popElement */
const { useState } = React;

// ---- Icons ----
const Ic = {
  check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12.5l4.5 4.5L19 6.5" /></svg>,
  cal:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></svg>,
  move:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12h13M12 5l7 7-7 7" /></svg>,
  alert: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2 18.5a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>,
  cloud: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 17H7a4 4 0 1 1 .9-7.9A5 5 0 0 1 18 10a3.5 3.5 0 0 1-.5 7Z" /><path d="m12 19-1.5 2.5M9 19l-1.5 2.5M15 19l-1.5 2.5" /></svg>,
  cross: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>,
  mic:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>,
  info:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>,
  note:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 6h16M4 12h16M4 18h10" /></svg>,
};

// ---- Status semantiek ----
const STATUS = {
  gemaakt:    { label: "Gemaakt" },
  gepland:    { label: "Gepland" },
  verplaatst: { label: "Verplaatst" },
  beslissen:  { label: "Te beslissen" },
  uitgesteld: { label: "Uitgesteld → V6" },
};

// effectieve status (besluit kan de planning overrulen)
//   open      -> inherente status (gepland / verplaatst / beslissen / gemaakt)
//   nu        -> toets wordt nu gemaakt (beslissen -> gepland, anders eigen status)
//   gemaakt   -> gemaakt
//   uitstellen-> uitgesteld naar V6
function effStatus(s, besluit) {
  if (besluit === "gemaakt") return "gemaakt";
  if (besluit === "uitstellen") return "uitgesteld";
  if (besluit === "nu") return s.status === "beslissen" ? "gepland" : s.status;
  return s.status;
}

function StatusBadge({ s }) {
  const m = STATUS[s] || STATUS.gepland;
  return (
    <span className="sbadge" data-s={s}><span className="pip" />{m.label}</span>
  );
}

// ---- Prognose ----
const PROG_BASE = {
  veilig:  { label: "Staat al binnen", ctx: "kan niet meer lager" },
  doel:    { label: "Minimaal nodig",  ctx: "om voldoende te blijven" },
  onzeker: { label: "Voorlopig",       ctx: "laagst mogelijke cijfer nu" },
};
function ProgMini({ p, detail }) {
  if (!p) return null;
  const b = PROG_BASE[p.type];
  return (
    <div className={"prog-mini" + (detail ? " detail" : "")} data-t={p.type}>
      <div className="pn">{p.waarde}</div>
      <div>
        <div className="pl">{p.label || b.label}</div>
        <div className="pt">{p.lijn || <React.Fragment>{b.ctx}{p.weging ? ` · weegt ${p.weging}×` : ""}</React.Fragment>}</div>
      </div>
    </div>
  );
}

// ---- Status-control (kies per toets: nu maken / gemaakt / uitstellen) ----
function StatusControl({ subj, besluit, onSet }) {
  const open = besluit === "open";
  const opts = [
    { v: "nu",         label: "Te maken",   sub: "in pwwk3" },
    { v: "gemaakt",    label: "Gemaakt",    sub: "afgerond" },
    { v: "uitstellen", label: "Uitstellen", sub: "naar V6" },
  ];
  return (
    <div className="statusctl" data-open={open}>
      <div className="sc-q">{open ? "Operatie-keuze · wat doe je met deze toets?" : "Status — pas aan wanneer je wilt"}</div>
      <div className="sc-seg">
        {opts.map((o) => (
          <button key={o.v} data-v={o.v} data-on={besluit === o.v} onClick={() => onSet(subj.id, o.v)}>
            <b>{o.label}</b><span>{o.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Statusbalk in de kaart ----
function CardStatus({ subj, eff }) {
  if (eff === "verplaatst") {
    return (
      <div className="card-status" data-s="verplaatst">
        {Ic.cloud()}<span>{subj.statusNote}</span>
      </div>
    );
  }
  if (eff === "beslissen") {
    return (
      <div className="card-status" data-s="beslissen">
        {Ic.alert()}<span>{subj.statusNote}</span>
      </div>
    );
  }
  if (eff === "uitgesteld") {
    return (
      <div className="card-status" data-s="beslissen" style={{ background: "color-mix(in oklab, var(--st-defer) 9%, var(--paper))", color: "color-mix(in oklab, var(--st-defer) 78%, var(--ink))" }}>
        {Ic.move()}<span>Je stelt deze toets uit tot het begin van V6. Je maakt hem dus niet in deze proefwerkweek.</span>
      </div>
    );
  }
  if (eff === "gemaakt") {
    return (
      <div className="card-status" data-s="gemaakt">
        {Ic.check({ style: { strokeWidth: 3 } })}<span>{subj.resultaat ? subj.resultaat + "." : "Je hebt deze toets als gemaakt gemarkeerd."}</span>
      </div>
    );
  }
  if (subj.statusNote) {
    return (
      <div className="card-status" data-s="gepland">
        {subj.type === "Mondeling" ? Ic.mic() : Ic.cal()}<span>{subj.statusNote}</span>
      </div>
    );
  }
  return null;
}

// ---- Studie-kaart ----
function SubjectCard({ subj, done, notes, besluit, onToggle, onNote, onDecide }) {
  const [openNote, setOpenNote] = useState(false);
  const eff = effStatus(subj, besluit);
  const total = subj.onderwerpen.length;
  const checked = subj.onderwerpen.filter((_, i) => done[`${subj.id}::${i}`]).length;
  const pct = total ? (checked / total) * 100 : 0;
  const tijdShow = subj.tijd && /^\d/.test(subj.tijd) ? subj.tijd : (subj.tijd || "tijd volgt");
  const isComplete = pct === 100 && eff !== "uitgesteld";

  return (
    <div className={"card" + (eff === "gemaakt" || eff === "uitgesteld" ? " is-done" : "") + (isComplete ? " is-complete" : "")} style={{ "--c": subj.kleur }}>
      <div className="card-top">
        <div className="card-badge">{subj.code}</div>
        <div className="card-head">
          <div className="card-name">{subj.naam}</div>
          <div className="card-meta">
            {subj.datum ? <span>{fmtDatum(subj.datum)}</span> : <span style={{ color: "var(--st-decide)" }}>datum onzeker</span>}
            <span className="mono">{tijdShow}</span>
            <span className="mono">{subj.duur}</span>
            {subj.origineel && <span className="strike mono">was {fmtDatum(subj.origineel.datum)}</span>}
          </div>
        </div>
        <StatusBadge s={eff} />
      </div>

      <CardStatus subj={subj} eff={eff} />
      <StatusControl subj={subj} besluit={besluit} onSet={onDecide} />

      <ProgMini p={PROGNOSE[subj.id]} />

      <ul className="checklist">
        {subj.onderwerpen.map((o, i) => {
          const on = !!done[`${subj.id}::${i}`];
          return (
            <li key={i}>
              <button className="check" data-on={on} onClick={(e) => { popElement(e.currentTarget.querySelector(".box")); onToggle(subj.id, i, e); }}>
                <span className="box">{Ic.check({ stroke: "#fff" })}</span>
                <span className="check-label">{o}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {subj.notitie && <div className="tip">{Ic.info()}<span>{subj.notitie}</span></div>}

      <div className="card-foot">
        {isComplete && <div className="complete-banner">✓ Alle stof afgevinkt</div>}
        <div className="foot-row">
          <span style={{ color: "var(--ink-soft)" }}>{checked} / {total} onderwerpen geleerd</span>
          <b style={{ color: pct === 100 ? subj.kleur : "var(--ink-soft)" }}>{pct === 100 ? "klaar!" : Math.round(pct) + "%"}</b>
        </div>
        <div className="bar"><i style={{ width: pct + "%" }} /></div>
        <button className="note-toggle" onClick={() => setOpenNote((v) => !v)}>
          {Ic.note()}{notes[subj.id] ? "Notitie bewerken" : "Notitie toevoegen"}
          {notes[subj.id] && <span style={{ width: 6, height: 6, borderRadius: "50%", background: subj.kleur }} />}
        </button>
        {openNote && (
          <div className="note-box">
            <textarea placeholder="Bijv. formules nog oefenen, samenvatting H10 maken…" value={notes[subj.id] || ""} onChange={(e) => onNote(subj.id, e.target.value)} />
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Ic, STATUS, effStatus, StatusBadge, ProgMini, StatusControl, CardStatus, SubjectCard });
