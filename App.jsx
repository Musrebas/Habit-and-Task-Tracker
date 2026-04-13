import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

// ─── Firebase ─────────────────────────────────────────────────────────────────
// 👇 Erstat med din egen Firebase config
// Gå til console.firebase.google.com → dit projekt → Project Settings → Your apps
const firebaseConfig = {
  apiKey: "DIN_API_KEY",
  authDomain: "DIT_PROJEKT.firebaseapp.com",
  projectId: "DIT_PROJEKT",
  storageBucket: "DIT_PROJEKT.firebasestorage.app",
  messagingSenderId: "DIN_SENDER_ID",
  appId: "DIN_APP_ID",
};
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db   = getFirestore(firebaseApp);
const provider = new GoogleAuthProvider();
const ALLOWED_EMAIL = "DIN_EMAIL@gmail.com"; // 👈 Erstat med din Google email
const UID = "mustafa";

const dbGet = async (key, fb) => {
  try {
    const snap = await getDoc(doc(db, "data", key));
    return snap.exists() ? snap.data().value : fb;
  } catch { return fb; }
};
const dbSet = (key, value) => setDoc(doc(db, "data", key), { value });

// ─── Utils ────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const todayStr = () => new Date().toISOString().split("T")[0];
const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split("T")[0]; };
const daysSince = (date) => Math.floor((new Date() - new Date(date)) / 86400000);
const load = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const NOFAP_START = "2024-01-01"; // 👈 Tilpas eller fjern hvis ikke relevant

// ─── Habit Data ───────────────────────────────────────────────────────────────
// 👇 Tilpas disse til dine egne vaner — eller lad Claude hjælpe dig
const DEFAULT_PILLARS = [
  { id:"morgen", label:"Morgen", arabic:"الصباح", color:"#c8a96e",
    habits:[
      {id:"wake",  name:"Stå op til tiden",   tiny:"Sæt fødderne på gulvet"},
      {id:"bed",   name:"Red seng",            tiny:"Tag dynen op"},
      {id:"water", name:"Drik et glas vand",   tiny:"Gå hen til vandhanen"},
    ]},
  { id:"krop", label:"Krop", arabic:"الجسد", color:"#b07a5a",
    habits:[
      {id:"train",   name:"Træning",       tiny:"10 armstrækninger"},
      {id:"protein", name:"Spis sundt",    tiny:"Vælg det sunde alternativ"},
    ]},
  { id:"arbejde", label:"Arbejde", arabic:"العمل", color:"#7a9eb0",
    habits:[
      {id:"deepwork", name:"1t fokuseret arbejde", tiny:"Luk sociale medier og start"},
      {id:"plan",     name:"Planlæg dagen",        tiny:"Skriv 3 prioriteter ned"},
    ]},
  { id:"fundament", label:"Fundament", arabic:"الأساس", color:"#8a8a9a",
    habits:[
      {id:"sleep",  name:"I seng inden 23:00",  tiny:"Telefon ud af soveværelset"},
      {id:"læs",    name:"Læs 10 minutter",     tiny:"Åbn bogen"},
    ]},
];
const ALL_HABITS = DEFAULT_PILLARS.flatMap(p => p.habits.map(h => ({...h, pillarId:p.id})));

const PRIORITIES = { high:"Høj", medium:"Medium", low:"Lav" };
const CATEGORIES = { morgen:"Morgen", krop:"Krop", arbejde:"Arbejde", fundament:"Fundament", privat:"Privat", økonomi:"Økonomi" };
const CAT_COLORS  = { morgen:"#c8a96e", krop:"#b07a5a", arbejde:"#7a9eb0", fundament:"#8a8a9a", privat:"#6b6055", økonomi:"#7c9e87" };
const PRI_COLORS  = { high:"#8a4a3a", medium:"#c8a96e", low:"#4a5a4a" };

// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
input,textarea,select{font-family:'Lora',serif;}

/* ── DARK THEME (default) ── */
:root {
  --bg:        #080807;
  --bg2:       #0d0c0b;
  --bg3:       #0f0e0d;
  --bg4:       #121110;
  --border:    #1c1a18;
  --border2:   #2a2520;
  --text:      #ddd5c8;
  --text2:     #c8bfb4;
  --text3:     #6b6055;
  --text4:     #4a4540;
  --text5:     #3a3530;
  --text6:     #2a2520;
  --accent:    #c8a96e;
  --accent-bg: #1a1510;
  --accent-bd: #2a2418;
  --green:     #7c9e87;
  --red:       #8a4a3a;
  --red-bg:    #1a0e0c;
  --red-bd:    #2a1410;
  --muted:     #3a3530;
  --input-bg:  #080807;
  --done-line: #1e1a18;
  --nav-bg:    #0d0c0b;
  --stat-bg:   #0d0c0b;
  --stat-sep:  #1c1a18;
  --card-bg:   #0d0c0b;
  --cal-lbl:   #0a0908;
  --cal-other: #090807;
  --cal-today: #0f0e0c;
  --shadow:    none;
}

/* ── LIGHT THEME ── */
@media (prefers-color-scheme: light) {
  :root {
    --bg:        #f5f2ee;
    --bg2:       #ffffff;
    --bg3:       #f0ede9;
    --bg4:       #e8e4df;
    --border:    #d8d2ca;
    --border2:   #c4bdb4;
    --text:      #1a1714;
    --text2:     #2a2420;
    --text3:     #6b5f52;
    --text4:     #8a7d70;
    --text5:     #a09080;
    --text6:     #c0b0a0;
    --accent:    #b8863a;
    --accent-bg: #fdf6ea;
    --accent-bd: #e8d4a0;
    --green:     #4a7a58;
    --red:       #8a3a2a;
    --red-bg:    #fdf0ee;
    --red-bd:    #e8c0b8;
    --muted:     #9a8a7a;
    --input-bg:  #fafaf8;
    --done-line: #d0c8c0;
    --nav-bg:    #ffffff;
    --stat-bg:   #ffffff;
    --stat-sep:  #e0d8d0;
    --card-bg:   #ffffff;
    --cal-lbl:   #f0ede9;
    --cal-other: #f8f6f3;
    --cal-today: #fffbf4;
    --shadow:    0 1px 3px rgba(0,0,0,0.08);
  }
}

