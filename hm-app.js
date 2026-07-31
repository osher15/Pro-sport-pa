

"use strict";
/* ============================================================
   המגרש PRO — ליבה משותפת: אחסון, שמע, קול, ניווט, עזרים
   ============================================================ */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const LS={
  get(k,d){try{const v=localStorage.getItem("pehub."+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem("pehub."+k,JSON.stringify(v))}catch(e){}}
};
const SET=Object.assign({school:"",sound:true,voice:true,wake:true},LS.get("settings",{}));
function saveSet(){LS.set("settings",SET);applySchool()}
function applySchool(){ $("#schoolSub").textContent = SET.school ? SET.school+" · ערכת שטח לחנ״ג" : "ערכת שטח למורה לחינוך גופני"; }

/* ---------- audio ---------- */
let AC=null;
function ac(){ if(!AC){ try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){} } if(AC&&AC.state==="suspended")AC.resume(); return AC; }
function beep(freq=880,dur=0.12,vol=0.5,type="square"){
  if(!SET.sound)return; const c=ac(); if(!c)return;
  const o=c.createOscillator(),g=c.createGain();
  o.type=type;o.frequency.value=freq;o.connect(g);g.connect(c.destination);
  g.gain.setValueAtTime(vol,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dur);
  o.start();o.stop(c.currentTime+dur);
}
function horn(){ if(!SET.sound)return; beep(520,0.45,0.6,"sawtooth"); setTimeout(()=>beep(392,0.5,0.6,"sawtooth"),60); }
function tripleBeep(){ beep(660,0.1); setTimeout(()=>beep(660,0.1),150); setTimeout(()=>beep(990,0.22),300); }
function say(txt){
  if(!SET.voice||!("speechSynthesis"in window))return;
  try{ const u=new SpeechSynthesisUtterance(txt); u.lang="he-IL"; u.rate=1.05; speechSynthesis.cancel(); speechSynthesis.speak(u);}catch(e){}
}

/* ---------- wake lock ---------- */
let wakeLock=null;
async function keepAwake(on){
  try{
    if(on&&SET.wake&&"wakeLock"in navigator){ wakeLock=await navigator.wakeLock.request("screen"); }
    else if(!on&&wakeLock){ wakeLock.release(); wakeLock=null; }
  }catch(e){}
}
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"&&wakeLock)keepAwake(true); });

