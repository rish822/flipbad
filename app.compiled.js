/** @jsxRuntime classic */
const {
  useState,
  useMemo,
  useRef,
  useEffect
} = React;

// ── Firebase / storage ──────────────────────────────────────────
const _SESSION = Math.random().toString(36).slice(2);
const _cache = {};
let _fbdb = null;
const _FBCFG = {
  apiKey: "AIzaSyD0WWz2ABsdfaBAn7dwcQJo8lnYGEMPlbE",
  authDomain: "flipbad-264a5.firebaseapp.com",
  projectId: "flipbad-264a5",
  storageBucket: "flipbad-264a5.firebasestorage.app",
  messagingSenderId: "926897169201",
  appId: "1:926897169201:web:4e0e7846a1da17d81ec610"
};
function load(key, def) {
  return key in _cache ? _cache[key] : def;
}
const _saveTimers = {};
function save(key, val) {
  _cache[key] = val;
  if (!_fbdb) return;
  clearTimeout(_saveTimers[key]);
  _saveTimers[key] = setTimeout(() => {
    _fbdb.collection('flipbad').doc('shared')
      .set({[key]: val, _by: _SESSION, _at: Date.now()}, {merge: true})
      .catch(console.error);
  }, 1200);
}

// ── constants ────────────────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}
function firstDay(y, m) {
  return new Date(y, m, 1).getDay();
}
function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function makeMatch(t1, t2, round = "Match") {
  return {
    id: uid(),
    team1: t1,
    team2: t2,
    sets: [{
      t1: 0,
      t2: 0
    }],
    status: "upcoming",
    date: "",
    time: "",
    winner: null,
    round
  };
}
function generateRR(teams) {
  const ms = [];
  for (let i = 0; i < teams.length; i++) for (let j = i + 1; j < teams.length; j++) ms.push(makeMatch(teams[i].name, teams[j].name, "Round Robin"));
  return ms;
}
function generateElim(teams) {
  const ms = [];
  for (let i = 0; i + 1 < teams.length; i += 2) ms.push(makeMatch(teams[i].name, teams[i + 1].name, "Quarter-Final"));
  return ms;
}
function computePoints(teams, matches) {
  const tbl = {};
  teams.forEach(t => {
    tbl[t.name] = {
      played: 0,
      won: 0,
      lost: 0,
      pts: 0,
      sw: 0,
      sl: 0
    };
  });
  matches.forEach(m => {
    if (m.status !== "completed") return;
    const r1 = tbl[m.team1],
      r2 = tbl[m.team2];
    if (!r1 || !r2) return;
    r1.played++;
    r2.played++;
    let s1 = 0,
      s2 = 0;
    m.sets.forEach(s => {
      if (s.t1 > s.t2) s1++;else if (s.t2 > s.t1) s2++;
    });
    r1.sw += s1;
    r1.sl += s2;
    r2.sw += s2;
    r2.sl += s1;
    if (m.winner === m.team1) {
      r1.won++;
      r1.pts += 2;
      r2.lost++;
    } else if (m.winner === m.team2) {
      r2.won++;
      r2.pts += 2;
      r1.lost++;
    }
  });
  return tbl;
}

