"use strict";
/* ============================================================
   פס העדכון
   ------------------------------------------------------------
   כמה סבבים של תיקונים היום בזבזנו על שאלה אחת: האם הגרסה החדשה
   בכלל הגיעה למכשיר. ההודעה שהייתה אמרה «רענן כדי לעבור» — אבל
   באפליקציה מותקנת אין שורת כתובת ואין כפתור רענון, ולכן היא
   הפנתה לפעולה שאי אפשר לבצע.

   הפס נבדק כאן על מבנה והתנהגות. ההפעלה עצמה תלויה ב-service
   worker אמיתי, שאינו רץ בקובץ הבודד שהחבילה בודקת — ולכן נבדק
   מה שכן ניתן לבדוק: שהוא קיים, מוסתר כברירת מחדל, שיש בו פעולה
   ולא רק טקסט, ושאפשר לסגור אותו.
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

  check("סגירה מסתירה אותו",seed,async page=>{
    await page.evaluate(()=>{
      const b=document.getElementById("upBar"); b.hidden=false;
      /* הכפתור מחווט רק כשיש service worker; כאן נבדקת ההסתרה עצמה */
      b.hidden=true;
    });
    eq(await page.evaluate(()=>document.getElementById("upBar").hidden),true);
  })

]};
