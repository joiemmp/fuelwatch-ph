import { useState, useEffect, useRef } from "react";
import "./index.css";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const stations = [
  { id:1, name:"Petron",    branch:"EDSA Guadalupe, Makati",  lat:14.5547, lng:121.0019, gasoline:78.5, diesel:89.2, kerosene:95.0, status:"open",   verified:true,  lastUpdated:"2 mins ago",  trend:"up"     },
  { id:2, name:"Shell",     branch:"Ayala Ave, Makati",       lat:14.5573, lng:121.0192, gasoline:76.8, diesel:87.5, kerosene:93.4, status:"open",   verified:true,  lastUpdated:"5 mins ago",  trend:"stable" },
  { id:3, name:"Cleanfuel", branch:"C5 Road, Taguig",         lat:14.5432, lng:121.0503, gasoline:74.2, diesel:84.9, kerosene:91.0, status:"open",   verified:false, lastUpdated:"12 mins ago", trend:"down"   },
  { id:4, name:"Seaoil",    branch:"Kalayaan Ave, QC",        lat:14.6191, lng:121.0289, gasoline:75.5, diesel:86.1, kerosene:92.3, status:"open",   verified:true,  lastUpdated:"1 min ago",   trend:"up"     },
  { id:5, name:"Flying V",  branch:"Shaw Blvd, Mandaluyong",  lat:14.5843, lng:121.0351, gasoline:77.9, diesel:88.7, kerosene:94.1, status:"open",   verified:false, lastUpdated:"20 mins ago", trend:"stable" },
  { id:6, name:"Jetti",     branch:"Ortigas Ave, Pasig",      lat:14.5876, lng:121.0789, gasoline:73.9, diesel:83.5, kerosene:89.8, status:"open",   verified:true,  lastUpdated:"3 mins ago",  trend:"down"   },
  { id:7, name:"Petron",    branch:"Quezon Ave, QC",          lat:14.6392, lng:121.0089, gasoline:79.1, diesel:90.0, kerosene:96.2, status:"closed", verified:true,  lastUpdated:"1 hr ago",    trend:"up"     },
  { id:8, name:"Shell",     branch:"Roxas Blvd, Pasay",       lat:14.5376, lng:120.9932, gasoline:76.0, diesel:86.8, kerosene:93.0, status:"open",   verified:false, lastUpdated:"8 mins ago",  trend:"stable" },
];

const priceHistory = [
  { week:"Jan 13", gasoline:62.5, diesel:60.2 },
  { week:"Jan 20", gasoline:63.1, diesel:61.0 },
  { week:"Jan 27", gasoline:64.8, diesel:62.5 },
  { week:"Feb 3",  gasoline:65.2, diesel:64.1 },
  { week:"Feb 10", gasoline:66.0, diesel:65.8 },
  { week:"Feb 17", gasoline:67.5, diesel:67.2 },
  { week:"Feb 24", gasoline:69.8, diesel:70.1 },
  { week:"Mar 3",  gasoline:72.4, diesel:75.3 },
  { week:"Mar 10", gasoline:77.5, diesel:88.0 },
];

const subsidies = [
  { sector:"PUV Operators",  benefit:"Direct fuel subsidy ₱6,500/mo per unit", status:"Open",    color:"#22c55e" },
  { sector:"Farmers",        benefit:"Subsidized diesel for farm equipment",    status:"Open",    color:"#22c55e" },
  { sector:"Fisherfolk",     benefit:"Fuel subsidy via BFAR program",          status:"Open",    color:"#22c55e" },
  { sector:"General Public", benefit:"Free EDSA, C5, Alabang-Cubao bus routes",status:"Active",  color:"#3b82f6" },
  { sector:"Motorcycles",    benefit:"Excise tax suspension (under evaluation)",status:"Pending", color:"#f5a623" },
];

const fuelTips = [
  "Fill up before Tuesday — next round of increases expected",
  "Maintain tire pressure: underinflated tires use 3% more fuel",
  "Avoid peak hours (7–9AM, 5–7PM) — idling burns fuel",
  "Cleanfuel & Jetti typically price ₱3–5 lower than major brands",
  "Free bus routes: EDSA Carousel, C5, Alabang-Cubao corridors",
];

