"use strict";
/* שלב 8ב — שאילתות מדידה לפי זהות.
   עד עכשיו measurementsOf / profileOf / missingTests / attemptsOf צמצמו
   לכיתה לפי clsKey(r.cls) — שם. עכשיו opts.cid מצמצם לפי זהות, ו-
   opts.cls נשאר לקוראים שטרם עברו. שני המסלולים חייבים לתת אותה
   תשובה על נתונים רגילים, ורק cid שורד שינוי שם. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

const DAN={id:"a",name:"דן",sex:"boys"};
const TESTS=[{id:"push",dir:"high",unit:"חזרות"},{id:"r60",dir:"low",unit:"שנ׳"}];
/* דן נמדד בט׳3 (שנתיים), עבר לי׳1 ונמדד שוב. מדידה ישנה אחת בלי cid. */
const rows=()=>[
  {id:"m1",d:"2025-09-01",ts:1,cls:"ט׳3",cid:"c:ט:3",test:"push",name:"דן",sid:"a",val:20},
  {id:"m2",d:"2025-12-01",ts:2,cls:"ט3", cid:"c:ט:3",test:"push",name:"דן",sid:"a",val:24},
  {id:"m3",d:"2026-03-01",ts:3,cls:"ט׳3",            test:"push",name:"דן",sid:"a",val:26}, /* ישנה, בלי cid */
  {id:"m4",d:"2026-09-01",ts:4,cls:"י׳1",cid:"c:י:1",test:"push",name:"דן",sid:"a",val:30},
  {id:"m5",d:"2026-09-01",ts:5,cls:"י׳1",cid:"c:י:1",test:"r60", name:"דן",sid:"a",val:9.1},
  {id:"m6",d:"2026-09-01",ts:6,cls:"י׳1",cid:"c:י:1",test:"r60", name:"רון",sid:"b",val:8.8},
  {id:"m7",d:"2026-09-01",ts:7,cls:"ט׳3",cid:"c:ט:3",test:"ljump",name:"גל",sid:"c",val:180}
];

test("measurementsOf: opts.cid מצמצם לפי זהות, ומדידה ישנה בלי cid נמצאת לפי התווית",()=>{
  const all=D.measurementsOf(rows(),DAN,"push");
  assert.deepEqual(all.map(r=>r.id),["m1","m2","m3","m4"],"בלי צמצום — ההיסטוריה המלאה");
  const t3=D.measurementsOf(rows(),DAN,"push",{cid:"c:ט:3"});
  assert.deepEqual(t3.map(r=>r.id),["m1","m2","m3"],"לפי cid — כולל הישנה שרק התווית עליה");
  assert.deepEqual(D.measurementsOf(rows(),DAN,"push",{cid:"c:י:1"}).map(r=>r.id),["m4"]);
});

test("measurementsOf: opts.cls עדיין עובד בדיוק כמו קודם, ושני המסלולים מסכימים",()=>{
  const byCls=D.measurementsOf(rows(),DAN,"push",{cls:"ט3"});
  const byCid=D.measurementsOf(rows(),DAN,"push",{cid:"c:ט:3"});
  assert.deepEqual(byCls.map(r=>r.id),["m1","m2","m3"]);
  assert.deepEqual(byCls.map(r=>r.id),byCid.map(r=>r.id),"אותה תשובה");
});

test("measurementsOf: כשיש גם cid וגם cls — cid קובע",()=>{
  const r=D.measurementsOf(rows(),DAN,"push",{cid:"c:י:1",cls:"ט3"});
  assert.deepEqual(r.map(x=>x.id),["m4"]);
});

test("measurementsOf: cid לא תקין מתעלמים ממנו — נופלים ל-cls או להיסטוריה המלאה",()=>{
  assert.equal(D.measurementsOf(rows(),DAN,"push",{cid:""}).length,4);
  assert.equal(D.measurementsOf(rows(),DAN,"push",{cid:null,cls:"י1"}).length,1);
});

test("rowInClass: לפי cid כשיש, לפי תווית כשאין, ולעולם לא לפי cid ריק",()=>{
  assert.equal(D.rowInClass({cid:"c:ט:3",cls:"שם ישן"},"c:ט:3"),true);
  assert.equal(D.rowInClass({cid:"c:ט:3",cls:"י׳1"},"c:י:1"),false,"ה-cid גובר על התווית");
  assert.equal(D.rowInClass({cls:"ט3"},"c:ט:3"),true,"מדידה ישנה — לפי התווית");
  assert.equal(D.rowInClass({cls:""},"c:ט:3"),false);
  assert.equal(D.rowInClass({cid:"c:ט:3"},""),false);
  assert.equal(D.rowInClass(null,"c:ט:3"),false);
});

