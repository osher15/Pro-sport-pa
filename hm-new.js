"use strict";
/* מודולים חדשים: שיעור מלא (LESSON) · תלמידים (STU) · תזונה (NUT) · תוספות בית/נעילה */
(function(){
const HFZ={
  boys:{10:[37.3,40.2],11:[37.3,40.2],12:[37.6,40.3],13:[38.6,41.1],14:[39.6,42.5],15:[40.6,43.6],16:[41.0,44.1],17:[41.2,44.2],18:[41.2,44.3]},
  girls:{10:[37.3,40.2],11:[37.3,40.2],12:[37.0,40.1],13:[36.6,39.7],14:[36.3,39.4],15:[36.0,39.1],16:[35.8,38.9],17:[35.7,38.8],18:[35.3,38.6]}
};
const EXC=6.0;
function zoneOf(v,age,sex){
  const a=Math.max(10,Math.min(18,Math.round(age||14))),s=HFZ[sex||"boys"][a],R=s[0],H=s[1];
  if(v>=H+EXC)return{g:"מצוין",c:"#5cc8ff"};
  if(v>=H)return{g:"אזור בריא",c:"#8fd96b"};
  if(v>R)return{g:"טעון שיפור",c:"#ffd166"};
  return{g:"סיכון בריאותי",c:"#ff6b81"};
}
const vo2f=(speed,age)=>31.025+3.238*speed-3.248*age+0.1536*age*speed;
const today=()=>new Date().toISOString().slice(0,10);
const H=()=>window.HM;

/* ============================ STU — התלמידים שלי ============================ */
window.STU=(function(){
  let inited=false;
  const load=()=>H().LS.get("stu.list",[]);
  const save=l=>H().LS.set("stu.list",l);
  let q="",clsF="";
  function latest(s){return s.tests.length?s.tests[s.tests.length-1]:null;}
  function trend(s){
    if(s.tests.length<2)return 0;
    const a=s.tests[s.tests.length-2].dist,b=s.tests[s.tests.length-1].dist;
    return b>a?1:(b<a?-1:0);
  }
  function bmi(s){ if(!(s.h>0&&s.w>0))return null; return s.w/Math.pow(s.h/100,2); }
  function bmiCat(b){ if(b==null)return null;
    if(b<18.5)return{g:"תת־משקל",c:"#5cc8ff"}; if(b<25)return{g:"תקין",c:"#8fd96b"};
    if(b<30)return{g:"עודף משקל",c:"#ffd166"}; return{g:"השמנה",c:"#ff6b81"}; }
  function render(){
    const {$, $$, esc}=H(); const list=load();
    const classes=[...new Set(list.map(s=>s.cls).filter(Boolean))].sort();
    $("#stu-classSel").innerHTML='<option value="">כל הכיתות</option>'+classes.map(c=>`<option ${c===clsF?"selected":""}>${esc(c)}</option>`).join("");
    let view=list.filter(s=>(!q||s.name.includes(q))&&(!clsF||s.cls===clsF));
    const withT=list.filter(s=>s.tests.length);
    const avg=withT.length?withT.reduce((a,s)=>a+(latest(s).vo2||0),0)/withT.length:0;
    const below=withT.filter(s=>latest(s).zone==="סיכון בריאותי").length;
    const falling=withT.filter(s=>trend(s)<0&&latest(s).zone!=="סיכון בריאותי").length;
    $("#stu-count").textContent=list.length;
    $("#stu-avg").textContent=avg?avg.toFixed(1):"—";
    $("#stu-below").textContent=below;
    $("#stu-fall").textContent=falling;
    view.sort((a,b)=>a.name.localeCompare(b.name,"he"));
    $("#stu-empty").style.display=view.length?"none":"block";
    $("#stu-list").innerHTML=view.map(s=>{
      const lt=latest(s),tr=trend(s);
      const z=lt?zoneColor(lt.zone):null;
      return `<div class="stu-row" data-id="${s.id}">
        <div class="av">${esc(s.name.slice(0,1))}</div>
        <div class="grow"><b>${esc(s.name)}</b><div class="sb">${esc(s.cls||"—")} · ${s.tests.length} מבחנים${s.sex?" · "+(s.sex==="boys"?"בן":"בת"):""}</div></div>
        ${tr?`<span class="tr ${tr>0?"up":"dn"}">${tr>0?"▲":"▼"}</span>`:""}
        ${lt?`<span class="mono" style="color:var(--muted);font-size:12px">${lt.dist} מ׳</span>`:""}
        ${z?`<span class="catpill" style="background:${z}">${esc(lt.zone)}</span>`:'<span class="pill">אין מבחן</span>'}
      </div>`;
    }).join("");
    $$("#stu-list .stu-row").forEach(r=>r.addEventListener("click",()=>profile(r.dataset.id)));
  }
  function zoneColor(g){return {"מצוין":"#5cc8ff","אזור בריא":"#8fd96b","טעון שיפור":"#ffd166","סיכון בריאותי":"#ff6b81"}[g]||"#8a8da1";}
  function chart(s){
    const T=s.tests; if(T.length<2)return '<div class="hint" style="text-align:center;padding:8px 0">גרף יופיע אחרי שני מבחנים ומעלה</div>';
    const W=440,Hh=120,P=26;
    const ds=T.map(t=>t.dist),mn=Math.min(...ds),mx=Math.max(...ds),sp=Math.max(1,mx-mn);
    const pts=T.map((t,i)=>[P+(W-2*P)*(T.length===1?0:i/(T.length-1)),Hh-P-(Hh-2*P)*((t.dist-mn)/sp)]);
    const poly=pts.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
    return `<svg viewBox="0 0 ${W} ${Hh}" style="width:100%;display:block">
      <polyline points="${poly}" fill="none" stroke="var(--acc)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="var(--acc)"/><text x="${p[0].toFixed(1)}" y="${(p[1]-9).toFixed(1)}" text-anchor="middle" font-size="11" fill="#e9e9ed" font-family="Inter,Heebo">${T[i].dist}</text>`).join("")}
    </svg>`;
  }
  function profile(id){
    const {$, $$, esc, modal, toast, dlCSV}=H();
    const list=load(),s=list.find(x=>x.id===id); if(!s)return;
    $("#stu-mTitle").textContent=s.name;
    const b=bmi(s),bc=bmiCat(b),lt=latest(s),tr=trend(s);
    $("#stu-mBody").innerHTML=`
      <div class="row" style="margin-bottom:10px">
        <div class="field" style="width:110px"><label>כיתה</label><input id="stu-fCls" value="${esc(s.cls||"")}"></div>
        <div class="field" style="width:110px"><label>מין</label><select id="stu-fSex"><option value="boys" ${s.sex!=="girls"?"selected":""}>בן</option><option value="girls" ${s.sex==="girls"?"selected":""}>בת</option></select></div>
        <div class="field" style="width:90px"><label>גיל</label><input id="stu-fAge" type="number" value="${s.age||14}" min="9" max="19"></div>
        <div class="field" style="width:95px"><label>גובה (ס״מ)</label><input id="stu-fH" type="number" value="${s.h||""}"></div>
        <div class="field" style="width:95px"><label>משקל (ק״ג)</label><input id="stu-fW" type="number" value="${s.w||""}"></div>
      </div>
      <div class="row" style="margin-bottom:12px">
        ${b?`<span class="pill">BMI: <b style="color:${bc.c}">&nbsp;${b.toFixed(1)} · ${bc.g}</b></span><span class="hint" style="font-size:11px">הערכה כללית — בגילאי בי״ס יש להצליב עם עקומות גדילה</span>`:'<span class="hint">הזן גובה ומשקל לחישוב BMI</span>'}
      </div>
      ${lt?`<div class="row" style="margin-bottom:6px;gap:8px">
        <span class="pill acc">מבחן אחרון: ${lt.dist} מ׳ · VO₂ ${lt.vo2?lt.vo2.toFixed(1):"—"}</span>
        <span class="catpill" style="background:${zoneColor(lt.zone)}">${esc(lt.zone||"")}</span>
        ${tr?`<span class="pill" style="color:${tr>0?"#8fd96b":"#ff6b81"}">${tr>0?"▲ מגמת שיפור":"▼ מגמת ירידה"}</span>`:""}
      </div>`:""}
      <div class="card" style="padding:10px;margin:10px 0">${chart(s)}</div>
      ${s.tests.length?`<div class="tblwrap"><table class="tbl"><thead><tr><th>תאריך</th><th>מבחן</th><th>מרחק</th><th>שלב</th><th>VO₂max</th><th>אזור</th><th></th></tr></thead><tbody>
        ${s.tests.map((t,i)=>`<tr><td class="mono">${t.d}</td><td>${esc(t.type)}</td><td class="mono">${t.dist} מ׳</td><td class="mono">${t.level||"—"}</td><td class="mono">${t.vo2?t.vo2.toFixed(1):"—"}</td><td><span class="catpill" style="background:${zoneColor(t.zone)}">${esc(t.zone||"")}</span></td><td><button class="x tdel" data-i="${i}">✕</button></td></tr>`).join("")}
      </tbody></table></div>`:'<div class="empty-state">אין עדיין מבחנים. אחרי ביפ טסט לחץ «שמור למעקב» בלוח התוצאות.</div>'}
      <div class="row" style="margin-top:13px;justify-content:space-between">
        <button class="btn sm acc" id="stu-fSave">💾 שמור פרטים</button>
        <div class="row">
          <button class="btn sm" id="stu-fCsv">⬇ דוח CSV</button>
          <button class="btn sm stop" id="stu-fDel">🗑 מחק תלמיד</button>
        </div>
      </div>`;
    modal("stu-modal");
    $("#stu-fSave").addEventListener("click",()=>{
      s.cls=$("#stu-fCls").value.trim(); s.sex=$("#stu-fSex").value;
      s.age=+$("#stu-fAge").value||14; s.h=+$("#stu-fH").value||null; s.w=+$("#stu-fW").value||null;
      s.tests.forEach(t=>{ if(t.speed)t.vo2=vo2f(t.speed,s.age); if(t.vo2)t.zone=zoneOf(t.vo2,s.age,s.sex).g; });
      save(list); render(); profile(id); toast("נשמר ✓");
    });
    $("#stu-fDel").addEventListener("click",()=>{ if(confirm("למחוק את "+s.name+" וכל ההיסטוריה?")){save(list.filter(x=>x.id!==id));modal("stu-modal",false);render();} });
    $("#stu-fCsv").addEventListener("click",()=>{
      const rows=[["תאריך","מבחן","מרחק (מ)","שלב","VO2max","אזור"]];
      s.tests.forEach(t=>rows.push([t.d,t.type,t.dist,t.level||"",t.vo2?t.vo2.toFixed(1):"",t.zone||""]));
      dlCSV("progress_"+s.name+".csv",rows);
    });
    $$("#stu-mBody .tdel").forEach(b2=>b2.addEventListener("click",e=>{
      e.stopPropagation();
      if(confirm("למחוק את הרישום?")){s.tests.splice(+b2.dataset.i,1);save(list);render();profile(id);}
    }));
  }
  function importFromBeep(){
    const {LS,toast,go}=H();
    const res=LS.get("bt.results",[]); if(!res.length){toast("אין רישומים בלוח הביפ");return;}
    const age=LS.get("bt.age",14),sex=LS.get("bt.sex","boys");
    const list=load(); let n=0;
    res.forEach(r=>{
      if(!(r.dist>0))return;
      const nm=r.name.trim(); if(!nm||/^תלמיד \d+$/.test(nm))return;
      let s=list.find(x=>x.name===nm);
      if(!s){ s={id:"s"+Date.now()+Math.random().toString(36).slice(2,5),name:nm,cls:"",sex,age,h:null,w:null,tests:[]}; list.push(s); }
      if(s.tests.some(t=>t.d===today()&&t.type==="ביפ"&&t.dist===r.dist))return;
      const v=vo2f(r.speed,s.age||age);
      s.tests.push({d:today(),type:"ביפ",dist:r.dist,level:r.level+"·"+r.sh,speed:r.speed,vo2:v>0?v:null,zone:v>0?zoneOf(v,s.age||age,s.sex||sex).g:""});
      s.tests.sort((a,b)=>a.d.localeCompare(b.d)); n++;
    });
    save(list);
    if(n){toast("✓ נשמרו "+n+" תוצאות למעקב (שמות אמיתיים בלבד)");go("stu");render();}
    else toast("אין תוצאות חדשות עם שם אמיתי — שנה שמות בלוח קודם");
  }
  function init(){
    if(inited){render();return;} inited=true;
    const {$}=H();
    $("#stu-search").addEventListener("input",e=>{q=e.target.value.trim();render();});
    $("#stu-classSel").addEventListener("change",e=>{clsF=e.target.value;render();});
    $("#stu-add").addEventListener("click",()=>H().modal("stu-addModal"));
    $("#stu-addSave").addEventListener("click",()=>{
      const lines=$("#stu-bulk").value.split(/\n/).map(l=>l.trim()).filter(Boolean);
      if(!lines.length)return;
      const list=load(); let n=0;
      lines.forEach(l=>{
        const [name,cls]=l.split(",").map(x=>(x||"").trim());
        if(!name||list.some(s=>s.name===name))return;
        list.push({id:"s"+Date.now()+Math.random().toString(36).slice(2,5),name,cls:cls||"",sex:"boys",age:14,h:null,w:null,tests:[]}); n++;
      });
      save(list); $("#stu-bulk").value=""; H().modal("stu-addModal",false); H().toast("נוספו "+n+" תלמידים"); render();
    });
    $("#stu-csv").addEventListener("click",()=>{
      const list=load(); if(!list.length){H().toast("אין תלמידים");return;}
      const rows=[["שם","כיתה","מין","גיל","BMI","מבחנים","מרחק אחרון","VO2 אחרון","אזור","מגמה"]];
      list.forEach(s=>{const lt=latest(s),b=bmi(s);
        rows.push([s.name,s.cls||"",s.sex==="girls"?"בת":"בן",s.age||"",b?b.toFixed(1):"",s.tests.length,lt?lt.dist:"",lt&&lt.vo2?lt.vo2.toFixed(1):"",lt?lt.zone:"",trend(s)>0?"שיפור":trend(s)<0?"ירידה":""]);});
      H().dlCSV("students_tracking.csv",rows);
    });
    render();
  }
  return {init,importFromBeep,count:()=>load().length};
})();

/* LESSON — עבר לקובץ נפרד: hm-lesson.js (מחולל מערכים מורחב) */

/* ============================ NUT — פינת תזונה ============================ */
window.NUT=(function(){
  let inited=false,cat="all";
  const TIPS=[
    {c:"before",t:"לפני פעילות",tx:"1.5–2 שעות לפני שיעור אינטנסיבי: פחמימה קלה לעיכול — פרוסה עם דבש, בננה, דייסה. לא מטוגן, לא שומני."},
    {c:"before",t:"לפני פעילות",tx:"חצי שעה לפני ביפ טסט או מבחן — מים בלבד. אוכל קרוב מדי למאמץ = דקירות בצד וכבדות."},
    {c:"before",t:"לפני פעילות",tx:"שיעור בשעה ראשונה? ארוחת בוקר קטנה עדיפה על כלום: יוגורט, פרי, פרוסה. גוף בצום מתעייף מהר יותר."},
    {c:"after",t:"אחרי פעילות",tx:"חלון ההתאוששות: עד שעה אחרי מאמץ — פחמימה + חלבון. שוקו וכריך גבינה זה שילוב מצוין ופשוט."},
    {c:"after",t:"אחרי פעילות",tx:"שרירים תפוסים למחרת? זה DOMS טבעי. מים, חלבון בארוחות, ותנועה קלה — עדיפים על מנוחה מוחלטת."},
    {c:"water",t:"שתייה",tx:"כלל אצבע לשיעור: כוס מים לפני, שלוק כל 15 דק׳, כוס בסוף. בקיץ — להכפיל."},
    {c:"water",t:"שתייה",tx:"צבע שתן = מד התייבשות הכי זמין. כהה מלימונדה חיוור? חסרים נוזלים עוד לפני שמרגישים צמא."},
    {c:"water",t:"שתייה",tx:"משקאות אנרגיה אסורים לפני ספורט לבני נוער — קפאין מעלה דופק ומסתיר סימני עומס. מים מנצחים תמיד."},
    {c:"food",t:"צלחת של ספורטאי",tx:"צלחת מאוזנת: חצי ירקות, רבע חלבון (עוף/דג/קטניות/ביצה), רבע פחמימה מלאה. פשוט — וזה 80% מהעבודה."},
    {c:"food",t:"צלחת של ספורטאי",tx:"ברזל חשוב במיוחד למתבגרים פעילים (ובמיוחד למתבגרות): בשר רזה, קטניות, טחינה. חוסר ברזל = עייפות בביפ."},
    {c:"food",t:"צלחת של ספורטאי",tx:"סידן + ויטמין D בגיל ההתבגרות בונים את שיא מסת העצם של החיים. מוצרי חלב, טחינה, שמש בחוץ — בדיוק מה ששיעור חנ״ג נותן."},
    {c:"myth",t:"שוברים מיתוס",tx:"«חלבון = שרירים»? כמות החלבון שמנצלים מוגבלת. נער מתאמן צריך ~1.2–1.6 ג׳ לק״ג מאוכל רגיל — אבקות מיותרות בגיל בי״ס."},
    {c:"myth",t:"שוברים מיתוס",tx:"«להזיע = לרדת במשקל»: הזעה היא איבוד נוזלים, לא שומן. המשקל חוזר עם כוס מים. מה שקובע: מאזן אנרגיה לאורך זמן."},
    {c:"myth",t:"שוברים מיתוס",tx:"«פחמימות משמינות»: לספורטאי צעיר פחמימה היא דלק. בלי דלק — אין ביפ טסט טוב. השאלה היא איזו פחמימה וכמה, לא אם."},
    {c:"myth",t:"שוברים מיתוס",tx:"דיאטות קיצוניות בגיל ההתבגרות פוגעות בגדילה ובביצועים. תלמיד שמדבר על צום/דיאטה חריפה — שווה שיחה שקטה והפניה ליועצת."}
  ];
  const CATS=[["all","הכל"],["before","לפני פעילות"],["after","אחרי פעילות"],["water","שתייה"],["food","צלחת ספורטאי"],["myth","שוברים מיתוס"]];
  function daily(){ const d=new Date(); return TIPS[(d.getFullYear()*372+d.getMonth()*31+d.getDate())%TIPS.length]; }
  function render(){
    const {$, $$, esc}=H();
    $("#nut-list").innerHTML=TIPS.filter(t=>cat==="all"||t.c===cat).map(t=>
      `<div class="nut-tip"><span class="catpill" style="background:var(--acc);color:#14152a">${esc(t.t)}</span><div>${esc(t.tx)}</div></div>`).join("");
  }
  function init(){
    if(inited)return; inited=true;
    const {$, $$, esc, say}=H();
    const d=daily();
    $("#nut-dailyTxt").innerHTML="<b style='color:var(--acc)'>"+esc(d.t)+" · </b>"+esc(d.tx);
    $("#nut-shuffle").addEventListener("click",()=>{
      const t=TIPS[Math.floor(Math.random()*TIPS.length)];
      $("#nut-dailyTxt").innerHTML="<b style='color:var(--acc)'>"+esc(t.t)+" · </b>"+esc(t.tx);
    });
    $("#nut-say").addEventListener("click",()=>{ say($("#nut-dailyTxt").textContent); });
    $("#nut-cats").innerHTML=CATS.map(([id,nm])=>`<button data-nc="${id}" class="${id===cat?"on":""}">${nm}</button>`).join("");
    $$("#nut-cats [data-nc]").forEach(b=>b.addEventListener("click",()=>{
      cat=b.dataset.nc; $$("#nut-cats [data-nc]").forEach(x=>x.classList.toggle("on",x===b)); render();
    }));
    render();
  }
  return {init,daily};
})();

/* ============================ HOME extras + נעילת מורה ============================ */
window.HMBootNew=function(){
  const {$, LS, toast, esc}=H();
  /* ---------- מסך כניסה: מורה (קוד) או תלמיד (בלי קוד) ----------
     מורה  — קוד נכון פותח את כל האפליקציה.
     תלמיד — נכנס בלי קוד למצב תצוגה: לוח השיאים ודף המשחקים בלבד. */
  const H0=H();
  const locked=LS.get("hx.lock",true)&&sessionStorage.getItem("pehub.unlocked")!=="1";
  const codeSet=()=>LS.get("rec.pass",null)!=null;
  const unlockTeacher=()=>{
    sessionStorage.setItem("pehub.unlocked","1");
    H0.setRole("teacher");
    $("#lockOv").classList.remove("on"); toast("ברוך הבא, המאמן 👋");
  };
  if(locked){
    $("#lockOv").classList.add("on");
    /* בפעם הראשונה אין קוד — המורה קובע אותו כאן, והוא נשמר במכשיר בלבד
       ואף פעם לא בקוד המקור. */
    if(!codeSet()){
      $("#lockOv .box p").textContent="הגדרת קוד מורה — בחר קוד שרק אתה יודע";
      $("#lock-pass").placeholder="קוד חדש";
      $("#lock-enter").textContent="קבע קוד והיכנס";
    }
    const tryPass=()=>{
      const v=$("#lock-pass").value.trim();
      if(!codeSet()){
        if(v.length<4){ toast("בחר קוד באורך 4 ספרות לפחות"); return; }
        LS.set("rec.pass",v);
        toast("🔑 הקוד נקבע — זכור אותו"); unlockTeacher(); return;
      }
      if(v===LS.get("rec.pass",null)) unlockTeacher();
      else { toast("קוד שגוי"); $("#lock-pass").value=""; }
    };
    $("#lock-enter").addEventListener("click",tryPass);
    $("#lock-pass").addEventListener("keydown",e=>{if(e.key==="Enter")tryPass();});
    setTimeout(()=>$("#lock-pass").focus(),150);
  } else if(H0.role()==="student"){
    /* נעילה כבויה אבל המכשיר נשאר במצב תלמיד */
    H0.setRole("student");
  }
  const stuBtn=$("#lock-student");
  if(stuBtn)stuBtn.addEventListener("click",()=>{
    sessionStorage.setItem("pehub.unlocked","1");
    H0.setRole("student");
    $("#lockOv").classList.remove("on");
    H0.go("rec"); toast("מצב תלמיד — צפייה בשיאים ושליחת שיא חדש");
  });

  /* מעבר למצב תלמיד מתוך האפליקציה (מוסרים את המכשיר לכיתה) */
  const handBtn=$("#rec-handBtn");
  if(handBtn)handBtn.addEventListener("click",()=>{
    if(!confirm("להעביר את המכשיר למצב תלמיד?\n\nהתלמידים יוכלו לצפות בשיאים ולשלוח שיא חדש בלבד.\nיציאה חזרה דורשת את קוד המורה."))return;
    H0.setRole("student"); H0.go("rec"); toast("🔒 מצב תלמיד פעיל");
  });

  /* יציאה ממצב תלמיד — דורשת קוד */
  const exitBtn=$("#roleExit");
  if(exitBtn)exitBtn.addEventListener("click",()=>{
    const p=prompt("קוד מורה ליציאה ממצב תלמיד:");
    if(p===null)return;
    if(codeSet()&&p===LS.get("rec.pass",null)){ H0.setRole("teacher"); H0.go("home"); toast("חזרת למצב מורה 👋"); }
    else toast("קוד שגוי");
  });

  const lockChk=$("#set-lock");
  if(lockChk){ lockChk.checked=LS.get("hx.lock",true);
    lockChk.addEventListener("change",()=>LS.set("hx.lock",lockChk.checked)); }
  /* weekly challenge */
  function chGet(){ return Object.assign({t:"אתגר השבוע: 100 שכיבות סמיכה",target:100,cur:0},LS.get("hx.ch",{})); }
  function chRender(){
    const c=chGet(),p=Math.min(100,Math.round(c.cur/Math.max(1,c.target)*100));
    $("#hx-chTitle").textContent=c.t;
    $("#hx-chPct").textContent=c.cur+" / "+c.target+" · "+p+"%";
    $("#hx-chBar").style.width=p+"%";
  }
  $("#hx-chPlus").addEventListener("click",()=>{
    const c=chGet(),n=parseFloat(prompt("כמה להוסיף לספירה?","10"));
    if(isNaN(n))return; c.cur=Math.max(0,c.cur+n); LS.set("hx.ch",c); chRender();
    if(c.cur>=c.target){H().confetti(60);H().horn();toast("🏆 האתגר הושלם!");}
  });
  $("#hx-chEdit").addEventListener("click",()=>{
    const c=chGet();
    const t=prompt("שם האתגר:",c.t); if(t===null)return;
    const tg=parseFloat(prompt("יעד מספרי:",c.target)); if(isNaN(tg))return;
    LS.set("hx.ch",{t:t.trim()||c.t,target:tg,cur:0}); chRender(); toast("אתגר חדש יצא לדרך!");
  });
  chRender();
  /* nutrition line on home */
  const d=window.NUT.daily();
  $("#hx-nutTip").innerHTML="🥗 <b style='color:var(--acc)'>"+esc(d.t)+":</b> "+esc(d.tx);
  /* date on hero */
  $("#hx-date").textContent=new Date().toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long"});
  /* save-beep-to-tracking button */
  const bt=$("#bt-toTrack"); if(bt)bt.addEventListener("click",window.STU.importFromBeep);
  const fb=$("#stu-fromBeep"); if(fb)fb.addEventListener("click",window.STU.importFromBeep);
  /* students count on home band */
  const sc=$("#qsStu"); if(sc)sc.textContent=window.STU.count();
};
})();
