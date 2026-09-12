"use strict";
/* שלב 11 — «תובנות התקדמות לכיתה».
   classProgress() היא שכבת תצוגה טהורה מעל classCoverage() (אותה
   הגדרת "נמדד") ו-progress() הקיימת (firstToLast — הטוב ביום
   האחרון מול הטוב ביום הראשון). אין כאן כלל השוואה חדש ואין זהות
   חדשה. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

const TESTS=[{id:"push",dir:"high",name:"שכיבות סמיכה"},{id:"r60",dir:"low",name:"60 מטר"}];
const X="c:ח:1", Y="c:ח:2";
const roster=[
  {id:"a",name:"Alice",cid:X},   /* משתפרת ב-push */
  {id:"b",name:"Bob",cid:X},     /* נסוג ב-push */
  {id:"c",name:"Carol",cid:X},   /* מדידה אחת בלבד — אין עם מה להשוות */
  {id:"e",name:"Erez",cid:X}     /* שתי מדידות זהות — ללא שינוי */
];
const rows=()=>[
  {id:"r1",test:"push",sid:"a",cid:X,cls:"ח1",val:20,d:"2026-09-01"},
  {id:"r2",test:"push",sid:"a",cid:X,cls:"ח1",val:26,d:"2026-09-15"},
  {id:"r3",test:"push",sid:"b",cid:X,cls:"ח1",val:22,d:"2026-09-01"},
  {id:"r4",test:"push",sid:"b",cid:X,cls:"ח1",val:16,d:"2026-09-15"},
  {id:"r5",test:"push",sid:"c",cid:X,cls:"ח1",val:18,d:"2026-09-01"},
  {id:"r6",test:"push",sid:"e",cid:X,cls:"ח1",val:20,d:"2026-09-01"},
  {id:"r7",test:"push",sid:"e",cid:X,cls:"ח1",val:20,d:"2026-09-15"},
  /* כיתה אחרת — לא אמורה לדלוף */
  {id:"r8",test:"push",sid:"z",cid:Y,cls:"ח2",val:5,d:"2026-09-01"}
];

test("1. צבירה נכונה: completed = improved+declined+noChange, לכל מבחן שנמדד",()=>{
  const cov=D.classProgress(rows(),roster,TESTS,{cid:X});
  assert.equal(cov.tests.length,1,"רק push נמדד בכיתה — r60 לא הופיע כלל");
  const push=cov.tests[0];
  assert.equal(push.testId,"push"); assert.equal(push.name,"שכיבות סמיכה");
  assert.equal(push.completed,4);
  assert.equal(push.completed,push.improved+push.declined+push.noChange);
});

test("2. מספר המשתפרים",()=>{
  const push=D.classProgress(rows(),roster,TESTS,{cid:X}).tests[0];
  assert.equal(push.improved,1,"רק אליס — 20→26 בכיוון high");
});

test("3. מספר הנסוגים",()=>{
  const push=D.classProgress(rows(),roster,TESTS,{cid:X}).tests[0];
  assert.equal(push.declined,1,"רק בוב — 22→16 בכיוון high");
});

test("4. בלי שינוי מדיד: גם תוצאה זהה וגם מדידה אחת בלבד",()=>{
  const push=D.classProgress(rows(),roster,TESTS,{cid:X}).tests[0];
  assert.equal(push.noChange,2,"קרול (מדידה אחת) + ארז (20=20)");
});

test("5. מבחן שאף אחד בכיתה לא ניגש אליו אינו מופיע",()=>{
  const cov=D.classProgress(rows(),roster,TESTS,{cid:X});
  assert.equal(cov.tests.find(t=>t.testId==="r60"),undefined);
});

test("6. בידוד לפי cid: כיתה אחרת אינה מדליפה תלמידים או ספירות",()=>{
  const other=[{id:"z",name:"Zoe",cid:Y}];
  const cov=D.classProgress(rows(),other,TESTS,{cid:Y});
  assert.equal(cov.tests.length,1);
  assert.equal(cov.tests[0].completed,1);
  assert.equal(cov.tests[0].improved,0); assert.equal(cov.tests[0].declined,0); assert.equal(cov.tests[0].noChange,1);
});

test("7. שינוי שם כיתה: אותו cid, אותן מדידות — אותה תוצאה בדיוק",()=>{
  const s=require("../helpers/memstore.js").memStore({
    "schema.version":D.SCHEMA_VERSION,
    "ft.classes":{[X]:{id:X,name:"ח׳1",grade:"ח",num:1,key:"ח1"}}
  });
  const before=D.classProgress(rows(),roster,TESTS,{cid:X});
  const r=D.renameClass(s,X,"ח׳1 מצטיינים");
  assert.equal(r.ok,true);
  /* renameClass לא נוגע ב-rows/roster בכלל — התוצאה זהה כי הקלט זהה */
  const after=D.classProgress(rows(),roster,TESTS,{cid:X});
  assert.deepEqual(after,before);
  assert.equal(D.classOf(s,X).name,"ח׳1 מצטיינים","רק השם ברישום השתנה");
});

