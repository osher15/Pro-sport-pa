"use strict";
/* מעבר תיקון לשלב 4 — בדיקות רגרסיה לשני באגים שאומתו בקוד.
   כל בדיקה כאן נכשלה לפני התיקון ועוברת אחריו. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

const S={id:"s1"};
const m=(id,d,val,t)=>({id,test:t||"r60",sid:"s1",cls:"ט׳3",cid:"c:ט:3",
  d,ts:+id.replace(/\D/g,"")||1,val,unit:"שנ׳"});

/* ============================================================
   באג 1 — אפס הפך לשיא אישי במבחן זמן
   ------------------------------------------------------------
   לפני התיקון: רשומה עם val:0 בריצת 60 מטר הייתה השיא האישי,
   ונקראה כשיפור של 5.42 שניות.
   ============================================================ */

test("אפס שניות אינו זמן ואינו יכול להיות שיא",()=>{
  const rows=[m("a","2026-06-01",5.42),m("b","2026-07-01",0)];
  const pb=D.personalBest(rows,S,"r60","low");
  assert.equal(pb.val,5.42,"השיא נשאר הזמן האמיתי");
  assert.equal(pb.id,"a");
});

test("אפס חזרות הוא תוצאה אמיתית ונשאר תקף",()=>{
  const rows=[{id:"c",test:"push",sid:"s1",cls:"ט׳3",d:"2026-06-01",ts:1,val:0}];
  assert.equal(D.progress(rows,S,"push","high").count,1,
    "תלמיד שלא הצליח אף חזרה נמדד — זה לא «לא נמדד»");
  assert.equal(D.personalBest(rows,S,"push","high").val,0);
});

test("הכיוון הוא שקובע אם אפס תקף",()=>{
  assert.equal(D.isValidMeasurement({val:0},"high"),true, "0 חזרות");
  assert.equal(D.isValidMeasurement({val:0},"low"), false,"0 שניות");
  assert.equal(D.isValidMeasurement({val:0}),true,
    "בלי כיוון — ההתנהגות הקודמת נשמרת");
});

test("אפס במבחן זמן נספר כפגום ולא נמחק",()=>{
  const rows=[m("a","2026-06-01",5.42),m("b","2026-07-01",0),m("c","2026-08-01",5.30)];
  const p=D.progress(rows,S,"r60","low");
  assert.equal(p.count,2,"שתי מדידות תקפות");
  assert.equal(p.rawCount,3,"מתוך שלוש רשומות");
  assert.equal(p.invalid,1);
  assert.equal(D.measurementsOf(rows,S,"r60").length,3,
    "והרשומה הפגומה נשארת בהיסטוריה הגולמית — שום דבר לא נמחק");
});

test("אפס במבחן זמן אינו מזייף שיפור",()=>{
  const p=D.progress([m("a","2026-06-01",5.42),m("b","2026-07-01",0)],S,"r60","low");
  assert.equal(p.reason,D.PROGRESS_ONE,"נשארה מדידה תקפה אחת");
  assert.equal(p.improved,null,"ולא «שיפור של 5.42 שניות»");
});

test("הערכה של אפס במבחן זמן נדחית כמדידה פגומה",()=>{
  const a=D.assess({mode:"norm",table:{r60:{boys:{"ט":[[9.4,60],[8.0,100]]}}},
    rows:[],testId:"r60",sex:"boys",grade:"ט",val:0,dir:"low"});
  assert.equal(a.v,null,"ולא הציון המושלם");
  assert.equal(a.reason,D.ASSESS_REASON.INVALID);
});

test("אפס במבחן חזרות עדיין מנוקד",()=>{
  const a=D.assess({mode:"norm",table:{push:{boys:{"ט":[[0,40],[30,100]]}}},
    rows:[],testId:"push",sex:"boys",grade:"ט",val:0,dir:"high"});
  assert.equal(a.v,40,"אפס חזרות מקבל את הציון שהטבלה קובעת לאפס");
});

/* ============================================================
   באג 2 — ההערכה ההיסטורית השתנתה כשהוחלפה טבלת הנורמה
   ------------------------------------------------------------
   לפני התיקון: אותה ריצה בדיוק קיבלה 80 בתשפ״ו ו-55 אחרי טעינת
   טבלת תשפ״ז. דוח התקדמות היה מראה ירידה שלא קרתה.
   ============================================================ */

const T26={push:{boys:{"ט":[[10,60],[30,100]]}}};
const T27={push:{boys:{"ט":[[10,40],[30,70]]}}};
const A  =D.archiveNorm(D.archiveNorm({},{version:"תשפ״ו",table:T26}),
                        {version:"תשפ״ז",table:T27});
const at=(table,ver,measured)=>D.assess({mode:"norm",table,rows:[],testId:"push",
  sex:"boys",grade:"ט",val:20,dir:"high",normVersion:ver,
  measuredNormVersion:measured,archive:A});

