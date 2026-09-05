"use strict";
/* ============================================================
   תוכנית שנתית — המנוע והממשק.
   הכול רץ בדפדפן, בלי שרת. מה שנשמר — נשמר במכשיר בלבד
   (localStorage): הערות, סימוני "בוצע", ושינויים שערכת בלוח
   הצלצולים או בלוח החופשות.
   ============================================================ */

/* ---------- כלי עזר ---------- */
const $  = (s,r)=> (r||document).querySelector(s);
const $$ = (s,r)=> Array.from((r||document).querySelectorAll(s));
const LTR = s => '<bdi dir="ltr">'+s+'</bdi>';   /* טווחי תאריכים ושעות — כדי שלא יתהפכו בעברית */
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const D = {
  parse(s){ const [y,m,d]=s.split("-").map(Number); return new Date(Date.UTC(y,m-1,d)); },
  str(dt){ return dt.toISOString().slice(0,10); },
  add(s,n){ const d=D.parse(s); d.setUTCDate(d.getUTCDate()+n); return D.str(d); },
  dow(s){ return D.parse(s).getUTCDay(); },
  between(a,b){ return Math.round((D.parse(b)-D.parse(a))/86400000); },
  he(s){ const d=D.parse(s); return d.getUTCDate()+"."+(d.getUTCMonth()+1); },
  heFull(s){ const d=D.parse(s); return d.getUTCDate()+"."+(d.getUTCMonth()+1)+"."+String(d.getUTCFullYear()).slice(2); },
  month(s){ return ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"][D.parse(s).getUTCMonth()]; },
  today(){ const n=new Date(); return n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0"); }
};

/* ---------- אחסון מקומי ---------- */
const KEY="ap_state_v1";
let ST = {notes:{}, done:{}, bells:null, vacations:null, hidden:{}, seen:0};
function load(){ try{ const r=localStorage.getItem(KEY); if(r) ST=Object.assign(ST,JSON.parse(r)); }catch(e){} }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(ST)); }catch(e){} }
const bells = ()=> ST.bells || window.AP_BELLS;
const vacations = ()=> ST.vacations || window.AP_VACATIONS;

/* ---------- לוח השנה ---------- */
function isVacation(date){
  for(const v of vacations()) if(date>=v.from && date<=v.to) return v;
  return null;
}
function windowFor(testId,grade){
  const ov=(window.AP_TEST_WINDOW_OVERRIDES||[]).find(o=>o.id===testId&&o.grades.includes(grade));
  return ov||window.AP_TEST_WINDOWS.find(x=>x.id===testId);
}
function specialOn(date){ return window.AP_SPECIAL.find(s=>s.date===date)||null; }
/* יום זיכרון = יום לימודים, אבל בלי שיעור חנ"ג פעיל */
function isBlockedForPE(date){ const s=specialOn(date); return !!(s && s.kind==="memorial"); }

function schoolDays(){
  const Y=window.AP_YEAR, out=[];
  for(let d=Y.start; d<=Y.end; d=D.add(d,1)){
    const dow=D.dow(d);
    if(!Y.schoolDays.includes(dow)) continue;
    if(isVacation(d)) continue;
    out.push({date:d,dow});
  }
  return out;
}
function groupEnd(gid){
  const g=window.AP_GROUPS[gid];
  const ef=(window.AP_YEAR.earlyFinish||[]).find(e=>e.grades.includes(g.grade));
  return ef?ef.date:window.AP_YEAR.end;
}

/* ---------- חלוקת השיעורים ליחידות ----------
   שני כללים:
   1. יחידות מדידה **מעוגנות** לחלון המדידה שלהן בלוח השנה —
      הן לא נסחפות לפי חישוב יחסי, כי מדידה שנעשית בזמן הלא
      נכון לא ניתנת להשוואה.
   2. שאר היחידות ממלאות את המקטעים שבין העוגנים לפי המשקל
      שלהן, עם תקרת מתיחה — כדי שיחידה של 3 שיעורים לא
      תימרח על 8 מפגשים.
   ------------------------------------------------------- */

/* שיטת השארית הגדולה — הסכום יוצא בדיוק מספר המפגשים */
function largestRemainder(shares,total){
  const sum=shares.reduce((a,b)=>a+b,0);
  if(!sum||total<=0) return shares.map(()=>0);
  const raw=shares.map(x=>x/sum*total);
  const base=raw.map(Math.floor);
  let left=total-base.reduce((a,b)=>a+b,0);
  const order=raw.map((r,i)=>({i,f:r-Math.floor(r)})).sort((a,b)=>b.f-a.f);
  for(let k=0;k<left;k++) base[order[k%order.length].i]++;
  return base;
}

const STRETCH=1.6; /* יחידה לא תימתח מעבר ל-160% ממספר השיעורים שנכתבו לה */

function distribute(units,total){
  if(!units.length) return [];
  if(total<=0) return units.map(()=>0);
  let c=largestRemainder(units.map(u=>u.share),total);
  /* לפחות שיעור אחד ליחידה, כשיש מספיק מקום */
  if(total>=units.length){
    for(let i=0;i<c.length;i++) if(c[i]===0){
      let j=c.indexOf(Math.max(...c)); c[j]--; c[i]++;
    }
  }
  /* תקרת מתיחה — עודף עובר ליחידה הבאה שיש לה מקום */
  const cap=units.map(u=>Math.max(1,Math.ceil(u.lessons.length*STRETCH)));
  for(let i=0;i<c.length;i++){
    while(c[i]>cap[i]){
      let j=-1;
      for(let k=i+1;k<c.length;k++) if(c[k]<cap[k]){ j=k; break; }
      if(j<0) for(let k=i-1;k>=0;k--) if(c[k]<cap[k]){ j=k; break; }
      if(j<0) break;               /* כולן מלאות — משאירים את העודף */
      c[i]--; c[j]++;
    }
  }
  return c;
}

let SCHED=null;
function build(){
  const byGroup={}, byDate={};
  const days=schoolDays();

  for(const gid in window.AP_GROUPS){
    const g=window.AP_GROUPS[gid];
    const track=window.AP_CURRICULUM[g.track];
    const end=groupEnd(gid);
    const slots=[];
    for(const d of days){
      if(d.date>end) continue;
      const row=window.AP_TIMETABLE[d.dow]||{};
      for(const h in row){
        if(row[h]!==gid) continue;
        slots.push({date:d.date,hour:+h,gid});
      }
    }
    slots.sort((a,b)=> a.date<b.date?-1:a.date>b.date?1:a.hour-b.hour);

    /* ימי זיכרון — נשארים בלוח אבל לא מקבלים תוכן */
    const teach=slots.filter(s=>!isBlockedForPE(s.date));
    const units=track.units;
    const plan=units.map(()=>({start:0,count:0}));

    /* --- שלב 1: עיגון יחידות המדידה --- */
    let prevEnd=0, prevIdx=-1;
    units.forEach((u,ui)=>{
      if(!u.test) return;
      const w=windowFor(u.test,g.grade); if(!w) return;
      const seg=units.slice(prevIdx+1,ui);
      let s=teach.findIndex(x=>x.date>=w.from);
      if(s<0) s=teach.length;
      s=Math.max(s, prevEnd+seg.length);            /* מקום לפחות לשיעור אחד לכל יחידה שלפני */
      /* לא מקדימים את העוגן לפני החלון — עדיף יחידה קצרה יותר
         מאשר מדידה שנחתכת באמצע על ידי חופשה. */
      s=Math.min(s, Math.max(prevEnd, teach.length-1));
      let k=Math.min(u.lessons.length, teach.length-s);
      if(k<0) k=0;
      const cnt=distribute(seg, s-prevEnd);
      let c=prevEnd;
      seg.forEach((su,i)=>{ const idx=prevIdx+1+i; plan[idx]={start:c,count:cnt[i]}; c+=cnt[i]; });
      plan[ui]={start:s,count:k};
      prevEnd=s+k; prevIdx=ui;
    });

    /* --- שלב 2: היחידות שאחרי העוגן האחרון --- */
    const tail=units.slice(prevIdx+1);
    const tc=distribute(tail, teach.length-prevEnd);
    let cur=prevEnd;
    tail.forEach((su,i)=>{ const idx=prevIdx+1+i; plan[idx]={start:cur,count:tc[i]}; cur+=tc[i]; });

    /* --- שלב 3: בניית השיעורים בפועל --- */
    let out=[];
    units.forEach((u,ui)=>{
      const {start,count}=plan[ui];
      for(let i=0;i<count;i++){
        const s=teach[start+i]; if(!s) break;
        const li=Math.min(u.lessons.length-1, Math.floor(i*u.lessons.length/count));
        const prev = i>0 ? Math.floor((i-1)*u.lessons.length/count) : -1;
        out.push(Object.assign({},s,{track:g.track,unit:u,lesson:u.lessons[li],
          cont:(li===prev),idx:i+1,of:count}));
      }
    });
    for(const s of slots) if(isBlockedForPE(s.date))
      out.push(Object.assign({},s,{track:g.track,unit:null,lesson:null,blocked:specialOn(s.date)}));
    out.sort((a,b)=> a.date<b.date?-1:a.date>b.date?1:a.hour-b.hour);
    out.forEach(o=>{ o.id=o.gid+"|"+o.date+"|"+o.hour; });
    byGroup[gid]=out;
    out.forEach(o=>{ (byDate[o.date]=byDate[o.date]||[]).push(o); });
  }
  for(const d in byDate) byDate[d].sort((a,b)=>a.hour-b.hour);
  SCHED={byGroup,byDate,days};
  return SCHED;
}

