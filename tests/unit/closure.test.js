"use strict";
/* שלב 8 — סגירת זהות הכיתה על התלמיד.
   מיגרציה 2→3 הטביעה cid על מי שהיה במכשיר; שלושה מסלולי יצירה
   המשיכו להוסיף תלמידים בלעדיו. כאן נבדק שהסגירה (3→4) משלימה בלי
   לנחש ובלי להרוס, ושהעוזר cidOfStudent הוא הזהות — לא שם הכיתה. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");
const {memStore,legacyClass}=require("../helpers/memstore.js");

/* מכשיר בגרסה 3: תערובת אמיתית — תלמיד עם cid, תלמיד שנוסף אחרי
   ההסבה בלי cid, תלמיד מלוח הביפ בלי כיתה, ותלמיד בכיתה חופשית. */
const v3=()=>({
  "schema.version":3,
  "ft.classes":{"c:ט:3":{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"}},
  "ft.roster":{"ט3":[{id:"a",name:"דן אבירם",sex:"boys"}]},
  "stu.list":[
    {id:"a",name:"דן אבירם",cls:"ט׳3",cid:"c:ט:3",sex:"boys",age:14,tests:[]},
    {id:"b",name:"רון לוי", cls:"ט3",sex:"boys",age:14,tests:[]},
    {id:"c",name:"גל שדה",  cls:"",sex:"boys",age:15,tests:[]},
    {id:"d",name:"נועה בר", cls:"נבחרת כדורעף",sex:"girls",age:16,tests:[]}
  ],
  "ft.results":[
    {id:"r1",d:"2026-09-01",ts:1,cls:"ט׳3",cid:"c:ט:3",test:"push",name:"דן אבירם",sid:"a",val:22,unit:"חזרות"},
    {id:"r2",d:"2026-09-01",ts:2,cls:"ט3",cid:"c:ט:3",test:"push",name:"רון לוי",sid:"b",val:19,unit:"חזרות"}
  ],
  "ls.sessions":[{id:"ls1",cid:"c:ט:3",clsSnapshot:"ט׳3",date:"2026-09-01",startedAt:1,endedAt:2,status:"completed",planId:null,planTitle:""}]
});
const snapshot=s=>JSON.stringify(s.keys().map(k=>[k,s.get(k)]));

/* ---------- המיגרציה 3→4 ---------- */

test("3→4: משלימה cid למי שחסר, לא נוגעת במי שיש לו",()=>{
  const s=memStore(v3());
  const rep=D.migrate(s);
  assert.equal(rep.ok,true,rep.error||"");
  assert.deepEqual(rep.applied,["student-class-closure"]);
  assert.equal(s.get("schema.version"),4);
  const by=id=>s.get("stu.list").find(x=>x.id===id);
  assert.equal(by("a").cid,"c:ט:3","היה — נשאר");
  assert.equal(by("b").cid,"c:ט:3","«ט3» הוא ט׳3 הרשומה");
  assert.equal(by("d").cid,"cn:נבחרתכדורעף","כיתה חופשית מקבלת מזהה משלה");
  assert.equal(rep.stuKept,1); assert.equal(rep.stuClosed,2);
  assert.equal(rep.stuNoClass,1); assert.equal(rep.stuUnresolved,0);
  assert.ok(s.get("ft.classes")["cn:נבחרתכדורעף"],"והכיתה החופשית נרשמה, כמו ב-2→3");
});

test("3→4: תלמיד בלי כיתה — cid:null ו-cidAmbig, בלי ניחוש",()=>{
  const s=memStore(v3());
  D.migrate(s);
  const c=s.get("stu.list").find(x=>x.id==="c");
  assert.equal(c.cid,null);
  assert.equal(c.cidAmbig,"no-class");
  assert.equal(c.cls,"","וההקשר נשאר ריק כפי שהיה");
});

test("3→4: כיתה שאינה ניתנת לנרמול נחשבת «אין כיתה» ונספרת בנפרד",()=>{
  const seed=v3(); seed["stu.list"].push({id:"e",name:"X",cls:"׳׳ - ",tests:[]});
  const s=memStore(seed);
  const rep=D.migrate(s);
  const e=s.get("stu.list").find(x=>x.id==="e");
  assert.equal(e.cid,null); assert.equal(e.cidAmbig,"no-class");
  assert.equal(e.cls,"׳׳ - ","הטקסט המקורי לא נמחק");
  assert.equal(rep.stuUnresolved,1);
});

test("3→4: דטרמיניסטית — שני מכשירים זהים מגיעים לאותו פלט",()=>{
  const a=memStore(v3()), b=memStore(v3());
  D.migrate(a); D.migrate(b);
  assert.equal(snapshot(a),snapshot(b));
});

test("3→4: אידמפוטנטית — ריצה שנייה לא משנה בית, וגם קריאה ישירה חוזרת",()=>{
  const s=memStore(v3());
  D.migrate(s);
  const once=snapshot(s);
  const rep2=D.migrate(s);
  assert.equal(rep2.noop,true);
  assert.equal(snapshot(s),once);
  /* גם המיגרציה עצמה, כשקוראים לה ישירות פעם נוספת */
  const mig=D.MIGRATIONS.find(m=>m.to===4);
  const rep={classes:0,stuKept:0,stuClosed:0,stuNoClass:0,stuUnresolved:0};
  mig.run(s,rep);
  assert.equal(snapshot(s),once,"אותם בתים");
  assert.equal(rep.stuClosed,0,"ואין למי להשלים");
});

test("3→4: לא הרסנית — אף רשומה לא נמחקה, אף שדה קיים לא נדרס",()=>{
  const seed=v3(); const s=memStore(seed);
  const before={
    stuIds:seed["stu.list"].map(x=>x.id), stuCls:seed["stu.list"].map(x=>x.cls),
    res:JSON.stringify(seed["ft.results"]), roster:JSON.stringify(seed["ft.roster"]),
    ses:JSON.stringify(seed["ls.sessions"]), cls3:seed["ft.classes"]["c:ט:3"]
  };
  D.migrate(s);
  assert.deepEqual(s.get("stu.list").map(x=>x.id),before.stuIds,"מזהי התלמידים");
  assert.deepEqual(s.get("stu.list").map(x=>x.cls),before.stuCls,"שמות הכיתה כהקשר");
  assert.equal(JSON.stringify(s.get("ft.results")),before.res,"המדידות — בית אחר בית");
  assert.equal(JSON.stringify(s.get("ft.roster")),before.roster,"רשימות הכיתה לא נגעו");
  assert.equal(JSON.stringify(s.get("ls.sessions")),before.ses,"וגם השיעורים");
  assert.deepEqual(s.get("ft.classes")["c:ט:3"],before.cls3,"הרישום הקיים לא נדרס");
});

test("3→4: cid קיים מנצח גם כשהתווית הייתה נגזרת למזהה אחר",()=>{
  /* הכיתה שונתה שם ל«קבוצת בוקר» וזה מה שכתוב על התלמיד; classId
     של התווית היה נותן cn:… — אבל הזהות כבר נקבעה ולא מחשבים מחדש. */
  const seed=v3();
  seed["ft.classes"]["c:ט:3"].name="קבוצת בוקר"; seed["ft.classes"]["c:ט:3"].key="קבוצתבוקר";
  seed["stu.list"][0].cls="קבוצת בוקר";
  const s=memStore(seed);
  D.migrate(s);
  assert.equal(s.get("stu.list")[0].cid,"c:ט:3");
  assert.equal(Object.keys(s.get("ft.classes")).length,2,"ט׳3 ונבחרת — לא נוצרה «קבוצת בוקר» שנייה");
});

test("3→4: תלמיד שכתובה עליו כיתה ששמה שונה מקבל את המזהה המקורי, לא חדש",()=>{
  const seed=v3();
  seed["ft.classes"]["c:ט:3"].name="ט׳3 — מגמת ספורט";
  seed["ft.classes"]["c:ט:3"].key="ט3מגמתספורט";
  seed["stu.list"][1].cls="ט׳3 — מגמת ספורט";       /* רון, בלי cid */
  const s=memStore(seed);
  D.migrate(s);
  assert.equal(s.get("stu.list")[1].cid,"c:ט:3","דרך הרישום, לא דרך classId של התווית");
  assert.equal(s.get("ft.classes")["cn:ט3מגמתספורט"],undefined,"ולא נוצר מזהה שני");
});

test("3→4: stu.list פגום או חסר — לא נופל ולא נוגע",()=>{
  const a=memStore({"schema.version":3,"stu.list":"לא מערך"});
  assert.equal(D.migrate(a).ok,true);
  assert.equal(a.get("stu.list"),"לא מערך");
  const b=memStore({"schema.version":3,"stu.list":[null,7,{id:"a",name:"דן",cls:"ט3"}]});
  const rep=D.migrate(b);
  assert.equal(rep.ok,true,rep.error||"");
  assert.equal(b.get("stu.list").length,3,"ה-null וה-7 נשארו");
  assert.equal(b.get("stu.list")[2].cid,"c:ט:3");
});

test("מכשיר בגרסה 1 עובר את כל הדרך עד 4, ולכל תלמיד יש cid או סימון",()=>{
  const seed=legacyClass();
  seed["stu.list"]=[{name:"דן אבירם",cls:"ט׳3"},{name:"אורח",cls:""}];
  const s=memStore(seed);
  const rep=D.migrate(s);
  assert.deepEqual(rep.applied,["student-identity","class-identity","student-class-closure"]);
  const stu=s.get("stu.list");
  assert.ok(stu.every(x=>x.id),"sid לכולם");
  assert.equal(stu[0].cid,"c:ט:3");
  assert.equal(stu[1].cid,null); assert.equal(stu[1].cidAmbig,"no-class");
  assert.equal(s.get("ft.results").length,4,"אפס אובדן מדידות");
});

/* ---------- cidOfStudent ---------- */

test("cidOfStudent: cid קיים הוא הזהות, גם כשהתווית סותרת",()=>{
  const s=memStore(v3());
  assert.equal(D.cidOfStudent({cid:"c:י:1",cls:"ט׳3"},s),"c:י:1");
  assert.equal(D.cidOfStudent({cid:"c:י:1"},null),"c:י:1","גם בלי store");
});

test("cidOfStudent: בלי cid — דרך הרישום, ולכן עומד בשינוי שם",()=>{
  const s=memStore(v3());
  D.renameClass(s,"c:ט:3","קבוצת בוקר");
  assert.equal(D.cidOfStudent({cls:"קבוצת בוקר"},s),"c:ט:3","השם החדש → המזהה המקורי");
  assert.equal(D.cidOfStudent({cls:"ט3"},s),"c:ט:3","וגם התווית הישנה");
  assert.equal(D.cidOfStudent({cls:"ט׳3"},null),"c:ט:3","ובלי store — נפילה אחורה ל-classId");
});

test("cidOfStudent: אין כיתה → null, ולא ממציאים",()=>{
  const s=memStore(v3());
  [{cls:""},{cls:"   "},{cls:null},{},{cls:"׳׳"},{cid:"",cls:""},{cid:null,cls:""},{cid:7,cls:""}]
    .forEach(x=>assert.equal(D.cidOfStudent(x,s),null,JSON.stringify(x)));
  assert.equal(D.cidOfStudent(null,s),null);
  assert.equal(D.cidOfStudent("מחרוזת",s),null);
});

test("cidOfStudent: cid לא תקין (ריק / לא מחרוזת) אינו זהות — נופלים לתווית",()=>{
  const s=memStore(v3());
  assert.equal(D.cidOfStudent({cid:"",cls:"ט3"},s),"c:ט:3");
  assert.equal(D.cidOfStudent({cid:null,cls:"ט3"},s),"c:ט:3");
  assert.equal(D.cidOfStudent({cid:{},cls:"ט3"},s),"c:ט:3");
});

test("cidOfStudent: טהור — לא משנה את התלמיד ולא רושם כיתה",()=>{
  const s=memStore(v3());
  const before=snapshot(s);
  const stud={id:"z",name:"חדש",cls:"י׳2"};
  const copy=JSON.stringify(stud);
  assert.equal(D.cidOfStudent(stud,s),"c:י:2");
  assert.equal(JSON.stringify(stud),copy,"התלמיד לא השתנה");
  assert.equal(snapshot(s),before,"וה-store לא השתנה — י׳2 לא נרשמה");
});

test("resolveClassId: כיתה מוכרת בשם חדש → המזהה הרשום; חדשה נרשמת רק עם register",()=>{
  const s=memStore(v3());
  D.renameClass(s,"c:ט:3","קבוצת בוקר");
  assert.equal(D.resolveClassId(s,"קבוצת בוקר"),"c:ט:3");
  assert.equal(D.resolveClassId(s,"קבוצת בוקר",true),"c:ט:3","גם עם register — לא נוצרת כיתה שנייה");
  assert.equal(Object.keys(s.get("ft.classes")).length,1);
  assert.equal(D.resolveClassId(s,"י׳2"),"c:י:2","בלי register — נגזר");
  assert.equal(s.get("ft.classes")["c:י:2"],undefined,"ולא נרשם");
  assert.equal(D.resolveClassId(s,"י׳2",true),"c:י:2");
  assert.ok(s.get("ft.classes")["c:י:2"],"עם register — נרשם");
  assert.equal(D.resolveClassId(s,"",true),null,"ריק → null, ולא נרשם כלום");
  assert.equal(Object.keys(s.get("ft.classes")).length,2);
});

/* ---------- גיבוי מסכמה 3 ---------- */

test("גיבוי מסכמה 3 נטען על אפליקציית סכמה 4 ומוסב; גיבוי מסכמה 5 נדחה",()=>{
  const file={app:"hamegrash-pro",kind:"backup",v:D.BK_V,schema:3,at:"2026-09-01T00:00:00Z",data:{},idb:{items:[]}};
  const dev=v3(); Object.keys(dev).forEach(k=>file.data[k]=JSON.stringify(dev[k]));
  const v=D.validateBackup(file);
  assert.equal(v.ok,true,JSON.stringify(v.errors));
  assert.equal(v.schema,3);
  const seed={}; Object.keys(file.data).forEach(k=>seed[k]=JSON.parse(file.data[k]));
  const s=memStore(seed);
  const rep=D.migrate(s);
  assert.deepEqual(rep.applied,["student-class-closure"]);
  assert.equal(s.get("schema.version"),4);
  assert.ok(s.get("stu.list").filter(x=>x.cls).every(x=>x.cid),"כל מי שיש לו כיתה קיבל cid");
  assert.equal(D.validateBackup(Object.assign({},file,{schema:5})).errors[0],"newer-schema");
});
