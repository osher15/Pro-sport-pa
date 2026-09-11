"use strict";
/* בטיחות אחסון.
   הקוד הישן היה `catch(e){}` — מורה שמדד כיתה שלמה על מכשיר מלא
   פשוט לא קיבל את המדידות, בלי הודעה ובלי סימן. הבדיקות כאן מוודאות
   שכל כשל מסווג ומדווח, ושאף מסלול לא חוזר לשתוק. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");
const {memBackend}=require("../helpers/memstore.js");

const errOf=(name,msg,code)=>{ const e=new Error(msg||name); e.name=name; if(code!=null)e.code=code; return e; };

test("כתיבה תקינה מחזירה הצלחה וגודל",()=>{
  const b=memBackend();
  const r=D.safeSet(b,"pehub.x",{a:1});
  assert.equal(r.ok,true);
  assert.equal(r.bytes,JSON.stringify({a:1}).length);
  assert.equal(b.getItem("pehub.x"),'{"a":1}');
});

test("מכסה שנגמרה מסווגת כ-quota ולא נבלעת",()=>{
  const b=memBackend({limit:40});
  const r=D.safeSet(b,"pehub.big","x".repeat(500));
  assert.equal(r.ok,false,"הכישלון מדווח — זה כל העניין");
  assert.equal(r.code,D.ERR.QUOTA);
  assert.ok(r.error,"השגיאה המקורית נשמרת לדיווח");
});

test("כל הניבים של מכסה מזוהים",()=>{
  [errOf("QuotaExceededError"),
   errOf("NS_ERROR_DOM_QUOTA_REACHED"),
   errOf("Error","quota exceeded"),
   errOf("Error","x",22),
   errOf("Error","x",1014)
  ].forEach(e=>assert.equal(D.classifyStorageError(e),D.ERR.QUOTA,e.name+"/"+e.message));
});

test("אחסון חסום (גלישה פרטית) מסווג כ-unavailable",()=>{
  assert.equal(D.classifyStorageError(errOf("SecurityError")),D.ERR.UNAVAILABLE);
  assert.equal(D.classifyStorageError(errOf("Error","Access is denied for this document")),D.ERR.UNAVAILABLE);
  const b=memBackend({fail:()=>errOf("SecurityError","blocked")});
  assert.equal(D.safeSet(b,"pehub.x",1).code,D.ERR.UNAVAILABLE);
});

test("ערך שאי אפשר להמיר ל-JSON מסווג כ-serialize ולא מגיע לאחסון",()=>{
  const b=memBackend();
  const loop={}; loop.self=loop;
  const r=D.safeSet(b,"pehub.x",loop);
  assert.equal(r.ok,false);
  assert.equal(r.code,D.ERR.SERIALIZE);
  assert.equal(b.getItem("pehub.x"),null,"לא נכתב כלום");
});

test("שגיאה לא מוכרת מסווגת כ-unknown ולא כמכסה",()=>{
  assert.equal(D.classifyStorageError(errOf("WeirdError","משהו אחר")),D.ERR.UNKNOWN);
  assert.equal(D.classifyStorageError(null),D.ERR.UNKNOWN);
});

test("קריאה של מפתח שאינו קיים מחזירה ברירת מחדל ומסומנת כחסרה",()=>{
  const r=D.safeGet(memBackend(),"pehub.none",[]);
  assert.equal(r.ok,true);
  assert.deepEqual(r.value,[]);
  assert.equal(r.missing,true);
});

test("נתון פגום באחסון: המסך עולה עם ברירת מחדל, אבל הכשל מדווח",()=>{
  const b=memBackend();
  b.setItem("pehub.broken","{לא JSON");
  const r=D.safeGet(b,"pehub.broken",[]);
  assert.equal(r.ok,false,"לא מעמידים פנים שהכול תקין");
  assert.equal(r.code,D.ERR.SERIALIZE);
  assert.deepEqual(r.value,[],"אבל האפליקציה עדיין נפתחת");
  assert.equal(r.raw,"{לא JSON","והנתון הגולמי נשמר להצלה ידנית");
});

test("קריאה מאחסון חסום לא זורקת",()=>{
  const b=memBackend({fail:op=>op==="get"?errOf("SecurityError","blocked"):null});
  const r=D.safeGet(b,"pehub.x","ברירת מחדל");
  assert.equal(r.ok,false);
  assert.equal(r.code,D.ERR.UNAVAILABLE);
  assert.equal(r.value,"ברירת מחדל");
});

test("כתיבה שנכשלה לא הורסת את הערך הקודם",()=>{
  const b=memBackend({limit:60});
  assert.equal(D.safeSet(b,"pehub.k",[1,2,3]).ok,true);
  const kept=b.getItem("pehub.k");
  assert.equal(D.safeSet(b,"pehub.k",new Array(200).fill(9)).ok,false);
  assert.equal(b.getItem("pehub.k"),kept,"הנתון הישן שרד את הכישלון");
});

test("undefined נשמר כ-null ולא כמחרוזת undefined",()=>{
  const b=memBackend();
  assert.equal(D.safeSet(b,"pehub.u",undefined).ok,true);
  assert.equal(b.getItem("pehub.u"),"null");
  assert.equal(D.safeGet(b,"pehub.u","ברירת מחדל").value,null);
});
