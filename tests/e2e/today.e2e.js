"use strict";
/* ============================================================
   «השיעורים שלי היום»
   ------------------------------------------------------------
   השאלה הראשונה של מורה שפותח את האפליקציה בשער בית הספר היא
   «מה אני עושה עכשיו», ועד עכשיו דף הבית לא ידע לענות עליה —
   הוא הציג מודולים, לא הוראה.

   הבדיקות כאן שומרות על שלושה דברים: שהיום מוצג נכון (ולא יום
   אחר), שכפתור אחד באמת פותח שיעור, ושהנתיב הזה הוא **אותו**
   SESSION.start של שאר האפליקציה — כלומר שלא נוצר שיעור שני
   לאותה כיתה.
   ============================================================ */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const CLASSES={
  "c:ז:2":{id:"c:ז:2",name:"ז׳2",grade:"ז",num:2,key:"ז2"},
  "c:ח:1":{id:"c:ח:1",name:"ח׳1",grade:"ח",num:1,key:"ח1"}
};
/* היום נקבע בזמן ההרצה, ולכן המשבצות נבנות מולו ולא מול יום קבוע:
   בדיקה שעוברת רק בימי שלישי אינה בדיקה. */
const todayISO=()=>new Date().toISOString().slice(0,10);
const DAY=()=>D.dayOfISO(todayISO());
const week=()=>[
  {id:"s1",day:DAY(),time:"09:00",cid:"c:ז:2",clsSnapshot:"ז׳2",topic:"כדורסל — מסירה"},
  {id:"s2",day:DAY(),time:"10:45",cid:"c:ח:1",clsSnapshot:"ח׳1",topic:""},
  {id:"s3",day:(DAY()+1)%7,time:"08:15",cid:"c:ז:2",clsSnapshot:"ז׳2",topic:"אתלטיקה"}
];
const base={"ft.classes":CLASSES,"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION};
const seeded=()=>Object.assign({},base,{"sched.week":week()});
const slots=page=>page.evaluate(()=>[...document.querySelectorAll("#hx-todayList .hx-slot")]
  .map(e=>e.textContent.replace(/\s+/g," ").trim()));

module.exports={title:"היום שלי",tests:[

  check("מכשיר בלי מערכת שעות מקבל הזמנה, לא מסך ריק",base,async page=>{
    const r=await page.evaluate(()=>({
      card:!!document.getElementById("hx-today"),
      txt:document.getElementById("hx-todayList").textContent,
      cta:!!document.getElementById("hx-schedFirst")
    }));
    ok(r.card,"הבלוק קיים גם כשאין מה להציג");
    ok(/מערכת שעות/.test(r.txt),"מסביר מה חסר: "+r.txt.slice(0,60));
    ok(r.cta,"ויש פעולה אחת להתחיל ממנה");
  }),

  check("האריחים והאתגר לא נעלמו — רק נדחקו מטה",base,async page=>{
    const r=await page.evaluate(()=>({
      tiles:document.querySelectorAll(".hx-mods .hx-mod[data-go]").length,
      ch:!!document.querySelector(".hx-ch"),
      tip:!!document.getElementById("fieldTip"),
      order:[...document.querySelectorAll("#view-home > div")].map(e=>e.id||e.className.split(" ")[0])
    }));
    eq(r.tiles,4,"ארבעת האריחים במקומם");
    ok(r.ch,"האתגר השבועי לא הוסר");
    ok(r.tip,"וטיפ השטח גם לא");
    const iT=r.order.indexOf("hx-today"), iM=r.order.indexOf("hx-mods");
    ok(iT>=0&&iM>iT,"«היום שלי» מעל האריחים — "+r.order.join(","));
  }),

  check("שיעורי היום מוצגים, ושל מחר לא",seeded(),async page=>{
    const l=await slots(page);
    eq(l.length,2,"שתי משבצות היום: "+JSON.stringify(l));
    ok(l[0].includes("09:00")&&l[0].includes("ז׳2"),l[0]);
    ok(l[1].includes("10:45")&&l[1].includes("ח׳1"),l[1]);
    ok(!l.join(" ").includes("אתלטיקה"),"שיעור של מחר אינו מופיע היום");
  }),

  check("הסדר הוא לפי שעה, לא לפי סדר ההזנה",
    Object.assign({},base,{"sched.week":[
      {id:"b",day:D.dayOfISO(new Date().toISOString().slice(0,10)),time:"13:00",cid:"c:ח:1",clsSnapshot:"ח׳1"},
      {id:"a",day:D.dayOfISO(new Date().toISOString().slice(0,10)),time:"08:00",cid:"c:ז:2",clsSnapshot:"ז׳2"}
    ]}),async page=>{
    const l=await slots(page);
    ok(l[0].includes("08:00"),"המוקדם ראשון: "+JSON.stringify(l));
  }),

  check("כפתור אחד פותח שיעור אמיתי",seeded(),async page=>{
    await page.evaluate(()=>document.querySelector("#hx-todayList [data-slot]").click());
    await page.waitForTimeout(400);
    const a=await page.evaluate(()=>window.HM.session.active());
    ok(a,"נפתח שיעור");
    eq(a.cid,"c:ז:2","הכיתה של המשבצת שנלחצה");
    eq(a.planTitle,"כדורסל — מסירה","הנושא מהמערכת עובר לשיעור");
    eq(await page.evaluate(()=>document.getElementById("lsBar").hidden),false,
      "ופס השיעור הפעיל מופיע כמו בכל נתיב אחר");
  }),

  check("המשבצת שנפתחה מסומנת «פעיל» ולא מציעה להתחיל שוב",seeded(),async page=>{
    await page.evaluate(()=>document.querySelector("#hx-todayList [data-slot]").click());
    await page.waitForTimeout(400);
    const r=await page.evaluate(()=>({
      txt:document.querySelector("#hx-todayList .hx-slot").textContent,
      starts:document.querySelectorAll("#hx-todayList [data-slot]").length
    }));
    ok(/פעיל/.test(r.txt),r.txt);
    eq(r.starts,1,"נשאר כפתור התחלה אחד — של הכיתה השנייה");
  }),

  check("לחיצה על כיתה שנייה אינה פותחת שיעור שני",seeded(),async page=>{
    await page.evaluate(()=>document.querySelector("#hx-todayList [data-slot]").click());
    await page.waitForTimeout(400);
    await page.evaluate(()=>{
      const b=document.querySelector("#hx-todayList [data-slot]");
      if(b)b.click();
    });
    await page.waitForTimeout(400);
    const n=await page.evaluate(()=>window.HM.session.all().length);
    eq(n,1,"שני שיעורים פתוחים היו הופכים «לאיזה שיעור שייכת המדידה» לשאלה בלי תשובה");
    eq(await page.evaluate(()=>window.HM.session.active().cid),"c:ז:2","הראשון נשאר הפתוח");
  }),

  check("לחיצה חוזרת על אותה משבצת מחזירה את אותו שיעור",seeded(),async page=>{
    const id=await page.evaluate(async()=>{
      document.querySelector("#hx-todayList [data-slot]").click();
      await new Promise(r=>setTimeout(r,300));
      return window.HM.session.active().id;
    });
    await page.evaluate(()=>window.HM.paintToday());
    const n=await page.evaluate(()=>window.HM.session.all().length);
    eq(n,1);
    eq(await page.evaluate(()=>window.HM.session.active().id),id,"אותו מזהה, לא שיעור חדש");
  }),

  check("שיעור שהסתיים מסמן את המשבצת ומופיע ב«השיעור האחרון»",seeded(),async page=>{
    await page.evaluate(async()=>{
      document.querySelector("#hx-todayList [data-slot]").click();
      await new Promise(r=>setTimeout(r,300));
      window.HM.session.complete(window.HM.session.active().id);
      window.HM.paintToday();
    });
    await page.waitForTimeout(300);
    const r=await page.evaluate(()=>({
      slot:document.querySelector("#hx-todayList .hx-slot").textContent,
      lastHidden:document.getElementById("hx-last").hidden,
      last:document.getElementById("hx-lastBody").textContent
    }));
    ok(/התקיים/.test(r.slot),"המשבצת מסומנת: "+r.slot.replace(/\s+/g," "));
    eq(r.lastHidden,false,"כרטיס השיעור האחרון נפתח");
    ok(/ז׳2/.test(r.last),"ומראה איזו כיתה: "+r.last.replace(/\s+/g," ").slice(0,80));
  }),

  check("«השיעור האחרון» חבוי כל עוד לא הסתיים אף שיעור",seeded(),async page=>{
    eq(await page.evaluate(()=>document.getElementById("hx-last").hidden),true);
  }),

  check("דף הבית נצבע מחדש בחזרה אליו — ולא מראה מצב ישן",seeded(),async page=>{
    await page.evaluate(()=>document.querySelector("#hx-todayList [data-slot]").click());
    await page.waitForTimeout(350);
    await page.evaluate(()=>window.HM.go("ft"));
    await page.waitForTimeout(500);
    await page.evaluate(()=>{ const a=window.HM.session.active(); window.HM.session.complete(a.id); });
    await page.evaluate(()=>window.HM.go("home"));
    await page.waitForTimeout(400);
    const txt=await page.evaluate(()=>document.getElementById("hx-todayList").textContent);
    ok(/התקיים/.test(txt),"השיעור שהסתיים במודול אחר מסומן גם כאן: "+txt.replace(/\s+/g," ").slice(0,90));
  }),

  check("שינוי שם כיתה משתקף במערכת השעות",seeded(),async page=>{
    await page.evaluate(()=>{
      const s={get:(k,d)=>window.HM.LS.get(k,d===undefined?null:d),set:(k,v)=>window.HM.LS.set(k,v)};
      window.HMDATA.renameClass(s,"c:ז:2","ז׳2 — מגמת ספורט");
      window.HM.paintToday();
    });
    await page.waitForTimeout(200);
    const l=await slots(page);
    ok(l[0].includes("מגמת ספורט"),"השם החדש, דרך cid: "+l[0]);
  }),

  /* ---------- עורך מערכת השעות ---------- */

  check("הוספת שיעור מהעורך מופיעה מיד בדף הבית",base,async page=>{
    await page.evaluate(()=>window.HM.openSched());
    await page.waitForTimeout(300);
    await page.evaluate(d=>{
      document.getElementById("sw-day").value=String(d);
      document.getElementById("sw-time").value="11:30";
      document.getElementById("sw-grade").value="ח";
      document.getElementById("sw-num").value="1";
      document.getElementById("sw-topic").value="כדורעף";
      document.getElementById("sw-add").click();
    },await page.evaluate(()=>window.HMDATA.dayOfISO(new Date().toISOString().slice(0,10))));
    await page.waitForTimeout(300);
    const l=await slots(page);
    eq(l.length,1,JSON.stringify(l));
    ok(l[0].includes("11:30")&&l[0].includes("כדורעף"),l[0]);
  }),

  check("שעה לא תקינה אינה נכנסת למערכת",base,async page=>{
    await page.evaluate(()=>{
      window.HM.openSched();
      document.getElementById("sw-time").value="25:99";
      document.getElementById("sw-add").click();
    });
    await page.waitForTimeout(250);
    eq(await page.evaluate(()=>window.HM.sched.list().length),0,"לא נשמרה משבצת פגומה");
  }),

  check("אותו שיעור פעמיים אינו נוסף פעמיים",base,async page=>{
    await page.evaluate(()=>{
      window.HM.openSched();
      document.getElementById("sw-time").value="09:00";
      document.getElementById("sw-add").click();
      document.getElementById("sw-add").click();
    });
    await page.waitForTimeout(300);
    eq(await page.evaluate(()=>window.HM.sched.list().length),1);
  }),

  check("מחיקה מהתא מוציאה שיעור מהמערכת ומדף הבית",seeded(),async page=>{
    await page.evaluate(d=>{ window.HM.openSched(); window.HM.schedCell(d,2); },
      await page.evaluate(()=>window.HMDATA.dayOfISO(new Date().toISOString().slice(0,10))));
    await page.waitForTimeout(300);
    ok(await page.evaluate(()=>!!document.querySelector("#sw-cellList [data-del]")),
      "המשבצת של 09:00 נמצאת בתא של שיעור 2");
    await page.evaluate(()=>document.querySelector("#sw-cellList [data-del]").click());
    await page.waitForTimeout(300);
    eq(await page.evaluate(()=>window.HM.sched.list().length),2,"נמחקה אחת מתוך שלוש");
  }),

  check("בחירת «שיעור 3» ממלאת את השעה — כך מורה חושב",base,async page=>{
    await page.evaluate(()=>window.HM.openSched());
    await page.waitForTimeout(250);
    const t=await page.evaluate(()=>{
      const h=document.getElementById("sw-hour");
      h.value="3"; h.dispatchEvent(new Event("change"));
      return document.getElementById("sw-time").value;
    });
    eq(t,"09:45","השעה של השיעור השלישי בלוח הצלצולים");
  }),

  check("הקלדת שעה שהיא צלצול מיישרת את הבורר — שני השדות לא סותרים",base,async page=>{
    await page.evaluate(()=>window.HM.openSched());
    await page.waitForTimeout(250);
    const h=await page.evaluate(()=>{
      const t=document.getElementById("sw-time");
      t.value="11:40"; t.dispatchEvent(new Event("input"));
      return document.getElementById("sw-hour").value;
    });
    eq(h,"5");
  }),

  check("המערכת נשמרת ברענון",base,async page=>{
    await page.evaluate(()=>{
      window.HM.openSched();
      document.getElementById("sw-time").value="08:15";
      document.getElementById("sw-add").click();
    });
    await page.waitForTimeout(300);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForTimeout(800);
    eq(await page.evaluate(()=>window.HM.sched.list().length),1,
      "מערכת שעות שנעלמת ברענון אינה מערכת שעות");
  })

]};
