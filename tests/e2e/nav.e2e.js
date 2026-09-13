"use strict";
/* ============================================================
   ניווט — שכל מסך נשאר בר-הגעה
   ------------------------------------------------------------
   מסך הבית נושא ארבעה אריחים ממוספרים; כל השאר חי בתפריט «עוד».
   החלוקה הזאת שברירה בדרך אחת מסוימת: מודול שמקודם לבית ונמחק
   מהתפריט הופך לבלתי נגיש לחלוטין, בלי ששום דבר נשבר בקוד.

   זה קרה בפועל ל«ידע» — הוא עלה לבית כאריח 05 ויצא מהתפריט, ואז
   האריח הוסר. הבדיקה כאן קיימת כדי שהצירוף הזה לא יעבור בשקט שוב.
   ============================================================ */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const seed={"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION};
/* כל המודולים שמורה אמור להגיע אליהם */
const MODS=["ft","lesson","beep","photo","rec","stu","know","tools","nut","games","home"];

module.exports={title:"ניווט — נגישות המסכים",tests:[

  check("לכל מודול יש לפחות דרך אחת להגיע אליו",seed,async page=>{
    const reach=await page.evaluate(()=>{
      const got={};
      document.querySelectorAll("[data-go]").forEach(e=>{ got[e.dataset.go]=true; });
      return Object.keys(got).sort();
    });
    MODS.forEach(m=>ok(reach.indexOf(m)>=0,
      "אין שום דרך להגיע ל-«"+m+"» — נמצאו: "+reach.join(",")));
  }),

  check("הבית מציג ארבעה אריחים, ולא רשימה שמתארכת",seed,async page=>{
    const n=await page.evaluate(()=>({
      tiles:document.querySelectorAll(".hx-mods .hx-mod[data-go]").length,
      more:!!document.getElementById("hxMoreBtn")
    }));
    eq(n.tiles,4,"ארבעה אריחים — מה שלא נכנס הולך ל«עוד»");
    eq(n.more,true,"והכניסה ל«עוד» קיימת");
  }),

  check("מה שאינו בבית נמצא בתפריט «עוד»",seed,async page=>{
    const r=await page.evaluate(()=>{
      const home=[...document.querySelectorAll(".hx-mods .hx-mod[data-go]")].map(e=>e.dataset.go);
      const more=[...document.querySelectorAll("#moreModal [data-go]")].map(e=>e.dataset.go);
      return {home,more};
    });
    ["rec","stu","know","tools","nut"].forEach(m=>
      ok(r.more.indexOf(m)>=0,"«"+m+"» חסר מתפריט «עוד» — יש בו: "+r.more.join(",")));
    r.more.forEach(m=>ok(r.home.indexOf(m)<0,"«"+m+"» מופיע גם בבית וגם בתפריט — כפילות"));
  }),

  check("«ידע» נפתח בפועל מהתפריט",seed,async page=>{
    await page.evaluate(()=>document.getElementById("hxMoreBtn").click());
    await page.waitForTimeout(300);
    ok(await page.evaluate(()=>document.getElementById("moreModal").classList.contains("on")),
      "התפריט נפתח");
    await page.evaluate(()=>document.querySelector('#moreModal [data-go="know"]').click());
    await page.waitForTimeout(600);
    ok(await page.evaluate(()=>document.getElementById("view-know").classList.contains("on")),
      "ומסך הידע נפתח");
  })

]};
