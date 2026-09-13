"use strict";
/* קבוצת הוראה.
   המודל עד כה הניח שמה שמלמדים הוא כיתה. בשדה זה לא נכון: מורים
   מחברים שתי כיתות לשיעור אחד, ולפעמים בונים קבוצת למידה מתלמידים
   שמגיעים מכמה כיתות.

   הקו שהבדיקות כאן שומרות עליו הוא אחד: **הקבוצה היא הקשר הוראה,
   לא כיתה חדשה.** התלמיד נשאר בכיתה שלו, המדידה נושאת את הכיתה
   האמיתית, ורק השיעור והמשבצת נושאים את מזהה הקבוצה. ברגע שהקו
   הזה יישבר, היסטוריית התלמיד תיקרע לשניים בשקט. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

function mkStore(){
  const mem={};
  return {get:(k,d)=>mem[k]===undefined?(d===undefined?null:d):mem[k],
          set:(k,v)=>{mem[k]=v;}, _mem:mem};
}
function withClasses(){
  const st=mkStore();
  ["ז׳1","ז׳3","ח׳1"].forEach(c=>D.registerClass(st,c));
  return st;
}
const STU=[
  {id:"a",name:"דן אבירם",cls:"ז׳1",cid:"c:ז:1"},
  {id:"b",name:"רון לוי",cls:"ז׳3",cid:"c:ז:3"},
  {id:"c",name:"עדי כהן",cls:"ח׳1",cid:"c:ח:1"},
  {id:"d",name:"נועה שרון",cls:"ח׳1",cid:"c:ח:1"}
];
const grp=(st,o)=>D.makeGroup(st,Object.assign({name:"ז׳1+ז׳3",members:["c:ז:1","c:ז:3"]},o||{}));

/* ============ יצירה ============ */

test("קבוצה נוצרת עם שם וחברים, ונרשמת עם אותו רישום של הכיתות",()=>{
  const st=withClasses();
  const r=grp(st);
  assert.equal(r.ok,true);
  assert.equal(r.outcome,"created");
  assert.equal(D.isGroupId(r.group.id),true,"מזהה קבוצה מובחן: "+r.group.id);
  assert.equal(r.group.kind,"group");
  assert.deepEqual(r.group.members,["c:ז:1","c:ז:3"]);
  assert.ok(D.classOf(st,r.group.id),"נמצאת ברישום — ולכן כל מסך שמציג שם כיתה יציג גם אותה");
});

test("מזהה הקבוצה נגזר מהתוכן — אותה הגדרה, אותו מזהה",()=>{
  const a=D.groupId("ז׳1+ז׳3",["c:ז:1","c:ז:3"],[]);
  const b=D.groupId("ז׳1+ז׳3",["c:ז:3","c:ז:1"],[]);
  assert.equal(a,b,"סדר החברים אינו משנה");
  assert.notEqual(a,D.groupId("ז׳1+ח׳1",["c:ז:1","c:ח:1"],[]));
});

test("יצירה חוזרת אינה יוצרת קבוצה שנייה",()=>{
  const st=withClasses();
  const one=grp(st);
  const two=grp(st);
  assert.equal(two.outcome,"exists");
  assert.equal(two.group.id,one.group.id);
  assert.equal(D.listGroups(st).length,1);
});

test("קבוצה בלי שם, בלי חברים, או בשם של כיתה — נדחית בשם",()=>{
  const st=withClasses();
  assert.equal(D.makeGroup(st,{name:"",members:["c:ז:1"]}).outcome,"no-name");
  assert.equal(D.makeGroup(st,{name:"קבוצה",members:[],sids:[]}).outcome,"empty");
  assert.equal(D.makeGroup(st,{name:"ז׳2",members:["c:ז:1"]}).outcome,"name-is-class",
    "שם שנקרא ככיתה היה מסתיר את הכיתה עצמה");
  assert.equal(D.listGroups(st).length,0,"ואף אחת מהן לא נרשמה");
});

test("שם תפוס בידי קבוצה אחרת נדחה",()=>{
  const st=withClasses();
  grp(st);
  const r=D.makeGroup(st,{name:"ז׳1+ז׳3",members:["c:ח:1"]});
  assert.equal(r.outcome,"name-taken");
});

test("אין קבוצה בתוך קבוצה",()=>{
  const st=withClasses();
  const g=grp(st).group;
  const r=D.makeGroup(st,{name:"קבוצה גדולה",members:[g.id,"c:ח:1"]});
  assert.deepEqual(r.group.members,["c:ח:1"],"מזהה הקבוצה סונן החוצה");
});

test("חבר כפול נספר פעם אחת",()=>{
  const st=withClasses();
  const r=D.makeGroup(st,{name:"קבוצה",members:["c:ז:1","c:ז:1","c:ז:3"]});
  assert.deepEqual(r.group.members,["c:ז:1","c:ז:3"]);
});

