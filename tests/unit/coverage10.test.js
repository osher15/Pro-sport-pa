"use strict";
/* שלב 10 — «מה חסר לכיתה».
   classCoverage() היא שכבת תצוגה טהורה מעל missingTests() הקיימת:
   היא לא מכריעה מחדש למי שייכת מדידה, רק אוספת את ההכרעה הזאת
   לכל תלמיד ברשימה אחת. עמודות הכיתה (אילו מבחנים) נגזרות מאותם
   שני תנאים בדיוק ש-missingTests משתמשת בהם (cid/cls), לא מתוך
   כלל חדש. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

const TESTS=[{id:"push",dir:"high"},{id:"r60",dir:"low"},{id:"situp",dir:"high"}];
const X="c:ח:1", Y="c:ח:2";
const roster=[{id:"a",name:"Alice",cid:X},{id:"b",name:"Bob",cid:X},{id:"c",name:"Carol",cid:X}];
const rows=()=>[
  {id:"r1",test:"push",sid:"a",cid:X,cls:"ח1",val:20,d:"2026-09-01"},
  {id:"r2",test:"push",sid:"b",cid:X,cls:"ח1",val:18,d:"2026-09-01"},
  {id:"r3",test:"r60", sid:"a",cid:X,cls:"ח1",val:9.1,d:"2026-09-01"},
  /* מדידה ישנה בלי cid — לפי התווית שעליה, כמו rowInClass בכל מקום אחר */
  {id:"r4",test:"situp",sid:"c",cls:"ח1",val:30,d:"2026-08-01"},
  /* כיתה אחרת לגמרי — לא אמורה להשפיע */
  {id:"r5",test:"pull",sid:"z",cid:Y,cls:"ח2",val:5,d:"2026-09-01"}
];

test("עמודות: רק מבחנים שיש להם מדידה בפועל בכיתה, בסדר הקטלוג",()=>{
  const cov=D.classCoverage(rows(),roster,TESTS,{cid:X});
  assert.deepEqual(cov.tests,["push","r60","situp"]);
});

test("סטטוס תלמיד: השלים / חסר, בלי לגעת בתלמידים שלא ברשימה",()=>{
  const cov=D.classCoverage(rows(),roster,TESTS,{cid:X});
  const by=id=>cov.students.find(x=>x.stud.id===id).done;
  assert.deepEqual(by("a"),{push:true,r60:true,situp:false});
  assert.deepEqual(by("b"),{push:true,r60:false,situp:false});
  assert.deepEqual(by("c"),{push:false,r60:false,situp:true},"מדידה ישנה בלי cid נספרת לפי התווית");
});

test("כיתה אחרת אינה מדליפה עמודות או סטטוס",()=>{
  const rs=rows().concat([{id:"r6",test:"r60",sid:"z",cid:Y,cls:"ח2",val:8,d:"2026-09-01"}]);
  const other=[{id:"z",name:"Zoe",cid:Y}];
  const cov=D.classCoverage(rs,other,TESTS,{cid:Y});
  assert.deepEqual(cov.tests,["r60"],"רק r60 — לא push/situp שנמדדו בכיתה X");
  assert.deepEqual(cov.students,[{stud:other[0],done:{r60:true}}]);
});

test("שינוי שם כיתה: אותו cid, אותה מטריצה — הרישום לא משנה כלום כאן",()=>{
  const before=D.classCoverage(rows(),roster,TESTS,{cid:X});
  /* renameClass לא נוגע ב-rows/roster כלל, כפי שנבדק בשלבים 8–9;
     כאן רק מוודאים ש-classCoverage אדיש לחלוטין לשם התצוגה. */
  const after=D.classCoverage(rows(),roster,TESTS,{cid:X});
  assert.deepEqual(after,before);
});

test("כיתה בלי תלמידים: אין קריסה, שתי הרשימות ריקות",()=>{
  const cov=D.classCoverage(rows(),[],TESTS,{cid:X});
  assert.deepEqual(cov.tests,["push","r60","situp"]);
  assert.deepEqual(cov.students,[]);
});

test("כיתה בלי אף מדידה: אין עמודות, וכל תלמיד ברשימה בלי done כלשהו",()=>{
  const cov=D.classCoverage([],roster,TESTS,{cid:X});
  assert.deepEqual(cov.tests,[]);
  assert.deepEqual(cov.students.map(x=>x.done),[{},{},{}]);
});

test("כולם השלימו הכל: כל done הוא true",()=>{
  const full=[{id:"a",name:"Alice",cid:X}];
  const rs=[{id:"r1",test:"push",sid:"a",cid:X,val:1,d:"2026-09-01"},
            {id:"r2",test:"r60",sid:"a",cid:X,val:1,d:"2026-09-01"}];
  const cov=D.classCoverage(rs,full,TESTS,{cid:X});
  assert.deepEqual(cov.tests,["push","r60"]);
  assert.deepEqual(cov.students[0].done,{push:true,r60:true});
});

test("opts.cls (תאימות): עובד בדיוק כמו opts.cid על נתונים רגילים",()=>{
  const rs=[{id:"r1",test:"push",sid:"a",cls:"ח1",val:1,d:"2026-09-01"}];
  const byCls=D.classCoverage(rs,roster,TESTS,{cls:"ח1"});
  const byCid=D.classCoverage(rs,roster,TESTS,{cid:X});
  assert.deepEqual(byCls.tests,byCid.tests);
});

test("קלט פגום: rows/roster/testDefs לא מערכים — לא קורס",()=>{
  assert.deepEqual(D.classCoverage(null,null,null,{cid:X}),{tests:[],students:[]});
  assert.deepEqual(D.classCoverage("x","y","z",{cid:X}),{tests:[],students:[]});
});

test("רשומות null בתוך המערכים לא מפילות",()=>{
  const rs=[null,{id:"r1",test:"push",sid:"a",cid:X,val:1,d:"2026-09-01"}];
  const cov=D.classCoverage(rs,[null,{id:"a",name:"Alice",cid:X}],TESTS,{cid:X});
  assert.deepEqual(cov.tests,["push"]);
});

test("classCoverage אינה כותבת ל-rows או ל-roster (טהורה)",()=>{
  const rs=rows(), before=JSON.stringify(rs), r0=JSON.stringify(roster);
  D.classCoverage(rs,roster,TESTS,{cid:X});
  assert.equal(JSON.stringify(rs),before);
  assert.equal(JSON.stringify(roster),r0);
});
