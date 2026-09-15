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
/* שכבה ומספר מתוך מזהה כיתה שנפרסה («c:ט:3» → {grade:"ט",num:3}).
   המזהה עצמו מקודד את הכיתה כפי שנוצרה, ולכן זה מקור יציב לבורר
   שכבה/מספר גם אחרי שהשם ברישום השתנה. כיתה חופשית → null. */
function cidParts(cid){
  var m=String(cid==null?"":cid).match(/^c:(יב|יא|י|ט|ח|ז):(\d{1,2})$/);
  return m?{grade:m[1],num:+m[2]}:null;
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
   2ב. קבוצת הוראה
   ------------------------------------------------------------
   המודל עד כאן הניח שמה שמלמדים הוא כיתה. זה לא נכון בשדה: מורים
   מחברים שתי כיתות לשיעור אחד, ולפעמים בונים קבוצת למידה מתלמידים
   שמגיעים מכמה כיתות. המערכת אילצה אותם לפצל שיעור אחד לשניים.

   קבוצה היא **הקשר הוראה**, לא כיתה חדשה:

     · התלמיד נשאר בכיתה שלו. cidOfStudent לעולם לא מחזיר מזהה
       קבוצה — אחרת היסטוריית התלמיד הייתה נקרעת לשניים.
     · המדידה נושאת את הכיתה האמיתית של התלמיד. שיעור שנלמד
       בקבוצה עדיין נספר בכיתה שממנה התלמיד בא.
     · השיעור (LessonSession) והמשבצת במערכת השעות **כן** נושאים
       את מזהה הקבוצה — כי הם מתארים את מה שקרה בפועל.

   הקבוצה נרשמת באותו רישום של הכיתות (ft.classes) עם kind:"group".
   זה מה שמאפשר לכל מסך שכבר יודע להציג שם של כיתה דרך classOf
   להציג גם קבוצה, בלי לשנות אותו.

   אין קבוצה בתוך קבוצה: חברי קבוצה הם כיתות אמיתיות בלבד.
   ============================================================ */
var GROUP_PREFIX="g:";
var GROUP_KIND="group";
function isGroupId(v){ return isCid(v)&&String(v).indexOf(GROUP_PREFIX)===0; }
/* מזהה נגזר מהתוכן, כמו כל מזהה אחר כאן: אותה הגדרה מייצרת אותו
   מזהה בכל מכשיר, ולכן יצירה חוזרת אינה יוצרת כפילות. */
function groupId(name,members,sids){
  var seed=clsKey(name)+"|"+asList(members).slice().sort().join(",")+
           "|"+asList(sids).slice().sort().join(",");
  return GROUP_PREFIX+derivedId("",seed).replace(/^:/,"");
}
function isGroupRec(c){ return !!(c&&c.kind===GROUP_KIND); }
function groupOf(store,gid){
  var c=classes(store)[gid];
  return isGroupRec(c)?c:null;
}
function listGroups(store){
  var reg=classes(store);
  return Object.keys(reg).filter(function(k){ return isGroupRec(reg[k]); })
    .map(function(k){ return reg[k]; })
    .sort(function(a,b){ return String(a.name||"").localeCompare(String(b.name||""),"he"); });
}
/* כיתות אמיתיות בלבד — לכל מקום שמניח שכבה ומספר */
function realClasses(store){
  var reg=classes(store), out={};
  Object.keys(reg).forEach(function(k){ if(!isGroupRec(reg[k]))out[k]=reg[k]; });
  return out;
}
function cleanMembers(members){
  var out=[], seen={};
  asList(members).forEach(function(c){
    if(!isCid(c)||isGroupId(c)||seen[c])return;   /* בלי קבוצה בתוך קבוצה */
    seen[c]=1; out.push(c);
  });
  return out;
}
function cleanSids(sids){
  var out=[], seen={};
  asList(sids).forEach(function(x){
    var v=String(x==null?"":x).trim();
    if(!v||seen[v])return;
    seen[v]=1; out.push(v);
  });
  return out;
}
function makeGroup(store,o){
  o=o||{};
  var name=String(o.name==null?"":o.name).trim();
  if(!name)return {ok:false,outcome:"no-name",group:null};
  /* שם שנקרא ככיתה היה מסתיר את הכיתה עצמה בחיפוש לפי תווית */
  if(parseCls(name))return {ok:false,outcome:"name-is-class",group:null};
  var members=cleanMembers(o.members), sids=cleanSids(o.sids);
  if(!members.length&&!sids.length)
    return {ok:false,outcome:"empty",group:null};
  var reg=classes(store);
  /* שם תפוס בידי כיתה או קבוצה אחרת — אחרת שתיהן נראות זהות למורה */
  var clash=null, keys=Object.keys(reg);
  for(var i=0;i<keys.length;i++)
    if(clsKey(reg[keys[i]].name)===clsKey(name)){ clash=reg[keys[i]]; break; }
  var id=o.id||groupId(name,members,sids);
  if(clash&&clash.id!==id)
    return {ok:false,outcome:"name-taken",group:clash};
  if(reg[id])return {ok:true,outcome:"exists",group:reg[id]};
  reg[id]={id:id,name:name,key:clsKey(name),grade:null,num:null,
           kind:GROUP_KIND,members:members,sids:sids};
  store.set("ft.classes",reg);
  return {ok:true,outcome:"created",group:reg[id]};
}
function updateGroup(store,gid,o){
  o=o||{};
  var reg=classes(store), g=reg[gid];
  if(!isGroupRec(g))return {ok:false,outcome:"no-such-group",group:null};
  if(o.name!=null){
    var nm=String(o.name).trim();
    if(!nm)return {ok:false,outcome:"no-name",group:g};
    if(parseCls(nm))return {ok:false,outcome:"name-is-class",group:g};
    g.name=nm; g.key=clsKey(nm);
  }
  if(o.members!=null)g.members=cleanMembers(o.members);
  if(o.sids!=null)g.sids=cleanSids(o.sids);
  if(!asList(g.members).length&&!asList(g.sids).length)
    return {ok:false,outcome:"empty",group:g};
  store.set("ft.classes",reg);
  return {ok:true,outcome:"updated",group:g};
}
/* מחיקה מסירה את הקבוצה מהרישום בלבד. שיעורים שהתקיימו בה נשארים
   בהיסטוריה ומדידות לא זזות — הן מעולם לא נשאו את מזהה הקבוצה. */
function removeGroup(store,gid){
  var reg=classes(store);
  if(!isGroupRec(reg[gid]))return {ok:false,outcome:"no-such-group"};
  delete reg[gid];
  store.set("ft.classes",reg);
  return {ok:true,outcome:"removed"};
}
/* מזהה → הכיתות שמאחוריו. כיתה מחזירה את עצמה; קבוצה מחזירה את
   חבריה. הנקודה האחת שבה «על מי מדובר» מתורגם מהקשר לכיתות. */
function expandCid(store,cid){
  if(!isCid(cid))return [];
  var g=store?groupOf(store,cid):null;
  return g?asList(g.members).slice():[cid];
}
/* מדידה שייכת להקשר הזה? כיתה — כרגיל; קבוצה — כל אחד מחבריה,
   או תלמיד שצורף אליה במפורש. */
function rowInScope(r,store,cid){
  if(!r||!isCid(cid))return false;
  var g=store?groupOf(store,cid):null;
  if(!g)return rowInClass(r,cid);
  var sids=asList(g.sids);
  if(r.sid&&sids.indexOf(r.sid)>=0)return true;
  var m=asList(g.members);
  for(var i=0;i<m.length;i++)if(rowInClass(r,m[i]))return true;
  return false;
}
/* התלמידים שבהקשר הזה. סדר יציב: לפי הכיתות כסדרן, ואז המצורפים. */
function studentsIn(store,cid,list){
  var all=asList(list).filter(function(s){ return s&&typeof s==="object"; });
  if(!isCid(cid))return [];
  var g=store?groupOf(store,cid):null;
  if(!g)return all.filter(function(s){ return cidOfStudent(s,store)===cid; });
  var seen={}, out=[];
  asList(g.members).forEach(function(m){
    all.forEach(function(s){
      var k=s.id||s.name;
      if(seen[k]||cidOfStudent(s,store)!==m)return;
      seen[k]=1; out.push(s);
    });
  });
  asList(g.sids).forEach(function(sid){
    all.forEach(function(s){
      var k=s.id||s.name;
      if(seen[k]||s.id!==sid)return;
      seen[k]=1; out.push(s);
    });
  });
  return out;
}
/* תיאור קצר של הרכב הקבוצה, לתצוגה: «ז׳1 · ז׳3 · +2 תלמידים» */
function groupSummary(store,gid){
  var g=store?groupOf(store,gid):null;
  if(!g)return "";
  var reg=classes(store);
  var parts=asList(g.members).map(function(m){
    return (reg[m]&&reg[m].name)||m;
  });
  var n=asList(g.sids).length;
  /* בלי כיתות שלמות זו קבוצת למידה, ו«+2 תלמידים» נקרא כשארית של
     משהו. איתן — הסימן «+» הוא בדיוק מה שהוא אומר. */
  if(n)parts.push(parts.length?("+"+n+" תלמידים"):(n+" תלמידים מכמה כיתות"));
  return parts.join(" · ");
}

/* ============================================================
   2ג. רשימות הכיתה הן רשימת התלמידים
   ------------------------------------------------------------
   שני מאגרים החזיקו את אותם ילדים. ft.roster הוא רשימה לכל כיתה,
   והוא הדרך הטבעית להעלות תלמידים — בלעדיו אי אפשר למדוד כלום.
   stu.list הוא «התלמידים שלי», ועליו יושבים הגיל, הגובה, המשקל,
   הציונים והמבחנים. ביניהם לא היה גשר בשום מקום מלבד ייבוא ה-CSV
   הבית ספרי, שגם בו זו תיבת סימון.

   מורה שהדביק רשימה לכל כיתה בנפרד — הדבר הסביר לעשות — קיבל
   «התלמידים שלי» ריק, קבוצות הוראה שמדווחות «0 תלמידים», ומסך
   שלם שנראה לו מיותר. לא חסרו לו נתונים; חסר היה הגשר.

   הכיוון כאן הוא אחד בלבד: מהרשימות אל «התלמידים שלי». הרשימה
   עונה על «מי קיים», ו-stu.list מוסיף את מה שרק הוא יודע — ולכן
   תלמיד שכבר נמצא שם לא נדרס, רק מושלם. המחיקה אינה מסתנכרנת:
   תלמיד שהוסר מרשימת כיתה נשאר עם ההיסטוריה שלו, בדיוק כשם
   שהסרה מרשימה אינה מוחקת מדידות.

   המין נלקח מהרשימה כפי שהוא, כולל «לא נקבע». ברירת מחדל «בן»
   הייתה הופכת כיתה שלמה של בנות לבנים בלי שאיש יראה — והנורמות
   נפרדות לפי מין.
   ============================================================ */
function syncStudentsFromRosters(store,stu,rosters){
  var list=asList(stu).slice();
  var src=(rosters&&typeof rosters==="object"&&!Array.isArray(rosters))?rosters:{};
  /* מפתח הרשימה («ט3») → הכיתה הרשומה. הרישום הוא מקור האמת לשם,
     כך שכיתה ששונה שמה נכנסת עם השם החדש ולא עם המפתח הישן. */
  var reg=store?classes(store):{}, byKey={}, dup={};
  Object.keys(reg).forEach(function(id){
    var c=reg[id]; if(!c||!c.key||isGroupRec(c))return;
    if(byKey[c.key])dup[c.key]=1; else byKey[c.key]=c;
  });
  var byId={};
  list.forEach(function(s){ if(s&&s.id)byId[s.id]=s; });
  var added=0, filled=0, touched={};
  Object.keys(src).forEach(function(key){
    var arr=asList(src[key]); if(!arr.length)return;
    /* מפתח הרשימה הוא תווית, לא זהות. שתי כיתות רשאיות לשאת את
       אותו שם — ואז אי אפשר לדעת של מי הרשימה הזאת. במקרה הזה לא
       מנחשים: שיוך שגוי כאן קובר תלמיד בכיתה שהוא לא בה, בשקט. */
    if(dup[key]||dup[clsKey(key)])return;
    var c=byKey[key]||byKey[clsKey(key)]||null;
    var cid=c?c.id:classId(key);
    if(!cid)return;
    var label=c?c.name:key;
    arr.forEach(function(r){
      if(!r||typeof r!=="object")return;
      var nm=String(r.name==null?"":r.name).trim();
      if(!nm)return;
      /* קודם לפי מזהה — הרשימה ו«התלמידים שלי» חולקים sid מאז
         הייבוא, ולכן שינוי שם באחד הצדדים אינו יוצר כפילות. */
      var s=(r.id&&byId[r.id])||findStudent(list,nm,cid,store);
      if(s){
        if(!s.cls){ s.cls=label; s.cid=cid; if(s.cidAmbig)delete s.cidAmbig; filled++; }
        if(r.sex&&!s.sex){ s.sex=r.sex; filled++; }
        return;
      }
      var rec={id:r.id||uid("s"),name:nm,cls:label,cid:cid,
        sex:r.sex||null,age:14,h:null,w:null,tests:[]};
      list.push(rec); byId[rec.id]=rec;
      added++; touched[cid]=1;
    });
  });
  return {list:list,added:added,filled:filled,classes:Object.keys(touched).length};
}

/* ============================================================
   מזהה רשומה
   ------------------------------------------------------------
   Date.now() לבדו אינו ייחודי: שתי רשומות שנוצרות באותה מילישנייה
   חולקות אותו חלק ראשון, ומה שמפריד ביניהן הוא ארבעה תווים
   אקראיים בלבד — 36⁴ אפשרויות. מאתיים רשומות ברצף אחד מתנגשות
   בהסתברות של אחוז ומשהו, וזה נמדד בפועל: בדיקת «שני שיעורים אינם
   מתנגשים במזהה» נפלה ב-CI על 199 מתוך 200.

   וזה לא נשאר בבדיקה. רשימת כיתה שלמה, מקצה ביפ של שלושים תלמידים
   ומערכת שעות של 47 משבצות נוצרים כולם בלולאה אחת, בתוך אותה
   מילישנייה. שני מזהים זהים שם אינם תקלה תיאורטית: מחיקה של רשומה
   אחת מוחקת את שתיהן, ועריכה של אחת עורכת את השנייה.

   המונה מבטיח ייחודיות בתוך המכשיר; האקראיות נשארת כדי ששני
   מכשירים שמגבים לאותו קובץ לא ייצרו את אותו מזהה. הרוחב קבוע,
   כדי ששרשור של מונים באורך שונה לא ייצור מחרוזות זהות.
   ============================================================ */
var UID_WRAP=1679616;          /* 36⁴ */
var uidSeq=Math.floor(Math.random()*UID_WRAP);
function uid(prefix){
  uidSeq=(uidSeq+1)%UID_WRAP;
  return String(prefix==null?"":prefix)+Date.now().toString(36)+
    uidSeq.toString(36).padStart(4,"0")+
    Math.random().toString(36).slice(2,6);
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
/* מדידה שייכת לכיתה? לפי cid כשהוא כתוב עליה. מדידה ישנה בלי cid
   נבחנת לפי התווית שנשמרה עליה — נגזרת מהתוכן, לא מנוחשת. */
function rowInClass(r,cid){
  if(!r||!isCid(cid))return false;
  if(isCid(r.cid))return r.cid===cid;
  return classId(r.cls)===cid;
}
/* opts.cid מצמצם לפי זהות; בלעדיו — לפי תווית הכיתה, כמו תמיד. */
function attemptsOf(results,clsName,testId,stud,opts){
  var cid=(opts&&isCid(opts.cid))?opts.cid:null;
  var k=clsKey(clsName);
  return (results||[]).filter(function(r){
    if(!r||r.test!==testId)return false;
    if(cid?!rowInClass(r,cid):clsKey(r.cls)!==k)return false;
    return sameStudent(r,stud);
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
var SCHEMA_VERSION=4;
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

/* --- 3 → 4: סגירת זהות הכיתה על התלמיד ---------------------
   מיגרציה 2→3 הטביעה cid על כל תלמיד שהיה במכשיר באותו רגע — אבל
   שלושה מסלולי יצירה המשיכו להוסיף תלמידים בלי cid, ולכן אחרי
   חודש stu.list היה תערובת. כאן משלימים: מי שיש לו cid — לא נוגעים;
   מי שאין לו — נגזר דרך הרישום (שעומד בשינוי שם), ומי שאין לו כיתה
   בכלל מסומן cidAmbig:"no-class" עם cid:null. לא מנחשים.

   נוגעת במפתח אחד בלבד: stu.list. המדידות, הרשימות והשיעורים לא
   נקראים ולא נכתבים. cls נשאר בדיוק כפי שהוקלד — הוא ההקשר. */
function mig_studentClassClosure(store,rep){
  var stu=store.get("stu.list",null);
  if(!Array.isArray(stu))return;
  var reg=store.get("ft.classes",null);
  if(!reg||typeof reg!=="object"||Array.isArray(reg))reg={};
  var regTouched=false, touched=false;
  stu.forEach(function(s){
    if(!s||typeof s!=="object")return;
    if(isCid(s.cid)){ rep.stuKept++; return; }        /* הזהות הקיימת מנצחת */
    var id=null;
    var hit=findClass(store,s.cls);
    if(hit)id=hit.id;
    else{
      /* כמו ב-2→3: כיתה שמופיעה אצל תלמיד נרשמת. זה המסלול הקנוני
         היחיד שבו כיתה «נוצרת», ולכן זה לא רישום שקט של משהו חדש. */
      var c=classFrom(s.cls);
      if(c){ if(!reg[c.id]){ reg[c.id]=c; regTouched=true; rep.classes++; } id=c.id; }
    }
    if(id){
      s.cid=id; if(s.cidAmbig)delete s.cidAmbig;
      touched=true; rep.stuClosed++;
    }else{
      var empty=!String(s.cls==null?"":s.cls).trim();
      if(s.cid!==null||s.cidAmbig!=="no-class"){ s.cid=null; s.cidAmbig="no-class"; touched=true; }
      if(empty)rep.stuNoClass++; else rep.stuUnresolved++;
    }
  });
  if(regTouched)store.set("ft.classes",reg);
  if(touched)store.set("stu.list",stu);
}

var MIGRATIONS=[
  {to:2,name:"student-identity",run:mig_studentIdentity},
  {to:3,name:"class-identity",  run:mig_classIdentity},
  {to:4,name:"student-class-closure",run:mig_studentClassClosure}
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
           stuKept:0,stuClosed:0,stuNoClass:0,stuUnresolved:0,
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
   זהות הכיתה של תלמיד
   ------------------------------------------------------------
   הכלל: cid הוא הזהות, cls הוא ההקשר. עד עכשיו כמעט כל מסלול
   קריאה שאל «s.cls===X», כלומר זיהה כיתה לפי שם התצוגה. העוזר
   הזה הוא הנקודה האחת שבה תלמיד הופך למזהה כיתה:

     1. s.cid קיים ותקף        → הוא הזהות. לא מחשבים מחדש.
     2. הרישום מכיר את s.cls   → המזהה הרשום (עומד בשינוי שם).
     3. נפילה אחורה            → classId(s.cls), כמו היום.
     4. אין כיתה               → null. תלמיד בלי כיתה הוא מצב חוקי.

   טהור: לא כותב ל-store, לא משנה את התלמיד, לא רושם כיתה.
   ============================================================ */
function isCid(v){ return typeof v==="string"&&!!v.trim(); }
function cidOfStudent(stud,store){
  if(!stud||typeof stud!=="object")return null;
  if(isCid(stud.cid))return stud.cid;
  var raw=stud.cls;
  if(store){ var hit=findClass(store,raw); if(hit)return hit.id; }
  return classId(raw);
}
/* תווית → מזהה, דרך הרישום. בשונה מ-classId, תווית שהיא השם החדש
   של כיתה שהוחלף שמה מחזירה את המזהה המקורי ולא ממציאה כיתה שנייה.
   register=true רושם כיתה שאינה מוכרת — למסלולי יצירה בלבד. */
function resolveClassId(store,raw,register){
  var hit=store?findClass(store,raw):null;
  if(hit)return hit.id;
  if(register&&store){ var c=registerClass(store,raw); return c?c.id:null; }
  return classId(raw);
}

/* ============================================================
   מיזוג לרשימת כיתה והתאמת תלמיד — לפי זהות, לא לפי שם
   ------------------------------------------------------------
   שני באגים שהביקורת מצאה, שניהם ממזגים שני אנשים לאחד:
   importFromStu ביטל כפילויות לפי שם, וייבוא ה-CSV התאים ל-stu.list
   לפי שם בלי כיתה. שני תלמידים בשם «דן כהן» הם שני תלמידים.
   ============================================================ */
/* מוסיף לרשימת הכיתה את מי שחסר בה. מחזיר {list,added}; הקלט לא
   משתנה. הכלל:
     • אותו מזהה כבר ברשימה           → אותו אדם, מדלגים.
     • ברשימה יש רשומה באותו שם שאינה מקושרת לאף אחד מהנכנסים
       (מזהה אחר, למשל מהדבקה ידנית) → מניחים שזה אותו אדם עם מזהה
       ישן — ההנחה שהייתה כאן תמיד — אבל פעם אחת לכל רשומה כזאת.
     • מעבר לזה — נכנסים. שני «דן כהן» עם שני sid נשארים שניים. */
function mergeRoster(cur,hits){
  var list=(cur||[]).slice(), added=0;
  var ids={}; list.forEach(function(x){ if(x&&x.id)ids[x.id]=1; });
  var hitIds={}; (hits||[]).forEach(function(s){ if(s&&s.id)hitIds[s.id]=1; });
  var free={};
  list.forEach(function(x){
    if(!x||(x.id&&hitIds[x.id]))return;
    var nm=String(x.name||""); free[nm]=(free[nm]||0)+1;
  });
  (hits||[]).forEach(function(s){
    if(!s||!s.name)return;
    if(s.id&&ids[s.id])return;
    var nm=String(s.name);
    if(free[nm]>0){ free[nm]--; return; }
    list.push({id:s.id,name:s.name,sex:s.sex||null});
    if(s.id)ids[s.id]=1;
    added++;
  });
  return {list:list,added:added};
}
/* מוצא ב-stu.list תלמיד לפי שם + זהות כיתה. שם לבדו לעולם לא מספיק:
   «דן כהן» מט׳3 ו«דן כהן» מי׳1 הם שני אנשים. תלמיד באותו שם שאין לו
   כיתה כלל כן נחשב התאמה — הוא מאמץ את הכיתה (ההתנהגות הקיימת). */
function findStudent(list,name,cid,store){
  var nm=String(name==null?"":name).trim(); if(!nm)return null;
  var same=null, orphan=null;
  (list||[]).forEach(function(s){
    if(!s||String(s.name||"").trim()!==nm)return;
    var c=cidOfStudent(s,store);
    if(c){ if(isCid(cid)&&c===cid&&!same)same=s; }
    else if(!orphan)orphan=s;
  });
  return same||orphan;
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
   opts.cid מצמצם לכיתה אחת לפי זהות — עומד בשינוי שם. opts.cls
   מצמצם לפי תווית, כמו קודם, ונשאר לקוראים שטרם עברו. כשיש cid
   הוא קובע. בלי שניהם מוחזרת ההיסטוריה המלאה — גם ממה שנמדד
   בכיתה קודמת, וזה בכוונה: תלמיד שעבר כיתה לא איבד את העבר שלו. */
function measurementsOf(rows,stud,testId,opts){
  opts=opts||{};
  var cid=isCid(opts.cid)?opts.cid:null;
  var k=(cid||opts.cls==null)?null:clsKey(opts.cls);
  return (rows||[]).filter(function(r){
    if(!r||r.test!==testId)return false;
    if(cid&&!rowInClass(r,cid))return false;
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
   5ה. פרופיל התלמיד
   ------------------------------------------------------------
   התמונה המלאה של תלמיד אחד, על פני כל המבחנים שנמדד בהם. זו
   השכבה שכרטיס התלמיד נשען עליה, ושכל מסך עתידי יישען עליה —
   כדי שלא תהיה גרסה שנייה ל«כמה התלמיד הזה שווה».

   שלוש החלטות שקובעות את ההתנהגות:

   1. ההיסטוריה חוצה כיתות. תלמיד שעבר מ-ט׳3 ל-י׳1 לא איבד את
      העבר שלו, וכל מדידה זוכרת באיזו כיתה נלקחה. צמצום לכיתה
      אחת אפשרי דרך opts.cls, אבל הוא אינו ברירת המחדל.

   2. הציון נגזר מהתוצאה הטובה ביותר — כפי שהיה תמיד. הפרופיל
      אינו משנה את כללי הניקוד, הוא רק מציג אותם שלמים.

   3. אין חישוב התקדמות משלו. הוא קורא ל-progress() ול-assess()
      שכבר קיימות.
   ============================================================ */
function profileOf(rows,stud,testDefs,opts){
  opts=opts||{};
  var defs=testDefs||[];
  var byId={}; defs.forEach(function(t){ if(t&&t.id)byId[t.id]=t; });

  /* המבחנים שלתלמיד יש בהם מדידה — בסדר שבו הקטלוג מגדיר אותם,
     כדי שהפרופיל ייראה אותו דבר בכל פתיחה. */
  /* צמצום לכיתה: cid קובע; cls נשאר לקוראים הישנים */
  var cid=isCid(opts.cid)?opts.cid:null;
  var scope=cid?{cid:cid}:(opts.cls?{cls:opts.cls}:null);
  var mine=(rows||[]).filter(function(r){
    return r&&byId[r.test]&&sameStudent(r,stud)&&
      (cid?rowInClass(r,cid):(!opts.cls||clsKey(r.cls)===clsKey(opts.cls)));
  });
  var seen={}, order=[];
  defs.forEach(function(t){
    if(mine.some(function(r){ return r.test===t.id; })&&!seen[t.id]){
      seen[t.id]=1; order.push(t.id);
    }
  });

  var out={tests:[],measured:order.length,classes:[],
           index:{v:null,from:0,of:0},stud:{sid:studentKey(stud),name:(stud&&stud.name)||""}};

  /* הכיתות שבהן התלמיד נמדד — הקשר, לא זהות */
  mine.forEach(function(r){
    var c=r.cid||("cls:"+clsKey(r.cls));
    if(c&&out.classes.indexOf(c)<0)out.classes.push(c);
  });

  var scores=[];
  order.forEach(function(tid){
    var T=byId[tid];
    var pr=progress(rows,stud,tid,T.dir,scope);
    var best=pr.best;
    var a=assess({mode:opts.mode,table:opts.table,rows:rows,archive:opts.archive,
      testId:tid,sex:(stud&&stud.sex)||null,grade:opts.grade,
      val:best?best.val:null,dir:T.dir,cap:T.cap==null?100:T.cap,
      normVersion:opts.normVersion,
      measuredNormVersion:best?best.normVer:null});
    if(a.v!=null)scores.push(a.v);
    var list=measurementsOf(rows,stud,tid,scope);
    var days=[]; list.forEach(function(r){
      var d=String(r.d||""); if(d&&days.indexOf(d)<0)days.push(d); });
    days.sort();
    out.tests.push({testId:tid,def:T,dir:T.dir,unit:T.unit,cap:T.cap||null,
      count:pr.count,days:pr.days,invalid:pr.invalid,
      list:list,dates:days,
      first:pr.first,latest:pr.latest,best:best,previous:pr.previous,
      latestIsBest:pr.latestIsBest,progress:pr,assessment:a,
      /* «שיפור» בסמנטיקה של הכרטיס הקיים: השיא מול הטוב ביום
         הראשון, וגודל ההפרש רק כשהוא שיפור. נשמר כדי שדוח ה-PDF
         ימשיך להציג בדיוק את מה שהציג. */
      imp:(pr.sinceFirst&&pr.sinceFirst.improved)?Math.abs(pr.sinceFirst.rawDelta):null});
  });

  /* מדד הכושר: ממוצע הציונים שיש להם ציון. זהה לחישוב הקיים. */
  if(scores.length){
    var sum=scores.reduce(function(a,b){ return a+b; },0);
    out.index={v:Math.round(sum/scores.length*10)/10,from:scores.length,of:order.length};
  }else out.index={v:null,from:0,of:order.length};
  return out;
}

/* מה חסר לתלמיד: מבחנים שהכיתה כבר עשתה ולו אין בהם תוצאה. */
function missingTests(rows,stud,testDefs,opts){
  opts=opts||{};
  var byId={}; (testDefs||[]).forEach(function(t){ if(t&&t.id)byId[t.id]=t; });
  var cid=isCid(opts.cid)?opts.cid:null;
  var k=(!cid&&opts.cls)?clsKey(opts.cls):null;
  var classTests=[], mineTests={};
  (rows||[]).forEach(function(r){
    if(!r||!byId[r.test])return;
    if(cid&&!rowInClass(r,cid))return;
    if(k&&clsKey(r.cls)!==k)return;
    if(classTests.indexOf(r.test)<0)classTests.push(r.test);
  });
  (rows||[]).forEach(function(r){
    if(r&&byId[r.test]&&sameStudent(r,stud))mineTests[r.test]=1;
  });
  (opts.want||[]).forEach(function(t){
    if(byId[t]&&classTests.indexOf(t)<0)classTests.push(t);
  });
  return classTests.filter(function(t){ return !mineTests[t]; });
}

/* מטריצת כיסוי לכיתה שלמה: אילו מבחנים כל תלמיד ברשימה השלים,
   מתוך המבחנים שהכיתה כבר נמדדה בהם. לא כלל זהות חדש — משתמשת
   ב-missingTests לכל תלמיד ולא כותבת מחדש את ההכרעה "מי שייך למי".
   רק "אילו מבחנים הכיתה נמדדה בהם" נגזר כאן ישירות מ-rowInClass/
   clsKey, באותם שני תנאים בדיוק שמשתמשת בהם missingTests. טהורה,
   בלי DOM — כך שאפשר לבדוק אותה בנפרד מהמסך שמציג אותה. */
function classCoverage(rows,roster,testDefs,opts){
  opts=opts||{};
  var rs=Array.isArray(rows)?rows:[];
  var rst=Array.isArray(roster)?roster:[];
  var defs=(Array.isArray(testDefs)?testDefs:[]).filter(function(t){ return t&&t.id; });
  var cid=isCid(opts.cid)?opts.cid:null;
  var k=(!cid&&opts.cls)?clsKey(opts.cls):null;
  var inScope=function(r){
    if(!r)return false;
    if(cid)return rowInClass(r,cid);
    if(k)return clsKey(r.cls)===k;
    return true;
  };
  /* סדר העמודות = סדר הקטלוג, ורק מבחנים שיש להם בפועל מדידה בכיתה */
  var tests=defs.filter(function(t){
    return rs.some(function(r){ return r&&r.test===t.id&&inScope(r); });
  }).map(function(t){ return t.id; });
  var students=rst.filter(function(s){ return s&&(s.id||s.name); }).map(function(s){
    var miss={}; missingTests(rs,s,defs,{cid:cid,cls:opts.cls}).forEach(function(t){ miss[t]=1; });
    var done={}; tests.forEach(function(t){ done[t]=!miss[t]; });
    return {stud:s,done:done};
  });
  return {tests:tests,students:students};
}

/* שלב 11 — תובנות התקדמות לכיתה: לכל מבחן שהכיתה נמדדה בו, כמה
   תלמידים משתפרים, נסוגים, או עדיין בלי שינוי מדיד. בונה ישירות
   על classCoverage (אותו "מבחן שנמדד" ואותו "השלים", כדי שהמורה
   לא יראה שתי הגדרות שונות ל"נמדד" בין שני מסכי הכיתה) ועל
   progress() הקיימת — לא נכתב כלל השוואה חדש.

   "השתפר"/"נסוג" הם firstToLast.improved/declined של progress():
   הטוב ביום האחרון שנמדד מול הטוב ביום הראשון — בדיוק מה שחלון
   ההיסטוריה של התלמיד כבר מציג. **לא** sinceFirst: זה משווה את
   השיא האישי מול היום הראשון, ומכיוון שהשיא לעולם אינו גרוע
   מהמדידה הראשונה הוא כמעט לעולם לא יכול להראות "נסיגה" — שדה
   שתמיד אפס אינו שימושי לתמונת כיתה. firstToLast כן סימטרי.
   "בלי שינוי מדיד" הוא דלי משותף ומכוון לשני מצבים שאין להם תשובה
   שונה בפועל: תוצאה זהה (firstToLast.unchanged), ותלמיד שנמדד פעם
   אחת בלבד ולכן אין עם מה להשוות (progress().reason). שתי סיבות,
   מסקנה אחת כנה: אין עדיין שינוי הניתן למדידה — לא "אפס" מומצא.
   completed הוא תמיד improved+declined+noChange, ותמיד שווה למספר
   ה-done של אותו מבחן ב-classCoverage — חלוקה נקייה, בלי לספור אף
   תלמיד פעמיים או להשמיט אותו. */
function classProgress(rows,roster,testDefs,opts){
  opts=opts||{};
  var rs=Array.isArray(rows)?rows:[];
  var defs=(Array.isArray(testDefs)?testDefs:[]).filter(function(t){ return t&&t.id; });
  var byId={}; defs.forEach(function(t){ byId[t.id]=t; });
  var cid=isCid(opts.cid)?opts.cid:null;
  var scope=cid?{cid:cid}:(opts.cls?{cls:opts.cls}:null);
  var cov=classCoverage(rs,roster,defs,opts);
  var tests=cov.tests.map(function(tid){
    var T=byId[tid];
    var improved=0,declined=0,noChange=0;
    cov.students.forEach(function(row){
      if(!row.done[tid])return;                 /* לא נמדד — לא נספר בשום דלי */
      var pr=progress(rs,row.stud,tid,T&&T.dir,scope);
      var ftl=pr.firstToLast;
      if(ftl&&ftl.improved)improved++;
      else if(ftl&&ftl.declined)declined++;
      else noChange++;                          /* ללא שינוי, או עדיין אין עם מה להשוות */
    });
    return {testId:tid,name:T?T.name:tid,def:T||null,
      completed:improved+declined+noChange,improved:improved,declined:declined,noChange:noChange};
  });
  return {tests:tests};
}

/* שלב 12 — אחוז נוכחות לתלמיד, לצורך הצעת מילוי בציון ההשתתפות.
   הנוסחה זהה, בית אחר בית, ל-attSummary() הקיימת ב-hm-tools.js:
   Math.round((p + h*0.5) / days * 100). לא נכתב כלל חדש.

   ההבדל היחיד, והכרחי: תלמיד בלי אף רשומת נוכחות מחזיר null ולא
   "0%" — attSummary מחזירה 0 שם כי זו עמודה בדוח CSV שחייבת תמיד
   ערך; כאן ה-0 היה משקר: "אין נתון" ו"נוכח באפס אחוז" הם שני
   מצבים שונים, וכתיבה שקטה של 0 לתוך ציון הייתה בדיוק הניחוש
   שהמוצר הזה נמנע ממנו בכל שכבה אחרת (ראו sidAmbig/cidAmbig).

   tools.att ממופתח "תאריך|תווית" בכוונה (החלטת שלב 7/9, לא
   משתנה כאן). הצמצום לתלמיד מסוים הוא לפי cid: כל מפתח שהתווית
   שלו נפתרת (resolveClassId) לאותו cid נספר, בלי קשר לאיזו כיתה
   הייתה מסומנת כרגע בלשונית הנוכחות ובלי קשר לשינויי שם — בדיוק
   כמו rowInClass על מדידה. */
function attendanceRateOf(att,stud,store,opts){
  opts=opts||{};
  var sid=studentKey(stud);
  if(!sid||!att||typeof att!=="object"||Array.isArray(att))return null;
  var cid=isCid(opts.cid)?opts.cid:null;
  var k=(!cid&&opts.cls)?clsKey(opts.cls):null;
  var p=0,h=0,days=0;
  Object.keys(att).forEach(function(key){
    var i=String(key).indexOf("|"); if(i<0)return;
    var label=key.slice(i+1);
    if(cid){ if(resolveClassId(store,label)!==cid)return; }
    else if(k){ if(clsKey(label)!==k)return; }
    var rec=att[key];
    if(!rec||typeof rec!=="object"||Array.isArray(rec))return;
    var mark=rec[sid]; if(!mark)return;
    days++;
    if(mark==="p")p++; else if(mark==="h")h++;
  });
  if(!days)return null;
  return {days:days,p:p,h:h,pct:Math.round((p+h*0.5)/days*100)};
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
  return uid("ls");
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
function completeSession(list,id,now,o){
  o=o||{};
  var all=asList(list);
  var ses=sessionById(all,id);
  if(!ses)return {ok:false,outcome:"not-found",list:all,session:null};
  if(ses.status===SESSION_DONE)
    return {ok:true,outcome:"already-completed",list:all,session:ses};
  var t=now||Date.now();
  /* דירוג והערה הם רשות. שיעור שנסגר בלעדיהם נשאר שיעור תקין —
     הם מוסיפים מה קרה, לא מכשירים את הסיום. */
  var rate=(o.rating===1||o.rating===0||o.rating===-1)?o.rating:null;
  var note=String(o.note==null?"":o.note).trim().slice(0,600);
  var out=all.map(function(x){
    if(!x||x.id!==id)return x;
    return Object.assign({},x,{status:SESSION_DONE,endedAt:t,
      rating:rate,note:note});
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
   סוג המשבצת
   ------------------------------------------------------------
   מערכת שעות אמיתית של מורה לחינוך גופני אינה עשויה רק משיעורים:
   בתוכה יש פרטני, שהייה, ישיבות והכנת חומרים. מערכת שמכילה רק
   שיעורים מחייבת את המורה לתרגם את היום שלו לפני שהוא מזין אותו,
   וזה בדיוק סוג החיכוך שגורם לוותר.

   רק «פרונטלי» פותח שיעור. השאר הם הקשר: הם עונים על «מה אני
   עושה עכשיו» בלי להתחזות לשיעור שאפשר למדוד בו.
   ============================================================ */
var SLOT_KINDS=[
  ["pe","פרונטלי"],   /* שיעור חנ״ג — היחיד שנפתח ממנו שיעור */
  ["prat","פרטני"],
  ["stay","שהייה"],
  ["other","אחר"]     /* ישיבה, הכנת חומרים, מקצוע אחר */
];
var KIND_PE="pe";
function kindLabel(k){
  for(var i=0;i<SLOT_KINDS.length;i++)if(SLOT_KINDS[i][0]===k)return SLOT_KINDS[i][1];
  return "";
}
function validKind(k){ return !!kindLabel(k); }
/* משבצת שנשמרה לפני שהיה סוג היא שיעור — כך היא נוצרה, וכך היא
   חייבת להמשיך להתנהג. הנקודה האחת שבה משבצת הופכת לסוג. */
function kindOf(sl){
  var k=sl&&sl.kind;
  return k==null?KIND_PE:k;
}
/* «פרונטלי» בלי כיתה אינו שיעור שאפשר לפתוח */
function startable(sl){ return !!(sl&&kindOf(sl)===KIND_PE&&sl.cid); }

/* ============================================================
   לוח הצלצולים
   ------------------------------------------------------------
   מורה לא חושב «09:45» אלא «שיעור שלישי». הלוח הזה הועתק מאפליקציית
   התוכנית השנתית, שבה הוא הועתק מלוח הצלצולים בחדר המורים — ולכן
   הוא ברירת מחדל סבירה ולא המצאה. הוא משמש לשני דברים בלבד:
   למלא שעה כשבוחרים מספר שיעור, ולדעת מתי שיעור **מתקיים עכשיו**.

   משבצת שנקבעה בשעה חופשית עובדת בדיוק כמו קודם; הצלצולים הם קיצור,
   לא דרישה.
   ============================================================ */
var BELLS=[
  {h:1,s:"08:10",e:"08:55"},{h:2,s:"09:00",e:"09:45"},
  {h:3,s:"09:45",e:"10:30"},{h:4,s:"10:50",e:"11:35"},
  {h:5,s:"11:40",e:"12:25"},{h:6,s:"12:35",e:"13:20"},
  {h:7,s:"13:25",e:"14:10"},{h:8,s:"14:15",e:"15:00"},
  {h:9,s:"15:10",e:"15:55"},{h:10,s:"16:00",e:"16:45"}
];
var SLOT_DEFAULT_MIN=45;   /* אורך שיעור כשאין צלצול תואם */
function bellByHour(h){
  for(var i=0;i<BELLS.length;i++)if(BELLS[i].h===+h)return BELLS[i];
  return null;
}
/* השיעור שמתחיל בשעה הזאת, אם יש כזה */
function bellOfTime(time){
  var t=timeMin(time); if(t==null)return null;
  for(var i=0;i<BELLS.length;i++)if(timeMin(BELLS[i].s)===t)return BELLS[i];
  return null;
}
/* חלון הזמן של משבצת בדקות. הצלצול קודם; אחרת 45 דקות מהשעה. */
function slotWindow(sl){
  var from=timeMin(sl&&sl.time);
  if(from==null)return null;
  var b=bellOfTime(sl.time);
  return {from:from,to:b?timeMin(b.e):from+SLOT_DEFAULT_MIN};
}
function slotNow(sl,nowMin){
  if(!isNum(nowMin))return false;
  var w=slotWindow(sl);
  return !!w&&nowMin>=w.from&&nowMin<w.to;
}

/* ============================================================
   מערכת לדוגמה
   ------------------------------------------------------------
   מערכת שעות אמיתית של מורה לחנ״ג בחטיבה ותיכון, כפי שהיא מופיעה
   במשו״ב — כולל פרטני, שהייה, ישיבות ומקצועות נוספים. היא כאן כדי
   שאפשר יהיה לראות שבוע מלא בלחיצה אחת ולערוך ממנו, במקום להתחיל
   מטבלה ריקה.

   היא **דוגמה ולא ברירת מחדל**: אף אחד לא מקבל אותה בלי לבקש, וטעינה
   מציגה אזהרה אם כבר יש מערכת.

   שתי כיתות שמלמדים יחד (ז-1 ו-ז-3) הן שתי משבצות באותו תא. המודל
   נשאר «משבצת אחת, כיתה אחת» — הטבלה היא זו שמציגה אותן יחד.
   ============================================================ */
var SAMPLE_GROUPS={
  peA:{cls:[["ז",1],["ז",3]]},      peB:{cls:[["ז",5]]},
  peC:{cls:[["ז",9],["ז",10]]},     peD:{cls:[["ח",3]]},
  peE:{cls:[["ט",1],["ט",4]]},      peF:{cls:[["ט",2]]},
  peG:{cls:[["יא",6]]},             peH:{cls:[["יא",7]]},
  peI:{cls:[["יב",1],["יב",2]]},    peJ:{cls:[["יב",3]]},
  hlA:{kind:"other",label:"חינוך לבריאות ז-7"},
  hlB:{kind:"other",label:"חינוך לבריאות ז-6"},
  hvA:{kind:"other",label:"חברה ז-5"},
  pratani:{kind:"prat",label:"פרטני אופק"},
  pratani2:{kind:"prat",label:"פרטני עוז"},
  shehiya:{kind:"stay",label:"שהייה"},
  homer:{kind:"other",label:"הכנת חומרים"},
  computer:{kind:"other",label:"מחשב־גשרים ח-5"},
  mehanchim:{kind:"other",label:"ישיבת מחנכים"},
  tzevet:{kind:"other",label:"ישיבת צוות"},
  hishtalmut:{kind:"other",label:"השתלמות"}
};
var SAMPLE_WEEK={
  0:{1:"peD",2:"peE",3:"peA",4:"peC",5:"peF",6:"shehiya",7:"peB",8:"homer"},
  1:{1:"peG",2:"peH",3:"homer",4:"shehiya",5:"peC",6:"peB",7:"hvA"},
  2:{1:"pratani",2:"shehiya",3:"shehiya",4:"computer",5:"computer",
     6:"peI",7:"mehanchim",8:"mehanchim",9:"peG"},
  3:{1:"peE",2:"hlA",3:"peI",4:"peF",5:"pratani2",6:"peD",7:"peA",8:"tzevet"},
  4:{1:"peH",2:"pratani",3:"hvA",4:"peJ",5:"hlB",6:"pratani",7:"hishtalmut"}
};
/* מרחיב את הדוגמה לרשימת משבצות מוכנה ל-schedAdd. טהור: לא רושם
   כיתות ולא נוגע באחסון — הקורא מחליט מה לעשות עם התוצאה. */
function sampleSlots(){
  var out=[];
  Object.keys(SAMPLE_WEEK).forEach(function(d){
    var day=+d, hours=SAMPLE_WEEK[d];
    Object.keys(hours).forEach(function(h){
      var g=SAMPLE_GROUPS[hours[h]]; if(!g)return;
      var b=bellByHour(+h); if(!b)return;
      if(g.cls){
        g.cls.forEach(function(c){
          var nm=clsName(c[0],c[1]);
          out.push({day:day,time:b.s,kind:KIND_PE,cid:classId(nm),clsSnapshot:nm});
        });
      }else{
        out.push({day:day,time:b.s,kind:g.kind,label:g.label});
      }
    });
  });
  return out;
}

/* ============================================================
   הטבלה השבועית
   ------------------------------------------------------------
   להזין 24 שיעורים אחד-אחד זה בדיוק המקום שבו מורה מוותר. הטבלה
   היא אותם נתונים בדיוק, בצורה שבה הם כבר קיימים אצלו: שעות מול
   ימים, כמו בצילום המערכת מהמשו״ב.

   שתי כיתות שמלמדים יחד הן שתי משבצות באותו תא — המודל נשאר
   «משבצת אחת, כיתה אחת», והתא הוא זה שמציג אותן יחד.
   ============================================================ */
function schedWeek(list){
  var all=schedList(list);
  var cell={}, loose=[];
  all.forEach(function(s){
    var b=bellOfTime(s.time);
    if(!b){ loose.push(s); return; }
    var k=s.day+"|"+b.h;
    (cell[k]=cell[k]||[]).push(s);
  });
  return {cell:cell, loose:loose, count:all.length};
}
function weekCell(week,day,h){ return (week&&week.cell[day+"|"+h])||[]; }

/* ============================================================
   חלוקת היום — עכשיו · הבא · בהמשך · הסתיים
   ------------------------------------------------------------
   דף הבית הציג את כל שיעורי היום כרשימה שטוחה, וכולם נראו אותו
   דבר. מורה שפותח את האפליקציה בין שיעורים צריך לסרוק עשר שורות
   כדי למצוא את השורה האחת שרלוונטית לו עכשיו.

   החלוקה כאן היא הפרדה של אותם נתונים בדיוק, בלי מקור שני ובלי
   שעון שני:

     now   — מה שקורה ברגע זה. שיעור פתוח גובר על השעון, כי מורה
             שפתח שיעור נמצא בו גם אם הצלצול כבר עבר.
     next  — השיעור הבא שאפשר לפתוח. שהייה ופרטני אינם «הבא».
     later — כל השאר שעוד לא עבר, כולל מה שאינו שיעור.
     past  — מה שהסתיים: סומן כהתקיים, או שחלון הזמן שלו נגמר.

   טהור. הקורא מחליט מה להציג ומה לסנן.
   ============================================================ */
function splitDay(rows,nowMin){
  var list=asList(rows), now=null, next=null, later=[], past=[], i, r;
  /* שיעור פתוח הוא «עכשיו» גם אחרי שהצלצול עבר — זה מה שהמורה סימן */
  for(i=0;i<list.length;i++)if(list[i]&&list[i].status===SESSION_ACTIVE){ now=list[i]; break; }
  if(!now)for(i=0;i<list.length;i++){
    r=list[i];
    if(r&&r.now&&r.status!=="done"){ now=r; break; }
  }
  for(i=0;i<list.length;i++){
    r=list[i];
    if(!r||r===now)continue;
    var w=slotWindow(r.slot);
    var ended=r.status==="done"||(isNum(nowMin)&&w&&nowMin>=w.to);
    if(ended){ past.push(r); continue; }
    if(!next&&r.startable){ next=r; continue; }
    later.push(r);
  }
  return {now:now,next:next,later:later,past:past};
}
/* כמה דקות עד שהמשבצת מתחילה. שלילי — היא כבר התחילה. */
function minsUntil(slot,nowMin){
  var w=slotWindow(slot);
  if(!w||!isNum(nowMin))return null;
  return w.from-nowMin;
}
/* «1:42» / «12 דק׳». מעל שעה — שעות ודקות; מתחת — דקות בלבד. */
function fmtUntil(min){
  if(!isNum(min)||min<0)return "";
  if(min<1)return "עוד רגע";
  if(min<60)return min+" דק׳";
  /* «1:42» — הנקודתיים כבר אומרות שעות; «שע׳» אחריהן היה מיותר */
  var h=Math.floor(min/60), m=min%60;
  return h+":"+String(m).padStart(2,"0");
}

/* ============================================================
   5ג. תוצאת שיעור והמשך מומלץ
   ------------------------------------------------------------
   עד עכשיו שיעור שהסתיים סיפר רק שהוא התקיים. «מה קרה בו» נשאר
   בראש של המורה, ולכן ההיסטוריה לא יכלה לעזור לשיעור הבא.

   שני שדות סוגרים את זה: דירוג (1 / 0 / ‎-1) והערה חופשית. שיעורים
   שנרשמו לפני התוספת נשארים תקפים — הקריאה מגוננת, ואין מיגרציה.

   ההמלצה שנבנית מהם היא **כללים, לא מודל.** אין קריאת רשת, אין
   מפתח API ואין ניחוש: סולם התקדמות קבוע, וצעד עולה, נשאר או יורד
   לפי מה שהמורה סימן. כל המלצה נושאת את הסיבות שהובילו אליה, כי
   המלצה שנשמעת חכמה ואי אפשר לבדוק אותה גרועה מהיעדר המלצה.
   ============================================================ */
var RATING_UP=1, RATING_MID=0, RATING_DOWN=-1;
/* סולם ההתקדמות — אותו סולם לכל נושא, כי הוא מתאר **איך** מלמדים
   ולא **מה**. תוכן ספציפי לענף הוא החלטת המורה, לא של האפליקציה. */
var LADDER=[
  "הקניה — תרגול במקום, קצב אישי",
  "תרגול בזוגות",
  "ביצוע בתנועה",
  "משחק מצומצם 3 נגד 3",
  "משחק מלא עם כללים"
];
function ratingOf(s){
  var r=s&&s.rating;
  return (r===1||r===0||r===-1)?r:null;
}
function topicOf(s){ return String((s&&s.planTitle)||"").trim(); }

/* כמה שיעורים אחורה נמשך אותו נושא, ובאיזה שלב בסולם הכיתה נמצאת.
   השלב נבנה מהישן לחדש: 👍 מקדם, 😐 משאיר, 👎 מחזיר צעד. */
function ladderStage(list){
  var top=topicOf(list[0]), n=0, i;
  if(!top)return {topic:"",streak:0,stage:0};
  for(i=0;i<list.length;i++){ if(topicOf(list[i])!==top)break; n++; }
  var stage=0, max=LADDER.length-1;
  for(i=n-1;i>=0;i--){
    var r=ratingOf(list[i]);
    if(r===RATING_UP)stage++;
    else if(r===RATING_DOWN)stage--;
    /* חסימה בכל צעד ולא רק בסוף: 👎 בשלב הראשון אין לאן להוריד,
       ולכן 👍 אחריו חייב לקדם. חישוב מצטבר היה «בולע» אותו. */
    if(stage<0)stage=0;
    if(stage>max)stage=max;
  }
  return {topic:top,streak:n,stage:stage};
}

/* ההמלצה. מקבלת את כל השיעורים ואת שורות המדידה, ומחזירה הצעה
   אחת עם הנימוקים שלה — או ok:false עם סיבה מפורשת. */
var NEXT_MEASURE_GAP=4;   /* שיעורים בלי מדידה עד שמזכירים */
function nextLesson(sessions,opts){
  opts=opts||{};
  var list=listSessions(sessions,{cid:opts.cid,status:SESSION_DONE});
  if(!list.length)return {ok:false,reason:"no-history"};
  var last=list[0];
  var lad=ladderStage(list);
  var why=[], steps=[];

  if(!lad.topic)
    return {ok:false,reason:"no-topic",session:last};

  var r=ratingOf(last);
  var stage=lad.stage;
  if(r===RATING_DOWN){
    why.push("בשיעור הקודם סימנת «לא עבד» — חוזרים צעד אחורה במקום להמשיך הלאה");
  }else if(r===RATING_UP){
    why.push("סימנת «עבד מצוין» — מתקדמים לשלב הבא");
  }else if(r===RATING_MID){
    why.push("סימנת «בינוני» — אותו שלב, בגיוון אחר");
  }else{
    why.push("לא סומן משוב על השיעור הקודם — ההצעה נשענת על הנושא בלבד");
  }
  if(lad.streak>=3)
    why.push(lad.streak+" שיעורים ברצף על «"+lad.topic+"» — כדאי לשקול נושא חדש אחרי השיעור הזה");

  steps.push(LADDER[stage]);
  if(stage+1<LADDER.length)steps.push(LADDER[stage+1]);
  if(stage+2<LADDER.length)steps.push(LADDER[stage+2]);

  /* מדידה: לא המלצה פדגוגית אלא תזכורת מנהלית — כיתה בלי מדידה
     לאורך זמן היא כיתה שאי אפשר יהיה לתת עליה ציון. */
  var measure=false;
  if(opts.rows){
    var since=0, i;
    for(i=0;i<list.length&&i<NEXT_MEASURE_GAP;i++){
      if(sessionMeasurements(opts.rows,list[i].id).length)break;
      since++;
    }
    if(since>=NEXT_MEASURE_GAP){
      measure=true;
      why.push(since+" שיעורים ללא מדידה — שווה לשלב מדידה אחת בשיעור הבא");
    }
  }
  return {ok:true,topic:lad.topic,stage:stage,streak:lad.streak,
    rating:r,note:String(last.note||""),session:last,
    title:lad.topic,steps:steps,why:why,measure:measure};
}

/* ============================================================
   5ב. מערכת שעות
   ------------------------------------------------------------
   «מה אני עושה עכשיו» היא השאלה שמורה שואל כשהוא פותח את
   האפליקציה בשער בית הספר, והיא היחידה שלא היה לאפליקציה שום
   נתון כדי לענות עליה. היא ידעה מי התלמידים, מה נמדד ומה תוכנן —
   ולא ידעה שביום שלישי ב-09:00 יש ט׳3.

   המודל הוא הדבר הקטן ביותר שעונה על זה: משבצת נושאת יום בשבוע,
   שעה וכיתה. לא תאריך — משבצת חוזרת כל שבוע, וזאת בדיוק ההבחנה
   בין מערכת שעות לבין יומן. שיעור שהתקיים הוא LessonSession
   נפרד; המשבצת לא יודעת עליו דבר ולא נכתבת כשהוא נפתח.

   שבוע ישראלי: 0=ראשון … 6=שבת.

   הכול טהור: מקבל רשימה, מחזיר רשימה חדשה. אין אחסון, אין DOM.
   ============================================================ */
var SCHED_MAX=120;   /* גבול שפוי: 6 ימים × 20 שיעורים */
var DAYS_HE=["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];

function newSlotId(){
  return uid("sl");
}
/* "09:00" → 540. כל מה שאינו שעה תקפה מחזיר null, ולא 0 —
   חצות ושעה פגומה חייבות להיות שתי תשובות שונות. */
function timeMin(s){
  var m=/^\s*(\d{1,2}):(\d{2})\s*$/.exec(String(s==null?"":s));
  if(!m)return null;
  var h=+m[1], mi=+m[2];
  if(h>23||mi>59)return null;
  return h*60+mi;
}
function fmtTime(min){
  if(!isNum(min)||min<0)return "";
  var h=Math.floor(min/60)%24, m=Math.round(min%60);
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
}
function validSlot(s){
  if(!(s&&typeof s==="object"&&s.id&&isNum(s.day)&&s.day>=0&&s.day<=6&&
       timeMin(s.time)!=null))return false;
  /* משבצות שנשמרו לפני שהיה סוג הן שיעורים — כך הן נוצרו */
  var k=kindOf(s);
  if(!validKind(k))return false;
  return k!==KIND_PE||!!s.cid;
}
/* הרשימה תמיד ממוינת לפי יום ואז שעה. מיון במקום אחד — כל קורא
   מקבל את אותו סדר, ואף מסך לא ממיין לעצמו. */
function schedList(list,opts){
  opts=opts||{};
  var all=asList(list).filter(validSlot);
  if(opts.cid)all=all.filter(function(s){ return s.cid===opts.cid; });
  if(isNum(opts.day))all=all.filter(function(s){ return s.day===opts.day; });
  return all.slice().sort(function(a,b){
    return (a.day-b.day)||(timeMin(a.time)-timeMin(b.time));
  });
}
/* הוספה. משבצת כפולה — אותה כיתה, אותו יום, אותה שעה — נדחית:
   מורה שלחץ פעמיים לא התכוון לשני שיעורים באותה דקה. */
function schedAdd(list,o){
  o=o||{};
  var all=asList(list);
  var kind=o.kind==null?KIND_PE:o.kind;
  if(!validKind(kind))return {ok:false,outcome:"bad-kind",list:all,slot:null};
  if(kind===KIND_PE&&!o.cid)return {ok:false,outcome:"no-class",list:all,slot:null};
  var t=timeMin(o.time);
  if(t==null)return {ok:false,outcome:"bad-time",list:all,slot:null};
  var day=+o.day;
  if(!(day>=0&&day<=6))return {ok:false,outcome:"bad-day",list:all,slot:null};
  var label=String(o.label||"").trim();
  /* אותה משבצת בדיוק — אותו יום, אותה שעה, אותו סוג ואותה כיתה או
     אותה תווית. מורה שלחץ פעמיים לא התכוון לשתיים. */
  var dup=schedList(all).filter(function(s){
    if(s.day!==day||timeMin(s.time)!==t||kindOf(s)!==kind)return false;
    return kind===KIND_PE ? s.cid===o.cid : String(s.label||"")===label;
  })[0];
  if(dup)return {ok:true,outcome:"duplicate",list:all,slot:dup};
  if(schedList(all).length>=SCHED_MAX)
    return {ok:false,outcome:"full",list:all,slot:null};
  var b=bellOfTime(fmtTime(t));
  var slot={
    id:o.id||newSlotId(),
    day:day,
    time:fmtTime(t),
    /* מספר השיעור נשמר כשהשעה היא צלצול — כך הטבלה יודעת לאיזו
       שורה המשבצת שייכת בלי לנחש מחדש בכל ציור. */
    h:b?b.h:null,
    kind:kind,
    cid:kind===KIND_PE?o.cid:null,
    /* השם כהקשר בלבד, כמו בשיעור: כיתה עשויה לשנות שם, והמשבצת
       עדיין מצביעה על אותה כיתה דרך cid. */
    clsSnapshot:kind===KIND_PE?String(o.clsSnapshot||""):"",
    label:label,
    topic:String(o.topic||"")
  };
  return {ok:true,outcome:"added",slot:slot,list:all.concat([slot])};
}
function schedRemove(list,id){
  var all=asList(list);
  var out=all.filter(function(s){ return !(s&&s.id===id); });
  return {ok:out.length!==all.length,list:out};
}
/* יום בשבוע מתוך תאריך ISO, בלי תלות באזור זמן: "2026-09-13"
   הוא אותו יום בכל מכשיר. new Date(iso) לבדו מפרש UTC ולכן זז
   ביום שלם למורה שמסתכל בערב. */
function dayOfISO(iso){
  var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||""));
  if(!m)return null;
  var d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
  return d.getUTCDay();
}
/* משבצות היום, עם סימון מה כבר התקיים. ההצלבה היא לפי כיתה
   ותאריך — לא לפי שעה: מורה שהתחיל שיעור ברבע שעה איחור עדיין
   התחיל את אותו שיעור. */
function schedToday(list,iso,sessions,nowMin){
  var day=dayOfISO(iso);
  if(day==null)return [];
  var done={};
  listSessions(sessions,{date:iso}).forEach(function(s){ done[s.cid]=s; });
  return schedList(list,{day:day}).map(function(s){
    var ses=(s.cid&&done[s.cid])||null;
    return {
      slot:s,
      session:ses,
      /* «עכשיו» לפי השעון הוא מידע אחר מ«פתוח» לפי המורה: שיעור
         יכול להתקיים בלי שנפתח, ולהיות פתוח אחרי שנגמר. */
      now:slotNow(s,nowMin),
      /* רק משבצת פרונטלית עם כיתה היא שיעור שאפשר לפתוח. פרטני
         ושהייה נמצאים ביום של המורה, ולכן מוצגים — אבל הם לא
         מתחזים לשיעור שאפשר למדוד בו. */
      startable:startable(s),
      status:!ses?"planned":(ses.status===SESSION_ACTIVE?"active":"done")
    };
  });
}
/* המשבצת הקרובה ביותר שטרם התקיימה. «עכשיו» נמסר בדקות מחצות,
   כדי שהפונקציה תישאר טהורה וניתנת לבדיקה בכל שעה ביום. */
function schedNext(list,iso,sessions,nowMin){
  var rows=schedToday(list,iso,sessions,nowMin);
  var cur=null, act=null, up=null;
  for(var i=0;i<rows.length;i++){
    /* השעון קודם לכול: השיעור שמתקיים ברגע זה הוא התשובה ל«מה
       אני עושה עכשיו», גם אם המורה עדיין לא פתח אותו. */
    if(rows[i].now&&rows[i].status!=="done"&&!cur)cur=rows[i];
    if(!act&&rows[i].status==="active")act=rows[i];
    if(!up&&rows[i].status==="planned"&&rows[i].startable&&
       (nowMin==null||timeMin(rows[i].slot.time)>=nowMin-15))up=rows[i];
  }
  return cur||act||up||null;
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
  classId:classId, classFrom:classFrom, sameClass:sameClass, cidParts:cidParts,
  classes:classes, classOf:classOf, findClass:findClass,
  registerClass:registerClass, renameClass:renameClass,
  uid:uid,
  isCid:isCid, cidOfStudent:cidOfStudent, resolveClassId:resolveClassId,
  GROUP_PREFIX:GROUP_PREFIX, GROUP_KIND:GROUP_KIND, isGroupId:isGroupId, isGroupRec:isGroupRec,
  groupId:groupId, makeGroup:makeGroup, updateGroup:updateGroup, removeGroup:removeGroup,
  groupOf:groupOf, listGroups:listGroups, realClasses:realClasses,
  expandCid:expandCid, rowInScope:rowInScope, studentsIn:studentsIn, groupSummary:groupSummary,
  syncStudentsFromRosters:syncStudentsFromRosters,
  mergeRoster:mergeRoster, findStudent:findStudent,
  studentKey:studentKey, refKey:refKey, sameStudent:sameStudent, attemptsOf:attemptsOf, rowInClass:rowInClass,
  SCHEMA_VERSION:SCHEMA_VERSION, SCHEMA_KEY:SCHEMA_KEY, MIGRATIONS:MIGRATIONS,
  detectVersion:detectVersion, migrate:migrate,
  ERR:ERR, classifyStorageError:classifyStorageError, safeSet:safeSet, safeGet:safeGet,
  ambiguous:ambiguous, ambiguousGroups:ambiguousGroups,
  resolveCandidates:resolveCandidates, resolveAmbiguous:resolveAmbiguous,
  profileOf:profileOf, missingTests:missingTests, classCoverage:classCoverage, classProgress:classProgress,
  attendanceRateOf:attendanceRateOf,
  SESSION_ACTIVE:SESSION_ACTIVE, SESSION_DONE:SESSION_DONE, SESSION_MAX:SESSION_MAX,
  newSessionId:newSessionId, createSession:createSession, activeSession:activeSession,
  sessionById:sessionById, completeSession:completeSession, resumeSession:resumeSession,
  listSessions:listSessions, sessionMeasurements:sessionMeasurements,
  SCHED_MAX:SCHED_MAX, DAYS_HE:DAYS_HE, newSlotId:newSlotId,
  timeMin:timeMin, fmtTime:fmtTime, validSlot:validSlot, dayOfISO:dayOfISO,
  schedList:schedList, schedAdd:schedAdd, schedRemove:schedRemove,
  schedToday:schedToday, schedNext:schedNext,
  SLOT_KINDS:SLOT_KINDS, KIND_PE:KIND_PE, kindLabel:kindLabel,
  validKind:validKind, startable:startable, kindOf:kindOf,
  schedWeek:schedWeek, weekCell:weekCell,
  splitDay:splitDay, minsUntil:minsUntil, fmtUntil:fmtUntil,
  SAMPLE_GROUPS:SAMPLE_GROUPS, SAMPLE_WEEK:SAMPLE_WEEK, sampleSlots:sampleSlots,
  BELLS:BELLS, SLOT_DEFAULT_MIN:SLOT_DEFAULT_MIN,
  bellByHour:bellByHour, bellOfTime:bellOfTime, slotWindow:slotWindow, slotNow:slotNow,
  RATING_UP:RATING_UP, RATING_MID:RATING_MID, RATING_DOWN:RATING_DOWN,
  LADDER:LADDER, NEXT_MEASURE_GAP:NEXT_MEASURE_GAP,
  ratingOf:ratingOf, ladderStage:ladderStage, nextLesson:nextLesson,
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
