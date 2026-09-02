#!/usr/bin/env node
/* ============================================================
   מייצר את tochnit-shnatit.ics מתוך אותו מנוע שרץ באפליקציה.
   אין כאן לוגיקה משוכפלת — הקובץ טוען את ap-app.js עם שכבת
   דפדפן מינימלית, ומבקש ממנו את הפלט.

   הרצה:  node tochnit-shnatit/build-ics.js
   ============================================================ */
const fs = require("fs");
const path = require("path");
const dir = __dirname;

/* שכבת דפדפן מינימלית — מספיקה כדי שהמנוע ייטען */
global.window = global;
global.addEventListener = ()=>{};
global.document = {
  addEventListener(){}, querySelector(){return null}, querySelectorAll(){return []},
  createElement(){return {style:{},appendChild(){},click(){},remove(){}}},
  body:{appendChild(){}}
};
global.localStorage = {getItem(){return null}, setItem(){}, removeItem(){}};
global.location = {hash:""};
global.setInterval = ()=>0;

for (const f of ["ap-calendar.js","ap-timetable.js","ap-curriculum.js","ap-hevra.js","ap-fitness.js","ap-app.js"])
  require(path.join(dir, f));

window.AP.build();

const out = [
  {file:"tochnit-shnatit.ics",        args:[null,null],                 label:"כל השנה"},
  {file:"tochnit-shnatit-hinuch-gufani.ics", args:[null,"pe"],          label:'חינוך גופני בלבד'},
  {file:"tochnit-shnatit-hevra-briut.ics",   args:[null,["hevra","health"]], label:"חברה וחינוך לבריאות"}
];

for (const o of out){
  const ics = window.AP.buildIcs(o.args[0], o.args[1]);
  fs.writeFileSync(path.join(dir, o.file), ics, "utf8");
  const events = (ics.match(/BEGIN:VEVENT/g)||[]).length;
  const long = ics.split("\r\n").filter(l => Buffer.byteLength(l,"utf8") > 75);
  if (long.length) { console.error(`✗ ${o.file}: ${long.length} שורות חורגות מ-75 בתים`); process.exit(1); }
  console.log(`✓ ${o.file.padEnd(38)} ${String(events).padStart(4)} אירועים · ${o.label}`);
}

const g = window.AP.sched.byGroup;
const total = Object.values(g).reduce((a,l)=>a+l.length,0);
console.log(`\nסך הכול ${total} שיעורים ב-${Object.keys(g).length} קבוצות הוראה.`);
