"use strict";
/* ============================================================
   המגרש PRO — כלי כיתה
   קבוצות מאוזנות · הגרלת תלמיד · נוכחות והשתתפות · מחוונים
   כולם נשענים על רשימת התלמידים של מודול «התלמידים שלי».
   ============================================================ */
(function(){
const H=()=>window.HM;
const today=()=>new Date().toISOString().slice(0,10);
const students=()=>H().LS.get("stu.list",[]);
const classesOf=l=>[...new Set(l.map(s=>s.cls).filter(Boolean))].sort();
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

/* דירוג יכולת לצורך איזון: המרחק במבחן האחרון. תלמיד בלי מבחן מקבל חציון. */
function levelOf(s){
  const t=s.tests&&s.tests.length?s.tests[s.tests.length-1]:null;
  return t&&t.dist>0?t.dist:null;
}
function withLevels(list){
  const known=list.map(levelOf).filter(v=>v!=null).sort((a,b)=>a-b);
  const med=known.length?known[Math.floor(known.length/2)]:1000;
  return list.map(s=>({s,lv:levelOf(s)??med,known:levelOf(s)!=null}));
}

window.TOOLS=(function(){
  let inited=false, tab="teams";

  /* ============================================================
     1. מחולל קבוצות
     ============================================================ */
  let teams=[], teamCls="", teamN=4, teamMode="balanced";
  function pool(){
    const l=students();
    return teamCls?l.filter(s=>s.cls===teamCls):l;
  }
  function makeTeams(){
    const {toast}=H();
    const p=pool();
    if(p.length<teamN){toast("אין מספיק תלמידים למספר הקבוצות");return;}
    const n=Math.max(2,Math.min(10,teamN));
    teams=Array.from({length:n},()=>[]);

    if(teamMode==="random"){
      shuffle(p).forEach((s,i)=>teams[i%n].push({s,lv:null}));
    } else if(teamMode==="gender"){
      /* מאזן בנים ובנות בין הקבוצות, ובתוך זה מאזן רמה */
      ["boys","girls"].forEach(sex=>{
        const grp=withLevels(p.filter(s=>(s.sex||"boys")===sex)).sort((a,b)=>b.lv-a.lv);
        snake(grp);
      });
    } else {
      /* איזון רמה בשיטת "נחש": חזק–חלש לסירוגין */
      snake(withLevels(p).sort((a,b)=>b.lv-a.lv));
    }
    function snake(arr){
      let dir=1,i=0;
      arr.forEach(e=>{
        teams[i].push(e);
        i+=dir;
        if(i===n){i=n-1;dir=-1;} else if(i<0){i=0;dir=1;}
      });
    }
    renderTeams();
    H().toast("הוגרלו "+n+" קבוצות");
  }
  function renderTeams(){
    const {$, $$, esc}=H();
    if(!teams.length){$("#tl-teamsWrap").innerHTML="";$("#tl-teamActions").style.display="none";return;}
    $("#tl-teamActions").style.display="";
    const COL=["#38bdf8","#fbbf24","#34d399","#f472b6","#a78bfa","#fb923c","#4ade80","#f87171","#22d3ee","#c084fc"];
    $("#tl-teamsWrap").innerHTML=teams.map((t,i)=>{
      const known=t.filter(e=>e.lv!=null&&e.s.tests&&e.s.tests.length);
      const avg=known.length?Math.round(known.reduce((a,e)=>a+e.lv,0)/known.length):null;
      return `<div class="tl-team" style="--tc:${COL[i%COL.length]}">
        <div class="hd"><b>קבוצה ${i+1}</b>
          <span class="cnt">${t.length} שחקנים${avg?" · ממוצע "+avg+" מ׳":""}</span></div>
        <ol>${t.map(e=>`<li>${esc(e.s.name)}${e.s.sex==="girls"?" ♀":""}</li>`).join("")}</ol>
      </div>`;
    }).join("");
  }
  function printTeams(){
    if(!teams.length)return;
    const esc=H().esc, school=H().SET.school?esc(H().SET.school)+" · ":"";
    H().printWindow(`<html dir="rtl"><head><meta charset="utf-8"><title>חלוקה לקבוצות</title>
      <style>body{font-family:Arial;padding:26px;color:#16182b}
      h1{color:#1f7a4d;font-size:21px;margin:0 0 3px}.meta{color:#666;font-size:13px;margin-bottom:16px}
      .g{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
      .t{border:2px solid #1f7a4d;border-radius:9px;padding:10px 13px;break-inside:avoid}
      .t b{color:#1f7a4d;font-size:15px}ol{margin:6px 0 0;padding-inline-start:20px;line-height:1.75}
      </style></head><body>
      <h1>חלוקה לקבוצות</h1><div class="meta">${school}${teamCls?"כיתה "+esc(teamCls)+" · ":""}${today()}</div>
      <div class="g">${teams.map((t,i)=>`<div class="t"><b>קבוצה ${i+1}</b>
        <ol>${t.map(e=>"<li>"+esc(e.s.name)+"</li>").join("")}</ol></div>`).join("")}</div>
      </body></html>`);
    w.document.close();
  }

  /* ============================================================
     2. הגרלת תלמיד — בלי חזרות עד שכולם יצאו
     ============================================================ */
  let pickCls="", picked=[], lastPick=null;
  function pickPool(){
    const l=students();
    return (pickCls?l.filter(s=>s.cls===pickCls):l);
  }
  function drawStudent(){
    const {$, esc, toast, beep, confetti}=H();
    let p=pickPool();
    if(!p.length){toast("אין תלמידים ברשימה");return;}
    let left=p.filter(s=>!picked.includes(s.id));
    if(!left.length){ picked=[]; left=p; toast("סבב חדש — כולם חוזרים לקלפי"); }
    const s=left[Math.floor(Math.random()*left.length)];
    picked.push(s.id); lastPick=s;
    /* אנימציית גלגול קצרה */
    const box=$("#tl-pickName"); let n=0;
    const spin=setInterval(()=>{
      box.textContent=p[Math.floor(Math.random()*p.length)].name;
      if(++n>9){ clearInterval(spin);
        box.textContent=s.name;
        $("#tl-pickSub").textContent=(s.cls||"")+" · נותרו "+(p.length-picked.length)+" בסבב";
        beep(880,0.14); confetti(30);
      }
    },70);
    renderPicked();
  }
  function renderPicked(){
    const {$, esc}=H();
    const p=pickPool();
    $("#tl-pickList").innerHTML=picked.length
      ? picked.map(id=>{const s=p.find(x=>x.id===id);return s?`<span class="pill">${esc(s.name)}</span>`:"";}).join("")
      : '<span class="hint">עדיין לא הוגרל אף אחד בסבב הזה.</span>';
  }

  /* ============================================================
     3. נוכחות והשתתפות
     ============================================================ */
  const ATT=()=>H().LS.get("tools.att",{});
  const attKey=(d,c)=>d+"|"+(c||"all");
  const MARKS=[["p","מלאה","#34d399"],["h","חלקית","#fbbf24"],["e","פטור","#38bdf8"],["a","נעדר","#f87171"]];
  let attCls="", attDate=today();
  function renderAtt(){
    const {$, $$, esc}=H();
    const l=students().filter(s=>!attCls||s.cls===attCls);
    const all=ATT(), rec=all[attKey(attDate,attCls)]||{};
    const cnt={p:0,h:0,e:0,a:0};
    l.forEach(s=>{ if(rec[s.id])cnt[rec[s.id]]=(cnt[rec[s.id]]||0)+1; });
    $("#tl-attStats").innerHTML=MARKS.map(([k,nm,c])=>
      `<div class="qs"><div class="n" style="color:${c}">${cnt[k]||0}</div><div class="l">${nm}</div></div>`).join("")+
      `<div class="qs"><div class="n">${l.length-Object.keys(rec).length}</div><div class="l">לא סומן</div></div>`;
    $("#tl-attList").innerHTML=l.length?l.map(s=>`<div class="tl-attrow">
      <div class="grow"><b>${esc(s.name)}</b><span class="sb">${esc(s.cls||"")}</span></div>
      <div class="tl-marks">${MARKS.map(([k,nm,c])=>
        `<button data-att="${s.id}|${k}" class="${rec[s.id]===k?"on":""}" style="--mc:${c}">${nm}</button>`).join("")}</div>
    </div>`).join(""):'<div class="empty-state"><div class="big">👥</div>אין תלמידים בכיתה הזו.<br>הוסף תלמידים במודול «התלמידים שלי».</div>';
    $$("#tl-attList [data-att]").forEach(b=>b.addEventListener("click",()=>{
      const [id,k]=b.dataset.att.split("|");
      const a=ATT(), key=attKey(attDate,attCls);
      a[key]=a[key]||{};
      if(a[key][id]===k)delete a[key][id]; else a[key][id]=k;
      H().LS.set("tools.att",a); renderAtt();
    }));
  }
  function attSummary(){
    const {esc}=H();
    const all=ATT(), l=students().filter(s=>!attCls||s.cls===attCls);
    const per={};
    Object.keys(all).forEach(k=>{
      const [d,c]=k.split("|");
      if(attCls&&c!==attCls)return;
      Object.entries(all[k]).forEach(([id,v])=>{ per[id]=per[id]||{p:0,h:0,e:0,a:0,days:0}; per[id][v]++; per[id].days++; });
    });
    const rows=[["שם","כיתה","שיעורים","השתתפות מלאה","חלקית","פטור","נעדר","% השתתפות"]];
    l.forEach(s=>{
      const x=per[s.id]||{p:0,h:0,e:0,a:0,days:0};
      const pct=x.days?Math.round((x.p+x.h*0.5)/x.days*100):0;
      rows.push([s.name,s.cls||"",x.days,x.p,x.h,x.e,x.a,pct+"%"]);
    });
    H().dlCSV("attendance_"+(attCls||"all")+".csv",rows);
    H().toast("דוח נוכחות הורד");
  }

  /* ============================================================
     4. מחוונים (רובריקות)
     ============================================================ */
  const RUB=()=>H().LS.get("tools.rubrics",[]);
  const SC=()=>H().LS.get("tools.scores",{});
  const LEVELS=[["4","מצוין"],["3","טוב"],["2","בסיסי"],["1","טעון שיפור"]];
  const PRESETS=[
    {name:"משחק כדור — מיומנות והתנהגות",
     crit:["מסירה וקליטה בתנועה","מיקום ותנועה בלי כדור","שיתוף פעולה והכלה","הוגנות וכיבוד חוקים"]},
    {name:"כושר גופני — מאמץ והתמדה",
     crit:["מאמץ עקבי לאורך השיעור","ביצוע טכני נכון","התמדה מול קושי","עבודה בטוחה ומודעת"]},
    {name:"התעמלות — שליטה בגוף",
     crit:["שליטה ובקרה בתנועה","רצף וזרימה","עזרה ובטיחות לחבר","נכונות לנסות"]},
    {name:"מנהיגות והובלה",
     crit:["הסבר ברור של משימה","הכלת כל חברי הקבוצה","קבלת אחריות","משוב מכבד"]}
  ];
  let curRub=null, rubCls="";
  function renderRub(){
    const {$, $$, esc}=H();
    const list=RUB();
    $("#tl-rubSel").innerHTML='<option value="">— בחר מחוון —</option>'+
      list.map(r=>`<option value="${r.id}" ${curRub===r.id?"selected":""}>${esc(r.name)}</option>`).join("");
    const r=list.find(x=>x.id===curRub);
    if(!r){ $("#tl-rubBody").innerHTML='<div class="hint">בחר מחוון קיים או צור חדש מתבנית.</div>'; return; }
    const l=students().filter(s=>!rubCls||s.cls===rubCls);
    const sc=SC();
    $("#tl-rubBody").innerHTML=`
      <div class="hint" style="margin-bottom:10px">${r.crit.length} קריטריונים · סולם 1–4 · הציון הוא ממוצע הקריטריונים.</div>
      ${l.length?l.map(s=>{
        const key=r.id+"|"+s.id, mine=sc[key]||{};
        const vals=r.crit.map((_,i)=>mine[i]).filter(v=>v);
        const avg=vals.length?(vals.reduce((a,b)=>a+ +b,0)/vals.length):null;
        return `<div class="tl-rubrow">
          <div class="hd"><b>${esc(s.name)}</b>
            <span class="avg ${avg?"":"none"}">${avg?avg.toFixed(1):"—"}</span></div>
          ${r.crit.map((c,i)=>`<div class="crit"><span>${esc(c)}</span>
            <div class="lv">${LEVELS.map(([v,nm])=>
              `<button data-sc="${key}|${i}|${v}" class="${mine[i]===v?"on":""}" title="${nm}">${v}</button>`).join("")}</div></div>`).join("")}
        </div>`;
      }).join(""):'<div class="empty-state"><div class="big">📋</div>אין תלמידים בכיתה הזו.</div>'}`;
    $$("#tl-rubBody [data-sc]").forEach(b=>b.addEventListener("click",()=>{
      /* המפתח הוא rubricId|studentId|criterionIndex|value */
      const parts=b.dataset.sc.split("|");
      const k=parts[0]+"|"+parts[1], idx=parts[2], val=parts[3];
      const s=SC(); s[k]=s[k]||{};
      if(s[k][idx]===val)delete s[k][idx]; else s[k][idx]=val;
      H().LS.set("tools.scores",s); renderRub();
    }));
  }
  function newRubric(presetIdx){
    const {toast}=H();
    const p=PRESETS[presetIdx];
    const name=prompt("שם המחוון:",p?p.name:"מחוון חדש");
    if(!name)return;
    let crit=p?p.crit.slice():[];
    if(!p){
      const txt=prompt("קריטריונים, אחד בכל שורה:","מיומנות\nמאמץ\nשיתוף פעולה\nבטיחות");
      if(!txt)return;
      crit=txt.split("\n").map(x=>x.trim()).filter(Boolean);
    }
    if(!crit.length){toast("צריך לפחות קריטריון אחד");return;}
    const list=RUB(), id="rb"+Date.now().toString(36);
    list.push({id,name:name.trim(),crit});
    H().LS.set("tools.rubrics",list); curRub=id; renderRub(); toast("המחוון נוצר");
  }
  function rubCsv(){
    const r=RUB().find(x=>x.id===curRub); if(!r){H().toast("בחר מחוון");return;}
    const l=students().filter(s=>!rubCls||s.cls===rubCls), sc=SC();
    const rows=[["שם","כיתה",...r.crit,"ממוצע"]];
    l.forEach(s=>{
      const mine=sc[r.id+"|"+s.id]||{};
      const vals=r.crit.map((_,i)=>mine[i]||"");
      const nums=vals.filter(v=>v).map(Number);
      rows.push([s.name,s.cls||"",...vals,nums.length?(nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(2):""]);
    });
    H().dlCSV("rubric_"+r.name+".csv",rows);
  }

  /* ============================================================
     אתחול
     ============================================================ */
  function fillClassSelects(){
    const {$}=H(); const cs=classesOf(students());
    const opts=v=>'<option value="">כל הכיתות</option>'+cs.map(c=>`<option ${c===v?"selected":""}>${c}</option>`).join("");
    $("#tl-teamCls").innerHTML=opts(teamCls);
    $("#tl-pickCls").innerHTML=opts(pickCls);
    $("#tl-attCls").innerHTML=opts(attCls);
    $("#tl-rubCls").innerHTML=opts(rubCls);
  }
  function init(){
    const {$, $$}=H();
    if(inited){ fillClassSelects(); renderAtt(); renderRub(); renderPicked(); return; }
    inited=true;
    $$("#tl-tabs [data-tt]").forEach(b=>b.addEventListener("click",()=>{
      tab=b.dataset.tt;
      $$("#tl-tabs [data-tt]").forEach(x=>x.classList.toggle("on",x===b));
      ["teams","pick","att","rub"].forEach(t=>$("#tl-sub-"+t).style.display=t===tab?"":"none");
    }));
    /* קבוצות */
    $("#tl-teamCls").addEventListener("change",e=>{teamCls=e.target.value;});
    $("#tl-teamN").addEventListener("input",e=>{teamN=+e.target.value||4;$("#tl-teamNVal").textContent=teamN;});
    $("#tl-teamMode").addEventListener("change",e=>{teamMode=e.target.value;});
    $("#tl-teamGo").addEventListener("click",makeTeams);
    $("#tl-teamAgain").addEventListener("click",makeTeams);
    $("#tl-teamPrint").addEventListener("click",printTeams);
    /* הגרלה */
    $("#tl-pickCls").addEventListener("change",e=>{pickCls=e.target.value;picked=[];renderPicked();});
    $("#tl-pickGo").addEventListener("click",drawStudent);
    $("#tl-pickReset").addEventListener("click",()=>{picked=[];renderPicked();H().toast("הסבב אופס");});
    /* נוכחות */
    $("#tl-attDate").value=attDate;
    $("#tl-attDate").addEventListener("change",e=>{attDate=e.target.value||today();renderAtt();});
    $("#tl-attCls").addEventListener("change",e=>{attCls=e.target.value;renderAtt();});
    $("#tl-attAll").addEventListener("click",()=>{
      const l=students().filter(s=>!attCls||s.cls===attCls);
      const a=ATT(), key=attKey(attDate,attCls); a[key]=a[key]||{};
      l.forEach(s=>{ if(!a[key][s.id])a[key][s.id]="p"; });
      H().LS.set("tools.att",a); renderAtt(); H().toast("כל מי שלא סומן — השתתפות מלאה");
    });
    $("#tl-attCsv").addEventListener("click",attSummary);
    /* מחוונים */
    $("#tl-rubSel").addEventListener("change",e=>{curRub=e.target.value;renderRub();});
    $("#tl-rubCls").addEventListener("change",e=>{rubCls=e.target.value;renderRub();});
    $("#tl-rubCsv").addEventListener("click",rubCsv);
    $("#tl-rubNew").addEventListener("click",()=>{
      const opts=PRESETS.map((p,i)=>`${i+1}. ${p.name}`).join("\n");
      const c=prompt("בחר תבנית (מספר), או 0 למחוון ריק:\n\n"+opts,"1");
      if(c===null)return;
      newRubric(+c>0?+c-1:null);
    });
    $("#tl-rubDel").addEventListener("click",()=>{
      if(!curRub)return;
      if(!confirm("למחוק את המחוון והציונים שלו?"))return;
      H().LS.set("tools.rubrics",RUB().filter(r=>r.id!==curRub));
      const s=SC(); Object.keys(s).forEach(k=>{ if(k.startsWith(curRub+"|"))delete s[k]; });
      H().LS.set("tools.scores",s); curRub=null; renderRub(); H().toast("נמחק");
    });
    fillClassSelects(); renderAtt(); renderRub(); renderPicked();
  }
  return {init};
})();
})();
