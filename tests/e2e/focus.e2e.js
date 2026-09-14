"use strict";
/* ============================================================
   «מה קורה עכשיו» — היררכיית דף הבית וראש האפליקציה
   ------------------------------------------------------------
   דף הבית הציג את כל שיעורי היום כרשימה שטוחה: עשר שורות, עשרה
   כפתורי «התחל» זהים. מורה שפותח את האפליקציה בין שיעורים נאלץ
   לסרוק את כולן כדי למצוא את האחת שרלוונטית לו.

   ובמקביל התגלה משהו חמור יותר: ארבעת פסי ההודעה — שיעור פעיל,
   עדכון גרסה, אזהרת אחסון ומצב הדגמה — ישבו מחוץ ל-.app בסוף
   המסמך, כל אחד עם sticky משלו. sticky נדבק רק כשהאלמנט מגיע
   לגלילה, והם היו אחרונים; בראש הדף כולם רונדרו מתחת למסך.
   כלומר **אף אחד מהם לא נראה אי פעם** במקום שנועד לו.
   ============================================================ */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const DAY=()=>D.dayOfISO(new Date().toISOString().slice(0,10));
const S=(time,cid,cls,extra)=>Object.assign(
  {id:"s"+time.replace(":",""),day:DAY(),time,cid,clsSnapshot:cls,kind:"pe"},extra||{});
const CTX=(time,kind,label)=>({id:"x"+time.replace(":",""),day:DAY(),time,kind,label});

/* שעון קבוע לפני השיעור הראשון: «השיעור הבא», «מתחיל בעוד» ו«הכול
   הסתיים» תלויים בשעה, ובלי קיבוע הם מספרים על שעון ההרצה. */