/* טווח תאריכים של כל יחידה — לגאנט */
function unitSpans(gid){
  const list=SCHED.byGroup[gid].filter(x=>x.unit);
  const map=new Map();
  for(const x of list){
    const k=x.unit.id;
    if(!map.has(k)) map.set(k,{unit:x.unit,from:x.date,to:x.date,n:0});
    const s=map.get(k); if(x.date<s.from)s.from=x.date; if(x.date>s.to)s.to=x.date; s.n++;
  }
  return Array.from(map.values());
}

/* ---------- ניווט ---------- */
const VIEWS=["today","gantt","sched","fitness","challenges","learn","timetable","settings"];
function go(v){
  let unit=null;
  if(v.startsWith("unit/")){ unit=v.slice(5); v="unit"; }
  /* «#gantt/2026-10» — עמוד של חודש בודד; «#gantt» — המבט השנתי */
  if(v.startsWith("gantt/")){ GF.m=v.slice(6); v="gantt"; }
  else if(v==="gantt") GF.m="all";
  if(!VIEWS.includes(v)&&v!=="unit") v="today";
  $$(".view").forEach(x=>x.classList.toggle("on",x.id==="v-"+v));
  $$(".nav button").forEach(b=>b.classList.toggle("on",b.dataset.go===v));
  ({today:renderToday,gantt:renderGantt,sched:renderSched,fitness:renderFitness,
    challenges:renderChallenges,learn:()=>window.LEARN.render(),
    timetable:renderTimetable,settings:renderSettings,
    unit:()=>renderUnit(unit)}[v])();
  window.scrollTo(0,0);
}
window.addEventListener("hashchange",()=>go(location.hash.slice(1)||"today"));

/* ---------- מסך «היום» ---------- */
function nowMin(){ const n=new Date(); return n.getHours()*60+n.getMinutes(); }
function toMin(hhmm){ const [h,m]=hhmm.split(":").map(Number); return h*60+m; }
function bellFor(h){ return bells().find(b=>b.h===h)||{h,s:"--:--",e:"--:--"}; }

function lessonCard(x,opts){
  opts=opts||{};
  const g=window.AP_GROUPS[x.gid], b=bellFor(x.hour);
  const done=ST.done[x.id];
  if(x.blocked) return `<div class="lcard blocked">
    <div class="lhead"><span class="hour">שעה ${x.hour}</span><span class="time">${LTR(b.s+"–"+b.e)}</span>
      <span class="gname" style="--c:${g.color}">${esc(g.label)}</span></div>
    <div class="lbody"><b>${esc(x.blocked.name)}</b><div class="d">${esc(x.blocked.pe||"אין שיעור פעיל ביום זה.")}</div></div></div>`;
  const note=ST.notes[x.id]||"";
  return `<div class="lcard${done?" done":""}${opts.now?" now":""}" data-id="${x.id}">
    <div class="lhead">
      <span class="hour">שעה ${x.hour}</span><span class="time">${LTR(b.s+"–"+b.e)}</span>
      <span class="gname" style="--c:${g.color}">${esc(g.label)}</span>
      ${opts.date?`<span class="dt">${LTR(D.heFull(x.date))}</span>`:""}
      ${opts.now?`<span class="livebadge">עכשיו</span>`:""}
    </div>
    <div class="lbody">
      <div class="uline"><span class="em">${x.unit.em}</span><span class="uname">${esc(x.unit.name)}</span>
        <span class="pos">שיעור ${x.idx} מתוך ${x.of}</span></div>
      <b class="ltitle">${esc(x.lesson.t)}${x.cont?' <span class="cont">המשך</span>':""}</b>
      <div class="d">${esc(x.lesson.d)}</div>
      ${note?`<div class="mynote">📝 ${esc(note)}</div>`:""}
      <div class="lacts">
        <a class="btn sm" href="#unit/${x.track}/${x.unit.id}">📋 מערך השיעור</a>
        <button class="btn sm ghost" data-act="note" data-id="${x.id}">📝 הערה</button>
        <button class="btn sm ghost" data-act="done" data-id="${x.id}">${done?"✓ בוצע":"סמן בוצע"}</button>
        <button class="btn sm ghost" data-act="gcal" data-id="${x.id}">📅 ליומן</button>
      </div>
    </div></div>`;
}

function renderToday(){
  const t=D.today();
  const vac=isVacation(t), sp=specialOn(t);
  const list=(SCHED.byDate[t]||[]);
  const m=nowMin();
  let cur=null,next=null;
  for(const x of list){ const b=bellFor(x.hour);
    if(m>=toMin(b.s)&&m<=toMin(b.e)) cur=x;
    if(!next && m<toMin(b.s)) next=x;
  }
  const Y=window.AP_YEAR;
  const before = t<Y.start, after = t>Y.end;
  let head=`<div class="hero">
    <div class="hdate">${window.AP_DAYNAMES[D.dow(t)]} · ${LTR(D.heFull(t))}</div>
    <h1>התוכנית של היום</h1>
    <div class="hsub">שנת ${Y.label} · ${Y.gLabel}</div></div>`;

  let body="";
  if(before) body=`<div class="empty">שנת הלימודים מתחילה ב-${LTR(D.heFull(Y.start))}. עד אז אפשר לעבור על הגאנט השנתי ועל מערכי היחידות.</div>`;
  else if(after) body=`<div class="empty">שנת הלימודים הסתיימה ב-${LTR(D.heFull(Y.end))}.</div>`;
  else if(vac) body=`<div class="empty vac"><b>${esc(vac.name)}</b><div>${LTR(D.heFull(vac.from)+" – "+D.heFull(vac.to))} · חוזרים ללימודים ב-${LTR(D.heFull(vac.back))}</div><div class="hint">${esc(vac.note||"")}</div></div>`;
  else if(!list.length) body=`<div class="empty">אין שיעורי הוראה במערכת ביום זה.</div>`;
  else {
    if(sp) body+=`<div class="banner ${sp.kind}"><b>${esc(sp.name)}</b>${sp.pe?`<div>${esc(sp.pe)}</div>`:""}</div>`;
    if(cur) body+=`<h2 class="sec">עכשיו</h2>`+lessonCard(cur,{now:true});
    if(next) body+=`<h2 class="sec">הבא בתור</h2>`+lessonCard(next);
    body+=`<h2 class="sec">כל היום</h2>`+list.map(x=>lessonCard(x)).join("");
  }

  /* השבוע הקרוב */
  let week="";
  for(let i=1;i<=7;i++){
    const d=D.add(t,i); const l=SCHED.byDate[d]; if(!l||!l.length) continue;
    week+=`<div class="wday"><div class="wd">${window.AP_DAYSHORT[D.dow(d)]} ${LTR(D.he(d))}</div>
      <div class="wl">${l.map(x=>`<span class="chip" style="--c:${window.AP_GROUPS[x.gid].color}">${x.hour}· ${esc(window.AP_GROUPS[x.gid].label)}${x.lesson?" — "+esc(x.lesson.t):""}</span>`).join("")}</div></div>`;
  }
  if(week) body+=`<h2 class="sec">השבוע הקרוב</h2><div class="weekbox">${week}</div>`;

  /* חלון מדידה פעיל */
  const tw=window.AP_TEST_WINDOWS.find(w=>t>=w.from&&t<=w.to);
  if(tw) body=`<div class="banner test" style="--c:${tw.color}"><b>🎯 חלון מדידה פעיל: ${esc(tw.name)}</b>
    <div>${LTR(D.heFull(tw.from)+" – "+D.heFull(tw.to))} · ${esc(tw.why)}</div>
    <a class="btn sm" href="#fitness">לדף אות הכושר</a></div>`+body;

  $("#v-today").innerHTML=head+body;
}

/* ---------- גאנט שנתי ---------- */
/* GF.m = "all" למבט השנתי, או "2026-10" לעמוד של חודש בודד */
let GF={m:"all"};

