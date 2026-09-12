"use strict";
/* שלב 9 — הרישום כמקור אמת לשם הכיתה, ושינוי שם דרך הממשק. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const X="c:ח:1";
const seed=extra=>Object.assign({
  "ft.classes":{[X]:{id:X,name:"ח׳1",grade:"ח",num:1,key:"ח1"}},
  "ft.roster":{"ח1":[{id:"a",name:"אליס כהן",sex:"girls"},{id:"b",name:"בוב לוי",sex:"boys"}]},
  "stu.list":[{id:"a",name:"אליס כהן",cls:"ח׳1",cid:X,sex:"girls",age:13,tests:[]},
              {id:"b",name:"בוב לוי",cls:"ח1",sex:"boys",age:13,tests:[]}],
  "ft.results":[{id:"r1",d:"2026-09-01",ts:1,cls:"ח׳1",cid:X,test:"ljump",name:"אליס כהן",sid:"a",val:170,unit:"ס״מ",gradeKey:"ח",sex:"girls"}],
  "ls.sessions":[{id:"ls1",cid:X,clsSnapshot:"ח׳1",date:"2026-09-12",startedAt:1757000000000,endedAt:null,status:"active",planId:null,planTitle:""}],
  "tools.att":{"2026-09-12|ח׳1":{a:"p"}},
  "ft.last":{grade:"ח",num:1,sort:"name"},"pf.guideSeen":true,"schema.version":D.SCHEMA_VERSION
},extra||{});
const renamedSeed=extra=>{ const s=seed(extra); s["ft.classes"][X]={id:X,name:"ח׳1 מצטיינים",grade:null,num:null,key:"ח1מצטיינים"}; return s; };

const go=async(page,m,ms)=>{ await page.evaluate(x=>window.HM.go(x),m); await page.waitForTimeout(ms||800); };
const txt=(page,sel)=>page.evaluate(s=>{ const e=document.querySelector(s); return e?e.textContent.trim():null; },sel);
const names=(page,sel)=>page.evaluate(s=>[...document.querySelectorAll(s)].map(x=>x.textContent.trim()),sel);
/* שינוי שם דרך ההגדרות */
const renameUi=async(page,cid,nm)=>{
  await page.evaluate(()=>document.getElementById("btnSettings").click());
  await page.waitForTimeout(300);
  await page.evaluate(({cid,nm})=>{
    const s=document.getElementById("set-clsSel"); s.value=cid; s.dispatchEvent(new Event("change"));
    document.getElementById("set-clsNew").value=nm;
    document.getElementById("set-clsRename").click();
  },{cid,nm});
  await page.waitForTimeout(500);
};

