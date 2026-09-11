"use strict";
/* בטיחות אחסון — מקצה לקצה.
   הכשל המקורי היה שקט לגמרי, ולכן הבדיקה המרכזית כאן אינה «האם
   נשמר» אלא «האם המורה יודע שלא נשמר». */
const {check,eq,ok}=require("./harness.js");

const base={"ft.roster":{"ט3":[{id:"a",name:"דן אבירם",sex:"boys"}]},
  "ft.results":[],"ft.last":{grade:"ט",num:3,sort:"name"},"pf.guideSeen":true};

/* מחליף את localStorage.setItem בכזה שנכשל במכסה */
async function breakStorage(page){
  await page.evaluate(()=>{
    const real=localStorage.setItem.bind(localStorage);
    window.__real=real;
    localStorage.setItem=function(k,v){
      if(String(k).indexOf("pehub.")===0){
        const e=new Error("The quota has been exceeded.");
        e.name="QuotaExceededError"; e.code=22; throw e;
      }
      return real(k,v);
    };
  });
}

module.exports={title:"בטיחות אחסון",
  /* החבילה הזאת מביימת כשלי אחסון בכוונה, ולכן הדיווח עליהם
     בקונסול הוא הפלט הרצוי ולא תקלה. כל שגיאה אחרת עדיין מכשילה. */
  allow:/\[אחסון\]/,
  tests:[

  check("במצב תקין אין אזהרה והכתיבה מדווחת כהצלחה",base,async page=>{
    eq(await page.evaluate(()=>window.HM.LS.set("bt.age",15)),true,"הכתיבה החזירה הצלחה");
    eq(await page.evaluate(()=>window.HM.LS.get("bt.age",0)),15,"והערך חזר");
    const h=await page.evaluate(()=>window.HM.storage());
    eq(h.ok,true,"האחסון תקין");
    eq(h.backend,"localStorage");
    eq(await page.evaluate(()=>document.getElementById("stWarn").hidden),true,"אין אזהרה על המסך");
  }),

  check("מכסה שנגמרה: הכתיבה מחזירה false ולא מעמידה פנים",base,async page=>{
    await breakStorage(page);
    eq(await page.evaluate(()=>window.HM.LS.set("bt.age",15)),false,
      "הכתיבה חייבת לדווח על כישלון — זה בדיוק מה שלא קרה קודם");
    const h=await page.evaluate(()=>window.HM.storage());
    eq(h.ok,false,"בריאות האחסון סומנה כפגועה");
    eq(h.lastErr.code,"quota","הכשל סווג נכון");
  }),

  check("מכסה שנגמרה: מוצגת אזהרה קבועה עם מסלול הצלה",base,async page=>{
    await breakStorage(page);
    await page.evaluate(()=>window.HM.LS.set("ft.results",[1,2,3]));
    await page.waitForTimeout(200);
    const bar=await page.evaluate(()=>{
      const el=document.getElementById("stWarn");
      return {hidden:el.hidden,txt:el.textContent,
        save:!!document.getElementById("stWarnSave"),
        vis:getComputedStyle(el).display};
    });
    eq(bar.hidden,false,"האזהרה מוצגת");
    ok(bar.vis!=="none","והיא באמת נראית על המסך");
    ok(bar.txt.indexOf("מלא")>=0,"והיא אומרת מה קרה — התקבל: «"+bar.txt.trim()+"»");
    ok(bar.save,"ויש כפתור ייצוא גיבוי — מסלול ההצלה");
  }),

  check("מדידה שלא נשמרה מפילה אזהרה מתוך זרימת העבודה האמיתית",base,async page=>{
    await page.evaluate(()=>window.HM.go("ft")); await page.waitForTimeout(700);
    await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').click());
    await page.waitForTimeout(600);
    await breakStorage(page);
    await page.evaluate(()=>{
      const inp=document.querySelector("#ft-list [data-val]");
      inp.value="30"; inp.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await page.waitForTimeout(500);
    eq(await page.evaluate(()=>document.getElementById("stWarn").hidden),false,
      "המורה חייב לדעת שהמדידה לא נשמרה");
  }),

  check("נתון פגום באחסון: האפליקציה עולה ומדווחת",
    Object.assign({},base),async page=>{
    /* כותבים ידנית ערך שאינו JSON, כמו נתון שנחתך באמצע כתיבה */
    await page.evaluate(()=>localStorage.setItem("pehub.stu.list","{נחתך באמצע"));
    const v=await page.evaluate(()=>window.HM.LS.get("stu.list",[]));
    eq(v,[],"מוחזרת ברירת מחדל כדי שהמסך יעלה");
    const h=await page.evaluate(()=>window.HM.storage());
    eq(h.lastErr.code,"serialize","והכשל סווג כנתון פגום ולא נבלע");
  }),

  check("כישלון כתיבה לא הורס את הערך הקודם",base,async page=>{
    await page.evaluate(()=>window.HM.LS.set("bt.age",14));
    await breakStorage(page);
    await page.evaluate(()=>window.HM.LS.set("bt.age",99));
    await page.evaluate(()=>{ localStorage.setItem=window.__real; });
    eq(await page.evaluate(()=>window.HM.LS.get("bt.age",0)),14,"הערך הישן שרד");
  }),

  check("סגירת האזהרה לא משתיקה כשל חדש",base,async page=>{
    await breakStorage(page);
    await page.evaluate(()=>window.HM.LS.set("ft.results",[1]));
    await page.waitForTimeout(150);
    await page.evaluate(()=>document.getElementById("stWarnX").click());
    eq(await page.evaluate(()=>document.getElementById("stWarn").hidden),true,"נסגרה");
    await page.evaluate(()=>window.HM.LS.set("ft.results",[1,2]));
    await page.waitForTimeout(150);
    eq(await page.evaluate(()=>document.getElementById("stWarn").hidden),true,
      "אותו כשל חוזר לא מקפיץ שוב את מה שהמורה כבר סגר");
  })

]};
