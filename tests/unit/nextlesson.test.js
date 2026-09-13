"use strict";
/* תוצאת שיעור והמשך מומלץ.
   ההמלצה היא כללים ולא מודל, ולכן היא ניתנת לבדיקה במלואה — וזו
   בדיוק הסיבה שהיא נבנתה ככה. הבדיקות כאן מגנות על שני דברים:
   שהיא לא ממציאה כשאין לה על מה להישען, ושהיא משנה כיוון כשהמורה
   אומר שמשהו לא עבד. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

let seq=0;
/* שרשרת שיעורים שהסתיימו, מהישן לחדש, עם נושא ודירוג */
function history(items,cid){
  let L=[];
  items.forEach(it=>{
    const c=D.createSession(L,{cid:cid||"c:ט:3",clsSnapshot:"ט׳3",
      date:"2026-09-"+String(10+(seq%20)).padStart(2,"0"),
      now:1757000000000+(++seq)*100000,planTitle:it.topic});
    L=c.list;
    L=D.completeSession(L,c.session.id,1757000000000+seq*100000+60000,
      {rating:it.rating,note:it.note}).list;
  });
  return L;
}

/* ============ תוצאת השיעור ============ */

test("סיום שיעור שומר דירוג והערה",()=>{
  const a=D.createSession([],{cid:"c:ט:3",date:"2026-09-12"});
  const r=D.completeSession(a.list,a.session.id,999,{rating:-1,note:"  התרגיל האחרון היה קשה  "});
  assert.equal(r.session.rating,-1);
  assert.equal(r.session.note,"התרגיל האחרון היה קשה","רווחים נחתכים");
  assert.equal(r.session.status,D.SESSION_DONE);
});

test("סיום בלי משוב נשאר סיום תקין",()=>{
  const a=D.createSession([],{cid:"c:ט:3",date:"2026-09-12"});
  const r=D.completeSession(a.list,a.session.id);
  assert.equal(r.ok,true);
  assert.equal(r.session.rating,null,"null ולא 0 — «לא סומן» אינו «בינוני»");
  assert.equal(r.session.note,"");
});

test("דירוג שאינו מהסולם נדחה לריק ולא נשמר כזבל",()=>{
  const a=D.createSession([],{cid:"c:ט:3",date:"2026-09-12"});
  ["טוב",5,-2,undefined,{}].forEach(v=>{
    const r=D.completeSession(a.list,a.session.id,1,{rating:v});
    assert.equal(r.session.rating,null,"rating="+String(v));
  });
});

test("הערה ארוכה נחתכת ולא מתפחת את האחסון",()=>{
  const a=D.createSession([],{cid:"c:ט:3",date:"2026-09-12"});
  const r=D.completeSession(a.list,a.session.id,1,{note:"א".repeat(5000)});
  assert.equal(r.session.note.length,600);
});

test("שיעור ישן בלי השדות החדשים אינו מפיל דבר",()=>{
  const old=[{id:"x",cid:"c:ט:3",date:"2026-09-01",status:D.SESSION_DONE,
    startedAt:1,endedAt:2,planTitle:"כדורסל"}];
  assert.equal(D.ratingOf(old[0]),null);
  assert.equal(D.nextLesson(old,{cid:"c:ט:3"}).ok,true,"המלצה עדיין נבנית");
});

/* ============ סולם ההתקדמות ============ */

test("בלי היסטוריה אין המלצה, ויש סיבה",()=>{
  const r=D.nextLesson([],{cid:"c:ט:3"});
  assert.equal(r.ok,false);
  assert.equal(r.reason,"no-history");
});

test("שיעור פתוח בלבד אינו היסטוריה",()=>{
  const a=D.createSession([],{cid:"c:ט:3",date:"2026-09-12",planTitle:"כדורסל"});
  assert.equal(D.nextLesson(a.list,{cid:"c:ט:3"}).reason,"no-history");
});

test("שיעור בלי נושא — אומרים זאת במפורש ולא ממציאים",()=>{
  const L=history([{topic:"",rating:1}]);
  const r=D.nextLesson(L,{cid:"c:ט:3"});
  assert.equal(r.ok,false);
  assert.equal(r.reason,"no-topic");
});

test("«עבד מצוין» מקדם שלב בסולם",()=>{
  const one=D.nextLesson(history([{topic:"כדורסל — מסירה",rating:1}]),{cid:"c:ט:3"});
  assert.equal(one.stage,1);
  assert.equal(one.topic,"כדורסל — מסירה");
  assert.equal(one.steps[0],D.LADDER[1]);
});

test("«לא עבד» מחזיר שלב אחורה",()=>{
  const L=history([{topic:"כדורסל",rating:1},{topic:"כדורסל",rating:1},
                   {topic:"כדורסל",rating:-1}]);
  const r=D.nextLesson(L,{cid:"c:ט:3"});
  assert.equal(r.stage,1,"עלה פעמיים, ירד פעם");
  assert.ok(r.why.join(" ").includes("לא עבד"),"הסיבה נאמרת למורה");
});

