"use strict";
/* ============================================================
   קבוצות הוראה
   ------------------------------------------------------------
   המודל הניח שמה שמלמדים הוא כיתה. בשדה זה לא נכון: מורים מחברים
   שתי כיתות לשיעור אחד, ולפעמים בונים קבוצת למידה מתלמידים שמגיעים
   מכמה כיתות. עד עכשיו הם נאלצו לפצל שיעור אחד לשניים.

   הקו שהבדיקות כאן שומרות עליו הוא אחד, והוא נבדק שוב בדפדפן ולא
   רק ביחידה: **הקבוצה היא הקשר הוראה, לא כיתה חדשה.** התלמיד נשאר
   בכיתה שלו, והמדידה נשארת שלה. ברגע שזה יישבר — היסטוריית התלמיד
   תיקרע לשניים בלי שאיש יראה.
   ============================================================ */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const CLS={
  "c:ז:1":{id:"c:ז:1",name:"ז׳1",grade:"ז",num:1,key:"ז1"},
  "c:ז:3":{id:"c:ז:3",name:"ז׳3",grade:"ז",num:3,key:"ז3"},
  "c:ח:1":{id:"c:ח:1",name:"ח׳1",grade:"ח",num:1,key:"ח1"}
};
const STU=[
  {id:"a",name:"דן אבירם",cls:"ז׳1",cid:"c:ז:1",sex:"boys"},
  {id:"b",name:"רון לוי",cls:"ז׳3",cid:"c:ז:3",sex:"boys"},
  {id:"c",name:"עדי כהן",cls:"ח׳1",cid:"c:ח:1",sex:"girls"},
  {id:"d",name:"נועה שרון",cls:"ח׳1",cid:"c:ח:1",sex:"girls"}
];
/* רשימות הכיתה — כפי שהן אצל מורה שכבר טען אותן. בלעדיהן מדידה
   נשמרת בלי מזהה תלמיד, וזאת התנהגות קיימת ונכונה שאינה נבדקת כאן. */
const ROSTER={"ז1":[{id:"a",name:"דן אבירם",sex:"boys"}],
              "ז3":[{id:"b",name:"רון לוי",sex:"boys"}],
              "ח1":[{id:"c",name:"עדי כהן",sex:"girls"},{id:"d",name:"נועה שרון",sex:"girls"}]};
const base={"ft.classes":CLS,"stu.list":STU,"ft.roster":ROSTER,"pf.guideSeen":true,
  "schema.version":D.SCHEMA_VERSION};
const DAY=()=>D.dayOfISO(new Date().toISOString().slice(0,10));

const openGroups=async page=>{
  await page.evaluate(()=>window.HM.openGroups());
  await page.waitForTimeout(300);
};
/* בונה קבוצה דרך הממשק, כפי שמורה עושה זאת */
const makeGroup=async(page,name,classes,sids)=>{
  await page.evaluate(a=>{
    document.getElementById("grp-name").value=a.name;
    (a.classes||[]).forEach(c=>{
      const i=document.querySelector('#grp-classes [data-gc="'+c+'"]');
      if(i)i.checked=true;
    });
    (a.sids||[]).forEach(s=>{
      const i=document.querySelector('#grp-students [data-gs="'+s+'"]');
      if(i)i.checked=true;
    });
    document.getElementById("grp-save").click();
  },{name,classes,sids});
  await page.waitForTimeout(350);
};
const groups=page=>page.evaluate(()=>{
  const st={get:(k,d)=>window.HM.LS.get(k,d===undefined?null:d),set:(k,v)=>window.HM.LS.set(k,v)};
  return window.HMDATA.listGroups(st);
});

