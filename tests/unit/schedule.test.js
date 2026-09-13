"use strict";
/* מערכת שעות.
   המשבצת חוזרת כל שבוע; השיעור שהתקיים הוא רשומה נפרדת. הבדיקות
   כאן מגנות בדיוק על ההפרדה הזאת — ועל שני מקומות שבהם קל לטעות
   בשקט: פירוש שעה, ויום בשבוע מתוך תאריך. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

const SLOT={day:2,time:"09:00",cid:"c:ט:3",clsSnapshot:"ט׳3"};
const add=(list,o)=>D.schedAdd(list,Object.assign({},SLOT,o||{}));

/* ============ שעה ============ */

test("שעה נקראת לדקות, ושעה פגומה אינה חצות",()=>{
  assert.equal(D.timeMin("09:00"),540);
  assert.equal(D.timeMin("9:05"),545,"ספרה אחת — כפי שמקלידים");
  assert.equal(D.timeMin("00:00"),0,"חצות היא שעה תקפה");
  ["","9","09:60","24:00","abc",null,undefined,"09:0"].forEach(v=>
    assert.equal(D.timeMin(v),null,"ערך פגום: "+String(v)));
});

test("דקות חוזרות לשעה מנורמלת",()=>{
  assert.equal(D.fmtTime(540),"09:00");
  assert.equal(D.fmtTime(545),"09:05");
  assert.equal(D.fmtTime(0),"00:00");
});

/* ============ יום בשבוע ============ */

test("יום בשבוע נגזר מהתאריך בלי תלות באזור זמן",()=>{
  assert.equal(D.dayOfISO("2026-09-13"),0,"ראשון");
  assert.equal(D.dayOfISO("2026-09-15"),2,"שלישי");
  assert.equal(D.dayOfISO("2026-09-19"),6,"שבת");
  assert.equal(D.dayOfISO("בלי תאריך"),null);
});

/* ============ הוספה ============ */

test("משבצת נושאת יום, שעה וזהות כיתה",()=>{
  const r=add([]);
  assert.equal(r.ok,true);
  assert.equal(r.outcome,"added");
  assert.equal(r.slot.cid,"c:ט:3");
  assert.equal(r.slot.clsSnapshot,"ט׳3","השם כהקשר");
  assert.equal(r.list.length,1);
});

test("שעה מנורמלת בכתיבה, כדי שהמיון לא יישען על צורת ההקלדה",()=>{
  const r=add([],{time:"9:5"});
  assert.equal(r.ok,false,"9:5 אינה שעה");
  const ok=add([],{time:"9:05"});
  assert.equal(ok.slot.time,"09:05");
});

test("אותה כיתה באותו יום ובאותה שעה אינה נוספת פעמיים",()=>{
  const one=add([]);
  const two=add(one.list,{time:"9:00"});
  assert.equal(two.outcome,"duplicate");
  assert.equal(two.list.length,1,"הרשימה לא גדלה");
  assert.equal(two.slot.id,one.slot.id,"מוחזרת המשבצת הקיימת");
});

test("אותה כיתה בשעה אחרת באותו יום — כן",()=>{
  const one=add([]);
  const two=add(one.list,{time:"11:00"});
  assert.equal(two.outcome,"added");
  assert.equal(two.list.length,2);
});

test("קלט פגום נדחה בשם, לא בשקט",()=>{
  assert.equal(D.schedAdd([],{day:2,time:"09:00"}).outcome,"no-class");
  assert.equal(add([],{time:"25:00"}).outcome,"bad-time");
  assert.equal(add([],{day:7}).outcome,"bad-day");
  assert.equal(add([],{day:-1}).outcome,"bad-day");
});

test("יש גבול לגודל המערכת",()=>{
  let list=[];
  for(let i=0;i<D.SCHED_MAX;i++)
    list=add(list,{time:D.fmtTime(300+i),day:i%6}).list;
  const over=add(list,{time:"23:59",day:0});
  assert.equal(over.outcome,"full");
});

/* ============ רשימה ומיון ============ */

test("הרשימה ממוינת לפי יום ואז שעה, פעם אחת ובמקום אחד",()=>{
  let l=[];
  l=add(l,{day:3,time:"11:00"}).list;
  l=add(l,{day:1,time:"14:00",cid:"c:ח:1"}).list;
  l=add(l,{day:1,time:"08:00",cid:"c:ז:2"}).list;
  const out=D.schedList(l).map(s=>s.day+"@"+s.time);
  assert.deepEqual(out,["1@08:00","1@14:00","3@11:00"]);
});

