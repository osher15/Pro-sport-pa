#!/usr/bin/env node
/* בונה קובץ יחיד אופליין (Hamegrash.html) מתוך index.html + ה־CSS וה־JS.
   הרצה:  node build-standalone.js
   התוצאה עובדת בלחיצה כפולה, בלי שרת ובלי אינטרנט. */
const fs=require("fs"),path=require("path");
const R=f=>fs.readFileSync(path.join(__dirname,f),"utf8");

const html=R("index.html");

/* גוף האפליקציה = כל מה שבתוך <body>. קישור הדילוג נשאר ראשון, כמו בדף החי. */
const bd=html.match(/<body>([\s\S]*?)<\/body>/);
if(!bd)throw new Error("לא נמצא <body> ב-index.html");
const body=bd[1].trim();

const css=R("hm-styles.css");
/* חייב להישאר זהה לסדר תגי ה-script ב-index.html.
   hm-boot.js לא נכלל — לגרסה הזאת יש אתחול משלה בסוף הקובץ. */
const SCRIPTS=["hm-app.js","hm-qr.js","hm-howto.js","hm-know.js","hm-tools.js","hm-plans.js","hm-lesson.js","hm-new.js","hm-a11y.js"];
/* בדיקת שפיות: כל סקריפט שמופיע ב-index.html חייב להיכלל גם כאן */
const inHtml=[...html.matchAll(/<script src="(hm-[\w-]+\.js)"[^>]*><\/script>/g)]
  .map(m=>m[1]).filter(f=>f!=="hm-boot.js");
const missing=inHtml.filter(f=>!SCRIPTS.includes(f));
if(missing.length)throw new Error("סקריפטים חסרים ברשימת הבנייה: "+missing.join(", "));
const js=SCRIPTS.map(R).join("\n;\n");

/* מדיניות אבטחת תוכן לקובץ היחיד: כאן הכול משובץ פנימה, ולכן inline מותר —
   אבל שום קוד חיצוני, שום eval, שום iframe ושום שליחת טפסים. */
const CSP=[
  "default-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "form-action 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src data: blob:",
  "media-src blob: data:",
  "manifest-src blob:",
  "connect-src https://script.google.com https://script.googleusercontent.com",
  "worker-src 'none'"
].join("; ");

const out=`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="no-referrer">
<title>המגרש PRO — ערכת שטח למורה לחינוך גופני</title>
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0c0e1a">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="המגרש PRO">
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
    try{window.HMBoot();}catch(e){console.error("boot",e);}
    try{window.HMBootNew();}catch(e){console.error("boot(new)",e);}
    try{window.HMA11y&&window.HMA11y.init();}catch(e){console.error("a11y",e);}
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