test("«בינוני» משאיר את השלב",()=>{
  const L=history([{topic:"כדורסל",rating:1},{topic:"כדורסל",rating:0}]);
  assert.equal(D.nextLesson(L,{cid:"c:ט:3"}).stage,1);
});

test("הסולם אינו יורד מתחת להתחלה ואינו עובר את הסוף",()=>{
  const down=history([{topic:"כדורסל",rating:-1},{topic:"כדורסל",rating:-1}]);
  assert.equal(D.nextLesson(down,{cid:"c:ט:3"}).stage,0);
  const up=history(Array.from({length:9},()=>({topic:"כדורסל",rating:1})));
  assert.equal(D.nextLesson(up,{cid:"c:ט:3"}).stage,D.LADDER.length-1);
});

test("נושא חדש מאפס את הרצף ואת הסולם",()=>{
  const L=history([{topic:"כדורסל",rating:1},{topic:"כדורסל",rating:1},
                   {topic:"כדורעף — מסירה",rating:1}]);
  const r=D.nextLesson(L,{cid:"c:ט:3"});
  assert.equal(r.topic,"כדורעף — מסירה");
  assert.equal(r.streak,1);
  assert.equal(r.stage,1,"רק השיעור החדש נספר");
});

test("שלושה שיעורים על אותו נושא — מציעים לשקול נושא חדש",()=>{
  const L=history([{topic:"כדורסל",rating:0},{topic:"כדורסל",rating:0},
                   {topic:"כדורסל",rating:0}]);
  const r=D.nextLesson(L,{cid:"c:ט:3"});
  assert.equal(r.streak,3);
  assert.ok(r.why.join(" ").includes("נושא חדש"));
});

test("ההמלצה מחזירה שלושה צעדים לכל היותר, מהסולם עצמו",()=>{
  const r=D.nextLesson(history([{topic:"כדורסל",rating:1}]),{cid:"c:ט:3"});
  assert.ok(r.steps.length>=1&&r.steps.length<=3);
  r.steps.forEach(s=>assert.ok(D.LADDER.includes(s),"צעד שאינו בסולם: "+s));
});

test("כל המלצה נושאת את הסיבות שלה",()=>{
  const r=D.nextLesson(history([{topic:"כדורסל",rating:1}]),{cid:"c:ט:3"});
  assert.ok(r.why.length>0,"בלי נימוק אי אפשר לבדוק המלצה");
});

test("ההערה של השיעור האחרון מוחזרת, כדי שההמלצה תופיע לצידה",()=>{
  const L=history([{topic:"כדורסל",rating:-1,note:"התרגיל האחרון היה קשה"}]);
  assert.equal(D.nextLesson(L,{cid:"c:ט:3"}).note,"התרגיל האחרון היה קשה");
});

test("ההמלצה של כיתה אחת אינה מושפעת מכיתה אחרת",()=>{
  let L=history([{topic:"כדורסל",rating:1}],"c:ט:3");
  L=history([{topic:"אתלטיקה",rating:-1}],"c:ח:1").concat(L);
  assert.equal(D.nextLesson(L,{cid:"c:ט:3"}).topic,"כדורסל");
  assert.equal(D.nextLesson(L,{cid:"c:ח:1"}).topic,"אתלטיקה");
});

/* ============ תזכורת מדידה ============ */

test("ארבעה שיעורים ללא מדידה — מזכירים",()=>{
  const L=history(Array.from({length:4},()=>({topic:"כדורסל",rating:0})));
  const r=D.nextLesson(L,{cid:"c:ט:3",rows:[]});
  assert.equal(r.measure,true);
  assert.ok(r.why.join(" ").includes("ללא מדידה"));
});

test("מדידה בשיעור האחרון מאפסת את התזכורת",()=>{
  const L=history(Array.from({length:5},()=>({topic:"כדורסל",rating:0})));
  const rows=[{sessionId:L[0].id,d:"2026-09-12",val:12,test:"run60"}];
  assert.equal(D.nextLesson(L,{cid:"c:ט:3",rows}).measure,false);
});

test("בלי שורות מדידה אין תזכורת שקרית",()=>{
  const L=history(Array.from({length:6},()=>({topic:"כדורסל",rating:0})));
  assert.equal(D.nextLesson(L,{cid:"c:ט:3"}).measure,false,
    "לא נמסרו מדידות — אין על מה להסתמך, ולכן לא מזכירים");
});

test("👎 בשלב הראשון אינו «בולע» את ה-👍 שאחריו",()=>{
  const L=history([{topic:"כדורסל",rating:-1},{topic:"כדורסל",rating:1}]);
  assert.equal(D.nextLesson(L,{cid:"c:ט:3"}).stage,1,
    "אין לאן לרדת מתחת לשלב הראשון, ולכן החיובי שאחריו מקדם");
});
