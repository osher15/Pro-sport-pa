"use strict";
/* ============================================================
   מסך פרטי הקשר — שלב הפתיחה
   ------------------------------------------------------------
   המסך הזה חוסם את הכניסה לאפליקציה כולה ולא הייתה לו בדיקה. זה
   התגלה בדרך הקשה: מיזוג הביא אותו פנימה, והוא עצר את כל 187
   הבדיקות בלי שאיש שאל אותו. שער שחוסם הכול ראוי לבדיקה משלו.

   שאר החבילה מזריעה hx.leadDone מראש דרך ה-harness; כאן מבטלים
   את ההזרעה במפורש כדי לראות את המסך עצמו.
   ============================================================ */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const fresh={"hx.leadDone":false,"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION};
const seen={"hx.leadDone":true,"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION};

const shown=page=>page.evaluate(()=>{
  const el=document.getElementById("leadOv");
  return !!el&&el.classList.contains("on");
});
const fill=(page,v)=>page.evaluate(x=>{
  const set=(id,val)=>{ const e=document.getElementById(id); if(e)e.value=val; };
  set("lead-first",x.first); set("lead-last",x.last);
  set("lead-phone",x.phone); set("lead-email",x.email);
},Object.assign({first:"",last:"",phone:"",email:""},v));
const send=async page=>{
  await page.evaluate(()=>document.getElementById("lead-send").click());
  await page.waitForTimeout(350);
};

module.exports={title:"מסך פרטי הקשר",tests:[

  check("מופיע פעם אחת במכשיר חדש",fresh,async page=>{
    eq(await shown(page),true,"המסך מוצג לפני הכניסה");
  }),

  check("מי שכבר מסר פרטים לא רואה אותו שוב",seen,async page=>{
    eq(await shown(page),false,"שלב חד־פעמי, ולא תזכורת בכל כניסה");
  }),

  check("שדות חובה: בלי שם או בלי דרך ליצור קשר — לא ממשיכים",fresh,async page=>{
    await send(page);
    eq(await shown(page),true,"לחיצה על ריק לא סוגרת");

    await fill(page,{first:"אושר"}); await send(page);
    eq(await shown(page),true,"שם פרטי בלבד לא מספיק");

    await fill(page,{first:"אושר",last:"שמלאשוילי"}); await send(page);
    eq(await shown(page),true,"בלי נייד ובלי אימייל לא ממשיכים");

    eq(await page.evaluate(()=>window.HM.LS.get("hx.leadDone",false)),false,
      "ולא נרשם שהשלב הושלם כל עוד הוא לא הושלם");
  }),

  check("נייד לבדו מספיק, והשלב נסגר ונרשם",fresh,async page=>{
    await fill(page,{first:"אושר",last:"שמלאשוילי",phone:"050-0000000"});
    await send(page);
    eq(await shown(page),false,"המסך נסגר");
    eq(await page.evaluate(()=>window.HM.LS.get("hx.leadDone",false)),true,"ונרשם כהושלם");
  }),

  check("אימייל לבדו מספיק גם הוא",fresh,async page=>{
    await fill(page,{first:"אושר",last:"שמלאשוילי",email:"a@b.co"});
    await send(page);
    eq(await shown(page),false);
  }),

  check("אחרי סגירה מגיעים למסך הכניסה ולא נתקעים",fresh,async page=>{
    await fill(page,{first:"אושר",last:"שמלאשוילי",phone:"050-0000000"});
    await send(page);
    ok(await page.evaluate(()=>{
      const l=document.getElementById("lockOv");
      return !!l&&(l.classList.contains("on")||sessionStorage.getItem("pehub.unlocked")==="1");
    }),"מסך הכניסה זמין מאחוריו");
  }),

  check("המסך אינו נוגע בנתוני התלמידים",fresh,async page=>{
    const before=await page.evaluate(()=>Object.keys(localStorage).filter(k=>
      k.indexOf("pehub.stu")===0||k.indexOf("pehub.ft")===0).sort().join(","));
    await fill(page,{first:"אושר",last:"שמלאשוילי",phone:"050-0000000"});
    await send(page);
    const after=await page.evaluate(()=>Object.keys(localStorage).filter(k=>
      k.indexOf("pehub.stu")===0||k.indexOf("pehub.ft")===0).sort().join(","));
    eq(after,before,"מפתחות התלמידים והמדידות לא נגעו");
  })

]};
