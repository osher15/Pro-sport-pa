"use strict";
/* ============================================================
   רשימות הכיתה כמקור ל«התלמידים שלי»
   ------------------------------------------------------------
   הבאג שהבדיקות כאן סוגרות דווח מהשטח: מורה העלה רשימה לכל כיתה
   בנפרד, ואז ראה «התלמידים שלי» ריק וקבוצות הוראה שמדווחות
   «0 תלמידים». הנתונים היו שם כל הזמן — במאגר השני.

   הקו שנשמר כאן: הגשר הוא חד-כיווני ואינו דורס. תלמיד שכבר קיים
   ב«התלמידים שלי» שומר על הגיל, המשקל, הציונים והמבחנים שלו.
   ============================================================ */
const test=require("node:test");
const assert=require("node:assert");
const D=require("../../hm-data.js");

const store=reg=>{ const m={"ft.classes":reg||{}};
  return {get:(k,d)=>(k in m?m[k]:(d===undefined?null:d)),set:(k,v)=>{m[k]=v;}}; };
const REG={
  "c:ט:3":{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"},
  "c:י:1":{id:"c:י:1",name:"י׳1",grade:"י",num:1,key:"י1"}
};

test("רשימת כיתה הופכת לתלמידים, עם הכיתה והמזהה שלהם",()=>{
  const r=D.syncStudentsFromRosters(store(REG),[],{
    "ט3":[{id:"a",name:"דן אבירם",sex:"boys"},{id:"b",name:"רון לוי"}]
  });
  assert.equal(r.added,2);
  assert.equal(r.list.length,2);
  assert.equal(r.list[0].id,"a","מזהה הרשימה הוא מזהה התלמיד — אחרת ההיסטוריה נקרעת");
  assert.equal(r.list[0].cid,"c:ט:3");
  assert.equal(r.list[0].cls,"ט׳3","השם מהרישום, לא המפתח");
});

test("כמה כיתות נכנסות יחד, כל אחת עם הזהות שלה",()=>{
  const r=D.syncStudentsFromRosters(store(REG),[],{
    "ט3":[{id:"a",name:"דן"}],"י1":[{id:"c",name:"עדי"}]
  });
  assert.equal(r.added,2);
  assert.equal(r.classes,2);
  assert.equal(r.list.find(s=>s.id==="c").cid,"c:י:1");
});

test("תלמיד שכבר קיים אינו נדרס — הגיל, המשקל והמבחנים נשארים",()=>{
  const cur=[{id:"a",name:"דן אבירם",cls:"ט׳3",cid:"c:ט:3",sex:"boys",
    age:16,h:178,w:64,tests:[{d:"2026-01-01",dist:1200}]}];
  const r=D.syncStudentsFromRosters(store(REG),cur,{
    "ט3":[{id:"a",name:"דן אבירם",sex:"boys"}]
  });
  assert.equal(r.added,0);
  assert.equal(r.list.length,1);
  assert.equal(r.list[0].age,16);
  assert.equal(r.list[0].h,178);
  assert.equal(r.list[0].tests.length,1);
});

test("תלמיד שנמצא בלי כיתה מאמץ את הכיתה מהרשימה",()=>{
  const cur=[{id:"z",name:"עדי כהן",cls:"",cid:null,tests:[]}];
  const r=D.syncStudentsFromRosters(store(REG),cur,{"י1":[{name:"עדי כהן"}]});
  assert.equal(r.added,0,"אותו תלמיד, לא שני");
  assert.equal(r.list[0].cid,"c:י:1");
  assert.equal(r.list[0].cls,"י׳1");
});

test("שם זהה בשתי כיתות הוא שני תלמידים",()=>{
  const r=D.syncStudentsFromRosters(store(REG),[],{
    "ט3":[{id:"a",name:"דן כהן"}],"י1":[{id:"b",name:"דן כהן"}]
  });
  assert.equal(r.added,2);
  assert.deepEqual(r.list.map(s=>s.cid).sort(),["c:ט:3","c:י:1"]);
});

test("הרצה שנייה אינה מוסיפה כלום — הגשר אינו מכפיל",()=>{
  const ros={"ט3":[{id:"a",name:"דן"},{id:"b",name:"רון"}]};
  const one=D.syncStudentsFromRosters(store(REG),[],ros);
  const two=D.syncStudentsFromRosters(store(REG),one.list,ros);
  assert.equal(two.added,0);
  assert.equal(two.list.length,2);
});

test("מין שלא נקבע ברשימה אינו הופך לבן",()=>{
  const r=D.syncStudentsFromRosters(store(REG),[],{"ט3":[{id:"a",name:"נועה"}]});
  assert.equal(r.list[0].sex,null,"נורמות הכושר נפרדות לפי מין — המצאה כאן היא ציון שגוי");
});

test("מין שכן נקבע ברשימה משלים תלמיד שאין לו",()=>{
  const cur=[{id:"a",name:"נועה",cls:"ט׳3",cid:"c:ט:3",sex:null,tests:[]}];
  const r=D.syncStudentsFromRosters(store(REG),cur,{"ט3":[{id:"a",name:"נועה",sex:"girls"}]});
  assert.equal(r.list[0].sex,"girls");
  assert.ok(r.filled>0);
});

test("כיתה שאינה רשומה עדיין נכנסת לפי המפתח",()=>{
  const r=D.syncStudentsFromRosters(store({}),[],{"ח2":[{id:"q",name:"יעל"}]});
  assert.equal(r.added,1);
  assert.equal(r.list[0].cid,"c:ח:2");
});

test("רשימה ריקה, קלט פגום ושורה בלי שם אינם יוצרים תלמיד",()=>{
  const r=D.syncStudentsFromRosters(store(REG),[],
    {"ט3":[],"י1":[null,{name:"  "},{name:"עדי"}],"בלי":"לא מערך"});
  assert.equal(r.added,1);
  assert.equal(r.list[0].name,"עדי");
});

test("הקלט אינו משתנה — המערך שנמסר נשאר כפי שהוא",()=>{
  const cur=[];
  const r=D.syncStudentsFromRosters(store(REG),cur,{"ט3":[{id:"a",name:"דן"}]});
  assert.equal(cur.length,0);
  assert.equal(r.list.length,1);
});

test("אחרי הגשר קבוצת הוראה סופרת תלמידים אמיתיים",()=>{
  const st=store(JSON.parse(JSON.stringify(REG)));
  const g=D.makeGroup(st,{name:"ט׳3 + י׳1",members:["c:ט:3","c:י:1"]});
  assert.equal(g.outcome,"created");
  const r=D.syncStudentsFromRosters(st,[],{
    "ט3":[{id:"a",name:"דן"},{id:"b",name:"רון"}],"י1":[{id:"c",name:"עדי"}]
  });
  assert.equal(D.studentsIn(st,g.group.id,r.list).length,3,
    "זה בדיוק מה שהראה «0 תלמידים» בשטח");
});

test("שתי כיתות באותו שם — הרשימה המשותפת אינה משויכת לאף אחת מהן",()=>{
  /* מפתח הרשימה הוא תווית ולא זהות. שיוך שגוי כאן קובר תלמיד
     בכיתה שהוא לא בה, בלי שאיש יראה — ולכן לא מנחשים. */
  const st=store({"c:ח:1":{id:"c:ח:1",name:"ח׳1",grade:"ח",num:1,key:"ח1"},
                  "c:ח:2":{id:"c:ח:2",name:"ח׳1",grade:"ח",num:1,key:"ח1"}});
  const r=D.syncStudentsFromRosters(st,[],{"ח1":[{id:"b",name:"בוב לוי"}]});
  assert.equal(r.added,0);
  assert.equal(r.list.length,0);
});

test("קבוצת הוראה אינה נספרת ככיתה בעלת אותו מפתח",()=>{
  const st=store(JSON.parse(JSON.stringify(REG)));
  D.makeGroup(st,{name:"ט׳3",members:["c:ט:3","c:י:1"]});   /* שם שמתנגש בכוונה */
  const r=D.syncStudentsFromRosters(st,[],{"ט3":[{id:"a",name:"דן"}]});
  assert.equal(r.added,1,"הקבוצה אינה כיתה, ולכן אינה יוצרת עמימות");
  assert.equal(r.list[0].cid,"c:ט:3");
});