/* חודשי שנת הלימודים לפי הסדר: "2026-09" ... "2027-06" */
function yearMonths(){
  const Y=window.AP_YEAR, out=[], last=Y.end.slice(0,7);
  let y=+Y.start.slice(0,4), n=+Y.start.slice(5,7);
  for(;;){
    const m=y+"-"+String(n).padStart(2,"0");
    out.push(m);
    if(m>=last) break;
    if(++n>12){ n=1; y++; }
  }
  return out;
}
/* גבולות החודש, חתוכים לשנת הלימודים */
function monthBounds(m){
  const Y=window.AP_YEAR;
  let [y,n]=m.split("-").map(Number);
  const first=m+"-01";
  if(++n>12){ n=1; y++; }
  const nextFirst=y+"-"+String(n).padStart(2,"0")+"-01";
  return {from:(first<Y.start?Y.start:first), to:(D.add(nextFirst,-1)>Y.end?Y.end:D.add(nextFirst,-1))};
}
const monthLabel = m => D.month(m+"-01")+" "+m.slice(0,4);

/* שורת הכפתורים — «שנה מלאה» וכל חודש בנפרד */
function ganttChips(){
  const cur=GF.m;
  let c=`<a class="gchip${cur==="all"?" on":""}" href="#gantt">כל השנה</a>`;
  for(const m of yearMonths())
    c+=`<a class="gchip${cur===m?" on":""}" href="#gantt/${m}">${esc(D.month(m+"-01"))}</a>`;
  return `<div class="gchips">${c}</div>`;
}

function renderGantt(){
  const months=yearMonths();
  if(GF.m!=="all" && months.includes(GF.m)) renderGanttMonth(GF.m);
  else { GF.m="all"; renderGanttYear(); }
}

/* ===== המבט השנתי — עמוד ראשון, תמונה אחת של כל השנה ===== */
function renderGanttYear(){
  const Y=window.AP_YEAR;
  const first=D.add(Y.start,-D.dow(Y.start));           /* ראשון של שבוע הפתיחה */
  const weeks=Math.ceil((D.between(first,Y.end)+1)/7);
  const W=26;
  const wk = d => Math.floor(D.between(first,d)/7);

  /* כותרת חודשים — כל תא הוא קישור לעמוד של אותו חודש */
  let head="",last="";
  for(let i=0;i<weeks;i++){
    const d=D.add(first,i*7), mn=D.month(d), m=d.slice(0,7);
    head+=`<a class="gm${mn!==last?" nm":""}" href="#gantt/${m}" title="${esc(monthLabel(m))}"
      style="width:${W}px">${mn!==last?esc(mn.slice(0,3)):""}</a>`;
    last=mn;
  }

  /* רקע: חופשות + חלונות מדידה */
  let bg="";
  for(const v of vacations()){
    const a=wk(v.from), b=wk(v.to);
    if(b<0||a>weeks) continue;
    bg+=`<div class="gvac" style="right:${Math.max(0,a)*W}px;width:${(Math.min(weeks-1,b)-Math.max(0,a)+1)*W}px" title="${esc(v.name)}"></div>`;
  }
  let tws="";
  for(const w of window.AP_TEST_WINDOWS){
    const a=wk(w.from), b=wk(w.to);
    tws+=`<div class="gtest" style="right:${a*W}px;width:${(b-a+1)*W}px;--c:${w.color}" title="${esc(w.name)} · ${esc(w.why)}"></div>`;
  }

  const order=Object.keys(window.AP_GROUPS);
  let rows="";
  for(const gid of order){
    const g=window.AP_GROUPS[gid];
    const spans=unitSpans(gid);
    let bars="";
    for(const s of spans){
      const a=wk(s.from), b=wk(s.to);
      const left=a*W, w=Math.max(W,(b-a+1)*W);
      const tw=s.unit.test?windowFor(s.unit.test,g.grade):null;
      const drift = tw && (s.from<D.add(tw.from,-7)||s.to>D.add(tw.to,7));
      bars+=`<a class="gbar${drift?" drift":""}" href="#unit/${g.track}/${s.unit.id}"
        style="right:${left}px;width:${w}px;--c:${s.unit.color}"
        title="${esc(s.unit.name)} · ${s.n} שיעורים · ${D.he(s.from)}–${D.he(s.to)}${drift?" · ⚠ חורג מחלון המדידה":""}">
        <span>${s.unit.em} ${esc(s.unit.name)}</span></a>`;
    }
    rows+=`<div class="grow"><div class="glab" style="--c:${g.color}">${esc(g.label)}
      <small>${{pe:'חנ"ג',health:"בריאות",hevra:"חברה"}[g.subject]} · ${SCHED.byGroup[gid].length} שיעורים</small></div>
      <div class="gtrack" style="width:${weeks*W}px">${bg}${tws}${bars}</div></div>`;
  }

  $("#v-gantt").innerHTML=`
   <div class="hero"><h1>גאנט שנתי</h1>
     <div class="hsub">${window.AP_YEAR.label} · כל קבוצה, כל יחידת הוראה, על ציר השנה. לחיצה על פס פותחת את מערך היחידה.</div></div>
   ${ganttChips()}
   <div class="glegend">
     <span class="lg"><i class="sw vac"></i>חופשה</span>
     <span class="lg"><i class="sw test"></i>חלון מדידה</span>
     <span class="lg"><i class="sw drift"></i>יחידת מדידה שחורגת מהחלון</span>
   </div>
   <div class="gwrap"><div class="gscroll">
     <div class="ghead"><div class="glab"></div><div class="gtrack" style="width:${weeks*W}px">${head}</div></div>
     ${rows}
   </div></div>
   <div class="hint">רוחב עמודה = שבוע. לחיצה על שם חודש בכותרת פותחת את החודש הזה בעמוד משלו, בגדול.</div>
   <div class="gacts"><button class="btn sm ghost" id="gPrintAll">🖨️ הדפסה — כל חודש בעמוד נפרד</button></div>`;
  $("#gPrintAll").onclick=()=>printGanttMonths();
}

/* ===== עמוד של חודש בודד ===== */
/* היחידות שרצות בחודש, חתוכות לגבולותיו, עם סימון אם הן נמשכות מעבר */
function monthSpans(gid,from,to){
  const out=[];
  for(const s of unitSpans(gid)){
    if(s.to<from||s.from>to) continue;
    const a=(s.from<from?from:s.from), b=(s.to>to?to:s.to);
    const n=(SCHED.byGroup[gid]||[]).filter(x=>x.unit&&x.unit.id===s.unit.id&&x.date>=a&&x.date<=b).length;
    out.push({unit:s.unit,from:a,to:b,n,cutS:s.from<from,cutE:s.to>to,fullFrom:s.from,fullTo:s.to});
  }
  return out;
}

