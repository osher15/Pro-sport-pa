"use strict";
/* זהות תלמיד — מקצה לקצה, מול localStorage אמיתי ו-DOM אמיתי.
   בדיקות היחידה מוכיחות שהלוגיקה נכונה; כאן מוכיחים שהיא באמת
   מחוברת למסך שהמורה רואה. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

/* כיתה בסכמה הישנה: לרשומות אין sid ולתלמידים אין id */
function legacy(n){
  const res=[];
  for(let i=0;i<n;i++)res.push({id:"m"+i,d:"2026-0"+(i%9+1)+"-01",ts:i,cls:"ט׳3",
    test:"ljump",name:"דן אבירם",val:180+i,unit:"ס״מ",gradeKey:"ט",sex:"boys"});
  /* «קפיצה לרוחק» נבחרה בכוונה: היא מבחן עם שדה מספר חופשי, ולכן
     אפשר להקליד בה ערך ישירות. מונה החזרות נבדק בנפרד. */
  return {
    "ft.roster":{"ט3":[{name:"דן אבירם",sex:"boys"},{name:"רון לוי",sex:"boys"}]},
    "ft.results":res,
    "ft.last":{grade:"ט",num:3,sort:"name"},
    "pf.guideSeen":true
  };
}
const twins={
  "ft.roster":{"ט3":[{id:"a",name:"דן כהן",sex:"boys"},{id:"b",name:"דן כהן",sex:"boys"}]},
  "ft.results":[],"ft.last":{grade:"ט",num:3,sort:"name"},"pf.guideSeen":true};

async function openTest(page,tid){
  await page.evaluate(()=>window.HM.go("ft"));
  await page.waitForTimeout(700);
  await page.evaluate(t=>document.querySelector('#ft-tests [data-t="'+t+'"]').click(),tid);
  await page.waitForTimeout(600);
}
async function typeVal(page,key,v){
  await page.evaluate(a=>{
    const inp=document.querySelector('#ft-list [data-val="'+CSS.escape(a.k)+'"]');
    inp.value=String(a.v); inp.dispatchEvent(new Event("change",{bubbles:true}));
  },{k:key,v});
  await page.waitForTimeout(450);
}

