"use strict";
/* שיעור פעיל — LessonSession.
   ההבחנה שכל השלב נבנה סביבה: מערך שיעור אומר מה התכוונו ללמד,
   שיעור אומר מה קרה ביום מסוים עם כיתה מסוימת. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

const C={cid:"c:ט:3",clsSnapshot:"ט׳3",date:"2026-09-12",now:1757000000000};
const start=(list,o)=>D.createSession(list,Object.assign({},C,o||{}));

/* ============ יצירה וזהות ============ */

test("שיעור חדש נושא את כל שדות הזהות",()=>{
  const r=start([]);
  assert.equal(r.ok,true);
  assert.equal(r.outcome,"created");
  const s=r.session;
  assert.ok(s.id,"sessionId");
  assert.equal(s.cid,"c:ט:3","מזהה כיתה יציב");
  assert.equal(s.clsSnapshot,"ט׳3","שם הכיתה כהקשר היסטורי");
  assert.equal(s.date,"2026-09-12");
  assert.equal(s.status,D.SESSION_ACTIVE);
  assert.equal(s.endedAt,null);
  assert.equal(s.planId,null,"שיעור ללא מערך — תקין");
});

test("שני שיעורים אינם מתנגשים במזהה",()=>{
  const ids=new Set();
  for(let i=0;i<200;i++)ids.add(D.newSessionId());
  assert.equal(ids.size,200);
});

test("בלי מזהה כיתה אין שיעור",()=>{
  [null,undefined,""].forEach(cid=>{
    const r=D.createSession([],{cid,clsSnapshot:"ט׳3"});
    assert.equal(r.ok,false,"cid="+String(cid));
    assert.equal(r.outcome,"no-class");
    assert.equal(r.list.length,0);
  });
});

test("התאריך נגזר מהשעון כשלא נמסר",()=>{
  const r=D.createSession([],{cid:"c:ט:3",now:Date.UTC(2026,8,12,7,30)});
  assert.equal(r.session.date,"2026-09-12");
});

test("שיעור מתוך מערך שומר הפניה ושם",()=>{
  const r=start([],{planId:"bi-7",planTitle:"כדורסל — מסירות"});
  assert.equal(r.session.planId,"bi-7");
  assert.equal(r.session.planTitle,"כדורסל — מסירות",
    "שם המערך נשמר כדי שההיסטוריה תהיה קריאה");
});

/* ============ הגנת כפילות ============ */

test("לחיצה כפולה על «התחל שיעור» אינה יוצרת שני שיעורים",()=>{
  const a=start([]);
  const b=start(a.list);
  assert.equal(b.outcome,"resumed","מוחזר אותו שיעור");
  assert.equal(b.session.id,a.session.id,"ואותו מזהה בדיוק");
  assert.equal(b.list.length,1,"ורשומה אחת בלבד");
});

test("עשר לחיצות רצופות — שיעור אחד",()=>{
  let L=[];
  for(let i=0;i<10;i++)L=start(L).list;
  assert.equal(L.length,1);
  assert.equal(D.listSessions(L,{status:D.SESSION_ACTIVE}).length,1);
});

test("שיעור פתוח בכיתה אחרת חוסם ואינו נדרס",()=>{
  const a=start([]);
  const b=D.createSession(a.list,{cid:"c:י:1",clsSnapshot:"י׳1"});
  assert.equal(b.ok,false);
  assert.equal(b.outcome,"blocked");
  assert.equal(b.session,null,"לא נוצר שיעור שני");
  assert.equal(b.active.id,a.session.id,"והקורא יודע מי חוסם");
  assert.equal(b.list.length,1,"הרשימה לא זזה");
});

test("אחרי סיום אפשר לפתוח שיעור בכיתה אחרת",()=>{
  const a=start([]);
  const done=D.completeSession(a.list,a.session.id);
  const b=D.createSession(done.list,{cid:"c:י:1",clsSnapshot:"י׳1"});
  assert.equal(b.outcome,"created");
  assert.equal(b.list.length,2,"ושניהם בהיסטוריה");
});

/* ============ חידוש ============ */

test("חידוש מחזיר את השיעור הקיים ולעולם לא יוצר חדש",()=>{
  const a=start([]);
  const r=D.resumeSession(a.list);
  assert.equal(r.ok,true);
  assert.equal(r.outcome,"resumed");
  assert.equal(r.session.id,a.session.id);
});

