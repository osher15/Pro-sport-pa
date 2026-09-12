"use strict";
/* שלב 10.5 — ליטוש ממוקד: כותרת מסך הכניסה, בהירות ההצפנה בגיבוי,
   טיפ התחלה, ועקביות בין שפות. ארבע בדיקות קטנות, לא פיצ׳ר חדש. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const withStudent={
  "stu.list":[{id:"a",name:"דן אבירם",cls:"ט׳3",cid:"c:ט:3",sex:"boys",age:14,tests:[]}],
  "pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION
};
const empty={"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION};

const go=async(page,m,ms)=>{ await page.evaluate(x=>window.HM.go(x),m); await page.waitForTimeout(ms||600); };
const switchLang=async(page,code)=>{ await page.evaluate(c=>window.I18N.set(c),code); await page.waitForTimeout(150); };

module.exports={title:"שלב 10.5 — ליטוש ממוקד",tests:[

  /* ---------- 1. כותרת מסך הכניסה ---------- */

  check("כותרת הכניסה: PRO הוא רכיב קבוע ומבודד, לא חלק ממחרוזת מעורבת אחת",empty,async page=>{
    const h1=await page.evaluate(()=>{
      const el=document.querySelector("#lockOv h1");
      const span=el.querySelector("[data-i18n=\"brand.word\"]");
      const b=el.querySelector("b");
      return {spanText:span&&span.textContent, bText:b&&b.textContent,
        unicodeBidi:getComputedStyle(el).unicodeBidi, hasOldKey:el.hasAttribute("data-i18n")};
    });
    eq(h1.spanText,"המגרש","המילה העברית בספאן נפרד");
    eq(h1.bText,"PRO","PRO קבוע, לא בתוך אותה מחרוזת עם «המגרש»");
    eq(h1.unicodeBidi,"isolate","מבודד מהקשר הביידי הסובב — כמו .topbar .ttl");
    eq(h1.hasOldKey,false,"אין יותר brand.full מאוחד על האלמנט");
  }),

  check("החלפת שפה: המילה העברית מתורגמת, PRO לא זז",empty,async page=>{
    await switchLang(page,"en");
    let h1=await page.evaluate(()=>{
      const el=document.querySelector("#lockOv h1");
      return {span:el.querySelector("[data-i18n=\"brand.word\"]").textContent,b:el.querySelector("b").textContent};
    });
    eq(h1.span,"Hamigresh"); eq(h1.b,"PRO","PRO — אף פעם לא נוגעים בו, בכל שפה");
    await switchLang(page,"he");
    h1=await page.evaluate(()=>document.querySelector("#lockOv h1 [data-i18n=\"brand.word\"]").textContent);
    eq(h1,"המגרש","וחזרה לעברית משחזרת בדיוק את המקור");
  }),

  /* ---------- 2. בהירות הצפנת הגיבוי ---------- */

  check("גיבוי: הבחירה מוצפן/רגיל מוצגת לפני כפתור הגיבוי, לא אחריו",empty,async page=>{
    const order=await page.evaluate(()=>{
      const card=document.getElementById("set-clsCard").previousElementSibling; // bk-card
      const all=[...card.querySelectorAll("*")];
      return {encIdx:all.findIndex(x=>x.id==="set-bkEnc"),expIdx:all.findIndex(x=>x.id==="set-bkExport")};
    });
    ok(order.encIdx>=0&&order.expIdx>=0,"שני האלמנטים נמצאו");
    ok(order.encIdx<order.expIdx,"תיבת הסימון של ההצפנה מופיעה לפני כפתור הגיבוי");
  }),

  check("חלון הסיסמה: כותרת והסבר מתורגמים לאנגלית כשיוצרים גיבוי מוצפן",withStudent,async page=>{
    await switchLang(page,"en");
    await page.evaluate(()=>document.getElementById("btnSettings").click());
    await page.waitForTimeout(300);
    await page.evaluate(()=>{ document.getElementById("set-bkEnc").checked=true; document.getElementById("set-bkExport").click(); });
    await page.waitForTimeout(400);
    const modal=await page.evaluate(()=>({
      on:document.getElementById("bkPassModal").classList.contains("on"),
      title:document.getElementById("bkPassTitle").textContent,
      hint:document.getElementById("bkPassHint").innerHTML,
      passLbl:document.querySelector('[data-i18n="bk.pass"]').textContent,
      passAgainLbl:document.querySelector('[data-i18n="bk.passAgain"]').textContent}));
    ok(modal.on,"חלון הסיסמה נפתח");
    eq(modal.title,"🔐 Backup password");
    ok(modal.hint.indexOf("There is no way to recover it")>=0,"האזהרה מתורגמת — התקבל: "+modal.hint);
    eq(modal.passLbl,"Password"); eq(modal.passAgainLbl,"Again, to confirm");
    await page.evaluate(()=>document.querySelector('#bkPassModal [data-close="bkPassModal"]').click());
  }),

  check("שגיאת סיסמה קצרה מתורגמת",withStudent,async page=>{
    await switchLang(page,"en");
    await page.evaluate(()=>document.getElementById("btnSettings").click());
    await page.waitForTimeout(300);
    await page.evaluate(()=>{ document.getElementById("set-bkEnc").checked=true; document.getElementById("set-bkExport").click(); });
    await page.waitForTimeout(400);
    await page.evaluate(()=>{ document.getElementById("bk-pass1").value="123"; document.getElementById("bk-passGo").click(); });
    await page.waitForTimeout(200);
    eq(await page.evaluate(()=>document.getElementById("bk-passWarn").textContent),"Password must be at least 8 characters.");
    await page.evaluate(()=>document.querySelector('#bkPassModal [data-close="bkPassModal"]').click());
  }),

  /* ---------- 3. טיפ התחלה ---------- */

  check("טיפ שטח: מכשיר ריק לגמרי מקבל את הצעד הראשון, לא טיפ אקראי",empty,async page=>{
    await go(page,"home");
    const tip=await page.evaluate(()=>document.getElementById("fieldTip").textContent);
    ok(tip.indexOf("מצב הדגמה")>=0,"מפנה למצב הדגמה — התקבל: "+tip);
  }),

  check("טיפ שטח: מכשיר עם נתונים מקבל טיפ שימוש רגיל, לא את טיפ ההתחלה",withStudent,async page=>{
    await go(page,"home");
    const tip=await page.evaluate(()=>document.getElementById("fieldTip").textContent);
    ok(tip.indexOf("מצב הדגמה")<0,"אינו טיפ ההתחלה — התקבל: "+tip);
    ok(tip.length>0,"ויש בכל זאת טיפ כלשהו");
  }),

  /* ---------- 4. עקביות בין שפות ---------- */

  check("הגדרות: כרטיס שינוי שם הכיתה מתורגם, וטוסט השמירה מתורגם",empty,async page=>{
    await switchLang(page,"en");
    await page.evaluate(()=>document.getElementById("btnSettings").click());
    await page.waitForTimeout(300);
    const cls=await page.evaluate(()=>({
      title:document.querySelector('[data-i18n="set.clsTitle"]').textContent,
      btn:document.getElementById("set-clsRename").textContent}));
    eq(cls.title,"🏷 Class names"); eq(cls.btn,"Save");
    await page.evaluate(()=>document.getElementById("set-save").click());
    await page.waitForTimeout(200);
    eq(await page.evaluate(()=>document.getElementById("toastT").textContent),"Settings saved");
  }),

  check("מבחני כושר לא נגעו: הלשוניות נשארות עברית בעקביות בכל שפה — אין תרגום חלקי",withStudent,async page=>{
    await switchLang(page,"en");
    await go(page,"ft");
    const tabs=await page.evaluate(()=>[...document.querySelectorAll("#ft-tabs button")].map(b=>b.textContent));
    ok(tabs.every(t=>/[֐-׿]/.test(t)),"כל הלשוניות עדיין בעברית — התקבל: "+tabs.join(" | "));
    ok(tabs.some(t=>t.indexOf("מה חסר לכיתה")>=0),"כולל הלשונית החדשה משלב 10 — אותה עקביות בדיוק");
  })

]};