// ── palette ──────────────────────────────────────────────────────
const P = {
  bg0: "#06040c",
  bg1: "#0c0818",
  bg2: "#120e22",
  bg3: "#1a1430",
  border: "rgba(168,85,247,0.2)",
  borderB: "rgba(168,85,247,0.09)",
  accent: "#a855f7",
  accentL: "#ec4899",
  accentG: "linear-gradient(135deg,#6d28d9,#a855f7,#ec4899)",
  accentBg: "linear-gradient(135deg,rgba(109,40,217,.18),rgba(236,72,153,.1))",
  gold: "#fbbf24",
  goldG: "linear-gradient(135deg,#78350f,#fbbf24)",
  silverG: "linear-gradient(135deg,#475569,#f1f5f9)",
  bronzeG: "linear-gradient(135deg,#9a3412,#fb923c)",
  white: "#fce7f3",
  sub: "#6b21a8",
  dim: "#2d1b4e",
  red: "#fb7185",
  green: "#86efac"
};
const RANK_GRADIENTS = [P.goldG, P.silverG, P.bronzeG];
const RANK_GLOWS = ["rgba(251,191,36,.25)", "rgba(203,213,225,.12)", "rgba(251,146,60,.2)"];
const MEDALS = ["🥇", "🥈", "🥉"];
const F = "'Space Grotesk','Inter',system-ui,sans-serif";
const Sty = {
  page: {
    minHeight: "100vh",
    background: P.bg0,
    fontFamily: F
  },
  wrap: {
    width: "100%",
    maxWidth: 600,
    margin: "0 auto",
    padding: "0 14px 80px"
  },
  card: {
    background: P.bg1,
    border: `1px solid ${P.border}`,
    borderRadius: 14,
    padding: "18px 16px",
    marginBottom: 10
  },
  label: {
    color: P.sub,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    display: "block",
    marginBottom: 6
  },
  input: {
    background: P.bg2,
    border: `1px solid ${P.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: P.white,
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: F
  },
  heroBtn: {
    background: P.accentG,
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    border: "none",
    borderRadius: 10,
    padding: "13px",
    width: "100%",
    cursor: "pointer",
    fontFamily: F,
    letterSpacing: 0.2,
    boxShadow: "0 4px 20px rgba(168,85,247,.35)"
  },
  ghost: {
    background: "transparent",
    border: `1px solid ${P.border}`,
    color: "#a78bfa",
    borderRadius: 8,
    padding: "7px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: F
  },
  ghostV: {
    background: "transparent",
    border: "1px solid rgba(168,85,247,.35)",
    color: P.accentL,
    background: P.accentBg,
    borderRadius: 8,
    padding: "7px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: F
  },
  sec: {
    color: P.dim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 16
  }
};

// ════════ MAIN APP ════════════════════════════════════════════════
function App() {
  const [screen, setScreen] = useState("home");
  const [matchId, setMatchId] = useState(null);

  // persisted registry
  const [registry, setRegistry] = useState(() => load("fb-registry", [{
    id: uid(),
    name: "Alice"
  }, {
    id: uid(),
    name: "Bob"
  }, {
    id: uid(),
    name: "Priya"
  }, {
    id: uid(),
    name: "Rahul"
  }]));
  useEffect(() => save("fb-registry", registry), [registry]);

  // persisted tournament
  const [tName, setTName] = useState(() => load("fb-tname", ""));
  const [format, setFormat] = useState(() => load("fb-format", "Round Robin"));
  const [teams, setTeams] = useState(() => load("fb-teams", []));
  const [matches, setMatches] = useState(() => load("fb-matches", []));
  const [teamInputs, setTeamInputs] = useState(() => load("fb-tinputs", [{
    id: uid(),
    name: "",
    playerIds: [null, null]
  }, {
    id: uid(),
    name: "",
    playerIds: [null, null]
  }, {
    id: uid(),
    name: "",
    playerIds: [null, null]
  }, {
    id: uid(),
    name: "",
    playerIds: [null, null]
  }]));
  useEffect(() => save("fb-tname", tName), [tName]);
  useEffect(() => save("fb-format", format), [format]);
  useEffect(() => save("fb-teams", teams), [teams]);
  useEffect(() => save("fb-matches", matches), [matches]);
  useEffect(() => save("fb-tinputs", teamInputs), [teamInputs]);

  // quick match (session only)
  const [qm, setQm] = useState(null);

  // sledging (session only)
  const [sledgeMessages, setSledgeMessages] = useState([{
    id: uid(),
    sender: "Court",
    text: "Welcome to Live Sledging 🔥 Keep it spicy!",
    ts: Date.now() - 60000,
    system: true
  }]);

  // registry actions
  function addPlayer(name) {
    setRegistry(r => [...r, {
      id: uid(),
      name: name.trim()
    }]);
  }
  function removePlayer(id) {
    setRegistry(r => r.filter(p => p.id !== id));
  }
  function renamePlayer(id, name) {
    setRegistry(r => r.map(p => p.id === id ? {
      ...p,
      name
    } : p));
  }

  // team input actions
  function addTeamInput() {
    setTeamInputs(t => [...t, {
      id: uid(),
      name: "",
      playerIds: [null, null]
    }]);
  }
  function removeTeamInput(i) {
    setTeamInputs(t => t.filter((_, idx) => idx !== i));
  }
  function setTeamName(i, v) {
    setTeamInputs(t => t.map((tm, idx) => idx === i ? {
      ...tm,
      name: v
    } : tm));
  }
  function setTeamPlayer(ti, pi, pid) {
    setTeamInputs(t => t.map((tm, idx) => idx !== ti ? tm : {
      ...tm,
      playerIds: tm.playerIds.map((p, k) => k === pi ? pid : p)
    }));
  }
  function startTournament() {
    const valid = teamInputs.filter(t => t.name.trim() !== "");
    const ms = format === "Round Robin" ? generateRR(valid) : generateElim(valid);
    setTeams(valid);
    setMatches(ms);
    setScreen("tournament-main");
  }
  function resetTournament() {
    setTName("");
    setTeams([]);
    setMatches([]);
    setTeamInputs([{
      id: uid(),
      name: "",
      playerIds: [null, null]
    }, {
      id: uid(),
      name: "",
      playerIds: [null, null]
    }, {
      id: uid(),
      name: "",
      playerIds: [null, null]
    }, {
      id: uid(),
      name: "",
      playerIds: [null, null]
    }]);
    setScreen("tournament-setup");
  }

  // match actions
  function updMatch(id, fn) {
    setMatches(prev => prev.map(m => m.id === id ? fn(m) : m));
  }
  function adjustScore(id, si, team, d) {
    updMatch(id, m => ({
      ...m,
      sets: m.sets.map((s, i) => i !== si ? s : {
        ...s,
        [team === 1 ? "t1" : "t2"]: Math.max(0, s[team === 1 ? "t1" : "t2"] + d)
      })
    }));
  }
  function addSet(id) {
    updMatch(id, m => ({
      ...m,
      sets: [...m.sets, {
        t1: 0,
        t2: 0
      }]
    }));
  }
  function removeSet(id, si) {
    updMatch(id, m => ({
      ...m,
      sets: m.sets.filter((_, i) => i !== si)
    }));
  }
  function setMeta(id, f, v) {
    updMatch(id, m => ({
      ...m,
      [f]: v
    }));
  }
  function finalizeMatch(id) {
    updMatch(id, m => {
      let s1 = 0,
        s2 = 0;
      m.sets.forEach(s => {
        if (s.t1 > s.t2) s1++;else if (s.t2 > s.t1) s2++;
      });
      return {
        ...m,
        status: "completed",
        winner: s1 > s2 ? m.team1 : s2 > s1 ? m.team2 : null
      };
    });
    setMatchId(null);
  }
  function resetMatch(id) {
    updMatch(id, m => ({
      ...m,
      sets: [{
        t1: 0,
        t2: 0
      }],
      status: "upcoming",
      winner: null,
      date: "",
      time: ""
    }));
  }

  // quick match actions
  function startQuickMatch(p1, p2) {
    setQm({
      id: uid(),
      p1,
      p2,
      sets: [{
        t1: 0,
        t2: 0
      }],
      status: "live",
      winner: null
    });
    setScreen("quickmatch");
  }
  function qmAdjust(si, team, d) {
    setQm(q => ({
      ...q,
      sets: q.sets.map((s, i) => i !== si ? s : {
        ...s,
        [team === 1 ? "t1" : "t2"]: Math.max(0, s[team === 1 ? "t1" : "t2"] + d)
      })
    }));
  }
  function qmAddSet() {
    setQm(q => ({
      ...q,
      sets: [...q.sets, {
        t1: 0,
        t2: 0
      }]
    }));
  }
  function qmFinalize() {
    setQm(q => {
      let s1 = 0,
        s2 = 0;
      q.sets.forEach(s => {
        if (s.t1 > s.t2) s1++;else if (s.t2 > s.t1) s2++;
      });
      return {
        ...q,
        status: "done",
        winner: s1 > s2 ? q.p1 : s2 > s1 ? q.p2 : "Draw"
      };
    });
  }
  function goHome() {
    setScreen("home");
    setMatchId(null);
  }
  const matchInView = matchId ? matches.find(m => m.id === matchId) : null;
  return /*#__PURE__*/React.createElement("div", {
    style: Sty.page
  }, screen === "home" && /*#__PURE__*/React.createElement(HomeScreen, {
    onTournament: () => setScreen("tournament-setup"),
    onQuick: () => setScreen("quickmatch-setup"),
    onPlayers: () => setScreen("players"),
    hasTournament: teams.length > 0,
    onResumeTournament: () => setScreen("tournament-main"),
    tName: tName,
    teams: teams,
    matches: matches,
    registry: registry
  }), screen === "players" && /*#__PURE__*/React.createElement(PlayerRegistry, {
    registry: registry,
    onBack: goHome,
    onAdd: addPlayer,
    onRemove: removePlayer,
    onRename: renamePlayer
  }), screen === "quickmatch-setup" && /*#__PURE__*/React.createElement(QuickMatchSetup, {
    registry: registry,
    onBack: goHome,
    onStart: startQuickMatch
  }), screen === "quickmatch" && qm && /*#__PURE__*/React.createElement(QuickScorer, {
    qm: qm,
    onAdjust: qmAdjust,
    onAddSet: qmAddSet,
    onFinalize: qmFinalize,
    onNew: () => {
      setQm(null);
      setScreen("quickmatch-setup");
    },
    onBack: () => setScreen("quickmatch-setup")
  }), screen === "tournament-setup" && /*#__PURE__*/React.createElement(TournamentSetup, {
    tName: tName,
    setTName: setTName,
    format: format,
    setFormat: setFormat,
    teamInputs: teamInputs,
    registry: registry,
    addTeamInput: addTeamInput,
    removeTeamInput: removeTeamInput,
    setTeamName: setTeamName,
    setTeamPlayer: setTeamPlayer,
    onBack: goHome,
    onStart: startTournament
  }), screen === "tournament-main" && !matchInView && /*#__PURE__*/React.createElement(TournamentMain, {
    tName: tName,
    format: format,
    teams: teams,
    matches: matches,
    setMeta: setMeta,
    messages: sledgeMessages,
    setMessages: setSledgeMessages,
    registry: registry,
    onHome: goHome,
    onNewTournament: resetTournament,
    onOpenMatch: id => setMatchId(id)
  }), screen === "tournament-main" && matchInView && /*#__PURE__*/React.createElement(MatchScorer, {
    m: matchInView,
    teams: teams,
    registry: registry,
    onAdjust: adjustScore,
    onAddSet: addSet,
    onRemoveSet: removeSet,
    onMeta: setMeta,
    onFinalize: finalizeMatch,
    onReset: resetMatch,
    onBack: () => setMatchId(null)
  }));
}

// ════════ HOME SCREEN ════════════════════════════════════════════
function HomeScreen({
  onTournament,
  onQuick,
  onPlayers,
  hasTournament,
  onResumeTournament,
  tName,
  teams,
  matches,
  registry
}) {
  const AG = P.accentG;
  // Compute live match data for home screen
  const liveMatch = matches && matches.find(m => m.status === "live");
  const completedMatches = matches ? matches.filter(m => m.status === "completed") : [];
  const upcomingMatches = matches ? matches.filter(m => m.status === "upcoming") : [];
  // Standings: wins per team
  const standings = teams ? teams.map(t => {
    const wins = completedMatches.filter(m => m.winner === t.id).length;
    const played = completedMatches.filter(m => m.team1 === t.id || m.team2 === t.id).length;
    return { ...t, wins, played };
  }).sort((a,b) => b.wins - a.wins).slice(0,3) : [];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      background: P.bg0,
      fontFamily: F,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 20px",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "12%",
      left: "10%",
      width: 240,
      height: 240,
      borderRadius: "50%",
      background: "rgba(109,40,217,.22)",
      filter: "blur(70px)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: "18%",
      right: "8%",
      width: 180,
      height: 180,
      borderRadius: "50%",
      background: "rgba(236,72,153,.14)",
      filter: "blur(55px)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "72",
    height: "72",
    viewBox: "0 0 72 72",
    fill: "none"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "sG",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#6d28d9"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "50%",
    stopColor: "#a855f7"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#ec4899"
  }))), /*#__PURE__*/React.createElement("ellipse", {
    cx: "36",
    cy: "58",
    rx: "9",
    ry: "5",
    fill: "url(#sG)",
    opacity: "0.9"
  }), [-20, -10, 0, 10, 20].map((dx, i) => /*#__PURE__*/React.createElement("line", {
    key: i,
    x1: 36 + dx * 0.25,
    y1: 53,
    x2: 36 + dx,
    y2: 12,
    stroke: "url(#sG)",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    opacity: 0.3 + i * 0.15
  })), /*#__PURE__*/React.createElement("ellipse", {
    cx: "36",
    cy: "13",
    rx: "21",
    ry: "5.5",
    fill: "none",
    stroke: "url(#sG)",
    strokeWidth: "1.8",
    opacity: "0.75"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 44,
      fontWeight: 900,
      letterSpacing: "-2.5px",
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.white
    }
  }, "Flip"), /*#__PURE__*/React.createElement("span", {
    style: {
      background: AG,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent"
    }
  }, "Bad")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 9,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: "#a78bfa"
    }
  }, "FS Badminton Baddies")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 1,
      background: `linear-gradient(90deg,transparent,${P.accent},transparent)`,
      margin: "20px 0 26px"
    }
  }),
  hasTournament && matches && matches.length > 0 && /*#__PURE__*/React.createElement("div", {
    style:{width:"100%",maxWidth:310,marginBottom:16,marginTop:4,background:"rgba(109,40,217,.13)",border:"1px solid rgba(168,85,247,.25)",borderRadius:14,padding:"14px 16px"}
  },
    /*#__PURE__*/React.createElement("div", {style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}},
      /*#__PURE__*/React.createElement("span", {style:{color:"#a855f7",fontWeight:700,fontSize:13}}, "🏆 ", tName || "Tournament"),
      liveMatch && /*#__PURE__*/React.createElement("span", {style:{background:"rgba(236,72,153,.2)",color:"#f472b6",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99}}, "🔴 LIVE")
    ),
    liveMatch && teams && /*#__PURE__*/React.createElement("div", {style:{background:"rgba(236,72,153,.08)",borderRadius:10,padding:"10px 12px",marginBottom:8}},
      /*#__PURE__*/React.createElement("div", {style:{fontSize:10,color:"#a78bfa",fontWeight:700,marginBottom:5,letterSpacing:".05em"}}, "LIVE NOW"),
      /*#__PURE__*/React.createElement("div", {style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}},
        /*#__PURE__*/React.createElement("span", {style:{color:"#fff",fontWeight:700,fontSize:12,flex:1}}, (teams.find(t=>t.id===liveMatch.team1)||{}).name||"Team 1"),
        /*#__PURE__*/React.createElement("span", {style:{color:"#ec4899",fontWeight:900,fontSize:15,padding:"0 6px"}},
          (liveMatch.sets||[]).reduce((a,s)=>a+(s.t1>s.t2?1:0),0)," — ",(liveMatch.sets||[]).reduce((a,s)=>a+(s.t2>s.t1?1:0),0)),
        /*#__PURE__*/React.createElement("span", {style:{color:"#fff",fontWeight:700,fontSize:12,flex:1,textAlign:"right"}}, (teams.find(t=>t.id===liveMatch.team2)||{}).name||"Team 2")
      )
    ),
    standings.length > 0 && /*#__PURE__*/React.createElement("div", null,
      /*#__PURE__*/React.createElement("div", {style:{fontSize:10,color:"#7c3aed",fontWeight:700,letterSpacing:".07em",marginBottom:5}}, "STANDINGS"),
      standings.map((t,i) => /*#__PURE__*/React.createElement("div", {
        key:t.id,style:{display:"flex",alignItems:"center",gap:6,padding:"3px 0",borderBottom:i<standings.length-1?"1px solid rgba(168,85,247,.1)":"none"}
      },
        /*#__PURE__*/React.createElement("span", {style:{fontSize:11,width:18}}, i===0?"🥇":i===1?"🥈":"🥉"),
        /*#__PURE__*/React.createElement("span", {style:{color:"#e9d5ff",fontSize:12,flex:1}}, t.name),
        /*#__PURE__*/React.createElement("span", {style:{color:"#a855f7",fontSize:11,fontWeight:700}}, t.wins,"W")
      ))
    ),
    /*#__PURE__*/React.createElement("div", {style:{fontSize:10,color:"rgba(167,139,250,.45)",marginTop:6}},
      completedMatches.length," / ",matches.length," matches done")
  ),
  /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 310,
      display: "flex",
      flexDirection: "column",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onTournament,
    style: {
      background: AG,
      color: "#fff",
      fontWeight: 800,
      fontSize: 14,
      border: "none",
      borderRadius: 13,
      padding: "17px 20px",
      cursor: "pointer",
      fontFamily: F,
      display: "flex",
      alignItems: "center",
      gap: 12,
      textAlign: "left",
      boxShadow: "0 4px 28px rgba(168,85,247,.42)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22,
      flexShrink: 0
    }
  }, "🏆"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800
    }
  }, "Create Tournament"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 400,
      opacity: 0.72,
      marginTop: 2
    }
  }, "Bracket · rankings · calendar"))), hasTournament && /*#__PURE__*/React.createElement("button", {
    onClick: onResumeTournament,
    style: {
      background: "rgba(168,85,247,.1)",
      color: P.accentL,
      fontWeight: 700,
      fontSize: 14,
      border: `1px solid rgba(168,85,247,.35)`,
      borderRadius: 13,
      padding: "14px 20px",
      cursor: "pointer",
      fontFamily: F,
      display: "flex",
      alignItems: "center",
      gap: 12,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22,
      flexShrink: 0
    }
  }, "▶"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700
    }
  }, "Resume Tournament"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 400,
      opacity: .65,
      marginTop: 2
    }
  }, "Continue where you left off"))), /*#__PURE__*/React.createElement(HomePillBtn, {
    onClick: onQuick,
    icon: "🏸",
    label: "Quick Match",
    sub: "Score only · no rankings"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: onPlayers,
    style: {
      marginTop: 26,
      background: "transparent",
      border: "none",
      color: "#6b21a8",
      fontSize: 11,
      cursor: "pointer",
      fontFamily: F,
      letterSpacing: "0.04em",
      display: "flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13
    }
  }, "👤"), " Manage Player Registry"));
}
function HomePillBtn({
  onClick,
  icon,
  label,
  sub
}) {
  const [active, setActive] = useState(false);
  function handle() {
    setActive(true);
    setTimeout(() => {
      setActive(false);
      onClick();
    }, 160);
  }
  return /*#__PURE__*/React.createElement("button", {
    onClick: handle,
    style: {
      background: active ? P.accentG : "rgba(168,85,247,.07)",
      color: active ? "#fff" : P.white,
      fontWeight: active ? 800 : 600,
      border: active ? "none" : `1px solid rgba(168,85,247,.28)`,
      borderRadius: 13,
      padding: "17px 20px",
      cursor: "pointer",
      fontFamily: F,
      display: "flex",
      alignItems: "center",
      gap: 12,
      textAlign: "left",
      width: "100%",
      transition: "all .12s ease"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22,
      flexShrink: 0
    }
  }, icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: active ? 800 : 600
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 400,
      opacity: .65,
      marginTop: 2,
      color: active ? "rgba(255,255,255,.8)" : P.sub
    }
  }, sub)));
}

// ════════ PLAYER REGISTRY ════════════════════════════════════════
function PlayerRegistry({
  registry,
  onBack,
  onAdd,
  onRemove,
  onRename
}) {
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");
  function submit() {
    if (newName.trim()) {
      onAdd(newName);
      setNewName("");
    }
  }
  return /*#__PURE__*/React.createElement("div", {
    style: Sty.page
  }, /*#__PURE__*/React.createElement("div", {
    style: Sty.wrap
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "Player Registry",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: Sty.card
  }, /*#__PURE__*/React.createElement("label", {
    style: Sty.label
  }, "Add Player"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    style: {
      ...Sty.input,
      flex: 1
    },
    placeholder: "Player name",
    value: newName,
    onChange: e => setNewName(e.target.value),
    onKeyDown: e => e.key === "Enter" && submit()
  }), /*#__PURE__*/React.createElement("button", {
    onClick: submit,
    style: Sty.ghostV
  }, "Add"))), /*#__PURE__*/React.createElement("div", {
    style: Sty.card
  }, /*#__PURE__*/React.createElement("label", {
    style: Sty.label
  }, "All Players (", registry.length, ")"), registry.length === 0 && /*#__PURE__*/React.createElement("p", {
    style: {
      color: P.dim,
      fontSize: 13
    }
  }, "No players yet."), registry.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 0",
      borderBottom: `1px solid ${P.borderB}`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15
    }
  }, "👤"), editing === p.id ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    style: {
      ...Sty.input,
      flex: 1,
      fontSize: 13,
      padding: "6px 10px"
    },
    value: editVal,
    autoFocus: true,
    onChange: e => setEditVal(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") {
        onRename(p.id, editVal);
        setEditing(null);
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onRename(p.id, editVal);
      setEditing(null);
    },
    style: {
      ...Sty.ghostV,
      fontSize: 11,
      padding: "5px 10px"
    }
  }, "Save"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditing(null),
    style: {
      ...Sty.ghost,
      fontSize: 11,
      padding: "5px 10px"
    }
  }, "✕")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.white,
      fontSize: 14,
      flex: 1,
      fontWeight: 500
    }
  }, p.name), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setEditing(p.id);
      setEditVal(p.name);
    },
    style: {
      background: "transparent",
      border: "none",
      color: P.dim,
      cursor: "pointer",
      fontSize: 12
    }
  }, "Edit"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onRemove(p.id),
    style: {
      background: "transparent",
      border: "none",
      color: P.red,
      cursor: "pointer",
      fontSize: 14
    }
  }, "✕")))))));
}

// ════════ PLAYER DROPDOWN ════════════════════════════════════════
function PlayerDropdown({
  value,
  onChange,
  registry,
  exclude = [],
  placeholder = "Select player"
}) {
  const [open, setOpen] = useState(false);
  const [dropRect, setDropRect] = useState(null);
  const ref = useRef();
  const btnRef = useRef();
  useEffect(() => {
    function click(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);
  const selected = registry.find(p => p.id === value);
  const options = registry.filter(p => !exclude.includes(p.id) || p.id === value);
  function toggleOpen() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropRect(r);
    }
    setOpen(o => !o);
  }
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("button", {
    ref: btnRef,
    onClick: toggleOpen,
    style: {
      ...Sty.input,
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "9px 12px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: selected ? P.white : P.dim,
      fontSize: 13
    }
  }, selected ? `👤 ${selected.name}` : placeholder), /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.dim,
      fontSize: 10
    }
  }, open ? "▲" : "▼")), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      top: dropRect ? dropRect.bottom + 4 : 0,
      left: dropRect ? dropRect.left : 0,
      width: dropRect ? dropRect.width : "auto",
      zIndex: 9999,
      background: P.bg2,
      border: `1px solid ${P.border}`,
      borderRadius: 10,
      boxShadow: "0 8px 32px rgba(0,0,0,.7)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => {
      onChange(null);
      setOpen(false);
    },
    style: {
      padding: "9px 12px",
      color: P.sub,
      fontSize: 13,
      cursor: "pointer",
      borderBottom: `1px solid ${P.borderB}`
    }
  }, "— None —"), options.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    onClick: () => {
      onChange(p.id);
      setOpen(false);
    },
    style: {
      padding: "9px 12px",
      color: p.id === value ? P.accentL : P.white,
      fontSize: 13,
      cursor: "pointer",
      fontWeight: p.id === value ? 700 : 400,
      background: p.id === value ? P.accentBg : "transparent"
    }
  }, "👤 ", p.name))));
}

// ════════ QUICK MATCH SETUP ══════════════════════════════════════
function QuickMatchSetup({
  registry,
  onBack,
  onStart
}) {
  const [p1, setP1] = useState(null);
  const [p2, setP2] = useState(null);
  const [c1, setC1] = useState("");
  const [c2, setC2] = useState("");
  const [u1, setU1] = useState(true);
  const [u2, setU2] = useState(true);
  const n1 = u1 ? registry.find(p => p.id === p1)?.name || "" : c1;
  const n2 = u2 ? registry.find(p => p.id === p2)?.name || "" : c2;
  const ready = n1.trim() && n2.trim() && n1 !== n2;
  return /*#__PURE__*/React.createElement("div", {
    style: Sty.page
  }, /*#__PURE__*/React.createElement("div", {
    style: Sty.wrap
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "Quick Match",
    sub: "Score only · no rankings",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: Sty.card
  }, [1, 2].map(side => {
    const ur = side === 1 ? u1 : u2,
      setUr = side === 1 ? setU1 : setU2;
    const pid = side === 1 ? p1 : p2,
      setPid = side === 1 ? setP1 : setP2;
    const cv = side === 1 ? c1 : c2,
      setCv = side === 1 ? setC1 : setC2;
    const other = side === 1 ? p2 : p1;
    return /*#__PURE__*/React.createElement("div", {
      key: side,
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("label", {
      style: Sty.label
    }, "Player ", side), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginBottom: 6
      }
    }, ["From Registry", "Custom Name"].map((lbl, idx) => /*#__PURE__*/React.createElement("button", {
      key: lbl,
      onClick: () => setUr(idx === 0),
      style: {
        ...Sty.ghost,
        fontSize: 11,
        padding: "4px 10px",
        ...(ur === (idx === 0) ? {
          border: "1px solid rgba(168,85,247,.18)",
          color: P.accentL,
          background: P.accentBg
        } : {})
      }
    }, lbl))), ur ? /*#__PURE__*/React.createElement(PlayerDropdown, {
      value: pid,
      onChange: setPid,
      registry: registry,
      exclude: [other],
      placeholder: `Choose Player ${side}`
    }) : /*#__PURE__*/React.createElement("input", {
      style: Sty.input,
      placeholder: `Player ${side} name`,
      value: cv,
      onChange: e => setCv(e.target.value)
    }));
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      ...Sty.heroBtn,
      opacity: ready ? .95 : .4,
      marginTop: 4
    },
    disabled: !ready,
    onClick: () => onStart(n1.trim(), n2.trim())
  }, "Start Match →"))));
}

// ════════ QUICK SCORER ════════════════════════════════════════════
function QuickScorer({
  qm,
  onAdjust,
  onAddSet,
  onFinalize,
  onNew,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: Sty.page
  }, /*#__PURE__*/React.createElement("div", {
    style: Sty.wrap
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "Live Match",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...Sty.card,
      textAlign: "center",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: P.white,
      fontWeight: 800,
      fontSize: 17,
      textAlign: "left"
    }
  }, qm.p1), /*#__PURE__*/React.createElement("div", {
    style: {
      color: P.dim,
      fontWeight: 700,
      fontSize: 11
    }
  }, "VS"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: P.white,
      fontWeight: 800,
      fontSize: 17,
      textAlign: "right"
    }
  }, qm.p2)), qm.status === "done" && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(255,255,255,.05)",
      border: "1px solid rgba(168,85,247,.17)",
      borderRadius: 8,
      padding: "10px",
      color: P.accent,
      fontWeight: 700,
      fontSize: 15,
      marginTop: 10
    }
  }, "🏆 ", qm.winner === "Draw" ? "It's a Draw!" : qm.winner + " wins!")), qm.sets.map((s, si) => /*#__PURE__*/React.createElement("div", {
    key: si,
    style: {
      ...Sty.card,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: P.dim,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1.2,
      marginBottom: 12
    }
  }, "SET ", si + 1), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around"
    }
  }, /*#__PURE__*/React.createElement(ScoreCtrl, {
    label: qm.p1,
    score: s.t1,
    onMinus: () => onAdjust(si, 1, -1),
    onPlus: () => onAdjust(si, 1, 1),
    disabled: qm.status === "done"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.dim,
      fontSize: 26,
      paddingBottom: 2
    }
  }, ":"), /*#__PURE__*/React.createElement(ScoreCtrl, {
    label: qm.p2,
    score: s.t2,
    onMinus: () => onAdjust(si, 2, -1),
    onPlus: () => onAdjust(si, 2, 1),
    disabled: qm.status === "done"
  })))), qm.status !== "done" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...Sty.ghost,
      flex: 1
    },
    onClick: onAddSet
  }, "+ Add Set"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...Sty.heroBtn,
      flex: 2
    },
    onClick: onFinalize
  }, "Finalize")), qm.status === "done" && /*#__PURE__*/React.createElement("button", {
    style: Sty.heroBtn,
    onClick: onNew
  }, "New Match")));
}

// ════════ TOURNAMENT SETUP ════════════════════════════════════════
function TournamentSetup({
  tName,
  setTName,
  format,
  setFormat,
  teamInputs,
  registry,
  addTeamInput,
  removeTeamInput,
  setTeamName,
  setTeamPlayer,
  onBack,
  onStart
}) {
  const valid = teamInputs.filter(t => t.name.trim() !== "");
  const [expandIdx, setExpandIdx] = useState(null);
  return /*#__PURE__*/React.createElement("div", {
    style: Sty.page
  }, /*#__PURE__*/React.createElement("div", {
    style: Sty.wrap
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "New Tournament",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: Sty.card
  }, /*#__PURE__*/React.createElement("label", {
    style: Sty.label
  }, "Tournament Name"), /*#__PURE__*/React.createElement("input", {
    style: Sty.input,
    placeholder: "e.g. FS Baddies Summer Cup",
    value: tName,
    onChange: e => setTName(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 14
    }
  }), /*#__PURE__*/React.createElement("label", {
    style: Sty.label
  }, "Format"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, ["Round Robin", "Single Elimination"].map(f => /*#__PURE__*/React.createElement("button", {
    key: f,
    onClick: () => setFormat(f),
    style: {
      ...Sty.ghost,
      ...(format === f ? {
        border: "1px solid rgba(168,85,247,.18)",
        color: P.accentL,
        background: P.accentBg
      } : {})
    }
  }, f)))), /*#__PURE__*/React.createElement("div", {
    style: Sty.card
  }, /*#__PURE__*/React.createElement("label", {
    style: Sty.label
  }, "Teams ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.dim,
      fontWeight: 400
    }
  }, "(2–8)")), teamInputs.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    style: {
      background: "rgba(236,72,153,.1)",
      border: `1px solid ${P.borderB}`,
      borderRadius: 10,
      overflow: "visible",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 12px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.dim,
      fontSize: 11,
      width: 16,
      flexShrink: 0
    }
  }, i + 1), /*#__PURE__*/React.createElement("input", {
    style: {
      ...Sty.input,
      flex: 1,
      fontSize: 13
    },
    placeholder: `Team ${i + 1} name`,
    value: t.name,
    onChange: e => setTeamName(i, e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setExpandIdx(expandIdx === i ? null : i),
    style: {
      ...Sty.ghost,
      fontSize: 10,
      padding: "4px 9px",
      flexShrink: 0
    }
  }, expandIdx === i ? "▲" : "▼"), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeTeamInput(i),
    style: {
      background: "transparent",
      border: "none",
      color: P.red,
      cursor: "pointer",
      fontSize: 16,
      flexShrink: 0
    }
  }, "✕")), expandIdx === i && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 12px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, t.playerIds.map((pid, pi) => /*#__PURE__*/React.createElement("div", {
    key: pi
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      ...Sty.label,
      marginBottom: 4
    }
  }, "Player ", pi + 1), /*#__PURE__*/React.createElement(PlayerDropdown, {
    value: pid,
    onChange: newPid => setTeamPlayer(i, pi, newPid),
    registry: registry,
    exclude: t.playerIds.filter((_, k) => k !== pi),
    placeholder: `Select Player ${pi + 1}`
  })))))), teamInputs.length < 8 && /*#__PURE__*/React.createElement("button", {
    style: Sty.ghostV,
    onClick: addTeamInput
  }, "+ Add Team")), /*#__PURE__*/React.createElement("button", {
    style: {
      ...Sty.heroBtn,
      opacity: valid.length < 2 ? .4 : 1
    },
    disabled: valid.length < 2,
    onClick: onStart
  }, "Generate Schedule →")));
}

// ════════ TOURNAMENT MAIN ════════════════════════════════════════
function TournamentMain({
  tName,
  format,
  teams,
  matches,
  setMeta,
  messages,
  setMessages,
  registry,
  onHome,
  onNewTournament,
  onOpenMatch
}) {
  const [tab, setTab] = useState("matches");
  const upcoming = matches.filter(m => m.status === "upcoming");
  const completed = matches.filter(m => m.status === "completed");
  const ptTable = useMemo(() => computePoints(teams, matches), [teams, matches]);
  const sorted = useMemo(() => [...teams].sort((a, b) => {
    const pa = ptTable[a.name],
      pb = ptTable[b.name];
    if (pb.pts !== pa.pts) return pb.pts - pa.pts;
    return pb.sw - pb.sl - (pa.sw - pa.sl);
  }), [teams, ptTable]);
  return /*#__PURE__*/React.createElement("div", {
    style: Sty.page
  }, /*#__PURE__*/React.createElement("div", {
    style: Sty.wrap
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "22px 0 4px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 2,
      color: P.accent
    }
  }, "Tournament"), /*#__PURE__*/React.createElement("h2", {
    style: {
      color: P.white,
      fontSize: 20,
      fontWeight: 800,
      margin: 0
    }
  }, tName || "Untitled")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onNewTournament,
    style: {
      ...Sty.ghost,
      fontSize: 11,
      padding: "5px 11px"
    }
  }, "New"), /*#__PURE__*/React.createElement("button", {
    onClick: onHome,
    style: {
      ...Sty.ghost,
      fontSize: 11,
      padding: "5px 11px"
    }
  }, "← Home"))), /*#__PURE__*/React.createElement("div", {
    style: {
      color: P.sub,
      fontSize: 12,
      marginBottom: 14
    }
  }, format, " · ", teams.length, " teams"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      overflowX: "auto",
      borderBottom: `1px solid ${P.borderB}`,
      marginBottom: 14
    }
  }, [["matches", "Matches"], ["table", "Leaderboard"], ["calendar", "Calendar"], ["sledge", "🔥 Sledging"]].map(([k, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setTab(k),
    style: {
      background: "transparent",
      border: "none",
      flexShrink: 0,
      borderBottom: tab === k ? "2px solid #a855f7" : "2px solid transparent",
      color: tab === k ? "#ec4899" : P.dim,
      padding: "9px 14px",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      fontFamily: F
    }
  }, lbl))), tab === "matches" && /*#__PURE__*/React.createElement(React.Fragment, null, upcoming.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    style: Sty.sec
  }, "Upcoming"), upcoming.map(m => /*#__PURE__*/React.createElement(MatchCard, {
    key: m.id,
    m: m,
    teams: teams,
    registry: registry,
    onClick: () => onOpenMatch(m.id)
  }))), completed.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    style: Sty.sec
  }, "Completed"), completed.map(m => /*#__PURE__*/React.createElement(MatchCard, {
    key: m.id,
    m: m,
    teams: teams,
    registry: registry,
    onClick: () => onOpenMatch(m.id)
  }))), matches.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "40px 0",
      color: P.dim,
      fontSize: 13
    }
  }, "No matches yet.")), tab === "table" && /*#__PURE__*/React.createElement(Leaderboard, {
    sorted: sorted,
    ptTable: ptTable,
    teams: teams,
    registry: registry
  }), tab === "calendar" && /*#__PURE__*/React.createElement(CalendarView, {
    matches: matches,
    setMeta: setMeta,
    onMatchClick: onOpenMatch
  }), tab === "sledge" && /*#__PURE__*/React.createElement(LiveSledging, {
    messages: messages,
    setMessages: setMessages,
    registry: registry
  })));
}

// ════════ MATCH CARD ════════════════════════════════════════════
function MatchCard({
  m,
  teams,
  registry,
  onClick
}) {
  const sets = m.sets.map(s => `${s.t1}–${s.t2}`).join(", ");
  const dateStr = m.date ? new Date(m.date + "T00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short"
  }) : null;
  function players(tname) {
    const t = teams.find(t => t.name === tname);
    if (!t) return "";
    return t.playerIds.map(id => registry.find(p => p.id === id)?.name).filter(Boolean).join(" / ");
  }
  const p1s = players(m.team1),
    p2s = players(m.team2);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      background: P.bg1,
      border: `1px solid ${P.border}`,
      borderRadius: 12,
      padding: "12px 14px",
      marginBottom: 8,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.white,
      fontWeight: 700,
      fontSize: 14,
      flex: 1
    }
  }, m.team1), /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.dim,
      fontSize: 10
    }
  }, "vs"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.white,
      fontWeight: 700,
      fontSize: 14,
      flex: 1,
      textAlign: "right"
    }
  }, m.team2), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      borderRadius: 4,
      padding: "2px 8px",
      fontWeight: 700,
      marginLeft: 4,
      flexShrink: 0,
      background: m.status === "completed" ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.05)",
      color: m.status === "completed" ? P.green : P.accent
    }
  }, m.status === "completed" ? "Done" : "Soon")), (p1s || p2s) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.dim,
      fontSize: 10
    }
  }, p1s), /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.dim,
      fontSize: 10,
      textAlign: "right"
    }
  }, p2s)), m.status === "completed" && /*#__PURE__*/React.createElement("div", {
    style: {
      color: P.sub,
      fontSize: 11,
      marginBottom: 2
    }
  }, "🏆 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.accent,
      fontWeight: 600
    }
  }, m.winner || "Draw"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.dim,
      marginLeft: 8
    }
  }, "Sets: ", sets)), (dateStr || m.time) && /*#__PURE__*/React.createElement("div", {
    style: {
      color: P.dim,
      fontSize: 10
    }
  }, dateStr && `📅 ${dateStr}`, m.time && `  🕐 ${m.time}`));
}

// ════════ MATCH SCORER ════════════════════════════════════════════
function MatchScorer({
  m,
  teams,
  registry,
  onAdjust,
  onAddSet,
  onRemoveSet,
  onMeta,
  onFinalize,
  onReset,
  onBack
}) {
  const t1obj = teams.find(t => t.name === m.team1);
  const t2obj = teams.find(t => t.name === m.team2);
  function pname(team, idx) {
    const pid = team?.playerIds?.[idx];
    return pid ? registry.find(p => p.id === pid)?.name || null : null;
  }
  return /*#__PURE__*/React.createElement("div", {
    style: Sty.page
  }, /*#__PURE__*/React.createElement("div", {
    style: Sty.wrap
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: `${m.team1} vs ${m.team2}`,
    sub: m.round,
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...Sty.card,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      gap: 10,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: P.white,
      fontWeight: 800,
      fontSize: 16,
      marginBottom: 3
    }
  }, m.team1), [0, 1].map(i => pname(t1obj, i) && /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      color: P.sub,
      fontSize: 11
    }
  }, "👤 ", pname(t1obj, i)))), /*#__PURE__*/React.createElement("div", {
    style: {
      color: P.dim,
      fontWeight: 700,
      fontSize: 11,
      paddingTop: 4
    }
  }, "VS"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: P.white,
      fontWeight: 800,
      fontSize: 16,
      marginBottom: 3
    }
  }, m.team2), [0, 1].map(i => pname(t2obj, i) && /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      color: P.sub,
      fontSize: 11,
      textAlign: "right"
    }
  }, "👤 ", pname(t2obj, i)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 10
    }
  }, [["date", "📅 Date", "date"], ["time", "🕐 Time", "time"]].map(([f, lbl, type]) => /*#__PURE__*/React.createElement("div", {
    key: f,
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: Sty.label
  }, lbl), /*#__PURE__*/React.createElement("input", {
    type: type,
    style: {
      ...Sty.input,
      fontSize: 12
    },
    value: m[f],
    onChange: e => onMeta(m.id, f, e.target.value),
    disabled: m.status === "completed"
  })))), m.sets.map((s, si) => /*#__PURE__*/React.createElement("div", {
    key: si,
    style: {
      ...Sty.card,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.sub,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1.2
    }
  }, "SET ", si + 1), m.status !== "completed" && m.sets.length > 1 && /*#__PURE__*/React.createElement("button", {
    style: {
      background: "transparent",
      border: "none",
      color: P.red,
      cursor: "pointer",
      fontSize: 13
    },
    onClick: () => onRemoveSet(m.id, si)
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around"
    }
  }, /*#__PURE__*/React.createElement(ScoreCtrl, {
    label: m.team1,
    score: s.t1,
    onMinus: () => onAdjust(m.id, si, 1, -1),
    onPlus: () => onAdjust(m.id, si, 1, 1),
    disabled: m.status === "completed"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.dim,
      fontSize: 26,
      paddingBottom: 2
    }
  }, ":"), /*#__PURE__*/React.createElement(ScoreCtrl, {
    label: m.team2,
    score: s.t2,
    onMinus: () => onAdjust(m.id, si, 2, -1),
    onPlus: () => onAdjust(m.id, si, 2, 1),
    disabled: m.status === "completed"
  })))), m.status !== "completed" && /*#__PURE__*/React.createElement("button", {
    style: {
      ...Sty.ghost,
      marginBottom: 10
    },
    onClick: () => onAddSet(m.id)
  }, "+ Add Set"), m.status === "completed" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(168,85,247,.15)",
      border: "1px solid rgba(168,85,247,.15)",
      borderRadius: 10,
      padding: "12px",
      textAlign: "center",
      color: P.white,
      marginTop: 4
    }
  }, "🏆 Winner: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: P.accent
    }
  }, m.winner || "Draw")), /*#__PURE__*/React.createElement("button", {
    style: {
      ...Sty.ghost,
      marginTop: 10,
      width: "100%",
      textAlign: "center"
    },
    onClick: () => onReset(m.id)
  }, "Reset Match")) : /*#__PURE__*/React.createElement("button", {
    style: Sty.heroBtn,
    onClick: () => onFinalize(m.id)
  }, "Finalize Result")));
}

// ════════ LEADERBOARD ════════════════════════════════════════════
function Leaderboard({
  sorted,
  ptTable,
  teams,
  registry
}) {
  function players(t) {
    return t.playerIds.map(id => registry.find(p => p.id === id)?.name).filter(Boolean).join(" / ") || null;
  }
  const maxPts = Math.max(...sorted.map(t => ptTable[t.name].pts), 1);
  const podium = sorted.slice(0, Math.min(3, sorted.length));
  const rest = sorted.slice(3);
  const completed = sorted.map(t => ptTable[t.name]).reduce((a, r) => a + r.played, 0) / 2;
  if (sorted.length === 0) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "40px 0",
      color: P.dim,
      fontSize: 13
    }
  }, "No teams yet.");
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "linear-gradient(135deg,rgba(168,85,247,.15),rgba(200,168,75,.06))",
      border: `1px solid ${P.border}`,
      borderRadius: 14,
      padding: "16px 18px",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: P.sub,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 3
    }
  }, "Season Standing"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: P.white,
      fontWeight: 800,
      fontSize: 18
    }
  }, sorted.length, " Teams · ", Math.round(completed), " Matches played")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32
    }
  }, "🏅")), podium.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 8,
      marginBottom: 20,
      padding: "0 4px"
    }
  }, [podium[1], podium[0], podium[2]].map((t, vi) => {
    if (!t) return /*#__PURE__*/React.createElement("div", {
      key: vi,
      style: {
        flex: 1
      }
    });
    const rank = vi === 1 ? 0 : vi === 0 ? 1 : 2;
    const r = ptTable[t.name];
    const heights = [110, 136, 90];
    const isFirst = rank === 0;
    return /*#__PURE__*/React.createElement("div", {
      key: t.name,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }
    }, isFirst && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        marginBottom: 4
      }
    }, "👑"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: P.white,
        fontWeight: 800,
        fontSize: isFirst ? 14 : 12,
        textAlign: "center",
        marginBottom: 4,
        maxWidth: 80,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, t.name), players(t) && /*#__PURE__*/React.createElement("div", {
      style: {
        color: P.sub,
        fontSize: 9,
        textAlign: "center",
        marginBottom: 4,
        maxWidth: 80,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, players(t)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: isFirst ? 13 : 11,
        fontWeight: 800,
        marginBottom: 6,
        background: RANK_GRADIENTS[rank],
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      }
    }, r.pts, " PTS"), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        height: heights[rank],
        background: `linear-gradient(180deg,${rank === 0 ? "rgba(251,191,36,.25)" : rank === 1 ? "rgba(203,213,225,.12)" : "rgba(168,85,247,.17)"},transparent)`,
        border: `1px solid ${rank === 0 ? "rgba(251,191,36,.35)" : rank === 1 ? "rgba(203,213,225,.2)" : "rgba(168,85,247,.2)"}`,
        borderBottom: "none",
        borderRadius: "8px 8px 0 0",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: isFirst ? 28 : 22
      }
    }, MEDALS[rank])));
  })), rest.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: P.bg1,
      border: `1px solid ${P.border}`,
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 12
    }
  }, rest.map((t, i) => {
    const rank = i + 3;
    const r = ptTable[t.name];
    const pct = maxPts > 0 ? r.pts / maxPts * 100 : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: t.name,
      style: {
        padding: "12px 16px",
        borderBottom: i < rest.length - 1 ? `1px solid ${P.borderB}` : "none",
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 26,
        height: 26,
        borderRadius: 8,
        background: P.bg3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: P.sub,
        fontWeight: 700,
        fontSize: 12,
        flexShrink: 0
      }
    }, rank), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: P.white,
        fontWeight: 700,
        fontSize: 13,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, t.name), players(t) && /*#__PURE__*/React.createElement("div", {
      style: {
        color: P.dim,
        fontSize: 10,
        marginTop: 1
      }
    }, players(t)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 5,
        height: 3,
        background: "rgba(168,85,247,.15)",
        borderRadius: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${pct}%`,
        height: "100%",
        borderRadius: 2,
        background: P.accentG,
        transition: "width .4s"
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: P.accent,
        fontWeight: 800,
        fontSize: 16
      }
    }, r.pts), /*#__PURE__*/React.createElement("div", {
      style: {
        color: P.dim,
        fontSize: 9,
        letterSpacing: .5
      }
    }, "PTS")));
  })), /*#__PURE__*/React.createElement("p", {
    style: Sty.sec
  }, "Full Stats"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      marginBottom: 4
    }
  }, sorted.map((t, idx) => {
    const r = ptTable[t.name];
    const wr = r.played > 0 ? Math.round(r.won / r.played * 100) : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: t.name,
      style: {
        background: P.bg1,
        border: `1px solid ${idx < 3 ? "rgba(168,85,247,.17)" : P.borderB}`,
        borderRadius: 14,
        padding: "14px 14px 12px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16
      }
    }, idx < 3 ? MEDALS[idx] : ""), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: P.white,
        fontWeight: 700,
        fontSize: 12,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, t.name), players(t) && /*#__PURE__*/React.createElement("div", {
      style: {
        color: P.dim,
        fontSize: 9
      }
    }, players(t)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "center",
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        width: 64,
        height: 32,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        bottom: 0,
        left: 0,
        width: 64,
        height: 64,
        borderRadius: "50%",
        border: "5px solid rgba(255,255,255,.05)",
        boxSizing: "border-box"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        bottom: 0,
        left: 0,
        width: 64,
        height: 64,
        borderRadius: "50%",
        border: "5px solid transparent",
        boxSizing: "border-box",
        borderTopColor: P.accent,
        borderRightColor: wr > 50 ? P.accent : "transparent",
        transform: `rotate(${wr / 100 * 180 - 90}deg)`,
        transformOrigin: "50% 100%"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        bottom: 2,
        width: "100%",
        textAlign: "center",
        color: P.white,
        fontSize: 11,
        fontWeight: 800
      }
    }, wr, "%"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 4,
        textAlign: "center"
      }
    }, [["W", r.won, P.green], ["L", r.lost, P.red], ["P", r.played, P.sub]].map(([lbl, val, col]) => /*#__PURE__*/React.createElement("div", {
      key: lbl,
      style: {
        background: "rgba(168,85,247,.15)",
        borderRadius: 8,
        padding: "5px 2px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: col,
        fontWeight: 800,
        fontSize: 15
      }
    }, val), /*#__PURE__*/React.createElement("div", {
      style: {
        color: P.dim,
        fontSize: 9,
        letterSpacing: .8
      }
    }, lbl)))));
  })));
}

