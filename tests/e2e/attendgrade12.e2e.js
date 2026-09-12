"use strict";
/* שלב 12 — «מלא לפי נוכחות». עוזר קריא/הפיך בטבלת הציונים, מעל
   tools.att הקיים ו-attendanceRateOf() (hm-data.js). לא דורס
   ציון קיים, לא ממציא נתון לתלמיד בלי נוכחות. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const X="c:ח:1";
const seed=extra=>Object.assign({
  "ft.classes":{[X]:{id:X,name:"ח׳1",grade:"ח",num:1,key:"ח1"}},
  "stu.list":[
    {id:"a",name:"אליס כהן",cls:"ח׳1",cid:X,sex:"girls",age:13,tests:[]},   /* נוכחות מלאה — 100% */
    {id:"b",name:"בוב לוי", cls:"ח1", cid:X,sex:"boys", age:13,tests:[]},   /* כבר יש ציון ידני — 60 */
    {id:"c",name:"גל שדה",  cls:"ח1", cid:X,sex:"boys", age:13,tests:[]}    /* אין נתוני נוכחות */
  ],
  "tools.att":{
    "2026-09-01|ח1":{a:"p",b:"p"},
    "2026-09-08|ח1":{a:"p",b:"a"}
  },
  "pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION
},extra||{});

const go=async(page,m,ms)=>{ await page.evaluate(x=>window.HM.go(x),m); await page.waitForTimeout(ms||800); };
const openGrades=async page=>{
  await go(page,"stu");
  await page.evaluate(()=>document.querySelector('.pf-tabs [data-st="grades"]').click());
  await page.waitForTimeout(400);
};
const partOf=(page,sid)=>page.evaluate(id=>{
  const tr=document.querySelector(`#gr-table tr[data-sid="${id}"]`);
  const inp=tr&&tr.querySelector('input[data-f="part"]');
  return inp?inp.value:null;
},sid);

