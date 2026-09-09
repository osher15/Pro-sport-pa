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
  {id:"shut4x10", em:"↔️", name:"ריצת שאטל 4×10 מ׳", cat:"run", kind:"clock", dir:"low", unit:"שנ׳",
   hint:"שני קווים במרחק 10 מ׳, ארבעה מעברים. נגיעה ביד בקו בכל היפוך — לא ״כמעט״."},

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
   2ב. מדד הכושר הגופני — שכבת הניקוד
   ------------------------------------------------------------
   ממירה תוצאה גולמית (שניות / חזרות / ס״מ) לציון 0–100, ומרכיבה
   מהן מדד אחד לתלמיד. שתי שיטות:

   norm — טבלת נורמה. המבנה: לכל מבחן × מין × שכבה רשימת נקודות
          ציון [ערך, נקודות], ובין שתי נקודות סמוכות מבצעים
          אינטרפולציה ליניארית. עובד גם למבחנים שבהם נמוך=טוב
          (זמני ריצה) וגם להפך, כי הכיוון נגזר מהערכים עצמם.
          הטבלה ריקה כברירת מחדל — היא נתון של המורה, לא של הקוד.

   rel  — יחסי לשכבה. אחוזון מול כל שאר התוצאות שנרשמו באותו מבחן,
          באותה שכבה ובאותו מין. לא דורש שום טבלה חיצונית, ומשתפר
          ככל שנצברות תוצאות.

   ברירת המחדל היא rel, ומעבר ל-norm קורה רק כשקיימת טבלה למבחן
   ולשכבה — אחרת נופלים חזרה ל-rel ומסמנים את זה בממשק.
   ============================================================ */
const NORM_EMPTY={version:"",source:"",table:{}};

/* אינטרפולציה ליניארית בין נקודות הציון של טבלת הנורמה */
function scoreFromPoints(pts,val){
  if(!Array.isArray(pts)||pts.length<2||!(val>=0))return null;
  const P=pts.slice().sort((a,b)=>a[0]-b[0]);
  if(val<=P[0][0])return clamp100(P[0][1]);
  if(val>=P[P.length-1][0])return clamp100(P[P.length-1][1]);
  for(let i=0;i<P.length-1;i++){
    const [x1,y1]=P[i],[x2,y2]=P[i+1];
    if(val>=x1&&val<=x2){
      if(x2===x1)return clamp100(y2);
      return clamp100(y1+(y2-y1)*(val-x1)/(x2-x1));
    }
  }
  return null;
}
const clamp100=v=>Math.max(0,Math.min(100,Math.round(v*10)/10));

/* אחוזון: איזה חלק מהקבוצה התלמיד עקף. dir קובע מה נחשב «טוב יותר». */
function percentile(vals,val,dir){
  if(!vals.length)return null;
  const worse=vals.filter(v=>dir==="low"?v>val:v<val).length;
  const same =vals.filter(v=>v===val).length;
  return clamp100((worse+same/2)/vals.length*100);
}

/* ============================================================
   3. המודול
   ============================================================ */