// ════════ CALENDAR ════════════════════════════════════════════════
function CalendarView({
  matches,
  setMeta,
  onMatchClick
}) {
  const [calDate, setCalDate] = useState(() => {
    const n = new Date();
    return {
      y: n.getFullYear(),
      m: n.getMonth()
    };
  });
  const [selDay, setSelDay] = useState(null);
  const {
    y,
    m
  } = calDate;
  const days = daysInMonth(y, m);
  const first = firstDay(y, m);
  const byDate = {};
  matches.forEach(mx => {
    if (mx.date) {
      if (!byDate[mx.date]) byDate[mx.date] = [];
      byDate[mx.date].push(mx);
    }
  });
  const unscheduled = matches.filter(mx => !mx.date);
  const today = new Date();
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCalDate(p => p.m === 0 ? {
      y: p.y - 1,
      m: 11
    } : {
      y: p.y,
      m: p.m - 1
    }),
    style: {
      ...Sty.ghost,
      padding: "5px 13px"
    }
  }, "‹"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.white,
      fontWeight: 700,
      fontSize: 14
    }
  }, MONTHS[m], " ", y), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCalDate(p => p.m === 11 ? {
      y: p.y + 1,
      m: 0
    } : {
      y: p.y,
      m: p.m + 1
    }),
    style: {
      ...Sty.ghost,
      padding: "5px 13px"
    }
  }, "›")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(7,1fr)",
      gap: 2,
      marginBottom: 3
    }
  }, DAYS.map(d => /*#__PURE__*/React.createElement("div", {
    key: d,
    style: {
      textAlign: "center",
      color: P.dim,
      fontSize: 9,
      fontWeight: 700,
      padding: "2px 0"
    }
  }, d))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(7,1fr)",
      gap: 2,
      marginBottom: 16
    }
  }, cells.map((d, ci) => {
    if (!d) return /*#__PURE__*/React.createElement("div", {
      key: `e-${ci}`
    });
    const iso = toISO(y, m, d);
    const dayMs = byDate[iso] || [];
    const isToday = iso === todayISO;
    const isSel = selDay === d;
    return /*#__PURE__*/React.createElement("div", {
      key: d,
      onClick: () => setSelDay(isSel ? null : d),
      style: {
        minHeight: 50,
        borderRadius: 8,
        padding: "4px 3px",
        cursor: "pointer",
        background: isSel ? "rgba(255,255,255,.05)" : isToday ? "rgba(168,85,247,.15)" : "rgba(255,255,255,.02)",
        border: `1px solid ${isSel ? "rgba(168,85,247,.22)" : isToday ? "rgba(168,85,247,.17)" : P.borderB}`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        fontSize: 11,
        fontWeight: isToday ? 700 : 400,
        color: isToday ? P.accent : P.sub,
        marginBottom: 2
      }
    }, d), dayMs.slice(0, 2).map(mx => /*#__PURE__*/React.createElement("div", {
      key: mx.id,
      onClick: e => {
        e.stopPropagation();
        onMatchClick(mx.id);
      },
      style: {
        background: mx.status === "completed" ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.05)",
        borderRadius: 3,
        padding: "1px 3px",
        marginBottom: 1,
        fontSize: 7,
        color: mx.status === "completed" ? P.green : P.accent,
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        cursor: "pointer"
      }
    }, mx.team1, " v ", mx.team2)), dayMs.length > 2 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: P.dim,
        textAlign: "center"
      }
    }, "+", dayMs.length - 2));
  })), selDay && /*#__PURE__*/React.createElement("div", {
    style: Sty.card
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      ...Sty.sec,
      marginTop: 0
    }
  }, MONTHS[m], " ", selDay, ", ", y), (byDate[toISO(y, m, selDay)] || []).map(mx => /*#__PURE__*/React.createElement("div", {
    key: mx.id,
    onClick: () => onMatchClick(mx.id),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 0",
      borderBottom: `1px solid ${P.borderB}`,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.white,
      fontSize: 13,
      flex: 1,
      fontWeight: 600
    }
  }, mx.team1, " vs ", mx.team2), mx.time && /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.dim,
      fontSize: 11
    }
  }, "🕐 ", mx.time), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      padding: "2px 7px",
      borderRadius: 4,
      fontWeight: 700,
      background: mx.status === "completed" ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.05)",
      color: mx.status === "completed" ? P.green : P.accent
    }
  }, mx.status === "completed" ? "Done" : "Soon"))), !(byDate[toISO(y, m, selDay)] || []).length && /*#__PURE__*/React.createElement("p", {
    style: {
      color: P.dim,
      fontSize: 12,
      margin: 0
    }
  }, "No matches on this day.")), unscheduled.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: Sty.sec
  }, "Unscheduled"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: P.dim,
      fontSize: 11,
      marginTop: -6,
      marginBottom: 8
    }
  }, "Select a day above, then tap to schedule."), unscheduled.map(mx => /*#__PURE__*/React.createElement("div", {
    key: mx.id,
    style: {
      ...Sty.card,
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 14px",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.white,
      fontSize: 13,
      flex: 1
    }
  }, mx.team1, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.dim
    }
  }, "vs"), " ", mx.team2), selDay ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setMeta(mx.id, "date", toISO(y, m, selDay)),
    style: {
      ...Sty.ghostV,
      padding: "4px 10px",
      fontSize: 11
    }
  }, "📅 ", selDay, " ", MONTHS[m]) : /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.dim,
      fontSize: 10
    }
  }, "← Pick a day")))));
}

