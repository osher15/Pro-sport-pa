"use strict";
/* ============================================================
   פוטו־פיניש — שכבת התזמון
   ------------------------------------------------------------
   שלוש טענות נבדקות כאן, ולא רק «הקוד רץ»:
   1. אינטרפולציית תת-פריים מחזירה זמן בין שני הפריימים, ולא את
      אחד מהם.
   2. היא באמת מדויקת יותר מהתנהגות הקודמת — נמדד מול זמן חציה
      ידוע מראש, ולא מוצהר.
   3. קלט מנוון (אין פריים קודם, האות יורד, סף שכבר עבר) לא מייצר
      NaN, זמן שלילי או קפיצה אחורה.
   ============================================================ */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const seed={"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION};
const openPf=async page=>{ await page.evaluate(()=>window.HM.go("photo")); await page.waitForTimeout(700); };
const T=(page,fn,arg)=>page.evaluate(({f,a})=>{
  return Function("T","a","return ("+f+")(T,a)")(window.PF._test,a);
},{f:fn.toString(),a:arg===undefined?null:arg});

module.exports={title:"פוטו־פיניש — תזמון",tests:[

  check("האינטרפולציה נופלת בין שני הפריימים, לא עליהם",seed,async page=>{
    await openPf(page);
    /* הפריים הקודם היה 0.02, הנוכחי 0.06, הסף 0.03 —
       החציה ברבע הראשון של המרווח */
    const t=await T(page,(T)=>T.crossAt(0.02,10.000,0.06,10.040,0.03));
    ok(t>10.000&&t<10.040,"התקבל "+t);
    ok(Math.abs(t-10.010)<1e-6,"רבע מהמרווח — התקבל "+t);
  }),

  check("קצוות: סף על הפריים הקודם בדיוק, וסף על הנוכחי בדיוק",seed,async page=>{
    await openPf(page);
    eq(await T(page,(T)=>T.crossAt(0.02,5.000,0.10,5.040,0.02)),5.000,"סף שווה לקודם — הקודם");
    eq(await T(page,(T)=>T.crossAt(0.00,5.000,0.04,5.040,0.04)),5.040,"סף שווה לנוכחי — הנוכחי");
  }),

  check("האינטרפולציה מדויקת יותר מרישום הפריים — נמדד מול חציה ידועה",seed,async page=>{
    await openPf(page);
    /* מדמים 30fps ומעבר אמיתי ב-t=10.0247, כלומר 62% לתוך המרווח
       בין הפריים ב-10.0000 לפריים ב-10.0333. האות עולה לינארית
       מ-0.01 ל-0.05 והסף הוא 0.03. */
    const r=await T(page,(T)=>{
      const f0=10.0000,f1=10.0333,th=0.03;
      const prevFrac=0.01,frac=0.05;
      const truth=f0+(th-prevFrac)/(frac-prevFrac)*(f1-f0);
      const interp=T.crossAt(prevFrac,f0,frac,f1,th);
      return {truth,interp,naive:f1,
        errInterp:Math.abs(interp-truth),errNaive:Math.abs(f1-truth)};
    });
    ok(r.errInterp<r.errNaive,"אינטרפולציה "+r.errInterp+" מול רישום פריים "+r.errNaive);
    ok(r.errNaive>0.010,"ההתנהגות הקודמת אכן שוגה ביותר מ-10 מילישניות: "+r.errNaive);
    ok(r.errInterp<0.0005,"והחדשה מתכנסת לזמן האמיתי: "+r.errInterp);
  }),

  check("קלט מנוון אינו מייצר NaN, שלילי או קפיצה אחורה",seed,async page=>{
    await openPf(page);
    const r=await T(page,(T)=>({
      noPrev:T.crossAt(0,0,0.06,10.04,0.03),
      falling:T.crossAt(0.09,10.00,0.04,10.04,0.03),
      already:T.crossAt(0.05,10.00,0.09,10.04,0.03),
      sameT:T.crossAt(0.01,10.04,0.06,10.04,0.03)
    }));
    Object.entries(r).forEach(([k,v])=>{
      ok(isFinite(v),k+" החזיר "+v);
      ok(v>=0,k+" החזיר זמן שלילי: "+v);
    });
    eq(r.falling,10.04,"אות יורד — נופלים על הפריים הנוכחי ולא ממציאים");
    eq(r.already,10.00,"הסף כבר נעבר קודם — החציה לא מאוחרת מהפריים הקודם");
    eq(r.sameT,10.04,"שני פריימים באותו זמן — בלי חלוקה באפס");
  }),

  check("דיווח הדיוק נגזר מקצב הפריימים בפועל",seed,async page=>{
    await openPf(page);
    const r=await T(page,(T)=>({
      f30:T.precisionOf(30), f60:T.precisionOf(60), f240:T.precisionOf(240),
      zero:T.precisionOf(0), bad:T.precisionOf(NaN), neg:T.precisionOf(-5)
    }));
    ok(Math.abs(r.f30-1/60)<1e-9,"30fps → "+r.f30);
    ok(Math.abs(r.f60-1/120)<1e-9,"60fps → "+r.f60);
    ok(Math.abs(r.f240-1/480)<1e-9,"240fps → "+r.f240);
    ok(r.f240<r.f60&&r.f60<r.f30,"יותר פריימים = דיוק טוב יותר");
    eq(r.zero,null,"בלי קצב ידוע לא מדווח דיוק מומצא");
    eq(r.bad,null); eq(r.neg,null);
  }),

  check("שעון המצלמה מתקדם בין פריימים ולא קופץ אחורה",seed,async page=>{
    await openPf(page);
    const r=await page.evaluate(async()=>{
      const T=window.PF._test;
      T.setClock({mt:100.000,pt:performance.now()});
      const a=T.camMediaNow();
      await new Promise(r2=>setTimeout(r2,120));
      const b=T.camMediaNow();
      return {a,b};
    });
    ok(r.b>r.a,"השעון התקדם: "+r.a+" → "+r.b);
    ok(r.b-r.a>0.05&&r.b-r.a<0.5,"ובקצב סביר: "+(r.b-r.a));
  }),

  check("מצב המדידה חשוף לממשק ולארכיון",seed,async page=>{
    await openPf(page);
    const t=await page.evaluate(()=>window.PF.timing());
    ok(t&&typeof t==="object","PF.timing() מחזיר מצב");
    ok("fps" in t&&"prec" in t&&"rvfc" in t,"עם קצב, דיוק, ומקור השעון — התקבל "+JSON.stringify(t));
  }),

  check("זיהוי אקדח: הזמן נמדד מהדגימה שחצתה, לא מסוף החלון",seed,async page=>{
    await openPf(page);
    const r=await T(page,(T)=>({
      /* יריה בתחילת חלון של 2048 דגימות ב-48kHz — כמעט כל החלון
         חלף מאז, ולכן התיקון הוא כמעט 43 מ״ש */
      early:T.micLagSec(2048,10,48000),
      mid:T.micLagSec(2048,1024,48000),
      late:T.micLagSec(2048,2047,48000),
      /* קלט לא תקין לא מזיז את השעון בכלל */
      none:T.micLagSec(2048,-1,48000),
      over:T.micLagSec(2048,2048,48000),
      noSr:T.micLagSec(2048,10,0)
    }));
    ok(Math.abs(r.early-2038/48000)<1e-9,"יריה מוקדמת בחלון — "+r.early);
    ok(Math.abs(r.mid-1024/48000)<1e-9,"אמצע החלון — "+r.mid);
    ok(r.early>r.mid&&r.mid>r.late,"ככל שהיריה מוקדמת בחלון, התיקון גדול יותר");
    ok(r.early>0.04,"והתיקון בסדר גודל של עשרות מילישניות: "+r.early);
    eq(r.none,0); eq(r.over,0); eq(r.noSr,0,"בלי קלט תקין לא מזיזים את נקודת האפס");
  }),

  check("קיזוז מרחק האקדח נשאר פעיל לצד תיקון החלון",seed,async page=>{
    await openPf(page);
    const r=await T(page,(T)=>({off:T.soundLag(0),m10:T.soundLag(10),m34:T.soundLag(34.3)}));
    eq(r.off,0,"בלי מרחק מוגדר — בלי קיזוז");
    ok(Math.abs(r.m10-10/343)<1e-9,"10 מטר — "+r.m10);
    ok(Math.abs(r.m34-0.1)<1e-3,"34.3 מטר הם כעשירית שנייה: "+r.m34);
  }),

  /* אותה משפחת באג כמו בסרגל העליון, ובדיוק מאותה סיבה: פס מעוגן
     בקצה אחד שגדל לעבר כפתורים בקצה השני. הוספת ה-fps והדיוק הביאה
     אותו לידי התנגשות בפועל על מכשיר אמיתי. */
  check("שורת הסטטוס אינה דורכת על כפתורי המצלמה, בשום אורך טקסט",seed,async page=>{
    await openPf(page);
    for(const w of [430,390,360]){
      await page.setViewportSize({width:w,height:820});
      await page.waitForTimeout(250);
      const hit=await page.evaluate(()=>{
        const s=document.getElementById("pf-status");
        /* הטקסט הארוך ביותר שהמסך יכול להציג בפועל */
        s.innerHTML="🟢 זיהוי חמוש<b>240fps · ±0.002 שנ׳</b>";
        const a=s.getBoundingClientRect();
        const b=document.querySelector(".pf-camctl").getBoundingClientRect();
        const ov=Math.min(a.right,b.right)-Math.max(a.left,b.left);
        return {ov:+ov.toFixed(1),sw:+a.width.toFixed(1)};
      });
      ok(hit.ov<=0.5,"חפיפה של "+hit.ov+"px ברוחב "+w);
      ok(hit.sw>40,"והפס עצמו לא נמחץ לאפס: "+hit.sw);
    }
  }),

  check("תנאי המדידה מוצגים בשורה נפרדת מהמצב",seed,async page=>{
    await openPf(page);
    const r=await page.evaluate(()=>{
      const s=document.getElementById("pf-status");
      s.innerHTML="🟢 זיהוי חמוש<b>60fps · ±0.008 שנ׳</b>";
      const b=s.querySelector("b");
      return {disp:getComputedStyle(b).display,txt:s.textContent};
    });
    eq(r.disp,"block","שתי שורות, לא רצף אחד ארוך");
    ok(r.txt.indexOf("60fps")>=0&&r.txt.indexOf("±0.008")>=0,"והמידע עצמו שם: "+r.txt);
  }),

  check("אבחון המצלמה זמין ולא קורס כשאין מצלמה",seed,async page=>{
    await openPf(page);
    const c=await page.evaluate(()=>window.PF.camCaps());
    ok(c&&typeof c==="object","camCaps() מחזיר תשובה");
    ok("supported" in c,"ואומר במפורש אם יש מה לדווח — התקבל "+JSON.stringify(c));
    const t=await page.evaluate(()=>window.PF.timing());
    ok("capMax" in t&&"res" in t,"ותקרת החומרה חשופה לצד הקצב בפועל");
  }),

  check("«מתוך» מופיע רק כשיש באמת פער בין ההצהרה לביצוע",seed,async page=>{
    await openPf(page);
    const r=await page.evaluate(()=>{
      const T=window.PF._test, out={};
      /* קצב תואם להצהרה — אין מה להתריע */
      T.setClock({fps:59,capMax:60}); T.paintArmed();
      out.match=document.getElementById("pf-status").textContent;
      /* המצלמה מצהירה על הרבה יותר ממה שמתקבל — זה נאמר */
      T.setClock({fps:30,capMax:120}); T.paintArmed();
      out.gap=document.getElementById("pf-status").textContent;
      return out;
    });
    ok(r.match.indexOf("מתוך")<0,"בלי פער אין רעש: "+r.match);
    ok(r.gap.indexOf("מתוך 120")>=0,"עם פער — נאמר מפורשות: "+r.gap);
  }),

  check("מסך הפוטו־פיניש ממשיך לעלות ולתפקד",seed,async page=>{
    await openPf(page);
    ok(await page.evaluate(()=>document.getElementById("view-photo").classList.contains("on")),"המסך פתוח");
    ok(await page.evaluate(()=>!!document.getElementById("pf-gun")),"כפתור הזינוק קיים");
    const n=await page.evaluate(()=>window.PF._test.nextUnfinished());
    ok(typeof n==="number","מנוע המסלולים חי");
  })

]};
