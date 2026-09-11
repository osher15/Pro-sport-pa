"use strict";
/* גיבוי ושחזור — מקצה לקצה, כולל IndexedDB.
   סרטוני השיאים הם הדבר היחיד באפליקציה שאינו ב-localStorage,
   ולכן הם הדבר היחיד שהגיבוי הישן לא ראה. הבדיקות כאן נוגעות
   ב-IndexedDB אמיתי ולא בהדמיה שלו. */
const {check,eq,ok}=require("./harness.js");
const D=require("../../hm-data.js");

const base={
  "ft.roster":{"ט3":[{id:"a",name:"דן אבירם",sex:"boys"}]},
  "ft.results":[{id:"r1",d:"2026-09-02",ts:1,cls:"ט׳3",test:"push",name:"דן אבירם",sid:"a",val:22,unit:"חזרות"}],
  "settings":{school:"מקיף גימל",theme:"dark",sound:true},
  "schema.version":D.SCHEMA_VERSION,"pf.guideSeen":true};

/* כותב שיא עם «סרטון» (Blob קטן) ישירות ל-IndexedDB */
async function seedRecord(page,id,bytes){
  await page.evaluate(async a=>{
    const db=await new Promise((res,rej)=>{
      const rq=indexedDB.open("pehub-records",1);
      rq.onupgradeneeded=()=>{ if(!rq.result.objectStoreNames.contains("rec"))rq.result.createObjectStore("rec",{keyPath:"id"}); };
      rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error);
    });
    const blob=new Blob([new Uint8Array(a.bytes)],{type:"video/mp4"});
    await new Promise((res,rej)=>{
      const rq=db.transaction("rec","readwrite").objectStore("rec")
        .put({id:a.id,sport:"long",name:"דן אבירם",cls:"ט׳3",value:4.2,
              status:"approved",src:"manual",ts:Date.now(),video:blob});
      rq.onsuccess=()=>res(); rq.onerror=()=>rej(rq.error);
    });
    db.close();
  },{id,bytes});
}

