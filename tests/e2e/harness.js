"use strict";
/* מנוע הבדיקות האינטגרטיביות.
   בדיקות היחידה מכסות את הלוגיקה; כאן נבדק מה שאי אפשר לבדוק בלי
   דפדפן אמיתי — localStorage, IndexedDB, ו-DOM שמצייר את עצמו.
   הכול רץ מול Hamegrash.html, כלומר מול הקובץ שהמורה באמת פותח. */
const path=require("path");

function loadPlaywright(){
  /* מותקן מקומית (CI) או גלובלית (סביבת פיתוח) */
  for(const p of ["playwright","playwright-core"]){
    try{ return require(p); }catch(e){}
  }
  try{
    const {execSync}=require("child_process");
    const root=execSync("npm root -g",{encoding:"utf8"}).trim();
    return require(path.join(root,"playwright"));
  }catch(e){}
  throw new Error("לא נמצאה ספריית playwright. הרץ: npm i -D playwright && npx playwright install chromium");
}

const ROOT=path.resolve(__dirname,"../..");
const TEACHER_CODE="1234";

/* ============================================================
   שרת סטטי לבדיקות
   ------------------------------------------------------------
   הבדיקות רצו בהתחלה מול file:// — וזה נראה נכון, כי זה מה שהמורה
   פותח. אבל דפדפן מתייחס לכל קבצי file:// כמוצא אחד, ולכן
   localStorage ו-IndexedDB נשארים משותפים בין הקשרים. בדיקה אחת
   ירשה את הנתונים של קודמתה, וכישלונות הופיעו וקפצו בלי קשר למה
   שנבדק בפועל.

   מוצא http אמיתי מקבל אחסון נפרד לכל BrowserContext, ולכן כל
   בדיקה מתחילה ממכשיר נקי. אותו קובץ בדיוק, רק דרך שרת.
   ============================================================ */
const MIME={".html":"text/html;charset=utf-8",".js":"text/javascript;charset=utf-8",
  ".css":"text/css;charset=utf-8",".json":"application/json",".webmanifest":"application/manifest+json",
  ".png":"image/png",".jpg":"image/jpeg",".gif":"image/gif",".svg":"image/svg+xml"};
function serve(){
  const http=require("http"), fs=require("fs");
  return new Promise(res=>{
    const srv=http.createServer((req,rs)=>{
      const rel=decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,"");
      const file=path.join(ROOT,rel);
      if(file.indexOf(ROOT)!==0){ rs.writeHead(403); return rs.end(); }
      fs.readFile(file,(e,buf)=>{
        if(e){ rs.writeHead(404); return rs.end(); }
        rs.writeHead(200,{"Content-Type":MIME[path.extname(file)]||"application/octet-stream"});
        rs.end(buf);
      });
    });
    srv.listen(0,"127.0.0.1",()=>res({srv,port:srv.address().port}));
  });
}

/* ------- אסרציות ------- */
const results=[];
function check(name,seed,fn){ return {name,seed,fn}; }
/* בדיקה שמביימת כשל בכוונה תראה גם את הדיווח עליו בקונסול. זה
   הפלט הרצוי, לא באג — ולכן אפשר לסמן אותו כצפוי. */
function expecting(re,t){ t.allow=re; return t; }
function eq(a,b,msg){
  const A=JSON.stringify(a),B=JSON.stringify(b);
  if(A!==B)throw new Error((msg||"אינם שווים")+"\n  התקבל:  "+A+"\n  ציפינו: "+B);
}
function ok(v,msg){ if(!v)throw new Error(msg||"ציפינו לערך אמיתי, התקבל "+JSON.stringify(v)); }

