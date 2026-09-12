"use strict";
/* שיעור פעיל — הזרימה האמיתית של המורה, בדפדפן.
   בחירת כיתה → התחלת שיעור → מדידה → רענון → חידוש → סיום. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const seed={
  "ft.classes":{"c:ט:3":{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"}},
  "ft.roster":{"ט3":[{id:"a",name:"דן אבירם",sex:"boys"},{id:"b",name:"רון לוי",sex:"boys"}]},
  "ft.results":[],
  "ft.last":{grade:"ט",num:3,sort:"name"},"pf.guideSeen":true,
  "schema.version":D.SCHEMA_VERSION
};
const openFt=async page=>{ await page.evaluate(()=>window.HM.go("ft")); await page.waitForTimeout(700); };
const startFromPicker=async page=>{
  await openFt(page);
  await page.evaluate(()=>document.getElementById("ft-startLesson").click());
  await page.waitForTimeout(450);
};

module.exports={title:"שיעור פעיל",tests:[

  check("אין שיעור — אין פס ואין הקשר",seed,async page=>{
    eq(await page.evaluate(()=>document.getElementById("lsBar").hidden),true,
      "לא מוסיפים למורה ממשק כשאין שיעור");
    eq(await page.evaluate(()=>window.HM.session.active()),null);
  }),

  check("התחלת שיעור מבורר הכיתה",seed,async page=>{
    await startFromPicker(page);
    const a=await page.evaluate(()=>window.HM.session.active());
    ok(a,"נפתח שיעור");
    eq(a.cid,"c:ט:3","מזהה כיתה יציב");
    eq(a.clsSnapshot,"ט׳3","ושם הכיתה כהקשר");
    eq(a.status,"active");
    ok(a.date&&/^\d{4}-\d{2}-\d{2}$/.test(a.date),"תאריך בפורמט האפליקציה: "+a.date);
  }),

  check("הפס מופיע ואומר איזו כיתה",seed,async page=>{
    await startFromPicker(page);
    const bar=await page.evaluate(()=>{
      const el=document.getElementById("lsBar");
      return {hidden:el.hidden,txt:el.textContent,vis:getComputedStyle(el).display};
    });
    eq(bar.hidden,false);
    ok(bar.vis!=="none","והוא באמת נראה");
    ok(bar.txt.indexOf("ט׳3")>=0,"עם שם הכיתה — התקבל: «"+bar.txt.trim()+"»");
  }),

  check("לחיצה כפולה אינה פותחת שני שיעורים",seed,async page=>{
    await openFt(page);
    await page.evaluate(()=>{
      const b=document.getElementById("ft-startLesson");
      b.click(); b.click(); b.click();
    });
    await page.waitForTimeout(500);
    const all=await page.evaluate(()=>window.HM.session.all());
    eq(all.length,1,"רשומה אחת בלבד");
    eq(all.filter(x=>x.status==="active").length,1);
  }),

  check("השיעור שורד רענון דפדפן",seed,async page=>{
    await startFromPicker(page);
    const before=await page.evaluate(()=>window.HM.session.active().id);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForTimeout(900);
    const after=await page.evaluate(()=>window.HM.session.active());
    ok(after,"השיעור נמצא אחרי רענון");
    eq(after.id,before,"ואותו מזהה — לא שיעור חדש");
    eq(await page.evaluate(()=>document.getElementById("lsBar").hidden),false,
      "והפס חזר מעצמו");
  }),

  check("חידוש מחזיר את השיעור הקיים ולא פותח חדש",seed,async page=>{
    await startFromPicker(page);
    const id=await page.evaluate(()=>window.HM.session.active().id);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForTimeout(900);
    const r=await page.evaluate(()=>window.HM.session.resume());
    eq(r.outcome,"resumed");
    eq(r.session.id,id);
    eq(await page.evaluate(()=>window.HM.session.all().length),1);
  }),

  check("מדידה בשיעור נושאת את מזהה השיעור ונשארת גולמית",seed,async page=>{
    await startFromPicker(page);
    const id=await page.evaluate(()=>window.HM.session.active().id);
    await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').click());
    await page.waitForTimeout(600);
    await page.evaluate(()=>{
      const inp=document.querySelector("#ft-list [data-val]");
      inp.value="182"; inp.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await page.waitForTimeout(450);
    const m=await page.evaluate(()=>window.FT.results().slice(-1)[0]);
    eq(m.sessionId,id,"המדידה יודעת באיזה שיעור נלקחה");
    eq(m.val,182,"והערך הגולמי נשמר");
    eq(m.unit,"ס״מ");
    ok(m.sid,"עם מזהה תלמיד");
    ok(m.cid,"ומזהה כיתה");
    const n=await page.evaluate(i=>window.HM.session.measurements(i).length,id);
    eq(n,1,"והיא נמצאת דרך הקשר השיעור");
  }),

  check("מדידה בלי שיעור פעיל אינה נושאת מזהה שיעור",seed,async page=>{
    await openFt(page);
    await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').click());
    await page.waitForTimeout(600);
    await page.evaluate(()=>{
      const inp=document.querySelector("#ft-list [data-val]");
      inp.value="175"; inp.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await page.waitForTimeout(450);
    const m=await page.evaluate(()=>window.FT.results().slice(-1)[0]);
    eq(m.sessionId,null,"מדידה מחוץ לשיעור עדיין מדידה מלאה");
    eq(m.val,175);
  }),

  check("סיום השיעור משאיר את המדידות ואת ההיסטוריה",seed,async page=>{
    await startFromPicker(page);
    const id=await page.evaluate(()=>window.HM.session.active().id);
    await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').click());
    await page.waitForTimeout(600);
    await page.evaluate(()=>{
      const inp=document.querySelector("#ft-list [data-val]");
      inp.value="182"; inp.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await page.waitForTimeout(450);

    const r=await page.evaluate(i=>window.HM.session.complete(i),id);
    eq(r.outcome,"completed");
    eq(await page.evaluate(()=>window.HM.session.active()),null,"אין יותר שיעור פעיל");
    eq(await page.evaluate(()=>document.getElementById("lsBar").hidden),true,"והפס נעלם");

    const all=await page.evaluate(()=>window.HM.session.all());
    eq(all.length,1,"והשיעור נשאר בהיסטוריה");
    eq(all[0].status,"completed");
    ok(all[0].endedAt,"עם זמן סיום");
    eq(await page.evaluate(()=>window.FT.results().length),1,"והמדידה לא נמחקה");
    eq(await page.evaluate(i=>window.HM.session.measurements(i).length,id),1,
      "והיא עדיין נמצאת דרך השיעור שהסתיים");
  }),

  check("סיום דרך הכפתור בפס",seed,async page=>{
    await startFromPicker(page);
    await page.evaluate(()=>document.getElementById("lsBarEnd").click());
    await page.waitForTimeout(500);
    eq(await page.evaluate(()=>window.HM.session.active()),null);
    eq(await page.evaluate(()=>window.HM.session.all()[0].status),"completed");
  }),

  check("מדידת שיעור משתתפת בהתקדמות כמו כל מדידה",seed,async page=>{
    await startFromPicker(page);
    await page.evaluate(()=>{
      const res=window.HM.LS.get("ft.results",[]);
      res.push({id:"old",test:"ljump",sid:"a",cls:"ט׳3",cid:"c:ט:3",d:"2026-06-01",
        ts:1,val:170,unit:"ס״מ",gradeKey:"ט",sex:"boys"});
      window.HM.LS.set("ft.results",res);
    });
    await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').click());
    await page.waitForTimeout(600);
    await page.evaluate(()=>{
      const inp=document.querySelector("#ft-list [data-val]");
      inp.value="182"; inp.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await page.waitForTimeout(450);
    const p=await page.evaluate(()=>window.FT.progress.progress({id:"a"},"ljump"));
    eq(p.count,2,"המדידה מהשיעור נספרת יחד עם הישנה");
    eq(p.improved,true);
    eq(p.best.val,182);
    ok(p.best.sessionId,"והשיא נושא את הקשר השיעור");
  }),

  check("השיעור נכנס לגיבוי וחוזר בשחזור",seed,async page=>{
    await startFromPicker(page);
    const id=await page.evaluate(()=>window.HM.session.active().id);
    const snap=await page.evaluate(()=>window.HM.backupTest.snapshotFull());
    ok(snap.data["ls.sessions"],"מפתח השיעורים בגיבוי — "+Object.keys(snap.data).join(","));

    await page.evaluate(()=>{
      Object.keys(localStorage).filter(k=>k.indexOf("pehub.")===0)
        .forEach(k=>localStorage.removeItem(k));
    });
    eq(await page.evaluate(()=>window.HM.session.all().length),0,"נוקה");

    const r=await page.evaluate(s=>window.HM.backupTest.apply(s),snap);
    eq(r.failed,0);
    const back=await page.evaluate(()=>window.HM.session.active());
    ok(back,"השיעור חזר");
    eq(back.id,id,"עם אותו מזהה");
    eq(back.cid,"c:ט:3");
    eq(back.clsSnapshot,"ט׳3");
  }),

  check("היסטוריית שיעורים שורדת שחזור",seed,async page=>{
    await startFromPicker(page);
    const id=await page.evaluate(()=>window.HM.session.active().id);
    await page.evaluate(i=>window.HM.session.complete(i),id);
    const snap=await page.evaluate(()=>window.HM.backupTest.snapshotFull());
    await page.evaluate(()=>{
      Object.keys(localStorage).filter(k=>k.indexOf("pehub.")===0)
        .forEach(k=>localStorage.removeItem(k));
    });
    await page.evaluate(s=>window.HM.backupTest.apply(s),snap);
    const all=await page.evaluate(()=>window.HM.session.all());
    eq(all.length,1);
    eq(all[0].status,"completed","גם שיעור שהסתיים חוזר");
    eq(all[0].id,id);
  }),

  check("נתונים ישנים בלי שיעורים נקראים כרגיל",{
    "ft.roster":{"ט3":[{name:"דן אבירם"}]},
    "ft.results":[{id:"r1",cls:"ט׳3",test:"ljump",name:"דן אבירם",d:"2026-06-01",ts:1,val:170}],
    "ft.last":{grade:"ט",num:3,sort:"name"},"pf.guideSeen":true
  },async page=>{
    const rep=await page.evaluate(()=>window.HM.migration());
    eq(rep.ok,true,rep.error||"");
    eq(await page.evaluate(()=>window.HM.session.all().length),0,
      "אין שיעורים — ואין שגיאה");
    eq(await page.evaluate(()=>window.HM.session.active()),null);
    eq(await page.evaluate(()=>window.HM.LS.get("ft.results",[]).length),1,
      "והמדידה הישנה נקראת");
  })

]};
