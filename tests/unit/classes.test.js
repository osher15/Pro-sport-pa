"use strict";
/* זהות כיתה.
   עד שלב 3 כיתה לא הייתה ישות בכלל — היא הייתה מחרוזת שנבנתה
   מחדש בכל מסך, ושם הכיתה היה הזהות שלה. הבדיקות כאן מוודאות
   שהמזהה הוא הזהות ושהשם הוא תצוגה. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");
const {memStore}=require("../helpers/memstore.js");

test("בניית שם כיתה משכבה ומספר",()=>{
  assert.equal(D.clsName("ט",3),"ט׳3");
  assert.equal(D.clsName("יא",2),"י״א2");
  assert.equal(D.clsName("לא-קיים",1),"לא-קיים1","שכבה לא מוכרת חוזרת כמו שהיא");
});

test("פירוק שם כיתה, על כל הכתיבים",()=>{
  ["ט3","ט׳3","ט' 3","ט״3","ט-3"," ט׳3 "].forEach(v=>
    assert.deepEqual(D.parseCls(v),{grade:"ט",num:3},"«"+v+"»"));
  assert.equal(D.parseCls("ט3 בנים"),null,"טקסט חופשי אינו נפרס");
  assert.equal(D.parseCls(""),null);
  assert.equal(D.parseCls(null),null);
});

test("י״א ו-י׳1 אינן מתבלבלות",()=>{
  assert.deepEqual(D.parseCls("יא1"),{grade:"יא",num:1});
  assert.deepEqual(D.parseCls("י1"), {grade:"י", num:1});
  assert.notEqual(D.classId("יא1"),D.classId("י1"));
  assert.notEqual(D.classId("י10"),D.classId("י1"));
});

test("מזהה כיתה זהה לכל הכתיבים של אותה כיתה",()=>{
  const id=D.classId("ט׳3");
  ["ט3","ט' 3","ט״3"," ט׳3 "].forEach(v=>assert.equal(D.classId(v),id,"«"+v+"»"));
  assert.equal(id,"c:ט:3","המזהה נגזר מהתוכן ולכן קריא וניתן לשחזור");
});

test("כיתה בטקסט חופשי מקבלת מזהה משלה",()=>{
  const id=D.classId("ט3 בנים");
  assert.ok(id.indexOf("cn:")===0,"מסומנת כשם חופשי: "+id);
  assert.notEqual(id,D.classId("ט3"),"«ט3 בנים» אינה «ט3»");
  assert.equal(id,D.classId("ט3  בנים"),"אבל היא כן עצמה, ברווח כפול");
});

test("קלט ריק אינו כיתה",()=>{
  [null,undefined,"","   "].forEach(v=>assert.equal(D.classId(v),null,JSON.stringify(v)));
  assert.equal(D.classFrom(""),null);
});

test("classFrom מחזיק שם, שכבה ומספר — ו-null לשכבה כשאין",()=>{
  assert.deepEqual(D.classFrom("ט' 3"),{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"});
  const free=D.classFrom("קבוצת נבחרת");
  assert.equal(free.grade,null,"לא ממציאים שכבה");
  assert.equal(free.num,null);
  assert.equal(free.name,"קבוצת נבחרת","והשם נשמר כמו שהוקלד");
});

test("sameClass משווה לפי זהות ולא לפי מחרוזת",()=>{
  assert.equal(D.sameClass("ט3","ט׳3"),true);
  assert.equal(D.sameClass("ט3","ט4"),false);
  assert.equal(D.sameClass("","ט3"),false);
});

/* ---------- הרישום ---------- */

test("מיגרציה רושמת כל כיתה שמופיעה במכשיר",()=>{
  const s=memStore({
    "ft.roster":{"ט3":[{id:"a",name:"דן"}],"י1":[{id:"b",name:"רון"}]},
    "stu.list":[{id:"a",name:"דן",cls:"ט׳3"},{id:"c",name:"גל",cls:"נבחרת"}],
    "ft.results":[{id:"r1",cls:"ט׳3",test:"push",name:"דן",sid:"a",d:"2026-09-01",val:20}],
    "schema.version":2
  });
  const rep=D.migrate(s);
  assert.equal(rep.ok,true,rep.error||"");
  assert.deepEqual(rep.applied,["class-identity"],"רק המיגרציה החדשה רצה");

  const reg=s.get("ft.classes");
  assert.deepEqual(Object.keys(reg).sort(),["c:ט:3","c:י:1","cn:נבחרת"].sort());
  assert.equal(reg["c:ט:3"].name,"ט׳3");
  assert.equal(reg["c:ט:3"].grade,"ט");
  assert.equal(reg["cn:נבחרת"].grade,null,"כיתה חופשית בלי שכבה");
});

test("מיגרציה מטביעה מזהה כיתה על מדידות ועל תלמידים",()=>{
  const s=memStore({
    "ft.roster":{"ט3":[{id:"a",name:"דן"}]},
    "stu.list":[{id:"a",name:"דן",cls:"ט3"}],
    "ft.results":[{id:"r1",cls:"ט׳3",test:"push",name:"דן",sid:"a",d:"2026-09-01",val:20}],
    "schema.version":2
  });
  const rep=D.migrate(s);
  assert.equal(s.get("ft.results")[0].cid,"c:ט:3");
  assert.equal(s.get("stu.list")[0].cid,"c:ט:3");
  assert.equal(rep.resCids,1);
  assert.equal(rep.stuCids,1);
});