test("אין שיעור פעיל — חידוש מדווח על כך במפורש",()=>{
  const r=D.resumeSession([]);
  assert.equal(r.ok,false);
  assert.equal(r.outcome,"none");
  assert.equal(r.session,null);
});

test("שיעור שהסתיים אינו ניתן לחידוש",()=>{
  const a=start([]);
  const done=D.completeSession(a.list,a.session.id);
  assert.equal(D.resumeSession(done.list).outcome,"none");
  assert.equal(D.activeSession(done.list),null);
});

test("השיעור שורד «רענון»: הוא נמצא מתוך הרשימה השמורה",()=>{
  const a=start([]);
  /* בדיוק מה שקורה ברענון — הרשימה נקראת מהאחסון מחדש */
  const reloaded=JSON.parse(JSON.stringify(a.list));
  const found=D.activeSession(reloaded);
  assert.ok(found,"נמצא");
  assert.equal(found.id,a.session.id,"ואותו מזהה");
  assert.equal(found.clsSnapshot,"ט׳3");
});

/* ============ סיום ============ */

test("סיום מסמן ואינו מוחק",()=>{
  const a=start([]);
  const r=D.completeSession(a.list,a.session.id,1757009999999);
  assert.equal(r.ok,true);
  assert.equal(r.outcome,"completed");
  assert.equal(r.list.length,1,"הרשומה נשארה");
  assert.equal(r.session.status,D.SESSION_DONE);
  assert.equal(r.session.endedAt,1757009999999);
  assert.equal(r.session.id,a.session.id,"והמזהה לא זז");
  assert.equal(r.session.cid,"c:ט:3","וגם הזהות");
});

test("סיום כפול אינו שוגה ואינו משנה זמן",()=>{
  const a=start([]);
  const one=D.completeSession(a.list,a.session.id,111);
  const two=D.completeSession(one.list,a.session.id,222);
  assert.equal(two.ok,true);
  assert.equal(two.outcome,"already-completed");
  assert.equal(two.session.endedAt,111,"זמן הסיום המקורי נשמר");
});

test("סיום שיעור שאינו קיים מדווח ואינו נוגע ברשימה",()=>{
  const a=start([]);
  const r=D.completeSession(a.list,"אין-כזה");
  assert.equal(r.ok,false);
  assert.equal(r.outcome,"not-found");
  assert.equal(r.list.length,1);
  assert.equal(D.activeSession(r.list).id,a.session.id,"והפעיל נשאר פעיל");
});

test("היצירה והסיום אינם משנים את הרשימה במקום",()=>{
  const L=[];
  const a=D.createSession(L,C);
  assert.equal(L.length,0,"הקלט לא זז");
  const snap=JSON.stringify(a.list);
  D.completeSession(a.list,a.session.id);
  assert.equal(JSON.stringify(a.list),snap,"וגם בסיום");
});

/* ============ היסטוריה ============ */

test("רשימת שיעורים מסודרת מהחדש לישן",()=>{
  let L=start([],{now:1000}).list;
  L=D.completeSession(L,L[0].id).list;
  L=D.createSession(L,{cid:"c:י:1",clsSnapshot:"י׳1",now:2000}).list;
  assert.deepEqual(D.listSessions(L).map(x=>x.startedAt),[2000,1000]);
});

test("סינון לפי כיתה, סטטוס ותאריך",()=>{
  let L=start([],{now:1000}).list;
  L=D.completeSession(L,L[0].id).list;
  L=D.createSession(L,{cid:"c:י:1",clsSnapshot:"י׳1",date:"2026-09-13",now:2000}).list;
  assert.equal(D.listSessions(L,{cid:"c:ט:3"}).length,1);
  assert.equal(D.listSessions(L,{status:D.SESSION_DONE}).length,1);
  assert.equal(D.listSessions(L,{date:"2026-09-13"}).length,1);
});

test("רשומות פגומות ברשימה מדולגות",()=>{
  const L=[null,undefined,{},{id:"x",cid:"c",status:"active",startedAt:1}];
  assert.equal(D.listSessions(L).length,1);
  assert.equal(D.activeSession(L).id,"x");
});