module.exports={title:"זהות תלמיד",tests:[

  check("ההסבה רצה בעלייה ומקשרת את כל המדידות",legacy(10),async page=>{
    const rep=await page.evaluate(()=>window.HM.migration());
    ok(rep,"אין דוח הסבה");
    eq(rep.from,1,"הנתונים הישנים זוהו כגרסה 1");
    eq(rep.ok,true,"ההסבה הצליחה");
    eq(rep.linked,10,"עשר המדידות קושרו");
    const n=await page.evaluate(()=>window.HM.LS.get("ft.results",[]).filter(r=>r.sid).length);
    eq(n,10,"כל המדידות נושאות מזהה");
  }),

  check("אף מדידה לא נעלמה בהסבה",legacy(10),async page=>{
    const n=await page.evaluate(()=>window.HM.LS.get("ft.results",[]).length);
    eq(n,10,"מספר המדידות זהה לפני ואחרי");
  }),

  check("שינוי שם תלמיד שומר על עשר המדידות",legacy(10),async page=>{
    /* התרחיש שהפיל את המערכת הישנה: המורה מתקן שגיאת כתיב. */
    await page.evaluate(()=>{
      const all=window.HM.LS.get("ft.roster",{});
      all["ט3"][0].name="דן אבירם-לוי";
      window.HM.LS.set("ft.roster",all);
    });
    await openTest(page,"ljump");
    const row=await page.evaluate(()=>{
      const r=[...document.querySelectorAll("#ft-list .ft-row")]
        .find(x=>x.dataset.nm&&x.dataset.nm.indexOf("דן")===0);
      return r?{nm:r.dataset.nm,sub:(r.querySelector(".nm .pv")||{textContent:""}).textContent}:null;
    });
    ok(row,"השורה של התלמיד לא נמצאה");
    eq(row.nm,"דן אבירם-לוי","השם החדש מוצג");
    ok(row.sub.indexOf("10 ניסיונות")>=0,
      "עשרת הניסיונות עדיין מחוברים אליו — התקבל: «"+row.sub+"»");
  }),

  check("שני תלמידים בעלי אותו שם נשארים נפרדים",twins,async page=>{
    await openTest(page,"ljump");
    const keys=await page.evaluate(()=>[...document.querySelectorAll("#ft-list .ft-row")].map(r=>r.dataset.n));
    eq(keys.length,2,"שתי שורות");
    ok(keys[0]!==keys[1],"שני מפתחות שונים לשני תלמידים בעלי אותו שם");
    await typeVal(page,keys[0],33);
    const vals=await page.evaluate(()=>[...document.querySelectorAll("#ft-list .ft-row .vl")].map(v=>v.textContent.trim()));
    ok(vals[0].indexOf("33")>=0,"הראשון קיבל 33 — התקבל: «"+vals[0]+"»");
    eq(vals[1],"—","השני לא קיבל כלום");
    eq(await page.evaluate(()=>window.FT.results().length),1,"נשמרה מדידה אחת בלבד");
  }),

  check("מדידה חדשה נשמרת עם מזהה ולא רק עם שם",legacy(0),async page=>{
    await openTest(page,"ljump");
    const key=await page.evaluate(()=>document.querySelector("#ft-list .ft-row").dataset.n);
    await typeVal(page,key,25);
    const r=await page.evaluate(()=>window.FT.results().slice(-1)[0]);
    ok(r,"לא נשמרה מדידה");
    ok(r.sid,"המדידה נשמרה בלי מזהה תלמיד");
    eq(r.val,25,"והערך נכון");
  }),

  check("מחיקת מדידות היום לא נוגעת בתאריכים קודמים",legacy(4),async page=>{
    await openTest(page,"ljump");
    const key=await page.evaluate(()=>document.querySelector("#ft-list .ft-row").dataset.n);
    await typeVal(page,key,99);
    eq(await page.evaluate(()=>window.FT.results().length),5,"נוספה מדידה של היום");
    await page.evaluate(k=>document.querySelector('#ft-list [data-del="'+CSS.escape(k)+'"]').click(),key);
    await page.waitForTimeout(450);
    eq(await page.evaluate(()=>window.FT.results().length),4,"רק מדידת היום נמחקה");
  }),

  check("תלמיד שאינו ברשימה מסומן ולא נמחק",{
    "ft.roster":{"ט3":[{name:"דן אבירם"}]},
    "ft.results":[{id:"r1",d:"2026-09-02",ts:1,cls:"ט׳3",test:"ljump",name:"תלמיד שעזב",val:180,unit:"ס״מ"}],
    "pf.guideSeen":true},async page=>{
    const res=await page.evaluate(()=>window.HM.LS.get("ft.results",[]));
    eq(res.length,1,"הרשומה נשארה");
    eq(res[0].sidAmbig,"no-roster-match","ומסומנת כדורשת הכרעה");
    eq(res[0].sid,undefined,"ולא נוחשה לאף תלמיד");
  }),

  check("מונה חזרות שומר את המדידה על התלמיד הנכון",twins,async page=>{
    /* מבחן מסוג «מונה» לא עובר דרך שדה מספר אלא דרך +/− */
    await openTest(page,"push");
    const keys=await page.evaluate(()=>[...document.querySelectorAll("#ft-list .ft-row")].map(r=>r.dataset.n));
    await page.evaluate(k=>{
      const b=document.querySelector('#ft-list [data-inc="'+CSS.escape(k)+'"]');
      b.click(); b.click(); b.click();
    },keys[1]);
    await page.waitForTimeout(450);
    const res=await page.evaluate(()=>window.FT.results());
    eq(res.length,1,"מדידה אחת");
    eq(res[0].val,3,"שלוש חזרות");
    eq(res[0].sid,"b","נשמרה על התלמיד השני ולא על הראשון");
  }),

  /* גרסת הסכמה נלקחת מהקוד ולא ננעצת כאן: מכשיר «מעודכן» הוא
     מכשיר בגרסה הנוכחית, מה שהיא לא תהיה. */
  check("הסבה שכבר רצה לא רצה שוב",Object.assign(legacy(3),{"schema.version":D.SCHEMA_VERSION}),async page=>{
    const rep=await page.evaluate(()=>window.HM.migration());
    eq(rep.noop,true,"אין מה להסב במכשיר שכבר בגרסה הנוכחית");
    eq(rep.applied.length,0,"לא הוחלה אף מיגרציה");
  })

]};