window.FT=(function(){
  let inited=false;
  let st={grade:"ז",num:1,test:null,sort:"todo",tab:"tests"};
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
    hits.forEach(s=>{ if(have.has(s.name))return;
      cur.push({id:s.id,name:s.name,sex:s.sex||null}); have.add(s.name); n++; });
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
      gradeKey:st.grade,sex:stud.sex||null,
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
     3ב. מדד הכושר — נתונים וחישוב
     ============================================================ */
  const norms   =()=>Object.assign({},NORM_EMPTY,LS().get("ft.norms",{}));
  const setNorms=n=>LS().set("ft.norms",n);
  const scoreMode=()=>LS().get("ft.scoreMode","rel");
  const setScoreMode=m=>LS().set("ft.scoreMode",m);
  /* אילו מבחנים נכנסים למדד. ריק = כל מבחן שיש לו תוצאה. */
  const idxTests   =()=>LS().get("ft.idxTests",[]);
  const setIdxTests=a=>LS().set("ft.idxTests",a);

  const sexOf=stud=>stud&&stud.sex==="girls"?"girls":stud&&stud.sex==="boys"?"boys":null;

  /* ניקוד לפי טבלת נורמה — מחזיר null אם אין טבלה למבחן/מין/שכבה */
  function normScore(testId,sex,grade,val){
    const T=norms().table[testId]; if(!T||!sex)return null;
    const byGrade=T[sex]; if(!byGrade)return null;
    return scoreFromPoints(byGrade[grade],val);
  }
  /* ניקוד יחסי — מול כל התוצאות באותו מבחן, באותה שכבה, ובאותו מין אם ידוע */
  function relScore(testId,sex,grade,val){
    const T=testById(testId); if(!T)return null;
    const gk=String(grade);
    const peers=allRes().filter(r=>r.test===testId&&r.gradeKey===gk&&(!sex||!r.sex||r.sex===sex));
    const vals=peers.map(r=>r.val).filter(v=>v>0);
    if(vals.length<3)return null;                 /* מתחת ל-3 תוצאות אחוזון הוא רעש */
    return percentile(vals,val,T.dir);
  }
  /* הציון הסופי לתוצאה בודדת + מאיפה הוא הגיע */
  function scoreOne(testId,stud,grade,val){
    const sex=sexOf(stud);
    if(scoreMode()==="norm"){
      const n=normScore(testId,sex,grade,val);
      if(n!=null)return {v:n,src:"norm"};
    }
    const r=relScore(testId,sex,grade,val);
    if(r!=null)return {v:r,src:"rel"};
    return {v:null,src:null};
  }
  /* המדד המשוקלל של תלמיד: ממוצע הציונים על המבחנים שנבחרו */
  function indexFor(c,stud,grade){
    const want=idxTests();
    const mine=allRes().filter(r=>clsKey(r.cls)===clsKey(c)&&r.name===stud.name);
    /* התוצאה האחרונה בכל מבחן */
    const byTest={};
    mine.forEach(r=>{ if(!byTest[r.test]||r.d>byTest[r.test].d)byTest[r.test]=r; });
    const rows=Object.values(byTest)
      .filter(r=>!want.length||want.includes(r.test))
      .map(r=>{ const sc=scoreOne(r.test,stud,grade,r.val); return {test:r.test,val:r.val,d:r.d,sc:sc.v,src:sc.src}; })
      .filter(x=>x.sc!=null);
    if(!rows.length)return {idx:null,rows:[],partial:Object.keys(byTest).length>0};
    const idx=rows.reduce((a,b)=>a+b.sc,0)/rows.length;
    return {idx:Math.round(idx*10)/10,rows,partial:false};
  }

  /* ============================================================
     4. מסך הבחירה
     ============================================================ */
  function renderPicker(){
    const {$, $$, esc}=H();
    const c=cls(), rst=roster(c);
    $("#ft-run").style.display="none";
    $("#ft-idx").style.display="none";
    $("#ft-ot").style.display="none";
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
    H().$("#ft-idx").style.display="none";
    H().$("#ft-ot").style.display="none";
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
    $("#ft-rosDone").onclick=()=>{ H().modal("ft-rosModal",false); renderTab(); };
  }
  function renderRosterList(){
    const {$, $$, esc}=H(), c=cls(), list=roster(c);
    $("#ft-rosList").innerHTML=list.length?list.map((s,i)=>
      `<div class="arc-item"><div class="grow"><div class="ttl">${i+1}. ${esc(s.name)}</div></div>
       <div class="seg ft-sexseg">
         <button data-sx="boys"  data-n="${esc(s.name)}" class="${s.sex==="boys"?"on":""}">בן</button>
         <button data-sx="girls" data-n="${esc(s.name)}" class="${s.sex==="girls"?"on":""}">בת</button>
       </div>
       <button class="btn sm stop" data-rd="${esc(s.name)}">✕</button></div>`).join("")
      : '<div class="hint">הרשימה ריקה. ייבא מ«התלמידים שלי», או הדבק שמות למטה.</div>';
    $("#ft-rosCount").textContent=list.length?list.length+" תלמידים":"";
    $$("#ft-rosList [data-rd]").forEach(b=>b.addEventListener("click",()=>{
      setRoster(c,roster(c).filter(x=>x.name!==b.dataset.rd)); renderRosterList();
    }));
    /* המין דרוש לניקוד — נורמות כושר נפרדות לבנים ולבנות */
    $$("#ft-rosList [data-sx]").forEach(b=>b.addEventListener("click",()=>{
      const l=roster(c), s2=l.find(x=>x.name===b.dataset.n); if(!s2)return;
      s2.sex=s2.sex===b.dataset.sx?null:b.dataset.sx;
      setRoster(c,l); renderRosterList();
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
     7ב. מסך המדד
     ============================================================ */
  function renderIndex(){
    const {$, $$, esc}=H();
    const c=cls(), rst=roster(c), N=norms();
    const mode=scoreMode(), want=idxTests();
    const hasTable=Object.keys(N.table).length>0;

    const rows=rst.map(s=>({s,...indexFor(c,s,st.grade)}));
    const scored=rows.filter(r=>r.idx!=null);
    const avg=scored.length?scored.reduce((a,b)=>a+b.idx,0)/scored.length:null;
    /* אילו מבחנים בפועל מוצגים כעמודות */
    const usedTests=[...new Set([].concat(...rows.map(r=>r.rows.map(x=>x.test))))];
    const anyRel=rows.some(r=>r.rows.some(x=>x.src==="rel"));

    $("#ft-idx").innerHTML=`
      <div class="card">
        <h2><span class="dot"></span> מדד הכושר הגופני — כיתה ${esc(c)}</h2>
        <div class="hint">ציון 0–100 ליכולת בלבד. זה לא ציון התעודה — זה הרכיב שאתה משקלל
          לתוכו את ההגעה, ההשתתפות, השיפור והבונוסים.</div>

        <div class="row" style="margin-top:12px">
          <div class="field" style="width:230px"><label>שיטת ניקוד</label>
            <div class="seg" id="ft-modeSeg">
              <button data-m="rel"  class="${mode==="rel"?"on":""}">יחסי לשכבה</button>
              <button data-m="norm" class="${mode==="norm"?"on":""}">טבלת נורמה</button>
            </div></div>
          <div class="grow"></div>
          <button class="btn sm" id="ft-normsBtn">📐 טבלת הנורמה</button>
          <button class="btn sm" id="ft-idxPick">🎯 מבחנים במדד${want.length?" ("+want.length+")":""}</button>
        </div>

        ${mode==="norm"&&!hasTable
          ? `<div class="bw-warn">בחרת «טבלת נורמה» אבל עדיין לא נטענה טבלה — הניקוד מחושב בינתיים יחסית לשכבה.
              פתח «📐 טבלת הנורמה» כדי להזין אותה.</div>`
          : mode==="rel"
          ? `<div class="hint" style="margin-top:10px">ניקוד יחסי: כל תוצאה מדורגת מול שאר התוצאות באותו מבחן,
              באותה שכבה ובאותו מין. נדרשות לפחות ‎3‎ תוצאות במבחן כדי שהאחוזון לא יהיה רעש.</div>`
          : `<div class="hint" style="margin-top:10px">טבלת נורמה טעונה${N.source?` · מקור: ${esc(N.source)}`:""}${N.version?` · גרסה: ${esc(N.version)}`:""}.
              מבחן או שכבה שאין להם טבלה מנוקדים יחסית לשכבה ומסומנים ב-<b>~</b>.</div>`}

        ${scored.length?`<div class="ft-idxsum">
          <div><span class="k">נוקדו</span><span class="v">${scored.length}/${rst.length}</span></div>
          <div><span class="k">ממוצע הכיתה</span><span class="v">${avg.toFixed(1)}</span></div>
          <div><span class="k">הגבוה</span><span class="v">${Math.max(...scored.map(r=>r.idx)).toFixed(1)}</span></div>
        </div>`:""}
      </div>

      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:center">
          <h2 style="margin:0"><span class="dot"></span> ציוני יכולת</h2>
          <div class="row" style="gap:7px">
            <button class="btn sm acc" id="ft-toGrades">✓ שלח לציונים</button>
            <button class="btn sm ghost" id="ft-idxCsv">⬇ CSV</button>
          </div>
        </div>
        ${rst.length?`<div class="tblwrap" style="margin-top:11px"><table class="tbl">
          <thead><tr><th>שם</th>${usedTests.map(t=>`<th>${esc(testById(t).em+" "+testById(t).name)}</th>`).join("")}<th>מדד</th></tr></thead>
          <tbody>${rows.map(r=>{
            const by={}; r.rows.forEach(x=>by[x.test]=x);
            return `<tr><td><b>${esc(r.s.name)}</b>${r.s.sex?`<span class="sx">${r.s.sex==="girls"?"בת":"בן"}</span>`:`<span class="sx none">מין לא ידוע</span>`}</td>
              ${usedTests.map(t=>{const x=by[t];
                return `<td class="mono">${x?x.sc.toFixed(0)+(x.src==="rel"&&mode==="norm"?"<b>~</b>":""):"—"}</td>`;}).join("")}
              <td class="mono" style="font-weight:800;color:var(--acc)">${r.idx!=null?r.idx.toFixed(1):"—"}</td></tr>`;
          }).join("")}</tbody></table></div>
          ${anyRel&&mode==="norm"?'<div class="hint" style="margin-top:7px"><b>~</b> = חושב יחסית לשכבה כי אין טבלת נורמה למבחן/שכבה האלה.</div>':""}
          ${rows.some(r=>r.partial)?`<div class="bw-warn" style="margin-top:9px">יש תלמידים עם תוצאות שעדיין בלי מדד.
            בניקוד יחסי דרושות לפחות ‎3‎ תוצאות באותו מבחן, באותה שכבה ובאותו מין — אחרת האחוזון הוא רעש ולא מדידה.
            הוסף תוצאות, סמן מין לתלמידים ב«👥 רשימה», או עבור לטבלת נורמה.</div>`:""}
          <div class="hint" style="margin-top:7px">«שלח לציונים» כותב את המדד לעמודת «מדד כושר» בלשונית הציונים,
            בקטגוריית היכולת, לתקופת ההערכה הפעילה. התאמה לפי שם.</div>`
          : `<div class="empty-state"><div class="big">👥</div>אין תלמידים ברשימת כיתה ${esc(c)}.</div>`}
      </div>`;

    $$("#ft-modeSeg button").forEach(b=>b.addEventListener("click",()=>{setScoreMode(b.dataset.m);renderIndex();}));
    const on=(sel,fn)=>{const e=$(sel);if(e)e.addEventListener("click",fn);};
    on("#ft-normsBtn",openNorms);
    on("#ft-idxPick",openIdxPick);
    on("#ft-toGrades",()=>sendToGrades(rows));
    on("#ft-idxCsv",()=>idxCsv(rows,usedTests));
  }

  function idxCsv(rows,usedTests){
    if(!rows.length){H().toast("אין נתונים");return;}
    const head=["שם","מין",...usedTests.map(t=>testById(t).name),"מדד"];
    const out=[head];
    rows.forEach(r=>{
      const by={}; r.rows.forEach(x=>by[x.test]=x);
      out.push([r.s.name,r.s.sex==="girls"?"בת":r.s.sex==="boys"?"בן":"",
        ...usedTests.map(t=>by[t]?by[t].sc.toFixed(0):""),r.idx!=null?r.idx.toFixed(1):""]);
    });
    H().dlCSV("מדד-כושר-"+cls()+"-"+today()+".csv",out);
  }

  /* כתיבת המדד לעמודת «מדד כושר» בלשונית הציונים */
  const IDX_COL="מדד כושר";
  function sendToGrades(rows){
    const scored=rows.filter(r=>r.idx!=null);
    if(!scored.length){H().toast("אין עדיין מדד לאף תלמיד בכיתה הזו");return;}
    const periods=LS().get("grades.periods",["רבעון 1"]);
    const period=periods[0];
    if(!confirm(`לכתוב את המדד של ${scored.length} תלמידים לעמודת «${IDX_COL}» בתקופה «${period}»?`))return;
    const cols=LS().get("grades.examCols",{});
    const arr=cols[period]=cols[period]||[];
    if(!arr.includes(IDX_COL)){arr.push(IDX_COL);LS().set("grades.examCols",cols);}
    const list=LS().get("stu.list",[]);
    let hit=0,miss=[];
    scored.forEach(r=>{
      const s=list.find(x=>x.name===r.s.name);
      if(!s){miss.push(r.s.name);return;}
      s.grades=s.grades||{}; s.grades[period]=s.grades[period]||{exams:{}};
      s.grades[period].exams=s.grades[period].exams||{};
      s.grades[period].exams[IDX_COL]=Math.round(r.idx);
      hit++;
    });
    LS().set("stu.list",list);
    H().toast(hit?`✓ נכתבו ${hit} ציוני יכולת ל«${period}»`+(miss.length?` · ${miss.length} לא נמצאו ב«התלמידים שלי»`:"")
      :"אף תלמיד מהרשימה לא נמצא ב«התלמידים שלי» — הוסף אותם שם קודם");
    if(window.STU&&window.STU.init)try{window.STU.init()}catch(e){}
  }

  /* ---------- בחירת המבחנים שנכנסים למדד ---------- */
  function openIdxPick(){
    const {$, $$, esc}=H();
    const want=idxTests();
    $("#ft-pickBody").innerHTML=TCATS.map(([cid,cnm,cem])=>{
      const items=TESTS.filter(t=>t.cat===cid&&t.kind!=="link");
      if(!items.length)return "";
      return `<div class="ft-grp"><div class="ft-grph">${cem} ${cnm}</div>
        ${items.map(t=>`<label class="check" style="padding:5px 0">
          <input type="checkbox" value="${t.id}"${want.includes(t.id)?" checked":""}> ${t.em} ${esc(t.name)}</label>`).join("")}</div>`;
    }).join("");
    H().modal("ft-pickModal");
    $("#ft-pickAll").onclick=()=>{ $$("#ft-pickBody input").forEach(i=>i.checked=false); };
    $("#ft-pickSave").onclick=()=>{
      setIdxTests($$("#ft-pickBody input:checked").map(i=>i.value));
      H().modal("ft-pickModal",false); renderIndex();
    };
  }

  /* ============================================================
     טבלת בית הספר — בסיס י״ב וגזירה לשכבות
     ------------------------------------------------------------
     הבסיס הוא הטבלה של המורה לכיתה י״ב (בנים). לכל שכבה מתחת
     לי״ב הדרישה מתרככת ב-2.5% למדרגה — כלומר בכיוון שמקל על
     התלמיד: במבחני ״גבוה=טוב״ הערך יורד, ובמבחני זמן הוא עולה.
     ז׳ יוצא ‎12.5%‎ מתחת לי״ב.

     כל ערך מעוגל לפי מה שהגיוני למדוד בשטח — קפיצה ל-5 ס״מ,
     ריצת 2000 ל-5 שניות, שאטל לעשירית, וחזרות למספר שלם.
     ============================================================ */
  const SCHOOL_BASE={
    ljump:   {step:5,   round:v=>Math.round(v/5)*5,        pts:[[270,100],[250,95],[240,90],[220,85],[210,80],[190,75],[180,70],[160,65]]},
    situp:   {step:1,   round:v=>Math.round(v),            pts:[[78,100],[73,95],[68,90],[63,85],[58,80],[53,75],[48,70],[43,65]]},
    shut4x10:{step:0.1, round:v=>Math.round(v*10)/10,      pts:[[8.90,100],[9.30,95],[9.70,90],[10.10,85],[10.50,80],[10.90,75],[11.30,70],[12.00,65]]},
    r2000:   {step:5,   round:v=>Math.round(v/5)*5,        pts:[[450,100],[465,95],[480,90],[500,85],[520,80],[550,75],[580,70],[610,65],[660,60]]},
    pull:    {step:1,   round:v=>Math.max(1,Math.round(v)),pts:[[15,100],[13,95],[11,90],[8,85],[6,80],[5,75],[4,70],[3,65]]},
    hang:    {step:1,   round:v=>Math.round(v),            pts:[[50,80],[20,60]]}
  };
  /* העיגול יכול להדביק שני ערכים סמוכים (למשל 4=75,4=70 במתח בכיתה ז׳).
     ערך כפול עם שני ניקודים שונים הופך את האינטרפולציה לשרירותית, ולכן
     כופים כאן ירידה/עלייה ממש — צעד אחד לפחות בין נקודות ציון סמוכות. */
  function enforceMono(vals,dir,step){
    const out=vals.slice();
    for(let i=1;i<out.length;i++){
      if(dir==="low"){ if(out[i]<=out[i-1])out[i]=+(out[i-1]+step).toFixed(4); }
      else{ if(out[i]>=out[i-1])out[i]=+Math.max(step,out[i-1]-step).toFixed(4); }
    }
    return out;
  }
  const SCHOOL_STEP={"יב":0,"יא":1,"י":2,"ט":3,"ח":4,"ז":5};
  const SCHOOL_PCT=0.025;

  function buildSchoolNorms(sex){
    const lines=[];
    Object.keys(SCHOOL_BASE).forEach(tid=>{
      const T=testById(tid); if(!T)return;
      const base=SCHOOL_BASE[tid];
      Object.keys(SCHOOL_STEP).forEach(g=>{
        const k=SCHOOL_STEP[g];
        const f=T.dir==="low" ? 1+k*SCHOOL_PCT : 1-k*SCHOOL_PCT;
        const raw=enforceMono(base.pts.map(([v])=>base.round(v*f)),T.dir,base.step);
        const pairs=base.pts.map(([,pt],i)=>raw[i]+"="+pt).join(",");
        lines.push(tid+"|"+sex+"|"+g+"|"+pairs);
      });
    });
    return lines.join("\n");
  }

  /* ---------- טבלת הנורמה ---------- */  /* ---------- טבלת הנורמה ---------- */
  function openNorms(){
    const {$, esc}=H(), N=norms();
    $("#ft-nSource").value=N.source||"";
    $("#ft-nVersion").value=N.version||"";
    $("#ft-nText").value=normsToText(N);
    $("#ft-nStat").textContent=statNorms(N);
    H().modal("ft-normsModal");
    $("#ft-nSave").onclick=()=>{
      try{
        const t=textToNorms($("#ft-nText").value);
        setNorms({version:$("#ft-nVersion").value.trim(),source:$("#ft-nSource").value.trim(),table:t});
        H().modal("ft-normsModal",false); H().toast("✓ טבלת הנורמה נשמרה"); renderIndex();
      }catch(e){ H().toast("שורה לא תקינה: "+e.message); }
    };
    $("#ft-nClear").onclick=()=>{ if(confirm("למחוק את כל טבלת הנורמה?")){setNorms(NORM_EMPTY);H().modal("ft-normsModal",false);renderIndex();} };
    $("#ft-nPreset").onclick=()=>{
      const sex=$("#ft-nPresetSex").value;
      const add=buildSchoolNorms(sex);
      const cur=$("#ft-nText").value.trim();
      $("#ft-nText").value=cur?cur+"\n"+add:add;
      if(!$("#ft-nSource").value.trim())$("#ft-nSource").value="טבלת בית הספר — בסיס י״ב";
      H().toast(sex==="girls"
        ? "⚠ נטענו "+add.split("\n").length+" שורות לבנות — עם אותם ערכים של הבסיס. ערוך אותן לפני שמירה"
        : "נטענו "+add.split("\n").length+" שורות לבנים — עבור עליהן ולחץ שמור");
    };
  }
  function statNorms(N){
    const t=N.table, tests=Object.keys(t);
    if(!tests.length)return "אין עדיין טבלה — הניקוד מחושב יחסית לשכבה.";
    let n=0; tests.forEach(k=>["boys","girls"].forEach(sx=>{ if(t[k][sx])n+=Object.keys(t[k][sx]).length; }));
    return tests.length+" מבחנים · "+n+" שילובי מין×שכבה";
  }
  function normsToText(N){
    const out=[];
    Object.keys(N.table).forEach(tid=>["boys","girls"].forEach(sx=>{
      const g=N.table[tid][sx]; if(!g)return;
      Object.keys(g).forEach(gr=>{
        out.push(tid+"|"+sx+"|"+gr+"|"+(g[gr]||[]).map(p=>p[0]+"="+p[1]).join(","));
      });
    }));
    return out.join("\n");
  }
  function textToNorms(txt){
    const table={};
    txt.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith("#")).forEach(line=>{
      const p=line.split("|").map(x=>x.trim());
      if(p.length!==4)throw new Error(line);
      const [tid,sx,gr,pairs]=p;
      if(!testById(tid))throw new Error("מבחן לא מוכר: "+tid);
      if(sx!=="boys"&&sx!=="girls")throw new Error("מין חייב להיות boys או girls: "+line);
      const pts=pairs.split(",").map(x=>{
        const [v,s2]=x.split("=").map(y=>+y.trim());
        if(!(v>=0)||!(s2>=0))throw new Error(line);
        return [v,s2];
      });
      if(pts.length<2)throw new Error("צריך לפחות שתי נקודות ציון: "+line);
      table[tid]=table[tid]||{}; table[tid][sx]=table[tid][sx]||{}; table[tid][sx][gr]=pts;
    });
    return table;
  }

  /* ============================================================
     7ג. אות החינוך הגופני
     ------------------------------------------------------------
     מתוך «אות החינוך הגופני — סטנדרטים להערכת הישגי התלמידים»
     (משרד החינוך, המזכירות הפדגוגית, תשס״ח/2007), פרק הכושר הגופני.

     זו לא טבלת נורמה אלא צבירת נקודות: 40 נקודות אפשריות, וזכאות
     לאות מותנית ב-32 לפחות, מהן 12 לפחות במבדק האירובי ובאימון
     המחזורי. המסמך אומר במפורש על המבדק האירובי — «אין מקום למדוד
     את ההספק כחלק מן ההערכה אלא לשם תיעוד ומעקב» — ולכן הרכיב הזה
     הוא עמידה בתקן ולא ביצוע. השכבות הן י–י״ב בלבד.
     ============================================================ */
  const OT_MAX=40, OT_PASS=32, OT_CORE_MIN=12;
  const OT_ITEMS=[
    {id:"aer",  em:"🫁", name:"מבדק אירובי",            max:9, kind:"three",
     d:"מאמץ אירובי רצוף 30 דק׳ (בכיתה י — 20–25 דק׳ בשני המועדים הראשונים), שלושה מועדים בשנה בהפרש 6 שבועות לפחות. 3 נק׳ לכל מועד שבו עמד בתקן."},
    {id:"cir",  em:"🔄", name:"אימון מחזורי",           max:9, kind:"three",
     d:"סבולת שרירית: 8–10 תחנות, שני סבבים, 2 דק׳ מנוחה ביניהם. כיתה י — 30/30 שנ׳; י״א–י״ב — 40/30 שנ׳. 3 נק׳ לכל מועד."},
    {id:"theory",em:"📖", name:"מבחן עיוני",            max:5, kind:"pct",
     d:"25–35 שאלות רב־ברירה או 7–10 פתוחות. 3 נק׳ ב-65% תשובות נכונות · 4 נק׳ ב-75% · 5 נק׳ ב-85% ומעלה."},
    {id:"part", em:"✅", name:"השתתפות ב-85% מהשיעורים",max:4, kind:"flag", d:"4 נק׳ על השתתפות פעילה ב-85% מהשיעורים לפחות."},
    {id:"club", em:"🏟", name:"פעילות קבועה מחוץ לשיעורים",max:5, kind:"flag", d:"5 נק׳ — אגודת ספורט, נבחרת בית ספר, להקת מחול, חוג ספורט וכדומה."},
    {id:"event",em:"🎽", name:"פעילות חד־פעמית",        max:3, kind:"count",d:"נקודה אחת לכל אירוע — תחרות, צעדה, כנס מחול. עד 3 נקודות."},
    {id:"diary",em:"📓", name:"יומן מעקב אישי",         max:5, kind:"flag", d:"5 נק׳ על הגשת יומן פעילות אישי (מטרות, תיעוד לפי תאריכים, הערכה מסכמת)."}
  ];
  const OT_CORE=["aer","cir"];

  const otAll =()=>LS().get("ft.ot",{});
  const otSet =o=>LS().set("ft.ot",o);
  function otRec(c,name){
    const all=otAll(), k=clsKey(c);
    return (all[k]&&all[k][name])||{aer:[0,0,0],cir:[0,0,0],theory:null,part:0,club:0,event:0,diary:0};
  }
  function otSave(c,name,rec){
    const all=otAll(), k=clsKey(c);
    all[k]=all[k]||{}; all[k][name]=rec; otSet(all);
  }
  /* ניקוד המבחן העיוני לפי הספים שבמסמך */
  function otTheory(pct){
    if(pct==null||pct==="")return 0;
    const v=+pct;
    if(v>=85)return 5; if(v>=75)return 4; if(v>=65)return 3; return 0;
  }
  function otScore(rec){
    const per={
      aer:(rec.aer||[]).filter(Boolean).length*3,
      cir:(rec.cir||[]).filter(Boolean).length*3,
      theory:otTheory(rec.theory),
      part:rec.part?4:0,
      club:rec.club?5:0,
      event:Math.min(3,+rec.event||0),
      diary:rec.diary?5:0
    };
    const total=Object.values(per).reduce((a,b)=>a+b,0);
    const core=per.aer+per.cir;
    return {per,total,core,ok:total>=OT_PASS&&core>=OT_CORE_MIN};
  }

  const OT_GRADES=["י","יא","יב"];

  function renderOt(){
    const {$, $$, esc}=H();
    const c=cls(), rst=roster(c);
    const eligible=OT_GRADES.includes(st.grade);
    const rows=rst.map(s=>({s,...otScore(otRec(c,s.name))}));
    const got=rows.filter(r=>r.ok).length;

    $("#ft-ot").innerHTML=`
      <div class="card">
        <h2><span class="dot"></span> אות החינוך הגופני — כיתה ${esc(c)}</h2>
        <div class="hint">צבירת נקודות לפי «אות החינוך הגופני — סטנדרטים להערכת הישגי התלמידים»,
          משרד החינוך, המזכירות הפדגוגית, תשס״ח/2007. <b>${OT_MAX}</b> נקודות אפשריות;
          זכאות ל<b>אות</b> מ-<b>${OT_PASS}</b> נקודות ומעלה, מהן <b>${OT_CORE_MIN}</b> לפחות
          במבדק האירובי ובאימון המחזורי.</div>
        ${!eligible?`<div class="bw-warn">האות מיועד לשכבות <b>י–י״ב</b>. השכבה שנבחרה היא ${esc(clsName(st.grade,st.num).replace(String(st.num),""))} —
          אפשר למלא, אבל זה חורג ממה שהמסמך מגדיר.</div>`:""}
        ${rows.length?`<div class="ft-idxsum">
          <div><span class="k">זכאים לאות</span><span class="v">${got}/${rows.length}</span></div>
          <div><span class="k">ממוצע נקודות</span><span class="v">${(rows.reduce((a,b)=>a+b.total,0)/rows.length).toFixed(1)}</span></div>
        </div>`:""}
        <details class="pf-help" style="margin-top:11px">
          <summary>מה נדרש בכל רכיב — מתוך המסמך</summary>
          <ol>${OT_ITEMS.map(it=>`<li><b>${it.em} ${esc(it.name)} (עד ${it.max} נק׳)</b> — ${esc(it.d)}</li>`).join("")}</ol>
        </details>
      </div>

      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:center">
          <h2 style="margin:0"><span class="dot"></span> טופס הערכה מסכמת</h2>
          <button class="btn sm ghost" id="ft-otCsv">⬇ CSV</button>
        </div>
        ${rst.length?`<div class="tblwrap" style="margin-top:11px"><table class="tbl ft-ottbl">
          <thead><tr><th>שם</th>
            <th title="מבדק אירובי — 3 מועדים">🫁 אירובי</th>
            <th title="אימון מחזורי — 3 מועדים">🔄 מחזורי</th>
            <th title="מבחן עיוני — אחוז תשובות נכונות">📖 עיוני %</th>
            <th title="השתתפות ב-85% מהשיעורים">✅</th>
            <th title="פעילות קבועה מחוץ לשיעורים">🏟</th>
            <th title="פעילות חד־פעמית — עד 3">🎽</th>
            <th title="יומן מעקב אישי">📓</th>
            <th>נק׳</th><th>אות</th></tr></thead>
          <tbody>${rows.map(r=>{
            const rec=otRec(c,r.s.name), n=esc(r.s.name);
            const three=(f)=>`<td class="ot-three">${[0,1,2].map(i=>
              `<button class="${(rec[f]||[])[i]?"on":""}" data-t3="${f}" data-i="${i}" data-n="${n}" title="מועד ${i+1}">${i+1}</button>`).join("")}</td>`;
            const flag=(f)=>`<td><button class="ot-flag${rec[f]?" on":""}" data-flag="${f}" data-n="${n}">${rec[f]?"✓":"—"}</button></td>`;
            return `<tr>
              <td><b>${n}</b></td>
              ${three("aer")}${three("cir")}
              <td><input class="ot-pct" type="number" min="0" max="100" data-pct="${n}" value="${rec.theory??""}" placeholder="%"></td>
              ${flag("part")}${flag("club")}
              <td class="ot-three"><button data-ev="${n}" class="${rec.event?"on":""}">${rec.event||0}</button></td>
              ${flag("diary")}
              <td class="mono" style="font-weight:800">${r.total}</td>
              <td>${r.ok?'<span class="pill acc">✓ זכאי</span>':`<span class="pill">${OT_PASS-r.total>0?"חסר "+(OT_PASS-r.total):"חסר ליבה"}</span>`}</td>
            </tr>`;}).join("")}</tbody></table></div>
          <div class="hint" style="margin-top:8px">מקישים על ספרות המועד כדי לסמן עמידה בתקן באותו מבדק ·
            «🎽» מתקדם ב-1 בכל הקשה עד 3 · «חסר ליבה» = יש מספיק נקודות בסך הכול, אבל פחות מ-${OT_CORE_MIN}
            במבדק האירובי ובאימון המחזורי יחד.</div>`
          : `<div class="empty-state"><div class="big">👥</div>אין תלמידים ברשימת כיתה ${esc(c)}.</div>`}
      </div>`;

    const upd=(name,fn)=>{ const rec=otRec(c,name); fn(rec); otSave(c,name,rec); renderOt(); };
    $$("#ft-ot [data-t3]").forEach(b=>b.addEventListener("click",()=>upd(b.dataset.n,r=>{
      r[b.dataset.t3]=(r[b.dataset.t3]||[0,0,0]).slice();
      r[b.dataset.t3][+b.dataset.i]=r[b.dataset.t3][+b.dataset.i]?0:1;
    })));
    $$("#ft-ot [data-flag]").forEach(b=>b.addEventListener("click",()=>upd(b.dataset.n,r=>{
      r[b.dataset.flag]=r[b.dataset.flag]?0:1; })));
    $$("#ft-ot [data-ev]").forEach(b=>b.addEventListener("click",()=>upd(b.dataset.ev,r=>{
      r.event=((+r.event||0)+1)%4; })));
    $$("#ft-ot [data-pct]").forEach(inp=>inp.addEventListener("change",()=>upd(inp.dataset.pct,r=>{
      r.theory=inp.value===""?null:Math.max(0,Math.min(100,+inp.value)); })));
    const cs=$("#ft-otCsv"); if(cs)cs.addEventListener("click",()=>otCsv(rows));
  }

  function otCsv(rows){
    if(!rows.length){H().toast("אין נתונים");return;}
    const out=[["שם","אירובי","מחזורי","עיוני","השתתפות","פעילות קבועה","חד־פעמית","יומן","סה״כ","זכאי לאות"]];
    rows.forEach(r=>out.push([r.s.name,r.per.aer,r.per.cir,r.per.theory,r.per.part,r.per.club,r.per.event,r.per.diary,
      r.total,r.ok?"כן":"לא"]));
    H().dlCSV("אות-החינוך-הגופני-"+cls()+"-"+today()+".csv",out);
  }

  /* ============================================================
     8. אתחול
     ============================================================ */
  /* מעבר בין «מבחנים» ל«מדד» — שתי הלשוניות חולקות את אותה בחירת כיתה */
  function renderTab(){
    const {$, $$}=H();
    $$("#ft-tabs button").forEach(b=>b.classList.toggle("on",b.dataset.ft===st.tab));
    const idx=st.tab==="idx", ot=st.tab==="ot";
    $("#ft-idx").style.display=idx?"":"none";
    $("#ft-ot").style.display=ot?"":"none";
    if(idx||ot){ $("#ft-pick").style.display="none"; $("#ft-run").style.display="none"; stopClock(true); stopCd();
      if(idx)renderIndex(); else renderOt(); }
    else if(st.test)renderRun();
    else renderPicker();
  }

  function init(){
    if(inited){ renderTab(); return; }
    inited=true;
    const last=LS().get("ft.last",{});
    if(last.grade)st.grade=last.grade;
    if(last.num)st.num=last.num;
    if(last.sort)st.sort=last.sort;
    H().$$("#ft-tabs button").forEach(b=>b.addEventListener("click",()=>{ st.tab=b.dataset.ft; renderTab(); }));
    renderTab();
  }

  return {init, tests:()=>TESTS, results:()=>allRes()};
})();
})();