function renderGanttMonth(m){
  const Y=window.AP_YEAR, B=monthBounds(m);
  const N=D.between(B.from,B.to)+1;                       /* ימי לוח בחודש (חתוך לשנה) */
  const pos = d => (D.between(B.from,d)/N)*100;           /* מיקום באחוזים — מתאים לכל רוחב מסך */
  const span = (a,b) => ((D.between(a,b)+1)/N)*100;
  const months=yearMonths(), i=months.indexOf(m);

  /* רקע: סופי שבוע, קווי שבוע, חופשות וחלונות מדידה */
  let bg="";
  for(let d=B.from; d<=B.to; d=D.add(d,1)){
    if(D.dow(d)===5) bg+=`<div class="mwe" style="right:${pos(d)}%;width:${span(d,D.add(d,1)>B.to?B.to:D.add(d,1))}%"></div>`;
    if(D.dow(d)===0 && d!==B.from) bg+=`<div class="mgl" style="right:${pos(d)}%"></div>`;
  }
  for(const v of vacations()){
    if(v.to<B.from||v.from>B.to) continue;
    const a=(v.from<B.from?B.from:v.from), b=(v.to>B.to?B.to:v.to);
    bg+=`<div class="gvac" style="right:${pos(a)}%;width:${span(a,b)}%" title="${esc(v.name)}"></div>`;
  }
  let tws="";
  for(const w of window.AP_TEST_WINDOWS){
    if(w.to<B.from||w.from>B.to) continue;
    const a=(w.from<B.from?B.from:w.from), b=(w.to>B.to?B.to:w.to);
    tws+=`<div class="gtest" style="right:${pos(a)}%;width:${span(a,b)}%;--c:${w.color}" title="${esc(w.name)}"></div>`;
  }

  /* סרגל תאריכים — תווית לכל יום ראשון. תווית ליום הראשון בחודש רק
     אם היא לא נדחסת אל התווית הבאה. */
  let ticks="", firstSun=B.from;
  while(D.dow(firstSun)!==0 && firstSun<=B.to) firstSun=D.add(firstSun,1);
  for(let d=B.from; d<=B.to; d=D.add(d,1)){
    if(d!==B.from && D.dow(d)!==0) continue;
    if(d===B.from && D.dow(d)!==0 && D.between(B.from,firstSun)<3) continue;
    ticks+=`<div class="mtick" style="right:${pos(d)}%">${esc(D.he(d))}</div>`;
  }

  const order=Object.keys(window.AP_GROUPS);
  let rows="", total=0;
  for(const gid of order){
    const g=window.AP_GROUPS[gid];
    const list=(SCHED.byGroup[gid]||[]).filter(x=>x.date>=B.from&&x.date<=B.to);
    total+=list.length;
    const spans=monthSpans(gid,B.from,B.to);
    let bars="";
    for(const s of spans){
      const tw=s.unit.test?windowFor(s.unit.test,g.grade):null;
      const drift = tw && (s.fullFrom<D.add(tw.from,-7)||s.fullTo>D.add(tw.to,7));
      bars+=`<a class="gbar${drift?" drift":""}${s.cutS?" cutS":""}${s.cutE?" cutE":""}"
        href="#unit/${g.track}/${s.unit.id}"
        style="right:${pos(s.from)}%;width:${span(s.from,s.to)}%;--c:${s.unit.color}"
        title="${esc(s.unit.name)} · ${s.n} שיעורים החודש · ${D.he(s.from)}–${D.he(s.to)}${s.cutS||s.cutE?" · היחידה נמשכת מעבר לחודש":""}">
        <span>${s.unit.em} ${esc(s.unit.name)}</span></a>`;
    }
    if(!bars) bars=`<div class="gnone">אין שיעורים בחודש זה</div>`;
    rows+=`<div class="grow${list.length?"":" off"}"><div class="glab" style="--c:${g.color}">${esc(g.label)}
      <small>${{pe:'חנ"ג',health:"בריאות",hevra:"חברה"}[g.subject]} · ${list.length} שיעורים החודש</small></div>
      <div class="mtrack">${bg}${tws}${bars}</div></div>`;
  }

  /* ימי לימוד בפועל בחודש */
  const sdays=schoolDays().filter(d=>d.date>=B.from&&d.date<=B.to).length;

  $("#v-gantt").innerHTML=`
   <div class="hero"><h1>${esc(monthLabel(m))}</h1>
     <div class="hsub">${sdays} ימי לימוד · ${total} שיעורים · ${LTR(D.he(B.from)+"–"+D.he(B.to))}</div></div>
   ${ganttChips()}
   <div class="mnav">
     ${i>0?`<a class="btn sm ghost" href="#gantt/${months[i-1]}">‹ ${esc(D.month(months[i-1]+"-01"))}</a>`:`<span></span>`}
     <a class="btn sm ghost" href="#gantt">כל השנה</a>
     ${i<months.length-1?`<a class="btn sm ghost" href="#gantt/${months[i+1]}">${esc(D.month(months[i+1]+"-01"))} ›</a>`:`<span></span>`}
   </div>
   <div class="gwrap month">
     <div class="ghead"><div class="glab"></div><div class="mtrack head">${ticks}</div></div>
     ${rows}
   </div>
   ${monthNotes(B)}
   ${monthList(B)}
   <div class="gacts">
     <a class="btn sm ghost" href="#sched">🗓️ לשיעורים עצמם</a>
     <button class="btn sm ghost" id="gPrintAll">🖨️ הדפסה — כל חודש בעמוד נפרד</button>
   </div>`;
  $("#gPrintAll").onclick=()=>printGanttMonths();
}

/* רשימת היחידות של החודש בטקסט מלא — במסך צר הפסים נחתכים,
   וכאן רואים את השם המלא של כל יחידה בלי לרחף עם העכבר. */
function monthList(B){
  let rows="";
  for(const gid of Object.keys(window.AP_GROUPS)){
    const g=window.AP_GROUPS[gid];
    const spans=monthSpans(gid,B.from,B.to);
    if(!spans.length) continue;
    const items=spans.map(s=>`<a class="mu" href="#unit/${g.track}/${s.unit.id}" style="--c:${s.unit.color}">
      ${s.unit.em} ${esc(s.unit.name)}
      <small>${LTR(D.he(s.from)+"–"+D.he(s.to))} · ${s.n} שיעורים${s.cutS||s.cutE?" · נמשכת":""}</small></a>`).join("");
    rows+=`<div class="murow"><b style="--c:${g.color}">${esc(g.label)}</b><div class="mus">${items}</div></div>`;
  }
  if(!rows) return "";
  return `<div class="card mulist"><h2>יחידות החודש, לפי קבוצה</h2>${rows}</div>`;
}

/* «מה קורה החודש» — חופשות, ימים מיוחדים וחלונות מדידה */
function monthNotes(B){
  const vs=vacations().filter(v=>!(v.to<B.from||v.from>B.to));
  const sp=window.AP_SPECIAL.filter(s=>s.date>=B.from&&s.date<=B.to);
  const tw=window.AP_TEST_WINDOWS.filter(w=>!(w.to<B.from||w.from>B.to));
  if(!vs.length&&!sp.length&&!tw.length) return "";
  let out=`<div class="card mnotes"><h2>מה קורה החודש</h2>`;
  for(const w of tw)
    out+=`<div class="row"><b style="color:${w.color}">📏 ${esc(w.name)}</b>
      <span>${LTR(D.he(w.from)+"–"+D.he(w.to))} · ${esc(w.why)}</span></div>`;
  for(const v of vs)
    out+=`<div class="row"><b>🏖️ ${esc(v.name)}</b>
      <span>${LTR(D.he(v.from)+"–"+D.he(v.to))}${v.back?" · חוזרים ב-"+LTR(D.he(v.back)):""}</span></div>`;
  for(const s of sp)
    out+=`<div class="row"><b>📌 ${esc(s.name)}</b>
      <span>${LTR(D.he(s.date))} · ${esc(s.pe||"")}</span></div>`;
  return out+`</div>`;
}

/* ===== הדפסה: כל חודש בעמוד נפרד ===== */
function printGanttMonths(){
  let html="";
  for(const m of yearMonths()){
    const B=monthBounds(m);
    const sdays=schoolDays().filter(d=>d.date>=B.from&&d.date<=B.to).length;
    let body="",total=0;
    for(const gid of Object.keys(window.AP_GROUPS)){
      const g=window.AP_GROUPS[gid];
      const list=(SCHED.byGroup[gid]||[]).filter(x=>x.date>=B.from&&x.date<=B.to);
      total+=list.length;
      if(!list.length) continue;
      const spans=monthSpans(gid,B.from,B.to);
      /* הכול בשורה אחת לכל יחידה — כדי שחודש שלם ייכנס לעמוד A4 יחיד */
      const cells=spans.map(s=>`<span class="pgu">${s.unit.em} ${esc(s.unit.name)}
        <small>${LTR(D.he(s.from)+"–"+D.he(s.to))} · ${s.n} ש׳${s.cutS||s.cutE?" · נמשכת":""}</small></span>`).join("");
      body+=`<tr><th>${esc(g.label)}<small>${list.length} שיעורים</small></th><td>${cells||"—"}</td></tr>`;
    }
    const vs=vacations().filter(v=>!(v.to<B.from||v.from>B.to))
      .map(v=>esc(v.name)+" "+LTR(D.he(v.from)+"–"+D.he(v.to))).join(" · ");
    const tw=window.AP_TEST_WINDOWS.filter(w=>!(w.to<B.from||w.from>B.to))
      .map(w=>esc(w.name)+" "+LTR(D.he(w.from)+"–"+D.he(w.to))).join(" · ");
    html+=`<section class="pgm">
      <h1>${esc(monthLabel(m))}</h1>
      <div class="pgs">${sdays} ימי לימוד · ${total} שיעורים · ${LTR(D.he(B.from)+"–"+D.he(B.to))}</div>
      ${tw?`<div class="pgn"><b>חלון מדידה:</b> ${tw}</div>`:""}
      ${vs?`<div class="pgn"><b>חופשות:</b> ${vs}</div>`:""}
      <table class="pgt">${body||`<tr><td>אין שיעורים בחודש זה</td></tr>`}</table>
    </section>`;
  }
  const p=window.AP_PRINT;
  if(p) p(`<div class="sheet gantt">${html}</div>`);
  else { toast("ההדפסה אינה זמינה"); }
}

