"use strict";
/* ניקוד, נורמות ומדדי בריאות.
   זאת הלוגיקה שקובעת מה מורה אומר לתלמיד, והיא הייתה עד עכשיו
   ללא בדיקה אחת. ציון שגוי לא נראה שגוי — הוא נראה כמו ציון.

   הבדיקות כאן מתעדות את ההתנהגות הקיימת, לא מגדירות חדשה. היכן
   שההתנהגות נראית מפתיעה אבל אין כלל מוצר שקובע אחרת — זה מסומן
   בתגובה ולא «תוקן». */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const D=require("../../hm-data.js");

/* ============ אינטרפולציה בטבלת הנורמה ============ */

const PTS=[[20,60],[24,68],[26,72],[28,76],[30,80]];   /* סולם הגקסונים */

test("נקודה מדויקת בטבלה מחזירה בדיוק את הציון שלה",()=>{
  PTS.forEach(([v,sc])=>assert.equal(D.scoreFromPoints(PTS,v),sc,v+" חזרות"));
});

test("ערך בין שתי נקודות מקבל אינטרפולציה ליניארית",()=>{
  assert.equal(D.scoreFromPoints(PTS,22),64,"אמצע בין 20→60 ל-24→68");
  assert.equal(D.scoreFromPoints(PTS,25),70);
  assert.equal(D.scoreFromPoints(PTS,29),78);
});

test("מתחת לנקודה הנמוכה ביותר — הציון הנמוך ביותר, בלי אקסטרפולציה",()=>{
  assert.equal(D.scoreFromPoints(PTS,0),60);
  assert.equal(D.scoreFromPoints(PTS,19),60);
  assert.equal(D.scoreFromPoints(PTS,1),60,
    "שים לב: חזרה אחת מקבלת 60 כמו 20 חזרות — הטבלה לא מגדירה מתחת ל-20");
});

test("מעל הנקודה הגבוהה ביותר — הציון הגבוה ביותר",()=>{
  assert.equal(D.scoreFromPoints(PTS,30),80);
  assert.equal(D.scoreFromPoints(PTS,100),80,"תקרת הטבלה, לא 100");
});

test("סולם יורד (זמני ריצה) — הנקודות ממוינות לבד",()=>{
  const run=[[9.4,70],[8.6,85],[8.0,95]];
  assert.equal(D.scoreFromPoints(run,8.6),85);
  assert.equal(D.scoreFromPoints(run,8.3),90,"אמצע בין 8.0 ל-8.6");
  assert.equal(D.scoreFromPoints(run,7.0),95,"מהר יותר מהתקרה");
  assert.equal(D.scoreFromPoints(run,12),70,"איטי יותר מהרצפה");
});

test("ערכים עשרוניים",()=>{
  assert.equal(D.scoreFromPoints([[10,0],[20,100]],15),50);
  assert.equal(D.scoreFromPoints([[10,0],[20,100]],10.5),5);
  assert.equal(D.scoreFromPoints([[0,0],[3,100]],1),33.3,"מעוגל לעשירית");
});

test("שתי נקודות באותו ערך — מוחזרת הראשונה",()=>{
  assert.equal(D.scoreFromPoints([[10,40],[10,90]],10),40,
    "התנהגות קיימת: הערך נופל על «מתחת או שווה לנקודה הנמוכה» ולכן " +
    "מוחזרת הראשונה. אין כלל מוצר שקובע אחרת, ולכן לא שונה.");
});

test("קלט לא תקין מחזיר null ולא זורק",()=>{
  [null,undefined,[],[[1,2]],"לא מערך",{}].forEach(p=>
    assert.equal(D.scoreFromPoints(p,10),null,"pts="+JSON.stringify(p)));
});

test("ערך שלילי, NaN וטקסט מחזירים null",()=>{
  [undefined,-1,NaN,"abc"].forEach(v=>
    assert.equal(D.scoreFromPoints(PTS,v),null,"val="+String(v)));
  assert.equal(D.scoreFromPoints([[0,20],[10,90]],0),20,"אפס הוא ערך חוקי");
});

