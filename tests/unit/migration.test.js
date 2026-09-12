"use strict";
/* מיגרציה — הכלל היחיד הוא שהיא לא הורסת.
   מורה שמריץ את הגרסה החדשה לא מבקש מיגרציה ולא יודע שהיא קרתה.
   אם היא תאבד מדידה אחת, הוא יגלה את זה חודשיים אחר כך בלי דרך
   לשחזר. לכן: ספירה לפני ואחרי, אין כפילויות, ואין ניחושים. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");
const {memStore,legacyClass}=require("../helpers/memstore.js");

test("זיהוי גרסה: מכשיר ריק נחשב עדכני, מכשיר עם נתונים נחשב גרסה 1",()=>{
  assert.equal(D.detectVersion(memStore()),D.SCHEMA_VERSION,"התקנה חדשה — אין מה להסב");
  assert.equal(D.detectVersion(memStore(legacyClass())),1);
  assert.equal(D.detectVersion(memStore({"schema.version":2})),2);
  assert.equal(D.detectVersion(memStore({"schema.version":3})),3);
});

test("מיגרציה מקשרת כל מדידה למזהה של התלמיד",()=>{
  const s=memStore(legacyClass());
  const before=s.get("ft.results").length;
  const rep=D.migrate(s);

  assert.equal(rep.ok,true,rep.error||"");
  /* מכשיר בגרסה 1 עובר את כל המיגרציות עד הנוכחית, לפי הסדר */
  assert.deepEqual(rep.applied,["student-identity","class-identity","student-class-closure"]);
  assert.equal(rep.from,1); assert.equal(rep.to,D.SCHEMA_VERSION);

  const res=s.get("ft.results");
  assert.equal(res.length,before,"אף מדידה לא נמחקה ואף אחת לא נוספה");
  assert.equal(res.filter(r=>r.sid).length,4,"כל ארבע המדידות קושרו");
  assert.equal(rep.linked,4);
  assert.equal(rep.ambiguous,0);
  assert.equal(rep.unmatched,0);
});

test("שינוי שם אחרי מיגרציה: עשר מדידות נשארות מקושרות",()=>{
  /* התרחיש המדויק שהפיל את המערכת הישנה. */
  const seed={"ft.roster":{"ט3":[{name:"דן אבירם",sex:"boys"}]},"ft.results":[]};
  for(let i=0;i<10;i++)seed["ft.results"].push(
    {id:"m"+i,d:"2026-0"+(i%9+1)+"-01",ts:i,cls:"ט׳3",test:"push",name:"דן אבירם",val:20+i,unit:"חזרות"});
  const s=memStore(seed);
  D.migrate(s);

  const sid=s.get("ft.roster")["ט3"][0].id;
  assert.ok(sid,"התלמיד קיבל מזהה");

  /* המורה מתקן את שגיאת הכתיב */
  const roster=s.get("ft.roster");
  roster["ט3"][0].name="דן אבירם-לוי";
  s.set("ft.roster",roster);

  const found=D.attemptsOf(s.get("ft.results"),"ט3","push",roster["ט3"][0]);
  assert.equal(found.length,10,"כל עשר המדידות עדיין מחוברות לתלמיד אחרי שינוי השם");
  assert.equal(found[0].val,20,"וגם בסדר הנכון");
});

test("שם כפול בכיתה: לא מנחשים, מסמנים",()=>{
  const s=memStore({
    "ft.roster":{"ט3":[{id:"a",name:"דן כהן"},{id:"b",name:"דן כהן"}]},
    "ft.results":[{id:"r1",d:"2026-09-02",ts:1,cls:"ט3",test:"push",name:"דן כהן",val:20,unit:"חזרות"}]
  });
  const rep=D.migrate(s);
  const r=s.get("ft.results")[0];
  assert.equal(r.sid,undefined,"לא מייחסים מדידה לאחד משני תלמידים זהי־שם");
  assert.equal(r.sidAmbig,"duplicate-name");
  assert.equal(rep.ambiguous,1);
  assert.equal(rep.linked,0);
});

test("מדידה של תלמיד שאינו ברשימת הכיתה מסומנת ולא נמחקת",()=>{
  const s=memStore({
    "ft.roster":{"ט3":[{id:"a",name:"דן כהן"}]},
    "ft.results":[{id:"r1",d:"2026-09-02",ts:1,cls:"ט3",test:"push",name:"תלמיד אורח",val:20,unit:"חזרות"}]
  });
  const rep=D.migrate(s);
  const res=s.get("ft.results");
  assert.equal(res.length,1,"הרשומה נשארה");
  assert.equal(res[0].sidAmbig,"no-roster-match");
  assert.equal(rep.unmatched,1);
  /* והיא עדיין נגישה — לפי שם, כמו קודם */
  assert.equal(D.attemptsOf(res,"ט3","push",{name:"תלמיד אורח"}).length,1);
});

