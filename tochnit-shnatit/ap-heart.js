"use strict";
/* ============================================================
   הלב והדופק · שינה, גדילה וגנטיקה
   שני מסכים אינטראקטיביים למודול הלמידה. הכול רץ במכשיר.
   ============================================================ */

/* ---------- עובדות על הלב ---------- */
window.AP_HEART_FACTS = [
 {em:"🔁", t:"100,000 פעימות ביום",
  d:"בערך 70 פעימות בדקה × 60 × 24. עד גיל 18 הלב שלכם כבר פעם יותר מ-600 מיליון פעמים, בלי הפסקה אחת."},
 {em:"🩸", t:"7,000 ליטר ביום",
  d:"כמות הדם שהלב מזיז ביממה — בערך אמבטיה מלאה כל שעה. וזה בזמן מנוחה."},
 {em:"💪", t:"הלב הוא שריר — אבל מסוג אחר",
  d:"שריר הלב לא מתעייף ולא צריך פקודה מהמוח כדי לפעום. יש בו קוצב טבעי משלו."},
 {em:"📉", t:"אימון מוריד את הדופק במנוחה",
  d:"לב מאומן שואב יותר דם בכל פעימה, ולכן צריך פחות פעימות. ספורטאי סבולת יכול להיות ב-45 פעימות בדקה."},
 {em:"⚡", t:"הדופק עולה עוד לפני שזזתם",
  d:"רק המחשבה על זינוק כבר מעלה את הדופק. המוח מכין את הגוף מראש — זו תגובת ההיערכות."},
 {em:"⏱️", t:"ההתאוששות מספרת יותר מהשיא",
  d:"כמה הדופק יורד בדקה הראשונה אחרי מאמץ הוא מדד כושר טוב יותר מהדופק המרבי עצמו."}
];

/* ---------- שלבי הלילה ---------- */
window.AP_SLEEP_STAGES = [
 {h:0, name:"נרדמים", em:"😌", color:"#a5b4fc",
  what:"המוח מאט, שרירים נרפים, הטמפרטורה יורדת. אצל מתבגרים זה קורה מאוחר יותר מאשר אצל ילדים ומבוגרים — זה ביולוגי, לא עצלנות."},
 {h:1, name:"שינה עמוקה — הגל הגדול", em:"🌊", color:"#6366f1",
  what:"כאן משתחרר הכי הרבה הורמון גדילה. רוב הבנייה של העצם והשריר קורית בשעה־שעתיים האלה."},
 {h:2, name:"עדיין עמוק", em:"🛠️", color:"#4f46e5",
  what:"תיקון רקמות, חידוש מאגרי אנרגיה בשריר, וחיזוק המערכת החיסונית."},
 {h:3, name:"REM ראשון", em:"🎬", color:"#8b5cf6",
  what:"חלומות. המוח מסדר את מה שלמדתם היום — כולל מיומנויות תנועה חדשות שתרגלתם בשיעור."},
 {h:4, name:"מחזור נוסף", em:"🔄", color:"#a78bfa",
  what:"הלילה בנוי ממחזורים של כ-90 דקות. בכל מחזור פחות שינה עמוקה ויותר REM."},
 {h:5, name:"יותר REM", em:"🧠", color:"#c084fc",
  what:"החלק הזה של הלילה חשוב לזיכרון ולוויסות הרגשי. מי שקם מוקדם מדי — מפספס בעיקר אותו."},
 {h:6, name:"לקראת יקיצה", em:"🌅", color:"#e9d5ff",
  what:"הגוף מעלה בהדרגה טמפרטורה וקורטיזול כדי להתעורר בצורה נעימה."},
 {h:7, name:"התעוררות טבעית", em:"☀️", color:"#fcd34d",
  what:"התעוררות בסוף מחזור (ולא באמצע שינה עמוקה) היא ההבדל בין «קמתי רענן» ל«קמתי הרוס»."}
];

