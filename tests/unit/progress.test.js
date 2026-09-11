"use strict";
/* מדידה ← הערכה ← התקדמות.
   הכלל שכל הקובץ הזה נבנה סביבו: שינוי מספרי אינו שיפור.
   ב-60 מטר מינוס 0.38 שניות הוא שיפור; בחזרות מינוס 4 הוא ירידה. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

const S={id:"s1",name:"דן אבירם",sex:"boys"};
const m=(id,d,val,o)=>Object.assign(
  {id,test:"r60",sid:"s1",cls:"ט׳3",cid:"c:ט:3",d,ts:+id.replace(/\D/g,"")||1,
   val,unit:"שנ׳",gradeKey:"ט",sex:"boys"},o||{});

/* ============ כיוון ============ */

test("isBetter יודע לאיזה כיוון המבחן רץ",()=>{
  assert.equal(D.isBetter("low",5.42,5.80),true, "זמן נמוך יותר טוב יותר");
  assert.equal(D.isBetter("low",5.80,5.42),false);
  assert.equal(D.isBetter("high",19,15),true,"יותר חזרות טוב יותר");
  assert.equal(D.isBetter("high",15,19),false);
});

test("ערך זהה אינו «טוב יותר»",()=>{
  assert.equal(D.isBetter("low",5.42,5.42),false);
  assert.equal(D.isBetter("high",18,18),false);
});

test("כיוון חסר נופל ל«גבוה יותר טוב יותר»",()=>{
  assert.equal(D.isBetter(undefined,19,15),true,
    "זה מה שקטלוג המבחנים עושה — אבל מבחן בלי dir הוא באג בקטלוג");
});

test("ערך לא מספרי אינו ניתן להשוואה",()=>{
  [null,undefined,NaN,"5.4",{}].forEach(v=>{
    assert.equal(D.isBetter("low",v,5),null,"a="+String(v));
    assert.equal(D.isBetter("low",5,v),null,"b="+String(v));
  });
});

test("מדידה תקפה: מספר סופי אי-שלילי",()=>{
  assert.equal(D.isValidMeasurement({val:5.42}),true);
  assert.equal(D.isValidMeasurement({val:0}),true,"אפס הוא ערך, לא היעדר");
  [null,undefined,NaN,-1,"5",Infinity].forEach(v=>
    assert.equal(D.isValidMeasurement({val:v}),false,"val="+String(v)));
  assert.equal(D.isValidMeasurement(null),false);
});

/* ============ בחירת מדידות ============ */

const hist=[m("r1","2026-06-01",5.80),m("r2","2026-09-01",5.55),m("r3","2026-12-01",5.42)];

test("המדידות מוחזרות גולמיות ולפי סדר זמן",()=>{
  const got=D.measurementsOf(hist.slice().reverse(),S,"r60");
  assert.deepEqual(got.map(r=>r.id),["r1","r2","r3"]);
  assert.equal(got[0].val,5.80,"הערך המקורי, לא ציון");
  assert.equal(got[0].unit,"שנ׳","והיחידה נשמרה");
});

test("רק המבחן הנכון ורק התלמיד הנכון",()=>{
  const rows=hist.concat([
    m("x1","2026-09-01",30,{test:"push"}),
    m("x2","2026-09-01",5.10,{sid:"s2"})]);
  assert.deepEqual(D.measurementsOf(rows,S,"r60").map(r=>r.id),["r1","r2","r3"]);
});

test("בלי צמצום לכיתה — ההיסטוריה חוצה את מעבר הכיתה",()=>{
  const rows=hist.concat([m("r4","2027-01-01",5.30,{cls:"י׳1",cid:"c:י:1"})]);
  assert.equal(D.measurementsOf(rows,S,"r60").length,4,
    "תלמיד שעבר כיתה לא איבד את העבר שלו");
  assert.equal(D.measurementsOf(rows,S,"r60",{cls:"ט3"}).length,3,
    "ועם צמצום מקבלים רק את הכיתה שביקשו");
});

test("«ט3» ו-«ט׳3» הן אותה כיתה גם בצמצום",()=>{
  assert.equal(D.measurementsOf(hist,S,"r60",{cls:"ט' 3"}).length,3);
});

/* ============ שיא אישי ============ */

test("שיא אישי במבחן «נמוך יותר טוב יותר» הוא הזמן הקצר",()=>{
  const pb=D.personalBest(hist,S,"r60","low");
  assert.equal(pb.val,5.42);
  assert.equal(pb.id,"r3");
});

test("שיא אישי במבחן «גבוה יותר טוב יותר» הוא המספר הגדול",()=>{
  const reps=[m("p1","2026-06-01",15,{test:"push"}),
              m("p2","2026-09-01",22,{test:"push"}),
              m("p3","2026-12-01",19,{test:"push"})];
  const pb=D.personalBest(reps,S,"push","high");
  assert.equal(pb.val,22,"22 ולא 19, למרות ש-19 מאוחר יותר");
  assert.equal(pb.id,"p2");
});

