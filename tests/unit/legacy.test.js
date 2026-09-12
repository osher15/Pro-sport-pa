"use strict";
/* תאימות לאחור ואפס אובדן.
   מורה שפותח את הגרסה החדשה לא מבקש מיגרציה ולא יודע שהיא קרתה.
   כל הבדיקות כאן סופרות לפני ואחרי, על מכשיר שנראה כמו מכשיר
   אמיתי שצבר נתונים לאורך שנה. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");
const {memStore}=require("../helpers/memstore.js");

/* מכשיר בגרסה 1 לגמרי: בלי schema.version, בלי מזהי תלמיד,
   בלי מזהי כיתה, עם שמות כפולים ועם מדידה של תלמיד שעזב. */
function legacyDevice(){
  return {
    "ft.roster":{
      "ט3":[{name:"דן אבירם",sex:"boys"},{name:"רון לוי",sex:"boys"},
            {name:"דן כהן",sex:"boys"},{name:"דן כהן",sex:"boys"}],
      "י1":[{name:"דן אבירם",sex:"boys"}]
    },
    "stu.list":[
      {name:"דן אבירם",cls:"ט׳3",sex:"boys",age:14,tests:[]},
      {name:"רון לוי", cls:"ט׳3",sex:"boys",age:14,tests:[]},
      {name:"גל שדה",  cls:"נבחרת בית ספר",sex:"boys",age:15,tests:[]}
    ],
    "ft.results":[
      {id:"r1",d:"2026-06-04",ts:1,cls:"ט׳3",test:"push",name:"דן אבירם",val:22,unit:"חזרות"},
      {id:"r2",d:"2026-09-02",ts:2,cls:"ט3", test:"push",name:"דן אבירם",val:27,unit:"חזרות"},
      {id:"r3",d:"2026-09-02",ts:3,cls:"ט׳3",test:"push",name:"רון לוי", val:31,unit:"חזרות"},
      {id:"r4",d:"2026-09-02",ts:4,cls:"ט׳3",test:"push",name:"דן כהן",  val:18,unit:"חזרות"},
      {id:"r5",d:"2026-09-02",ts:5,cls:"ט׳3",test:"push",name:"תלמיד שעזב",val:15,unit:"חזרות"},
      {id:"r6",d:"2026-09-02",ts:6,cls:"י׳1", test:"push",name:"דן אבירם",val:40,unit:"חזרות"}
    ],
    "bt.results":[{name:"דן אבירם",level:9,dist:1200}],
    "settings":{school:"מקיף גימל"}
  };
}
const count=s=>({
  classes:Object.keys(s.get("ft.classes")||{}).length,
  roster:Object.values(s.get("ft.roster")||{}).reduce((a,l)=>a+(Array.isArray(l)?l.length:0),0),
  stu:(s.get("stu.list")||[]).length,
  res:(s.get("ft.results")||[]).length,
  bt:(s.get("bt.results")||[]).length
});

test("מכשיר ישן: אפס אובדן בכל הספירות",()=>{
  const s=memStore(legacyDevice());
  const before=count(s);
  const rep=D.migrate(s);
  const after=count(s);

  assert.equal(rep.ok,true,rep.error||"");
  assert.equal(rep.from,1,"זוהה כגרסה 1");
  assert.deepEqual(rep.applied,["student-identity","class-identity","student-class-closure"]);

  assert.equal(after.roster,before.roster,"תלמידי רשימות הכיתה");
  assert.equal(after.stu,   before.stu,   "«התלמידים שלי»");
  assert.equal(after.res,   before.res,   "מדידות");
  assert.equal(after.bt,    before.bt,    "תוצאות ביפ טסט");
  assert.equal(before.classes,0,"לפני: אין רישום כיתות בכלל");
  assert.equal(after.classes,3,"אחרי: ט׳3, י׳1, ונבחרת בית ספר");
});