module.exports={title:"קבוצות הוראה",tests:[

  check("מסך הקבוצות נפתח ריק, עם הזמנה",base,async page=>{
    await openGroups(page);
    const t=await page.evaluate(()=>document.getElementById("grp-list").textContent);
    ok(/לא הגדרת קבוצות/.test(t),t.replace(/\s+/g," ").slice(0,70));
  }),

  check("שתי כיתות מחוברות לקבוצה אחת",base,async page=>{
    await openGroups(page);
    await makeGroup(page,"ז׳1 + ז׳3",["c:ז:1","c:ז:3"]);
    const g=await groups(page);
    eq(g.length,1);
    eq(g[0].name,"ז׳1 + ז׳3");
    eq(g[0].members,["c:ז:1","c:ז:3"]);
    const t=await page.evaluate(()=>document.getElementById("grp-list").textContent.replace(/\s+/g," "));
    ok(/ז׳1 · ז׳3/.test(t),"ההרכב מוצג: "+t);
    ok(/2 תלמידים/.test(t),"ומספר התלמידים בפועל: "+t);
  }),

  check("קבוצת למידה מתלמידים משתי כיתות",base,async page=>{
    await openGroups(page);
    await makeGroup(page,"נבחרת אתלטיקה",[],["a","c"]);
    const g=await groups(page);
    eq(g[0].members,[],"בלי כיתות שלמות");
    eq(g[0].sids,["a","c"],"ושני תלמידים, כל אחד מכיתה אחרת");
    const n=await page.evaluate(gid=>{
      const st={get:(k,d)=>window.HM.LS.get(k,d===undefined?null:d),set:(k,v)=>window.HM.LS.set(k,v)};
      return window.HMDATA.studentsIn(st,gid,window.HM.LS.get("stu.list",[])).map(s=>s.name);
    },g[0].id);
    eq(n,["דן אבירם","עדי כהן"]);
  }),

  check("קבוצה מעורבת — כיתה שלמה ועוד תלמידים",base,async page=>{
    await openGroups(page);
    await makeGroup(page,"מעורבת",["c:ז:1"],["c"]);
    const g=await groups(page);
    eq(g[0].members,["c:ז:1"]);
    eq(g[0].sids,["c"]);
  }),

  check("הקו האדום: התלמיד נשאר בכיתה שלו",base,async page=>{
    await openGroups(page);
    await makeGroup(page,"ז׳1 + ז׳3",["c:ז:1","c:ז:3"]);
    const r=await page.evaluate(()=>{
      const st={get:(k,d)=>window.HM.LS.get(k,d===undefined?null:d),set:(k,v)=>window.HM.LS.set(k,v)};
      return window.HM.LS.get("stu.list",[]).map(s=>window.HMDATA.cidOfStudent(s,st));
    });
    eq(r,["c:ז:1","c:ז:3","c:ח:1","c:ח:1"],
      "אף תלמיד לא נשאב לקבוצה — אחרת ההיסטוריה שלו נקרעת");
  }),

  check("שגיאות נאמרות במסך ולא נבלעות",base,async page=>{
    await openGroups(page);
    await page.evaluate(()=>{
      document.getElementById("grp-name").value="";
      document.getElementById("grp-save").click();
    });
    await page.waitForTimeout(200);
    ok(await page.evaluate(()=>document.getElementById("grp-err").textContent.length>0),"שם חסר");
    await page.evaluate(()=>{
      document.getElementById("grp-name").value="ז׳2";
      document.querySelector('#grp-classes [data-gc="c:ז:1"]').checked=true;
      document.getElementById("grp-save").click();
    });
    await page.waitForTimeout(200);
    const e=await page.evaluate(()=>document.getElementById("grp-err").textContent);
    ok(/נקרא ככיתה/.test(e),"שם שנקרא ככיתה נדחה: "+e);
    eq((await groups(page)).length,0,"ואף קבוצה לא נוצרה");
  }),

  check("עריכה משנה שם והרכב, והמזהה נשאר",base,async page=>{
    await openGroups(page);
    await makeGroup(page,"ז׳1 + ז׳3",["c:ז:1","c:ז:3"]);
    const id=(await groups(page))[0].id;
    await page.evaluate(gid=>document.querySelector('[data-gedit="'+gid+'"]').click(),id);
    await page.waitForTimeout(250);
    eq(await page.evaluate(()=>document.getElementById("grp-name").value),"ז׳1 + ז׳3",
      "הטופס נטען עם הערכים הקיימים");
    eq(await page.evaluate(()=>document.querySelector('#grp-classes [data-gc="c:ז:1"]').checked),true,
      "וגם הסימונים");
    await page.evaluate(()=>{
      document.getElementById("grp-name").value="שכבת ז׳ — קבוצה א";
      document.querySelector('#grp-classes [data-gc="c:ח:1"]').checked=true;
      document.getElementById("grp-save").click();
    });
    await page.waitForTimeout(350);
    const g=await groups(page);
    eq(g.length,1,"לא נוצרה קבוצה שנייה");
    eq(g[0].id,id,"המזהה הוא הזהות");
    eq(g[0].name,"שכבת ז׳ — קבוצה א");
    eq(g[0].members.length,3);
  }),

  check("מחיקת קבוצה אינה נוגעת בכיתות ובתלמידים",base,async page=>{
    await openGroups(page);
    await makeGroup(page,"ז׳1 + ז׳3",["c:ז:1","c:ז:3"]);
    const id=(await groups(page))[0].id;
    await page.evaluate(gid=>document.querySelector('[data-gdel="'+gid+'"]').click(),id);
    await page.waitForTimeout(350);
    eq((await groups(page)).length,0);
    const r=await page.evaluate(()=>({
      cls:Object.keys(window.HM.LS.get("ft.classes",{})).sort(),
      stu:window.HM.LS.get("stu.list",[]).length
    }));
    eq(r.cls,["c:ז:1","c:ז:3","c:ח:1"],"שלוש הכיתות במקומן");
    eq(r.stu,4,"וכל התלמידים");
  }),

  /* ---------- קבוצה במערכת השעות ---------- */

  check("משבצת יכולה לשאת קבוצה במקום כיתה",base,async page=>{
    await openGroups(page);
    await makeGroup(page,"ז׳1 + ז׳3",["c:ז:1","c:ז:3"]);
    const id=(await groups(page))[0].id;
    await page.evaluate(d=>{
      window.HM.modal("grpModal",false);
      window.HM.openSched();
      window.HM.schedCell(d,2);
      document.querySelector('#sw-scope [data-s="grp"]').click();
    },DAY());
    await page.waitForTimeout(300);
    const vis=await page.evaluate(()=>({
      cls:getComputedStyle(document.getElementById("sw-clsRow")).display!=="none",
      grp:getComputedStyle(document.getElementById("sw-grpRow")).display!=="none",
      opt:document.getElementById("sw-group").value
    }));
    eq(vis.cls,false,"בורר הכיתה מתחלף");
    eq(vis.grp,true,"בבורר הקבוצות");
    eq(vis.opt,id,"והקבוצה שנוצרה זמינה בו");
    await page.evaluate(()=>document.getElementById("sw-add").click());
    await page.waitForTimeout(350);
    const sl=await page.evaluate(()=>window.HM.sched.list()[0]);
    eq(sl.cid,id,"המשבצת נושאת את מזהה הקבוצה");
    const cellTxt=await page.evaluate(d=>
      document.querySelector('#sw-grid [data-cell="'+d+'|2"]').textContent,DAY());
    ok(/ז׳1/.test(cellTxt),"והתא מציג את שם הקבוצה: "+cellTxt.trim());
  }),

  check("שיעור נפתח על קבוצה מדף הבית",base,async page=>{
    await openGroups(page);
    await makeGroup(page,"ז׳1 + ז׳3",["c:ז:1","c:ז:3"]);
    const id=(await groups(page))[0].id;
    await page.evaluate(d=>{
      window.HM.modal("grpModal",false);
      window.HM.openSched();
      window.HM.schedCell(d,2);
      document.querySelector('#sw-scope [data-s="grp"]').click();
      document.getElementById("sw-add").click();
      window.HM.modal("schedModal",false);
      window.HM.paintHome();
    },DAY());
    await page.waitForTimeout(400);
    const txt=await page.evaluate(()=>document.getElementById("hx-todayList").textContent
      .replace(/\s+/g," "));
    ok(/ז׳1 \+ ז׳3/.test(txt),"הקבוצה מופיעה ביום: "+txt.slice(0,70));
    await page.evaluate(()=>document.querySelector("#hx-todayList [data-slot]").click());
    await page.waitForTimeout(400);
    const a=await page.evaluate(()=>window.HM.session.active());
    ok(a,"נפתח שיעור");
    eq(a.cid,id,"על הקבוצה, לא על אחת הכיתות");
  }),

  /* ---------- מסך הקבוצה ---------- */

  check("מסך הקבוצה מראה את ההרכב ואת האיחוד",
    Object.assign({},base,{"ft.results":[
      {sid:"a",name:"דן אבירם",cid:"c:ז:1",cls:"ז׳1",test:"r60",val:9.2,d:"2026-09-06"},
      {sid:"b",name:"רון לוי",cid:"c:ז:3",cls:"ז׳3",test:"r60",val:9.8,d:"2026-09-06"},
      {sid:"c",name:"עדי כהן",cid:"c:ח:1",cls:"ח׳1",test:"r60",val:9.1,d:"2026-09-06"}
    ]}),async page=>{
    await openGroups(page);
    await makeGroup(page,"ז׳1 + ז׳3",["c:ז:1","c:ז:3"]);
    const id=(await groups(page))[0].id;
    await page.evaluate(gid=>{ window.HM.modal("grpModal",false); window.HM.openClassScreen(gid); },id);
    await page.waitForTimeout(400);
    const r=await page.evaluate(()=>({
      title:document.getElementById("cls-title").textContent,
      comp:(document.querySelector(".cls-comp")||{}).textContent||"",
      stats:[...document.querySelectorAll(".cls-stats .qs")].map(e=>e.textContent)
    }));
    ok(/^קבוצה/.test(r.title),"נקראת קבוצה ולא כיתה: "+r.title);
    ok(/ז׳1 · ז׳3/.test(r.comp),"ההרכב נאמר: "+r.comp.slice(0,60));
    ok(r.stats.some(x=>/^2תלמידים/.test(x)),"איחוד התלמידים: "+JSON.stringify(r.stats));
    ok(r.stats.some(x=>/^2מדידות/.test(x)),
      "ואיחוד המדידות — שתיים, לא שלוש: "+JSON.stringify(r.stats));
  }),

  check("מדידה של תלמיד בקבוצה נשארת שייכת לכיתה שלו",
    Object.assign({},base,{"ft.results":[
      {sid:"a",name:"דן אבירם",cid:"c:ז:1",cls:"ז׳1",test:"r60",val:9.2,d:"2026-09-06"}
    ]}),async page=>{
    await openGroups(page);
    await makeGroup(page,"ז׳1 + ז׳3",["c:ז:1","c:ז:3"]);
    await page.evaluate(()=>{ window.HM.modal("grpModal",false); window.HM.openClassScreen("c:ז:1"); });
    await page.waitForTimeout(400);
    const stats=await page.evaluate(()=>[...document.querySelectorAll(".cls-stats .qs")]
      .map(e=>e.textContent));
    ok(stats.some(x=>/^1מדידות/.test(x)),
      "הכיתה עדיין רואה את המדידה שלה: "+JSON.stringify(stats));
  }),

  check("מסך הקבוצה אינו מציע קיצור שיפתח את הכיתה הלא נכונה",base,async page=>{
    await openGroups(page);
    await makeGroup(page,"ז׳1 + ז׳3",["c:ז:1","c:ז:3"]);
    const id=(await groups(page))[0].id;
    await page.evaluate(gid=>{ window.HM.modal("grpModal",false); window.HM.openClassScreen(gid); },id);
    await page.waitForTimeout(350);
    eq(await page.evaluate(()=>!!document.getElementById("cls-ft")),false,
      "מבחני הכושר עדיין עובדים על כיתה בודדת");
    ok(await page.evaluate(()=>/דרך הכיתה עצמה/.test(document.getElementById("cls-body").textContent)),
      "ונאמר למורה איפה כן למדוד");
  }),

  /* ---------- מדידה בזמן שיעור קבוצתי ---------- */

  check("מדידה בשיעור קבוצתי נקשרת לשיעור ונשארת של הכיתה",base,async page=>{
    await openGroups(page);
    await makeGroup(page,"ז׳1 + ז׳3",["c:ז:1","c:ז:3"]);
    const id=(await groups(page))[0].id;
    /* פותחים שיעור על הקבוצה, ואז מודדים תלמיד מאחת הכיתות שבה */
    const r=await page.evaluate(async gid=>{
      window.HM.modal("grpModal",false);
      window.HM.session.start({cid:gid,clsSnapshot:"ז׳1 + ז׳3",
        date:new Date().toISOString().slice(0,10)});
      window.HM.go("ft");
      await new Promise(x=>setTimeout(x,600));
      window.FT.ingest("ז׳1","r60",[{name:"דן אבירם",val:9.2}],"test");
      const rows=window.HM.LS.get("ft.results",[]);
      return {row:rows[rows.length-1],ses:window.HM.session.active().id};
    },id);
    ok(r.row,"המדידה נשמרה");
    eq(r.row.cid,"c:ז:1","ונשארה של הכיתה של התלמיד — לא של הקבוצה");
    eq(r.row.sid,"a","ועל התלמיד הנכון");
    eq(r.row.sessionId,r.ses,
      "וקשורה לשיעור הקבוצתי — אחרת היא נשמרת נכון ומתנתקת מהשיעור שבו נלקחה");
  }),

  check("המדידה נספרת גם בכיתה וגם בקבוצה",base,async page=>{
    await openGroups(page);
    await makeGroup(page,"ז׳1 + ז׳3",["c:ז:1","c:ז:3"]);
    const id=(await groups(page))[0].id;
    await page.evaluate(async gid=>{
      window.HM.modal("grpModal",false);
      window.HM.session.start({cid:gid,clsSnapshot:"ז׳1 + ז׳3",
        date:new Date().toISOString().slice(0,10)});
      window.HM.go("ft");
      await new Promise(x=>setTimeout(x,600));
      window.FT.ingest("ז׳1","r60",[{name:"דן אבירם",val:9.2}],"test");
    },id);
    const count=async cid=>{
      await page.evaluate(c=>window.HM.openClassScreen(c),cid);
      await page.waitForTimeout(300);
      return page.evaluate(()=>[...document.querySelectorAll(".cls-stats .qs")]
        .map(e=>e.textContent).find(x=>/מדידות$/.test(x)));
    };
    ok(/^1/.test(await count("c:ז:1")),"הכיתה רואה אותה");
    ok(/^1/.test(await count(id)),"והקבוצה רואה אותה");
    ok(/^0/.test(await count("c:ח:1")),"וכיתה שאינה בקבוצה לא");
  }),

  /* לא דרך רענון: ההזרעה של החבילה כותבת ft.classes מחדש בכל טעינה,
     ולכן רענון כאן היה בודק את ההזרעה ולא את השמירה. מה שנבדק הוא
     מה שבאמת מבטיח הישרדות — שהקבוצה נכתבה לאחסון עצמו. */
  check("הקבוצה נכתבת לאחסון ולא נשארת בזיכרון",base,async page=>{
    await openGroups(page);
    await makeGroup(page,"ז׳1 + ז׳3",["c:ז:1","c:ז:3"]);
    const raw=await page.evaluate(()=>localStorage.getItem("pehub.ft.classes"));
    ok(raw&&/"kind":"group"/.test(raw),"הרישום באחסון כולל את הקבוצה");
    ok(/ז׳1 \+ ז׳3/.test(raw),"עם השם שניתן לה");
  })

]};