/* ---------- גנטיקה או בידיים שלך ---------- */
window.AP_GENETICS = [
 {t:"הגובה שאליו תגיעו",              g:"genes", why:"כ-80% מהגובה מוסבר בגנטיקה. תזונה ושינה יכולות לעזור לממש את הפוטנציאל — לא לחרוג ממנו."},
 {t:"כמה חזק תהיו",                    g:"both",  why:"יש בסיס גנטי, אבל כוח הוא המדד שמשתפר הכי הרבה עם אימון. כאן ההשקעה משתלמת יותר מכל מדד אחר."},
 {t:"מבנה סיבי השריר (מהיר מול איטי)", g:"genes", why:"היחס בין סיבים מהירים לאיטיים נקבע ברובו גנטית — ולכן יש מי שנולד ספרינטר ויש מי שנולד רץ מרחקים."},
 {t:"כמה סבולת אירובית תפתחו",         g:"both",  why:"נקודת ההתחלה גנטית, אבל השיפור מהאימון עצום — הרבה יותר מההפרש ההתחלתי בין אנשים."},
 {t:"כמה שעות אתם ישנים",              g:"you",   why:"הצורך הביולוגי גנטי, אבל השעה שבה אתם נכנסים למיטה היא לגמרי בידיים שלכם."},
 {t:"גמישות",                          g:"both",  why:"יש מי שנולד גמיש יותר, אבל גמישות היא אחת התכונות שמשתנות הכי מהר עם עבודה קבועה."},
 {t:"אורך הגפיים",                     g:"genes", why:"קובע יתרון בענפים מסוימים — זרועות ארוכות בשחייה, רגליים ארוכות בקפיצה."},
 {t:"הטכניקה שלכם בכל ענף",            g:"you",   why:"מיומנות נלמדת. אף אחד לא נולד יודע לקלוע או להגיש בכדורעף."},
 {t:"מתי תיכנסו לקפיצת גדילה",         g:"genes", why:"התזמון תורשתי במידה רבה. לכן בכיתה אחת יש הפרש של שנתיים־שלוש בין תלמידים."},
 {t:"מה אתם אוכלים",                   g:"you",   why:"ההעדפות מושפעות מהבית ומההרגלים — וההרגלים ניתנים לשינוי."},
 {t:"דופק המנוחה שלכם",                g:"both",  why:"יש רכיב תורשתי, אבל אימון אירובי מוריד אותו משמעותית תוך שבועות."},
 {t:"כמה תתמידו",                      g:"you",   why:"ההתמדה היא המשתנה היחיד שקובע כמעט הכול לאורך זמן — והיא בבחירה שלכם."},
 {t:"צבע העיניים והשיער",              g:"genes", why:"תורשה טהורה. לא קשור לביצועים בשום צורה."},
 {t:"היציבה שלכם",                     g:"you",   why:"נבנית מהרגלים: ישיבה, נשיאת תיק, וחיזוק הגב — כולם ניתנים לשינוי."}
];
window.AP_GEN_GROUPS = [
 {id:"genes", name:"בעיקר גנטיקה", em:"🧬", color:"#818cf8"},
 {id:"both",  name:"קצת מזה וקצת מזה", em:"⚖️", color:"#38bdf8"},
 {id:"you",   name:"בידיים שלכם",   em:"💪", color:"#34d399"}
];

/* ---------- עובדות גדילה ---------- */
window.AP_GROWTH = [
 {em:"👟", t:"הרגליים גדלות ראשונות",
  d:"בקפיצת הגדילה כפות הרגליים והידיים גדלות לפני העצמות הארוכות, והגו מסיים אחרון. לכן פתאום הנעליים קטנות והמכנסיים קצרים — בסדר הזה."},
 {em:"📏", t:"עד 9–10 ס\"מ בשנה",
  d:"בשיא קפיצת הגדילה אפשר לגדול כמעט 10 ס\"מ בשנה אחת. זה הקצב המהיר ביותר מאז גיל שנתיים."},
 {em:"🤸", t:"למה פתאום מסורבלים",
  d:"העצם גדלה מהר יותר מהשריר והגיד. הגוף צריך «לכייל מחדש» את התיאום — וזה בדיוק למה בגיל הזה נראה שהתיאום נסוג. זה זמני."},
 {em:"🦵", t:"למה כואבות הברכיים",
  d:"אוסגוד-שלטר: הגיד מושך על עצם שעדיין גדלה. נפוץ מאוד בגיל 11–15 אצל ילדים פעילים, ובדרך כלל חולף. מפחיתים קפיצות, לא מפסיקים לזוז."},
 {em:"😴", t:"גדלים בלילה",
  d:"עיקר הפרשת הורמון הגדילה קורית בשינה העמוקה. שינה קצרה באופן קבוע בתקופת הגדילה פוגעת בדיוק בזמן הכי חשוב."},
 {em:"🥗", t:"סידן וחלבון בזמן הנכון",
  d:"צפיפות העצם שנבנית עד גיל 20 מלווה אתכם כל החיים. זו לא תקופה לדיאטות — זו תקופה לבנייה."}
];

