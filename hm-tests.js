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
/* שכבות, מספרים ובניית שם כיתה חיים ב-hm-data.js. הם היו כאן,
   ו-clsKey אף היה משוכפל בשני קבצים — שתי הגדרות של אותה השוואה
   הן שתי הזדמנויות שהן ייפרדו. */
const GRADES=window.HMDATA.GRADES;
const NUMS=window.HMDATA.NUMS;
const clsName=window.HMDATA.clsName;
/* השוואת שם כיתה סלחנית — המורה מקליד «ט2», «ט׳2», «ט' 2» וכולם אותו דבר */
const clsKey=window.HMDATA.clsKey;

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
  {id:"pbars",em:"🤸", name:"מקבילים",            cat:"reps", kind:"count", dir:"high", unit:"חזרות",
   hint:"שכיבות שמיכה במקבילים: ירידה עד 90° במרפק, פשיטה מלאה למעלה. גוף יציב בלי נדנוד."},
  {id:"gaks", em:"💪", name:"גקסונים (מקבילים על ספסל)", cat:"reps", kind:"count", dir:"high", unit:"חזרות", cap:80,
   hint:"כמו מקבילים, אבל הרגליים נוגעות בקרקע — הידיים אחורה על ספסל שוודי, כיסא או מדרגה, ירידה עד 90° במרפק ופשיטה מלאה. עובד על היד האחורית. החלופה למי שלא מצליח במקבילים: מינימום 20 חזרות לעבור, והתקרה 80 — כי לא נושאים את כל משקל הגוף."},
  {id:"invrow",em:"🪜", name:"מתח אוסטרלי (חתירה אופקית)", cat:"reps", kind:"count", dir:"high", unit:"חזרות", cap:85,
   hint:"מוט נמוך, גוף ישר באלכסון, חזה נוגע במוט. החלופה למי שלא מצליח במתח — ציון מרבי 85."},
  {id:"rope", em:"🪢", name:"טיפוס חבל",          cat:"reps", kind:"value", dir:"high", unit:"מ׳",
   hint:"מודדים את הגובה שהתלמיד הגיע אליו. בלי רגליים — בהתאם לרמת הכיתה."},
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

/* חישובי הניקוד עברו ל-hm-data.js בלי שינוי התנהגות. הם הלוגיקה
   שקובעת ציון לתלמיד, והם היו עד עכשיו ללא בדיקה אחת — כאן אי אפשר
   היה לבדוק אותם בלי דפדפן, ושם אפשר. */
const scoreFromPoints=window.HMDATA.scoreFromPoints;
const clamp100=window.HMDATA.clamp100;
const percentile=window.HMDATA.percentile;

/* ============================================================
   3. המודול
   ============================================================ */
