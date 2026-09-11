"use strict";
/* זהות תלמיד — הבאג שבגללו כל השלב הזה קיים.
   עד היום ההיסטוריה נמצאה לפי r.name===name, ולכן תיקון שגיאת כתיב
   בשם ניתק עשר מדידות בשקט. הבדיקות כאן נועדו להיכשל אם מישהו
   יחזיר את ההתנהגות הזאת. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

const REC=(o)=>Object.assign({id:"x",d:"2026-09-02",ts:1,cls:"ט׳3",test:"push",val:20,unit:"חזרות"},o);

test("מזהה גובר על שם: תלמיד ששינה שם שומר על ההיסטוריה",()=>{
  const rec=REC({sid:"s1",name:"דן אבירם"});
  const renamed={id:"s1",name:"דן אבירם-לוי"};
  assert.equal(D.sameStudent(rec,renamed),true);
});

test("מזהה גובר על שם: שני תלמידים בעלי אותו שם אינם מתערבבים",()=>{
  const rec=REC({sid:"s1",name:"דן כהן"});
  const other={id:"s2",name:"דן כהן"};
  assert.equal(D.sameStudent(rec,other),false,"שם זהה אינו מספיק כששני הצדדים מזוהים");
});

test("רשומה ישנה בלי sid עדיין נמצאת לפי שם",()=>{
  const rec=REC({name:"רון לוי"});
  assert.equal(D.sameStudent(rec,{id:"s9",name:"רון לוי"}),true);
  assert.equal(D.sameStudent(rec,{id:"s9",name:"רון לוין"}),false);
});

test("רשומה מזוהה מול תלמיד בלי מזהה — אין בסיס להתאמה",()=>{
  assert.equal(D.sameStudent(REC({sid:"s1",name:"דן"}),{name:"דן"}),false);
});

test("קלט חסר לא מפיל ולא מתאים",()=>{
  assert.equal(D.sameStudent(null,{id:"s1"}),false);
  assert.equal(D.sameStudent(REC({sid:"s1"}),null),false);
});

test("studentKey מעדיף id, מקבל sid, ומחזיר null כשאין",()=>{
  assert.equal(D.studentKey({id:"a",sid:"b"}),"a");
  assert.equal(D.studentKey({sid:"b"}),"b");
  assert.equal(D.studentKey({name:"דן"}),null);
  assert.equal(D.studentKey(null),null);
});

test("refKey מבדיל בין מזוהה ללא־מזוהה",()=>{
  assert.equal(D.refKey({id:"s1",name:"דן"}),"id:s1");
  assert.equal(D.refKey({name:"דן"}),"nm:דן");
  assert.notEqual(D.refKey({id:"s1",name:"דן"}),D.refKey({name:"דן"}));
});

test("מפתח כיתה מנרמל גרש, גרשיים ורווח",()=>{
  const k=D.clsKey("ט׳3");
  ["ט3","ט' 3","ט״3","ט-3"," ט׳3 "].forEach(v=>
    assert.equal(D.clsKey(v),k,"«"+v+"» צריכה להיות אותה כיתה"));
});

test("attemptsOf מחזיר את ההיסטוריה של תלמיד אחד בלבד, מסודרת בזמן",()=>{
  const res=[
    REC({id:"a",sid:"s1",name:"דן",d:"2026-09-02"}),
    REC({id:"b",sid:"s1",name:"דן",d:"2026-06-04"}),
    REC({id:"c",sid:"s2",name:"דן",d:"2026-09-02"}),
    REC({id:"d",sid:"s1",name:"דן",test:"r60"}),
    REC({id:"e",sid:"s1",name:"דן",cls:"י1"})
  ];
  const got=D.attemptsOf(res,"ט3","push",{id:"s1",name:"דן החדש"});
  assert.deepEqual(got.map(r=>r.id),["b","a"],"רק הכיתה, המבחן והתלמיד הנכונים, לפי סדר תאריכים");
});

test("attemptsOf מערבב רשומות מוסבות ורשומות ישנות של אותו תלמיד",()=>{
  const res=[
    REC({id:"old",name:"דן",d:"2026-06-04"}),          /* בלי sid */
    REC({id:"new",sid:"s1",name:"דן",d:"2026-09-02"})
  ];
  /* הישנה נמצאת לפי שם, החדשה לפי מזהה — שתיהן שייכות לאותו תלמיד */
  const got=D.attemptsOf(res,"ט3","push",{id:"s1",name:"דן"});
  assert.deepEqual(got.map(r=>r.id),["old","new"]);
});
