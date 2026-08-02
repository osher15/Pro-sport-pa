/**
 * המגרש PRO — שרת סנכרון שיאים משותף בין כמה מורים.
 *
 * מה זה: פרויקט Google Apps Script קטן, מחובר לגיליון Google Sheets ייעודי,
 * שמשמש כ"מסד נתונים" משותף לטבלת השיאים המאושרים (שם, ענף, תוצאה, סטטוס).
 * סרטונים לא עוברים דרך כאן בכלל — הם נשארים במכשיר או בדרייב כרגיל.
 *
 * הקמה: ראו README.md בפרויקט הראשי, סעיף "סנכרון שיאים בין כמה מורים".
 * בקצרה: Extensions → Apps Script בגיליון חדש, להדביק את הקובץ הזה,
 * להגדיר Script Property בשם SYNC_CODE עם קוד סודי לבית הספר,
 * ואז Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 */

const SHEET_NAME = "records";
const HEADER = ["id","sport","name","cls","value","status","src","ts","mts","hasVideo","deleted"];
const SYNC_CODE_PROP = "SYNC_CODE";

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADER);
  }
  return sh;
}

function checkCode_(code) {
  const want = PropertiesService.getScriptProperties().getProperty(SYNC_CODE_PROP) || "";
  return !!want && code === want;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* קריאה: מחזיר את כל השורות (כולל "deleted:true" — המכשירים מסננים בעצמם). */
function doGet(e) {
  const code = (e && e.parameter && e.parameter.code) || "";
  if (!checkCode_(code)) return jsonOut_({ error: "unauthorized" });
  const sh = getSheet_();
  const rows = sh.getDataRange().getValues();
  const header = rows.shift();
  const out = rows.map(r => {
    const o = {};
    header.forEach((h, i) => { o[h] = r[i]; });
    o.deleted = !!o.deleted;
    o.hasVideo = !!o.hasVideo;
    return o;
  });
  return jsonOut_(out);
}

/* כתיבה: upsert רשומה אחת, או מחיקה רכה (deleted:true) לפי id.
   שולחים Content-Type: text/plain כדי להימנע מ-CORS preflight — הגוף עדיין JSON. */
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return jsonOut_({ error: "bad json" }); }
  if (!checkCode_(body.code)) return jsonOut_({ error: "unauthorized" });
  const sh = getSheet_();
  if (body.action === "upsert" && body.record && body.record.id) {
    upsertRow_(sh, body.record);
  } else if (body.action === "delete" && body.id) {
    upsertRow_(sh, { id: body.id, deleted: true, mts: body.mts || Date.now() });
  } else {
    return jsonOut_({ error: "bad action" });
  }
  return jsonOut_({ ok: true });
}

function upsertRow_(sh, rec) {
  const data = sh.getDataRange().getValues();
  const header = data[0];
  const idCol = header.indexOf("id");
  let rowIdx = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === rec.id) { rowIdx = i + 1; break; }
  }
  const existing = {};
  if (rowIdx > 0) header.forEach((h, i) => { existing[h] = data[rowIdx - 1][i]; });

  /* אם כבר קיימת גרסה חדשה יותר (mts גבוה יותר) — לא דורסים אותה בעדכון שהגיע באיחור. */
  if (existing.mts && rec.mts && Number(rec.mts) < Number(existing.mts)) return;

  const merged = Object.assign(
    { sport: "", name: "", cls: "", value: "", status: "", src: "", ts: "", mts: Date.now(), hasVideo: false, deleted: false },
    existing, rec
  );
  const row = header.map(h => (merged[h] === undefined ? "" : merged[h]));
  if (rowIdx > 0) sh.getRange(rowIdx, 1, 1, header.length).setValues([row]);
  else sh.appendRow(row);
}
