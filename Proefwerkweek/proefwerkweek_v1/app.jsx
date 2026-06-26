/* global React, ReactDOM, SUBJECTS, PERIODE3, PWWK_START, examTijd, fmtDatum, dagenTot, Ring, SubjectCard, urgency */
const { useState, useEffect, useRef, useMemo } = React;

const LS_DONE = "pwwk3.done.v1";
const LS_NOTES = "pwwk3.notes.v1";
const LS_VIEW = "pwwk3.view.v1";
const LS_PAGE = "pwwk3.page.v1";

function load(key, fb) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; }
}

// ---------- Confetti ----------
function fireConfetti(x, y, color) {
  const cv = document.getElementById("confetti");
  const ctx = cv.getContext("2d");
  cv.width = innerWidth; cv.height = innerHeight;
  const colors = [color, "var(--gold)", "#fff", "#2a2622"].map((c) =>
    c.startsWith("var") ? getComputedStyle(document.body).getPropertyValue("--gold") : c
  );
  const N = 90;
  const parts = Array.from({ length: N }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * 13,
    vy: Math.random() * -13 - 4,
    s: 5 + Math.random() * 7,
    rot: Math.random() * 6.28,
    vr: (Math.random() - 0.5) * 0.4,
    c: colors[(Math.random() * colors.length) | 0],
    life: 1,
  }));
  let t0 = null;
  function frame(t) {
    if (!t0) t0 = t;
    ctx.clearRect(0, 0, cv.width, cv.height);
    let alive = false;
    for (const p of parts) {
      p.vy += 0.42; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr; p.life -= 0.011;
      if (p.life > 0 && p.y < cv.height + 40) {
        alive = true;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      }
    }
    if (alive) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, cv.width, cv.height);
  }
  requestAnimationFrame(frame);
}

// ---------- Countdown ----------
function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, target.getTime() - now);
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  const s = Math.floor((ms % 6e4) / 1e3);
  return { d, h, m, s, done: ms === 0 };
}