/* ---------- toast / confetti / csv / time ---------- */
let toastTm=null;
function toast(msg){ const t=$("#toastT"); t.textContent=msg; t.classList.add("show"); clearTimeout(toastTm); toastTm=setTimeout(()=>t.classList.remove("show"),2600); }
function confetti(n=90){
  const colors=["#19d27a","#19c3ff","#ffce3a","#ff7a3d","#b07cff","#ff4d5e"];
  for(let i=0;i<n;i++){ const d=document.createElement("div"); d.className="cfp";
    d.style.left=Math.random()*100+"vw"; d.style.background=colors[i%colors.length];
    d.style.animationDelay=(Math.random()*0.7)+"s"; d.style.animationDuration=(2+Math.random()*1.4)+"s";
    document.body.appendChild(d); setTimeout(()=>d.remove(),4200); }
}
function dlCSV(name,rows){
  const esc=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const csv="\uFEFF"+rows.map(r=>r.map(esc).join(",")).join("\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
function fmtMS(t){ const m=Math.floor(t/60), s=Math.floor(t%60); return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0"); }
function fmtMSc(t){ const m=Math.floor(t/60), s=Math.floor(t%60), c=Math.floor((t%1)*100); return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")+"."+String(c).padStart(2,"0"); }
function esc(s){ return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function modal(id,on){ $("#"+id).classList.toggle("on",on!==false); }
function wireModals(){
  $$("[data-close]").forEach(b=>b.addEventListener("click",()=>modal(b.dataset.close,false)));
  $$(".modal").forEach(m=>m.addEventListener("click",e=>{ if(e.target===m)m.classList.remove("on"); }));
}

/* ---------- roles: מורה מול תלמיד ----------
   מצב תלמיד הוא מצב תצוגה בלבד: רק לוח השיאים ודף המשחקים נגישים,
   ובלוח השיאים אפשר לצפות ולשלוח שיא — לא לאשר, לא לערוך ולא למחוק. */
const STUDENT_MODS={rec:1,games:1};
let ROLE=sessionStorage.getItem("pehub.role")||"teacher";
const isStudent=()=>ROLE==="student";
function setRole(r){
  ROLE=(r==="student")?"student":"teacher";
  sessionStorage.setItem("pehub.role",ROLE);
  applyRole();
}
function applyRole(){
  const stu=isStudent();
  document.body.classList.toggle("role-student",stu);
  $$(".nav button[data-go]").forEach(b=>{ b.style.display=(!stu||STUDENT_MODS[b.dataset.go])?"":"none"; });
  const st=$("#btnSettings"); if(st)st.style.display=stu?"none":"";
  const rb=$("#roleBadge");
  if(rb){ rb.style.display=stu?"":"none"; }
  if(typeof REC!=="undefined"&&REC.applyRole)REC.applyRole();
  if(stu&&!STUDENT_MODS[document.body.dataset.mod||""])go("rec");
}

/* ---------- router ---------- */
const MODS={home:1,beep:1,photo:1,rec:1,fit:1,stu:1,lesson:1,nut:1,games:1,know:1};
const inited={};
function go(mod){
  if(!MODS[mod])mod="home";
  if(isStudent()&&!STUDENT_MODS[mod])mod="rec";
  document.body.dataset.mod=mod;
  $$(".view").forEach(v=>v.classList.toggle("on",v.id==="view-"+mod));
  $$(".nav button").forEach(b=>b.classList.toggle("on",b.dataset.go===mod));
  if(!inited[mod]){ inited[mod]=true; const f={beep:BT.init,photo:PF.init,rec:REC.init,fit:FIT.init,home:homeInit,stu:window.STU.init,lesson:window.LESSON.init,nut:window.NUT.init,games:window.GAMES&&window.GAMES.init,know:window.KNOW&&window.KNOW.init}[mod]; if(f)f(); }
  if(mod==="home")homeStats();
  if(location.hash!=="#"+mod){ try{history.replaceState(null,"","#"+mod)}catch(e){} }
}
function wireNav(){ $$("[data-go]").forEach(el=>el.addEventListener("click",()=>{ ac(); go(el.dataset.go); })); }
window.addEventListener("hashchange",()=>go(location.hash.slice(1)||"home"));

/* ---------- home ---------- */
const TIPS=[
 "בביפ טסט: עמדו בקצה המסלול כך שכל הכיתה שומעת את הרמקול — והגבירו ווליום לפני הזינוק.",
 "בפוטו־פיניש: רשמו את הרצים לפי סדר המסלולים מהמהיר לאיטי — הזיהוי מקצה זמנים לפי סדר הרשימה.",
 "מצב טלוויזיה בלוח השיאים מצוין לכניסת בית הספר — חברו מחשב למסך ב‑HDMI ולחצו 📺.",
 "קוביית הכושר עובדת מעולה כחימום: 3 הטלות = חימום שלם בלי שאף תלמיד יתווכח עם קובייה.",
 "מסך הטלפון לא יכבה באמצע פעילות — מניעת כיבוי המסך פעילה כשטיימר רץ (אפשר לכבות בהגדרות).",
 "אפשר להתקין את האפליקציה למסך הבית — תפריט הדפדפן ואז ׳הוספה למסך הבית׳."
];
function homeInit(){ $("#fieldTip").textContent=TIPS[Math.floor(Math.random()*TIPS.length)]; }
function homeStats(){
  $("#qsRuns").textContent=LS.get("pf.totalRaces",0);
  const bb=LS.get("bt.best",null); $("#qsBeep").textContent=bb?bb+" מ׳":"—";
  if(typeof REC!=="undefined"&&REC.countApproved)REC.countApproved().then(n=>$("#qsRecs").textContent=n).catch(()=>{});
}

/* ---------- top clock ---------- */
setInterval(()=>{ const d=new Date(); const tc=$("#topClock"); if(!tc)return; tc.textContent=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); },1000);

/* ---------- settings ---------- */
function wireSettings(){
$("#btnSettings").addEventListener("click",()=>{ $("#set-school").value=SET.school; $("#set-sound").checked=SET.sound; $("#set-voice").checked=SET.voice; $("#set-wake").checked=SET.wake; modal("setModal"); });
$("#set-save").addEventListener("click",()=>{ SET.school=$("#set-school").value.trim(); SET.sound=$("#set-sound").checked; SET.voice=$("#set-voice").checked; SET.wake=$("#set-wake").checked; saveSet(); modal("setModal",false); toast("ההגדרות נשמרו"); });
}

/* ---------- PWA-ish manifest ---------- */
(function(){
  try{
    const cv=document.createElement("canvas"); cv.width=cv.height=192; const x=cv.getContext("2d");
    x.fillStyle="#06100c"; x.fillRect(0,0,192,192);
    x.fillStyle="#19d27a"; x.beginPath(); x.arc(96,96,70,0,7); x.fill();
    x.font="86px serif"; x.textAlign="center"; x.textBaseline="middle"; x.fillText("🏟️",96,104);
    const icon=cv.toDataURL("image/png");
    const man={name:"המגרש PRO",short_name:"המגרש",display:"standalone",dir:"rtl",lang:"he",
      start_url:location.href.split("#")[0],background_color:"#06100c",theme_color:"#06100c",
      icons:[{src:icon,sizes:"192x192",type:"image/png"}]};
    const l=document.createElement("link"); l.rel="manifest";
    l.href=URL.createObjectURL(new Blob([JSON.stringify(man)],{type:"application/manifest+json"}));
    document.head.appendChild(l);
  }catch(e){}
})();




"use strict";
/* ============================================================
   מודול 1 — ביפ טסט (BT) · ממוזג 1:1 עם BeepTest.html המקורי
   מנוע אודיו: scheduler על שעון Web Audio (דיוק מוחלט בביפים)
   ============================================================ */
const BT=(function(){
  const STAGE_SEC=60, MAX_SPEED=18.0;
  let distance=LS.get("bt.dist",20), startSpeed=LS.get("bt.start",5.0);
  let classAge=LS.get("bt.age",13), classSex=LS.get("bt.sex","boys");
  let beeps=[];
  const speedKmh=L=>startSpeed+0.5*(L-1);

  /* ----- protocol (כמו במקור) ----- */
  function buildSchedule(){
    beeps=[]; let t=0,cum=0;
    const levels=Math.round((MAX_SPEED-startSpeed)/0.5)+1;
    for(let L=1;L<=levels;L++){
      const st=distance/(speedKmh(L)/3.6);
      const n=Math.max(2,Math.round(STAGE_SEC/st));
      for(let s2=1;s2<=n;s2++){ t+=st; cum++;
        beeps.push({idx:cum,level:L,shInLvl:s2,shTot:n,cum:cum*distance,t,speed:speedKmh(L),levelEnd:(s2===n),last:false});
      }
    }
    beeps[beeps.length-1].last=true;
    buildRefTable(); updateWarn();
  }
  function isStandard(){ return distance===20&&startSpeed>=8.0; }
  function updateWarn(){
    $("#bt-warnBox").classList.toggle("show",!isStandard());
    const p=$("#bt-protoPill"); p.textContent=isStandard()?"פרוטוקול תקני":"פרוטוקול מותאם";
    p.classList.toggle("acc",isStandard());
  }

  /* ----- VO2 & FITNESSGRAM ----- */
  function vo2max(speed,age){ return 31.025+3.238*speed-3.248*age+0.1536*age*speed; }
  const HFZ={
    boys:{10:[37.3,40.2],11:[37.3,40.2],12:[37.6,40.3],13:[38.6,41.1],14:[39.6,42.5],15:[40.6,43.6],16:[41.0,44.1],17:[41.2,44.2],18:[41.2,44.3]},
    girls:{10:[37.3,40.2],11:[37.3,40.2],12:[37.0,40.1],13:[36.6,39.7],14:[36.3,39.4],15:[36.0,39.1],16:[35.8,38.9],17:[35.7,38.8],18:[35.3,38.6]}
  };
  const EXC=6.0;
  function stdFor(age,sex){ const a=Math.max(10,Math.min(18,Math.round(age))); return HFZ[sex][a]; }
  function classify(v,age,sex){
    const s=stdFor(age,sex),R=s[0],H=s[1];
    if(v>=H+EXC)return{g:"מצוין",c:"#19c3ff"};
    if(v>=H)return{g:"אזור בריא",c:"#c8ff2e"};
    if(v>R)return{g:"טעון שיפור",c:"#ffd23f"};
    return{g:"סיכון בריאותי",c:"#ff4d5e"};
  }

  /* ----- audio (envelope tones, scheduled on audio clock) ----- */
  function tone(at,freq,dur,vol){
    const c=ac(); if(!c||!SET.sound)return;
    const o=c.createOscillator(),g=c.createGain();
    o.type="square";o.frequency.value=freq;
    g.gain.setValueAtTime(0,at);
    g.gain.linearRampToValueAtTime(vol,at+0.01);
    g.gain.setValueAtTime(vol,at+dur-0.03);
    g.gain.linearRampToValueAtTime(0,at+dur);
    o.connect(g);g.connect(c.destination);
    o.start(at);o.stop(at+dur+0.02);
  }
  const beepNormal=at=>tone(at,1000,0.15,0.5);
  const beepLevel=at=>{tone(at,1500,0.16,0.55);tone(at+0.2,1500,0.16,0.55);tone(at+0.4,1500,0.16,0.55);};
  const beepStart=at=>tone(at,760,0.4,0.5);

  /* ----- engine ----- */
  let running=false,startAudioTime=0,elapsedOffset=0,audioIdx=0,schedTimer=null,raf=null,lastFlash=-1,lastLvl=0;
  function getElapsed(){ const c=AC; return running&&c?(c.currentTime-startAudioTime):elapsedOffset; }
  function scheduler(){
    const c=AC; if(!c)return;
    const now=c.currentTime;
    while(audioIdx<beeps.length&&(startAudioTime+beeps[audioIdx].t)<=now+0.15){
      const b=beeps[audioIdx],at=startAudioTime+b.t;
      if(b.last||b.levelEnd)beepLevel(at); else beepNormal(at);
      audioIdx++;
    }
  }
  function completedCount(el){
    let lo=0,hi=beeps.length;
    while(lo<hi){const m=(lo+hi)>>1; if(beeps[m].t<=el)lo=m+1; else hi=m;}
    return lo;
  }
  function render(){
    const el=getElapsed(), done=completedCount(el);
    const finished=el>=beeps[beeps.length-1].t;
    $("#bt-distVal").innerHTML=(done*distance).toLocaleString("he-IL")+"<small> מ׳</small>";
    $("#bt-timeVal").textContent=fmtMS(el);
    const segIdx=Math.min(done,beeps.length-1), cur=beeps[segIdx];
    $("#bt-stageVal").textContent=cur.level+" · "+cur.shInLvl+"/"+cur.shTot;
    $("#bt-speedVal").textContent=cur.speed.toFixed(1);
    $("#bt-lvlBar").style.width=(((finished?cur.shInLvl:cur.shInLvl-1)/cur.shTot)*100)+"%";
    if(done>0){const v=vo2max(beeps[done-1].speed,classAge);$("#bt-vo2Val").textContent=v>0?v.toFixed(1):"—";
      if(beeps[done-1].level!==lastLvl){lastLvl=beeps[done-1].level; if(beeps[done-1].levelEnd&&!finished)say("שלב "+(lastLvl+1));}
    } else $("#bt-vo2Val").textContent="—";
    if(done!==lastFlash&&done>0&&running){ lastFlash=done;
      const bd=$("#bt-statsCard"); bd.classList.remove("board-flash"); void bd.offsetWidth; bd.classList.add("board-flash"); }
    highlightRef(done);
    if(finished&&running){ finish(); return; }
    $("#bt-statePill").textContent=finished?"הסתיים":(running?"המבחן רץ":(elapsedOffset>0?"מושהה":"מוכן לזינוק"));
    if(running)raf=requestAnimationFrame(render);
  }
  function setSegEnabled(on){
    $$("#bt-distSeg button").forEach(b=>b.disabled=!on);
    ["#bt-spMinus","#bt-spPlus","#bt-spStd"].forEach(s2=>$(s2).disabled=!on);
  }
  function start(){
    if(running||!beeps.length)return;
    ac(); if(!AC)return;
    startAudioTime=AC.currentTime-elapsedOffset;
    audioIdx=0; while(audioIdx<beeps.length&&beeps[audioIdx].t<=elapsedOffset)audioIdx++;
    if(elapsedOffset===0){ beepStart(AC.currentTime+0.06); say("המבחן מתחיל"); }
    running=true; keepAwake(true); setSegEnabled(false);
    $("#bt-startBtn").innerHTML="⏸ השהה"; $("#bt-regBtn").disabled=false;
    schedTimer=setInterval(scheduler,25);
    raf=requestAnimationFrame(render);
  }
  function pause(){
    if(!running)return;
    elapsedOffset=getElapsed(); running=false; keepAwake(false);
    clearInterval(schedTimer); cancelAnimationFrame(raf);
    $("#bt-startBtn").innerHTML="▶ המשך"; render();
  }
  function reset(){
    running=false; clearInterval(schedTimer); cancelAnimationFrame(raf); keepAwake(false);
    elapsedOffset=0; audioIdx=0; lastFlash=-1; lastLvl=0;
    $("#bt-startBtn").innerHTML="▶ זינוק"; $("#bt-regBtn").disabled=true;
    setSegEnabled(true); render();
  }
  function finish(){
    elapsedOffset=beeps[beeps.length-1].t;
    running=false; clearInterval(schedTimer); cancelAnimationFrame(raf); keepAwake(false);
    say("סוף המבחן. כל הכבוד!"); $("#bt-statePill").textContent="הסתיים"; render();
  }

  /* ----- results (כמו במקור: מחיקה פר-שורה, דירוג קבוע לפי מרחק, תקרה 30) ----- */
  let results=LS.get("bt.results",[]), nextNum=results.length+1, sortBy="order";
  function persist(){
    LS.set("bt.results",results);
    if(results.length)LS.set("bt.best",Math.max(LS.get("bt.best",0)||0,...results.map(r=>r.dist)));
  }
  function registerDrop(){
    if(results.length>=30){toast("הלוח מלא (30 רישומים)");return;}
    const el=getElapsed(), done=completedCount(el);
    const lb=done>0?beeps[done-1]:{level:1,shInLvl:0,speed:startSpeed};
    results.push({id:Date.now()+Math.random(),name:"תלמיד "+nextNum,level:lb.level,sh:lb.shInLvl,dist:done*distance,time:+el.toFixed(1),speed:lb.speed});
    nextNum++; persist(); renderResults(); beep(440,0.16);
    toast("נרשם: "+(done*distance)+" מ׳ · שלב "+lb.level);
    if(results.length>=30)$("#bt-regBtn").disabled=true;
  }
  function renderResults(){
    $("#bt-empty").style.display=results.length?"none":"block";
    let view=results.map((r,i)=>({r,order:i}));
    if(sortBy==="dist")view.sort((a,b)=>b.r.dist-a.r.dist||a.r.time-b.r.time);
    const ranked=[...results].sort((a,b)=>b.dist-a.dist||a.time-b.time);
    const rankOf=new Map(); ranked.forEach((r,i)=>rankOf.set(r.id,i+1));
    $("#bt-tbody").innerHTML=view.map(({r})=>{
      const rk=rankOf.get(r.id), medal=rk===1?"🥇":rk===2?"🥈":rk===3?"🥉":rk;
      const v=vo2max(r.speed,classAge), ok=r.dist>0&&v>0;
      const cat=ok?classify(v,classAge,classSex):null;
      return `<tr><td class="rk">${medal}</td>
        <td><input class="nm" data-id="${r.id}" value="${esc(r.name)}" style="background:none;border:none;border-bottom:1px dashed var(--line);color:var(--ink);font-family:'Rubik';font-size:13.5px;width:110px"></td>
        <td class="mono">${r.level}·${r.sh}</td><td class="mono">${r.dist.toLocaleString("he-IL")} מ׳</td><td class="mono">${fmtMS(r.time)}</td>
        <td class="mono">${r.speed.toFixed(1)}</td><td class="mono">${ok?v.toFixed(1):"—"}</td>
        <td>${cat?`<span class="catpill" style="background:${cat.c}">${cat.g}</span>`:"—"}</td>
        <td><button class="x del" data-id="${r.id}" title="מחק">✕</button></td></tr>`;
    }).join("");
    $$("#bt-tbody .nm").forEach(inp=>inp.addEventListener("input",()=>{ const r=results.find(x=>x.id==inp.dataset.id); if(r){r.name=inp.value;persist();} }));
    $$("#bt-tbody .del").forEach(b=>b.addEventListener("click",()=>{
      results=results.filter(x=>x.id!=b.dataset.id); persist(); renderResults();
      $("#bt-regBtn").disabled=(running||elapsedOffset>0)?results.length>=30:true;
    }));
    $("#bt-undoBtn").disabled=!results.length;
  }

  /* ----- reference & norms (פורמט המקור) ----- */
  function buildRefTable(){
    let h='<table class="tbl"><thead><tr><th>שלב</th><th>מקטע</th><th>מהירות</th><th>סה״כ מרחק</th><th>זמן מצטבר</th></tr></thead><tbody>',L=0;
    beeps.forEach(b=>{
      if(b.level!==L){L=b.level;h+=`<tr style="background:#0f2419"><td class="rk">שלב ${L}</td><td class="mono">${b.shTot} מקטעים</td><td class="mono">${b.speed.toFixed(1)} קמ״ש</td><td colspan="2">—</td></tr>`;}
      h+=`<tr data-i="${b.idx}"><td class="mono">${b.level}</td><td class="mono">${b.shInLvl}</td><td class="mono">${b.speed.toFixed(1)}</td><td class="mono">${b.cum.toLocaleString("he-IL")} מ׳</td><td class="mono">${fmtMS(b.t)}</td></tr>`;
    });
    $("#bt-refWrap").innerHTML=h+"</tbody></table>";
  }
  function highlightRef(done){
    const host=$("#bt-refWrap"); const prev=host.querySelector("tr.ref-cur"); if(prev)prev.classList.remove("ref-cur");
    if(done<=0)return;
    const row=host.querySelector('tr[data-i="'+done+'"]');
    if(row){ row.classList.add("ref-cur");
      const det=$("#bt-refFold"); if(det&&det.open){const w=row.closest(".tblwrap")||row.parentElement;if(w)w.scrollTop=Math.max(0,row.offsetTop-w.clientHeight/2);} }
  }
  function buildNorms(){
    function tbl(sex){
      let h='<table class="tbl"><thead><tr><th>גיל</th><th><span class="dot" style="background:#ff4d5e"></span> סיכון בריאותי</th><th><span class="dot" style="background:#ffd23f"></span> טעון שיפור</th><th><span class="dot" style="background:#c8ff2e"></span> אזור בריא</th><th><span class="dot" style="background:#19c3ff"></span> מצוין</th></tr></thead><tbody>';
      for(let a=10;a<=17;a++){ const s2=HFZ[sex][a],R=s2[0],H=s2[1];
        h+=`<tr><td class="rk">${a}</td><td class="mono">≤ ${R.toFixed(1)}</td><td class="mono">${(R+0.1).toFixed(1)}–${(H-0.1).toFixed(1)}</td><td class="mono">${H.toFixed(1)}–${(H+EXC-0.1).toFixed(1)}</td><td class="mono">≥ ${(H+EXC).toFixed(1)}</td></tr>`; }
      return h+"</tbody></table>";
    }
    $("#bt-normWrap").innerHTML='<h2 style="font-size:14px"><span class="dot"></span> בנים</h2>'+tbl("boys")+
      '<h2 style="font-size:14px;margin-top:13px"><span class="dot"></span> בנות</h2>'+tbl("girls")+
      '<div class="hint" style="margin-top:8px">ערכים ב-VO₂max (ml·kg⁻¹·min⁻¹) · מבוסס FITNESSGRAM® (Cooper Institute) · "אזור בריא" = Healthy Fitness Zone, דרגת "מצוין" היא תוספת מעשית מעליו · גיל 9 מושווה לגיל 10.</div>';
  }

  /* ----- wiring ----- */
  function changeStart(v){
    startSpeed=Math.min(10.0,Math.max(4.0,Math.round(v*2)/2));
    LS.set("bt.start",startSpeed);
    $("#bt-spVal").textContent=startSpeed.toFixed(1);
    buildSchedule(); reset();
  }
  function init(){
    $$("#bt-distSeg button").forEach(b=>{
      b.classList.toggle("on",+b.dataset.d===distance);
      b.addEventListener("click",()=>{ if(b.disabled)return;
        $$("#bt-distSeg button").forEach(x=>x.classList.remove("on")); b.classList.add("on");
        distance=+b.dataset.d; LS.set("bt.dist",distance); buildSchedule(); reset(); });
    });
    $("#bt-spMinus").addEventListener("click",()=>changeStart(startSpeed-0.5));
    $("#bt-spPlus").addEventListener("click",()=>changeStart(startSpeed+0.5));
    $("#bt-spStd").addEventListener("click",()=>changeStart(8.0));
    $("#bt-spVal").textContent=startSpeed.toFixed(1);
    $("#bt-age").value=classAge;
    $("#bt-age").addEventListener("change",e=>{ classAge=Math.max(9,Math.min(18,+e.target.value||13)); e.target.value=classAge; LS.set("bt.age",classAge); render(); renderResults(); });
    $$("#bt-sexSeg button").forEach(b=>{
      b.classList.toggle("on",b.dataset.s===classSex);
      b.addEventListener("click",()=>{ $$("#bt-sexSeg button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); classSex=b.dataset.s; LS.set("bt.sex",classSex); renderResults(); });
    });
    $("#bt-voice").checked=SET.voice; $("#bt-sound").checked=SET.sound;
    $("#bt-voice").addEventListener("change",e=>{SET.voice=e.target.checked;saveSet()});
    $("#bt-sound").addEventListener("change",e=>{SET.sound=e.target.checked;saveSet()});
    $("#bt-startBtn").addEventListener("click",()=>running?pause():start());
    $("#bt-resetBtn").addEventListener("click",()=>{ if(getElapsed()===0||confirm("לאפס את שעון המבחן? (הלוח נשמר)"))reset(); });
    $("#bt-regBtn").addEventListener("click",registerDrop);
    $("#bt-undoBtn").addEventListener("click",()=>{ if(results.length){results.pop();nextNum=Math.max(1,nextNum-1);persist();renderResults();toast("הרישום האחרון בוטל");} });
    $("#bt-sortOrder").addEventListener("click",function(){sortBy="order";this.classList.add("on");$("#bt-sortDist").classList.remove("on");renderResults()});
    $("#bt-sortDist").addEventListener("click",function(){sortBy="dist";this.classList.add("on");$("#bt-sortOrder").classList.remove("on");renderResults()});
    $("#bt-csvBtn").addEventListener("click",()=>{
      if(!results.length){toast("אין רישומים");return;}
      const sexHe=classSex==="boys"?"בנים":"בנות";
      const rows=[["מס","שם","שלב","מקטע","מרחק (מ)","זמן (שנ)","מהירות (קמ\"ש)","VO2max","דרגה","מין","גיל","מרחק לכיוון (מ)"]];
      results.forEach((r,i)=>{ const v=vo2max(r.speed,classAge), ok=r.dist>0&&v>0;
        rows.push([i+1,r.name,r.level,r.sh,r.dist,r.time.toFixed(1),r.speed.toFixed(1),ok?v.toFixed(1):"",ok?classify(v,classAge,classSex).g:"",sexHe,classAge,distance]); });
      dlCSV("beep_test_results.csv",rows);
    });
    $("#bt-clearBtn").addEventListener("click",()=>{ if(results.length&&confirm("למחוק את כל הרישומים?")){results=[];nextNum=1;persist();renderResults();$("#bt-regBtn").disabled=!(running||elapsedOffset>0);} });
    document.addEventListener("keydown",e=>{
      if(!$("#view-beep").classList.contains("on"))return;
      if(e.target.classList&&e.target.classList.contains("nm"))return;
      if(e.target.tagName==="INPUT"||e.target.tagName==="SELECT")return;
      if(e.code==="Space"){e.preventDefault();running?pause():start();}
      else if(e.code==="Enter"){e.preventDefault();if(!$("#bt-regBtn").disabled)registerDrop();}
    });
    buildSchedule(); buildNorms(); reset(); renderResults();
  }
  return {init,_test:{buildSchedule:()=>{buildSchedule();return beeps},vo2max,classify,setProto:(d,s2)=>{distance=d;startSpeed=s2}}};
})();




"use strict";
/* ============================================================
   מודול 2 — PhotoFinish Pro (PF) · ממוזג עם הגרסה המקורית
   מסלול חי (סימולציה/מצלמה, זינוק קולי) · תמונת סיום (קריאה
   והקצאה) · תוצאות (פרשן, ארכיון, CSV, תעודה, מייל) · הקפות
   ============================================================ */
const PF=(function(){
  /* ---------- state ---------- */
  const COLORS=["#19d27a","#19c3ff","#ffce3a","#ff7a3d","#b07cff","#ff4d5e","#4ea3ff","#c8ff2e","#ff9ad5"];
  let laneN=LS.get("pf.laneN",4);
  let names=LS.get("pf.names",[]);
  let lanes=[]; // {lane,name,color,time,src,snap}
  function buildLanes(keepTimes){
    const old=lanes;
    lanes=Array.from({length:laneN},(_,i)=>({
      lane:i+1,
      name:names[i]||("מסלול "+(i+1)),
      color:COLORS[i%COLORS.length],
      time:keepTimes&&old[i]?old[i].time:null,
      src:keepTimes&&old[i]?old[i].src:null,
      snap:keepTimes&&old[i]?old[i].snap:null
    }));
  }
  let race={on:false,t0:0,raf:0,armed:false};
  let mode=LS.get("pf.mode","sim"); // sim | cam
  let cam={stream:null,on:false,zoom:1,flip:false};
  let lineRatio=LS.get("pf.line",0.5), sens=LS.get("pf.sens",45), minT=LS.get("pf.minT",3), slitW=LS.get("pf.slit",2);
  let META=Object.assign({title:"אליפות בית הספר — ריצת 60 מ׳",round:"גמר",dist:60,date:"",wind:""},LS.get("pf.meta",{}));

  /* detection */
  const PW=320,PH=180,CELL=4,BANDW=10;
  const proc=document.createElement("canvas"); proc.width=PW; proc.height=PH;
  const pctx=proc.getContext("2d",{willReadFrequently:true});
  let bg=null,bgReady=0,lineActive=false,lastFire=-1e9;

  /* strip buffer */
  const BUFW=3200,STRIPH=140;
  const buf=document.createElement("canvas"); buf.width=BUFW; buf.height=STRIPH;
  const bctx=buf.getContext("2d");
  let stripX=0,cols=[],marks=[];

  /* sim engine */
  let sim={runners:[],raf:0,active:false};

  const rTime=()=>race.on?(performance.now()-race.t0)/1000:0;
  function thresholds(){ return 0.045-(sens/100)*0.028; }

  /* ---------- mode ---------- */
  function setMode(m){
    mode=m; LS.set("pf.mode",m);
    $$("#pf-modes button").forEach(b=>b.classList.toggle("on",b.dataset.m===m));
    $("#pf-video").style.display=m==="cam"?"":"none";
    $("#pf-sim").style.display=m==="sim"?"":"none";
    if(m==="sim"){ camOff(); $("#pf-status").textContent="מצב סימולציה"; drawSimIdle(); }
    else{ camOn(); }
  }
  function camOff(){ if(cam.on){ cam.stream.getTracks().forEach(t=>t.stop()); cam.on=false; $("#pf-video").srcObject=null; } }
  async function camOn(){
    try{
      cam.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:1280},height:{ideal:720}},audio:false});
      $("#pf-video").srcObject=cam.stream; cam.on=true; bg=null; bgReady=0;
      $("#pf-status").textContent="🟢 מצלמה פעילה · מכייל רקע…";
      camLoop();
    }catch(e){
      $("#pf-status").textContent="המצלמה חסומה — עברנו לסימולציה";
      toast("אין גישה למצלמה. בתצוגה מוטמעת היא חסומה — הורד את הקובץ, או השתמש בסימולציה.");
      setMode("sim");
    }
  }
  function applyCamCss(){ $("#pf-video").style.transform=`scale(${cam.zoom}) scaleX(${cam.flip?-1:1})`; }

  /* ---------- camera detection ---------- */
  function drawFrame(){
    pctx.save(); pctx.translate(PW/2,PH/2);
    if(cam.flip)pctx.scale(-1,1);
    pctx.scale(cam.zoom,cam.zoom);
    pctx.drawImage($("#pf-video"),-PW/2,-PH/2,PW,PH);
    pctx.restore();
  }
  function camLoop(){
    if(!cam.on||mode!=="cam")return;
    const v=$("#pf-video");
    if(v.readyState>=2){
      drawFrame();
      const bx=Math.max(0,Math.min(PW-BANDW,Math.round(lineRatio*PW)-BANDW/2));
      const img=pctx.getImageData(bx,0,BANDW,PH).data;
      const cells=PH/CELL; if(!bg){bg=new Float32Array(cells);bgReady=0;}
      let fgCnt=0;
      for(let c=0;c<cells;c++){
        let sum=0;
        for(let y=c*CELL;y<(c+1)*CELL;y++)for(let x=0;x<BANDW;x+=2){const k=(y*BANDW+x)*4;sum+=img[k]+img[k+1]+img[k+2];}
        const lum=sum/(CELL*(BANDW/2)*3);
        const fg=bgReady>=30&&Math.abs(lum-bg[c])>16;
        if(fg)fgCnt++;
        bg[c]+=(lum-bg[c])*(fg?0.004:(bgReady<30?0.18:0.03));
      }
      if(bgReady<30){ bgReady++; if(bgReady===30)$("#pf-status").textContent="🟢 מצלמה פעילה · זיהוי חמוש"; }
      const frac=fgCnt/cells, th=thresholds(), nowMs=performance.now();
      if(race.on&&race.armed&&rTime()>=minT&&bgReady>=30&&$("#pf-autoDetect").checked){
        if(frac>=th){ if(!lineActive&&nowMs-lastFire>450){ lastFire=nowMs; lineActive=true; fire(null,"אוטו"); } }
        else if(frac<th*0.5)lineActive=false;
      }
      if(race.on)captureStrip(proc);
    }
    requestAnimationFrame(camLoop);
  }

  /* ---------- simulation ---------- */
  function simCanvas(){ const cv=$("#pf-sim"); const st=$("#pf-stage");
    cv.width=st.clientWidth||640; cv.height=st.clientHeight||360; return cv; }
  function drawSimIdle(){
    const cv=simCanvas(), x=cv.getContext("2d");
    paintTrack(x,cv.width,cv.height);
    x.fillStyle="rgba(233,255,244,.6)"; x.font="600 15px Rubik"; x.textAlign="center";
    x.fillText("סימולציה — לחץ זינוק כדי לראות את המנוע בפעולה",cv.width/2,cv.height/2);
  }
  function paintTrack(x,W,H){
    x.fillStyle="#0b3d27"; x.fillRect(0,0,W,H);
    const laneH=H/laneN;
    for(let i=0;i<laneN;i++){
      x.fillStyle=i%2?"#0c4129":"#0b3d27"; x.fillRect(0,i*laneH,W,laneH);
      x.strokeStyle="rgba(255,255,255,.35)"; x.setLineDash([10,8]); x.lineWidth=1.5;
      x.beginPath(); x.moveTo(0,i*laneH); x.lineTo(W,i*laneH); x.stroke(); x.setLineDash([]);
      x.fillStyle="rgba(255,255,255,.5)"; x.font="700 12px 'Share Tech Mono'"; x.textAlign="right";
      x.fillText(String(i+1),W-8,i*laneH+laneH/2+4);
    }
  }
  function simStart(){
    sim.active=true;
    const cv=simCanvas(), W=cv.width;
    const base=4.5+Math.random()*1.5;
    sim.runners=lanes.map((l,i)=>({
      lane:i, x:W+30+Math.random()*40,
      dur:base+Math.random()*2.2+i*0.07*(Math.random()<.5?-1:1),
      crossed:false, bob:Math.random()*7
    }));
    simLoop();
  }
  function simLoop(){
    if(!sim.active)return;
    const cv=$("#pf-sim"), x=cv.getContext("2d"), W=cv.width,H=cv.height;
    paintTrack(x,W,H);
    const lineX=lineRatio*W, t=rTime(), laneH=H/laneN;
    /* RTL: רצים נכנסים מימין ורצים שמאלה אל הקו */
    sim.runners.forEach(r=>{
      if(!lanes[r.lane])return;
      const startX=W+30, endX=lineX-90;
      const p=Math.min(1.25,t/r.dur);
      r.x=startX+(endX-startX)*p;
      const cy=r.lane*laneH+laneH/2+Math.sin(t*9+r.bob)*3;
      const col=lanes[r.lane].color;
      x.fillStyle=col;
      x.beginPath(); x.arc(r.x,cy,Math.max(6,laneH*0.16),0,7); x.fill();
      x.fillRect(r.x-3,cy,6,laneH*0.3);
      if(!r.crossed&&r.x<=lineX){ r.crossed=true; if(race.on)fire(r.lane,"סימולציה"); }
    });
    if(race.on)captureStrip(cv,lineX/W);
    if(race.on||sim.runners.some(r=>!r.crossed))sim.raf=requestAnimationFrame(simLoop);
  }

  /* ---------- strip ---------- */
  function captureStrip(srcCanvas,ratioOverride){
    const t=rTime();
    const sw=srcCanvas.width, sx=Math.max(0,Math.min(sw-2,Math.round((ratioOverride??lineRatio)*sw)-1));
    if(stripX+slitW>=BUFW){
      const SH=500;
      bctx.drawImage(buf,SH,0,BUFW-SH,STRIPH,0,0,BUFW-SH,STRIPH);
      bctx.fillStyle="#020805"; bctx.fillRect(BUFW-SH,0,SH,STRIPH);
      stripX-=SH;
      cols.forEach(c=>c.x-=SH); cols=cols.filter(c=>c.x>=0);
      marks.forEach(m=>m.x-=SH); marks=marks.filter(m=>m.x>=0);
    }
    bctx.drawImage(srcCanvas,sx,0,2,srcCanvas.height,stripX,0,slitW,STRIPH);
    cols.push({x:stripX,t}); stripX+=slitW;
    renderLiveStrip();
  }
  function renderLiveStrip(){
    const cv=$("#pf-stripLive"); const W=cv.width=cv.clientWidth||600;
    const ctx=cv.getContext("2d");
    ctx.fillStyle="#020805"; ctx.fillRect(0,0,W,64);
    const drawn=Math.min(stripX,W), off=stripX-drawn;
    if(drawn>0)ctx.drawImage(buf,off,0,drawn,STRIPH,0,0,drawn,64);
    marks.forEach(m=>{ const x=m.x-off; if(x<0||x>W)return;
      ctx.strokeStyle=m.color; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,64); ctx.stroke(); });
    $("#pf-liveNow").textContent=race.on?rTime().toFixed(3):"0.000";
  }
  let fullCursor=null;
  function renderFullStrip(){
    const has=stripX>0;
    $("#pf-stripEmpty").style.display=has?"none":"block";
    $("#pf-stripWrap").style.display=has?"":"none";
    if(!has)return;
    const cv=$("#pf-stripFull");
    cv.width=stripX; cv.height=STRIPH+50;
    const ctx=cv.getContext("2d");
    ctx.fillStyle="#020805"; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.drawImage(buf,0,0,stripX,STRIPH,0,0,stripX,STRIPH);
    /* time axis */
    ctx.fillStyle="#0d1d16"; ctx.fillRect(0,STRIPH,cv.width,50);
    ctx.font="11px 'Share Tech Mono'"; ctx.textAlign="center";
    if(cols.length>1){
      const t0=cols[0].t, t1=cols[cols.length-1].t, span=Math.max(0.001,t1-t0);
      const step=span>30?5:span>12?2:span>6?1:0.5;
      for(let tt=Math.ceil(t0/step)*step;tt<=t1;tt+=step){
        const ci=cols.findIndex(c=>c.t>=tt); if(ci<0)continue;
        const x=cols[ci].x;
        ctx.strokeStyle="rgba(233,255,244,.25)"; ctx.beginPath(); ctx.moveTo(x,STRIPH); ctx.lineTo(x,STRIPH+8); ctx.stroke();
        ctx.fillStyle="rgba(233,255,244,.6)"; ctx.fillText(tt.toFixed(1),x,STRIPH+22);
      }
    }
    marks.forEach(m=>{
      ctx.strokeStyle=m.color; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(m.x,0); ctx.lineTo(m.x,STRIPH+10); ctx.stroke();
      ctx.fillStyle=m.color; ctx.font="bold 12px Rubik"; ctx.textAlign="left";
      ctx.fillText("מ"+m.lane,m.x+3,14);
    });
    if(fullCursor!=null){
      ctx.strokeStyle="#fff"; ctx.setLineDash([5,4]);
      ctx.beginPath(); ctx.moveTo(fullCursor,0); ctx.lineTo(fullCursor,STRIPH+50); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function timeAtCol(x){
    let best=null,bd=1e9;
    cols.forEach(c=>{const d=Math.abs(c.x-x);if(d<bd){bd=d;best=c}});
    return best?best.t:null;
  }

  /* ---------- race control ---------- */
  let micCtx=null,micAn=null,micStream=null,micArmed=false;
  async function micListen(){
    try{
      micStream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      micCtx=new (window.AudioContext||window.webkitAudioContext)();
      const src=micCtx.createMediaStreamSource(micStream);
      micAn=micCtx.createAnalyser(); micAn.fftSize=512; src.connect(micAn);
      micArmed=true;
      $("#pf-status").textContent="🎙 ממתין לאקדח / מחיאת כף…";
      const data=new Uint8Array(micAn.fftSize);
      let calm=0;
      (function poll(){
        if(!micArmed)return;
        micAn.getByteTimeDomainData(data);
        let peak=0; for(let i=0;i<data.length;i++)peak=Math.max(peak,Math.abs(data[i]-128));
        if(calm<20){ if(peak<25)calm++; }
        else if(peak>70){ micStop(); launch(); return; }
        requestAnimationFrame(poll);
      })();
    }catch(e){ toast("אין גישה למיקרופון — זינוק רגיל"); countdown(); }
  }
  function micStop(){ micArmed=false;
    try{micStream&&micStream.getTracks().forEach(t=>t.stop());}catch(e){}
    try{micCtx&&micCtx.close();}catch(e){} micStream=null;micCtx=null; }
  function gun(){
    ac();
    if(race.on){ if(confirm("לעצור את המקצה?"))stopRace(); return; }
    prepRace();
    if($("#pf-micStart").checked)micListen(); else countdown();
  }
  function prepRace(){
    buildLanes(false); renderChips(); renderBoard();
    stripX=0;cols=[];marks=[];fullCursor=null;
    bctx.fillStyle="#020805";bctx.fillRect(0,0,BUFW,STRIPH);
    renderLiveStrip();
  }
  function countdown(){
    const words=["למקומות","היכון","צא!"];
    $("#pf-cd").classList.add("on");
    let i=0;
    (function next(){
      if(i<words.length){
        const w=$("#pf-cdWord"); w.textContent=words[i];
        w.style.animation="none"; void w.offsetWidth; w.style.animation="";
        say(words[i]); beep(i===2?990:660,0.16);
        i++; setTimeout(next,i===3?500:900);
      }else{ $("#pf-cd").classList.remove("on"); launch(); }
    })();
  }
  function launch(){
    horn();
    race.on=true; race.armed=true; race.t0=performance.now(); lineActive=false; lastFire=-1e9;
    $("#pf-gun").innerHTML="⏹ עצור מקצה";
    LS.set("pf.totalRaces",LS.get("pf.totalRaces",0)+1);
    keepAwake(true); clockLoop();
    if(mode==="sim")simStart();
  }
  function clockLoop(){ if(!race.on)return; $("#pf-clock").textContent=fmtMSc(rTime()); race.raf=requestAnimationFrame(clockLoop); }
  function stopRace(){ race.on=false; race.armed=false; sim.active=false; micStop();
    cancelAnimationFrame(race.raf); cancelAnimationFrame(sim.raf); keepAwake(false);
    $("#pf-gun").textContent="🔫 זינוק"; renderFullStrip(); refreshLaneSel(); }
  function resetRace(){ stopRace(); prepRace(); $("#pf-clock").textContent="00:00.00"; if(mode==="sim")drawSimIdle(); }

  function nextUnfinished(){ return lanes.findIndex(l=>l.time==null); }
  function fire(idx,src){
    if(!race.on)return;
    const i=idx!=null?idx:nextUnfinished(); if(i<0||!lanes[i]||lanes[i].time!=null)return;
    const t=rTime(); lanes[i].time=t; lanes[i].src=src||"ידני";
    if(mode==="cam"&&cam.on){ try{
      const sc=document.createElement("canvas");sc.width=PW;sc.height=PH;const sx2=sc.getContext("2d");
      sx2.drawImage(proc,0,0); sx2.strokeStyle="#ff4d5e";sx2.lineWidth=2;
      const lx=Math.round(lineRatio*PW); sx2.beginPath();sx2.moveTo(lx,0);sx2.lineTo(lx,PH);sx2.stroke();
      lanes[i].snap=sc.toDataURL("image/jpeg",0.7);
    }catch(e){} }
    marks.push({x:Math.max(0,stripX-1),t,color:lanes[i].color,lane:lanes[i].lane});
    beep(1100,0.12);
    const place=lanes.filter(l=>l.time!=null).length;
    flashBanner(place,lanes[i]);
    renderChips(); renderBoard();
    if(nextUnfinished()<0){ say("כולם סיימו"); setTimeout(()=>{ if(race.on&&confirm("כולם סיימו 🏁 לעצור את השעון?"))stopRace(); },350); }
  }
  function flashBanner(place,l){
    const f=$("#pf-flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
    const b=$("#pf-banner");
    b.innerHTML=`<span style="color:${l.color}">●</span> מקום ${place} · ${esc(l.name)} · <span style="font-family:'Share Tech Mono'">${fmtMSc(l.time)}</span>`;
    b.classList.add("show"); setTimeout(()=>b.classList.remove("show"),2400);
  }

  /* ---------- lanes UI ---------- */
  function persistNames(){ names=lanes.map(l=>l.name); LS.set("pf.names",names); }
  function renderChips(){
    $("#pf-chips").innerHTML=lanes.map((l,i)=>`
      <div class="pf-lanechip ${l.time!=null?"done":""}" data-i="${i}">
        <span class="ln">${l.lane}</span><span class="sw" style="background:${l.color}"></span><b>${esc(l.name)}</b>
        <span class="tm">${l.time!=null?fmtMSc(l.time):"—"}</span>
      </div>`).join("");
    $$("#pf-chips .pf-lanechip").forEach(ch=>ch.addEventListener("click",()=>{
      if(race.on)fire(+ch.dataset.i,"ידני"); else toast("המקצה לא רץ — הקש זינוק");
    }));
  }
  function editNames(){
    const box=lanes.map((l,i)=>`<div class="field" style="margin-bottom:8px"><label>מסלול ${l.lane}</label><input type="text" data-ni="${i}" value="${esc(l.name)}"></div>`).join("");
    const m=document.createElement("div"); m.className="modal on";
    m.innerHTML=`<div class="box"><h3>✎ עריכת שמות מתחרים<button class="x">✕</button></h3>${box}<button class="btn acc big" style="margin-top:8px">שמור</button></div>`;
    document.body.appendChild(m);
    const close=()=>m.remove();
    m.querySelector(".x").addEventListener("click",close);
    m.addEventListener("click",e=>{if(e.target===m)close()});
    m.querySelector(".btn").addEventListener("click",()=>{
      m.querySelectorAll("[data-ni]").forEach(inp=>{ lanes[+inp.dataset.ni].name=inp.value.trim()||("מסלול "+(+inp.dataset.ni+1)); });
      persistNames(); renderChips(); renderBoard(); refreshLaneSel(); close();
    });
  }
  function refreshLaneSel(){
    $("#pf-laneSel").innerHTML=lanes.map((l,i)=>`<option value="${i}">מסלול ${l.lane} · ${esc(l.name)}</option>`).join("");
  }

  /* ---------- results ---------- */
  function finished(){ return lanes.filter(l=>l.time!=null).sort((a,b)=>a.time-b.time); }
  function windIllegal(){ const w=parseFloat(META.wind); return !isNaN(w)&&w>2.0; }
  function renderMeta(){
    const items=[["",`<b>${esc(META.title)}</b>`],["שלב",META.round],["מרחק",META.dist+" מ׳"],["תאריך",META.date||"—"]];
    if(META.wind!==""&&META.wind!=null)items.push(["רוח",META.wind+" מ/ש"]);
    $("#pf-metaRow").innerHTML=items.map(([k,v])=>`<span class="pill">${k?k+": ":""}<b>${v}</b></span>`).join("")
      +(windIllegal()?'<span class="pill illegal">⚠ רוח לא חוקית (+2.0<)</span>':"");
  }
  function renderBoard(){
    renderMeta();
    const list=finished(), medals=["🥇","🥈","🥉"];
    $("#pf-empty").style.display=list.length?"none":"block";
    $("#pf-tbody").innerHTML=list.map((l,i)=>`
      <tr><td class="rk">${medals[i]||i+1}</td><td class="mono">${l.lane}</td>
      <td><input class="nm" data-lane="${l.lane}" value="${esc(l.name)}" style="background:none;border:none;border-bottom:1px dashed var(--line);color:var(--ink);font-family:'Rubik';font-size:13.5px;width:110px"></td>
      <td class="mono">${fmtMSc(l.time)}</td>
      <td class="mono">${i===0?"—":"+"+(l.time-list[0].time).toFixed(2)}</td>
      <td><span class="pill" style="font-size:11px">${l.src||"—"}</span>${l.snap?` <img class="pf-snap" src="${l.snap}" data-lane="${l.lane}" style="height:26px;vertical-align:middle;border-radius:5px;cursor:pointer">`:""}</td>
      <td><button class="x del" data-lane="${l.lane}">✕</button></td></tr>`).join("");
    $$("#pf-tbody .nm").forEach(inp=>inp.addEventListener("input",()=>{
      const l=lanes.find(x=>x.lane==inp.dataset.lane); if(l){l.name=inp.value;persistNames();renderChips();}
    }));
    $$("#pf-tbody .del").forEach(b=>b.addEventListener("click",()=>{
      const l=lanes.find(x=>x.lane==b.dataset.lane); if(l){l.time=null;l.src=null;l.snap=null;renderChips();renderBoard();}
    }));
    $$("#pf-tbody .pf-snap").forEach(img=>img.addEventListener("click",()=>{
      const ov=document.createElement("div");
      ov.style.cssText="position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.92);display:grid;place-items:center;padding:18px";
      ov.innerHTML=`<img src="${img.src}" style="max-width:96vw;max-height:88vh;border-radius:14px;border:1px solid #333">`;
      ov.addEventListener("click",()=>ov.remove()); document.body.appendChild(ov);
    }));
  }

  /* ---------- פרשן המירוץ (מנוע מקומי) ---------- */
  function aiReport(){
    const list=finished();
    if(!list.length){toast("אין תוצאות לפרשנות");return;}
    const w=list[0], gap2=list[1]?list[1].time-w.time:null;
    const lines=[];
    lines.push(`🏁 ${META.title} · ${META.round}${META.date?" · "+META.date:""}`);
    lines.push("");
    lines.push(`איזה מקצה! על ${META.dist} מטר, ${esc(w.name)} ממסלול ${w.lane} חוצה ראשון את הקו ב-${fmtMSc(w.time)}${gap2!=null?(gap2<0.15?" — בפוטו-פיניש של ממש, רק "+gap2.toFixed(2)+" שניות לפני "+esc(list[1].name)+"!":(gap2<0.5?", עם יתרון קטן של "+gap2.toFixed(2)+" שנ׳ על "+esc(list[1].name)+".":" — ניצחון בטוח, "+gap2.toFixed(2)+" שנ׳ לפני כולם.")):"."}`);
    if(list[2])lines.push(`את הפודיום משלים ${esc(list[2].name)} (מסלול ${list[2].lane}) ב-${fmtMSc(list[2].time)}.`);
    const avg=list.reduce((a,l)=>a+l.time,0)/list.length;
    const spread=list[list.length-1].time-w.time;
    lines.push(`ממוצע המקצה: ${avg.toFixed(2)} שנ׳ · פער ראשון-אחרון: ${spread.toFixed(2)} שנ׳ — ${spread<1?"מקצה צמוד וברמה אחידה.":"פערים שמספרים על טווח רמות רחב, מצוין לחלוקת קבוצות אימון."}`);
    if(META.wind!==""&&META.wind!=null){
      lines.push(windIllegal()
        ?`⚠ הרוח (${META.wind} מ/ש) מעל הסף החוקי — התוצאות לא יוכרו כשיא רשמי, אבל המאמץ בהחלט נספר.`
        :`הרוח (${META.wind} מ/ש) בטווח החוקי — התוצאות כשרות לשיא.`);
    }
    const speeds=META.dist>0?` מהירות המנצח: ${(META.dist/w.time*3.6).toFixed(1)} קמ״ש.`:"";
    lines.push(`כל ${list.length} הרצים סיימו.${speeds} כל הכבוד לכולם — לאימון הבא! 💪`);
    $("#pf-aiBody").textContent=lines.join("\n");
    $("#pf-aiBox").classList.add("on");
    say("דוח הפרשן מוכן");
  }

  /* ---------- archive ---------- */
  function arcList(){ return LS.get("pf.archive",[]); }
  function arcSave(){
    const list=finished(); if(!list.length){toast("אין תוצאות לשמירה");return;}
    const arc=arcList();
    arc.unshift({id:Date.now(),meta:{...META},results:list.map(l=>({lane:l.lane,name:l.name,time:+l.time.toFixed(3),src:l.src}))});
    LS.set("pf.archive",arc.slice(0,60));
    renderHistory(); toast("💾 נשמר לארכיון"); confetti(40);
  }
  function renderHistory(){
    const arc=arcList();
    $("#pf-histEmpty").style.display=arc.length?"none":"block";
    $("#pf-historyList").innerHTML=arc.map(a=>{
      const top=a.results[0];
      return `<div class="arc-item"><div class="grow">
        <div class="ttl">${esc(a.meta.title)} · ${esc(a.meta.round)}</div>
        <div class="sb">${a.meta.date||""} · ${a.meta.dist} מ׳ · ${a.results.length} רצים · 🥇 ${esc(top.name)} ${fmtMSc(top.time)}</div></div>
        <button class="btn sm" data-load="${a.id}">📂 טען</button>
        <button class="btn sm stop" data-del="${a.id}">✕</button></div>`;
    }).join("");
    $$("#pf-historyList [data-load]").forEach(b=>b.addEventListener("click",()=>{
      const a=arcList().find(x=>x.id==b.dataset.load); if(!a)return;
      META={...a.meta}; LS.set("pf.meta",META); fillMetaForm();
      laneN=Math.max(laneN,...a.results.map(r=>r.lane)); LS.set("pf.laneN",laneN);
      $("#pf-laneCount").value=laneN; $("#pf-laneCountVal").textContent=laneN;
      buildLanes(false);
      a.results.forEach(r=>{ const l=lanes[r.lane-1]; if(l){l.name=r.name;l.time=r.time;l.src=r.src||"ארכיון";} });
      persistNames(); renderChips(); renderBoard(); refreshLaneSel();
      go("photo"); switchTab("results"); toast("המירוץ נטען ללוח התוצאות");
    }));
    $$("#pf-historyList [data-del]").forEach(b=>b.addEventListener("click",()=>{
      if(!confirm("למחוק מהארכיון?"))return;
      LS.set("pf.archive",arcList().filter(x=>x.id!=b.dataset.del)); renderHistory();
    }));
  }
  function importCSV(file){
    file.text().then(txt=>{
      const rows=txt.replace(/^\uFEFF/,"").split(/\r?\n/).filter(r=>r.trim());
      let n=0;
      rows.forEach(r=>{
        const c=r.split(",").map(s2=>s2.replace(/^"|"$/g,"").trim());
        const lane=parseInt(c[1]), time=parseFloat(c[3]);
        if(!isNaN(lane)&&!isNaN(time)&&lane>=1&&lane<=9){
          if(lane>laneN){laneN=lane;$("#pf-laneCount").value=laneN;$("#pf-laneCountVal").textContent=laneN;LS.set("pf.laneN",laneN);buildLanes(true);}
          const l=lanes[lane-1]; l.time=time; l.src="CSV"; if(c[2])l.name=c[2]; n++;
        }
      });
      if(n){persistNames();renderChips();renderBoard();refreshLaneSel();switchTab("results");toast("יובאו "+n+" שורות");}
      else toast("לא זוהו שורות תקינות (פורמט: דירוג,מסלול,שם,זמן)");
    });
  }
  function loadSample(){
    laneN=4; LS.set("pf.laneN",4); $("#pf-laneCount").value=4; $("#pf-laneCountVal").textContent=4;
    buildLanes(false);
    const demo=[["דניאל כהן",8.42],["יואב לוי",8.57],["איתי מזרחי",8.91],["נועם פרץ",9.34]];
    demo.forEach((d,i)=>{lanes[i].name=d[0];lanes[i].time=d[1];lanes[i].src="דוגמה";});
    persistNames(); renderChips(); renderBoard(); refreshLaneSel();
    switchTab("results"); toast("נתוני דוגמה נטענו");
  }

  /* ---------- exports ---------- */
  function csvSprint(){
    const list=finished(); if(!list.length){toast("אין תוצאות");return;}
    const rows=[["דירוג","מסלול","שם","זמן (שנ)","פער","מקור","תחרות","שלב","מרחק","תאריך","רוח"]];
    list.forEach((l,i)=>rows.push([i+1,l.lane,l.name,l.time.toFixed(3),i?(l.time-list[0].time).toFixed(2):"0",l.src||"",META.title,META.round,META.dist,META.date,META.wind]));
    dlCSV("photofinish.csv",rows);
  }
  function mailResults(){
    const list=finished(); if(!list.length){toast("אין תוצאות");return;}
    const body=[`${META.title} · ${META.round} · ${META.dist} מ׳ · ${META.date}`,""].concat(
      list.map((l,i)=>`${i+1}. ${l.name} (מסלול ${l.lane}) — ${fmtMSc(l.time)}${i?" (+"+(l.time-list[0].time).toFixed(2)+")":""}`)
    ).concat(windIllegal()?["","⚠ רוח לא חוקית: "+META.wind+" מ/ש"]:[]).join("\n");
    location.href="mailto:?subject="+encodeURIComponent("תוצאות: "+META.title)+"&body="+encodeURIComponent(body);
  }
  function printCert(){
    const list=finished(); if(!list.length){toast("אין תוצאות");return;}
    const w=window.open("","_blank");
    w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>תעודות</title>
      <style>body{font-family:Arial;padding:30px}div.c{border:4px double #0a5c38;border-radius:14px;padding:30px;margin-bottom:24px;text-align:center;page-break-inside:avoid}
      h1{margin:0;color:#0a5c38}h2{margin:8px 0}p{margin:4px}.t{font-size:30px;font-weight:bold}.w{color:#b00;font-weight:bold}</style></head><body>`+
      list.map((l,i)=>`<div class="c"><h1>🏅 תעודת הישג</h1><h2>${esc(SET.school||"בית הספר")} · ${esc(META.title)}</h2>
        <p class="t">${esc(l.name)}</p><p>מקום ${i+1} · מסלול ${l.lane} · זמן: ${fmtMSc(l.time)} · ${esc(META.round)} · ${META.dist} מ׳</p>
        ${windIllegal()?'<p class="w">רוח: '+META.wind+' מ/ש (מעל הסף החוקי)</p>':(META.wind!==""?'<p>רוח: '+esc(META.wind)+' מ/ש</p>':"")}
        <p>${META.date||new Date().toLocaleDateString("he-IL")}</p></div>`).join("")+
      "<script>print()<\/script></body></html>");
    w.document.close();
  }

  /* ---------- laps (ללא שינוי מהותי) ---------- */
  let L={on:false,t0:0,raf:0,runners:LS.get("pf.lroster",[]).map((n,i)=>({name:n,color:COLORS[i%COLORS.length],laps:[],fin:null}))};
  const lTime=()=>L.on?(performance.now()-L.t0)/1000:0;
  function lGun(){
    ac();
    if(L.on){ if(confirm("לעצור את שעון ההקפות?")){L.on=false;cancelAnimationFrame(L.raf);keepAwake(false);$("#pf-lGun").textContent="🔫 זינוק";} return; }
    if(!L.runners.length){toast("הוסף רצים קודם");return;}
    L.runners.forEach(r=>{r.laps=[];r.fin=null});
    L.on=true; L.t0=performance.now(); keepAwake(true); horn();
    $("#pf-lGun").innerHTML="⏹ עצור"; lLoop(); lRender();
  }
  function lLoop(){ if(!L.on)return; $("#pf-lClock").textContent=fmtMSc(lTime()).slice(0,-1); L.raf=requestAnimationFrame(lLoop); }
  function lTap(i){
    if(!L.on){toast("השעון לא רץ");return;}
    const r=L.runners[i]; if(r.fin!=null)return;
    const t=lTime(), last=r.laps.length?r.laps[r.laps.length-1]:0;
    const minLap=+$("#pf-lMin").value||0;
    if(t-last<minLap){toast("מוקדם מדי — חסם "+minLap+" שנ׳");return;}
    r.laps.push(t); beep(880,0.1);
    const target=+$("#pf-lTarget").value||1;
    if(r.laps.length>=target){ r.fin=t; beep(1200,0.3); say(r.name+" סיים"); confetti(30); }
    lRender();
  }
  function lSplits(r){ return r.laps.map((t,i)=>t-(i?r.laps[i-1]:0)); }
  function lRender(){
    $("#pf-lGrid").innerHTML=L.runners.map((r,i)=>{
      const sp=lSplits(r), last=sp.length?sp[sp.length-1]:null;
      return `<button class="pf-lapbtn ${r.fin!=null?"fin":""}" data-i="${i}">
        <div class="nm"><i style="background:${r.color}"></i>${esc(r.name)}</div>
        <div class="lp">${r.laps.length}</div>
        <div class="sb">${r.fin!=null?"🏁 "+fmtMSc(r.fin):(last!=null?"אחרונה: "+last.toFixed(1)+" שנ׳":"הקש לרישום הקפה")}</div>
      </button>`;
    }).join("")||'<div class="hint">אין רצים.</div>';
    $$("#pf-lGrid .pf-lapbtn").forEach(b=>{
      let lp=null;
      b.addEventListener("pointerdown",()=>{ lp=setTimeout(()=>{ if(confirm("להסיר את "+L.runners[b.dataset.i].name+"?")){L.runners.splice(b.dataset.i,1);LS.set("pf.lroster",L.runners.map(r=>r.name));lRender();} lp=null; },650); });
      b.addEventListener("pointerup",()=>{ if(lp){clearTimeout(lp);lp=null;lTap(+b.dataset.i);} });
      b.addEventListener("pointerleave",()=>{clearTimeout(lp);lp=null});
    });
    const lapDist=+$("#pf-lDist").value||0;
    const rank=[...L.runners].sort((a,b)=>(b.laps.length-a.laps.length)||((a.fin??a.laps[a.laps.length-1]??1e9)-(b.fin??b.laps[b.laps.length-1]??1e9)));
    const medals=["🥇","🥈","🥉"];
    $("#pf-lTbody").innerHTML=rank.map((r,i)=>{
      const sp=lSplits(r), best=sp.length?Math.min(...sp):null, avg=sp.length?sp.reduce((a,b)=>a+b,0)/sp.length:null;
      const pace=(avg&&lapDist)?fmtMS(avg*(1000/lapDist)):"—";
      return `<tr><td class="rk">${medals[i]||i+1}</td><td><b>${esc(r.name)}</b></td>
        <td class="mono">${r.laps.length}</td><td class="mono">${sp.length?sp[sp.length-1].toFixed(1):"—"}</td>
        <td class="mono">${best?best.toFixed(1):"—"}</td><td class="mono">${avg?avg.toFixed(1):"—"}</td>
        <td class="mono">${pace}</td><td class="mono">${r.fin!=null?fmtMSc(r.fin):"—"}</td></tr>`;
    }).join("");
  }

  /* ---------- meta form ---------- */
  function fillMetaForm(){
    $("#pf-setTitle").value=META.title; $("#pf-setRound").value=META.round;
    $("#pf-setDist").value=META.dist; $("#pf-setDate").value=META.date; $("#pf-setWind").value=META.wind;
  }
  function saveMeta(){
    META={title:$("#pf-setTitle").value.trim()||"מקצה",round:$("#pf-setRound").value,
      dist:+$("#pf-setDist").value||0,date:$("#pf-setDate").value,wind:$("#pf-setWind").value};
    LS.set("pf.meta",META); renderMeta(); toast("הפרטים נשמרו");
  }

  /* ---------- tabs & init ---------- */
  function switchTab(t){
    $$(".pf-tabs [data-pt]").forEach(x=>x.classList.toggle("on",x.dataset.pt===t));
    ["live","strip","results","laps","history","meta"].forEach(k=>$("#pf-sub-"+k).style.display=k===t?"":"none");
    if(t==="strip"){ renderFullStrip(); refreshLaneSel(); }
    if(t==="history")renderHistory();
    if(t==="live"&&mode==="sim"&&!race.on)drawSimIdle();
  }
  function init(){
    if(!META.date)META.date=new Date().toISOString().slice(0,10);
    buildLanes(false);
    $$(".pf-tabs [data-pt]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.pt)));
    $$("#pf-modes button").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.m)));
    $("#pf-gun").addEventListener("click",gun);
    $("#pf-resetBtn").addEventListener("click",()=>{ if(confirm("לאפס את המקצה?"))resetRace(); });
    $("#pf-lineRange").value=lineRatio*100;
    $("#pf-lineEl").style.left=(lineRatio*100)+"%";
    $("#pf-lineRange").addEventListener("input",e=>{ lineRatio=e.target.value/100; LS.set("pf.line",lineRatio); $("#pf-lineEl").style.left=e.target.value+"%"; bg=null; });
    $("#pf-sens").value=sens; $("#pf-sensVal").textContent=sens;
    $("#pf-sens").addEventListener("input",e=>{ sens=+e.target.value; LS.set("pf.sens",sens); $("#pf-sensVal").textContent=sens; });
    $("#pf-slit").value=slitW; $("#pf-slitVal").textContent=slitW+"px";
    $("#pf-slit").addEventListener("input",e=>{ slitW=+e.target.value; LS.set("pf.slit",slitW); $("#pf-slitVal").textContent=slitW+"px"; });
    $("#pf-minT").value=minT;
    $("#pf-minT").addEventListener("change",e=>{ minT=+e.target.value||0; LS.set("pf.minT",minT); });
    $("#pf-zoomIn").addEventListener("click",()=>{ cam.zoom=Math.min(3,+(cam.zoom+0.25).toFixed(2)); applyCamCss(); bg=null; });
    $("#pf-zoomOut").addEventListener("click",()=>{ cam.zoom=Math.max(1,+(cam.zoom-0.25).toFixed(2)); applyCamCss(); bg=null; });
    $("#pf-flip").addEventListener("click",()=>{ cam.flip=!cam.flip; applyCamCss(); bg=null; });
    function fsToggle(){ const st=$("#pf-stage"); st.classList.toggle("fs");
      try{ if(st.classList.contains("fs"))st.requestFullscreen&&st.requestFullscreen(); else document.exitFullscreen&&document.exitFullscreen(); }catch(e){}
      if(mode==="sim")setTimeout(()=>{simCanvas();race.on||drawSimIdle();},250); }
    $("#pf-fs").addEventListener("click",fsToggle);
    $("#pf-laneCount").value=laneN; $("#pf-laneCountVal").textContent=laneN;
    $("#pf-laneCount").addEventListener("input",e=>{
      laneN=+e.target.value; LS.set("pf.laneN",laneN); $("#pf-laneCountVal").textContent=laneN;
      buildLanes(true); renderChips(); renderBoard(); refreshLaneSel(); if(mode==="sim"&&!race.on)drawSimIdle();
    });
    $("#pf-editNames").addEventListener("click",editNames);
    /* strip view */
    $("#pf-stripRefresh").addEventListener("click",renderFullStrip);
    $("#pf-stripPng").addEventListener("click",()=>{
      if(!stripX){toast("אין רצועה");return;}
      const out=document.createElement("canvas"); out.width=stripX; out.height=STRIPH;
      out.getContext("2d").drawImage(buf,0,0,stripX,STRIPH,0,0,stripX,STRIPH);
      const a=document.createElement("a"); a.href=out.toDataURL("image/png"); a.download="photofinish-strip.png"; a.click();
    });
    $("#pf-stripFull").addEventListener("pointerdown",e=>{
      const r=e.target.getBoundingClientRect();
      const x=(e.clientX-r.left)*(e.target.width/r.width);
      fullCursor=x; renderFullStrip();
      const t=timeAtCol(x);
      $("#pf-readout").textContent=t!=null?fmtMSc(t):"— : —";
      $("#pf-readout").dataset.t=t!=null?t:"";
    });
    $("#pf-assign").addEventListener("click",()=>{
      const t=parseFloat($("#pf-readout").dataset.t);
      if(isNaN(t)){toast("בחר נקודה על הרצועה קודם");return;}
      const i=+$("#pf-laneSel").value;
      lanes[i].time=t; lanes[i].src="תמונה";
      marks.push({x:fullCursor??0,t,color:lanes[i].color,lane:lanes[i].lane});
      renderChips(); renderBoard(); renderFullStrip();
      toast("⏱ "+fmtMSc(t)+" → מסלול "+lanes[i].lane); beep(1100,0.12);
    });
    /* results */
    $("#pf-btnAI").addEventListener("click",aiReport);
    $("#pf-btnSave").addEventListener("click",arcSave);
    $("#pf-csv").addEventListener("click",csvSprint);
    $("#pf-print").addEventListener("click",printCert);
    $("#pf-mail").addEventListener("click",mailResults);
    $("#pf-addRow").addEventListener("click",()=>{
      const i=nextUnfinished(); if(i<0){toast("כל המסלולים מאוישים — הגדל מספר מסלולים");return;}
      const t=parseFloat(prompt("זמן בשניות למסלול "+lanes[i].lane+":","10.00"));
      if(isNaN(t))return;
      lanes[i].time=t; lanes[i].src="ידני"; renderChips(); renderBoard();
    });
    /* archive */
    $("#pf-csvFile").addEventListener("change",e=>{ if(e.target.files[0])importCSV(e.target.files[0]); e.target.value=""; });
    $("#pf-loadSample").addEventListener("click",loadSample);
    /* laps */
    $("#pf-lGun").addEventListener("click",lGun);
    $("#pf-lReset").addEventListener("click",()=>{ if(confirm("לאפס הקפות?")){L.on=false;cancelAnimationFrame(L.raf);L.runners.forEach(r=>{r.laps=[];r.fin=null});$("#pf-lClock").textContent="00:00.0";$("#pf-lGun").textContent="🔫 זינוק";lRender();} });
    $("#pf-lAdd").addEventListener("click",()=>{
      const n=$("#pf-lNewName").value.trim(); if(!n)return;
      L.runners.push({name:n,color:COLORS[L.runners.length%COLORS.length],laps:[],fin:null});
      $("#pf-lNewName").value=""; LS.set("pf.lroster",L.runners.map(r=>r.name)); lRender();
    });
    $("#pf-lNewName").addEventListener("keydown",e=>{ if(e.key==="Enter")$("#pf-lAdd").click(); });
    $("#pf-lCsv").addEventListener("click",()=>{
      const rows=[["שם","הקפות","זמן סופי","ביניים…"]];
      L.runners.forEach(r=>rows.push([r.name,r.laps.length,r.fin!=null?r.fin.toFixed(2):"",...lSplits(r).map(s2=>s2.toFixed(2))]));
      dlCSV("laps.csv",rows);
    });
    $("#pf-lSplits").addEventListener("click",()=>{
      const max=Math.max(0,...L.runners.map(r=>r.laps.length));
      let h='<table class="tbl"><thead><tr><th>שם</th>'; for(let i=1;i<=max;i++)h+="<th>הקפה "+i+"</th>"; h+="</tr></thead><tbody>";
      L.runners.forEach(r=>{ h+="<tr><td><b>"+esc(r.name)+"</b></td>"; const sp=lSplits(r);
        for(let i=0;i<max;i++)h+='<td class="mono">'+(sp[i]!=null?sp[i].toFixed(1):"—")+"</td>"; h+="</tr>"; });
      $("#pf-splitBody").innerHTML=h+"</tbody></table>"; modal("pf-splitModal");
    });
    /* meta */
    fillMetaForm();
    $("#pf-setSave").addEventListener("click",saveMeta);
    /* keys */
    document.addEventListener("keydown",e=>{
      if(!$("#view-photo").classList.contains("on"))return;
      if(e.target.tagName==="INPUT"||e.target.tagName==="SELECT")return;
      if(e.key>="1"&&e.key<="9"){ const i=+e.key-1; if(i<lanes.length&&race.on)fire(i,"ידני"); }
      else if(e.key==="f"||e.key==="F")fsToggle();
      else if(e.code==="Space"){e.preventDefault();gun();}
    });
    renderChips(); renderBoard(); refreshLaneSel(); lRender(); setMode(mode); renderLiveStrip();
  }
  return {init,_test:{thresholds:s2=>{sens=s2;return thresholds()},nextUnfinished:()=>nextUnfinished(),setLanes:l=>{lanes=l},windIllegal:w=>{META.wind=w;return windIllegal()}}};
})();


"use strict";
/* ============================================================
   מודול 3 — אלופי בית הספר (REC)
   IndexedDB לשיאים + סרטוני הוכחה · אישור מורה · השוואות · קיוסק
   ============================================================ */
const REC=(function(){
  /* ענפי ברירת המחדל. המורה יכול להוסיף ענפים משלו בלוח המורה — הם נשמרים
     ב-localStorage תחת rec.custom ומצטרפים לרשימה. */
  const BASE_SPORTS=[
    {id:"rope",  em:"🪢", name:"קפיצה בחבל", unit:"קפיצות בדקה", lower:false},
    {id:"push",  em:"💪", name:"שכיבות סמיכה", unit:"חזרות ברצף", lower:false},
    {id:"pull",  em:"🧗", name:"מתח", unit:"חזרות ברצף", lower:false},
    {id:"sit",   em:"🔥", name:"בטן", unit:"חזרות בדקה", lower:false},
    {id:"plank", em:"🪵", name:"פלאנק", unit:"שניות", lower:false},
    {id:"ljump", em:"🦘", name:"קפיצה למרחק מהמקום", unit:"ס״מ", lower:false},
    {id:"sprint",em:"⚡", name:"ריצת 60 מ׳", unit:"שניות", lower:true},
    {id:"squat", em:"🦵", name:"סקוואטים", unit:"חזרות בדקה", lower:false},
    {id:"throw", em:"🏀", name:"זריקות עונשין", unit:"קליעות מ-10", lower:false},
    {id:"sprint100",em:"🏃", name:"ריצת 100 מ׳", unit:"שניות", lower:true},
    {id:"run1000",em:"🛣️", name:"ריצת 1000 מ׳", unit:"שניות", lower:true},
    {id:"beep",  em:"🎵", name:"ביפ טסט — מרחק", unit:"מטרים", lower:false},
    {id:"hjump", em:"⬆️", name:"קפיצה לגובה מהמקום", unit:"ס״מ", lower:false},
    {id:"burpee",em:"🔁", name:"ברפי", unit:"חזרות בדקה", lower:false},
    {id:"dips",  em:"🤸", name:"מקבילים (Dips)", unit:"חזרות ברצף", lower:false},
    {id:"wallsit",em:"🪑",name:"כיסא קיר", unit:"שניות", lower:false},
    {id:"juggle",em:"⚽", name:"נגיחות/הטחות כדורגל", unit:"נגיעות ברצף", lower:false},
    {id:"shuttle",em:"↔️",name:"ריצת מעבורת 4×10", unit:"שניות", lower:true},
    {id:"medball",em:"🥎",name:"הטלת כדור מדיסין", unit:"מטרים", lower:false},
    {id:"flex",  em:"🧘", name:"גמישות — Sit & Reach", unit:"ס״מ", lower:false}
  ];
  const DEF_REFS={rope:{israel:200,world:388},push:{israel:120,world:140},pull:{israel:40,world:51},
    sit:{israel:70,world:80},plank:{israel:7200,world:29700},ljump:{israel:340,world:373},
    sprint:{israel:6.7,world:6.3},squat:{israel:55,world:60},throw:{israel:10,world:10},
    sprint100:{israel:10.0,world:9.58},run1000:{israel:145,world:132},beep:{israel:3000,world:3500},
    hjump:{israel:80,world:126},burpee:{israel:40,world:47},dips:{israel:60,world:70},
    wallsit:{israel:900,world:1800},juggle:{israel:1000,world:3000},shuttle:{israel:9.0,world:8.2},
    medball:{israel:14,world:18},flex:{israel:35,world:45}};
  let custom=LS.get("rec.custom",[]);
  let SPORTS=BASE_SPORTS.concat(custom);
  let refs=Object.assign({},DEF_REFS,LS.get("rec.refs",{}));
  let pass=LS.get("rec.pass","1234");
  let db=null, CACHE=[];
  function rebuildSports(){
    custom=LS.get("rec.custom",[]);
    SPORTS=BASE_SPORTS.concat(custom);
    custom.forEach(c=>{ if(!refs[c.id])refs[c.id]={israel:0,world:0}; });
  }
  rebuildSports();

  /* ---------- IndexedDB ---------- */
  function openDB(){
    return new Promise((res,rej)=>{
      const rq=indexedDB.open("pehub-records",1);
      rq.onupgradeneeded=()=>rq.result.createObjectStore("rec",{keyPath:"id"});
      rq.onsuccess=()=>{db=rq.result;res(db)};
      rq.onerror=()=>rej(rq.error);
    });
  }
  function dbAll(){ return new Promise((res,rej)=>{ const rq=db.transaction("rec").objectStore("rec").getAll(); rq.onsuccess=()=>res(rq.result||[]); rq.onerror=()=>rej(rq.error); }); }
  function dbPut(r){ return new Promise((res,rej)=>{ const rq=db.transaction("rec","readwrite").objectStore("rec").put(r); rq.onsuccess=res; rq.onerror=()=>rej(rq.error); }); }
  function dbDel(id){ return new Promise((res,rej)=>{ const rq=db.transaction("rec","readwrite").objectStore("rec").delete(id); rq.onsuccess=res; rq.onerror=()=>rej(rq.error); }); }
  async function refresh(){ CACHE=await dbAll(); renderGrid(); }

  /* ---------- helpers ---------- */
  const sportById=id=>SPORTS.find(s=>s.id===id)||SPORTS[0];
  const refOf=id=>(refs[id]||(refs[id]={israel:0,world:0}));
  /* ענפים שנמדדים בשניות מוצגים כ־מ:שש כשהערך גדול מדקה */
  const TIMEY={plank:1,wallsit:1,run1000:1};
  function showVal(sp,v){
    if(TIMEY[sp.id]&&v>=60){ const h=Math.floor(v/3600),m=Math.floor(v%3600/60),s=Math.round(v%60);
      return (h?h+":":"")+String(m).padStart(h?2:1,"0")+":"+String(s).padStart(2,"0"); }
    return (+v).toLocaleString("he-IL",{maximumFractionDigits:2});
  }
  function approved(id){ return CACHE.filter(r=>r.sport===id&&r.status==="approved"); }
  function ranked(id){ const sp=sportById(id); return approved(id).sort((a,b)=>sp.lower?a.value-b.value:b.value-a.value); }
  function best(id){ return ranked(id)[0]||null; }
  function pct(sp,v,world){ if(!v||!world)return 0; const p=sp.lower?(world/v)*100:(v/world)*100; return Math.max(3,Math.min(100,p)); }
  function countApproved(){ return (db?Promise.resolve():openDB()).then(dbAll).then(l=>l.filter(r=>r.status==="approved").length); }

  /* ---------- grid & detail ---------- */
  function renderGrid(){
    const pend=CACHE.filter(r=>r.status==="pending").length;
    $("#rec-adminBtn").innerHTML="🔐 לוח מורה"+(pend?` <span class="catpill" style="background:var(--stop);color:#fff">${pend}</span>`:"");
    $("#rec-grid").innerHTML=SPORTS.map(sp=>{
      const b=best(sp.id), pendN=CACHE.filter(r=>r.sport===sp.id&&r.status==="pending").length;
      return `<div class="rec-tile" data-id="${sp.id}">
        ${pendN?`<span class="bdg">${pendN} ממתין</span>`:""}
        <div class="em">${sp.em}</div><b>${sp.name}</b>
        <div class="vl">${b?showVal(sp,b.value):"—"}</div>
        <div class="hold">${b?esc(b.name):"אין עדיין שיא"}</div>
      </div>`;
    }).join("");
    $$("#rec-grid .rec-tile").forEach(t=>t.addEventListener("click",()=>openSport(t.dataset.id)));
  }
  let curSport=null;
  function openSport(id){
    curSport=id; const sp=sportById(id), rf=refOf(id);
    $("#rec-sdTitle").textContent=sp.em+" "+sp.name;
    $("#rec-sdHint").textContent="יחידה: "+sp.unit+(sp.lower?" · נמוך יותר = טוב יותר":"");
    const b=best(id), sv=b?b.value:0;
    $("#rec-sdCompare").innerHTML=[
      {cls:"school",lbl:"🏫 שיא בית הספר",val:sv,sub:b?b.name:"—"},
      {cls:"israel",lbl:"🇮🇱 שיא ישראל",val:rf.israel,sub:""},
      {cls:"world",lbl:"🌍 שיא העולם",val:rf.world,sub:""}
    ].map(r=>`<div class="cmp-row"><div class="top">
        <div class="lbl">${r.lbl} ${r.sub?`<span style="color:var(--muted)">· ${esc(r.sub)}</span>`:""}</div>
        <div class="num">${r.val?showVal(sp,r.val):"—"}</div></div>
      <div class="track"><div class="fill ${r.cls}"></div></div></div>`).join("");
    const medals=["🥇","🥈","🥉"], list=ranked(id);
    $("#rec-sdBoard").innerHTML=list.length?`<table class="tbl"><thead><tr><th>דירוג</th><th>שם</th><th>כיתה</th><th>תוצאה</th><th></th></tr></thead><tbody>${
      list.slice(0,15).map((e,i)=>`<tr><td class="rk">${medals[i]||i+1}</td><td><b>${esc(e.name)}</b></td>
      <td style="color:var(--muted)">${esc(e.cls||"")}</td><td class="mono">${showVal(sp,e.value)}</td>
      <td>${e.video?`<button class="vbtn" data-v="${e.id}">▶ סרטון</button>`:""}</td></tr>`).join("")}</tbody></table>`
      :'<div class="empty-state"><div class="big">🏅</div>אין עדיין שיאים מאושרים בענף.<br>שלח שיא והיה הראשון בלוח הכבוד!</div>';
    modal("rec-sportModal");
    setTimeout(()=>{ const f=$$("#rec-sdCompare .fill");
      if(f[0])f[0].style.width=pct(sp,sv,rf.world)+"%";
      if(f[1])f[1].style.width=pct(sp,rf.israel,rf.world)+"%";
      if(f[2])f[2].style.width="100%"; },80);
    $$("#rec-sdBoard .vbtn").forEach(b2=>b2.addEventListener("click",()=>playVideo(b2.dataset.v)));
  }
  /* נגן ביקורת שיא: האטה, צעד פריים ולולאה — כדי שהמורה יוכל לספור חזרות
     ולוודא טכניקה לפני שהוא מאשר. */
  function playVideo(id){
    const e=CACHE.find(x=>x.id===id); if(!e||!e.video)return;
    const url=URL.createObjectURL(e.video);
    const ov=document.createElement("div");
    ov.style.cssText="position:fixed;inset:0;z-index:320;background:rgba(0,0,0,.93);display:grid;place-items:center;padding:16px";
    ov.innerHTML=`<div style="max-width:560px;width:100%;text-align:center">
      <video src="${url}" controls autoplay playsinline loop style="width:100%;border-radius:14px;background:#000;max-height:70vh"></video>
      <div class="rec-vctl">
        <button data-sp="0.25">0.25×</button><button data-sp="0.5">0.5×</button>
        <button data-sp="1" class="on">1×</button><button data-sp="2">2×</button>
        <button data-fr="-1">⏮ פריים</button><button data-fr="1">פריים ⏭</button>
      </div>
      <div style="margin-top:9px;font-family:'Secular One';font-size:17px">${esc(e.name)} · ${esc(sportById(e.sport).name)}</div>
      <div class="hint">${e.cls?esc(e.cls)+" · ":""}${showVal(sportById(e.sport),e.value)} ${esc(sportById(e.sport).unit)} · הקשה מחוץ לסרטון = סגירה</div></div>`;
    const v=ov.querySelector("video");
    ov.querySelectorAll("[data-sp]").forEach(b=>b.addEventListener("click",ev=>{
      ev.stopPropagation(); v.playbackRate=parseFloat(b.dataset.sp);
      ov.querySelectorAll("[data-sp]").forEach(x=>x.classList.toggle("on",x===b));
    }));
    ov.querySelectorAll("[data-fr]").forEach(b=>b.addEventListener("click",ev=>{
      ev.stopPropagation(); v.pause(); v.currentTime=Math.max(0,v.currentTime+(+b.dataset.fr)/30);
    }));
    ov.addEventListener("click",ev=>{ if(ev.target===ov){URL.revokeObjectURL(url);ov.remove();} });
    document.body.appendChild(ov);
  }

  /* ---------- submit ---------- */
  function openSubmit(){
    $("#rec-subSport").innerHTML=SPORTS.map(s=>`<option value="${s.id}" ${s.id===curSport?"selected":""}>${s.em} ${s.name}</option>`).join("");
    updSubLb(); modal("rec-sportModal",false); modal("rec-subModal");
  }
  function updSubLb(){ const sp=sportById($("#rec-subSport").value); $("#rec-subValLb").textContent="תוצאה ("+sp.unit+")"; }
  async function sendSub(){
    const sport=$("#rec-subSport").value, name=$("#rec-subName").value.trim(),
      cls=$("#rec-subClass").value.trim(), val=parseFloat($("#rec-subVal").value);
    if(!name||!(val>0)){toast("מלא שם ותוצאה תקינה");return;}
    const f=$("#rec-subVideo").files[0]||null;
    if(f&&f.size>120*1024*1024){toast("הסרטון גדול מדי (עד 120MB)");return;}
    await dbPut({id:"r"+Date.now()+Math.random().toString(36).slice(2,6),sport,name,cls,value:val,video:f,
      status:"pending",src:(window.HM&&window.HM.isStudent&&window.HM.isStudent())?"student":"teacher",ts:Date.now()});
    await refresh(); modal("rec-subModal",false);
    $("#rec-subName").value="";$("#rec-subClass").value="";$("#rec-subVal").value="";$("#rec-subVideo").value="";
    toast("📤 נשלח! השיא ימתין לאישור המורה."); beep(880,0.15);
  }

  /* ---------- admin ---------- */
  function renderAdmin(){
    const pend=CACHE.filter(r=>r.status==="pending").sort((a,b)=>a.ts-b.ts);
    $("#rec-pendList").innerHTML=pend.length?pend.map(e=>{
      const sp=sportById(e.sport);
      return `<div class="fit-station"><div class="ix">${sp.em}</div>
        <div class="grow"><b>${esc(e.name)}</b> ${e.cls?"· "+esc(e.cls):""}<div class="sb">${sp.name} · ${showVal(sp,e.value)} ${sp.unit}</div></div>
        ${e.video?`<button class="vbtn" data-v="${e.id}">▶</button>`:'<span class="pill">בלי סרטון</span>'}
        <button class="btn sm acc" data-ok="${e.id}">✓ אשר</button>
        <button class="btn sm stop" data-no="${e.id}">✕</button></div>`;
    }).join(""):'<div class="hint">אין שיאים שממתינים לאישור 👌</div>';
    $$("#rec-pendList [data-ok]").forEach(b=>b.addEventListener("click",async()=>{
      const e=CACHE.find(x=>x.id===b.dataset.ok), sp=sportById(e.sport), wasBest=best(e.sport);
      e.status="approved"; await dbPut(e); await refresh(); renderAdmin();
      const isNew=!wasBest||(sp.lower?e.value<wasBest.value:e.value>wasBest.value);
      if(isNew){ confetti(); horn(); toast("🏆 שיא בית ספר חדש! "+e.name); } else toast("אושר ✓");
    }));
    $$("#rec-pendList [data-no]").forEach(b=>b.addEventListener("click",async()=>{
      if(confirm("לדחות ולמחוק את הבקשה?")){ await dbDel(b.dataset.no); await refresh(); renderAdmin(); }
    }));
    $$("#rec-pendList [data-v]").forEach(b=>b.addEventListener("click",()=>playVideo(b.dataset.v)));
    /* --- כל השיאים המאושרים: עריכה ומחיקה --- */
    const appr=CACHE.filter(r=>r.status==="approved").sort((a,b)=>b.ts-a.ts);
    $("#rec-allList").innerHTML=appr.length?`<table class="tbl"><thead><tr>
      <th>ענף</th><th>שם</th><th>כיתה</th><th>תוצאה</th><th>מקור</th><th></th></tr></thead><tbody>${
      appr.map(e=>{ const sp=sportById(e.sport);
        return `<tr><td>${sp.em} ${esc(sp.name)}</td><td><b>${esc(e.name)}</b></td>
          <td style="color:var(--muted)">${esc(e.cls||"")}</td>
          <td class="mono">${showVal(sp,e.value)}</td>
          <td>${e.video?`<button class="vbtn" data-v="${e.id}">▶</button>`:(e.src==="manual"?'<span class="pill">ידני</span>':'<span class="pill">—</span>')}</td>
          <td><button class="btn sm" data-ed="${e.id}">✎</button>
              <button class="btn sm stop" data-rm="${e.id}">🗑</button></td></tr>`;}).join("")}</tbody></table>`
      :'<div class="hint">אין עדיין שיאים מאושרים.</div>';
    $$("#rec-allList [data-v]").forEach(b=>b.addEventListener("click",()=>playVideo(b.dataset.v)));
    $$("#rec-allList [data-ed]").forEach(b=>b.addEventListener("click",()=>editRec(b.dataset.ed)));
    $$("#rec-allList [data-rm]").forEach(b=>b.addEventListener("click",async()=>{
      const e=CACHE.find(x=>x.id===b.dataset.rm);
      if(e&&confirm(`למחוק את השיא של ${e.name}?`)){ await dbDel(e.id); await refresh(); renderAdmin(); toast("נמחק"); }
    }));

    /* --- ערכי ייחוס --- */
    $("#rec-refList").innerHTML=SPORTS.map(sp=>`
      <div class="row" style="margin-bottom:7px;align-items:center">
        <span style="width:160px;font-size:13px">${sp.em} ${esc(sp.name)}</span>
        <input data-rf="${sp.id}|israel" type="number" step="any" value="${refOf(sp.id).israel}" style="width:90px;background:#04110a;border:1px solid var(--line);border-radius:8px;color:var(--ink);padding:6px" title="ישראל">
        <input data-rf="${sp.id}|world" type="number" step="any" value="${refOf(sp.id).world}" style="width:90px;background:#04110a;border:1px solid var(--line);border-radius:8px;color:var(--ink);padding:6px" title="עולם">
      </div>`).join("")+'<div class="hint">ישראל | עולם — ערכי ייחוס לעריכה חופשית (ענפי זמן בשניות). זה מה שקובע את אורך העמודות במסך ההשוואה.</div>';
    $$("#rec-refList [data-rf]").forEach(inp=>inp.addEventListener("change",()=>{
      const [id,k]=inp.dataset.rf.split("|");
      refOf(id)[k]=parseFloat(inp.value)||0; LS.set("rec.refs",refs); renderGrid();
    }));

    /* --- ענפים מותאמים אישית --- */
    $("#rec-customList").innerHTML=custom.length?custom.map(c=>
      `<div class="row" style="align-items:center;margin-bottom:6px">
        <span class="grow">${c.em} ${esc(c.name)} <span class="hint">· ${esc(c.unit)}${c.lower?" · נמוך=טוב":""}</span></span>
        <button class="btn sm stop" data-cdel="${c.id}">✕</button></div>`).join("")
      :'<div class="hint">אין עדיין ענפים מותאמים. הוסף ענף כדי למדוד כל דבר שרצית — משיכות בטבעות, זמן שחייה, מה שבא.</div>';
    $$("#rec-customList [data-cdel]").forEach(b=>b.addEventListener("click",async()=>{
      const id=b.dataset.cdel;
      const used=CACHE.filter(r=>r.sport===id).length;
      if(!confirm(used?`בענף הזה יש ${used} שיאים — הם יימחקו גם. להמשיך?`:"למחוק את הענף?"))return;
      for(const r of CACHE.filter(r=>r.sport===id))await dbDel(r.id);
      LS.set("rec.custom",LS.get("rec.custom",[]).filter(c=>c.id!==id));
      rebuildSports(); await refresh(); renderAdmin(); toast("הענף נמחק");
    }));
  }

  /* ---------- הוספה ידנית ועריכה (מורה בלבד) ---------- */
  function openManual(){
    $("#rec-mnSport").innerHTML=SPORTS.map(s=>`<option value="${s.id}">${s.em} ${s.name}</option>`).join("");
    updMnLb(); $("#rec-mnName").value=""; $("#rec-mnClass").value=""; $("#rec-mnVal").value="";
    $("#rec-mnId").value=""; $("#rec-mnTitle").textContent="➕ הוספת שיא ידנית";
    $("#rec-mnSave").textContent="שמור כשיא מאושר";
    modal("rec-manualModal");
  }
  function updMnLb(){ const sp=sportById($("#rec-mnSport").value); $("#rec-mnValLb").textContent="תוצאה ("+sp.unit+")"; }
  function editRec(id){
    const e=CACHE.find(x=>x.id===id); if(!e)return;
    $("#rec-mnSport").innerHTML=SPORTS.map(s=>`<option value="${s.id}" ${s.id===e.sport?"selected":""}>${s.em} ${s.name}</option>`).join("");
    updMnLb();
    $("#rec-mnName").value=e.name; $("#rec-mnClass").value=e.cls||""; $("#rec-mnVal").value=e.value;
    $("#rec-mnId").value=e.id; $("#rec-mnTitle").textContent="✎ עריכת שיא";
    $("#rec-mnSave").textContent="שמור שינויים";
    modal("rec-manualModal");
  }
  async function saveManual(){
    const id=$("#rec-mnId").value, sport=$("#rec-mnSport").value,
      name=$("#rec-mnName").value.trim(), cls=$("#rec-mnClass").value.trim(),
      val=parseFloat($("#rec-mnVal").value);
    if(!name||!(val>0)){toast("מלא שם ותוצאה תקינה");return;}
    if(id){
      const e=CACHE.find(x=>x.id===id); if(!e)return;
      Object.assign(e,{sport,name,cls,value:val}); await dbPut(e); toast("עודכן ✓");
    }else{
      await dbPut({id:"r"+Date.now()+Math.random().toString(36).slice(2,6),sport,name,cls,value:val,
        video:null,status:"approved",src:"manual",ts:Date.now()});
      toast("נוסף ללוח ✓"); confetti(40);
    }
    await refresh(); renderAdmin(); modal("rec-manualModal",false);
  }
  async function addCustomSport(){
    const name=($("#rec-csName").value||"").trim();
    const unit=($("#rec-csUnit").value||"").trim();
    const em=($("#rec-csEm").value||"🏅").trim()||"🏅";
    const lower=$("#rec-csLower").checked;
    if(!name||!unit){toast("צריך שם ענף ויחידת מדידה");return;}
    const id="c"+Date.now().toString(36);
    const list=LS.get("rec.custom",[]); list.push({id,em,name,unit,lower});
    LS.set("rec.custom",list); rebuildSports(); LS.set("rec.refs",refs);
    $("#rec-csName").value="";$("#rec-csUnit").value="";$("#rec-csEm").value="";$("#rec-csLower").checked=false;
    await refresh(); renderAdmin(); toast("הענף נוסף — אפשר להזין בו שיאים");
  }

  /* ---------- הרשאות ---------- */
  function applyRoleRec(){
    const stu=window.HM&&window.HM.isStudent&&window.HM.isStudent();
    const ab=$("#rec-adminBtn"); if(ab)ab.style.display=stu?"none":"";
    const kb=$("#rec-kioskBtn"); if(kb)kb.style.display=stu?"none":"";
    const hb=$("#rec-handBtn"); if(hb)hb.style.display=stu?"none":"";
    const rh=$("#rec-roleHint"); if(rh)rh.style.display=stu?"":"none";
    if(stu)modal("rec-adminModal",false);
  }

  /* ---------- kiosk ---------- */
  let kioskTm=null,kioskIdx=0;
  function kioskShow(){
    const withRecs=SPORTS.filter(s=>ranked(s.id).length); if(!withRecs.length){toast("אין עדיין שיאים מאושרים להצגה");return kioskStop();}
    const sp=withRecs[kioskIdx%withRecs.length]; kioskIdx++;
    const list=ranked(sp.id).slice(0,3), medals=["🥇","🥈","🥉"];
    $("#rec-kTitle").textContent=(SET.school?SET.school+" · ":"")+sp.em+" "+sp.name;
    $("#rec-kRows").innerHTML=list.map((e,i)=>`<div class="krow"><span class="m">${medals[i]}</span><span>${esc(e.name)} ${e.cls?"· "+esc(e.cls):""}</span><span class="v">${showVal(sp,e.value)}</span></div>`).join("");
    const v=$("#rec-kVideo"), top=list[0];
    if(v.dataset.url){ try{URL.revokeObjectURL(v.dataset.url)}catch(e){} v.dataset.url=""; }
    if(top&&top.video){ const u=URL.createObjectURL(top.video); v.dataset.url=u; v.src=u; v.play().catch(()=>{}); v.style.display=""; } else v.style.display="none";
  }
  function kioskStart(){ $("#rec-kiosk").classList.add("on"); try{document.documentElement.requestFullscreen()}catch(e){}
    kioskIdx=0; kioskShow(); kioskTm=setInterval(kioskShow,9000); keepAwake(true); }
  function kioskStop(){ $("#rec-kiosk").classList.remove("on"); clearInterval(kioskTm); keepAwake(false);
    try{document.exitFullscreen&&document.exitFullscreen()}catch(e){} }

  /* ---------- init ---------- */
  async function init(){
    await openDB(); await refresh();
    $("#rec-sdSubmit").addEventListener("click",openSubmit);
    $("#rec-subSport").addEventListener("change",updSubLb);
    $("#rec-subSend").addEventListener("click",sendSub);
    $("#rec-adminBtn").addEventListener("click",()=>{ $("#rec-admLock").style.display=""; $("#rec-admBody").style.display="none"; $("#rec-admPass").value=""; modal("rec-adminModal"); });
    $("#rec-admEnter").addEventListener("click",()=>{
      if($("#rec-admPass").value===pass){ $("#rec-admLock").style.display="none"; $("#rec-admBody").style.display=""; renderAdmin(); }
      else toast("סיסמה שגויה");
    });
    $("#rec-passChg").addEventListener("click",()=>{ const p=prompt("סיסמה חדשה:"); if(p){pass=p;LS.set("rec.pass",p);toast("הסיסמה עודכנה");} });
    $("#rec-export").addEventListener("click",async()=>{
      const data=CACHE.map(r=>({...r,video:undefined,hadVideo:!!r.video}));
      const a=document.createElement("a");
      a.href=URL.createObjectURL(new Blob([JSON.stringify({refs,records:data},null,1)],{type:"application/json"}));
      a.download="school-records.json"; a.click(); toast("גובו השיאים (ללא סרטונים)");
    });
    $("#rec-import").addEventListener("change",async e=>{
      const f=e.target.files[0]; if(!f)return;
      try{ const j=JSON.parse(await f.text());
        if(j.refs){refs=Object.assign({},DEF_REFS,j.refs);LS.set("rec.refs",refs);}
        for(const r of (j.records||[]))await dbPut({...r,video:null});
        await refresh(); toast("שוחזר ✓");
      }catch(err){toast("קובץ לא תקין");}
      e.target.value="";
    });
    $("#rec-wipe").addEventListener("click",async()=>{
      if(prompt('להקליד "מחק" לאישור מחיקת כל השיאים:')==="מחק"){
        for(const r of CACHE)await dbDel(r.id); await refresh(); renderAdmin(); toast("נמחק הכל");
      }
    });
    $("#rec-kioskBtn").addEventListener("click",kioskStart);
    $("#rec-kiosk").addEventListener("click",kioskStop);
    document.addEventListener("keydown",e=>{ if(e.key==="Escape")kioskStop(); });
    /* הוספה ידנית / עריכה / ענפים מותאמים */
    $("#rec-mnAdd").addEventListener("click",openManual);
    $("#rec-mnSport").addEventListener("change",updMnLb);
    $("#rec-mnSave").addEventListener("click",saveManual);
    $("#rec-csAdd").addEventListener("click",addCustomSport);
    applyRoleRec();
  }
  return {init,countApproved,applyRole:applyRoleRec,
    _test:{SPORTS:()=>SPORTS,showVal:(id,v)=>showVal(sportById(id),v),pct:(id,v,w)=>pct(sportById(id),v,w)}};
})();


"use strict";
/* ============================================================
   מודול 4 — מאמן הכושר (FIT)
   טיימר אינטרוולים · מחולל תחנות · ספריית תרגילים · קוביית הכושר
   ============================================================ */
const FIT=(function(){
  /* ---------- exercise library ---------- */
  const FIGS={
    squat:`<svg viewBox="0 0 100 100" class="fig"><circle class="hd" cx="50" cy="22" r="9"/><g><animateTransform attributeName="transform" type="translate" values="0 0;0 12;0 0" dur="1.6s" repeatCount="indefinite"/><path d="M50 31 V52"/><path d="M50 38 L34 48 M50 38 L66 48"/></g><path d="M50 52 L38 70 L38 88 M50 52 L62 70 L62 88"><animate attributeName="d" values="M50 52 L38 70 L38 88 M50 52 L62 70 L62 88;M50 64 L34 74 L38 88 M50 64 L66 74 L62 88;M50 52 L38 70 L38 88 M50 52 L62 70 L62 88" dur="1.6s" repeatCount="indefinite"/></path></svg>`,
    push:`<svg viewBox="0 0 100 100" class="fig"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 10;0 0" dur="1.5s" repeatCount="indefinite"/><circle class="hd" cx="22" cy="48" r="8"/><path d="M30 52 L72 60 L88 64"/></g><path d="M34 54 L30 76 M64 59 L62 78"><animate attributeName="d" values="M34 54 L30 76 M64 59 L62 78;M34 64 L30 76 M64 69 L62 78;M34 54 L30 76 M64 59 L62 78" dur="1.5s" repeatCount="indefinite"/></path><path d="M10 80 H92" opacity=".4"/></svg>`,
    jack:`<svg viewBox="0 0 100 100" class="fig"><circle class="hd" cx="50" cy="18" r="9"/><path d="M50 27 V55"/><path d="M50 36 L30 22 M50 36 L70 22"><animate attributeName="d" values="M50 36 L30 22 M50 36 L70 22;M50 36 L32 52 M50 36 L68 52;M50 36 L30 22 M50 36 L70 22" dur="1s" repeatCount="indefinite"/></path><path d="M50 55 L34 86 M50 55 L66 86"><animate attributeName="d" values="M50 55 L34 86 M50 55 L66 86;M50 55 L44 86 M50 55 L56 86;M50 55 L34 86 M50 55 L66 86" dur="1s" repeatCount="indefinite"/></path></svg>`,
    plank:`<svg viewBox="0 0 100 100" class="fig"><circle class="hd" cx="20" cy="50" r="8"/><path d="M28 54 L74 58 L90 60"/><path d="M34 56 L32 74 M68 58 L66 76"/><path d="M8 80 H94" opacity=".4"/><circle cx="50" cy="40" r="2" fill="var(--acc)" stroke="none"><animate attributeName="opacity" values="1;.2;1" dur="1.4s" repeatCount="indefinite"/></circle></svg>`,
    lunge:`<svg viewBox="0 0 100 100" class="fig"><circle class="hd" cx="48" cy="20" r="9"/><path d="M48 29 V52"/><path d="M48 36 L34 46 M48 36 L62 46"/><path d="M48 52 L30 66 L30 86 M48 52 L66 72 L78 86"><animate attributeName="d" values="M48 52 L30 66 L30 86 M48 52 L66 72 L78 86;M48 58 L28 72 L30 86 M48 58 L70 76 L78 86;M48 52 L30 66 L30 86 M48 52 L66 72 L78 86" dur="1.8s" repeatCount="indefinite"/></path></svg>`,
    climber:`<svg viewBox="0 0 100 100" class="fig"><circle class="hd" cx="24" cy="42" r="8"/><path d="M32 47 L70 62"/><path d="M36 50 L32 70 M62 58 L60 76"/><path d="M70 62 L84 76 M70 62 L60 84"><animate attributeName="d" values="M70 62 L84 76 M70 62 L60 84;M70 62 L62 80 M70 62 L86 72;M70 62 L84 76 M70 62 L60 84" dur=".8s" repeatCount="indefinite"/></path><path d="M8 86 H94" opacity=".4"/></svg>`,
    knees:`<svg viewBox="0 0 100 100" class="fig"><circle class="hd" cx="50" cy="16" r="9"/><path d="M50 25 V52"/><path d="M50 34 L36 44 M50 34 L64 26"><animate attributeName="d" values="M50 34 L36 44 M50 34 L64 26;M50 34 L36 26 M50 34 L64 44;M50 34 L36 44 M50 34 L64 26" dur=".7s" repeatCount="indefinite"/></path><path d="M50 52 L38 64 L36 86 M50 52 L62 60 L62 70"><animate attributeName="d" values="M50 52 L38 64 L36 86 M50 52 L62 60 L62 70;M50 52 L40 58 L40 68 M50 52 L62 70 L64 86;M50 52 L38 64 L36 86 M50 52 L62 60 L62 70" dur=".7s" repeatCount="indefinite"/></path></svg>`,
    burpee:`<svg viewBox="0 0 100 100" class="fig"><g><circle class="hd" cx="50" cy="20" r="8"/><path d="M50 28 V50 M50 34 L36 24 M50 34 L64 24 M50 50 L40 84 M50 50 L60 84"/><animateTransform attributeName="transform" type="rotate" values="0 50 55;90 50 60;0 50 55" dur="2s" repeatCount="indefinite"/></g><path d="M10 88 H90" opacity=".4"/></svg>`
  };
  const EX=[
    {id:"squat",name:"סקוואט",grp:"strength",mus:"רגליים · ישבן",fig:"squat",cues:["רגליים ברוחב כתפיים","גב ישר, חזה קדימה","ירידה עד 90° בברכיים","דחיפה דרך העקבים"],mis:["ברכיים קורסות פנימה","עקבים מתרוממים"],reps:{קל:8,בינוני:12,מתקדם:20}},
    {id:"push",name:"שכיבות סמיכה",grp:"strength",mus:"חזה · ידיים · ליבה",fig:"push",cues:["גוף בקו ישר","ידיים ברוחב כתפיים","חזה כמעט נוגע ברצפה"],mis:["אגן שוקע","מרפקים פתוחים מדי"],reps:{קל:6,בינוני:12,מתקדם:20}},
    {id:"jack",name:"ג׳אמפינג ג׳ק",grp:"cardio",mus:"כל הגוף · אירובי",fig:"jack",cues:["קפיצה לפיסוק עם הרמת ידיים","נחיתה רכה על כריות הרגליים","קצב אחיד"],mis:["נחיתה קשה","ידיים לא מגיעות למעלה"],reps:{קל:15,בינוני:25,מתקדם:40}},
    {id:"plank",name:"פלאנק",grp:"core",mus:"ליבה · כתפיים",fig:"plank",cues:["מרפקים מתחת לכתפיים","בטן אסופה, גוף קרש","מבט לרצפה"],mis:["אגן גבוה/נמוך מדי","עצירת נשימה"],reps:{קל:"20 שנ׳",בינוני:"40 שנ׳",מתקדם:"60 שנ׳"}},
    {id:"lunge",name:"לאנג׳",grp:"strength",mus:"רגליים · שיווי משקל",fig:"lunge",cues:["צעד גדול קדימה","שתי הברכיים ב-90°","גו זקוף"],mis:["ברך קדמית עוברת את כף הרגל","צעד קצר מדי"],reps:{קל:6,בינוני:10,מתקדם:16}},
    {id:"climber",name:"מטפס הרים",grp:"cardio",mus:"ליבה · אירובי",fig:"climber",cues:["ידיים נעוצות מתחת לכתפיים","ברכיים רצות לחזה","גב ישר"],mis:["ישבן עולה","קצב לא אחיד"],reps:{קל:16,בינוני:30,מתקדם:50}},
    {id:"knees",name:"ברכיים גבוהות",grp:"cardio",mus:"רגליים · אירובי",fig:"knees",cues:["ברך עד גובה האגן","עבודה על כריות הרגליים","ידיים מלוות בריצה"],mis:["רכינה אחורה","ברכיים נמוכות"],reps:{קל:20,בינוני:30,מתקדם:50}},
    {id:"burpee",name:"ברפי",grp:"mix",mus:"כל הגוף",fig:"burpee",cues:["ירידה לסמיכה","קפיצת רגליים אחורה","חזרה וקפיצה למעלה"],mis:["דילוג על שלב","גב מתעגל"],reps:{קל:5,בינוני:10,מתקדם:15}},
    {id:"situp",name:"כפיפות בטן",grp:"core",mus:"בטן",fig:"plank",cues:["ברכיים כפופות","ידיים מוצלבות על החזה","עלייה מבוקרת"],mis:["משיכה בצוואר","תנופה"],reps:{קל:10,בינוני:15,מתקדם:25}},
    {id:"wall",name:"כיסא קיר",grp:"strength",mus:"רגליים",fig:"squat",cues:["גב צמוד לקיר","ירכיים מקבילות לרצפה","ידיים לצדדים"],mis:["ידיים על הברכיים","זווית גבוהה מדי"],reps:{קל:"20 שנ׳",בינוני:"40 שנ׳",מתקדם:"60 שנ׳"}},
    {id:"skip",name:"דילוג בחבל (מדומה)",grp:"cardio",mus:"שוקיים · תיאום",fig:"jack",cues:["קפיצות קטנות ומהירות","מרפקים צמודים, סיבוב שורש כף יד","נחיתה שקטה"],mis:["קפיצה גבוהה מדי","כתפיים מתוחות"],reps:{קל:30,בינוני:50,מתקדם:80}},
    {id:"superman",name:"סופרמן",grp:"core",mus:"גב תחתון",fig:"plank",cues:["שכיבה על הבטן","הרמת ידיים ורגליים יחד","החזקה שנייה למעלה"],mis:["תנועה חדה","צוואר שבור למעלה"],reps:{קל:8,בינוני:12,מתקדם:20}}
  ];
  const GRPS={strength:"כוח",cardio:"אירובי",core:"ליבה",mix:"משולב"};

  /* ---------- interval engine ---------- */
  let IV={phases:[],i:0,t0:0,paused:0,on:false,raf:0,total:0};
  function buildPhases(work,rest,rounds,sets,setRest){
    const p=[{name:"מתכוננים…",dur:8,ph:"prep"}];
    for(let s=1;s<=sets;s++){
      for(let r=1;r<=rounds;r++){
        p.push({name:"עבודה · סבב "+r+"/"+rounds+(sets>1?" · סט "+s:""),dur:work,ph:"work"});
        if(rest>0&&!(r===rounds))p.push({name:"מנוחה",dur:rest,ph:"rest"});
      }
      if(s<sets&&setRest>0)p.push({name:"מנוחה בין סטים",dur:setRest,ph:"rest"});
    }
    return p;
  }
  function ivStart(){
    ac();
    const w=+$("#fit-work").value||20,r=+$("#fit-rest").value||0,n=+$("#fit-rounds").value||1,
      s=+$("#fit-sets").value||1,sr=+$("#fit-setRest").value||0;
    IV.phases=buildPhases(w,r,n,s,sr); IV.total=IV.phases.reduce((a,p)=>a+p.dur,0);
    IV.i=0; IV.on=true; IV.t0=performance.now(); IV.paused=0;
    $("#fit-go").disabled=true; $("#fit-pause").disabled=false; $("#fit-stop").disabled=false;
    keepAwake(true); say("מתכוננים"); ivLoop(); 
  }
  function ivLoop(){
    if(!IV.on)return;
    const el=(performance.now()-IV.t0)/1000;
    let acc=0,i=0;
    while(i<IV.phases.length&&acc+IV.phases[i].dur<=el){acc+=IV.phases[i].dur;i++;}
    if(i>=IV.phases.length){ivFinish();return;}
    const ph=IV.phases[i], remain=Math.ceil(acc+ph.dur-el);
    if(i!==IV.i){ IV.i=i;
      beep(ph.ph==="work"?990:520,0.22); say(ph.ph==="work"?"עבודה!":(ph.ph==="rest"?"מנוחה":""));
    }
    const prevRemain=$("#fit-phTime").dataset.r;
    if(remain<=3&&remain>=1&&prevRemain!=String(remain))beep(660,0.09);
    $("#fit-phTime").dataset.r=remain;
    $("#fit-phaseBox").dataset.ph=ph.ph;
    $("#fit-phName").textContent=ph.name;
    $("#fit-phTime").textContent=remain;
    $("#fit-phNext").textContent=IV.phases[i+1]?"הבא: "+IV.phases[i+1].name:"שלב אחרון!";
    $("#fit-progBar").style.width=Math.min(100,el/IV.total*100)+"%";
    IV.raf=requestAnimationFrame(ivLoop);
  }
  function ivFinish(){ ivStop(); horn(); say("כל הכבוד! סיימתם את האימון"); confetti();
    $("#fit-phName").textContent="🏆 סיימתם!"; $("#fit-phTime").textContent="✓"; $("#fit-phNext").textContent=""; }
  function ivStop(){ IV.on=false; cancelAnimationFrame(IV.raf); keepAwake(false);
    $("#fit-go").disabled=false; $("#fit-pause").disabled=true; $("#fit-stop").disabled=true; $("#fit-pause").textContent="⏸"; }
  function ivPause(){
    if(IV.on){ IV.on=false; cancelAnimationFrame(IV.raf); IV.paused=performance.now(); $("#fit-pause").textContent="▶"; }
    else if(IV.paused){ IV.t0+=performance.now()-IV.paused; IV.on=true; IV.paused=0; $("#fit-pause").textContent="⏸"; ivLoop(); }
  }
  const PRESETS=[
    {name:"טבאטה",sub:"8×20/10",w:20,r:10,n:8,s:1,sr:0},
    {name:"HIIT כיתתי",sub:"10×30/15",w:30,r:15,n:10,s:1,sr:0},
    {name:"EMOM 10",sub:"10×45/15",w:45,r:15,n:10,s:1,sr:0},
    {name:"כוח 3 סטים",sub:"3×(6×40/20)",w:40,r:20,n:6,s:3,sr:60},
    {name:"זריז",sub:"6×15/10",w:15,r:10,n:6,s:1,sr:0}
  ];

  /* ---------- circuit generator ---------- */
  let CIR={list:[],on:false,t0:0,raf:0,phase:"work",station:0,round:1};
  function cGen(){
    const focus=$("#fit-cFocus").value,n=+$("#fit-cN").value||6;
    let pool=EX.filter(e=>focus==="mix"||e.grp===focus||e.grp==="mix");
    if(pool.length<n)pool=EX.slice();
    const pick=[...pool].sort(()=>Math.random()-0.5).slice(0,n);
    CIR.list=pick; $("#fit-cPlanCard").style.display="";
    cRenderList(-1);
    toast("הוגרלו "+n+" תחנות 🎰");
  }
  function cRenderList(now){
    $("#fit-cList").innerHTML=CIR.list.map((e,i)=>`
      <div class="fit-station ${i===now?"now":""}"><div class="ix">${i+1}</div>
        <div class="grow"><b>${e.name}</b><div class="sb">${e.mus} · ${GRPS[e.grp]}</div></div>
        <div style="width:46px;height:46px">${FIGS[e.fig]}</div></div>`).join("");
  }
  function cStart(){
    ac(); if(!CIR.list.length)return;
    CIR.on=true; CIR.t0=performance.now(); CIR.station=0; CIR.phase="prep"; CIR.round=1;
    $("#fit-cGo").disabled=true; $("#fit-cStop").disabled=false; keepAwake(true);
    say("לתחנות! מתחילים בעוד חמש שניות"); cLoop();
  }
  function cLoop(){
    if(!CIR.on)return;
    const T=+$("#fit-cT").value||45, R=+$("#fit-cR").value||15, n=CIR.list.length;
    const el=(performance.now()-CIR.t0)/1000, prep=5, cyc=T+R;
    let ph,remain,station;
    if(el<prep){ ph="prep"; remain=Math.ceil(prep-el); station=0; }
    else{
      const e2=el-prep; station=Math.floor(e2/cyc); const inCyc=e2-station*cyc;
      if(station>=n){ cFinish(); return; }
      if(inCyc<T){ ph="work"; remain=Math.ceil(T-inCyc); } else { ph="rest"; remain=Math.ceil(cyc-inCyc); }
    }
    if(ph!==CIR.phase||station!==CIR.station){
      if(ph==="work"){ horn(); say("תחנה "+(station+1)+": "+CIR.list[station].name); }
      else if(ph==="rest")beep(520,0.25);
      CIR.phase=ph; CIR.station=station; cRenderList(station);
    }
    $("#fit-cPhase").dataset.ph=ph;
    $("#fit-cPhName").textContent=ph==="prep"?"מתכוננים…":(ph==="work"?"תחנה "+(station+1)+": "+CIR.list[station].name:"מעבר תחנות!");
    $("#fit-cPhTime").textContent=remain;
    $("#fit-cPhNext").textContent=ph==="work"?(CIR.list[station+1]?"הבאה: "+CIR.list[station+1].name:"תחנה אחרונה!"):"";
    $("#fit-cRound").textContent="תחנה "+Math.min(station+1,CIR.list.length)+"/"+CIR.list.length;
    CIR.raf=requestAnimationFrame(cLoop);
  }
  function cFinish(){ cStop(); horn(); confetti(); say("סבב הושלם! כל הכבוד");
    $("#fit-cPhName").textContent="🏆 הסבב הושלם!"; $("#fit-cPhTime").textContent="✓"; }
  function cStop(){ CIR.on=false; cancelAnimationFrame(CIR.raf); keepAwake(false);
    $("#fit-cGo").disabled=false; $("#fit-cStop").disabled=true; }

  /* ---------- library & dice ---------- */
  function renderLib(){
    $("#fit-exGrid").innerHTML=EX.map(e=>`<div class="fit-ex" data-id="${e.id}">${FIGS[e.fig]}<b>${e.name}</b><span>${GRPS[e.grp]} · ${e.mus}</span></div>`).join("");
    $$("#fit-exGrid .fit-ex").forEach(t=>t.addEventListener("click",()=>{
      const e=EX.find(x=>x.id===t.dataset.id);
      $("#fit-exTitle").textContent=e.name;
      $("#fit-exFig").innerHTML=`<div style="width:130px;margin:0 auto">${FIGS[e.fig]}</div>`;
      $("#fit-exBody").innerHTML=`
        <div class="pill acc" style="margin-bottom:10px">${GRPS[e.grp]} · ${e.mus}</div>
        <h2 style="font-size:14px"><span class="dot"></span> ביצוע נכון</h2>
        <ul class="hint" style="font-size:13.5px;line-height:1.8;margin:4px 0 12px">${e.cues.map(c=>"<li>"+c+"</li>").join("")}</ul>
        <h2 style="font-size:14px"><span class="dot"></span> טעויות נפוצות</h2>
        <ul class="hint" style="font-size:13.5px;line-height:1.8;margin:4px 0 12px">${e.mis.map(c=>"<li>"+c+"</li>").join("")}</ul>
        <h2 style="font-size:14px"><span class="dot"></span> מינון מומלץ</h2>
        <div class="row">${Object.entries(e.reps).map(([k,v])=>`<span class="pill">${k}: <b style="color:var(--acc)">&nbsp;${v}</b></span>`).join("")}</div>`;
      modal("fit-exModal");
    }));
  }
  function roll(){
    ac();
    const d1=$("#fit-die1"),d2=$("#fit-die2");
    d1.classList.remove("roll");d2.classList.remove("roll");void d1.offsetWidth;
    d1.classList.add("roll");d2.classList.add("roll");beep(700,0.1);setTimeout(()=>beep(900,0.1),200);
    setTimeout(()=>{
      const e=EX[Math.floor(Math.random()*EX.length)];
      const isTime=typeof e.reps.בינוני==="string";
      const amounts=isTime?["15 שנ׳","20 שנ׳","30 שנ׳","40 שנ׳","45 שנ׳","60 שנ׳"]:[5,8,10,12,15,20];
      const amt=amounts[Math.floor(Math.random()*6)];
      d1.innerHTML=`<div><div class="top" style="font-size:15px;line-height:1.2">${FIGS[e.fig]?"":""}${e.name}</div><div class="bot">${GRPS[e.grp]}</div></div>`;
      d2.innerHTML=`<div><div class="top">${amt}</div><div class="bot">${isTime?"זמן":"חזרות"}</div></div>`;
      $("#fit-diceResult").innerHTML=`🎯 ${e.name} × <b style="color:var(--acc)">${amt}</b>`;
      say(e.name+", "+amt); horn();
    },680);
  }

  /* ---------- init ---------- */
  function init(){
    $$(".pf-tabs [data-ft]").forEach(b=>b.addEventListener("click",()=>{
      $$(".pf-tabs [data-ft]").forEach(x=>x.classList.remove("on")); b.classList.add("on");
      ["timer","circuit","lib","dice"].forEach(t=>$("#fit-sub-"+t).style.display=t===b.dataset.ft?"":"none");
    }));
    $("#fit-presets").innerHTML=PRESETS.map((p,i)=>`<div class="fit-pre" data-i="${i}"><b>${p.name}</b><span>${p.sub}</span></div>`).join("");
    $$("#fit-presets .fit-pre").forEach(t=>t.addEventListener("click",()=>{
      $$("#fit-presets .fit-pre").forEach(x=>x.classList.remove("on")); t.classList.add("on");
      const p=PRESETS[t.dataset.i];
      $("#fit-work").value=p.w;$("#fit-rest").value=p.r;$("#fit-rounds").value=p.n;$("#fit-sets").value=p.s;$("#fit-setRest").value=p.sr;
    }));
    $("#fit-go").addEventListener("click",ivStart);
    $("#fit-pause").addEventListener("click",ivPause);
    $("#fit-stop").addEventListener("click",()=>{ivStop();$("#fit-phName").textContent="הופסק";});
    $("#fit-cGen").addEventListener("click",cGen);
    $("#fit-cGo").addEventListener("click",cStart);
    $("#fit-cStop").addEventListener("click",()=>{cStop();$("#fit-cPhName").textContent="הופסק";});
    $("#fit-roll").addEventListener("click",roll);
    renderLib();
  }
  return {init,_test:{buildPhases,EX}};
})();


/* ===== bridge for new modules ===== */
window.REC=REC; window.BT=BT; window.PF=PF; window.FIT=FIT;
window.HM={$,$$,LS,SET,ac,beep,horn,tripleBeep,say,keepAwake,toast,confetti,dlCSV,esc,modal,go,fmtMS,fmtMSc,
  setRole,isStudent,role:()=>ROLE};
window.HMBoot=function(){ wireModals(); wireNav(); wireSettings(); applySchool(); applyRole();
  go(location.hash.slice(1)||"home"); homeStats(); };
