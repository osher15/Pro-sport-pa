"use strict";
/* ============================================================
   המגרש PRO — הפעלת האפליקציה
   ------------------------------------------------------------
   פעם אחת האתחול עבר דרך ריצת רכיב חיצונית (support.js) שטענה
   React ו-Babel מ-CDN והריצה קוד עם new Function. זה הוסיף תלות
   ברשת לדף שכל כולו עובד אופליין, והשאיר מסך ריק בכל מכשיר שבו
   הטעינה החיצונית לא הצליחה. עכשיו האתחול ישיר: כל קובצי ה-JS
   נטענים עם defer מה-<head>, ולכן הם מוכנים לפני שהקוד כאן רץ.
   ============================================================ */
(function(){
  function boot(){
    if(window.__hmBooted)return;
    window.__hmBooted=true;
    /* כל שלב ב-try נפרד: כישלון במודול אחד לא ישאיר את הדף ריק */
    try{ window.HMBoot(); }catch(e){ console.error("boot",e); }
    try{ window.HMBootNew(); }catch(e){ console.error("boot(new)",e); }
    try{ window.HMA11y&&window.HMA11y.init(); }catch(e){ console.error("a11y",e); }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
