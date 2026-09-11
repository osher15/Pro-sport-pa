#!/usr/bin/env node
/* בונה קובץ יחיד אופליין (Hamegrash.html) מתוך index.html + ה־CSS וה־JS.
   הרצה:  node build-standalone.js
   התוצאה עובדת בלחיצה כפולה, בלי שרת ובלי אינטרנט. */
const fs=require("fs"),path=require("path");
const R=f=>fs.readFileSync(path.join(__dirname,f),"utf8");

const crypto=require("crypto");

/* חותם גרסה על כל קובץ JS/CSS ב-index.html לפי תוכן הקובץ.
   בלי זה הדפדפן מגיש גרסה ישנה מהמטמון אחרי כל פריסה, והמשתמש
   רואה אפליקציה שלא התעדכנה בלי שום סימן לכך. */
function stampVersions(){
  const file=path.join(__dirname,"index.html");
  let h=fs.readFileSync(file,"utf8");
  const short=f=>crypto.createHash("sha1").update(R(f)).digest("hex").slice(0,8);
  h=h.replace(/(href|src)="(hm-[\w-]+\.(?:js|css))(\?v=[0-9a-f]+)?"/g,
    (_,attr,f)=>`${attr}="${f}?v=${short(f)}"`);
  if(h!==fs.readFileSync(file,"utf8"))fs.writeFileSync(file,h);
  return h;
}
const html=stampVersions();

/* ---- חותמת גרסה ל-service worker ----
   המטמון חייב שם ייחודי לכל פריסה, אחרת מכשיר שכבר התקין את
   האפליקציה ימשיך להגיש לעצמו את הגרסה הישנה מהמטמון בלי שאיש
   יידע. השם נגזר מתוכן הקבצים שנכנסים למטמון. */
function stampSW(){
  const swFile=path.join(__dirname,"sw.js");
  if(!fs.existsSync(swFile))return;
  const files=["index.html","hm-styles.css","manifest.webmanifest"].concat(
    fs.readdirSync(__dirname).filter(f=>/^hm-[\w-]+\.js$/.test(f)).sort());
  const cur=fs.readFileSync(swFile,"utf8");
  /* גם שינוי בלוגיקת ה-service worker עצמו חייב להוליד גרסה חדשה,
     אחרת מכשיר מותקן ממשיך להגיש מדלי מטמון ישן. שורת הגרסה עצמה
     מנוטרלת מהחישוב כדי שלא ייווצר מרוץ בין הגיבוב לכתיבה. */
  const swBody=cur.replace(/const CACHE_VERSION = "[^"]*";/,'const CACHE_VERSION = "";');
  const hash=crypto.createHash("sha1")
    .update(files.map(f=>R(f)).join("\n")+"\n"+swBody).digest("hex").slice(0,8);
  const next=cur.replace(/const CACHE_VERSION = "[^"]*";/,'const CACHE_VERSION = "'+hash+'";');
  if(next!==cur)fs.writeFileSync(swFile,next);
}
stampSW();

/* גוף האפליקציה = כל מה שבתוך <x-dc> חוץ מ־<helmet> */
const dc=html.match(/<x-dc>([\s\S]*?)<\/x-dc>/);
if(!dc)throw new Error("לא נמצא <x-dc> ב-index.html");
const body=dc[1].replace(/<helmet>[\s\S]*?<\/helmet>/,"").trim();

const css=R("hm-styles.css");
/* בדיקת שפיות ל-CSS: פעם אחת פתיחת הערה אבדה בפתרון קונפליקט מיזוג,
   ובלי להפיל שום דבר היא בלעה בשקט את כלל ה-CSS שבא אחריה.
   הבדיקה תופסת הערה לא מאוזנת לפני שהיא מגיעה לאפליקציה. */
(function checkCss(){
  const stripped=css.replace(/\/\*[\s\S]*?\*\//g,"");
  const problems=[];
  if(stripped.includes("*/"))problems.push("סוגר הערה */ בלי פותח /*");
  if(stripped.includes("/*"))problems.push("פותח הערה /* בלי סוגר */");
  let depth=0;
  for(const ch of stripped){ if(ch==="{")depth++; else if(ch==="}")depth--; if(depth<0)break; }
  if(depth!==0)problems.push("סוגריים מסולסלים לא מאוזנים (מאזן "+depth+")");
  if(problems.length)throw new Error("hm-styles.css לא תקין: "+problems.join(" · "));
})();
/* בדיקת שפיות למבנה ה-HTML: תג שלא נסגר ב-«>» בולע בשקט את כל
   המרקאפ שאחריו — הדפדפן לא מתלונן, שום דבר לא נופל, ופשוט אלמנטים
   שלמים מוצאים את עצמם מקוננים במקום הלא נכון. זה כבר קרה פעם אחת
   בעריכת data-tip, ולכן הבדיקה כאן. */
(function checkHtml(){
  const problems=[];
  /* תג פתיחה שנקטע: «<tag ... "» ואחריו «<» בלי «>» שסוגר אותו */
  const unterminated=/<[a-zA-Z][^<>]*"\s*<\//g;
  let m;
  while((m=unterminated.exec(body))!==null){
    const at=body.slice(Math.max(0,m.index-70),m.index+40).replace(/\s+/g," ");
    problems.push("תג שלא נסגר ב-«>» סמוך ל: …"+at+"…");
    if(problems.length>4)break;
  }
  /* איזון div ברמת הקובץ */
  const open=(body.match(/<div\b[^>]*>/g)||[]).length;
  const close=(body.match(/<\/div>/g)||[]).length;
  if(open!==close)problems.push("תגי div לא מאוזנים: "+open+" פתיחות מול "+close+" סגירות");
  if(problems.length)throw new Error("index.html לא תקין:\n  · "+problems.join("\n  · "));
})();
/* חייב להישאר זהה לסדר תגי ה-script ב-index.html */
const SCRIPTS=["hm-data.js","hm-i18n.js","hm-app.js","hm-qr.js","hm-howto.js","hm-know.js","hm-tools.js","hm-plans.js","hm-lesson.js","hm-build.js","hm-tests.js","hm-new.js"];
/* בדיקת שפיות: כל סקריפט שמופיע ב-index.html חייב להיכלל גם כאן */
const inHtml=[...html.matchAll(/<script src="(hm-[\w-]+\.js)(?:\?v=[0-9a-f]+)?"><\/script>/g)].map(m=>m[1]);
const missing=inHtml.filter(f=>!SCRIPTS.includes(f));
if(missing.length)throw new Error("סקריפטים חסרים ברשימת הבנייה: "+missing.join(", "));
const js=SCRIPTS.map(R).join("\n;\n");

const out=`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0c0e1a">
<title>המגרש PRO — ערכת שטח למורה לחינוך גופני</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Heebo:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
${body}
<script>
${js}
</script>
<script>
/* אתחול: אין כאן ריצת רכיב חיצונית — מפעילים ישירות. */
(function(){
  function boot(){
    if(window.__hmBooted)return;
    window.__hmBooted=true;
    try{window.HMBoot();window.HMBootNew();}catch(e){console.error("boot",e);}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname,"Hamegrash.html"),out);
console.log("נבנה Hamegrash.html — "+(out.length/1024).toFixed(0)+"KB");
