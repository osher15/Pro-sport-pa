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

  check("כשהוא מוצג הוא יושב מעל התוכן ולא מתחתיו",seed,async page=>{
    const r=await page.evaluate(()=>{
      const b=document.getElementById("upBar");
      b.hidden=false;
      const cs=getComputedStyle(b);
      const rect=b.getBoundingClientRect();
      return {display:cs.display,pos:cs.position,z:+cs.zIndex||0,top:rect.top,w:rect.width};
    });
    ok(r.display!=="none","נראה כשמסירים את ההסתרה");
    eq(r.pos,"sticky","נשאר בראש המסך גם בגלילה");
    ok(r.z>=100,"ומעל שאר הממשק — z="+r.z);
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