/* ⚠ ממצא — החלטת מוצר פתוחה.
   השומר הוא `!(val>=0)`, כלומר נכתב במפורש כדי לדחות ערך חסר.
   הוא אכן דוחה undefined ו-NaN — אבל null עובר, כי null>=0 הוא
   true ב-JavaScript. התוצאה: מדידה חסרה מקבלת את הציון הנמוך
   ביותר בטבלה במקום «אין ציון».

   לא ניתן להגיע לזה היום: saveVal שומר רק ערכים חיוביים. לא שיניתי
   את ההתנהגות, כי אין כלל מוצר כתוב שקובע מה נכון — ראו
   docs/PHASE_3_REPORT.md §4. */
test("null עובר את השומר ומקבל את הציון הנמוך ביותר",()=>{
  assert.equal(D.scoreFromPoints(PTS,null),60,
    "התנהגות קיימת, לא רצויה, לא ניתנת להגעה מהממשק — ומתועדת");
  assert.equal(D.scoreFromPoints(PTS,undefined),null,
    "לעומת זאת undefined כן נדחה — שתי דרכים לומר «חסר», שתי תוצאות");
});

/* ============ clamp100 ============ */

test("הציון נחתך ל-0..100 ומעוגל לעשירית",()=>{
  assert.equal(D.clamp100(-5),0);
  assert.equal(D.clamp100(140),100);
  assert.equal(D.clamp100(72.44),72.4);
  assert.equal(D.clamp100(72.45),72.5);
  assert.equal(D.clamp100(0),0);
  assert.equal(D.clamp100(100),100);
});

test("טבלה שמגדירה ציון מעל 100 נחתכת",()=>{
  assert.equal(D.scoreFromPoints([[10,50],[20,150]],20),100);
});

/* ============ אחוזון ============ */

test("אחוזון בסולם «גבוה יותר טוב יותר»",()=>{
  const v=[10,20,30,40];
  assert.equal(D.percentile(v,40,"high"),87.5,"הטוב ביותר: עקף 3 מתוך 4, וחצי מעצמו");
  assert.equal(D.percentile(v,10,"high"),12.5,"החלש ביותר");
  assert.equal(D.percentile(v,25,"high"),50,"באמצע");
});

test("אחוזון בסולם «נמוך יותר טוב יותר»",()=>{
  const v=[9,10,11,12];
  assert.equal(D.percentile(v,9,"low"),87.5,"הזמן המהיר ביותר הוא הטוב ביותר");
  assert.equal(D.percentile(v,12,"low"),12.5);
});

test("תוצאות זהות מתחלקות בין שתיהן",()=>{
  assert.equal(D.percentile([20,20],20,"high"),50,"שניהם באותו מקום, לא 100 ולא 0");
  assert.equal(D.percentile([20],20,"high"),50,"תלמיד יחיד מול עצמו");
});

test("קבוצה ריקה מחזירה null",()=>{
  assert.equal(D.percentile([],10,"high"),null);
});

/* ============ ניקוד לפי נורמה ============ */

const TABLE={push:{boys:{"ט":[[10,60],[30,100]]}}};

test("נורמה קיימת מחזירה ציון",()=>{
  assert.equal(D.normScore(TABLE,"push","boys","ט",20),80);
});

test("נורמה חסרה מחזירה null בכל אחד מהצירים",()=>{
  assert.equal(D.normScore(TABLE,"situp","boys","ט",20),null,"מבחן שאין לו טבלה");
  assert.equal(D.normScore(TABLE,"push","girls","ט",20),null,"מין שאין לו טבלה");
  assert.equal(D.normScore(TABLE,"push","boys","י",20),null,"שכבה שאין לה טבלה");
  assert.equal(D.normScore(TABLE,"push",null,"ט",20),null,"מין לא ידוע");
  assert.equal(D.normScore(null,"push","boys","ט",20),null,"אין טבלה בכלל");
});

