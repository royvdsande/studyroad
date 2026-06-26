/* global React, V6, SUBJECTS, MOMENT_META, Ic, effStatus, EINDEXAMENS, CE_VENSTER */

function V6Card({ vak, index = 0 }) {
  const sorted = [...vak.toetsen].sort((a, b) => MOMENT_META[a.moment].order - MOMENT_META[b.moment].order);
  const totaal = vak.toetsen.reduce((n, t) => n + (t.wf || 0), 0);
  return (
    <div className="v6-card" style={{ "--c": vak.kleur, animationDelay: (index * 0.04) + "s" }}>
      <div className="v6-card-top">
        <div className="vb">{vak.code}</div>
        <div className="vn">{vak.naam}</div>
        <div className="vw"><b>{totaal}%</b><span>V6-deel</span></div>
      </div>
      {sorted.map((t, i) => (
        <div className="v6-toets" key={i}>
          <div className="v6-toets-head">
            <span className="v6-moment" data-m={t.moment}>{MOMENT_META[t.moment].kort}</span>
            <span className="vt-soort">{t.soort}{t.duur !== "—" && <span className="dur"> · {t.duur}</span>}</span>
            <span className={"vt-wf" + (t.wf ? "" : " hand")}>{t.wf ? `${t.wf}%` : "hand."}</span>
          </div>
          <div className="v6-stof">{t.stof}</div>
          {!t.herkansbaar && <span className="v6-nh">niet herkansbaar</span>}
        </div>
      ))}
    </div>
  );
}

function V6View({ besluiten }) {
  // pwwk3-toetsen die je hebt uitgesteld → in te halen begin V6
  const uitgesteld = SUBJECTS.filter((s) => effStatus(s, besluiten[s.id]) === "uitgesteld");
  // sorteer vakken op moment van eerste toets, dan naam
  const vakken = [...V6].sort((a, b) => {
    const ao = Math.min(...a.toetsen.map((t) => MOMENT_META[t.moment].order));
    const bo = Math.min(...b.toetsen.map((t) => MOMENT_META[t.moment].order));
    return ao - bo || a.naam.localeCompare(b.naam);
  });

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
        <span className="count">{V6.length} vakken</span>
      </div>
      <div className="v6-grid">
        {vakken.map((v, i) => <V6Card key={v.id} vak={v} index={i} />)}
      </div>

      <div className="sec-head">
        <h2>Eindexamens — centraal examen 2027</h2>
        <div className="hr" />
        <span className="count">{EINDEXAMENS.length} vakken</span>
      </div>
      <div className="ce-banner">
        <div className="ic">{Ic.cal()}</div>
        <div>
          <div className="at">Eerste tijdvak: {CE_VENSTER.eerste}</div>
          <div className="ad">
            Na de schoolexamens volgt het landelijke centraal examen. Je <b>eindcijfer</b> is het gemiddelde van je
            schoolexamen (SE) en je centraal examen (CE) — elk telt ongeveer <b>de helft</b> mee. Herkansing in het tweede
            tijdvak ({CE_VENSTER.tweede}). De exacte data per vak komen in het definitieve examenrooster 2027.
          </div>
        </div>
      </div>
      <div className="ce-grid">
        {EINDEXAMENS.map((e, i) => (
          <div className="ce-card" key={e.id} style={{ "--c": e.kleur, animationDelay: (i * 0.03) + "s" }}>
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
