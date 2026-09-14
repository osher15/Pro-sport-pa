"use strict";
/* ============================================================
   ניווט — שכל מסך נשאר בר-הגעה
   ------------------------------------------------------------
   קודם החלוקה הייתה בין ארבעה אריחים בבית לבין חלון «עוד», והיא
   הייתה שברירה בדרך אחת: מודול שקודם לבית ונמחק מהתפריט הפך
   לבלתי נגיש לחלוטין, בלי ששום דבר נשבר בקוד. זה קרה בפועל
   ל«ידע» — הוא עלה לבית כאריח 05, יצא מהתפריט, ואז האריח הוסר.

   עכשיו יש מגירה אחת (☰) שמחזיקה את **כל** המסכים, והבית מחזיק
   קיצורים בלבד. הבדיקות כאן שומרות על שני הצדדים: שהמגירה שלמה,
   ושהיא באמת נפתחת ומנווטת.
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

  check("המגירה מחזיקה את כל המסכים — לא רק את מה שלא נכנס לבית",seed,async page=>{
    const drawer=await page.evaluate(()=>
      [...document.querySelectorAll("#navDrawer [data-go]")].map(e=>e.dataset.go));
    ["ft","lesson","beep","photo","rec","stu","know","tools","nut","home"].forEach(m=>
      ok(drawer.indexOf(m)>=0,"«"+m+"» חסר מהמגירה — יש בה: "+drawer.join(",")));
  }),

  check("אריח שבבית קיים גם במגירה — קידום לבית אינו מוחק מסך",seed,async page=>{
    const r=await page.evaluate(()=>({
      home:[...document.querySelectorAll(".hx-mods .hx-mod[data-go]")].map(e=>e.dataset.go),
      drawer:[...document.querySelectorAll("#navDrawer [data-go]")].map(e=>e.dataset.go)
    }));
    ok(r.home.length,"יש אריחים בבית");
    r.home.forEach(m=>ok(r.drawer.indexOf(m)>=0,
      "«"+m+"» נמצא רק בבית — יום שבו האריח יוסר הוא ייעלם"));
  }),

  check("«ידע» נפתח בפועל מהמגירה",seed,async page=>{
    await page.evaluate(()=>document.getElementById("btnMenu").click());
    await page.waitForTimeout(300);
    ok(await page.evaluate(()=>document.getElementById("navDrawer").classList.contains("on")),
      "המגירה נפתחה");
    await page.evaluate(()=>document.querySelector('#navDrawer [data-go="know"]').click());
    await page.waitForTimeout(600);
    ok(await page.evaluate(()=>document.getElementById("view-know").classList.contains("on")),
      "ומסך הידע נפתח");
    eq(await page.evaluate(()=>document.getElementById("navDrawer").classList.contains("on")),false,
      "והמגירה נסגרה אחריה — לא נשארת פרושה מעל המסך החדש");
  }),

  check("«עוד» שבסרגל התחתון מוביל לאותה מגירה",seed,async page=>{
    await page.evaluate(()=>document.getElementById("navMore").click());
    await page.waitForTimeout(300);
    ok(await page.evaluate(()=>document.getElementById("navDrawer").classList.contains("on")),
      "שתי נקודות כניסה, תפריט אחד");
  })

]};
