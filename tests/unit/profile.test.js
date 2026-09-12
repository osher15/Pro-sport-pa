"use strict";
/* פרופיל התלמיד.
   התמונה המלאה של תלמיד אחד על פני כל המבחנים — והמקום שבו
   נבדק שהיא באמת מלאה: גם ממה שנמדד לפני שהוא עבר כיתה. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

const DEFS=[
  {id:"r60", dir:"low", unit:"שנ׳",   name:"60 מטר",     cat:"run"},
  {id:"ljump",dir:"high",unit:"ס״מ",  name:"קפיצה לרוחק",cat:"jump"},
  {id:"push", dir:"high",unit:"חזרות",name:"שכיבות",     cat:"reps",cap:80}
];
const S={id:"s1",name:"דן אבירם",sex:"boys"};
const m=(id,t,d,val,o)=>Object.assign(
  {id,test:t,sid:"s1",cls:"ט׳3",cid:"c:ט:3",d,ts:+id.replace(/\D/g,"")||1,
   val,unit:"שנ׳",gradeKey:"ט",sex:"boys"},o||{});
const TABLE={r60:{boys:{"ט":[[9.4,60],[8.0,100]]}}};
const prof=(rows,opts)=>D.profileOf(rows,S,DEFS,Object.assign({mode:"norm",table:TABLE,grade:"ט"},opts||{}));

/* ============ הרכב ============ */

test("פרופיל ריק אינו קורס ואינו ממציא ציון",()=>{
  const p=prof([]);
  assert.equal(p.measured,0);
  assert.deepEqual(p.tests,[]);
  assert.equal(p.index.v,null);
  assert.deepEqual(p.classes,[]);
});

test("רק מבחנים שיש בהם מדידה נכנסים",()=>{
  const p=prof([m("a","r60","2026-06-01",9.0)]);
  assert.equal(p.measured,1);
  assert.deepEqual(p.tests.map(t=>t.testId),["r60"]);
});

test("הסדר נקבע מהקטלוג ולא מסדר המדידות",()=>{
  const rows=[m("a","push","2026-06-01",20),m("b","r60","2026-06-02",9.0)];
  assert.deepEqual(prof(rows).tests.map(t=>t.testId),["r60","push"],
    "אותו סדר בכל פתיחה");
});

test("מבחן שאינו בקטלוג מדולג",()=>{
  const p=prof([m("a","אין-כזה","2026-06-01",5)]);
  assert.equal(p.measured,0);
});

test("הפרופיל נושא את זהות התלמיד",()=>{
  const p=prof([m("a","r60","2026-06-01",9.0)]);
  assert.equal(p.stud.sid,"s1");
  assert.equal(p.stud.name,"דן אבירם");
});

/* ============ היסטוריה חוצת כיתות — הליבה ============ */

test("תלמיד שעבר כיתה שומר את כל ההיסטוריה",()=>{
  const rows=[
    m("a","r60","2026-06-01",9.2),
    m("b","r60","2027-01-01",8.6,{cls:"י׳1",cid:"c:י:1",gradeKey:"י"})];
  const p=prof(rows);
  const t=p.tests[0];
  assert.equal(t.count,2,"שתי המדידות, בשתי הכיתות");
  assert.equal(t.best.val,8.6,"והשיא הוא החדש");
  assert.deepEqual(p.classes,["c:ט:3","c:י:1"],"ושתי הכיתות מדווחות");
});

test("הכיתה בזמן המדידה נשמרת כהקשר",()=>{
  const rows=[
    m("a","r60","2026-06-01",9.2),
    m("b","r60","2027-01-01",8.6,{cls:"י׳1",cid:"c:י:1"})];
  const t=prof(rows).tests[0];
  assert.equal(t.first.cls,"ט׳3");
  assert.equal(t.latest.cls,"י׳1");
});

