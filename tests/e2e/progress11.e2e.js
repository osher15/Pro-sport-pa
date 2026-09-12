"use strict";
/* שלב 11 — «תובנות התקדמות לכיתה». טבלה לפי מבחן, קריאה בלבד, מעל
   cid/הרישום הקיימים ומעל classCoverage()/progress() הקיימות. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const X="c:ח:1";
const seed=extra=>Object.assign({
  "ft.classes":{[X]:{id:X,name:"ח׳1",grade:"ח",num:1,key:"ח1"}},
  "ft.roster":{"ח1":[{id:"a",name:"אליס כהן",sex:"girls"},{id:"b",name:"בוב לוי",sex:"boys"},{id:"c",name:"גל שדה",sex:"boys"}]},
  "ft.results":[
    /* אליס: 20→26 בpush — משתפרת */
    {id:"r1",d:"2026-09-01",ts:1,cls:"ח׳1",cid:X,test:"push",name:"אליס כהן",sid:"a",val:20,unit:"חזרות",gradeKey:"ח",sex:"girls"},
    {id:"r2",d:"2026-09-15",ts:2,cls:"ח׳1",cid:X,test:"push",name:"אליס כהן",sid:"a",val:26,unit:"חזרות",gradeKey:"ח",sex:"girls"},
    /* בוב: 22→16 בpush — נסוג */
    {id:"r3",d:"2026-09-01",ts:3,cls:"ח׳1",cid:X,test:"push",name:"בוב לוי",sid:"b",val:22,unit:"חזרות",gradeKey:"ח",sex:"boys"},
    {id:"r4",d:"2026-09-15",ts:4,cls:"ח׳1",cid:X,test:"push",name:"בוב לוי",sid:"b",val:16,unit:"חזרות",gradeKey:"ח",sex:"boys"},
    /* גל: מדידה אחת בלבד — עדיין אין עם מה להשוות */
    {id:"r5",d:"2026-09-01",ts:5,cls:"ח׳1",cid:X,test:"push",name:"גל שדה",sid:"c",val:18,unit:"חזרות",gradeKey:"ח",sex:"boys"}
  ],
  "ft.last":{grade:"ח",num:1,sort:"name"},"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION
},extra||{});

const go=async(page,m,ms)=>{ await page.evaluate(x=>window.HM.go(x),m); await page.waitForTimeout(ms||800); };
const txt=(page,sel)=>page.evaluate(s=>{ const e=document.querySelector(s); return e?e.textContent.trim():null; },sel);
const openProg=async page=>{ await go(page,"ft"); await page.evaluate(()=>document.querySelector('#ft-tabs [data-ft="prog"]').click()); await page.waitForTimeout(400); };

