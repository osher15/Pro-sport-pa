"use strict";
/* מדידות שממתינות להכרעה.
   שלב 2 סימן ולא ניחש. הבדיקות כאן מוודאות ששלב 3 לא התפתה
   לנחש בדלת האחורית: ההכרעה מגיעה מהמורה, ורק ממנו. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

const rows=()=>[
  {id:"a",cls:"ט׳3",name:"דן כהן",test:"push",d:"2026-09-01",val:20,sidAmbig:"duplicate-name"},
  {id:"b",cls:"ט3", name:"דן כהן",test:"push",d:"2026-09-08",val:24,sidAmbig:"duplicate-name"},
  {id:"c",cls:"ט׳3",name:"תלמיד שעזב",test:"push",d:"2026-09-01",val:18,sidAmbig:"no-roster-match"},
  {id:"d",cls:"ט׳3",name:"רון לוי",test:"push",d:"2026-09-01",val:30,sid:"s1"},
  {id:"e",cls:"י׳1", name:"דן כהן",test:"push",d:"2026-09-01",val:22,sidAmbig:"duplicate-name"}
];

test("מזוהות רק רשומות שאין להן מזהה",()=>{
  const a=D.ambiguous(rows());
  assert.deepEqual(a.map(r=>r.id),["a","b","c","e"]);
});

test("רשומה עם סימון וגם מזהה אינה ממתינה להכרעה",()=>{
  const a=D.ambiguous([{id:"x",sid:"s1",sidAmbig:"duplicate-name"}]);
  assert.equal(a.length,0,"כבר שויכה — הסימון הוא שריד");
});

test("קיבוץ לפי כיתה ושם: שאלה אחת לתלמיד, לא לכל מדידה",()=>{
  const g=D.ambiguousGroups(rows());
  assert.equal(g.length,3,"«דן כהן» בט׳3, «תלמיד שעזב», ו«דן כהן» בי׳1");
  const dan=g.find(x=>x.name==="דן כהן"&&D.clsKey(x.cls)==="ט3");
  assert.deepEqual(dan.ids,["a","b"],"שתי המדידות שלו יחד");
  assert.equal(dan.reason,"duplicate-name");
});

test("אותו שם בשתי כיתות הוא שתי שאלות נפרדות",()=>{
  const g=D.ambiguousGroups(rows()).filter(x=>x.name==="דן כהן");
  assert.equal(g.length,2);
  assert.notEqual(g[0].key,g[1].key);
});

test("«ט3» ו-«ט׳3» מתקבצות יחד",()=>{
  const g=D.ambiguousGroups([
    {id:"a",cls:"ט3",name:"דן",sidAmbig:"x"},
    {id:"b",cls:"ט׳3",name:"דן",sidAmbig:"x"}]);
  assert.equal(g.length,1);
  assert.deepEqual(g[0].ids,["a","b"]);
});

test("מערך ריק לא מפיל",()=>{
  assert.deepEqual(D.ambiguous(null),[]);
  assert.deepEqual(D.ambiguousGroups(null),[]);
  assert.deepEqual(D.ambiguousGroups([null,undefined]),[]);
});

/* ---------- מועמדים ---------- */

test("המועמדים הם תלמידי הכיתה, ושם תואם עולה לראש",()=>{
  const roster=[{id:"s1",name:"רון"},{id:"s2",name:"דן כהן"},{id:"s3",name:"דן כהן"},{id:"s4",name:"גל"}];
  const c=D.resolveCandidates(roster,"דן כהן");
  assert.deepEqual(c.exact.map(s=>s.id),["s2","s3"],"שני התואמים");
  assert.deepEqual(c.other.map(s=>s.id),["s1","s4"],"והשאר");
  assert.deepEqual(c.all.map(s=>s.id),["s2","s3","s1","s4"],"התואמים ראשונים");
});

