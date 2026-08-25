

"use strict";
/* ============================================================
   המגרש PRO — ליבה משותפת: אחסון, שמע, קול, ניווט, עזרים
   ============================================================ */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const LS={
  get(k,d){try{const v=localStorage.getItem("pehub."+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem("pehub."+k,JSON.stringify(v))}catch(e){}}
};
const SET=Object.assign({school:"",sound:true,voice:true,wake:true,driveForm:"",driveFolder:""},LS.get("settings",{}));
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
/* קישור שהמורה מחלק: ?role=student  (ועם guest=1 — מכשיר של התלמיד) */
const QP=new URLSearchParams(location.search);
if(QP.get("role")==="student"){
  ROLE="student";
  sessionStorage.setItem("pehub.role","student");
  sessionStorage.setItem("pehub.unlocked","1"); /* מדלג על מסך הקוד */
}
const GUEST=QP.get("guest")==="1"&&ROLE==="student";
/* קישור טופס ההעלאה נוסע בתוך הקישור עצמו — ההגדרות נשמרות לכל מכשיר
   בנפרד, ולתלמיד בטלפון שלו אין את מה שהמורה הגדיר אצלו. */
(function(){
  const up=QP.get("up");
  if(up&&ROLE==="student"&&/^https:\/\//i.test(up)&&up!==SET.driveForm){
    SET.driveForm=up; try{LS.set("settings",SET);}catch(e){}
  }
})();
const isStudent=()=>ROLE==="student";
const isGuest=()=>GUEST&&isStudent();
function setRole(r){
  ROLE=(r==="student")?"student":"teacher";
  sessionStorage.setItem("pehub.role",ROLE);
  /* חזרה למצב מורה מנקה את ?role=student מהכתובת — אחרת רענון היה
     מחזיר את המכשיר למצב תלמיד, כי הפרמטר ב-URL גובר על ההגדרה. */
  if(ROLE==="teacher"&&QP.get("role")){
    QP.delete("role"); QP.delete("guest");
    const q=QP.toString();
    try{history.replaceState(null,"",location.pathname+(q?"?"+q:"")+location.hash);}catch(e){}
  }
  applyRole();
}
function applyRole(){
  const stu=isStudent();
  document.body.classList.toggle("role-student",stu);
  $$(".nav button[data-go]").forEach(b=>{ b.style.display=(!stu||STUDENT_MODS[b.dataset.go])?"":"none"; });
  /* «משחקים» עבר לתוך אשכול «שיעור» עבור המורה — לתלמיד (שלא נכנס ל-שיעור בכלל)
     הוא חייב להישאר כפתור ישיר בסרגל. «עוד» מוביל רק למודולים שאסורים לתלמיד ממילא. */
  const ng=$("#navGames"); if(ng)ng.style.display=stu?"":"none";
  const nm=$("#navMore"); if(nm)nm.style.display=stu?"none":"";
  const st=$("#btnSettings"); if(st)st.style.display=stu?"none":"";
  const rb=$("#roleBadge");
  if(rb){ rb.style.display=stu?"":"none"; }
  if(typeof REC!=="undefined"&&REC.applyRole)REC.applyRole();
  if(stu&&!STUDENT_MODS[document.body.dataset.mod||""])go("rec");
}

/* ---------- router ---------- */
const MODS={home:1,beep:1,photo:1,rec:1,fit:1,stu:1,lesson:1,nut:1,games:1,know:1,tools:1};
/* מודולים שנגישים דרך כפתור «עוד» ולא ישירות בסרגל — כדי שהכפתור יודגש כשנמצאים באחד מהם */
const MORE_MODS=["stu","know","tools","nut"];
const inited={};
function go(mod){
  if(!MODS[mod])mod="home";
  if(isStudent()&&!STUDENT_MODS[mod])mod="rec";
  document.body.dataset.mod=mod;
  $$(".view").forEach(v=>v.classList.toggle("on",v.id==="view-"+mod));
  $$(".nav button").forEach(b=>b.classList.toggle("on",b.dataset.go===mod));
  const nm=$("#navMore"); if(nm)nm.classList.toggle("on",MORE_MODS.includes(mod));
  if(!inited[mod]){ inited[mod]=true; const f={beep:BT.init,photo:PF.init,rec:REC.init,fit:FIT.init,home:homeInit,stu:window.STU.init,lesson:window.LESSON.init,nut:window.NUT.init,games:window.GAMES&&window.GAMES.init,know:window.KNOW&&window.KNOW.init,tools:window.TOOLS&&window.TOOLS.init}[mod]; if(f)f(); }
  if(mod==="home")homeStats();
  if(location.hash!=="#"+mod){ try{history.replaceState(null,"","#"+mod)}catch(e){} }
}
function wireNav(){ $$("[data-go]").forEach(el=>el.addEventListener("click",()=>{ ac(); go(el.dataset.go); }));
  const nm=$("#navMore"); if(nm)nm.addEventListener("click",()=>{ ac(); modal("moreModal"); });
  const hm=$("#hxMoreBtn"); if(hm)hm.addEventListener("click",()=>{ ac(); modal("moreModal"); }); }
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
$("#btnSettings").addEventListener("click",()=>{ $("#set-school").value=SET.school; $("#set-sound").checked=SET.sound; $("#set-voice").checked=SET.voice; $("#set-wake").checked=SET.wake;
  $("#set-driveForm").value=SET.driveForm||""; $("#set-driveFolder").value=SET.driveFolder||"";
  $("#set-syncUrl").value=SET.syncUrl||""; $("#set-syncCode").value=SET.syncCode||""; modal("setModal"); });
$("#set-save").addEventListener("click",()=>{ SET.school=$("#set-school").value.trim(); SET.sound=$("#set-sound").checked; SET.voice=$("#set-voice").checked; SET.wake=$("#set-wake").checked;
  SET.driveForm=$("#set-driveForm").value.trim(); SET.driveFolder=$("#set-driveFolder").value.trim();
  SET.syncUrl=$("#set-syncUrl").value.trim(); SET.syncCode=$("#set-syncCode").value.trim();
  saveSet(); modal("setModal",false); toast("ההגדרות נשמרו");
  if(typeof REC!=="undefined"&&REC.applyRole)REC.applyRole(); });
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
      const rate=capRate();
      const pv=$("#pf-precision");
      if(pv)pv.textContent=rate?`קצב דגימה בפועל: ${rate.toFixed(0)} עמודות/שנ׳ · רזולוציית זמן ±${(1/rate*1000).toFixed(0)} מ״ש`:"";
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
  /* אינטרפולציה תת-עמודתית: במקום לקפוץ לעמודה הקרובה, מחשבים ליניארית
     בין שתי העמודות שמקיפות את הנקודה. זה מוריד את שגיאת הקוונטיזציה
     מפריים שלם לחלק ממנו — בדיוק העיקרון שמערכות FAT משתמשות בו. */
  function timeAtCol(x){
    if(!cols.length)return null;
    if(x<=cols[0].x)return cols[0].t;
    if(x>=cols[cols.length-1].x)return cols[cols.length-1].t;
    let lo=0,hi=cols.length-1;
    while(hi-lo>1){ const mid=(lo+hi)>>1; if(cols[mid].x<=x)lo=mid; else hi=mid; }
    const a=cols[lo],b=cols[hi],dx=b.x-a.x;
    return dx>0 ? a.t+(b.t-a.t)*((x-a.x)/dx) : a.t;
  }
  /* קצב הדגימה בפועל ורזולוציית הזמן הנובעת ממנו */
  function capRate(){
    if(cols.length<12)return null;
    const span=cols[cols.length-1].t-cols[0].t;
    if(span<=0)return null;
    return (cols.length-1)/span;
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
        else if(peak>70){ micStop(); launch(soundLagSec()); return; }
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
  /* קול נע ~343 מ/ש. אם המיקרופון רחוק מהמזניק, השמע מגיע באיחור
     והשעון היה מתחיל מאוחר מדי — לכן מזיזים את t0 אחורה בהתאם.
     (המנגנון שמערכות FAT מיישמות כדי לקזז את מרחק האקדח.) */
  function soundLagSec(){
    const d=parseFloat(LS.get("pf.gunDist",0));
    return (d>0&&isFinite(d)) ? d/343 : 0;
  }
  function launch(backdate){
    horn();
    race.on=true; race.armed=true;
    race.t0=performance.now()-(backdate||0)*1000;
    lineActive=false; lastFire=-1e9;
    $("#pf-gun").innerHTML="⏹ עצור מקצה";
    const fg=$("#pf-fsGun"); if(fg){ fg.textContent="⏹ עצור"; fg.classList.remove("go"); }
    LS.set("pf.totalRaces",LS.get("pf.totalRaces",0)+1);
    keepAwake(true); clockLoop();
    if(mode==="sim")simStart();
  }
  function clockLoop(){ if(!race.on)return;
    const t=fmtMSc(rTime()); $("#pf-clock").textContent=t;
    const fc=$("#pf-fsClock"); if(fc)fc.textContent=t;
    race.raf=requestAnimationFrame(clockLoop); }
  function stopRace(){ race.on=false; race.armed=false; sim.active=false; micStop();
    cancelAnimationFrame(race.raf); cancelAnimationFrame(sim.raf); keepAwake(false);
    $("#pf-gun").textContent="🔫 זינוק"; renderFullStrip(); refreshLaneSel();
    const fg=$("#pf-fsGun"); if(fg){ fg.textContent="🔫 זינוק"; fg.classList.add("go"); } }
  function resetRace(){ stopRace(); prepRace(); $("#pf-clock").textContent="00:00.00";
    const fc=$("#pf-fsClock"); if(fc)fc.textContent="00:00.00"; if(mode==="sim")drawSimIdle(); }

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
    $("#pf-fsGun").addEventListener("click",gun);
    $("#pf-fsReset").addEventListener("click",()=>{ if(confirm("לאפס את המקצה?"))resetRace(); });
    $("#pf-lineRange").value=lineRatio*100;
    $("#pf-lineEl").style.left=(lineRatio*100)+"%";
    $("#pf-lineRange").addEventListener("input",e=>{ lineRatio=e.target.value/100; LS.set("pf.line",lineRatio); $("#pf-lineEl").style.left=e.target.value+"%"; bg=null; });
    $("#pf-sens").value=sens; $("#pf-sensVal").textContent=sens;
    $("#pf-sens").addEventListener("input",e=>{ sens=+e.target.value; LS.set("pf.sens",sens); $("#pf-sensVal").textContent=sens; });
    $("#pf-slit").value=slitW; $("#pf-slitVal").textContent=slitW+"px";
    $("#pf-slit").addEventListener("input",e=>{ slitW=+e.target.value; LS.set("pf.slit",slitW); $("#pf-slitVal").textContent=slitW+"px"; });
    $("#pf-minT").value=minT;
    $("#pf-minT").addEventListener("change",e=>{ minT=+e.target.value||0; LS.set("pf.minT",minT); });
    /* קיזוז מרחק אקדח–מיקרופון */
    $("#pf-gunDist").value=LS.get("pf.gunDist",0);
    $("#pf-gunDist").addEventListener("change",e=>{
      const d=Math.max(0,+e.target.value||0); LS.set("pf.gunDist",d);
      $("#pf-gunLag").textContent=d>0?"קיזוז "+(d/343*1000).toFixed(0)+" מ״ש":"בלי קיזוז";
    });
    $("#pf-gunLag").textContent=(()=>{const d=LS.get("pf.gunDist",0);
      return d>0?"קיזוז "+(d/343*1000).toFixed(0)+" מ״ש":"בלי קיזוז";})();
    /* הדבקת רשימת שמות */
    $("#pf-pasteNames").addEventListener("click",()=>{
      const txt=prompt("הדבק רשימת שמות — שם בכל שורה (או מופרד בפסיקים):");
      if(!txt)return;
      const list=txt.split(/[\n,]/).map(x=>x.trim()).filter(Boolean);
      if(!list.length)return;
      laneN=Math.max(2,Math.min(9,list.length));
      LS.set("pf.laneN",laneN);
      $("#pf-laneCount").value=laneN; $("#pf-laneCountVal").textContent=laneN;
      buildLanes(false);
      lanes.forEach((l,i)=>{ if(list[i])l.name=list[i]; });
      persistNames(); renderChips(); renderBoard(); refreshLaneSel();
      toast("נטענו "+lanes.length+" מתחרים");
    });
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
  /* ---------- מקור אמת אחד לענפים ----------
     הרשימה נטענת מ-localStorage. בפעם הראשונה היא נזרעת מברירות המחדל
     שב-hm-howto.js, ומרגע זה **הכול ניתן לעריכה מלאה מלוח המורה** —
     שם, סמל, יחידה, כיוון, מגבלת זמן וכל טקסט הכללים. */
  const DEF_REFS={rope:{israel:200,world:388},dbl:{israel:120,world:180},
    push:{israel:80,world:105},pull:{israel:35,world:45},dips:{israel:60,world:75},
    sit:{israel:60,world:75},squat:{israel:55,world:70},burpee:{israel:35,world:45},
    jack:{israel:90,world:110},mount:{israel:60,world:80},
    ljump:{israel:300,world:373},hjump:{israel:80,world:126},
    sprint30:{israel:4.0,world:3.8},sprint:{israel:6.9,world:6.3},shuttle:{israel:9.0,world:8.2},
    throw:{israel:10,world:10},basket60:{israel:25,world:35},wallpass:{israel:60,world:80},
    juggle:{israel:200,world:300},toetap:{israel:70,world:95},selfpass:{israel:70,world:90},
    cone:{israel:12,world:9},balance:{israel:60,world:60}};

  let SPORTS=[];
  let refs={}, pass=LS.get("rec.pass",null);
  const hasPass=()=>!!LS.get("rec.pass",null);
  function setPass(p){ pass=p; LS.set("rec.pass",p); }
  let db=null, CACHE=[];

  function defaults(){ return (window.RECDEFAULTS?window.RECDEFAULTS.sports():[]); }
  function loadSports(){
    let list=LS.get("rec.sports",null);
    if(!Array.isArray(list)||!list.length){
      list=defaults();
      /* hm-howto.js נטען אחרי הקובץ הזה — אם עוד לא הגיע, לא שומרים
         רשימה ריקה שתישאר תקועה ב-localStorage */
      if(!list.length){ SPORTS=[]; refs=Object.assign({},DEF_REFS,LS.get("rec.refs",{})); return; }
      /* הגירה מהמבנה הישן: ענפים שהמורה הוסיף לפני העורך */
      (LS.get("rec.custom",[])||[]).forEach(c=>{
        if(!list.some(x=>x.id===c.id))
          list.push({id:c.id,em:c.em||"🏅",name:c.name,unit:c.unit,lower:!!c.lower,
            timeSec:null,vidMax:120,proto:"",ok:[],no:[],film:[],yt:""});
      });
      LS.set("rec.sports",list);
    }
    SPORTS=list;
    refs=Object.assign({},DEF_REFS,LS.get("rec.refs",{}));
    SPORTS.forEach(sp=>{ if(!refs[sp.id])refs[sp.id]={israel:0,world:0}; });
  }
  function saveSports(){ LS.set("rec.sports",SPORTS); LS.set("rec.refs",refs); }
  /* ענף שנמחק אך עדיין יש לו שיאים — משוחזר כרשומה מוסתרת כדי שהתוצאה
     לא תיעלם בשקט מהמסך */
  function reviveOrphans(){
    const known=new Set(SPORTS.map(s=>s.id));
    const R=window.RECDEFAULTS&&window.RECDEFAULTS.retired||{};
    let added=false;
    CACHE.forEach(r=>{
      if(known.has(r.sport))return;
      known.add(r.sport); added=true;
      SPORTS.push({id:r.sport,em:"🗄️",name:(R[r.sport]||r.sport)+" (ענף ישן)",
        unit:"",lower:false,timeSec:null,vidMax:180,legacy:true,
        proto:"ענף שהוסר מהרשימה. השיאים נשמרו כדי שלא ילכו לאיבוד — אפשר לערוך או למחוק אותו בעורך הענפים.",
        ok:[],no:[],film:[],yt:""});
      if(!refs[r.sport])refs[r.sport]={israel:0,world:0};
    });
    if(added)saveSports();
  }

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
  function dbPut(r,opts){
    opts=opts||{}; if(!opts.silent)r.mts=Date.now();
    return new Promise((res,rej)=>{
      const rq=db.transaction("rec","readwrite").objectStore("rec").put(r);
      rq.onsuccess=()=>{ res(); if(!opts.silent)syncPush({action:"upsert",record:stripForSync(r)}); };
      rq.onerror=()=>rej(rq.error);
    });
  }
  function dbDel(id,opts){
    opts=opts||{};
    return new Promise((res,rej)=>{
      const rq=db.transaction("rec","readwrite").objectStore("rec").delete(id);
      rq.onsuccess=()=>{ res(); if(!opts.silent)syncPush({action:"delete",id,mts:Date.now()}); };
      rq.onerror=()=>rej(rq.error);
    });
  }
  async function refresh(){ CACHE=await dbAll(); reviveOrphans(); renderGrid(); }

  /* ---------- סנכרון שיאים בין כמה מורים (אופציונלי) ----------
     שולח רק את הנתונים המובנים (שם/ענף/תוצאה/סטטוס) ל-Google Sheet משותף;
     סרטונים אף פעם לא עוברים בסנכרון — הם נשארים במכשיר או בדרייב. */
  function stripForSync(r){
    return {id:r.id,sport:r.sport,name:r.name,cls:r.cls||"",value:r.value,status:r.status,
      src:r.src||"",ts:r.ts,mts:r.mts||Date.now(),hasVideo:!!r.video};
  }
  async function syncPush(payload){
    if(!SET.syncUrl)return;
    try{
      await fetch(SET.syncUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify(Object.assign({code:SET.syncCode||""},payload))});
    }catch(e){ /* אין אינטרנט כרגע — הרשומה נשארת מקומית, אפשר לסנכרן ידנית מאוחר יותר */ }
  }
  async function syncPull(){
    if(!SET.syncUrl)return {ok:false,reason:"לא הוגדרה כתובת סנכרון"};
    try{
      const url=SET.syncUrl+(SET.syncUrl.includes("?")?"&":"?")+"code="+encodeURIComponent(SET.syncCode||"");
      const res=await fetch(url);
      const remote=await res.json();
      if(!Array.isArray(remote)){ return {ok:false,reason:remote&&remote.error||"תשובה לא תקינה"}; }
      let changed=0;
      for(const rr of remote){
        const local=CACHE.find(x=>x.id===rr.id);
        if(rr.deleted){
          if(local){ await dbDel(rr.id,{silent:true}); changed++; }
          continue;
        }
        if(!local||Number(rr.mts||0)>Number(local.mts||0)){
          await dbPut(Object.assign({},rr,{video:local?local.video:null}),{silent:true});
          changed++;
        }
      }
      CACHE=await dbAll(); reviveOrphans();
      return {ok:true,changed};
    }catch(e){ return {ok:false,reason:"שגיאת רשת"}; }
  }
  async function syncNow(){
    if(!SET.syncUrl||!SET.syncCode){ toast("קודם הגדר כתובת וקוד סנכרון בהגדרות"); return; }
    toast("🔄 מסנכרן…");
    const r=await syncPull();
    if(r.ok){ renderGrid(); renderAdmin(); toast(r.changed?"✓ סונכרנו "+r.changed+" עדכונים":"✓ הכול מעודכן"); }
    else toast("סנכרון נכשל: "+r.reason);
  }

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
  function countApproved(){
    if(!SPORTS.length)loadSports();
    return (db?Promise.resolve():openDB()).then(dbAll).then(l=>l.filter(r=>r.status==="approved").length);
  }

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
    $("#rec-sdHint").innerHTML="יחידה: "+esc(sp.unit)+(sp.lower?" · נמוך יותר = טוב יותר":"")+
      ` <button class="btn sm acc" id="rec-sdRules" style="margin-inline-start:8px">📋 איך מבצעים ומצלמים</button>`;
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
    /* במכשיר של התלמיד: השיאים שנשלחו יושבים כאן בלבד — נותנים אפשרות לשלוח שוב */
    if(window.HM&&window.HM.isGuest&&window.HM.isGuest()){
      const mine=CACHE.filter(r=>r.sport===id&&r.status==="pending").sort((a,b)=>b.ts-a.ts);
      if(mine.length)$("#rec-sdBoard").insertAdjacentHTML("afterbegin",
        `<div class="rec-mine"><b>📁 השיאים ששלחת מהמכשיר הזה</b>${
          mine.map(e=>`<div class="row" style="align-items:center;margin-top:7px">
            <span class="grow">${esc(e.name)} · ${showVal(sp,e.value)} ${esc(sp.unit)}</span>
            <button class="btn sm acc" data-resend="${e.id}">📤 שלח למורה שוב</button></div>`).join("")
        }<div class="hint" style="margin-top:7px">שיא נכנס ללוח רק אחרי שהמורה קולט את הקובץ ומאשר.</div></div>`);
      $$("#rec-sdBoard [data-resend]").forEach(b2=>b2.addEventListener("click",async()=>{
        const r=CACHE.find(x=>x.id===b2.dataset.resend); if(!r)return;
        const how=await exportRecord(r);
        toast(how==="shared"?"📤 נשלח":how==="cancelled"?"בוטל":"📁 הקובץ ירד — שלח אותו למורה");
      }));
    }
    modal("rec-sportModal");
    setTimeout(()=>{ const f=$$("#rec-sdCompare .fill");
      if(f[0])f[0].style.width=pct(sp,sv,rf.world)+"%";
      if(f[1])f[1].style.width=pct(sp,rf.israel,rf.world)+"%";
      if(f[2])f[2].style.width="100%"; },80);
    $$("#rec-sdBoard .vbtn").forEach(b2=>b2.addEventListener("click",()=>playVideo(b2.dataset.v)));
    const rb=$("#rec-sdRules"); if(rb)rb.addEventListener("click",()=>openHowto(id));
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
  function updSubLb(){
    const sp=sportById($("#rec-subSport").value);
    $("#rec-subValLb").textContent="תוצאה ("+sp.unit+")";
    $("#rec-subRules").innerHTML=howtoHtml(sp,true);
    const dv=$("#rec-subDrive");
    if(dv){
      const guest=window.HM&&window.HM.isGuest&&window.HM.isGuest();
      dv.style.display=(guest&&SET.driveForm)?"":"none";
      dv.innerHTML=`📤 <b>בבית הספר הזה מעלים את הסרטון לטופס.</b> מלא כאן את התוצאה,
        ואז לחץ על הכפתור כדי להעלות את הסרטון לתיקייה של המורה.
        <a class="btn sm acc" href="${esc(SET.driveForm)}" target="_blank" rel="noopener" style="margin-top:7px;display:inline-block">פתח את טופס ההעלאה ↗</a>`;
    }
    const full=$("#rec-subFull");
    if(full)full.onclick=()=>openHowto(sp.id);
    const ck=$("#rec-subOk"); if(ck)ck.checked=false;
  }
  /* קורא את אורך הסרטון לפני השליחה, כדי לאכוף את מגבלת הזמן של הענף */
  function videoDuration(file){
    return new Promise(res=>{
      try{
        const v=document.createElement("video"); v.preload="metadata";
        const u=URL.createObjectURL(file);
        let done=false;
        const fin=d=>{ if(done)return; done=true; URL.revokeObjectURL(u); res(d); };
        v.onloadedmetadata=()=>{
          /* קבצים שהוקלטו בדפדפן (MediaRecorder) מדווחים duration=Infinity
             עד שמדלגים לסוף. זו העקיפה המקובלת. */
          if(v.duration===Infinity||isNaN(v.duration)){
            v.currentTime=1e101;
            v.ontimeupdate=()=>{ v.ontimeupdate=null; fin(isFinite(v.duration)?v.duration:null); };
          } else fin(v.duration);
        };
        v.onerror=()=>fin(null);
        setTimeout(()=>fin(null),6000); /* לא תוקעים שליחה אם המטא-דאטה לא נטען */
        v.src=u;
      }catch(e){ res(null); }
    });
  }
  async function sendSub(){
    const sport=$("#rec-subSport").value, name=$("#rec-subName").value.trim(),
      cls=$("#rec-subClass").value.trim(), val=parseFloat($("#rec-subVal").value);
    if(!name||!(val>0)){toast("מלא שם ותוצאה תקינה");return;}
    if(!$("#rec-subOk").checked){toast("צריך לאשר שקראת את כללי הביצוע והצילום");return;}
    const f=$("#rec-subVideo").files[0]||null;
    if(f&&f.size>120*1024*1024){toast("הסרטון גדול מדי (עד 120MB)");return;}
    if(f){
      const spv=sportById(sport), lim=spv.vidMax||0;
      const dur=await videoDuration(f);
      if(lim&&dur&&dur>lim+5){
        toast("הסרטון "+Math.round(dur)+" שניות — בענף הזה מותר עד "+lim+". חתוך אותו ושלח שוב.");
        return;
      }
    }
    await dbPut({id:"r"+Date.now()+Math.random().toString(36).slice(2,6),sport,name,cls,value:val,video:f,
      status:"pending",src:(window.HM&&window.HM.isStudent&&window.HM.isStudent())?"student":"teacher",ts:Date.now()});
    await refresh(); modal("rec-subModal",false);
    $("#rec-subName").value="";$("#rec-subClass").value="";$("#rec-subVal").value="";$("#rec-subVideo").value="";
    if(window.HM&&window.HM.isGuest&&window.HM.isGuest()){
      /* מכשיר של התלמיד: אין שרת משותף, ולכן אורזים את השיא לקובץ לשליחה למורה */
      const rec=CACHE.slice().sort((a,b)=>b.ts-a.ts)[0];
      const how=await exportRecord(rec);
      beep(880,0.15);
      toast(how==="shared"?"📤 נשלח למורה!":
            how==="cancelled"?"הקובץ מוכן — אפשר לשלוח שוב מהלוח":
            "📁 קובץ השיא ירד — שלח אותו למורה");
      return;
    }
    toast("📤 נשלח! השיא ימתין לאישור המורה."); beep(880,0.15);
  }

  /* ---------- admin ---------- */
  function renderAdmin(){
    const pend=CACHE.filter(r=>r.status==="pending").sort((a,b)=>a.ts-b.ts);
    $("#rec-pendList").innerHTML=pend.length?pend.map(e=>{
      const sp=sportById(e.sport);
      return `<div class="fit-station"><div class="ix">${sp.em}</div>
        <div class="grow"><b>${esc(e.name)}</b> ${e.cls?"· "+esc(e.cls):""}<div class="sb">${sp.name} · ${showVal(sp,e.value)} ${sp.unit}</div></div>
        ${e.video?`<button class="vbtn" data-v="${e.id}">▶</button>`
          :(e.hasVideo?'<span class="pill" title="הרשומה הגיעה בסנכרון — הסרטון נמצא במכשיר שקיבל אותה">📹 במכשיר אחר</span>':'<span class="pill">בלי סרטון</span>')}
        <button class="btn sm" data-ht="${e.sport}" title="כללי הביצוע — מה לבדוק">📋</button>
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
    $$("#rec-pendList [data-ht]").forEach(b=>b.addEventListener("click",()=>openHowto(b.dataset.ht)));
    /* --- כל השיאים המאושרים: עריכה ומחיקה --- */
    const appr=CACHE.filter(r=>r.status==="approved").sort((a,b)=>b.ts-a.ts);
    $("#rec-allList").innerHTML=appr.length?`<table class="tbl"><thead><tr>
      <th>ענף</th><th>שם</th><th>כיתה</th><th>תוצאה</th><th>מקור</th><th></th></tr></thead><tbody>${
      appr.map(e=>{ const sp=sportById(e.sport);
        return `<tr><td>${sp.em} ${esc(sp.name)}</td><td><b>${esc(e.name)}</b></td>
          <td style="color:var(--muted)">${esc(e.cls||"")}</td>
          <td class="mono">${showVal(sp,e.value)}</td>
          <td>${e.video?`<button class="vbtn" data-v="${e.id}">▶</button>`
            :(e.hasVideo?'<span class="pill" title="הרשומה הגיעה בסנכרון — הסרטון נמצא במכשיר שקיבל אותה">📹</span>'
            :(e.src==="manual"?'<span class="pill">ידני</span>':'<span class="pill">—</span>'))}</td>
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

    renderSportEditor();
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


  /* ---------- כללי ביצוע וצילום ---------- */
  function howtoHtml(sp,compact){
    const W=window.RECDEFAULTS; if(!W)return "";
    const G=W.generic;
    const h={proto:sp.proto||G.proto, ok:(sp.ok&&sp.ok.length?sp.ok:G.ok),
             no:(sp.no&&sp.no.length?sp.no:G.no), film:(sp.film&&sp.film.length?sp.film:G.film),
             yt:sp.yt||""};
    const li=a=>a.map(x=>"<li>"+mdBold(esc(x))+"</li>").join("");
    const cap=sp.vidMax?`<div class="vid">🎬 אורך הסרטון: עד <b>${sp.vidMax} שניות</b>${sp.timeSec?` · משך המאמץ: ${sp.timeSec} שניות`:""}</div>`:"";
    if(compact) return `<div class="rec-rules compact">
      <div class="pr">⏱ ${esc(h.proto)}</div>${cap}
      <div class="two">
        <div><b class="ok">✅ תקין</b><ul>${li(h.ok.slice(0,2))}</ul></div>
        <div><b class="no">❌ פוסל</b><ul>${li(h.no.slice(0,2))}</ul></div>
      </div>
      <div><b class="cam">🎥 צילום</b><ul>${li(h.film.slice(0,2))}</ul></div>
    </div>`;
    return `<div class="rec-rules">
      <div class="pr">⏱ <b>פרוטוקול:</b> ${esc(h.proto)}</div>${cap}
      <div class="sec"><b class="ok">✅ מה נחשב תקין</b><ul>${li(h.ok)}</ul></div>
      <div class="sec"><b class="no">❌ מה פוסל</b><ul>${li(h.no)}</ul></div>
      <div class="sec"><b class="cam">🎥 איך מצלמים</b><ul>${li(h.film)}</ul></div>
      <div class="sec"><b class="uni">📌 נכון לכל שיא</b><ul>${li(W.universal)}</ul></div>
      ${h.yt?`<a class="btn acc big" style="margin-top:4px;display:block;text-align:center;text-decoration:none"
        href="${W.ytUrl(h.yt)}" target="_blank" rel="noopener">▶ סרטון הסבר — טכניקה נכונה</a>
      <div class="hint" style="margin-top:6px">הקישור פותח חיפוש יוטיוב לפי הענף, כדי שלא יישבר עם הזמן.</div>`:""}
    </div>`;
  }
  /* הדגשה פשוטה: **טקסט** -> מודגש */
  function mdBold(t){ return t.replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>"); }
  function openHowto(id){
    const sp=sportById(id);
    $("#rec-htTitle").innerHTML=sp.em+" "+esc(sp.name)+" — איך מבצעים ומצלמים";
    $("#rec-htBody").innerHTML=howtoHtml(sp,false);
    modal("rec-howtoModal");
  }

  /* ---------- עורך הענפים (מורה בלבד) ---------- */
  function renderSportEditor(){
    $("#rec-spList").innerHTML=SPORTS.map((sp,i)=>`
      <div class="rec-sprow">
        <span class="em">${sp.em||"🏅"}</span>
        <div class="grow"><b>${esc(sp.name)}</b>
          <div class="sb">${esc(sp.unit||"—")}${sp.lower?" · נמוך=טוב":""}${sp.timeSec?" · "+sp.timeSec+" שנ׳":""}${sp.vidMax?" · סרטון עד "+sp.vidMax+" שנ׳":""}</div></div>
        <span class="cnt">${CACHE.filter(r=>r.sport===sp.id).length} שיאים</span>
        <button class="btn sm" data-spup="${i}" title="הזז למעלה">↑</button>
        <button class="btn sm" data-sped="${sp.id}">✎</button>
        <button class="btn sm stop" data-spdel="${sp.id}">🗑</button>
      </div>`).join("")||'<div class="hint">אין ענפים. לחץ «ענף חדש» או «שחזר ברירת מחדל».</div>';
    $$("#rec-spList [data-sped]").forEach(b=>b.addEventListener("click",()=>editSport(b.dataset.sped)));
    $$("#rec-spList [data-spup]").forEach(b=>b.addEventListener("click",()=>{
      const i=+b.dataset.spup; if(i<1)return;
      [SPORTS[i-1],SPORTS[i]]=[SPORTS[i],SPORTS[i-1]];
      saveSports(); renderSportEditor(); renderGrid();
    }));
    $$("#rec-spList [data-spdel]").forEach(b=>b.addEventListener("click",async()=>{
      const id=b.dataset.spdel, sp=sportById(id);
      const n=CACHE.filter(r=>r.sport===id).length;
      if(!confirm(n?`בענף «${sp.name}» יש ${n} שיאים — הם יימחקו גם. להמשיך?`
                   :`למחוק את הענף «${sp.name}»?`))return;
      for(const r of CACHE.filter(r=>r.sport===id))await dbDel(r.id);
      SPORTS=SPORTS.filter(x=>x.id!==id); saveSports();
      await refresh(); renderSportEditor(); renderAdmin(); toast("הענף נמחק");
    }));
  }
  const linesToArr=v=>String(v||"").split("\n").map(x=>x.trim()).filter(Boolean);
  function editSport(id){
    const sp=id?sportById(id):null;
    $("#rec-spTitle").textContent=sp?"✎ עריכת ענף":"➕ ענף חדש";
    $("#rec-spId").value=sp?sp.id:"";
    $("#rec-spEm").value=sp?(sp.em||""):"🏅";
    $("#rec-spName").value=sp?sp.name:"";
    $("#rec-spUnit").value=sp?(sp.unit||""):"";
    $("#rec-spLower").checked=sp?!!sp.lower:false;
    $("#rec-spTime").value=sp&&sp.timeSec?sp.timeSec:"";
    $("#rec-spVid").value=sp&&sp.vidMax?sp.vidMax:90;
    $("#rec-spProto").value=sp?(sp.proto||""):"";
    $("#rec-spOk").value=sp?(sp.ok||[]).join("\n"):"";
    $("#rec-spNo").value=sp?(sp.no||[]).join("\n"):"";
    $("#rec-spFilm").value=sp?(sp.film||[]).join("\n"):"";
    $("#rec-spYt").value=sp?(sp.yt||""):"";
    $("#rec-spIsr").value=sp?(refOf(sp.id).israel||""):"";
    $("#rec-spWor").value=sp?(refOf(sp.id).world||""):"";
    modal("rec-sportEdit");
  }
  function saveSport(){
    const id=$("#rec-spId").value;
    const name=$("#rec-spName").value.trim(), unit=$("#rec-spUnit").value.trim();
    if(!name||!unit){toast("צריך שם ענף ויחידת מדידה");return;}
    const data={
      em:$("#rec-spEm").value.trim()||"🏅", name, unit,
      lower:$("#rec-spLower").checked,
      timeSec:+$("#rec-spTime").value||null,
      vidMax:Math.max(10,+$("#rec-spVid").value||90),
      proto:$("#rec-spProto").value.trim(),
      ok:linesToArr($("#rec-spOk").value),
      no:linesToArr($("#rec-spNo").value),
      film:linesToArr($("#rec-spFilm").value),
      yt:$("#rec-spYt").value.trim()
    };
    let sid=id;
    if(id){ Object.assign(sportById(id),data); }
    else{ sid="c"+Date.now().toString(36); SPORTS.push(Object.assign({id:sid},data)); }
    refs[sid]={israel:parseFloat($("#rec-spIsr").value)||0,world:parseFloat($("#rec-spWor").value)||0};
    saveSports(); renderGrid(); renderSportEditor(); renderAdmin();
    modal("rec-sportEdit",false); toast(id?"הענף עודכן ✓":"הענף נוסף ✓");
  }
  function resetSports(){
    if(prompt('לשחזר את רשימת הענפים לברירת המחדל?\nענפים שהוספת יימחקו (השיאים יישמרו).\nהקלד "שחזר" לאישור:')!=="שחזר")return;
    SPORTS=defaults(); refs=Object.assign({},DEF_REFS);
    saveSports(); reviveOrphans(); renderGrid(); renderSportEditor(); renderAdmin();
    toast("שוחזרה רשימת ברירת המחדל");
  }

  /* ---------- קישור ו-QR לתלמידים ----------
     שני מצבים:
     kiosk — עמדה על מכשיר המורה. השיא נשמר כאן ומחכה לאישור.
     guest — המכשיר של התלמיד. אין שרת משותף, ולכן השיא נארז לקובץ
             שהתלמיד שולח למורה, והמורה קולט אותו בלוח המורה. */
  function baseUrl(){ return location.href.split("#")[0].split("?")[0]; }
  function shareUrl(guest){
    /* מצרפים את קישור הטופס כדי שהכפתור יופיע גם במכשיר של התלמיד */
    const up=(guest&&SET.driveForm)?"&up="+encodeURIComponent(SET.driveForm):"";
    return baseUrl()+"?role=student"+(guest?"&guest=1":"")+up+"#rec";
  }
  function urlReachable(){
    return location.protocol!=="file:"&&
      !/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(location.hostname);
  }
  let shareGuest=false;
  function renderShare(){
    const url=shareUrl(shareGuest);
    $("#rec-shUrl").value=url;
    $$("#rec-shModes button").forEach(b=>b.classList.toggle("on",(b.dataset.sh==="guest")===shareGuest));
    $("#rec-shDesc").innerHTML=shareGuest
      ? ("התלמיד פותח את הקישור <b>במכשיר שלו</b> וממלא תוצאה. "+
         (SET.driveForm
          ? "הקישור נושא איתו גם את טופס ההעלאה, כך שהתלמיד יראה כפתור להעלאת הסרטון לתיקייה שלך."
          : "בסיום נוצר קובץ שיא שהוא שולח לך (וואטסאפ / מייל), ואתה קולט אותו בלוח המורה בכפתור «קלוט שיא מקובץ». אפשר גם להגדיר טופס העלאה ב⚙ הגדרות."))
      : "הקישור פותח את האפליקציה במצב תלמיד — לוח השיאים ודף המשחקים בלבד. מיועד ל<b>עמדה קבועה</b> או לטאבלט של בית הספר: השיא נשמר במכשיר הזה ומחכה לאישורך.";
    try{
      window.HMQR.draw($("#rec-shQr"),url,{size:250,fg:"#0c0e1a",bg:"#ffffff"});
      $("#rec-shQr").style.display="";
    }catch(e){ $("#rec-shQr").style.display="none"; }
    const warn=$("#rec-shWarn");
    if(!urlReachable()){
      warn.style.display="";
      warn.innerHTML=location.protocol==="file:"
        ? "⚠️ האפליקציה פתוחה כקובץ מקומי (<code>file://</code>), ולכן הקישור והברקוד <b>לא יעבדו משום מכשיר אחר</b>. כדי שהם יעבדו צריך להעלות את התיקייה לאירוח כלשהו — GitHub Pages, שרת בית הספר או כל אחסון סטטי — ולפתוח את האפליקציה משם."
        : "⚠️ הכתובת היא <code>localhost</code> ולכן היא מצביעה על המכשיר שסורק, לא עליך. הברקוד יעבוד רק אם תפתח את האפליקציה מכתובת שנגישה ברשת בית הספר או מהאינטרנט.";
    } else warn.style.display="none";
  }
  function openShare(){ renderShare(); modal("rec-shareModal"); }

  /* אריזת שיא לקובץ .hmrec: כותרת טקסט + JSON + בייטים של הסרטון */
  async function packRecord(rec){
    const meta={v:1,sport:rec.sport,name:rec.name,cls:rec.cls,value:rec.value,ts:rec.ts,
      school:SET.school||"",hasVideo:!!rec.video,
      videoType:rec.video?rec.video.type:"",videoName:rec.video?(rec.video.name||"video"):""};
    const head=new TextEncoder().encode("HMREC1\n"+JSON.stringify(meta)+"\n");
    const parts=[head]; if(rec.video)parts.push(rec.video);
    return new Blob(parts,{type:"application/octet-stream"});
  }
  async function unpackRecord(file){
    const buf=new Uint8Array(await file.arrayBuffer());
    let nl=0,seen=0,i=0;
    for(;i<buf.length&&seen<2;i++)if(buf[i]===10){seen++;nl=i;}
    const headTxt=new TextDecoder().decode(buf.slice(0,nl));
    const lines=headTxt.split("\n");
    if(lines[0]!=="HMREC1")throw new Error("קובץ לא מזוהה");
    const meta=JSON.parse(lines.slice(1).join("\n"));
    const rest=buf.slice(nl+1);
    const video=meta.hasVideo&&rest.length?new Blob([rest],{type:meta.videoType||"video/mp4"}):null;
    return {meta,video};
  }
  async function exportRecord(rec){
    const blob=await packRecord(rec);
    const sp=sportById(rec.sport);
    /* שם הקובץ חייב להיות ASCII: כרום מתעלם מ-download עם תווים בעברית
       ומוריד קובץ בשם "download" בלי סיומת — והמורה לא יוכל לבחור אותו. */
    const ascii=(rec.name||"").replace(/[^\w.-]+/g,"-").replace(/^-+|-+$/g,"");
    const stamp=new Date(rec.ts||Date.now()).toISOString().slice(0,10);
    const fname=`hmrec-${ascii||rec.sport}-${stamp}-${String(rec.id).slice(-4)}.hmrec`;
    const f=new File([blob],fname,{type:"application/octet-stream"});
    if(navigator.canShare&&navigator.canShare({files:[f]})){
      try{ await navigator.share({files:[f],title:"שיא חדש",text:`${rec.name} · ${sp.name} · ${showVal(sp,rec.value)}`}); return "shared"; }
      catch(e){ if(e&&e.name==="AbortError")return "cancelled"; }
    }
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob); a.download=fname;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    return "downloaded";
  }
  async function importRecordFile(file){
    try{
      const {meta,video}=await unpackRecord(file);
      if(!sportById(meta.sport)||!(meta.value>0))throw new Error("נתונים חסרים");
      const dup=CACHE.some(r=>r.name===meta.name&&r.sport===meta.sport&&r.value===meta.value&&Math.abs(r.ts-meta.ts)<1000);
      if(dup){ toast("השיא הזה כבר נקלט"); return; }
      await dbPut({id:"r"+Date.now()+Math.random().toString(36).slice(2,6),
        sport:meta.sport,name:meta.name,cls:meta.cls||"",value:meta.value,video,
        status:"pending",src:"file",ts:meta.ts||Date.now()});
      await refresh(); renderAdmin();
      toast("📥 נקלט — ממתין לאישורך"); beep(880,0.15);
    }catch(e){ toast("קובץ שיא לא תקין"); }
  }

  /* ---------- הרשאות ---------- */
  function applyRoleRec(){
    const stu=window.HM&&window.HM.isStudent&&window.HM.isStudent();
    const ab=$("#rec-adminBtn"); if(ab)ab.style.display=stu?"none":"";
    const kb=$("#rec-kioskBtn"); if(kb)kb.style.display=stu?"none":"";
    const hb=$("#rec-handBtn"); if(hb)hb.style.display=stu?"none":"";
    const rh=$("#rec-roleHint"); if(rh)rh.style.display=stu?"":"none";
    const gh=$("#rec-guestHint");
    if(gh)gh.style.display=(window.HM&&window.HM.isGuest&&window.HM.isGuest())?"":"none";
    const sb=$("#rec-shareBtn"); if(sb)sb.style.display=stu?"none":"";
    /* כפתורי הדרייב מופיעים רק אם המורה הגדיר קישורים בהגדרות */
    const up=$("#rec-driveUp");
    if(up){ up.style.display=(stu&&SET.driveForm)?"":"none"; up.onclick=()=>window.open(SET.driveForm,"_blank"); }
    const fo=$("#rec-driveFolder");
    if(fo){ fo.style.display=(!stu&&SET.driveFolder)?"":"none"; fo.onclick=()=>window.open(SET.driveFolder,"_blank"); }
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
    loadSports();               /* כעת כל הסקריפטים נטענו וברירות המחדל זמינות */
    await openDB(); await refresh();
    if(SET.syncUrl&&SET.syncCode){ const r=await syncPull(); if(r.ok&&r.changed){ renderGrid(); } }
    $("#rec-sdSubmit").addEventListener("click",openSubmit);
    $("#rec-subSport").addEventListener("change",updSubLb);
    $("#rec-subSend").addEventListener("click",sendSub);
    $("#rec-adminBtn").addEventListener("click",()=>{ $("#rec-admLock").style.display=""; $("#rec-admBody").style.display="none"; $("#rec-admPass").value=""; modal("rec-adminModal"); });
    $("#rec-admEnter").addEventListener("click",()=>{
      const v=$("#rec-admPass").value;
      if(!hasPass()){
        /* לא הוגדר קוד עדיין — הראשון שנכנס קובע אותו */
        if(v.length<4){toast("בחר קוד באורך 4 ספרות לפחות");return;}
        setPass(v); toast("🔑 קוד המורה נקבע");
      } else if(v!==pass){ toast("קוד שגוי"); return; }
      $("#rec-admLock").style.display="none"; $("#rec-admBody").style.display=""; renderAdmin();
      if(SET.syncUrl&&SET.syncCode)syncNow();
    });
    const syncBtn=$("#rec-syncNow"); if(syncBtn)syncBtn.addEventListener("click",syncNow);
    $("#rec-passChg").addEventListener("click",()=>{
      const p=prompt("קוד מורה חדש (4 ספרות לפחות):");
      if(p===null)return;
      if(p.trim().length<4){toast("הקוד קצר מדי — לפחות 4 ספרות");return;}
      setPass(p.trim()); toast("🔑 הקוד עודכן — הוא נשמר במכשיר הזה בלבד");
    });
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
    $("#rec-spNew").addEventListener("click",()=>editSport(null));
    $("#rec-spSave").addEventListener("click",saveSport);
    $("#rec-spReset").addEventListener("click",resetSports);
    /* שמות הענפים לרשימה הנפתחת בטופס גוגל — כדי שהטופס והאפליקציה
       לא יתפצלו אחרי שמוסיפים או משנים ענף */
    $("#rec-spCopy").addEventListener("click",async()=>{
      const txt=SPORTS.filter(sp=>!sp.legacy).map(sp=>sp.name).join("\n");
      try{ await navigator.clipboard.writeText(txt);
        toast("הועתקו "+SPORTS.length+" ענפים — הדבק ברשימה הנפתחת בטופס"); }
      catch(e){ prompt("העתק את הרשימה והדבק בטופס:",txt); }
    });
    /* קישור ו-QR לתלמידים */
    $("#rec-shareBtn").addEventListener("click",openShare);
    $$("#rec-shModes button").forEach(b=>b.addEventListener("click",()=>{
      shareGuest=b.dataset.sh==="guest"; renderShare();
    }));
    $("#rec-shCopy").addEventListener("click",async()=>{
      try{ await navigator.clipboard.writeText($("#rec-shUrl").value); toast("הקישור הועתק"); }
      catch(e){ $("#rec-shUrl").select(); toast("סמן והעתק ידנית"); }
    });
    $("#rec-shOpen").addEventListener("click",()=>window.open($("#rec-shUrl").value,"_blank"));
    $("#rec-fileImp").addEventListener("change",async e=>{
      for(const f of e.target.files)await importRecordFile(f);
      e.target.value="";
    });
    applyRoleRec();
  }
  return {init,countApproved,applyRole:applyRoleRec,hasPass,setPass,syncNow,
    _test:{SPORTS:()=>SPORTS,showVal:(id,v)=>showVal(sportById(id),v),pct:(id,v,w)=>pct(sportById(id),v,w)}};
})();


"use strict";
/* ============================================================
   מודול 4 — מאמן הכושר (FIT)
   טיימר אינטרוולים · מחולל תחנות · ספריית תרגילים · קוביית הכושר
   ============================================================ */
const FIT=(function(){
  /* ---------- exercise library ---------- */
  /* איורי התרגילים, לפי סדר עדיפות: סרטון הדגמה אמיתי (exercise-gifs/video —
     צולם/הופק במיוחד עבור האפליקציה) < תמונה אמיתית ברישיון פתוח נבחרת
     (exercise-gifs/photo) < GIF מונפש תלת-מימדי גנרי לכל תרגיל (exercise-gifs/rig).
     ראו exercise-gifs/CREDITS.md לפירוט המקור והרישיון של כל קובץ. */
  const VIDEO_EX={curl:1,latpull:1,pullup:1,dbpress:1};
  const PHOTO_EX={lunge:1,pike:1,burpee:1,jack:1,knees:1};
  const exGifSrc=e=>VIDEO_EX[e.id]?`exercise-gifs/video/${e.id}.gif`
    :PHOTO_EX[e.id]?`exercise-gifs/photo/${e.id}.gif`
    :`exercise-gifs/rig/${e.fig}.gif`;
  const gifImg=(e,px)=>`<img src="${exGifSrc(e)}" alt="${e.name}" loading="lazy" width="${px}" height="${px}" style="width:${px}px;height:${px}px;object-fit:contain;border-radius:10px">`;

  const EX=[
    /* --- כוח: משקל גוף --- */
    {id:"squat",name:"סקוואט",grp:"strength",mus:"רגליים · ישבן",fig:"squat",eq:"בלי ציוד",cues:["רגליים ברוחב כתפיים","גב ישר, חזה קדימה","ירידה עד 90° בברכיים","דחיפה דרך העקבים"],mis:["ברכיים קורסות פנימה","עקבים מתרוממים"],reps:{קל:8,בינוני:12,מתקדם:20},yt:"סקוואט טכניקה נכונה"},
    {id:"push",name:"שכיבות סמיכה",grp:"strength",mus:"חזה · ידיים · ליבה",fig:"push",eq:"בלי ציוד",cues:["גוף בקו ישר","ידיים ברוחב כתפיים","חזה כמעט נוגע ברצפה"],mis:["אגן שוקע","מרפקים פתוחים מדי"],reps:{קל:6,בינוני:12,מתקדם:20},yt:"שכיבות סמיכה טכניקה נכונה"},
    {id:"pushincline",name:"שכיבות סמיכה בשיפוע",grp:"strength",mus:"חזה · ידיים",fig:"push",eq:"בלי ציוד",cues:["ידיים על ספסל/קיר, גוף בקו ישר","ככל שהשיפוע גבוה יותר — קל יותר","להתקדם בהדרגה לרצפה"],mis:["אגן שוקע","טווח תנועה חלקי"],reps:{קל:8,בינוני:15,מתקדם:20},yt:"incline push up beginner"},
    {id:"lunge",name:"לאנג׳",grp:"strength",mus:"רגליים · שיווי משקל",fig:"lunge",eq:"בלי ציוד",cues:["צעד גדול קדימה","שתי הברכיים ב-90°","גו זקוף"],mis:["ברך קדמית עוברת את כף הרגל","צעד קצר מדי"],reps:{קל:6,בינוני:10,מתקדם:16},yt:"לאנג׳ טכניקה נכונה"},
    {id:"wall",name:"כיסא קיר",grp:"strength",mus:"רגליים",fig:"squat",eq:"בלי ציוד",cues:["גב צמוד לקיר","ירכיים מקבילות לרצפה","ידיים לצדדים"],mis:["ידיים על הברכיים","זווית גבוהה מדי"],reps:{קל:"20 שנ׳",בינוני:"40 שנ׳",מתקדם:"60 שנ׳"},yt:"wall sit exercise"},
    {id:"gluteb",name:"גשר ישבן",grp:"strength",mus:"ישבן · גב תחתון",fig:"deepsquat",eq:"בלי ציוד",cues:["שכיבה על הגב, ברכיים כפופות","דחיפה דרך העקבים","סחיטת ישבן למעלה בלי קשת יתר בגב"],mis:["קשת גב מוגזמת","דחיפה דרך כפות הרגליים ולא העקבים"],reps:{קל:10,בינוני:15,מתקדם:25},yt:"glute bridge exercise"},
    {id:"stepup",name:"עליות לספסל",grp:"strength",mus:"רגליים · שיווי משקל",fig:"stepup",eq:"ספסל",cues:["כל כף הרגל על הספסל","דחיפה מהרגל העולה, לא קפיצה מהרגל התחתונה","ירידה מבוקרת"],mis:["דחיפה מרגל הקרקע","ברך עולה קורסת פנימה"],reps:{קל:8,בינוני:12,מתקדם:16},yt:"box step up exercise"},
    {id:"dip",name:"דיפים על ספסל",grp:"strength",mus:"טרייספס · כתפיים",fig:"dip",eq:"ספסל",cues:["ידיים צמודות לגוף על קצה הספסל","ירידה עד 90° במרפק","מרפקים לא נפתחים לצדדים"],mis:["כתפיים עולות לאוזניים","ירידה עמוקה מדי"],reps:{קל:6,בינוני:10,מתקדם:15},yt:"bench dip triceps exercise"},
    {id:"pike",name:"שכיבות פייק",grp:"strength",mus:"כתפיים",fig:"pike",eq:"בלי ציוד",cues:["אגן גבוה, גוף ביצירת ״V״","ירידה עם הראש בין הידיים","דחיפה חזרה למעלה"],mis:["אגן יורד — הופך לשכיבת סמיכה רגילה","ידיים רחוקות מדי מהרגליים"],reps:{קל:5,בינוני:8,מתקדם:15},yt:"pike push up shoulders"},
    {id:"calf",name:"עליות עקבים",grp:"strength",mus:"שוקיים",fig:"calf",eq:"בלי ציוד",cues:["עלייה איטית עד קצות האצבעות","החזקה שנייה למעלה","ירידה מבוקרת בלי נפילה"],mis:["קפיצה במקום עלייה מבוקרת","טווח תנועה חלקי"],reps:{קל:12,בינוני:20,מתקדם:30},yt:"calf raise technique"},
    {id:"bearcrawl",name:"זחילת דוב",grp:"strength",mus:"כל הגוף · ליבה",fig:"bearcrawl",eq:"בלי ציוד",cues:["ברכיים צמודות לרצפה בלי לגעת","יד ורגל נגדיות זזות יחד","גב שטוח כל הזמן"],mis:["ישבן גבוה מדי","נשימה עצורה"],reps:{קל:"6 מ׳",בינוני:"10 מ׳",מתקדם:"15 מ׳"},yt:"bear crawl exercise"},
    {id:"singleleg",name:"דדליפט רגל אחת (משקל גוף)",grp:"strength",mus:"ישבן · שיווי משקל",fig:"hinge",eq:"בלי ציוד",cues:["רגל תומכת כפופה מעט","רגל אחורית וגו יורדים יחד כמו קרש","ידיים לאיזון קדימה"],mis:["סיבוב אגן","כיפוף גב תחתון במקום ירך"],reps:{קל:6,בינוני:10,מתקדם:14},yt:"single leg deadlift bodyweight"},
    {id:"inchworm",name:"תולעת (Inchworm)",grp:"mix",mus:"כל הגוף · ניידות",fig:"pike",eq:"בלי ציוד",cues:["כיפוף מהמותניים, ידיים לרצפה","הליכת ידיים קדימה לתנוחת פלאנק","הליכת רגליים לידיים ברגליים כמעט ישרות"],mis:["ברכיים כפופות מדי — מאבד את המתיחה","גב מתעגל בירידה"],reps:{קל:4,בינוני:8,מתקדם:12},yt:"inchworm exercise warm up"},

    /* --- אירובי --- */
    {id:"jack",name:"ג׳אמפינג ג׳ק",grp:"cardio",mus:"כל הגוף · אירובי",fig:"jack",eq:"בלי ציוד",cues:["קפיצה לפיסוק עם הרמת ידיים","נחיתה רכה על כריות הרגליים","קצב אחיד"],mis:["נחיתה קשה","ידיים לא מגיעות למעלה"],reps:{קל:15,בינוני:25,מתקדם:40},yt:"jumping jack technique"},
    {id:"climber",name:"מטפס הרים",grp:"cardio",mus:"ליבה · אירובי",fig:"climber",eq:"בלי ציוד",cues:["ידיים נעוצות מתחת לכתפיים","ברכיים רצות לחזה","גב ישר"],mis:["ישבן עולה","קצב לא אחיד"],reps:{קל:16,בינוני:30,מתקדם:50},yt:"mountain climber exercise"},
    {id:"knees",name:"ברכיים גבוהות",grp:"cardio",mus:"רגליים · אירובי",fig:"knees",eq:"בלי ציוד",cues:["ברך עד גובה האגן","עבודה על כריות הרגליים","ידיים מלוות בריצה"],mis:["רכינה אחורה","ברכיים נמוכות"],reps:{קל:20,בינוני:30,מתקדם:50},yt:"high knees exercise"},
    {id:"burpee",name:"ברפי",grp:"mix",mus:"כל הגוף",fig:"burpee",eq:"בלי ציוד",cues:["ירידה לסמיכה","קפיצת רגליים אחורה","חזרה וקפיצה למעלה"],mis:["דילוג על שלב","גב מתעגל"],reps:{קל:5,בינוני:10,מתקדם:15},yt:"burpee technique"},
    {id:"skip",name:"דילוג בחבל (מדומה)",grp:"cardio",mus:"שוקיים · תיאום",fig:"jack",eq:"בלי ציוד",cues:["קפיצות קטנות ומהירות","מרפקים צמודים, סיבוב שורש כף יד","נחיתה שקטה"],mis:["קפיצה גבוהה מדי","כתפיים מתוחות"],reps:{קל:30,בינוני:50,מתקדם:80},yt:"jump rope technique"},
    {id:"buttkick",name:"בעיטות לישבן",grp:"cardio",mus:"רגליים · אירובי",fig:"buttkick",eq:"בלי ציוד",cues:["עקב נוגע בישבן","גוף זקוף, קצב מהיר","ידיים רפויות לצדדים"],mis:["רכינה קדימה","קצב איטי מדי"],reps:{קל:20,בינוני:35,מתקדם:50},yt:"butt kicks exercise"},
    {id:"skater",name:"קפיצות סקייטר",grp:"cardio",mus:"רגליים · צד · שיווי משקל",fig:"skater",eq:"בלי ציוד",cues:["קפיצה לצד, נחיתה על רגל אחת","רגל אחורית חוצה מאחור לאיזון","ברך נוחתת רכה"],mis:["נחיתה על שתי רגליים","טווח קטן מדי"],reps:{קל:8,בינוני:14,מתקדם:22},yt:"skater jumps exercise"},

    /* --- ליבה --- */
    {id:"plank",name:"פלאנק",grp:"core",mus:"ליבה · כתפיים",fig:"plank",eq:"בלי ציוד",cues:["מרפקים מתחת לכתפיים","בטן אסופה, גוף קרש","מבט לרצפה"],mis:["אגן גבוה/נמוך מדי","עצירת נשימה"],reps:{קל:"20 שנ׳",בינוני:"40 שנ׳",מתקדם:"60 שנ׳"},yt:"plank technique"},
    {id:"splank",name:"פלאנק צד",grp:"core",mus:"ליבה · אלכסונים",fig:"splank",eq:"בלי ציוד",cues:["מרפק מתחת לכתף","גוף בקו ישר מהראש לרגליים","ישבן לא שוקע ולא בולט"],mis:["גוף מתכופף לאמצע","ישבן דוחף אחורה"],reps:{קל:"15 שנ׳",בינוני:"30 שנ׳",מתקדם:"45 שנ׳"},yt:"side plank technique"},
    {id:"situp",name:"כפיפות בטן",grp:"core",mus:"בטן",fig:"situp",eq:"בלי ציוד",cues:["ברכיים כפופות","ידיים מוצלבות על החזה","עלייה מבוקרת"],mis:["משיכה בצוואר","תנופה"],reps:{קל:10,בינוני:15,מתקדם:25},yt:"sit up correct technique"},
    {id:"bicycle",name:"כפיפות אופניים",grp:"core",mus:"בטן · אלכסונים",fig:"bicycle",eq:"בלי ציוד",cues:["מרפק פוגש ברך נגדית","גב תחתון צמוד לרצפה","תנועה איטית ומבוקרת"],mis:["מהירות גבוהה מדי על חשבון טווח","משיכה בצוואר"],reps:{קל:10,בינוני:16,מתקדם:24},yt:"bicycle crunch technique"},
    {id:"superman",name:"סופרמן",grp:"core",mus:"גב תחתון",fig:"superman",eq:"בלי ציוד",cues:["שכיבה על הבטן","הרמת ידיים ורגליים יחד","החזקה שנייה למעלה"],mis:["תנועה חדה","צוואר שבור למעלה"],reps:{קל:8,בינוני:12,מתקדם:20},yt:"superman exercise back"},
    {id:"deadbug",name:"Dead bug",grp:"core",mus:"ליבה · יציבות",fig:"deadbug",eq:"בלי ציוד",cues:["גב תחתון צמוד לרצפה לכל אורך התרגיל","יד ורגל נגדיות יורדות יחד לאט","נשימה רציפה"],mis:["גב תחתון מתרומם","תנועה מהירה מדי"],reps:{קל:6,בינוני:10,מתקדם:14},yt:"dead bug exercise core"},
    {id:"birddog",name:"Bird dog",grp:"core",mus:"ליבה · יציבות",fig:"birddog",eq:"בלי ציוד",cues:["יד ורגל נגדיות מתארכות יחד","גב ואגן נשארים יציבים, בלי סיבוב","החזקה שנייה בקצה התנועה"],mis:["סיבוב אגן","הרמה גבוהה מדי על חשבון יציבות"],reps:{קל:6,בינוני:10,מתקדם:14},yt:"bird dog exercise core"},
    {id:"rtwist",name:"סיבובי רוסי",grp:"core",mus:"בטן · אלכסונים",fig:"bicycle",eq:"בלי ציוד",cues:["ישיבה מוטה אחורה, גב ישר","סיבוב מהחזה, לא רק הידיים","נגיעה קלה ברצפה משני הצדדים"],mis:["גב מתעגל","תנועה מהירה וחסרת שליטה"],reps:{קל:10,בינוני:20,מתקדם:30},yt:"russian twist technique"},
    {id:"hollow",name:"Hollow hold",grp:"core",mus:"בטן · ליבה",fig:"situp",eq:"בלי ציוד",cues:["גב תחתון צמוד לרצפה","ידיים ורגליים מורמות ומתוחות","נשימה שקטה בהחזקה"],mis:["גב תחתון מתרומם","הרמה גבוהה מדי שמאבדת שליטה"],reps:{קל:"10 שנ׳",בינוני:"20 שנ׳",מתקדם:"35 שנ׳"},yt:"hollow body hold"},

    /* --- ניידות (Mobility) --- */
    {id:"catcow",name:"חתול־פרה",grp:"mobility",mus:"עמוד שדרה",fig:"catcow",eq:"בלי ציוד",cues:["תנועה איטית ורציפה עם הנשימה","שאיפה בקימור (פרה), נשיפה בעיגול (חתול)","תנועה מתחילה מהאגן"],mis:["תנועה מהירה מדי","תנועה רק בצוואר ולא בכל עמוד השדרה"],reps:{קל:6,בינוני:10,מתקדם:14},yt:"cat cow stretch mobility"},
    {id:"hip90",name:"90/90 ירך",grp:"mobility",mus:"ירכיים",fig:"hip90",eq:"בלי ציוד",cues:["שתי הרגליים ב-90° בישיבה","מעבר צד לצד בלי להישען על הידיים","גב זקוף לאורך התרגיל"],mis:["הישענות על הידיים כדי לפצות","תנועה מהירה מדי"],reps:{קל:6,בינוני:10,מתקדם:14},yt:"90 90 hip mobility drill"},
    {id:"worldgreat",name:"המתיחה הגדולה בעולם",grp:"mobility",mus:"כל הגוף",fig:"worldgreat",eq:"בלי ציוד",cues:["צעד לאנג׳ גדול קדימה","סיבוב פלג גוף עליון והושטת יד למעלה","מבט עוקב אחרי היד"],mis:["ברך קדמית עוברת את כף הרגל","סיבוב מהמותניים ולא מבית החזה"],reps:{קל:4,בינוני:6,מתקדם:8},yt:"world's greatest stretch"},
    {id:"thoracic",name:"סיבוב בית החזה",grp:"mobility",mus:"עמוד שדרה עליון",fig:"thoracic",eq:"בלי ציוד",cues:["עמידת ארבע, יד אחת מאחורי הראש","סיבוב מבית החזה בלבד — האגן לא זז","תנועה איטית ונשלטת"],mis:["סיבוב מהאגן במקום מבית החזה","תנועה מהירה מדי"],reps:{קל:6,בינוני:10,מתקדם:14},yt:"thoracic rotation mobility"},
    {id:"deepsquathold",name:"ישיבה עמוקה (Deep squat hold)",grp:"mobility",mus:"ירכיים · קרסוליים",fig:"deepsquat",eq:"בלי ציוד",cues:["עקבים נשארים על הרצפה","גב ארוך ככל האפשר, לא מתעגל לגמרי","מרפקים דוחפים ברכיים החוצה בעדינות"],mis:["עקבים מתרוממים","קריסת ברכיים פנימה"],reps:{קל:"15 שנ׳",בינוני:"30 שנ׳",מתקדם:"50 שנ׳"},yt:"deep squat hold mobility"},
    {id:"anklerock",name:"נדנוד קרסול",grp:"mobility",mus:"קרסוליים",fig:"anklerock",eq:"בלי ציוד",cues:["ברך נעה קדימה מעל כף הרגל","עקב נשאר צמוד לרצפה","תנועה איטית ומבוקרת"],mis:["עקב מתרומם מוקדם מדי","תנועה מהירה מדי"],reps:{קל:8,בינוני:12,מתקדם:16},yt:"ankle mobility rock exercise"},
    {id:"shouldercar",name:"עיגולי כתפיים (Shoulder CARs)",grp:"mobility",mus:"כתפיים",fig:"shouldercar",eq:"בלי ציוד",cues:["עיגול איטי ומלא של הכתף בכל טווח","ליבה יציבה, בלי להזיז את הגו","עצירה קלה בנקודת הקושי"],mis:["מהירות גבוהה מדי","פיצוי בתנועת הגו"],reps:{קל:5,בינוני:8,מתקדם:10},yt:"shoulder CARs mobility"},

    /* --- ציוד חדר כושר --- */
    {id:"gsquat",name:"סקוואט גביע (Goblet Squat)",grp:"strength",mus:"רגליים · ליבה",fig:"squat",eq:"משקולות יד",cues:["אוחזים במשקולת קרוב לחזה","מרפקים בתוך הברכיים בתחתית","גב ישר לכל אורך התנועה"],mis:["רכינה קדימה","עקבים מתרוממים"],reps:{קל:8,בינוני:12,מתקדם:18},yt:"goblet squat technique"},
    {id:"dbrow",name:"חתירה עם משקולת",grp:"strength",mus:"גב · ביצפס",fig:"row",eq:"משקולות יד",cues:["גב ישר ומוטה קדימה כ-45°","מרפק נשלף לאחור וקרוב לגוף","סחיטת השכמות בחלק העליון"],mis:["גב מתעגל","סיבוב הגו במקום נשיכת השכמה"],reps:{קל:8,בינוני:12,מתקדם:15},yt:"dumbbell row technique"},
    {id:"dbpress",name:"לחיצת כתפיים עם משקולות",grp:"strength",mus:"כתפיים · טרייספס",fig:"press",eq:"משקולות יד",cues:["ליבה מהודקת, בלי קשת יתר בגב","דחיפה ישר למעלה","ירידה מבוקרת עד גובה כתפיים"],mis:["קשת גב מוגזמת","נעילת מרפקים בעוצמה למעלה"],reps:{קל:8,בינוני:12,מתקדם:15},yt:"dumbbell shoulder press technique"},
    {id:"rdl",name:"דדליפט רומני עם משקולות",grp:"strength",mus:"ישבן · האמסטרינג",fig:"hinge",eq:"משקולות יד",cues:["ברכיים כפופות קלות, לא נעולות","המשקולות צמודות לרגליים בירידה","הירך נעה אחורה, לא הגב מתעגל"],mis:["גב תחתון מתעגל","ירידה עמוקה מדי על חשבון הטכניקה"],reps:{קל:8,בינוני:12,מתקדם:15},yt:"dumbbell romanian deadlift"},
    {id:"latpull",name:"משיכה עליונה (מוט/גומייה)",grp:"strength",mus:"גב · ביצפס",fig:"pulldown",eq:"גומיית התנגדות",cues:["משיכה מתחילה מהשכמות","מרפקים יורדים לכיוון הצלעות","גב זקוף, בלי להישען אחורה"],mis:["משיכה בעיקר בזרועות","נדנוד גוף לעזרה בתנועה"],reps:{קל:8,בינוני:12,מתקדם:15},yt:"band lat pulldown technique"},
    {id:"pullup",name:"מתח (עצמי / בעזרת גומייה)",grp:"strength",mus:"גב · ביצפס",fig:"pulldown",eq:"מוט מתח",cues:["אחיזה ברוחב כתפיים","משיכת החזה לכיוון המוט","ירידה מבוקרת עד יישור מלא"],mis:["נדנוד גוף (קיפינג לא מבוקר)","טווח תנועה חלקי"],reps:{קל:"3 (בעזרה)",בינוני:6,מתקדם:10},yt:"pull up technique beginner"},
    {id:"curl",name:"כפיפת מרפקים (Bicep Curl)",grp:"strength",mus:"ביצפס",fig:"curl",eq:"משקולות יד",cues:["מרפקים צמודים לגוף לכל אורך התנועה","עלייה ללא נדנוד גוף","ירידה מבוקרת ואיטית"],mis:["נדנוד גוף לעזרה","מרפקים נעים קדימה"],reps:{קל:8,בינוני:12,מתקדם:15},yt:"bicep curl technique"},
    {id:"tripush",name:"פשיטת מרפקים בגומייה",grp:"strength",mus:"טרייספס",fig:"tripush",eq:"גומיית התנגדות",cues:["מרפקים צמודים לצלעות ולא זזים","פשיטה מלאה למטה","חזרה מבוקרת בלי לשחרר מתח"],mis:["מרפקים נעים קדימה־אחורה","טווח תנועה חלקי"],reps:{קל:10,בינוני:15,מתקדם:20},yt:"triceps pushdown band"},
    {id:"kbswing",name:"נדנוד קטלבל (Kettlebell Swing)",grp:"mix",mus:"ישבן · גב · ליבה",fig:"kbswing",eq:"קטלבל",cues:["התנועה מהירך (hinge), לא סקוואט","דחיפת ירך נפיצה קדימה","ליבה מהודקת, גב ישר"],mis:["הרמה בכוח הזרועות","כיפוף גב תחתון"],reps:{קל:8,בינוני:15,מתקדם:20},yt:"kettlebell swing technique"},
    {id:"carry",name:"הליכת חקלאי (Farmer's Carry)",grp:"mix",mus:"ליבה · אחיזה · כתפיים",fig:"carry",eq:"משקולות יד",cues:["כתפיים אחורה ולמטה, גו זקוף","צעדים קטנים ויציבים","ליבה מהודקת לאורך כל ההליכה"],mis:["כתפיים מתגלגלות קדימה","צעדים גדולים מדי שמערערים יציבות"],reps:{קל:"15 מ׳",בינוני:"25 מ׳",מתקדם:"40 מ׳"},yt:"farmers carry exercise"},
    {id:"bench",name:"לחיצת חזה (משקולות/ספסל)",grp:"strength",mus:"חזה · טרייספס",fig:"bench",eq:"ספסל",cues:["שכמות צמודות לספסל","דחיפה ישר מעל החזה","ירידה מבוקרת עד גובה החזה"],mis:["ניתור המשקולות מהחזה","מרפקים נפתחים ל-90° מהגוף"],reps:{קל:8,בינוני:12,מתקדם:15},yt:"dumbbell bench press technique"}
  ];
  const GRPS={strength:"כוח",cardio:"אירובי",core:"ליבה",mobility:"ניידות",mix:"משולב"};


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
    const bodyweight=EX.filter(e=>e.eq==="בלי ציוד");
    let pool=bodyweight.filter(e=>focus==="mix"||e.grp===focus||e.grp==="mix");
    if(pool.length<n)pool=bodyweight.slice();
    const pick=[...pool].sort(()=>Math.random()-0.5).slice(0,n);
    CIR.list=pick; $("#fit-cPlanCard").style.display="";
    cRenderList(-1);
    toast("הוגרלו "+n+" תחנות 🎰");
  }
  function cRenderList(now){
    $("#fit-cList").innerHTML=CIR.list.map((e,i)=>`
      <div class="fit-station ${i===now?"now":""}"><div class="ix">${i+1}</div>
        <div class="grow"><b>${e.name}</b><div class="sb">${e.mus} · ${GRPS[e.grp]}</div></div>
        <div style="width:46px;height:46px">${gifImg(e,46)}</div></div>`).join("");
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
  function openEx(id){
    const e=EX.find(x=>x.id===id); if(!e)return;
    $("#fit-exTitle").textContent=e.name;
    $("#fit-exFig").innerHTML=`<div style="width:130px;margin:0 auto">${gifImg(e,130)}</div>`;
    $("#fit-exBody").innerHTML=`
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:10px">
        <span class="pill acc">${GRPS[e.grp]}</span><span class="pill">${e.mus}</span>
        <span class="pill">🎒 ${e.eq}</span></div>
      <h2 style="font-size:14px"><span class="dot"></span> ביצוע נכון</h2>
      <ul class="hint" style="font-size:13.5px;line-height:1.8;margin:4px 0 12px">${e.cues.map(c=>"<li>"+c+"</li>").join("")}</ul>
      <h2 style="font-size:14px"><span class="dot"></span> טעויות נפוצות</h2>
      <ul class="hint" style="font-size:13.5px;line-height:1.8;margin:4px 0 12px">${e.mis.map(c=>"<li>"+c+"</li>").join("")}</ul>
      <h2 style="font-size:14px"><span class="dot"></span> מינון מומלץ</h2>
      <div class="row">${Object.entries(e.reps).map(([k,v])=>`<span class="pill">${k}: <b style="color:var(--acc)">&nbsp;${v}</b></span>`).join("")}</div>
      ${e.yt&&window.GAMES?`<a class="btn sm acc" style="margin-top:11px;display:block;text-align:center;text-decoration:none"
         href="${window.GAMES.ytUrl(e.yt)}" target="_blank" rel="noopener">▶ צפייה בהדגמה ביוטיוב</a>`:""}`;
    modal("fit-exModal");
  }
  function renderLib(){
    $("#fit-exGrid").innerHTML=EX.map(e=>`<div class="fit-ex" data-id="${e.id}">${gifImg(e,74)}<b>${e.name}</b><span>${GRPS[e.grp]} · ${e.mus}</span></div>`).join("");
    $$("#fit-exGrid .fit-ex").forEach(t=>t.addEventListener("click",()=>openEx(t.dataset.id)));
  }

  /* ---------- תוכנית חדר כושר ---------- */
  const GYMPROG={
    AB:{label:"מתחילים · AB (2 ימים בשבוע)",
      note:"מטרה: ללמוד טכניקה נכונה בכל תרגיל. משקל קליל מאוד בהתחלה — מעלים משקל רק אחרי ששלושת הסטים יצאו נקיים ובלי כאב, לאורך שתי אימונים ברציפות. מנוחה 60–75 שנ׳ בין סטים.",
      days:{
        A:{title:"גוף מלא A",ex:[
          {id:"gsquat",sets:"3×12"},{id:"pushincline",sets:"3×10"},{id:"dbrow",sets:"3×12"},
          {id:"gluteb",sets:"3×15"},{id:"plank",sets:"3×20–30 שנ׳"}]},
        B:{title:"גוף מלא B",ex:[
          {id:"lunge",sets:"3×10 לרגל"},{id:"dbpress",sets:"3×10"},{id:"latpull",sets:"3×12"},
          {id:"rdl",sets:"3×10"},{id:"deadbug",sets:"3×10"}]}
      }},
    ABC:{label:"בינוניים · ABC (3 ימים — Push / Pull / Legs)",
      note:"3 סטים עבודה בכל תרגיל, אחרי חימום קליל לתרגיל הראשון של היום. מנוחה 60–90 שנ׳ בתרגילים מורכבים, 45 שנ׳ בתרגילי בידוד.",
      days:{
        A:{title:"Push — דחיפה",ex:[
          {id:"bench",sets:"3×10"},{id:"dbpress",sets:"3×10"},{id:"dip",sets:"3×10"},
          {id:"tripush",sets:"3×15"},{id:"pike",sets:"3×8"}]},
        B:{title:"Pull — משיכה",ex:[
          {id:"dbrow",sets:"4×10"},{id:"latpull",sets:"3×12"},{id:"curl",sets:"3×12"},
          {id:"superman",sets:"3×15"},{id:"birddog",sets:"3×10 לצד"}]},
        C:{title:"Legs — רגליים",ex:[
          {id:"gsquat",sets:"4×10"},{id:"rdl",sets:"3×10"},{id:"lunge",sets:"3×10 לרגל"},
          {id:"calf",sets:"4×15"},{id:"hollow",sets:"3×30 שנ׳"}]}
      }},
    ABCD:{label:"מתקדמים · ABCD (4 ימים — Upper/Lower ×2)",
      note:"בתרגילי הכוח המרכזיים (ימים A/B) לעבוד קרוב לכשל טכני בטווח 6–8 חזרות; בתרגילי העזר (ימים C/D) טווח חזרות גבוה יותר. מנוחה 90–120 שנ׳ בתרגילים המורכבים.",
      days:{
        A:{title:"Upper — כוח עליון",ex:[
          {id:"bench",sets:"4×6–8"},{id:"dbrow",sets:"4×8"},{id:"dbpress",sets:"3×8"},
          {id:"pullup",sets:"3×עד כשל טכני"},{id:"tripush",sets:"3×12"}]},
        B:{title:"Lower — כוח תחתון",ex:[
          {id:"gsquat",sets:"4×6–8"},{id:"rdl",sets:"4×8"},{id:"lunge",sets:"3×10 לרגל"},
          {id:"calf",sets:"4×15"},{id:"hollow",sets:"3×30–40 שנ׳"}]},
        C:{title:"Upper — עזר",ex:[
          {id:"dip",sets:"3×12"},{id:"latpull",sets:"4×12"},{id:"curl",sets:"4×12"},
          {id:"pike",sets:"3×10"},{id:"splank",sets:"3×30 שנ׳ לצד"}]},
        D:{title:"Lower + קונדישן",ex:[
          {id:"kbswing",sets:"4×15"},{id:"stepup",sets:"3×12"},{id:"singleleg",sets:"3×8 לרגל"},
          {id:"carry",sets:"3×30 מ׳"},{id:"deadbug",sets:"3×10"}]}
      }}
  };
  function renderGymDay(track,d){
    const day=track.days[d];
    $("#gym-dayTitle").innerHTML=`<span class="dot"></span> ${day.title}`;
    $("#gym-list").innerHTML=day.ex.map(item=>{
      const e=EX.find(x=>x.id===item.id);
      return `<div class="fit-station" data-id="${item.id}" style="cursor:pointer">
        <div style="width:42px;height:42px;flex:none">${e?gifImg(e,42):""}</div>
        <div class="grow"><b>${e?e.name:item.id}</b><div class="sb">${e?e.mus+" · 🎒 "+e.eq:""}</div></div>
        <div class="pill acc" style="flex:none">${item.sets}</div></div>`;
    }).join("");
    $$("#gym-list [data-id]").forEach(el=>el.addEventListener("click",()=>openEx(el.dataset.id)));
  }
  function renderGym(){
    const track=GYMPROG[$("#gym-track").value];
    $("#gym-note").textContent=track.note;
    const days=Object.keys(track.days);
    $("#gym-daySeg").innerHTML=days.map((d,i)=>`<button data-gd="${d}" class="${i===0?"on":""}">יום ${d}</button>`).join("");
    $$("#gym-daySeg [data-gd]").forEach(b=>b.addEventListener("click",()=>{
      $$("#gym-daySeg [data-gd]").forEach(x=>x.classList.remove("on")); b.classList.add("on");
      renderGymDay(track,b.dataset.gd);
    }));
    renderGymDay(track,days[0]);
  }
  function roll(){
    ac();
    const d1=$("#fit-die1"),d2=$("#fit-die2");
    d1.classList.remove("roll");d2.classList.remove("roll");void d1.offsetWidth;
    d1.classList.add("roll");d2.classList.add("roll");beep(700,0.1);setTimeout(()=>beep(900,0.1),200);
    setTimeout(()=>{
      const pool=EX.filter(x=>x.eq==="בלי ציוד");
      const e=pool[Math.floor(Math.random()*pool.length)];
      const isTime=typeof e.reps.בינוני==="string";
      const amounts=isTime?["15 שנ׳","20 שנ׳","30 שנ׳","40 שנ׳","45 שנ׳","60 שנ׳"]:[5,8,10,12,15,20];
      const amt=amounts[Math.floor(Math.random()*6)];
      d1.innerHTML=`<div><div class="top" style="font-size:15px;line-height:1.2">${e.name}</div><div class="bot">${GRPS[e.grp]}</div></div>`;
      d2.innerHTML=`<div><div class="top">${amt}</div><div class="bot">${isTime?"זמן":"חזרות"}</div></div>`;
      $("#fit-diceResult").innerHTML=`🎯 ${e.name} × <b style="color:var(--acc)">${amt}</b>`;
      say(e.name+", "+amt); horn();
    },680);
  }

  /* ---------- init ---------- */
  function init(){
    $$(".pf-tabs [data-ft]").forEach(b=>b.addEventListener("click",()=>{
      $$(".pf-tabs [data-ft]").forEach(x=>x.classList.remove("on")); b.classList.add("on");
      ["timer","circuit","lib","dice","gym"].forEach(t=>$("#fit-sub-"+t).style.display=t===b.dataset.ft?"":"none");
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
    $("#gym-track").addEventListener("change",renderGym);
    renderLib();
    renderGym();
  }
  return {init,_test:{buildPhases,EX}};
})();


/* ===== bridge for new modules ===== */
window.REC=REC; window.BT=BT; window.PF=PF; window.FIT=FIT;
window.HM={$,$$,LS,SET,ac,beep,horn,tripleBeep,say,keepAwake,toast,confetti,dlCSV,esc,modal,go,fmtMS,fmtMSc,
  setRole,isStudent,isGuest,role:()=>ROLE};
window.HMBoot=function(){ wireModals(); wireNav(); wireSettings(); applySchool(); applyRole();
  go(location.hash.slice(1)||"home"); homeStats(); };