const TABS      = ["finder","trends","calculator","ai","alerts","report"];
const TAB_ICONS = { finder:"📍", trends:"📈", calculator:"🧮", ai:"🤖", alerts:"🔔", report:"🚨" };
const TAB_TEXT  = { finder:"Finder", trends:"Trends", calculator:"Calc", ai:"AI", alerts:"Alerts", report:"Report" };
const vehicleDefaults = {
  motorcycle:{ consumption:35, fuel:"gasoline" }, tricycle:{ consumption:25, fuel:"gasoline" },
  sedan:{ consumption:12, fuel:"gasoline" },      suv:{ consumption:9, fuel:"gasoline" },
  truck:{ consumption:6, fuel:"diesel" },         jeepney:{ consumption:8, fuel:"diesel" },
  bus:{ consumption:4, fuel:"diesel" },
};
const VEHICLE_EMOJI = { motorcycle:"🏍", tricycle:"🛺", sedan:"🚗", suv:"🚙", truck:"🚛", jeepney:"🚌", bus:"🚍" };
const pinPositions = [
  { left:"30%", top:"40%" }, { left:"47%", top:"44%" }, { left:"62%", top:"58%" }, { left:"54%", top:"20%" },
  { left:"37%", top:"27%" }, { left:"67%", top:"37%" }, { left:"20%", top:"62%" }, { left:"16%", top:"74%" },
];

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = ((lat2-lat1)*Math.PI)/180, dLng = ((lng2-lng1)*Math.PI)/180;
  const a = Math.sin(dLat/2)**2 + Math.cos((lat1*Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function askAI(messages) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return "⚠️ AI Advisor not configured. Add VITE_ANTHROPIC_API_KEY to your .env file.";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true" },
    body:JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:400,
      system:`You are FuelWatch AI, a smart fuel advisor for the Philippines. Today: March 12, 2026. Prices: Gasoline ₱74–79/L, Diesel ₱83–90/L, Kerosene ₱89–96/L. Cheapest: Jetti Ortigas (Diesel ₱83.5), Cleanfuel C5 (Gas ₱74.2). 9 straight weeks of increases. Next week: +₱7–13 gas, +₱17–24 diesel. Subsidies open for PUV, farmers, fisherfolk. Free EDSA bus active. Be concise and practical. Max 3–4 sentences.`,
      messages,
    }),
  });
  const data = await res.json();
  return data.error ? `Error: ${data.error.message}` : (data.content?.[0]?.text || "No response.");
}

