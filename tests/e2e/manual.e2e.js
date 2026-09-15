"use strict";
/* ============================================================
   פוטו־פיניש — מצב ידני
   ------------------------------------------------------------
   הזיהוי האוטומטי טוב כשהתנאים טובים. במגרש בית ספר לא תמיד יש
   את זה: שמש נעה, ילדים שעוברים מאחורי הקו, ענף ברוח. מורה שנלחם
   בחציות מדומות מעדיף שהמנוע פשוט ישתוק.

   המצב הזה אינו מנוע שני — הוא ברז על הקיים. הבדיקות כאן שומרות
   על שני הצדדים של זה: שכשהוא דלוק באמת לא נרשם כלום מעצמו,
   ושכשהוא כבוי המנוע עובד בדיוק כמו קודם. ועוד דבר אחד, שהוא
   הטעות היקרה כאן: שהמורה **רואה** באיזה מצב הוא נמצא — אחרת
   הוא יגלה בסוף המקצה שאין זמנים.
   ============================================================ */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const seed={"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION};
const openPf=async page=>{ await page.evaluate(()=>window.HM.go("photo")); await page.waitForTimeout(700); };
const toggle=async page=>{
  await page.evaluate(()=>document.getElementById("pf-manual").click());
  await page.waitForTimeout(250);
};
const times=page=>page.evaluate(()=>
  [...document.querySelectorAll("#pf-chips .pf-lanechip .tm")].map(e=>e.textContent.trim()));
/* מקצה סימולציה שלם: ספירה לאחור ואז רצים שנעים 4.5–8.8 שניות */
const fullRace=async page=>{
  await page.evaluate(()=>document.getElementById("pf-gun").click());
  await page.waitForTimeout(15000);
};

module.exports={title:"פוטו־פיניש — מצב ידני",tests:[

  /* ---------- הפקד והאינדיקציה ---------- */

  check("יש כפתור, והוא כבוי כברירת מחדל",seed,async page=>{
    await openPf(page);
    const r=await page.evaluate(()=>{
      const b=document.getElementById("pf-manual");
      return {txt:b?b.textContent.trim():null,pressed:b?b.getAttribute("aria-pressed"):null,
        note:document.getElementById("pf-manualNote").hidden,
        stage:document.getElementById("pf-stage").classList.contains("manual"),
        cb:document.getElementById("pf-autoDetect").disabled};
    });
    ok(r.txt&&/ידני/.test(r.txt),"הכיתוב אומר מה זה: "+r.txt);
    eq(r.pressed,"false");
    eq(r.note,true,"ההערה חבויה");
    eq(r.stage,false); eq(r.cb,false,"והזיהוי האוטומטי פעיל כרגיל");
  }),

  check("הדלקה מסמנת את עצמה בשלושה מקומות",seed,async page=>{
    await openPf(page);
    await toggle(page);
    const r=await page.evaluate(()=>({
      pressed:document.getElementById("pf-manual").getAttribute("aria-pressed"),
      note:document.getElementById("pf-manualNote").hidden,
      stage:document.getElementById("pf-stage").classList.contains("manual"),
      chips:document.getElementById("pf-chips").classList.contains("manual"),
      status:document.getElementById("pf-status").textContent.replace(/\s+/g," ")
    }));
    eq(r.pressed,"true");
    eq(r.note,false,"ההערה מתחת לפקד");
    eq(r.stage,true,"מסגרת הבמה");
    eq(r.chips,true,"והשבבים — מה שמקישים עליו");
    ok(/ידני/.test(r.status),"והשורה שעל הבמה: "+r.status);
  }),

  check("שני פקדים לא סותרים זה את זה — האוטומטי מושבת",seed,async page=>{
    await openPf(page);
    await toggle(page);
    const on=await page.evaluate(()=>({
      dis:document.getElementById("pf-autoDetect").disabled,
      dim:document.getElementById("pf-autoLbl").classList.contains("off")}));
    eq(on.dis,true); eq(on.dim,true,"וגם נראה מושבת");
    await toggle(page);
    const off=await page.evaluate(()=>({
      dis:document.getElementById("pf-autoDetect").disabled,
      dim:document.getElementById("pf-autoLbl").classList.contains("off"),
      stage:document.getElementById("pf-stage").classList.contains("manual")}));
    eq(off.dis,false,"וכיבוי מחזיר אותו");
    eq(off.dim,false); eq(off.stage,false);
  }),

  check("הבחירה נשמרת ברענון",seed,async page=>{
    await openPf(page);
    await toggle(page);
    eq(await page.evaluate(()=>window.HM.LS.get("pf.manual",false)),true,"נכתב לאחסון");
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForTimeout(1000);
    await openPf(page);
    const r=await page.evaluate(()=>({
      pressed:document.getElementById("pf-manual").getAttribute("aria-pressed"),
      stage:document.getElementById("pf-stage").classList.contains("manual")}));
    eq(r.pressed,"true","המצב חזר אחרי רענון");
    eq(r.stage,true);
  }),

  /* ---------- ההתנהגות ---------- */

  check("מצב ידני: מקצה שלם עובר ולא נרשם אף זמן מעצמו",seed,async page=>{
    await openPf(page);
    await toggle(page);
    await fullRace(page);
    const t=await times(page);
    eq(t.filter(x=>x!=="—").length,0,"שום מסלול לא נרשם: "+JSON.stringify(t));
    eq(await page.evaluate(()=>document.querySelectorAll("#pf-tbody tr").length),0,
      "והלוח ריק");
  }),

  check("מצב ידני: הקשה על מסלול כן רושמת",seed,async page=>{
    await openPf(page);
    await toggle(page);
    await page.evaluate(()=>document.getElementById("pf-gun").click());
    await page.waitForTimeout(4200);      /* אחרי הספירה לאחור */
    await page.evaluate(()=>document.querySelector("#pf-chips .pf-lanechip").click());
    await page.waitForTimeout(400);
    const t=await times(page);
    ok(t[0]&&t[0]!=="—","המסלול הראשון קיבל זמן: "+t[0]);
    eq(t.slice(1).filter(x=>x!=="—").length,0,"והשאר לא");
    const src=await page.evaluate(()=>
      (document.querySelector("#pf-tbody .pill")||{}).textContent||"");
    eq(src,"ידני","והמקור נרשם נכון");
  }),

  check("מצב ידני: מקשי 1–9 ממשיכים לעבוד",seed,async page=>{
    await openPf(page);
    await toggle(page);
    await page.evaluate(()=>document.getElementById("pf-gun").click());
    await page.waitForTimeout(4200);
    await page.keyboard.press("2");
    await page.waitForTimeout(400);
    const t=await times(page);
    eq(t[0],"—","מסלול 1 לא נגע");
    ok(t[1]&&t[1]!=="—","ומסלול 2 נרשם: "+t[1]);
  }),

  check("מצב רגיל: הזיהוי עובד בדיוק כמו קודם",seed,async page=>{
    await openPf(page);
    await fullRace(page);
    const t=await times(page);
    eq(t.filter(x=>x!=="—").length,t.length,
      "כל המסלולים נרשמו מעצמם: "+JSON.stringify(t));
    const src=await page.evaluate(()=>
      (document.querySelector("#pf-tbody .pill")||{}).textContent||"");
    eq(src,"סימולציה","דרך אותו מסלול קוד בדיוק");
  }),

  /* ---------- לוח תוצאות ריק ---------- */

  check("לוח ריק מציע להתחיל מקצה, לא רק מסביר שהוא ריק",seed,async page=>{
    await openPf(page);
    await page.evaluate(()=>document.querySelector('.pf-tabs [data-pt="results"]').click());
    await page.waitForTimeout(400);
    const r=await page.evaluate(()=>({
      empty:document.getElementById("pf-empty").style.display,
      btn:!!document.getElementById("pf-emptyStart")}));
    ok(r.empty!=="none","הלוח ריק");
    ok(r.btn,"ויש דרך אחת החוצה");
    await page.evaluate(()=>document.getElementById("pf-emptyStart").click());
    await page.waitForTimeout(900);
    const live=await page.evaluate(()=>
      getComputedStyle(document.getElementById("pf-sub-live")).display!=="none");
    ok(live,"וההקשה מחזירה למסך המקצה ומתחילה אותו");
  })

]};