module.exports={title:"גיבוי ושחזור",tests:[

  check("הגיבוי כולל את סרטוני השיאים מ-IndexedDB",base,async page=>{
    await seedRecord(page,"rec1",2048);
    const snap=await page.evaluate(()=>window.HM.backupTest.snapshotFull());
    eq(snap.v,2,"פורמט גרסה 2");
    ok(snap.data["ft.results"],"נתוני localStorage בפנים");
    ok(snap.idb,"מקטע המדיה קיים — זה מה שחסר בגיבוי הישן");
    eq(snap.idb.count,1,"השיא נכלל");
    ok(snap.idb.items[0].video&&snap.idb.items[0].video.b64,"והסרטון עצמו נכלל, לא רק המטא-דאטה");
    ok(snap.idb.items[0].video.b64.length>100,"הסרטון אינו ריק");
  }),

  check("הגיבוי עובר ולידציה ונושא גרסת סכמה",base,async page=>{
    const v=await page.evaluate(async()=>{
      const s=await window.HM.backupTest.snapshotFull();
      return {val:window.HMDATA.validateBackup(s),schema:s.schema};
    });
    eq(v.val.ok,true,"קובץ תקין — "+JSON.stringify(v.val.errors));
    eq(v.schema,D.SCHEMA_VERSION,"נושא את גרסת הסכמה כדי שידעו מה להסב");
  }),

  check("שחזור למכשיר ריק מחזיר גם את הנתונים וגם את הסרטונים",base,async page=>{
    await seedRecord(page,"rec1",2048);
    const snap=await page.evaluate(()=>window.HM.backupTest.snapshotFull());
    /* מנקים הכול — כמו מכשיר חדש.
       מרוקנים את המאגר ולא מוחקים אותו: deleteDatabase נחסם כל עוד
       האפליקציה מחזיקה חיבור פתוח, ואז הבדיקה תלויה לנצח. */
    await page.evaluate(async()=>{
      Object.keys(localStorage).filter(k=>k.indexOf("pehub.")===0).forEach(k=>localStorage.removeItem(k));
      const db=await new Promise((res,rej)=>{ const rq=indexedDB.open("pehub-records",1);
        rq.onupgradeneeded=()=>{ if(!rq.result.objectStoreNames.contains("rec"))rq.result.createObjectStore("rec",{keyPath:"id"}); };
        rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error); });
      await new Promise((res,rej)=>{ const rq=db.transaction("rec","readwrite").objectStore("rec").clear();
        rq.onsuccess=()=>res(); rq.onerror=()=>rej(rq.error); });
      db.close();
    });
    const r=await page.evaluate(s=>window.HM.backupTest.apply(s),snap);
    ok(r.keys>0,"שוחזרו מפתחות");
    eq(r.failed,0,"בלי כשלי כתיבה");
    eq(r.media.added,1,"והשיא עם הסרטון חזר");
    eq(await page.evaluate(()=>window.HM.LS.get("ft.results",[]).length),1,"המדידה חזרה");
    const vid=await page.evaluate(async()=>{
      const db=await new Promise(res=>{ const rq=indexedDB.open("pehub-records",1); rq.onsuccess=()=>res(rq.result); });
      const all=await new Promise(res=>{ const rq=db.transaction("rec").objectStore("rec").getAll(); rq.onsuccess=()=>res(rq.result); });
      db.close();
      return all.length?{n:all.length,size:all[0].video?all[0].video.size:0,type:all[0].video?all[0].video.type:""}:null;
    });
    ok(vid,"אין רשומות ב-IndexedDB אחרי שחזור");
    eq(vid.n,1);
    eq(vid.size,2048,"הסרטון חזר בגודלו המקורי");
    eq(vid.type,"video/mp4","ובסוג הנכון");
  }),

  check("שחזור אינו מוחק שיאים שקיימים רק במכשיר",base,async page=>{
    await seedRecord(page,"rec1",512);
    const snap=await page.evaluate(()=>window.HM.backupTest.snapshotFull());
    await seedRecord(page,"rec2",512);      /* שיא חדש שאינו בקובץ */
    await page.evaluate(s=>window.HM.backupTest.apply(s),snap);
    const n=await page.evaluate(async()=>{
      const db=await new Promise(res=>{ const rq=indexedDB.open("pehub-records",1); rq.onsuccess=()=>res(rq.result); });
      const all=await new Promise(res=>{ const rq=db.transaction("rec").objectStore("rec").getAll(); rq.onsuccess=()=>res(rq.result); });
      db.close(); return all.length;
    });
    eq(n,2,"שחזור מדיה מוסיף ולא מוחק");
  }),

  check("סרטון שחורג מהתקציב מדווח בשמו ולא נעלם בשקט",base,async page=>{
    await seedRecord(page,"big1",4096);
    await seedRecord(page,"big2",4096);
    const snap=await page.evaluate(()=>window.HM.backupTest.snapshotFull(5000));
    eq(snap.idb.count,2,"שתי הרשומות בקובץ — שיא בלי וידאו עדיף על שיא שנעלם");
    eq(snap.idb.omitted.length,1,"סרטון אחד לא נכנס");
    ok(snap.idb.omitted[0].name,"ולמורה כתוב איזה: "+JSON.stringify(snap.idb.omitted[0]));
    const v=await page.evaluate(s=>window.HMDATA.validateBackup(s),snap);
    ok(v.warnings.some(w=>w.indexOf("media-omitted")===0),"והוולידציה מסמנת את זה");
  }),

  check("קובץ פגום נדחה לפני שנוגעים בנתונים",base,async page=>{
    const bad=[{},{app:"אחר"},{app:"hamegrash-pro",kind:"backup",v:99,data:{}},
               {app:"hamegrash-pro",kind:"backup",v:2},
               {app:"hamegrash-pro",kind:"backup",v:2,data:{"ft.results":[1,2]}}];
    for(const b of bad){
      const v=await page.evaluate(x=>window.HMDATA.validateBackup(x),b);
      eq(v.ok,false,"קובץ פגום התקבל: "+JSON.stringify(b));
    }
    eq(await page.evaluate(()=>window.HM.LS.get("ft.results",[]).length),1,"הנתונים במכשיר לא נגעו");
  }),

  check("גיבוי מוצפן: אין בו שם תלמיד ולא שם בית ספר",base,async page=>{
    const txt=await page.evaluate(async()=>{
      const s=await window.HM.backupTest.snapshotFull();
      return JSON.stringify(await window.HM.backupTest.encrypt(s,"סיסמה-ארוכה-1234"));
    });
    ok(txt.indexOf("דן אבירם")<0,"שם התלמיד דלף לקובץ המוצפן");
    ok(txt.indexOf("מקיף גימל")<0,"שם בית הספר דלף");
    ok(txt.indexOf("ft.results")<0,"אפילו שמות המפתחות אינם גלויים");
    ok(txt.indexOf("AES-GCM")>0,"אבל המעטפת אומרת איך לפתוח");
  }),

  check("סיבוב מלא: הצפנה, פענוח והשוואה בית אחר בית",base,async page=>{
    const same=await page.evaluate(async()=>{
      const s=await window.HM.backupTest.snapshotFull();
      const enc=await window.HM.backupTest.encrypt(s,"סיסמה-ארוכה-1234");
      const back=await window.HM.backupTest.decrypt(enc,"סיסמה-ארוכה-1234");
      return JSON.stringify(back)===JSON.stringify(s);
    });
    eq(same,true,"מה שנכנס הוא מה שיוצא");
  }),

  check("סיסמה שגויה נכשלת ולא מחזירה נתונים",base,async page=>{
    const r=await page.evaluate(async()=>{
      const s=await window.HM.backupTest.snapshotFull();
      const enc=await window.HM.backupTest.encrypt(s,"סיסמה-ארוכה-1234");
      try{ await window.HM.backupTest.decrypt(enc,"סיסמה-אחרת-9999"); return "נפתח"; }
      catch(e){ return "נדחה"; }
    });
    eq(r,"נדחה");
  }),

  check("גיבוי ישן (גרסה 1, בלי מדיה) עדיין נטען ומוסב",base,async page=>{
    const v=await page.evaluate(()=>window.HMDATA.validateBackup({
      app:"hamegrash-pro",kind:"backup",v:1,at:"2025-01-01T00:00:00Z",
      data:{"ft.results":JSON.stringify([{id:"old",cls:"ט3",test:"push",name:"דן אבירם",d:"2025-01-01",val:9}])}}));
    eq(v.ok,true,"קובץ ישן מתקבל — "+JSON.stringify(v.errors));
    eq(v.schema,1,"ומסומן כסכמה ישנה");
    const r=await page.evaluate(s=>window.HM.backupTest.apply(s),{
      app:"hamegrash-pro",kind:"backup",v:1,at:"2025-01-01T00:00:00Z",
      data:{"ft.roster":JSON.stringify({"ט3":[{name:"דן אבירם"}]}),
            "ft.results":JSON.stringify([{id:"old",cls:"ט3",test:"push",name:"דן אבירם",d:"2025-01-01",val:9}])}});
    eq(r.failed,0);
    const res=await page.evaluate(()=>window.HM.LS.get("ft.results",[]));
    ok(res[0].sid,"ההסבה רצה על מה ששוחזר והמדידה קיבלה מזהה");
  })

]};