test("טבלת הבנות ריקה במכוון ולכן לא מנקדת",()=>{
  assert.equal(D.normScore({push:{boys:{"ט":[[10,60],[30,100]]},girls:{}}},"push","girls","ט",20),null,
    "נורמות בנות הן טבלה אחרת לגמרי — ריק עדיף על העתקה מהבנים");
});

/* ============ ניקוד יחסי ============ */

const peers=(n,val)=>Array.from({length:n},(_,i)=>
  ({test:"push",gradeKey:"ט",sex:"boys",val:val==null?10+i:val}));

test("מתחת לשלוש תוצאות בשכבה אין אחוזון",()=>{
  assert.equal(D.relScore(peers(2),"push","boys","ט",15,"high"),null);
  assert.equal(D.relScore([],"push","boys","ט",15,"high"),null);
  assert.ok(D.relScore(peers(3),"push","boys","ט",15,"high")!=null,"משלוש ומעלה כן");
  assert.equal(D.REL_MIN,3);
});

test("האחוזון מחושב מול אותה שכבה ואותו מין בלבד",()=>{
  const rows=[
    {test:"push",gradeKey:"ט",sex:"boys",val:10},
    {test:"push",gradeKey:"ט",sex:"boys",val:20},
    {test:"push",gradeKey:"ט",sex:"boys",val:30},
    {test:"push",gradeKey:"י",sex:"boys",val:99},   /* שכבה אחרת */
    {test:"situp",gradeKey:"ט",sex:"boys",val:99},  /* מבחן אחר */
    {test:"push",gradeKey:"ט",sex:"girls",val:99}   /* מין אחר */
  ];
  assert.equal(D.relScore(rows,"push","boys","ט",30,"high"),83.3,"רק שלושת הרלוונטיים");
});

test("תוצאה בלי מין נכללת בכל השוואה",()=>{
  const rows=[
    {test:"push",gradeKey:"ט",val:10},
    {test:"push",gradeKey:"ט",val:20},
    {test:"push",gradeKey:"ט",sex:"boys",val:30}];
  assert.ok(D.relScore(rows,"push","boys","ט",30,"high")!=null,
    "מדידה ישנה בלי מין עדיין נספרת — אחרת ההיסטוריה נעלמת מהשוואה");
});

test("שכבה מספרית ושכבה כמחרוזת מתאימות",()=>{
  const rows=[{test:"t",gradeKey:"9",val:1},{test:"t",gradeKey:"9",val:2},{test:"t",gradeKey:"9",val:3}];
  assert.ok(D.relScore(rows,"t",null,9,2,"high")!=null,"grade כמספר");
});

test("ערכים אפסיים ושליליים אינם נספרים",()=>{
  const rows=[{test:"t",gradeKey:"ט",val:0},{test:"t",gradeKey:"ט",val:-5},{test:"t",gradeKey:"ט",val:10}];
  assert.equal(D.relScore(rows,"t",null,"ט",10,"high"),null,"נשארה תוצאה אחת תקפה");
});

/* ============ הציון הסופי ============ */

test("מצב «נורמה» מעדיף את הטבלה",()=>{
  const r=D.scoreOne({mode:"norm",table:TABLE,rows:peers(5),testId:"push",
    sex:"boys",grade:"ט",val:20,dir:"high"});
  assert.equal(r.src,"norm");
  assert.equal(r.v,80);
});

test("מצב «נורמה» בלי טבלה נופל לאחוזון",()=>{
  const r=D.scoreOne({mode:"norm",table:{},rows:peers(5),testId:"push",
    sex:"boys",grade:"ט",val:12,dir:"high"});
  assert.equal(r.src,"rel","נפילה חזרה, לא null");
});

test("בלי טבלה ובלי מספיק עמיתים — אין ציון",()=>{
  const r=D.scoreOne({mode:"norm",table:{},rows:peers(2),testId:"push",
    sex:"boys",grade:"ט",val:12,dir:"high"});
  assert.equal(r.v,null);
  assert.equal(r.src,null);
});

