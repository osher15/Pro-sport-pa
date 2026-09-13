"use strict";
/* ============================================================
   סיום שיעור ומסך הכיתה
   ------------------------------------------------------------
   עד עכשיו שיעור נסגר ב-confirm() אחד, ונכנס להיסטוריה בלי שום
   דבר מלבד העובדה שהתקיים. ההיסטוריה הזאת לא יכלה לעזור לשיעור
   הבא, כי היא לא ידעה מה עבד.

   הבדיקות כאן שומרות על שלושה דברים: שהמשוב הוא **רשות** (שיעור
   נסגר גם בלעדיו — מורה במגרש לא תמיד יעצור למלא), שמה שנרשם
   באמת נשמר על השיעור, ושההמלצה משנה כיוון לפי מה שסומן ולא
   מדקלמת אותו דבר.
   ============================================================ */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const CLS={"c:ז:2":{id:"c:ז:2",name:"ז׳2",grade:"ז",num:2,key:"ז2"}};
const todayISO=()=>new Date().toISOString().slice(0,10);
const base={"ft.classes":CLS,"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION,
  "sched.week":[{id:"s1",day:D.dayOfISO(new Date().toISOString().slice(0,10)),
    time:"09:00",cid:"c:ז:2",clsSnapshot:"ז׳2",topic:"כדורסל — מסירה"}]};
/* היסטוריה קיימת, כדי שמסך הכיתה יהיה מה להראות */
const withHist=r=>Object.assign({},base,{"ls.sessions":[
  {id:"x1",cid:"c:ז:2",clsSnapshot:"ז׳2",date:"2026-09-06",startedAt:1757100000000,
   endedAt:1757102700000,status:"completed",planTitle:"כדורסל — מסירה",
   rating:r,note:r===-1?"התרגיל האחרון היה קשה מדי":""}]});

const startLesson=async page=>{
  await page.evaluate(()=>document.querySelector("#hx-todayList [data-slot]").click());
  await page.waitForTimeout(350);
};
const openEnd=async page=>{
  await page.evaluate(()=>document.getElementById("lsBarEnd").click());
  await page.waitForTimeout(300);
};