test("8. דטרמיניסטית: שתי קריאות זהות נותנות אותה תוצאה בדיוק",()=>{
  const a=D.classProgress(rows(),roster,TESTS,{cid:X});
  const b=D.classProgress(rows(),roster,TESTS,{cid:X});
  assert.deepEqual(a,b);
  assert.deepEqual(a,D.classProgress(rows(),roster.slice().reverse(),TESTS,{cid:X}),
    "וגם בלי תלות בסדר הרשימה");
});

/* ---------- קצוות נוספים ---------- */

test("כיתה בלי תלמידים ברשימה: אין קריסה; אם יש מדידות מכיתה זו הן עדיין מוגדרות כ'נמדד', אבל 0 תלמידים בכל דלי",()=>{
  const cov=D.classProgress(rows(),[],TESTS,{cid:X});
  assert.equal(cov.tests.length,1,"push עדיין מוגדר כ'נמדד' — כמו ב-classCoverage");
  assert.deepEqual(cov.tests[0],{testId:"push",name:"שכיבות סמיכה",def:TESTS[0],completed:0,improved:0,declined:0,noChange:0});
});

test("כיתה בלי אף מדידה: אין מבחנים בכלל",()=>{
  const cov=D.classProgress([],roster,TESTS,{cid:X});
  assert.deepEqual(cov.tests,[]);
});

test("כל הכיתה משתפרת",()=>{
  const rs=[
    {id:"m1",test:"push",sid:"a",cid:X,val:10,d:"2026-09-01"},{id:"m2",test:"push",sid:"a",cid:X,val:15,d:"2026-09-10"},
    {id:"m3",test:"push",sid:"b",cid:X,val:10,d:"2026-09-01"},{id:"m4",test:"push",sid:"b",cid:X,val:12,d:"2026-09-10"}
  ];
  const cov=D.classProgress(rs,roster.slice(0,2),TESTS,{cid:X});
  assert.deepEqual(cov.tests[0],{testId:"push",name:"שכיבות סמיכה",def:TESTS[0],completed:2,improved:2,declined:0,noChange:0});
});

test("כל הכיתה ללא שינוי מדיד (מדידה אחת לכולם)",()=>{
  const rs=[{id:"m1",test:"push",sid:"a",cid:X,val:10,d:"2026-09-01"},{id:"m2",test:"push",sid:"b",cid:X,val:12,d:"2026-09-01"}];
  const cov=D.classProgress(rs,roster.slice(0,2),TESTS,{cid:X});
  assert.deepEqual(cov.tests[0],{testId:"push",name:"שכיבות סמיכה",def:TESTS[0],completed:2,improved:0,declined:0,noChange:2});
});

test("חלק משתפרים וחלק נסוגים — שני הדליים חיים זה לצד זה",()=>{
  const push=D.classProgress(rows(),roster,TESTS,{cid:X}).tests[0];
  assert.ok(push.improved>0&&push.declined>0);
});

test("opts.cls (תאימות): נותן אותה תוצאה כמו opts.cid על נתונים רגילים",()=>{
  const rs=[{id:"m1",test:"push",sid:"a",cls:"ח1",val:10,d:"2026-09-01"},{id:"m2",test:"push",sid:"a",cls:"ח1",val:15,d:"2026-09-10"}];
  const byCls=D.classProgress(rs,roster.slice(0,1),TESTS,{cls:"ח1"});
  const byCid=D.classProgress(rs,roster.slice(0,1),TESTS,{cid:X});
  assert.deepEqual(byCls,byCid);
});

test("קלט פגום: לא מערכים — לא קורס",()=>{
  assert.deepEqual(D.classProgress(null,null,null,{cid:X}),{tests:[]});
  assert.deepEqual(D.classProgress("x","y","z",{cid:X}),{tests:[]});
});

test("classProgress אינה כותבת ל-rows או ל-roster (טהורה)",()=>{
  const rs=rows(), r0=JSON.stringify(rs), ro=JSON.stringify(roster);
  D.classProgress(rs,roster,TESTS,{cid:X});
  assert.equal(JSON.stringify(rs),r0);
  assert.equal(JSON.stringify(roster),ro);
});

test("מדידה ישנה בלי cid נספרת לפי התווית — כמו rowInClass בכל מקום אחר",()=>{
  const legacy=[{id:"m1",test:"push",sid:"a",cls:"ח1",val:10,d:"2026-09-01"},
                {id:"m2",test:"push",sid:"a",cls:"ח1",val:20,d:"2026-09-10"}];
  const cov=D.classProgress(legacy,roster.slice(0,1),TESTS,{cid:X});
  assert.equal(cov.tests[0].improved,1);
});
