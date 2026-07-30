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

/* ============================ LESSON — שיעור מלא ============================ */
window.LESSON=(function(){
  let inited=false,grade="mid",plan=null,run={on:false,i:0,t0:0,raf:0};
  const WARM={
    mid:[{n:"משחק תופסת שדה",d:"תופסת זוגות במגרש מסומן — מי שנתפס מצטרף לתופסים"},{n:"ג׳וגינג + תרגילי תנועה",d:"2 הקפות קלות, ואז: סקיפים, עקבים לישבן, צעדים צידיים, פתיחות ידיים"},{n:"מתיחות דינמיות",d:"סיבובי אגן, הנפות רגליים, שכיבות תמיכה איטיות ×5"}],
    high:[{n:"ג׳וגינג פרוגרסיבי",d:"3 דק׳ בקצב עולה מ־50% ל־75% דופק מרבי"},{n:"מוביליטי + אקטיבציה",d:"לאנג׳ הליכה, פלאנק כתפיים, סקוואט תחתית 10 שנ׳ ×3"},{n:"האצות קצרות",d:"4×40 מ׳ בעלייה הדרגתית 60→90%"}]
  };
  const MAINS={
    aerobic:{t:"אירובי — בניית בסיס",mid:"רצף תחנות אירובי: 6 תחנות × 40/20 שנ׳ (ג׳אמפינג ג׳ק, ברכיים גבוהות, מטפס הרים, דילוג חבל, סקיפים, ריצת סרק) — 2 סבבים עם משחק «רמזור» בין הסבבים.",high:"אינטרוולים: 8×200 מ׳ ביחס עבודה:מנוחה 1:1, קצב יעד לפי תוצאת ביפ אחרונה (מהירות שלב אחרון ×0.85). סיום: 4 דק׳ טמפו רציף.",goals:["שיפור סבולת לב־ריאה","ויסות קצב ונשימה"],eq:["קונוסים","שעון עצר / האפליקציה","מדבקות תחנות"]},
    strength:{t:"כוח — משקל גוף",mid:"מעגל כוח 6 תחנות × 40/20: סקוואט, שכיבות סמיכה (ברכיים למתקשים), פלאנק, לאנג׳, כיסא קיר, סופרמן. דגש טכניקה — המורה עובר תחנה־תחנה.",high:"מעגל כוח 8 תחנות × 45/15 ×2 סבבים, התקדמות: סקוואט קפיצה, שכיבות שיפוע, פלאנק עם מגע כתף, לאנג׳ אחורי. רישום חזרות אישי לכל תלמיד.",goals:["חיזוק שרירי ליבה וגפיים","טכניקת תרגילי בסיס נכונה"],eq:["מזרנים","קיר פנוי","כרטיסי תחנות"]},
    core:{t:"ליבה ויציבה",mid:"סבב ליבה 5 תחנות × 30/20: פלאנק, כפיפות בטן, סופרמן, פלאנק צד (חצי זמן לכל צד), הרמות רגליים. בין סבבים — משחק שיווי משקל בזוגות.",high:"סבב ליבה 6 תחנות × 45/15 ×2, כולל פלאנק דינמי ו־hollow hold. מדידת שיא פלאנק כיתתי בסוף — אפשר לשלוח ללוח השיאים.",goals:["ייצוב עמוד שדרה ואגן","מודעות ליציבה"],eq:["מזרנים","שעון עצר"]},
    beepprep:{t:"הכנה לביפ טסט",mid:"היכרות עם הפרוטוקול: 2 מעברי תרגול של 20 מ׳ בקצב ביפ שלבים 1–3 (בלי מדידה), ואז משחק «רודף את הביפ» — עמידה בקצב הולך ועולה. שיחה קצרה: איך מחלקים כוחות.",high:"סימולציית ביפ חלקית עד שלב 5–6 + ניתוח: איפה כל תלמיד «נשבר» ומה קצב היעד האישי למבחן. עבודת קצב: 6×20 מ׳ בקצב השלב האחרון של כל תלמיד.",goals:["היכרות עם פרוטוקול המבחן","קביעת קצב יעד אישי"],eq:["האפליקציה + רמקול","מסלול 20 מ׳ מסומן"]},
    test:{t:"שיעור מבחן — ביפ טסט",mid:"חימום קצר ← מבחן ביפ מלא דרך מודול «ביפ טסט» ← רישום נשירות בלוח ← שמירה למעקב תלמידים. מי שסיים: הליכת התאוששות ושתייה.",high:"כמו חטיבה, בתוספת: תלמידים שסיימו ממלאים תפקיד שופטי קו. בסוף — צפייה בלוח התוצאות והשוואה לנורמות.",goals:["מדידת סבולת אירובית (VO₂max)","תיעוד למעקב שנתי"],eq:["האפליקציה + רמקול חזק","מסלול 20 מ׳","מים"]},
    game:{t:"משחק ומשימה",mid:"משחק מרכזי: כדורשת / תופסת דגלים / מחניים בחוקים מותאמים. כל 6 דק׳ — «הפסקת כושר»: הטלת קוביית הכושר וביצוע כיתתי.",high:"טורניר מיני 3×3 (כדורסל/כדורעף) במגרשים קטנים, רוטציה כל 5 דק׳. קבוצה שמחוץ למגרש — תחנת כוח פעילה.",goals:["הנאה ושייכות חברתית","יישום מיומנויות במשחק"],eq:["כדורים","סימוני מגרש","קוביית הכושר באפליקציה"]}
  };
  const COOL=[{n:"הרפיה ומתיחות",d:"מתיחות סטטיות 20 שנ׳ לקבוצות השרירים שעבדו + נשימות עמוקות"},{n:"סבב משוב",d:"במעגל: כל תלמיד — מילה אחת על השיעור. חיזוק הישג אחד בולט"}];
  function minutes(){ const dur=+H().$("#ls-dur").value||45; const w=grade==="mid"?8:10,c=5; return {w,m:Math.max(10,dur-w-c),c}; }
  function gen(){
    const {$}=H();
    const focus=$("#ls-focus").value, M=MAINS[focus], mm=minutes();
    const warm=WARM[grade][Math.floor(Math.random()*WARM[grade].length)];
    const cool=COOL[Math.floor(Math.random()*COOL.length)];
    plan={grade,focus,cls:$("#ls-class").value.trim(),date:today(),title:M.t,goals:M.goals,eq:M.eq,
      phases:[{n:"חימום: "+warm.n,min:mm.w,d:warm.d},{n:M.t,min:mm.m,d:grade==="mid"?M.mid:M.high},{n:"סיום: "+cool.n,min:mm.c,d:cool.d}]};
    renderPlan(); H().toast("המערך נבנה — אפשר להפעיל, להדפיס או לשמור");
  }
  function renderPlan(){
    const {$, esc}=H();
    if(!plan){$("#ls-planCard").style.display="none";return;}
    $("#ls-planCard").style.display="";
    const total=plan.phases.reduce((a,p)=>a+p.min,0);
    $("#ls-planBody").innerHTML=`
      <div class="row" style="margin-bottom:9px;gap:7px">
        <span class="pill acc">${plan.grade==="mid"?"חטיבה ז׳–ט׳":"תיכון י׳–י״ב"}</span>
        ${plan.cls?`<span class="pill">כיתה ${esc(plan.cls)}</span>`:""}
        <span class="pill">${total} דק׳</span><span class="pill mono">${plan.date}</span>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-weight:600">מטרות</div>
      <ul class="hint" style="margin:0 0 10px;padding-inline-start:18px;line-height:1.7">${plan.goals.map(g=>"<li>"+esc(g)+"</li>").join("")}</ul>
      <div style="font-size:12px;color:var(--muted);margin-bottom:6px;font-weight:600">ציוד</div>
      <div class="row" style="gap:6px;margin-bottom:12px">${plan.eq.map(e=>`<span class="pill">${esc(e)}</span>`).join("")}</div>
      ${plan.phases.map((p,i)=>`<div class="fit-station"><div class="ix">${p.min}׳</div>
        <div class="grow"><b>${esc(p.n)}</b><div class="sb" style="line-height:1.55;margin-top:2px">${esc(p.d)}</div></div></div>`).join("")}`;
  }
  function runStart(){
    if(!plan||run.on)return;
    const {ac,keepAwake,say,horn}=H(); ac();
    run={on:true,i:-1,t0:performance.now(),raf:0};
    H().$("#ls-run").disabled=true; H().$("#ls-stop").disabled=false;
    keepAwake(true); say("השיעור מתחיל. "+plan.phases[0].n); horn();
    loop();
  }
  function loop(){
    if(!run.on)return;
    const {$, say, horn, beep}=H();
    const el=(performance.now()-run.t0)/1000;
    let acc=0,i=0;
    while(i<plan.phases.length&&acc+plan.phases[i].min*60<=el){acc+=plan.phases[i].min*60;i++;}
    if(i>=plan.phases.length){finish();return;}
    const remain=Math.ceil(acc+plan.phases[i].min*60-el);
    if(i!==run.i){run.i=i;if(i>0){horn();say(plan.phases[i].n);}}
    $("#ls-phase").dataset.ph=i===0?"prep":(i===plan.phases.length-1?"rest":"work");
    $("#ls-phName").textContent=plan.phases[i].n;
    $("#ls-phTime").textContent=Math.floor(remain/60)+":"+String(remain%60).padStart(2,"0");
    $("#ls-phNext").textContent=plan.phases[i+1]?"הבא: "+plan.phases[i+1].n:"שלב אחרון";
    if(remain<=3)beep(660,0.09);
    run.raf=requestAnimationFrame(loop);
  }
  function finish(){ stop(); const {say,horn,confetti,$}=H(); horn(); confetti(); say("השיעור הסתיים, כל הכבוד!");
    $("#ls-phName").textContent="🏆 השיעור הושלם"; $("#ls-phTime").textContent="✓"; $("#ls-phNext").textContent=""; }
  function stop(){ run.on=false; cancelAnimationFrame(run.raf); H().keepAwake(false);
    H().$("#ls-run").disabled=false; H().$("#ls-stop").disabled=true; }
  function saveLib(){
    if(!plan)return;
    const lib=H().LS.get("ls.lib",[]);
    lib.unshift({id:Date.now(),plan:JSON.parse(JSON.stringify(plan))});
    H().LS.set("ls.lib",lib.slice(0,40)); renderLib(); H().toast("💾 נשמר לספריית המערכים");
  }
  function renderLib(){
    const {$, $$, esc}=H(); const lib=H().LS.get("ls.lib",[]);
    $("#ls-libEmpty").style.display=lib.length?"none":"block";
    $("#ls-libList").innerHTML=lib.map(e=>`<div class="arc-item"><div class="grow">
      <div class="ttl">${esc(e.plan.title)}${e.plan.cls?" · "+esc(e.plan.cls):""}</div>
      <div class="sb">${e.plan.date} · ${e.plan.grade==="mid"?"חטיבה":"תיכון"} · ${e.plan.phases.reduce((a,p)=>a+p.min,0)} דק׳</div></div>
      <button class="btn sm" data-load="${e.id}">📂</button><button class="btn sm stop" data-del="${e.id}">✕</button></div>`).join("");
    $$("#ls-libList [data-load]").forEach(b=>b.addEventListener("click",()=>{
      const e=H().LS.get("ls.lib",[]).find(x=>x.id==b.dataset.load); if(e){plan=e.plan;renderPlan();H().toast("המערך נטען");}
    }));
    $$("#ls-libList [data-del]").forEach(b=>b.addEventListener("click",()=>{
      H().LS.set("ls.lib",H().LS.get("ls.lib",[]).filter(x=>x.id!=b.dataset.del)); renderLib();
    }));
  }
  function print(){
    if(!plan)return;
    const esc=H().esc, total=plan.phases.reduce((a,p)=>a+p.min,0);
    const w=window.open("","_blank");
    w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>מערך שיעור</title>
      <style>body{font-family:Arial;padding:34px;color:#1a1a2e;max-width:720px;margin:0 auto}h1{margin:0 0 2px;color:#3d3580}
      .meta{color:#666;margin-bottom:18px}h2{font-size:15px;border-bottom:2px solid #3d3580;padding-bottom:4px;margin:18px 0 8px}
      .ph{border:1px solid #ccc;border-radius:9px;padding:12px 14px;margin-bottom:10px}.ph b{color:#3d3580}
      ul{margin:4px 0;line-height:1.7}.tag{display:inline-block;border:1px solid #999;border-radius:99px;padding:2px 10px;font-size:12px;margin-inline-end:6px}</style></head><body>
      <h1>${esc(plan.title)}</h1><div class="meta">${plan.grade==="mid"?"חטיבה (ז׳–ט׳)":"תיכון (י׳–י״ב)"}${plan.cls?" · כיתה "+esc(plan.cls):""} · ${plan.date} · ${total} דק׳</div>
      <h2>מטרות</h2><ul>${plan.goals.map(g=>"<li>"+esc(g)+"</li>").join("")}</ul>
      <h2>ציוד</h2><div>${plan.eq.map(e=>'<span class="tag">'+esc(e)+"</span>").join("")}</div>
      <h2>מהלך השיעור</h2>${plan.phases.map(p=>`<div class="ph"><b>${esc(p.n)} · ${p.min} דק׳</b><div>${esc(p.d)}</div></div>`).join("")}
      <script>print()<\/script></body></html>`);
    w.document.close();
  }
  function init(){
    if(inited)return; inited=true;
    const {$, $$}=H();
    $$("#ls-gradeSeg button").forEach(b=>b.addEventListener("click",()=>{
      $$("#ls-gradeSeg button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); grade=b.dataset.g;
    }));
    $("#ls-gen").addEventListener("click",gen);
    $("#ls-run").addEventListener("click",runStart);
    $("#ls-stop").addEventListener("click",()=>{stop();H().$("#ls-phName").textContent="הופסק";});
    $("#ls-save").addEventListener("click",saveLib);
    $("#ls-print").addEventListener("click",print);
    renderLib();
  }
  return {init};
})();

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
  /* teacher lock */
  const locked=LS.get("hx.lock",true)&&sessionStorage.getItem("pehub.unlocked")!=="1";
  if(locked){
    $("#lockOv").classList.add("on");
    const tryPass=()=>{
      if($("#lock-pass").value===LS.get("rec.pass","1234")){
        sessionStorage.setItem("pehub.unlocked","1");
        $("#lockOv").classList.remove("on"); toast("ברוך הבא, המאמן 👋");
      } else { toast("סיסמה שגויה"); $("#lock-pass").value=""; }
    };
    $("#lock-enter").addEventListener("click",tryPass);
    $("#lock-pass").addEventListener("keydown",e=>{if(e.key==="Enter")tryPass();});
    setTimeout(()=>$("#lock-pass").focus(),150);
  }
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
