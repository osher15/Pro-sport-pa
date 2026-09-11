"use strict";
/* גיבוי.
   הגיבוי הוא הדבר היחיד שעומד בין מורה לבין אובדן שנה של מדידות.
   שתי דרישות: שלא ישקר על מה שיש בו, ושלא ייבלע קובץ פגום. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

const good=(extra)=>Object.assign({
  app:"hamegrash-pro",kind:"backup",v:D.BK_V,schema:D.SCHEMA_VERSION,
  at:"2026-09-11T00:00:00.000Z",school:"מקיף ג׳",build:"abc",
  data:{"ft.results":'[{"id":"r1"}]',"settings":'{"school":"מקיף ג׳"}'}
},extra||{});

test("הרכבת גיבוי: מעטפת מלאה וגרסה נוכחית",()=>{
  const s=D.buildSnapshot({data:{"ft.results":"[]"},school:"בית ספר",build:"b1"});
  assert.equal(s.app,"hamegrash-pro");
  assert.equal(s.kind,"backup");
  assert.equal(s.v,D.BK_V);
  assert.equal(s.schema,D.SCHEMA_VERSION);
  assert.ok(s.at,"חותמת זמן");
  assert.equal(D.validateBackup(s).ok,true);
});

test("קובץ תקין עובר ולידציה וסופר מפתחות",()=>{
  const v=D.validateBackup(good());
  assert.equal(v.ok,true,JSON.stringify(v.errors));
  assert.equal(v.keys,2);
  assert.equal(v.kind,"backup");
});

test("קובץ שאינו של המגרש נדחה",()=>{
  [null,undefined,"מחרוזת",[],{},{app:"אחר"},{app:"hamegrash-pro",kind:"משהו"}]
    .forEach(x=>assert.equal(D.validateBackup(x).ok,false,JSON.stringify(x)));
});

test("קובץ בלי data נדחה במקום להתקבל כריק",()=>{
  assert.deepEqual(D.validateBackup(good({data:undefined})).errors,["missing-data"]);
  assert.deepEqual(D.validateBackup(good({data:[]})).errors,["missing-data"]);
});

test("ערך שאינו מחרוזת בתוך data נדחה",()=>{
  const v=D.validateBackup(good({data:{"ft.results":[1,2,3]}}));
  assert.equal(v.ok,false);
  assert.ok(v.errors.some(e=>e.indexOf("value-not-string")===0));
});

test("ערך שאינו JSON מייצר אזהרה ולא חוסם — עדיף לשחזר מה שיש",()=>{
  const v=D.validateBackup(good({data:{"x":"{שבור"}}));
  assert.equal(v.ok,true);
  assert.ok(v.warnings.some(w=>w.indexOf("value-not-json")===0));
});

test("קובץ מגרסה חדשה יותר נדחה במקום להיבלע חלקית",()=>{
  const v=D.validateBackup(good({v:D.BK_V+1}));
  assert.equal(v.ok,false);
  assert.deepEqual(v.errors,["newer-file"]);
});

test("קובץ מגרסה ישנה יותר עדיין מתקבל",()=>{
  const v=D.validateBackup({app:"hamegrash-pro",kind:"backup",v:1,at:"x",data:{"ft.results":"[]"}});
  assert.equal(v.ok,true);
  assert.equal(v.schema,1,"קובץ ישן נחשב סכמה 1 ויעבור מיגרציה אחרי השחזור");
});

test("סכמה עתידית בתוך קובץ נדחית",()=>{
  assert.deepEqual(D.validateBackup(good({schema:D.SCHEMA_VERSION+1})).errors,["newer-schema"]);
});

test("מעטפת מוצפנת: נבדקת בלי לפענח",()=>{
  const enc={app:"hamegrash-pro",kind:"backup-encrypted",v:1,at:"x",
    alg:"AES-GCM",kdf:"PBKDF2-SHA256",iter:310000,salt:"AAA",iv:"BBB",ct:"CCC"};
  const v=D.validateBackup(enc);
  assert.equal(v.ok,true);
  assert.equal(v.kind,"backup-encrypted");

  const broken=Object.assign({},enc); delete broken.ct;
  assert.deepEqual(D.validateBackup(broken).errors,["missing-ct"]);
  assert.deepEqual(D.validateBackup(Object.assign({},enc,{alg:"ROT13"})).errors,["unknown-alg"]);
});

test("גיבוי גרסה 2 בלי מדיה מסומן באזהרה",()=>{
  assert.ok(D.validateBackup(good()).warnings.includes("no-media-section"));
});

test("מדיה שהושמטה מדווחת כאזהרה ולא נעלמת בשקט",()=>{
  const v=D.validateBackup(good({idb:{store:"rec",items:[],omitted:[{id:"a"},{id:"b"}]}}));
  assert.equal(v.ok,true);
  assert.ok(v.warnings.includes("media-omitted:2"));
});

test("מקטע idb פגום נדחה",()=>{
  assert.deepEqual(D.validateBackup(good({idb:"לא אובייקט"})).errors,["bad-idb"]);
  assert.deepEqual(D.validateBackup(good({idb:{items:"לא מערך"}})).errors,["bad-idb-items"]);
});

test("תקציב מדיה: החדשים נכנסים, הישנים מדווחים בשמם",()=>{
  const items=[
    {id:"a",name:"קפיצה",ts:300,bytes:30},
    {id:"b",name:"ריצה", ts:200,bytes:30},
    {id:"c",name:"הדיפה",ts:100,bytes:30}
  ];
  const p=D.planMedia(items,70);
  assert.deepEqual(p.keep,["a","b"],"החדשים ביותר נכנסים");
  assert.equal(p.omit.length,1);
  assert.equal(p.omit[0].id,"c");
  assert.equal(p.omit[0].name,"הדיפה","המורה צריך לדעת איזה סרטון לא נכנס");
  assert.equal(p.bytes,60);
});

test("רשומה בלי וידאו לא נספרת בתקציב ותמיד נכנסת",()=>{
  const p=D.planMedia([{id:"a",ts:1,bytes:0},{id:"b",ts:2,bytes:999}],10);
  assert.ok(p.keep.includes("a"));
  assert.deepEqual(p.omit.map(o=>o.id),["b"]);
});

test("תוכנית שחזור מראה בדיוק מה נכנס, מה נדרס ומה ייעלם",()=>{
  const snap=good({data:{"ft.results":"[]","stu.list":"[]"}});
  const p=D.planRestore(snap,["ft.results","bt.results","settings"]);
  assert.deepEqual(p.add,["stu.list"]);
  assert.deepEqual(p.replace,["ft.results"]);
  assert.deepEqual(p.drop,["bt.results","settings"],"שחזור מחליף ולא ממזג — צריך להגיד את זה מראש");
});

test("תוכנית שחזור סופרת מדיה",()=>{
  const p=D.planRestore(good({idb:{items:[{id:"a"},{id:"b"}],omitted:[{id:"c"}]}}),[]);
  assert.equal(p.media,2);
  assert.equal(p.mediaOmitted,1);
});