test("צמצום לכיתה אחת אפשרי אבל אינו ברירת המחדל",()=>{
  const rows=[
    m("a","r60","2026-06-01",9.2),
    m("b","r60","2027-01-01",8.6,{cls:"י׳1",cid:"c:י:1"})];
  assert.equal(prof(rows).tests[0].count,2,"ברירת מחדל — הכול");
  assert.equal(prof(rows,{cls:"ט3"}).tests[0].count,1,"ובצמצום — כיתה אחת");
  assert.equal(prof(rows,{cls:"ט3"}).tests[0].best.val,9.2);
});

test("שינוי שם התלמיד אינו מרוקן את הפרופיל",()=>{
  const rows=[m("a","r60","2026-06-01",9.2)];
  const p=D.profileOf(rows,{id:"s1",name:"דן אבירם-לוי",sex:"boys"},DEFS,
    {mode:"norm",table:TABLE,grade:"ט"});
  assert.equal(p.measured,1,"המזהה קובע, לא השם");
});

test("שני תלמידים אינם חולקים פרופיל",()=>{
  const rows=[m("a","r60","2026-06-01",9.2),
              m("b","r60","2026-06-01",8.0,{sid:"s2"})];
  assert.equal(prof(rows).tests[0].count,1);
  assert.equal(D.profileOf(rows,{id:"s2"},DEFS,{mode:"norm",table:TABLE,grade:"ט"}).tests[0].count,1);
});

/* ============ שיא, אחרון ומגמה ============ */

test("השיא אינו המדידה האחרונה",()=>{
  const rows=[m("a","r60","2026-06-01",8.6),m("b","r60","2026-12-01",9.4)];
  const t=prof(rows).tests[0];
  assert.equal(t.best.val,8.6,"השיא נשאר הישן");
  assert.equal(t.latest.val,9.4,"והאחרון הוא החדש");
  assert.equal(t.latestIsBest,false,"וזה מסומן");
});

test("ירידה מדווחת כירידה ולא כהיעדר שינוי",()=>{
  const rows=[m("a","r60","2026-06-01",8.6),m("b","r60","2026-12-01",9.4)];
  const st=prof(rows).tests[0].progress.lastStep;
  assert.equal(st.improved,false);
  assert.equal(st.declined,true);
  assert.equal(st.rawDelta,0.8,"השינוי הגולמי חיובי — והביצוע הורע");
});

test("כיוון המבחן נשמר בפרופיל",()=>{
  const rows=[m("a","r60","2026-06-01",9.0),m("b","ljump","2026-06-01",180)];
  const p=prof(rows);
  assert.equal(p.tests.find(t=>t.testId==="r60").dir,"low");
  assert.equal(p.tests.find(t=>t.testId==="ljump").dir,"high");
});

test("מדידה אחת — יש שיא, אין מגמה",()=>{
  const t=prof([m("a","r60","2026-06-01",9.0)]).tests[0];
  assert.equal(t.best.val,9.0);
  assert.equal(t.progress.reason,D.PROGRESS_ONE);
  assert.equal(t.progress.lastStep,null,"אין עם מה להשוות");
});

test("«שיפור» לדוח נשאר בסמנטיקה הישנה",()=>{
  const up=prof([m("a","r60","2026-06-01",9.2),m("b","r60","2026-12-01",8.6)]).tests[0];
  assert.equal(up.imp,0.6,"השיא מול הטוב ביום הראשון");
  const down=prof([m("a","r60","2026-06-01",8.6),m("b","r60","2026-12-01",9.4)]).tests[0];
  assert.equal(down.imp,null,"ובלי שיפור — null, כמו שהדוח מצפה");
});

test("המדידות הגולמיות והתאריכים זמינים לדוח ול-CSV",()=>{
  const rows=[m("a","r60","2026-06-01",9.2),m("b","r60","2026-06-01",9.0),
              m("c","r60","2026-12-01",8.6)];
  const t=prof(rows).tests[0];
  assert.equal(t.list.length,3,"כל הניסיונות");
  assert.deepEqual(t.dates,["2026-06-01","2026-12-01"],"וימי המדידה, ייחודיים וממוינים");
  assert.equal(t.list[0].unit,"שנ׳","עם היחידה המקורית");
});

/* ============ ציון ============ */