module.exports={title:"שלב 12 — מילוי ציון לפי נוכחות",tests:[

  check("הכפתור קיים בלשונית הציונים",seed(),async page=>{
    await openGrades(page);
    ok(await page.evaluate(()=>!!document.getElementById("gr-fillAtt")),"הכפתור קיים");
    eq(await page.evaluate(()=>document.getElementById("gr-fillAtt").style.display),"","וגלוי — משקל ההשתתפות ברירת המחדל הוא 70");
  }),

  check("שדה ריק מתמלא מהנוכחות; ציון קיים לא נדרס; בלי נתון — נשאר ריק",seed(),async page=>{
    await openGrades(page);
    eq(await partOf(page,"a"),"","לפני המילוי — ריק");
    /* בוב מזין ציון ידני 60 לפני שהמורה לוחץ על הכפתור */
    await page.evaluate(()=>{
      const inp=document.querySelector('#gr-table tr[data-sid="b"] input[data-f="part"]');
      inp.value="60"; inp.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await page.waitForTimeout(300);
    await page.evaluate(()=>document.getElementById("gr-fillAtt").click());
    await page.waitForTimeout(400);
    eq(await partOf(page,"a"),"100","אליס: נוכחות מלאה בשני הימים");
    eq(await partOf(page,"b"),"60","בוב: הציון הידני נשאר — לא נדרס");
    eq(await partOf(page,"c"),"","גל: אין נתוני נוכחות — נשאר ריק, לא הומצא ערך");
    const toast=await page.evaluate(()=>document.getElementById("toastT").textContent);
    ok(toast.indexOf("נמלאו")>=0&&toast.indexOf("1")>=0,"מולא תלמיד אחד בלבד — התקבל: "+toast);
  }),

  check("הפעלה חוזרת לא משנה ערכים שכבר מולאו",seed(),async page=>{
    await openGrades(page);
    await page.evaluate(()=>document.getElementById("gr-fillAtt").click());
    await page.waitForTimeout(400);
    const before={a:await partOf(page,"a"),b:await partOf(page,"b"),c:await partOf(page,"c")};
    await page.evaluate(()=>document.getElementById("gr-fillAtt").click());
    await page.waitForTimeout(400);
    eq(await partOf(page,"a"),before.a); eq(await partOf(page,"b"),before.b); eq(await partOf(page,"c"),before.c);
    const toast=await page.evaluate(()=>document.getElementById("toastT").textContent);
    ok(toast.indexOf("אין שדות ריקים")>=0,"מודיע שאין מה למלא — התקבל: "+toast);
  }),

  check("כיתה מעורבת: תלמיד עם נוכחות מלאה, תלמיד עם ציון קיים, ותלמיד בלי נתון — כל אחד מטופל נכון בו-זמנית",seed(),async page=>{
    await openGrades(page);
    await page.evaluate(()=>{
      const inp=document.querySelector('#gr-table tr[data-sid="b"] input[data-f="part"]');
      inp.value="45"; inp.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await page.waitForTimeout(300);
    await page.evaluate(()=>document.getElementById("gr-fillAtt").click());
    await page.waitForTimeout(400);
    const rows={a:await partOf(page,"a"),b:await partOf(page,"b"),c:await partOf(page,"c")};
    eq(rows,{a:"100",b:"45",c:""});
  }),

  check("חישוב הציון הסופי ממשיך לעבוד אחרי המילוי",seed(),async page=>{
    await openGrades(page);
    await page.evaluate(()=>document.getElementById("gr-fillAtt").click());
    await page.waitForTimeout(400);
    const total=await page.evaluate(()=>{
      const tr=document.querySelector('#gr-table tr[data-sid="a"]');
      return tr.querySelector("td:last-child").textContent.trim();
    });
    /* משקל ברירת מחדל: part=70%. אליס 100 בהשתתפות ובלי שאר הרכיבים
       → 100*0.70 = 70.0, בלי בונוס */
    eq(total,"70.0");
  }),

  check("אין נתוני נוכחות לכיתה כלל: הכפתור לא ממציא כלום ומודיע בבירור",seed({"tools.att":{}}),async page=>{
    await openGrades(page);
    await page.evaluate(()=>document.getElementById("gr-fillAtt").click());
    await page.waitForTimeout(300);
    eq(await partOf(page,"a"),""); eq(await partOf(page,"b"),""); eq(await partOf(page,"c"),"");
    const toast=await page.evaluate(()=>document.getElementById("toastT").textContent);
    ok(toast.indexOf("אין שדות ריקים")>=0||toast.indexOf("נוכחות")>=0,"התקבל: "+toast);
  }),

  /* ---------- שינוי שם — רגרסיה ---------- */

  check("שינוי שם כיתה: אותו cid, אותם תלמידים ואותה נוכחות — אותה הצעת מילוי בדיוק",seed(),async page=>{
    await openGrades(page);
    await page.evaluate(()=>document.getElementById("btnSettings").click());
    await page.waitForTimeout(300);
    await page.evaluate(({cid,nm})=>{
      const s=document.getElementById("set-clsSel"); s.value=cid; s.dispatchEvent(new Event("change"));
      document.getElementById("set-clsNew").value=nm;
      document.getElementById("set-clsRename").click();
    },{cid:X,nm:"ח׳1 מצטיינים"});
    await page.waitForTimeout(500);
    const reg=await page.evaluate(()=>window.HM.LS.get("ft.classes",{}));
    eq(Object.keys(reg),[X]); eq(reg[X].name,"ח׳1 מצטיינים");
    await page.evaluate(()=>document.getElementById("gr-fillAtt").click());
    await page.waitForTimeout(400);
    eq(await partOf(page,"a"),"100","אותה הצעה — הנוכחות עדיין נפתרת לאותו cid אחרי שינוי השם");
    eq(await partOf(page,"c"),"","וגל עדיין בלי נתון");
    const att=await page.evaluate(()=>window.HM.LS.get("tools.att",{}));
    eq(Object.keys(att).length,2,"tools.att לא נגע");
  })

]};