test("ההיסטוריה חסומה בגודל",()=>{
  let L=[];
  for(let i=0;i<D.SESSION_MAX+20;i++){
    L=D.createSession(L,{cid:"c:ט:"+i,clsSnapshot:"כ"+i,now:i}).list;
    L=D.completeSession(L,L[0].id).list;
  }
  assert.equal(L.length,D.SESSION_MAX,"localStorage לא גדל לנצח");
});

/* ============ מדידות ============ */

const meas=(id,sess)=>({id,test:"ljump",sid:"a",cls:"ט׳3",cid:"c:ט:3",
  d:"2026-09-12",ts:+id.replace(/\D/g,"")||1,val:180,unit:"ס״מ",sessionId:sess});

test("מדידות השיעור נמצאות לפי ההקשר",()=>{
  const rows=[meas("m1","ls1"),meas("m2","ls1"),meas("m3","ls2"),meas("m4",null)];
  assert.deepEqual(D.sessionMeasurements(rows,"ls1").map(r=>r.id),["m1","m2"]);
  assert.deepEqual(D.sessionMeasurements(rows,"ls2").map(r=>r.id),["m3"]);
});

test("בלי מזהה שיעור אין מדידות שיעור",()=>{
  assert.deepEqual(D.sessionMeasurements([meas("m1","ls1")],null),[]);
  assert.deepEqual(D.sessionMeasurements([meas("m1","ls1")],""),[]);
});

test("מדידה בלי שיעור נשארת מדידה מלאה",()=>{
  const m=meas("m4",null);
  assert.equal(m.sid,"a"); assert.equal(m.cid,"c:ט:3");
  assert.equal(m.val,180); assert.equal(m.test,"ljump");
  assert.equal(D.sessionMeasurements([m],"ls1").length,0,
    "היא פשוט לא שייכת לשיעור — לא פגומה");
});

test("מדידת שיעור נשארת גולמית ומשתתפת בהתקדמות ובהערכה",()=>{
  const rows=[meas("m1","ls1"),Object.assign(meas("m2","ls1"),{d:"2026-10-01",val:190})];
  const p=D.progress(rows,{id:"a"},"ljump","high");
  assert.equal(p.count,2,"מדידות השיעור נספרות כמו כל מדידה");
  assert.equal(p.best.val,190);
  assert.equal(p.improved,true);
  assert.equal(p.best.sessionId,"ls1","וההקשר נשמר לצידן");
  const a=D.assess({mode:"norm",table:{ljump:{boys:{"ט":[[150,60],[200,100]]}}},
    rows,testId:"ljump",sex:"boys",grade:"ט",val:190,dir:"high"});
  assert.equal(a.v,92,"ואותה לוגיקת הערכה בדיוק — אין מנוע ניקוד שני");
});

test("סיום השיעור אינו נוגע במדידות שלו",()=>{
  const a=start([]);
  const rows=[meas("m1",a.session.id)];
  D.completeSession(a.list,a.session.id);
  assert.equal(D.sessionMeasurements(rows,a.session.id).length,1,
    "המדידות שרדו את סיום השיעור");
  assert.equal(rows[0].val,180);
});

/* ============ זהות לאורך זמן ============ */

test("שינוי שם הכיתה אינו מנתק את השיעור",()=>{
  const a=start([]);
  /* הכיתה שונתה אחרי השיעור — clsSnapshot הוא הקשר, cid הוא זהות */
  assert.equal(a.session.cid,"c:ט:3","המזהה קובע");
  assert.equal(a.session.clsSnapshot,"ט׳3","והשם מספר איך היא נקראה אז");
  assert.equal(D.listSessions(a.list,{cid:"c:ט:3"}).length,1,
    "ולכן השיעור נמצא לפי המזהה ולא לפי השם");
});

test("שתי כיתות שונות אינן חולקות שיעור גם כששמן זהה",()=>{
  let L=start([],{now:1}).list;
  L=D.completeSession(L,L[0].id).list;
  L=D.createSession(L,{cid:"c:ט:4",clsSnapshot:"ט׳3",now:2}).list;
  assert.equal(D.listSessions(L,{cid:"c:ט:3"}).length,1);
  assert.equal(D.listSessions(L,{cid:"c:ט:4"}).length,1);
});