/* ---------- לוח שיעורים ---------- */
let SF={g:"all",from:null};
function renderSched(){
  const Y=window.AP_YEAR;
  const gopts=Object.keys(window.AP_GROUPS).map(k=>`<option value="${k}"${SF.g===k?" selected":""}>${esc(window.AP_GROUPS[k].label)}</option>`).join("");
  const from=SF.from|| (D.today()>Y.start&&D.today()<Y.end ? D.today() : Y.start);

  let out="",count=0,curMonth="";
  const dates=Object.keys(SCHED.byDate).sort();
  for(const d of dates){
    if(d<from) continue;
    let list=SCHED.byDate[d];
    if(SF.g!=="all") list=list.filter(x=>x.gid===SF.g);
    if(!list.length) continue;
    if(count>220) break;
    const mn=D.month(d)+" "+D.parse(d).getUTCFullYear();
    if(mn!==curMonth){ out+=`<h2 class="mhead">${esc(mn)}</h2>`; curMonth=mn; }
    const sp=specialOn(d);
    out+=`<div class="dayblk"><div class="dhead">${window.AP_DAYNAMES[D.dow(d)]} · ${LTR(D.heFull(d))}
      ${sp?`<span class="spchip ${sp.kind}">${esc(sp.name)}</span>`:""}</div>
      ${list.map(x=>lessonCard(x)).join("")}</div>`;
    count+=list.length;
  }
  /* חופשות בין לבין */
  $("#v-sched").innerHTML=`
   <div class="hero"><h1>לוח השיעורים</h1><div class="hsub">כל שיעור, בכל תאריך, עם מה מלמדים בו.</div></div>
   <div class="toolbar">
     <label>קבוצה <select id="fg"><option value="all">כל הקבוצות</option>${gopts}</select></label>
     <label>מתאריך <input type="date" id="ff" value="${from}" min="${Y.start}" max="${Y.end}"></label>
     <button class="btn sm ghost" id="btnIcsFiltered">📅 ייצוא לקובץ יומן</button>
     <button class="btn sm ghost" onclick="window.print()">🖨️ הדפסה</button>
   </div>
   ${out||'<div class="empty">אין שיעורים בטווח שנבחר.</div>'}
   ${count>220?'<div class="hint">מוצגים 220 השיעורים הראשונים מהתאריך שנבחר. לסינון — בחר קבוצה או תאריך מאוחר יותר.</div>':""}`;
  $("#fg").onchange=e=>{SF.g=e.target.value;renderSched();};
  $("#ff").onchange=e=>{SF.from=e.target.value;renderSched();};
  $("#btnIcsFiltered").onclick=()=>downloadIcs(SF.g==="all"?null:SF.g);
}

/* ---------- מערך יחידה ---------- */
function renderUnit(path){
  const [trackId,unitId]=(path||"").split("/");
  const track=window.AP_CURRICULUM[trackId];
  const u=track&&track.units.find(x=>x.id===unitId);
  if(!u){ $("#v-unit").innerHTML='<div class="empty">היחידה לא נמצאה.</div>'; return; }
  const gids=Object.keys(window.AP_GROUPS).filter(k=>window.AP_GROUPS[k].track===trackId);
  const p=u.plan||{};

  let sched="";
  for(const gid of gids){
    const list=SCHED.byGroup[gid].filter(x=>x.unit&&x.unit.id===u.id);
    if(!list.length) continue;
    sched+=`<div class="ublk"><b style="color:${window.AP_GROUPS[gid].color}">${esc(window.AP_GROUPS[gid].label)}</b>
      <span class="hint">${list.length} שיעורים · ${LTR(D.heFull(list[0].date)+" – "+D.heFull(list[list.length-1].date))}</span>
      <div class="udates">${list.map(x=>`<span class="chip">${LTR(D.he(x.date))} · ש${x.hour} — ${esc(x.lesson.t)}${x.cont?" (המשך)":""}</span>`).join("")}</div></div>`;
  }

  const isPE = !!p.warm;
  $("#v-unit").innerHTML=`
   <div class="hero unit" style="--c:${u.color}">
     <a class="back" href="#gantt">← חזרה לגאנט</a>
     <h1>${u.em} ${esc(u.name)}</h1>
     <div class="hsub">${esc(track.name)} · ${u.lessons.length} שיעורי תוכן</div>
   </div>
   ${u.test?`<div class="banner test">יחידת מדידה — משויכת לחלון «${esc((window.AP_TEST_WINDOWS.find(w=>w.id===u.test)||{}).name||"")}»</div>`:""}
   <section class="card"><h2>מטרות היחידה</h2><ul>${u.goals.map(g=>`<li>${esc(g)}</li>`).join("")}</ul></section>

   <section class="card"><h2>שלד מערך השיעור</h2>
     ${p.eq?`<div class="row"><b>ציוד</b><span>${p.eq.map(esc).join(" · ")}</span></div>`:""}
     ${isPE?`
       <div class="row"><b>חימום</b><span>${esc(p.warm)}</span></div>
       <div class="row"><b>פעילות מרכזית</b><span>${esc(p.core)}</span></div>
       <div class="row"><b>סיום והרגעה</b><span>${esc(p.cool)}</span></div>`:`
       <div class="row"><b>פתיחה</b><span>${esc(p.open||"")}</span></div>
       <div class="row"><b>גוף השיעור</b><span>${esc(p.core||"")}</span></div>
       <div class="row"><b>סיכום</b><span>${esc(p.close||"")}</span></div>`}
     ${p.assess?`<div class="row"><b>מה מעריכים</b><span><ul>${p.assess.map(a=>`<li>${esc(a)}</li>`).join("")}</ul></span></div>`:""}
     ${p.diff?`<div class="row"><b>התאמות</b><span>מתקשה: ${esc(p.diff.low)}<br>מתקדם: ${esc(p.diff.high)}</span></div>`:""}
     ${p.safe?`<div class="row danger"><b>בטיחות</b><span>${esc(p.safe)}</span></div>`:""}
     ${p.tips?`<div class="row"><b>טיפ מהשטח</b><span>${esc(p.tips)}</span></div>`:""}
     ${p.note?`<div class="row"><b>הערה</b><span>${esc(p.note)}</span></div>`:""}
   </section>

   <section class="card"><h2>שיעור־שיעור</h2>
     <ol class="llist">${u.lessons.map(l=>`<li><b>${esc(l.t)}</b><div>${esc(l.d)}</div></li>`).join("")}</ol>
   </section>

   ${u.links&&u.links.length?`<section class="card"><h2>קישורים למערכים וחומרים</h2>
     <div class="links">${u.links.map(l=>`<a class="btn sm" href="${esc(l.url)}" ${/^http/.test(l.url)?'target="_blank" rel="noopener"':""}>${esc(l.label)}</a>`).join("")}</div></section>`:""}

   ${sched?`<section class="card"><h2>מתי זה קורה בפועל</h2>${sched}</section>`:""}
   <div class="hint">אפשר להדפיס את הדף הזה כמערך מוכן: <button class="btn sm ghost" onclick="window.print()">🖨️ הדפסה</button></div>`;
}