test("שיא אישי אינו המדידה האחרונה",()=>{
  const rows=hist.concat([m("r9","2027-01-01",6.10)]);   /* רגרסיה */
  assert.equal(D.personalBest(rows,S,"r60","low").id,"r3");
  assert.equal(D.latestOf(rows,S,"r60").id,"r9");
});

test("מדידות פגומות אינן יכולות להיות שיא",()=>{
  const rows=[m("b1","2026-06-01",null),m("b2","2026-07-01",NaN),
              m("b3","2026-08-01",-3),m("ok","2026-09-01",5.9)];
  const pb=D.personalBest(rows,S,"r60","low");
  assert.equal(pb.id,"ok","רק המדידה התקפה");
  assert.equal(D.measurementsOf(rows,S,"r60").length,4,
    "אבל כולן נשארות בהיסטוריה הגולמית — שום דבר לא נמחק");
});

test("בלי מדידות — אין שיא, ולא אפס",()=>{
  assert.equal(D.personalBest([],S,"r60","low"),null);
  assert.equal(D.latestOf([],S,"r60"),null);
  assert.equal(D.firstOf([],S,"r60"),null);
});

/* ============ השוואה ============ */

test("השוואה מחזירה גם את השינוי הגולמי וגם את פרשנותו",()=>{
  const c=D.compare(m("b","2026-12-01",5.42),m("a","2026-06-01",5.80),"low");
  assert.equal(c.rawDelta,-0.38,"הגולמי נשאר שלילי ולא מוסתר");
  assert.equal(c.improved,true,"ובכל זאת — שיפור");
  assert.equal(c.declined,false);
  assert.equal(c.unchanged,false);
});

test("אותו סימן, פרשנות הפוכה — זה כל העניין",()=>{
  const run =D.compare(m("b","2026-12-01",5.42),m("a","2026-06-01",5.80),"low");
  const reps=D.compare(m("b","2026-12-01",15),  m("a","2026-06-01",19),  "high");
  assert.equal(run.rawDelta<0,true);
  assert.equal(reps.rawDelta<0,true,"שני השינויים שליליים");
  assert.equal(run.improved,true, "בריצה — שיפור");
  assert.equal(reps.improved,false,"בחזרות — ירידה");
});

test("ללא שינוי אינו שיפור ואינו ירידה",()=>{
  const c=D.compare(m("b","2026-12-01",5.50),m("a","2026-06-01",5.50),"low");
  assert.equal(c.rawDelta,0);
  assert.equal(c.unchanged,true);
  assert.equal(c.improved,false);
  assert.equal(c.declined,false);
});

test("השוואה עם מדידה חסרה מחזירה null, לא אפס",()=>{
  const c=D.compare(m("b","2026-12-01",5.42),null,"low");
  assert.equal(c.rawDelta,null);
  assert.equal(c.improved,null);
  assert.equal(c.unchanged,null);
});

/* ============ התקדמות ============ */

test("אין מדידות — סיבה מפורשת ולא אפס",()=>{
  const p=D.progress([],S,"r60","low");
  assert.equal(p.count,0);
  assert.equal(p.reason,D.PROGRESS_NONE);
  assert.equal(p.improved,null,"לא false — פשוט אין תשובה");
  assert.equal(p.rawDelta,null);
  assert.equal(p.best,null);
});

test("מדידה אחת — יש שיא, אין התקדמות",()=>{
  const p=D.progress([m("r1","2026-06-01",5.80)],S,"r60","low");
  assert.equal(p.count,1);
  assert.equal(p.reason,D.PROGRESS_ONE);
  assert.equal(p.best.val,5.80,"המדידה היחידה היא גם השיא");
  assert.equal(p.latest.val,5.80);
  assert.equal(p.previous,null);
  assert.equal(p.improved,null,"אין עם מה להשוות");
  assert.equal(p.rawDelta,null);
});

test("שתי מדידות — התרחיש מהמפרט",()=>{
  const p=D.progress([m("r1","2026-09-01",5.80),m("r2","2026-12-01",5.42)],S,"r60","low");
  assert.equal(p.count,2);
  assert.equal(p.reason,null);
  assert.equal(p.rawDelta,-0.38);
  assert.equal(p.improved,true);
  assert.equal(p.latestIsBest,true);
  assert.equal(p.first.val,5.80);
  assert.equal(p.latest.val,5.42);
});

test("שלוש מדידות: אחרון, קודם, ראשון ושיא",()=>{
  const p=D.progress(hist,S,"r60","low");
  assert.equal(p.count,3);
  assert.equal(p.days,3);
  assert.equal(p.first.id,"r1");
  assert.equal(p.latest.id,"r3");
  assert.equal(p.best.id,"r3");
  assert.equal(p.previous.id,"r2","הקודם הוא הטוב מהימים שלפני האחרון");
  assert.equal(p.rawDelta,-0.13,"מ-5.55 ל-5.42");
});

