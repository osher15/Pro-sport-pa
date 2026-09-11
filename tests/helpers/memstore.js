"use strict";
/* אחסון מזויף לבדיקות.
   הגיבוי וה-migration עובדים במציאות מול localStorage, אבל
   localStorage אמיתי לא נכשל לפי דרישה ולא מתמלא בפקודה. כאן אפשר
   לביים בדיוק את הכשלים שבגללם נתונים נעלמו בשקט. */

/* backend בסגנון Web Storage */
function memBackend(opts){
  opts=opts||{};
  const map=new Map();
  const limit=opts.limit==null?Infinity:opts.limit;   /* תקציב תווים */
  const fail=opts.fail||null;                         /* (op,k,v) => Error|null */
  const bytes=()=>{ let n=0; map.forEach((v,k)=>{ n+=k.length+v.length; }); return n; };
  return {
    _map:map, _bytes:bytes,
    get length(){ return map.size; },
    key(i){ return [...map.keys()][i]; },
    getItem(k){
      if(fail){ const e=fail("get",k); if(e)throw e; }
      return map.has(k)?map.get(k):null;
    },
    setItem(k,v){
      if(fail){ const e=fail("set",k,v); if(e)throw e; }
      v=String(v);
      const had=map.has(k)?k.length+map.get(k).length:0;
      if(bytes()-had+k.length+v.length>limit){
        const err=new Error("The quota has been exceeded.");
        err.name="QuotaExceededError"; err.code=22;
        throw err;
      }
      map.set(k,v);
    },
    removeItem(k){ map.delete(k); },
    clear(){ map.clear(); }
  };
}

/* store בסגנון ה-migrations: ערכים מפוענחים, תחילית pehub. */
function memStore(seed,backend){
  const b=backend||memBackend();
  const PFX="pehub.";
  const store={
    backend:b,
    get(k,d){
      const raw=b.getItem(PFX+k);
      if(raw==null)return d===undefined?null:d;
      try{ return JSON.parse(raw); }catch(e){ return d===undefined?null:d; }
    },
    set(k,v){ b.setItem(PFX+k,JSON.stringify(v)); },
    del(k){ b.removeItem(PFX+k); },
    keys(){ return [...b._map.keys()].filter(k=>k.indexOf(PFX)===0)
      .map(k=>k.slice(PFX.length)).sort(); }
  };
  if(seed)Object.keys(seed).forEach(k=>store.set(k,seed[k]));
  return store;
}

/* כיתה עם היסטוריה, בסכמה הישנה: לרשומות אין sid. */
function legacyClass(){
  return {
    "ft.roster":{ "ט3":[
      {name:"דן אבירם",sex:"boys"},
      {name:"איתי כהן", sex:"boys"},
      {name:"רון לוי",  sex:"boys"}
    ]},
    "ft.results":[
      {id:"r1",d:"2026-06-04",ts:1,cls:"ט׳3",test:"push",name:"דן אבירם",val:22,unit:"חזרות"},
      {id:"r2",d:"2026-09-02",ts:2,cls:"ט׳3",test:"push",name:"דן אבירם",val:27,unit:"חזרות"},
      {id:"r3",d:"2026-06-04",ts:3,cls:"ט3", test:"push",name:"איתי כהן", val:31,unit:"חזרות"},
      {id:"r4",d:"2026-09-02",ts:4,cls:"ט׳3",test:"r60", name:"רון לוי",  val:9.4,unit:"שנ׳"}
    ]
  };
}

module.exports={memBackend,memStore,legacyClass};
