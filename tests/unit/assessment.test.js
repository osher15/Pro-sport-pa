"use strict";
/* שכבת ההערכה.
   מדידה גולמית אינה ציון, וציון אינו מדידה. הקובץ הזה מוודא
   שהגבול ביניהן ברור, ושחוסר נתון לא הופך בשקט לציון נמוך. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

const TABLE={r60:{boys:{"ט":[[9.4,60],[8.0,100]]}},
             push:{boys:{"ט":[[10,60],[30,100]]}}};
const peers=n=>Array.from({length:n},(_,i)=>
  ({test:"push",gradeKey:"ט",sex:"boys",val:10+i}));
const base=o=>Object.assign(
  {mode:"norm",table:TABLE,rows:[],testId:"push",sex:"boys",grade:"ט",dir:"high"},o);

/* ============ הערכה תקינה ============ */

test("הערכה לפי טבלה מחזירה ציון, מקור וגרסה",()=>{
  const a=D.assess(base({val:20}));
  assert.equal(a.v,80);
  assert.equal(a.src,"norm");
  assert.equal(a.reason,null);
  assert.equal(a.scoringVersion,D.ASSESS_VERSION);
});

test("נפילה לאחוזון כשאין טבלה",()=>{
  const a=D.assess(base({table:{},rows:peers(5),val:12}));
  assert.equal(a.src,"rel");
  assert.ok(a.v!=null);
  assert.equal(a.reason,null);
});

test("ההערכה אינה משנה את המדידה",()=>{
  const row={test:"push",val:20,unit:"חזרות",d:"2026-09-01"};
  const snap=JSON.stringify(row);
  D.assess(base({val:row.val}));
  assert.equal(JSON.stringify(row),snap,"המדידה הגולמית נשארת בדיוק כפי שהיא");
});

/* ============ נתון חסר — הלב של השלב ============ */

test("מדידה חסרה אינה אפס ואינה הציון הנמוך ביותר",()=>{
  [null,undefined].forEach(v=>{
    const a=D.assess(base({val:v}));
    assert.equal(a.v,null,"val="+String(v));
    assert.equal(a.reason,D.ASSESS_REASON.NONE,"«לא נמדד», לא «נכשל»");
  });
});

test("זה בדיוק הפער שתועד בשלב 3",()=>{
  /* scoreFromPoints עצמו עדיין מחזיר 60 עבור null — התנהגות קיימת
     שלא שונתה. assess חוסם את זה לפני שהוא מגיע לשם. */
  assert.equal(D.scoreFromPoints([[10,60],[30,100]],null),60,
    "ההתנהגות הישנה, כפי שתועדה");
  assert.equal(D.assess(base({val:null})).v,null,
    "והשכבה החדשה לא מגיעה אליה");
});

test("ערך לא תקין מסווג בנפרד מערך חסר",()=>{
  [NaN,-1,"20",{},Infinity].forEach(v=>{
    const a=D.assess(base({val:v}));
    assert.equal(a.v,null,"val="+String(v));
    assert.equal(a.reason,D.ASSESS_REASON.INVALID,
      "«מדידה פגומה» אינה «לא נמדד» — שתי בעיות שונות");
  });
});

test("אפס הוא מדידה, לא היעדר מדידה",()=>{
  const a=D.assess(base({val:0}));
  assert.notEqual(a.reason,D.ASSESS_REASON.NONE);
  assert.notEqual(a.reason,D.ASSESS_REASON.INVALID);
});

test("מבחן לא מוכר מסווג בנפרד",()=>{
  const a=D.assess(base({testId:null,val:20}));
  assert.equal(a.reason,D.ASSESS_REASON.UNKNOWN_TEST);
  assert.equal(a.v,null);
});

test("אין טבלה ואין מספיק עמיתים — הסיבה אומרת מה חסר",()=>{
  const noNorm=D.assess(base({table:{},rows:peers(2),val:12}));
  assert.equal(noNorm.v,null);
  assert.equal(noNorm.reason,D.ASSESS_REASON.NO_NORM,
    "במצב «נורמה» הבעיה הראשונה היא הטבלה החסרה");

  const fewPeers=D.assess(base({mode:"rel",rows:peers(2),val:12}));
  assert.equal(fewPeers.v,null);
  assert.equal(fewPeers.reason,D.ASSESS_REASON.FEW_PEERS,
    "במצב יחסי — אין מספיק תוצאות בשכבה");
});

test("נורמה חסרה למין או לשכבה מדווחת כחוסר נורמה",()=>{
  assert.equal(D.assess(base({sex:"girls",val:20})).reason,D.ASSESS_REASON.NO_NORM);
  assert.equal(D.assess(base({grade:"י",val:20})).reason,D.ASSESS_REASON.NO_NORM);
  assert.equal(D.assess(base({sex:null,val:20})).reason,D.ASSESS_REASON.NO_NORM);
});

test("קריאה ריקה לגמרי אינה זורקת",()=>{
  const a=D.assess();
  assert.equal(a.v,null);
  assert.equal(a.reason,D.ASSESS_REASON.UNKNOWN_TEST);
});

/* ============ תקרת מבחן חלופי ============ */

test("תקרה חוסמת את הציון ומסומנת",()=>{
  const a=D.assess(base({val:30,cap:80}));
  assert.equal(a.v,80);
  assert.equal(a.capped,true);
  assert.equal(D.assess(base({val:30})).capped,false);
});

/* ============ גרסאות ============ */

test("ההערכה נושאת את גרסת הכללים שבהם חושבה",()=>{
  const a=D.assess(base({val:20,normVersion:"תשפ״ו"}));
  assert.equal(a.normVersion,"תשפ״ו");
  assert.equal(a.scoringVersion,D.ASSESS_VERSION);
});

test("מדידה שנלקחה בגרסת כללים אחרת מסומנת stale",()=>{
  const a=D.assess(base({val:20,normVersion:"תשפ״ז",measuredNormVersion:"תשפ״ו"}));
  assert.equal(a.stale,true,
    "הציון חושב בכללים של היום, לא באלה שהיו בתוקף כשנמדד");
  assert.ok(a.v!=null,"והציון עדיין מוחזר — רק מסומן");
});

test("אותה גרסה — אין סימון",()=>{
  assert.equal(D.assess(base({val:20,normVersion:"תשפ״ו",measuredNormVersion:"תשפ״ו"})).stale,false);
});

test("בלי חותמת גרסה אין טענה על יציבות",()=>{
  assert.equal(D.assess(base({val:20,normVersion:"תשפ״ו"})).stale,false,
    "מדידה ישנה בלי חותמת — לא מסמנים, כי אין ידיעה");
  assert.equal(D.assess(base({val:20,measuredNormVersion:"תשפ״ו"})).stale,false,
    "וגם כשאין טבלה נוכחית");
});

test("החלפת טבלת נורמה אינה משנה את המדידה הגולמית",()=>{
  const row={test:"push",val:20,d:"2026-09-01",normVer:"תשפ״ו"};
  const before=D.assess(base({val:row.val,normVersion:"תשפ״ו",measuredNormVersion:row.normVer}));
  const after =D.assess(base({table:{push:{boys:{"ט":[[10,40],[30,70]]}}},
    val:row.val,normVersion:"תשפ״ז",measuredNormVersion:row.normVer}));
  assert.equal(row.val,20,"המדידה לא זזה");
  assert.notEqual(before.v,after.v,"הציון כן — כי הכללים השתנו");
  assert.equal(before.stale,false);
  assert.equal(after.stale,true,"וזה מסומן במפורש במקום לקרות בשקט");
});