/* ============================================================
   הממשק
   ============================================================ */
(function(){
const E = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $H = s => document.querySelector(s);
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];} return a; };

/* ---------- ציור הלב ---------- */
/* ph: 0..1 בתוך מחזור פעימה. 0–0.35 = סיסטולה (התכווצות) */
function heartSvg(ph){
  const sys = ph<0.35 ? Math.sin(ph/0.35*Math.PI) : 0;   /* 0..1..0 */
  const sq  = 1 - sys*0.13;                              /* כיווץ החדרים */
  const at  = ph>0.55 ? Math.sin((ph-0.55)/0.45*Math.PI) : 0; /* מילוי העליות */
  const aSc = 1 + at*0.08;
  return `<svg class="heartsvg" viewBox="0 0 260 240" role="img" aria-label="הלב פועם">
    <defs>
      <linearGradient id="hgB" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7cc4f5"/><stop offset="1" stop-color="#3b93d6"/></linearGradient>
      <linearGradient id="hgR" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f8798a"/><stop offset="1" stop-color="#dc3b52"/></linearGradient>
    </defs>

    <!-- כלי דם גדולים -->
    <path class="vessel vein"  d="M78,26 v34" /><text class="hlbl" x="78" y="20">מהגוף</text>
    <path class="vessel lung"  d="M120,26 v30"/><text class="hlbl" x="122" y="20">לריאות</text>
    <path class="vessel lungr" d="M158,26 v30"/><text class="hlbl" x="162" y="20">מהריאות</text>
    <path class="vessel art"   d="M198,26 v34"/><text class="hlbl" x="198" y="20">לגוף</text>

    <!-- צד ימין (דם עני בחמצן) -->
    <g transform="translate(96,74) scale(${aSc.toFixed(3)}) translate(-96,-74)">
      <rect class="ch b" x="62" y="56" width="68" height="38" rx="14"/>
      <text class="hin" x="96" y="80">עלייה ימנית</text>
    </g>
    <g transform="translate(96,146) scale(${sq.toFixed(3)}) translate(-96,-146)">
      <path class="ch b" d="M60,102 h72 v52 q0,26 -36,30 q-36,-4 -36,-30 Z"/>
      <text class="hin" x="96" y="140">חדר ימני</text>
    </g>

    <!-- צד שמאל (דם עשיר בחמצן) -->
    <g transform="translate(178,74) scale(${aSc.toFixed(3)}) translate(-178,-74)">
      <rect class="ch r" x="144" y="56" width="68" height="38" rx="14"/>
      <text class="hin" x="178" y="80">עלייה שמאלית</text>
    </g>
    <g transform="translate(178,146) scale(${sq.toFixed(3)}) translate(-178,-146)">
      <path class="ch r" d="M142,102 h72 v52 q0,30 -36,36 q-36,-6 -36,-36 Z"/>
      <text class="hin" x="178" y="140">חדר שמאלי</text>
      <text class="hin sm" x="178" y="156">הכי שרירי</text>
    </g>

    <!-- מסתמים: נפתחים בסיסטולה -->
    <g class="valve" opacity="${(0.35+sys*0.65).toFixed(2)}">
      <path d="M74,98 l22,${(6+sys*7).toFixed(1)} l22,-${(6+sys*7).toFixed(1)}"/>
      <path d="M156,98 l22,${(6+sys*7).toFixed(1)} l22,-${(6+sys*7).toFixed(1)}"/>
    </g>
    <text class="hnote" x="130" y="228">${sys>0.15?"סיסטולה — הלב דוחף דם החוצה":"דיאסטולה — הלב מתמלא"}</text>
  </svg>`;
}