test("סידור אינו בחירה: שני תואמים נשארים שניים",()=>{
  const c=D.resolveCandidates([{id:"s2",name:"דן"},{id:"s3",name:"דן"}],"דן");
  assert.equal(c.exact.length,2,"המערכת לא מכריעה ביניהם");
});

test("רשימה ריקה מחזירה אפס מועמדים",()=>{
  assert.deepEqual(D.resolveCandidates([],"דן").all,[]);
  assert.deepEqual(D.resolveCandidates(null,"דן").all,[]);
});

/* ---------- ההכרעה ---------- */

test("הכרעה כותבת מזהה ומסירה את הסימון",()=>{
  const r=D.resolveAmbiguous(rows(),["a","b"],"s7");
  assert.equal(r.ok,true);
  assert.equal(r.changed,2);
  const a=r.rows.find(x=>x.id==="a");
  assert.equal(a.sid,"s7");
  assert.equal(a.sidAmbig,undefined,"הסימון יורד רק אחרי שיוך בפועל");
  assert.equal(a.sidFrom,"manual","ומתועד שזאת הכרעה ידנית");
});

test("הכרעה אינה נוגעת ברשומות אחרות",()=>{
  const before=rows();
  const r=D.resolveAmbiguous(before,["a"],"s7");
  assert.equal(r.rows.length,before.length,"אף רשומה לא נמחקה");
  assert.equal(r.rows.find(x=>x.id==="b").sidAmbig,"duplicate-name","«ב» נשארה ממתינה");
  assert.equal(r.rows.find(x=>x.id==="c").sidAmbig,"no-roster-match");
  assert.equal(r.rows.find(x=>x.id==="d").sid,"s1","ורשומה מזוהה לא נגעה");
});

test("הקלט אינו משתנה במקום",()=>{
  const before=rows();
  const copy=JSON.stringify(before);
  D.resolveAmbiguous(before,["a","b"],"s7");
  assert.equal(JSON.stringify(before),copy,"הקריאה טהורה");
});

test("הכרעה בלי מזהה נדחית",()=>{
  [null,undefined,""].forEach(v=>{
    const r=D.resolveAmbiguous(rows(),["a"],v);
    assert.equal(r.ok,false,JSON.stringify(v));
    assert.equal(r.error,"no-sid");
    assert.equal(r.changed,0);
  });
});

test("רשומה שכבר מזוהה אינה נדרסת",()=>{
  const r=D.resolveAmbiguous(rows(),["d"],"s99");
  assert.equal(r.ok,false,"אין מה להכריע");
  assert.equal(r.rows.find(x=>x.id==="d").sid,"s1","המזהה המקורי שרד");
});

test("מזהה שאינו קיים בקבוצה מדולג בשקט ולא פוגע",()=>{
  const r=D.resolveAmbiguous(rows(),["אין-כזה"],"s7");
  assert.equal(r.ok,false);
  assert.equal(r.changed,0);
  assert.equal(r.rows.length,5);
});

test("אחרי הכרעה הרשומות כבר לא ממתינות",()=>{
  const r=D.resolveAmbiguous(rows(),["a","b"],"s7");
  const left=D.ambiguousGroups(r.rows).filter(g=>g.name==="דן כהן"&&D.clsKey(g.cls)==="ט3");
  assert.equal(left.length,0,"הקבוצה נסגרה");
  assert.equal(D.ambiguous(r.rows).length,2,"ונשארו רק השתיים האחרות");
});

test("רשומה שלא הוכרעה נשארת בטוחה ונגישה",()=>{
  const r=D.resolveAmbiguous(rows(),["a","b"],"s7");
  const c=r.rows.find(x=>x.id==="c");
  assert.equal(c.sidAmbig,"no-roster-match","עדיין מסומנת");
  assert.equal(c.val,18,"והנתון עצמו שלם");
  /* ועדיין נמצאת לפי שם, כמו לפני שלב 2 */
  assert.equal(D.sameStudent(c,{name:"תלמיד שעזב"}),true);
});
