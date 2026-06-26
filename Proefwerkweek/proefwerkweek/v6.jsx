/* global React, V6, SUBJECTS, MOMENT_META, Ic, effStatus, EINDEXAMENS, CE_VENSTER, AnimatedNumber, dagenTot */
const { useState, useMemo, useRef, useEffect } = React;

// -----------------------------------------------------------------
//  Afgeleide data over alle V6-toetsen (gedeeld door meerdere views)
// -----------------------------------------------------------------
function useMomentData() {
  return useMemo(() => {
    const byMoment = {};
    Object.keys(MOMENT_META).forEach((m) => (byMoment[m] = []));
    V6.forEach((v) => v.toetsen.forEach((t) => byMoment[t.moment].push({ ...t, vak: v })));

    const alle = V6.flatMap((v) => v.toetsen.map((t) => ({ ...t, vak: v })));
    const totaalToetsen = alle.length;
    const herkansbaar = alle.filter((t) => t.herkansbaar).length;
    const zwaarste = alle.reduce((a, b) => (b.wf > a.wf ? b : a), alle[0]);
    const totaalWf = alle.reduce((n, t) => n + (t.wf || 0), 0);
    const maxMomentWf = Math.max(...Object.values(byMoment).map((arr) => arr.reduce((n, t) => n + t.wf, 0)));
    return { byMoment, alle, totaalToetsen, herkansbaar, zwaarste, totaalWf, maxMomentWf };
  }, []);
}