const NOW="2026-09-14T07:30:00";
const base={"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION,__now:NOW};
const withDay=slots=>Object.assign({},base,{"sched.week":slots});
/* יום מלא: שיעורים, הכנות, שהייה ופרטני — כמו מערכת אמיתית */
const FULL=[
  S("08:10","c:יא:6","י״א6"), S("09:00","c:יא:7","י״א7"),
  CTX("09:45","other","הכנת חומרים"), CTX("10:50","stay","שהייה"),
  S("11:40","c:ז:9","ז׳9"), S("11:40","c:ז:10","ז׳10"),
  S("12:35","c:ז:5","ז׳5",{topic:"כדורסל — מסירה"}), CTX("13:25","prat","פרטני אופק")
];

module.exports={title:"מה קורה עכשיו",tests:[

  /* ---------- ראש האפליקציה ---------- */

  check("ארבעת פסי ההודעה נראים בראש המסך, לא מתחתיו",base,async page=>{
    const r=await page.evaluate(()=>{
      const out={};
      ["lsBar","upBar","stWarn","demoBar"].forEach(id=>{
        const e=document.getElementById(id);
        e.hidden=false;
        const b=e.getBoundingClientRect();
        out[id]={top:Math.round(b.top),seen:b.top<window.innerHeight&&b.bottom>0,
          inHead:!!e.closest(".apphead")};
        e.hidden=true;
      });
      return out;
    });
    ["lsBar","upBar","stWarn","demoBar"].forEach(id=>{
      ok(r[id].inHead,"«"+id+"» חייב לחיות בראש הדביק");
      ok(r[id].seen,"«"+id+"» מרונדר מחוץ למסך — top="+r[id].top);
      ok(r[id].top<200,"«"+id+"» רחוק מהראש — top="+r[id].top);
    });
  }),

  check("פס השיעור הפעיל נשאר בראש גם במודול אחר",withDay([S("08:10","c:יא:6","י״א6")]),
    async page=>{
    await page.evaluate(()=>document.querySelector("#hx-todayList [data-slot]").click());
    await page.waitForTimeout(400);
    const home=await page.evaluate(()=>{
      const b=document.getElementById("lsBar").getBoundingClientRect();
      return {top:Math.round(b.top),seen:b.top<window.innerHeight&&b.bottom>0};
    });
    ok(home.seen,"בבית — top="+home.top);
    await page.evaluate(()=>window.HM.go("ft"));
    await page.waitForTimeout(600);
    const ft=await page.evaluate(()=>{
      const b=document.getElementById("lsBar").getBoundingClientRect();
      return {top:Math.round(b.top),seen:b.top<window.innerHeight&&b.bottom>0,
        txt:document.getElementById("lsBar").textContent};
    });
    ok(ft.seen,"ובמבחני כושר — top="+ft.top);
    ok(/י״א6/.test(ft.txt),"ואומר איזו כיתה");
  }),

  check("הראש דביק ואינו חופף לתוכן בשום רוחב טלפון",base,async page=>{
    for(const w of [360,390,412]){
      await page.setViewportSize({width:w,height:780});
      await page.waitForTimeout(200);
      const m=await page.evaluate(()=>{
        const head=document.querySelector(".apphead");
        const hero=document.querySelector(".hero");
        const hb=head.getBoundingClientRect(), rb=hero.getBoundingClientRect();
        const brand=document.querySelector(".brand").getBoundingClientRect();
        const sb=document.querySelector(".sboard").getBoundingClientRect();
        const ox=Math.min(brand.right,sb.right)-Math.max(brand.left,sb.left);
        const oy=Math.min(brand.bottom,sb.bottom)-Math.max(brand.top,sb.top);
        return {pos:getComputedStyle(head).position,headBottom:Math.round(hb.bottom),
          heroTop:Math.round(rb.top),brandOverSboard:(ox>1&&oy>1)?Math.round(ox):0,
          hScroll:document.documentElement.scrollWidth>window.innerWidth+1};
      });
      eq(m.pos,"sticky","ברוחב "+w);
      eq(m.brandOverSboard,0,"השם והשעון חופפים ברוחב "+w);
      ok(m.heroTop>=m.headBottom,
        "התוכן מתחיל מתחת לראש ברוחב "+w+" (ראש="+m.headBottom+" תוכן="+m.heroTop+")");
      eq(m.hScroll,false,"גלילה אופקית ברוחב "+w);
    }
  }),

  check("הברכה אינה תופסת את המסך הראשון בטלפון",withDay(FULL),async page=>{
    await page.setViewportSize({width:390,height:780});
    await page.waitForTimeout(250);
    const m=await page.evaluate(()=>{
      const f=document.querySelector(".hx-focus");
      return {hero:Math.round(document.querySelector(".hero").getBoundingClientRect().height),
        focusTop:f?Math.round(f.getBoundingClientRect().top):null,
        focusSeen:f?f.getBoundingClientRect().bottom<window.innerHeight:false};
    });
    ok(m.hero<95,"הברכה התכווצה: "+m.hero+"px");
    ok(m.focusSeen,"וכרטיס השיעור נכנס במסך הראשון — top="+m.focusTop);
  }),

  /* ---------- היררכיה ---------- */

  check("בין שיעורים — כרטיס «השיעור הבא שלך» עם ספירה לאחור",withDay(FULL),async page=>{
    const r=await page.evaluate(()=>{
      const f=document.querySelector(".hx-focus");
      return f?{tag:f.querySelector(".tag").textContent,
        cls:f.querySelector(".cls").textContent,
        when:f.querySelector(".when").textContent,
        until:(f.querySelector(".until")||{}).textContent||"",
        btn:(f.querySelector(".btn.acc")||{}).textContent||""}:null;
    });
    ok(r,"יש כרטיס מוקד");
    ok(/הבא/.test(r.tag),r.tag);
    ok(/–/.test(r.when),"טווח השעות: "+r.when);
    ok(/מתחיל בעוד/.test(r.until)||r.until==="","ספירה לאחור: "+r.until);
    ok(/התחל/.test(r.btn),r.btn);
  }),

  check("יש כפתור ראשי אחד בלבד — לא עמוד של «התחל»",withDay(FULL),async page=>{
    const n=await page.evaluate(()=>({
      acc:document.querySelectorAll("#hx-todayList .btn.acc").length,
      rows:document.querySelectorAll("#hx-todayList .hx-up").length
    }));
    eq(n.acc,1,"כפתור ראשי אחד — השאר משניים");
    ok(n.rows>0,"והשאר שורות קומפקטיות: "+n.rows);
  }),

  check("שיעור פתוח הופך את הכרטיס ל«מתקיים עכשיו» עם «המשך»",
    withDay([S("08:10","c:יא:6","י״א6"),S("09:00","c:יא:7","י״א7")]),async page=>{
    await page.evaluate(()=>document.querySelector("#hx-todayList [data-slot]").click());
    await page.waitForTimeout(400);
    const r=await page.evaluate(()=>{
      const f=document.querySelector(".hx-focus");
      return {tag:f.querySelector(".tag").textContent,
        cls:f.querySelector(".cls").textContent,
        primary:(f.querySelector(".btn.acc")||{}).textContent||"",
        hasEnd:!!document.getElementById("hx-endNow"),
        live:!!f.querySelector(".dot.live")};
    });
    ok(/מתקיים עכשיו/.test(r.tag),r.tag);
    eq(r.cls,"י״א6");
    ok(/המשך שיעור/.test(r.primary),"הפעולה הראשית היא המשך ולא התחל: "+r.primary);
    ok(r.hasEnd,"ואפשר לסיים מכאן");
    ok(r.live,"עם סימון חי");
  }),

  check("«המשך שיעור» פותח את מסך הכיתה של השיעור",
    withDay([S("08:10","c:יא:6","י״א6")]),async page=>{
    await page.evaluate(()=>document.querySelector("#hx-todayList [data-slot]").click());
    await page.waitForTimeout(400);
    await page.evaluate(()=>document.querySelector("#hx-todayList [data-resume]").click());
    await page.waitForTimeout(400);
    eq(await page.evaluate(()=>document.getElementById("clsModal").classList.contains("on")),true);
    ok(/י״א6/.test(await page.evaluate(()=>document.getElementById("cls-title").textContent)));
  }),

  check("שהייה ופרטני אינם מציפים את הבית — הם ביום המלא",withDay(FULL),async page=>{
    const t=await page.evaluate(()=>document.getElementById("hx-todayList").textContent);
    ok(!/שהייה|פרטני|הכנת חומרים/.test(t),"הבית נשאר על שיעורים");
    await page.evaluate(()=>document.getElementById("hx-allDay").click());
    await page.waitForTimeout(400);
    const d=await page.evaluate(()=>document.getElementById("day-body").textContent);
    ["שהייה","פרטני אופק","הכנת חומרים","י״א6","ז׳5"].forEach(x=>
      ok(d.indexOf(x)>=0,"«"+x+"» חסר מהיום המלא"));
  }),

  check("היום המלא מציג את כל פריטי היום, מחולקים",withDay(FULL),async page=>{
    await page.evaluate(()=>document.getElementById("hx-allDay").click());
    await page.waitForTimeout(400);
    const r=await page.evaluate(()=>({
      rows:document.querySelectorAll("#day-body .day-row").length,
      secs:[...document.querySelectorAll("#day-body .day-sec")].map(e=>e.textContent),
      sched:!!document.getElementById("day-sched")
    }));
    eq(r.rows,8,"כל שמונת הפריטים");
    ok(r.secs.length>0,"מחולקים לפי מצב: "+r.secs.join(" · "));
    ok(r.sched,"ומשם אפשר להגיע למערכת השעות");
  }),

  check("«מערכת שעות» לא נעלמה מדף הבית",base,async page=>{
    ok(await page.evaluate(()=>!!document.getElementById("hx-schedEdit")),
      "הכניסה הקיימת נשארת");
    await page.evaluate(()=>document.getElementById("hx-schedEdit").click());
    await page.waitForTimeout(400);
    eq(await page.evaluate(()=>document.getElementById("schedModal").classList.contains("on")),true);
  }),

  check("יום שכולו מאחור אומר זאת, ולא מציג כרטיס ריק",
    Object.assign({},withDay([S("08:10","c:יא:6","י״א6")]),{__now:"2026-09-14T07:30:00"}),
    async page=>{
    /* מסמנים את השיעור כהתקיים — ואז אין «עכשיו» ואין «הבא» */
    await page.evaluate(async()=>{
      document.querySelector("#hx-todayList [data-slot]").click();
      await new Promise(r=>setTimeout(r,300));
      window.HM.session.complete(window.HM.session.active().id);
    });
    await page.waitForTimeout(400);
    const r=await page.evaluate(()=>({
      focus:!!document.querySelector(".hx-focus"),
      txt:document.getElementById("hx-todayList").textContent.replace(/\s+/g," "),
      allDay:!!document.getElementById("hx-allDay")
    }));
    eq(r.focus,false,"אין כרטיס מוקד כשאין מה להציג");
    ok(/הסתיימו/.test(r.txt),r.txt.slice(0,80));
    ok(r.allDay,"והיום המלא עדיין נגיש");
  }),

  check("מכשיר בלי מערכת שעות מקבל הסבר ודרך פעולה",base,async page=>{
    const t=await page.evaluate(()=>document.getElementById("hx-todayList").textContent
      .replace(/\s+/g," "));
    ok(/אין מערכת שעות/.test(t),t.slice(0,60));
    ok(/פעם אחת/.test(t),"ומסביר למה זה שווה: "+t.slice(0,110));
    ok(await page.evaluate(()=>!!document.getElementById("hx-schedFirst")),"עם כפתור אחד");
  }),

  check("שני שיעורים באותה דקה — שניהם נשארים",
    withDay([S("11:40","c:ז:9","ז׳9"),S("11:40","c:ז:10","ז׳10")]),async page=>{
    const t=await page.evaluate(()=>document.getElementById("hx-todayList").textContent);
    ok(/ז׳9/.test(t)&&/ז׳10/.test(t),"אף אחת לא נבלעה");
  })

]};
