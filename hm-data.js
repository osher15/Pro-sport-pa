"use strict";
/* ============================================================
   המגרש PRO — שכבת הנתונים
   ------------------------------------------------------------
   כל שאר הקבצים באפליקציה מדברים עם ה-DOM ולכן אפשר לבדוק אותם רק
   בדפדפן. הקובץ הזה הוא ההפך: פונקציות טהורות בלבד, בלי window,
   בלי localStorage ובלי DOM. הוא רץ גם בדפדפן (window.HMDATA) וגם
   ב-Node (module.exports), ולכן הוא היחיד שאפשר לכסות בבדיקות
   יחידה שרצות בשנייה אחת ב-CI.

   מה יושב כאן, ולמה דווקא כאן:
   1. גרסת סכמה ו-migrations — הכלל היחיד הוא שמיגרציה לא הורסת.
   2. זהות תלמיד — מזהה יציב במקום שם תצוגה.
   3. בטיחות אחסון — סיווג כשל כתיבה במקום catch ריק.
   4. גיבוי — הרכבה, ולידציה ותוכנית שחזור.
   ============================================================ */
(function(factory){
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(typeof window!=="undefined")window.HMDATA=api;
})(function(){

/* ============================================================
   1. מפתח כיתה
   ------------------------------------------------------------
   «ט׳3», «ט3» ו-«ט' 3» הם אותה כיתה. הנרמול חייב להיות זהה למה
   שב-hm-tests.js, אחרת מדידה תיפול בין הכיסאות.
   ============================================================ */
var clsKey=function(s){ return String(s==null?"":s).replace(/["'׳״\s\-־]/g,"").trim(); };

/* ============================================================
   2. מזהים יציבים
   ------------------------------------------------------------
   מזהה שנוצר מ-Date.now() אינו ניתן לשחזור, ולכן מיגרציה שרצה
   פעמיים הייתה מייצרת שני מזהים שונים לאותו תלמיד. המזהה כאן נגזר
   מהתוכן (כיתה + שם) ולכן ריצה חוזרת מגיעה בדיוק לאותה תוצאה —
   וזה מה שהופך את המיגרציה ל-idempotent ולניתנת לבדיקה.
   ============================================================ */
function hash32(str){
  var h=2166136261>>>0;              /* FNV-1a */
  for(var i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619)>>>0; }
  return h>>>0;
}
function derivedId(prefix,seed){
  var a=hash32(seed), b=hash32(seed+"#2");
  return prefix+a.toString(36)+b.toString(36).slice(0,4);
}

/* ============================================================
   3. זהות תלמיד
   ------------------------------------------------------------
   עד היום כל חיפוש היסטוריה עבד על r.name===name. זה עבד מצוין עד
   הרגע שבו מורה תיקן שגיאת כתיב בשם — ואז עשר מדידות התנתקו בשקט
   מהתלמיד ונשארו בקובץ בלי שאיש רואה אותן.

   הכלל החדש: המזהה קובע. השם הוא תצוגה בלבד.
   הכלל המשלים: רשומה ישנה בלי מזהה עדיין נמצאת לפי שם, אחרת
   המעבר עצמו היה מוחק היסטוריה — וזה בדיוק מה שבאנו למנוע.
   ============================================================ */
function studentKey(s){
  if(!s)return null;
  return s.id||s.sid||null;
}
/* מפתח לשימוש ב-DOM ובמפות זמניות: מזהה אם יש, ואחרת השם עם
   תחילית שמבדילה בין «תלמיד בשם X» לבין «תלמיד שמזההו X». */
function refKey(s){
  var id=studentKey(s);
  return id?("id:"+id):("nm:"+String(s&&s.name||""));
}
function sameStudent(rec,stud){
  if(!rec||!stud)return false;
  var sid=studentKey(stud);
  /* שני הצדדים מזוהים — רק המזהה קובע. שני תלמידים בשם «דן כהן»
     לא יתערבבו יותר, וגם שינוי שם לא מנתק כלום. */
  if(sid&&rec.sid)return rec.sid===sid;
  /* לרשומה אין מזהה: היא נוצרה לפני המעבר, או שהמיגרציה לא הצליחה
     לזהות אותה חד-משמעית. השם הוא כל מה שיש. */
  if(!rec.sid)return String(rec.name||"")===String(stud.name||"");
  /* לרשומה יש מזהה ולתלמיד אין — אין בסיס להתאמה. */
  return false;
}
function attemptsOf(results,clsName,testId,stud){
  var k=clsKey(clsName);
  return (results||[]).filter(function(r){
    return r&&clsKey(r.cls)===k&&r.test===testId&&sameStudent(r,stud);
  }).sort(function(a,b){
    return (String(a.d||"").localeCompare(String(b.d||"")))||((a.ts||0)-(b.ts||0));
  });
}

/* ============================================================
   4. גרסת סכמה ו-migrations
   ------------------------------------------------------------
   ה-store שמועבר לכאן הוא הפשטה על אחסון: keys/get/set. בדפדפן
   הוא עוטף את localStorage, בבדיקות הוא Map. המיגרציה לא יודעת
   ולא צריכה לדעת.

   שלושה כללים שאסור להפר:
   • דטרמיניסטי — אותו קלט נותן אותו פלט, תמיד.
   • idempotent — ריצה שנייה לא משנה כלום.
   • לא הרסני — רק הוספת שדות. אף רשומה לא נמחקת ואף שדה קיים
     לא נדרס. מה שלא ניתן לזהות בוודאות מסומן, לא מנוחש.
   ============================================================ */
var SCHEMA_VERSION=2;
var SCHEMA_KEY="schema.version";

/* --- 1 → 2: זהות תלמיד ---------------------------------- */
function mig_studentIdentity(store,rep){
  /* א. כל תלמיד ברשימות הכיתה מקבל מזהה יציב */
  var rosters=store.get("ft.roster",null);
  var idByCls={};                         /* clsKey -> [{id,name}] */
  if(rosters&&typeof rosters==="object"&&!Array.isArray(rosters)){
    var touched=false;
    Object.keys(rosters).forEach(function(k){
      var list=rosters[k];
      if(!Array.isArray(list))return;
      idByCls[clsKey(k)]=list;
      list.forEach(function(s){
        if(!s||typeof s!=="object")return;
        if(!s.id){ s.id=derivedId("s",clsKey(k)+"|"+String(s.name||"")); touched=true; rep.rosterIds++; }
      });
    });
    if(touched)store.set("ft.roster",rosters);
  }

  /* ב. «התלמידים שלי» — אותו טיפול */
  var stu=store.get("stu.list",null);
  if(Array.isArray(stu)){
    var t2=false;
    stu.forEach(function(s){
      if(!s||typeof s!=="object")return;
      if(!s.id){ s.id=derivedId("s",clsKey(s.cls)+"|"+String(s.name||"")); t2=true; rep.stuIds++; }
    });
    if(t2)store.set("stu.list",stu);
  }

  /* ג. כל מדידה מקבלת sid — או סימון למה לא קיבלה */
  var res=store.get("ft.results",null);
  if(!Array.isArray(res))return;
  var changed=false;
  res.forEach(function(r){
    if(!r||typeof r!=="object")return;
    if(r.sid)return;                      /* כבר מזוהה */
    if(r.sidAmbig)return;                 /* כבר נבדק ונמצא דו-משמעי */
    var list=idByCls[clsKey(r.cls)]||[];
    var nm=String(r.name||"");
    var hits=list.filter(function(s){ return s&&String(s.name||"")===nm; });
    if(hits.length===1){
      r.sid=hits[0].id; r.sidFrom="migrate/v2";
      rep.linked++; changed=true;
    }else{
      /* אין התאמה, או שיש שתיים. ניחוש כאן היה מעביר היסטוריה של
         תלמיד אחד לתלמיד אחר — נזק גרוע בהרבה מרשומה לא מקושרת.
         הרשומה נשארת, נמצאת לפי שם, ומסומנת כדי שאפשר יהיה להציג
         למורה בדיוק מה דורש הכרעה ידנית. */
      r.sidAmbig=hits.length?"duplicate-name":"no-roster-match";
      if(hits.length)rep.ambiguous++; else rep.unmatched++;
      changed=true;
    }
  });
  if(changed)store.set("ft.results",res);
}

var MIGRATIONS=[
  {to:2,name:"student-identity",run:mig_studentIdentity}
];

/* מזהה את גרסת הנתונים שעל המכשיר. התקנה חדשה לגמרי מסומנת מיד
   בגרסה הנוכחית — אין מה להסב. התקנה קיימת בלי סימון היא גרסה 1. */
function detectVersion(store){
  var v=store.get(SCHEMA_KEY,null);
  if(typeof v==="number"&&v>0)return v;
  var known=["ft.results","ft.roster","stu.list","bt.results","rec.sports","settings"];
  var any=known.some(function(k){ return store.get(k,null)!=null; });
  return any?1:SCHEMA_VERSION;
}

function migrate(store){
  var rep={from:0,to:SCHEMA_VERSION,applied:[],linked:0,ambiguous:0,unmatched:0,
           rosterIds:0,stuIds:0,ok:true,error:null,noop:true};
  try{
    var from=detectVersion(store);
    rep.from=from;
    if(from>SCHEMA_VERSION){
      /* הנתונים נוצרו בגרסה חדשה יותר של האפליקציה. הסבה לאחור לא
         מוגדרת, ולכן לא נוגעים בכלום. */
      rep.ok=false; rep.error="newer-schema"; rep.to=from;
      return rep;
    }
    MIGRATIONS.forEach(function(m){
      if(m.to<=from)return;
      m.run(store,rep);
      rep.applied.push(m.name);
    });
    if(from!==SCHEMA_VERSION||store.get(SCHEMA_KEY,null)==null){
      store.set(SCHEMA_KEY,SCHEMA_VERSION);
    }
    rep.noop=!rep.applied.length;
  }catch(e){
    rep.ok=false; rep.error=String(e&&e.message||e);
  }
  return rep;
}

/* ============================================================
   5. בטיחות אחסון
   ------------------------------------------------------------
   הקוד הישן היה `catch(e){}`. כלומר: מורה שמדד כיתה שלמה, המכשיר
   שלו מלא, והמדידה פשוט לא נשמרה — בלי הודעה, בלי סימן, והוא גילה
   את זה שבוע אחר כך. סיווג השגיאה הוא מה שמאפשר להגיד לו משהו
   מועיל במקום «שגיאה».
   ============================================================ */
var ERR={QUOTA:"quota",UNAVAILABLE:"unavailable",SERIALIZE:"serialize",UNKNOWN:"unknown"};

function classifyStorageError(err){
  if(!err)return ERR.UNKNOWN;
  var name=String(err.name||""), msg=String(err.message||""), code=err.code;
  if(name==="QuotaExceededError"||name==="NS_ERROR_DOM_QUOTA_REACHED"||
     code===22||code===1014||/quota|exceed|storage is full/i.test(name+" "+msg))
    return ERR.QUOTA;
  if(name==="SecurityError"||name==="InvalidAccessError"||
     /access is denied|localstorage is not|not available|disabled/i.test(msg))
    return ERR.UNAVAILABLE;
  if(name==="TypeError"&&/circular|convert .* to a (string|BigInt)|BigInt/i.test(msg))
    return ERR.SERIALIZE;
  return ERR.UNKNOWN;
}

/* backend הוא כל אובייקט עם getItem/setItem/removeItem. כך אפשר
   להזריק אחסון מזויף שנכשל לפי דרישה ולבדוק את המסלול הכואב. */
function safeSet(backend,fullKey,value){
  var raw;
  try{ raw=JSON.stringify(value); }
  catch(e){ return {ok:false,code:ERR.SERIALIZE,error:e,bytes:0}; }
  if(raw===undefined)raw="null";
  try{ backend.setItem(fullKey,raw); return {ok:true,bytes:raw.length}; }
  catch(e){ return {ok:false,code:classifyStorageError(e),error:e,bytes:raw.length}; }
}
function safeGet(backend,fullKey,def){
  var raw;
  try{ raw=backend.getItem(fullKey); }
  catch(e){ return {ok:false,code:classifyStorageError(e),value:def,error:e}; }
  if(raw==null)return {ok:true,value:def,missing:true};
  try{ return {ok:true,value:JSON.parse(raw)}; }
  catch(e){
    /* הערך קיים אבל אינו JSON תקין. מחזירים את ברירת המחדל כדי
       שהמסך יעלה, אבל מדווחים — כי זה נתון של מורה שנפגם. */
    return {ok:false,code:ERR.SERIALIZE,value:def,raw:raw};
  }
}

/* ============================================================
   6. גיבוי
   ------------------------------------------------------------
   הגיבוי הישן אסף רק את localStorage. סרטוני השיאים יושבים
   ב-IndexedDB, ולכן מורה ששחזר למכשיר חדש קיבל את רשימת השיאים
   בלי הווידאו שמוכיח אותם — ולא ידע שחסר לו משהו.

   גרסה 2 של הקובץ נושאת גם אותם. סרטון הוא מגה-בייטים, ולכן יש
   תקציב: מה שנכנס נכנס, ומה שלא — מדווח בשמו בתוך הקובץ עצמו,
   כדי ששחזור לא ישקר למורה על מה שיש לו.
   ============================================================ */
var BK_APP="hamegrash-pro";
var BK_V=2;                    /* 1 = רק localStorage, 2 = + IndexedDB */
var IDB_BUDGET=48*1024*1024;   /* תקציב מדיה כולל בקובץ, לפני base64 */

function buildSnapshot(o){
  o=o||{};
  var snap={app:BK_APP,kind:"backup",v:BK_V,
    schema:o.schema==null?SCHEMA_VERSION:o.schema,
    at:o.at||new Date().toISOString(),
    school:o.school||"",build:o.build||"",
    data:o.data||{}};
  if(o.idb)snap.idb=o.idb;
  return snap;
}

/* בוחר אילו רשומות מדיה נכנסות לתקציב. הסדר הוא מהחדש לישן —
   שיא מהשבוע שעבר שווה יותר משיא משנה שעברה. */
function planMedia(items,budget){
  budget=budget==null?IDB_BUDGET:budget;
  var sorted=(items||[]).slice().sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
  var keep=[],omit=[],used=0;
  sorted.forEach(function(it){
    var sz=it.bytes||0;
    if(sz&&used+sz>budget){ omit.push({id:it.id,name:it.name||"",bytes:sz}); return; }
    used+=sz; keep.push(it.id);
  });
  return {keep:keep,omit:omit,bytes:used,budget:budget};
}

function validateBackup(obj){
  var out={ok:false,kind:null,version:null,schema:null,errors:[],warnings:[],keys:0};
  if(!obj||typeof obj!=="object"||Array.isArray(obj)){ out.errors.push("not-an-object"); return out; }
  if(obj.app!==BK_APP){ out.errors.push("not-hamegrash"); return out; }
  if(obj.kind!=="backup"&&obj.kind!=="backup-encrypted"){ out.errors.push("unknown-kind"); return out; }
  out.kind=obj.kind;
  var v=obj.v;
  if(typeof v!=="number"||!isFinite(v)||v<1){ out.errors.push("bad-version"); return out; }
  out.version=v;
  if(v>BK_V){
    /* קובץ מגרסה עתידית. ייבוא כזה היה שותק על שדות שאיננו מבינים
       ומוחק אותם בשקט בגיבוי הבא. */
    out.errors.push("newer-file"); return out;
  }
  if(obj.kind==="backup-encrypted"){
    ["salt","iv","ct"].forEach(function(f){ if(typeof obj[f]!=="string"||!obj[f])out.errors.push("missing-"+f); });
    if(obj.alg&&obj.alg!=="AES-GCM")out.errors.push("unknown-alg");
    out.ok=!out.errors.length;
    return out;
  }
  if(!obj.data||typeof obj.data!=="object"||Array.isArray(obj.data)){ out.errors.push("missing-data"); return out; }
  var keys=Object.keys(obj.data);
  out.keys=keys.length;
  if(!keys.length)out.warnings.push("empty-data");
  keys.forEach(function(k){
    var val=obj.data[k];
    if(typeof val!=="string"){ out.errors.push("value-not-string:"+k); return; }
    try{ JSON.parse(val); }catch(e){ out.warnings.push("value-not-json:"+k); }
  });
  out.schema=(typeof obj.schema==="number")?obj.schema:1;
  if(out.schema>SCHEMA_VERSION)out.errors.push("newer-schema");
  if(obj.idb!=null){
    if(typeof obj.idb!=="object"||Array.isArray(obj.idb))out.errors.push("bad-idb");
    else if(obj.idb.items!=null&&!Array.isArray(obj.idb.items))out.errors.push("bad-idb-items");
    else if(Array.isArray(obj.idb.omitted)&&obj.idb.omitted.length)out.warnings.push("media-omitted:"+obj.idb.omitted.length);
  }else if(v>=2)out.warnings.push("no-media-section");
  out.ok=!out.errors.length;
  return out;
}

/* תוכנית שחזור: מה נכנס, מה נדרס ומה ייעלם. מוצג למורה לפני
   שנוגעים בנתונים — שחזור הוא הפעולה ההרסנית היחידה באפליקציה. */
function planRestore(snap,currentKeys){
  var incoming=Object.keys((snap&&snap.data)||{});
  var cur=(currentKeys||[]).slice();
  var inSet={},curSet={};
  incoming.forEach(function(k){inSet[k]=1});
  cur.forEach(function(k){curSet[k]=1});
  return {
    add:incoming.filter(function(k){return !curSet[k]}).sort(),
    replace:incoming.filter(function(k){return curSet[k]}).sort(),
    drop:cur.filter(function(k){return !inSet[k]}).sort(),
    media:(snap&&snap.idb&&Array.isArray(snap.idb.items))?snap.idb.items.length:0,
    mediaOmitted:(snap&&snap.idb&&Array.isArray(snap.idb.omitted))?snap.idb.omitted.length:0
  };
}

return {
  clsKey:clsKey, hash32:hash32, derivedId:derivedId,
  studentKey:studentKey, refKey:refKey, sameStudent:sameStudent, attemptsOf:attemptsOf,
  SCHEMA_VERSION:SCHEMA_VERSION, SCHEMA_KEY:SCHEMA_KEY, MIGRATIONS:MIGRATIONS,
  detectVersion:detectVersion, migrate:migrate,
  ERR:ERR, classifyStorageError:classifyStorageError, safeSet:safeSet, safeGet:safeGet,
  BK_APP:BK_APP, BK_V:BK_V, IDB_BUDGET:IDB_BUDGET,
  buildSnapshot:buildSnapshot, planMedia:planMedia, validateBackup:validateBackup, planRestore:planRestore
};
});
