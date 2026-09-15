"use strict";
/* ============================================================
   רשימות הכיתה הן רשימת התלמידים
   ------------------------------------------------------------
   דווח מהשטח: מורה העלה רשימה לכל כיתה בנפרד — הדבר הסביר לעשות,
   כי בלי רשימה אי אפשר למדוד — ואז ראה «התלמידים שלי» עם 0,
   קבוצות הוראה שמדווחות «0 תלמידים», ומסך שלם שנראה לו מיותר.

   לא חסרו לו נתונים. שני מאגרים החזיקו את אותם ילדים בלי גשר
   ביניהם. הבדיקות כאן שומרות על הגשר ועל מה שהוא לא רשאי לעשות:
   לא להכפיל, לא לדרוס, ולא להמציא מין לתלמיד שאין לו.
   ============================================================ */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const CLS={
  "c:ט:3":{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"},
  "c:ט:4":{id:"c:ט:4",name:"ט׳4",grade:"ט",num:4,key:"ט4"}
};
const ROSTER={
  "ט3":[{id:"a",name:"אברהם אדם",sex:"boys"},{id:"b",name:"יפרח רותם"}],
  "ט4":[{id:"c",name:"שביט אורי",sex:"boys"},{id:"d",name:"סידי אופיר"},
        {id:"e",name:"בוקי יונתן"}]
};
/* מורה שהעלה רשימות כיתה ולא נגע ב«התלמידים שלי» — בדיוק המצב שדווח */
const seed={"ft.classes":CLS,"ft.roster":ROSTER,"ft.last":{grade:"ט",num:3},
  "pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION};

const stu=page=>page.evaluate(()=>window.HM.LS.get("stu.list",[]));
const openStu=async page=>{
  await page.evaluate(()=>window.HM.go("stu"));
  await page.waitForTimeout(700);
};

module.exports={title:"רשימות הכיתה כמקור לתלמידים",tests:[

  check("מכשיר עם רשימות כיתה ובלי «התלמידים שלי» מתיישר לבד",seed,async page=>{
    const list=await stu(page);
    eq(list.length,5,"חמישה תלמידים משתי הכיתות: "+JSON.stringify(list.map(s=>s.name)));
  }),

  check("כל תלמיד נכנס עם הכיתה והמזהה שלו — ההיסטוריה לא נקרעת",seed,async page=>{
    const list=await stu(page);
    const a=list.find(s=>s.id==="a"), c=list.find(s=>s.id==="c");
    ok(a,"מזהה הרשימה הוא מזהה התלמיד");
    eq(a.cid,"c:ט:3"); eq(a.cls,"ט׳3");
    eq(c.cid,"c:ט:4","והכיתה השנייה לא התערבבה בראשונה");
  }),

  check("מסך «התלמידים שלי» מציג אותם, לא אפס",seed,async page=>{
    await openStu(page);
    const r=await page.evaluate(()=>({
      count:document.getElementById("stu-count").textContent.trim(),
      rows:document.querySelectorAll("#stu-list .stu-row").length,
      empty:getComputedStyle(document.getElementById("stu-empty")).display
    }));
    eq(r.count,"5","המונה: "+r.count);
    eq(r.rows,5,"וגם הרשימה עצמה");
    eq(r.empty,"none","ומסך «אין עדיין תלמידים» ירד");
  }),

  check("קבוצת הוראה סופרת תלמידים אמיתיים — זה מה שהראה «0»",seed,async page=>{
    const n=await page.evaluate(()=>{
      const st={get:(k,d)=>window.HM.LS.get(k,d===undefined?null:d),
                set:(k,v)=>window.HM.LS.set(k,v)};
      const g=window.HMDATA.makeGroup(st,{name:"ט׳3 + ט׳4",members:["c:ט:3","c:ט:4"]});
      window.HM.openGroups();
      return {id:g.group.id};
    });
    await page.waitForTimeout(400);
    const txt=await page.evaluate(()=>document.getElementById("grp-list").textContent.replace(/\s+/g," "));
    ok(/5 תלמידים/.test(txt),"הקבוצה מדווחת חמישה: "+txt.slice(0,90));
    ok(!/· 0 תלמידים/.test(txt),"ולא אפס: "+txt.slice(0,90));
  }),

  check("הרצה חוזרת אינה מכפילה אף תלמיד",seed,async page=>{
    const r=await page.evaluate(()=>{
      window.HM.syncStudents(); window.HM.syncStudents();
      const again=window.HM.syncStudents();
      return {n:window.HM.LS.get("stu.list",[]).length,added:again.added};
    });
    eq(r.n,5);
    eq(r.added,0,"הגשר עובר על מי שכבר נמצא ולא מוסיף אותו שוב");
  }),

  check("תלמיד שכבר היה ב«התלמידים שלי» שומר על מה שיש עליו",
    Object.assign({},seed,{"stu.list":[{id:"a",name:"אברהם אדם",cls:"ט׳3",cid:"c:ט:3",
      sex:"boys",age:17,h:181,w:70,tests:[{d:"2026-01-01",dist:1180,vo2:44.2,zone:"אזור בריא"}]}]}),
    async page=>{
    const list=await stu(page);
    const a=list.find(s=>s.id==="a");
    eq(list.length,5,"ארבעה חדשים נוספו לאחד שהיה");
    eq(a.age,17,"הגיל לא נדרס");
    eq(a.h,181); eq(a.w,70);
    eq(a.tests.length,1,"וגם המבחן שלו נשאר");
  }),

  check("מין שלא נקבע ברשימה אינו הופך לבן",seed,async page=>{
    const list=await stu(page);
    eq(list.find(s=>s.id==="b").sex,null,
      "נורמות הכושר נפרדות לפי מין — המצאה כאן היא ציון שגוי");
    eq(list.find(s=>s.id==="a").sex,"boys","ומה שכן נקבע עובר כפי שהוא");
  }),

  check("הכפתור במסך הריק מביא אותם ואומר כמה",
    Object.assign({},seed,{"ft.roster":{}}),async page=>{
    await openStu(page);
    const before=await page.evaluate(()=>({
      empty:getComputedStyle(document.getElementById("stu-empty")).display,
      btn:!!document.getElementById("stu-fromRoster")
    }));
    eq(before.empty,"block","בלי רשימות המסך באמת ריק");
    ok(before.btn,"ויש בו כפתור שמסביר מאיפה תלמידים מגיעים");
    /* עכשיו מגיעות הרשימות — כמו מורה שהעלה אותן במבחני הכושר */
    await page.evaluate(r=>{ window.HM.LS.set("ft.roster",r);
      document.getElementById("stu-fromRoster").click(); },ROSTER);
    await page.waitForTimeout(600);
    const after=await page.evaluate(()=>({
      n:window.HM.LS.get("stu.list",[]).length,
      toast:(document.querySelector("#toast .t")||{}).textContent||""
    }));
    eq(after.n,5);
    ok(/5/.test(after.toast),"ואומר מה קרה: "+after.toast);
  }),

  check("מדידה של תלמיד נשארת של הכיתה שלו",seed,async page=>{
    await page.evaluate(()=>window.HM.go("ft"));
    await page.waitForTimeout(700);
    await page.evaluate(()=>document.querySelector('[data-t="push"]').click());
    await page.waitForTimeout(450);
    await page.evaluate(()=>{
      const i=document.querySelector('#ft-list [data-cnt]');
      i.focus(); i.value="30"; i.dispatchEvent(new Event("change"));
    });
    await page.waitForTimeout(500);
    const rs=await page.evaluate(()=>window.HM.LS.get("ft.results",[]));
    eq(rs.length,1);
    eq(rs[0].cid,"c:ט:3","המדידה של הכיתה, לא של «התלמידים שלי»");
    ok(rs[0].sid,"ועם מזהה תלמיד — אותו מזהה שבשתי הרשימות");
  })

]};