// ════════ LIVE SLEDGING ══════════════════════════════════════════
const SENDER_COLORS = ["#a855f7", "#ec4899", "#fbbf24", "#a3e635", "#34d399", "#22d3ee", "#a78bfa", "#f472b6"];
function LiveSledging({
  messages,
  setMessages,
  registry
}) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState(null);
  const [useReg, setUseReg] = useState(true);
  const [customName, setCustomName] = useState("");
  const bottomRef = useRef();
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);
  const senderName = useReg ? registry.find(p => p.id === picked)?.name || "" : customName.trim();
  const colorMap = {};
  let ci = 0;
  messages.forEach(m => {
    if (!m.system && !colorMap[m.sender]) {
      colorMap[m.sender] = SENDER_COLORS[ci % SENDER_COLORS.length];
      ci++;
    }
  });
  function send() {
    if (!text.trim() || !senderName) return;
    setMessages(m => [...m, {
      id: uid(),
      sender: senderName,
      text: text.trim(),
      ts: Date.now(),
      system: false
    }]);
    setText("");
  }
  function clearChat() {
    setMessages([{
      id: uid(),
      sender: "Court",
      text: "Chat cleared. Fresh court 🏸",
      ts: Date.now(),
      system: true
    }]);
  }
  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 220px)",
      minHeight: 400
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.white,
      fontWeight: 700,
      fontSize: 15
    }
  }, "🔥 Live Sledging"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.sub,
      fontSize: 11,
      marginLeft: 8
    }
  }, "Temporary · clears when you leave")), /*#__PURE__*/React.createElement("button", {
    onClick: clearChat,
    style: {
      ...Sty.ghost,
      fontSize: 11,
      padding: "4px 10px"
    }
  }, "Clear")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      padding: "2px 0 8px",
      scrollbarWidth: "none"
    }
  }, messages.map(msg => /*#__PURE__*/React.createElement("div", {
    key: msg.id,
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: msg.system ? "center" : "flex-start"
    }
  }, msg.system ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(168,85,247,.15)",
      border: "1px solid rgba(255,255,255,.05)",
      borderRadius: 20,
      padding: "5px 14px",
      fontSize: 11,
      color: P.sub,
      textAlign: "center",
      maxWidth: "80%"
    }
  }, msg.text) : /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "82%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 6,
      marginBottom: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: colorMap[msg.sender] || P.accent
    }
  }, msg.sender), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: P.dim
    }
  }, fmtTime(msg.ts))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: P.bg2,
      border: `1px solid ${P.border}`,
      borderRadius: "4px 14px 14px 14px",
      padding: "8px 12px",
      color: P.white,
      fontSize: 14,
      lineHeight: 1.45,
      wordBreak: "break-word"
    }
  }, msg.text)))), /*#__PURE__*/React.createElement("div", {
    ref: bottomRef
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: `1px solid ${P.border}`,
      paddingTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 8,
      flexWrap: "wrap"
    }
  }, ["From Registry", "Custom Name"].map((lbl, idx) => /*#__PURE__*/React.createElement("button", {
    key: lbl,
    onClick: () => setUseReg(idx === 0),
    style: {
      ...Sty.ghost,
      fontSize: 10,
      padding: "3px 9px",
      ...(useReg === (idx === 0) ? {
        border: "1px solid rgba(168,85,247,.18)",
        color: P.accent
      } : {})
    }
  }, lbl))), useReg ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      marginBottom: 8
    }
  }, registry.length === 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.dim,
      fontSize: 12
    }
  }, "No players in registry yet.") : registry.filter(p => p.name.trim()).map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => setPicked(p.id === picked ? null : p.id),
    style: {
      background: picked === p.id ? "rgba(168,85,247,.15)" : "rgba(236,72,153,.18)",
      border: `1px solid ${picked === p.id ? "rgba(168,85,247,.38)" : P.border}`,
      color: picked === p.id ? P.accent : P.sub,
      borderRadius: 20,
      padding: "4px 12px",
      cursor: "pointer",
      fontSize: 12,
      fontFamily: F,
      fontWeight: picked === p.id ? 700 : 400
    }
  }, p.name))) : /*#__PURE__*/React.createElement("input", {
    style: {
      ...Sty.input,
      marginBottom: 8,
      fontSize: 13
    },
    placeholder: "Your name",
    value: customName,
    onChange: e => setCustomName(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    style: {
      ...Sty.input,
      flex: 1,
      fontSize: 14,
      borderRadius: 24,
      padding: "10px 16px"
    },
    placeholder: senderName ? `Sledge as ${senderName}…` : "Pick a name first…",
    value: text,
    onChange: e => setText(e.target.value),
    onKeyDown: e => e.key === "Enter" && send(),
    disabled: !senderName
  }), /*#__PURE__*/React.createElement("button", {
    onClick: send,
    disabled: !text.trim() || !senderName,
    style: {
      background: P.accentG,
      border: "none",
      borderRadius: 24,
      padding: "10px 18px",
      color: "#fff",
      fontWeight: 700,
      fontSize: 14,
      cursor: !text.trim() || !senderName ? "default" : "pointer",
      opacity: !text.trim() || !senderName ? .4 : 1,
      fontFamily: F,
      flexShrink: 0
    }
  }, "Send"))));
}