test("משבצת פגומה שנשמרה פעם אינה מפילה את הרשימה",()=>{
  const l=[null,{id:"x"},{id:"y",cid:"c:ט:3",day:9,time:"09:00"},add([]).list[0]];
  assert.equal(D.schedList(l).length,1,"רק התקפה שורדת");
});

test("סינון לפי כיתה ולפי יום",()=>{
  let l=add([]).list;
  l=add(l,{day:4,cid:"c:ח:1"}).list;
  assert.equal(D.schedList(l,{cid:"c:ח:1"}).length,1);
  assert.equal(D.schedList(l,{day:2}).length,1);
});

test("הסרה מוציאה משבצת אחת בלבד",()=>{
  const one=add([]);
  const two=add(one.list,{time:"11:00"});
  const r=D.schedRemove(two.list,one.slot.id);
  assert.equal(r.ok,true);
  assert.equal(r.list.length,1);
  assert.equal(D.schedRemove(r.list,"no-such").ok,false,"מזהה שאינו קיים");
});

/* ============ היום ============ */

test("«היום» מחזיר רק את משבצות היום הנכון",()=>{
  let l=add([]).list;                       /* שלישי */
  l=add(l,{day:0,cid:"c:ח:1"}).list;        /* ראשון */
  assert.equal(D.schedToday(l,"2026-09-15",[]).length,1,"שלישי");
  assert.equal(D.schedToday(l,"2026-09-13",[]).length,1,"ראשון");
  assert.equal(D.schedToday(l,"2026-09-14",[]).length,0,"שני — אין");
});

test("משבצת ללא שיעור היא «מתוכנן»",()=>{
  const rows=D.schedToday(add([]).list,"2026-09-15",[]);
  assert.equal(rows[0].status,"planned");
  assert.equal(rows[0].session,null);
});

test("שיעור פתוח באותה כיתה ובאותו תאריך מסמן «פעיל»",()=>{
  const l=add([]).list;
  const ses=D.createSession([],{cid:"c:ט:3",clsSnapshot:"ט׳3",date:"2026-09-15"}).list;
  const rows=D.schedToday(l,"2026-09-15",ses);
  assert.equal(rows[0].status,"active");
  assert.ok(rows[0].session,"השיעור מוחזר, לא רק הדגל");
});

test("שיעור שהסתיים מסמן «התקיים» — גם אם התחיל באיחור",()=>{
  const l=add([]).list;
  let ses=D.createSession([],{cid:"c:ט:3",date:"2026-09-15"});
  ses=D.completeSession(ses.list,ses.session.id);
  const rows=D.schedToday(l,"2026-09-15",ses.list);
  assert.equal(rows[0].status,"done","השעה בפועל אינה משנה — הכיתה והתאריך כן");
});

test("שיעור בכיתה אחרת אינו מסמן את המשבצת",()=>{
  const l=add([]).list;
  const ses=D.createSession([],{cid:"c:ח:1",date:"2026-09-15"}).list;
  assert.equal(D.schedToday(l,"2026-09-15",ses)[0].status,"planned");
});

test("שיעור מאתמול אינו מסמן את משבצת היום",()=>{
  let l=add([]).list;
  l=add(l,{day:1,cid:"c:ט:3"}).list;   /* אותה כיתה, יום קודם */
  const ses=D.createSession([],{cid:"c:ט:3",date:"2026-09-14"}).list;
  assert.equal(D.schedToday(l,"2026-09-15",ses)[0].status,"planned");
});

/* ============ הבא בתור ============ */

test("הבא בתור הוא השיעור הפתוח, אם יש",()=>{
  let l=add([]).list;
  l=add(l,{time:"11:00",cid:"c:ח:1"}).list;
  const ses=D.createSession([],{cid:"c:ח:1",date:"2026-09-15"}).list;
  const n=D.schedNext(l,"2026-09-15",ses,8*60);
  assert.equal(n.status,"active");
  assert.equal(n.slot.cid,"c:ח:1","השיעור הפתוח גובר על השעה המוקדמת יותר");
});

