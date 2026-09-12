"use strict";
/* ============================================================
   הסרגל העליון — פריסה ברוחבי מסך אמיתיים
   ------------------------------------------------------------
   הבדיקות האחרות מאמתות שרכיב קיים, שהתוכן שלו נכון ושלחיצה עליו
   עושה את הדבר הנכון. אף אחת מהן אינה רואה שני רכיבים יושבים זה
   על זה — ולכן תוספת כפתור אחד לסרגל שברה את הפריסה וכל 171
   הבדיקות נשארו ירוקות.

   כאן נמדדת החפיפה עצמה: המלבנים של «חזרה», שם האפליקציה ולוח
   המחוונים, בכל צמד ובכמה רוחבי מסך. הסרגל צפוף מעצם טבעו, ולכן
   כל תוספת עתידית אליו תיפול כאן לפני שהיא מגיעה למכשיר של מורה.
   ============================================================ */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const seed={"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION};

/* רוחבי טלפון אמיתיים: 430 — פלאפון גדול; 390 — iPhone סטנדרטי;
   360 — אנדרואיד נפוץ, וגם הרוחב שבו התקציב הכי צר. */
const WIDTHS=[430,390,360];

const at=async(page,w,mod)=>{
  await page.setViewportSize({width:w,height:820});
  await page.evaluate(m=>window.HM.go(m),mod);
  await page.waitForTimeout(400);
};

/* המלבנים של הרכיבים שבאמת תופסים רוחב בסרגל. כפתור «חזרה» מוסתר
   נשמט, כי הוא לא מתחרה על מקום. */
const parts=page=>page.evaluate(()=>{
  const sel=".topbar .backbtn:not([hidden]), .topbar .brand .ttl, .topbar .sboard";
  return [...document.querySelectorAll(sel)].map(el=>{
    const r=el.getBoundingClientRect();
    return {name:el.className.split(" ")[0]||el.id,
      left:+r.left.toFixed(1), right:+r.right.toFixed(1), width:+r.width.toFixed(1)};
  }).filter(x=>x.width>0);
});

/* חפיפה אופקית בין כל צמד. מספר חיובי = הרכיבים דורכים זה על זה. */
const overlaps=rs=>{
  const out=[];
  for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){
    const px=Math.min(rs[i].right,rs[j].right)-Math.max(rs[i].left,rs[j].left);
    if(px>0.5)out.push(rs[i].name+" × "+rs[j].name+" — "+px.toFixed(1)+"px");
  }
  return out;
};

module.exports={title:"הסרגל העליון — פריסה",tests:[

  check("מסך עם כפתור «חזרה»: אין חפיפה בין רכיבי הסרגל בשום רוחב",seed,async page=>{
    for(const w of WIDTHS){
      await at(page,w,"ft");
      ok(await page.evaluate(()=>!document.getElementById("btnBack").hidden),
        "כפתור «חזרה» אכן מוצג במסך הזה — אחרת הבדיקה לא בודקת את המקרה הצפוף");
      const hit=overlaps(await parts(page));
      eq(hit,[],"חפיפה ברוחב "+w+"px");
    }
  }),

  check("מסך הבית: אין חפיפה בשום רוחב",seed,async page=>{
    for(const w of WIDTHS){
      await at(page,w,"home");
      eq(overlaps(await parts(page)),[],"חפיפה ברוחב "+w+"px");
    }
  }),

  check("הסרגל אינו גולש מחוץ למסך",seed,async page=>{
    for(const w of WIDTHS){
      await at(page,w,"ft");
      const o=await page.evaluate(()=>{
        const t=document.querySelector(".topbar");
        return {over:t.scrollWidth-t.clientWidth, body:document.body.scrollWidth-window.innerWidth};
      });
      ok(o.over<=1,"הסרגל גולש ב-"+o.over+"px ברוחב "+w);
      ok(o.body<=1,"הדף גולש לרוחב ב-"+o.body+"px ברוחב "+w);
    }
  }),

  check("שלושת כפתורי הפעולה נשארים גלויים ובגודל שאפשר להקיש עליו",seed,async page=>{
    for(const w of WIDTHS){
      await at(page,w,"ft");
      const btns=await page.evaluate(()=>["btnSun","btnInfo","btnSettings"].map(id=>{
        const r=document.getElementById(id).getBoundingClientRect();
        return {id,w:+r.width.toFixed(1),h:+r.height.toFixed(1)};
      }));
      btns.forEach(b=>{
        ok(b.w>=30&&b.h>=30,b.id+" הצטמק ל-"+b.w+"×"+b.h+" ברוחב "+w+" — קטן מדי להקשה");
      });
    }
  }),

  check("השעון נסוג רק במסך צר עם «חזרה» — במסך הבית הוא נשאר",seed,async page=>{
    const shown=()=>page.evaluate(()=>getComputedStyle(document.querySelector(".sboard .clock")).display!=="none");
    await at(page,390,"home");
    eq(await shown(),true,"במסך הבית יש מקום, ולכן אין סיבה לוותר על השעון");
    await at(page,430,"ft");
    eq(await shown(),true,"ב-430 הכיווץ מספיק, והשעון נשאר גם עם «חזרה»");
  }),

  check("שם האפליקציה מתקצר ואינו נחתך באמצע מילה על רכיב אחר",seed,async page=>{
    await at(page,360,"ft");
    const t=await page.evaluate(()=>{
      const el=document.querySelector(".brand .ttl");
      const cs=getComputedStyle(el);
      return {ov:cs.overflow,te:cs.textOverflow,txt:el.textContent.trim()};
    });
    eq(t.ov,"hidden","הקיצור הוא מה שמונע חפיפה — בלעדיו הכיתוב דורך החוצה");
    eq(t.te,"ellipsis");
    ok(t.txt.indexOf("PRO")>=0,"והטקסט עצמו לא השתנה, רק התצוגה שלו");
  })

]};
