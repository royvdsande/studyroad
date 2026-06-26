/* global React, ReactDOM, SUBJECTS, PROGNOSE, fmtDatum, dagenTot, sortKey,
   Ic, effStatus, StatusBadge, SubjectCard, CijfersView, V6View, AnimatedNumber, Confetti */
const { useState, useEffect, useRef, useMemo } = React;

const LS = { done: "pwwk.done.v2", notes: "pwwk.notes.v2", besluit: "pwwk.besluit.v2", view: "pwwk.view.v2" };
const load = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };

const TODAY = "2026-06-26"; // peildatum

// default besluiten uit de data
const DEFAULT_BESLUIT = Object.fromEntries(SUBJECTS.map((s) => [s.id, s.besluit]));

// ---------- Agenda ----------
function Agenda({ subjects, done, besluiten, onOpen }) {
  // alleen toetsen met een datum die je nog maakt (niet uitgesteld)
  const dated = subjects.filter((s) => s.datum && effStatus(s, besluiten[s.id]) !== "uitgesteld");
  const days = {};
  dated.forEach((s) => { (days[s.datum] = days[s.datum] || []).push(s); });
  const isoList = Object.keys(days).sort();

  const dnames = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
  const M = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];

  return (
    <div className="agenda">
      {isoList.map((iso) => {
        const d = new Date(iso + "T00:00:00");
        const items = days[iso].sort((a, b) => sortKey(a) - sortKey(b));
        return (
          <div className="agenda-day" key={iso}>
            <div className="agenda-date">
              <div className="dn">{d.getDate()}</div>
              <div className="dl">{dnames[d.getDay()]} {M[d.getMonth()]}</div>
              {iso === TODAY && <span className="today">vandaag</span>}
            </div>
            <div className="agenda-items">
              {items.map((s, ai) => {
                const eff = effStatus(s, besluiten[s.id]);
                const total = s.onderwerpen.length;
                const ch = s.onderwerpen.filter((_, i) => done[`${s.id}::${i}`]).length;
                const pct = total ? (ch / total) * 100 : 0;
                const tijd = s.tijd && /^\d/.test(s.tijd) ? s.tijd : (s.tijd || "tijd volgt");
                return (
                  <button className="agenda-row" key={s.id} style={{ "--c": s.kleur, animationDelay: (ai * 0.05) + "s" }} onClick={() => onOpen(s.id)}>
                    <span className="ab">{s.code}</span>
                    <span>
                      <span className="an">{s.naam}</span>
                      <span className="am">
                        <span className="mono">{tijd}</span>
                        <span>{s.type}</span>
                        {s.origineel && <span className="strike mono">was {fmtDatum(s.origineel.datum)}</span>}
                      </span>
                    </span>
                    <span className="agenda-right">
                      <StatusBadge s={eff} />
                      <span className="prog">
                        <span className="mini"><i style={{ width: pct + "%" }} /></span>
                        <small>{Math.round(pct)}%</small>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- pwwk3 view ----------
function Pwwk3View({ done, notes, besluiten, onToggle, onNote, onDecide, cardRefs }) {
  const total = SUBJECTS.reduce((n, s) => n + s.onderwerpen.length, 0);
  const doneN = SUBJECTS.reduce((n, s) => n + s.onderwerpen.filter((_, i) => done[`${s.id}::${i}`]).length, 0);
  const pct = total ? Math.round((doneN / total) * 100) : 0;

  const eff = (s) => effStatus(s, besluiten[s.id]);
  const teBeslissen = SUBJECTS.filter((s) => eff(s) === "beslissen");
  const verplaatst = SUBJECTS.filter((s) => eff(s) === "verplaatst");
  const gemaakt = SUBJECTS.filter((s) => eff(s) === "gemaakt");
  const uitgesteld = SUBJECTS.filter((s) => eff(s) === "uitgesteld");
  const actief = SUBJECTS.filter((s) => eff(s) !== "uitgesteld");

  // eerstvolgende geplande/verplaatste toets na vandaag
  const aankomend = actief
    .filter((s) => s.datum && s.datum >= TODAY && eff(s) !== "gemaakt")
    .sort((a, b) => sortKey(a) - sortKey(b))[0];

  return (
    <div className="page section-pad">
      <div className="kpis">
        <div className="kpi dark">
          <div className="k">Studievoortgang</div>
          <div className="v"><AnimatedNumber value={pct} /><small>%</small></div>
          <div className="sub">{doneN} van {total} onderwerpen geleerd</div>
        </div>
        <div className={"kpi" + (teBeslissen.length ? " alert" : "")}>
          <div className="k">Te beslissen</div>
          <div className="v">{teBeslissen.length}</div>
          <div className="sub">{teBeslissen.length ? teBeslissen.map((s) => s.naam).join(", ") : "alles is ingepland"}</div>
        </div>
        <div className="kpi">
          <div className="k">Verplaatst door weer</div>
          <div className="v">{verplaatst.length}</div>
          <div className="sub">{verplaatst.length ? verplaatst.map((s) => s.naam).join(" & ") + " → wo 1 jul" : "geen"}</div>
        </div>
        <div className="kpi">
          <div className="k">{uitgesteld.length ? "Gemaakt · uitgesteld" : "Toetsen gemaakt"}</div>
          <div className="v">{gemaakt.length}{uitgesteld.length ? <small> · {uitgesteld.length}↦</small> : <small>/{SUBJECTS.length}</small>}</div>
          <div className="sub">{aankomend ? `Eerstvolgende: ${aankomend.naam}, ${fmtDatum(aankomend.datum)}` : "Frans ging goed"}</div>
        </div>
      </div>

      <div className="alerts">
        <div className="alert-card" data-kind="operatie">
          <div className="ic">{Ic.alert()}</div>
          <div>
            <div className="at">Operatie — jij kiest per toets</div>
            <div className="ad">
              Omdat je een operatie hebt gehad, mag je van álle pwwk3-toetsen zelf bepalen of je ze <b>nu</b> maakt of <b>aan het begin van V6</b>.
              <b> Natuurkunde</b> en <b>Bedrijfseconomie</b> heb je gemist; die worden vermoedelijk verplaatst naar do 2 / vr 3 jul. Maak hieronder je keuze — uitgestelde toetsen verschijnen bij <b>Volgend jaar</b>.
            </div>
          </div>
        </div>
        <div className="alert-card" data-kind="weer">
          <div className="ic">{Ic.cloud()}</div>
          <div>
            <div className="at">Extreem weer — vrijdag verplaatst</div>
            <div className="ad"><b>Engels</b> en <b>Scheikunde</b> van vrijdag 26 juni zijn verplaatst naar <b>woensdag 1 juli</b>. De exacte tijden volgen.</div>
          </div>
        </div>
      </div>

      <div className="sec-head">
        <h2>Planning</h2>
        <div className="hr" />
        <span className="count">{actief.filter((s) => s.datum).length} ingepland</span>
      </div>
      <Agenda subjects={SUBJECTS} done={done} besluiten={besluiten} onOpen={(id) => {
        const el = cardRefs.current[id];
        if (el) { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" }); el.animate([{ boxShadow: "0 0 0 0 var(--gold)" }, { boxShadow: "0 0 0 3px var(--gold)" }, { boxShadow: "0 0 0 0 transparent" }], { duration: 900 }); }
      }} />

      {teBeslissen.length > 0 && (
        <div className="agenda-unplanned">
          <div className="uhead">{Ic.alert({ width: 15, height: 15 })} Nog te beslissen — gemist door operatie, datum onzeker</div>
        </div>
      )}

      <div className="sec-head">
        <h2>Stof & voortgang</h2>
        <div className="hr" />
        <span className="count">{SUBJECTS.length} vakken</span>
      </div>
      <div className="grid">
        {SUBJECTS.map((s, ci) => (
          <div key={s.id} ref={(el) => (cardRefs.current[s.id] = el)} style={{ animationDelay: (ci * 0.05) + "s" }}>
            <SubjectCard
              subj={s} done={done} notes={notes} besluit={besluiten[s.id]}
              onToggle={onToggle} onNote={onNote} onDecide={onDecide}
            />
          </div>
        ))}
      </div>

      <div className="foot-note">
        <span>Samengesteld uit het toetsrooster & PTA · voortgang lokaal bewaard op dit apparaat</span>
      </div>
    </div>
  );
}

// ---------- Rail ----------
function Rail({ view, setView, teBeslissen, onReset }) {
  const items = [
    { id: "pwwk3", label: "Proefwerkweek 3", icon: Ic.cal, badge: teBeslissen ? String(teBeslissen) : null, alert: teBeslissen > 0 },
    { id: "v6", label: "Volgend jaar — V6", icon: Ic.move },
    { id: "cijfers", label: "Cijfers", icon: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 20V10M12 20V4M19 20v-7" /></svg> },
  ];
  return (
    <aside className="rail">
      <div className="rail-brand">
        <div className="rail-mark">P3</div>
        <div>
          <b>Examen-dashboard</b>
          <span>Klas V5c · 2025–2026</span>
        </div>
      </div>
      <nav className="rail-nav">
        <div className="seclabel">Overzicht</div>
        {items.map((it) => (
          <button key={it.id} className="rail-link" data-on={view === it.id} data-alert={it.alert ? "true" : "false"} onClick={() => setView(it.id)}>
            {it.icon()}
            {it.label}
            {it.badge && <span className="lk-badge">{it.badge}</span>}
          </button>
        ))}
      </nav>
      <div className="rail-foot">
        <div className="meta">Proefwerkweek 3<br />di 23 jun — wo 1 jul 2026</div>
        <button className="rail-reset" onClick={onReset}>Voortgang resetten</button>
      </div>
    </aside>
  );
}

const VIEW_META = {
  pwwk3:   { title: "Proefwerkweek 3", sub: "Je rooster, stof en de keuzes rond je operatie & het weer" },
  v6:      { title: "Volgend jaar — V6", sub: "Alle schoolexamentoetsen die volgend jaar nog meetellen" },
  cijfers: { title: "Cijfers", sub: "Je SE-gemiddelde per vak, met prognose richting de eindstreep" },
};

// ---------- App ----------
function CelebrationToast({ onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fx-toast" role="status">
      <span className="emoji">🎉</span>
      <div>
        <div className="ft-title">Alles afgevinkt — topper!</div>
        <div className="ft-sub">Je hebt alle onderwerpen van álle vakken geleerd. Succes met de toetsen!</div>
      </div>
      <button className="ft-close" aria-label="Sluiten" onClick={onClose}>{Ic.cross({ width: 15, height: 15 })}</button>
    </div>
  );
}

function App() {
  const [done, setDone] = useState(() => load(LS.done, {}));
  const [notes, setNotes] = useState(() => load(LS.notes, {}));
  const [besluiten, setBesluiten] = useState(() => ({ ...DEFAULT_BESLUIT, ...load(LS.besluit, {}) }));
  const [view, setView] = useState(() => load(LS.view, "pwwk3"));
  const [party, setParty] = useState(false);
  const cardRefs = useRef({});

  useEffect(() => localStorage.setItem(LS.done, JSON.stringify(done)), [done]);
  useEffect(() => localStorage.setItem(LS.notes, JSON.stringify(notes)), [notes]);
  useEffect(() => localStorage.setItem(LS.besluit, JSON.stringify(besluiten)), [besluiten]);
  useEffect(() => localStorage.setItem(LS.view, JSON.stringify(view)), [view]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [view]);

  const totalTopics = useMemo(() => SUBJECTS.reduce((n, s) => n + s.onderwerpen.length, 0), []);
  const doneTopics = SUBJECTS.reduce((n, s) => n + s.onderwerpen.filter((_, i) => done[`${s.id}::${i}`]).length, 0);
  const allDone = totalTopics > 0 && doneTopics === totalTopics;
  const wasAllDone = useRef(allDone);
  useEffect(() => {
    if (allDone && !wasAllDone.current) {
      if (window.Confetti) { Confetti.cannons(); Confetti.rain(1600); }
      setParty(true);
    }
    wasAllDone.current = allDone;
  }, [allDone]);

  const toggle = (id, i) => setDone((p) => ({ ...p, [`${id}::${i}`]: !p[`${id}::${i}`] }));
  const setNote = (id, v) => setNotes((p) => ({ ...p, [id]: v }));
  const setDecide = (id, v) => setBesluiten((p) => ({ ...p, [id]: v }));

  const teBeslissen = SUBJECTS.filter((s) => effStatus(s, besluiten[s.id]) === "beslissen").length;
  const m = VIEW_META[view];

  return (
    <div className="shell">
      <Rail view={view} setView={setView} teBeslissen={teBeslissen}
        onReset={() => { if (confirm("Vinkjes, notities en keuzes wissen?")) { setDone({}); setNotes({}); setBesluiten({ ...DEFAULT_BESLUIT }); setParty(false); } }} />
      <main className="main">
        <div className="viewbar">
          <div className="viewbar-in">
            <div>
              <h1>{m.title}</h1>
              <div className="sub">{m.sub}</div>
            </div>
          </div>
        </div>
        {view === "pwwk3" && <Pwwk3View done={done} notes={notes} besluiten={besluiten} onToggle={toggle} onNote={setNote} onDecide={setDecide} cardRefs={cardRefs} />}
        {view === "v6" && <V6View besluiten={besluiten} />}
        {view === "cijfers" && <CijfersView />}
      </main>
      {party && <CelebrationToast onClose={() => setParty(false)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