function viewHeart(){
  const facts = window.AP_HEART_FACTS.map(f=>`
    <div class="hfact"><span class="em">${f.em}</span><b>${E(f.t)}</b><div>${E(f.d)}</div></div>`).join("");
  $H("#lbody").innerHTML=`
   <div class="card">
     <h2>🫀 הלב בפעולה</h2>
     <div class="hint">כחול = דם שחזר מהגוף בלי חמצן והולך לריאות · אדום = דם שחזר מהריאות עם חמצן ויוצא לכל הגוף.</div>
     <div id="heartBox">${heartSvg(0)}</div>
     <div class="hctl">
       <label>דופק <b id="bpmLbl">70</b> פעימות/דקה</label>
       <input type="range" id="bpm" min="45" max="200" value="70">
       <div class="hpresets">
         <button class="btn sm ghost" data-bpm="50">שינה</button>
         <button class="btn sm ghost" data-bpm="70">מנוחה</button>
         <button class="btn sm ghost" data-bpm="120">הליכה מהירה</button>
         <button class="btn sm ghost" data-bpm="165">ביפ טסט</button>
         <button class="btn sm ghost" data-bpm="195">ספרינט</button>
       </div>
       <div class="hout" id="hout"></div>
     </div>
   </div>

   <div class="card">
     <h2>⏱️ מדדו את הדופק שלכם</h2>
     <div class="hint">מניחים שתי אצבעות על הצוואר או על שורש כף היד, ומקישים על הכפתור בכל פעימה. אחרי 10 הקשות מתקבל הדופק.</div>
     <div class="tapwrap">
       <button class="tapbtn" id="tapBtn">הקישו<br>בכל פעימה</button>
       <div class="tapout"><b id="tapBpm">—</b><span id="tapInfo">0 הקשות</span>
         <button class="btn sm ghost" id="tapReset">אפס</button></div>
     </div>
   </div>

   <div class="card">
     <h2>🎯 אזורי דופק — לפי הגיל</h2>
     <label class="agelbl">גיל: <input type="number" id="hAge" min="10" max="20" value="14"> שנים</label>
     <div id="zones"></div>
     <div class="hint">הנוסחה הנפוצה לדופק מרבי היא 220 פחות הגיל. זו הערכה גסה בלבד — יש הפרשים גדולים בין אנשים,
       והיא לא מחליפה בדיקה רפואית.</div>
   </div>

   <div class="card"><h2>💡 שווה לדעת</h2><div class="hfacts">${facts}</div></div>

   <div class="card"><h2>🎬 לראות את זה באמת</h2>
     <div class="hint">האנימציה כאן היא סכמה. אלה מקורות שמראים את הלב האמיתי:</div>
     <div class="row"><b>אינטראקטיבי</b><span>הספרייה של איגוד הלב האמריקאי — אנימציה שאפשר לעצור בכל שלב של הפעימה וללחוץ על כל חלק.</span></div>
     <div class="links">
       <a class="btn sm" target="_blank" rel="noopener" href="https://watchlearnlive.heart.org/CVML_Player.php?moduleSelect=bldflo">זרימת הדם — Watch Learn Live ↗</a>
       <a class="btn sm ghost" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=BEWjOCVEN7M">מסלול הדם בלב (אנימציה) ↗</a>
       <a class="btn sm ghost" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=rf-rJRs2lLQ">איך הלב עובד — מחזור הלב ↗</a>
       <a class="btn sm ghost" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=%D7%9E%D7%97%D7%96%D7%95%D7%A8+%D7%94%D7%93%D7%9D+%D7%91%D7%92%D7%95%D7%A3+%D7%94%D7%90%D7%93%D7%9D+%D7%94%D7%A1%D7%91%D7%A8+%D7%A7%D7%A6%D7%A8">חיפוש בעברית ↗</a>
     </div>
   </div>`;
  wireHeart();
}