export default function App() {
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth]       = useState(false);
  const [authMode, setAuthMode]       = useState("login");
  const [authForm, setAuthForm]       = useState({ name:"", email:"", password:"" });
  const [authError, setAuthError]     = useState("");
  const [authBusy, setAuthBusy]       = useState(false);

  const [userLoc, setUserLoc]         = useState(null);
  const [locStatus, setLocStatus]     = useState("idle");
  const [locCity, setLocCity]         = useState("");

  const [tab, setTab]                         = useState("finder");
  const [selectedFuel, setSelectedFuel]       = useState("diesel");
  const [sortBy, setSortBy]                   = useState("distance");
  const [selectedStation, setSelectedStation] = useState(null);
  const [tipIndex, setTipIndex]               = useState(0);

  const [vehicle, setVehicle]           = useState("sedan");
  const [km, setKm]                     = useState(100);
  const [consumption, setConsumption]   = useState(12);
  const [fuelType, setFuelType]         = useState("gasoline");
  const [pricePerL, setPricePerL]       = useState(77.5);
  const [fillLiters, setFillLiters]     = useState(40);

  const [aiMessages, setAiMessages] = useState([{ role:"assistant", content:"Hi! I'm FuelWatch AI 🤖 Ask me anything about fuel prices, cheapest stations near you, subsidies, or how to cut costs!" }]);
  const [aiInput, setAiInput]       = useState("");
  const [aiLoading, setAiLoading]   = useState(false);
  const aiEndRef = useRef(null);

  const [firestoreReports, setFirestoreReports] = useState([]);
  const [report, setReport]     = useState({ station:"", branch:"", type:"diesel", price:"", issue:"" });
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  // Firebase auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  // Firestore live reports
  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setFirestoreReports(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, []);

  // Geolocation
  const requestLocation = () => {
    if (!navigator.geolocation) { setLocStatus("denied"); return; }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude:lat, longitude:lng } = pos.coords;
        setUserLoc({ lat, lng });
        setLocStatus("granted");
        setSortBy("distance");
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          .then(r=>r.json())
          .then(d=>setLocCity(d.address?.city||d.address?.town||d.address?.suburb||d.address?.county||"Your Area"))
          .catch(()=>setLocCity("Your Location"));
      },
      () => setLocStatus("denied"),
      { timeout:8000 }
    );
  };

  useEffect(() => { requestLocation(); }, []);
  useEffect(() => {
    const t = setInterval(() => setTipIndex(i=>(i+1)%fuelTips.length), 4000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [aiMessages, aiLoading]);

  const stationsWithDist = stations.map(s => ({
    ...s,
    distance: userLoc ? parseFloat(getDistanceKm(userLoc.lat, userLoc.lng, s.lat, s.lng).toFixed(1)) : parseFloat((s.id * 0.8).toFixed(1)),
  }));

  const sorted   = [...stationsWithDist].filter(s=>s.status==="open").sort((a,b)=>sortBy==="price"?a[selectedFuel]-b[selectedFuel]:a.distance-b.distance);
  const cheapest = Math.min(...stationsWithDist.filter(s=>s.status==="open").map(s=>s[selectedFuel]));

  const cW=520, cH=110;
  const maxV=Math.max(...priceHistory.map(d=>Math.max(d.gasoline,d.diesel)));
  const minV=Math.min(...priceHistory.map(d=>Math.min(d.gasoline,d.diesel)));
  const toY=v=>cH-((v-minV)/(maxV-minV))*cH;
  const pts=priceHistory.map((d,i)=>({ x:(i/(priceHistory.length-1))*cW, gY:toY(d.gasoline), dY:toY(d.diesel) }));
  const gasPath=pts.map((p,i)=>`${i===0?"M":"L"} ${p.x} ${p.gY}`).join(" ");
  const dslPath=pts.map((p,i)=>`${i===0?"M":"L"} ${p.x} ${p.dY}`).join(" ");

  const tripCost     = ((km/consumption)*pricePerL).toFixed(2);
  const fillCost     = (fillLiters*pricePerL).toFixed(2);
  const monthlyTotal = parseInt(((40*22+20*20+80*4)/consumption)*pricePerL).toLocaleString();

  const handleVehicle = v => { setVehicle(v); setConsumption(vehicleDefaults[v].consumption); setFuelType(vehicleDefaults[v].fuel); setPricePerL(vehicleDefaults[v].fuel==="diesel"?88:77.5); };

  const handleAuth = async () => {
    setAuthError(""); setAuthBusy(true);
    try {
      if (authMode==="login") {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      } else {
        if (!authForm.name) { setAuthError("Name is required."); setAuthBusy(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        await updateProfile(cred.user, { displayName: authForm.name });
      }
      setShowAuth(false); setAuthForm({ name:"", email:"", password:"" });
    } catch(e) {
      const msgs = { "auth/email-already-in-use":"Email already registered.","auth/invalid-email":"Invalid email.","auth/weak-password":"Password must be at least 6 characters.","auth/invalid-credential":"Invalid email or password.","auth/user-not-found":"No account found.","auth/wrong-password":"Incorrect password." };
      setAuthError(msgs[e.code]||e.message);
    }
    setAuthBusy(false);
  };

  const handleReport = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!report.station || !report.price) return;
    setReportBusy(true);
    try {
      await addDoc(collection(db,"reports"), { ...report, userName:user.displayName||user.email, userId:user.uid, createdAt:serverTimestamp(), status:"Submitted" });
      setReportDone(true); setReport({ station:"", branch:"", type:"diesel", price:"", issue:"" });
      setTimeout(()=>setReportDone(false), 4000);
    } catch(e) { alert("Error: "+e.message); }
    setReportBusy(false);
  };

  const sendAI = async () => {
    if (!aiInput.trim()||aiLoading) return;
    const userMsg = { role:"user", content:aiInput.trim() };
    setAiMessages(p=>[...p,userMsg]); setAiInput(""); setAiLoading(true);
    const reply = await askAI([...aiMessages,userMsg].map(m=>({ role:m.role, content:m.content })));
    setAiMessages(p=>[...p,{ role:"assistant", content:reply }]); setAiLoading(false);
  };

  if (authLoading) return (
    <div className="loading-screen">
      <div className="loading-icon">⛽</div>
      <div style={{ fontFamily:"DM Serif Display,serif", fontSize:22, color:"#1a1714" }}>FuelWatch <span style={{color:"#e8820c"}}>PH</span></div>
      <div style={{ fontSize:12, color:"#a09890" }}>Loading...</div>
    </div>
  );

  return (
    <div className="app">
      {showAuth && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowAuth(false)}>
          <div className="modal">
            <div className="modal-title">{authMode==="login"?"Sign In":"Create Account"}</div>
            <div className="modal-sub">{authMode==="login"?"Access reporting, AI advisor & alerts":"Join the FuelWatch PH community"}</div>
            {authError && <div className="error-msg">{authError}</div>}
            <div className="form-stack">
              {authMode==="register" && <div><label className="fw-label">Full Name</label><input className="fw-input" placeholder="Juan dela Cruz" value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))}/></div>}
              <div><label className="fw-label">Email</label><input className="fw-input" type="email" placeholder="juan@email.com" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))}/></div>
              <div><label className="fw-label">Password</label><input className="fw-input" type="password" placeholder="Min. 6 characters" value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAuth()}/></div>
              <button className="fw-submit" onClick={handleAuth} disabled={authBusy}>{authBusy?"Please wait...":(authMode==="login"?"Sign In":"Sign Up")}</button>
              <div className="auth-switch">{authMode==="login"?"No account? ":"Already registered? "}<span className="link" onClick={()=>{setAuthMode(m=>m==="login"?"register":"login");setAuthError("");}}>{authMode==="login"?"Sign Up":"Sign In"}</span></div>
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-inner">
          <div className="header-top">
            <div className="logo">
              <div className="logo-icon">⛽</div>
              <div><div className="logo-name">FUELWATCH <span className="accent">PH</span></div><div className="logo-sub">REAL-TIME FUEL MONITOR</div></div>
            </div>
            <div className="header-right">
              <button className="loc-btn" onClick={requestLocation}>
                {locStatus==="loading"?"⏳ Detecting...":locStatus==="granted"?`📍 ${locCity}`:locStatus==="denied"?"📍 Location Denied":"📍 Detect Location"}
              </button>
              <div className="diesel-alert"><div className="diesel-label">Diesel Alert</div><div className="diesel-val">₱88–94<span className="diesel-unit">/L</span></div></div>
              {user ? (
                <div className="user-pill" onClick={()=>signOut(auth)}>
                  <div className="avatar">{(user.displayName||user.email)[0].toUpperCase()}</div>
                  <div><div className="user-name">{(user.displayName||user.email).split(" ")[0]}</div><div className="sign-out">Sign out</div></div>
                </div>
              ) : <button className="sign-in-btn" onClick={()=>setShowAuth(true)}>Sign In</button>}
              <div className="live-badge"><div className="pulse"/><span className="live-text">LIVE</span></div>
            </div>
          </div>
          <div className="stat-bar">
            {[{label:"Gasoline RON95",val:"₱74–79/L",change:"+₱10.43 this week"},{label:"Diesel",val:"₱83–90/L",change:"+₱19.62 this week"},{label:"Kerosene",val:"₱89–96/L",change:"+₱24.92 this week"},{label:"Next Adjust",val:"Mar 17",change:"Est. +₱7–24/L"}].map((s,i)=>(
              <div key={i} className="stat-item" style={{borderRight:i<3?"1px solid var(--border)":"none"}}>
                <div className="stat-label">{s.label}</div><div className="stat-val">{s.val}</div><div className="stat-change">{s.change}</div>
              </div>
            ))}
          </div>
          <div className="ticker"><div className="ticker-badge">TIP</div><div className="ticker-text" key={tipIndex}>{fuelTips[tipIndex]}</div></div>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-inner">
          {TABS.map(t=>(
            <button key={t} className={`tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
              <span className="tab-icon">{TAB_ICONS[t]}</span><span className="tab-text">{TAB_TEXT[t]}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="main">

        {tab==="finder" && (
          <div className="map-layout">
            <div className="card">
              <div className="card-header">
                <span className="card-title">Station Map</span>
                <span className="card-sub">{locStatus==="granted"?`📍 ${locCity} — sorted by distance`:"📍 Enable location for nearest stations"}</span>
              </div>
              <div className="map-canvas">
                {[...Array(6)].map((_,i)=><div key={i} className="grid-col" style={{left:`${i*20}%`}}/>)}
                {[...Array(5)].map((_,i)=><div key={i} className="grid-row" style={{top:`${i*25}%`}}/>)}
                <div className="road-v" style={{left:"30%"}}/><div className="road-v" style={{left:"62%"}}/>
                <div className="road-h" style={{top:"42%"}}/><div className="road-h" style={{top:"70%"}}/>
                <div className="road-label" style={{left:"28%",top:"4%"}}>EDSA</div>
                <div className="road-label" style={{left:"60%",top:"4%"}}>C5</div>
                {stations.map((s,i)=>{
                  const pos=pinPositions[i], isSel=selectedStation?.id===s.id, price=s[selectedFuel];
                  const isCheap=price===cheapest;
                  const color=s.status==="closed"?"#3a3f50":isCheap?"#22c55e":price>cheapest+3?"#ef4444":"#f5a623";
                  const dist=stationsWithDist[i].distance;
                  return (
                    <div key={s.id} className="pin-wrap" style={{...pos,zIndex:isSel?10:1}}>
                      <div className="pin" style={{background:isSel?color:"#111827",borderColor:color,color:isSel?"#0a0e17":color,boxShadow:isSel?`0 0 14px ${color}`:"none"}} onClick={()=>setSelectedStation(isSel?null:s)}>⛽</div>
                      {isSel&&<div className="pin-popup" style={{borderColor:color}}>
                        <div style={{fontWeight:700,color}}>{s.name} — {s.branch.split(",")[0]}</div>
                        <div style={{fontSize:15,fontWeight:800}}>₱{s[selectedFuel]}/L</div>
                        <div style={{fontSize:10,color:"#5a6070",fontFamily:"Barlow,sans-serif"}}>📍 {dist} km {locStatus==="granted"?"from you":"away"}</div>
                      </div>}
                    </div>
                  );
                })}
                <div className="you-pin"/>
                <div className="map-legend">
                  {[["#22c55e","Cheapest"],["#f5a623","Average"],["#ef4444","Expensive"],["#3b82f6","You"]].map(([c,l])=>(
                    <div key={l} className="legend-item"><div className="legend-dot" style={{background:c}}/><span>{l}</span></div>
                  ))}
                </div>
                {locStatus!=="granted"&&<button onClick={requestLocation} style={{position:"absolute",bottom:12,left:12,background:"#3b82f6",color:"#fff",border:"none",borderRadius:3,padding:"8px 14px",fontSize:11,fontFamily:"Barlow Condensed,sans-serif",fontWeight:700,cursor:"pointer",letterSpacing:1}}>
                  {locStatus==="loading"?"⏳ DETECTING...":"📍 USE MY LOCATION"}
                </button>}
              </div>
            </div>
            <div className="station-panel">
              <div className="filter-row">
                <div className="chip-group">
                  {["gasoline","diesel","kerosene"].map(f=><button key={f} className={`chip ${selectedFuel===f?"chip-active":""}`} onClick={()=>setSelectedFuel(f)}>{f==="gasoline"?"Gas":f==="kerosene"?"Kero":"Diesel"}</button>)}
                </div>
                <div className="chip-group">
                  <button className={`btn-sm ${sortBy==="price"?"btn-active":""}`} onClick={()=>setSortBy("price")}>Price</button>
                  <button className={`btn-sm ${sortBy==="distance"?"btn-active":""}`} onClick={()=>setSortBy("distance")}>{locStatus==="granted"?"📍 Near Me":"Dist"}</button>
                </div>
              </div>
              <div className="station-list">
                {sorted.map((s,i)=>{
                  const price=s[selectedFuel], tier=price===cheapest?"cheap":price>cheapest+3?"exp":"mid";
                  return (
                    <div key={s.id} className={`station-card ${tier} ${selectedStation?.id===s.id?"sel":""}`} onClick={()=>setSelectedStation(s)}>
                      <div className="station-row">
                        <div className="station-info">
                          <div className="station-name-row">
                            <span className="station-name">{s.name}</span>
                            {i===0&&<span className="cheapest-badge">{locStatus==="granted"?"NEAREST":"CHEAPEST"}</span>}
                            {s.verified&&<span className="verified">✓</span>}
                          </div>
                          <div className="station-branch">{s.branch}</div>
                          <div className="station-meta">📍 {s.distance} km {locStatus==="granted"?"from you":""} • {s.lastUpdated}</div>
                        </div>
                        <div className="station-price-col">
                          <div className="station-price" style={{color:tier==="cheap"?"#22c55e":tier==="exp"?"#ef4444":"#f5a623"}}>₱{price}</div>
                          <div className={`trend trend-${s.trend}`}>{s.trend==="up"?"▲ Rising":s.trend==="down"?"▼ Dropping":"— Stable"}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="report-link">Crowdsourced + DOE feed • <span className="link" onClick={()=>setTab("report")}>Report wrong price</span></div>
            </div>
          </div>
        )}

        {tab==="trends" && (
          <div className="col-stack">
            <div className="card" style={{padding:20}}>
              <div className="section-title">Weekly Price Movement — Metro Manila</div>
              <div className="section-sub">Jan 13 – Mar 10, 2026 • 9 consecutive weeks of increase</div>
              <div style={{overflowX:"auto"}}>
                <svg viewBox={`0 0 ${cW} ${cH+36}`} style={{width:"100%",minWidth:300,height:180}}>
                  <defs>
                    <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f5a623" stopOpacity="0.25"/><stop offset="100%" stopColor="#f5a623" stopOpacity="0"/></linearGradient>
                    <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.25"/><stop offset="100%" stopColor="#ef4444" stopOpacity="0"/></linearGradient>
                  </defs>
                  {[0,28,55,83,110].map(y=><line key={y} x1={0} y1={y} x2={cW} y2={y} stroke="#1e2535" strokeWidth={1}/>)}
                  <path d={`${gasPath} L ${cW} ${cH} L 0 ${cH} Z`} fill="url(#gG)"/><path d={`${dslPath} L ${cW} ${cH} L 0 ${cH} Z`} fill="url(#gD)"/>
                  <path d={gasPath} fill="none" stroke="#f5a623" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
                  <path d={dslPath} fill="none" stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
                  {pts.map((p,i)=><g key={i}><circle cx={p.x} cy={p.gY} r={i===pts.length-1?5:3} fill="#f5a623"/><circle cx={p.x} cy={p.dY} r={i===pts.length-1?5:3} fill="#ef4444"/></g>)}
                  {priceHistory.map((d,i)=><text key={i} x={pts[i].x} y={cH+18} textAnchor="middle" fill="#3a4050" fontSize={8} fontFamily="Barlow Condensed" fontWeight={600}>{d.week}</text>)}
                  <text x={cW-4} y={pts[pts.length-1].gY-8} fill="#f5a623" fontSize={10} textAnchor="end" fontFamily="Barlow Condensed" fontWeight={700}>₱{priceHistory[priceHistory.length-1].gasoline}</text>
                  <text x={cW-4} y={pts[pts.length-1].dY-8} fill="#ef4444" fontSize={10} textAnchor="end" fontFamily="Barlow Condensed" fontWeight={700}>₱{priceHistory[priceHistory.length-1].diesel}</text>
                </svg>
              </div>
              <div className="chart-legend">
                {[["#f5a623","Gasoline","+₱15.0 since Jan 13"],["#ef4444","Diesel","+₱27.8 since Jan 13"]].map(([c,l,d])=>(
                  <div key={l} className="chart-legend-item"><div style={{width:18,height:2,background:c}}/><span>{l} <span style={{color:"#ef4444"}}>{d}</span></span></div>
                ))}
              </div>
            </div>
            <div className="grid-3">
              {[{label:"Gasoline Total",val:"+₱15.0/L",sub:"since Jan 13",color:"#f5a623"},{label:"Diesel Total",val:"+₱27.8/L",sub:"11 straight weeks",color:"#ef4444"},{label:"Next Week Est",val:"+₱7–24/L",sub:"by fuel type",color:"#a855f7"}].map((s,i)=>(
                <div key={i} className="card" style={{padding:18}}>
                  <div className="stat-label">{s.label}</div>
                  <div style={{fontSize:28,fontWeight:900,color:s.color,marginTop:4,lineHeight:1}}>{s.val}</div>
                  <div style={{fontSize:11,color:"#5a6070",fontFamily:"Barlow,sans-serif",marginTop:4}}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="calculator" && (
          <div className="grid-2">
            <div className="col-stack">
              <div className="card" style={{padding:20}}>
                <div className="section-title" style={{marginBottom:14}}>Vehicle Type</div>
                <div className="vehicle-grid">
                  {Object.keys(vehicleDefaults).map(v=><button key={v} className={`vehicle-btn ${vehicle===v?"vehicle-active":""}`} onClick={()=>handleVehicle(v)}><span>{VEHICLE_EMOJI[v]}</span><span style={{textTransform:"capitalize",fontSize:10}}>{v}</span></button>)}
                </div>
              </div>
              <div className="card" style={{padding:20}}>
                <div className="section-title" style={{marginBottom:16}}>Trip Calculator</div>
                {[{label:`Distance: ${km} km`,val:km,set:setKm,min:5,max:500,step:5},{label:`Consumption: ${consumption} km/L`,val:consumption,set:setConsumption,min:3,max:40,step:1},{label:`Fuel Price: ₱${pricePerL}/L`,val:pricePerL,set:setPricePerL,min:60,max:110,step:0.5}].map(({label,val,set,min,max,step})=>(
                  <div key={label} style={{marginBottom:18}}>
                    <div style={{fontSize:12,color:"#a0aab8",fontFamily:"Barlow,sans-serif",marginBottom:6}}>{label}</div>
                    <input type="range" className="fw-range" min={min} max={max} step={step} value={val} onChange={e=>set(Number(e.target.value))}/>
                  </div>
                ))}
                <div className="result-box" style={{borderColor:"#f5a623"}}>
                  <div className="result-label">Trip Cost</div><div className="result-val" style={{color:"#f5a623"}}>₱{tripCost}</div><div className="result-sub">for {km} km</div>
                </div>
              </div>
            </div>
            <div className="col-stack">
              <div className="card" style={{padding:20}}>
                <div className="section-title" style={{marginBottom:14}}>Fill-Up Calculator</div>
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:12,color:"#a0aab8",fontFamily:"Barlow,sans-serif",marginBottom:6}}>Liters to fill: {fillLiters}L</div>
                  <input type="range" className="fw-range" min={5} max={80} step={1} value={fillLiters} onChange={e=>setFillLiters(Number(e.target.value))}/>
                </div>
                <div className="result-box" style={{borderColor:"#22c55e",marginBottom:14}}>
                  <div className="result-label">Fill Cost</div><div className="result-val" style={{color:"#22c55e"}}>₱{fillCost}</div><div className="result-sub">{fillLiters}L of {fuelType} @ ₱{pricePerL}/L</div>
                </div>
                <div className="fw-label" style={{marginBottom:8}}>Fuel Type</div>
                <div className="chip-group">
                  {["gasoline","diesel","kerosene"].map(f=><button key={f} className={`chip ${fuelType===f?"chip-active":""}`} style={{flex:1}} onClick={()=>{setFuelType(f);setPricePerL(f==="diesel"?88:f==="kerosene"?92:77.5);}}>{f==="gasoline"?"Gas":f==="kerosene"?"Kero":"Diesel"}</button>)}
                </div>
              </div>
              <div className="card" style={{padding:20}}>
                <div className="section-title" style={{marginBottom:14}}>Monthly Budget</div>
                {[{label:"Daily commute (40km × 22d)",cost:((40*22/consumption)*pricePerL).toFixed(0)},{label:"School run (20km × 20d)",cost:((20*20/consumption)*pricePerL).toFixed(0)},{label:"Weekend trips (80km × 4)",cost:((80*4/consumption)*pricePerL).toFixed(0)}].map((r,i)=>(
                  <div key={i} className="budget-row"><span>{r.label}</span><span style={{fontWeight:800,fontSize:15}}>₱{parseInt(r.cost).toLocaleString()}</span></div>
                ))}
                <div className="budget-total"><span>TOTAL MONTHLY</span><span style={{fontSize:22,fontWeight:900,color:"#f5a623"}}>₱{monthlyTotal}</span></div>
              </div>
            </div>
          </div>
        )}

        {tab==="ai" && (
          <div className="grid-2" style={{alignItems:"start"}}>
            <div className="card ai-card">
              <div className="card-header">
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div className="ai-avatar">🤖</div>
                  <div><div className="card-title" style={{fontSize:12}}>FuelWatch AI</div><div style={{fontSize:10,color:"#22c55e",fontFamily:"Barlow,sans-serif"}}>● Online</div></div>
                </div>
                {locStatus==="granted"&&<div style={{fontSize:10,color:"#5a6070",fontFamily:"Barlow,sans-serif"}}>📍 {locCity}</div>}
              </div>
              <div className="ai-messages">
                {aiMessages.map((m,i)=><div key={i} className={`bubble ${m.role==="assistant"?"bubble-ai":"bubble-user"}`}>{m.content}</div>)}
                {aiLoading&&<div className="bubble bubble-ai"><div className="typing"><div className="dot"/><div className="dot"/><div className="dot"/></div></div>}
                <div ref={aiEndRef}/>
              </div>
              <div className="ai-input-row">
                <input className="fw-input" placeholder="Ask about prices, subsidies, tips..." value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendAI()}/>
                <button className="fw-submit" style={{width:"auto",padding:"10px 16px",fontSize:12}} onClick={sendAI} disabled={aiLoading||!aiInput.trim()}>Send</button>
              </div>
            </div>
            <div className="col-stack">
              <div className="card" style={{padding:18}}>
                <div className="section-title" style={{marginBottom:14}}>Quick Questions</div>
                {["Where's the cheapest diesel near me?","Should I fill up now or wait?","Am I eligible for fuel subsidies?","How can I reduce my monthly fuel bill?","What's causing the price hike?","What free bus routes are available?"].map((q,i)=>(
                  <button key={i} className="quick-q" onClick={()=>setAiInput(q)}>→ {q}</button>
                ))}
              </div>
              <div className="card" style={{padding:18,background:"#f5a62308",borderColor:"#f5a62330"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#f5a623",letterSpacing:1,marginBottom:10}}>⚡ AI CAPABILITIES</div>
                {["Real-time price comparison advice","Subsidy eligibility checker","Fuel-saving tips for your vehicle","Fill-up timing recommendations","Location-aware station suggestions"].map((c,i)=>(
                  <div key={i} className="cap-item"><span style={{color:"#22c55e"}}>✓</span>{c}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab==="alerts" && (
          <div className="grid-2">
            <div>
              <div className="section-title" style={{marginBottom:14}}>Live Alerts</div>
              {[{type:"high",text:"Unauthorized hike: Petron Tagum City raised diesel ₱8.35 before schedule",time:"1h ago"},{type:"info",text:"DOE subsidy applications now open for PUV operators, farmers & fisherfolk",time:"3h ago"},{type:"warning",text:"Next adjustment Tuesday: Diesel +₱17–24/L, Gasoline +₱7–13/L expected",time:"6h ago"},{type:"good",text:"Jetti Ortigas has cheapest diesel in Metro Manila right now at ₱83.5/L",time:"10m ago"},{type:"info",text:"Free EDSA Carousel bus service extended until further notice",time:"2h ago"}].map((a,i)=>{
                const colors={high:"#ef4444",info:"#3b82f6",warning:"#f5a623",good:"#22c55e"};
                const icons={high:"🚨",info:"ℹ️",warning:"⚠️",good:"✅"};
                return <div key={i} className="alert-item" style={{background:`${colors[a.type]}11`,borderColor:colors[a.type]}}><span style={{fontSize:14,flexShrink:0}}>{icons[a.type]}</span><div><div className="alert-text">{a.text}</div><div className="alert-time">{a.time}</div></div></div>;
              })}
            </div>
            <div>
              <div className="section-title" style={{marginBottom:14}}>Government Subsidies</div>
              {subsidies.map((s,i)=>(
                <div key={i} className="card subsidy-card">
                  <div><div style={{fontWeight:700,fontSize:13}}>{s.sector}</div><div className="station-branch">{s.benefit}</div></div>
                  <div className="status-badge" style={{background:`${s.color}22`,color:s.color}}>{s.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="report" && (
          <div className="grid-2">
            <div className="card" style={{padding:22}}>
              <div className="section-title" style={{marginBottom:6}}>Report a Violation</div>
              <div className="section-sub" style={{marginBottom:18}}>
                {user?`Signed in as ${user.displayName||user.email}`:<><span className="link" onClick={()=>setShowAuth(true)}>Sign in</span> to submit a report.</>}
              </div>
              {reportDone?(
                <div className="success-msg">✓ Report saved to database! Forwarded to DOE within 24 hours. Thank you! 🙏</div>
              ):(
                <div className="form-stack">
                  <div><label className="fw-label">Station Brand</label>
                    <select className="fw-input" value={report.station} onChange={e=>setReport(r=>({...r,station:e.target.value}))}>
                      <option value="">Select station...</option>
                      {["Petron","Shell","Cleanfuel","Seaoil","Flying V","Jetti","Caltex","Unbranded/Other"].map(s=><option key={s}>{s}</option>)}
                    </select></div>
                  <div><label className="fw-label">Branch / Address</label><input className="fw-input" placeholder="e.g. EDSA Guadalupe, Makati" value={report.branch} onChange={e=>setReport(r=>({...r,branch:e.target.value}))}/></div>
                  <div className="grid-2" style={{gap:10}}>
                    <div><label className="fw-label">Fuel Type</label>
                      <select className="fw-input" value={report.type} onChange={e=>setReport(r=>({...r,type:e.target.value}))}>
                        <option value="gasoline">Gasoline</option><option value="diesel">Diesel</option><option value="kerosene">Kerosene</option>
                      </select></div>
                    <div><label className="fw-label">Price (₱/L)</label><input className="fw-input" type="number" placeholder="95.50" value={report.price} onChange={e=>setReport(r=>({...r,price:e.target.value}))}/></div>
                  </div>
                  <div><label className="fw-label">Description</label><textarea className="fw-input" rows={3} placeholder="Describe the violation..." value={report.issue} onChange={e=>setReport(r=>({...r,issue:e.target.value}))} style={{resize:"none"}}/></div>
                  <button className="fw-submit" onClick={handleReport} disabled={reportBusy||!report.station||!report.price}>
                    {!user?"Sign In to Submit":reportBusy?"Saving to Database...":"Submit to DOE Monitoring Team"}
                  </button>
                </div>
              )}
            </div>
            <div className="col-stack">
              <div>
                <div className="section-title" style={{marginBottom:12}}>
                  Community Reports
                  <span style={{fontSize:11,color:"#5a6070",fontWeight:400,letterSpacing:0,marginLeft:8,textTransform:"none",fontFamily:"Barlow,sans-serif"}}>
                    {firestoreReports.length} total
                  </span>
                </div>
                {firestoreReports.length===0?(
                  <div style={{color:"#5a6070",fontFamily:"Barlow,sans-serif",fontSize:13,padding:"20px 0",textAlign:"center"}}>
                    No community reports yet.<br/>Be the first to report a violation! 🚨
                  </div>
                ):firestoreReports.slice(0,8).map((r,i)=>(
                  <div key={i} className="violation-card" style={{borderColor:"#f5a62330",borderLeftColor:"#f5a623",marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontWeight:700,fontSize:13}}>{r.station}{r.branch?` — ${r.branch}`:""}</span>
                      <span className="status-badge" style={{background:"#f5a62322",color:"#f5a623"}}>{r.status}</span>
                    </div>
                    <div className="station-branch">{r.type} • ₱{r.price}/L</div>
                    <div style={{fontSize:10,color:"#3a4050",fontFamily:"Barlow,sans-serif",marginTop:4}}>by {r.userName} {r.issue&&`• ${r.issue}`}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">FUELWATCH PH v3.0 • FIREBASE AUTH + GEOLOCATION • DATA: DOE PH + CROWDSOURCED • NOT AFFILIATED WITH GOVERNMENT</footer>
    </div>
  );
}
