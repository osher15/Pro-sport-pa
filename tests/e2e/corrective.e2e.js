"use strict";
/* מעבר תיקון לשלב 4 — אימות בדפדפן.
   בדיקות היחידה מוכיחות שהלוגיקה נכונה; כאן מוכיחים שהתיקונים
   באמת מחוברים למסלול שהמורה עובר. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const roster={"ט3":[{id:"a",name:"דן אבירם",sex:"boys"}]};
const base={
  "ft.classes":{"c:ט:3":{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"}},
  "ft.roster":roster,
  "ft.last":{grade:"ט",num:3,sort:"name"},"pf.guideSeen":true,
  "ft.scoreMode":"norm",
  "schema.version":D.SCHEMA_VERSION
};
const seed=extra=>Object.assign({},base,extra);

/* מדידה של 20 חזרות שנלקחה תחת כללי תשפ״ו */
const oldMeasure=[{id:"r1",test:"push",sid:"a",cls:"ט׳3",cid:"c:ט:3",
  d:"2026-06-01",ts:1,val:20,unit:"חזרות",gradeKey:"ט",sex:"boys",normVer:"תשפ״ו"}];
const T26={push:{boys:{"ט":[[10,60],[30,100]]}}};
const T27={push:{boys:{"ט":[[10,40],[30,70]]}}};

module.exports={title:"מעבר תיקון — אפס כשיא, וגרסאות ניקוד",tests:[

  /* ---------- באג 1 ---------- */

  check("אפס שניות אינו הופך לשיא אישי",seed({
    "ft.results":[
      {id:"r1",test:"r60",sid:"a",cls:"ט׳3",cid:"c:ט:3",d:"2026-06-01",ts:1,val:5.42,unit:"שנ׳",gradeKey:"ט",sex:"boys"},
      {id:"r2",test:"r60",sid:"a",cls:"ט׳3",cid:"c:ט:3",d:"2026-07-01",ts:2,val:0,   unit:"שנ׳",gradeKey:"ט",sex:"boys"}]
  }),async page=>{
    const pb=await page.evaluate(()=>window.FT.progress.personalBest({id:"a"},"r60"));
    eq(pb.val,5.42,"הזמן האמיתי, לא האפס");
    const p=await page.evaluate(()=>window.FT.progress.progress({id:"a"},"r60"));
    eq(p.invalid,1,"האפס נספר כפגום");
    eq(p.improved,null,"ולא «שיפור של 5.42 שניות»");
    const raw=await page.evaluate(()=>window.FT.progress.measurements({id:"a"},"r60").length);
    eq(raw,2,"והרשומה הפגומה נשארת בהיסטוריה הגולמית");
  }),

  check("אפס חזרות נשאר תוצאה תקפה",seed({
    "ft.results":[{id:"r1",test:"push",sid:"a",cls:"ט׳3",cid:"c:ט:3",
      d:"2026-06-01",ts:1,val:0,unit:"חזרות",gradeKey:"ט",sex:"boys"}]
  }),async page=>{
    const pb=await page.evaluate(()=>window.FT.progress.personalBest({id:"a"},"push"));
    ok(pb,"תלמיד שלא הצליח אף חזרה נמדד");
    eq(pb.val,0);
  }),

  /* ---------- באג 2 ---------- */

  check("שמירת טבלת נורמה מארכבת אותה תחת שם הגרסה",seed({"ft.results":[]}),async page=>{
    await page.evaluate(()=>window.HM.go("ft")); await page.waitForTimeout(700);
    await page.evaluate(()=>document.querySelector('#ft-tabs [data-ft="idx"]').click());
    await page.waitForTimeout(600);
    await page.evaluate(()=>{
      document.getElementById("ft-normsBtn").click();
    });
    await page.waitForTimeout(400);
    await page.evaluate(()=>{
      document.getElementById("ft-nVersion").value="תשפ״ו";
      document.getElementById("ft-nSource").value="חוזר מנכ״ל";
      document.getElementById("ft-nText").value="push | boys | ט | 10=60, 30=100";
      document.getElementById("ft-nSave").click();
    });
    await page.waitForTimeout(500);
    const arc=await page.evaluate(()=>window.HM.LS.get("ft.normArchive",{}));
    ok(arc["תשפ״ו"],"הגרסה בארכיון — התקבל: "+JSON.stringify(Object.keys(arc)));
    eq(arc["תשפ״ו"].source,"חוזר מנכ״ל");
    ok(arc["תשפ״ו"].table.push,"עם הטבלה עצמה");
  }),

  check("ההערכה ההיסטורית נשארת זהה אחרי החלפת טבלה",seed({
    "ft.results":oldMeasure,
    "ft.norms":{version:"תשפ״ז",source:"",table:T27},
    "ft.normArchive":{"תשפ״ו":{version:"תשפ״ו",source:"",table:T26,at:"2026-06-01T00:00:00Z"}}
  }),async page=>{
    const a=await page.evaluate(()=>{
      const m=window.FT.results()[0];
      return window.FT.progress.assessOf({id:"a",sex:"boys"},m);
    });
    eq(a.v,80,"הציון שהיה בתוקף כשנמדד — לא 55");
    eq(a.reproduced,true,"שוחזר מהטבלה הארכיונית");
    eq(a.stale,false);
    eq(a.normVersion,"תשפ״ו");
  }),

  check("מדידה חדשה מנוקדת בכללים החדשים",seed({
    "ft.results":oldMeasure,
    "ft.norms":{version:"תשפ״ז",source:"",table:T27},
    "ft.normArchive":{"תשפ״ו":{version:"תשפ״ו",source:"",table:T26,at:"2026-06-01T00:00:00Z"},
                      "תשפ״ז":{version:"תשפ״ז",source:"",table:T27,at:"2027-06-01T00:00:00Z"}}
  }),async page=>{
    const fresh=await page.evaluate(()=>
      window.FT.progress.assess({id:"a",sex:"boys"},"push",20,"ט","תשפ״ז"));
    eq(fresh.v,55,"הכללים החדשים חלים על מה שנמדד תחתיהם");
    const old=await page.evaluate(()=>
      window.FT.progress.assess({id:"a",sex:"boys"},"push",20,"ט","תשפ״ו"));
    eq(old.v,80,"והישנה שומרת על הציון שלה — באותה הרצה");
  }),

  check("גרסה שאינה בארכיון מסומנת ולא מתחזה לשחזור",seed({
    "ft.results":oldMeasure,
    "ft.norms":{version:"תשפ״ז",source:"",table:T27},
    "ft.normArchive":{}
  }),async page=>{
    const a=await page.evaluate(()=>
      window.FT.progress.assess({id:"a",sex:"boys"},"push",20,"ט","תשס״ח"));
    eq(a.v,55,"אין ממה לשחזר");
    eq(a.reproduced,false);
    eq(a.stale,true,"ולכן מסומן");
  }),

  check("המדידה הגולמית שורדת את כל זה",seed({
    "ft.results":oldMeasure,
    "ft.norms":{version:"תשפ״ז",source:"",table:T27},
    "ft.normArchive":{"תשפ״ו":{version:"תשפ״ו",source:"",table:T26,at:"2026-06-01T00:00:00Z"}}
  }),async page=>{
    const m=await page.evaluate(()=>{
      const r=window.FT.results()[0];
      window.FT.progress.assessOf({id:"a",sex:"boys"},r);
      return window.FT.results()[0];
    });
    eq(m.val,20,"20 חזרות נשארו 20 חזרות");
    eq(m.unit,"חזרות");
    eq(m.normVer,"תשפ״ו","וחותמת הגרסה שלה");
  })

]};