body{background:var(--bg);color:var(--text);font-family:'Georgia',serif;}

/* Nav */
.nav{position:fixed;bottom:0;left:0;right:0;background:var(--nav-bg);border-top:1px solid var(--border);display:flex;z-index:100;box-shadow:var(--shadow);}
.nav-btn{flex:1;padding:14px 8px 18px;text-align:center;cursor:pointer;border:none;background:none;color:var(--text5);transition:color .2s;}
.nav-btn.active{color:var(--accent);}
.nav-icon{font-size:20px;display:block;}
.nav-label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;display:block;}

/* Page */
.page{max-width:700px;margin:0 auto;padding:36px 20px 100px;}

/* Section header */
.pg-eyebrow{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:4px;color:var(--text4);text-transform:uppercase;margin-bottom:8px;}
.pg-title{font-family:'Bebas Neue',sans-serif;font-size:52px;color:var(--text);line-height:.95;margin-bottom:32px;}
.pg-title span{color:var(--accent);}

/* Stats row */
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--stat-sep);border:1px solid var(--border);margin-bottom:36px;}
.stat{background:var(--stat-bg);padding:18px;text-align:center;box-shadow:var(--shadow);}
.stat-num{font-family:'Bebas Neue',sans-serif;font-size:38px;color:var(--accent);line-height:1;}
.stat-num.g{color:var(--green);} .stat-num.r{color:var(--red);}
.stat-label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--text5);text-transform:uppercase;margin-top:3px;}

/* Banner */
.nofap{background:var(--bg2);border:1px solid var(--border2);padding:16px 20px;margin-bottom:32px;display:flex;align-items:center;justify-content:space-between;box-shadow:var(--shadow);}
.nofap-days{font-family:'Bebas Neue',sans-serif;font-size:52px;color:var(--text);line-height:1;}
.nofap-days span{font-size:18px;color:var(--text4);}
.nofap-lbl{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--text4);text-transform:uppercase;margin-bottom:4px;}
.nofap-q{font-family:'Lora',serif;font-style:italic;font-size:12px;color:var(--text4);max-width:200px;text-align:right;line-height:1.5;}

/* Pillar */
.pillar{margin-bottom:28px;}
.pillar-hdr{display:flex;align-items:baseline;gap:10px;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--border);}
.pillar-name{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px;}
.pillar-arabic{font-family:'Lora',serif;font-size:13px;color:var(--text5);}
.pillar-sc{font-family:'DM Mono',monospace;font-size:9px;color:var(--text5);margin-left:auto;}

/* Habit row */
.habit{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--bg3);cursor:pointer;}
.habit:hover{background:var(--bg3);}
.habit.done .hname{color:var(--text5);text-decoration:line-through;text-decoration-color:var(--done-line);}
.chk{width:30px;height:30px;border-radius:3px;border:1px solid var(--border2);background:var(--bg2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;}
.chk.on{border-color:var(--pc);background:color-mix(in srgb,var(--pc) 12%,var(--bg2));}
.chk-mark{width:11px;height:7px;border-left:2.5px solid var(--pc);border-bottom:2.5px solid var(--pc);transform:rotate(-45deg) translateY(-1px);}
.hinfo{flex:1;min-width:0;}
.hname{font-family:'Lora',serif;font-size:14px;color:var(--text2);transition:color .2s;}
.htiny{font-family:'DM Mono',monospace;font-size:10px;color:var(--text5);margin-top:2px;}
.hright{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.streak{font-family:'Bebas Neue',sans-serif;font-size:19px;min-width:24px;text-align:right;}
.miss{font-family:'DM Mono',monospace;font-size:9px;color:var(--red);background:var(--red-bg);border:1px solid var(--red-bd);padding:2px 5px;border-radius:2px;}

/* ── TASKS ── */
.add-bar{display:flex;gap:8px;margin-bottom:28px;}
.add-bar-btn{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--accent);background:var(--bg2);border:1px solid var(--accent-bd);padding:12px 18px;cursor:pointer;transition:all .2s;white-space:nowrap;}
.add-bar-btn:hover{background:var(--accent-bg);border-color:var(--accent);}

/* Task form */
.tform{background:var(--bg2);border:1px solid var(--border);padding:20px;margin-bottom:28px;box-shadow:var(--shadow);}
.tform-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
.tform-full{margin-bottom:12px;}
.fl{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--text4);text-transform:uppercase;margin-bottom:5px;display:block;}
.finput{width:100%;background:var(--input-bg);border:1px solid var(--border);color:var(--text);font-family:'Lora',serif;font-size:14px;padding:9px 12px;outline:none;transition:border-color .2s;}
.finput:focus{border-color:var(--accent);}
.finput::placeholder{color:var(--text6);}
select.finput option{background:var(--bg);}
.frow{display:flex;gap:8px;margin-top:4px;}
.fbtn{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding:10px 16px;cursor:pointer;border:1px solid;transition:all .2s;}
.fbtn.primary{background:var(--accent-bg);border-color:var(--accent);color:var(--accent);}
.fbtn.primary:hover{background:var(--accent);color:var(--bg);}
.fbtn.ghost{background:none;border-color:var(--border2);color:var(--text4);}
.fbtn.ghost:hover{border-color:var(--text4);color:var(--text3);}

/* Task filters */
.filters{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;}
.filter-btn{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;padding:6px 12px;border:1px solid var(--border);background:none;color:var(--text4);cursor:pointer;transition:all .2s;}
.filter-btn.active{border-color:var(--accent);color:var(--accent);}

