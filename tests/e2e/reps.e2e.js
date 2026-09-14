"use strict";
/* ============================================================
   מספר החזרות — הקלדה במקום שישים הקשות
   ------------------------------------------------------------
   מבחני הכוח נמדדים במונה: «+» לכל חזרה. זה נכון כשסופרים תוך כדי
   שהתלמיד עובד — וחסר תועלת כשהמורה כבר יודע שהוא עשה 60, ונאלץ
   ללחוץ שישים פעם כדי לרשום את זה.

   המספר הוא עכשיו שדה. «+» ו«−» לא הוסרו — הם עדיין הדרך לספור
   חי, והבדיקות כאן מגנות על שניהם ביחד: שהשדה שומר, שהמונה ממשיך
   ממה שהוקלד, ושמה שנכנס לאחסון הוא תמיד מספר.
   ============================================================ */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const seed={
  "ft.classes":{"c:ט:3":{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"}},
  "ft.roster":{"ט3":[{id:"a",name:"דן אבירם",sex:"boys"},
                     {id:"b",name:"רון לוי",sex:"boys"},
                     {id:"c",name:"עדי כהן",sex:"boys"}]},
  "ft.last":{grade:"ט",num:3},"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION
};
/* פותח מבחן חזרות אמיתי — שכיבות סמיכה */
const openPush=async page=>{
  await page.evaluate(()=>window.HM.go("ft"));
  await page.waitForTimeout(700);
  await page.evaluate(()=>document.querySelector('[data-t="push"]').click());
  await page.waitForTimeout(450);
};
const results=page=>page.evaluate(()=>window.HM.LS.get("ft.results",[]));
const fieldOf=i=>'#ft-list [data-cnt]>>nth='+i;

module.exports={title:"מספר החזרות",tests:[

  check("למונה יש שדה, לא רק «+»",seed,async page=>{
    await openPush(page);
    const r=await page.evaluate(()=>{
      const st=document.querySelector("#ft-list .ft-step");
      return {inputs:st.querySelectorAll("input[data-cnt]").length,
        plus:!!st.querySelector("[data-inc]"), minus:!!st.querySelector("[data-dec]"),
        mode:st.querySelector("input[data-cnt]").getAttribute("inputmode"),
        type:st.querySelector("input[data-cnt]").getAttribute("type")};
    });
    eq(r.inputs,1,"שדה אחד בשורה");
    ok(r.plus&&r.minus,"«+» ו«−» לא הוסרו — הם הדרך לספור חי");
    eq(r.mode,"numeric","מקלדת מספרים בטלפון");
    eq(r.type,"text","ולא number — number מחזיר ריק באמצע הקלדה");
  }),

  check("הקלדת 60 נשמרת כ-60 — פעולה אחת ולא שישים",seed,async page=>{
    await openPush(page);
    await page.click(fieldOf(0));
    await page.keyboard.type("60");
    await page.waitForTimeout(800);
    const rs=await results(page);
    eq(rs.length,1,"מדידה אחת");
    eq(rs[0].val,60);
    eq(rs[0].test,"push");
    eq(rs[0].sid,"a","ועל התלמיד הנכון");
  }),

  check("«+» ממשיך מהמספר שהוקלד ולא מאפס אותו",seed,async page=>{
    await openPush(page);
    await page.click(fieldOf(0));
    await page.keyboard.type("60");
    await page.waitForTimeout(800);
    await page.evaluate(()=>document.querySelector("#ft-list [data-inc]").click());
    await page.waitForTimeout(300);
    const rs=await results(page);
    eq(rs.filter(r=>r.sid==="a").length,1,"אותו ניסיון, לא ניסיון שני");
    eq(rs.find(r=>r.sid==="a").val,61);
  }),

  check("«−» עדיין עובד אחרי הקלדה",seed,async page=>{
    await openPush(page);
    await page.click(fieldOf(0));
    await page.keyboard.type("12");
    await page.waitForTimeout(800);
    await page.evaluate(()=>document.querySelector("#ft-list [data-dec]").click());
    await page.waitForTimeout(300);
    eq((await results(page)).find(r=>r.sid==="a").val,11);
  }),

  check("מה שאינו ספרה לא נכנס — לא לשדה ולא לאחסון",seed,async page=>{
    await openPush(page);
    await page.click(fieldOf(0));
    await page.keyboard.type("4a!2");
    await page.waitForTimeout(800);
    eq(await page.evaluate(()=>document.querySelector("#ft-list [data-cnt]").value),"42");
    const rs=await results(page);
    eq(rs[0].val,42);
    ok(typeof rs[0].val==="number","נשמר כמספר ולא כמחרוזת");
  }),

  check("הקלדה אינה נמחקת תוך כדי — השדה שבמיקוד לא נדרס",seed,async page=>{
    await openPush(page);
    await page.click(fieldOf(0));
    await page.keyboard.type("6");
    /* ההשהיה שומרת ומציירת מחדש; האצבע עדיין בשדה */
    await page.waitForTimeout(800);
    await page.keyboard.type("0");
    await page.waitForTimeout(800);
    eq(await page.evaluate(()=>document.querySelector("#ft-list [data-cnt]").value),"60",
      "הספרה הראשונה שרדה את הציור מחדש");
    eq((await results(page)).find(r=>r.sid==="a").val,60);
  }),

  check("Enter עובר לתלמיד הבא",seed,async page=>{
    await openPush(page);
    await page.click(fieldOf(0));
    await page.keyboard.type("30");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    const who=await page.evaluate(()=>{
      const a=document.activeElement;
      return a&&a.dataset?a.dataset.cnt||null:null;
    });
    eq(who,"id:b","המיקוד עבר לשדה של התלמיד הבא");
    await page.keyboard.type("25");
    await page.waitForTimeout(800);
    const rs=await results(page);
    eq(rs.length,2,"שתי מדידות, בלי לחפש את השדה הבא");
    eq(rs.find(r=>r.sid==="b").val,25);
  }),

  check("מחיקת המספר מסירה את המדידה ולא שומרת אפס",seed,async page=>{
    await openPush(page);
    await page.click(fieldOf(0));
    await page.keyboard.type("20");
    await page.waitForTimeout(800);
    eq((await results(page)).length,1);
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(800);
    eq((await results(page)).length,0,"אפס חזרות אינו מדידה — הוא היעדר מדידה");
  }),

  check("מיקוד בוחר את הקיים, כדי שהקלדה תחליף ולא תיצמד",seed,async page=>{
    await openPush(page);
    await page.click(fieldOf(0));
    await page.keyboard.type("40");
    await page.waitForTimeout(800);
    await page.evaluate(()=>document.querySelector("#ft-list [data-cnt]").blur());
    await page.click(fieldOf(0));
    await page.keyboard.type("7");
    await page.waitForTimeout(800);
    eq((await results(page)).find(r=>r.sid==="a").val,7,"7 ולא 407");
  }),

  /* לפי תלמיד ולא לפי מיקום: הרשימה ממוינת «שלא נמדדו קודם», ולכן
     מי שנמדד יורד למטה. בדיקה שנשענת על השורה הראשונה בודקת את
     המיון, לא את השדה. */
  check("השדה מציג את מה שנשמר כשחוזרים למסך",seed,async page=>{
    await openPush(page);
    await page.click(fieldOf(0));
    await page.keyboard.type("55");
    await page.waitForTimeout(800);
    await page.evaluate(()=>window.HM.go("home"));
    await page.waitForTimeout(400);
    await openPush(page);
    const r=await page.evaluate(()=>{
      const f=document.querySelector('#ft-list [data-cnt="id:a"]');
      const row=f?f.closest(".ft-row"):null;
      return {val:f?f.value:null,name:row?row.dataset.nm:null,
        shown:row?row.querySelector(".vl").textContent.trim():null};
    });
    eq(r.name,"דן אבירם","נמצא התלמיד שנמדד");
    eq(r.val,"55","והשדה שלו מציג את מה שנשמר");
    ok(/55/.test(r.shown),"וגם עמודת התוצאה: "+r.shown);
  }),

  /* ---------- קפיצות של חמש ---------- */

  check("יש קפיצה של 5 לשני הכיוונים, לצד ההקשה הבודדת",seed,async page=>{
    await openPush(page);
    const r=await page.evaluate(()=>{
      const st=document.querySelector("#ft-list .ft-step");
      return {inc1:!!st.querySelector("[data-inc]"),dec1:!!st.querySelector("[data-dec]"),
        inc5:!!st.querySelector("[data-inc5]"),dec5:!!st.querySelector("[data-dec5]"),
        txt:st.textContent.replace(/\s+/g,"")};
    });
    ok(r.inc1&&r.dec1,"«+» ו«−» לא הוסרו — הם הדרך לספור חי");
    ok(r.inc5&&r.dec5,"ולצידם ±5: "+r.txt);
  }),

  check("שתים־עשרה הקשות על +5 מגיעות ל-60",seed,async page=>{
    await openPush(page);
    for(let i=0;i<12;i++){
      await page.evaluate(()=>document.querySelector('#ft-list [data-inc5]').click());
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(400);
    const rs=await results(page);
    eq(rs.length,1);
    eq(rs[0].val,60);
    eq(rs[0].sid,"a");
  }),

  check("−5 יורד בחמש, ולא מתחת לאפס",seed,async page=>{
    await openPush(page);
    await page.evaluate(()=>document.querySelector('#ft-list [data-inc5]').click());
    await page.waitForTimeout(250);
    await page.evaluate(()=>document.querySelector('#ft-list [data-dec5]').click());
    await page.waitForTimeout(350);
    const rs=await results(page);
    eq(rs.length,0,"ירידה לאפס מסירה את המדידה — לא שומרת אפס");
  }),

  check("+5 ממשיך ממה שהוקלד, ולא מאפס",seed,async page=>{
    await openPush(page);
    await page.click(fieldOf(0));
    await page.keyboard.type("42");
    await page.waitForTimeout(750);
    await page.evaluate(()=>document.querySelector('#ft-list [data-inc5]').click());
    await page.waitForTimeout(400);
    const rs=await results(page);
    eq(rs.length,1);
    eq(rs[0].val,47,"42 ועוד 5");
  }),

  check("השדה נראה כמו שדה — אחרת ממשיכים להקיש «+»",seed,async page=>{
    await openPush(page);
    const cs=await page.evaluate(()=>{
      const i=document.querySelector("#ft-list .ft-step .cnt");
      const s=getComputedStyle(i);
      return {w:s.borderTopWidth,style:s.borderTopStyle};
    });
    ok(parseFloat(cs.w)>0&&cs.style!=="none","למספר יש מסגרת: "+JSON.stringify(cs));
  })

]};