window.FT=(function(){
  let inited=false;
  let st={grade:"ז",num:1,test:null,sort:"todo",tab:"tests"};
  let clk={on:false,t0:0,raf:0,paused:0};      /* השעון המשותף לכיתה */
  /* הקפות של המקצה הנוכחי: {שם: [זמן הקפה 1, 2, ...]}. חי בזיכרון בזמן
     המקצה; הזמן הסופי נשמר כרגיל, והפערים נשמרים איתו לצפייה מאוחרת. */
  let lapRun={};
  /* שמות שסומנו ל«ניסיון חדש» — המדידה הבאה שלהם תיפתח כרשומה נפרדת */
  let pendingNew={};
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
  function setRoster(c,list){
    const all=rosters(); all[clsKey(c)]=list; setRosters(all);
    /* כיתה נכנסת לרישום ברגע שיש לה רשימה — זאת הנקודה היחידה שבה
       כיתה «נוצרת» בפועל. registerClass לא כותב אם היא כבר רשומה,
       ולכן זה לא מייקר שמירה חוזרת. */
    registerCls(c);
  }
  /* הרישום דורש store בסגנון hm-data; עוטפים את LS פעם אחת. */
  const clsStore={get:(k,d)=>LS().get(k,d===undefined?null:d),set:(k,v)=>LS().set(k,v)};
  function registerCls(c){ try{ return DATA.registerClass(clsStore,c); }catch(e){ return null; } }

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

  /* ============================================================
     זהות תלמיד
     ------------------------------------------------------------
     עד עכשיו כל חיפוש היסטוריה כאן עבד על r.name===name. זה עבד
     מצוין עד הרגע שבו מורה תיקן שגיאת כתיב בשם: באותו רגע כל
     המדידות של התלמיד התנתקו ממנו בשקט ונשארו בקובץ בלי שאיש
     יראה אותן שוב. אותו דבר קרה לשני תלמידים בעלי אותו שם, רק
     בכיוון ההפוך — הם חלקו היסטוריה אחת.

     עכשיו המזהה קובע והשם הוא תצוגה בלבד. רשומה ישנה בלי מזהה
     עדיין נמצאת לפי שם, אחרת המעבר עצמו היה מוחק היסטוריה.

     ההשוואה עצמה יושבת ב-hm-data.js ולא כאן, כי היא הדבר היחיד
     באפליקציה שחייב להיות מכוסה בבדיקות שרצות בלי דפדפן.
     ============================================================ */
  const DATA=window.HMDATA;
  const refKey=s=>DATA.refKey(s);
  /* מפתח יציב → תלמיד. שני תלמידים בעלי אותו שם מקבלים שני מפתחות
     שונים, ולכן נשארים שני תלמידים נפרדים גם בממשק. */
  function studByKey(c,key){
    const k=String(key==null?"":key);
    const hit=roster(c).find(s=>refKey(s)===k);
    if(hit)return hit;
    /* המפתח קיים ב-DOM אבל התלמיד כבר לא ברשימה — נמחק באמצע
       השיעור, או שהרשימה התחלפה. משחזרים ממנו את מה שאפשר כדי
       שהמדידות שלו עדיין יימצאו, ולא ממציאים שם. */
    if(k.indexOf("id:")===0)return {id:k.slice(3),name:""};
    if(k.indexOf("nm:")===0)return {name:k.slice(3)};
    return {name:k};
  }
  const nameOf=(c,key)=>studByKey(c,key).name||"";
  /* מקבל תלמיד, מפתח או שם. השם נשאר נתמך בכוונה: הוא נקודת
     הכניסה של הרשומות הישנות ושל מודולים אחרים שיודעים רק שם. */
  function asStud(c,who){
    if(who&&typeof who==="object")return who;
    const k=String(who==null?"":who);
    if(k.indexOf("id:")===0||k.indexOf("nm:")===0)return studByKey(c,k);
    return roster(c).find(x=>x.name===k)||{name:k};
  }

  /* ---------- תוצאות ---------- */
  const resultsFor=(c,testId)=>allRes().filter(r=>clsKey(r.cls)===clsKey(c)&&r.test===testId);
  /* כל המדידות של תלמיד אחד בכיתה אחת ובמבחן אחד */
  const resultsOf=(c,who)=>{ const s=asStud(c,who), k=clsKey(c);
    return allRes().filter(r=>clsKey(r.cls)===k&&DATA.sameStudent(r,s)); };
  /* ---------- ניסיונות ----------
     כל מדידה נשמרת כרשומה נפרדת, ולא דורסת את הקודמת. תלמיד יכול
     לנסות שוב באותו שיעור וגם בשיעור אחר, וההיסטוריה נשמרת כדי
     שאפשר יהיה לראות התקדמות. התוצאה שנחשבת היא תמיד הטובה ביותר. */
  function attempts(c,testId,who){
    return DATA.attemptsOf(allRes(),c,testId,asStud(c,who));
  }
  function bestOf(T,list){
    if(!list||!list.length)return null;
    return list.reduce((a,b)=>better(T,b.val,a.val)?b:a);
  }
  /* הטובה ביותר אי פעם — זו שנכנסת לניקוד ולמדד */
  function bestResult(c,testId,who){
    return bestOf(testById(testId),attempts(c,testId,who));
  }
  /* הטובה של היום — מה שנמדד בשיעור הנוכחי */
  function todayResult(c,testId,who){
    return bestOf(testById(testId),attempts(c,testId,who).filter(r=>r.d===today()));
  }
  /* הטובה מלפני היום — בסיס להשוואת התקדמות */
  function prevResult(c,testId,who){
    return bestOf(testById(testId),attempts(c,testId,who).filter(r=>r.d!==today()));
  }
  /* הרשומה שנערכת כרגע: האחרונה של היום. מונה חזרות והזנת מדידה
     מעדכנים אותה במקום ליצור ניסיון חדש בכל הקשה. */
  function openAttempt(c,testId,who){
    const t=attempts(c,testId,who).filter(r=>r.d===today());
    return t.length?t[t.length-1]:null;
  }
  function saveVal(c,testId,stud,val,fresh){
    const T=testById(testId); if(!T||!(val>0))return;
    const rs=allRes();
    let i=-1;
    if(!fresh){
      const cur=openAttempt(c,testId,stud);
      if(cur)i=rs.findIndex(r=>r.id===cur.id);
    }
    const rec={id:i>=0?rs[i].id:"f"+Date.now()+Math.random().toString(36).slice(2,6),
      ts:Date.now(),d:today(),cls:c,cid:DATA.classId(c),test:testId,
      name:stud.name,sid:DATA.studentKey(stud),
      gradeKey:st.grade,sex:stud.sex||null,
      /* גרסת כללי הניקוד שהיו בתוקף כשהמדידה נלקחה. הציון עצמו לא
         נשמר — הוא נגזר בכל תצוגה — אבל בלי החותמת הזאת החלפת טבלת
         נורמה הייתה משנה בשקט את הפרשנות של כל ההיסטוריה. */
      normVer:normVersion(),
      /* אם יש שיעור פתוח לאותה כיתה — המדידה יודעת באיזה שיעור
         נלקחה. זה הקשר בלבד: המדידה נשארת רשומה עצמאית עם sid,
         cid, מבחן, תאריך וערך גולמי, וכל אלה קודמים ל-sessionId. */
      sessionId:sessionFor(c),
      val:+(+val).toFixed(2),unit:T.unit};
    if(i>=0)rs[i]=rec; else rs.push(rec);
    setRes(rs);
  }
  function delAttempt(id){ setRes(allRes().filter(r=>r.id!==id)); }
  function clearVal(c,testId,who){
    const s=asStud(c,who), k=clsKey(c);
    setRes(allRes().filter(r=>!(clsKey(r.cls)===k&&r.test===testId&&DATA.sameStudent(r,s)&&r.d===today())));
  }
  /* «better» מוגדר למטה יחד עם fmtVal — כאן רק מפנים אליו */

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
  /* ארכיון הטבלאות: כל טבלה שנשמרה תחת שם גרסה נשמרת גם כאן, כדי
     שמדידה ישנה תמשיך להיות מנוקדת מול הכללים שהיו בתוקף כשנלקחה.
     בלי זה, טעינת טבלה חדשה הייתה משנה למפרע את הציון של כל
     ההיסטוריה — ודוח התקדמות היה מראה שיפור שלא קרה. */
  const normArchive=()=>LS().get("ft.normArchive",{})||{};
  const setNorms=n=>{
    LS().set("ft.normArchive",DATA.archiveNorm(normArchive(),n));
    LS().set("ft.norms",n);
  };
  const scoreMode=()=>LS().get("ft.scoreMode","rel");
  /* מזהה גרסת הכללים: שם הגרסה שהמורה הקליד בטבלת הנורמה, ואם אין —
     מחרוזת ריקה, שמשמעותה «ניקוד יחסי בלבד». */
  const normVersion=()=>String(norms().version||"");
  /* מזהה השיעור הפעיל — רק אם הוא של הכיתה הנמדדת. מדידה בכיתה
     אחרת באמצע שיעור פתוח אינה שייכת לשיעור ההוא. */
  function sessionFor(c){
    try{
      const a=H().session&&H().session.active();
      return (a&&a.cid===DATA.classId(c))?a.id:null;
    }catch(e){ return null; }
  }
  const setScoreMode=m=>LS().set("ft.scoreMode",m);
  /* אילו מבחנים נכנסים למדד. ריק = כל מבחן שיש לו תוצאה. */
  const lapsFor   =tid=>Math.max(1,+((LS().get("ft.laps",{}))[tid]||1));
  const setLapsFor=(tid,n)=>{ const a=LS().get("ft.laps",{}); a[tid]=Math.max(1,Math.min(20,n)); LS().set("ft.laps",a); };
  const idxTests   =()=>LS().get("ft.idxTests",[]);
  const setIdxTests=a=>LS().set("ft.idxTests",a);

  const sexOf=stud=>stud&&stud.sex==="girls"?"girls":stud&&stud.sex==="boys"?"boys":null;

  /* ניקוד לפי טבלת נורמה — מחזיר null אם אין טבלה למבחן/מין/שכבה */
  function normScore(testId,sex,grade,val){
    return DATA.normScore(norms().table,testId,sex,grade,val);
  }
  /* ניקוד יחסי — מול כל התוצאות באותו מבחן, באותה שכבה, ובאותו מין אם ידוע */
  function relScore(testId,sex,grade,val){
    const T=testById(testId); if(!T)return null;
    return DATA.relScore(allRes(),testId,sex,grade,val,T.dir);
  }
  /* הציון הסופי לתוצאה בודדת + מאיפה הוא הגיע */
  /* מבחן חלופי נושא תקרת ציון: הוא מאפשר לעבור, אבל לא להגיע לציון
     של המבחן המלא — אחרת אין שום תמריץ לנסות את הקשה. */
  const capOf=tid=>{ const T=testById(tid); return T&&T.cap?T.cap:100; };
  function scoreOne(testId,stud,grade,val){
    const T=testById(testId);
    return DATA.scoreOne({mode:scoreMode(),table:norms().table,rows:allRes(),
      testId,sex:sexOf(stud),grade,val,dir:T&&T.dir,cap:capOf(testId)});
  }
  /* המדד המשוקלל של תלמיד: ממוצע הציונים על המבחנים שנבחרו */
  function indexFor(c,stud,grade){
    const want=idxTests();
    const mine=resultsOf(c,stud);
    /* התוצאה האחרונה בכל מבחן */
    /* המדד מנקד את התוצאה הטובה ביותר בכל מבחן, לא את האחרונה */
    const byTest={};
    mine.forEach(r=>{ const T2=testById(r.test); if(!T2)return;
      if(!byTest[r.test]||better(T2,r.val,byTest[r.test].val))byTest[r.test]=r; });
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

    renderAmb();
    wireStartLesson();
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
    st.test=id; stopClock(true); stopCd(); lapRun={}; pendingNew={}; clk.paused=0;
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
    const valOf=s=>{const r=todayResult(c,T.id,s);return r?r.val:null;};
    if(st.sort==="todo")      rst.sort((a,b)=>(valOf(a)==null?0:1)-(valOf(b)==null?0:1));
    else if(st.sort==="name") rst.sort((a,b)=>a.name.localeCompare(b.name,"he"));
    else if(st.sort==="res")  rst.sort((a,b)=>{
      const x=valOf(a),y=valOf(b);
      if(x==null&&y==null)return 0; if(x==null)return 1; if(y==null)return -1;
      return T.dir==="low"?x-y:y-x; });

    const done=rst.filter(s=>valOf(s)!=null);
    const vals=done.map(s=>valOf(s));
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
           ${T.dir==="low"?`<div class="row" style="justify-content:center;align-items:center;gap:9px;margin-top:11px">
             <span class="hint">מספר הקפות לכל רץ</span>
             <div class="ft-lapsel" id="ft-lapSel">${[1,2,3,4,5].map(n=>
               `<button data-lp="${n}" class="${lapsFor(T.id)===n?"on":""}">${n}</button>`).join("")}</div>
           </div>`:""}
           <div class="hint" style="margin-top:8px;text-align:center">
             ${T.dir==="low"
               ? (lapsFor(T.id)>1
                  ? "הקש על שם התלמיד בכל מעבר. ההקפה האחרונה היא הסיום."
                  : "הקש על שם התלמיד ברגע שהוא חוצה את הקו")
               : "הקש על שם התלמיד ברגע שהוא מפסיק"} — הזמן נרשם אוטומטית.</div>
         </div>
         <div id="ft-splits"></div>`
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
      /* המפתח שיושב ב-DOM הוא המזהה, לא השם. זה מה שמאפשר לשני
         תלמידים בשם «דן כהן» לחיות באותה רשימה בלי לדרוס זה את זה. */
      const k=refKey(s);
      const all=attempts(c,T.id,s);
      const r=todayResult(c,T.id,s), pv=prevResult(c,T.id,s);
      const bst=bestOf(T,all);
      const isPR=!!(r&&bst&&r.id===bst.id&&all.length>1);   /* השיא האישי נקבע היום */
      let delta="";
      if(r&&pv){
        const imp=better(T,r.val,pv.val);
        delta=`<span class="dl ${imp?"up":"down"}">${imp?"▲":"▼"} ${fmtVal(T,Math.abs(r.val-pv.val))}</span>`;
      }
      return `<div class="ft-row${r?" done":""}" data-n="${esc(k)}" data-nm="${esc(s.name)}">
        <div class="nm" data-card="${esc(k)}" title="כרטיס התלמיד">${esc(s.name)}${
          all.length?`<span class="pv">${
            bst?`⭐ הטוב: ${fmtVal(T,bst.val)}`:""}${all.length>1?` · ${all.length} ניסיונות`:""}</span>`:""}</div>
        <div class="vl${isPR?" pr":""}" data-hist="${esc(k)}" title="היסטוריית ניסיונות">${
          r?fmtVal(T,r.val):"—"}${delta}</div>
        ${T.kind==="clock"
          ? (()=>{ const need=T.dir==="low"?lapsFor(T.id):1, done=(lapRun[k]||[]).length;
              const lbl=r?"↺ שוב":(need>1?`⏱ ${done+1}/${need}`:"⏱ קלוט");
              return `<button class="btn sm ${r?"ghost":"acc"}" data-cap="${esc(k)}">${lbl}</button>`; })()
          : T.kind==="count"
          ? `<div class="ft-step">
               <button class="plus" data-inc="${esc(k)}">+</button>
               <b>${pendingNew[k]?0:Math.round((openAttempt(c,T.id,s)||{}).val||0)}</b>
               <button data-dec="${esc(k)}">−</button>
             </div>`
          : `<input class="ft-num" type="number" inputmode="decimal" step="0.1" min="0"
               data-val="${esc(k)}" value="${pendingNew[k]?"":((openAttempt(c,T.id,s)||{}).val??"")}" placeholder="${esc(T.unit)}">`}
        ${T.kind!=="clock"&&openAttempt(c,T.id,s)&&!pendingNew[k]
          ?`<button class="btn sm ghost" data-new="${esc(k)}" title="ניסיון נוסף">+ ניסיון</button>`:""}
        ${pendingNew[k]?'<span class="pill acc">ניסיון חדש</span>':""}
        ${r?`<button class="btn sm stop" data-del="${esc(k)}">✕</button>`:""}
      </div>`;}).join("")
      : `<div class="empty-state"><div class="big">👥</div>אין תלמידים ברשימת כיתה ${esc(c)}.<br>
         לחץ «👥 רשימה» כדי לייבא מ«התלמידים שלי», להדביק רשימה, או להוסיף ידנית.</div>`;

    wireRun();
    renderSplits();
  }

  /* ---------- עדכון שורה במקום, בלי לרנדר מחדש ----------
     באמצע מקצה אסור שהרשימה תזוז מתחת לאצבע — מיון מחדש קורה
     רק כשהמורה בוחר אותו במפורש. */
  function refreshRow(key){
    const {$, esc}=H(), T=testById(st.test), c=cls();
    const row=document.querySelector('#ft-list .ft-row[data-n="'+CSS.escape(key)+'"]');
    if(!row)return;
    const stud=studByKey(c,key), name=stud.name;
    const all=attempts(c,T.id,stud);
    const r=todayResult(c,T.id,stud), pv=prevResult(c,T.id,stud), bst=bestOf(T,all);
    const open=openAttempt(c,T.id,stud);
    let delta="";
    if(r&&pv){ const imp=better(T,r.val,pv.val);
      delta=`<span class="dl ${imp?"up":"down"}">${imp?"▲":"▼"} ${fmtVal(T,Math.abs(r.val-pv.val))}</span>`; }
    row.classList.toggle("done",!!r);
    const vl=row.querySelector(".vl");
    vl.innerHTML=(r?fmtVal(T,r.val):"—")+delta;
    vl.classList.toggle("pr",!!(r&&bst&&r.id===bst.id&&all.length>1));
    const sub=row.querySelector(".nm .pv");
    const subTxt=all.length?((bst?"⭐ הטוב: "+fmtVal(T,bst.val):"")+(all.length>1?" · "+all.length+" ניסיונות":"")):"";
    if(sub)sub.textContent=subTxt;
    else if(subTxt){ const sp=document.createElement("span"); sp.className="pv"; sp.textContent=subTxt;
      row.querySelector(".nm").appendChild(sp); }
    const stepB=row.querySelector(".ft-step b"); if(stepB)stepB.textContent=Math.round((open||{}).val||0);
    const cap=row.querySelector("[data-cap]");
    if(cap){
      const need=T.dir==="low"?lapsFor(T.id):1, done=(lapRun[key]||[]).length;
      cap.textContent=r?"↺ שוב":(need>1?`⏱ ${done+1}/${need}`:"⏱ קלוט");
      cap.className="btn sm "+(r?"ghost":"acc");
    }
    /* כפתור «+ ניסיון» מופיע רק כשיש ניסיון פתוח — refreshRow חייב
       לנהל אותו, אחרת אחרי ההקשה הראשונה הוא פשוט לא מופיע. */
    if(T.kind!=="clock"){
      let nb=row.querySelector("[data-new]");
      const want=!!open&&!pendingNew[key];
      if(want&&!nb){
        nb=document.createElement("button");
        nb.className="btn sm ghost"; nb.setAttribute("data-new",key); nb.textContent="+ ניסיון";
        nb.addEventListener("click",()=>{ pendingNew[key]=true; renderRun();
          H().toast("ניסיון חדש ל"+name+" — הזן את התוצאה"); });
        const anchor=row.querySelector("[data-del]");
        row.insertBefore(nb,anchor||null);
      }else if(!want&&nb)nb.remove();
      /* התגית «ניסיון חדש» נעלמת ברגע שהניסיון נפתח בפועל */
      if(!pendingNew[key]){
        const pill=[...row.querySelectorAll(".pill")].find(x=>x.textContent.trim()==="ניסיון חדש");
        if(pill)pill.remove();
      }
    }
    let del=row.querySelector("[data-del]");
    if(r&&!del){
      del=document.createElement("button");
      del.className="btn sm stop"; del.setAttribute("data-del",key); del.textContent="✕";
      del.addEventListener("click",()=>{ clearVal(c,T.id,stud); refreshRow(key); refreshHead(); });
      row.appendChild(del);
    }else if(!r&&del)del.remove();
    refreshHead();
  }
  function refreshHead(){
    const {$}=H(), T=testById(st.test), c=cls();
    const rst=roster(c);
    const vals=rst.map(s=>{const r=todayResult(c,T.id,s);return r?r.val:null;}).filter(v=>v!=null);
    const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    const best=vals.length?(T.dir==="low"?Math.min(...vals):Math.max(...vals)):null;
    const sb=$("#ft-runHead").querySelector(".sb");
    if(sb)sb.textContent=`כיתה ${c} · ${vals.length}/${rst.length} נמדדו`
      +(avg!=null?` · ממוצע ${fmtVal(T,avg)} ${T.unit}`:"")
      +(best!=null?` · הטוב ${fmtVal(T,best)}`:"");
  }

  /* ---------- כרטיס תלמיד: כל המבחנים במקום אחד ----------
     עונה על שתי שאלות בבת אחת — מה כבר נמדד ומה עדיין חסר. «חסר»
     מוגדר כמבחן שהכיתה כבר עשתה ולתלמיד הזה אין בו תוצאה, ולא כ-30
     המבחנים שבקטלוג, כי אחרת הרשימה חסרת משמעות. */
  function openCard(key){
    const {$, $$, esc}=H(), c=cls();
    const stud=asStud(c,key), name=stud.name;
    const mine=resultsOf(c,stud);
    /* מבחנים שנמדדו בכיתה בכלל */
    const classTests=[...new Set(allRes().filter(r=>clsKey(r.cls)===clsKey(c)).map(r=>r.test))];
    const want=idxTests();
    const mineTests=[...new Set(mine.map(r=>r.test))];
    const missing=[...new Set([].concat(classTests,want))].filter(t=>!mineTests.includes(t)&&testById(t));

    const rows=mineTests.map(tid=>{
      const T=testById(tid); if(!T)return null;
      const list=attempts(c,tid,stud), bst=bestOf(T,list);
      const sc=scoreOne(tid,stud,st.grade,bst.val);
      const dates=[...new Set(list.map(r=>r.d))].sort();
      const first=bestOf(T,list.filter(r=>r.d===dates[0]));
      const imp=dates.length>1?(better(T,bst.val,first.val)?Math.abs(bst.val-first.val):null):null;
      return {T,bst,list,sc,dates,imp};
    }).filter(Boolean).sort((a,b)=>a.T.cat.localeCompare(b.T.cat));

    const scored=rows.filter(r=>r.sc.v!=null);
    const idx=scored.length?scored.reduce((a,b)=>a+b.sc.v,0)/scored.length:null;

    $("#ft-cardTitle").textContent="👤 "+name+" · כיתה "+c;
    $("#ft-cardBody").innerHTML=`
      <div class="ft-idxsum">
        <div><span class="k">מבחנים שנמדדו</span><span class="v">${mineTests.length}</span></div>
        <div><span class="k">מדד הכושר</span><span class="v">${idx!=null?idx.toFixed(1):"—"}</span>
          <span class="k">${scored.length?"מ-"+scored.length+" מבחנים":"אין ציון"}</span></div>
        <div><span class="k">חסרים</span><span class="v">${missing.length}</span></div>
      </div>

      ${rows.length?`<div class="tblwrap" style="margin-top:12px"><table class="tbl ft-card">
        <thead><tr><th>מבחן</th><th>⭐ הטוב</th><th>ציון</th><th>ניסיונות</th><th>נמדד</th><th>שיפור</th></tr></thead>
        <tbody>${rows.map(r=>`<tr>
          <td><b>${r.T.em} ${esc(r.T.name)}</b>${r.T.cap?`<span class="cap">תקרה ${r.T.cap}</span>`:""}</td>
          <td class="mono gold">${fmtVal(r.T,r.bst.val)} <span class="u">${esc(r.T.unit)}</span></td>
          <td class="mono">${r.sc.v!=null?r.sc.v.toFixed(0)+(r.sc.src==="rel"&&scoreMode()==="norm"?"<b>~</b>":""):"—"}</td>
          <td class="mono">${r.list.length}</td>
          <td class="mono dim">${r.dates[r.dates.length-1]}${r.dates.length>1?`<span class="u">${r.dates.length} ימים</span>`:""}</td>
          <td class="mono">${r.imp!=null?`<span class="up">▲ ${fmtVal(r.T,r.imp)}</span>`:r.dates.length>1?"—":""}</td>
        </tr>`).join("")}</tbody></table></div>`
        :'<div class="empty-state"><div class="big">📋</div>אין עדיין תוצאות לתלמיד הזה.</div>'}

      ${missing.length?`<div class="bw-warn" style="margin-top:12px">
        <b>חסרים לו ${missing.length} מבחנים</b> שהכיתה כבר עשתה:<br>
        ${missing.map(t=>`<span class="pill">${testById(t).em} ${esc(testById(t).name)}</span>`).join(" ")}</div>`:""}

      <div class="hint" style="margin-top:11px">הציון מחושב מ<b>התוצאה הטובה ביותר</b> בכל מבחן, לפי
        ${scoreMode()==="norm"?"טבלת הנורמה":"ניקוד יחסי לשכבה"}${want.length?` · המדד מורכב מ-${want.length} מבחנים שנבחרו`:" · המדד מורכב מכל מבחן שיש לו תוצאה"}.
        «שיפור» הוא ההפרש בין יום המדידה הראשון לתוצאה הטובה.</div>`;
    H().modal("ft-cardModal");
    $("#ft-cardPdf").onclick=()=>studentReport(name,c,rows,idx,scored,missing);
    $("#ft-cardCsv").onclick=()=>{
      const out=[["מבחן","הטוב","יחידה","ציון","ניסיונות","נמדד לאחרונה","ימי מדידה"]];
      rows.forEach(r=>out.push([r.T.name,r.bst.val,r.T.unit,r.sc.v!=null?r.sc.v.toFixed(0):"",
        r.list.length,r.dates[r.dates.length-1],r.dates.length]));
      H().dlCSV("כרטיס-"+name+"-"+c+"-"+today()+".csv",out);
    };
  }

  /* ---------- היסטוריית הניסיונות של תלמיד ---------- */
  function openHist(key){
    const {$, $$, esc}=H(), T=testById(st.test), c=cls();
    const stud=studByKey(c,key);
    const all=attempts(c,T.id,stud), bst=bestOf(T,all);
    $("#ft-histTitle").textContent=T.em+" "+T.name+" — "+stud.name;
    if(!all.length){ $("#ft-histBody").innerHTML='<div class="hint">אין עדיין ניסיונות.</div>'; H().modal("ft-histModal"); return; }
    /* קיבוץ לפי תאריך, כדי לראות התקדמות בין שיעורים */
    const byDate={}; all.forEach(r=>{ (byDate[r.d]=byDate[r.d]||[]).push(r); });
    const dates=Object.keys(byDate).sort();
    $("#ft-histBody").innerHTML=`
      <div class="ft-idxsum" style="margin-bottom:11px">
        <div><span class="k">ניסיונות</span><span class="v">${all.length}</span></div>
        <div><span class="k">⭐ הטוב</span><span class="v">${fmtVal(T,bst.val)}</span></div>
        <div><span class="k">ימי מדידה</span><span class="v">${dates.length}</span></div>
      </div>
      ${dates.map(d=>{
        const day=byDate[d], dayBest=bestOf(T,day);
        return `<div class="ft-histday"><div class="dh">${d}${
          dates.length>1&&d===dates[dates.length-1]?" · אחרון":""}</div>
          ${day.map((r,i)=>`<div class="hr${r.id===bst.id?" best":""}">
            <span class="ix">${i+1}</span>
            <b>${fmtVal(T,r.val)}</b> <span class="u">${esc(T.unit)}</span>
            ${r.id===bst.id?'<span class="pill acc">⭐ הטוב ביותר</span>':""}
            <button class="btn sm stop" data-rm="${r.id}">✕</button></div>`).join("")}
          ${day.length>1?`<div class="hint">הטוב ביום: ${fmtVal(T,dayBest.val)}</div>`:""}
        </div>`;}).join("")}
      ${dates.length>1?(()=>{
        const first=bestOf(T,byDate[dates[0]]), last=bestOf(T,byDate[dates[dates.length-1]]);
        const imp=better(T,last.val,first.val);
        return `<div class="pf-prec ${imp?"ok":"mid"}" style="margin-top:4px">
          <div class="v">${imp?"שיפור":"ללא שיפור"} מאז ${dates[0]} — <b>${fmtVal(T,Math.abs(last.val-first.val))} ${esc(T.unit)}</b></div>
          <div class="d">${fmtVal(T,first.val)} ← ${fmtVal(T,last.val)}</div></div>`;})():""}`;
    H().modal("ft-histModal");
    $$("#ft-histBody [data-rm]").forEach(b=>b.addEventListener("click",()=>{
      if(!confirm("למחוק את הניסיון הזה?"))return;
      delAttempt(b.dataset.rm); openHist(key); renderRun();
    }));
  }

  /* ---------- טבלת ההקפות והפערים ----------
     נבנית מהקליטות של המקצה הנוכחי בלבד (lapRun), ולכן היא מתאפסת
     עם השעון ולא מתערבבת עם תוצאות של מקצים קודמים. */
  function renderSplits(){
    const {$, esc}=H(), T=testById(st.test); if(!T)return;
    const box=$("#ft-splits"); if(!box)return;
    const need=T.dir==="low"?lapsFor(T.id):1;
    /* המפתחות ב-lapRun הם מזהי תלמידים; השם נשלף לתצוגה בלבד. */
    const c=cls();
    const keys=Object.keys(lapRun).filter(k=>(lapRun[k]||[]).length);
    if(!keys.length){ box.innerHTML=""; return; }

    /* דירוג לפי הזמן האחרון שנרשם — מי שסיים קודם למעלה */
    const rows=keys.map(k=>{
      const a=lapRun[k], last=a[a.length-1];
      return {n:nameOf(c,k),a,last,done:a.length>=need};
    }).sort((x,y)=>(y.done-x.done)||(x.last-y.last));
    const leader=rows.find(r=>r.done);
    const fmt=v=>v>=60?H().fmtMSc(v):v.toFixed(2);

    box.innerHTML=`<div class="card" style="margin-bottom:14px">
      <div class="row" style="justify-content:space-between;align-items:center">
        <h2 style="margin:0"><span class="dot"></span> ⏱ הקפות ופערים</h2>
        <span class="hint">${rows.filter(r=>r.done).length}/${rows.length} סיימו</span>
      </div>
      <div class="tblwrap" style="margin-top:10px"><table class="tbl ft-splt">
        <thead><tr><th>#</th><th>שם</th>
          ${need>1?[...Array(need)].map((_,i)=>`<th>${i+1===need?"סיום":"הקפה "+(i+1)}</th>`).join(""):"<th>זמן</th>"}
          <th>פער</th></tr></thead>
        <tbody>${rows.map((r,i)=>{
          const gap=leader&&r.done&&r!==leader?r.last-leader.last:null;
          return `<tr class="${r.done?"done":""}">
            <td class="mono">${r.done?i+1:"–"}</td>
            <td><b>${esc(r.n)}</b></td>
            ${need>1?[...Array(need)].map((_,k)=>{
              const t=r.a[k];
              if(t==null)return '<td class="mono dim">—</td>';
              const prev=k?r.a[k-1]:0;
              return `<td class="mono">${fmt(t)}<span class="lap">+${fmt(t-prev)}</span></td>`;
            }).join(""):`<td class="mono">${fmt(r.last)}</td>`}
            <td class="mono ${gap!=null?"gap":""}">${gap!=null?"+"+fmt(gap):r.done?"—":"רץ"}</td>
          </tr>`;}).join("")}</tbody>
      </table></div>
      <div class="hint" style="margin-top:7px">${need>1
        ? "מתחת לכל זמן מצטבר מופיע זמן ההקפה עצמה. «פער» הוא ההפרש מהמסיים הראשון."
        : "«פער» הוא ההפרש מהמסיים הראשון."}</div>
    </div>`;
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
    on("#ft-clkReset","click",()=>{ if(clk.paused===0||confirm("לאפס את השעון? התוצאות שנרשמו נשמרות."))
      {lapRun={};resetClock();renderSplits();} });
    $$("#ft-lapSel button").forEach(b=>b.addEventListener("click",()=>{
      setLapsFor(T.id,+b.dataset.lp); lapRun={}; renderRun(); }));
    on("#ft-cdGo","click",()=>startCd(T.dur));
    on("#ft-cdStop","click",stopCd);

    /* קליטת זמן — הפעולה המרכזית בזמן מקצה */
    $$("#ft-list [data-cap]").forEach(b=>b.addEventListener("click",()=>{
      if(!clk.on&&clk.paused===0){H().toast("הפעל קודם את השעון");return;}
      const k=b.dataset.cap, s=studByKey(c,k), nm=s.name;
      const need=T.dir==="low"?lapsFor(T.id):1;
      const t=elapsed();
      const arr=lapRun[k]=(lapRun[k]||[]);
      if(need>1){
        if(arr.length>=need){ H().toast(nm+" כבר סיים — «↺ שוב» מאפס אותו"); return; }
        arr.push(t);
        if(arr.length>=need){ saveVal(c,T.id,s,t,true); H().beep(1320,0.14); }
        else H().beep(880,0.07);
      }else{
        arr.length=0; arr.push(t);
        saveVal(c,T.id,s,t,true); H().beep(1100,0.09);   /* כל קליטה היא ניסיון חדש */
      }
      refreshRow(k); renderSplits();
    }));
    /* מונה חזרות */
    $$("#ft-list [data-hist]").forEach(el=>el.addEventListener("click",()=>openHist(el.dataset.hist)));
    $$("#ft-list [data-card]").forEach(el=>el.addEventListener("click",()=>openCard(el.dataset.card)));
    $$("#ft-list [data-new]").forEach(b=>b.addEventListener("click",()=>{
      /* לא יוצרים רשומה ריקה — רק מסמנים שהמדידה הבאה תיפתח כניסיון
         חדש. כך מונה שנעצר על 0 לא משאיר רשומת רפאים. */
      pendingNew[b.dataset.new]=true; renderRun();
      H().toast("ניסיון חדש ל"+nameOf(c,b.dataset.new)+" — הזן את התוצאה");
    }));
    $$("#ft-list [data-inc]").forEach(b=>b.addEventListener("click",()=>bump(b.dataset.inc,1)));
    $$("#ft-list [data-dec]").forEach(b=>b.addEventListener("click",()=>bump(b.dataset.dec,-1)));
    /* הזנת מדידה */
    $$("#ft-list [data-val]").forEach(inp=>inp.addEventListener("change",()=>{
      const k=inp.dataset.val, v=+inp.value;
      const s=studByKey(c,k);
      const fresh=!!pendingNew[k];
      if(v>0){ saveVal(c,T.id,s,v,fresh); delete pendingNew[k]; }
      else { const cur=openAttempt(c,T.id,s); if(cur)delAttempt(cur.id); }
      renderRun();
    }));
    $$("#ft-list [data-del]").forEach(b=>b.addEventListener("click",()=>{
      const k=b.dataset.del, s=studByKey(c,k);
      if(!confirm("למחוק את כל הניסיונות של "+s.name+" היום? ניסיונות מתאריכים קודמים נשמרים."))return;
      delete lapRun[k];
      clearVal(c,T.id,s); refreshRow(k); renderSplits();
      const inp=document.querySelector('#ft-list [data-val="'+CSS.escape(k)+'"]');
      if(inp)inp.value="";
    }));
  }
  function bump(key,d){
    const T=testById(st.test), c=cls();
    const s=studByKey(c,key);
    const fresh=!!pendingNew[key];
    const cur=fresh?null:openAttempt(c,T.id,s);
    const v=Math.max(0,(cur?cur.val:0)+d);
    if(v>0){ saveVal(c,T.id,s,v,fresh); delete pendingNew[key]; }
    else if(cur)delAttempt(cur.id);
    H().beep(d>0?920:520,0.05); refreshRow(key);
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
    $("#ft-rosFile").onclick=()=>{ H().modal("ft-rosModal",false); openImport(); };
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
    $("#ft-rosList").innerHTML=list.length?list.map((s,i)=>{
      const k=refKey(s);
      return `<div class="arc-item"><div class="grow"><div class="ttl">${i+1}. ${esc(s.name)}</div></div>
       <div class="seg ft-sexseg">
         <button data-sx="boys"  data-n="${esc(k)}" class="${s.sex==="boys"?"on":""}">בן</button>
         <button data-sx="girls" data-n="${esc(k)}" class="${s.sex==="girls"?"on":""}">בת</button>
       </div>
       <button class="btn sm stop" data-rd="${esc(k)}">✕</button></div>`;}).join("")
      : '<div class="hint">הרשימה ריקה. ייבא מ«התלמידים שלי», או הדבק שמות למטה.</div>';
    $("#ft-rosCount").textContent=list.length?list.length+" תלמידים":"";
    $$("#ft-rosList [data-rd]").forEach(b=>b.addEventListener("click",()=>{
      /* המחיקה מסירה את התלמיד מהרשימה בלבד. המדידות שלו נשארות
         בקובץ עם המזהה שלהן — מורה שמסיר תלמיד בטעות ומחזיר אותו
         מקבל בחזרה את כל ההיסטוריה. */
      setRoster(c,roster(c).filter(x=>refKey(x)!==b.dataset.rd)); renderRosterList();
    }));
    /* המין דרוש לניקוד — נורמות כושר נפרדות לבנים ולבנות */
    $$("#ft-rosList [data-sx]").forEach(b=>b.addEventListener("click",()=>{
      const l=roster(c), s2=l.find(x=>refKey(x)===b.dataset.n); if(!s2)return;
      s2.sex=s2.sex===b.dataset.sx?null:b.dataset.sx;
      setRoster(c,l); renderRosterList();
    }));
  }

  /* ============================================================
     6ב. ייבוא רשימות מקובץ בית ספרי (משו״ב וכל CSV אחר)
     ------------------------------------------------------------
     הכול קורה בדפדפן: הקובץ נקרא מקומית, מפוענח מקומית, ונשמר
     ב-localStorage של המכשיר. שום שורה לא נשלחת לשום מקום.

     הזיהוי גמיש בכוונה — ייצוא של משו״ב משתנה בין בתי ספר ובין
     גרסאות, ולכן במקום לצפות לכותרות קבועות אנחנו מזהים לפי
     מילות מפתח, ותמיד מציגים תצוגה מקדימה לפני שמייבאים.
     ============================================================ */
  const IMP={rows:[],head:[],map:{name:-1,first:-1,last:-1,cls:-1,grade:-1,par:-1,sex:-1}};

  /* ---------- קריאת .xlsx בלי שום ספרייה ----------
     קובץ אקסל הוא ארכיון ZIP עם XML בפנים. הדפדפן כבר יודע לפרוס
     deflate דרך DecompressionStream, אז אפשר לקרוא את הגיליון ישירות
     ולא לגרור ספרייה של מאות קילובייטים לאפליקציה שאמורה לעבוד
     אופליין מקובץ יחיד. */
  const XLSX_OK=typeof DecompressionStream!=="undefined";

  async function inflateRaw(bytes){
    const ds=new DecompressionStream("deflate-raw");
    const stream=new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  /* פורס ZIP: קורא את ספריית הקבצים המרכזית ומחזיר {שם: בתים} */
  async function unzip(buf){
    const dv=new DataView(buf), u8=new Uint8Array(buf);
    /* End of Central Directory — חותמת 0x06054b50 מסוף הקובץ אחורה */
    let eocd=-1;
    for(let i=u8.length-22;i>=0&&i>u8.length-66000;i--){
      if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}
    }
    if(eocd<0)throw new Error("קובץ אקסל לא תקין");
    const count=dv.getUint16(eocd+10,true);
    let off=dv.getUint32(eocd+16,true);
    const out={};
    for(let i=0;i<count;i++){
      if(dv.getUint32(off,true)!==0x02014b50)break;
      const method=dv.getUint16(off+10,true);
      const csize=dv.getUint32(off+20,true);
      const nlen=dv.getUint16(off+28,true);
      const elen=dv.getUint16(off+30,true);
      const clen=dv.getUint16(off+32,true);
      const lho=dv.getUint32(off+42,true);
      const name=new TextDecoder().decode(u8.subarray(off+46,off+46+nlen));
      /* מיקום הנתונים נגזר מכותרת הקובץ המקומית, לא מהמרכזית */
      const lnlen=dv.getUint16(lho+26,true), lelen=dv.getUint16(lho+28,true);
      const start=lho+30+lnlen+lelen;
      const raw=u8.subarray(start,start+csize);
      out[name]={method,raw};
      off+=46+nlen+elen+clen;
    }
    return out;
  }
  async function readEntry(e){
    if(!e)return "";
    const bytes=e.method===0?e.raw:await inflateRaw(e.raw);
    return new TextDecoder("utf-8").decode(bytes);
  }
  /* «C7» → 2 (אינדקס עמודה מבוסס-0) */
  function colIdx(ref){
    const m=String(ref||"").match(/^([A-Z]+)/); if(!m)return -1;
    let n=0; for(const ch of m[1])n=n*26+(ch.charCodeAt(0)-64);
    return n-1;
  }
  const unesc=t=>String(t).replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(_,d)=>String.fromCharCode(+d))
    .replace(/&amp;/g,"&");
  const stripTags=x=>unesc(String(x).replace(/<[^>]*>/g,""));

  async function parseXlsx(buf){
    const z=await unzip(buf);
    /* מחרוזות משותפות — שם כמעט כל הטקסט באקסל באמת יושב */
    const shared=[];
    const ssXml=await readEntry(z["xl/sharedStrings.xml"]);
    if(ssXml){
      const items=ssXml.match(/<si\b[\s\S]*?<\/si>/g)||[];
      items.forEach(si=>{
        const parts=si.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g)||[];
        shared.push(parts.map(t=>unesc(t.replace(/<[^>]*>/g,""))).join(""));
      });
    }
    /* הגיליון הראשון */
    const names=Object.keys(z).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n))
      .sort((a,b)=>(+a.match(/(\d+)/)[1])-(+b.match(/(\d+)/)[1]));
    if(!names.length)throw new Error("לא נמצא גיליון בקובץ");
    const sheet=await readEntry(z[names[0]]);
    const rows=[];
    (sheet.match(/<row\b[\s\S]*?(\/>|<\/row>)/g)||[]).forEach(r=>{
      const cells=r.match(/<c\b[\s\S]*?(\/>|<\/c>)/g)||[];
      const arr=[];
      cells.forEach(c=>{
        const ref=(c.match(/\sr="([A-Z]+\d+)"/)||[])[1];
        const t=(c.match(/\st="([^"]+)"/)||[])[1];
        let v="";
        if(t==="inlineStr"){ const is=c.match(/<is>([\s\S]*?)<\/is>/); v=is?stripTags(is[1]):""; }
        else{
          const vm=c.match(/<v>([\s\S]*?)<\/v>/);
          const raw=vm?unesc(vm[1]):"";
          v=(t==="s")?(shared[+raw]??""):raw;
        }
        const i=colIdx(ref);
        if(i>=0)arr[i]=v; else arr.push(v);
      });
      for(let i=0;i<arr.length;i++)if(arr[i]===undefined)arr[i]="";
      rows.push(arr.map(x=>String(x==null?"":x).trim()));
    });
    while(rows.length&&!rows[0].some(x=>x))rows.shift();   /* שורות ריקות בראש */
    return pickHeader(rows);
  }


  /* מפצל שורת CSV אחת תוך כיבוד מרכאות */
  function splitLine(line,d){
    const out=[]; let cur="",q=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'){ if(q&&line[i+1]==='"'){cur+='"';i++;} else q=!q; }
      else if(ch===d&&!q){ out.push(cur); cur=""; }
      else cur+=ch;
    }
    out.push(cur);
    return out.map(x=>x.trim().replace(/^"|"$/g,""));
  }
  function parseTable(text){
    const t=text.replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n").trim();
    if(!t)return {head:[],rows:[]};
    const first=t.split("\n")[0];
    /* בוחרים את המפריד שמייצר הכי הרבה עמודות בשורה הראשונה */
    const d=[["\t",splitLine(first,"\t").length],[",",splitLine(first,",").length],[";",splitLine(first,";").length]]
      .sort((a,b)=>b[1]-a[1])[0][0];
    const all=t.split("\n").filter(l=>l.trim()).map(l=>splitLine(l,d));
    return pickHeader(all);
  }

  const HDR={
    name :["שם מלא","שם התלמיד","שם תלמיד","שם התלמיד/ה","שם"],
    first:["שם פרטי","פרטי"],
    last :["שם משפחה","משפחה"],
    cls  :["כיתה","הכיתה","כיתת אם"],
    grade:["שכבה","שכבת גיל"],
    par  :["מקבילה","מספר כיתה","כיתה מספר"],
    sex  :["מין","מגדר","בן/בת"]
  };
  function detect(head){
    const m={name:-1,first:-1,last:-1,cls:-1,grade:-1,par:-1,sex:-1};
    const norm=h=>String(h||"").replace(/["'׳״]/g,"").trim();
    Object.keys(HDR).forEach(k=>{
      head.forEach((h,i)=>{
        if(m[k]>=0)return;
        const v=norm(h);
        if(HDR[k].some(w=>v===w))m[k]=i;
      });
      if(m[k]<0)head.forEach((h,i)=>{
        if(m[k]>=0)return;
        const v=norm(h);
        if(HDR[k].some(w=>v.includes(w)))m[k]=i;
      });
    });
    /* «שם» לבדו לא יילקח אם יש פיצול לפרטי+משפחה */
    if(m.first>=0&&m.last>=0)m.name=-1;
    return m;
  }
  const SEX_M=["ז","זכר","בן","ב","m","male","boy"];
  const SEX_F=["נ","נקבה","בת","g","f","female","girl"];
  function readSex(v){
    const t=String(v||"").trim().toLowerCase();
    if(!t)return null;
    if(SEX_M.includes(t))return "boys";
    if(SEX_F.includes(t))return "girls";
    return null;
  }
  /* «י2» · «י׳2» · «י-2» · שכבה+מקבילה נפרדות → מפתח כיתה אחיד */
  function readCls(row,m){
    if(m.cls>=0&&row[m.cls])return String(row[m.cls]).trim();
    if(m.grade>=0&&row[m.grade]){
      const g=String(row[m.grade]).trim(), p=m.par>=0?String(row[m.par]||"").trim():"";
      return p?g+p:g;
    }
    return "";
  }
  /* מפרק «ט׳3» לשכבה ומספר, כדי שהייבוא ייפול לאותן כיתות שהמודול מכיר */
  const parseCls=window.HMDATA.parseCls;

  /* ייצוא אמיתי מתחיל לא פעם בשורת כותרת של הדוח («חנ״ג בנים יב1»,
     שם בית ספר, תאריך) לפני שורת העמודות. במקום להניח ששורה 0 היא
     הכותרת, בודקים כמה שורות ראשונות ובוחרים את זו שממנה מזוהים הכי
     הרבה שדות — ואם אף אחת לא מזוהה, נשארים על הראשונה. */
  function pickHeader(all){
    const score=h=>{ const m=detect(h); return Object.keys(m).filter(k=>m[k]>=0).length; };
    let best=0,bs=score(all[0]||[]);
    for(let i=1;i<Math.min(6,all.length);i++){
      const sc=score(all[i]);
      if(sc>bs){bs=sc;best=i;}
    }
    return {head:all[best]||[],rows:all.slice(best+1).filter(r=>r.some(x=>x))};
  }

  function impBuild(){
    const rows=[];
    IMP.rows.forEach(r=>{
      const m=IMP.map;
      let nm = m.name>=0 ? String(r[m.name]||"").trim() : "";
      if(!nm&&(m.first>=0||m.last>=0))
        nm=[m.last>=0?r[m.last]:"",m.first>=0?r[m.first]:""].map(x=>String(x||"").trim()).filter(Boolean).join(" ");
      nm=nm.replace(/\s+/g," ").trim();
      if(!nm)return;
      const rawCls=readCls(r,m), pc=parseCls(rawCls);
      rows.push({name:nm,rawCls,cls:pc?clsName(pc.grade,pc.num):rawCls,ok:!!pc,
        sex:m.sex>=0?readSex(r[m.sex]):null});
    });
    return rows;
  }

  function renderImp(){
    const {$, $$, esc}=H();
    const box=$("#ft-impBody"); if(!box)return;
    if(!IMP.head.length){ box.innerHTML='<div class="hint">בחר קובץ או הדבק טבלה למעלה.</div>'; return; }
    const built=impBuild();
    const good=built.filter(x=>x.ok);
    const byCls={}; good.forEach(x=>{ byCls[x.cls]=(byCls[x.cls]||0)+1; });
    const bad=built.filter(x=>!x.ok);
    const sel=(k,lbl)=>`<div class="field" style="width:150px"><label>${lbl}</label>
      <select data-map="${k}"><option value="-1">—</option>${IMP.head.map((h,i)=>
        `<option value="${i}"${IMP.map[k]===i?" selected":""}>${esc(h||("עמודה "+(i+1)))}</option>`).join("")}</select></div>`;
    box.innerHTML=`
      <div class="row" style="flex-wrap:wrap;gap:9px">
        ${sel("name","שם מלא")}${sel("first","שם פרטי")}${sel("last","שם משפחה")}
        ${sel("cls","כיתה")}${sel("grade","שכבה")}${sel("par","מקבילה")}${sel("sex","מין")}
      </div>
      <div class="hint" style="margin-top:8px">אם הקובץ מפצל לשם פרטי ומשפחה — בחר את שניהם ואשאיר את «שם מלא» על —.</div>
      <div class="ft-idxsum" style="margin-top:11px">
        <div><span class="k">תלמידים</span><span class="v">${good.length}</span></div>
        <div><span class="k">כיתות</span><span class="v">${Object.keys(byCls).length}</span></div>
        <div><span class="k">עם מין</span><span class="v">${good.filter(x=>x.sex).length}</span></div>
      </div>
      ${Object.keys(byCls).length?`<div class="row" style="gap:5px;flex-wrap:wrap;margin-top:10px">${
        Object.keys(byCls).sort().map(c=>`<span class="pill acc">${esc(c)} · ${byCls[c]}</span>`).join("")}</div>`:""}
      ${bad.length?`<div class="bw-warn" style="margin-top:10px">${bad.length} שורות בלי כיתה מזוהה — הן לא ייובאו.
        דוגמה: «${esc(bad[0].name)}» עם כיתה «${esc(bad[0].rawCls||"ריק")}». המודול מכיר ז׳–י״ב עם מספר, למשל «ט3».</div>`:""}
      ${good.length?`<div class="tblwrap" style="margin-top:10px;max-height:200px;overflow:auto"><table class="tbl">
        <thead><tr><th>שם</th><th>כיתה</th><th>מין</th></tr></thead>
        <tbody>${good.slice(0,8).map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.cls)}</td>
          <td>${x.sex==="boys"?"בן":x.sex==="girls"?"בת":"—"}</td></tr>`).join("")}</tbody></table></div>
        ${good.length>8?`<div class="hint" style="margin-top:5px">מוצגות 8 שורות ראשונות מתוך ${good.length}.</div>`:""}`:""}`;
    $$("#ft-impBody [data-map]").forEach(se=>se.addEventListener("change",()=>{
      IMP.map[se.dataset.map]=+se.value; renderImp();
    }));
    $("#ft-impGo").disabled=!good.length;
  }

  function impApply(){
    const built=impBuild().filter(x=>x.ok);
    if(!built.length){H().toast("אין שורות לייבוא");return;}
    const alsoStu=H().$("#ft-impStu").checked;
    const all=rosters(); let added=0,updated=0;
    /* מזהה אחד לכל תלמיד שנוצר בייבוא הזה.
       עד עכשיו אותו ילד נכנס פעמיים — פעם לרשימת הכיתה עם מזהה
       «f…» ופעם ל«התלמידים שלי» עם מזהה «s…» — וכך נוצרו שתי
       זהויות לאדם אחד כבר ברגע הייבוא. */
    const newId={};
    const idFor=x=>{
      const k=clsKey(x.cls)+"|"+x.name;
      return (newId[k]=newId[k]||("f"+Date.now()+Math.random().toString(36).slice(2,6)));
    };
    built.forEach(x=>{
      const k=clsKey(x.cls);
      const list=Array.isArray(all[k])?all[k]:(all[k]=[]);
      const ex=list.find(y=>y.name===x.name);
      if(ex){ if(x.sex&&ex.sex!==x.sex){ex.sex=x.sex;updated++;} newId[k+"|"+x.name]=ex.id; }
      else { list.push({id:idFor(x),name:x.name,sex:x.sex||null}); added++; }
      registerCls(x.cls);
    });
    setRosters(all);
    let stuAdded=0;
    if(alsoStu){
      const stu=LS().get("stu.list",[]);
      built.forEach(x=>{
        let s=stu.find(y=>y.name===x.name);
        if(!s){ stu.push({id:idFor(x),name:x.name,cls:x.cls,cid:DATA.classId(x.cls),
          sex:x.sex||"boys",age:14,h:null,w:null,tests:[]}); stuAdded++; }
        else { if(!s.cls){s.cls=x.cls; s.cid=DATA.classId(x.cls);} if(x.sex)s.sex=x.sex; }
      });
      LS().set("stu.list",stu);
    }
    H().modal("ft-impModal",false);
    H().toast(`✓ ${added} תלמידים חדשים · ${updated} עודכן מין`+(alsoStu?` · ${stuAdded} נוספו ל«התלמידים שלי»`:""));
    renderTab();
  }

  function openImport(){
    const {$}=H();
    IMP.rows=[]; IMP.head=[]; IMP.map={name:-1,first:-1,last:-1,cls:-1,grade:-1,par:-1,sex:-1};
    $("#ft-impPaste").value=""; $("#ft-impFile").value="";
    renderImp();
    H().modal("ft-impModal");
    const load=text=>{
      const t=parseTable(text);
      IMP.head=t.head; IMP.rows=t.rows; IMP.map=detect(t.head);
      renderImp();
    };
    $("#ft-impFile").onchange=async e=>{
      const f=e.target.files[0]; if(!f)return;
      const isX=/\.xlsx$/i.test(f.name);
      try{
        if(isX){
          if(!XLSX_OK)throw new Error("הדפדפן הזה לא תומך בקריאת אקסל — שמור את הקובץ כ-CSV, או פתח באקסל והדבק לתיבה");
          const t=await parseXlsx(await f.arrayBuffer());
          IMP.head=t.head; IMP.rows=t.rows; IMP.map=detect(t.head);
          renderImp();
          H().toast("📊 נקרא "+f.name+" — "+t.rows.length+" שורות");
        }else load(await f.text());
      }catch(err){
        H().toast("לא הצלחתי לקרוא את הקובץ: "+(err.message||err));
      }
      e.target.value="";
    };
    $("#ft-impPaste").oninput=()=>load($("#ft-impPaste").value);
    $("#ft-impGo").onclick=impApply;
  }

  /* ============================================================
     7. ייצוא
     ============================================================ */  /* ============================================================
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
            <button class="btn sm" id="ft-idxPdf">🖨 דוח כיתה (PDF)</button>
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
          ${mode==="norm"&&rst.some(x=>x.sex==="girls")&&!Object.values(N.table).some(t=>t.girls)
            ?`<div class="hint" style="margin-top:7px">בכיתה יש בנות, ובטבלה הטעונה יש רק בנים —
              הבנות מנוקדות יחסית לשכבה עד שתוזן טבלה נפרדת עבורן.</div>`:""}
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
    on("#ft-idxPdf",()=>classReport(c,rows,usedTests,avg,scored));
  }

  /* ============================================================
     דוחות להדפסה / PDF
     ------------------------------------------------------------
     מורה שמראה למנהל דוח מודפס הוא מורה שמצדיק את הכלי — ובלי דוח,
     כל העבודה נשארת בתוך הטלפון שלו. הדוח נבנה כחלון הדפסה של
     הדפדפן ולא כספריית PDF: «שמור כ-PDF» קיים בכל דפדפן ובכל מערכת
     הפעלה, וזה חוסך 300KB של ספרייה שגם לא יודעת עברית כמו שצריך.

     גיליון הסגנון להדפסה מוגדר בשחור על לבן במפורש — ערכת הצבעים
     הכהה של האפליקציה מבזבזת טונר ולא נקראת על נייר. */
  const RPT_CSS=`
    @page{size:A4;margin:14mm}
    *{box-sizing:border-box}
    /* @page חל רק בהדפסה — בלי ריפוד למסך התצוגה המקדימה נצמדת לקצה
       והכותרת נחתכת. בהדפסה עצמה הריפוד מתאפס וה-@page מנהל את השוליים. */
    body{font-family:'Heebo','Arial Hebrew',Arial,sans-serif;color:#111;background:#fff;
      margin:0 auto;max-width:210mm;padding:14mm;font-size:12px}
    @media print{body{padding:0;max-width:none}}
    .hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #0a5c38;padding-bottom:9px;margin-bottom:14px}
    .hd h1{margin:0;font-size:21px;color:#0a5c38}
    .hd .sub{font-size:12px;color:#555;margin-top:3px}
    .hd .rt{text-align:end;font-size:11px;color:#666;line-height:1.6}
    .kpi{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
    .kpi div{border:1px solid #ccc;border-radius:8px;padding:8px 14px;min-width:104px}
    .kpi b{display:block;font-size:20px;color:#0a5c38}
    .kpi span{font-size:10.5px;color:#666}
    table{width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:13px}
    th{background:#eef4f0;border:1px solid #bbb;padding:6px 7px;font-size:10.5px;text-align:start;white-space:nowrap}
    td{border:1px solid #ddd;padding:6px 7px}
    tr:nth-child(even) td{background:#fafafa}
    td.n{font-family:'Courier New',monospace;white-space:nowrap}
    td.best{font-weight:700;color:#0a5c38}
    h2{font-size:14px;margin:16px 0 7px;color:#0a5c38;border-inline-start:4px solid #0a5c38;padding-inline-start:8px}
    .miss{border:1px solid #d9a400;background:#fff8e6;border-radius:8px;padding:9px 11px;font-size:11.5px}
    .note{font-size:10.5px;color:#666;line-height:1.7;margin-top:12px;border-top:1px solid #ddd;padding-top:9px}
    .sig{margin-top:26px;display:flex;gap:34px;font-size:11px;color:#444}
    .sig div{flex:1;border-top:1px solid #999;padding-top:5px}
    @media print{.noprint{display:none}}
  `;
  function rptOpen(title,inner){
    const w=window.open("","_blank");
    if(!w){ H().toast("הדפדפן חסם את חלון ההדפסה — אפשר לאשר חלונות קופצים ולנסות שוב"); return null; }
    const school=(H().SET.school||"").trim();
    w.document.write('<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8">'+
      '<title>'+H().esc(title)+'</title>'+
      '<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;800&display=swap" rel="stylesheet">'+
      '<style>'+RPT_CSS+'</style></head><body>'+inner+
      '<div class="note noprint" style="text-align:center;margin-top:18px">'+
      'להדפסה או לשמירה כ-PDF: <b>Ctrl/⌘ + P</b> ← «יעד» ← «שמור כ-PDF».</div>'+
      '<' + 'script>setTimeout(function(){window.print()},450)<' + '/script></body></html>');
    w.document.close();
    return w;
  }
  function rptHead(title,sub){
    const school=(H().SET.school||"").trim();
    return '<div class="hd"><div><h1>'+H().esc(title)+'</h1>'+
      '<div class="sub">'+H().esc(sub)+'</div></div>'+
      '<div class="rt">'+(school?H().esc(school)+'<br>':"")+
      'הופק '+new Date().toLocaleDateString(H_LOC())+'<br>המגרש PRO</div></div>';
  }

  /* ---------- דוח תלמיד ---------- */
  function studentReport(name,c,rows,idx,scored,missing){
    const esc=H().esc;
    const kpi='<div class="kpi">'+
      '<div><b>'+rows.length+'</b><span>מבחנים שנמדדו</span></div>'+
      '<div><b>'+(idx!=null?idx.toFixed(1):"—")+'</b><span>מדד הכושר'+(scored.length?" · מ-"+scored.length+" מבחנים":"")+'</span></div>'+
      '<div><b>'+rows.reduce((a,r)=>a+r.list.length,0)+'</b><span>סה״כ מדידות</span></div>'+
      '<div><b>'+missing.length+'</b><span>מבחנים חסרים</span></div></div>';
    const table=rows.length?'<h2>תוצאות לפי מבחן</h2><table><thead><tr>'+
      '<th>מבחן</th><th>התוצאה הטובה</th><th>ציון</th><th>ניסיונות</th><th>מדידה ראשונה</th><th>מדידה אחרונה</th><th>שיפור</th>'+
      '</tr></thead><tbody>'+rows.map(r=>'<tr>'+
        '<td>'+esc(r.T.name)+(r.T.cap?' <span style="color:#a70">(תקרה '+r.T.cap+')</span>':"")+'</td>'+
        '<td class="n best">'+fmtVal(r.T,r.bst.val)+' '+esc(r.T.unit)+'</td>'+
        '<td class="n">'+(r.sc.v!=null?r.sc.v.toFixed(0):"—")+'</td>'+
        '<td class="n">'+r.list.length+'</td>'+
        '<td class="n">'+r.dates[0]+'</td>'+
        '<td class="n">'+r.dates[r.dates.length-1]+'</td>'+
        '<td class="n">'+(r.imp!=null?"▲ "+fmtVal(r.T,r.imp)+" "+esc(r.T.unit):(r.dates.length>1?"—":"מדידה אחת")) +'</td>'+
      '</tr>').join("")+'</tbody></table>'
      :'<p>אין עדיין תוצאות לתלמיד הזה.</p>';
    /* היסטוריית הניסיונות היא הראיה שהמורה מציג — «הוא נמדד חמש פעמים»
       שווה יותר מציון בודד, גם מול מנהל וגם מול הורה. */
    const hist=rows.filter(r=>r.list.length>1).map(r=>
      '<tr><td>'+esc(r.T.name)+'</td><td class="n">'+
      r.list.map(x=>x.d+" · "+fmtVal(r.T,x.val)).join(' &nbsp;|&nbsp; ')+'</td></tr>').join("");
    const histBlock=hist?'<h2>היסטוריית מדידות</h2><table><thead><tr><th style="width:26%">מבחן</th><th>כל הניסיונות</th></tr></thead><tbody>'+hist+'</tbody></table>':"";
    const missBlock=missing.length?'<h2>מה חסר</h2><div class="miss"><b>'+missing.length+
      ' מבחנים שהכיתה עשתה ולתלמיד אין בהם תוצאה:</b><br>'+
      missing.map(t=>esc(testById(t).name)).join(" · ")+'</div>':"";
    rptOpen("דוח תלמיד — "+name,
      rptHead("דוח כושר אישי",name+" · כיתה "+c)+kpi+table+histBlock+missBlock+
      '<div class="note">הציון מחושב מהתוצאה הטובה ביותר בכל מבחן, לפי '+
      (scoreMode()==="norm"?"טבלת הנורמה הבית־ספרית":"ניקוד יחסי לשכבה")+
      '. «שיפור» הוא ההפרש בין יום המדידה הראשון לתוצאה הטובה ביותר. '+
      'הדוח משקף יכולת גופנית בלבד ואינו הציון בתעודה.</div>'+
      '<div class="sig"><div>חתימת המורה</div><div>תאריך</div></div>');
  }

  /* ---------- דוח כיתה ---------- */
  function classReport(c,rows,usedTests,avg,scored){
    if(!rows.length){ H().toast("אין נתונים לדוח"); return; }
    const esc=H().esc;
    const idxOf=r=>r.idx!=null?r.idx:null;
    const sorted=rows.slice().sort((a,b)=>(idxOf(b)??-1)-(idxOf(a)??-1));
    const done=rows.filter(r=>r.idx!=null).length;
    const kpi='<div class="kpi">'+
      '<div><b>'+rows.length+'</b><span>תלמידים</span></div>'+
      '<div><b>'+(scored.length?avg.toFixed(1):"—")+'</b><span>ממוצע המדד</span></div>'+
      '<div><b>'+done+'</b><span>עם מדד מלא</span></div>'+
      '<div><b>'+usedTests.length+'</b><span>מבחנים במדד</span></div></div>';
    const head='<tr><th style="width:4%">#</th><th>שם</th><th>מין</th>'+
      usedTests.map(t=>'<th>'+esc(testById(t).name)+'</th>').join("")+'<th>מדד</th></tr>';
    const body=sorted.map((r,i)=>{
      const by={}; r.rows.forEach(x=>by[x.test]=x);
      return '<tr><td class="n">'+(i+1)+'</td><td>'+esc(r.s.name)+'</td>'+
        '<td>'+(r.s.sex?(r.s.sex==="girls"?"בת":"בן"):"—")+'</td>'+
        usedTests.map(t=>{const x=by[t];
          return '<td class="n">'+(x?x.sc.toFixed(0):"—")+'</td>';}).join("")+
        '<td class="n best">'+(r.idx!=null?r.idx.toFixed(1):"—")+'</td></tr>';
    }).join("");
    /* מי חסר — זו השאלה שמורה שואל בכל שיעור, ולכן היא בדוח ולא רק במסך */
    const gaps=usedTests.map(t=>{
      const miss=rows.filter(r=>!r.rows.some(x=>x.test===t));
      return miss.length?'<tr><td>'+esc(testById(t).name)+'</td><td class="n">'+miss.length+'</td><td>'+
        miss.map(r=>esc(r.s.name)).join(" · ")+'</td></tr>':"";
    }).filter(Boolean).join("");
    const gapBlock=gaps?'<h2>מי עוד לא נמדד</h2><table><thead><tr><th style="width:24%">מבחן</th><th style="width:8%">חסרים</th><th>תלמידים</th></tr></thead><tbody>'+gaps+'</tbody></table>':"";
    rptOpen("דוח כיתה — "+c,
      rptHead("דוח כושר כיתתי","כיתה "+c+" · "+(scoreMode()==="norm"?"ניקוד לפי טבלת נורמה":"ניקוד יחסי לשכבה"))+
      kpi+'<h2>ציוני יכולת</h2><table><thead>'+head+'</thead><tbody>'+body+'</tbody></table>'+gapBlock+
      '<div class="note">כל ציון מחושב מהתוצאה הטובה ביותר של התלמיד באותו מבחן. '+
      'הדוח משקף יכולת גופנית בלבד — הציון בתעודה מורכב גם מהשתתפות, שיפור והתמדה, ואינו זהה למדד הזה. '+
      'הנתונים נשמרים במכשיר המורה בלבד.</div>'+
      '<div class="sig"><div>חתימת המורה</div><div>תאריך</div></div>');
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
      /* «התלמידים שלי» ורשימת הכיתה חולקים מזהה מאז הייבוא, ולכן
         אפשר לכתוב ציון גם לתלמיד ששמו תוקן באחת משתי הרשימות. */
      const sid=DATA.studentKey(r.s);
      const s=(sid&&list.find(x=>x.id===sid))||list.find(x=>x.name===r.s.name);
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
    hang:    {step:1,   round:v=>Math.round(v),            pts:[[50,80],[20,60]]},
    /* מקבילים — הסולם הוזל: 28 חזרות הן ה-100 בי״ב, ו-25 «מצטיין» ב-95 */
    pbars:   {step:1,   round:v=>Math.max(1,Math.round(v)),pts:[[28,100],[25,95],[22,90],[19,85],[16,80],[13,75],[10,70],[7,65]]},
    /* גקסונים — החלופה על ספסל: 20 חזרות הן בדיוק «עובר» (60), ו-30 נותנות את התקרה 80 */
    gaks:    {step:1,   round:v=>Math.max(1,Math.round(v)),pts:[[30,80],[28,76],[26,72],[24,68],[22,64],[20,60]]},
    /* מתח אוסטרלי — חלופה למתח, תקרה 85 */
    invrow:  {step:1,   round:v=>Math.max(1,Math.round(v)),pts:[[30,85],[26,81],[22,77],[18,73],[14,69],[10,65]]}
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
  const SCHOOL_PCT_DEF=2.5;

  /* ---------- הבסיס כנתון, לא כקוד ----------
     טבלת י״ב היא נקודת המוצא שממנה נגזרות כל השכבות. היא נשמרת
     במכשיר בנפרד לבנים ולבנות, כך שמורה שמלמד בנות יכול להזין את
     הטבלה שלו בלי שאף מספר גברי ידלוף אליה. הבנים מגיעים מלאים
     כברירת מחדל; הבנות מתחילות ריקות בכוונה. */
  const baseAll=()=>{
    const saved=LS().get("ft.schoolBase",null);
    if(saved&&saved.boys)return saved;
    const boys={}; Object.keys(SCHOOL_BASE).forEach(t=>boys[t]=SCHOOL_BASE[t].pts.map(x=>x.slice()));
    return {boys,girls:{}};
  };
  const baseSet=b=>LS().set("ft.schoolBase",b);
  const stepPct=()=>{ const v=+LS().get("ft.schoolPct",SCHOOL_PCT_DEF); return v>0?v:SCHOOL_PCT_DEF; };
  const setStepPct=v=>LS().set("ft.schoolPct",v);

  /* טקסט הבסיס: שורה למבחן — «מזהה|ערך=ניקוד,ערך=ניקוד…» */
  function baseToText(sex){
    const b=baseAll()[sex]||{};
    return Object.keys(b).map(t=>t+"|"+b[t].map(p=>p[0]+"="+p[1]).join(",")).join("\n");
  }
  function textToBase(txt){
    const out={};
    txt.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith("#")).forEach(line=>{
      const p=line.split("|").map(x=>x.trim());
      if(p.length!==2)throw new Error(line);
      const [tid,pairs]=p;
      if(!testById(tid))throw new Error("מבחן לא מוכר: "+tid);
      const pts=pairs.split(",").map(x=>{
        const [v,sc]=x.split("=").map(y=>+y.trim());
        if(!(v>=0)||!(sc>=0))throw new Error(line);
        return [v,sc];
      });
      if(pts.length<2)throw new Error("צריך לפחות שתי נקודות ציון: "+line);
      out[tid]=pts;
    });
    return out;
  }

  /* עיגול ומדרגת מונוטוניות לפי יחידת המדידה של המבחן; מבחן שאין לו
     הגדרה מפורשת מקבל ברירת מחדל סבירה לפי היחידה שלו. */
  function roundSpec(tid){
    if(SCHOOL_BASE[tid])return SCHOOL_BASE[tid];
    const T=testById(tid), u=T&&T.unit;
    if(u==="ס״מ")return {step:5,round:v=>Math.round(v/5)*5};
    if(u==="שנ׳")return {step:0.1,round:v=>Math.round(v*10)/10};
    return {step:1,round:v=>Math.max(1,Math.round(v))};
  }
  function buildSchoolNorms(sex){
    const base=baseAll()[sex]||{}, pct=stepPct()/100, lines=[];
    Object.keys(base).forEach(tid=>{
      const T=testById(tid); if(!T)return;
      const spec=roundSpec(tid), pts=base[tid];
      Object.keys(SCHOOL_STEP).forEach(g=>{
        const k=SCHOOL_STEP[g];
        const f=T.dir==="low" ? 1+k*pct : 1-k*pct;
        const raw=enforceMono(pts.map(([v])=>spec.round(v*f)),T.dir,spec.step);
        lines.push(tid+"|"+sex+"|"+g+"|"+pts.map(([,pt],i)=>raw[i]+"="+pt).join(","));
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
    /* --- עורך הבסיס --- */
    let baseSex="boys";
    const paintBase=()=>{
      $$("#ft-bSexSeg button").forEach(b=>b.classList.toggle("on",b.dataset.bs===baseSex));
      $("#ft-bText").value=baseToText(baseSex);
      const n=Object.keys(baseAll()[baseSex]||{}).length;
      $("#ft-bStat").textContent=n?n+" מבדקים בבסיס של "+(baseSex==="boys"?"בנים":"בנות")
        :"אין עדיין בסיס ל"+(baseSex==="boys"?"בנים":"בנות")+" — הזן שורה לכל מבדק והשמר.";
    };
    $$("#ft-bSexSeg button").forEach(b=>b.addEventListener("click",()=>{ baseSex=b.dataset.bs; paintBase(); }));
    $("#ft-bPct").value=stepPct();
    $("#ft-bSave").onclick=()=>{
      try{
        const all=baseAll(); all[baseSex]=textToBase($("#ft-bText").value);
        baseSet(all); setStepPct(Math.max(0,+$("#ft-bPct").value||SCHOOL_PCT_DEF));
        paintBase(); H().toast("✓ הבסיס של "+(baseSex==="boys"?"בנים":"בנות")+" נשמר");
      }catch(e){ H().toast("שורה לא תקינה: "+e.message); }
    };
    /* בסיס שנשמר במכשיר גובר על הקוד, ולכן עדכון של סולם בברירת המחדל
       לא היה מגיע למי שכבר לחץ «שמור בסיס». הכפתור הזה מחזיר את הבסיס
       של המין הנבחר לטבלה שבקוד — הבנות נשארות ריקות בכוונה. */
    $("#ft-bReset").onclick=()=>{
      const lbl=baseSex==="boys"?"בנים":"בנות";
      if(!confirm("להחזיר את הבסיס של "+lbl+" לברירת המחדל? שינויים שהזנת בו יימחקו."))return;
      const all=baseAll();
      if(baseSex==="boys"){ all.boys={}; Object.keys(SCHOOL_BASE).forEach(t=>all.boys[t]=SCHOOL_BASE[t].pts.map(x=>x.slice())); }
      else all.girls={};
      baseSet(all); setStepPct(SCHOOL_PCT_DEF); $("#ft-bPct").value=SCHOOL_PCT_DEF;
      paintBase(); renderIndex(); H().toast("✓ הבסיס של "+lbl+" הוחזר לברירת המחדל");
    };
    $("#ft-nPreset").onclick=()=>{
      setStepPct(Math.max(0,+$("#ft-bPct").value||SCHOOL_PCT_DEF));
      const parts=["boys","girls"].map(sx=>buildSchoolNorms(sx)).filter(Boolean);
      if(!parts.length){H().toast("אין עדיין בסיס — מלא אותו למעלה ושמור");return;}
      const add=parts.join("\n"), cur=$("#ft-nText").value.trim();
      $("#ft-nText").value=cur?cur+"\n"+add:add;
      if(!$("#ft-nSource").value.trim())$("#ft-nSource").value="טבלת בית הספר — בסיס י״ב";
      H().toast("נוצרו "+add.split("\n").length+" שורות מהבסיס — עבור עליהן ולחץ «שמור טבלה»");
    };
    paintBase();
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
  /* קבועי האות חיים ב-hm-data.js יחד עם החישוב שמשתמש בהם */
  const OT_MAX=window.HMDATA.OT_MAX, OT_PASS=window.HMDATA.OT_PASS,
        OT_CORE_MIN=window.HMDATA.OT_CORE_MIN;
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
  const otTheory=window.HMDATA.otTheory;
  const otScore =window.HMDATA.otScore;

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
     7ג. מדידות שממתינות להכרעה
     ------------------------------------------------------------
     ההסבה של שלב 2 סימנה ולא ניחשה, וזה היה נכון — אבל רשומה
     מסומנת שאין לה מסלול הכרעה נשארת מסומנת לנצח. זה המסלול.

     הכרטיס מופיע רק כשיש מה להכריע בכיתה הנוכחית. אין רשומות
     כאלה — אין כרטיס, ואין למורה שום דבר חדש להתמודד איתו.
     ============================================================ */
  function ambFor(c){
    const k=clsKey(c);
    return DATA.ambiguousGroups(allRes()).filter(g=>clsKey(g.cls)===k);
  }
  const AMB_WHY={
    "duplicate-name":"יש שני תלמידים בכיתה עם השם הזה",
    "no-roster-match":"השם אינו ברשימת הכיתה"
  };
  function renderAmb(){
    const {$, $$, esc}=H(), c=cls();
    const card=$("#ft-ambCard"); if(!card)return;
    const groups=ambFor(c);
    if(!groups.length){ card.hidden=true; return; }
    card.hidden=false;
    const total=groups.reduce((a,g)=>a+g.ids.length,0);
    $("#ft-ambHint").innerHTML=total+" מדידות בכיתה "+esc(c)+" לא שויכו לתלמיד בוודאות, ולכן הן לא נכנסות "+
      "לכרטיס אף אחד ולא למדד. הן שמורות — צריך רק להגיד למי הן שייכות.";
    $("#ft-ambList").innerHTML=groups.map(g=>
      `<div class="arc-item">
         <div class="grow"><div class="ttl">${esc(g.name)}</div>
           <div class="sb">${g.ids.length} מדידות · ${esc(AMB_WHY[g.reason]||g.reason)}</div></div>
         <button class="btn sm acc" data-amb="${esc(g.key)}">למי זה שייך?</button>
       </div>`).join("");
    $$("#ft-ambList [data-amb]").forEach(b=>b.addEventListener("click",()=>openAmb(b.dataset.amb)));
  }
  function openAmb(key){
    const {$, $$, esc}=H(), c=cls();
    const g=ambFor(c).find(x=>x.key===key); if(!g)return;
    const cand=DATA.resolveCandidates(roster(c),g.name);
    $("#ft-ambTitle").textContent="למי שייכות המדידות של «"+g.name+"»?";
    const T=tid=>{ const t=testById(tid); return t?t.name:tid; };
    $("#ft-ambBody").innerHTML=`
      <div class="hint">${g.ids.length} מדידות · כיתה ${esc(c)} · ${esc(AMB_WHY[g.reason]||g.reason)}</div>
      <div class="tblwrap" style="margin:10px 0"><table class="tbl"><thead>
        <tr><th>תאריך</th><th>מבחן</th><th>תוצאה</th></tr></thead>
        <tbody>${g.rows.slice(0,8).map(r=>`<tr><td>${esc(r.d||"")}</td>
          <td>${esc(T(r.test))}</td><td class="mono">${esc(String(r.val))} ${esc(r.unit||"")}</td></tr>`).join("")}
        </tbody></table></div>
      ${g.rows.length>8?`<div class="hint">ועוד ${g.rows.length-8} מדידות</div>`:""}
      ${cand.all.length
        ? `<div class="field" style="margin-top:12px"><label>בחר תלמיד</label></div>
           <div id="ft-ambCand">${cand.all.map(s=>
             `<button class="btn" style="width:100%;margin-bottom:7px;justify-content:flex-start"
                data-pick="${esc(refKey(s))}">${esc(s.name)}${
                cand.exact.indexOf(s)>=0?' <span class="pill acc">שם תואם</span>':""}</button>`).join("")}</div>
           <div class="hint">אם אף אחד מהם אינו הנכון — השאר את המדידות כמו שהן. הן לא ילכו לאיבוד.</div>`
        : `<div class="empty-state"><div class="big">👥</div>אין תלמידים ברשימת כיתה ${esc(c)}.<br>
             ייבא את הרשימה קודם, ואז אפשר יהיה לשייך.</div>`}`;
    $$("#ft-ambBody [data-pick]").forEach(b=>b.addEventListener("click",()=>{
      const stud=studByKey(c,b.dataset.pick);
      const sid=DATA.studentKey(stud);
      /* תלמיד בלי מזהה יציב אינו יעד חוקי — שיוך אליו רק היה מחליף
         דו-משמעות אחת באחרת. */
      if(!sid){ H().toast("לתלמיד הזה אין עדיין מזהה יציב"); return; }
      if(!confirm("לשייך "+g.ids.length+" מדידות ל"+stud.name+"?"))return;
      const res=DATA.resolveAmbiguous(allRes(),g.ids,sid);
      if(!res.ok){ H().toast("לא בוצע שיוך"); return; }
      setRes(res.rows);
      H().modal("ft-ambModal",false);
      H().toast("✓ "+res.changed+" מדידות שויכו ל"+stud.name);
      renderAmb(); renderPicker();
    }));
    H().modal("ft-ambModal",true);
  }

  /* ============================================================
     7ד. פתיחת שיעור מבורר הכיתה
     ------------------------------------------------------------
     הכיתה כבר נבחרה כאן — זה המקום הטבעי להתחיל ממנו שיעור, בלי
     מסך חדש ובלי לבחור כיתה פעם שנייה.
     ============================================================ */
  function wireStartLesson(){
    const {$}=H(), b=$("#ft-startLesson"); if(!b)return;
    const S=H().session; if(!S){ b.hidden=true; return; }
    const c=cls(), cid=DATA.classId(c), act=S.active();
    b.hidden=false;
    if(act&&act.cid===cid){ b.textContent="▶ השיעור בכיתה הזאת פתוח"; b.disabled=true; return; }
    b.disabled=false;
    b.textContent="▶ התחל שיעור";
    b.onclick=()=>{
      registerCls(c);
      const r=S.start({cid,clsSnapshot:c,date:today()});
      if(r.outcome==="blocked"){
        H().toast("כבר פתוח שיעור בכיתה "+(r.active.clsSnapshot||"")+" — סיים אותו קודם");
        return;
      }
      if(!r.ok){ H().toast("לא ניתן לפתוח שיעור"); return; }
      H().paintSessionBar();
      H().toast(r.outcome==="resumed"?"השיעור בכיתה "+c+" כבר פתוח":"▶ השיעור בכיתה "+c+" התחיל");
      renderPicker();
    };
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

  /* ============================================================
     בורר הכיתה המשותף
     ------------------------------------------------------------
     רשימות הכיתה חיות כאן, אבל גם הביפ טסט והפוטו־פיניש צריכים
     אותן — אחרת המורה מקליד את אותם שמות שלוש פעמים. הבורר נחשף
     החוצה כ-FT.pick כדי שכל מודול יקבל בדיוק את אותה רשימה, עם
     אותה התאמה סלחנית של שם הכיתה, בלי לשכפל את הלוגיקה.

       FT.pick({title, note, max, onPick(names, clsLabel)})

     max — תקרת בחירה (מסלולי הפוטו־פיניש מוגבלים ל-9), ובלעדיה
     אין הגבלה. onPick מקבל מערך שמות ואת שם הכיתה לתצוגה.
     ============================================================ */
  function pick(opts){
    const o=opts||{}, $=H().$, $$=H().$$;
    const last=LS().get("ft.last",{grade:"ט",num:1});
    let g=last.grade||"ט", num=+last.num||1, sel=null;
    const host=id=>$("#"+id);
    host("cp-title").querySelector("span").textContent=o.title||"טעינת כיתה";
    host("cp-note").textContent=o.note||"";
    host("cp-grades").innerHTML=GRADES.map(([k,lbl])=>
      `<button data-g="${k}"${k===g?' class="on"':""}>${lbl}</button>`).join("");
    host("cp-nums").innerHTML=NUMS.map(n=>
      `<button data-n="${n}"${n===num?' class="on"':""}>${n}</button>`).join("");

    const paint=()=>{
      $$("#cp-grades button").forEach(b=>b.classList.toggle("on",b.dataset.g===g));
      $$("#cp-nums button").forEach(b=>b.classList.toggle("on",+b.dataset.n===num));
      const c=clsName(g,num);
      let list=roster(c);
      if(!list.length){ importFromStu(c); list=roster(c); }
      sel=new Set(list.map(x=>x.name));
      if(o.max&&list.length>o.max) sel=new Set(list.slice(0,o.max).map(x=>x.name));
      host("cp-list").innerHTML=list.length
        ? list.map(x=>`<label class="cp-item"><input type="checkbox" value="${H().esc(x.name)}"${sel.has(x.name)?" checked":""}><span>${H().esc(x.name)}</span></label>`).join("")
        : `<div class="empty-state" style="margin:0"><div class="big">👥</div>אין עדיין רשימה לכיתה ${c}.<br>
           פתח «🏅 מבחני כושר» ← הכיתה הזאת ← «👥 רשימה» וייבא אותה פעם אחת — ומאז היא זמינה בכל המודולים.</div>`;
      $$("#cp-list input").forEach(i=>i.addEventListener("change",()=>{
        if(i.checked)sel.add(i.value); else sel.delete(i.value);
        if(o.max&&sel.size>o.max){ i.checked=false; sel.delete(i.value); H().toast("אפשר לבחור עד "+o.max); }
        stat();
      }));
      stat();
    };
    const stat=()=>{
      const n=$$("#cp-list input").length;
      host("cp-stat").textContent=n?("נבחרו "+sel.size+" מתוך "+n+(o.max?" · עד "+o.max:"")):"";
      host("cp-load").disabled=!sel||!sel.size;
    };
    $$("#cp-grades button").forEach(b=>b.addEventListener("click",()=>{ g=b.dataset.g; paint(); }));
    $$("#cp-nums button").forEach(b=>b.addEventListener("click",()=>{ num=+b.dataset.n; paint(); }));
    host("cp-all").onclick=()=>{ $$("#cp-list input").forEach(i=>{
      if(o.max&&sel.size>=o.max&&!i.checked)return; i.checked=true; sel.add(i.value); }); stat(); };
    host("cp-none").onclick=()=>{ $$("#cp-list input").forEach(i=>i.checked=false); sel.clear(); stat(); };
    host("cp-load").onclick=()=>{
      const c=clsName(g,num);
      const names=roster(c).map(x=>x.name).filter(n=>sel.has(n));
      if(!names.length){ H().toast("לא נבחר אף תלמיד"); return; }
      LS().set("ft.last",Object.assign({},last,{grade:g,num}));
      H().modal("cp-pickModal",false);
      o.onPick&&o.onPick(names,c);
    };
    paint(); H().modal("cp-pickModal",true);
  }

  /* ============================================================
     קליטת תוצאות ממודול אחר
     ------------------------------------------------------------
     ביפ טסט ופוטו־פיניש מדדו את אותם תלמידים ושמרו את התוצאה אצלם
     בלבד, ולכן כרטיס התלמיד הראה שני שלישים מהתמונה. עכשיו שהשמות
     מגיעים מאותה רשימה, אפשר להזרים אותן פנימה.

     כל קליטה היא ניסיון חדש — זאת מדידה שקרתה באמת, לא תיקון של
     ערך קיים. השמירה היחידה היא מפני כפילות: אותו תלמיד, אותו
     מבחן, אותו ערך ואותו יום נחשב לאותה מדידה, כך שלחיצה כפולה על
     «שלח למבחני כושר» לא מכפילה לו את ההיסטוריה.
     ============================================================ */
  function ingest(cls,testId,rows,src){
    const T=testById(testId), pc=parseCls(cls);
    if(!T||!pc||!Array.isArray(rows))return {added:0,dup:0,skipped:0};
    const c=clsName(pc.grade,pc.num), rs=allRes();
    /* מפתח הכפילות הוא הזהות ולא השם: שני תלמידים בשם «דן כהן»
       שרצו את אותו זמן הם שתי מדידות, לא אחת. */
    const idOf=r=>r.sid?("id:"+r.sid):("nm:"+String(r.name||""));
    const seen=new Set(rs.filter(r=>clsKey(r.cls)===clsKey(c)&&r.test===testId&&r.d===today())
      .map(r=>idOf(r)+"|"+(+r.val).toFixed(2)));
    let added=0,dup=0,skipped=0;
    rows.forEach(row=>{
      const nm=String(row&&row.name||"").trim(), v=+(row&&row.val);
      if(!nm||!(v>0)){ skipped++; return; }
      /* מודולים אחרים (ביפ טסט, פוטו-פיניש) מכירים שם בלבד, ולכן
         כאן עדיין מתרגמים שם למזהה — אבל רק כאן, בנקודת הכניסה. */
      const known=roster(c).find(x=>x.name===nm);
      const key=(known&&known.id?("id:"+known.id):("nm:"+nm))+"|"+v.toFixed(2);
      if(seen.has(key)){ dup++; return; }
      seen.add(key);
      rs.push({id:"f"+Date.now()+Math.random().toString(36).slice(2,6),ts:Date.now(),d:today(),
        cls:c,cid:DATA.classId(c),test:testId,name:nm,sid:known?(known.id||null):null,
        normVer:normVersion(),sessionId:sessionFor(c),gradeKey:pc.grade,
        sex:(row.sex||(known&&known.sex)||null),val:+v.toFixed(2),unit:T.unit,src:src||null});
      added++;
    });
    if(added)setRes(rs);
    return {added,dup,skipped};
  }

  /* ============================================================
     ממשק התקדמות
     ------------------------------------------------------------
     נבנה עבור פרופיל הכושר העתידי, כדי שהוא לא יכתוב מחדש את
     הלוגיקה הזאת — וכדי שאף מסך עתידי לא ימציא גרסה משלו ל«האם
     התלמיד השתפר». הוא עוטף את השכבה הטהורה ב-hm-data ומוסיף רק
     את מה שדורש אחסון: קטלוג המבחנים, טבלת הנורמה ומצב הניקוד.

     המדידות הגולמיות מוחזרות כמו שהן. אף פונקציה כאן לא כותבת.
     ============================================================ */
  const PROGRESS={
    /* כל המדידות הגולמיות של תלמיד במבחן. בלי opts.cls — ההיסטוריה
       המלאה, כולל מה שנמדד לפני שהוא עבר כיתה. */
    measurements:(stud,testId,opts)=>DATA.measurementsOf(allRes(),stud,testId,opts),
    /* השיא האישי, לפי כיוון המבחן */
    personalBest:(stud,testId)=>{
      const T=testById(testId); if(!T)return null;
      return DATA.personalBest(allRes(),stud,testId,T.dir);
    },
    latest:(stud,testId,opts)=>DATA.latestOf(allRes(),stud,testId,opts),
    first :(stud,testId,opts)=>DATA.firstOf(allRes(),stud,testId,opts),
    /* התמונה המלאה: ראשון, אחרון, שיא, קודם, ושלוש ההשוואות */
    progress:(stud,testId,opts)=>{
      const T=testById(testId);
      return DATA.progress(allRes(),stud,testId,T&&T.dir,opts);
    },
    /* ההערכה של מדידה בודדת, עם קוד סיבה כשאין ציון */
    assess:(stud,testId,val,grade,measuredNormVersion)=>{
      const T=testById(testId);
      return DATA.assess({mode:scoreMode(),table:norms().table,rows:allRes(),
        testId,sex:sexOf(stud),grade:grade||st.grade,val,
        dir:T&&T.dir,cap:capOf(testId),
        normVersion:normVersion(),measuredNormVersion,archive:normArchive()});
    },
    /* ההערכה של מדידה קיימת — נושאת את חותמת הגרסה שלה */
    assessOf:(stud,m)=>m?PROGRESS.assess(stud,m.test,m.val,m.gradeKey,m.normVer)
                       :DATA.assess({}),
    dirOf:testId=>{ const T=testById(testId); return T?T.dir:null; },
    normVersion
  };

  return {init, pick, ingest, tests:()=>TESTS, results:()=>allRes(), roster,
    classOf:clsName, progress:PROGRESS};
})();
})();
