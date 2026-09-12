"use strict";
/* השלמת Teach Mode — ההקשר של השיעור מגיע למודולים.
   שלב 5 בנה «שיעור פעיל» אבל רק המדידות צרכו אותו. כאן נבדק
   שהוא באמת חוסך למורה את בחירת הכיתה החוזרת. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const CLASSES={"c:ט:3":{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"},
               "c:י:1":{id:"c:י:1",name:"י׳1",grade:"י",num:1,key:"י1"}};
const ROSTER={"ט3":[{id:"a",name:"דן אבירם",sex:"boys"},{id:"b",name:"רון לוי",sex:"boys"}],
              "י1":[{id:"c",name:"גל שדה",sex:"boys"}]};
/* רשומת ביפ טסט בפורמט שהמודול באמת שומר: id, sh, time, speed —
   ולא רק המרחק. בלי speed הטבלה מתרסקת ברינדור. */
const BTROW={id:1,name:"דן אבירם",level:7,sh:5,dist:1200,time:421.3,speed:12.5};
const ses=(o)=>Object.assign({id:"ls1",cid:"c:ט:3",clsSnapshot:"ט׳3",date:"2026-09-12",
  startedAt:1757000000000,endedAt:null,status:"active",planId:null,planTitle:""},o||{});

const seed=extra=>Object.assign({
  "ft.classes":CLASSES,"ft.roster":ROSTER,"ft.results":[],
  /* הכיתה האחרונה היא י׳1 — כדי שיהיה ברור שהבורר נפתח על השיעור
     ולא על מה שנבחר לאחרונה */
  "ft.last":{grade:"י",num:1,sort:"name"},"pf.guideSeen":true,
  "schema.version":D.SCHEMA_VERSION
},extra||{});

const openPicker=async(page,mod,btn)=>{
  await page.evaluate(m=>window.HM.go(m),mod);
  await page.waitForTimeout(800);
  await page.evaluate(b=>document.getElementById(b).click(),btn);
  await page.waitForTimeout(500);
};

