"use strict";
/* שלב 8 — סגירת הזהות: cid הוא הזהות, cls הוא ההקשר.
   מול האפליקציה האמיתית: מסלולי היצירה מטביעים cid, הבוררים
   מסננים לפי cid, שינוי שם כיתה לא מפזר תלמידים, ושני תלמידים
   זהי-שם נשארים שניים. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const CLASSES={"c:ט:3":{id:"c:ט:3",name:"ט׳3",grade:"ט",num:3,key:"ט3"},
               "c:י:1":{id:"c:י:1",name:"י׳1",grade:"י",num:1,key:"י1"}};
const STU=[
  {id:"a",name:"דן אבירם",cls:"ט׳3",cid:"c:ט:3",sex:"boys",age:14,tests:[]},
  /* נוסף אחרי ההסבה — בלי cid, ובכתיב אחר */
  {id:"b",name:"רון לוי", cls:"ט3",sex:"boys",age:14,tests:[]},
  {id:"c",name:"גל שדה",  cls:"י׳1",cid:"c:י:1",sex:"boys",age:15,tests:[]},
  /* מלוח הביפ — בלי כיתה */
  {id:"d",name:"אורח",    cls:"",cid:null,sex:"boys",age:14,tests:[]}
];
const seed=extra=>Object.assign({
  "ft.classes":JSON.parse(JSON.stringify(CLASSES)),
  "ft.roster":{"ט3":[{id:"a",name:"דן אבירם",sex:"boys"},{id:"b",name:"רון לוי",sex:"boys"}],
               "י1":[{id:"c",name:"גל שדה",sex:"boys"}]},
  "stu.list":JSON.parse(JSON.stringify(STU)),
  "ft.results":[],"ft.last":{grade:"ט",num:3,sort:"name"},"pf.guideSeen":true,
  "schema.version":D.SCHEMA_VERSION
},extra||{});
/* אותו מכשיר אחרי שינוי שם: ט׳3 נקראת «ט׳3 — מגמת ספורט» ברישום */
const renamed=extra=>{ const s=seed(extra);
  s["ft.classes"]["c:ט:3"].name="ט׳3 — מגמת ספורט"; s["ft.classes"]["c:ט:3"].key="ט3מגמתספורט";
  return s; };

const go=async(page,m,ms)=>{ await page.evaluate(x=>window.HM.go(x),m); await page.waitForTimeout(ms||800); };
const stu=page=>page.evaluate(()=>window.HM.LS.get("stu.list",[]));
const names=(page,sel)=>page.evaluate(s=>[...document.querySelectorAll(s)].map(x=>x.textContent.trim()),sel);