test("הציון נגזר מהתוצאה הטובה ביותר",()=>{
  const rows=[m("a","r60","2026-06-01",9.4),m("b","r60","2026-12-01",8.7)];
  const t=prof(rows).tests[0];
  assert.equal(t.best.val,8.7);
  assert.ok(t.assessment.v>60,"הציון של השיא ולא של האחרון: "+t.assessment.v);
});

test("אין ציון — הסיבה מפורשת",()=>{
  const t=prof([m("a","ljump","2026-06-01",180)]).tests[0];
  assert.equal(t.assessment.v,null);
  assert.ok(["no-norm","too-few-peers"].indexOf(t.assessment.reason)>=0,
    "לא מקף סתמי: "+t.assessment.reason);
});

test("תקרת מבחן חלופי נשמרת בפרופיל",()=>{
  const rows=[m("a","push","2026-06-01",30)];
  const p=D.profileOf(rows,S,DEFS,{mode:"norm",
    table:{push:{boys:{"ט":[[10,60],[30,100]]}}},grade:"ט"});
  const t=p.tests[0];
  assert.equal(t.cap,80);
  assert.equal(t.assessment.v,80,"התקרה גוברת");
  assert.equal(t.assessment.capped,true);
});

test("מדד הכושר הוא ממוצע הציונים הקיימים בלבד",()=>{
  const rows=[m("a","r60","2026-06-01",8.0),m("b","ljump","2026-06-01",180)];
  const p=prof(rows);
  assert.equal(p.index.from,1,"רק ל-60 מטר יש טבלה");
  assert.equal(p.index.of,2,"מתוך שני מבחנים שנמדדו");
  assert.equal(p.index.v,100);
});

test("בלי אף ציון המדד הוא null ולא אפס",()=>{
  const p=prof([m("a","ljump","2026-06-01",180)]);
  assert.equal(p.index.v,null);
  assert.equal(p.index.from,0);
});

/* ============ מה חסר ============ */

test("חסרים = מה שהכיתה עשתה ולתלמיד אין",()=>{
  const rows=[m("a","r60","2026-06-01",9.0),
              m("b","ljump","2026-06-01",180,{sid:"s2"})];
  assert.deepEqual(D.missingTests(rows,S,DEFS,{cls:"ט3"}),["ljump"]);
});

test("מבחן שהתלמיד עשה אינו חסר",()=>{
  const rows=[m("a","r60","2026-06-01",9.0)];
  assert.deepEqual(D.missingTests(rows,S,DEFS,{cls:"ט3"}),[]);
});

test("מבחני המדד נחשבים חסרים גם אם הכיתה לא עשתה אותם",()=>{
  const rows=[m("a","r60","2026-06-01",9.0)];
  assert.deepEqual(D.missingTests(rows,S,DEFS,{cls:"ט3",want:["push"]}),["push"]);
});

test("מדידה בכיתה אחרת אינה הופכת מבחן לחסר בכיתה הזאת",()=>{
  const rows=[m("a","r60","2026-06-01",9.0),
              m("b","ljump","2026-06-01",180,{sid:"s2",cls:"י׳1",cid:"c:י:1"})];
  assert.deepEqual(D.missingTests(rows,S,DEFS,{cls:"ט3"}),[]);
});

/* ============ אינו משנה נתונים ============ */

test("בניית הפרופיל אינה נוגעת במדידות",()=>{
  const rows=[m("a","r60","2026-06-01",9.2),m("b","r60","2026-12-01",8.6)];
  const snap=JSON.stringify(rows);
  prof(rows);
  assert.equal(JSON.stringify(rows),snap,"הקריאה טהורה");
});

test("מדידה פגומה אינה נכנסת לשיא ונשארת בהיסטוריה",()=>{
  const rows=[m("a","r60","2026-06-01",9.0),m("b","r60","2026-07-01",0)];
  const t=prof(rows).tests[0];
  assert.equal(t.best.val,9.0,"אפס שניות אינו זמן");
  assert.equal(t.invalid,1);
  assert.equal(t.list.length,2,"והרשומה נשארה");
});