/* ============ הקו האדום: זהות התלמיד ============ */

test("תלמיד נשאר בכיתה שלו — cidOfStudent לעולם לא מחזיר קבוצה",()=>{
  const st=withClasses();
  const g=grp(st).group;
  STU.forEach(s=>{
    const cid=D.cidOfStudent(s,st);
    assert.notEqual(cid,g.id,"התלמיד "+s.name+" נשאב לקבוצה");
    assert.equal(D.isGroupId(cid),false);
  });
});

test("הקבוצה אינה מופיעה ברשימת הכיתות האמיתיות",()=>{
  const st=withClasses();
  grp(st);
  assert.deepEqual(Object.keys(D.realClasses(st)).sort(),
    ["c:ז:1","c:ז:3","c:ח:1"].sort());
  assert.equal(Object.keys(D.classes(st)).length,4,"אבל היא כן ברישום המלא");
});

/* ============ הרחבה ============ */

test("כיתה מתרחבת לעצמה, קבוצה לחבריה",()=>{
  const st=withClasses();
  const g=grp(st).group;
  assert.deepEqual(D.expandCid(st,"c:ז:1"),["c:ז:1"]);
  assert.deepEqual(D.expandCid(st,g.id),["c:ז:1","c:ז:3"]);
  assert.deepEqual(D.expandCid(st,null),[]);
  assert.deepEqual(D.expandCid(st,"g:no-such"),["g:no-such"],
    "מזהה שאינו רשום מוחזר כמות שהוא ולא מתפוצץ");
});

test("מדידה של כל אחד מחברי הקבוצה שייכת לה",()=>{
  const st=withClasses();
  const g=grp(st).group;
  assert.equal(D.rowInScope({sid:"a",cid:"c:ז:1"},st,g.id),true);
  assert.equal(D.rowInScope({sid:"b",cid:"c:ז:3"},st,g.id),true);
  assert.equal(D.rowInScope({sid:"c",cid:"c:ח:1"},st,g.id),false,"כיתה שאינה בקבוצה");
});

test("על כיתה רגילה rowInScope מתנהג בדיוק כמו rowInClass",()=>{
  const st=withClasses();
  const r={sid:"a",cid:"c:ז:1"};
  assert.equal(D.rowInScope(r,st,"c:ז:1"),D.rowInClass(r,"c:ז:1"));
  assert.equal(D.rowInScope(r,st,"c:ח:1"),D.rowInClass(r,"c:ח:1"));
});

test("מדידה ישנה בלי cid נמצאת דרך תווית הכיתה שעליה",()=>{
  const st=withClasses();
  const g=grp(st).group;
  assert.equal(D.rowInScope({name:"דן",cls:"ז׳3"},st,g.id),true);
});

/* ============ קבוצת למידה מתלמידים ============ */

test("קבוצה יכולה להיבנות מתלמידים בודדים משתי כיתות",()=>{
  const st=withClasses();
  const r=D.makeGroup(st,{name:"נבחרת אתלטיקה",sids:["a","c"]});
  assert.equal(r.ok,true);
  assert.deepEqual(r.group.members,[]);
  const list=D.studentsIn(st,r.group.id,STU).map(s=>s.name);
  assert.deepEqual(list,["דן אבירם","עדי כהן"],"אחד מז׳1 ואחד מח׳1");
});

test("מדידה של תלמיד שצורף אישית שייכת לקבוצה",()=>{
  const st=withClasses();
  const g=D.makeGroup(st,{name:"נבחרת",sids:["c"]}).group;
  assert.equal(D.rowInScope({sid:"c",cid:"c:ח:1"},st,g.id),true);
  assert.equal(D.rowInScope({sid:"d",cid:"c:ח:1"},st,g.id),false,
    "חבר אחר באותה כיתה אינו בקבוצה");
});

test("קבוצה מעורבת — כיתה שלמה ועוד תלמידים",()=>{
  const st=withClasses();
  const g=D.makeGroup(st,{name:"מעורבת",members:["c:ז:1"],sids:["c"]}).group;
  assert.deepEqual(D.studentsIn(st,g.id,STU).map(s=>s.id),["a","c"]);
  assert.ok(/ז׳1/.test(D.groupSummary(st,g.id)));
  assert.ok(/\+1/.test(D.groupSummary(st,g.id)),"והתלמידים הבודדים נספרים");
});

test("תלמיד שנמצא גם בכיתה וגם ברשימה האישית נספר פעם אחת",()=>{
  const st=withClasses();
  const g=D.makeGroup(st,{name:"מעורבת",members:["c:ז:1"],sids:["a"]}).group;
  assert.deepEqual(D.studentsIn(st,g.id,STU).map(s=>s.id),["a"]);
});