test("מצב «יחסי» מתעלם מהטבלה גם כשהיא קיימת",()=>{
  const r=D.scoreOne({mode:"rel",table:TABLE,rows:peers(5),testId:"push",
    sex:"boys",grade:"ט",val:20,dir:"high"});
  assert.equal(r.src,"rel");
});

test("תקרת מבחן חלופי חוסמת את הציון ומסומנת",()=>{
  const full=D.scoreOne({mode:"norm",table:TABLE,rows:[],testId:"push",
    sex:"boys",grade:"ט",val:30,dir:"high"});
  assert.equal(full.v,100);
  assert.equal(full.capped,false);

  const capped=D.scoreOne({mode:"norm",table:TABLE,rows:[],testId:"push",
    sex:"boys",grade:"ט",val:30,dir:"high",cap:80});
  assert.equal(capped.v,80,"התקרה גוברת על הטבלה");
  assert.equal(capped.capped,true,"והמורה רואה שזה מבחן חלופי");
});

test("קריאה בלי פרמטרים כלל אינה זורקת",()=>{
  const r=D.scoreOne();
  assert.equal(r.v,null);
  assert.equal(r.src,null);
});

/* ============ אות החינוך הגופני ============ */

test("סף התאוריה הוא מדרגות, לא רציף",()=>{
  [[100,5],[85,5],[84,4],[75,4],[74,3],[65,3],[64,0],[0,0]].forEach(([p,sc])=>
    assert.equal(D.otTheory(p),sc,p+"% ⇒ "+sc));
});

test("תאוריה חסרה שווה אפס ולא null",()=>{
  [null,undefined,""].forEach(v=>assert.equal(D.otTheory(v),0,JSON.stringify(v)));
});

test("תאוריה מתחת ל-65 מאבדת את כל חמש הנקודות",()=>{
  assert.equal(D.otTheory(64.9),0,"64.9% ⇒ 0 — אין ניקוד חלקי מתחת לסף");
});

test("חישוב האות: רכיבים, סכום וליבה",()=>{
  const r=D.otScore({aer:[1,1,1,1],cir:[1,1,1,1],theory:80,part:true,club:true,event:2,diary:true});
  assert.deepEqual(r.per,{aer:12,cir:12,theory:4,part:4,club:5,event:2,diary:5});
  assert.equal(r.total,44);
  assert.equal(r.core,24,"ליבה = אירובי + מעגל");
  assert.equal(r.ok,true);
});

test("«אירוע» מוגבל לשלוש נקודות",()=>{
  assert.equal(D.otScore({event:99}).per.event,3);
  assert.equal(D.otScore({event:-5}).per.event,-5,
    "התנהגות קיימת: Math.min בלבד, בלי רצפה. אין מסלול בממשק שמזין ערך שלילי.");
});

test("זכאות דורשת גם סכום וגם ליבה",()=>{
  const nearly=D.otScore({aer:[1,1],cir:[1,1],theory:100,part:true,club:true,event:3,diary:true});
  assert.equal(nearly.core,12,"בדיוק על סף הליבה");
  assert.equal(nearly.ok,nearly.total>=D.OT_PASS,"וזכאי אם הסכום מספיק");

  const lowCore=D.otScore({aer:[1],cir:[1],theory:100,part:true,club:true,event:3,diary:true});
  assert.equal(lowCore.core,6);
  assert.equal(lowCore.ok,false,"מספיק נקודות בסך הכול אבל חסרה ליבה");
});

test("רשומה ריקה נותנת אפס ולא קורסת",()=>{
  const r=D.otScore({});
  assert.equal(r.total,0); assert.equal(r.core,0); assert.equal(r.ok,false);
  assert.equal(D.otScore().total,0);
  assert.equal(D.otScore(null).total,0);
});

test("הקבועים תואמים את חוזר המנכ״ל",()=>{
  assert.equal(D.OT_MAX,40);
  assert.equal(D.OT_PASS,32);
  assert.equal(D.OT_CORE_MIN,12);
});

/* ============ VO2max ואזורי בריאות ============ */