/* ------- הרצה ------- */
async function openApp(browser,seed,APP){
  const ctx=await browser.newContext({viewport:{width:430,height:900}});
  const page=await ctx.newPage();
  const errs=[];
  page.on("pageerror",e=>errs.push("PAGEERR "+e.message+"\n"+String(e.stack||"").split("\n").slice(0,4).join("\n")));
  page.on("console",m=>{
    if(m.type()!=="error")return;
    const t=m.text();
    /* הקובץ הבודד נפתח מ-file:// ומושך משם אייקונים ו-GIFים שאינם
       ארוזים בתוכו. זה לא באג — זה מה שקורה כשפותחים את הקובץ
       במכשיר בלי רשת, וזאת בדיוק ההתנהגות הרצויה. שגיאות JS
       אמיתיות עדיין נספרות. */
    if(/Failed to load resource|ERR_(CONNECTION|FILE|NAME|INTERNET|ABORTED)/i.test(t))return;
    errs.push("CONSOLE "+t);
  });
  page.on("dialog",d=>d.accept());
  /* ============================================================
     ניתוק מהרשת
     ------------------------------------------------------------
     האפליקציה מושכת גופן מ-fonts.googleapis.com. במגרש, בלי רשת,
     הבקשה נכשלת מיד והדפדפן נופל לגופן המערכת — בדיוק כמתוכנן.
     בסביבת הבדיקות היא נתקעת עד לפקיעת הזמן, וכל בדיקה ארכה דקה.

     חוסמים כל בקשה שאינה לשרת המקומי. זה גם מהיר יותר וגם בודק
     את התרחיש האמיתי: מורה במגרש בלי קליטה.
     ============================================================ */
  await page.route("**/*",route=>{
    const u=route.request().url();
    if(u.indexOf("http://127.0.0.1:")===0||u.indexOf("data:")===0||u.indexOf("blob:")===0)
      return route.continue();
    return route.abort();
  });

  /* הזרעה לפני שהאפליקציה עולה — כך ההסבה רצה על נתונים אמיתיים
     ולא על מכשיר ריק. */
  await page.addInitScript(s=>{
    try{ if(s)Object.keys(s).forEach(k=>localStorage.setItem("pehub."+k,JSON.stringify(s[k]))); }
    catch(e){}
  },seed||null);
  await page.goto(APP,{waitUntil:"domcontentloaded"});
  await page.waitForTimeout(700);
  if(await page.locator("#lockOv.on").count()){
    await page.fill("#lock-pass",TEACHER_CODE);
    await page.click("#lock-enter");
    await page.waitForTimeout(400);
    if(await page.locator("#lockOv.on").count()){
      await page.fill("#lock-pass",TEACHER_CODE);
      await page.click("#lock-enter");
      await page.waitForTimeout(400);
    }
  }
  return {ctx,page,errs};
}

async function run(suites){
  const {chromium}=loadPlaywright();
  const {srv,port}=await serve();
  const APP="http://127.0.0.1:"+port+"/Hamegrash.html";
  const browser=await chromium.launch({args:["--no-sandbox"]});
  let pass=0,fail=0;
  for(const suite of suites){
    console.log("\n— "+suite.title+" —");
    for(const t of suite.tests){
      let env=null;
      try{
        env=await openApp(browser,t.seed,APP);
        /* גבול זמן לכל בדיקה. בלעדיו בדיקה אחת שנתקעת — למשל על
           פעולת IndexedDB שנחסמה — משתקת את כל ההרצה בלי לומר
           איזו בדיקה אשמה. */
        await Promise.race([t.fn(env.page,env),
          new Promise((_,rej)=>setTimeout(()=>rej(new Error("חריגה מ-60 שניות")),60000))]);
        /* שגיאת JS במסך היא כישלון, גם אם כל האסרציות עברו */
        const allow=t.allow||suite.allow;
        const errs=allow?env.errs.filter(e=>!allow.test(e)):env.errs;
        if(errs.length)throw new Error("שגיאות בדפדפן: "+errs.slice(0,3).join(" | "));
        pass++; console.log("  ok  #"+(pass+fail)+" — "+t.name);
      }catch(e){
        fail++; console.log("  FAIL #"+(pass+fail)+" — "+t.name+"\n    "+String(e.message||e).split("\n").join("\n    "));
      }finally{ if(env)await env.ctx.close().catch(()=>{}); }
    }
  }
  await browser.close();
  srv.close();
  console.log("\n"+(fail?"נכשלו "+fail+" · ":"")+"עברו "+pass+" בדיקות");
  return fail;
}

module.exports={run,check,expecting,eq,ok,TEACHER_CODE};
