"use strict";
/* ============================================================
   המגרש PRO — שכבת נגישות (WCAG 2.1 AA / ת"י 5568)
   ------------------------------------------------------------
   האפליקציה בנויה מהרבה מסכים שנוצרים דינמית ב-innerHTML, ולכן
   נגישות שנכתבת ידנית בכל מקום נשחקת בכל שינוי. הקובץ הזה מוסיף
   את השכבה הזאת פעם אחת, ומחיל אותה מחדש על כל תוכן חדש:

   1. תוויות (<label for>) מקושרות לשדות שלהן.
   2. אריחים לחיצים שהם <div> מקבלים role=button + הפעלה במקלדת.
   3. חלונות מודאליים מקבלים role=dialog, מלכודת פוקוס, Escape,
      והחזרת הפוקוס לכפתור שפתח אותם.
   4. כפתורי אייקון מקבלים שם נגיש.
   5. סרגל הניווט מסמן את המסך הפעיל ב-aria-current.
   6. כותרות טבלה מקבלות scope.
   ============================================================ */
window.HMA11y=(function(){

  const SEL_FOCUS='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),'+
                  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  /* אריחים שנראים ומתנהגים ככפתור אבל נכתבו כ-<div> */
  const CARD_SEL='.hx-mod,.rec-tile,.fit-ex,.fit-pre,.gm-card,.kn-prog,.pf-lanechip,[data-go],[data-close]';
  let uid=0;
  const nid=p=>p+(++uid);

  /* ---------- 1. תוויות ↔ שדות ---------- */
  function wireLabels(root){
    root.querySelectorAll(".field").forEach(f=>{
      const lab=f.querySelector(":scope > label");
      if(!lab||lab.hasAttribute("for"))return;
      const ctl=f.querySelector("input,select,textarea");
      if(!ctl){
        /* אין שדה אמיתי (למשל קבוצת כפתורים) — התווית מתארת את הקבוצה */
        const grp=f.querySelector(".seg,.stepper");
        if(grp&&!grp.hasAttribute("aria-label")){
          if(!lab.id)lab.id=nid("lb");
          grp.setAttribute("role","group");
          grp.setAttribute("aria-labelledby",lab.id);
        }
        return;
      }
      if(!ctl.id)ctl.id=nid("fld");
      lab.setAttribute("for",ctl.id);
    });
    /* שדות בלי שום תווית — לפחות שם נגיש מה-placeholder */
    root.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(el=>{
      if(el.getAttribute("aria-label")||el.getAttribute("aria-labelledby"))return;
      if(el.id&&root.querySelector('label[for="'+CSS.escape(el.id)+'"]'))return;
      if(el.closest("label"))return;
      el.setAttribute("aria-label",el.getAttribute("placeholder"));
    });
  }

  /* ---------- 2. אריחים לחיצים ---------- */
  function wireCards(root){
    root.querySelectorAll(CARD_SEL).forEach(el=>{
      const tag=el.tagName;
      if(tag==="BUTTON"||tag==="A"||tag==="INPUT"||tag==="SELECT"||tag==="TEXTAREA"||tag==="LABEL")return;
      if(el.hasAttribute("role"))return;
      el.setAttribute("role","button");
      if(!el.hasAttribute("tabindex"))el.setAttribute("tabindex","0");
    });
    /* לכפתור אמיתי בלי type יש התנהגות submit כברירת מחדל */
    root.querySelectorAll("button:not([type])").forEach(b=>b.setAttribute("type","button"));
  }
  /* הפעלה במקלדת לכל מה שסומן role=button — כולל תוכן שייווצר בעתיד */
  document.addEventListener("keydown",e=>{
    const t=e.target;
    if(!t||t.nodeType!==1||t.getAttribute("role")!=="button")return;
    if(e.key!=="Enter"&&e.key!==" "&&e.key!=="Spacebar")return;
    e.preventDefault();
    t.click();
  });

  /* ---------- 4. שמות נגישים לכפתורי אייקון ---------- */
  const ICON_NAMES=[
    [".modal .x, [data-close]","סגירה"],
    [".pa-chip button","הסרה"],
    [".tbl th .x","מחיקת עמודה"]
  ];
  function wireIconButtons(root){
    ICON_NAMES.forEach(([sel,name])=>{
      root.querySelectorAll(sel).forEach(b=>{
        if(!b.getAttribute("aria-label")&&!b.textContent.replace(/[\s✕✖×⋯]/g,""))
          b.setAttribute("aria-label",name);
      });
    });
    /* כפתור שכל תוכנו אמוג'י — האמוג'י מוקרא כשם ארוך ומבלבל */
    root.querySelectorAll("button,[role=button]").forEach(b=>{
      if(b.getAttribute("aria-label")||b.getAttribute("aria-labelledby"))return;
      const txt=b.textContent.trim();
      if(txt&&!/[\p{L}\p{N}]/u.test(txt)&&b.title)b.setAttribute("aria-label",b.title);
    });
  }

  /* ---------- 6. כותרות טבלה ---------- */
  function wireTables(root){
    root.querySelectorAll("table th:not([scope])").forEach(th=>{
      th.setAttribute("scope",th.closest("thead")?"col":"row");
    });
  }

  /* ---------- 3. חלונות מודאליים ---------- */
  const stack=[];   /* [{el, opener}] */

  function visibleFocusables(root){
    return [...root.querySelectorAll(SEL_FOCUS)].filter(el=>el.getClientRects().length>0);
  }
  function dialogSetup(m){
    if(m.dataset.a11y)return;
    m.dataset.a11y="1";
    m.setAttribute("role","dialog");
    m.setAttribute("aria-modal","true");
    const box=m.querySelector(".box");
    if(box&&!box.hasAttribute("tabindex"))box.setAttribute("tabindex","-1");
    const h=m.querySelector("h3,h2,h1");
    if(h&&!m.hasAttribute("aria-labelledby")){
      if(!h.id)h.id=nid("dlg");
      m.setAttribute("aria-labelledby",h.id);
    }
  }
  function openDialog(m){
    if(stack.some(s=>s.el===m))return;
    dialogSetup(m);
    stack.push({el:m,opener:document.activeElement});
    const box=m.querySelector(".box")||m;
    /* הפוקוס עובר לכותרת החלון, לא לכפתור הראשון — כדי שקורא המסך
       יקריא קודם מה נפתח ורק אחר כך את הפקדים. */
    setTimeout(()=>{
      if(!m.classList.contains("on"))return;
      const auto=m.querySelector("[autofocus]");
      (auto||box).focus({preventScroll:true});
    },30);
  }
  function closeDialog(m){
    const i=stack.findIndex(s=>s.el===m);
    if(i<0)return;
    const {opener}=stack[i];
    stack.splice(i,1);
    if(opener&&document.contains(opener)&&opener.getClientRects().length)
      try{opener.focus({preventScroll:true});}catch(e){}
  }
  function topDialog(){ return stack.length?stack[stack.length-1].el:null; }

  document.addEventListener("keydown",e=>{
    const m=topDialog();
    if(!m)return;
    if(e.key==="Escape"){
      /* מסך הנעילה הוא שער כניסה — Escape לא פותח אותו */
      if(m.id==="lockOv")return;
      e.preventDefault();
      m.classList.remove("on");
      return;
    }
    if(e.key!=="Tab")return;
    const f=visibleFocusables(m);
    if(!f.length){ e.preventDefault(); return; }
    const first=f[0], last=f[f.length-1];
    if(e.shiftKey&&(document.activeElement===first||!m.contains(document.activeElement))){
      e.preventDefault(); last.focus();
    }else if(!e.shiftKey&&document.activeElement===last){
      e.preventDefault(); first.focus();
    }
  },true);

  /* ---------- 5. סרגל הניווט ---------- */
  function syncNav(){
    document.querySelectorAll(".nav button").forEach(b=>{
      if(b.classList.contains("on"))b.setAttribute("aria-current","page");
      else b.removeAttribute("aria-current");
    });
  }

  /* ---------- החלה על תוכן חדש ---------- */
  function enhance(root){
    root=root||document;
    try{wireLabels(root);}catch(e){}
    try{wireCards(root);}catch(e){}
    try{wireIconButtons(root);}catch(e){}
    try{wireTables(root);}catch(e){}
    try{root.querySelectorAll(".modal").forEach(dialogSetup);}catch(e){}
  }

  let pending=0;
  function schedule(){
    if(pending)return;
    pending=setTimeout(()=>{pending=0;enhance(document);},250);
  }

  function observe(){
    new MutationObserver(muts=>{
      let needEnhance=false;
      for(const mu of muts){
        if(mu.type==="attributes"){
          const t=mu.target;
          if(t.classList&&(t.classList.contains("modal")||t.id==="lockOv")){
            if(t.classList.contains("on"))openDialog(t); else closeDialog(t);
          }else if(t.matches&&t.matches(".nav button")){
            syncNav();
          }
          continue;
        }
        /* עדכוני טקסט בלבד (שעון, טיימר) לא מצריכים מעבר נוסף */
        if(!needEnhance)
          for(const n of mu.addedNodes){ if(n.nodeType===1){needEnhance=true;break;} }
      }
      if(needEnhance)schedule();
    }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  }

  /* ---------- אייפון: פתיחה מתוך וואטסאפ ----------
     כשמורה מקבל את הקישור בוואטסאפ ולוחץ עליו באייפון, הדף נפתח בדפדפן
     המוטמע של וואטסאפ ולא בספארי. שם אין גישה למצלמה (פוטו־פיניש לא
     יעבוד), אין «הוספה למסך הבית», והנתונים נמחקים כשסוגרים את החלון.
     באנדרואיד אותו קישור נפתח בכרום עצמו ולכן שם הכול עובד — וזה בדיוק
     ההבדל שנראה כאילו האפליקציה «לא נפתחת באייפון».
     מסבירים למורה מה לעשות במקום להשאיר אותו מול פיצ׳רים מתים. */
  function inAppNotice(){
    const HM=window.HM;
    if(!HM||!HM.LS)return;
    const ua=navigator.userAgent||"";
    const ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
    const standalone=!!(window.navigator.standalone||
      (window.matchMedia&&matchMedia("(display-mode: standalone)").matches));
    /* דפדפן מוטמע ב-iOS הוא היחיד שה-UA שלו חסר את המילית Safari/ */
    if(!ios||standalone||/Safari\//.test(ua))return;
    if(HM.LS.get("ios.inappDismissed",false))return;

    const bar=document.createElement("div");
    bar.className="inapp-note";
    bar.setAttribute("role","status");
    bar.innerHTML='<b>כדאי לפתוח את הדף בספארי</b>'+
      '<span>הדף נפתח כרגע בתוך אפליקציה אחרת (וואטסאפ למשל). שם אין גישה למצלמה, '+
      'אי אפשר להוסיף למסך הבית, והנתונים נמחקים כשסוגרים את החלון. '+
      'גע בכפתור השיתוף בתחתית המסך ובחר «פתח ב-Safari».</span>';
    const btn=document.createElement("button");
    btn.type="button"; btn.className="btn sm ghost"; btn.textContent="הבנתי, אל תציג שוב";
    btn.addEventListener("click",()=>{ HM.LS.set("ios.inappDismissed",true); bar.remove(); });
    bar.appendChild(btn);
    document.body.appendChild(bar);
  }

  function init(){
    enhance(document);
    syncNav();
    observe();
    /* מודאל שכבר פתוח בזמן האתחול (מסך הנעילה) */
    document.querySelectorAll(".modal.on,#lockOv.on").forEach(openDialog);
    window.addEventListener("hashchange",syncNav);
    try{inAppNotice();}catch(e){}
  }

  return {init,enhance,syncNav};
})();