test("שינוי שם כיתה: הצמצום לפי cid שורד, לפי cls לא — וזה בדיוק למה עוברים",()=>{
  /* אחרי שינוי שם, מדידות חדשות נכתבות עם התווית החדשה ואותו cid */
  const rs=rows().concat([{id:"m8",d:"2026-10-01",ts:8,cls:"ט׳3 — מגמת ספורט",cid:"c:ט:3",test:"push",name:"דן",sid:"a",val:33}]);
  assert.deepEqual(D.measurementsOf(rs,DAN,"push",{cid:"c:ט:3"}).map(r=>r.id),["m1","m2","m3","m8"],"cid מחבר ישן וחדש");
  assert.deepEqual(D.measurementsOf(rs,DAN,"push",{cls:"ט3"}).map(r=>r.id),["m1","m2","m3"],"cls מפספס את החדשה");
});

test("attemptsOf: פרמטר חמישי opts.cid, בלי לשבור את הקוראים הקיימים",()=>{
  assert.deepEqual(D.attemptsOf(rows(),"ט3","push",DAN).map(r=>r.id),["m1","m2","m3"],"החתימה הישנה");
  assert.deepEqual(D.attemptsOf(rows(),"שם שלא קיים","push",DAN,{cid:"c:ט:3"}).map(r=>r.id),["m1","m2","m3"],"cid גובר על התווית");
  assert.deepEqual(D.attemptsOf(rows(),"ט3","push",DAN,{cid:"c:י:1"}).map(r=>r.id),["m4"]);
});

test("profileOf: opts.cid מצמצם את הפרופיל לכיתה, ומדידות מכיתה קודמת נשארות מחוץ לו",()=>{
  const full=D.profileOf(rows(),DAN,TESTS);
  assert.equal(full.measured,2,"push ו-r60");
  assert.deepEqual(full.classes,["c:ט:3","cls:ט3","c:י:1"],"ההקשר: שתי הכיתות, והמדידה הישנה מסומנת לפי תווית — כמו קודם");
  const y1=D.profileOf(rows(),DAN,TESTS,{cid:"c:י:1"});
  assert.deepEqual(y1.classes,["c:י:1"]);
  assert.equal(y1.tests.find(t=>t.testId==="push").count,1,"רק המדידה מי׳1");
  assert.equal(y1.tests.find(t=>t.testId==="push").best.id,"m4");
  const t3=D.profileOf(rows(),DAN,TESTS,{cid:"c:ט:3"});
  assert.equal(t3.measured,1,"בט׳3 לא היה r60");
  assert.equal(t3.tests[0].count,3,"שלוש מדידות push, כולל הישנה בלי cid");
});

test("profileOf: opts.cls ו-opts.cid נותנים אותו פרופיל על נתונים רגילים",()=>{
  const a=D.profileOf(rows(),DAN,TESTS,{cls:"ט׳3"});
  const b=D.profileOf(rows(),DAN,TESTS,{cid:"c:ט:3"});
  assert.equal(JSON.stringify(a),JSON.stringify(b));
});

test("missingTests: opts.cid קובע אילו מבחנים הכיתה עשתה",()=>{
  /* בי׳1 הכיתה עשתה push ו-r60; לדן יש את שניהם. בט׳3 — push ו-ljump; לדן חסר ljump */
  assert.deepEqual(D.missingTests(rows(),DAN,TESTS.concat([{id:"ljump",dir:"high"}]),{cid:"c:י:1"}),[]);
  assert.deepEqual(D.missingTests(rows(),DAN,TESTS.concat([{id:"ljump",dir:"high"}]),{cid:"c:ט:3"}),["ljump"]);
  assert.deepEqual(D.missingTests(rows(),DAN,TESTS.concat([{id:"ljump",dir:"high"}]),{cls:"ט3"}),["ljump"],"ו-cls כמו קודם");
});

test("תלמיד שעבר כיתה: הפרופיל המלא מכיל את שתי הכיתות, ולפי כיתה — רק אותה",()=>{
  const p=D.progress(rows(),DAN,"push","high");
  assert.equal(p.count,4); assert.equal(p.best.id,"m4");
  const old=D.progress(rows(),DAN,"push","high",{cid:"c:ט:3"});
  assert.equal(old.count,3); assert.equal(old.best.id,"m3");
});