module.exports={title:"שלב 11 — תובנות התקדמות לכיתה",tests:[

  check("הלשונית החדשה קיימת בבורר, לצד «מה חסר לכיתה»",seed(),async page=>{
    await go(page,"ft");
    const tabs=await page.evaluate(()=>[...document.querySelectorAll("#ft-tabs button")].map(b=>b.dataset.ft));
    eq(tabs,["tests","idx","ot","cov","prog"]);
  }),

  check("בחירת כיתה מציגה את טבלת התובנות עם השם מהרישום",seed(),async page=>{
    await openProg(page);
    eq(await page.evaluate(()=>document.getElementById("ft-prog").style.display),"");
    eq(await page.evaluate(()=>document.getElementById("ft-pick").style.display),"none");
    ok((await txt(page,"#ft-prog h2")).indexOf("ח׳1")>=0,"הכותרת מציגה את הכיתה");
  }),

  check("ערכים נכונים: שורה אחת (push), עם משתפר אחד, נסוג אחד, ובלי שינוי אחד",seed(),async page=>{
    await openProg(page);
    const rows=await page.evaluate(()=>[...document.querySelectorAll("#ft-prog tbody tr")].map(tr=>
      [...tr.children].map(td=>td.textContent.trim())));
    eq(rows.length,1,"רק push נמדד");
    const cells=rows[0];
    ok(cells[0].indexOf("שכיבות סמיכה")>=0,"שם המבחן מהקטלוג — "+cells[0]);
    eq(cells.slice(1),["3","1","1","1"],"נמדדו · משתפרים · נסוגים · בלי שינוי מדיד");
    const sum=await txt(page,"#ft-prog .ft-idxsum");
    ok(sum.indexOf("1")>=0,"הסיכום סופר שיפור אחד ונסיגה אחת — "+sum);
  }),

  check("כיתה בלי אף מדידה: הודעה נקייה, בלי טבלה",seed({"ft.results":[]}),async page=>{
    await openProg(page);
    const t=await txt(page,"#ft-prog");
    ok(t.indexOf("עדיין לא נמדד אף מבחן")>=0,"התקבל: "+t.replace(/\n/g," | "));
    eq(await page.evaluate(()=>document.querySelectorAll("#ft-prog table").length),0);
  }),

  check("כיתה בלי תלמידים ברשימה: הודעה נקייה, בלי קריסה",seed({"ft.roster":{}}),async page=>{
    await openProg(page);
    const t=await txt(page,"#ft-prog");
    ok(t.indexOf("אין תלמידים ברשימת כיתה")>=0,"התקבל: "+t.replace(/\n/g," | "));
  }),

  check("כל הכיתה משתפרת: שורה אחת, ללא נסוגים",seed({
    "ft.results":[
      {id:"r1",d:"2026-09-01",ts:1,cls:"ח׳1",cid:X,test:"push",name:"אליס כהן",sid:"a",val:10,unit:"חזרות"},
      {id:"r2",d:"2026-09-15",ts:2,cls:"ח׳1",cid:X,test:"push",name:"אליס כהן",sid:"a",val:15,unit:"חזרות"},
      {id:"r3",d:"2026-09-01",ts:3,cls:"ח׳1",cid:X,test:"push",name:"בוב לוי",sid:"b",val:10,unit:"חזרות"},
      {id:"r4",d:"2026-09-15",ts:4,cls:"ח׳1",cid:X,test:"push",name:"בוב לוי",sid:"b",val:14,unit:"חזרות"}
    ]}),async page=>{
    await openProg(page);
    const row=await page.evaluate(()=>[...document.querySelectorAll("#ft-prog tbody tr td")].map(td=>td.textContent.trim()));
    eq(row.slice(1),["2","2","0","0"]);
  }),

  check("כל הכיתה בלי שינוי מדיד (מדידה אחת לכולם)",seed({
    "ft.results":[
      {id:"r1",d:"2026-09-01",ts:1,cls:"ח׳1",cid:X,test:"push",name:"אליס כהן",sid:"a",val:10,unit:"חזרות"},
      {id:"r2",d:"2026-09-01",ts:2,cls:"ח׳1",cid:X,test:"push",name:"בוב לוי",sid:"b",val:12,unit:"חזרות"}
    ]}),async page=>{
    await openProg(page);
    const row=await page.evaluate(()=>[...document.querySelectorAll("#ft-prog tbody tr td")].map(td=>td.textContent.trim()));
    eq(row.slice(1),["2","0","0","2"]);
  }),

  /* ---------- שינוי שם — רגרסיה ---------- */

  check("שינוי שם כיתה: אותו cid ואותם תלמידים, השם המוצג מתעדכן, התובנות לא משתנות",seed(),async page=>{
    await openProg(page);
    const before=await page.evaluate(()=>[...document.querySelectorAll("#ft-prog tbody tr")].map(tr=>
      [...tr.children].map(td=>td.textContent.trim())));
    await page.evaluate(()=>document.getElementById("btnSettings").click());
    await page.waitForTimeout(300);
    await page.evaluate(({cid,nm})=>{
      const s=document.getElementById("set-clsSel"); s.value=cid; s.dispatchEvent(new Event("change"));
      document.getElementById("set-clsNew").value=nm;
      document.getElementById("set-clsRename").click();
    },{cid:X,nm:"ח׳1 מצטיינים"});
    await page.waitForTimeout(500);
    const st=await page.evaluate(()=>({
      reg:window.HM.LS.get("ft.classes",{}),
      res:window.HM.LS.get("ft.results",[]).map(r=>({sid:r.sid,val:r.val,cid:r.cid}))}));
    eq(Object.keys(st.reg),[X],"אותו מזהה, אין כיתה שנייה");
    eq(st.reg[X].name,"ח׳1 מצטיינים");
    ok(st.res.every(r=>r.cid===X),"כל המדידות עדיין על אותו cid, שום ערך לא נגע");
    ok((await txt(page,"#ft-prog h2")).indexOf("ח׳1 מצטיינים")>=0,"המסך שמתחת להגדרות צויר מחדש עם השם החדש");
    const after=await page.evaluate(()=>[...document.querySelectorAll("#ft-prog tbody tr")].map(tr=>
      [...tr.children].map(td=>td.textContent.trim())));
    eq(after,before,"אותה טבלת תובנות בדיוק — רק השם השתנה");
  })

]};