test("מדידה בלי שדה כיתה מסומנת ולא מנוחשת",()=>{
  const s=memStore({
    "ft.roster":{"ט3":[{id:"a",name:"דן"}]},
    "ft.results":[{id:"r1",test:"push",name:"דן",sid:"a",d:"2026-09-01",val:20}],
    "schema.version":2
  });
  const rep=D.migrate(s);
  const r=s.get("ft.results")[0];
  assert.equal(r.cid,undefined,"לא הודבקה לה כיתה שרירותית");
  assert.equal(r.cidAmbig,"no-class");
  assert.equal(rep.resNoClass,1);
  assert.equal(s.get("ft.results").length,1,"והיא נשארה");
});

test("מיגרציית כיתות חוזרת לא משנה כלום",()=>{
  const seed={
    "ft.roster":{"ט3":[{id:"a",name:"דן"}]},
    "stu.list":[{id:"a",name:"דן",cls:"ט3"}],
    "ft.results":[{id:"r1",cls:"ט׳3",test:"push",name:"דן",sid:"a",d:"2026-09-01",val:20}],
    "schema.version":2};
  const s=memStore(seed);
  D.migrate(s);
  const snap=JSON.stringify(s.keys().map(k=>[k,s.get(k)]));
  const rep2=D.migrate(s);
  assert.equal(rep2.noop,true);
  assert.equal(JSON.stringify(s.keys().map(k=>[k,s.get(k)])),snap,"זהה בית אחר בית");
});

test("שתי ריצות נפרדות מגיעות לאותם מזהי כיתה",()=>{
  const seed=()=>({"ft.roster":{"ט3":[{id:"a",name:"דן"}]},"schema.version":2});
  const a=memStore(seed()), b=memStore(seed());
  D.migrate(a); D.migrate(b);
  assert.deepEqual(Object.keys(a.get("ft.classes")),Object.keys(b.get("ft.classes")));
});

/* ---------- שינוי שם ---------- */

test("שינוי שם כיתה אינו נוגע במדידות ולא בתלמידים",()=>{
  const s=memStore({
    "ft.roster":{"ט3":[{id:"a",name:"דן"}]},
    "stu.list":[{id:"a",name:"דן",cls:"ט3"}],
    "ft.results":[
      {id:"r1",cls:"ט׳3",test:"push",name:"דן",sid:"a",d:"2026-09-01",val:20},
      {id:"r2",cls:"ט׳3",test:"push",name:"דן",sid:"a",d:"2026-09-08",val:24}],
    "schema.version":2});
  D.migrate(s);
  const cid=s.get("ft.results")[0].cid;

  const r=D.renameClass(s,cid,"ט׳3 — קבוצת בוקר");
  assert.equal(r.ok,true);
  assert.equal(D.classOf(s,cid).name,"ט׳3 — קבוצת בוקר","השם השתנה");

  const res=s.get("ft.results");
  assert.equal(res.length,2,"שתי המדידות נשארו");
  assert.equal(res[0].cid,cid,"והן עדיין מצביעות על אותה כיתה");
  assert.equal(res[1].cid,cid);
  assert.equal(s.get("stu.list")[0].cid,cid,"וגם התלמיד");
});

test("שינוי שם אינו מייצר מזהה חדש",()=>{
  const s=memStore({"ft.roster":{"ט3":[{id:"a",name:"דן"}]},"schema.version":2});
  D.migrate(s);
  const before=Object.keys(s.get("ft.classes"));
  D.renameClass(s,"c:ט:3","שם אחר לגמרי");
  assert.deepEqual(Object.keys(s.get("ft.classes")),before,"אותו מזהה בדיוק");
});

test("שתי כיתות רשאיות לשאת אותו שם ולהישאר שתיים",()=>{
  const s=memStore({"ft.roster":{"ט3":[{id:"a",name:"דן"}],"ט4":[{id:"b",name:"רון"}]},"schema.version":2});
  D.migrate(s);
  D.renameClass(s,"c:ט:4","ט׳3");           /* המורה נתן לשתיהן אותה תווית */
  const reg=s.get("ft.classes");
  assert.equal(Object.keys(reg).length,2,"עדיין שתי כיתות");
  assert.equal(reg["c:ט:3"].name,reg["c:ט:4"].name,"עם אותו שם");
  assert.notEqual("c:ט:3","c:ט:4","אבל שני מזהים");
});

test("שינוי שם לכיתה שאינה קיימת, ולשם ריק — נדחים",()=>{
  const s=memStore({"ft.roster":{"ט3":[{id:"a",name:"דן"}]},"schema.version":2});
  D.migrate(s);
  assert.equal(D.renameClass(s,"c:אין:9","שם").error,"no-such-class");
  assert.equal(D.renameClass(s,"c:ט:3","   ").error,"empty-name");
  assert.equal(D.classOf(s,"c:ט:3").name,"ט׳3","ולא שינו כלום");
});

test("findClass מוצא כיתה גם אחרי שהשם שלה השתנה",()=>{
  const s=memStore({"ft.roster":{"ט3":[{id:"a",name:"דן"}]},"schema.version":2});
  D.migrate(s);
  D.renameClass(s,"c:ט:3","קבוצת בוקר");
  assert.equal(D.findClass(s,"קבוצת בוקר").id,"c:ט:3","לפי השם החדש");
  assert.equal(D.findClass(s,"ט3").id,"c:ט:3","וגם לפי המזהה הנגזר מהשם הישן");
});

test("registerClass אינו כותב פעמיים",()=>{
  const s=memStore();
  const a=D.registerClass(s,"ט3");
  const b=D.registerClass(s,"ט׳3");
  assert.equal(a.id,b.id);
  assert.equal(Object.keys(s.get("ft.classes")).length,1);
});