test("מיגרציה חוזרת לא משנה כלום (idempotent)",()=>{
  const s=memStore(legacyClass());
  D.migrate(s);
  const snap=JSON.stringify({r:s.get("ft.results"),k:s.get("ft.roster")});

  const rep2=D.migrate(s);
  assert.equal(rep2.noop,true,"הריצה השנייה לא מחילה מיגרציה");
  assert.deepEqual(rep2.applied,[]);
  assert.equal(JSON.stringify({r:s.get("ft.results"),k:s.get("ft.roster")}),snap,
    "הנתונים זהים בית אחר בית");
});

test("מזהים נגזרים מהתוכן ולכן שתי ריצות נפרדות מגיעות לאותו מזהה",()=>{
  const a=memStore(legacyClass()); D.migrate(a);
  const b=memStore(legacyClass()); D.migrate(b);
  assert.deepEqual(a.get("ft.roster")["ט3"].map(s=>s.id),
                   b.get("ft.roster")["ט3"].map(s=>s.id));
  assert.deepEqual(a.get("ft.results").map(r=>r.sid),
                   b.get("ft.results").map(r=>r.sid));
});

test("מזהים ייחודיים לכל תלמיד ולכל כיתה",()=>{
  const s=memStore({"ft.roster":{
    "ט3":[{name:"דן"},{name:"רון"}],
    "י1":[{name:"דן"}]
  }});
  D.migrate(s);
  const ids=[...s.get("ft.roster")["ט3"].map(x=>x.id),s.get("ft.roster")["י1"][0].id];
  assert.equal(new Set(ids).size,3,"אותו שם בשתי כיתות הוא שני תלמידים");
});

test("מזהה קיים לא נדרס",()=>{
  const s=memStore({"ft.roster":{"ט3":[{id:"מזהה-ותיק",name:"דן"}]}});
  D.migrate(s);
  assert.equal(s.get("ft.roster")["ט3"][0].id,"מזהה-ותיק");
});

test("sid קיים לא נדרס גם אם השם ברשימה השתנה",()=>{
  const s=memStore({
    "ft.roster":{"ט3":[{id:"חדש",name:"דן"}]},
    "ft.results":[{id:"r1",d:"2026-09-02",cls:"ט3",test:"push",name:"דן",sid:"ישן",val:20}]
  });
  D.migrate(s);
  assert.equal(s.get("ft.results")[0].sid,"ישן");
});

test("קלט פגום לא מפיל את המיגרציה ולא מוחק אותו",()=>{
  const s=memStore({"ft.roster":"לא אובייקט","ft.results":"לא מערך","stu.list":{}});
  const rep=D.migrate(s);
  assert.equal(rep.ok,true,rep.error||"");
  assert.equal(s.get("ft.roster"),"לא אובייקט","נתון פגום נשאר כמו שהוא — לא מנחשים ולא מוחקים");
  assert.equal(s.get("ft.results"),"לא מערך");
});

test("רשומות null בתוך המערכים מדולגות בלי לקרוס",()=>{
  const s=memStore({
    "ft.roster":{"ט3":[null,{name:"דן"},7]},
    "ft.results":[null,{id:"r1",cls:"ט3",test:"push",name:"דן",d:"2026-09-02",val:5}]
  });
  const rep=D.migrate(s);
  assert.equal(rep.ok,true,rep.error||"");
  assert.equal(rep.linked,1);
  assert.equal(s.get("ft.results").length,2,"גם ה-null נשאר — לא מנקים מה שלא ביקשו לנקות");
});

test("נתונים מגרסה עתידית לא נוגעים בהם",()=>{
  const seed=legacyClass(); seed["schema.version"]=99;
  const s=memStore(seed);
  const before=JSON.stringify(s.get("ft.results"));
  const rep=D.migrate(s);
  assert.equal(rep.ok,false);
  assert.equal(rep.error,"newer-schema");
  assert.equal(JSON.stringify(s.get("ft.results")),before,"אף שדה לא נגע");
  assert.equal(s.get("schema.version"),99,"והגרסה לא הורדה");
});

test("«התלמידים שלי» מקבלים מזהה גם הם",()=>{
  const s=memStore({"stu.list":[{name:"דן",cls:"ט׳3"},{id:"קיים",name:"רון",cls:"ט׳3"}]});
  const rep=D.migrate(s);
  const list=s.get("stu.list");
  assert.ok(list[0].id,"תלמיד בלי מזהה קיבל אחד");
  assert.equal(list[1].id,"קיים");
  assert.equal(rep.stuIds,1);
});

test("התקנה חדשה לגמרי מסומנת בגרסה הנוכחית בלי להריץ מיגרציה",()=>{
  const s=memStore();
  const rep=D.migrate(s);
  assert.equal(rep.noop,true);
  assert.equal(s.get("schema.version"),D.SCHEMA_VERSION);
});