module.exports={title:"שלב 8 — סגירת הזהות",tests:[

  /* ---------- 8A: מסלולי היצירה ---------- */

  check("הוספה ידנית: כל תלמיד חדש נולד עם cid, וכיתה חדשה נרשמת",seed(),async page=>{
    await go(page,"stu");
    await page.evaluate(()=>{
      document.getElementById("stu-defaultCls").value="ט׳4";
      document.getElementById("stu-bulk").value="נועה בר\nיובל כץ,י׳1";
      document.getElementById("stu-addSave").click();
    });
    await page.waitForTimeout(400);
    const list=await stu(page);
    const noa=list.find(x=>x.name==="נועה בר"), yuv=list.find(x=>x.name==="יובל כץ");
    ok(noa&&noa.id,"נועה נוספה עם sid");
    eq(noa.cls,"ט׳4","ההקשר — כפי שהוקלד");
    eq(noa.cid,"c:ט:4","הזהות");
    eq(yuv.cid,"c:י:1","כיתה מהשורה גוברת על ברירת המחדל");
    const reg=await page.evaluate(()=>window.HM.LS.get("ft.classes",{}));
    ok(reg["c:ט:4"],"ט׳4 נרשמה"); eq(reg["c:ט:4"].name,"ט׳4");
  }),

  check("הוספה ידנית בלי כיתה: תלמיד תקין עם cid:null",seed(),async page=>{
    await go(page,"stu");
    await page.evaluate(()=>{
      document.getElementById("stu-defaultCls").value="";
      document.getElementById("stu-bulk").value="בלי כיתה";
      document.getElementById("stu-addSave").click();
    });
    await page.waitForTimeout(400);
    const s=(await stu(page)).find(x=>x.name==="בלי כיתה");
    ok(s,"נוסף"); eq(s.cls,""); eq(s.cid,null,"לא הומצאה כיתה");
  }),

  check("ייבוא מלוח הביפ: תלמיד חדש בלי כיתה — cid:null, ולא ריק",seed({
    "bt.results":[{id:1,name:"תלמיד מהביפ",level:7,sh:5,dist:1200,time:421.3,speed:12.5}]
  }),async page=>{
    await go(page,"stu");
    await page.evaluate(()=>window.STU.importFromBeep());
    await page.waitForTimeout(500);
    const s=(await stu(page)).find(x=>x.name==="תלמיד מהביפ");
    ok(s&&s.id,"נוסף עם sid");
    eq(s.cls,""); eq(s.cid,null);
    ok("cid" in s,"השדה קיים במפורש");
  }),

  check("נתוני הדגמה: תלמידים ומדידות נולדים עם cid והכיתה רשומה",null,async page=>{
    await page.evaluate(()=>document.getElementById("lock-demo").click());
    await page.waitForTimeout(900);
    const list=await stu(page);
    eq(list.length,8,"שמונה תלמידי הדגמה");
    ok(list.every(x=>x.cid==="c:ט:3"),"לכולם אותו cid");
    const res=await page.evaluate(()=>window.HM.LS.get("ft.results",[]));
    ok(res.length>0&&res.every(r=>r.cid==="c:ט:3"&&r.sid),"וכל מדידה נושאת cid ו-sid");
    const reg=await page.evaluate(()=>window.HM.LS.get("ft.classes",{}));
    ok(reg["c:ט:3"],"הכיתה רשומה");
  }),

  check("שמירת כרטיס: תווית של כיתה ששמה שונה נפתרת למזהה הרשום, לא לחדש",renamed(),async page=>{
    await go(page,"stu");
    await page.evaluate(()=>document.querySelector('#stu-list .stu-row[data-id="b"]').click());
    await page.waitForTimeout(400);
    await page.evaluate(()=>{
      document.getElementById("stu-fCls").value="ט׳3 — מגמת ספורט";
      document.getElementById("stu-fSave").click();
    });
    await page.waitForTimeout(400);
    const b=(await stu(page)).find(x=>x.id==="b");
    eq(b.cls,"ט׳3 — מגמת ספורט","ההקשר התעדכן");
    eq(b.cid,"c:ט:3","הזהות — המזהה הרשום, לא cn:… חדש");
    const reg=await page.evaluate(()=>Object.keys(window.HM.LS.get("ft.classes",{})).sort());
    eq(reg,["c:ט:3","c:י:1"],"ולא נרשמה כיתה שנייה");
  }),

  check("שמירת כרטיס: מעבר כיתה אמיתי משנה את cid, והמדידות הישנות שומרות את שלהן",seed({
    "ft.results":[{id:"r1",d:"2026-09-01",ts:1,cls:"ט׳3",cid:"c:ט:3",test:"push",name:"דן אבירם",sid:"a",val:22,unit:"חזרות",gradeKey:"ט",sex:"boys"}]
  }),async page=>{
    await go(page,"stu");
    await page.evaluate(()=>document.querySelector('#stu-list .stu-row[data-id="a"]').click());
    await page.waitForTimeout(400);
    await page.evaluate(()=>{ document.getElementById("stu-fCls").value="י׳1"; document.getElementById("stu-fSave").click(); });
    await page.waitForTimeout(400);
    const a=(await stu(page)).find(x=>x.id==="a");
    eq(a.cid,"c:י:1"); eq(a.cls,"י׳1");
    const r=await page.evaluate(()=>window.HM.LS.get("ft.results",[])[0]);
    eq(r.cid,"c:ט:3","המדידה נשארה בכיתה שבה נלקחה");
    eq(r.cls,"ט׳3","וגם ההקשר ההיסטורי שלה");
  }),

  /* ---------- 8B: הבוררים מסננים לפי cid ---------- */

  check("תלמידים: «ט3» ו«ט׳3» הם צ׳יפ אחד, הבורר נושא cid, ותלמיד בלי כיתה רק ב«כל הכיתות»",seed(),async page=>{
    await go(page,"stu");
    const chips=await page.evaluate(()=>[...document.querySelectorAll("#stu-chips button")].map(b=>({c:b.dataset.c,t:b.textContent.trim()})));
    eq(chips.map(x=>x.c),["","c:ט:3","c:י:1"],"הערכים הם מזהים");
    ok(chips[1].t.indexOf("ט׳3")===0&&chips[1].t.indexOf("2")>0,"ט׳3 עם שני תלמידים — התקבל: "+chips[1].t);
    ok(chips[0].t.indexOf("4")>0,"«כל הכיתות» כולל את מי שבלי כיתה");
    const opts=await page.evaluate(()=>[...document.querySelectorAll("#stu-classSel option")].map(o=>[o.value,o.textContent]));
    eq(opts,[["","כל הכיתות"],["c:ט:3","ט׳3"],["c:י:1","י׳1"]]);
    await page.evaluate(()=>{ const s=document.getElementById("stu-classSel"); s.value="c:ט:3"; s.dispatchEvent(new Event("change")); });
    await page.waitForTimeout(300);
    eq(await names(page,"#stu-list .stu-row b"),["דן אבירם","רון לוי"],"שניהם, למרות הכתיב השונה");
  }),

  check("תלמידים: אחרי שינוי שם הכיתה — צ׳יפ אחד בשם החדש, ואותם תלמידים",renamed(),async page=>{
    await go(page,"stu");
    const chips=await page.evaluate(()=>[...document.querySelectorAll("#stu-chips button")].map(b=>b.textContent.trim()));
    ok(chips.some(t=>t.indexOf("ט׳3 — מגמת ספורט")===0),"השם מהרישום — התקבל: "+chips.join(" | "));
    ok(!chips.some(t=>/^ט3\b/.test(t)),"ולא צ׳יפ נפרד לכתיב הישן");
    await page.evaluate(()=>document.querySelector('#stu-chips button[data-c="c:ט:3"]').click());
    await page.waitForTimeout(300);
    eq(await names(page,"#stu-list .stu-row b"),["דן אבירם","רון לוי"]);
  }),

  check("ציונים: הסינון לפי cid, ותווית התצוגה נשארת מה שכתוב על התלמיד",renamed(),async page=>{
    await go(page,"stu");
    await page.evaluate(()=>document.querySelector('.pf-tabs [data-st="grades"]').click());
    await page.waitForTimeout(400);
    await page.evaluate(()=>{ const s=document.getElementById("gr-classSel"); s.value="c:ט:3"; s.dispatchEvent(new Event("change")); });
    await page.waitForTimeout(300);
    const rows=await page.evaluate(()=>[...document.querySelectorAll("#gr-table tbody tr")].map(tr=>[tr.dataset.sid,tr.children[1].textContent]));
    eq(rows,[["a","ט׳3"],["b","ט3"]],"שני התלמידים; העמודה מציגה את ההקשר כפי שהוקלד");
  }),

  check("כלי כיתה: קבוצות, הגרלה ומחוונים נושאים cid; הנוכחות שומרת על מפתח לפי שם",renamed({
    "tools.rubrics":[{id:"rb1",name:"מחוון",crit:["מאמץ"]}]
  }),async page=>{
    await go(page,"tools");
    const vals=await page.evaluate(()=>({
      team:[...document.querySelectorAll("#tl-teamCls option")].map(o=>o.value),
      pick:[...document.querySelectorAll("#tl-pickCls option")].map(o=>o.textContent),
      att:[...document.querySelectorAll("#tl-attCls option")].map(o=>o.value),
      rub:[...document.querySelectorAll("#tl-rubCls option")].map(o=>o.value)}));
    eq(vals.team,["","c:ט:3","c:י:1"],"קבוצות — מזהים");
    eq(vals.pick,["כל הכיתות","ט׳3 — מגמת ספורט","י׳1"],"הגרלה — השם מהרישום");
    eq(vals.att,["","ט3","ט׳3","י׳1"],"נוכחות — התוויות כפי שהוקלדו, כי tools.att ממופתח לפיהן");
    eq(vals.rub,["","c:ט:3","c:י:1"]);
    /* הגרלה מכיתה י׳1 — רק גל */
    await page.evaluate(()=>{ const s=document.getElementById("tl-pickCls"); s.value="c:י:1"; s.dispatchEvent(new Event("change")); document.getElementById("tl-pickGo").click(); });
    await page.waitForTimeout(1200);
    eq(await names(page,"#tl-pickList .pill"),["גל שדה"]);
    /* מחוון על ט׳3 — שני התלמידים */
    await page.evaluate(()=>{ const r=document.getElementById("tl-rubSel"); r.value="rb1"; r.dispatchEvent(new Event("change"));
      const s=document.getElementById("tl-rubCls"); s.value="c:ט:3"; s.dispatchEvent(new Event("change")); });
    await page.waitForTimeout(300);
    eq(await names(page,"#tl-rubBody .tl-rubrow .hd b"),["דן אבירם","רון לוי"]);
    /* נוכחות: בוחרים את התווית «ט3» — ומקבלים את כל הכיתה, לפי cid */
    await page.evaluate(()=>{ const s=document.getElementById("tl-attCls"); s.value="ט3"; s.dispatchEvent(new Event("change")); });
    await page.waitForTimeout(300);
    eq(await names(page,"#tl-attList .tl-attrow b"),["דן אבירם","רון לוי"],"«ט3» מביא גם את מי שכתוב עליו «ט׳3»");
    await page.evaluate(()=>document.querySelector('#tl-attList [data-att="a|p"]').click());
    await page.waitForTimeout(300);
    const keys=await page.evaluate(()=>Object.keys(window.HM.LS.get("tools.att",{})));
    eq(keys.length,1); ok(/\|ט3$/.test(keys[0]),"המפתח לפי התווית, כמו קודם — "+keys[0]);
  }),

  check("קבוצות: החלוקה מכיתה שנבחרה לפי cid כוללת את כל תלמידיה",seed(),async page=>{
    await go(page,"tools");
    await page.evaluate(()=>{ const s=document.getElementById("tl-teamCls"); s.value="c:ט:3"; s.dispatchEvent(new Event("change"));
      document.getElementById("tl-teamN").value="2"; document.getElementById("tl-teamN").dispatchEvent(new Event("input"));
      document.getElementById("tl-teamGo").click(); });
    await page.waitForTimeout(400);
    const all=(await names(page,"#tl-teamsWrap li")).sort();
    eq(all,["דן אבירם","רון לוי"],"שניהם, ולא גל מי׳1 ולא האורח");
  }),

  /* ---------- 8C: באגי זהות ---------- */

  check("importFromStu: שני «דן כהן» באותה כיתה עם שני sid — שניהם נכנסים לרשימה",seed({
    "ft.roster":{},
    "stu.list":[{id:"a1",name:"דן כהן",cls:"ט׳3",cid:"c:ט:3",sex:"boys",age:14,tests:[]},
                {id:"a2",name:"דן כהן",cls:"ט׳3",cid:"c:ט:3",sex:"boys",age:14,tests:[]},
                {id:"b", name:"רון לוי",cls:"ט3",sex:"boys",age:14,tests:[]}]
  }),async page=>{
    /* הבורר מייבא מ«התלמידים שלי» כשהרשימה ריקה */
    await go(page,"beep");
    await page.evaluate(()=>document.getElementById("bt-loadCls").click());
    await page.waitForTimeout(500);
    const ros=await page.evaluate(()=>window.FT.roster("ט׳3").map(x=>x.id));
    eq(ros,["a1","a2","b"],"שלושה, כולל שני דן כהן");
    eq(await page.evaluate(()=>document.querySelectorAll("#cp-list input").length),3);
  }),

  check("importFromStu: רשומה שהודבקה ידנית באותו שם אינה משוכפלת",seed({
    "ft.roster":{"ט3":[{id:"f1",name:"דן כהן",sex:null}]},
    "stu.list":[{id:"a1",name:"דן כהן",cls:"ט׳3",cid:"c:ט:3",sex:"boys",age:14,tests:[]}]
  }),async page=>{
    await go(page,"ft");
    await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').click());
    await page.waitForTimeout(600);
    await page.evaluate(()=>document.getElementById("ft-rosterBtn").click());
    await page.waitForTimeout(300);
    await page.evaluate(()=>document.getElementById("ft-rosImport").click());
    await page.waitForTimeout(300);
    eq(await page.evaluate(()=>window.FT.roster("ט׳3").map(x=>x.id)),["f1"],"אותו אדם, פעם אחת");
  }),

  check("ייבוא CSV: אותו שם בכיתה אחרת הוא תלמיד חדש; באותה כיתה — הקיים; שם אחר — חדש",seed({
    "ft.roster":{},
    "stu.list":[{id:"a",name:"דן כהן",cls:"ט׳3",cid:"c:ט:3",sex:"boys",age:14,tests:[]}]
  }),async page=>{
    await go(page,"ft");
    await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').click());
    await page.waitForTimeout(600);
    await page.evaluate(()=>document.getElementById("ft-rosterBtn").click());
    await page.waitForTimeout(300);
    await page.evaluate(()=>document.getElementById("ft-rosFile").click());
    await page.waitForTimeout(300);
    await page.evaluate(()=>{
      const t=document.getElementById("ft-impPaste");
      t.value="שם,כיתה\nדן כהן,י׳1\nדן כהן,ט׳3\nרון לוי,ט׳3";
      t.dispatchEvent(new Event("input"));
    });
    await page.waitForTimeout(300);
    await page.evaluate(()=>{ document.getElementById("ft-impStu").checked=true; document.getElementById("ft-impGo").click(); });
    await page.waitForTimeout(500);
    const list=await stu(page);
    const dans=list.filter(x=>x.name==="דן כהן");
    eq(dans.length,2,"דן כהן מט׳3 ודן כהן מי׳1 — שניים");
    eq(dans.find(x=>x.id==="a").cid,"c:ט:3","הקיים לא נגע");
    const dan2=dans.find(x=>x.id!=="a");
    eq(dan2.cid,"c:י:1"); eq(dan2.cls,"י׳1");
    ok(list.find(x=>x.name==="רון לוי")&&list.find(x=>x.name==="רון לוי").cid==="c:ט:3","רון נוסף");
    eq(list.length,3);
    const rosY=await page.evaluate(()=>window.FT.roster("י׳1"));
    eq(rosY.map(x=>x.id),[dan2.id],"ואותו מזהה בשתי הרשימות");
  }),

  /* ---------- 8C: Teach Mode ---------- */

  check("נוכחות אחרי שינוי שם כיתה: השיעור מוצא את כל תלמידי הכיתה לפי cid, בכל כתיב",renamed({
    "ls.sessions":[{id:"ls1",cid:"c:ט:3",clsSnapshot:"ט׳3",date:"2026-09-12",startedAt:1757000000000,endedAt:null,status:"active",planId:null,planTitle:""}],
    "stu.list":[{id:"a",name:"דן אבירם",cls:"ט׳3",cid:"c:ט:3",sex:"boys",age:14,tests:[]},
                {id:"b",name:"רון לוי",cls:"ט3",sex:"boys",age:14,tests:[]},
                {id:"e",name:"עמית גל",cls:"ט׳3 — מגמת ספורט",cid:"c:ט:3",sex:"boys",age:14,tests:[]},
                {id:"c",name:"גל שדה",cls:"י׳1",cid:"c:י:1",sex:"boys",age:15,tests:[]}]
  }),async page=>{
    await go(page,"tools");
    await page.evaluate(()=>document.querySelector('#tl-tabs [data-tt="att"]').click());
    await page.waitForTimeout(400);
    eq(await page.evaluate(()=>document.getElementById("tl-attCls").value),"ט׳3","התווית שזהה לצילום השיעור");
    eq(await names(page,"#tl-attList .tl-attrow b"),["דן אבירם","רון לוי","עמית גל"],"שלושת הכתיבים, בלי י׳1");
    eq(await page.evaluate(()=>document.getElementById("tl-attCtx").hidden),false,"והמסך אומר שזה מהשיעור");
  }),

  check("שיעור ישן בלי cid: הנוכחות נופלת אחורה לשם ואינה ריקה",seed({
    "ls.sessions":[{id:"ls0",clsSnapshot:"ט3",date:"2026-09-12",startedAt:1757000000000,endedAt:null,status:"active",planId:null,planTitle:""}]
  }),async page=>{
    await go(page,"tools");
    await page.evaluate(()=>document.querySelector('#tl-tabs [data-tt="att"]').click());
    await page.waitForTimeout(400);
    eq(await names(page,"#tl-attList .tl-attrow b"),["דן אבירם","רון לוי"]);
  }),

  check("שליחה מביפ טסט בשיעור אחרי שינוי שם: המדידה נושאת את cid השיעור ואת התווית כהקשר",renamed({
    "ls.sessions":[{id:"ls1",cid:"c:ט:3",clsSnapshot:"ט׳3",date:"2026-09-12",startedAt:1757000000000,endedAt:null,status:"active",planId:null,planTitle:""}],
    "bt.results":[{id:1,name:"דן אבירם",level:7,sh:5,dist:1200,time:421.3,speed:12.5}]
  }),async page=>{
    await go(page,"beep");
    await page.evaluate(()=>document.getElementById("bt-toFt").click());
    await page.waitForTimeout(700);
    const r=await page.evaluate(()=>window.FT.results()[0]);
    ok(r,"נשלחה");
    eq(r.cid,"c:ט:3","הזהות — לא cn:… חדש מהשם החדש");
    eq(r.cls,"ט׳3","ההקשר — התווית שתחתיה הרשימה");
    eq(r.sid,"a","ומקושרת לתלמיד");
    eq(r.sessionId,"ls1");
  }),

  check("מבחני כושר אחרי שינוי שם: הרשימה, המדידות והשיעור נשארים על אותה כיתה",renamed({
    "ft.results":[{id:"r1",d:"2026-09-01",ts:1,cls:"ט׳3",cid:"c:ט:3",test:"ljump",name:"דן אבירם",sid:"a",val:180,unit:"ס״מ",gradeKey:"ט",sex:"boys"}]
  }),async page=>{
    await go(page,"ft");
    eq(await page.evaluate(()=>window.FT.roster("ט׳3").length),2,"הרשימה נגישה");
    await page.evaluate(()=>document.querySelector('#ft-tests [data-t="ljump"]').click());
    await page.waitForTimeout(600);
    await page.evaluate(()=>{ const inp=document.querySelector("#ft-list [data-val]"); inp.value="195"; inp.dispatchEvent(new Event("change",{bubbles:true})); });
    await page.waitForTimeout(450);
    const res=await page.evaluate(()=>window.FT.results());
    eq(res.length,2);
    eq(res[1].cid,"c:ט:3","המדידה החדשה — אותו cid");
    await page.evaluate(()=>document.getElementById("ft-startLesson").click());
    await page.waitForTimeout(400);
    const act=await page.evaluate(()=>window.HM.session.active());
    eq(act.cid,"c:ט:3","והשיעור נפתח על הזהות הרשומה");
  })

]};