/* Task card */
.tcard{border:1px solid var(--border);background:var(--card-bg);padding:16px;margin-bottom:8px;transition:border-color .2s;box-shadow:var(--shadow);}
.tcard:hover{border-color:var(--border2);}
.tcard.done-card{opacity:.45;}
.tcard-top{display:flex;align-items:flex-start;gap:12px;}
.tcheck{width:22px;height:22px;border-radius:2px;border:1px solid var(--border2);background:var(--input-bg);flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;margin-top:1px;transition:all .2s;}
.tcheck.on{border-color:var(--green);background:color-mix(in srgb,var(--green) 15%,var(--input-bg));}
.tcheck-mark{width:10px;height:6px;border-left:2px solid var(--green);border-bottom:2px solid var(--green);transform:rotate(-45deg) translateY(-1px);}
.tcard-body{flex:1;min-width:0;}
.tcard-title{font-family:'Lora',serif;font-size:15px;color:var(--text2);margin-bottom:6px;}
.tcard-title.done-text{text-decoration:line-through;color:var(--text5);}
.tcard-desc{font-family:'DM Mono',monospace;font-size:11px;color:var(--text4);margin-bottom:8px;line-height:1.5;}
.tcard-meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.tag{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;padding:2px 7px;border-radius:2px;border:1px solid;}
.tcard-actions{display:flex;gap:6px;margin-top:10px;}
.act-btn{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;background:none;border:1px solid var(--border);color:var(--text5);padding:4px 8px;cursor:pointer;transition:all .2s;}
.act-btn:hover{border-color:var(--text4);color:var(--text3);}
.act-btn.del:hover{border-color:var(--red);color:var(--red);}
.deadline-warn{color:var(--red)!important;border-color:var(--red-bd)!important;}
.overdue{color:var(--accent);font-style:italic;}
.edit-toggle{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;background:none;border:1px solid var(--border);color:var(--text4);padding:6px 12px;cursor:pointer;transition:all .2s;margin-bottom:20px;}
.edit-toggle.on{border-color:var(--red);color:var(--red);}
.edit-toggle:hover{border-color:var(--text4);color:var(--text3);}
.del-habit{font-size:16px;background:none;border:none;color:var(--text6);cursor:pointer;padding:0 4px;line-height:1;transition:color .2s;flex-shrink:0;}
.del-habit:hover{color:var(--red);}
.add-habit-row{display:flex;gap:8px;padding:10px 0;border-bottom:1px solid var(--bg3);}
.add-habit-input{flex:1;background:var(--input-bg);border:1px solid var(--border);color:var(--text);font-family:'Lora',serif;font-size:13px;padding:7px 10px;outline:none;transition:border-color .2s;}
.add-habit-input:focus{border-color:var(--accent);}
.add-habit-input::placeholder{color:var(--text6);}
.add-habit-btn{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;background:var(--accent-bg);border:1px solid var(--accent);color:var(--accent);padding:7px 12px;cursor:pointer;white-space:nowrap;}
.add-habit-btn:hover{background:var(--accent);color:var(--bg);}