test("ירידה בביצוע מדווחת כירידה",()=>{
  const p=D.progress([m("r1","2026-06-01",5.42),m("r2","2026-12-01",5.90)],S,"r60","low");
  assert.equal(p.improved,false);
  assert.equal(p.declined,true);
  assert.equal(p.rawDelta,0.48,"השינוי הגולמי חיובי — והביצוע הורע");
  assert.equal(p.latestIsBest,false,"והשיא נשאר הישן");
  assert.equal(p.best.id,"r1");
});

test("ללא שינוי בין שתי מדידות",()=>{
  const p=D.progress([m("r1","2026-06-01",5.50),m("r2","2026-12-01",5.50)],S,"r60","low");
  assert.equal(p.unchanged,true);
  assert.equal(p.improved,false);
  assert.equal(p.rawDelta,0);
});

test("שלוש תפיסות ההשוואה שהמוצר כבר משתמש בהן",()=>{
  /* יום 1: 6.00 ו-5.90   ·   יום 2: 5.50   ·   יום 3: 5.70 */
  const rows=[m("a1","2026-06-01",6.00),m("a2","2026-06-01",5.90),
              m("b1","2026-09-01",5.50),
              m("c1","2026-12-01",5.70)];
  const p=D.progress(rows,S,"r60","low");
  assert.equal(p.best.val,5.50,"השיא");
  assert.equal(p.latest.val,5.70,"האחרון");
  assert.equal(p.previous.val,5.50,"הטוב שלפני היום האחרון");

  assert.equal(p.lastStep.rawDelta,0.20);
  assert.equal(p.lastStep.improved,false,"הצעד האחרון היה אחורה");

  assert.equal(p.sinceFirst.rawDelta,-0.40,"השיא מול הטוב ביום הראשון");
  assert.equal(p.sinceFirst.improved,true);

  assert.equal(p.firstToLast.rawDelta,-0.20,"היום האחרון מול היום הראשון");
  assert.equal(p.firstToLast.improved,true);
});

test("כמה מדידות באותו יום נחשבות יום אחד",()=>{
  const rows=[m("a1","2026-06-01",6.00),m("a2","2026-06-01",5.90),m("a3","2026-06-01",5.80)];
  const p=D.progress(rows,S,"r60","low");
  assert.equal(p.count,3);
  assert.equal(p.days,1);
  assert.equal(p.reason,D.PROGRESS_ONE,"יום אחד — אין התקדמות לדווח עליה");
  assert.equal(p.best.val,5.80,"אבל יש שיא");
});

test("מדידות פגומות נספרות בנפרד ולא מעוותות את החישוב",()=>{
  const rows=[m("r1","2026-06-01",5.80),m("bad","2026-07-01",null),m("r2","2026-12-01",5.42)];
  const p=D.progress(rows,S,"r60","low");
  assert.equal(p.count,2,"שתי מדידות תקפות");
  assert.equal(p.rawCount,3,"מתוך שלוש רשומות");
  assert.equal(p.invalid,1);
  assert.equal(p.rawDelta,-0.38,"הפגומה לא נכנסה לחישוב");
});

test("התקדמות שורדת שינוי שם של התלמיד",()=>{
  const p=D.progress(hist,{id:"s1",name:"דן אבירם-לוי"},"r60","low");
  assert.equal(p.count,3,"המזהה קובע, לא השם");
});

test("התקדמות שורדת מעבר כיתה",()=>{
  const rows=hist.concat([m("r4","2027-01-01",5.30,{cls:"י׳1",cid:"c:י:1"})]);
  const p=D.progress(rows,S,"r60","low");
  assert.equal(p.count,4,"כל ההיסטוריה, בשתי הכיתות");
  assert.equal(p.best.val,5.30);
  assert.equal(p.first.cls,"ט׳3","והכיתה בזמן המדידה נשמרה כהקשר");
  assert.equal(p.latest.cls,"י׳1");
});

test("שני תלמידים בעלי אותו שם אינם חולקים התקדמות",()=>{
  const rows=[m("a","2026-06-01",5.80,{sid:"s1",name:"דן כהן"}),
              m("b","2026-12-01",5.20,{sid:"s2",name:"דן כהן"})];
  assert.equal(D.progress(rows,{id:"s1",name:"דן כהן"},"r60","low").count,1);
  assert.equal(D.progress(rows,{id:"s2",name:"דן כהן"},"r60","low").count,1);
});

test("רשומה ישנה בלי מזהה עדיין נמצאת לפי שם",()=>{
  const rows=[{id:"old",test:"r60",cls:"ט׳3",name:"דן אבירם",d:"2025-06-01",ts:1,val:6.2},
              m("new","2026-12-01",5.42)];
  const p=D.progress(rows,S,"r60","low");
  assert.equal(p.count,2,"ההיסטוריה שלפני המעבר לזהות יציבה עדיין מחוברת");
  assert.equal(p.first.id,"old");
});
