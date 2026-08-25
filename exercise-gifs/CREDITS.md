# קרדיטים ל-GIFים של ספריית התרגילים

## `video/` — סרטוני הדגמה אמיתיים (הופקו במיוחד לאפליקציה)

הרמה הכי גבוהה בסדר העדיפות. אלה קטעי וידאו פוטוריאליסטיים שהמורה הפיק
בעצמו (Gemini video) במיוחד לאפליקציה הזאת — לא תוכן חיצוני, אין סוגיית
רישיון. אני חותך אותם ללופ נקי (פריים התחלה ≈ פריים סיום), חותך רקע/שוליים
מיותרים, וממיר ל-GIF מאופטם (`ffmpeg` palettegen/paletteuse + `gifsicle
--lossy`) כדי לשמור על גודל קובץ סביר (~150–200KB) בלי לפגוע משמעותית
באיכות בגודל התצוגה באפליקציה (עד 130px).

| קובץ | תרגיל באפליקציה | מקור |
|---|---|---|
| `curl.gif` | כפיפת מרפקים (Bicep Curl) | הופק ע"י המורה (Gemini video), נערך ע"י Claude |
| `latpull.gif` | משיכה עליונה (מוט/גומייה) | הופק ע"י המורה (Gemini video), נערך ע"י Claude. **הערה:** הדור המקורי הוסיף בטעות רצועה/כבל כפול שיורד גם לרצפה (במקום עוגן יחיד מלמעלה); ניסיון למחוק אותו ידנית לא הצליח נקי (אין כלי inpainting) — הפגם נשאר, אך כמעט לא נראה בגודל התצוגה באפליקציה (עד 130px). |
| `pullup.gif` | מתח (עצמי / בעזרת גומייה) | הופק ע"י המורה (Gemini video), נערך ע"י Claude. סרטון נקי, ללא פגמים. |
| `dbpress.gif` | לחיצת כתפיים עם משקולות | הופק ע"י המורה (Gemini video), נערך ע"י Claude. סרטון נקי, ללא פגמים. |

## `rig/` — איורים תלת־מימדיים (המקור שלנו)

כל קובץ ב-`exercise-gifs/rig/*.gif` הוא איור מקורי: דמות "ריג" תלת־מימדית
(Three.js) שנבנתה ונענמדה במיוחד לאפליקציה הזאת מתוך נתוני התנוחות של כל
תרגיל, ונשמרה כ-GIF סטטי. אין בהם שימוש בתוכן חיצוני כלשהו — קניין מלא של
הפרויקט, בדיוק כמו האיור הווקטורי הקודם שהם מחליפים.

## `photo/` — תמונות אמיתיות (Wikimedia Commons, רישיון פתוח)

חמישה תרגילים משתמשים בתמונת/סרטון הדגמה אמיתיים במקום האיור התלת־מימדי,
כי נמצאה עבורם הדגמה מדויקת בקומונס עם רישיון פתוח מתאים. הקבצים המקוריים
עברו שינוי גודל/מספר פריימים בלבד (כדי שיתאימו לגודל התצוגה באפליקציה);
שאר התוכן לא נערך.

| קובץ | תרגיל באפליקציה | מקור | יוצר/ת | רישיון |
|---|---|---|---|---|
| `lunge.gif` | לאנג׳ | [Lunge-CDC_strength_training_for_older_adults.gif](https://commons.wikimedia.org/wiki/File:Lunge-CDC_strength_training_for_older_adults.gif) | Centers for Disease Control and Prevention | נחלת הכלל (Public domain) |
| `pike.gif` | שכיבות פייק | [Pike_Push_Ups.gif](https://commons.wikimedia.org/wiki/File:Pike_Push_Ups.gif) | Danielflefil | CC BY-SA 4.0 |
| `burpee.gif` | ברפי | [Burpees.gif](https://commons.wikimedia.org/wiki/File:Burpees.gif) | Wensceslao | CC BY-SA 4.0 |
| `jack.gif` | ג׳אמפינג ג׳ק | [Jumpingjacks.gif](https://commons.wikimedia.org/wiki/File:Jumpingjacks.gif) | Wensceslao | CC BY-SA 4.0 |
| `knees.gif` | ברכיים גבוהות | [High_knees.gif](https://commons.wikimedia.org/wiki/File:High_knees.gif) | Wensceslao | CC BY-SA 4.0 |

רישיון [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) /
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) — שימוש חופשי
לרבות עריכה והפצה, בתנאי קרדיט ליוצר/ת ושמירה על אותו רישיון ליצירות נגזרות
(הטבלה שלעיל היא הקרדיט הנדרש). קובץ ה-CDC הוא נחלת הכלל וללא חובת קרדיט,
אך מצוין כאן לשקיפות.

**חשוב:** אם מוסיפים או מחליפים תמונה אמיתית נוספת בעתיד — יש להוסיף שורה
לטבלה הזאת עם המקור, היוצר/ת והרישיון, ולוודא שהרישיון מתיר שימוש מסחרי/פומבי
ועריכה (GitHub Pages ציבורי).