test("מכשיר ישן: כל תלמיד קיבל מזהה ייחודי",()=>{
  const s=memStore(legacyDevice());
  D.migrate(s);
  const all=[].concat(...Object.values(s.get("ft.roster")));
  assert.ok(all.every(x=>x.id),"לכולם יש מזהה");
  assert.equal(new Set(all.map(x=>x.id)).size,all.length,
    "וכולם שונים — כולל שני «דן כהן» באותה כיתה ו«דן אבירם» בשתי כיתות");
  assert.ok(s.get("stu.list").every(x=>x.id),"וגם «התלמידים שלי»");
});

test("מכשיר ישן: מדידה חד-משמעית קושרה, דו-משמעית סומנה",()=>{
  const s=memStore(legacyDevice());
  const rep=D.migrate(s);
  const by=id=>s.get("ft.results").find(r=>r.id===id);

  assert.ok(by("r1").sid,"«דן אבירם» יחיד בט׳3 — קושר");
  assert.ok(by("r3").sid,"«רון לוי» — קושר");
  assert.ok(by("r6").sid,"«דן אבירם» בי׳1 — קושר לתלמיד של י׳1");
  assert.notEqual(by("r1").sid,by("r6").sid,"ואלה שני תלמידים שונים");

  assert.equal(by("r4").sid,undefined,"«דן כהן» כפול — לא נוחש");
  assert.equal(by("r4").sidAmbig,"duplicate-name");
  assert.equal(by("r5").sid,undefined,"«תלמיד שעזב» — לא ברשימה");
  assert.equal(by("r5").sidAmbig,"no-roster-match");
  assert.equal(rep.ambiguous,1);
  assert.equal(rep.unmatched,1);
});

test("מכשיר ישן: כל מדידה קיבלה מזהה כיתה",()=>{
  const s=memStore(legacyDevice());
  D.migrate(s);
  const res=s.get("ft.results");
  assert.ok(res.every(r=>r.cid),"כולן");
  assert.equal(res.find(r=>r.id==="r1").cid,res.find(r=>r.id==="r2").cid,
    "«ט׳3» ו-«ט3» הן אותה כיתה");
  assert.notEqual(res.find(r=>r.id==="r1").cid,res.find(r=>r.id==="r6").cid,
    "ט׳3 ו-י׳1 אינן");
});

test("מכשיר ישן: השם המקורי לא נמחק מאף רשומה",()=>{
  const s=memStore(legacyDevice());
  const namesBefore=s.get("ft.results").map(r=>r.name);
  const clsBefore  =s.get("ft.results").map(r=>r.cls);
  D.migrate(s);
  assert.deepEqual(s.get("ft.results").map(r=>r.name),namesBefore,"שמות התלמידים");
  assert.deepEqual(s.get("ft.results").map(r=>r.cls), clsBefore, "שמות הכיתות");
});

test("מכשיר ישן: הרצה חוזרת אינה משנה בית",()=>{
  const s=memStore(legacyDevice());
  D.migrate(s);
  const snap=JSON.stringify(s.keys().map(k=>[k,s.get(k)]));
  const rep2=D.migrate(s);
  assert.equal(rep2.noop,true);
  assert.equal(JSON.stringify(s.keys().map(k=>[k,s.get(k)])),snap);
});

test("מכשיר ישן: שינוי שם תלמיד שומר על ההיסטוריה",()=>{
  const s=memStore(legacyDevice());
  D.migrate(s);
  const roster=s.get("ft.roster");
  const dan=roster["ט3"][0];
  const before=D.attemptsOf(s.get("ft.results"),"ט3","push",dan).length;
  assert.equal(before,2);

  dan.name="דן אבירם-לוי";
  s.set("ft.roster",roster);
  assert.equal(D.attemptsOf(s.get("ft.results"),"ט3","push",dan).length,2,
    "אחרי שינוי השם — אותן שתי מדידות");
});