// ---------- Timeline ----------
function localISO(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function Timeline({ done, onOpen }) {
  const days = [];
  const start = new Date("2026-06-23T00:00:00");
  for (let i = 0; i < 8; i++) {
    const dt = new Date(start); dt.setDate(start.getDate() + i);
    const iso = localISO(dt);
    const subs = SUBJECTS.filter((s) => s.datum === iso);
    const dow = dt.getDay();
    days.push({ dt, iso, subs, weekend: dow === 0 || dow === 6 });
  }
  const today = localISO(new Date());
  const dnames = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

  return (
    <div className="timeline">
      {days.map((day) => {
        const t = day.dt;
        return (
          <div className="day" key={day.iso}>
            <div className="day-label">
              <div className="dnum">{t.getDate()}</div>
              <div className="dname">{dnames[t.getDay()]}</div>
              {day.iso === today && <span className="today">vandaag</span>}
            </div>
            <div className="day-items">
              {day.subs.length === 0 && (
                <div className="day-free">
                  <svg className="smiley" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" />
                  </svg>
                  {day.weekend ? "Weekend — even bijtanken (of bijspijkeren)" : "Geen toets voor jou — mooie leerdag"}
                </div>
              )}
              {day.subs.map((s) => {
                const tt = examTijd(s.periodes);
                const total = s.onderwerpen.length;
                const ch = s.onderwerpen.filter((_, i) => done[`${s.id}::${i}`]).length;
                const pct = total ? (ch / total) * 100 : 0;
                return (
                  <button className="tl-item" key={s.id} style={{ "--c": s.kleur }} onClick={() => onOpen(s.id)}>
                    <span className="tl-time">{tt ? `${tt.start}–${tt.eind}` : "tijd volgt"}</span>
                    <span className="tl-name">{s.naam}</span>
                    <span className="tl-meta">{ch}/{total} af</span>
                    <span className="tl-prog">
                      <span className="bar"><i style={{ width: pct + "%", background: s.kleur }} /></span>
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

// ---------- Periode 3 mini-card ----------
function P3Card({ item, done, onToggle }) {
  const total = item.onderwerpen.length;
  const ch = item.onderwerpen.filter((_, i) => done[`${item.id}::${i}`]).length;
  const pct = total ? (ch / total) * 100 : 0;
  return (
    <div className={"card" + (pct === 100 ? " done" : "")} style={{ "--c": item.kleur }}>
      <div className="card-top">
        <div className="mono-badge">{item.code}</div>
        <div className="card-head">
          <div className="card-name" style={{ fontSize: 17 }}>{item.naam}</div>
          <div className="card-meta">
            <span className="mono">{item.wanneer}</span>
            {item.duur && <span className="mono">{item.duur}</span>}
          </div>
        </div>
        {item.weging && (
          <div className="daychip" style={{ background: "var(--bg-2)", color: "var(--ink-soft)" }}>
            {item.weging}
          </div>
        )}
      </div>
      <ul className="checklist">
        {item.onderwerpen.map((o, i) => {
          const on = !!done[`${item.id}::${i}`];
          return (
            <li key={i}>
              <button className="check" data-on={on} onClick={() => onToggle(item.id, i)}>
                <span className="box"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 6.5" /></svg></span>
                <span className="check-label">{o}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="card-foot">
        <div className="foot-row">
          <span style={{ color: "var(--ink-soft)" }}>{ch} / {total}</span>
          <b style={{ color: pct === 100 ? item.kleur : "var(--ink-soft)" }}>{pct === 100 ? "klaar!" : Math.round(pct) + "%"}</b>
        </div>
        <div className="bar"><i style={{ width: pct + "%" }} /></div>
      </div>
    </div>
  );
}

// ---------- App ----------
function App() {
  const [done, setDone] = useState(() => load(LS_DONE, {}));
  const [notes, setNotes] = useState(() => load(LS_NOTES, {}));
  const [view, setView] = useState(() => load(LS_VIEW, "raster"));
  const [page, setPage] = useState(() => load(LS_PAGE, "studie"));
  const [q, setQ] = useState("");
  const cards = useRef({});

  useEffect(() => localStorage.setItem(LS_DONE, JSON.stringify(done)), [done]);
  useEffect(() => localStorage.setItem(LS_NOTES, JSON.stringify(notes)), [notes]);
  useEffect(() => localStorage.setItem(LS_VIEW, JSON.stringify(view)), [view]);
  useEffect(() => localStorage.setItem(LS_PAGE, JSON.stringify(page)), [page]);

  const cd = useCountdown(PWWK_FIRST.date);

  const allItems = [...SUBJECTS, ...PERIODE3];
  const totalTopics = allItems.reduce((n, s) => n + s.onderwerpen.length, 0);
  const doneTopics = allItems.reduce(
    (n, s) => n + s.onderwerpen.filter((_, i) => done[`${s.id}::${i}`]).length, 0
  );
  const overall = totalTopics ? (doneTopics / totalTopics) * 100 : 0;
  const klaar = allItems.filter((s) => s.onderwerpen.length && s.onderwerpen.every((_, i) => done[`${s.id}::${i}`])).length;

  function toggle(id, i) {
    const item = allItems.find((s) => s.id === id);
    const before = item.onderwerpen.every((_, k) => done[`${id}::${k}`]);
    setDone((prev) => {
      const next = { ...prev, [`${id}::${i}`]: !prev[`${id}::${i}`] };
      const after = item.onderwerpen.every((_, k) => next[`${id}::${k}`]);
      if (!before && after) {
        const el = cards.current[id];
        const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
        setTimeout(() => fireConfetti(r.left + r.width / 2, r.top + r.height / 2, item.kleur), 30);
      }
      return next;
    });
  }
  function setNote(id, v) { setNotes((p) => ({ ...p, [id]: v })); }

  function openSubject(id) {
    setView("raster");
    setTimeout(() => {
      const el = cards.current[id];
      if (el) { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" }); el.animate([{ boxShadow: "0 0 0 0 var(--gold)" }, { boxShadow: "0 0 0 4px var(--gold)" }, { boxShadow: "0 0 0 0 transparent" }], { duration: 900 }); }
    }, 60);
  }

  const filtered = SUBJECTS.filter((s) => {
    if (!q.trim()) return true;
    const hay = (s.naam + " " + s.onderwerpen.join(" ") + " " + (s.notitie || "")).toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <React.Fragment>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <div className="brand">
            <div className="brand-mark">P3</div>
            <div className="brand-text">
              <b>Proefwerkweek 3</b>
              <span>di 23 juni — di 30 juni 2026</span>
            </div>
          </div>
          <nav className="pagenav">
            <button data-on={page === "studie"} onClick={() => setPage("studie")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5V6a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v13" /><path d="M6 17h12v3H6a2 2 0 0 1 0-4h0" /></svg>
              Studie
            </button>
            <button data-on={page === "cijfers"} onClick={() => setPage("cijfers")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 20V10M12 20V4M19 20v-7" /></svg>
              Cijfers
            </button>
          </nav>
        </div>
      </header>

      <div className="wrap">
        {page === "studie" ? (
        <React.Fragment>
        <section className="hero">
          <div className="hero-grid">
            <div>
              <h1 className="hero-title">Alle stof,<br />één <em>overzicht</em>.</h1>
              <p className="hero-sub">
                Jouw acht toetsen met de exacte data, lesuren en stof uit het rooster.
                Vink af wat je beheerst, schrijf notities en houd je voortgang bij —
                alles wordt automatisch bewaard.
              </p>
              <div className="hero-chips">
                {SUBJECTS.map((s) => (
                  <span className="chip" key={s.id}>
                    <span className="dot" style={{ background: s.kleur }} />{s.naam}
                  </span>
                ))}
              </div>
            </div>
            <div className="count-card">
              <div>
                <div className="label">Tot je eerste toets</div>
                <div className="count-first">
                  <span className="dot" style={{ background: PWWK_FIRST.subj.kleur }} />
                  {PWWK_FIRST.subj.naam} · {fmtDatum(PWWK_FIRST.subj.datum)} · {examTijd(PWWK_FIRST.subj.periodes).start}
                </div>
                <div className="count-clock">
                  {[["d", cd.d, "dagen"], ["h", cd.h, "uur"], ["m", cd.m, "min"], ["s", cd.s, "sec"]].map(([k, v, l]) => (
                    <div className="count-unit" key={k}>
                      <b>{String(v).padStart(2, "0")}</b><span>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="count-foot">
                <Ring pct={overall} color="var(--gold)" label={
                  <div style={{ lineHeight: 1.2 }}>
                    <div style={{ fontWeight: 700, fontFamily: "var(--ff-display)", fontSize: 15 }}>Totale voortgang</div>
                    <div style={{ color: "rgba(250,247,241,0.7)" }}>{doneTopics} van {totalTopics} onderwerpen</div>
                  </div>
                } />
              </div>
            </div>
          </div>
        </section>

        <div className="controls">
          <div className="seg">
            <button data-on={view === "raster"} onClick={() => setView("raster")}>▦ Raster</button>
            <button data-on={view === "tijdlijn"} onClick={() => setView("tijdlijn")}>☰ Tijdlijn</button>
          </div>
          {view === "raster" && (
            <div className="search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
              <input placeholder="Zoek een vak of onderwerp…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          )}
          <button className="btn-reset" onClick={() => { if (confirm("Alle vinkjes en notities wissen?")) { setDone({}); setNotes({}); } }}>
            Voortgang resetten
          </button>
        </div>

        {view === "raster" ? (
          filtered.length ? (
            <div className="grid">
              {filtered.map((s) => (
                <div key={s.id} ref={(el) => (cards.current[s.id] = el)}>
                  <SubjectCard subj={s} done={done} notes={notes} onToggle={toggle} onNote={setNote} />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty"><b>Niets gevonden</b>Geen vak of onderwerp matcht “{q}”.</div>
          )
        ) : (
          <Timeline done={done} onOpen={openSubject} />
        )}

        <div className="sec-head">
          <h2>Vóór de proefwerkweek</h2>
          <div className="hr" />
          <span className="count">periode 3</span>
        </div>
        <div className="p3-grid">
          {PERIODE3.map((item) => (
            <div key={item.id} ref={(el) => (cards.current[item.id] = el)}>
              <P3Card item={item} done={done} onToggle={toggle} />
            </div>
          ))}
        </div>
        </React.Fragment>
        ) : (
          <Cijfers />
        )}

        <div className="site-foot">
          {page === "studie"
            ? "Samengesteld uit het toetsoverzicht & pwwk-rooster · voortgang lokaal opgeslagen op dit apparaat"
            : "Cijfers uit je Magister-back-up · alleen op dit apparaat zichtbaar, niets wordt verstuurd"}
        </div>
      </div>
      <canvas id="confetti" />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
