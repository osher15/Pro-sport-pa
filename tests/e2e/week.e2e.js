"use strict";
/* ============================================================
   טבלת מערכת השעות
   ------------------------------------------------------------
   הגרסה הראשונה ביקשה שיעור אחד בכל פעם. מורה עם עשרים וארבעה
   שיעורים בשבוע נוטש בחמישי — וזה לא באג בטופס אלא בצורה שלו:
   המערכת כבר קיימת אצלו כטבלה של שעות מול ימים, וכל דבר שאינו
   הטבלה הזאת מחייב אותו לתרגם אותה תוך כדי הזנה.

   הבדיקות כאן מגנות על שלושה דברים: שהטבלה מציגה את השבוע כפי
   שהוא, שהקשה על תא באמת ממלאת את היום והשעה במקום המורה, ושמה
   שאינו שיעור — פרטני, שהייה, ישיבה — נשמר כהקשר ולא מתחזה
   לשיעור שאפשר לפתוח ולמדוד בו.
   ============================================================ */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const base={"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION};
const DAY=()=>D.dayOfISO(new Date().toISOString().slice(0,10));
const openGrid=async page=>{
  await page.evaluate(()=>window.HM.openSched());
  await page.waitForTimeout(300);
};
const cells=page=>page.evaluate(()=>document.querySelectorAll("#sw-grid [data-cell]").length);

module.exports={title:"טבלת מערכת השעות",tests:[

  check("הטבלה היא שעות מול ימים, כמו המערכת שהמורה מכיר",base,async page=>{
    await openGrid(page);
    const r=await page.evaluate(()=>({
      rows:document.querySelectorAll("#sw-grid tbody tr").length,
      days:document.querySelectorAll("#sw-grid thead th").length-1,
      first:document.querySelector("#sw-grid tbody th.hh").textContent.replace(/\s+/g," ").trim()
    }));
    eq(r.rows,D.BELLS.length,"שורה לכל שיעור בלוח הצלצולים");
    eq(r.days,6,"ימים א׳–ו׳");
    ok(/08:10/.test(r.first),"ולכל שורה השעה שלה: "+r.first);
  }),

  check("כל תא ניתן להקשה, ואין מקום ריק שאי אפשר למלא",base,async page=>{
    await openGrid(page);
    eq(await cells(page),D.BELLS.length*6,"60 תאים — כל השבוע פתוח להזנה");
  }),

  check("הקשה על תא ממלאת את היום והשעה במקום המורה",base,async page=>{
    await openGrid(page);
    await page.evaluate(()=>document.querySelector('[data-cell="2|4"]').click());
    await page.waitForTimeout(250);
    const r=await page.evaluate(()=>({
      open:!document.getElementById("sw-edit").hidden,
      title:document.getElementById("sw-editTitle").textContent,
      day:document.getElementById("sw-day").value,
      time:document.getElementById("sw-time").value
    }));
    eq(r.open,true,"העורך נפתח");
    eq(r.day,"2","יום שלישי");
    eq(r.time,"10:50","השעה של שיעור 4 מלוח הצלצולים");
    ok(/שלישי/.test(r.title)&&/10:50/.test(r.title),r.title);
  }),

  check("מה שנוסף בתא מופיע בתא",base,async page=>{
    await openGrid(page);
    await page.evaluate(()=>{
      document.querySelector('[data-cell="1|3"]').click();
      document.getElementById("sw-grade").value="ח";
      document.getElementById("sw-num").value="1";
      document.getElementById("sw-add").click();
    });
    await page.waitForTimeout(350);
    const txt=await page.evaluate(()=>document.querySelector('[data-cell="1|3"]').textContent);
    ok(/ח׳1/.test(txt),"התא מציג את הכיתה: "+txt.trim());
    eq(await page.evaluate(()=>window.HM.sched.list()[0].time),"09:45","בשעה של שיעור 3");
  }),

  check("שתי כיתות שמלמדים יחד יושבות באותו תא",base,async page=>{
    await openGrid(page);
    await page.evaluate(()=>{
      document.querySelector('[data-cell="0|1"]').click();
      ["1","3"].forEach(n=>{
        document.getElementById("sw-grade").value="ז";
        document.getElementById("sw-num").value=n;
        document.getElementById("sw-add").click();
      });
    });
    await page.waitForTimeout(350);
    const r=await page.evaluate(()=>({
      chips:document.querySelectorAll('[data-cell="0|1"] .ch').length,
      n:window.HM.sched.list().length
    }));
    eq(r.chips,2,"שתי תוויות בתא אחד");
    eq(r.n,2,"ושתי משבצות בנתונים — המודל נשאר «כיתה אחת למשבצת»");
  }),

  /* ---------- סוגי משבצת ---------- */

  check("בורר הסוג מציג את כל האפשרויות",base,async page=>{
    await openGrid(page);
    const k=await page.evaluate(()=>[...document.querySelectorAll("#sw-kind button")]
      .map(b=>b.dataset.k));
    eq(k,["pe","prat","stay","other"],"פרונטלי · פרטני · שהייה · אחר");
  }),

  check("בחירת «שהייה» מחליפה את בורר הכיתה בשדה תיאור",base,async page=>{
    await openGrid(page);
    await page.evaluate(()=>{
      document.querySelector('[data-cell="0|1"]').click();
      document.querySelector('#sw-kind [data-k="stay"]').click();
    });
    await page.waitForTimeout(250);
    const vis=await page.evaluate(()=>({
      cls:getComputedStyle(document.getElementById("sw-clsRow")).display!=="none",
      lab:getComputedStyle(document.getElementById("sw-labelRow")).display!=="none"
    }));
    eq(vis.cls,false,"אין כיתה בשהייה");
    eq(vis.lab,true,"ויש תיאור");
  }),

  check("שהייה נשמרת בלי כיתה ואינה מתחזה לשיעור",base,async page=>{
    await openGrid(page);
    await page.evaluate(d=>{
      document.querySelector('[data-cell="'+d+'|2"]').click();
      document.querySelector('#sw-kind [data-k="stay"]').click();
      document.getElementById("sw-label").value="שהייה";
      document.getElementById("sw-add").click();
    },DAY());
    await page.waitForTimeout(400);
    const sl=await page.evaluate(()=>window.HM.sched.list()[0]);
    eq(sl.kind,"stay");
    eq(sl.cid,null,"בלי מזהה כיתה מזויף");
    const row=await page.evaluate(()=>document.querySelector("#hx-todayList .hx-slot").textContent
      .replace(/\s+/g," ").trim());
    ok(/שהייה/.test(row),"מופיעה ביום: "+row);
    eq(await page.evaluate(()=>document.querySelectorAll("#hx-todayList [data-slot]").length),0,
      "אבל אין מה להתחיל בה");
  }),

  check("פרטני מופיע ביום כהקשר, בלי כפתור התחלה",base,async page=>{
    await openGrid(page);
    await page.evaluate(d=>{
      document.querySelector('[data-cell="'+d+'|1"]').click();
      document.querySelector('#sw-kind [data-k="prat"]').click();
      document.getElementById("sw-label").value="פרטני אופק";
      document.getElementById("sw-add").click();
    },DAY());
    await page.waitForTimeout(400);
    const r=await page.evaluate(()=>({
      txt:document.getElementById("hx-todayList").textContent.replace(/\s+/g," "),
      starts:document.querySelectorAll("#hx-todayList [data-slot]").length,
      ctx:document.querySelectorAll("#hx-todayList .hx-slot.ctx").length
    }));
    ok(/פרטני אופק/.test(r.txt),r.txt.slice(0,80));
    eq(r.starts,0);
    eq(r.ctx,1,"שורת הקשר, לא שיעור");
  }),

  /* ---------- המערכת לדוגמה ---------- */

  check("«טען מערכת לדוגמה» ממלא שבוע שלם בלחיצה",base,async page=>{
    await openGrid(page);
    await page.evaluate(()=>document.getElementById("sw-sample").click());
    await page.waitForTimeout(700);
    const n=await page.evaluate(()=>window.HM.sched.list().length);
    ok(n>40,"שבוע מלא: "+n+" משבצות");
    const filled=await page.evaluate(()=>
      [...document.querySelectorAll("#sw-grid [data-cell]")].filter(c=>!c.classList.contains("empty")).length);
    ok(filled>30,"והטבלה מלאה: "+filled+" תאים");
  }),

  check("הדוגמה רושמת את הכיתות, ולכן השמות מוצגים ולא מזהים",base,async page=>{
    await openGrid(page);
    await page.evaluate(()=>document.getElementById("sw-sample").click());
    await page.waitForTimeout(700);
    const txt=await page.evaluate(()=>document.getElementById("sw-grid").textContent);
    /* «י״ב1» ולא «יב׳1» — התווית נבנית ב-clsName, וזו הצורה שלה */
    ok(/ז׳1/.test(txt)&&/י״ב1/.test(txt),"שמות כיתות אמיתיים בטבלה");
    ok(!/c:/.test(txt),"ולא מזהים פנימיים");
  }),

  check("הדוגמה מגיעה גם לדף הבית",base,async page=>{
    await openGrid(page);
    await page.evaluate(()=>{
      document.getElementById("sw-sample").click();
      window.HM.modal("schedModal",false);
    });
    await page.waitForTimeout(700);
    const n=await page.evaluate(()=>document.querySelectorAll("#hx-todayList .hx-slot").length);
    ok(n>0,"היום מלא: "+n+" שורות");
  }),

  check("«נקה הכול» מרוקן את המערכת ולא נוגע בתלמידים",
    Object.assign({},base,{"stu.list":[{id:"a",name:"דן אבירם",cls:"ז׳2",cid:"c:ז:2"}]}),
    async page=>{
    await openGrid(page);
    await page.evaluate(()=>document.getElementById("sw-sample").click());
    await page.waitForTimeout(700);
    ok(await page.evaluate(()=>window.HM.sched.list().length>0),"יש מה לנקות");
    await page.evaluate(()=>document.getElementById("sw-clear").click());
    await page.waitForTimeout(400);
    eq(await page.evaluate(()=>window.HM.sched.list().length),0);
    eq(await page.evaluate(()=>window.HM.LS.get("stu.list",[]).length),1,
      "התלמידים לא נגעו — ניקוי מערכת שעות אינו ניקוי נתונים");
  }),

  check("המערכת שנטענה שורדת רענון",base,async page=>{
    await openGrid(page);
    await page.evaluate(()=>document.getElementById("sw-sample").click());
    await page.waitForTimeout(700);
    const before=await page.evaluate(()=>window.HM.sched.list().length);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForTimeout(900);
    eq(await page.evaluate(()=>window.HM.sched.list().length),before);
  })

]};