module.exports={title:"סיום שיעור ומסך הכיתה",tests:[

  check("«סיים שיעור» פותח שאלה, לא חלון אישור",base,async page=>{
    await startLesson(page);
    await openEnd(page);
    const r=await page.evaluate(()=>({
      on:document.getElementById("endModal").classList.contains("on"),
      title:document.getElementById("end-title").textContent,
      rates:document.querySelectorAll("#end-rate button").length,
      note:!!document.getElementById("end-note")
    }));
    eq(r.on,true);
    ok(/ז׳2/.test(r.title),"ואומר איזו כיתה: "+r.title);
    eq(r.rates,3,"שלוש אפשרויות — שתי לחיצות זה המקסימום במגרש");
    ok(r.note,"ושורה אחת לזכור בה משהו");
  }),

  check("החלון מזכיר כמה מדידות נלקחו — כי סיום אינו מחיקה",base,async page=>{
    await startLesson(page);
    await openEnd(page);
    const t=await page.evaluate(()=>document.getElementById("end-sum").textContent);
    ok(/היסטוריה/.test(t),t);
  }),

  check("משוב הוא רשות — שיעור נסגר גם בלי שסומן דבר",base,async page=>{
    await startLesson(page);
    await openEnd(page);
    await page.evaluate(()=>document.getElementById("end-go").click());
    await page.waitForTimeout(500);
    const s=await page.evaluate(()=>window.HM.session.list()[0]);
    eq(s.status,"completed","השיעור נסגר");
    eq(s.rating,null,"«לא סימנתי» אינו «בינוני»");
    eq(s.note,"");
    eq(await page.evaluate(()=>window.HM.session.active()),null);
  }),

  check("דירוג והערה נשמרים על השיעור עצמו",base,async page=>{
    await startLesson(page);
    await openEnd(page);
    await page.evaluate(()=>{
      document.querySelector('#end-rate [data-r="-1"]').click();
      document.getElementById("end-note").value="התרגיל האחרון היה קשה מדי";
      document.getElementById("end-go").click();
    });
    await page.waitForTimeout(500);
    const s=await page.evaluate(()=>window.HM.session.list()[0]);
    eq(s.rating,-1);
    eq(s.note,"התרגיל האחרון היה קשה מדי");
  }),

  check("לחיצה שנייה על אותו דירוג מבטלת אותו",base,async page=>{
    await startLesson(page);
    await openEnd(page);
    const on=await page.evaluate(()=>{
      const b=document.querySelector('#end-rate [data-r="1"]');
      b.click(); const a=b.classList.contains("on");
      b.click(); return [a,b.classList.contains("on")];
    });
    eq(on,[true,false],"נגיעה בטעות חייבת להיות הפיכה");
  }),

  check("הפס נעלם והשיעור יורד מהמסך אחרי הסיום",base,async page=>{
    await startLesson(page);
    await openEnd(page);
    await page.evaluate(()=>document.getElementById("end-go").click());
    await page.waitForTimeout(600);
    eq(await page.evaluate(()=>document.getElementById("lsBar").hidden),true);
    eq(await page.evaluate(()=>document.getElementById("endModal").classList.contains("on")),false);
  }),

  /* ---------- מסך הכיתה ---------- */

  check("סיום שיעור פותח את מסך הכיתה — הרגע שבו ההמלצה שווה משהו",base,async page=>{
    await startLesson(page);
    await openEnd(page);
    await page.evaluate(()=>{
      document.querySelector('#end-rate [data-r="1"]').click();
      document.getElementById("end-go").click();
    });
    await page.waitForTimeout(800);
    eq(await page.evaluate(()=>document.getElementById("clsModal").classList.contains("on")),true);
    ok(/ז׳2/.test(await page.evaluate(()=>document.getElementById("cls-title").textContent)));
  }),

  check("מסך הכיתה נפתח גם מדף הבית",withHist(1),async page=>{
    await page.evaluate(()=>document.querySelector("#hx-lastBody [data-cls]").click());
    await page.waitForTimeout(400);
    eq(await page.evaluate(()=>document.getElementById("clsModal").classList.contains("on")),true);
  }),

  check("מסך הכיתה מראה מה קרה, לא רק שקרה",withHist(-1),async page=>{
    await page.evaluate(()=>window.HM.openClassScreen("c:ז:2"));
    await page.waitForTimeout(400);
    const t=await page.evaluate(()=>document.getElementById("cls-body").textContent.replace(/\s+/g," "));
    ok(/שיעורים שהתקיימו/.test(t),"מונה שיעורים");
    ok(/2026-09-06/.test(t),"התאריך");
    ok(/כדורסל/.test(t),"הנושא");
    ok(/לא עבד/.test(t),"הדירוג");
    ok(/קשה מדי/.test(t),"וההערה — זה מה שהמורה באמת צריך לפני השיעור הבא");
  }),

  check("ההמלצה משנה כיוון לפי מה שסומן",withHist(-1),async page=>{
    const down=await page.evaluate(async()=>{
      window.HM.openClassScreen("c:ז:2");
      await new Promise(r=>setTimeout(r,250));
      return document.querySelector(".cls-next").textContent.replace(/\s+/g," ");
    });
    ok(/לא עבד/.test(down),"מסבירה את עצמה: "+down.slice(0,110));
    const up=await page.evaluate(async()=>{
      const l=window.HM.session.all().map(s=>Object.assign({},s,{rating:1}));
      window.HM.LS.set("ls.sessions",l);
      window.HM.openClassScreen("c:ז:2");
      await new Promise(r=>setTimeout(r,250));
      return document.querySelector(".cls-next").textContent.replace(/\s+/g," ");
    });
    ok(up!==down,"אותה כיתה, משוב הפוך — המלצה אחרת");
    ok(/מצוין/.test(up),up.slice(0,110));
  }),

  check("כיתה בלי היסטוריה אומרת זאת, ולא ממציאה המלצה",base,async page=>{
    await page.evaluate(()=>window.HM.openClassScreen("c:ז:2"));
    await page.waitForTimeout(350);
    const t=await page.evaluate(()=>document.querySelector(".cls-next").textContent);
    ok(/אין עדיין שיעור/.test(t),t.replace(/\s+/g," ").slice(0,120));
  }),

  check("אפשר לפתוח שיעור ישירות ממסך הכיתה",base,async page=>{
    await page.evaluate(()=>window.HM.openClassScreen("c:ז:2"));
    await page.waitForTimeout(350);
    await page.evaluate(()=>document.getElementById("cls-start").click());
    await page.waitForTimeout(400);
    const a=await page.evaluate(()=>window.HM.session.active());
    ok(a&&a.cid==="c:ז:2","השיעור נפתח על הכיתה של המסך");
    eq(await page.evaluate(()=>document.getElementById("clsModal").classList.contains("on")),false,
      "והחלון נסגר — לא נשארים בו כשמתחילים ללמד");
  }),

  check("כששיעור כבר פתוח, המסך אומר זאת במקום להציע לפתוח עוד אחד",base,async page=>{
    await startLesson(page);
    await page.evaluate(()=>window.HM.openClassScreen("c:ז:2"));
    await page.waitForTimeout(350);
    const r=await page.evaluate(()=>({
      start:!!document.getElementById("cls-start"),
      txt:document.getElementById("cls-body").textContent
    }));
    eq(r.start,false,"אין כפתור פתיחה");
    ok(/שיעור פתוח/.test(r.txt),"ונאמר למה");
  }),

  check("המדידות של הכיתה נספרות במסך שלה",
    Object.assign({},withHist(1),{"ft.results":[
      {sid:"a",name:"דן",cid:"c:ז:2",cls:"ז׳2",test:"run60",val:9.2,d:"2026-09-06"},
      {sid:"b",name:"רון",cid:"c:ז:2",cls:"ז׳2",test:"run60",val:9.8,d:"2026-09-06"},
      {sid:"c",name:"עדי",cid:"c:ח:1",cls:"ח׳1",test:"run60",val:9.1,d:"2026-09-06"}
    ]}),async page=>{
    await page.evaluate(()=>window.HM.openClassScreen("c:ז:2"));
    await page.waitForTimeout(350);
    const n=await page.evaluate(()=>[...document.querySelectorAll(".cls-stats .qs")]
      .map(e=>e.textContent));
    ok(n.some(x=>/^2מדידות/.test(x)),"שתיים, לא שלוש — מדידה של כיתה אחרת אינה נספרת: "+JSON.stringify(n));
  })

]};
