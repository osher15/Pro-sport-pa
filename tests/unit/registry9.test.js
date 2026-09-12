"use strict";
/* שלב 9 — הרישום כמקור אמת לשם, והמזהה כמקור לשכבה/מספר. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");
const {memStore}=require("../helpers/memstore.js");

test("cidParts: שכבה ומספר מתוך המזהה, null לכיתה חופשית או קלט פגום",()=>{
  assert.deepEqual(D.cidParts("c:ט:3"),{grade:"ט",num:3});
  assert.deepEqual(D.cidParts("c:יא:12"),{grade:"יא",num:12});
  [null,"","cn:נבחרת","c:ט:","ט׳3","c:x:1",7].forEach(v=>assert.equal(D.cidParts(v),null,JSON.stringify(v)));
});

test("שינוי שם: המזהה, התלמידים, המדידות והשיעור לא זזים — רק השם",()=>{
  const s=memStore({"schema.version":4,
    "ft.classes":{"c:ח:1":{id:"c:ח:1",name:"ח׳1",grade:"ח",num:1,key:"ח1"}},
    "stu.list":[{id:"a",name:"Alice",cls:"ח׳1",cid:"c:ח:1"},{id:"b",name:"Bob",cls:"ח1"}],
    "ft.results":[{id:"r1",cls:"ח׳1",cid:"c:ח:1",test:"push",sid:"a",d:"2026-09-01",val:20}],
    "ls.sessions":[{id:"ls1",cid:"c:ח:1",clsSnapshot:"ח׳1",date:"2026-09-01",startedAt:1,endedAt:null,status:"active"}]});
  const before=JSON.stringify([s.get("stu.list"),s.get("ft.results"),s.get("ls.sessions")]);
  const r=D.renameClass(s,"c:ח:1","ח׳1 מצטיינים");
  assert.equal(r.ok,true);
  assert.equal(JSON.stringify([s.get("stu.list"),s.get("ft.results"),s.get("ls.sessions")]),before,"אף רשומה לא נכתבה מחדש");
  assert.equal(D.classOf(s,"c:ח:1").name,"ח׳1 מצטיינים");
  assert.equal(D.cidOfStudent(s.get("stu.list")[0],s),"c:ח:1","Alice — לפי cid");
  assert.equal(D.cidOfStudent(s.get("stu.list")[1],s),"c:ח:1","Bob — התווית הישנה עדיין נפתרת לאותה כיתה");
  assert.equal(D.cidOfStudent({cls:"ח׳1 מצטיינים"},s),"c:ח:1","והשם החדש גם");
  assert.deepEqual(D.cidParts("c:ח:1"),{grade:"ח",num:1},"הבורר עדיין יודע שזו ח/1");
  assert.equal(D.measurementsOf(s.get("ft.results"),{id:"a"},"push",{cid:"c:ח:1"}).length,1);
});

test("שם ישן שנשאר על תלמיד אינו מעביר אותו לכיתה אחרת אחרי שינוי שם למראה של כיתה אחרת",()=>{
  const s=memStore({"schema.version":4,
    "ft.classes":{"c:ח:1":{id:"c:ח:1",name:"ח׳1",grade:"ח",num:1,key:"ח1"}},
    "stu.list":[{id:"a",name:"Alice",cls:"ח׳1",cid:"c:ח:1"},{id:"b",name:"Bob",cls:"ח׳1"}]});
  D.renameClass(s,"c:ח:1","ח׳2");
  assert.equal(D.cidOfStudent(s.get("stu.list")[0],s),"c:ח:1");
  assert.equal(D.cidOfStudent(s.get("stu.list")[1],s),"c:ח:1","גם בלי cid: «ח׳1» → המזהה הנגזר c:ח:1 קיים ברישום");
  assert.equal(Object.keys(s.get("ft.classes")).length,1,"לא נוצרה כיתה שנייה");
});