/* ── CALENDAR ── */
.cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;}
.cal-nav-btn{font-family:'Bebas Neue',sans-serif;font-size:18px;background:none;border:1px solid var(--border);color:var(--text3);padding:6px 14px;cursor:pointer;transition:all .2s;}
.cal-nav-btn:hover{border-color:var(--accent);color:var(--accent);}
.cal-month{font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--text);letter-spacing:2px;}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border);border:1px solid var(--border);margin-bottom:28px;}
.cal-daylbl{background:var(--cal-lbl);font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--text5);text-align:center;padding:8px 2px;text-transform:uppercase;}
.cal-cell{background:var(--bg2);min-height:72px;padding:6px;cursor:pointer;transition:background .15s;position:relative;}
.cal-cell:hover{background:var(--bg4);}
.cal-cell.today-cell{background:var(--cal-today);border:1px solid var(--accent-bd);}
.cal-cell.other-month{background:var(--cal-other);}
.cal-date{font-family:'DM Mono',monospace;font-size:11px;color:var(--text4);margin-bottom:4px;}
.cal-date.today-date{color:var(--accent);font-weight:500;}
.cal-dot{font-size:10px;line-height:1.4;font-family:'DM Mono',monospace;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cal-dot.hi{color:var(--red);}
.cal-dot.med{color:var(--accent);}
.cal-dot.lo{color:var(--green);}
.cal-detail{background:var(--bg2);border:1px solid var(--border);padding:20px;margin-top:4px;box-shadow:var(--shadow);}
.cal-detail-title{font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--accent);margin-bottom:12px;letter-spacing:1px;}
.cal-task-row{padding:8px 0;border-bottom:1px solid var(--bg3);display:flex;align-items:center;gap:10px;}
.cal-task-name{font-family:'Lora',serif;font-size:13px;color:var(--text2);}
`;

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]     = useState("habits");
  const [logs, setLogs]     = useState({});
  const [streaks, setStreaks]= useState({});
  const [tasks, setTasks]   = useState([]);
  const [pillars, setPillars]= useState(DEFAULT_PILLARS);
  const [scheduled, setScheduled] = useState({}); // {habitId: {days:[0..6], pillarId, pillarColor}}
  const [pulse, setPulse]   = useState(null);
  const [user, setUser]     = useState(undefined);
  const [loading, setLoading]= useState(true);

  // ── Auth ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && u.email === ALLOWED_EMAIL) setUser(u);
      else { setUser(null); if (u) signOut(auth); }
    });
    return unsub;
  }, []);

  // ── Load data from Firestore when logged in ──
  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    const keys = [
      ["ah-logs",      setLogs,      {}],
      ["ah-streaks",   setStreaks,    {}],
      ["ah-tasks",     setTasks,     []],
      ["ah-pillars",   setPillars,   DEFAULT_PILLARS],
      ["ah-scheduled", setScheduled, {}],
    ];
    let loaded = 0;
    keys.forEach(([key, setter, fb]) => {
      const unsub = onSnapshot(doc(db, "data", key), (snap) => {
        setter(snap.exists() ? snap.data().value : fb);
        loaded++;
        if (loaded >= keys.length) setLoading(false);
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach(u => u());
  }, [user]);

  const login = () => signInWithPopup(auth, provider);

  if (user === undefined || (user && loading)) return (
    <div style={{minHeight:"100vh",background:"var(--bg,#080807)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300&display=swap');`}</style>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#3a3530",letterSpacing:3}}>INDLÆSER...</div>
    </div>
  );

  if (user === null) return (
    <div style={{minHeight:"100vh",background:"#080807",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:24}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400&display=swap');"}</style>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:52,color:"#ddd5c8",textAlign:"center",lineHeight:1}}>Byg<br/><span style={{color:"#c8a96e"}}>manden.</span></div>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#4a4540",letterSpacing:3,textAlign:"center"}}>PRIVAT ADGANG KRÆVET</div>
      <button onClick={login} style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:2,textTransform:"uppercase",background:"#1a1510",border:"1px solid #c8a96e",color:"#c8a96e",padding:"14px 28px",cursor:"pointer"}}>
        Log ind med Google
      </button>
    </div>
  );

  const today = todayStr();
  const yesterday = yesterdayStr();
  const todayLog = logs[today] || {};

  // ── Habit logic ──
  const toggleHabit = (id) => {
    const newVal = !todayLog[id];
    const newLog = {...todayLog, [id]: newVal};
    const newLogs = {...logs, [today]: newLog};
    setLogs(newLogs); dbSet("ah-logs", newLogs);
    const yLog = logs[yesterday] || {};
    const ns = {...streaks};
    if (newVal) { ns[id] = yLog[id] ? (streaks[id]||0)+1 : 1; setPulse(id); setTimeout(()=>setPulse(null),600); }
    else { ns[id] = 0; }
    setStreaks(ns); dbSet("ah-streaks", ns);
  };
  const missedYesterday = (id) => { const y=logs[yesterday]||{}; return !y[id]; };
  const pillarScore = (p) => {
    const active = p.habits.filter(h=>!h.special);
    const d = active.filter(h=>todayLog[h.id]).length;
    return {d, t:active.length, pct:active.length>0?Math.round(d/active.length*100):0};
  };
  const allHabits = pillars.flatMap(p=>p.habits);
  const totalDone = allHabits.filter(h=>!h.special&&todayLog[h.id]).length;
  const totalAll  = allHabits.filter(h=>!h.special).length;
  const totalPct  = totalAll>0?Math.round(totalDone/totalAll*100):0;
  const nofapDays = daysSince(NOFAP_START);

  const addHabit = (pillarId, name, tiny) => {
    const np = pillars.map(p => p.id!==pillarId ? p : {
      ...p, habits:[...p.habits, {id:uid(), name, tiny:tiny||"Start i dag"}]
    });
    setPillars(np); dbSet("ah-pillars", np);
  };
  const deleteHabit = (pillarId, habitId) => {
    const np = pillars.map(p => p.id!==pillarId ? p : {
      ...p, habits: p.habits.filter(h=>h.id!==habitId)
    });
    setPillars(np); dbSet("ah-pillars", np);
  };

  // ── Task logic ──
  const addTask    = (t) => { const nt=[t,...tasks]; setTasks(nt); dbSet("ah-tasks", nt); };
  const updateTask = (id,patch) => { const nt=tasks.map(t=>t.id===id?{...t,...patch}:t); setTasks(nt); dbSet("ah-tasks", nt); };
  const deleteTask = (id) => { const nt=tasks.filter(t=>t.id!==id); setTasks(nt); dbSet("ah-tasks", nt); };

  // ── Schedule logic ──
  const saveScheduled = (next) => { setScheduled(next); dbSet("ah-scheduled", next); };

  return (
    <>
      <style>{CSS}</style>
      {page==="habits"  && <HabitsPage  {...{todayLog,logs,streaks,pulse,toggleHabit,missedYesterday,pillarScore,totalDone,totalAll,totalPct,nofapDays,pillars,addHabit,deleteHabit,scheduled}}/>}
      {page==="tasks"   && <TasksPage   {...{tasks,addTask,updateTask,deleteTask}}/>}
      {page==="plan"    && <PlanPage    {...{pillars,scheduled,saveScheduled}}/>}
      {page==="calendar"&& <CalendarPage tasks={tasks} updateTask={updateTask}/>}
      <nav className="nav">
        {[["habits","☀︎","Vaner"],["tasks","◈","Opgaver"],["plan","◑","Plan"],["calendar","◻","Kalender"]].map(([p,icon,lbl])=>(
          <button key={p} className={`nav-btn${page===p?" active":""}`} onClick={()=>setPage(p)}>
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{lbl}</span>
          </button>
        ))}
        <button className="nav-btn" onClick={()=>signOut(auth)}>
          <span className="nav-icon" style={{fontSize:16}}>⎋</span>
          <span className="nav-label">Log ud</span>
        </button>
      </nav>
    </>
  );
}

