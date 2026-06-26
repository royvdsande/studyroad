/* global React, ReactDOM, SUBJECTS, PROGNOSE, fmtDatum, dagenTot, sortKey,
   Ic, effStatus, StatusBadge, SubjectCard, CijfersView, V6View,
   fireConfetti, fireSparkle, fireMegaCelebration, showToast, wiggleCard */
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
              {items.map((s) => {
                const eff = effStatus(s, besluiten[s.id]);
                const total = s.onderwerpen.length;
                const ch = s.onderwerpen.filter((_, i) => done[`${s.id}::${i}`]).length;
                const pct = total ? (ch / total) * 100 : 0;
                const tijd = s.tijd && /^\d/.test(s.tijd) ? s.tijd : (s.tijd || "tijd volgt");
                return (
                  <button className="agenda-row" key={s.id} style={{ "--c": s.kleur }} onClick={() => onOpen(s.id)}>
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

// ---------- Countdown naar eerstvolgende toets ----------
function useCountdown(targetIso, targetTime) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!targetIso) return null;
  const t = (targetTime && /^\d/.test(targetTime)) ? targetTime.split("–")[0] : "08:30";
  const [h, m] = t.split(":").map(Number);
  const target = new Date(targetIso + "T00:00:00");
  target.setHours(h || 0, m || 0, 0, 0);
  const ms = Math.max(0, target.getTime() - now);
  return {
    d: Math.floor(ms / 864e5),
    h: Math.floor((ms % 864e5) / 36e5),
    m: Math.floor((ms % 36e5) / 6e4),
    s: Math.floor((ms % 6e4) / 1e3),
    done: ms === 0,
  };
}

// ---------- pwwk3 view ----------
function Pwwk3View({ done, notes, besluiten, onToggle, onNote, onDecide, cardRefs }) {
  const [q, setQ] = useState("");
  const total = SUBJECTS.reduce((n, s) => n + s.onderwerpen.length, 0);
  const doneN = SUBJECTS.reduce((n, s) => n + s.onderwerpen.filter((_, i) => done[`${s.id}::${i}`]).length, 0);
  const pct = total ? Math.round((doneN / total) * 100) : 0;
  const vakkenKlaar = SUBJECTS.filter((s) => s.onderwerpen.length && s.onderwerpen.every((_, i) => done[`${s.id}::${i}`])).length;

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

  const cd = useCountdown(aankomend?.datum, aankomend?.tijd);

  const filtered = SUBJECTS.filter((s) => {
    if (!q.trim()) return true;
    const hay = (s.naam + " " + s.onderwerpen.join(" ") + " " + (s.notitie || "")).toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="page section-pad">
      <div className="kpis">
        <div className={"kpi dark" + (pct === 100 ? " celebrate" : "")}>
          <div className="k">Studievoortgang</div>
          <div className="v" data-pct={pct}>{pct}<small>%</small></div>
          <div className="sub">{doneN} van {total} onderwerpen · {vakkenKlaar}/{SUBJECTS.length} vakken klaar</div>
          {pct === 100 && <div className="kpi-sparkle" aria-hidden="true">✦</div>}
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

      {aankomend && cd && !cd.done && (
        <div className="countdown-strip">
          <div className="cs-label">
            <span className="dot" style={{ background: aankomend.kleur }} />
            Nog even tot <b>{aankomend.naam}</b> · {fmtDatum(aankomend.datum)}
          </div>
          <div className="cs-clock">
            {[["d", cd.d, "dgn"], ["h", cd.h, "uur"], ["m", cd.m, "min"], ["s", cd.s, "sec"]].map(([k, v, l]) => (
              <div className="cs-unit" key={k}>
                <b>{String(v).padStart(2, "0")}</b><span>{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <div className="agenda-items">
            {teBeslissen.map((s) => {
              const totalS = s.onderwerpen.length;
              const ch = s.onderwerpen.filter((_, i) => done[`${s.id}::${i}`]).length;
              const pctS = totalS ? (ch / totalS) * 100 : 0;
              return (
                <button className="agenda-row" key={s.id} style={{ "--c": s.kleur }} onClick={() => {
                  const el = cardRefs.current[s.id];
                  if (el) { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" }); wiggleCard(el); }
                }}>
                  <span className="ab">{s.code}</span>
                  <span>
                    <span className="an">{s.naam}</span>
                    <span className="am"><span>datum onzeker</span><span>{s.type}</span></span>
                  </span>
                  <span className="agenda-right">
                    <StatusBadge s="beslissen" />
                    <span className="prog">
                      <span className="mini"><i style={{ width: pctS + "%" }} /></span>
                      <small>{Math.round(pctS)}%</small>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="sec-head">
        <h2>Stof & voortgang</h2>
        <div className="hr" />
        <span className="count">{SUBJECTS.length} vakken</span>
      </div>

      <div className="controls">
        <div className="search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input placeholder="Zoek een vak of onderwerp…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="grid">
        {filtered.length ? filtered.map((s, idx) => (
          <div key={s.id} ref={(el) => (cardRefs.current[s.id] = el)} className="grid-cell" style={{ "--i": idx }}>
            <SubjectCard
              subj={s} done={done} notes={notes} besluit={besluiten[s.id]}
              onToggle={onToggle} onNote={onNote} onDecide={onDecide}
            />
          </div>
        )) : (
          <div className="empty"><b>Niets gevonden</b>Geen vak of onderwerp matcht “{q}”.</div>
        )}
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
function App() {
  const [done, setDone] = useState(() => load(LS.done, {}));
  const [notes, setNotes] = useState(() => load(LS.notes, {}));
  const [besluiten, setBesluiten] = useState(() => ({ ...DEFAULT_BESLUIT, ...load(LS.besluit, {}) }));
  const [view, setView] = useState(() => load(LS.view, "pwwk3"));
  const cardRefs = useRef({});
  const celebratedAll = useRef(false);

  useEffect(() => localStorage.setItem(LS.done, JSON.stringify(done)), [done]);
  useEffect(() => localStorage.setItem(LS.notes, JSON.stringify(notes)), [notes]);
  useEffect(() => localStorage.setItem(LS.besluit, JSON.stringify(besluiten)), [besluiten]);
  useEffect(() => localStorage.setItem(LS.view, JSON.stringify(view)), [view]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [view]);

  const totalTopics = SUBJECTS.reduce((n, s) => n + s.onderwerpen.length, 0);
  const doneTopics = SUBJECTS.reduce((n, s) => n + s.onderwerpen.filter((_, i) => done[`${s.id}::${i}`]).length, 0);
  const allDone = totalTopics > 0 && doneTopics === totalTopics;

  useEffect(() => {
    if (allDone && !celebratedAll.current) {
      celebratedAll.current = true;
      setTimeout(() => {
        fireMegaCelebration();
        showToast("Alles afgevinkt — je bent helemaal klaar! 🎉", "mega");
      }, 200);
    }
    if (!allDone) celebratedAll.current = false;
  }, [allDone]);

  function toggle(id, i, evt) {
    const subj = SUBJECTS.find((s) => s.id === id);
    if (!subj) return;
    const before = subj.onderwerpen.every((_, k) => done[`${id}::${k}`]);
    const willCheck = !done[`${id}::${i}`];

    if (evt && willCheck) {
      const box = evt.currentTarget?.querySelector(".box");
      const r = box ? box.getBoundingClientRect() : null;
      if (r) fireSparkle(r.left + r.width / 2, r.top + r.height / 2, subj.kleur);
    }

    setDone((prev) => {
      const next = { ...prev, [`${id}::${i}`]: !prev[`${id}::${i}`] };
      const after = subj.onderwerpen.every((_, k) => next[`${id}::${k}`]);
      if (!before && after) {
        const el = cardRefs.current[id];
        const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
        setTimeout(() => {
          fireConfetti(r.left + r.width / 2, r.top + r.height / 2, subj.kleur);
          wiggleCard(el);
          showToast(`${subj.naam} — alle stof afgevinkt!`, "success");
        }, 40);
      }
      return next;
    });
  }
  const setNote = (id, v) => setNotes((p) => ({ ...p, [id]: v }));
  const setDecide = (id, v) => setBesluiten((p) => ({ ...p, [id]: v }));

  const teBeslissen = SUBJECTS.filter((s) => effStatus(s, besluiten[s.id]) === "beslissen").length;
  const m = VIEW_META[view];

  return (
    <div className="shell" data-all-done={allDone}>
      <Rail view={view} setView={setView} teBeslissen={teBeslissen}
        onReset={() => { if (confirm("Vinkjes, notities en keuzes wissen?")) { setDone({}); setNotes({}); setBesluiten({ ...DEFAULT_BESLUIT }); } }} />
      <main className="main">
        <div className="viewbar">
          <div className="viewbar-in">
            <div>
              <h1>{m.title}</h1>
              <div className="sub">{m.sub}</div>
            </div>
          </div>
        </div>
        <div className="view-content" key={view}>
        {view === "pwwk3" && <Pwwk3View done={done} notes={notes} besluiten={besluiten} onToggle={toggle} onNote={setNote} onDecide={setDecide} cardRefs={cardRefs} />}
        {view === "v6" && <V6View besluiten={besluiten} />}
        {view === "cijfers" && <CijfersView />}
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
