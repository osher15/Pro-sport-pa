"use strict";
/* דף המידע (ℹ) — עזרה שנפתחת רק כשמבקשים אותה.
   הדרישה המרכזית: החלון לעולם אינו קופץ מעצמו, לא בכניסה הראשונה
   ולא אחריה. הוא נפתח בלחיצה, ועל הקטע של המסך שממנו לחצו. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const seed={"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION};
/* מכשיר חדש לגמרי — בלי שום מפתח, כדי לוודא שגם כאן שום דבר לא קופץ */
const fresh={};

const go=async(page,m)=>{ await page.evaluate(x=>window.HM.go(x),m); await page.waitForTimeout(500); };
const isOpen=page=>page.evaluate(()=>document.getElementById("infoModal").classList.contains("on"));
const openSec=page=>page.evaluate(()=>{
  const d=document.querySelector("#infoModal details[open]");
  return d?d.dataset.info:null;
});
const clickInfo=async page=>{
  await page.evaluate(()=>document.getElementById("btnInfo").click());
  await page.waitForTimeout(350);
};

module.exports={title:"שלב 14 — דף המידע",tests:[

  check("הכפתור קיים בסרגל העליון, והחלון סגור בכניסה",seed,async page=>{
    ok(await page.evaluate(()=>!!document.getElementById("btnInfo")),"כפתור ℹ קיים");
    eq(await isOpen(page),false,"דף המידע אינו קופץ מעצמו");
  }),

  check("גם במכשיר ריק לגמרי שום דבר לא קופץ",fresh,async page=>{
    eq(await isOpen(page),false,"מכשיר חדש — ובכל זאת בלי חלון שנפתח לבד");
  }),

  check("לחיצה על ℹ פותחת את דף המידע",seed,async page=>{
    await clickInfo(page);
    eq(await isOpen(page),true);
    ok(await page.evaluate(()=>document.querySelectorAll("#infoModal details").length>=10),
      "כל המסכים מיוצגים בדף");
  }),

  check("נפתח על הקטע של המסך שממנו לחצו",seed,async page=>{
    await go(page,"ft");
    await clickInfo(page);
    eq(await openSec(page),"ft","מי שלוחץ במבחני כושר מקבל את מבחני כושר");
    eq(await page.evaluate(()=>document.querySelectorAll("#infoModal details[open]").length),1,
      "קטע אחד פתוח — לא קיר טקסט");
  }),

  check("מסך אחר — קטע אחר",seed,async page=>{
    await go(page,"stu");
    await clickInfo(page);
    eq(await openSec(page),"stu");
    await page.evaluate(()=>document.querySelector('#infoModal [data-close="infoModal"]').click());
    await page.waitForTimeout(250);
    await go(page,"tools");
    await clickInfo(page);
    eq(await openSec(page),"tools","הקטע מתחלף יחד עם המסך");
  }),

  check("מסך בלי קטע משלו נופל אחורה לקטע הפתיחה, בלי לקרוס",seed,async page=>{
    await go(page,"home");
    await clickInfo(page);
    eq(await isOpen(page),true);
    eq(await openSec(page),"home");
  }),

  check("סגירה עובדת, והחלון לא חוזר מעצמו",seed,async page=>{
    await clickInfo(page);
    await page.evaluate(()=>document.querySelector('#infoModal [data-close="infoModal"]').click());
    await page.waitForTimeout(250);
    eq(await isOpen(page),false,"נסגר");
    await go(page,"beep");
    eq(await isOpen(page),false,"ומעבר בין מסכים לא מחזיר אותו");
  }),

  check("דף המידע אינו כותב דבר לאחסון",seed,async page=>{
    const before=await page.evaluate(()=>Object.keys(localStorage).sort().join(","));
    await clickInfo(page);
    await page.evaluate(()=>document.querySelector('#infoModal [data-close="infoModal"]').click());
    await page.waitForTimeout(250);
    const after=await page.evaluate(()=>Object.keys(localStorage).sort().join(","));
    eq(after,before,"אין מפתח «כבר ראית» — ולכן אין מה שיגרום לו לקפוץ פעם אחת ואז להיעלם");
  })

]};
