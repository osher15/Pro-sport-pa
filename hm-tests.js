"use strict";
/* ============================================================
   המגרש PRO — מבחני כושר
   ------------------------------------------------------------
   מודול תפעולי לזמן שיעור: בוחרים שכבה (ז׳–י״ב) ומספר כיתה (1–10),
   בוחרים מבחן אחד מתוך הקטלוג, ומקבלים מסך הפעלה אחד עם רשימת
   התלמידים והכלי המתאים למבחן — שעון עצר או מונה חזרות.

   שני מצבי הפעלה בלבד, וזה מכוון:
   · שעון — שעון אחד רץ לכל הכיתה, והמורה מקיש על שם התלמיד ברגע
     שהוא סיים. מתאים גם לריצות (מי שמסיים ראשון) וגם להחזקות
     (פלאנק לכל הכיתה, מקישים על מי שנופל). אין צורך לדעת מראש סדר.
   · מספר — סטפר גדול בשורה של כל תלמיד, לחזרות ולמדידות.

   הנתונים נשמרים במכשיר בלבד, כמו כל שאר האפליקציה. מדובר בנתונים
   על קטינים — הם לא נשלחים לשום מקום, והייצוא הוא פעולה יזומה של
   המורה בלבד.
   ============================================================ */
(function(){
const H=()=>window.HM;
const today=()=>new Date().toISOString().slice(0,10);

/* ============================================================
   1. שכבות וכיתות
   ============================================================ */
const GRADES=[["ז","ז׳"],["ח","ח׳"],["ט","ט׳"],["י","י׳"],["יא","י״א"],["יב","י״ב"]];
const NUMS=[1,2,3,4,5,6,7,8,9,10];
const clsName=(g,n)=>((GRADES.find(x=>x[0]===g)||[,g])[1])+n;
/* השוואת שם כיתה סלחנית — המורה מקליד «ט2», «ט׳2», «ט' 2» וכולם אותו דבר */
const clsKey=s=>String(s||"").replace(/["'׳״\s\-־]/g,"").trim();

/* ============================================================
   2. קטלוג המבחנים
   ------------------------------------------------------------
   kind : clock  — שעון אחד לכיתה, מקישים על תלמיד ברגע הסיום
          count  — סטפר חזרות בשורה של כל תלמיד
          value  — הזנת מספר (מדידה בסרט/מד)
   dir  : low    — נמוך יותר = טוב יותר (זמני ריצה)
          high   — גבוה יותר = טוב יותר
   dur  : אם קיים — חלון זמן קצוב בשניות, עם ספירה לאחור וצפירה בסוף
   ============================================================ */
const TCATS=[
  ["run",   "ריצות ומהירות",   "🏃"],
  ["endur", "סבולת",           "🫁"],
  ["reps",  "כוח — חזרות",     "💪"],
  ["hold",  "כוח — החזקה",     "⏱"],
  ["jump",  "קפיצה וזריקה",    "🦘"],
  ["flex",  "גמישות",          "🧘"]
];

const TESTS=[
  /* ---------- ריצות ---------- */
  {id:"r60",  em:"⚡", name:"60 מטר",   cat:"run", kind:"clock", dir:"low",  unit:"שנ׳",
   hint:"זינוק גבוה או נמוך. מדידה עד חציית הקו בחזה. לדיוק גבוה — השתמש במודול «פוטו־פיניש».",
   link:"photo"},
  {id:"r100", em:"⚡", name:"100 מטר",  cat:"run", kind:"clock", dir:"low",  unit:"שנ׳",
   hint:"מנוחה מלאה בין ניסיונות — מהירות מתאמנים כשרעננים.", link:"photo"},
  {id:"r300", em:"🏃", name:"300 מטר",  cat:"run", kind:"clock", dir:"low",  unit:"שנ׳",
   hint:"מבחן סבולת אנאירובית. הסבר לתלמידים לצאת מבוקר — רובם יוצאים מהר מדי."},
  {id:"r600", em:"🏃", name:"600 מטר",  cat:"run", kind:"clock", dir:"low",  unit:"שנ׳",
   hint:"המרחק הנפוץ בחטיבה. הקפה וחצי במסלול 400."},
  {id:"r1000",em:"🏃", name:"1000 מטר", cat:"run", kind:"clock", dir:"low",  unit:"שנ׳",
   hint:"שתיים וחצי הקפות. חלק את הכיתה לשתי קבוצות — אחת רצה, השנייה סופרת הקפות."},
  {id:"r1500",em:"🏃", name:"1500 מטר", cat:"run", kind:"clock", dir:"low",  unit:"שנ׳",
   hint:"כמעט 4 הקפות. שווה למנות סופר הקפות לכל רץ."},
  {id:"r2000",em:"🏃", name:"2000 מטר", cat:"run", kind:"clock", dir:"low",  unit:"שנ׳",
   hint:"5 הקפות. לתיכון בעיקר — ודא שתייה זמינה לפני ואחרי."},
  {id:"shut", em:"🔀", name:"ריצת שאטל 10×5 מ׳", cat:"run", kind:"clock", dir:"low", unit:"שנ׳",
   hint:"שני קווים במרחק 5 מ׳, 10 מעברים. כף רגל חייבת לחצות את הקו בכל מעבר."},

  /* ---------- סבולת ---------- */
  {id:"cooper",em:"🫁", name:"מבחן קופר — 12 דקות", cat:"endur", kind:"value", dir:"high", unit:"מ׳", dur:720,
   hint:"12 דקות ריצה רציפה, רושמים את המרחק. הפעל את הספירה לאחור, ובסוף הזן לכל תלמיד את המרחק."},
  {id:"beep", em:"🎵", name:"ביפ טסט (Léger)", cat:"endur", kind:"link", dir:"high", unit:"מ׳",
   hint:"למבחן הביפ יש מודול ייעודי עם ביפים על שעון, VO₂max ונורמות FITNESSGRAM.", link:"beep"},
  {id:"walk", em:"🚶", name:"הליכת מייל (Rockport)", cat:"endur", kind:"clock", dir:"low", unit:"שנ׳",
   hint:"1609 מ׳ בהליכה מהירה ככל האפשר — אלטרנטיבה לתלמיד שלא יכול לרוץ."},

  /* ---------- כוח: חזרות ---------- */
  {id:"push", em:"🙌", name:"שכיבות סמיכה",       cat:"reps", kind:"count", dir:"high", unit:"חזרות",
   hint:"עד כשל או עד שהטכניקה נשברת. גוף קו ישר, חזה כמעט נוגע. אפשר לספור בזוגות."},
  {id:"situp",em:"🔄", name:"כפיפות בטן — 60 שנ׳", cat:"reps", kind:"count", dir:"high", unit:"חזרות", dur:60,
   hint:"דקה על השעון. ברכיים כפופות, ידיים מוצלבות על החזה, בן זוג מחזיק רגליים."},
  {id:"pull", em:"🧗", name:"מתח",                cat:"reps", kind:"count", dir:"high", unit:"חזרות",
   hint:"אחיזה עליונה ברוחב כתפיים. הסנטר עובר את המוט, ירידה ליישור מלא."},
  {id:"sq60", em:"🦵", name:"סקוואט — 60 שנ׳",    cat:"reps", kind:"count", dir:"high", unit:"חזרות", dur:60,
   hint:"ירידה עד 90° בברכיים. חזרה שלא הגיעה לעומק לא נספרת."},
  {id:"jr60", em:"🪢", name:"קפיצות בחבל — 60 שנ׳",cat:"reps", kind:"count", dir:"high", unit:"קפיצות", dur:60,
   hint:"סופרים קפיצות רצופות. הפסקה מותרת, הספירה ממשיכה."},
  {id:"burp", em:"🔥", name:"ברפי — 60 שנ׳",      cat:"reps", kind:"count", dir:"high", unit:"חזרות", dur:60,
   hint:"חזה לרצפה וקפיצה עם מחיאת כף מעל הראש. עצים — שמור לסוף השיעור."},

  /* ---------- כוח: החזקה ---------- */
  {id:"plank",em:"🪵", name:"פלאנק — החזקה",      cat:"hold", kind:"clock", dir:"high", unit:"שנ׳",
   hint:"כל הכיתה מתחילה יחד. מקישים על תלמיד ברגע שהאגן צונח או שהוא יורד."},
  {id:"wall", em:"🧱", name:"כיסא קיר — החזקה",   cat:"hold", kind:"clock", dir:"high", unit:"שנ׳",
   hint:"ירכיים מקבילות לרצפה, ידיים לא על הברכיים. מקישים על מי שקם."},
  {id:"hang", em:"💪", name:"תלייה כפופה במתח",   cat:"hold", kind:"clock", dir:"high", unit:"שנ׳",
   hint:"הסנטר מעל המוט. עוצרים ברגע שהסנטר יורד מתחת למוט."},

  /* ---------- קפיצה וזריקה ---------- */
  {id:"ljump",em:"🦘", name:"קפיצה לרוחק מהמקום", cat:"jump", kind:"value", dir:"high", unit:"ס״מ",
   hint:"שתי רגליים יחד, מודדים לעקב האחורי. שני ניסיונות, רושמים את הטוב."},
  {id:"vjump",em:"⬆️", name:"קפיצה לגובה מהמקום", cat:"jump", kind:"value", dir:"high", unit:"ס״מ",
   hint:"מדידת הפרש בין הושטה בעמידה להושטה בקפיצה, על קיר מסומן."},
  {id:"mball",em:"🎯", name:"זריקת כדור כוח",     cat:"jump", kind:"value", dir:"high", unit:"מ׳",
   hint:"זריקה משתי ידיים מהחזה בישיבה או בעמידה — קבע תנוחה אחידה לכל הכיתה."},

  /* ---------- גמישות ---------- */
  {id:"sitr", em:"🧘", name:"הושטה בישיבה",       cat:"flex", kind:"value", dir:"high", unit:"ס״מ",
   hint:"ישיבה, רגליים ישרות, הושטה איטית קדימה והחזקה של שתי שניות. בלי קפיצות."},
  {id:"shrch",em:"🤸", name:"הושטת כתפיים מאחור", cat:"flex", kind:"value", dir:"high", unit:"ס״מ",
   hint:"יד אחת מלמעלה ואחת מלמטה מאחורי הגב, מודדים את המרחק בין קצות האצבעות (0 = נגיעה)."}
];
const testById=id=>TESTS.find(t=>t.id===id);
const catName=id=>(TCATS.find(c=>c[0]===id)||[,"—"])[1];

/* ============================================================
   3. המודול
   ============================================================ */
window.FT=(function(){
  let inited=false;
  let st={grade:"ז",num:1,test:null,sort:"todo"};
  let clk={on:false,t0:0,raf:0,paused:0};      /* השעון המשותף לכיתה */
  let cd ={on:false,end:0,raf:0};              /* ספירה לאחור למבחנים קצובים */

  const LS=()=>H().LS;
  const cls=()=>clsName(st.grade,st.num);

  /* ---------- אחסון ---------- */
  const allRes =()=>LS().get("ft.results",[]);
  const setRes =r=>LS().set("ft.results",r);
  const rosters=()=>LS().get("ft.roster",{});
  const setRosters=r=>LS().set("ft.roster",r);

  /* רשימת הכיתה: מה שהמודול מכיר, ואם ריק — מייבא מ«התלמידים שלי» */
  function roster(c){
    const all=rosters(), k=clsKey(c);
    if(Array.isArray(all[k]))return all[k];
    return [];
  }
  function setRoster(c,list){ const all=rosters(); all[clsKey(c)]=list; setRosters(all); }

  function importFromStu(c){
    const stu=LS().get("stu.list",[]);
    const k=clsKey(c);
    const hits=stu.filter(s=>clsKey(s.cls)===k);
    if(!hits.length)return 0;
    const cur=roster(c), have=new Set(cur.map(x=>x.name));
    let n=0;
    hits.forEach(s=>{ if(have.has(s.name))return; cur.push({id:s.id,name:s.name}); have.add(s.name); n++; });
    setRoster(c,cur); return n;
  }

  /* ---------- תוצאות ---------- */
  const resultsFor=(c,testId)=>allRes().filter(r=>clsKey(r.cls)===clsKey(c)&&r.test===testId);
  function todayResult(c,testId,name){
    return resultsFor(c,testId).find(r=>r.name===name&&r.d===today())||null;
  }
  /* התוצאה הקודמת של אותו תלמיד באותו מבחן — לשם השוואה אישית */
  function prevResult(c,testId,name){
    const rs=resultsFor(c,testId).filter(r=>r.name===name&&r.d!==today())
      .sort((a,b)=>b.d.localeCompare(a.d));
    return rs[0]||null;
  }
  function saveVal(c,testId,stud,val){
    const T=testById(testId); if(!T||!(val>0))return;
    const rs=allRes();
    const i=rs.findIndex(r=>clsKey(r.cls)===clsKey(c)&&r.test===testId&&r.name===stud.name&&r.d===today());
    const rec={id:i>=0?rs[i].id:"f"+Date.now()+Math.random().toString(36).slice(2,5),
      ts:Date.now(),d:today(),cls:c,test:testId,name:stud.name,sid:stud.id||null,
      val:+(+val).toFixed(2),unit:T.unit};
    if(i>=0)rs[i]=rec; else rs.push(rec);
    setRes(rs);
  }
  function clearVal(c,testId,name){
    setRes(allRes().filter(r=>!(clsKey(r.cls)===clsKey(c)&&r.test===testId&&r.name===name&&r.d===today())));
  }

  /* ---------- תצוגת ערכים ---------- */
  function fmtVal(T,v){
    if(v==null)return "—";
    if(T.unit==="שנ׳")return v>=60?H().fmtMSc(v):v.toFixed(2);
    return String(Math.round(v*100)/100);
  }
  const better=(T,a,b)=>T.dir==="low"?a<b:a>b;   /* האם a טוב מ-b */

  /* ============================================================
     4. מסך הבחירה
     ============================================================ */
  function renderPicker(){
    const {$, $$, esc}=H();
    const c=cls(), rst=roster(c);
    $("#ft-run").style.display="none";
    $("#ft-pick").style.display="";

    $("#ft-grades").innerHTML=GRADES.map(([g,lbl])=>
      `<button data-g="${g}" class="${st.grade===g?"on":""}">${lbl}</button>`).join("");
    $("#ft-nums").innerHTML=NUMS.map(n=>
      `<button data-n="${n}" class="${st.num===n?"on":""}">${n}</button>`).join("");
    $("#ft-clsName").textContent=c;
    $("#ft-clsInfo").textContent=rst.length
      ? rst.length+" תלמידים ברשימה"
      : "אין עדיין רשימה לכיתה הזו — אפשר לייבא, להדביק או להוסיף ידנית";

    const rs=allRes().filter(r=>clsKey(r.cls)===clsKey(c));
    $("#ft-tests").innerHTML=TCATS.map(([cid,cnm,cem])=>{
      const items=TESTS.filter(t=>t.cat===cid);
      if(!items.length)return "";
      return `<div class="ft-grp"><div class="ft-grph">${cem} ${cnm}</div>
        <div class="ft-cards">${items.map(t=>{
          const mine=rs.filter(r=>r.test===t.id);
          const todayN=mine.filter(r=>r.d===today()).length;
          return `<div class="ft-card" data-t="${t.id}">
            <div class="hd"><span class="em">${t.em}</span><b>${esc(t.name)}</b></div>
            <div class="mt"><span class="pill">${esc(t.unit)}</span>
              <span class="pill">${t.kind==="clock"?"⏱ שעון":t.kind==="count"?"➕ מונה":t.kind==="link"?"↗ מודול ייעודי":"✎ הזנה"}</span>
              ${t.dur?`<span class="pill">${t.dur>=60?Math.round(t.dur/60)+" דק׳":t.dur+" שנ׳"}</span>`:""}
              ${todayN?`<span class="pill acc">${todayN} היום</span>`:mine.length?`<span class="pill">${mine.length} בהיסטוריה</span>`:""}</div>
          </div>`;}).join("")}</div></div>`;
    }).join("");

    $$("#ft-grades [data-g]").forEach(b=>b.addEventListener("click",()=>{st.grade=b.dataset.g;persist();renderPicker();}));
    $$("#ft-nums [data-n]").forEach(b=>b.addEventListener("click",()=>{st.num=+b.dataset.n;persist();renderPicker();}));
    $$("#ft-tests [data-t]").forEach(b=>b.addEventListener("click",()=>openTest(b.dataset.t)));
  }

  function persist(){ LS().set("ft.last",{grade:st.grade,num:st.num,sort:st.sort}); }

  /* ============================================================
     5. מסך המבחן
     ============================================================ */
  function openTest(id){
    const T=testById(id); if(!T)return;
    if(T.kind==="link"){
      H().toast("למבחן הזה יש מודול ייעודי — מעביר אותך אליו");
      H().go(T.link); return;
    }
    st.test=id; stopClock(true); stopCd();
    H().$("#ft-pick").style.display="none";
    H().$("#ft-run").style.display="";
    renderRun();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function backToPicker(){ stopClock(true); stopCd(); st.test=null; renderPicker(); }

  function renderRun(){
    const {$, $$, esc}=H();
    const T=testById(st.test); if(!T)return;
    const c=cls();
    let rst=roster(c).slice();

    /* מיון: «מי שעוד לא נמדד» קודם — זה מה שצריך באמצע שיעור */
    const valOf=n=>{const r=todayResult(c,T.id,n);return r?r.val:null;};
    if(st.sort==="todo")      rst.sort((a,b)=>(valOf(a.name)==null?0:1)-(valOf(b.name)==null?0:1));
    else if(st.sort==="name") rst.sort((a,b)=>a.name.localeCompare(b.name,"he"));
    else if(st.sort==="res")  rst.sort((a,b)=>{
      const x=valOf(a.name),y=valOf(b.name);
      if(x==null&&y==null)return 0; if(x==null)return 1; if(y==null)return -1;
      return T.dir==="low"?x-y:y-x; });

    const done=rst.filter(s=>valOf(s.name)!=null);
    const vals=done.map(s=>valOf(s.name));
    const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    const best=vals.length?(T.dir==="low"?Math.min(...vals):Math.max(...vals)):null;

    $("#ft-runHead").innerHTML=`
      <div class="ft-rh">
        <button class="btn sm ghost" id="ft-back">→ חזרה</button>
        <div class="grow"><b>${T.em} ${esc(T.name)}</b>
          <div class="sb">כיתה ${esc(c)} · ${done.length}/${rst.length} נמדדו${
            avg!=null?` · ממוצע ${fmtVal(T,avg)} ${esc(T.unit)}`:""}${
            best!=null?` · הטוב ${fmtVal(T,best)}`:""}</div></div>
      </div>
      <div class="hint" style="margin-top:8px">${esc(T.hint)}</div>`;

    /* --- הכלי: שעון או ספירה לאחור --- */
    $("#ft-tool").innerHTML=
      T.kind==="clock"
      ? `<div class="ft-clock" id="ft-clockBox">
           <div class="tm" id="ft-clockTm">0:00.00</div>
           <div class="row" style="gap:9px;justify-content:center;margin-top:10px">
             <button class="btn acc big" id="ft-clkGo" style="width:auto;flex:1">▶ הפעל</button>
             <button class="btn stop" id="ft-clkStop" disabled>⏹ עצור</button>
             <button class="btn ghost" id="ft-clkReset">↺</button>
           </div>
           <div class="hint" style="margin-top:8px;text-align:center">
             ${T.dir==="low"?"הקש על שם התלמיד ברגע שהוא חוצה את הקו":"הקש על שם התלמיד ברגע שהוא מפסיק"} — הזמן נרשם אוטומטית.</div>
         </div>`
      : T.dur
      ? `<div class="ft-clock" id="ft-cdBox">
           <div class="tm" id="ft-cdTm">${T.dur>=60?Math.floor(T.dur/60)+":"+String(T.dur%60).padStart(2,"0"):"0:"+String(T.dur).padStart(2,"0")}</div>
           <div class="row" style="gap:9px;justify-content:center;margin-top:10px">
             <button class="btn acc big" id="ft-cdGo" style="width:auto;flex:1">▶ הפעל ${T.dur>=60?Math.round(T.dur/60)+" דקות":T.dur+" שניות"}</button>
             <button class="btn stop" id="ft-cdStop" disabled>⏹</button>
           </div>
           <div class="hint" style="margin-top:8px;text-align:center">צפירה בסיום. ספור עם הכפתורים בשורה של כל תלמיד.</div>
         </div>`
      : "";

    /* --- שורת כלים --- */
    $("#ft-bar").innerHTML=`
      <div class="row" style="gap:7px;flex-wrap:wrap">
        <div class="seg" id="ft-sortSeg">
          <button data-s="todo" class="${st.sort==="todo"?"on":""}">שלא נמדדו</button>
          <button data-s="name" class="${st.sort==="name"?"on":""}">שם</button>
          <button data-s="res"  class="${st.sort==="res"?"on":""}">תוצאה</button>
        </div>
        <div class="grow"></div>
        <button class="btn sm" id="ft-addOne">+ תלמיד</button>
        <button class="btn sm ghost" id="ft-rosterBtn">👥 רשימה</button>
        <button class="btn sm ghost" id="ft-csv">⬇ CSV</button>
      </div>`;

    /* --- רשימת התלמידים --- */
    $("#ft-list").innerHTML=rst.length?rst.map(s=>{
      const r=todayResult(c,T.id,s.name), pv=prevResult(c,T.id,s.name);
      let delta="";
      if(r&&pv){
        const imp=better(T,r.val,pv.val);
        const d=Math.abs(r.val-pv.val);
        delta=`<span class="dl ${imp?"up":"down"}">${imp?"▲":"▼"} ${fmtVal(T,d)}</span>`;
      }
      return `<div class="ft-row${r?" done":""}" data-n="${esc(s.name)}">
        <div class="nm">${esc(s.name)}${pv?`<span class="pv">קודם: ${fmtVal(T,pv.val)}</span>`:""}</div>
        <div class="vl">${r?fmtVal(T,r.val):"—"}${delta}</div>
        ${T.kind==="clock"
          ? `<button class="btn sm ${r?"ghost":"acc"}" data-cap="${esc(s.name)}">${r?"↺ שוב":"⏱ קלוט"}</button>`
          : T.kind==="count"
          ? `<div class="ft-step">
               <button class="plus" data-inc="${esc(s.name)}">+</button>
               <b>${r?Math.round(r.val):0}</b>
               <button data-dec="${esc(s.name)}">−</button>
             </div>`
          : `<input class="ft-num" type="number" inputmode="decimal" step="0.1" min="0"
               data-val="${esc(s.name)}" value="${r?r.val:""}" placeholder="${esc(T.unit)}">`}
        ${r?`<button class="btn sm stop" data-del="${esc(s.name)}">✕</button>`:""}
      </div>`;}).join("")
      : `<div class="empty-state"><div class="big">👥</div>אין תלמידים ברשימת כיתה ${esc(c)}.<br>
         לחץ «👥 רשימה» כדי לייבא מ«התלמידים שלי», להדביק רשימה, או להוסיף ידנית.</div>`;

    wireRun();
  }

  /* ---------- עדכון שורה במקום, בלי לרנדר מחדש ----------
     באמצע מקצה אסור שהרשימה תזוז מתחת לאצבע — מיון מחדש קורה
     רק כשהמורה בוחר אותו במפורש. */
  function refreshRow(name){
    const {$, esc}=H(), T=testById(st.test), c=cls();
    const row=document.querySelector('#ft-list .ft-row[data-n="'+CSS.escape(name)+'"]');
    if(!row)return;
    const r=todayResult(c,T.id,name), pv=prevResult(c,T.id,name);
    let delta="";
    if(r&&pv){ const imp=better(T,r.val,pv.val);
      delta=`<span class="dl ${imp?"up":"down"}">${imp?"▲":"▼"} ${fmtVal(T,Math.abs(r.val-pv.val))}</span>`; }
    row.classList.toggle("done",!!r);
    row.querySelector(".vl").innerHTML=(r?fmtVal(T,r.val):"—")+delta;
    const stepB=row.querySelector(".ft-step b"); if(stepB)stepB.textContent=r?Math.round(r.val):0;
    const cap=row.querySelector("[data-cap]");
    if(cap){ cap.textContent=r?"↺ שוב":"⏱ קלוט"; cap.className="btn sm "+(r?"ghost":"acc"); }
    let del=row.querySelector("[data-del]");
    if(r&&!del){
      del=document.createElement("button");
      del.className="btn sm stop"; del.setAttribute("data-del",name); del.textContent="✕";
      del.addEventListener("click",()=>{ clearVal(c,T.id,name); refreshRow(name); refreshHead(); });
      row.appendChild(del);
    }else if(!r&&del)del.remove();
    refreshHead();
  }
  function refreshHead(){
    const {$}=H(), T=testById(st.test), c=cls();
    const rst=roster(c);
    const vals=rst.map(s=>{const r=todayResult(c,T.id,s.name);return r?r.val:null;}).filter(v=>v!=null);
    const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    const best=vals.length?(T.dir==="low"?Math.min(...vals):Math.max(...vals)):null;
    const sb=$("#ft-runHead").querySelector(".sb");
    if(sb)sb.textContent=`כיתה ${c} · ${vals.length}/${rst.length} נמדדו`
      +(avg!=null?` · ממוצע ${fmtVal(T,avg)} ${T.unit}`:"")
      +(best!=null?` · הטוב ${fmtVal(T,best)}`:"");
  }

  /* ---------- השעון המשותף ---------- */
  const elapsed=()=>clk.on?(performance.now()-clk.t0)/1000:clk.paused;
  function tick(){
    if(!clk.on)return;
    const e=elapsed(), m=Math.floor(e/60), s=e-m*60;
    const el=H().$("#ft-clockTm");
    if(el)el.textContent=m+":"+(s<10?"0":"")+s.toFixed(2);
    clk.raf=requestAnimationFrame(tick);
  }
  function startClock(){
    if(clk.on)return;
    H().ac(); H().keepAwake(true); H().horn();
    clk={on:true,t0:performance.now()-clk.paused*1000,raf:0,paused:0};
    const g=H().$("#ft-clkGo"), s=H().$("#ft-clkStop");
    if(g)g.disabled=true; if(s)s.disabled=false;
    tick();
  }
  function stopClock(silent){
    if(clk.on){ clk.paused=elapsed(); clk.on=false; cancelAnimationFrame(clk.raf); }
    H().keepAwake(false);
    const g=H().$("#ft-clkGo"), s=H().$("#ft-clkStop");
    if(g)g.disabled=false; if(s)s.disabled=true;
    if(!silent)H().toast("השעון נעצר — התוצאות שנקלטו נשמרו");
  }
  function resetClock(){
    stopClock(true); clk.paused=0;
    const el=H().$("#ft-clockTm"); if(el)el.textContent="0:00.00";
  }

  /* ---------- ספירה לאחור למבחנים קצובים ---------- */
  function cdTick(){
    if(!cd.on)return;
    const left=Math.max(0,(cd.end-performance.now())/1000);
    const el=H().$("#ft-cdTm");
    if(el)el.textContent=Math.floor(left/60)+":"+String(Math.floor(left%60)).padStart(2,"0");
    if(left<=0){ cd.on=false; H().horn(); H().confetti(); H().say("זמן"); H().keepAwake(false);
      const g=H().$("#ft-cdGo"), s=H().$("#ft-cdStop");
      if(g)g.disabled=false; if(s)s.disabled=true;
      H().toast("⏱ הזמן נגמר — סיים לרשום את הספירות"); return; }
    if(left<=3.05&&left>2.95)H().beep(880,0.1);
    if(left<=2.05&&left>1.95)H().beep(880,0.1);
    if(left<=1.05&&left>0.95)H().beep(880,0.1);
    cd.raf=requestAnimationFrame(cdTick);
  }
  function startCd(sec){
    if(cd.on)return;
    H().ac(); H().keepAwake(true); H().horn();
    cd={on:true,end:performance.now()+sec*1000,raf:0};
    const g=H().$("#ft-cdGo"), s=H().$("#ft-cdStop");
    if(g)g.disabled=true; if(s)s.disabled=false;
    cdTick();
  }
  function stopCd(){
    if(cd.on){ cd.on=false; cancelAnimationFrame(cd.raf); H().keepAwake(false); }
    const g=H().$("#ft-cdGo"), s=H().$("#ft-cdStop");
    if(g)g.disabled=false; if(s)s.disabled=true;
  }

  /* ---------- חיווט מסך המבחן ---------- */
  function wireRun(){
    const {$, $$}=H(), T=testById(st.test), c=cls();
    const on=(sel,ev,fn)=>{const e=$(sel);if(e)e.addEventListener(ev,fn);};
    on("#ft-back","click",backToPicker);
    $$("#ft-sortSeg button").forEach(b=>b.addEventListener("click",()=>{st.sort=b.dataset.s;persist();renderRun();}));
    on("#ft-addOne","click",addOne);
    on("#ft-rosterBtn","click",openRoster);
    on("#ft-csv","click",exportCsv);

    on("#ft-clkGo","click",startClock);
    on("#ft-clkStop","click",()=>stopClock(false));
    on("#ft-clkReset","click",()=>{ if(clk.paused===0||confirm("לאפס את השעון? התוצאות שנרשמו נשמרות."))resetClock(); });
    on("#ft-cdGo","click",()=>startCd(T.dur));
    on("#ft-cdStop","click",stopCd);

    /* קליטת זמן — הפעולה המרכזית בזמן מקצה */
    $$("#ft-list [data-cap]").forEach(b=>b.addEventListener("click",()=>{
      if(!clk.on&&clk.paused===0){H().toast("הפעל קודם את השעון");return;}
      const nm=b.dataset.cap, s=roster(c).find(x=>x.name===nm)||{name:nm};
      saveVal(c,T.id,s,elapsed());
      H().beep(1100,0.09); refreshRow(nm);
    }));
    /* מונה חזרות */
    $$("#ft-list [data-inc]").forEach(b=>b.addEventListener("click",()=>bump(b.dataset.inc,1)));
    $$("#ft-list [data-dec]").forEach(b=>b.addEventListener("click",()=>bump(b.dataset.dec,-1)));
    /* הזנת מדידה */
    $$("#ft-list [data-val]").forEach(inp=>inp.addEventListener("change",()=>{
      const nm=inp.dataset.val, v=+inp.value;
      const s=roster(c).find(x=>x.name===nm)||{name:nm};
      if(v>0)saveVal(c,T.id,s,v); else clearVal(c,T.id,nm);
      refreshRow(nm);
    }));
    $$("#ft-list [data-del]").forEach(b=>b.addEventListener("click",()=>{
      clearVal(c,T.id,b.dataset.del); refreshRow(b.dataset.del);
      const inp=document.querySelector('#ft-list [data-val="'+CSS.escape(b.dataset.del)+'"]');
      if(inp)inp.value="";
    }));
  }
  function bump(name,d){
    const T=testById(st.test), c=cls();
    const cur=todayResult(c,T.id,name), s=roster(c).find(x=>x.name===name)||{name};
    const v=Math.max(0,(cur?cur.val:0)+d);
    if(v>0)saveVal(c,T.id,s,v); else clearVal(c,T.id,name);
    H().beep(d>0?920:520,0.05); refreshRow(name);
  }

  /* ============================================================
     6. ניהול רשימת הכיתה
     ============================================================ */
  function addOne(){
    const nm=prompt("שם התלמיד:","");
    if(!nm||!nm.trim())return;
    const c=cls(), list=roster(c);
    if(list.some(x=>x.name===nm.trim())){H().toast("השם כבר ברשימה");return;}
    list.push({id:"f"+Date.now()+Math.random().toString(36).slice(2,5),name:nm.trim()});
    setRoster(c,list); renderRun(); H().toast("נוסף לכיתה "+c);
  }
  function openRoster(){
    const {$, esc}=H(), c=cls();
    $("#ft-rosTitle").textContent="👥 רשימת כיתה "+c;
    renderRosterList();
    H().modal("ft-rosModal");
    $("#ft-rosImport").onclick=()=>{
      const n=importFromStu(c);
      if(n)H().toast("יובאו "+n+" תלמידים מ«התלמידים שלי»");
      else H().toast("לא נמצאו תלמידים עם הכיתה «"+c+"» ב«התלמידים שלי»");
      renderRosterList();
    };
    $("#ft-rosPaste").onclick=()=>{
      const txt=$("#ft-rosBulk").value;
      const lines=txt.split(/\r?\n/).map(l=>l.split(",")[0].trim()).filter(Boolean);
      if(!lines.length){H().toast("הדבק שמות, שורה לכל תלמיד");return;}
      const list=roster(c), have=new Set(list.map(x=>x.name)); let n=0;
      lines.forEach(nm=>{ if(have.has(nm)||/^(שם|name)$/i.test(nm))return;
        list.push({id:"f"+Date.now()+Math.random().toString(36).slice(2,5)+n,name:nm}); have.add(nm); n++; });
      setRoster(c,list); $("#ft-rosBulk").value=""; renderRosterList(); H().toast("נוספו "+n+" תלמידים");
    };
    $("#ft-rosDone").onclick=()=>{ H().modal("ft-rosModal",false); if(st.test)renderRun(); else renderPicker(); };
  }
  function renderRosterList(){
    const {$, $$, esc}=H(), c=cls(), list=roster(c);
    $("#ft-rosList").innerHTML=list.length?list.map((s,i)=>
      `<div class="arc-item"><div class="grow"><div class="ttl">${i+1}. ${esc(s.name)}</div></div>
       <button class="btn sm stop" data-rd="${esc(s.name)}">✕</button></div>`).join("")
      : '<div class="hint">הרשימה ריקה. ייבא מ«התלמידים שלי», או הדבק שמות למטה.</div>';
    $("#ft-rosCount").textContent=list.length?list.length+" תלמידים":"";
    $$("#ft-rosList [data-rd]").forEach(b=>b.addEventListener("click",()=>{
      setRoster(c,roster(c).filter(x=>x.name!==b.dataset.rd)); renderRosterList();
    }));
  }

  /* ============================================================
     7. ייצוא
     ============================================================ */
  function exportCsv(){
    const T=testById(st.test), c=cls();
    const rs=resultsFor(c,T.id).sort((a,b)=>a.d.localeCompare(b.d)||a.name.localeCompare(b.name,"he"));
    if(!rs.length){H().toast("אין עדיין תוצאות במבחן הזה");return;}
    const rows=[["תאריך","כיתה","שם","מבחן","תוצאה","יחידה"]];
    rs.forEach(r=>rows.push([r.d,r.cls,r.name,T.name,r.val,r.unit]));
    H().dlCSV("מבחן-"+T.name+"-"+c+"-"+today()+".csv",rows);
  }

  /* ============================================================
     8. אתחול
     ============================================================ */
  function init(){
    if(inited){ st.test?renderRun():renderPicker(); return; }
    inited=true;
    const last=LS().get("ft.last",{});
    if(last.grade)st.grade=last.grade;
    if(last.num)st.num=last.num;
    if(last.sort)st.sort=last.sort;
    renderPicker();
  }

  return {init, tests:()=>TESTS, results:()=>allRes()};
})();
})();