test("נוסחת Léger — ערכי ייחוס",()=>{
  assert.equal(+D.vo2max(8.5,12).toFixed(2),35.24);
  assert.equal(+D.vo2max(11,14).toFixed(2),44.83);
  assert.equal(+D.vo2max(13,17).toFixed(2),51.85);
});

test("מהירות גבוהה יותר נותנת VO2max גבוה יותר",()=>{
  assert.ok(D.vo2max(12,14)>D.vo2max(11,14));
  assert.ok(D.vo2max(11,14)>D.vo2max(10,14));
});

test("באותה מהירות, גיל גבוה יותר נותן VO2max נמוך יותר",()=>{
  assert.ok(D.vo2max(11,17)<D.vo2max(11,12),
    "כך הנוסחה בנויה: הניכוי לפי גיל גובר על המקדם המשולב בטווח הזה");
});

test("אזורי FITNESSGRAM — גבולות מדויקים לבן בן 14",()=>{
  /* [39.6, 42.5] — רצפה ואזור בריא */
  assert.equal(D.healthZone(39.6,14,"boys").g,"סיכון בריאותי","בדיוק על הרצפה — עדיין בסיכון");
  assert.equal(D.healthZone(39.7,14,"boys").g,"טעון שיפור");
  assert.equal(D.healthZone(42.4,14,"boys").g,"טעון שיפור");
  assert.equal(D.healthZone(42.5,14,"boys").g,"אזור בריא","בדיוק על הסף — כבר בריא");
  assert.equal(D.healthZone(48.4,14,"boys").g,"אזור בריא");
  assert.equal(D.healthZone(48.5,14,"boys").g,"מצוין","אזור בריא + 6.0");
});

test("לבנות סף אחר לגמרי",()=>{
  /* בנות בנות 14: [36.3, 39.4] · בנים בני 14: [39.6, 42.5] */
  assert.equal(D.healthZone(39.4,14,"girls").g,"אזור בריא");
  assert.equal(D.healthZone(39.4,14,"boys").g,"סיכון בריאותי","אותו ערך, מסקנה הפוכה לגמרי");
});

test("גיל נחתך לטווח 10..18",()=>{
  assert.equal(D.healthZone(38,7,"boys").g, D.healthZone(38,10,"boys").g,"מתחת ל-10 כמו 10");
  assert.equal(D.healthZone(42,25,"boys").g,D.healthZone(42,18,"boys").g,"מעל 18 כמו 18");
});

test("גיל חסר נחשב 14, ומין חסר נחשב בן",()=>{
  assert.equal(D.healthZone(41,null,"boys").g,D.healthZone(41,14,"boys").g);
  assert.equal(D.healthZone(41,14,null).g,   D.healthZone(41,14,"boys").g);
  assert.equal(D.healthZone(41,14,"").g,     D.healthZone(41,14,"boys").g);
});

test("גיל עשרוני מעוגל",()=>{
  assert.equal(D.healthZone(40,13.6,"boys").g,D.healthZone(40,14,"boys").g);
});

/* ============ BMI ============ */

test("חישוב BMI",()=>{
  assert.equal(+D.bmi(170,70).toFixed(2),24.22);
  assert.equal(+D.bmi(150,45).toFixed(1),20.0);
});

test("מידות חסרות או לא תקינות מחזירות null",()=>{
  [[0,70],[170,0],[null,70],[170,null],[-170,70],[undefined,undefined]].forEach(([h,w])=>
    assert.equal(D.bmi(h,w),null,"h="+h+" w="+w));
});

test("קטגוריות BMI — הגבולות",()=>{
  assert.equal(D.bmiCategory(18.4).g,"תת־משקל");
  assert.equal(D.bmiCategory(18.5).g,"תקין");
  assert.equal(D.bmiCategory(24.9).g,"תקין");
  assert.equal(D.bmiCategory(25).g,"עודף משקל");
  assert.equal(D.bmiCategory(29.9).g,"עודף משקל");
  assert.equal(D.bmiCategory(30).g,"השמנה");
  assert.equal(D.bmiCategory(null),null);
});
