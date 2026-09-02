"use strict";
/* ============================================================
   מערכת השעות — הועתקה מצילום המערכת במשו"ב.
   ניתן לערוך הכול מתוך «הגדרות ← מערכת שעות» (נשמר במכשיר).
   ============================================================ */

/* צלצולים — הועתק מלוח הצלצולים התלוי בחדר המורים. */
window.AP_BELLS = [
  {h:1,  s:"08:10", e:"08:55"},
  {h:2,  s:"09:00", e:"09:45"},
  {h:3,  s:"09:45", e:"10:30"},
  {h:4,  s:"10:50", e:"11:35"},
  {h:5,  s:"11:40", e:"12:25"},
  {h:6,  s:"12:35", e:"13:20"},
  {h:7,  s:"13:25", e:"14:10"},
  {h:8,  s:"14:15", e:"15:00"},
  {h:9,  s:"15:10", e:"15:55"},
  {h:10, s:"16:00", e:"16:45"}
];
window.AP_BELLS_VERIFY = false; /* לוח אמיתי, לא ברירת מחדל */

/* ההפסקות — לתצוגה בלבד, לא משבצות הוראה */
window.AP_BREAKS = [
  {after:1, s:"08:55", e:"09:00", name:"הפסקה"},
  {after:3, s:"10:30", e:"10:50", name:"הפסקה גדולה"},
  {after:4, s:"11:35", e:"11:40", name:"הפסקה"},
  {after:5, s:"12:25", e:"12:35", name:"הפסקה"},
  {after:6, s:"13:20", e:"13:25", name:"הפסקה"},
  {after:7, s:"14:10", e:"14:15", name:"הפסקה"},
  {after:8, s:"15:00", e:"15:10", name:"הפסקה"},
  {after:9, s:"15:55", e:"16:00", name:"הפסקה"}
];

/* קבוצות ההוראה.
   track = מסלול תוכנית הלימודים (ראו ap-curriculum.js)
   freq  = כמה שיעורים בשבוע (מחושב אוטומטית, כאן לתיעוד) */
window.AP_GROUPS = {
  "peA": {label:'חנ"ג ז-1, ז-3',        subject:"pe",     track:"g7",      grade:"ז",  color:"#db2777"},
  "peB": {label:'חנ"ג ז-5',             subject:"pe",     track:"g7",      grade:"ז",  color:"#e11d48"},
  "peC": {label:'חנ"ג ז-9, ז-10 תקשורת',subject:"pe",     track:"g7comm",  grade:"ז",  color:"#7c3aed"},
  "peD": {label:'חנ"ג ח-3',             subject:"pe",     track:"g8",      grade:"ח",  color:"#b45309"},
  "peE": {label:'חנ"ג ט-1, ט-4',        subject:"pe",     track:"g9",      grade:"ט",  color:"#ea580c"},
  "peF": {label:'חנ"ג ט-2',             subject:"pe",     track:"g9",      grade:"ט",  color:"#c2410c"},
  "peG": {label:'חנ"ג יא-6 (+ע"ח)',     subject:"pe",     track:"g11",     grade:"יא", color:"#0369a1"},
  "peH": {label:'חנ"ג יא-7',            subject:"pe",     track:"g11",     grade:"יא", color:"#0e7490"},
  "peI": {label:'חנ"ג יב-1, יב-2',      subject:"pe",     track:"g12",     grade:"יב", color:"#047857"},
  "peJ": {label:'חנ"ג יב-3 (ע"ח)',      subject:"pe",     track:"g12",     grade:"יב", color:"#15803d"},
  "hlA": {label:"חינוך לבריאות ז-7",     subject:"health", track:"health",  grade:"ז",  color:"#4d7c0f", room:"122"},
  "hlB": {label:"חינוך לבריאות ז-6",     subject:"health", track:"health",  grade:"ז",  color:"#65a30d", room:"123"},
  "hvA": {label:"חברה ז-5",             subject:"hevra",  track:"hevra",   grade:"ז",  color:"#4f46e5", room:"124"}
};

/* משבצות שאינן הוראה — מוצגות במערכת אבל לא נכנסות לתוכנית השנתית */
window.AP_NONTEACH = {
  "pratani":  {label:"פרטני אופק (פ)",   color:"#64748b"},
  "pratani2": {label:"פרטני עוז (פ) יא-4", color:"#64748b", note:"רון רומים"},
  "shehiya":  {label:"שהייה",            color:"#475569"},
  "homer":    {label:"הכנת חומרים",      color:"#475569"},
  "computer": {label:"מחשב-גשרים ח-5",   color:"#475569", note:"רב תכליתי 2"},
  "mehanchim":{label:"ישיבת מחנכים (ש)", color:"#475569", note:"שכבת ז׳"},
  "tzevet":   {label:"ישיבת צוות",       color:"#475569"},
  "hishtalmut":{label:"השתלמות",         color:"#475569"}
};

/* המערכת עצמה: יום (0=ראשון) → שעה → מזהה קבוצה/משבצת.
   הועתק אחד לאחד מצילום המסך. */
window.AP_TIMETABLE = {
  0: { /* יום א׳ */
    1:"peD", 2:"peE", 3:"peA", 4:"peC", 5:"peF",
    6:"shehiya", 7:"peB", 8:"homer"
  },
  1: { /* יום ב׳ */
    1:"peG", 2:"peH", 3:"homer", 4:"shehiya", 5:"peC",
    6:"peB", 7:"hvA"
  },
  2: { /* יום ג׳ */
    1:"pratani", 2:"shehiya", 3:"shehiya", 4:"computer", 5:"computer",
    6:"peI", 7:"mehanchim", 8:"mehanchim", 9:"peG"
  },
  3: { /* יום ד׳ */
    1:"peE", 2:"hlA", 3:"peI", 4:"peF", 5:"pratani2",
    6:"peD", 7:"peA", 8:"tzevet"
  },
  4: { /* יום ה׳ */
    1:"peH", 2:"pratani", 3:"hvA", 4:"peJ", 5:"hlB",
    6:"pratani", 7:"hishtalmut"
  }
};

window.AP_DAYNAMES = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
window.AP_DAYSHORT = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
