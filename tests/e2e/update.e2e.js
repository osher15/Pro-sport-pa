"use strict";
/* ============================================================
   פס העדכון
   ------------------------------------------------------------
   כמה סבבים של תיקונים היום בזבזנו על שאלה אחת: האם הגרסה החדשה
   בכלל הגיעה למכשיר. ההודעה שהייתה אמרה «רענן כדי לעבור» — אבל
   באפליקציה מותקנת אין שורת כתובת ואין כפתור רענון, ולכן היא
   הפנתה לפעולה שאי אפשר לבצע.

   הפס נבדק כאן על מבנה והתנהגות. ההפעלה עצמה תלויה ב-service
   worker אמיתי, שאינו רץ בקובץ הבודד שהחבילה בודקת — ולכן ההחלטה
   «להציע או לא» הוצאה לפונקציה אחת, upOffer(version), והיא נבדקת
   כאן ישירות.

   ההחלטה הזאת היא הלב: בגרסה הקודמת הפס הופיע על כל סרוויס־וורקר
   חדש שהותקן, גם כשהדף שכבר מוצג הוא בדיוק אותה גרסה. אז «רענן
   עכשיו» לא שינה כלום, הפס חזר בטעינה הבאה, והמורה נשאר עם באנר
   שאי אפשר להיפטר ממנו — זה קרה בשטח.
   ============================================================ */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const seed={"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION};

module.exports={title:"פס העדכון",tests:[

  check("הפס קיים ומוסתר כשאין עדכון",seed,async page=>{
    const r=await page.evaluate(()=>{
      const b=document.getElementById("upBar");
      return b?{hidden:b.hidden,txt:b.textContent}:null;
    });
    ok(r,"הפס קיים ב-DOM");
    eq(r.hidden,true,"ולא מציג את עצמו כשאין מה לעדכן");
  }),

  check("יש בו פעולה, לא רק הנחיה",seed,async page=>{
    const r=await page.evaluate(()=>{
      const now=document.getElementById("upNow"), x=document.getElementById("upX");
      return {now:!!now,nowTxt:now?now.textContent.trim():null,close:!!x};
    });
    ok(r.now,"כפתור שמבצע את הרענון בעצמו");
    ok(r.nowTxt&&r.nowTxt.length>0,"עם כיתוב: "+r.nowTxt);
    ok(r.close,"ואפשרות לדחות — עדכון באמצע מדידה הוא לא רגע טוב");
  }),

  /* הבדיקה הזאת ביקשה קודם position:sticky על הפס עצמו — וזה בדיוק
     מה שלא עבד: הפס ישב מחוץ ל-.app בסוף המסמך, ולכן sticky שלו לא
     הדביק אותו לשום מקום והוא רונדר מתחת למסך. הערובה האמיתית היא
     לא שם התכונה אלא התוצאה: הוא נראה, בראש, ומעל התוכן. */
  check("כשהוא מוצג הוא יושב בראש המסך ומעל התוכן",seed,async page=>{
    const r=await page.evaluate(()=>{
      const b=document.getElementById("upBar");
      b.hidden=false;
      const head=b.closest(".apphead");
      const cs=getComputedStyle(b), rect=b.getBoundingClientRect();
      return {display:cs.display,w:Math.round(rect.width),
        top:Math.round(rect.top),
        seen:rect.top<window.innerHeight&&rect.bottom>0,
        inHead:!!head,
        headPos:head?getComputedStyle(head).position:null,
        headZ:head?(+getComputedStyle(head).zIndex||0):0};
    });
    ok(r.display!=="none","נראה כשמסירים את ההסתרה");
    ok(r.seen,"ובאמת בתוך המסך — top="+r.top);
    ok(r.top<200,"וקרוב לראש — top="+r.top);
    ok(r.inHead,"הוא חי בראש האפליקציה");
    eq(r.headPos,"sticky","שנשאר בראש המסך גם בגלילה");
    ok(r.headZ>=100,"ומעל שאר הממשק — z="+r.headZ);
    ok(r.w>100,"ותופס רוחב אמיתי: "+r.w);
  }),

  /* ---------- ההחלטה: להציע או לשתוק ---------- */

  check("לדף יש חותמת בנייה — בלעדיה אין לו דרך לדעת אם הוא מעודכן",seed,async page=>{
    const b=await page.evaluate(()=>window.HM.pageBuild());
    ok(b&&/^[0-9a-f]{6,}$/.test(b),"חותמת: "+JSON.stringify(b));
  }),

  check("אותה גרסה אינה «גרסה חדשה» — והפס לא מופיע",seed,async page=>{
    const r=await page.evaluate(()=>({
      offered:window.HM.upOffer(window.HM.pageBuild()),
      hidden:document.getElementById("upBar").hidden
    }));
    eq(r.offered,false,"אין מה להציע");
    eq(r.hidden,true,"והפס נשאר סגור — זה הבאג שהיה");
  }),

  check("גרסה שאינה ידועה אינה מולידה הצעה — עדיף לשתוק מלשקר",seed,async page=>{
    const r=await page.evaluate(()=>({
      empty:window.HM.upOffer(""),
      undef:window.HM.upOffer(undefined),
      hidden:document.getElementById("upBar").hidden
    }));
    eq(r.empty,false); eq(r.undef,false);
    eq(r.hidden,true);
  }),

  check("גרסה אחרת כן מופיעה — זו כל מטרת הפס",seed,async page=>{
    const r=await page.evaluate(()=>({
      offered:window.HM.upOffer("deadbeef"),
      hidden:document.getElementById("upBar").hidden
    }));
    eq(r.offered,true);
    eq(r.hidden,false,"הפס נפתח");
  }),

  check("«אחר כך» סוגר — ולא חוזר על אותה גרסה",seed,async page=>{
    const r=await page.evaluate(()=>{
      window.HM.upOffer("deadbeef");
      document.getElementById("upX").click();
      const afterClose=document.getElementById("upBar").hidden;
      const again=window.HM.upOffer("deadbeef");
      return {afterClose,again,hidden:document.getElementById("upBar").hidden,
        seen:window.HM.LS.get("up.seen","")};
    });
    eq(r.afterClose,true,"ההקשה על ✕ סוגרת");
    eq(r.again,false,"ואותה גרסה לא מציעה את עצמה שוב");
    eq(r.hidden,true,"הפס נשאר סגור");
    eq(r.seen,"deadbeef","הדחייה נזכרת לגרסה הזאת בלבד");
  }),

  check("דחייה של גרסה אחת אינה משתיקה את הבאה",seed,async page=>{
    const r=await page.evaluate(()=>{
      window.HM.upOffer("deadbeef");
      document.getElementById("upX").click();
      return {next:window.HM.upOffer("f00dfeed"),
        hidden:document.getElementById("upBar").hidden};
    });
    eq(r.next,true,"גרסה חדשה באמת — מציעים שוב");
    eq(r.hidden,false);
  }),

  check("הדחייה נשמרת ברענון — לא חוזרת בכל פתיחה",seed,async page=>{
    await page.evaluate(()=>{
      window.HM.upOffer("deadbeef");
      document.getElementById("upX").click();
    });
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForTimeout(900);
    const r=await page.evaluate(()=>({
      again:window.HM.upOffer("deadbeef"),
      hidden:document.getElementById("upBar").hidden
    }));
    eq(r.again,false);
    eq(r.hidden,true);
  }),

  check("«רענן עכשיו» מחווט לפעולה, לא לטקסט",seed,async page=>{
    const wired=await page.evaluate(()=>{
      window.HM.upOffer("deadbeef");
      return typeof document.getElementById("upNow").onclick==="function";
    });
    eq(wired,true);
  }),

  check("הפס אומר איזו גרסה רצה ואיזו מוכנה",seed,async page=>{
    const r=await page.evaluate(()=>{
      window.HM.upOffer("deadbeef");
      const v=document.getElementById("upVer");
      return {txt:v?v.textContent.trim():null,mine:window.HM.pageBuild()};
    });
    ok(r.txt&&r.txt.indexOf("→")>0,"שתי חותמות עם חץ ביניהן: "+r.txt);
    ok(r.txt.indexOf(r.mine.slice(0,6))===0,"הראשונה היא מה שרץ כאן: "+r.txt);
    ok(/deadbe/.test(r.txt),"והשנייה היא מה שמוכן: "+r.txt);
  }),

  /* הבאג שחזר פעמיים: הפס נפתח, המורה הקיש «רענן עכשיו», הדף נטען
     מחדש — וחזר בדיוק אותו דף עם אותו פס. טעינה מחדש עוברת דרך
     מטמון ה-HTTP, וכתובת זהה יכולה לקבל תשובה זהה. */
  check("«רענן עכשיו» טוען כתובת שהמטמון לא יכול לענות עליה",seed,async page=>{
    const url=await page.evaluate(()=>new Promise(res=>{
      const orig=window.location.replace.bind(window.location);
      try{ Object.defineProperty(window.location,"replace",{configurable:true,value:u=>res(u)}); }
      catch(e){ return res("BLOCKED"); }
      window.HM.upOffer("deadbeef");
      document.getElementById("upNow").click();
      setTimeout(()=>res("NO-CALL"),2500);
    }));
    ok(url!=="NO-CALL","הכפתור באמת טוען מחדש");
    if(url!=="BLOCKED")ok(/[?&]hmv=/.test(url),"עם פרמטר שמבטיח כתובת חדשה: "+url);
  }),

  /* ---------- שסתום הביטחון ---------- */

  check("בהגדרות יש דרך ידנית למשוך גרסה עדכנית",seed,async page=>{
    const r=await page.evaluate(()=>{
      const b=document.getElementById("set-forceUpdate");
      return b?{txt:b.textContent.trim(),inSettings:!!b.closest("#setModal")}:null;
    });
    ok(r,"הכפתור קיים");
    ok(r.inSettings,"ובתוך ההגדרות");
    ok(/גרסה/.test(r.txt),"עם כיתוב שאומר מה הוא עושה: "+r.txt);
  }),

  check("משיכת גרסה אינה נוגעת בנתונים — רק במטמון הקבצים",
    Object.assign({},seed,{"ft.results":[{sid:"a",name:"דן",cid:"c:ט:3",cls:"ט׳3",
      test:"push",val:41,d:"2026-09-06"}],"stu.list":[{id:"a",name:"דן",cls:"ט׳3"}]}),
    async page=>{
    const r=await page.evaluate(async()=>{
      /* הניקוי עצמו, בלי הטעינה מחדש שבאה אחריו — זה מה שנבדק כאן */
      const out=await window.HM.clearShell();
      return {out,res:window.HM.LS.get("ft.results",[]).length,
        stu:window.HM.LS.get("stu.list",[]).length};
    });
    ok(r.out&&typeof r.out.caches==="number","הניקוי דיווח מה עשה: "+JSON.stringify(r.out));
    eq(r.res,1,"המדידה שרדה");
    eq(r.stu,1,"והתלמיד גם");
  }),

  check("פס שנפתח בטעות נסגר מעצמו כשמתברר שאין מה לעדכן",seed,async page=>{
    const r=await page.evaluate(()=>{
      window.HM.upOffer("deadbeef");
      const opened=!document.getElementById("upBar").hidden;
      /* עכשיו מגיעה התשובה האמיתית: זו בדיוק הגרסה שרצה כאן */
      const again=window.HM.upOffer(window.HM.pageBuild());
      return {opened,again,hidden:document.getElementById("upBar").hidden};
    });
    eq(r.opened,true,"נפתח");
    eq(r.again,false);
    eq(r.hidden,true,"ונסגר בלי שאיש נגע בו — לא נשאר תקוע");
  })

]};