// -----------------------------------------------------------------
//  KPI-band — samenvatting van het V6-jaar
// -----------------------------------------------------------------
function V6Kpis({ data }) {
  const { totaalToetsen, herkansbaar, zwaarste, byMoment } = data;
  const ceDagen = Math.max(0, dagenTot(CE_VENSTER.eersteIso) || 0);
  const momenten = Object.values(byMoment).filter((arr) => arr.length).length;

  return (
    <div className="kpis v6-kpis">
      <div className="kpi dark">
        <div className="k">Toetsen volgend jaar</div>
        <div className="v"><AnimatedNumber value={totaalToetsen} /></div>
        <div className="sub">over {V6.length} vakken en {momenten} toetsmomenten</div>
      </div>
      <div className="kpi">
        <div className="k">Herkansbaar</div>
        <div className="v" style={{ color: "var(--st-done)" }}>
          <AnimatedNumber value={herkansbaar} /><small>/{totaalToetsen}</small>
        </div>
        <div className="sub">{totaalToetsen - herkansbaar} toetsen kun je niet overdoen</div>
      </div>
      <div className="kpi">
        <div className="k">Zwaarste toets</div>
        <div className="v" style={{ color: zwaarste.vak.kleur }}>
          <AnimatedNumber value={zwaarste.wf} /><small>%</small>
        </div>
        <div className="sub">{zwaarste.vak.naam} · {MOMENT_META[zwaarste.moment].kort}</div>
      </div>
      <div className="kpi">
        <div className="k">Centraal examen 2027</div>
        <div className="v" style={{ color: "oklch(0.5 0.11 75)" }}>
          <AnimatedNumber value={ceDagen} /><small> dagen</small>
        </div>
        <div className="sub">eerste tijdvak vanaf 14 mei</div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
//  Jaarlijn — gestapelde balken per toetsmoment (klikbaar = filter)
// -----------------------------------------------------------------
function V6Timeline({ data, active, onPick }) {
  const { byMoment, maxMomentWf } = data;
  const momenten = Object.keys(MOMENT_META);

  return (
    <div className="v6-timeline" data-filtering={active ? "true" : "false"}>
      <div className="v6tl-head">
        <div>
          <div className="v6tl-title">De V6-jaarlijn</div>
          <div className="v6tl-sub">
            Balkhoogte = opgeteld gewicht per moment · elk blokje is één toets.
            <b> Tik een kolom aan</b> om alleen dat moment te bekijken.
          </div>
        </div>
        {active && (
          <button className="v6tl-clear" onClick={() => onPick(null)}>
            {Ic.cross({ width: 13, height: 13 })} filter wissen
          </button>
        )}
      </div>

      <div className="v6tl-track" style={{ "--cols": momenten.length }}>
        {momenten.map((m, mi) => {
          const items = (byMoment[m] || []).slice().sort((a, b) => b.wf - a.wf);
          const totW = items.reduce((n, t) => n + t.wf, 0);
          const hPct = maxMomentWf ? Math.max(6, (totW / maxMomentWf) * 100) : 0;
          const isOn = active === m;
          const isDim = active && !isOn;
          return (
            <button
              key={m}
              className="v6tl-col"
              data-on={isOn}
              data-dim={isDim}
              style={{ "--delay": (mi * 0.09) + "s" }}
              onClick={() => onPick(isOn ? null : m)}
              aria-pressed={isOn}
            >
              <div className="v6tl-bar-wrap">
                <span className="v6tl-tot"><b>{totW}</b><small>%</small></span>
                <div className="v6tl-bar" style={{ height: hPct + "%" }}>
                  {items.map((t, ti) => (
                    <span
                      key={ti}
                      className="v6tl-seg"
                      data-hand={!t.wf}
                      title={`${t.vak.naam} · ${t.soort} · ${t.wf ? t.wf + "%" : "handelingsdeel"}`}
                      style={{
                        "--c": t.vak.kleur,
                        "--seg-delay": (mi * 0.09 + 0.25 + ti * 0.06) + "s",
                        flexGrow: t.wf || 0,
                        flexBasis: t.wf ? 0 : "7px",
                      }}
                    />
                  ))}
                </div>
              </div>
              <span className="v6tl-node"><span className="dot" data-season={MOMENT_META[m].seizoen} /></span>
              <div className="v6tl-meta">
                <b>{MOMENT_META[m].kort}</b>
                <span>{items.length} toets{items.length === 1 ? "" : "en"} · {MOMENT_META[m].seizoen}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="v6tl-legend">
        {V6.map((v) => (
          <span key={v.id} className="v6tl-key"><span className="sw" style={{ background: v.kleur }} />{v.code}</span>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
//  Vakkaart met weging-meter + moment-filter
// -----------------------------------------------------------------
function V6Card({ vak, index = 0, active }) {
  const sorted = useMemo(
    () => [...vak.toetsen].sort((a, b) => MOMENT_META[a.moment].order - MOMENT_META[b.moment].order),
    [vak]
  );
  const totaal = vak.toetsen.reduce((n, t) => n + (t.wf || 0), 0);
  const weegToetsen = sorted.filter((t) => t.wf);

  return (
    <div className="v6-card" style={{ "--c": vak.kleur, animationDelay: (index * 0.05) + "s" }}>
      <div className="v6-card-top">
        <div className="vb">{vak.code}</div>
        <div className="vn">{vak.naam}</div>
        <div className="vw"><b>{totaal}%</b><span>V6-deel</span></div>
      </div>

      {weegToetsen.length > 0 && (
        <div className="v6-weeg" title="Verdeling van het gewicht over het jaar">
          {weegToetsen.map((t, i) => (
            <span
              key={i}
              className="v6-weeg-seg"
              data-m={t.moment}
              title={`${MOMENT_META[t.moment].kort} · ${t.wf}%`}
              style={{ "--c": vak.kleur, flexGrow: t.wf, animationDelay: (index * 0.05 + 0.2 + i * 0.07) + "s" }}
            />
          ))}
        </div>
      )}

      {sorted.map((t, i) => {
        const dim = active && t.moment !== active;
        const hot = active && t.moment === active;
        return (
          <div className="v6-toets" key={i} data-dim={dim ? "true" : "false"} data-hot={hot ? "true" : "false"}>
            <div className="v6-toets-head">
              <span className="v6-moment" data-m={t.moment}>{MOMENT_META[t.moment].kort}</span>
              <span className="vt-soort">{t.soort}{t.duur !== "—" && <span className="dur"> · {t.duur}</span>}</span>
              <span className={"vt-wf" + (t.wf ? "" : " hand")}>{t.wf ? `${t.wf}%` : "hand."}</span>
            </div>
            <div className="v6-stof">{t.stof}</div>
            {!t.herkansbaar && <span className="v6-nh">niet herkansbaar</span>}
          </div>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------
//  CE-aftelbanner
// -----------------------------------------------------------------
function CeBanner() {
  const dagen = Math.max(0, dagenTot(CE_VENSTER.eersteIso) || 0);
  const weken = Math.round(dagen / 7);
  return (
    <div className="ce-banner">
      <div className="ic">{Ic.cal()}</div>
      <div className="ce-banner-body">
        <div className="at">Eerste tijdvak: {CE_VENSTER.eerste}</div>
        <div className="ad">
          Na de schoolexamens volgt het landelijke centraal examen. Je <b>eindcijfer</b> is het gemiddelde van je
          schoolexamen (SE) en je centraal examen (CE) — elk telt ongeveer <b>de helft</b> mee. Herkansing in het tweede
          tijdvak ({CE_VENSTER.tweede}). De exacte data per vak komen in het definitieve examenrooster 2027.
        </div>
      </div>
      <div className="ce-count" title="Aftellen tot het eerste centraal examen">
        <b><AnimatedNumber value={dagen} /></b>
        <span>dagen</span>
        <small>≈ {weken} weken</small>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
//  V6-view
// -----------------------------------------------------------------
function V6View({ besluiten }) {
  const data = useMomentData();
  const [active, setActive] = useState(null); // gekozen moment-filter

  // pwwk3-toetsen die je hebt uitgesteld → in te halen begin V6
  const uitgesteld = SUBJECTS.filter((s) => effStatus(s, besluiten[s.id]) === "uitgesteld");

  // sorteer vakken op moment van eerste toets, dan naam
  const vakkenAll = useMemo(() => [...V6].sort((a, b) => {
    const ao = Math.min(...a.toetsen.map((t) => MOMENT_META[t.moment].order));
    const bo = Math.min(...b.toetsen.map((t) => MOMENT_META[t.moment].order));
    return ao - bo || a.naam.localeCompare(b.naam);
  }), []);

  // bij een filter alleen vakken tonen die op dat moment een toets hebben
  const vakken = active ? vakkenAll.filter((v) => v.toetsen.some((t) => t.moment === active)) : vakkenAll;
  const filterCount = active ? data.byMoment[active].length : 0;

  return (
    <div className="page section-pad">
      <div className="v6-intro">
        <div className="lead">
          <StatusLine />
          <p>
            Alle schoolexamentoetsen die volgend jaar nog meetellen, per vak uit het PTA VWO 6.
            De percentages zijn de officiële weegfactoren. Exacte data volgen in de V6-jaarplanning.
          </p>
        </div>
        <div className="v6-legend">
          <span><span className="sw" style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)" }} />Periode-toets</span>
          <span><span className="sw" style={{ background: "color-mix(in oklab, var(--teal) 30%, var(--paper))" }} />Proefwerkweek</span>
          <span><span className="sw" style={{ background: "color-mix(in oklab, var(--st-decide) 22%, var(--paper))" }} />Niet herkansbaar</span>
        </div>
      </div>

      <V6Kpis data={data} />

      <V6Timeline data={data} active={active} onPick={setActive} />

      {uitgesteld.length > 0 && (
        <React.Fragment>
          <div className="sec-head">
            <h2>In te halen aan het begin van V6</h2>
            <div className="hr" />
            <span className="count">{uitgesteld.length} uit pwwk3</span>
          </div>
          <div className="v6-grid">
            {uitgesteld.map((s) => (
              <div className="v6-card" key={s.id} style={{ "--c": s.kleur }}>
                <div className="v6-card-top">
                  <div className="vb">{s.code}</div>
                  <div className="vn">{s.naam}</div>
                  <div className="vw"><b style={{ color: "var(--st-defer)" }}>↦</b><span>uitgesteld</span></div>
                </div>
                <div className="v6-toets">
                  <div className="v6-stof">Pwwk3-toets die je hebt uitgesteld. Inhalen aan het begin van V6.</div>
                </div>
                <div className="v6-defer-note">{Ic.info()}<span>{s.onderwerpen.join(" · ")}</span></div>
              </div>
            ))}
          </div>
        </React.Fragment>
      )}

      <div className="sec-head">
        <h2>V6 — programma van toetsing en afsluiting</h2>
        <div className="hr" />
        {active
          ? <span className="count is-filter">{MOMENT_META[active].kort} · {filterCount} toets{filterCount === 1 ? "" : "en"}</span>
          : <span className="count">{V6.length} vakken</span>}
      </div>
      <div className="v6-grid" key={active || "all"}>
        {vakken.map((v, i) => <V6Card key={v.id} vak={v} index={i} active={active} />)}
      </div>

      <div className="sec-head">
        <h2>Eindexamens — centraal examen 2027</h2>
        <div className="hr" />
        <span className="count">{EINDEXAMENS.length} vakken</span>
      </div>
      <CeBanner />
      <div className="ce-grid">
        {EINDEXAMENS.map((e, i) => (
          <div className="ce-card" key={e.id} style={{ "--c": e.kleur, animationDelay: (i * 0.04) + "s" }}>
            <div className="ce-badge">{e.code}</div>
            <div className="ce-body">
              <div className="ce-name">{e.naam}</div>
              <div className="ce-meta"><span>Centraal examen</span><span className="mono">{e.duur}</span></div>
            </div>
            <div className="ce-tag">CE</div>
          </div>
        ))}
      </div>

      <div className="foot-note">
        <span>Bron: PTA VWO 6 · alleen jouw examenvakken · pwwk = proefwerkweek</span>
        <span>Lichamelijke opvoeding loopt door als handelingsdeel (geen cijfer).</span>
      </div>
    </div>
  );
}

function StatusLine() {
  return <h2 style={{ fontFamily: "var(--ff-display)", fontSize: 18 }}>Wat komt er volgend jaar nog?</h2>;
}

Object.assign(window, { V6View, V6Card });