/* ---------- אות הכושר ---------- */
function renderFitness(){
  const F=window.AP_FITNESS;
  const grades=["ז","ח","ט","יא","יב"];
  let bat="";
  for(const g of grades){
    const b=F.battery[g], age=F.gradeAge[g];
    bat+=`<div class="card"><h3>שכבה ${g}׳ <small>(גיל ייחוס ${age})</small></h3>
      <div class="hint">מבדקי ליבה לאות (5) מסומנים ב-★. שאר המבדקים למעקב ולמשוב.</div>
      <table class="tbl"><thead><tr><th>מבדק</th><th>מרכיב כושר</th><th>מצוין</th><th>טוב</th><th>בסיס</th></tr></thead><tbody>
      ${b.tests.map(tid=>{
        const t=F.tests.find(x=>x.id===tid), n=(F.norms[tid]||{})[age];
        const fmt=v=>{ if(v==null)return "—";
          if(tid.startsWith("aerobic")) return Math.floor(v/60)+":"+String(v%60).padStart(2,"0");
          return v; };
        return `<tr${b.core.includes(tid)?' class="core"':""}><td>${b.core.includes(tid)?"★ ":""}${t.em} ${esc(t.name)}</td>
          <td>${esc(t.cap)}</td><td>${n?LTR(fmt(n[0])):"—"}</td><td>${n?LTR(fmt(n[1])):"—"}</td><td>${n?LTR(fmt(n[2])):"—"}</td></tr>`;
      }).join("")}
      </tbody></table></div>`;
  }

  const prot=F.tests.map(t=>`<details class="prot"><summary>${t.em} ${esc(t.name)} <small>${esc(t.cap)}</small></summary>
    <div class="row"><b>איך מודדים</b><span>${esc(t.how)}</span></div>
    <div class="row"><b>מה נחשב תקין</b><span>${esc(t.valid)}</span></div>
    <div class="row"><b>מה פוסל</b><span>${esc(t.bad)}</span></div>
    <div class="row"><b>טיפ מהשטח</b><span>${esc(t.tip)}</span></div>
    <div class="row"><b>חלופה</b><span>${esc(t.alt)}</span></div>
    ${t.link?`<a class="btn sm" href="${t.link}">פתיחת הכלי במגרש PRO</a>`:""}
  </details>`).join("");

  const lv=F.scoring.levels.map(l=>`<div class="lvl" style="--c:${l.color}"><span class="em">${l.em}</span>
    <b>${esc(l.name)}</b><span class="min">${l.min}+ נק׳</span><div class="why">${esc(l.why)}</div></div>`).join("");

  $("#v-fitness").innerHTML=`
   <div class="hero"><h1>🏅 אות הכושר הגופני</h1>
     <div class="hsub">מערך המבדקים, הפרוטוקולים, טבלאות הנורמה והניקוד — לכל שכבה.</div></div>
   <div class="banner warn"><b>לפני שמפרסמים לתלמידים</b><div>${esc(F.disclaimer)}</div></div>

   <section class="card"><h2>מתי מודדים</h2>
     <div class="twins">${window.AP_TEST_WINDOWS.map(w=>`<div class="twin" style="--c:${w.color}">
       <b>${esc(w.name)}</b><span>${LTR(D.heFull(w.from)+" – "+D.heFull(w.to))}</span><div class="why">${esc(w.why)}</div></div>`).join("")}</div>
     <div class="hint">שלוש מדידות באותו פרוטוקול בדיוק — אחרת ההשוואה לא תקפה. אותו חימום, אותו סדר תחנות, אותו מסלול.</div>
   </section>

   <h2 class="sec">מערך המבדקים והנורמות</h2>${bat}

   <section class="card"><h2>איך מחשבים את האות</h2>
     <p>כל אחד מ-5 מבדקי הליבה מזכה בניקוד: <b>מצוין = 20</b> · <b>טוב = 15</b> · <b>בסיס = 10</b> · <b>מתחת לבסיס = 5</b> · <b>לא בוצע = 0</b>. סך הכול 100 נקודות.</p>
     <div class="lvls">${lv}</div>
     <div class="pers"><span class="em">${F.scoring.persistence.em}</span>
       <b>${esc(F.scoring.persistence.name)}</b>
       <div>${esc(F.scoring.persistence.rule)}</div>
       <div class="why">${esc(F.scoring.persistence.why)}</div></div>
   </section>

   <section class="card"><h2>פרוטוקולים מלאים — מה תקין ומה פוסל</h2>${prot}</section>

   <section class="card"><h2>מסלול תקשורת</h2>
     <p>בכיתות ז-9 / ז-10 תקשורת המדידה היא <b>אישית בלבד</b>: אותו מבדק חוזר שלוש פעמים בשנה, והתוצאה מושווית רק לתוצאה הקודמת של אותו תלמיד. אין טבלת נורמה, אין דירוג כיתתי, ואין פרסום תוצאות. האות היחיד שמחולק שם הוא <b>אות ההתמדה</b>.</p>
   </section>

   <div class="hint">מעקב התוצאות עצמן, גרפים בין־מבחניים ואיתור מי מתחת לנורמה — קיימים כבר במודול «התלמידים שלי» של המגרש PRO:
     <a class="btn sm" href="../index.html#stu">פתיחת מעקב התלמידים</a></div>`;
}

/* ---------- אתגרים ---------- */
function renderChallenges(){
  $("#v-challenges").innerHTML=`
   <div class="hero"><h1>🎯 אתגרים</h1>
     <div class="hsub">תוכן נוסף לשיעורים, להפסקות ולאירועי שכבה — כל אתגר עם פרוטוקול, רמות ולמה הוא עובד.</div></div>
   ${window.AP_CHALLENGES.map(c=>`<section class="card chal">
     <h2>${c.em} ${esc(c.name)} <span class="tag">${esc(c.type)}</span><span class="tag when">${esc(c.when)}</span></h2>
     <div class="row"><b>מה זה</b><span>${esc(c.what)}</span></div>
     <div class="row"><b>איך מפעילים</b><span>${esc(c.how)}</span></div>
     <div class="row"><b>כללים</b><span>${esc(c.rules)}</span></div>
     ${c.levels&&c.levels!=="—"?`<div class="row"><b>רמות</b><span>${esc(c.levels)}</span></div>`:""}
     <div class="row why"><b>למה זה עובד</b><span>${esc(c.why)}</span></div>
     ${c.link?`<a class="btn sm" href="${esc(c.link)}">פתיחת הכלי</a>`:""}
   </section>`).join("")}`;
}

/* ---------- מערכת שעות ---------- */
function renderTimetable(){
  const maxH=Math.max(...Object.values(window.AP_TIMETABLE).map(r=>Math.max(...Object.keys(r).map(Number))));
  let rows="";
  for(let h=1;h<=maxH;h++){
    const b=bellFor(h);
    let cells="";
    for(let d=0;d<5;d++){
      const k=(window.AP_TIMETABLE[d]||{})[h];
      if(!k){ cells+=`<td class="e"></td>`; continue; }
      const g=window.AP_GROUPS[k], n=window.AP_NONTEACH[k];
      if(g) cells+=`<td class="t" style="--c:${g.color}"><b>${esc(g.label)}</b>${g.room?`<small>חדר ${esc(g.room)}</small>`:""}</td>`;
      else cells+=`<td class="n"><span>${esc((n||{}).label||k)}</span>${n&&n.note?`<small>${esc(n.note)}</small>`:""}</td>`;
    }
    rows+=`<tr><th class="hh">${h}<small>${LTR(b.s)}<br>${LTR(b.e)}</small></th>${cells}</tr>`;
    const br=(window.AP_BREAKS||[]).find(x=>x.after===h);
    if(br && h<maxH) rows+=`<tr class="brk"><td colspan="6">${esc(br.name)} · ${LTR(br.s+"–"+br.e)}</td></tr>`;
  }
  const load={};
  for(const gid in window.AP_GROUPS){ const g=window.AP_GROUPS[gid]; load[g.subject]=(load[g.subject]||0)+SCHED.byGroup[gid].length; }

  $("#v-timetable").innerHTML=`
   <div class="hero"><h1>מערכת השעות</h1><div class="hsub">כפי שהועתקה מהמערכת שלך. השיבוץ הזה הוא הבסיס לכל התוכנית השנתית.</div></div>
   <div class="ttwrap"><table class="tt">
     <thead><tr><th></th>${[0,1,2,3,4].map(d=>`<th>יום ${window.AP_DAYSHORT[d]}</th>`).join("")}</tr></thead>
     <tbody>${rows}</tbody></table></div>
   <section class="card"><h2>סיכום עומס שנתי</h2>
     <div class="stats">
       <div class="stat"><b>${load.pe||0}</b><span>שיעורי חנ"ג בשנה</span></div>
       <div class="stat"><b>${load.hevra||0}</b><span>שיעורי חברה</span></div>
       <div class="stat"><b>${load.health||0}</b><span>שיעורי חינוך לבריאות</span></div>
       <div class="stat"><b>${Object.keys(window.AP_GROUPS).length}</b><span>קבוצות הוראה</span></div>
     </div>
     <div class="hint">המספרים מחושבים אחרי הורדת כל החופשות, ימי הזיכרון והסיום המוקדם של י"ב.</div>
   </section>
   <section class="card"><h2>משבצות שאינן הוראה</h2>
     <div class="links">${Object.keys(window.AP_NONTEACH).map(k=>`<span class="chip">${esc(window.AP_NONTEACH[k].label)}</span>`).join("")}</div>
     <div class="hint">משבצות אלה מופיעות במערכת אך אינן נכנסות לתוכנית השנתית.</div>
   </section>
   ${window.AP_BELLS_VERIFY?`<div class="banner warn"><b>לוח הצלצולים הוא ברירת מחדל</b><div>השעות שמוצגות הן לוח צלצולים סטנדרטי של חטיבה עליונה. לעדכון לשעות האמיתיות של בית הספר — «הגדרות ← לוח צלצולים». השעות משפיעות על מסך «היום» ועל הייצוא ליומן.</div></div>`:""}`;
}

