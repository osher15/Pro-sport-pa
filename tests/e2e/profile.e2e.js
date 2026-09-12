"use strict";
/* פרופיל התלמיד — בכרטיס האמיתי, בדפדפן.
   הבדיקות כאן מוודאות גם שהפרופיל החדש עובד, וגם שדוח ה-PDF
   וייצוא ה-CSV שהיו קיימים לא נשברו. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const r=(id,t,d,val,o)=>Object.assign(
  {id,test:t,sid:"a",cls:"ט׳3",cid:"c:ט:3",d,ts:+id.replace(/\D/g,"")||1,
   val,unit:"ס״מ",gradeKey:"ט",sex:"boys"},o||{});

const base=extra=>Object.assign({
  "ft.classes":{"c:ט:3":{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"},
                "c:י:1":{id:"c:י:1",name:"י׳1",grade:"י",num:1,key:"י1"}},
  "ft.roster":{"ט3":[{id:"a",name:"דן אבירם",sex:"boys"},{id:"b",name:"רון לוי",sex:"boys"}]},
  "ft.last":{grade:"ט",num:3,sort:"name"},"pf.guideSeen":true,
  "schema.version":D.SCHEMA_VERSION
},extra);

const openCard=async page=>{
  await page.evaluate(()=>window.HM.go("ft")); await page.waitForTimeout(700);
  await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').click());
  await page.waitForTimeout(600);
  await page.evaluate(()=>document.querySelector("#ft-list .ft-row .nm").click());
  await page.waitForTimeout(600);
};

module.exports={title:"פרופיל התלמיד",tests:[

  check("הפרופיל חשוף מהאפליקציה",base({"ft.results":[r("m1","ljump","2026-06-01",180)]}),
  async page=>{
    const p=await page.evaluate(()=>window.FT.progress.profile({id:"a",name:"דן אבירם",sex:"boys"}));
    eq(p.measured,1);
    eq(p.tests[0].testId,"ljump");
    eq(p.tests[0].best.val,180);
  }),

  check("הכרטיס נפתח ומציג שיא אישי ואחרון",base({"ft.results":[
    r("m1","ljump","2026-06-01",180),r("m2","ljump","2026-12-01",172)]}),async page=>{
    await openCard(page);
    eq(await page.evaluate(()=>document.querySelectorAll("#ft-cardModal.on").length),1,"הכרטיס פתוח");
    const head=await page.evaluate(()=>
      [...document.querySelectorAll("#ft-cardBody table th")].map(x=>x.textContent.trim()));
    ok(head.indexOf("⭐ שיא אישי")>=0,"עמודת שיא — "+head.join(" | "));
    ok(head.indexOf("אחרון")>=0,"ועמודת אחרון");
    ok(head.indexOf("מגמה")>=0,"ועמודת מגמה");
    const row=await page.evaluate(()=>document.querySelector("#ft-cardBody tbody tr").innerText);
    ok(row.indexOf("180")>=0,"השיא 180 — התקבל: "+row.replace(/\n/g," | "));
    ok(row.indexOf("172")>=0,"והאחרון 172");
  }),

  check("ירידה מוצגת כירידה",base({"ft.results":[
    r("m1","ljump","2026-06-01",180),r("m2","ljump","2026-12-01",172)]}),async page=>{
    await openCard(page);
    const cell=await page.evaluate(()=>{
      const tds=document.querySelectorAll("#ft-cardBody tbody tr td");
      return tds[tds.length-1].innerHTML;
    });
    ok(cell.indexOf("down")>=0,"סומן כירידה — התקבל: "+cell);
    ok(cell.indexOf("▼")>=0,"עם חץ למטה");
  }),

  check("שיפור מוצג כשיפור",base({"ft.results":[
    r("m1","ljump","2026-06-01",172),r("m2","ljump","2026-12-01",180)]}),async page=>{
    await openCard(page);
    const cell=await page.evaluate(()=>{
      const tds=document.querySelectorAll("#ft-cardBody tbody tr td");
      return tds[tds.length-1].innerHTML;
    });
    ok(cell.indexOf("up")>=0,"סומן כשיפור");
    ok(cell.indexOf("▲")>=0);
  }),

  check("כשאין ציון — כתוב למה",base({"ft.results":[r("m1","ljump","2026-06-01",180)]}),
  async page=>{
    await openCard(page);
    const txt=await page.evaluate(()=>document.querySelector("#ft-cardBody tbody tr").innerText);
    ok(/נורמה|אחוזון|שכבה/.test(txt),
      "הסיבה מוצגת ולא רק מקף — התקבל: "+txt.replace(/\n/g," | "));
  }),

  check("הפרופיל כולל היסטוריה מכיתה קודמת",base({"ft.results":[
    r("m1","ljump","2026-06-01",172),
    r("m2","ljump","2027-01-01",188,{cls:"י׳1",cid:"c:י:1",gradeKey:"י"})]}),async page=>{
    const p=await page.evaluate(()=>window.FT.progress.profile({id:"a",name:"דן אבירם",sex:"boys"}));
    eq(p.tests[0].count,2,"שתי המדידות, בשתי הכיתות");
    eq(p.tests[0].best.val,188);
    eq(p.classes.length,2);
    await openCard(page);
    const body=await page.evaluate(()=>document.getElementById("ft-cardBody").innerText);
    ok(body.indexOf("2 כיתות")>=0,"והכרטיס אומר את זה — התקבל: "+body.slice(0,180).replace(/\n/g," | "));
  }),

  check("ייצוא CSV מהכרטיס ממשיך לעבוד",base({"ft.results":[
    r("m1","ljump","2026-06-01",172),r("m2","ljump","2026-12-01",180)]}),async page=>{
    await openCard(page);
    const res=await page.evaluate(()=>{
      let captured=null;
      const orig=window.HM.dlCSV;
      window.HM.dlCSV=(name,rows)=>{ captured={name,rows}; };
      document.getElementById("ft-cardCsv").click();
      window.HM.dlCSV=orig;
      return captured;
    });
    ok(res,"ה-CSV נוצר");
    ok(res.name.indexOf("דן אבירם")>=0,"עם שם התלמיד: "+res.name);
    eq(res.rows.length,2,"כותרת + שורה אחת");
    eq(res.rows[1][1],180,"והתוצאה הטובה ביותר");
  }),

  check("דוח ה-PDF מהכרטיס ממשיך לעבוד",base({"ft.results":[
    r("m1","ljump","2026-06-01",172),r("m2","ljump","2026-12-01",180)]}),async page=>{
    await openCard(page);
    const ctx=page.context();
    const pg=ctx.waitForEvent("page");
    await page.evaluate(()=>document.getElementById("ft-cardPdf").click());
    const w=await pg;
    await w.waitForLoadState("domcontentloaded");
    await w.waitForTimeout(700);
    const txt=await w.evaluate(()=>document.body.innerText);
    ok(txt.indexOf("דן אבירם")>=0,"הדוח נפתח עם שם התלמיד");
    ok(txt.indexOf("180")>=0,"ועם התוצאה");
    await w.close();
  }),

  check("תלמיד בלי מדידות — כרטיס ריק ולא שגיאה",base({"ft.results":[
    r("m1","ljump","2026-06-01",180,{sid:"b"})]}),async page=>{
    const p=await page.evaluate(()=>window.FT.progress.profile({id:"a",name:"דן אבירם"}));
    eq(p.measured,0);
    eq(p.index.v,null,"ולא אפס");
  }),

  check("הפרופיל אינו משנה את המדידות",base({"ft.results":[
    r("m1","ljump","2026-06-01",172),r("m2","ljump","2026-12-01",180)]}),async page=>{
    const before=await page.evaluate(()=>JSON.stringify(window.FT.results()));
    await openCard(page);
    const after=await page.evaluate(()=>JSON.stringify(window.FT.results()));
    eq(after,before,"המדידות הגולמיות לא זזו");
  })

]};
