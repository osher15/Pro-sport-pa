"use strict";
/* זהות כיתה והכרעת מדידות — מקצה לקצה, מול האפליקציה האמיתית. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

/* מכשיר ישן: בלי מזהים, עם שני תלמידים זהי-שם ועם תלמיד שעזב */
const legacy={
  "ft.roster":{"ט3":[
    {name:"דן אבירם",sex:"boys"},
    {name:"דן כהן",  sex:"boys"},
    {name:"דן כהן",  sex:"boys"}]},
  "ft.results":[
    {id:"r1",d:"2026-06-04",ts:1,cls:"ט׳3",test:"ljump",name:"דן אבירם",val:180,unit:"ס״מ",gradeKey:"ט",sex:"boys"},
    {id:"r2",d:"2026-09-02",ts:2,cls:"ט3", test:"ljump",name:"דן אבירם",val:190,unit:"ס״מ",gradeKey:"ט",sex:"boys"},
    {id:"r3",d:"2026-09-02",ts:3,cls:"ט׳3",test:"ljump",name:"דן כהן",  val:170,unit:"ס״מ",gradeKey:"ט",sex:"boys"},
    {id:"r4",d:"2026-09-02",ts:4,cls:"ט׳3",test:"ljump",name:"תלמיד שעזב",val:160,unit:"ס״מ",gradeKey:"ט",sex:"boys"}],
  "ft.last":{grade:"ט",num:3,sort:"name"},
  "pf.guideSeen":true
};
/* אותו מכשיר, בלי אף מדידה דו-משמעית */
const clean={
  /* מכשיר שכבר בגרסה הנוכחית נושא גם את רישום הכיתות */
  "ft.classes":{"c:ט:3":{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"}},
  "ft.roster":{"ט3":[{id:"a",name:"דן אבירם",sex:"boys"}]},
  "ft.results":[{id:"r1",d:"2026-09-02",ts:1,cls:"ט׳3",cid:"c:ט:3",test:"ljump",
    name:"דן אבירם",sid:"a",val:180,unit:"ס״מ",gradeKey:"ט",sex:"boys"}],
  "ft.last":{grade:"ט",num:3,sort:"name"},"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION
};

const openFt=async page=>{ await page.evaluate(()=>window.HM.go("ft")); await page.waitForTimeout(700); };

module.exports={title:"זהות כיתה והכרעת מדידות",tests:[

  check("ההסבה רושמת את הכיתה ומטביעה מזהה על כל מדידה",legacy,async page=>{
    const rep=await page.evaluate(()=>window.HM.migration());
    eq(rep.ok,true,rep.error||"");
    eq(rep.from,1,"מכשיר ישן");
    ok(rep.applied.indexOf("class-identity")>=0,"מיגרציית הכיתות רצה");
    const reg=await page.evaluate(()=>window.HM.LS.get("ft.classes",{}));
    eq(Object.keys(reg),["c:ט:3"],"כיתה אחת נרשמה");
    eq(reg["c:ט:3"].name,"ט׳3");
    const cids=await page.evaluate(()=>window.HM.LS.get("ft.results",[]).map(r=>r.cid));
    eq(cids,["c:ט:3","c:ט:3","c:ט:3","c:ט:3"],"כל המדידות מצביעות על אותה כיתה");
  }),

  check("מדידה חדשה נשמרת עם מזהה כיתה",clean,async page=>{
    await openFt(page);
    await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').click());
    await page.waitForTimeout(600);
    await page.evaluate(()=>{
      const inp=document.querySelector("#ft-list [data-val]");
      inp.value="195"; inp.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await page.waitForTimeout(450);
    const r=await page.evaluate(()=>window.FT.results().slice(-1)[0]);
    eq(r.cid,"c:ט:3","המדידה נושאת מזהה כיתה");
    eq(r.val,195);
  }),

  check("שינוי שם כיתה לא מנתק מדידות",clean,async page=>{
    const before=await page.evaluate(()=>window.FT.results().filter(r=>r.cid==="c:ט:3").length);
    eq(before,1);
    const res=await page.evaluate(()=>{
      const st={get:(k,d)=>window.HM.LS.get(k,d),set:(k,v)=>window.HM.LS.set(k,v)};
      const r=window.HMDATA.renameClass(st,"c:ט:3","ט׳3 — מגמת ספורט");
      return {ok:r.ok,name:window.HMDATA.classOf(st,"c:ט:3").name,
        links:window.HM.LS.get("ft.results",[]).filter(x=>x.cid==="c:ט:3").length};
    });
    eq(res.ok,true);
    eq(res.name,"ט׳3 — מגמת ספורט","השם השתנה");
    eq(res.links,1,"והמדידה עדיין מקושרת");
  }),

  check("כרטיס ההכרעה מופיע רק כשיש מה להכריע",legacy,async page=>{
    await openFt(page);
    eq(await page.evaluate(()=>document.getElementById("ft-ambCard").hidden),false,
      "יש שתי קבוצות ממתינות — הכרטיס מוצג");
    const txt=await page.evaluate(()=>document.getElementById("ft-ambList").innerText);
    ok(txt.indexOf("דן כהן")>=0,"«דן כהן» מופיע — התקבל: "+txt.replace(/\n/g," | "));
    ok(txt.indexOf("תלמיד שעזב")>=0,"וגם «תלמיד שעזב»");
  }),

  check("אין רשומות ממתינות — אין כרטיס",clean,async page=>{
    await openFt(page);
    eq(await page.evaluate(()=>document.getElementById("ft-ambCard").hidden),true,
      "לא מוסיפים למורה ממשק שאין לו מה לעשות איתו");
  }),

  check("הכרעה ידנית משייכת את המדידה לתלמיד שנבחר",legacy,async page=>{
    await openFt(page);
    await page.evaluate(()=>document.querySelector("#ft-ambList [data-amb]").click());
    await page.waitForTimeout(400);
    const cands=await page.evaluate(()=>[...document.querySelectorAll("#ft-ambBody [data-pick]")].length);
    ok(cands>=2,"מוצגים מועמדים: "+cands);
    /* בוחרים את המועמד הראשון — «שם תואם» */
    const picked=await page.evaluate(()=>{
      const b=document.querySelector("#ft-ambBody [data-pick]");
      const key=b.dataset.pick; b.click(); return key;
    });
    await page.waitForTimeout(500);
    const res=await page.evaluate(()=>window.HM.LS.get("ft.results",[]));
    eq(res.length,4,"אף מדידה לא נוספה ולא נמחקה");
    const fixed=res.filter(r=>r.sidFrom==="manual");
    ok(fixed.length>=1,"לפחות מדידה אחת שויכה ידנית");
    eq(fixed[0].sidAmbig,undefined,"והסימון ירד");
    ok(fixed[0].sid,"ויש לה מזהה תלמיד");
    ok(picked.indexOf("id:")===0,"המפתח שנבחר הוא מזהה יציב");
  }),

  check("אחרי הכרעה הקבוצה נעלמת מהכרטיס",legacy,async page=>{
    await openFt(page);
    const before=await page.evaluate(()=>document.querySelectorAll("#ft-ambList [data-amb]").length);
    eq(before,2);
    await page.evaluate(()=>document.querySelector("#ft-ambList [data-amb]").click());
    await page.waitForTimeout(400);
    await page.evaluate(()=>document.querySelector("#ft-ambBody [data-pick]").click());
    await page.waitForTimeout(600);
    const after=await page.evaluate(()=>document.querySelectorAll("#ft-ambList [data-amb]").length);
    eq(after,1,"נשארה קבוצה אחת");
  }),

  check("רשומה שלא הוכרעה נשארת בטוחה",legacy,async page=>{
    await openFt(page);
    await page.evaluate(()=>document.querySelector("#ft-ambList [data-amb]").click());
    await page.waitForTimeout(400);
    await page.evaluate(()=>document.querySelector("#ft-ambBody [data-pick]").click());
    await page.waitForTimeout(600);
    const left=await page.evaluate(()=>window.HM.LS.get("ft.results",[]).filter(r=>r.sidAmbig));
    ok(left.length>=1,"עדיין יש רשומה ממתינה");
    ok(left[0].val>0,"והנתון שלה שלם");
    eq(left[0].sid,undefined,"ולא שויכה לאף אחד");
  }),

  check("שני תלמידים זהי-שם קיבלו מזהים שונים",legacy,async page=>{
    const ids=await page.evaluate(()=>
      window.HM.LS.get("ft.roster",{})["ט3"].filter(s=>s.name==="דן כהן").map(s=>s.id));
    eq(ids.length,2);
    ok(ids[0]!==ids[1],"שני מזהים שונים — לא זהות אחת משותפת");
  })

]};