/* ---------- הגדרות ---------- */
function renderSettings(){
  const b=bells();
  $("#v-settings").innerHTML=`
   <div class="hero"><h1>הגדרות</h1><div class="hsub">הכול נשמר במכשיר הזה בלבד.</div></div>

   <section class="card"><h2>📱 התקנה על הנייד</h2>
     <p>אפשר להוסיף את התוכנית למסך הבית של הטלפון — היא נפתחת כאפליקציה במסך מלא, בלי סרגל הדפדפן, <b>ועובדת גם בלי רשת</b> (מגרש, אולם, טיול).</p>
     <div class="row"><b>אנדרואיד</b><span>פותחים את הכתובת בכרום ← תפריט ⋮ ← «התקנת אפליקציה» או «הוספה למסך הבית».</span></div>
     <div class="row"><b>אייפון</b><span>פותחים בספארי ← כפתור השיתוף ← «הוספה למסך הבית».</span></div>
     <div class="hint">הנתונים שנשמרו (הערות, סימוני «בוצע») נשארים גם אחרי ההתקנה — זה אותו אחסון מקומי.</div>
   </section>

   <section class="card"><h2>📅 חיבור ליומן</h2>
     <p>ייצוא כל התוכנית השנתית לקובץ יומן אחד (<code>.ics</code>) — כל שיעור עם התאריך, השעה, הכיתה, ומה מלמדים בו בגוף האירוע.</p>
     <div class="links">
       <button class="btn" id="icsAll">📥 הורדת כל השנה</button>
       <button class="btn ghost" id="icsPe">רק שיעורי חנ"ג</button>
       <button class="btn ghost" id="icsHev">רק חברה ובריאות</button>
     </div>
     <h3>או: מנוי חי ליומן (מומלץ)</h3>
     <p>במקום לייבא קובץ פעם אחת, אפשר <b>להירשם</b> לכתובת קבועה. גוגל מרענן אותה מעצמה כל כמה שעות — כך שאם התוכנית מתעדכנת, היומן מתעדכן איתה בלי לעשות כלום.</p>
     <div class="urls">
       <div class="urlrow"><b>כל השנה</b>
         <input type="text" readonly value="https://osher15.github.io/Pro-sport-pa/tochnit-shnatit/tochnit-shnatit.ics">
         <button class="btn sm ghost" data-copy>העתקה</button></div>
       <div class="urlrow"><b>חנ"ג בלבד</b>
         <input type="text" readonly value="https://osher15.github.io/Pro-sport-pa/tochnit-shnatit/tochnit-shnatit-hinuch-gufani.ics">
         <button class="btn sm ghost" data-copy>העתקה</button></div>
       <div class="urlrow"><b>חברה ובריאות</b>
         <input type="text" readonly value="https://osher15.github.io/Pro-sport-pa/tochnit-shnatit/tochnit-shnatit-hevra-briut.ics">
         <button class="btn sm ghost" data-copy>העתקה</button></div>
     </div>
     <div class="banner warn"><b>זה לא עובד מאפליקציית היומן בטלפון</b>
       <div>באפליקציית «יומן Google» באנדרואיד ובאייפון אין בכלל אפשרות «הרשמה ליומן דרך URL» ואין ייבוא קובץ — גוגל לא בנתה אותן שם. צריך דפדפן. אפשר גם מהטלפון: פותחים <b>calendar.google.com</b> בכרום, תפריט ⋮ ← מסמנים «אתר למחשב», ואז ההגדרות המלאות נפתחות. אחרי שנרשמים פעם אחת — היומן מופיע אוטומטית גם באפליקציה בטלפון.</div></div>
     <details class="prot"><summary>איך נרשמים ליומן חי</summary>
       <div class="row"><b>1</b><span>calendar.google.com בדפדפן (במחשב, או בטלפון עם «אתר למחשב») ← בסרגל הצד «יומנים אחרים» ← <b>+</b> ← «הרשמה ליומן דרך כתובת URL».</span></div>
       <div class="row"><b>2</b><span>מדביקים את אחת הכתובות שלמעלה ולוחצים «הוספת יומן».</span></div>
       <div class="row"><b>3</b><span>זהו. היומן מופיע כיומן נפרד שאפשר לכבות או להסיר בלחיצה, והוא מתעדכן לבד.</span></div>
       <div class="row"><b>שימו לב</b><span>קצב הרענון בשליטת גוגל (בדרך כלל כמה שעות עד יממה). הכתובות עובדות רק אחרי שהתוכנית פורסמה ל-GitHub Pages מענף <code>main</code>.</span></div>
     </details>
     <details class="prot"><summary>ייבוא חד־פעמי של קובץ</summary>
       <div class="row"><b>1</b><span>פותחים את יומן גוגל בדפדפן (הייבוא לא קיים באפליקציית הנייד).</span></div>
       <div class="row"><b>2</b><span>גלגל השיניים ← «הגדרות» ← «ייבוא וייצוא».</span></div>
       <div class="row"><b>3</b><span>בוחרים את הקובץ שהורד, בוחרים יומן יעד — מומלץ ליצור יומן נפרד בשם «תוכנית שנתית» כדי שאפשר יהיה לכבות או למחוק אותו בבת אחת.</span></div>
       <div class="row"><b>4</b><span>«ייבוא». האירועים ייכנסו עם השעות לפי אזור זמן ירושלים.</span></div>
     </details>
     <div class="hint">אם משנים את לוח הצלצולים או את החופשות — מייצאים שוב ומייבאים ליומן חדש, כדי לא ליצור כפילויות.</div>
   </section>

   <section class="card"><h2>🔔 לוח צלצולים</h2>
     <div class="bells">${b.map(x=>`<div class="brow"><b>שעה ${x.h}</b>
       <input type="time" data-bell="${x.h}" data-k="s" value="${x.s}">
       <input type="time" data-bell="${x.h}" data-k="e" value="${x.e}"></div>`).join("")}</div>
     <div class="links"><button class="btn sm" id="bellSave">שמירה</button>
       <button class="btn sm ghost" id="bellReset">איפוס לברירת מחדל</button></div>
   </section>

   <section class="card"><h2>🏖️ חופשות ותאריכים</h2>
     <p>התאריכים העבריים חושבו מהלוח העברי לשנת ה׳תשפ״ז. חלונות החופשה נגזרו מהנוהג המקובל. מה שמסומן «לאשר» — כדאי לוודא מול לוח בית הספר.</p>
     <table class="tbl"><thead><tr><th>חופשה</th><th>מ־</th><th>עד</th><th>חוזרים</th><th></th></tr></thead><tbody>
     ${vacations().map((v,i)=>`<tr><td>${esc(v.name)}${v.verify?' <span class="vchip">לאשר</span>':""}</td>
       <td><input type="date" data-vac="${i}" data-k="from" value="${v.from}"></td>
       <td><input type="date" data-vac="${i}" data-k="to" value="${v.to}"></td>
       <td>${LTR(D.heFull(v.back))}</td><td class="note">${esc(v.note||"")}</td></tr>`).join("")}
     </tbody></table>
     <div class="links"><button class="btn sm" id="vacSave">שמירה וחישוב מחדש</button>
       <button class="btn sm ghost" id="vacReset">איפוס לברירת מחדל</button></div>
     ${(window.AP_YEAR.earlyFinish||[]).map(e=>`<div class="banner warn"><b>סיום מוקדם — ${e.grades.join(", ")}׳</b>
       <div>${LTR(D.heFull(e.date))} · ${esc(e.why)}${e.verify?" · לאשר מול בית הספר":""}</div></div>`).join("")}
   </section>

   <section class="card"><h2>🗒️ ההערות שלי</h2>
     <div class="hint">${Object.keys(ST.notes).length} הערות · ${Object.keys(ST.done).length} שיעורים מסומנים כבוצעו</div>
     <div class="links"><button class="btn sm ghost" id="expData">ייצוא גיבוי</button>
       <button class="btn sm ghost" id="impData">ייבוא גיבוי</button>
       <button class="btn sm danger" id="clrData">מחיקת כל ההערות</button></div>
     <input type="file" id="impFile" accept=".json" hidden>
   </section>

   <section class="card"><h2>על התוכנית</h2>
     <p>התוכנית נבנתה מהמערכת שלך, מלוח השנה של תשפ"ז, ומתוכנית לימודים שנתית בחינוך גופני המחולקת ליחידות הוראה לכל שכבה. היא <b>נפרדת לחלוטין</b> מאפליקציית המגרש PRO — הקישורים לשם נפתחים באפליקציה הקיימת ולא משנים בה דבר.</p>
     <div class="hint">גרסה 1.0 · ${window.AP_YEAR.label}</div>
   </section>`;

  $$("[data-copy]").forEach(b=>b.onclick=()=>{
    const inp=b.previousElementSibling;
    inp.select(); inp.setSelectionRange(0,999);
    const ok=(navigator.clipboard&&navigator.clipboard.writeText(inp.value))||document.execCommand("copy");
    toast("הכתובת הועתקה");
  });
  $("#icsAll").onclick=()=>downloadIcs(null);
  $("#icsPe").onclick=()=>downloadIcs(null,"pe");
  $("#icsHev").onclick=()=>downloadIcs(null,["hevra","health"]);
  $("#bellSave").onclick=()=>{
    const nb=bells().map(x=>({h:x.h,s:x.s,e:x.e}));
    $$("[data-bell]").forEach(i=>{ const r=nb.find(x=>x.h===+i.dataset.bell); if(r&&i.value) r[i.dataset.k]=i.value; });
    ST.bells=nb; save(); toast("לוח הצלצולים נשמר"); renderSettings();
  };
  $("#bellReset").onclick=()=>{ ST.bells=null; save(); renderSettings(); toast("אופס לברירת המחדל"); };
  $("#vacSave").onclick=()=>{
    const nv=vacations().map(v=>Object.assign({},v));
    $$("[data-vac]").forEach(i=>{ const v=nv[+i.dataset.vac]; if(v&&i.value) v[i.dataset.k]=i.value; });
    nv.forEach(v=>{ if(v.back<v.to) v.back=D.add(v.to,1); });
    ST.vacations=nv; save(); build(); toast("החופשות עודכנו — התוכנית חושבה מחדש"); renderSettings();
  };
  $("#vacReset").onclick=()=>{ ST.vacations=null; save(); build(); renderSettings(); toast("אופס לברירת המחדל"); };
  $("#expData").onclick=()=>{
    const blob=new Blob([JSON.stringify(ST,null,2)],{type:"application/json"});
    dl(blob,"tochnit-shnatit-backup.json");
  };
  $("#impData").onclick=()=>$("#impFile").click();
  $("#impFile").onchange=e=>{ const f=e.target.files[0]; if(!f)return;
    const r=new FileReader(); r.onload=()=>{ try{ ST=Object.assign(ST,JSON.parse(r.result)); save(); build(); renderSettings(); toast("הגיבוי יובא"); }catch(x){ toast("קובץ לא תקין"); } };
    r.readAsText(f); };
  $("#clrData").onclick=()=>{ if(confirm("למחוק את כל ההערות והסימונים? אי אפשר לשחזר.")){ ST.notes={};ST.done={};save();renderSettings();toast("נמחק"); } };
}

