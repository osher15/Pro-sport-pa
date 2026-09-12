"use strict";
/* שלב 8ג — שני באגי זהות תלמיד שהביקורת מצאה.
   importFromStu ביטל כפילויות לפי שם, וייבוא ה-CSV התאים לפי שם בלי
   כיתה. שניהם ממזגים שני אנשים לאחד — בניגוד לכל ההשקעה בסיומת #2
   של המיגרציה. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");
const {memStore}=require("../helpers/memstore.js");

/* ---------- mergeRoster ---------- */

test("mergeRoster: שני תלמידים באותו שם, אותה כיתה, שני sid — שניהם נכנסים",()=>{
  const m=D.mergeRoster([],[{id:"a1",name:"דן כהן",sex:"boys"},{id:"a2",name:"דן כהן",sex:"boys"}]);
  assert.equal(m.added,2);
  assert.deepEqual(m.list.map(x=>x.id),["a1","a2"]);
});

test("mergeRoster: אותו מזהה כבר ברשימה — לא נכנס פעמיים",()=>{
  const cur=[{id:"a1",name:"דן כהן",sex:"boys"}];
  const m=D.mergeRoster(cur,[{id:"a1",name:"דן כהן"},{id:"b",name:"רון"}]);
  assert.equal(m.added,1);
  assert.deepEqual(m.list.map(x=>x.id),["a1","b"]);
  assert.equal(cur.length,1,"הקלט לא השתנה");
});

test("mergeRoster: רשומה באותו שם עם מזהה ישן (הדבקה ידנית) נחשבת אותו אדם — כמו קודם",()=>{
  const m=D.mergeRoster([{id:"f1",name:"דן כהן"}],[{id:"a1",name:"דן כהן"}]);
  assert.equal(m.added,0,"לא נוצר «דן כהן» שני לאותו אדם");
  assert.deepEqual(m.list.map(x=>x.id),["f1"]);
});

test("mergeRoster: רשומה ישנה אחת מכסה נכנס אחד בלבד; השני הוא אדם נוסף",()=>{
  const m=D.mergeRoster([{id:"f1",name:"דן כהן"}],[{id:"a1",name:"דן כהן"},{id:"a2",name:"דן כהן"}]);
  assert.equal(m.added,1);
  assert.deepEqual(m.list.map(x=>x.id),["f1","a2"]);
});

test("mergeRoster: רשומה שמזהה שלה כבר בין הנכנסים אינה «פנויה» לכסות שם כפול",()=>{
  /* ברשימה: דן כהן #a1. נכנסים: a1 (מדלגים) ו-a2 — a2 חייב להיכנס */
  const m=D.mergeRoster([{id:"a1",name:"דן כהן"}],[{id:"a1",name:"דן כהן"},{id:"a2",name:"דן כהן"}]);
  assert.equal(m.added,1);
  assert.deepEqual(m.list.map(x=>x.id),["a1","a2"]);
});

test("mergeRoster: קלט פגום לא מפיל",()=>{
  const m=D.mergeRoster([null,{id:"x",name:"א"}],[null,{name:""},{id:"y",name:"ב"}]);
  assert.equal(m.added,1);
  assert.equal(m.list.length,3,"ה-null נשאר, כמו שהיה");
});

/* ---------- findStudent ---------- */

const store=()=>memStore({"ft.classes":{"c:ט:3":{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"}}});
const LIST=()=>[
  {id:"a",name:"דן כהן",cls:"ט׳3",cid:"c:ט:3"},
  {id:"b",name:"דן כהן",cls:"י׳1",cid:"c:י:1"},
  {id:"c",name:"רון לוי",cls:"ט׳3",cid:"c:ט:3"},
  {id:"d",name:"גל שדה",cls:"",cid:null}
];

test("findStudent: אותו שם + אותה כיתה — נמצא",()=>{
  assert.equal(D.findStudent(LIST(),"דן כהן","c:ט:3",store()).id,"a");
  assert.equal(D.findStudent(LIST(),"דן כהן","c:י:1",store()).id,"b");
});

test("findStudent: אותו שם + כיתה אחרת — לא נמצא, ולא ממוזג",()=>{
  assert.equal(D.findStudent(LIST(),"דן כהן","c:יא:2",store()),null);
  assert.equal(D.findStudent(LIST(),"רון לוי","c:י:1",store()),null);
});

test("findStudent: שם אחר + אותה כיתה — לא נמצא",()=>{
  assert.equal(D.findStudent(LIST(),"נועה בר","c:ט:3",store()),null);
});

test("findStudent: תלמיד בלי כיתה מאמץ את הכיתה (ההתנהגות הקיימת), ורק הוא",()=>{
  assert.equal(D.findStudent(LIST(),"גל שדה","c:ט:3",store()).id,"d");
  assert.equal(D.findStudent(LIST(),"גל שדה",null,store()).id,"d","וגם כשלשורה עצמה אין כיתה");
  assert.equal(D.findStudent(LIST(),"דן כהן",null,store()),null,"אבל תלמיד עם כיתה לא מותאם לשורה בלי כיתה");
});

test("findStudent: מתאים גם לתלמיד ישן בלי cid, דרך התווית והרישום",()=>{
  const list=[{id:"z",name:"עמית",cls:"ט3"}];
  assert.equal(D.findStudent(list,"עמית","c:ט:3",store()).id,"z");
  const s=store(); D.renameClass(s,"c:ט:3","קבוצת בוקר");
  assert.equal(D.findStudent([{id:"z",name:"עמית",cls:"קבוצת בוקר"}],"עמית","c:ט:3",s).id,"z","גם אחרי שינוי שם");
});

test("findStudent: שם ריק — null",()=>{
  assert.equal(D.findStudent(LIST(),"","c:ט:3",store()),null);
  assert.equal(D.findStudent(LIST(),null,"c:ט:3",store()),null);
});