test("studentsIn על כיתה רגילה מחזיר את תלמידיה",()=>{
  const st=withClasses();
  assert.deepEqual(D.studentsIn(st,"c:ח:1",STU).map(s=>s.id),["c","d"]);
});

/* ============ עדכון ומחיקה ============ */

test("שינוי שם קבוצה אינו משנה את המזהה",()=>{
  const st=withClasses();
  const g=grp(st).group;
  const r=D.updateGroup(st,g.id,{name:"שכבת ז׳ — קבוצה א"});
  assert.equal(r.ok,true);
  assert.equal(r.group.id,g.id,"המזהה הוא הזהות; השם הוא תצוגה");
  assert.equal(D.classOf(st,g.id).name,"שכבת ז׳ — קבוצה א");
});

test("אפשר להוסיף ולהסיר כיתות מקבוצה",()=>{
  const st=withClasses();
  const g=grp(st).group;
  D.updateGroup(st,g.id,{members:["c:ז:1","c:ז:3","c:ח:1"]});
  assert.equal(D.expandCid(st,g.id).length,3);
  D.updateGroup(st,g.id,{members:["c:ז:1"]});
  assert.deepEqual(D.expandCid(st,g.id),["c:ז:1"]);
});

test("קבוצה לא יכולה להתרוקן לגמרי",()=>{
  const st=withClasses();
  const g=grp(st).group;
  assert.equal(D.updateGroup(st,g.id,{members:[],sids:[]}).outcome,"empty");
});

test("עדכון קבוצה שאינה קיימת נדחה, ולא יוצר אותה",()=>{
  const st=withClasses();
  assert.equal(D.updateGroup(st,"g:nope",{name:"x"}).outcome,"no-such-group");
  assert.equal(D.listGroups(st).length,0);
});

test("מחיקת קבוצה אינה נוגעת בכיתות, בתלמידים או במדידות",()=>{
  const st=withClasses();
  const g=grp(st).group;
  const rows=[{sid:"a",cid:"c:ז:1",test:"run60",val:9.2}];
  assert.equal(D.removeGroup(st,g.id).ok,true);
  assert.equal(D.groupOf(st,g.id),null);
  assert.deepEqual(Object.keys(D.realClasses(st)).sort(),["c:ז:1","c:ז:3","c:ח:1"].sort());
  assert.equal(D.cidOfStudent(STU[0],st),"c:ז:1");
  assert.equal(D.rowInClass(rows[0],"c:ז:1"),true,"המדידה נשארה בכיתה שלה");
});

test("מחיקה של מה שאינו קבוצה נדחית — כיתה לא נמחקת דרך כאן",()=>{
  const st=withClasses();
  assert.equal(D.removeGroup(st,"c:ז:1").outcome,"no-such-group");
  assert.ok(D.classOf(st,"c:ז:1"),"הכיתה עדיין שם");
});

/* ============ שיעור על קבוצה ============ */

test("שיעור נפתח על קבוצה בדיוק כמו על כיתה",()=>{
  const st=withClasses();
  const g=grp(st).group;
  const r=D.createSession([],{cid:g.id,clsSnapshot:g.name,date:"2026-09-13"});
  assert.equal(r.ok,true);
  assert.equal(r.session.cid,g.id);
  assert.equal(D.listSessions(r.list,{cid:g.id}).length,1);
  assert.equal(D.listSessions(r.list,{cid:"c:ז:1"}).length,0,
    "שיעור של הקבוצה אינו שיעור של כיתה בודדת — אחרת היו שתי תשובות");
});

test("משבצת במערכת השעות יכולה לשאת קבוצה",()=>{
  const st=withClasses();
  const g=grp(st).group;
  const r=D.schedAdd([],{day:0,time:"09:00",cid:g.id,clsSnapshot:g.name});
  assert.equal(r.outcome,"added");
  assert.equal(D.startable(r.slot),true,"וניתן לפתוח ממנה שיעור");
});

test("תיאור קבוצת למידה אינו נקרא כשארית של משהו",()=>{
  const st=withClasses();
  const g=D.makeGroup(st,{name:"נבחרת",sids:["a","c"]}).group;
  const txt=D.groupSummary(st,g.id);
  assert.ok(!/^\+/.test(txt),"«+2 תלמידים» בלי כיתה לפניו: "+txt);
  assert.ok(/2 תלמידים/.test(txt),txt);
  const mix=D.makeGroup(st,{name:"מעורבת",members:["c:ז:1"],sids:["c"]}).group;
  assert.ok(/ז׳1 · \+1/.test(D.groupSummary(st,mix.id)),D.groupSummary(st,mix.id));
});