test("ההערכה ההיסטורית נשארת זהה אחרי החלפת טבלה",()=>{
  const then=at(T26,"תשפ״ו","תשפ״ו");
  const now =at(T27,"תשפ״ז","תשפ״ו");
  assert.equal(then.v,80,"הציון כשנמדד");
  assert.equal(now.v,80,"ואותו ציון היום — זה כל התיקון");
  assert.equal(now.reproduced,true,"שוחזר מהטבלה שהייתה בתוקף");
  assert.equal(now.stale,false,"ולכן אין מה לסמן");
  assert.equal(now.normVersion,"תשפ״ו","וההערכה אומרת באילו כללים חושבה");
});

test("מדידה חדשה מנוקדת בכללים החדשים",()=>{
  const fresh=at(T27,"תשפ״ז","תשפ״ז");
  assert.equal(fresh.v,55,"הכללים החדשים חלים על מה שנמדד תחתיהם");
  assert.equal(fresh.reproduced,true);
});

test("ישן וחדש חיים זה לצד זה בלי לדרוס",()=>{
  assert.equal(at(T27,"תשפ״ז","תשפ״ו").v,80,"המדידה הישנה");
  assert.equal(at(T27,"תשפ״ז","תשפ״ז").v,55,"והחדשה, באותה הרצה");
});

test("גרסה שאינה בארכיון — נופלים לכללי היום ומסמנים",()=>{
  const a=D.assess({mode:"norm",table:T27,rows:[],testId:"push",sex:"boys",
    grade:"ט",val:20,dir:"high",normVersion:"תשפ״ז",
    measuredNormVersion:"תשס״ח",archive:A});
  assert.equal(a.v,55,"אין טבלה לשחזר ממנה");
  assert.equal(a.reproduced,false);
  assert.equal(a.stale,true,"ולכן מסומן — לא מתחזים לשחזור");
});

test("מדידה ישנה בלי חותמת גרסה אינה מסומנת",()=>{
  const a=D.assess({mode:"norm",table:T27,rows:[],testId:"push",sex:"boys",
    grade:"ט",val:20,dir:"high",normVersion:"תשפ״ז",archive:A});
  assert.equal(a.stale,false,"אין ידיעה, ולכן אין טענה");
  assert.equal(a.reproduced,false);
});

test("בלי ארכיון בכלל — ההתנהגות הקודמת נשמרת",()=>{
  const a=D.assess({mode:"norm",table:T27,rows:[],testId:"push",sex:"boys",
    grade:"ט",val:20,dir:"high",normVersion:"תשפ״ז",measuredNormVersion:"תשפ״ו"});
  assert.equal(a.v,55);
  assert.equal(a.stale,true);
  assert.equal(a.reproduced,false);
});

test("הארכיון אינו משנה את המדידה הגולמית",()=>{
  const row={test:"push",val:20,unit:"חזרות",d:"2026-09-01",normVer:"תשפ״ו"};
  const snap=JSON.stringify(row);
  at(T27,"תשפ״ז",row.normVer);
  assert.equal(JSON.stringify(row),snap);
});

/* ---------- הארכיון עצמו ---------- */

test("ארכוב שומר גרסה תחת שמה",()=>{
  const a=D.archiveNorm({},{version:"תשפ״ו",source:"חוזר מנכ״ל",table:T26});
  assert.deepEqual(Object.keys(a),["תשפ״ו"]);
  assert.equal(a["תשפ״ו"].source,"חוזר מנכ״ל");
  assert.deepEqual(a["תשפ״ו"].table,T26);
  assert.ok(a["תשפ״ו"].at,"עם חותמת זמן");
});

test("ארכוב אינו משנה את הארכיון הקיים במקום",()=>{
  const before={"תשפ״ו":{version:"תשפ״ו",table:T26}};
  const snap=JSON.stringify(before);
  const after=D.archiveNorm(before,{version:"תשפ״ז",table:T27});
  assert.equal(JSON.stringify(before),snap,"הקריאה טהורה");
  assert.equal(Object.keys(after).length,2);
});

test("טבלה בלי שם גרסה אינה נכנסת לארכיון",()=>{
  assert.deepEqual(D.archiveNorm({},{version:"",table:T26}),{},
    "אין שם — אין דרך להפנות אליה");
  assert.deepEqual(D.archiveNorm({},null),{});
  assert.deepEqual(D.archiveNorm(null,{version:"א",table:{}}),
    D.archiveNorm({},{version:"א",table:{}}));
});

test("שמירה חוזרת של אותה גרסה דורסת אותה בלבד",()=>{
  const a1=D.archiveNorm({},{version:"תשפ״ו",table:T26});
  const a2=D.archiveNorm(a1,{version:"תשפ״ו",table:T27});
  assert.equal(Object.keys(a2).length,1);
  assert.deepEqual(a2["תשפ״ו"].table,T27,"הגרסה תוקנה, לא שוכפלה");
});
