"use strict";
/* מדידה ← הערכה ← התקדמות, מול האפליקציה האמיתית.
   בדיקות היחידה מוכיחות שהחישוב נכון; כאן מוכיחים שהוא מחובר
   לנתונים שהאפליקציה באמת שומרת. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const roster={"ט3":[{id:"a",name:"דן אבירם",sex:"boys"},{id:"b",name:"רון לוי",sex:"boys"}]};
const r=(id,d,val,o)=>Object.assign(
  {id,test:"r60",sid:"a",cls:"ט׳3",cid:"c:ט:3",d,ts:+id.replace(/\D/g,"")||1,
   val,unit:"שנ׳",gradeKey:"ט",sex:"boys"},o||{});

const seeded={
  "ft.classes":{"c:ט:3":{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"}},
  "ft.roster":roster,
  "ft.results":[r("r1","2026-06-01",5.80),r("r2","2026-09-01",5.55),r("r3","2026-12-01",5.42)],
  "ft.last":{grade:"ט",num:3,sort:"name"},"pf.guideSeen":true,
  "schema.version":D.SCHEMA_VERSION
};
const empty={
  "ft.classes":{"c:ט:3":{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"}},
  "ft.roster":roster,"ft.results":[],
  "ft.last":{grade:"ט",num:3,sort:"name"},"pf.guideSeen":true,
  "schema.version":D.SCHEMA_VERSION
};

const stud=()=>`window.FT.roster("ט׳3")[0]`;

module.exports={title:"מדידה, הערכה והתקדמות",tests:[

  check("ממשק ההתקדמות חשוף מהאפליקציה",seeded,async page=>{
    const api=await page.evaluate(()=>Object.keys(window.FT.progress||{}));
    ["measurements","personalBest","latest","first","progress","assess","dirOf"]
      .forEach(k=>ok(api.indexOf(k)>=0,"חסר: "+k+" · יש: "+api.join(",")));
  }),

  check("המדידות הגולמיות ניתנות לשחזור במלואן",seeded,async page=>{
    const ms=await page.evaluate(()=>window.FT.progress.measurements(window.FT.roster("ט׳3")[0],"r60"));
    eq(ms.length,3);
    eq(ms.map(x=>x.val),[5.8,5.55,5.42],"הערכים המקוריים, לא ציונים");
    eq(ms[0].unit,"שנ׳","והיחידה");
    eq(ms[0].cls,"ט׳3","והכיתה בזמן המדידה");
  }),

  check("שיא אישי ב-60 מטר הוא הזמן הקצר ביותר",seeded,async page=>{
    const pb=await page.evaluate(()=>window.FT.progress.personalBest(window.FT.roster("ט׳3")[0],"r60"));
    eq(pb.val,5.42);
    eq(await page.evaluate(()=>window.FT.progress.dirOf("r60")),"low");
  }),

  check("שיא אישי בחזרות הוא המספר הגדול ביותר",{
    "ft.classes":seeded["ft.classes"],"ft.roster":roster,
    "ft.results":[r("p1","2026-06-01",15,{test:"push",unit:"חזרות"}),
                  r("p2","2026-09-01",22,{test:"push",unit:"חזרות"}),
                  r("p3","2026-12-01",19,{test:"push",unit:"חזרות"})],
    "ft.last":{grade:"ט",num:3,sort:"name"},"pf.guideSeen":true,
    "schema.version":D.SCHEMA_VERSION},async page=>{
    const pb=await page.evaluate(()=>window.FT.progress.personalBest(window.FT.roster("ט׳3")[0],"push"));
    eq(pb.val,22,"ולא 19, למרות ש-19 מאוחר יותר");
    eq(await page.evaluate(()=>window.FT.progress.dirOf("push")),"high");
  }),

  check("ירידה בזמן היא שיפור",seeded,async page=>{
    const p=await page.evaluate(()=>window.FT.progress.progress(window.FT.roster("ט׳3")[0],"r60"));
    eq(p.count,3);
    eq(p.rawDelta,-0.13,"השינוי הגולמי שלילי");
    eq(p.improved,true,"והביצוע השתפר");
    eq(p.sinceFirst.improved,true);
    eq(p.sinceFirst.rawDelta,-0.38,"מ-5.80 ל-5.42");
  }),

  check("בלי מדידות — סיבה מפורשת ולא אפס",empty,async page=>{
    const p=await page.evaluate(()=>window.FT.progress.progress(window.FT.roster("ט׳3")[0],"r60"));
    eq(p.count,0);
    eq(p.reason,"no-measurements");
    eq(p.improved,null,"לא false");
    eq(p.best,null);
  }),

  check("מדידה חדשה נשמרת עם חותמת גרסת הכללים",empty,async page=>{
    await page.evaluate(()=>window.HM.go("ft")); await page.waitForTimeout(700);
    await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').click());
    await page.waitForTimeout(600);
    await page.evaluate(()=>{
      const inp=document.querySelector("#ft-list [data-val]");
      inp.value="182"; inp.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await page.waitForTimeout(450);
    const rec=await page.evaluate(()=>window.FT.results().slice(-1)[0]);
    eq(rec.val,182,"הערך הגולמי");
    ok("normVer" in rec,"החותמת קיימת — התקבל: "+JSON.stringify(Object.keys(rec)));
    ok(rec.sid,"ומזהה תלמיד");
    ok(rec.cid,"ומזהה כיתה");
  }),

  check("הערכה מחזירה ציון או סיבה — לעולם לא אפס שקט",empty,async page=>{
    const a=await page.evaluate(()=>window.FT.progress.assess(window.FT.roster("ט׳3")[0],"r60",null,"ט"));
    eq(a.v,null);
    eq(a.reason,"no-measurement","מדידה חסרה אינה ציון נמוך");
    const b=await page.evaluate(()=>window.FT.progress.assess(window.FT.roster("ט׳3")[0],"r60",8.5,"ט"));
    eq(b.v,null,"אין טבלה ואין מספיק עמיתים");
    ok(b.reason==="too-few-peers"||b.reason==="no-norm","סיבה מפורשת: "+b.reason);
  }),

  check("ההיסטוריה שורדת מעבר כיתה",seeded,async page=>{
    /* התלמיד עובר לי׳1: נוסף לרשימה החדשה עם אותו מזהה */
    await page.evaluate(()=>{
      const all=window.HM.LS.get("ft.roster",{});
      all["י1"]=[{id:"a",name:"דן אבירם",sex:"boys"}];
      window.HM.LS.set("ft.roster",all);
      const res=window.HM.LS.get("ft.results",[]);
      res.push({id:"r4",test:"r60",sid:"a",cls:"י׳1",cid:"c:י:1",d:"2027-01-01",
        ts:4,val:5.30,unit:"שנ׳",gradeKey:"י",sex:"boys"});
      window.HM.LS.set("ft.results",res);
    });
    const p=await page.evaluate(()=>window.FT.progress.progress({id:"a",name:"דן אבירם"},"r60"));
    eq(p.count,4,"כל ארבע המדידות, בשתי הכיתות");
    eq(p.best.val,5.3,"והשיא הוא החדש");
    eq(p.first.cls,"ט׳3","הכיתה בזמן המדידה נשמרה כהקשר");
    eq(p.latest.cls,"י׳1");
  }),

  check("ההיסטוריה שורדת שינוי שם של התלמיד",seeded,async page=>{
    await page.evaluate(()=>{
      const all=window.HM.LS.get("ft.roster",{});
      all["ט3"][0].name="דן אבירם-לוי";
      window.HM.LS.set("ft.roster",all);
    });
    const p=await page.evaluate(()=>window.FT.progress.progress(window.FT.roster("ט׳3")[0],"r60"));
    eq(p.count,3,"המזהה קובע, לא השם");
  }),

  check("ההיסטוריה שורדת שינוי שם של הכיתה",seeded,async page=>{
    await page.evaluate(()=>{
      const st={get:(k,d)=>window.HM.LS.get(k,d),set:(k,v)=>window.HM.LS.set(k,v)};
      window.HMDATA.renameClass(st,"c:ט:3","ט׳3 — מגמת ספורט");
    });
    const p=await page.evaluate(()=>window.FT.progress.progress({id:"a",name:"דן אבירם"},"r60"));
    eq(p.count,3);
    eq(p.best.val,5.42);
  }),

  check("שני תלמידים אינם חולקים התקדמות",seeded,async page=>{
    const a=await page.evaluate(()=>window.FT.progress.progress({id:"a"},"r60").count);
    const b=await page.evaluate(()=>window.FT.progress.progress({id:"b"},"r60").count);
    eq(a,3); eq(b,0,"רון לוי לא נמדד — ולא ירש את ההיסטוריה של דן");
  })

]};
