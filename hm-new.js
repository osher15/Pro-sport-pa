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

  /* ============================ ציונים ============================
     מבנה: 4 קטגוריות במשקלים (ברירת מחדל 70/10/10/10), עם עמודות מבחן
     דינמיות בתוך קטגוריית «מבחנים ומבדקים» (ממוצע של מה שהוזן בפועל).
     ציון סופי = סכום (ציון גולמי × משקל / 100) על כל קטגוריה שמולאה. */
  const DEF_WEIGHTS={part:70,exams:10,improve:10,team:10};
  const loadWeights=()=>Object.assign({},DEF_WEIGHTS,H().LS.get("grades.weights",{}));
  const saveWeights=w=>H().LS.set("grades.weights",w);
  const loadPeriods=()=>{ const p=H().LS.get("grades.periods",null); return (Array.isArray(p)&&p.length)?p:["רבעון 1"]; };
  const savePeriods=p=>H().LS.set("grades.periods",p);
  const loadExamCols=()=>H().LS.get("grades.examCols",{});
  const saveExamCols=c=>H().LS.set("grades.examCols",c);
  let grPeriod="",grClsF="";
  const examColsFor=period=>loadExamCols()[period]||[];
  const gradeOf=(s,period)=>{ const g=(s.grades=s.grades||{}); return g[period]=g[period]||{exams:{}}; };
  function computeFinal(s,period,weights,examCols){
    const g=(s.grades&&s.grades[period])||{};
    const examVals=examCols.map(c=>g.exams&&g.exams[c]).filter(v=>v!=null&&v!=="").map(Number);
    const examsAvg=examVals.length?examVals.reduce((a,b)=>a+b,0)/examVals.length:null;
    const cats=[["part",g.part],["exams",examsAvg],["improve",g.improve],["team",g.team]];
    let total=0,any=false;
    cats.forEach(([k,v])=>{ if(v!=null&&v!==""){ total+=(+v)*weights[k]/100; any=true; } });
    return {total:any?Math.round(total*10)/10:null,examsAvg};
  }
  function renderWeightsHint(){
    const {$}=H(); const w=loadWeights();
    $("#gr-formula").textContent=`ציון סופי = השתתפות ורצינות ${w.part}% + ממוצע מבחנים ${w.exams}% + שיפור והתמדה ${w.improve}% + עבודת צוות ${w.team}%`;
  }
  function updWSum(){
    const {$}=H();
    const sum=(+$("#gr-wPart").value||0)+(+$("#gr-wExams").value||0)+(+$("#gr-wImprove").value||0)+(+$("#gr-wTeam").value||0);
    $("#gr-wSum").innerHTML=`סה״כ: <b style="color:${sum===100?"var(--acc)":"#ff6b81"}">${sum}%</b>`+(sum===100?"":" — צריך להסתכם ל-100");
  }
  function openWeights(){
    const {$}=H(); const w=loadWeights();
    $("#gr-wPart").value=w.part; $("#gr-wExams").value=w.exams; $("#gr-wImprove").value=w.improve; $("#gr-wTeam").value=w.team;
    updWSum(); H().modal("gr-weightsModal");
  }
  function saveWeightsForm(){
    const {$}=H();
    const w={part:+$("#gr-wPart").value||0,exams:+$("#gr-wExams").value||0,improve:+$("#gr-wImprove").value||0,team:+$("#gr-wTeam").value||0};
    const sum=w.part+w.exams+w.improve+w.team;
    if(sum!==100){H().toast("המשקלים חייבים להסתכם ל-100 (כרגע "+sum+")");return;}
    saveWeights(w); H().modal("gr-weightsModal",false); renderWeightsHint(); renderGrades(); H().toast("מבנה הציון נשמר ✓");
  }
  function renderGrades(){
    const {$, $$, esc}=H();
    const list=load();
    const classes=[...new Set(list.map(s=>s.cls).filter(Boolean))].sort();
    $("#gr-classSel").innerHTML='<option value="">כל הכיתות</option>'+classes.map(c=>`<option ${c===grClsF?"selected":""}>${esc(c)}</option>`).join("");
    const periods=loadPeriods();
    if(!periods.includes(grPeriod))grPeriod=periods[0];
    $("#gr-period").innerHTML=periods.map(p=>`<option ${p===grPeriod?"selected":""}>${esc(p)}</option>`).join("");
    renderWeightsHint();
    const weights=loadWeights();
    const examCols=examColsFor(grPeriod);
    const view=list.filter(s=>!grClsF||s.cls===grClsF).sort((a,b)=>a.name.localeCompare(b.name,"he"));
    $("#gr-empty").style.display=view.length?"none":"block";
    if(!view.length){ $("#gr-table").innerHTML=""; return; }
    const head=`<thead><tr><th>שם</th><th>כיתה</th><th>השתתפות ורצינות<br>(${weights.part}%)</th>${
      examCols.map((c,i)=>`<th>${esc(c)} <button class="x" data-examdel="${i}" title="הסר עמודה">✕</button></th>`).join("")
    }<th>ממוצע מבחנים<br>(${weights.exams}%)</th><th>שיפור והתמדה<br>(${weights.improve}%)</th><th>עבודת צוות<br>(${weights.team}%)</th><th>ציון סופי</th></tr></thead>`;
    const body=view.map(s=>{
      const g=gradeOf(s,grPeriod);
      const {total,examsAvg}=computeFinal(s,grPeriod,weights,examCols);
      return `<tr data-sid="${s.id}">
        <td><b>${esc(s.name)}</b></td>
        <td style="color:var(--muted)">${esc(s.cls||"")}</td>
        <td><input class="gr-in" type="number" min="0" max="100" data-f="part" value="${g.part??""}"></td>
        ${examCols.map(c=>`<td><input class="gr-in" type="number" min="0" max="100" data-exam="${esc(c)}" value="${(g.exams&&g.exams[c])??""}"></td>`).join("")}
        <td class="mono">${examsAvg!=null?examsAvg.toFixed(1):"—"}</td>
        <td><input class="gr-in" type="number" min="0" max="100" data-f="improve" value="${g.improve??""}"></td>
        <td><input class="gr-in" type="number" min="0" max="100" data-f="team" value="${g.team??""}"></td>
        <td class="mono" style="font-weight:800;color:var(--acc)">${total!=null?total.toFixed(1):"—"}</td>
      </tr>`;
    }).join("");
    $("#gr-table").innerHTML=head+"<tbody>"+body+"</tbody>";
    /* עדכון שורה בודדת בלבד (בלי לבנות מחדש את כל הטבלה) — כדי לא לאבד פוקוס/מעבר Tab
       באמצע הזנת ציונים רצופה בסגנון גיליון. */
    function updateRowTotals(tr,s){
      const {total,examsAvg}=computeFinal(s,grPeriod,weights,examCols);
      const cells=tr.querySelectorAll("td");
      cells[3+examCols.length].textContent=examsAvg!=null?examsAvg.toFixed(1):"—";
      cells[cells.length-1].textContent=total!=null?total.toFixed(1):"—";
    }
    $$("#gr-table [data-f]").forEach(inp=>inp.addEventListener("change",()=>{
      const tr=inp.closest("tr"), s=list.find(x=>x.id===tr.dataset.sid); if(!s)return;
      const g=gradeOf(s,grPeriod); const v=inp.value===""?null:Math.max(0,Math.min(100,+inp.value));
      if(v!=null)inp.value=v;
      g[inp.dataset.f]=v; save(list); updateRowTotals(tr,s);
    }));
    $$("#gr-table [data-exam]").forEach(inp=>inp.addEventListener("change",()=>{
      const tr=inp.closest("tr"), s=list.find(x=>x.id===tr.dataset.sid); if(!s)return;
      const g=gradeOf(s,grPeriod); g.exams=g.exams||{};
      const v=inp.value===""?null:Math.max(0,Math.min(100,+inp.value));
      if(v!=null)inp.value=v;
      if(v==null)delete g.exams[inp.dataset.exam]; else g.exams[inp.dataset.exam]=v;
      save(list); updateRowTotals(tr,s);
    }));
    $$("#gr-table [data-examdel]").forEach(b=>b.addEventListener("click",()=>{
      const i=+b.dataset.examdel, name=examCols[i];
      if(!confirm(`להסיר את עמודת «${name}»? ציוני התלמידים בעמודה הזו יימחקו.`))return;
      const cols=loadExamCols(); cols[grPeriod]=(cols[grPeriod]||[]).filter(c=>c!==name); saveExamCols(cols);
      list.forEach(s=>{ if(s.grades&&s.grades[grPeriod]&&s.grades[grPeriod].exams)delete s.grades[grPeriod].exams[name]; });
      save(list); renderGrades();
    }));
  }
  function addExamCol(){
    const cols=loadExamCols(); const arr=cols[grPeriod]=cols[grPeriod]||[];
    const name=prompt("שם עמודת המבחן:","מבחן "+(arr.length+1));
    if(!name)return; const n=name.trim(); if(!n)return;
    if(arr.includes(n)){H().toast("כבר קיימת עמודה בשם הזה");return;}
    arr.push(n); saveExamCols(cols); renderGrades();
  }
  function addPeriod(){
    const periods=loadPeriods();
    const name=prompt("שם תקופת ההערכה החדשה:","רבעון "+(periods.length+1));
    if(!name)return; const n=name.trim(); if(!n||periods.includes(n))return;
    periods.push(n); savePeriods(periods); grPeriod=n; renderGrades();
  }
  function delPeriod(){
    const periods=loadPeriods();
    if(periods.length<=1){H().toast("חייבת להישאר לפחות תקופה אחת");return;}
    if(!confirm(`למחוק את «${grPeriod}»? כל הציונים שהוזנו בתקופה הזו יימחקו.`))return;
    const idx=periods.indexOf(grPeriod); periods.splice(idx,1); savePeriods(periods);
    const cols=loadExamCols(); delete cols[grPeriod]; saveExamCols(cols);
    const list=load(); list.forEach(s=>{ if(s.grades)delete s.grades[grPeriod]; }); save(list);
    grPeriod=periods[0]; renderGrades();
  }
  function exportGradesCsv(){
    const list=load().filter(s=>!grClsF||s.cls===grClsF).sort((a,b)=>a.name.localeCompare(b.name,"he"));
    if(!list.length){H().toast("אין תלמידים");return;}
    const weights=loadWeights(), examCols=examColsFor(grPeriod);
    const rows=[["שם","כיתה","השתתפות ורצינות",...examCols,"ממוצע מבחנים","שיפור והתמדה","עבודת צוות","ציון סופי"]];
    list.forEach(s=>{
      const g=gradeOf(s,grPeriod); const {total,examsAvg}=computeFinal(s,grPeriod,weights,examCols);
      rows.push([s.name,s.cls||"",g.part??"",...examCols.map(c=>(g.exams&&g.exams[c])??""),examsAvg!=null?examsAvg.toFixed(1):"",g.improve??"",g.team??"",total!=null?total.toFixed(1):""]);
    });
    H().dlCSV("ציונים_"+grPeriod+".csv",rows);
  }

  /* ============================ הערכת עמיתים קבוצתית (PBL) ============================
     קבוצה מעריכה קבוצה: הערכה = רשומה עם קבוצת תלמידים מוערכת + ציון 100/80/60/40/20
     לכל קריטריון + הערות + תמונה קבוצתית אופציונלית. ממוצע ההערכות של תלמיד בתקופה
     נכנס אוטומטית לעמודת «עבודת צוות» בטבלת הציונים. */
  const DEF_PCRIT=[
    {id:"c1",t:"ביצוע המשימה",d:"דיוק בביצוע המיומנויות והתאמה לדרישות"},
    {id:"c2",t:"עבודת צוות ושיתוף פעולה",d:"תקשורת, עזרה הדדית והתמודדות עם אתגרים"},
    {id:"c3",t:"כבוד הדדי וקבלת האחר",d:"התחשבות ביכולות, יחס מכבד וסובלנות"},
    {id:"c4",t:"אחריות אישית ומעורבות",d:"נטילת חלק פעיל ועמידה במטלות שהוטלו על התלמיד"},
    {id:"c5",t:"מוטיבציה ומאמץ",d:"רמת מחויבות ומאמץ להצלחת המשימה"},
    {id:"c6",t:"חשיבה יצירתית",d:"שימוש בדרכים יצירתיות ופתרון אתגרים"},
    {id:"c7",t:"השגת המטרה",d:"עמידה ביעדים שהוגדרו בתחילה"},
    {id:"c8",t:"בטיחות והגינות",d:"שמירה על כללים ויושרה בביצוע"}
  ];
  const loadPCrit=()=>{ const c=H().LS.get("grades.peerCrit",null); return (Array.isArray(c)&&c.length)?c:DEF_PCRIT; };
  const savePCrit=c=>H().LS.set("grades.peerCrit",c);
  const loadAssess=()=>H().LS.get("grades.peerAssess",[]);
  const saveAssess=a=>H().LS.set("grades.peerAssess",a);
  let paDraft=null,paEditId=null,paPeriodF="";
  const newDraft=()=>({task:"",period:grPeriod||loadPeriods()[0],students:[],photo:null,scores:{},notes:""});
  const paAvg=(scores,crit)=>{
    const vals=crit.map(c=>scores[c.id]).filter(v=>v!=null);
    return vals.length?Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*10)/10:null;
  };
  function renderPCritList(){
    const {$,$$,esc}=H();
    const crit=loadPCrit();
    $("#pa-critList").innerHTML=crit.map((c,i)=>`<div class="pa-crit" data-cid="${c.id}">
        <div class="pa-critH"><b>${i+1}. ${esc(c.t)}</b>${c.d?`<span class="hint">${esc(c.d)}</span>`:""}</div>
        <div class="pa-scoreBtns">${[100,80,60,40,20].map(v=>`<button type="button" class="pa-sb pa-sb${v} ${paDraft.scores[c.id]===v?"on":""}" data-cid="${c.id}" data-v="${v}">${v}</button>`).join("")}</div>
      </div>`).join("");
    $$("#pa-critList .pa-sb").forEach(b=>b.addEventListener("click",()=>{
      paDraft.scores[b.dataset.cid]=+b.dataset.v; renderPCritList();
    }));
  }
  function renderPaStuUI(){
    const {$,$$,esc}=H();
    const list=load().sort((a,b)=>a.name.localeCompare(b.name,"he"));
    const avail=list.filter(s=>!paDraft.students.includes(s.id));
    $("#pa-stuSel").innerHTML=avail.length?avail.map(s=>`<option value="${s.id}">${esc(s.name)}${s.cls?" · "+esc(s.cls):""}</option>`).join(""):'<option value="">אין תלמידים זמינים</option>';
    $("#pa-stuChips").innerHTML=paDraft.students.map(id=>{
      const s=list.find(x=>x.id===id); if(!s)return"";
      return `<span class="pa-chip">${esc(s.name)}<button type="button" data-parm="${id}">✕</button></span>`;
    }).join("")||'<span class="hint">עדיין לא נוספו תלמידים</span>';
    $$("#pa-stuChips [data-parm]").forEach(b=>b.addEventListener("click",()=>{
      paDraft.students=paDraft.students.filter(id=>id!==b.dataset.parm); renderPaStuUI();
    }));
  }
  function paHandlePhoto(file){
    return new Promise(resolve=>{
      const img=new Image(),url=URL.createObjectURL(file);
      img.onload=()=>{
        const maxW=480,scale=Math.min(1,maxW/img.width);
        const w=Math.round(img.width*scale),h=Math.round(img.height*scale);
        const cv=document.createElement("canvas"); cv.width=w; cv.height=h;
        cv.getContext("2d").drawImage(img,0,0,w,h);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL("image/jpeg",0.7));
      };
      img.src=url;
    });
  }
  function renderPaPhoto(){
    const {$}=H(); const has=!!paDraft.photo;
    $("#pa-photoPrev").style.display=has?"":"none";
    if(has)$("#pa-photoPrev").src=paDraft.photo;
    $("#pa-photoDel").style.display=has?"":"none";
  }
  function renderPaForm(){
    const {$,esc}=H();
    const periods=loadPeriods();
    $("#pa-period").innerHTML=periods.map(p=>`<option ${p===paDraft.period?"selected":""}>${esc(p)}</option>`).join("");
    $("#pa-task").value=paDraft.task;
    $("#pa-notes").value=paDraft.notes;
    renderPaStuUI(); renderPaPhoto(); renderPCritList();
    $("#pa-cancel").style.display=paEditId?"":"none";
    $("#pa-draftHint").textContent=paEditId?"עורך הערכה קיימת":"";
  }
  function paSave(){
    const {$,toast}=H();
    paDraft.task=$("#pa-task").value.trim();
    paDraft.period=$("#pa-period").value;
    paDraft.notes=$("#pa-notes").value;
    if(!paDraft.task){toast("הזן שם למשימה/פרויקט");return;}
    if(!paDraft.students.length){toast("הוסף לפחות תלמיד אחד להערכה");return;}
    const crit=loadPCrit();
    if(!crit.every(c=>paDraft.scores[c.id]!=null)){toast("דרג את כל הקריטריונים לפני השמירה");return;}
    const list=loadAssess();
    if(paEditId){
      const idx=list.findIndex(a=>a.id===paEditId);
      if(idx>-1)list[idx]={...paDraft,id:paEditId,date:list[idx].date};
    } else {
      list.push({...paDraft,id:"pa"+Date.now()+Math.random().toString(36).slice(2,5),date:today()});
    }
    saveAssess(list);
    toast("ההערכה נשמרה ✓");
    paDraft=newDraft(); paEditId=null;
    renderPaForm(); renderPaList();
  }
  function paCancelEdit(){ paDraft=newDraft(); paEditId=null; renderPaForm(); }
  function renderPaList(){
    const {$,$$,esc}=H();
    const periods=loadPeriods();
    if(!periods.includes(paPeriodF))paPeriodF=periods.includes(grPeriod)?grPeriod:periods[0];
    $("#pa-periodF").innerHTML=periods.map(p=>`<option ${p===paPeriodF?"selected":""}>${esc(p)}</option>`).join("");
    const crit=loadPCrit();
    const all=loadAssess().filter(a=>a.period===paPeriodF).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
    const stuList=load();
    $("#pa-empty").style.display=all.length?"none":"block";
    $("#pa-list").innerHTML=all.map(a=>{
      const names=a.students.map(id=>{const s=stuList.find(x=>x.id===id);return s?s.name:"?";}).join(", ");
      const avg=paAvg(a.scores,crit);
      return `<div class="pa-item" data-aid="${a.id}">
        <div class="row">
          <div>
            <b>${esc(a.task||"(ללא שם)")}</b>
            <div class="hint" style="margin-top:3px">${esc(names)} · ${esc(a.date||"")}</div>
            ${a.notes?`<div class="hint" style="margin-top:3px">💬 ${esc(a.notes)}</div>`:""}
          </div>
          <div class="row" style="gap:6px">
            ${a.photo?`<img src="${a.photo}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;border:1px solid var(--line)">`:""}
            <span class="pill acc" style="font-weight:800">${avg!=null?avg.toFixed(0):"—"}</span>
            <button class="btn sm ghost" data-paedit="${a.id}">✎</button>
            <button class="btn sm stop" data-padel="${a.id}">🗑</button>
          </div>
        </div>
      </div>`;
    }).join("");
    $$("#pa-list [data-paedit]").forEach(b=>b.addEventListener("click",()=>{
      const a=loadAssess().find(x=>x.id===b.dataset.paedit); if(!a)return;
      paDraft={task:a.task,period:a.period,students:[...a.students],photo:a.photo,scores:{...a.scores},notes:a.notes||""};
      paEditId=a.id;
      renderPaForm();
      $("#pa-task").scrollIntoView({behavior:"smooth",block:"start"});
    }));
    $$("#pa-list [data-padel]").forEach(b=>b.addEventListener("click",()=>{
      if(!confirm("למחוק את ההערכה הזו?"))return;
      saveAssess(loadAssess().filter(x=>x.id!==b.dataset.padel));
      renderPaList();
    }));
  }
  function paApplyToGrades(){
    const {toast}=H();
    const period=paPeriodF;
    const assess=loadAssess().filter(a=>a.period===period);
    if(!assess.length){toast("אין הערכות בתקופה הזו");return;}
    const crit=loadPCrit();
    const list=load();
    const perStudent={};
    assess.forEach(a=>{
      const avg=paAvg(a.scores,crit); if(avg==null)return;
      a.students.forEach(id=>{ (perStudent[id]=perStudent[id]||[]).push(avg); });
    });
    let n=0;
    Object.keys(perStudent).forEach(id=>{
      const s=list.find(x=>x.id===id); if(!s)return;
      const vals=perStudent[id];
      const g=gradeOf(s,period);
      g.team=Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*10)/10;
      n++;
    });
    save(list);
    toast(`עודכן ציון עבודת צוות ל-${n} תלמידים לפי ${assess.length} הערכות`);
    if(grPeriod===period)renderGrades();
  }
  function renderPCritEdit(){
    const {$,$$,esc}=H();
    const crit=loadPCrit();
    $("#pa-critEdit").innerHTML=crit.map(c=>`<div class="row" data-cid="${c.id}" style="gap:6px">
        <div class="field" style="width:150px;margin:0"><input type="text" data-pct="${c.id}" value="${esc(c.t)}" placeholder="שם הקריטריון"></div>
        <div class="field grow" style="margin:0"><input type="text" data-pcd="${c.id}" value="${esc(c.d||"")}" placeholder="תיאור קצר (אופציונלי)"></div>
        <button class="btn sm stop" data-pcdel="${c.id}" style="flex:none">🗑</button>
      </div>`).join("");
    $$("#pa-critEdit [data-pcdel]").forEach(b=>b.addEventListener("click",()=>{
      const cur=loadPCrit().filter(c=>c.id!==b.dataset.pcdel);
      if(!cur.length){H().toast("צריך להישאר לפחות קריטריון אחד");return;}
      savePCrit(cur); renderPCritEdit();
    }));
  }
  function addPCrit(){
    const cur=loadPCrit();
    cur.push({id:"c"+Date.now()+Math.random().toString(36).slice(2,4),t:"קריטריון חדש",d:""});
    savePCrit(cur); renderPCritEdit();
  }
  function savePCritForm(){
    const {$,$$,toast}=H();
    const cur=loadPCrit();
    $$("#pa-critEdit [data-pct]").forEach(inp=>{ const c=cur.find(x=>x.id===inp.dataset.pct); if(c)c.t=inp.value.trim()||c.t; });
    $$("#pa-critEdit [data-pcd]").forEach(inp=>{ const c=cur.find(x=>x.id===inp.dataset.pcd); if(c)c.d=inp.value.trim(); });
    savePCrit(cur);
    H().modal("pa-critModal",false);
    renderPCritList(); renderPaList();
    toast("הקריטריונים נשמרו ✓");
  }
  function openPCritModal(){ renderPCritEdit(); H().modal("pa-critModal"); }

  function init(){
    if(inited){render();return;} inited=true;
    const {$}=H();
    $("#stu-search").addEventListener("input",e=>{q=e.target.value.trim();render();});
    $("#stu-classSel").addEventListener("change",e=>{clsF=e.target.value;render();});
    $("#stu-add").addEventListener("click",()=>H().modal("stu-addModal"));
    function addLines(text){
      const defCls=$("#stu-defaultCls").value.trim();
      const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
      if(!lines.length)return 0;
      const list=load(); let n=0;
      lines.forEach(l=>{
        const [name,cls]=l.split(",").map(x=>(x||"").trim());
        if(!name||/^(שם|name)$/i.test(name)||list.some(s=>s.name===name))return;
        list.push({id:"s"+Date.now()+Math.random().toString(36).slice(2,5),name,cls:cls||defCls||"",sex:"boys",age:14,h:null,w:null,tests:[]}); n++;
      });
      save(list); return n;
    }
    $("#stu-addSave").addEventListener("click",()=>{
      const n=addLines($("#stu-bulk").value);
      $("#stu-bulk").value=""; H().modal("stu-addModal",false); H().toast("נוספו "+n+" תלמידים"); render();
    });
    $("#stu-fileImport").addEventListener("change",async e=>{
      const file=e.target.files[0]; e.target.value="";
      if(!file)return;
      const text=await file.text();
      const n=addLines(text);
      H().modal("stu-addModal",false); H().toast(n?"נוספו "+n+" תלמידים מהקובץ":"לא נמצאו תלמידים חדשים בקובץ"); render();
    });
    $("#stu-csv").addEventListener("click",()=>{
      const list=load(); if(!list.length){H().toast("אין תלמידים");return;}
      const rows=[["שם","כיתה","מין","גיל","BMI","מבחנים","מרחק אחרון","VO2 אחרון","אזור","מגמה"]];
      list.forEach(s=>{const lt=latest(s),b=bmi(s);
        rows.push([s.name,s.cls||"",s.sex==="girls"?"בת":"בן",s.age||"",b?b.toFixed(1):"",s.tests.length,lt?lt.dist:"",lt&&lt.vo2?lt.vo2.toFixed(1):"",lt?lt.zone:"",trend(s)>0?"שיפור":trend(s)<0?"ירידה":""]);});
      H().dlCSV("students_tracking.csv",rows);
    });
    /* ---------- ציונים ---------- */
    $$(".pf-tabs [data-st]").forEach(b=>b.addEventListener("click",()=>{
      $$(".pf-tabs [data-st]").forEach(x=>x.classList.remove("on")); b.classList.add("on");
      const sub=b.dataset.st;
      $("#stu-sub-list").style.display=sub==="list"?"":"none";
      $("#stu-sub-grades").style.display=sub==="grades"?"":"none";
      $("#stu-sub-peer").style.display=sub==="peer"?"":"none";
      if(sub==="grades")renderGrades();
      if(sub==="peer"){ renderPaForm(); renderPaList(); }
    }));
    $("#gr-weightsBtn").addEventListener("click",openWeights);
    ["#gr-wPart","#gr-wExams","#gr-wImprove","#gr-wTeam"].forEach(id=>$(id).addEventListener("input",updWSum));
    $("#gr-wSave").addEventListener("click",saveWeightsForm);
    $("#gr-period").addEventListener("change",e=>{grPeriod=e.target.value;renderGrades();});
    $("#gr-periodAdd").addEventListener("click",addPeriod);
    $("#gr-periodDel").addEventListener("click",delPeriod);
    $("#gr-classSel").addEventListener("change",e=>{grClsF=e.target.value;renderGrades();});
    $("#gr-examAdd").addEventListener("click",addExamCol);
    $("#gr-csv").addEventListener("click",exportGradesCsv);
    /* ---------- הערכת עמיתים ---------- */
    paDraft=newDraft();
    $("#pa-critBtn").addEventListener("click",openPCritModal);
    $("#pa-critAdd").addEventListener("click",addPCrit);
    $("#pa-critSave").addEventListener("click",savePCritForm);
    $("#pa-stuAdd").addEventListener("click",()=>{
      const id=$("#pa-stuSel").value; if(!id)return;
      if(!paDraft.students.includes(id))paDraft.students.push(id);
      renderPaStuUI();
    });
    $("#pa-photoInput").addEventListener("change",async e=>{
      const f=e.target.files[0]; e.target.value=""; if(!f)return;
      paDraft.photo=await paHandlePhoto(f); renderPaPhoto();
    });
    $("#pa-photoDel").addEventListener("click",()=>{ paDraft.photo=null; renderPaPhoto(); });
    $("#pa-save").addEventListener("click",paSave);
    $("#pa-cancel").addEventListener("click",paCancelEdit);
    $("#pa-period").addEventListener("change",()=>{ paDraft.period=$("#pa-period").value; });
    $("#pa-periodF").addEventListener("change",e=>{ paPeriodF=e.target.value; renderPaList(); });
    $("#pa-applyBtn").addEventListener("click",paApplyToGrades);
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
        if(window.REC&&window.REC.setPass)window.REC.setPass(v); else LS.set("rec.pass",v);
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
