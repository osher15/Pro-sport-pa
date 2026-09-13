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

  /* ההסבר בלחיצה ארוכה מתאים לכפתור, אבל על שדה קלט הוא נפתח בדיוק
     כשמקישים וממתינים למקלדת — ואז נראה שהשדה לא מגיב. */
  check("לחיצה ארוכה על שדה קלט אינה חוטפת אותו",seed,async page=>{
    await openPf(page);
    const box=await page.locator("#pf-gunDist").boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.down(); await page.waitForTimeout(750); await page.mouse.up();
    await page.waitForTimeout(250);
    eq(await page.evaluate(()=>!document.getElementById("tipPop").hidden),false,
      "חלון ההסבר לא נפתח מעל השדה");
    eq(await page.evaluate(()=>document.activeElement&&document.activeElement.id),"pf-gunDist",
      "והשדה נשאר במיקוד");
  }),

  check("ה-«?» עדיין פותח את ההסבר לשדה",seed,async page=>{
    await openPf(page);
    await page.evaluate(()=>{
      const i=document.getElementById("pf-gunDist");
      i.nextElementSibling.click();          /* אייקון ה-? שנוסף אחרי השדה */
    });
    await page.waitForTimeout(250);
    eq(await page.evaluate(()=>!document.getElementById("tipPop").hidden),true,
      "ההסבר עדיין נגיש — רק לא בדרך שחוטפת את ההקלדה");
  }),

  /* הבדיקה למטה השתמשה ב-fill, שמחליף את כל התוכן — ולכן לא ראתה
     שהקלדה אמיתית לתוך שדה שמכיל 0 מייצרת «05». כאן מקישים מקש. */
  check("הקלדה לתוך השדה מתחילה נקייה, ולא נדבקת לאפס שהיה בו",seed,async page=>{
    await openPf(page);
    const el=page.locator("#pf-gunDist");
    eq(await el.inputValue(),"0","מתחילים מאפס");
    await el.click(); await page.waitForTimeout(200);
    await page.keyboard.press("5"); await page.waitForTimeout(250);
    eq(await el.inputValue(),"5","מה שהוקלד הוא מה שרואים — לא «05»");
    await page.keyboard.press("0"); await page.waitForTimeout(200);
    eq(await el.inputValue(),"50","וההמשך נבנה כרגיל");
    eq(await page.evaluate(()=>window.HM.LS.get("pf.gunDist",null)),50);
  }),

  check("מיקוד על ערך קיים בוחר אותו, כדי שהקלדה תחליף ולא תיצמד",seed,async page=>{
    await openPf(page);
    const el=page.locator("#pf-gunDist");
    await el.fill("34");
    await page.evaluate(()=>document.getElementById("pf-gunDist").blur());
    await page.waitForTimeout(200);
    await el.click(); await page.waitForTimeout(200);
    await page.keyboard.press("7"); await page.waitForTimeout(250);
    eq(await el.inputValue(),"7","הערך הקודם הוחלף, לא הורחב ל«347»");
  }),

  /* הסיבה המשוערת ל«ראיתי 5 ואז חזר ל-0»: קלט type="number" מחזיר
     מחרוזת ריקה בכל פעם שהדפדפן סבור שהתוכן אינו מספר תקין, וכל
     טיפול שנשען עליו עלול לדרוס ספרה שהמורה באמת הקליד. השדה הוא
     טקסט עם מקלדת מספרית, ולכן המצב הזה לא קיים. */
  check("השדה מחזיר תמיד את מה שכתוב בו, בלי נורמליזציה של הדפדפן",seed,async page=>{
    await openPf(page);
    const r=await page.evaluate(()=>{
      const e=document.getElementById("pf-gunDist");
      return {type:e.type,inputmode:e.getAttribute("inputmode")};
    });
    eq(r.type,"text","לא type=number — הוא בולע ערכים באמצע הקלדה");
    eq(r.inputmode,"decimal","אבל המקלדת עדיין מספרית");
  }),

  check("פסיק מתקבל כנקודה עשרונית, כפי שמקלידים בעברית",seed,async page=>{
    await openPf(page);
    const el=page.locator("#pf-gunDist");
    await el.click(); await page.waitForTimeout(200);
    await page.keyboard.press("Comma"); await page.keyboard.press("7");
    await page.waitForTimeout(250);
    eq(await el.inputValue(),"0.7","«,7» הופך ל-0.7 ולא נבלע");
    eq(await page.evaluate(()=>window.HM.LS.get("pf.gunDist",null)),0.7);
  }),

  check("תווים שאינם מספר פשוט לא נכנסים",seed,async page=>{
    await openPf(page);
    const el=page.locator("#pf-gunDist");
    await el.click(); await page.waitForTimeout(200);
    await page.keyboard.type("1a2b3"); await page.waitForTimeout(300);
    eq(await el.inputValue(),"123","האותיות נופלות, הספרות נשארות");
    eq(await page.evaluate(()=>window.HM.LS.get("pf.gunDist",null)),123);
  }),

  check("מרחק האקדח ניתן לשינוי, והקיזוז מתעדכן תוך כדי הקלדה",seed,async page=>{
    await openPf(page);
    const pill=()=>page.textContent("#pf-gunLag");
    eq((await pill()).trim(),"בלי קיזוז","מתחילים בלי קיזוז");
    await page.locator("#pf-gunDist").fill("34");
    await page.waitForTimeout(200);
    ok((await pill()).indexOf("קיזוז")>=0&&(await pill()).indexOf("בלי")<0,
      "הפס התעדכן עוד לפני עזיבת השדה — התקבל: "+(await pill()));
    eq(await page.evaluate(()=>window.HM.LS.get("pf.gunDist",null)),34,"והערך נשמר");
    /* 34 מ׳ ÷ 343 מ/ש ≈ 99 מ״ש */
    ok((await pill()).indexOf("99")>=0,"והקיזוז מחושב נכון: "+(await pill()));
    await page.locator("#pf-gunDist").fill("0");
    await page.waitForTimeout(200);
    eq((await pill()).trim(),"בלי קיזוז","ואפשר גם לבטל");
  }),

  /* בפיילוט השאלה «איזו גרסה יש לך» נשאלת בכל דיווח תקלה. אם המספר
     בהגדרות לא זז כשהאפליקציה משתנה, אי אפשר לענות עליה. */
  check("מזהה הגרסה נגזר מקובץ שמשתנה עם האפליקציה",seed,async page=>{
    const r=await page.evaluate(()=>{
      const src=id=>{ const s=[...document.scripts].map(x=>x.src).find(x=>x.indexOf(id)>=0)||"";
        const m=s.match(/[?&]v=([0-9a-f]+)/); return m?m[1]:null; };
      return {app:src("hm-app.js"),tests:src("hm-tests.js"),shown:window.HM.buildId?window.HM.buildId():null};
    });
    /* בקובץ הבודד הסקריפטים מוטמעים ואין חותמות — והמזהה אומר «local»
       במקום להמציא מספר. בגרסת הרשת הוא חייב לבוא מ-hm-app.js. */
    if(!r.app){
      eq(r.shown,"local","בבנייה המאוחדת אין חותמות, וזה נאמר במפורש");
      eq(r.tests,null,"וגם לא לקובץ התוכן — כלומר אין מאיפה להטעות");
    }else{
      eq(r.shown,r.app,"המזהה נגזר מ-hm-app.js");
      if(r.tests&&r.tests!==r.app)
        ok(r.shown!==r.tests,"ובמפורש לא מקובץ התוכן, שיכול לא לזוז סבבים שלמים");
    }
  }),

  check("מסך הפוטו־פיניש ממשיך לעלות ולתפקד",seed,async page=>{
    await openPf(page);
    ok(await page.evaluate(()=>document.getElementById("view-photo").classList.contains("on")),"המסך פתוח");
    ok(await page.evaluate(()=>!!document.getElementById("pf-gun")),"כפתור הזינוק קיים");
    const n=await page.evaluate(()=>window.PF._test.nextUnfinished());
    ok(typeof n==="number","מנוע המסלולים חי");
  })

]};