module.exports={title:"השלמת Teach Mode",tests:[

  /* ---------- בורר הכיתה ---------- */

  check("בלי שיעור — הבורר נפתח על הכיתה האחרונה",seed(),async page=>{
    await openPicker(page,"beep","bt-loadCls");
    const on=await page.evaluate(()=>({
      g:document.querySelector("#cp-grades button.on").dataset.g,
      n:document.querySelector("#cp-nums button.on").dataset.n}));
    eq(on.g,"י","הכיתה האחרונה");
    eq(on.n,"1");
  }),

  check("עם שיעור — הבורר בביפ טסט נפתח על כיתת השיעור",
    seed({"ls.sessions":[ses()]}),async page=>{
    await openPicker(page,"beep","bt-loadCls");
    const on=await page.evaluate(()=>({
      g:document.querySelector("#cp-grades button.on").dataset.g,
      n:document.querySelector("#cp-nums button.on").dataset.n,
      note:document.getElementById("cp-note").textContent}));
    eq(on.g,"ט","כיתת השיעור ולא האחרונה");
    eq(on.n,"3");
    ok(on.note.indexOf("שיעור פעיל")>=0,"והבורר אומר למה — התקבל: "+on.note);
  }),

  check("עם שיעור — גם הבורר בפוטו-פיניש",
    seed({"ls.sessions":[ses()]}),async page=>{
    await openPicker(page,"photo","pf-loadCls");
    const on=await page.evaluate(()=>({
      g:document.querySelector("#cp-grades button.on").dataset.g,
      n:document.querySelector("#cp-nums button.on").dataset.n}));
    eq(on.g,"ט"); eq(on.n,"3");
  }),

  check("שיעור שהסתיים אינו משפיע על הבורר",
    seed({"ls.sessions":[ses({status:"completed",endedAt:1757009999999})]}),async page=>{
    await openPicker(page,"beep","bt-loadCls");
    const g=await page.evaluate(()=>document.querySelector("#cp-grades button.on").dataset.g);
    eq(g,"י","חוזרים לכיתה האחרונה");
  }),

  /* ---------- שליחת תוצאות ---------- */

  check("שליחה מביפ טסט לא שואלת לאיזו כיתה כששיעור פתוח",
    seed({"ls.sessions":[ses()],
      "bt.results":[BTROW]}),async page=>{
    await page.evaluate(()=>window.HM.go("beep")); await page.waitForTimeout(800);
    await page.evaluate(()=>document.getElementById("bt-toFt").click());
    await page.waitForTimeout(700);
    eq(await page.evaluate(()=>document.querySelectorAll("#cp-pickModal.on").length),0,
      "הבורר לא נפתח בכלל");
    const res=await page.evaluate(()=>window.FT.results());
    eq(res.length,1,"והתוצאה נשלחה");
    eq(res[0].cls,"ט׳3","לכיתת השיעור");
    eq(res[0].test,"beep");
  }),

  check("התוצאה שנשלחה נושאת את מזהה השיעור",
    seed({"ls.sessions":[ses()],
      "bt.results":[BTROW]}),async page=>{
    await page.evaluate(()=>window.HM.go("beep")); await page.waitForTimeout(800);
    await page.evaluate(()=>document.getElementById("bt-toFt").click());
    await page.waitForTimeout(700);
    const r=await page.evaluate(()=>window.FT.results()[0]);
    eq(r.sessionId,"ls1");
    eq(await page.evaluate(()=>window.HM.session.measurements("ls1").length),1);
  }),

  /* ---------- היסטוריית שיעורים ---------- */

  check("היסטוריה ריקה אומרת מה לעשות",seed(),async page=>{
    await page.evaluate(()=>window.HM.openSesHist()); await page.waitForTimeout(400);
    const txt=await page.evaluate(()=>document.getElementById("lsHistBody").innerText);
    ok(txt.indexOf("עדיין לא התקיים שיעור")>=0,"התקבל: "+txt.replace(/\n/g," | "));
  }),

  check("ההיסטוריה מציגה שיעורים, מהחדש לישן",seed({"ls.sessions":[
    ses({id:"ls2",cid:"c:י:1",clsSnapshot:"י׳1",date:"2026-09-13",startedAt:2000,
      status:"completed",endedAt:2000+45*60000}),
    ses({id:"ls1",date:"2026-09-12",startedAt:1000,status:"completed",
      endedAt:1000+50*60000,planTitle:"כדורסל — מסירות"})]}),async page=>{
    await page.evaluate(()=>window.HM.openSesHist()); await page.waitForTimeout(400);
    const txt=await page.evaluate(()=>document.getElementById("lsHistBody").innerText);
    ok(txt.indexOf("2 שיעורים")>=0,"נספרו שניים");
    ok(txt.indexOf("י׳1")<txt.indexOf("ט׳3"),"החדש למעלה");
    ok(txt.indexOf("45 דק׳")>=0,"עם משך — התקבל: "+txt.replace(/\n/g," | "));
    ok(txt.indexOf("כדורסל — מסירות")>=0,"ועם שם המערך");
  }),

  check("שיעור פעיל מסומן בהיסטוריה",seed({"ls.sessions":[ses()]}),async page=>{
    await page.evaluate(()=>window.HM.openSesHist()); await page.waitForTimeout(400);
    const txt=await page.evaluate(()=>document.getElementById("lsHistBody").innerText);
    ok(txt.indexOf("פעיל")>=0,"מסומן");
    ok(txt.indexOf("פתוח")>=0,"והמשך אומר «פתוח» ולא מספר");
  }),

  check("פירוט שיעור מראה את המדידות שנלקחו בו",seed({
    "ls.sessions":[ses({status:"completed",endedAt:1757003000000})],
    "ft.results":[{id:"m1",test:"ljump",sid:"a",cls:"ט׳3",cid:"c:ט:3",d:"2026-09-12",
      ts:1,val:182,unit:"ס״מ",name:"דן אבירם",gradeKey:"ט",sex:"boys",sessionId:"ls1"}]
  }),async page=>{
    await page.evaluate(()=>window.HM.openSesHist()); await page.waitForTimeout(400);
    let txt=await page.evaluate(()=>document.getElementById("lsHistBody").innerText);
    ok(txt.indexOf("1 מדידות")>=0,"נספרה מדידה — התקבל: "+txt.replace(/\n/g," | "));
    await page.evaluate(()=>document.querySelector("#lsHistBody [data-ses]").click());
    await page.waitForTimeout(300);
    txt=await page.evaluate(()=>document.getElementById("lsHistBody").innerText);
    ok(txt.indexOf("דן אבירם")>=0,"שם התלמיד");
    ok(txt.indexOf("182")>=0,"והתוצאה הגולמית");
  }),

  check("שיעור בלי מדידות אינו מציע פירוט",seed({
    "ls.sessions":[ses({status:"completed",endedAt:1757003000000})]}),async page=>{
    await page.evaluate(()=>window.HM.openSesHist()); await page.waitForTimeout(400);
    eq(await page.evaluate(()=>document.querySelectorAll("#lsHistBody [data-ses]").length),0);
    const txt=await page.evaluate(()=>document.getElementById("lsHistBody").innerText);
    ok(txt.indexOf("בלי מדידות")>=0);
  }),

  /* ---------- נוכחות ---------- */

  check("הנוכחות נפתחת על כיתת השיעור ועל התאריך שלו",seed({
    "ls.sessions":[ses()],
    "stu.list":[{id:"a",name:"דן אבירם",cls:"ט3",sex:"boys",age:14,tests:[]},
                {id:"c",name:"גל שדה", cls:"י׳1",sex:"boys",age:15,tests:[]}]
  }),async page=>{
    await page.evaluate(()=>window.HM.go("tools")); await page.waitForTimeout(800);
    await page.evaluate(()=>document.querySelector('#tl-tabs [data-tt="att"]').click());
    await page.waitForTimeout(500);
    eq(await page.evaluate(()=>document.getElementById("tl-attDate").value),"2026-09-12",
      "התאריך מהשיעור");
    const names=await page.evaluate(()=>
      [...document.querySelectorAll("#tl-attList .tl-attrow b")].map(x=>x.textContent));
    eq(names,["דן אבירם"],"ורק תלמידי כיתת השיעור — «ט3» תואם ל«ט׳3»");
    eq(await page.evaluate(()=>document.getElementById("tl-attCtx").hidden),false,
      "והמסך אומר למה");
  }),

  check("בלי שיעור — הנוכחות מתנהגת כמו קודם",seed({
    "stu.list":[{id:"a",name:"דן אבירם",cls:"ט3",sex:"boys",age:14,tests:[]},
                {id:"c",name:"גל שדה", cls:"י׳1",sex:"boys",age:15,tests:[]}]
  }),async page=>{
    await page.evaluate(()=>window.HM.go("tools")); await page.waitForTimeout(800);
    await page.evaluate(()=>document.querySelector('#tl-tabs [data-tt="att"]').click());
    await page.waitForTimeout(500);
    const n=await page.evaluate(()=>document.querySelectorAll("#tl-attList .tl-attrow").length);
    eq(n,2,"כל התלמידים");
    eq(await page.evaluate(()=>document.getElementById("tl-attCtx").hidden),true,
      "ואין הודעת הקשר");
  }),

  check("הנוכחות עצמה נשמרת כמו קודם",seed({
    "ls.sessions":[ses()],
    "stu.list":[{id:"a",name:"דן אבירם",cls:"ט3",sex:"boys",age:14,tests:[]}]
  }),async page=>{
    await page.evaluate(()=>window.HM.go("tools")); await page.waitForTimeout(800);
    await page.evaluate(()=>document.querySelector('#tl-tabs [data-tt="att"]').click());
    await page.waitForTimeout(500);
    await page.evaluate(()=>document.querySelector('#tl-attList [data-att$="|p"]').click());
    await page.waitForTimeout(300);
    const att=await page.evaluate(()=>window.HM.LS.get("tools.att",{}));
    const keys=Object.keys(att);
    eq(keys.length,1,"מפתח אחד");
    ok(keys[0].indexOf("2026-09-12")===0,"לפי תאריך השיעור — "+keys[0]);
    eq(att[keys[0]].a,"p","והסימון לפי מזהה התלמיד");
  })

]};
