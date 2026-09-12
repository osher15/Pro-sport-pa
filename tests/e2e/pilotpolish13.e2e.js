"use strict";
/* שלב 13 — «מוכנות לפיילוט»: שני תיקוני UX ממוקדים, בלי שינוי
   אדריכלות זהות.
   1. מסך «שיעור» — בורר כיתה משלו, לשימוש חוזר ב-FT.pick (אותו
      בורר שביפ טסט ופוטו־פיניש כבר משתמשים בו), למורה שנכנס לכאן
      בלי לעבור קודם דרך «מבחני כושר».
   2. כפתור «מלא לפי נוכחות» — רמז טקסט גלוי תמיד (לא רק ב-hover),
      לצד ה-title הקיים. ההתנהגות עצמה (hm-data.js/attendanceRateOf,
      fillFromAttendance) לא השתנתה כלל — נבדקת במלואה כבר ב-
      attendgrade12.e2e.js. כאן נבדקת רק הנראות של הרמז. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const X="c:ט:1";
const withRoster=extra=>Object.assign({
  "ft.classes":{[X]:{id:X,name:"ט׳1",grade:"ט",num:1,key:"ט1"}},
  "ft.roster":{"ט1":[{id:"a",name:"דן אבירם",sex:"boys"},{id:"b",name:"רון לוי",sex:"boys"}]},
  "ft.results":[], "pf.guideSeen":true, "schema.version":D.SCHEMA_VERSION
},extra||{});

const openLesson=async page=>{ await page.evaluate(()=>window.HM.go("lesson")); await page.waitForTimeout(500); };
const genPlan=async page=>{
  await page.evaluate(()=>document.getElementById("ls-gen").click());
  await page.waitForTimeout(400);
};
const openGrades=async page=>{
  await page.evaluate(()=>window.HM.go("stu"));
  await page.waitForTimeout(500);
  await page.evaluate(()=>document.querySelector('.pf-tabs [data-st="grades"]').click());
  await page.waitForTimeout(400);
};

module.exports={title:"שלב 13 — מוכנות לפיילוט",tests:[

  /* ---------- 1. בורר כיתה במסך שיעור ---------- */

  check("מורה שנכנס ל«שיעור» בלי לבקר קודם ב«מבחני כושר»: הכפתור נעול, ובורר הכיתה מוצג",withRoster(),async page=>{
    await openLesson(page);
    await genPlan(page);
    const st=await page.evaluate(()=>({
      startTxt:document.getElementById("ls-startLesson").textContent,
      startDis:document.getElementById("ls-startLesson").disabled,
      pickHidden:document.getElementById("ls-pickCls").hidden
    }));
    ok(st.startTxt.indexOf("בחר כיתה קודם")>=0,"התקבל: "+st.startTxt);
    eq(st.startDis,true);
    eq(st.pickHidden,false,"כפתור בחירת הכיתה זמין מהמסך הזה");
  }),

  check("בחירת כיתה מהכפתור החדש מפעילה את זרימת השיעור הרגילה",withRoster(),async page=>{
    await openLesson(page);
    await genPlan(page);
    await page.evaluate(()=>document.getElementById("ls-pickCls").click());
    await page.waitForTimeout(400);
    ok(await page.evaluate(()=>getComputedStyle(document.getElementById("cp-pickModal")).display!=="none"),
      "נפתח בורר הכיתה המשותף (FT.pick) — לא בורר חדש");
    /* ברירת המחדל של הבורר היא ט/1 — בדיוק הכיתה שנרשמה, כך שכל
       תלמידיה כבר מסומנים ואפשר לטעון מיד */
    await page.evaluate(()=>document.getElementById("cp-load").click());
    await page.waitForTimeout(400);
    const st=await page.evaluate(()=>({
      startTxt:document.getElementById("ls-startLesson").textContent,
      startDis:document.getElementById("ls-startLesson").disabled,
      pickHidden:document.getElementById("ls-pickCls").hidden,
      last:window.HM.LS.get("ft.last",null)
    }));
    eq(st.pickHidden,true,"הכפתור נעלם אחרי שהכיתה נקבעה");
    eq(st.startDis,false);
    ok(st.startTxt.indexOf("ט׳1")>=0,"התקבל: "+st.startTxt);
    eq(st.last.grade,"ט"); eq(st.last.num,1);

    await page.evaluate(()=>document.getElementById("ls-startLesson").click());
    await page.waitForTimeout(400);
    const a=await page.evaluate(()=>window.HM.session.active());
    ok(a,"השיעור נפתח");
    eq(a.cid,X,"מזהה הכיתה היציב נקבע נכון מהבחירה במסך הזה");
    eq(a.clsSnapshot,"ט׳1");
  }),

  check("הנתיב הקיים — כיתה שכבר נבחרה במבחני כושר — ממשיך לעבוד בלי לגעת בכפתור החדש",
    withRoster({"ft.last":{grade:"ט",num:1,sort:"name"}}),async page=>{
    await openLesson(page);
    await genPlan(page);
    const st=await page.evaluate(()=>({
      startTxt:document.getElementById("ls-startLesson").textContent,
      startDis:document.getElementById("ls-startLesson").disabled,
      pickHidden:document.getElementById("ls-pickCls").hidden
    }));
    eq(st.pickHidden,true,"אין צורך בכפתור — ההקשר כבר קיים מ-ft.last");
    eq(st.startDis,false);
    ok(st.startTxt.indexOf("ט׳1")>=0,"התקבל: "+st.startTxt);
    await page.evaluate(()=>document.getElementById("ls-startLesson").click());
    await page.waitForTimeout(400);
    eq(await page.evaluate(()=>window.HM.session.active().cid),X);
  }),

  check("שינוי שם הכיתה אחרי בחירה מהמסך החדש לא משנה את מזהה השיעור",withRoster(),async page=>{
    await openLesson(page);
    await genPlan(page);
    await page.evaluate(()=>document.getElementById("ls-pickCls").click());
    await page.waitForTimeout(400);
    await page.evaluate(()=>document.getElementById("cp-load").click());
    await page.waitForTimeout(400);
    await page.evaluate(()=>document.getElementById("ls-startLesson").click());
    await page.waitForTimeout(400);

    await page.evaluate(()=>document.getElementById("btnSettings").click());
    await page.waitForTimeout(300);
    await page.evaluate(({cid,nm})=>{
      const s=document.getElementById("set-clsSel"); s.value=cid; s.dispatchEvent(new Event("change"));
      document.getElementById("set-clsNew").value=nm;
      document.getElementById("set-clsRename").click();
    },{cid:X,nm:"ט׳1 מדעים"});
    await page.waitForTimeout(500);

    const reg=await page.evaluate(()=>window.HM.LS.get("ft.classes",{}));
    eq(Object.keys(reg),[X]); eq(reg[X].name,"ט׳1 מדעים");
    const a=await page.evaluate(()=>window.HM.session.active());
    ok(a,"השיעור עדיין פתוח");
    eq(a.cid,X,"אותו מזהה יציב אחרי שינוי השם");
  }),

  /* ---------- 2. רמז גלוי לכפתור «מלא לפי נוכחות» ---------- */

  check("רמז גלוי מופיע לצד כפתור «מלא לפי נוכחות» בברירת המחדל",{"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION},async page=>{
    await openGrades(page);
    const h=await page.evaluate(()=>{
      const el=document.getElementById("gr-fillAttHint");
      return el?{text:el.textContent,vis:getComputedStyle(el).display}:null;
    });
    ok(h,"הרמז קיים ב-DOM");
    ok(h.vis!=="none","וגלוי בלי צורך ב-hover — עובד גם במגע");
    ok(h.text.indexOf("לא דורס")>=0,"מסביר שלא דורס ציון קיים — התקבל: "+h.text);
    ok(h.text.indexOf("לא ממציא")>=0||h.text.indexOf("בלי נתוני נוכחות")>=0,
      "מסביר שלא ממציא ציון בלי נתון — התקבל: "+h.text);
  }),

  check("הרמז נעלם יחד עם הכפתור כשמשקל ההשתתפות מאופס",{
    "pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION,
    "grades.weights":{part:0,exams:8,improve:11,team:11,know:0,bonusMax:10}
  },async page=>{
    await openGrades(page);
    const st=await page.evaluate(()=>({
      btn:getComputedStyle(document.getElementById("gr-fillAtt")).display,
      hint:getComputedStyle(document.getElementById("gr-fillAttHint")).display
    }));
    eq(st.btn,"none"); eq(st.hint,"none","הרמז לא נשאר תלוי באוויר בלי הכפתור");
  })

]};
