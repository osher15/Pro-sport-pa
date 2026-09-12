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

/* שכבות הלימוד ותוויות התצוגה שלהן. היו עד עכשיו רק ב-hm-tests.js,
   ולכן כל מי שרצה לבנות שם כיתה היה חייב לעבור דרך מודול המבחנים. */
var GRADES=[["ז","ז׳"],["ח","ח׳"],["ט","ט׳"],["י","י׳"],["יא","י״א"],["יב","י״ב"]];
var NUMS=[1,2,3,4,5,6,7,8,9,10];
function clsName(g,n){
  var hit=null;
  for(var i=0;i<GRADES.length;i++)if(GRADES[i][0]===g){hit=GRADES[i][1];break;}
  return (hit==null?g:hit)+n;
}
/* «ט׳3», «ט3», «ט' 3» — כולן אותה כיתה. מחזיר null למה שאינו שכבה+מספר. */
function parseCls(raw){
  var t=String(raw==null?"":raw).replace(/["'׳״\s\-־]/g,"");
  var mm=t.match(/^(יב|יא|י|ט|ח|ז)(\d{1,2})$/);
  if(!mm)return null;
  return {grade:mm[1],num:+mm[2]};
}

/* ============================================================
   זהות כיתה
   ------------------------------------------------------------
   עד עכשיו כיתה לא הייתה ישות בכלל. לא היה לה רישום, לא מזהה ולא
   מקום אחד שבו היא קיימת — היא הייתה מחרוזת שנבנתה מחדש בכל מסך
   («ט׳3»), ושלושה מודולים שמרו אותה בשלוש צורות שונות: ft.roster
   לפי מפתח מנורמל, stu.list כטקסט חופשי שהמורה מקליד, וכל מדידה
   נשאה עותק של התווית.

   התוצאה: שם הכיתה היה הזהות שלה. כל עוד הוא נבנה מבורר קבוע
   (שכבה × מספר) זה עבד — אבל ברגע שמישהו הקליד «ט3 בנים» בשדה
   החופשי, הוא יצר כיתה חדשה בלי לדעת.

   עכשיו יש מזהה. הוא נגזר מהתוכן ולכן דטרמיניסטי:
     כיתה שנפרסת לשכבה+מספר →  "c:ט:3"
     טקסט חופשי             →  "cn:" + המפתח המנורמל
   השם נשאר תצוגה, והרישום ב-ft.classes הוא המקום היחיד שבו הוא חי.
   ============================================================ */
function classId(raw){
  var t=String(raw==null?"":raw).trim();
  if(!t)return null;
  var pc=parseCls(t);
  if(pc)return "c:"+pc.grade+":"+pc.num;
  var k=clsKey(t);
  return k?("cn:"+k):null;
}
/* רשומת כיתה מלאה מתוך תווית. grade/num הם null לכיתה שאינה
   נפרסת — אנחנו לא ממציאים לה שכבה. */
function classFrom(raw){
  var t=String(raw==null?"":raw).trim();
  var id=classId(t);
  if(!id)return null;
  var pc=parseCls(t);
  return {id:id,name:pc?clsName(pc.grade,pc.num):t,
          grade:pc?pc.grade:null,num:pc?pc.num:null,key:clsKey(t)};
}
/* שתי תוויות מצביעות על אותה כיתה? */
function sameClass(a,b){
  var x=classId(a),y=classId(b);
  return !!x&&x===y;
}

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
var SCHEMA_VERSION=3;
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
      /* שני תלמידים בשם «דן כהן» באותה כיתה הם שני תלמידים. מזהה
         שנגזר משם בלבד היה נותן לשניהם את אותו מזהה — כלומר מאחד
         אותם לזהות אחת, וזה בדיוק מה שבאנו למנוע.

         המונה הוא לפי סדר ההופעה ברשימה השמורה, ולכן דטרמיניסטי:
         אותה רשימה תיתן תמיד את אותם מזהים. הראשון שומר על הזרע
         המקורי כדי שלא נשנה מזהים שכבר נגזרו בעבר. */
      var ord={};
      list.forEach(function(s){
        if(!s||typeof s!=="object")return;
        var base=clsKey(k)+"|"+String(s.name||"");
        var n=(ord[base]=(ord[base]||0)+1);
        if(s.id)return;
        s.id=derivedId("s",n>1?(base+"#"+n):base);
        touched=true; rep.rosterIds++;
      });
    });
    if(touched)store.set("ft.roster",rosters);
  }

  /* ב. «התלמידים שלי» — אותו טיפול */
  var stu=store.get("stu.list",null);
  if(Array.isArray(stu)){
    var t2=false, ordS={};
    stu.forEach(function(s){
      if(!s||typeof s!=="object")return;
      var base=clsKey(s.cls)+"|"+String(s.name||"");
      var n=(ordS[base]=(ordS[base]||0)+1);
      if(s.id)return;
      s.id=derivedId("s",n>1?(base+"#"+n):base);
      rep.stuIds++; t2=true;
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

/* --- 2 → 3: זהות כיתה ---------------------------------- */
function mig_classIdentity(store,rep){
  var reg=store.get("ft.classes",null);
  if(!reg||typeof reg!=="object"||Array.isArray(reg))reg={};
  var touched=false;
  /* רושמים כיתה פעם אחת. אם היא כבר רשומה — לא נוגעים בשם שלה,
     כי ייתכן שהמורה כבר שינה אותו וזה בדיוק מה שהרישום נועד לשמר. */
  function reg1(raw){
    var c=classFrom(raw);
    if(!c)return null;
    if(!reg[c.id]){ reg[c.id]=c; touched=true; rep.classes++; }
    return reg[c.id].id;
  }

  /* א. כל מפתח ב-ft.roster הוא כיתה שקיימת בפועל */
  var rosters=store.get("ft.roster",null);
  if(rosters&&typeof rosters==="object"&&!Array.isArray(rosters))
    Object.keys(rosters).forEach(function(k){ if(Array.isArray(rosters[k]))reg1(k); });

  /* ב. כל כיתה שמופיעה אצל תלמיד */
  var stu=store.get("stu.list",null);
  if(Array.isArray(stu)){
    var t2=false;
    stu.forEach(function(s){
      if(!s||typeof s!=="object")return;
      var id=reg1(s.cls);
      if(id&&!s.cid){ s.cid=id; t2=true; rep.stuCids++; }
    });
    if(t2)store.set("stu.list",stu);
  }

  /* ג. כל כיתה שמופיעה על מדידה, והטבעת המזהה על המדידה עצמה */
  var res=store.get("ft.results",null);
  if(Array.isArray(res)){
    var t3=false;
    res.forEach(function(r){
      if(!r||typeof r!=="object")return;
      if(r.cid)return;
      var id=reg1(r.cls);
      /* מדידה בלי שדה כיתה נשארת כמו שהיא. אין דרך לדעת לאיזו כיתה
         היא שייכת, וניחוש כאן שקול לניחוש זהות תלמיד. */
      if(id){ r.cid=id; t3=true; rep.resCids++; }
      else { r.cidAmbig="no-class"; t3=true; rep.resNoClass++; }
    });
    if(t3)store.set("ft.results",res);
  }

  /* ד. הכיתה שנטענה אחרונה לביפ טסט */
  var heat=store.get("bt.heat",null);
  if(heat&&typeof heat==="object"&&heat.cls)reg1(heat.cls);

  if(touched||store.get("ft.classes",null)==null)store.set("ft.classes",reg);
}

var MIGRATIONS=[
  {to:2,name:"student-identity",run:mig_studentIdentity},
  {to:3,name:"class-identity",  run:mig_classIdentity}
];

/* מזהה את גרסת הנתונים שעל המכשיר. התקנה חדשה לגמרי מסומנת מיד
   בגרסה הנוכחית — אין מה להסב. התקנה קיימת בלי סימון היא גרסה 1. */
function detectVersion(store){
  var v=store.get(SCHEMA_KEY,null);
  if(typeof v==="number"&&v>0)return v;
  var known=["ft.results","ft.roster","stu.list","bt.results","rec.sports","settings","ft.classes"];
  var any=known.some(function(k){ return store.get(k,null)!=null; });
  return any?1:SCHEMA_VERSION;
}

function migrate(store){
  var rep={from:0,to:SCHEMA_VERSION,applied:[],linked:0,ambiguous:0,unmatched:0,
           rosterIds:0,stuIds:0,classes:0,stuCids:0,resCids:0,resNoClass:0,
           ok:true,error:null,noop:true};
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

/* פעולות הכיתה שנתמכות בשכבת הנתונים.
   שינוי שם הוא הסיבה שהמזהה קיים: הרישום מחזיק את השם, המדידות
   מחזיקות את המזהה, ולכן שינוי שם אינו נוגע באף מדידה. */
function classes(store){
  var reg=store.get("ft.classes",null);
  return (reg&&typeof reg==="object"&&!Array.isArray(reg))?reg:{};
}
function classOf(store,cid){ return classes(store)[cid]||null; }
/* מוצא כיתה לפי תווית — קודם ברישום, ואם אין, לפי המזהה הנגזר */
function findClass(store,raw){
  var id=classId(raw); if(!id)return null;
  var reg=classes(store);
  if(reg[id])return reg[id];
  /* אולי הכיתה שונתה ולכן התווית כבר לא נגזרת למזהה שלה */
  var keys=Object.keys(reg);
  for(var i=0;i<keys.length;i++)
    if(clsKey(reg[keys[i]].name)===clsKey(raw))return reg[keys[i]];
  return null;
}
function registerClass(store,raw){
  var c=classFrom(raw); if(!c)return null;
  var reg=classes(store);
  if(!reg[c.id]){ reg[c.id]=c; store.set("ft.classes",reg); }
  return reg[c.id];
}
/* שינוי שם: נוגע ברישום בלבד. המזהה, המדידות והתלמידים לא זזים.
   שתי כיתות רשאיות לשאת אותו שם — הן נשארות שתי כיתות. */
function renameClass(store,cid,newName){
  var reg=classes(store);
  var c=reg[cid];
  if(!c)return {ok:false,error:"no-such-class"};
  var nm=String(newName==null?"":newName).trim();
  if(!nm)return {ok:false,error:"empty-name"};
  c.name=nm; c.key=clsKey(nm);
  var pc=parseCls(nm);
  c.grade=pc?pc.grade:null; c.num=pc?pc.num:null;
  store.set("ft.classes",reg);
  return {ok:true,cls:c};
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
   מדידות שממתינות להכרעה
   ------------------------------------------------------------
   ההסבה מסמנת ולא מנחשת. זה היה הדבר הנכון לעשות — אבל רשומה
   מסומנת שאין דרך להכריע בה נשארת מסומנת לנצח, ולכן צריך מסלול
   ידני. הכלל היחיד שאסור להפר: ההכרעה מגיעה מהמורה. לא מהשם
   הראשון שמתאים, לא מהמיקום במערך, ולא מדמיון מחרוזות.
   ============================================================ */
function ambiguous(results){
  return (results||[]).filter(function(r){ return r&&r.sidAmbig&&!r.sid; });
}
/* מקבץ לפי (כיתה, שם) — למורה יש שאלה אחת לכל תלמיד, לא לכל מדידה */
function ambiguousGroups(results){
  var by={};
  ambiguous(results).forEach(function(r){
    var k=clsKey(r.cls)+"|"+String(r.name||"");
    (by[k]=by[k]||{key:k,cls:r.cls,name:r.name||"",reason:r.sidAmbig,ids:[],rows:[]});
    by[k].ids.push(r.id); by[k].rows.push(r);
  });
  return Object.keys(by).sort().map(function(k){ return by[k]; });
}
/* המועמדים שמוצגים למורה: תלמידי אותה כיתה בלבד, ובראשם מי ששמו
   תואם. אנחנו לא בוחרים — רק מסדרים את מה שהוא רואה. */
function resolveCandidates(roster,name){
  var nm=String(name==null?"":name);
  var list=(roster||[]).filter(function(s){ return s&&(s.id||s.name); });
  var exact=list.filter(function(s){ return String(s.name||"")===nm; });
  var rest =list.filter(function(s){ return String(s.name||"")!==nm; });
  return {exact:exact,other:rest,all:exact.concat(rest)};
}
/* מבצע את ההכרעה. מחזיר מערך חדש — לא משנה את הקלט במקום.
   הסימון יורד רק אחרי ששויך מזהה בפועל. */
function resolveAmbiguous(results,ids,sid){
  var want={}; (ids||[]).forEach(function(i){ want[i]=1; });
  var target=String(sid==null?"":sid);
  if(!target)return {ok:false,error:"no-sid",rows:results,changed:0};
  var changed=0;
  var out=(results||[]).map(function(r){
    if(!r||!want[r.id])return r;
    if(r.sid)return r;                       /* כבר מזוהה — לא נוגעים */
    var c=Object.assign({},r);
    c.sid=target; c.sidFrom="manual";
    delete c.sidAmbig;
    changed++;
    return c;
  });
  return {ok:changed>0,rows:out,changed:changed};
}

/* ============================================================
   5ב. ניקוד, נורמות ומדדי בריאות
   ------------------------------------------------------------
   הלוגיקה שקובעת ציון לתלמיד הייתה עד עכשיו ללא בדיקה אחת. היא גם
   האזור שבו שגיאה שקטה עולה הכי ביוקר: ציון שגוי לא נראה שגוי, הוא
   פשוט נראה כמו ציון.

   הפונקציות כאן הועברו כמו שהן, בלי שינוי התנהגות. מה שדרש אחסון
   («איזו טבלת נורמה שמורה», «אילו תוצאות קיימות בשכבה») הפך לפרמטר
   במקום לקריאה מ-localStorage, וזה כל ההבדל.
   ============================================================ */
function clamp100(v){ return Math.max(0,Math.min(100,Math.round(v*10)/10)); }

/* אינטרפולציה ליניארית בין נקודות הציון של טבלת הנורמה */
function scoreFromPoints(pts,val){
  if(!Array.isArray(pts)||pts.length<2||!(val>=0))return null;
  var P=pts.slice().sort(function(a,b){ return a[0]-b[0]; });
  if(val<=P[0][0])return clamp100(P[0][1]);
  if(val>=P[P.length-1][0])return clamp100(P[P.length-1][1]);
  for(var i=0;i<P.length-1;i++){
    var x1=P[i][0],y1=P[i][1],x2=P[i+1][0],y2=P[i+1][1];
    if(val>=x1&&val<=x2){
      if(x2===x1)return clamp100(y2);
      return clamp100(y1+(y2-y1)*(val-x1)/(x2-x1));
    }
  }
  return null;
}

/* אחוזון: איזה חלק מהקבוצה התלמיד עקף. dir קובע מה «טוב יותר». */
function percentile(vals,val,dir){
  if(!vals.length)return null;
  var worse=vals.filter(function(v){ return dir==="low"?v>val:v<val; }).length;
  var same =vals.filter(function(v){ return v===val; }).length;
  return clamp100((worse+same/2)/vals.length*100);
}

/* ניקוד לפי טבלת נורמה. table הוא ft.norms.table. */
function normScore(table,testId,sex,grade,val){
  if(!table||!sex)return null;
  var T=table[testId]; if(!T)return null;
  var byGrade=T[sex]; if(!byGrade)return null;
  return scoreFromPoints(byGrade[grade],val);
}

/* ניקוד יחסי מול השכבה. rows הן כל המדידות הקיימות.
   מתחת לשלוש תוצאות אחוזון הוא רעש, ולכן מוחזר null. */
var REL_MIN=3;
function relScore(rows,testId,sex,grade,val,dir){
  var gk=String(grade);
  var vals=(rows||[]).filter(function(r){
    return r&&r.test===testId&&r.gradeKey===gk&&(!sex||!r.sex||r.sex===sex);
  }).map(function(r){ return r.val; }).filter(function(v){ return v>0; });
  if(vals.length<REL_MIN)return null;
  return percentile(vals,val,dir);
}

/* הציון הסופי לתוצאה בודדת. mode הוא "norm" או "rel"; מבחן חלופי
   נושא תקרה (cap) שמאפשרת לעבור אבל לא להגיע לציון המבחן המלא. */
function scoreOne(o){
  o=o||{};
  var cap=o.cap==null?100:o.cap;
  if(o.mode==="norm"){
    var n=normScore(o.table,o.testId,o.sex,o.grade,o.val);
    if(n!=null)return {v:Math.min(cap,n),src:"norm",capped:cap<100};
  }
  var r=relScore(o.rows,o.testId,o.sex,o.grade,o.val,o.dir);
  if(r!=null)return {v:Math.min(cap,r),src:"rel",capped:cap<100};
  return {v:null,src:null};
}

/* ---- אות החינוך הגופני ---- */
var OT_MAX=40, OT_PASS=32, OT_CORE_MIN=12;
function otTheory(pct){
  if(pct==null||pct==="")return 0;
  var v=+pct;
  if(v>=85)return 5; if(v>=75)return 4; if(v>=65)return 3; return 0;
}
function otScore(rec){
  rec=rec||{};
  var per={
    aer:(rec.aer||[]).filter(Boolean).length*3,
    cir:(rec.cir||[]).filter(Boolean).length*3,
    theory:otTheory(rec.theory),
    part:rec.part?4:0,
    club:rec.club?5:0,
    event:Math.min(3,+rec.event||0),
    diary:rec.diary?5:0
  };
  var total=Object.keys(per).reduce(function(a,k){ return a+per[k]; },0);
  var core=per.aer+per.cir;
  return {per:per,total:total,core:core,ok:total>=OT_PASS&&core>=OT_CORE_MIN};
}

/* ---- VO2max, אזור בריאות ו-BMI ---- */
/* נוסחת Léger לריצת מעבורת: מהירות השלב וגיל התלמיד */
function vo2max(speed,age){ return 31.025+3.238*speed-3.248*age+0.1536*age*speed; }
/* אזורי FITNESSGRAM לפי גיל ומין: [גבול תחתון, אזור בריא] */
var HFZ={
  boys:{10:[37.3,40.2],11:[37.3,40.2],12:[37.6,40.3],13:[38.6,41.1],14:[39.6,42.5],
        15:[40.6,43.6],16:[41.0,44.1],17:[41.2,44.2],18:[41.2,44.3]},
  girls:{10:[37.3,40.2],11:[37.3,40.2],12:[37.0,40.1],13:[36.6,39.7],14:[36.3,39.4],
         15:[36.0,39.1],16:[35.8,38.9],17:[35.7,38.8],18:[35.3,38.6]}
};
var HFZ_EXC=6.0;
function healthZone(v,age,sex){
  var a=Math.max(10,Math.min(18,Math.round(age||14)));
  var s=HFZ[sex==="girls"?"girls":"boys"][a], R=s[0], H=s[1];
  if(v>=H+HFZ_EXC)return {g:"מצוין",c:"#5cc8ff"};
  if(v>=H)return {g:"אזור בריא",c:"#8fd96b"};
  if(v>R)return {g:"טעון שיפור",c:"#ffd166"};
  return {g:"סיכון בריאותי",c:"#ff6b81"};
}
function bmi(h,w){ if(!(h>0&&w>0))return null; return w/Math.pow(h/100,2); }
function bmiCategory(b){
  if(b==null)return null;
  if(b<18.5)return {g:"תת־משקל",c:"#5cc8ff"};
  if(b<25)  return {g:"תקין",c:"#8fd96b"};
  if(b<30)  return {g:"עודף משקל",c:"#ffd166"};
  return {g:"השמנה",c:"#ff6b81"};
}

/* ============================================================
   5ג. מדידה ← הערכה ← התקדמות
   ------------------------------------------------------------
   שלוש שכבות שהיו עד עכשיו מעורבבות, וכל מסך חישב אותן מחדש בעצמו.

   מדידה   — מה שנצפה בפועל. 5.42 שניות. 18 חזרות. גולמית, ולא
             נדרסת לעולם על ידי הפרשנות שלה.
   הערכה   — מה שהמספר הזה אומר. ציון 82. מקורו בטבלה או באחוזון,
             והוא תלוי בגיל, בשכבה, במין ובגרסת הכללים.
   התקדמות — מה שקרה בין שתי מדידות. וכאן הנקודה החשובה ביותר:
             שינוי מספרי אינו שיפור. ב-60 מטר מינוס 0.38 שניות הוא
             שיפור; בחזרות מינוס 4 הוא ירידה. הכיוון של המבחן הוא
             שקובע, ולכן הוא חייב לעבור בכל חישוב.

   כל הפונקציות כאן טהורות: מקבלות שורות, מחזירות אובייקט, ולא
   נוגעות באחסון. זה מה שמאפשר לבדוק אותן, וזה מה שיאפשר לפרופיל
   הכושר העתידי להישען עליהן בלי לכתוב את הלוגיקה מחדש.
   ============================================================ */

/* גרסת אלגוריתם ההערכה עצמו. עולה רק כשהחישוב משתנה — לא כשטבלת
   נורמה מתחלפת, שזה ציר נפרד. */
var ASSESS_VERSION=1;

/* ---------- כיוון המבחן ---------- */
/* «low» = נמוך יותר טוב יותר (זמני ריצה). ברירת המחדל היא «high»,
   כי זה מה ש-TESTS עושה — אבל מבחן בלי כיוון מפורש הוא באג, ולכן
   isBetter מחזיר null כשאין דרך להכריע. */
function isBetter(dir,a,b){
  if(!isNum(a)||!isNum(b))return null;
  if(a===b)return false;
  return dir==="low"?a<b:a>b;
}
function isNum(v){ return typeof v==="number"&&isFinite(v); }
/* מדידה שמישהו יכול לנקד. הערך חייב להיות מספר סופי אי-שלילי —
   null, undefined ו-NaN אינם «אפס», הם «לא נמדד».

   אפס תלוי בסמנטיקה של המבחן, ולכן ב-dir:
     גבוה יותר טוב יותר → 0 חזרות הוא תוצאה אמיתית. תקף.
     נמוך יותר טוב יותר → 0 שניות אינו זמן. נתון פגום.

   בלי ההבחנה הזאת, רשומה פגומה אחת עם val:0 הופכת לשיא האישי
   בריצת 60 מטר — ונקראת כשיפור של 5.42 שניות. האפליקציה עצמה
   לא שומרת אפס, אבל שחזור מגיבוי פגום כן יכול להכניס אותו. */
function isValidMeasurement(r,dir){
  if(!r||!isNum(r.val)||r.val<0)return false;
  if(dir==="low"&&r.val===0)return false;
  return true;
}

/* ---------- בחירת מדידות ---------- */
/* כל המדידות הגולמיות של תלמיד במבחן אחד, לפי סדר זמן.
   opts.cls מצמצם לכיתה אחת; בלעדיו מוחזרת ההיסטוריה המלאה — גם
   ממה שנמדד בכיתה קודמת, וזה בכוונה: תלמיד שעבר כיתה לא איבד את
   העבר שלו. */
function measurementsOf(rows,stud,testId,opts){
  opts=opts||{};
  var k=opts.cls==null?null:clsKey(opts.cls);
  return (rows||[]).filter(function(r){
    if(!r||r.test!==testId)return false;
    if(k!==null&&clsKey(r.cls)!==k)return false;
    return sameStudent(r,stud);
  }).sort(function(a,b){
    return (String(a.d||"").localeCompare(String(b.d||"")))||((a.ts||0)-(b.ts||0));
  });
}
/* הטובה ביותר מתוך רשימה, לפי כיוון המבחן */
function bestOf(list,dir){
  var ok=(list||[]).filter(function(r){ return isValidMeasurement(r,dir); });
  if(!ok.length)return null;
  return ok.reduce(function(a,b){ return isBetter(dir,b.val,a.val)?b:a; });
}
/* ---------- שיא אישי ----------
   מספר גדול יותר אינו «טוב יותר» מעצמו. ב-60 מטר השיא הוא הזמן
   הנמוך ביותר, בקפיצה לרוחק הוא המרחק הגדול ביותר. */
function personalBest(rows,stud,testId,dir){
  return bestOf(measurementsOf(rows,stud,testId),dir);
}
function latestOf(rows,stud,testId,opts,dir){
  var all=measurementsOf(rows,stud,testId,opts).filter(function(r){ return isValidMeasurement(r,dir); });
  return all.length?all[all.length-1]:null;
}
function firstOf(rows,stud,testId,opts,dir){
  var all=measurementsOf(rows,stud,testId,opts).filter(function(r){ return isValidMeasurement(r,dir); });
  return all.length?all[0]:null;
}
/* הטובה מבין הימים שלפני התאריך הנתון */
function bestBefore(list,isoDate,dir){
  return bestOf((list||[]).filter(function(r){
    return isValidMeasurement(r,dir)&&String(r.d||"")<String(isoDate||"");
  }),dir);
}
function bestOnDay(list,isoDate,dir){
  return bestOf((list||[]).filter(function(r){
    return isValidMeasurement(r,dir)&&String(r.d||"")===String(isoDate||"");
  }),dir);
}

/* ---------- השוואה בין שתי מדידות ----------
   מחזירה גם את השינוי הגולמי וגם את פרשנותו. הגולמי לעולם לא
   מוסתר: מורה שרוצה לדעת כמה שניות ירדו יקבל את המספר. */
function compare(now,then,dir){
  if(!isValidMeasurement(now,dir)||!isValidMeasurement(then,dir))
    return {rawDelta:null,improved:null,unchanged:null,declined:null};
  var d=now.val-then.val;
  var imp=isBetter(dir,now.val,then.val);
  return {rawDelta:+d.toFixed(4),improved:imp,unchanged:d===0,
          declined:!imp&&d!==0};
}

/* ---------- התקדמות ----------
   שלוש תפיסות השוואה שונות כבר קיימות במוצר, וכל אחת נכונה למקום
   שלה. עד עכשיו כל מסך חישב את שלו; כאן הן מוגדרות פעם אחת:

     lastStep    — המדידה האחרונה מול הטובה שלפני אותו יום.
                   זה מה שמופיע כחץ ▲/▼ ליד שם התלמיד במקצה.
     sinceFirst  — השיא האישי מול הטוב ביום המדידה הראשון.
                   זה «שיפור» בכרטיס התלמיד.
     firstToLast — הטוב ביום האחרון מול הטוב ביום הראשון.
                   זה מה שחלון ההיסטוריה מציג.
   ============================================================ */
var PROGRESS_NONE="no-measurements", PROGRESS_ONE="single-measurement";
function progress(rows,stud,testId,dir,opts){
  var all=measurementsOf(rows,stud,testId,opts);
  var ok=all.filter(function(r){ return isValidMeasurement(r,dir); });
  var out={dir:dir||"high",count:ok.length,rawCount:all.length,
    invalid:all.length-ok.length,
    first:null,latest:null,best:null,previous:null,
    rawDelta:null,improved:null,unchanged:null,declined:null,
    latestIsBest:null,
    lastStep:null,sinceFirst:null,firstToLast:null,
    days:0,reason:null};
  if(!ok.length){ out.reason=PROGRESS_NONE; return out; }

  var days=[]; ok.forEach(function(r){ var d=String(r.d||"");
    if(days.indexOf(d)<0)days.push(d); });
  days.sort();
  out.days=days.length;

  out.first =ok[0];
  out.latest=ok[ok.length-1];
  out.best  =bestOf(ok,dir);
  out.latestIsBest=out.latest.id===out.best.id;
  out.previous=bestBefore(ok,out.latest.d,dir);

  /* מדידה אחת בלבד: אין עם מה להשוות. לא «אפס שיפור» ולא «ללא
     שינוי» — פשוט אין תשובה, וזה מה שמוחזר. */
  if(!out.previous&&days.length<2){ out.reason=PROGRESS_ONE; return out; }

  out.lastStep   =compare(out.latest,out.previous,dir);
  out.sinceFirst =compare(out.best,bestOnDay(ok,days[0],dir),dir);
  out.firstToLast=compare(bestOnDay(ok,days[days.length-1],dir),
                          bestOnDay(ok,days[0],dir),dir);

  out.rawDelta =out.lastStep.rawDelta;
  out.improved =out.lastStep.improved;
  out.unchanged=out.lastStep.unchanged;
  out.declined =out.lastStep.declined;
  return out;
}

/* ============================================================
   הערכה — נקודת כניסה אחת
   ------------------------------------------------------------
   scoreOne נשאר בדיוק כפי שהוא, כי הוא מחובר למסכים שעובדים.
   assess עוטף אותו ומוסיף שלושה דברים שהשכבה העתידית צריכה:

   1. שומר קלט. מדידה חסרה אינה אפס ואינה הציון הנמוך ביותר —
      היא «לא נמדד». (ראו docs/PHASE_3_REPORT.md §4: null עובר את
      השומר של scoreFromPoints ומקבל את תחתית הטבלה. כאן זה נחסם
      לפני שהוא מגיע לשם, בלי לשנות את ההתנהגות הקיימת.)
   2. קוד סיבה מפורש לכל מקרה שבו אין ציון. «null» לבדו לא מספר
      למורה אם חסרה מדידה, חסרה טבלה, או שאין מספיק נתונים בשכבה.
   3. גרסת הכללים שלפיהם חושב הציון.
   ============================================================ */
var ASSESS_REASON={
  NONE:"no-measurement", INVALID:"invalid-measurement",
  UNKNOWN_TEST:"unknown-test", NO_NORM:"no-norm", FEW_PEERS:"too-few-peers"
};
function assess(o){
  o=o||{};
  var out={v:null,src:null,capped:false,reason:null,
    scoringVersion:ASSESS_VERSION,
    normVersion:o.normVersion||"",
    stale:false,reproduced:false};
  if(!o.testId){ out.reason=ASSESS_REASON.UNKNOWN_TEST; return out; }
  if(o.val==null){ out.reason=ASSESS_REASON.NONE; return out; }
  if(!isValidMeasurement({val:o.val},o.dir)){ out.reason=ASSESS_REASON.INVALID; return out; }

  /* ============================================================
     שחזור ההערכה ההיסטורית
     ------------------------------------------------------------
     מדידה שנלקחה בתשפ״ו נמדדה מול טבלת תשפ״ו. אם המורה טען מאז
     טבלה חדשה, ניקוד מחדש בכללים של היום נותן מספר אחר לאותה
     ריצה בדיוק — ודוח התקדמות היה מראה «שיפור» שלא קרה.

     הארכיון שומר כל טבלה שנשמרה תחת שם גרסה. כשהיא זמינה, ההערכה
     מחושבת מול הטבלה שהייתה בתוקף בזמן המדידה, והציון ההיסטורי
     יוצא זהה לזה שהיה אז.

     כשאין ארכיון לגרסה הזאת — למשל גיבוי ישן שנוצר לפני שהארכיון
     היה קיים — נופלים לכללי היום ומסמנים stale. לא משקרים. */
  var table=o.table, archived=null;
  if(o.measuredNormVersion&&o.archive)archived=o.archive[o.measuredNormVersion];
  if(archived&&archived.table){
    table=archived.table;
    out.normVersion=o.measuredNormVersion;
    out.reproduced=true;
  }else if(o.measuredNormVersion&&o.normVersion&&
           o.measuredNormVersion!==o.normVersion){
    out.stale=true;
  }

  var r=scoreOne(Object.assign({},o,{table:table}));
  if(r.v!=null){ out.v=r.v; out.src=r.src; out.capped=!!r.capped; return out; }

  /* אין ציון — למה? */
  if(o.mode==="norm"&&normScore(table,o.testId,o.sex,o.grade,o.val)==null)
    out.reason=ASSESS_REASON.NO_NORM;
  else out.reason=ASSESS_REASON.FEW_PEERS;
  return out;
}

/* ---------- ארכיון טבלאות הנורמה ----------
   מבנה מינימלי בכוונה: מפה משם גרסה לטבלה שנשמרה תחתיה. לא
   מערכת ניהול גרסאות — רק מספיק כדי שציון היסטורי יישאר אותו
   ציון. טבלה בלי שם גרסה אינה נכנסת, כי אין דרך להפנות אליה. */
function archiveNorm(archive,N){
  var out=Object.assign({},archive||{});
  if(!N||!N.version)return out;
  out[N.version]={version:N.version,source:N.source||"",
    table:N.table||{},at:new Date().toISOString()};
  return out;
}

/* ============================================================
   5ד. שיעור פעיל — LessonSession
   ------------------------------------------------------------
   באפליקציה כבר היה «מערך שיעור»: תוכן שמור, שאפשר לטעון ולהציג.
   מה שלא היה הוא ההבחנה בין מה שתוכנן לבין מה שקרה בפועל.

     LessonPlan     — מה שהתכוונו ללמד. תוכן לשימוש חוזר.
     LessonSession  — מה שקרה, ביום מסוים, עם כיתה מסוימת.

   בלי ההפרדה הזאת אי אפשר לשאול «מה עשינו בשיעור של יום שלישי»,
   ואי אפשר לקשור מדידה לשיעור שבו היא נלקחה — המורה היה בוחר את
   הכיתה מחדש בכל כלי, ושום דבר לא היה יודע שמדובר באותו שיעור.

   הסשן הוא הקשר, לא בעלים. מדידה נשארת רשומה עצמאית עם sid, cid,
   מבחן, תאריך וערך גולמי; sessionId הוא שדה נוסף עליה. אין
   session.measurements[] — מקור אמת אחד בלבד.

   הכול טהור: מקבל רשימה, מחזיר רשימה חדשה. אין אחסון, אין DOM.
   ============================================================ */
var SESSION_ACTIVE="active", SESSION_DONE="completed";
var SESSION_MAX=300;   /* גבול היסטוריה, כדי ש-localStorage לא יגדל לנצח */

function newSessionId(){
  return "ls"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
}
function asList(v){ return Array.isArray(v)?v:[]; }

/* השיעור הפעיל, אם יש. יחיד במכוון: מורה מלמד כיתה אחת בכל רגע,
   ושני שיעורים פעילים היו הופכים «לאיזה שיעור שייכת המדידה» לשאלה
   שאין לה תשובה. */
function activeSession(list){
  var all=asList(list);
  for(var i=0;i<all.length;i++)
    if(all[i]&&all[i].status===SESSION_ACTIVE)return all[i];
  return null;
}
function sessionById(list,id){
  if(!id)return null;
  var all=asList(list);
  for(var i=0;i<all.length;i++)if(all[i]&&all[i].id===id)return all[i];
  return null;
}

/* ============================================================
   פתיחת שיעור
   ------------------------------------------------------------
   הגנת הכפילות היא הדרישה המרכזית כאן. מורה שלוחץ פעמיים על
   «התחל שיעור», או שחוזר לאפליקציה אחרי שסגר אותה, חייב לקבל את
   אותו שיעור — לא שיעור שני שמפצל את המדידות שלו לשניים.

   שלוש תוצאות אפשריות, וכולן מפורשות:
     created  — נפתח שיעור חדש
     resumed  — כבר יש שיעור פעיל לאותה כיתה. מוחזר הוא עצמו.
     blocked  — יש שיעור פעיל לכיתה אחרת. לא נוגעים בו, והקורא
                מחליט מה להציג למורה.
   ============================================================ */
function createSession(list,o){
  o=o||{};
  var all=asList(list);
  if(!o.cid)return {ok:false,outcome:"no-class",list:all,session:null};

  var act=activeSession(all);
  if(act){
    if(act.cid===o.cid)
      return {ok:true,outcome:"resumed",list:all,session:act};
    return {ok:false,outcome:"blocked",list:all,session:null,active:act};
  }
  var now=o.now||Date.now();
  var ses={
    id:o.id||newSessionId(),
    cid:o.cid,
    /* השם נשמר כהקשר היסטורי בלבד. הכיתה עשויה לשנות שם אחר כך,
       והשיעור הזה עדיין צריך לדעת איך היא נקראה אז. */
    clsSnapshot:String(o.clsSnapshot||""),
    date:o.date||new Date(now).toISOString().slice(0,10),
    startedAt:now,
    endedAt:null,
    status:SESSION_ACTIVE,
    planId:o.planId==null?null:o.planId,
    planTitle:String(o.planTitle||"")
  };
  return {ok:true,outcome:"created",session:ses,list:[ses].concat(all).slice(0,SESSION_MAX)};
}

/* סיום מפורש. הרשומה נשארת בהיסטוריה — הסיום מסמן, לא מוחק. */
function completeSession(list,id,now){
  var all=asList(list);
  var ses=sessionById(all,id);
  if(!ses)return {ok:false,outcome:"not-found",list:all,session:null};
  if(ses.status===SESSION_DONE)
    return {ok:true,outcome:"already-completed",list:all,session:ses};
  var t=now||Date.now();
  var out=all.map(function(x){
    if(!x||x.id!==id)return x;
    return Object.assign({},x,{status:SESSION_DONE,endedAt:t});
  });
  return {ok:true,outcome:"completed",list:out,session:sessionById(out,id)};
}

/* חידוש: מחזיר את השיעור הפעיל הקיים. לעולם לא יוצר חדש —
   זה מה שמבדיל «חזרתי לאפליקציה» מ«התחלתי שיעור». */
function resumeSession(list){
  var act=activeSession(asList(list));
  return act?{ok:true,outcome:"resumed",session:act}
            :{ok:false,outcome:"none",session:null};
}

function listSessions(list,opts){
  opts=opts||{};
  var all=asList(list).filter(function(x){ return x&&x.id; });
  if(opts.cid)all=all.filter(function(x){ return x.cid===opts.cid; });
  if(opts.status)all=all.filter(function(x){ return x.status===opts.status; });
  if(opts.date)all=all.filter(function(x){ return x.date===opts.date; });
  return all.slice().sort(function(a,b){ return (b.startedAt||0)-(a.startedAt||0); });
}

/* המדידות שנלקחו בשיעור. הן חיות ב-ft.results כמו כל מדידה אחרת —
   כאן רק מסננים לפי ההקשר. */
function sessionMeasurements(rows,sessionId){
  if(!sessionId)return [];
  return (rows||[]).filter(function(r){ return r&&r.sessionId===sessionId; })
    .sort(function(a,b){
      return (String(a.d||"").localeCompare(String(b.d||"")))||((a.ts||0)-(b.ts||0));
    });
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
  GRADES:GRADES, NUMS:NUMS, clsName:clsName, parseCls:parseCls,
  classId:classId, classFrom:classFrom, sameClass:sameClass,
  classes:classes, classOf:classOf, findClass:findClass,
  registerClass:registerClass, renameClass:renameClass,
  studentKey:studentKey, refKey:refKey, sameStudent:sameStudent, attemptsOf:attemptsOf,
  SCHEMA_VERSION:SCHEMA_VERSION, SCHEMA_KEY:SCHEMA_KEY, MIGRATIONS:MIGRATIONS,
  detectVersion:detectVersion, migrate:migrate,
  ERR:ERR, classifyStorageError:classifyStorageError, safeSet:safeSet, safeGet:safeGet,
  ambiguous:ambiguous, ambiguousGroups:ambiguousGroups,
  resolveCandidates:resolveCandidates, resolveAmbiguous:resolveAmbiguous,
  SESSION_ACTIVE:SESSION_ACTIVE, SESSION_DONE:SESSION_DONE, SESSION_MAX:SESSION_MAX,
  newSessionId:newSessionId, createSession:createSession, activeSession:activeSession,
  sessionById:sessionById, completeSession:completeSession, resumeSession:resumeSession,
  listSessions:listSessions, sessionMeasurements:sessionMeasurements,
  ASSESS_VERSION:ASSESS_VERSION, ASSESS_REASON:ASSESS_REASON, assess:assess,
  archiveNorm:archiveNorm,
  isBetter:isBetter, isNum:isNum, isValidMeasurement:isValidMeasurement,
  measurementsOf:measurementsOf, bestOf:bestOf, personalBest:personalBest,
  latestOf:latestOf, firstOf:firstOf, bestBefore:bestBefore, bestOnDay:bestOnDay,
  compare:compare, progress:progress,
  PROGRESS_NONE:PROGRESS_NONE, PROGRESS_ONE:PROGRESS_ONE,
  clamp100:clamp100, scoreFromPoints:scoreFromPoints, percentile:percentile,
  normScore:normScore, relScore:relScore, scoreOne:scoreOne, REL_MIN:REL_MIN,
  otTheory:otTheory, otScore:otScore, OT_MAX:OT_MAX, OT_PASS:OT_PASS, OT_CORE_MIN:OT_CORE_MIN,
  vo2max:vo2max, healthZone:healthZone, HFZ:HFZ, bmi:bmi, bmiCategory:bmiCategory,
  BK_APP:BK_APP, BK_V:BK_V, IDB_BUDGET:IDB_BUDGET,
  buildSnapshot:buildSnapshot, planMedia:planMedia, validateBackup:validateBackup, planRestore:planRestore
};
});