// ════════ SHARED UI ══════════════════════════════════════════════
function TopBar({
  title,
  sub,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 0 12px",
      display: "flex",
      alignItems: "flex-start",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      background: "transparent",
      border: `1px solid ${P.border}`,
      color: "#a78bfa",
      borderRadius: 8,
      padding: "6px 11px",
      cursor: "pointer",
      fontSize: 12,
      fontFamily: F,
      flexShrink: 0,
      marginTop: 2
    }
  }, "←"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      color: P.white,
      fontSize: 18,
      fontWeight: 800,
      margin: 0,
      letterSpacing: "-0.4px"
    }
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      color: P.dim,
      fontSize: 11,
      marginTop: 2
    }
  }, sub)));
}
function ScoreCtrl({
  label,
  score,
  onMinus,
  onPlus,
  disabled
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.sub,
      fontSize: 10,
      fontWeight: 700,
      maxWidth: 90,
      textAlign: "center",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    disabled: disabled,
    onClick: onMinus,
    style: {
      width: 38,
      height: 38,
      borderRadius: "50%",
      background: P.accentBg,
      border: `1px solid ${P.border}`,
      color: P.accentL,
      fontSize: 22,
      fontWeight: 700,
      cursor: disabled ? "default" : "pointer",
      fontFamily: F
    }
  }, "−"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: P.white,
      fontWeight: 900,
      fontSize: 36,
      minWidth: 44,
      textAlign: "center"
    }
  }, score), /*#__PURE__*/React.createElement("button", {
    disabled: disabled,
    onClick: onPlus,
    style: {
      width: 38,
      height: 38,
      borderRadius: "50%",
      background: P.accentBg,
      border: `1px solid ${P.border}`,
      color: P.accentL,
      fontSize: 22,
      fontWeight: 700,
      cursor: disabled ? "default" : "pointer",
      fontFamily: F
    }
  }, "+")));
}
(async function initApp() {
  const rootEl = document.getElementById("root");
  rootEl.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#06040c;color:#a855f7;font-family:sans-serif;font-size:20px;letter-spacing:.05em;">🏸 Loading FlipBad...</div>';
  try {
    firebase.initializeApp(_FBCFG);
    _fbdb = firebase.firestore();
    const snap = await _fbdb.collection('flipbad').doc('shared').get();
    if (snap.exists) Object.assign(_cache, snap.data());
  } catch(e) { console.warn('Firebase unavailable, local mode:', e); }
  const root = ReactDOM.createRoot(rootEl);
  let _v = 0;
  function mount() { root.render(React.createElement(App, {key: _v})); }
  mount();
  if (_fbdb) {
    let _remountTimer;
    _fbdb.collection('flipbad').doc('shared').onSnapshot(snap => {
      if (!snap.exists) return;
      const d = snap.data();
      if (d._by === _SESSION) return;
      Object.assign(_cache, d);
      clearTimeout(_remountTimer);
      const ae = document.activeElement;
      const isTyping = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');
      if (!isTyping) { _v++; mount(); }
      else { _remountTimer = setTimeout(() => { _v++; mount(); }, 2500); }
    });
  }
})();