test("מכשיר ישן: שינוי שם כיתה שומר על התלמידים ועל המדידות",()=>{
  const s=memStore(legacyDevice());
  D.migrate(s);
  const cid=s.get("ft.results").find(r=>r.id==="r1").cid;
  const resBefore=s.get("ft.results").filter(r=>r.cid===cid).length;
  const stuBefore=s.get("stu.list").filter(x=>x.cid===cid).length;

  D.renameClass(s,cid,"ט׳3 — מגמת ספורט");

  assert.equal(s.get("ft.results").filter(r=>r.cid===cid).length,resBefore,"המדידות");
  assert.equal(s.get("stu.list").filter(x=>x.cid===cid).length,stuBefore,"התלמידים");
  assert.equal(D.classOf(s,cid).name,"ט׳3 — מגמת ספורט","רק השם זז");
});

test("מכשיר ישן: אחרי הכרעה ידנית המדידה מחוברת",()=>{
  const s=memStore(legacyDevice());
  D.migrate(s);
  const groups=D.ambiguousGroups(s.get("ft.results"));
  assert.equal(groups.length,2,"«דן כהן» ו«תלמיד שעזב»");

  const dupe=groups.find(g=>g.name==="דן כהן");
  const target=s.get("ft.roster")["ט3"].filter(x=>x.name==="דן כהן")[1];
  const r=D.resolveAmbiguous(s.get("ft.results"),dupe.ids,target.id);
  s.set("ft.results",r.rows);

  assert.equal(r.changed,1);
  assert.equal(D.attemptsOf(s.get("ft.results"),"ט3","push",target).length,1,
    "המדידה מופיעה אצל התלמיד שנבחר");
  const other=s.get("ft.roster")["ט3"].filter(x=>x.name==="דן כהן")[0];
  assert.equal(D.attemptsOf(s.get("ft.results"),"ט3","push",other).length,0,
    "ולא אצל השני");
  assert.equal(s.get("ft.results").length,6,"ואף מדידה לא נוספה ולא נמחקה");
});

test("מכשיר שכבר בגרסה 2 מקבל רק את מיגרציית הכיתות",()=>{
  const seed=legacyDevice(); seed["schema.version"]=2;
  const s=memStore(seed);
  const rep=D.migrate(s);
  assert.deepEqual(rep.applied,["class-identity","student-class-closure"]);
  assert.equal(rep.linked,0,"זהות התלמידים לא נגעה");
  assert.ok(rep.classes>0,"והכיתות כן נרשמו");
});

test("מכשיר בגרסה הנוכחית אינו עובר כלום",()=>{
  const seed=legacyDevice(); seed["schema.version"]=D.SCHEMA_VERSION;
  const s=memStore(seed);
  const before=JSON.stringify(s.keys().map(k=>[k,s.get(k)]));
  const rep=D.migrate(s);
  assert.equal(rep.noop,true);
  assert.equal(JSON.stringify(s.keys().map(k=>[k,s.get(k)])),before);
});

test("גיבוי מגרסה ישנה נטען, ואז מוסב",()=>{
  const file={app:"hamegrash-pro",kind:"backup",v:1,at:"2025-06-01T00:00:00Z",data:{}};
  Object.entries(legacyDevice()).forEach(([k,v])=>file.data[k]=JSON.stringify(v));
  const v=D.validateBackup(file);
  assert.equal(v.ok,true,JSON.stringify(v.errors));
  assert.equal(v.schema,1);

  const seed={}; Object.keys(file.data).forEach(k=>seed[k]=JSON.parse(file.data[k]));
  const s=memStore(seed);
  const rep=D.migrate(s);
  assert.equal(rep.ok,true);
  assert.equal(s.get("ft.results").length,6,"כל המדידות שרדו את המסלול המלא");
  assert.ok(s.get("ft.results").every(r=>r.cid),"וקיבלו מזהה כיתה");
});
