"use strict";
/* מחולל המזהים.
   כל רשומה באפליקציה — מדידה, תלמיד, שיעור, משבצת, שיא — נושאת
   מזהה שנוצר כאן. שני מזהים זהים אינם תקלה שמתגלה: מחיקה של רשומה
   אחת מוחקת את שתיהן, ועריכה של אחת עורכת את השנייה, בשקט.

   הסכנה אינה תיאורטית דווקא במקומות שבהם רשומות נוצרות **בלולאה**:
   הדבקת רשימת כיתה, שליחת מקצה ביפ של שלושים תלמידים, וטעינת
   מערכת שעות של 47 משבצות. כולן באותה מילישנייה. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

test("עשרים אלף מזהים בלולאה אחת — כולם שונים",()=>{
  const n=20000, s=new Set();
  for(let i=0;i<n;i++)s.add(D.uid("f"));
  assert.equal(s.size,n,"התנגשות במחולל היא אובדן נתונים שקט");
});

test("התחילית נשמרת, כדי שאפשר יהיה לדעת מאיפה המזהה",()=>{
  ["f","s","ls","sl","r","pa","c"].forEach(p=>
    assert.ok(D.uid(p).indexOf(p)===0,"התחילית «"+p+"» אבדה"));
  assert.ok(D.uid().length>0,"בלי תחילית — עדיין מזהה");
});

test("אורך קבוע, כדי ששרשור לא ייצור שתי מחרוזות זהות",()=>{
  const a=D.uid("f"), b=D.uid("f");
  assert.equal(a.length,b.length);
  assert.notEqual(a,b);
});

test("מזהי שיעור ומשבצת עוברים דרך אותו מחולל",()=>{
  const n=5000, s=new Set();
  for(let i=0;i<n;i++){ s.add(D.newSessionId()); s.add(D.newSlotId()); }
  assert.equal(s.size,n*2);
  assert.ok(D.newSessionId().indexOf("ls")===0);
  assert.ok(D.newSlotId().indexOf("sl")===0);
});

test("מערכת שעות שלמה נטענת בלי שני מזהים זהים",()=>{
  /* התרחיש האמיתי: «טען מערכת לדוגמה» יוצר 47 משבצות בלולאה אחת */
  let l=[];
  D.sampleSlots().forEach(o=>{ const r=D.schedAdd(l,o); if(r.ok)l=r.list; });
  const ids=new Set(l.map(x=>x.id));
  assert.equal(ids.size,l.length,"משבצת כפולה — מחיקה אחת תמחק שתיים");
  assert.ok(l.length>40,"ובאמת נטענה מערכת שלמה: "+l.length);
});
