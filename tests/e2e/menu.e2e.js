"use strict";
/* ============================================================
   מסך ראשון קצר, ותפריט אחד שבו הכול
   ------------------------------------------------------------
   מורה פותח את האפליקציה בשער בית הספר, ומה שהוא צריך לראות הוא
   שלושה דברים: מה קורה עכשיו, ושתי הפעולות שהוא עושה בכל שיעור.
   כל השאר — מסכים שנכנסים אליהם פעם בשבוע — שייך לתפריט, כמו
   במערכות בית הספר שהוא כבר מכיר.

   הבדיקות כאן מגנות על שני הצדדים של ההחלטה הזאת: שהבית באמת
   קצר, ושהקיצור לא הפך שום מסך לבלתי נגיש. בנוסף — שהמגירה
   נצמדת לצד הנכון ונפתחת לכל הגובה, כי מגירה שנפתחת כחלון קטן
   באמצע המסך היא בדיוק מה שרצינו להחליף.
   ============================================================ */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const seed={"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION};
const ftSeed={
  "ft.classes":{"c:ט:3":{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"}},
  "ft.roster":{"ט3":[{id:"a",name:"דן אבירם",sex:"boys"}]},
  "ft.last":{grade:"ט",num:3},"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION
};
const open=async page=>{
  await page.evaluate(()=>document.getElementById("btnMenu").click());
  await page.waitForTimeout(320);
};
const openFt=async page=>{
  await page.evaluate(()=>window.HM.go("ft"));
  await page.waitForTimeout(700);
};

module.exports={title:"התפריט הראשי ודף הבית הקצר",tests:[

  /* ---------- המגירה ---------- */

  check("כפתור ☰ נמצא בראש ונראה גם בטלפון צר",seed,async page=>{
    await page.setViewportSize({width:360,height:740});
    await page.waitForTimeout(250);
    const r=await page.evaluate(()=>{
      const b=document.getElementById("btnMenu");
      if(!b)return null;
      const x=b.getBoundingClientRect();
      return {w:Math.round(x.width),h:Math.round(x.height),top:Math.round(x.top),
        right:Math.round(x.right),vw:window.innerWidth,
        disp:getComputedStyle(b).display};
    });
    ok(r,"הכפתור קיים");
    ok(r.disp!=="none","ולא מוסתר");
    ok(r.w>=32&&r.h>=32,"ושטח הנגיעה שלו סביר: "+r.w+"×"+r.h);
    ok(r.top>=0&&r.right<=r.vw,"והוא בתוך המסך — top="+r.top+" right="+r.right+"/"+r.vw);
  }),

  check("המגירה נצמדת לצד שממנו נפתחה ותופסת את כל הגובה",seed,async page=>{
    await page.setViewportSize({width:390,height:780});
    await open(page);
    const r=await page.evaluate(()=>{
      const b=document.querySelector("#navDrawer .box").getBoundingClientRect();
      return {top:Math.round(b.top),h:Math.round(b.height),right:Math.round(b.right),
        w:Math.round(b.width),vh:window.innerHeight,vw:window.innerWidth};
    });
    ok(r.h>=r.vh-2,"גובה מלא: "+r.h+" מתוך "+r.vh);
    ok(Math.abs(r.right-r.vw)<=2,"ונצמדת לימין בעברית — right="+r.right+"/"+r.vw);
    ok(r.w<r.vw,"אבל לא מכסה את כל הרוחב, כדי שאפשר יהיה לסגור בהקשה בחוץ");
  }),

  check("הקשה מחוץ למגירה סוגרת אותה",seed,async page=>{
    await open(page);
    await page.mouse.click(20,400);
    await page.waitForTimeout(250);
    eq(await page.evaluate(()=>document.getElementById("navDrawer").classList.contains("on")),false);
  }),

  check("«מערכת שעות» מהתפריט פותחת את הטבלה — ולא שתי שכבות זו על זו",seed,async page=>{
    await open(page);
    await page.evaluate(()=>document.getElementById("dw-sched").click());
    await page.waitForTimeout(400);
    const r=await page.evaluate(()=>({
      sched:document.getElementById("schedModal").classList.contains("on"),
      drawer:document.getElementById("navDrawer").classList.contains("on")
    }));
    ok(r.sched,"הטבלה נפתחה");
    eq(r.drawer,false,"והמגירה נסגרה מאחוריה");
  }),

  check("«קבוצות הוראה» מהתפריט פותחת את מסך הקבוצות",seed,async page=>{
    await open(page);
    await page.evaluate(()=>document.getElementById("dw-groups").click());
    await page.waitForTimeout(400);
    ok(await page.evaluate(()=>document.getElementById("grpModal").classList.contains("on")));
  }),

  check("«הגדרות» ו«מדריך» עברו מהסרגל אל תוך המגירה — ולא שוכפלו",seed,async page=>{
    const r=await page.evaluate(()=>({
      inBar:[...document.querySelectorAll(".topbar #btnSettings, .topbar #btnInfo")].length,
      inDrawer:[...document.querySelectorAll("#navDrawer #btnSettings, #navDrawer #btnInfo")].length,
      copies:document.querySelectorAll("#btnSettings").length+document.querySelectorAll("#btnInfo").length
    }));
    eq(r.inBar,0,"הסרגל העליון השתחרר מהם");
    eq(r.inDrawer,2,"והם נמצאים במגירה");
    eq(r.copies,2,"עותק אחד לכל אחד — לא כפתור־צל שקורא לכפתור אחר");
  }),

  check("«הגדרות» מהתפריט פותחת את ההגדרות",seed,async page=>{
    await open(page);
    await page.evaluate(()=>document.getElementById("btnSettings").click());
    await page.waitForTimeout(400);
    const r=await page.evaluate(()=>({
      set:document.getElementById("setModal").classList.contains("on"),
      drawer:document.getElementById("navDrawer").classList.contains("on")
    }));
    ok(r.set,"ההגדרות נפתחו");
    eq(r.drawer,false,"והמגירה נסגרה");
  }),

  check("«מדריך המסך» מהתפריט פותח את המדריך של המסך שבו אני",seed,async page=>{
    await page.evaluate(()=>window.HM.go("ft"));
    await page.waitForTimeout(600);
    await open(page);
    await page.evaluate(()=>document.getElementById("btnInfo").click());
    await page.waitForTimeout(400);
    const r=await page.evaluate(()=>({
      on:document.getElementById("infoModal").classList.contains("on"),
      drawer:document.getElementById("navDrawer").classList.contains("on")
    }));
    ok(r.on,"המדריך נפתח");
    eq(r.drawer,false,"והמגירה נסגרה");
  }),

  /* ---------- הבית ---------- */

  check("הבית מציג את «עכשיו» ושתי פעולות — לא רשימת מודולים",seed,async page=>{
    const r=await page.evaluate(()=>({
      tiles:[...document.querySelectorAll(".hx-mods .hx-mod[data-go]")].map(e=>e.dataset.go),
      today:!!document.getElementById("hx-today")
    }));
    ok(r.today,"כרטיס «מה עכשיו» קיים");
    eq(r.tiles.length,2,"ושתי פעולות בלבד: "+r.tiles.join(","));
    eq(r.tiles[0],"ft","הראשונה — מבחני כושר");
    eq(r.tiles[1],"lesson","השנייה — מערכי שיעור");
  }),

  /* ---------- סדר המבחנים ---------- */

  check("המבחנים הנפוצים ראשונים, בסדר שנקבע",ftSeed,async page=>{
    await openFt(page);
    const r=await page.evaluate(()=>{
      const g=document.querySelector("#ft-tests .ft-grp");
      return {head:g.querySelector(".ft-grph").textContent.trim(),
        ids:[...g.querySelectorAll("[data-t]")].map(e=>e.dataset.t)};
    });
    ok(/הנמדדים/.test(r.head),"הקבוצה הראשונה היא של הנפוצים: "+r.head);
    eq(r.ids.join(","),"pull,push,push60,r1000,situp,r1500,shut4x10",
      "מתח · שכיבות סמיכה · שכיבות דקה · 1000 · בטן · 1500 · 4×10");
  }),

  check("מבחן אינו מופיע פעמיים — פעם למעלה ופעם בקטגוריה",ftSeed,async page=>{
    await openFt(page);
    const ids=await page.evaluate(()=>
      [...document.querySelectorAll("#ft-tests [data-t]")].map(e=>e.dataset.t));
    const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
    eq(dup.length,0,"כפולים: "+dup.join(","));
  }),

  check("כל המבחנים עדיין נגישים — הקיצור לא הסתיר אף אחד",ftSeed,async page=>{
    const n=await page.evaluate(()=>window.FT&&window.FT.tests?window.FT.tests().length:null);
    await openFt(page);
    const shown=await page.evaluate(()=>
      document.querySelectorAll("#ft-tests [data-t]").length);
    if(n!==null)eq(shown,n,"כל מבחן שבקטלוג מופיע במסך");
    else ok(shown>=30,"נמצאו "+shown+" מבחנים במסך");
  }),

  check("שכיבות סמיכה בדקה הוא מבחן נפרד, עם שעון — והמקורי לא השתנה",ftSeed,async page=>{
    await openFt(page);
    const r=await page.evaluate(()=>{
      const txt=id=>{ const c=document.querySelector('[data-t="'+id+'"]');
        return c?c.textContent.replace(/\s+/g," "):null; };
      return {push:txt("push"),push60:txt("push60")};
    });
    ok(r.push&&!/דק׳/.test(r.push),"«שכיבות סמיכה» נשאר עד כשל, בלי חלון זמן: "+r.push);
    ok(r.push60&&/דק׳/.test(r.push60),"ולצידו גרסת הדקה: "+r.push60);
  }),

  check("הדקה של שכיבות הסמיכה באמת רצה — ספירה לאחור נפתחת",ftSeed,async page=>{
    await openFt(page);
    await page.evaluate(()=>document.querySelector('[data-t="push60"]').click());
    await page.waitForTimeout(450);
    const r=await page.evaluate(()=>{
      const box=document.getElementById("ft-cdBox"), tm=document.getElementById("ft-cdTm");
      return {exists:!!box,txt:tm?tm.textContent.trim():""};
    });
    ok(r.exists,"אזור הספירה לאחור קיים במסך המבחן");
    eq(r.txt,"1:00","ומראה דקה");
  })

]};