module.exports={title:"שלב 9 — שם מהרישום ושינוי שם",tests:[

  /* ---------- תצוגה מהרישום ---------- */
  check("מבחני כושר: השם מהרישום (cid רגיל)",seed(),async page=>{
    await go(page,"ft");
    eq(await txt(page,"#ft-clsName"),"ח׳1");
  }),
  check("מבחני כושר: אחרי שינוי שם — השם החדש, והתווית הישנה אינה התצוגה",renamedSeed(),async page=>{
    await go(page,"ft");
    eq(await txt(page,"#ft-clsName"),"ח׳1 מצטיינים");
    eq(await txt(page,"#ft-clsInfo"),"2 תלמידים ברשימה","הרשימה עדיין נמצאת — המפתח לא זז");
    ok((await txt(page,"#ft-tests"))!==null);
    const card=await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').textContent);
    ok(card.indexOf("1 בהיסטוריה")>=0,"והמדידה נספרת לכיתה — התקבל: "+card);
    await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').click());
    await page.waitForTimeout(600);
    const bar=await txt(page,"#ft-run");
    ok(bar.indexOf("ח׳1 מצטיינים")>=0&&bar.indexOf("אליס כהן")>=0,"מסך המדידה — השם החדש והרשימה");
  }),
  check("מבחני כושר: cid שאינו רשום — התווית מוצגת, בלי קריסה",seed({"ft.classes":{}}),async page=>{
    await go(page,"ft");
    eq(await txt(page,"#ft-clsName"),"ח׳1");
    const bar=await txt(page,"#lsBarT");
    ok(bar&&bar.indexOf("ח׳1")>=0,"פס השיעור נופל אחורה לצילום — "+bar);
  }),
  check("מכשיר ישן (סכמה 1): מוסב, והשם מוצג מהרישום שנוצר",{
    "ft.roster":{"ט3":[{name:"דן אבירם",sex:"boys"}]},
    "ft.results":[{id:"r1",d:"2026-09-02",ts:1,cls:"ט׳3",test:"ljump",name:"דן אבירם",val:180,unit:"ס״מ",gradeKey:"ט",sex:"boys"}],
    "ft.last":{grade:"ט",num:3,sort:"name"},"pf.guideSeen":true
  },async page=>{
    await go(page,"ft");
    eq(await txt(page,"#ft-clsName"),"ט׳3");
    eq(await page.evaluate(()=>window.HM.LS.get("ft.classes",{})["c:ט:3"].name),"ט׳3");
    eq(await txt(page,"#ft-clsInfo"),"1 תלמידים ברשימה");
  }),

  /* ---------- SCENARIO A: שינוי שם דרך הממשק ---------- */
  check("A · שינוי שם: cid נשמר, הרישום מתעדכן, וכל המסכים מציגים את השם החדש",seed(),async page=>{
    await go(page,"ft");
    await renameUi(page,X,"ח׳1 מצטיינים");
    const st=await page.evaluate(()=>({
      reg:window.HM.LS.get("ft.classes",{}), stu:window.HM.LS.get("stu.list",[]),
      res:window.HM.LS.get("ft.results",[]), ses:window.HM.session.active(),
      att:Object.keys(window.HM.LS.get("tools.att",{})), roster:Object.keys(window.HM.LS.get("ft.roster",{}))}));
    eq(Object.keys(st.reg),[X],"אותו מזהה, אין כיתה שנייה");
    eq(st.reg[X].name,"ח׳1 מצטיינים");
    eq(st.stu.map(s=>s.cid),[X,undefined],"אליס — אותו cid; בוב לא נכתב מחדש");
    eq(st.stu.map(s=>s.cls),["ח׳1","ח1"],"ההקשר לא נדרס");
    eq(st.res[0].cid,X); eq(st.ses.cid,X); eq(st.ses.clsSnapshot,"ח׳1","הצילום נשאר");
    eq(st.att,["2026-09-12|ח׳1"],"מפתח הנוכחות לא זז"); eq(st.roster,["ח1"]);
    /* מבחני כושר מתחת למודאל — צוירו מחדש */
    eq(await txt(page,"#ft-clsName"),"ח׳1 מצטיינים");
    ok((await txt(page,"#lsBarT")).indexOf("ח׳1 מצטיינים")>=0,"פס השיעור הפעיל");
    /* התלמידים שלי */
    await page.evaluate(()=>document.querySelector("#setModal .x, #setModal [data-close]")&&document.querySelector("#setModal [data-close]").click());
    await go(page,"stu");
    const opts=await page.evaluate(()=>[...document.querySelectorAll("#stu-classSel option")].map(o=>[o.value,o.textContent]));
    eq(opts,[["","כל הכיתות"],[X,"ח׳1 מצטיינים"]],"הבורר — אותו cid, השם החדש");
    await page.evaluate(()=>{ const s=document.getElementById("stu-classSel"); s.value="c:ח:1"; s.dispatchEvent(new Event("change")); });
    await page.waitForTimeout(300);
    eq(await names(page,"#stu-list .stu-row b"),["אליס כהן","בוב לוי"],"ושני התלמידים בה");
    /* נוכחות — ההקשר מהשיעור עדיין מוצא את הכיתה */
    await go(page,"tools");
    await page.evaluate(()=>document.querySelector('#tl-tabs [data-tt="att"]').click());
    await page.waitForTimeout(400);
    eq(await names(page,"#tl-attList .tl-attrow b"),["אליס כהן","בוב לוי"]);
    eq(await page.evaluate(()=>document.getElementById("tl-attCtx").hidden),false);
    eq(await page.evaluate(()=>document.getElementById("tl-attCls").value),"ח׳1","הבורר על התווית של המפתח הקיים");
    ok(await page.evaluate(()=>document.querySelector('#tl-attList [data-att="a|p"]').classList.contains("on")),"והסימון הישן נטען");
  }),

  /* ---------- SCENARIO B: שתי כיתות באותו שם ---------- */
  check("B · שתי כיתות באותו שם נשארות שתיים, ומובחנות בבורר לפי התווית שבה נוצרו",seed({
    "ft.classes":{[X]:{id:X,name:"ח׳1",grade:"ח",num:1,key:"ח1"},"c:ח:2":{id:"c:ח:2",name:"ח׳1",grade:"ח",num:1,key:"ח1"}},
    "stu.list":[{id:"a",name:"אליס כהן",cls:"ח׳1",cid:X,sex:"girls",age:13,tests:[]},
                {id:"c",name:"קרול בר",cls:"ח׳2",cid:"c:ח:2",sex:"girls",age:13,tests:[]}]
  }),async page=>{
    await go(page,"stu");
    const chips=await page.evaluate(()=>[...document.querySelectorAll("#stu-chips button")].map(b=>[b.dataset.c,b.textContent.trim()]));
    eq(chips.map(x=>x[0]),["",X,"c:ח:2"],"שני צ׳יפים, שני מזהים");
    ok(chips[1][1].indexOf("1")>0&&chips[2][1].indexOf("1")>0,"תלמיד אחד בכל אחת — לא מוזגו");
    const list=await page.evaluate(()=>window.HM.classRenameList().map(x=>[x.cid,x.name,x.origin,x.students]));
    eq(list,[[X,"ח׳1","ח׳1",1],["c:ח:2","ח׳1","ח׳2",1]]);
    await page.evaluate(()=>document.getElementById("btnSettings").click());
    await page.waitForTimeout(300);
    const opts=await names(page,"#set-clsSel option");
    ok(opts.some(t=>t.indexOf("נוצרה כ-ח׳2")>=0),"הבורר מבחין — "+opts.join(" | "));
  }),

  /* ---------- SCENARIO C: תווית ישנה על תלמיד ---------- */
  check("C · שינוי שם למראה של כיתה אחרת: הזהות נשארת X גם לתלמיד עם התווית הישנה ובלי cid",seed(),async page=>{
    await go(page,"stu");
    await renameUi(page,X,"ח׳2");   /* confirm — מאושר אוטומטית בבדיקה */
    const st=await page.evaluate(()=>({reg:Object.keys(window.HM.LS.get("ft.classes",{})),
      cids:window.HM.LS.get("stu.list",[]).map(s=>window.HMDATA.cidOfStudent(s,{get:(k,d)=>window.HM.LS.get(k,d),set(){}}))}));
    eq(st.reg,[X],"לא נוצרה c:ח:2");
    eq(st.cids,[X,X],"אליס (cid) ובוב (תווית «ח1» בלבד) — שניהם X");
  }),

  /* ---------- SCENARIO D: ייבוא ---------- */
  check("D · ייבוא CSV אחרי שינוי שם: שורה בתווית הישנה מתמזגת לתלמיד הקיים באותה זהות",renamedSeed({"ft.roster":{}}),async page=>{
    await go(page,"ft");
    await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').click());
    await page.waitForTimeout(600);
    await page.evaluate(()=>document.getElementById("ft-rosterBtn").click()); await page.waitForTimeout(300);
    await page.evaluate(()=>document.getElementById("ft-rosFile").click()); await page.waitForTimeout(300);
    await page.evaluate(()=>{ const t=document.getElementById("ft-impPaste"); t.value="שם,כיתה\nאליס כהן,ח׳1\nדנה גל,ח1"; t.dispatchEvent(new Event("input")); });
    await page.waitForTimeout(300);
    await page.evaluate(()=>{ document.getElementById("ft-impStu").checked=true; document.getElementById("ft-impGo").click(); });
    await page.waitForTimeout(500);
    const stu=await page.evaluate(()=>window.HM.LS.get("stu.list",[]));
    eq(stu.filter(s=>s.name==="אליס כהן").length,1,"אליס לא שוכפלה");
    eq(stu.find(s=>s.name==="אליס כהן").cid,X);
    eq(stu.find(s=>s.name==="דנה גל").cid,X,"החדשה — לאותה זהות");
    eq(Object.keys(await page.evaluate(()=>window.HM.LS.get("ft.classes",{}))),[X],"ולא נרשמה כיתה שנייה");
  }),

  /* ---------- SCENARIO E: מדידות ---------- */
  check("E · מדידה ישנה וחדשה אחרי שינוי שם — אותו cid, התווית כהקשר",renamedSeed(),async page=>{
    await go(page,"ft");
    await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').click());
    await page.waitForTimeout(600);
    await page.evaluate(()=>{ const inp=document.querySelector('#ft-list [data-val="id:b"]')||document.querySelector("#ft-list [data-val]"); inp.value="150"; inp.dispatchEvent(new Event("change",{bubbles:true})); });
    await page.waitForTimeout(450);
    const res=await page.evaluate(()=>window.FT.results());
    eq(res.length,2);
    eq(res.map(r=>r.cid),[X,X]); eq(res[1].cls,"ח׳1","ההקשר — תווית המפתח");
    eq(res[1].sessionId,"ls1","ומקושרת לשיעור הפעיל של הכיתה");
  }),

  /* ---------- SCENARIO F: שיעור ---------- */
  check("F · היסטוריית השיעור שומרת את הצילום ומציגה לצידו את השם של היום",renamedSeed({
    "ls.sessions":[{id:"ls1",cid:X,clsSnapshot:"ח׳1",date:"2026-09-01",startedAt:1,endedAt:3000000,status:"completed",planId:null,planTitle:""}],
    "ft.results":[{id:"r1",d:"2026-09-01",ts:1,cls:"ח׳1",cid:X,test:"ljump",name:"אליס כהן",sid:"a",val:170,unit:"ס״מ",sessionId:"ls1"}]
  }),async page=>{
    await page.evaluate(()=>window.HM.openSesHist()); await page.waitForTimeout(400);
    const t=await txt(page,"#lsHistBody");
    ok(t.indexOf("ח׳1")>=0&&t.indexOf("היום: ח׳1 מצטיינים")>=0,"צילום + שם נוכחי — "+t.replace(/\n/g," | "));
    ok(t.indexOf("1 מדידות")>=0);
    /* הבורר המשותף נפתח על ח/1 מתוך cid, גם כשלשם החדש אין שכבה */
    await page.evaluate(()=>{ window.HM.LS.set("ls.sessions",[{id:"ls2",cid:"c:ח:1",clsSnapshot:"ח׳1 מצטיינים",date:"2026-09-12",startedAt:2,endedAt:null,status:"active",planId:null,planTitle:""}]); });
    await go(page,"beep");
    await page.evaluate(()=>document.getElementById("bt-loadCls").click()); await page.waitForTimeout(500);
    const on=await page.evaluate(()=>({g:document.querySelector("#cp-grades button.on").dataset.g,n:document.querySelector("#cp-nums button.on").dataset.n,note:document.getElementById("cp-note").textContent}));
    eq(on.g,"ח"); eq(on.n,"1");
    ok(on.note.indexOf("ח׳1 מצטיינים")>=0,"וההערה בשם הרשום — "+on.note);
  }),

  /* ---------- ולידציה וקיצור ---------- */
  check("שינוי שם: שם ריק או זהה — לא נכתב דבר",seed(),async page=>{
    await renameUi(page,X,"   ");
    await renameUi(page,X,"ח׳1");
    const reg=await page.evaluate(()=>window.HM.LS.get("ft.classes",{}));
    eq(reg[X].name,"ח׳1");
  }),
  check("הקיצור ממבחני הכושר פותח את ההגדרות על הכיתה הנבחרת",seed(),async page=>{
    await go(page,"ft");
    await page.evaluate(()=>document.getElementById("ft-clsRename").click());
    await page.waitForTimeout(300);
    ok(await page.evaluate(()=>document.getElementById("setModal").classList.contains("on")));
    eq(await page.evaluate(()=>document.getElementById("set-clsSel").value),X);
    eq(await txt(page,"#set-clsCur"),"ח׳1");
  }),

  /* ---------- זהות תלמיד בקליטה ---------- */
  check("קליטה מביפ: שני תלמידים באותו שם ברשימה — לא מנחשים, המדידה מסומנת להכרעה",seed({
    "ft.roster":{"ח1":[{id:"a",name:"דן כהן",sex:"boys"},{id:"a2",name:"דן כהן",sex:"boys"},{id:"b",name:"בוב לוי",sex:"boys"}]},
    "ft.results":[]
  }),async page=>{
    const r=await page.evaluate(()=>window.FT.ingest("ח׳1","beep",[{name:"דן כהן",val:900},{name:"בוב לוי",val:800}],"ביפ טסט"));
    eq(r.added,2);
    const res=await page.evaluate(()=>window.FT.results());
    const dan=res.find(x=>x.name==="דן כהן"), bob=res.find(x=>x.name==="בוב לוי");
    eq(dan.sid,null); eq(dan.sidAmbig,"duplicate-name"); eq(dan.cid,X);
    eq(bob.sid,"b");
    await go(page,"ft");
    eq(await page.evaluate(()=>document.getElementById("ft-ambCard").hidden),false,"וכרטיס ההכרעה מופיע");
  }),

  /* ---------- cidAmbig ---------- */
  check("כרטיס תלמיד: הסימון «אין כיתה» מסכים עם cid בשני הכיוונים",seed({
    "stu.list":[{id:"d",name:"אורח",cls:"",cid:null,cidAmbig:"no-class",sex:"boys",age:13,tests:[]}]
  }),async page=>{
    await go(page,"stu");
    await page.evaluate(()=>document.querySelector('#stu-list .stu-row[data-id="d"]').click()); await page.waitForTimeout(400);
    await page.evaluate(()=>{ document.getElementById("stu-fCls").value="ח׳1"; document.getElementById("stu-fSave").click(); }); await page.waitForTimeout(400);
    let s=await page.evaluate(()=>window.HM.LS.get("stu.list",[])[0]);
    eq(s.cid,X); eq(s.cidAmbig,undefined,"קיבל כיתה — הסימון ירד");
    await page.evaluate(()=>{ document.getElementById("stu-fCls").value=""; document.getElementById("stu-fSave").click(); }); await page.waitForTimeout(400);
    s=await page.evaluate(()=>window.HM.LS.get("stu.list",[])[0]);
    eq(s.cid,null); eq(s.cidAmbig,"no-class","הכיתה נמחקה — הסימון חזר");
  })
]};