let HB=null, HPH=0, HBPM=70;
function wireHeart(){
  const rng=$H("#bpm");
  const setB=v=>{ HBPM=+v; $H("#bpmLbl").textContent=HBPM; rng.value=HBPM; outHeart(); };
  rng.oninput=()=>setB(rng.value);
  document.querySelectorAll("[data-bpm]").forEach(b=>b.onclick=()=>setB(b.dataset.bpm));
  if(HB) clearInterval(HB);
  HB=setInterval(()=>{
    HPH = (HPH + (HBPM/60)*0.05) % 1;
    const box=$H("#heartBox");
    if(!box){ clearInterval(HB); HB=null; return; }
    box.innerHTML=heartSvg(HPH);
  },50);
  outHeart(); wireTap(); wireZones();
}
function outHeart(){
  const el=$H("#hout"); if(!el) return;
  /* נפח פעימה משוער יורד מעט בדפקים גבוהים מאוד — מספיק להמחשה */
  const sv = HBPM<160 ? 75 : 75 - (HBPM-160)*0.35;
  const co = (HBPM*sv/1000);
  el.innerHTML=`<div class="stat"><b>${co.toFixed(1)}</b><span>ליטר דם בדקה</span></div>
    <div class="stat"><b>${Math.round(HBPM*60/1000)}k</b><span>פעימות בשעה</span></div>
    <div class="stat"><b>${(60/HBPM).toFixed(2)}</b><span>שניות לפעימה</span></div>`;
}
let TAPS=[];
function wireTap(){
  const btn=$H("#tapBtn"); if(!btn) return;
  btn.onclick=()=>{
    const now=performance.now();
    if(TAPS.length && now-TAPS[TAPS.length-1]>4000) TAPS=[];
    TAPS.push(now);
    if(TAPS.length>12) TAPS.shift();
    const n=TAPS.length;
    $H("#tapInfo").textContent = n<2 ? `${n} הקשות` : `${n} הקשות`;
    if(n>=3){
      const span=(TAPS[n-1]-TAPS[0])/(n-1);
      $H("#tapBpm").textContent=Math.round(60000/span);
    }
    btn.classList.remove("pulse"); void btn.offsetWidth; btn.classList.add("pulse");
  };
  $H("#tapReset").onclick=()=>{TAPS=[];$H("#tapBpm").textContent="—";$H("#tapInfo").textContent="0 הקשות";};
}
function wireZones(){
  const age=$H("#hAge"); if(!age) return;
  const draw=()=>{
    const a=Math.max(10,Math.min(20,+age.value||14)), max=220-a;
    const Z=[
      {n:"התאוששות",  lo:.50,hi:.60,c:"#93c5fd",w:"חימום, שחרור וירידה אחרי מאמץ"},
      {n:"אירובי קל", lo:.60,hi:.70,c:"#6ee7b7",w:"בניית בסיס. אפשר לדבר משפט שלם"},
      {n:"אירובי",    lo:.70,hi:.80,c:"#fcd34d",w:"שיפור סבולת לב־ריאה. אפשר משפט קצר"},
      {n:"סף",        lo:.80,hi:.90,c:"#fb923c",w:"קשה. אפשר רק מילה־שתיים"},
      {n:"מרבי",      lo:.90,hi:1.0,c:"#f87171",w:"ספרינט. אי אפשר לדבר, ולא לאורך זמן"}
    ];
    $H("#zones").innerHTML=`<div class="maxhr">דופק מרבי משוער: <b>${max}</b></div>`+
      Z.map(z=>`<div class="zrow" style="--c:${z.c}">
        <b>${E(z.n)}</b><span class="zr">${Math.round(max*z.lo)}–${Math.round(max*z.hi)}</span>
        <span class="zw">${E(z.w)}</span></div>`).join("");
  };
  age.oninput=draw; draw();
}