/* ---------- ייצוא ליומן ---------- */
function icsEsc(s){ return String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n"); }
/* קיפול שורות לפי תקן iCalendar — 75 בתים לשורה, לא 75 תווים.
   בעברית כל אות היא 2 בתים, ולכן ספירת תווים הייתה יוצרת שורות
   ארוכות מדי; חשוב גם לא לחתוך תו באמצע. */
function fold(l){
  const enc=s=>new TextEncoder().encode(s).length;
  const out=[]; let line="", bytes=0, first=true;
  for(const ch of l){
    const b=enc(ch), max=first?75:74;      /* בהמשך שורה יש רווח מוביל */
    if(bytes+b>max){ out.push(line); line=""; bytes=0; first=false; }
    line+=ch; bytes+=b;
  }
  out.push(line);
  return out.map((x,i)=>i?" "+x:x).join("\r\n");
}

function buildIcs(gid,subject){
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Tochnit Shnatit//HE//","CALSCALE:GREGORIAN","METHOD:PUBLISH",
    "X-WR-CALNAME:תוכנית שנתית "+window.AP_YEAR.label,"X-WR-TIMEZONE:Asia/Jerusalem",
    "BEGIN:VTIMEZONE","TZID:Asia/Jerusalem",
    "BEGIN:DAYLIGHT","TZOFFSETFROM:+0200","TZOFFSETTO:+0300","TZNAME:IDT","DTSTART:19700327T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=FR;BYMONTHDAY=23,24,25,26,27,28,29","END:DAYLIGHT",
    "BEGIN:STANDARD","TZOFFSETFROM:+0300","TZOFFSETTO:+0200","TZNAME:IST","DTSTART:19701025T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU","END:STANDARD","END:VTIMEZONE"];
  const stamp=new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const subs = subject ? (Array.isArray(subject)?subject:[subject]) : null;

  for(const g in SCHED.byGroup){
    if(gid && g!==gid) continue;
    if(subs && !subs.includes(window.AP_GROUPS[g].subject)) continue;
    for(const x of SCHED.byGroup[g]){
      const b=bellFor(x.hour), gr=window.AP_GROUPS[g];
      const dt=x.date.replace(/-/g,"");
      const s=dt+"T"+b.s.replace(":","")+"00", e=dt+"T"+b.e.replace(":","")+"00";
      const title = x.blocked ? `${gr.label} — ${x.blocked.name}`
                              : `${gr.label} — ${x.unit.name}: ${x.lesson.t}${x.cont?" (המשך)":""}`;
      const desc = x.blocked ? (x.blocked.pe||"")
        : [x.lesson.d,"","יחידה: "+x.unit.name+" (שיעור "+x.idx+" מתוך "+x.of+")",
           x.unit.plan&&x.unit.plan.eq?"ציוד: "+x.unit.plan.eq.join(", "):"",
           x.unit.plan&&x.unit.plan.safe?"בטיחות: "+x.unit.plan.safe:""].filter(Boolean).join("\n");
      L.push("BEGIN:VEVENT",
        "UID:"+x.id.replace(/[|]/g,"-")+"@tochnit-shnatit",
        "DTSTAMP:"+stamp,
        "DTSTART;TZID=Asia/Jerusalem:"+s,
        "DTEND;TZID=Asia/Jerusalem:"+e,
        fold("SUMMARY:"+icsEsc(title)),
        fold("DESCRIPTION:"+icsEsc(desc)),
        fold("CATEGORIES:"+icsEsc({pe:'חינוך גופני',health:"חינוך לבריאות",hevra:"חברה"}[gr.subject])),
        "END:VEVENT");
    }
  }
  L.push("END:VCALENDAR");
  return L.join("\r\n");
}
function dl(blob,name){ const u=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500); }
function downloadIcs(gid,subject){
  const txt=buildIcs(gid,subject);
  dl(new Blob([txt],{type:"text/calendar;charset=utf-8"}),
     "tochnit-shnatit-"+(gid||(subject?String(subject):"all"))+".ics");
  toast("הקובץ הורד — לייבוא ביומן גוגל: הגדרות ← ייבוא וייצוא");
}
function gcalLink(x){
  const b=bellFor(x.hour), g=window.AP_GROUPS[x.gid];
  /* גוגל מצפה ל-UTC. ישראל: +3 בקיץ, +2 בחורף — נגזר מהתאריך. */
  const dst = x.date>="2027-03-26"&&x.date<"2027-10-31" || x.date>="2026-03-27"&&x.date<"2026-10-25";
  const off = dst?3:2;
  const mk=t=>{ const [h,m]=t.split(":").map(Number);
    const d=D.parse(x.date); d.setUTCHours(h-off,m,0,0);
    return d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z"; };
  const title = x.blocked? `${g.label} — ${x.blocked.name}` : `${g.label} — ${x.unit.name}: ${x.lesson.t}`;
  const det = x.blocked? (x.blocked.pe||"") : x.lesson.d;
  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(title)+
    "&dates="+mk(b.s)+"/"+mk(b.e)+"&details="+encodeURIComponent(det);
}

/* ---------- אינטראקציות ---------- */
function findLesson(id){
  const [gid]=id.split("|");
  return (SCHED.byGroup[gid]||[]).find(x=>x.id===id);
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]"); if(!b) return;
  const id=b.dataset.id, x=findLesson(id);
  if(b.dataset.act==="done"){ if(ST.done[id]) delete ST.done[id]; else ST.done[id]=1; save(); refresh(); }
  if(b.dataset.act==="note"){
    const v=prompt("הערה לשיעור הזה:",ST.notes[id]||"");
    if(v===null)return; if(v.trim()) ST.notes[id]=v.trim(); else delete ST.notes[id];
    save(); refresh();
  }
  if(b.dataset.act==="gcal" && x) window.open(gcalLink(x),"_blank","noopener");
});
function refresh(){ go(location.hash.slice(1)||"today"); }

let tt=null;
function toast(msg){
  let t=$("#toast"); if(!t){ t=document.createElement("div"); t.id="toast"; document.body.appendChild(t); }
  t.textContent=msg; t.classList.add("on"); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove("on"),2600);
}

/* ---------- הפעלה ---------- */
function init(){
  load(); build();
  $$(".nav button[data-go]").forEach(b=>b.addEventListener("click",()=>{ location.hash=b.dataset.go; }));
  go(location.hash.slice(1)||"today");
  setInterval(()=>{ if(($("#v-today")||{}).classList.contains("on")) renderToday(); },60000);
}
document.addEventListener("DOMContentLoaded",init);

/* חשיפה מבוקרת — נוח לבדיקה, לניפוי שגיאות ולייצוא מהקונסולה */
window.AP={ get sched(){return SCHED}, build, buildIcs, downloadIcs, unitSpans, go, get state(){return ST} };