test("אחרת — המשבצת הקרובה שטרם התקיימה",()=>{
  let l=add([]).list;                                /* 09:00 */
  l=add(l,{time:"11:00",cid:"c:ח:1"}).list;
  assert.equal(D.schedNext(l,"2026-09-15",[],8*60).slot.time,"09:00");
  assert.equal(D.schedNext(l,"2026-09-15",[],10*60).slot.time,"11:00",
    "שיעור שעבר אינו «הבא»");
});

test("שיעור שהתחיל לפני רגע עדיין נחשב הבא בתור",()=>{
  const l=add([]).list;                              /* 09:00 */
  assert.ok(D.schedNext(l,"2026-09-15",[],9*60+10),
    "עשר דקות אחרי הצלצול המורה עדיין מחפש את הכיתה הזאת");
});

test("יום בלי שיעורים מחזיר null ולא קורס",()=>{
  assert.equal(D.schedNext(add([]).list,"2026-09-14",[],9*60),null);
  assert.equal(D.schedNext([],"2026-09-15",[],9*60),null);
});

/* ============ לוח הצלצולים ============ */

test("לוח הצלצולים שלם ועולה",()=>{
  assert.equal(D.BELLS.length,10);
  let prev=-1;
  D.BELLS.forEach(b=>{
    const s=D.timeMin(b.s), e=D.timeMin(b.e);
    assert.ok(s!=null&&e!=null,"שעות תקפות בשיעור "+b.h);
    assert.ok(e>s,"שיעור "+b.h+" מסתיים אחרי שהתחיל");
    assert.ok(s>=prev,"הסדר עולה");
    prev=s;
  });
});

test("מספר שיעור מחזיר את הצלצול שלו",()=>{
  assert.equal(D.bellByHour(3).s,"09:45");
  assert.equal(D.bellByHour(99),null);
  assert.equal(D.bellByHour("2").s,"09:00","גם כמחרוזת — כך מגיע מ-select");
});

test("שעה שהיא תחילת שיעור מזוהה ככזאת",()=>{
  assert.equal(D.bellOfTime("09:45").h,3);
  assert.equal(D.bellOfTime("09:47"),null,"שעה חופשית אינה צלצול");
});

test("חלון המשבצת בא מהצלצול, ואחרת 45 דקות",()=>{
  assert.deepEqual(D.slotWindow({time:"09:45"}),{from:585,to:630},"לפי הצלצול");
  assert.deepEqual(D.slotWindow({time:"09:47"}),{from:587,to:587+45},"ברירת מחדל");
  assert.equal(D.slotWindow({time:"—"}),null);
});

test("«עכשיו» הוא בתוך החלון, לא אחריו",()=>{
  const sl={time:"09:00"};                 /* 09:00–09:45 */
  assert.equal(D.slotNow(sl,9*60),true,"ברגע הצלצול");
  assert.equal(D.slotNow(sl,9*60+44),true);
  assert.equal(D.slotNow(sl,9*60+45),false,"בדיוק בסוף — כבר לא");
  assert.equal(D.slotNow(sl,8*60+59),false);
  assert.equal(D.slotNow(sl,null),false,"בלי שעון אין «עכשיו»");
});

test("«עכשיו» מסומן בשורת היום",()=>{
  const l=D.schedAdd([],{day:0,time:"09:00",cid:"c:ז:2"}).list;
  assert.equal(D.schedToday(l,"2026-09-13",[],9*60+10)[0].now,true);
  assert.equal(D.schedToday(l,"2026-09-13",[],13*60)[0].now,false);
  assert.equal(D.schedToday(l,"2026-09-13",[])[0].now,false,"בלי שעון — בלי הצהרה");
});

test("השיעור שמתקיים עכשיו גובר על הקרוב מאוחר יותר",()=>{
  let l=D.schedAdd([],{day:0,time:"09:00",cid:"c:ז:2"}).list;
  l=D.schedAdd(l,{day:0,time:"11:40",cid:"c:ח:1"}).list;
  assert.equal(D.schedNext(l,"2026-09-13",[],9*60+20).slot.cid,"c:ז:2");
});

test("שיעור שהתקיים כבר אינו «עכשיו» גם אם השעון בתוכו",()=>{
  const l=D.schedAdd([],{day:0,time:"09:00",cid:"c:ז:2"}).list;
  let ses=D.createSession([],{cid:"c:ז:2",date:"2026-09-13"});
  ses=D.completeSession(ses.list,ses.session.id);
  const n=D.schedNext(l,"2026-09-13",ses.list,9*60+10);
  assert.equal(n,null,"נגמר — ולא מציעים אותו שוב");
});
