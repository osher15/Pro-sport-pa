"use strict";
/* שלב 10 — «מה חסר לכיתה». מטריצת כיסוי קריאה בלבד מעל cid/הרישום
   הקיימים. אין כאן מנגנון זהות חדש — רק לשונית נוספת בבורר. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const X="c:ח:1";
const seed=extra=>Object.assign({
  "ft.classes":{[X]:{id:X,name:"ח׳1",grade:"ח",num:1,key:"ח1"}},
  "ft.roster":{"ח1":[{id:"a",name:"אליס כהן",sex:"girls"},{id:"b",name:"בוב לוי",sex:"boys"},{id:"c",name:"גל שדה",sex:"boys"}]},
  "ft.results":[
    {id:"r1",d:"2026-09-01",ts:1,cls:"ח׳1",cid:X,test:"push",name:"אליס כהן",sid:"a",val:20,unit:"חזרות",gradeKey:"ח",sex:"girls"},
    {id:"r2",d:"2026-09-01",ts:2,cls:"ח׳1",cid:X,test:"push",name:"בוב לוי",sid:"b",val:18,unit:"חזרות",gradeKey:"ח",sex:"boys"},
    {id:"r3",d:"2026-09-01",ts:3,cls:"ח׳1",cid:X,test:"r60", name:"אליס כהן",sid:"a",val:9.1,unit:"שנ׳",gradeKey:"ח",sex:"girls"}
  ],
  "ft.last":{grade:"ח",num:1,sort:"name"},"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION
},extra||{});

const go=async(page,m,ms)=>{ await page.evaluate(x=>window.HM.go(x),m); await page.waitForTimeout(ms||800); };
const txt=(page,sel)=>page.evaluate(s=>{ const e=document.querySelector(s); return e?e.textContent.trim():null; },sel);
const openCov=async page=>{ await go(page,"ft"); await page.evaluate(()=>document.querySelector('#ft-tabs [data-ft="cov"]').click()); await page.waitForTimeout(400); };

module.exports={title:"שלב 10 — מה חסר לכיתה",tests:[

  check("הלשונית זמינה מהבורר, והמסך פותח על הכיתה הנבחרת",seed(),async page=>{
    await go(page,"ft");
    ok(await page.evaluate(()=>!!document.querySelector('#ft-tabs [data-ft="cov"]')),"כפתור הלשונית קיים");
    await openCov(page);
    eq(await page.evaluate(()=>document.getElementById("ft-cov").style.display),"");
    eq(await page.evaluate(()=>document.getElementById("ft-pick").style.display),"none");
    ok((await txt(page,"#ft-cov h2")).indexOf("ח׳1")>=0,"הכותרת מציגה את הכיתה");
  }),

  check("התלמידים הנכונים ורק המבחנים שנמדדו — מטריצה נכונה",seed(),async page=>{
    await openCov(page);
    const headers=await page.evaluate(()=>[...document.querySelectorAll("#ft-cov thead th")].map(x=>x.textContent));
    eq(headers.length,3,"שם + שני מבחנים (r60, push, בסדר הקטלוג) — לא כל 30 המבחנים: "+headers.join(" | "));
    const rows=await page.evaluate(()=>[...document.querySelectorAll("#ft-cov tbody tr")].map(tr=>
      [...tr.children].map(td=>td.textContent.trim())));
    eq(rows.length,3,"שלושת תלמידי הכיתה");
    const byName=n=>rows.find(r=>r[0]===n);
    /* סדר העמודות הוא סדר הקטלוג ב-TESTS: r60 (ריצות) לפני push (חזרות) */
    eq(byName("אליס כהן"),["אליס כהן","✓","✓"],"נמדדה גם ב-r60 וגם ב-push");
    eq(byName("בוב לוי"),["בוב לוי","✕","✓"],"push בלבד — r60 חסר");
    eq(byName("גל שדה"),["גל שדה","✕","✕"]);
  }),

  check("הסיכום למעלה סופר נכון",seed(),async page=>{
    await openCov(page);
    const sum=await txt(page,"#ft-cov .ft-idxsum");
    ok(sum.indexOf("3")>=0,"3 תלמידים — "+sum);
    ok(sum.indexOf("2")>=0,"2 מבחנים במעקב — "+sum);
    ok(sum.indexOf("1/3")>=0,"תלמיד אחד השלים הכול — "+sum);
  }),

  check("המסך קריאה בלבד — לחיצה על תא לא משנה נתונים",seed(),async page=>{
    await openCov(page);
    const before=await page.evaluate(()=>window.HM.LS.get("ft.results",[]).length);
    await page.evaluate(()=>document.querySelector("#ft-cov tbody td.mono").click());
    await page.waitForTimeout(200);
    eq(await page.evaluate(()=>window.HM.LS.get("ft.results",[]).length),before,"שום מדידה לא נוספה או השתנתה");
  }),

  /* ---------- מצבי קצה ---------- */

  check("כיתה בלי תלמידים: הודעה נקייה, בלי קריסה",seed({"ft.roster":{}}),async page=>{
    await openCov(page);
    const t=await txt(page,"#ft-cov");
    ok(t.indexOf("אין תלמידים ברשימת כיתה")>=0,"התקבל: "+t.replace(/\n/g," | "));
  }),

  check("כיתה בלי אף מדידה: הודעה שמסבירה למה אין נתונים",seed({"ft.results":[]}),async page=>{
    await openCov(page);
    const t=await txt(page,"#ft-cov");
    ok(t.indexOf("עדיין לא נמדד אף מבחן")>=0,"התקבל: "+t.replace(/\n/g," | "));
    eq(await page.evaluate(()=>document.querySelectorAll("#ft-cov table").length),0,"אין טבלה ריקה");
  }),

  check("כולם השלימו הכול: ההודעה החיובית מופיעה",seed({
    "ft.results":[
      {id:"r1",d:"2026-09-01",ts:1,cls:"ח׳1",cid:X,test:"push",name:"אליס כהן",sid:"a",val:20,unit:"חזרות"},
      {id:"r2",d:"2026-09-01",ts:2,cls:"ח׳1",cid:X,test:"push",name:"בוב לוי",sid:"b",val:18,unit:"חזרות"},
      {id:"r3",d:"2026-09-01",ts:3,cls:"ח׳1",cid:X,test:"push",name:"גל שדה",sid:"c",val:15,unit:"חזרות"}
    ]}),async page=>{
    await openCov(page);
    const t=await txt(page,"#ft-cov");
    ok(t.indexOf("כל התלמידים השלימו")>=0,"התקבל: "+t.replace(/\n/g," | "));
    const cells=await page.evaluate(()=>[...document.querySelectorAll("#ft-cov tbody td.mono")].map(x=>x.textContent.trim()));
    ok(cells.every(x=>x==="✓"),"כל התאים ✓");
  }),

  check("כולם חסרים הכול: הרשת מציגה ✕ בעקביות, בלי הודעת קריסה",seed({
    "ft.roster":{"ח1":[{id:"a",name:"אליס כהן",sex:"girls"}]},
    "ft.results":[{id:"r1",d:"2026-09-01",ts:1,cls:"ח׳1",cid:X,test:"push",name:"בוב לוי",sid:"b",val:18,unit:"חזרות"}]
  }),async page=>{
    await openCov(page);
    const cells=await page.evaluate(()=>[...document.querySelectorAll("#ft-cov tbody td.mono")].map(x=>x.textContent.trim()));
    eq(cells,["✕"]);
  }),

  /* ---------- שינוי שם — רגרסיה ---------- */

  check("שינוי שם כיתה: אותו cid ואותם תלמידים, השם המוצג מתעדכן, הכיסוי לא משתנה",seed(),async page=>{
    await openCov(page);
    const before=await page.evaluate(()=>[...document.querySelectorAll("#ft-cov tbody tr")].map(tr=>
      [...tr.children].map(td=>td.textContent.trim())));
    /* שינוי שם דרך הממשק הקיים (הגדרות → שמות הכיתות) */
    await page.evaluate(()=>document.getElementById("btnSettings").click());
    await page.waitForTimeout(300);
    await page.evaluate(({cid,nm})=>{
      const s=document.getElementById("set-clsSel"); s.value=cid; s.dispatchEvent(new Event("change"));
      document.getElementById("set-clsNew").value=nm;
      document.getElementById("set-clsRename").click();
    },{cid:X,nm:"ח׳1 מצטיינים"});
    await page.waitForTimeout(500);
    const st=await page.evaluate(()=>({
      reg:window.HM.LS.get("ft.classes",{}), stu:window.HM.LS.get("stu.list",[]).length,
      roster:Object.keys(window.HM.LS.get("ft.roster",{}))}));
    eq(Object.keys(st.reg),[X],"אותו מזהה, אין כיתה שנייה");
    eq(st.reg[X].name,"ח׳1 מצטיינים");
    eq(st.roster,["ח1"],"מפתח הרשימה לא זז");
    ok((await txt(page,"#ft-cov h2")).indexOf("ח׳1 מצטיינים")>=0,"המסך שמתחת להגדרות צויר מחדש עם השם החדש");
    const after=await page.evaluate(()=>[...document.querySelectorAll("#ft-cov tbody tr")].map(tr=>
      [...tr.children].map(td=>td.textContent.trim())));
    eq(after,before,"אותם תלמידים, אותו כיסוי — רק השם השתנה");
  })

]};