/* ---------- שינה, גדילה וגנטיקה ---------- */
let SLEEP_PICK=0, GEN=null;
function viewSleep(){
  const S=window.AP_SLEEP_STAGES, st=S[SLEEP_PICK];
  const growth=window.AP_GROWTH.map(g=>`
    <div class="hfact"><span class="em">${g.em}</span><b>${E(g.t)}</b><div>${E(g.d)}</div></div>`).join("");
  $H("#lbody").innerHTML=`
   <div class="card">
     <h2>🌙 מה קורה בגוף בזמן שאתם ישנים</h2>
     <div class="hint">לוחצים על שעה בלילה ורואים מה הגוף עושה בה.</div>
     <div class="nightbar">${S.map((x,i)=>`
       <button class="nb${i===SLEEP_PICK?" on":""}" data-sl="${i}" style="--c:${x.color}">
         <span>${x.em}</span><small>שעה ${i+1}</small></button>`).join("")}</div>
     <div class="stagecard" style="--c:${st.color}">
       <b>${st.em} ${E(st.name)}</b><div>${E(st.what)}</div></div>
   </div>

   <div class="card">
     <h2>⏰ מתי ללכת לישון</h2>
     <div class="hint">הלילה בנוי ממחזורים של כ-90 דקות. להתעורר בסוף מחזור עדיף על להתעורר באמצע שינה עמוקה.</div>
     <label class="agelbl">אני צריך לקום ב־ <input type="time" id="wakeT" value="07:00"></label>
     <div id="bedOut"></div>
   </div>

   <div class="card">
     <h2>🧬 גנטיקה או בידיים שלכם?</h2>
     <div class="hint">משחק מיון: לכל תכונה — כמה ממנה נקבע בגנים, וכמה תלוי בכם.</div>
     <div id="genBox"></div>
   </div>

   <div class="card"><h2>📈 קפיצת הגדילה</h2><div class="hfacts">${growth}</div></div>`;
  document.querySelectorAll("[data-sl]").forEach(b=>b.onclick=()=>{SLEEP_PICK=+b.dataset.sl;viewSleep();});
  wireBed(); startGen();
}
function wireBed(){
  const t=$H("#wakeT"); if(!t) return;
  const draw=()=>{
    const [h,m]=(t.value||"07:00").split(":").map(Number);
    const wake=new Date(2000,0,2,h,m);
    const rows=[6,5].map(cy=>{
      const d=new Date(wake.getTime()-(cy*90+15)*60000);
      const hh=String(d.getHours()).padStart(2,"0"), mm=String(d.getMinutes()).padStart(2,"0");
      return {cy, time:`${hh}:${mm}`, hrs:(cy*1.5).toFixed(1)};
    });
    $H("#bedOut").innerHTML = rows.map(r=>`
      <div class="bedrow${r.cy===6?" best":""}">
        <b><bdi dir="ltr">${r.time}</bdi></b>
        <span>${r.cy} מחזורים · ${r.hrs} שעות שינה</span>
        ${r.cy===6?'<span class="tag">מומלץ למתבגרים</span>':''}</div>`).join("")
      + `<div class="hint">כולל כ-15 דקות להירדמות. ההמלצה לגיל 13–18 היא 8–10 שעות — כלומר 6 מחזורים ומעלה.</div>`;
  };
  t.oninput=draw; draw();
}
function startGen(){
  GEN={q:shuffle(window.AP_GENETICS),i:0,ok:0,wrong:[]};
  drawGen();
}
function drawGen(){
  const G=window.AP_GEN_GROUPS, box=$H("#genBox"); if(!box) return;
  const it=GEN.q[GEN.i];
  if(!it){
    return box.innerHTML=`<div class="fb ok"><b>סיימתם — ${GEN.ok} מתוך ${GEN.q.length}</b>
      ${GEN.wrong.length?`<div class="review"><b>לחזור על:</b><ul>${GEN.wrong.map(w=>
        `<li>${E(w.t)} — <b>${E(G.find(g=>g.id===w.g).name)}</b></li>`).join("")}</ul></div>`:""}
      <button class="btn" id="genAgain">🔄 שוב</button></div>`
      , $H("#genAgain") && ($H("#genAgain").onclick=startGen);
  }
  box.innerHTML=`
    <div class="qbar"><i style="width:${Math.round(GEN.i/GEN.q.length*100)}%"></i></div>
    <div class="sortitem"><b>${E(it.t)}</b><small>${GEN.i+1} מתוך ${GEN.q.length} · נכון: ${GEN.ok}</small></div>
    <div class="sgroups">${G.map(g=>`<button class="sgrp" data-gg="${g.id}" style="--c:${g.color}">
      <span class="em">${g.em}</span><b>${E(g.name)}</b></button>`).join("")}</div>
    <div id="genfb"></div>`;
  document.querySelectorAll("[data-gg]").forEach(b=>b.onclick=()=>{
    const pick=b.dataset.gg, ok=(pick===it.g);
    if(ok) GEN.ok++; else GEN.wrong.push(it);
    document.querySelectorAll("[data-gg]").forEach(x=>{
      x.disabled=true;
      if(x.dataset.gg===it.g) x.classList.add("right");
      else if(x.dataset.gg===pick) x.classList.add("wrong");
    });
    $H("#genfb").innerHTML=`<div class="fb ${ok?"ok":"no"}">
      <b>${ok?"✓ נכון":"✕ התשובה: "+E(G.find(g=>g.id===it.g).name)}</b>
      <div>${E(it.why)}</div><button class="btn" id="genNext">הבא ←</button></div>`;
    $H("#genNext").onclick=()=>{GEN.i++;drawGen();};
  });
}
function stopHeart(){ if(HB){clearInterval(HB);HB=null;} }

window.HEART = {viewHeart, viewSleep, stopHeart};
})();
