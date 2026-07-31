#!/usr/bin/env node
/* בונה קובץ יחיד אופליין (Hamegrash.html) מתוך index.html + ה־CSS וה־JS.
   הרצה:  node build-standalone.js
   התוצאה עובדת בלחיצה כפולה, בלי שרת ובלי אינטרנט. */
const fs=require("fs"),path=require("path");
const R=f=>fs.readFileSync(path.join(__dirname,f),"utf8");

const html=R("index.html");

/* גוף האפליקציה = כל מה שבתוך <x-dc> חוץ מ־<helmet> */
const dc=html.match(/<x-dc>([\s\S]*?)<\/x-dc>/);
if(!dc)throw new Error("לא נמצא <x-dc> ב-index.html");
const body=dc[1].replace(/<helmet>[\s\S]*?<\/helmet>/,"").trim();

const css=R("hm-styles.css");
const js=["hm-app.js","hm-know.js","hm-lesson.js","hm-new.js"].map(R).join("\n;\n");

const out=`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
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