// ─── Habits Page ──────────────────────────────────────────────────────────────
function HabitsPage({todayLog,logs,streaks,pulse,toggleHabit,missedYesterday,pillarScore,totalDone,totalAll,totalPct,nofapDays,pillars,addHabit,deleteHabit,scheduled}) {
  const daysLeft = Math.max(0,Math.ceil((new Date("2027-01-01")-new Date())/86400000)); // 👈 Sæt din egen måldato
  const [editMode,setEditMode]   = useState(false);
  const [newHabit,setNewHabit]   = useState({});

  // Today's day index (0=Mon ... 6=Sun)
  const todayDow = (new Date().getDay()+6)%7;

  // A habit is shown today if: not scheduled at all (always show) OR scheduled and today is in its days
  const isActiveToday = (habitId) => {
    const s = scheduled[habitId];
    if (!s || !s.days || s.days.length === 0) return true;
    return s.days.includes(todayDow);
  };

  const submitHabit = (pillarId) => {
    const h = newHabit[pillarId]||{};
    if(!h.name?.trim()) return;
    addHabit(pillarId, h.name.trim(), h.tiny?.trim()||"Start i dag");
    setNewHabit({...newHabit,[pillarId]:{name:"",tiny:""}});
  };

  return (
    <div className="page">
      <div className="pg-eyebrow">Habit Tracker</div>
      <div className="pg-title">Byg<br/><span>dig selv.</span></div>

      <div className="stats">
        <div className="stat"><div className={`stat-num${totalPct===100?" g":""}`}>{totalDone}/{totalAll}</div><div className="stat-label">I dag</div></div>
        <div className="stat"><div className="stat-num">{totalPct}%</div><div className="stat-label">Completion</div></div>
        <div className="stat"><div className="stat-num">{daysLeft}</div><div className="stat-label">Dage til mål</div></div>
      </div>

      <div className="nofap">
        <div>
          <div className="nofap-lbl">Atomic Habits</div>
          <div className="nofap-days" style={{fontSize:28,lineHeight:1.2}}>Du er<br/>dine vaner.</div>
        </div>
        <div className="nofap-q">"Du stemmer ikke på et resultat. Du stemmer på den person du ønsker at blive. Hver vane er én stemme."</div>
      </div>

      {/* Toolbar */}
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        <button className={`edit-toggle${editMode?" on":""}`} onClick={()=>setEditMode(e=>!e)}>
          {editMode?"✓ Færdig med redigering":"⊘ Rediger vaner"}
        </button>
      </div>

      {pillars.map(p=>{
        const sc=pillarScore(p);
        const nh=newHabit[p.id]||{name:"",tiny:""};
        return (
          <div key={p.id} className="pillar" style={{"--pc":p.color}}>
            <div className="pillar-hdr">
              <span className="pillar-name" style={{color:p.color}}>{p.label}</span>
              <span className="pillar-arabic">{p.arabic}</span>
              {!editMode&&<span className="pillar-sc">{sc.d}/{sc.t} · {sc.pct}%</span>}
              {editMode&&<span className="pillar-sc" style={{color:"#8a4a3a"}}>REDIGERINGSTILSTAND</span>}
            </div>
            {p.habits.map(h=>{
              if(h.special==="nofap") return null;
              if(!isActiveToday(h.id)) return null;
              const done=!!todayLog[h.id];
              const streak=streaks[h.id]||0;
              const missed=!done&&missedYesterday(h.id)&&streak===0;
              return (
                <div key={h.id} className={`habit${done&&!editMode?" done":""}`}
                  onClick={()=>{ if(!editMode) toggleHabit(h.id); }}
                  style={editMode?{cursor:"default"}:{}}>
                  {editMode ? (
                    <button className="del-habit" onClick={()=>deleteHabit(p.id,h.id)} title="Slet vane">×</button>
                  ) : (
                    <div className={`chk${done?" on":""}`} style={{"--pc":p.color}}>
                      {done&&<div className="chk-mark"/>}
                    </div>
                  )}
                  <div className="hinfo">
                    <div className="hname" style={editMode?{color:"#6b6055"}:{}}>{h.name}</div>
                    {!editMode&&!done&&<div className="htiny">2-min: {h.tiny}</div>}
                    {editMode&&<div className="htiny">{h.tiny}</div>}
                  </div>
                  {!editMode&&(
                    <div className="hright">
                      {missed&&<span className="miss">Miss ikke to</span>}
                      {streak>0&&<span className="streak" style={{color:streak>=7?p.color:"#3a3530"}}>{streak}</span>}
                    </div>
                  )}
                </div>
              );
            })}
            {editMode&&(
              <div className="add-habit-row">
                <input
                  className="add-habit-input"
                  placeholder="Ny vane..."
                  value={nh.name}
                  onChange={e=>setNewHabit({...newHabit,[p.id]:{...nh,name:e.target.value}})}
                  onKeyDown={e=>e.key==="Enter"&&submitHabit(p.id)}
                />
                <input
                  className="add-habit-input"
                  placeholder="2-min version..."
                  style={{maxWidth:160}}
                  value={nh.tiny}
                  onChange={e=>setNewHabit({...newHabit,[p.id]:{...nh,tiny:e.target.value}})}
                  onKeyDown={e=>e.key==="Enter"&&submitHabit(p.id)}
                />
                <button className="add-habit-btn" onClick={()=>submitHabit(p.id)}>Tilføj</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tasks Page ───────────────────────────────────────────────────────────────
function TasksPage({tasks,addTask,updateTask,deleteTask}) {
  const [showForm,setShowForm] = useState(false);
  const [filter,setFilter]    = useState("all");
  const [editId,setEditId]    = useState(null);
  const blank = {title:"",description:"",deadline:"",deadlineTime:"",priority:"medium",category:"visora",completed:false};
  const [form,setForm]        = useState(blank);

  const today = todayStr();

  const deadlineDiff = (dl) => {
    if(!dl) return null;
    return Math.ceil((new Date(dl)-new Date(today))/86400000);
  };

  const deadlineLabel = (dl) => {
    const d=deadlineDiff(dl);
    if(d===null) return null;
    if(d<0)  return `${Math.abs(d)} dage over deadline`;
    if(d===0)return "Deadline i dag";
    if(d===1)return "Deadline i morgen";
    return `${d} dage tilbage`;
  };

  const openAdd = () => { setForm(blank); setEditId(null); setShowForm(true); };
  const openEdit= (t) => { setForm({...t}); setEditId(t.id); setShowForm(true); };
  const submit  = () => {
    if(!form.title.trim()) return;
    if(editId) { updateTask(editId,form); }
    else       { addTask({...form, id:uid(), completed:false, createdAt:todayStr()}); }
    setShowForm(false); setForm(blank); setEditId(null);
  };

  const pending   = tasks.filter(t=>!t.completed);
  const completed = tasks.filter(t=>t.completed);
  const overdue   = pending.filter(t=>t.deadline&&deadlineDiff(t.deadline)<0);

  const filtered = filter==="all"    ? pending
                 : filter==="high"   ? pending.filter(t=>t.priority==="high")
                 : filter==="today"  ? pending.filter(t=>t.deadline===today)
                 : filter==="overdue"? overdue
                 : filter==="done"   ? completed
                 : pending.filter(t=>t.category===filter);

  return (
    <div className="page">
      <div className="pg-eyebrow">Task Tracker</div>
      <div className="pg-title">Få det<br/><span>gjort.</span></div>

      <div className="stats">
        <div className="stat"><div className="stat-num">{pending.length}</div><div className="stat-label">Aktive</div></div>
        <div className="stat"><div className={`stat-num${overdue.length>0?" r":""}`}>{overdue.length}</div><div className="stat-label">Overskredet</div></div>
        <div className="stat"><div className="stat-num g">{completed.length}</div><div className="stat-label">Færdige</div></div>
      </div>

      <div className="add-bar">
        <button className="add-bar-btn" onClick={openAdd}>+ Ny opgave</button>
      </div>

      {showForm && (
        <div className="tform">
          <div className="tform-full">
            <label className="fl">Opgave *</label>
            <input className="finput" placeholder="Hvad skal gøres?" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
          </div>
          <div className="tform-full">
            <label className="fl">Beskrivelse</label>
            <input className="finput" placeholder="Valgfri detaljer..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
          </div>
          <div className="tform-grid">
            <div>
              <label className="fl">Deadline</label>
              <input className="finput" type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/>
            </div>
            <div>
              <label className="fl">Klokkeslet</label>
              <input className="finput" type="time" value={form.deadlineTime||""} onChange={e=>setForm({...form,deadlineTime:e.target.value})}/>
            </div>
          </div>
          <div className="tform-grid">
            <div>
              <label className="fl">Prioritet</label>
              <select className="finput" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
                {Object.entries(PRIORITIES).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="tform-full">
            <label className="fl">Kategori</label>
            <select className="finput" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
              {Object.entries(CATEGORIES).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="frow">
            <button className="fbtn primary" onClick={submit}>{editId?"Gem ændringer":"Tilføj opgave"}</button>
            <button className="fbtn ghost" onClick={()=>{setShowForm(false);setEditId(null);}}>Annuller</button>
          </div>
        </div>
      )}

      <div className="filters">
        {[["all","Alle"],["high","Høj prioritet"],["today","I dag"],["overdue","Overskredet"],["visora","VISORA"],["funkisfood","Funkisfood"],["deen","Deen"],["krop","Krop"],["fundament","Fundament"],["done","Færdige"]].map(([f,l])=>(
          <button key={f} className={`filter-btn${filter===f?" active":""}`} onClick={()=>setFilter(f)}>{l}</button>
        ))}
      </div>

      {filtered.length===0&&(
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#2a2520",padding:"32px 0",textAlign:"center",letterSpacing:2}}>
          INGEN OPGAVER · {filter==="done"?"GØR NOGET FIRST":"GODT KLARET"}
        </div>
      )}

      {filtered.map(t=>{
        const diff=deadlineDiff(t.deadline);
        const isOverdue=diff!==null&&diff<0;
        return (
          <div key={t.id} className={`tcard${t.completed?" done-card":""}`}>
            <div className="tcard-top">
              <div className={`tcheck${t.completed?" on":""}`} onClick={()=>updateTask(t.id,{completed:!t.completed})}>
                {t.completed&&<div className="tcheck-mark"/>}
              </div>
              <div className="tcard-body">
                <div className={`tcard-title${t.completed?" done-text":""}`}>{t.title}</div>
                {t.description&&<div className="tcard-desc">{t.description}</div>}
                <div className="tcard-meta">
                  <span className="tag" style={{color:CAT_COLORS[t.category]||"#6b6055",borderColor:CAT_COLORS[t.category]||"#6b6055",background:"transparent"}}>
                    {CATEGORIES[t.category]}
                  </span>
                  <span className="tag" style={{color:PRI_COLORS[t.priority],borderColor:PRI_COLORS[t.priority],background:"transparent"}}>
                    {PRIORITIES[t.priority]}
                  </span>
                  {t.deadline&&(
                    <span className={`tag${isOverdue?" deadline-warn":""}`} style={{color:isOverdue?"var(--red)":diff===0?"var(--accent)":"var(--text4)",borderColor:isOverdue?"var(--red-bd)":diff===0?"var(--accent-bd)":"var(--border)",background:"transparent"}}>
                      {deadlineLabel(t.deadline)}{t.deadlineTime ? ` · ${t.deadlineTime}` : ""}
                    </span>
                  )}
                </div>
                {!t.completed&&(
                  <div className="tcard-actions">
                    <button className="act-btn" onClick={()=>openEdit(t)}>Rediger</button>
                    <button className="act-btn del" onClick={()=>deleteTask(t.id)}>Slet</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Plan Page ────────────────────────────────────────────────────────────────
const DAYS_SHORT = ["Man","Tir","Ons","Tor","Fre","Lør","Søn"];
const PILLAR_CATS = ["Morgen","Krop","Arbejde","Fundament","Privat"];
const PILLAR_COLORS = { Morgen:"#c8a96e", Krop:"#b07a5a", Arbejde:"#7a9eb0", Fundament:"#8a8a9a", Privat:"#6b6055" };

function PlanPage({pillars, scheduled, saveScheduled}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({name:"", tiny:"", category:"Krop", days:[]});
  const [editId, setEditId] = useState(null);
  const [customHabits, setCustomHabits] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ah-custom-plan")||"[]"); } catch { return []; }
  });

  // All plannable habits = pillars habits + custom plan habits
  const allPlannable = [
    ...pillars.flatMap(p => p.habits.filter(h => !h.special).map(h => ({
      ...h,
      category: p.label,
      color: p.color,
      source: "pillar"
    }))),
    ...customHabits.map(h => ({
      ...h,
      color: PILLAR_COLORS[h.category] || "#8a8a9a",
      source: "custom"
    }))
  ];

  const toggleDay = (habitId, dayIdx) => {
    const current = scheduled[habitId]?.days || [];
    const next = current.includes(dayIdx)
      ? current.filter(d => d !== dayIdx)
      : [...current, dayIdx].sort();
    saveScheduled({...scheduled, [habitId]: {...(scheduled[habitId]||{}), days: next}});
  };

  const setAllDays = (habitId) => {
    const current = scheduled[habitId]?.days || [];
    const next = current.length === 7 ? [] : [0,1,2,3,4,5,6];
    saveScheduled({...scheduled, [habitId]: {...(scheduled[habitId]||{}), days: next}});
  };

  const submitCustom = () => {
    if (!form.name.trim()) return;
    let next;
    if (editId) {
      next = customHabits.map(h => h.id === editId ? {...h, ...form} : h);
    } else {
      next = [...customHabits, {...form, id: uid()}];
    }
    setCustomHabits(next);
    localStorage.setItem("ah-custom-plan", JSON.stringify(next));
    setForm({name:"", tiny:"", category:"Krop", days:[]}); setShowForm(false); setEditId(null);
  };

  const deleteCustom = (id) => {
    const next = customHabits.filter(h => h.id !== id);
    setCustomHabits(next);
    localStorage.setItem("ah-custom-plan", JSON.stringify(next));
    const ns = {...scheduled}; delete ns[id];
    saveScheduled(ns);
  };

  // Group by category for display
  const grouped = {};
  allPlannable.forEach(h => {
    const cat = h.category || "Andet";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(h);
  });

  return (
    <div className="page">
      <div className="pg-eyebrow">Ugentlig Plan</div>
      <div className="pg-title">Planlæg<br/><span>ugen.</span></div>

      <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"var(--text4)",letterSpacing:1,marginBottom:24,lineHeight:1.6}}>
        Vælg hvilke dage hver vane er aktiv.<br/>
        Vaner uden valgte dage vises hver dag.
      </div>

      <button className="add-bar-btn" style={{width:"100%",marginBottom:28}} onClick={()=>{setForm({name:"",tiny:"",category:"Krop",days:[]});setEditId(null);setShowForm(s=>!s);}}>
        + Tilføj ny planlagt vane
      </button>

      {showForm && (
        <div className="tform" style={{marginBottom:28}}>
          <div className="tform-full">
            <label className="fl">Vane *</label>
            <input className="finput" placeholder="Navn på vane" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoFocus/>
          </div>
          <div className="tform-full">
            <label className="fl">2-minuts version</label>
            <input className="finput" placeholder="Den mindste version..." value={form.tiny} onChange={e=>setForm({...form,tiny:e.target.value})}/>
          </div>
          <div className="tform-full">
            <label className="fl">Kategori</label>
            <select className="finput" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
              {PILLAR_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="frow">
            <button className="fbtn primary" onClick={submitCustom}>{editId?"Gem":"Tilføj"}</button>
            <button className="fbtn ghost" onClick={()=>{setShowForm(false);setEditId(null);}}>Annuller</button>
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([cat, habits]) => {
        const color = PILLAR_COLORS[cat] || habits[0]?.color || "#8a8a9a";
        return (
          <div key={cat} className="pillar">
            <div className="pillar-hdr">
              <span className="pillar-name" style={{color}}>{cat}</span>
            </div>

            {/* Day header */}
            <div style={{display:"grid",gridTemplateColumns:"1fr repeat(7,32px) 28px",gap:3,marginBottom:6,paddingBottom:6,borderBottom:"1px solid var(--border)"}}>
              <div/>
              {DAYS_SHORT.map(d => (
                <div key={d} style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"var(--text4)",textAlign:"center",letterSpacing:1}}>{d}</div>
              ))}
              <div/>
            </div>

            {habits.map(h => {
              const days = scheduled[h.id]?.days || [];
              const isAllDays = days.length === 7;
              const isUnscheduled = days.length === 0;
              return (
                <div key={h.id} style={{display:"grid",gridTemplateColumns:"1fr repeat(7,32px) 28px",gap:3,alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--bg3)"}}>
                  <div>
                    <div style={{fontFamily:"'Lora',serif",fontSize:13,color:"var(--text2)"}}>{h.name}</div>
                    {isUnscheduled && <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"var(--text5)",marginTop:2}}>Vises hver dag</div>}
                  </div>
                  {[0,1,2,3,4,5,6].map(dayIdx => {
                    const active = days.includes(dayIdx);
                    return (
                      <button key={dayIdx} onClick={() => toggleDay(h.id, dayIdx)} style={{
                        width:28,height:28,borderRadius:3,
                        border:`1px solid ${active ? color : "var(--border2)"}`,
                        background: active ? `color-mix(in srgb,${color} 20%,var(--bg2))` : "var(--bg2)",
                        cursor:"pointer",transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center"
                      }}>
                        {active && <div style={{width:8,height:8,borderRadius:"50%",background:color}}/>}
                      </button>
                    );
                  })}
                  {/* All/none toggle */}
                  <button onClick={() => setAllDays(h.id)} title={isAllDays?"Ryd alle":"Alle dage"} style={{
                    width:24,height:24,borderRadius:2,border:"1px solid var(--border)",
                    background:"none",cursor:"pointer",color:"var(--text4)",fontSize:12,
                    display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"
                  }}>
                    {isAllDays ? "−" : "∀"}
                  </button>
                </div>
              );
            })}

            {/* Custom habit actions */}
            {customHabits.filter(h => h.category === cat).map(h => (
              <div key={h.id+"_actions"} style={{display:"flex",gap:6,paddingLeft:4,marginTop:-6,paddingBottom:6}}>
                <button className="act-btn" onClick={()=>{setForm({name:h.name,tiny:h.tiny||"",category:h.category,days:[]});setEditId(h.id);setShowForm(true);}}>Rediger</button>
                <button className="act-btn del" onClick={()=>deleteCustom(h.id)}>Slet</button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Calendar Page ────────────────────────────────────────────────────────────
function CalendarPage({tasks,updateTask}) {
  const now = new Date();
  const [year,setYear]   = useState(now.getFullYear());
  const [month,setMonth] = useState(now.getMonth());
  const [selected,setSelected] = useState(null);

  const MONTHS_DA = ["Januar","Februar","Marts","April","Maj","Juni","Juli","August","September","Oktober","November","December"];
  const DAYS_DA   = ["Man","Tir","Ons","Tor","Fre","Lør","Søn"];

  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

  // ── iCal export ──
  const exportIcal = () => {
    const tasksWithDeadline = tasks.filter(t => t.deadline && !t.completed);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Mustafa Tracker//DA",
      "CALSCALE:GREGORIAN",
      "X-WR-CALNAME:Mustafa Opgaver",
    ];
    tasksWithDeadline.forEach(t => {
      const d = t.deadline.replace(/-/g,"");
      const stamp = new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
      const hasTime = t.deadlineTime && t.deadlineTime.length === 5;
      const dtStart = hasTime
        ? `DTSTART:${d}T${t.deadlineTime.replace(":","")+"00"}`
        : `DTSTART;VALUE=DATE:${d}`;
      const dtEnd = hasTime
        ? `DTEND:${d}T${t.deadlineTime.replace(":","")+"00"}`
        : `DTEND;VALUE=DATE:${d}`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${t.id}@mustafa-tracker`,
        `DTSTAMP:${stamp}`,
        dtStart,
        dtEnd,
        `SUMMARY:[${PRIORITIES[t.priority]||t.priority}] ${t.title}`,
        t.description ? `DESCRIPTION:${t.description}` : "",
        `CATEGORIES:${CATEGORIES[t.category]||t.category}`,
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    const icsContent = lines.filter(Boolean).join("\r\n");
    // Use data URI — works on iPhone Safari and opens directly in Calendar app
    const dataUri = "data:text/calendar;charset=utf-8," + encodeURIComponent(icsContent);
    window.location.href = dataUri;
  };

  // Build calendar grid (Mon-start)
  const firstDay = new Date(year,month,1);
  const lastDay  = new Date(year,month+1,0);
  const startDow = (firstDay.getDay()+6)%7; // 0=Mon
  const cells = [];
  for(let i=0;i<startDow;i++) {
    const d=new Date(year,month,1-startDow+i);
    cells.push({date:d,current:false});
  }
  for(let d=1;d<=lastDay.getDate();d++) cells.push({date:new Date(year,month,d),current:true});
  while(cells.length%7!==0) { const d=new Date(year,month+1,cells.length-startDow-lastDay.getDate()+1); cells.push({date:d,current:false}); }

  const tasksByDate = {};
  tasks.forEach(t=>{ if(t.deadline){ if(!tasksByDate[t.deadline])tasksByDate[t.deadline]=[]; tasksByDate[t.deadline].push(t); }});

  const dateStr = (d) => d.toISOString().split("T")[0];
  const todayS  = todayStr();

  const selectedTasks = selected ? (tasksByDate[selected]||[]) : [];

  return (
    <div className="page">
      <div className="pg-eyebrow">Kalender</div>
      <div className="pg-title"><span>{MONTHS_DA[month]}</span><br/>{year}</div>

      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
        <span className="cal-month">{MONTHS_DA[month]} {year}</span>
        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
      </div>

      <button onClick={exportIcal} className="add-bar-btn" style={{width:"100%",marginBottom:20,textAlign:"center"}}>
        ↓ Eksporter til iPhone Kalender (.ics)
      </button>

      <div className="cal-grid">
        {DAYS_DA.map(d=><div key={d} className="cal-daylbl">{d}</div>)}
        {cells.map((cell,i)=>{
          const ds=dateStr(cell.date);
          const dayTasks=tasksByDate[ds]||[];
          const isToday=ds===todayS;
          const isSel=ds===selected;
          return (
            <div key={i}
              className={`cal-cell${isToday?" today-cell":""}${!cell.current?" other-month":""}`}
              onClick={()=>setSelected(isSel?null:ds)}
              style={isSel?{background:"#121008",border:"1px solid #c8a96e"}:{}}
            >
              <div className={`cal-date${isToday?" today-date":""}`}>{cell.date.getDate()}</div>
              {dayTasks.slice(0,3).map(t=>(
                <div key={t.id} className={`cal-dot ${t.priority}`}>
                  {t.completed?"✓ ":""}{t.title}
                </div>
              ))}
              {dayTasks.length>3&&<div className="cal-dot" style={{color:"#2a2520"}}>+{dayTasks.length-3} mere</div>}
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="cal-detail">
          <div className="cal-detail-title">
            {new Date(selected+"T12:00:00").toLocaleDateString("da-DK",{weekday:"long",day:"numeric",month:"long"})}
          </div>
          {selectedTasks.length===0 ? (
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#2a2520",letterSpacing:2}}>INGEN OPGAVER DENNE DAG</div>
          ) : selectedTasks.map(t=>(
            <div key={t.id} className="cal-task-row">
              <div className={`tcheck${t.completed?" on":""}`} style={{width:20,height:20,flexShrink:0}} onClick={()=>updateTask(t.id,{completed:!t.completed})}>
                {t.completed&&<div className="tcheck-mark"/>}
              </div>
              <div>
                <div className="cal-task-name" style={t.completed?{textDecoration:"line-through",color:"#3a3530"}:{}}>{t.title}</div>
                <div style={{display:"flex",gap:6,marginTop:4}}>
                  <span className="tag" style={{fontSize:9,color:CAT_COLORS[t.category],borderColor:CAT_COLORS[t.category],border:"1px solid",padding:"1px 5px",borderRadius:2}}>{CATEGORIES[t.category]}</span>
                  <span className="tag" style={{fontSize:9,color:PRI_COLORS[t.priority],borderColor:PRI_COLORS[t.priority],border:"1px solid",padding:"1px 5px",borderRadius:2}}>{PRIORITIES[t.priority]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
