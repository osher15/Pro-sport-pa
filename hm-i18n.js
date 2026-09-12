"use strict";
/* ============================================================
   מודול 0 — שפות (I18N)
   ------------------------------------------------------------
   האפליקציה נכתבה עברית, והמחרוזות יושבות ישירות בקוד ובמרקאפ.
   כ-5,600 מהן. תרגום מכונה של כולן היה מייצר מינוח מקצועי שגוי
   בחינוך גופני, ולכן הגישה כאן היא הדרגתית ובטוחה:

     · מפתח שאין לו תרגום נופל חזרה לעברית, ולא לטקסט ריק.
     · המעטפת (ניווט, בית, הגדרות, כפתורים, מסך כניסה) מתורגמת
       במלואה — זה מה שמשתמש חדש פוגש.
     · התוכן העמוק (משחקים, מערכי שיעור, מאגר ידע, דגשי מבחנים)
       נשאר עברית עד שיתורגם בידי אדם שמכיר את המינוח.

   אין ספרייה ואין שלב בנייה: הכול בקובץ אחד כדי שהאפליקציה
   תמשיך לעבוד גם כקובץ יחיד מ-file:// ובלי רשת.
   ============================================================ */
window.I18N=(function(){

const LANGS=[
  {code:"he", name:"עברית",   native:"עברית",    dir:"rtl", flag:"🇮🇱"},
  {code:"en", name:"אנגלית",  native:"English",  dir:"ltr", flag:"🇬🇧"},
  {code:"ar", name:"ערבית",   native:"العربية",  dir:"rtl", flag:"🇸🇦"},
  {code:"ru", name:"רוסית",   native:"Русский",  dir:"ltr", flag:"🇷🇺"}
];

/* ---------- מילון המעטפת ----------
   מפתח = נתיב קצר ויציב. עברית היא מקור האמת: מפתח שחסר בשפה
   אחרת נופל אליה אוטומטית. */
const DICT={
he:{},   /* ריק בכוונה — עברית היא ברירת המחדל שבמרקאפ עצמו */

en:{
  /* --- מסך כניסה --- */
  "brand.word":"Hamigresh", "brand.full":"Hamigresh PRO", "about.title":"📘 About Hamigresh PRO",
  /* --- ביפ טסט --- */
  "bt.setup":"Test setup", "bt.dist":"Shuttle length", "bt.speed":"Stage 1 speed (km/h)",
  "bt.std":"↺ Standard (8.0)", "bt.proto":"Standard protocol", "bt.protoOff":"Modified protocol",
  "bt.saveProf":"💾 Save profile", "bt.profDel":"Delete profile", "bt.prof":"— profile —",
  "bt.age":"Class age", "bt.sex":"Sex (for norms)",
  "bt.voice":"Voice announcements", "bt.beeps":"Beeps",
  "bt.warn":"⚠️ The protocol differs from the standard (20 m, start ≥ 8.0 km/h) — VO₂max values are shown as an estimate only.",
  "bt.live":"Test running", "bt.ready":"Ready to start", "bt.paused":"Paused", "bt.ended":"Finished",
  "bt.metres":"m", "bt.stage":"Stage · shuttle", "bt.time":"Time", "bt.speedNow":"Speed",
  "bt.inStage":"Progress within stage", "bt.vo2":"Current VO₂max",
  "bt.start":"▶ Start", "bt.reset":"↺ Reset",
  "bt.drop":"🛑 Record drop-out · student stopped",
  "bt.laneMode":"Record by lane number", "bt.laneN":"How many lanes",
  "bt.undo":"↩ Undo last entry",
  "bt.keys":"Shortcuts: Space = start/pause · Enter = record",
  "bt.heat":"Heat roster", "bt.loadCls":"👥 Load class", "bt.clearCls":"✕ Clear",
  "bt.heatHint":"Load a class and tap the student who stopped instead of the big button — the name lands in the board exactly, with no typing afterwards.",
  "bt.board":"Results", "bt.byOrder":"By order", "bt.byDist":"By distance",
  "bt.toTrack":"⇧ Save to tracking", "bt.toFt":"🏅 Send to fitness tests",
  "bt.cRank":"Rank", "bt.cName":"Name", "bt.cStage":"Stage·shuttle", "bt.cDist":"Distance",
  "bt.cCat":"Category",
  "bt.empty":"No entries yet.", "bt.emptyHint":"During the run — when a student stops, press the record button and they enter the board.",
  "bt.refTable":"📋 Full stage and distance table",
  "bt.normTable":"📚 VO₂max norms table (FITNESSGRAM®)",

  /* --- פוטו־פיניש --- */
  "pf.tLive":"🎯 Live lane", "pf.tStrip":"🎞 Finish image", "pf.tRes":"🏁 Results",
  "pf.tLaps":"🔄 Laps", "pf.tArc":"🗄 Archive", "pf.tMeta":"📋 Race details",
  "pf.sim":"Simulation", "pf.cam":"Camera", "pf.simMode":"Simulation mode",
  "pf.gun":"🔫 Start", "pf.stop":"⏹ Stop race", "pf.resetRace":"↺ Reset race",
  "pf.line":"Finish-line position", "pf.sens":"Detection sensitivity ·",
  "pf.slit":"Slit width ·", "pf.minT":"Min. gap (s)",
  "pf.autoDetect":"Automatic motion detection at the finish line",
  "pf.micStart":"Audio start — gun / hand clap (microphone)",
  "pf.gunDist":"Microphone distance from the starter (m)", "pf.noOffset":"no offset",
  "pf.lanes":"Lanes and competitors", "pf.loadCls":"👥 Load class",
  "pf.paste":"📋 Paste list", "pf.editNames":"✎ Edit names",
  "pf.laneCount":"Number of lanes ·",
  "pf.tapHint":"Tapping a lane records a crossing now · keys 1–9 do the same from the keyboard.",
  "pf.sanity":"✅ One-minute sanity check — before every race",
  "pf.board":"Official results", "pf.cLane":"Lane", "pf.cTime":"Time",
  "pf.cGap":"Gap", "pf.cSrc":"Source",
  "pf.emptyRes":"No results yet. Run a race or import a CSV.",
  "pf.ai":"🎙️ Commentary report", "pf.arcSave":"💾 Save to archive",
  "pf.csv":"⬇ Export CSV", "pf.sheet":"🖼 Image + table",
  "pf.cert":"🖨 Winner certificate", "pf.mail":"✉ Send results",
  "pf.addRow":"＋ Row", "pf.numbers":"🔢 Bib numbers",

  /* --- תלמידים --- */
  "stu.tabList":"👥 My students", "stu.tabGrades":"📊 Grades", "stu.tabPeer":"🤝 Peer assessment",
  "stu.title":"My students", "stu.search":"Search", "stu.searchPh":"Student name",
  "stu.sort":"Sort", "stu.sName":"By name", "stu.sCls":"By class",
  "stu.sVo2":"VO₂max — high to low", "stu.sVo2a":"VO₂max — low to high",
  "stu.sTrend":"Declining first", "stu.sTests":"Fewest measurements",
  "stu.add":"+ Add students", "stu.fromBeep":"⇩ From the beep board", "stu.csv":"⬇ Class CSV",
  "stu.count":"Students", "stu.avg":"Average VO₂max",
  "stu.below":"Health risk", "stu.falling":"Declining",
  "stu.allCls":"All classes",
  "stu.empty":"No students yet.", "stu.emptyHint":"Add a list manually, or import names from the beep test board.",
  "lock.sub":"Teacher area — enter your code",
  "lock.enter":"Teacher sign-in",
  "lock.or":"or",
  "lock.student":"👦 Student entry — no code",
  "lock.studentNote":"Student mode: view the records board and the games page, and submit a new record for teacher approval. No access to students, tests, settings or record approval.",
  "lock.demo":"🎬 Demo mode — take a tour, no code",
  "lock.demoNote":"Demo: a sample class with results, so you can see how everything works before entering real students. You can clear the demo data with one tap.",
  "lock.aboutQ":"What is this?",
  "lock.aboutA":"A field toolkit for PE teachers: fitness tests, beep test, camera photo-finish, lesson plans, records and grades.",
  "lock.dataQ":"Where is the data?",
  "lock.dataA":"On this device only. No server, no account, nothing is sent anywhere.",
  "lock.newCode":"Set a teacher code — pick one only you know",
  "lock.setCode":"Set code and enter",
  "lock.newCodePh":"New code",
  "lock.welcome":"Welcome back, coach 👋",
  "lock.wrong":"Wrong code",
  "lock.tooShort":"Pick a code of at least 4 digits",

  /* --- ניווט --- */
  "nav.home":"Home", "nav.tests":"Tests", "nav.lesson":"Lesson",
  "nav.beep":"Beep", "nav.photo":"Finish", "nav.records":"Records",
  "nav.games":"Games", "nav.more":"More", "nav.back":"Back",

  /* --- דף הבית --- */
  "home.greet":"Good day,", "home.coach":"Coach.",
  "home.statRuns":"races timed", "home.statBeep":"best beep",
  "home.statRecs":"records approved", "home.statStu":"students tracked",
  "home.ft":"Fitness tests",
  "home.ftSub":"30 tests · stopwatch and counter · class roster · fitness index",
  "home.lesson":"Lesson plans",
  "home.lessonSub":"warm-up → stations → measurement · fast or hand-built",
  "home.beep":"Beep test",
  "home.beepSub":"audio-clock accurate beeps · VO₂max · FITNESSGRAM norms",
  "home.photo":"Photo-finish",
  "home.photoSub":"camera timing · sprints · laps · certificates",
  "home.more":"More options",
  "home.moreSub":"school champions · students and grades · knowledge · class tools · nutrition",
  "home.challenge":"Challenge of the week",
  "home.chPlus":"+ add count", "home.chEdit":"✎ new challenge",
  "home.tip":"Field tip",

  /* --- תפריט «עוד» --- */
  "more.title":"More modules",
  "more.records":"School champions", "more.students":"Students and grades",
  "more.knowledge":"Knowledge", "more.tools":"Class tools", "more.nutrition":"Nutrition corner",

  /* --- הגדרות --- */
  "set.title":"Settings",
  "set.school":"School name (appears in the header, on certificates and in TV mode)",
  "set.theme":"Colour theme",
  "set.themeHint":"«Day» and «Bright sun» are made for outdoor use — a light background and high contrast that stay readable in direct sunlight.",
  "set.sound":"Sounds", "set.voice":"Voice announcements",
  "set.wake":"Keep the screen awake during activity",
  "set.lock":"Lock the teacher area on entry",
  "set.touch":"Large buttons (one-handed use during a lesson)",
  "set.save":"Save", "set.saved":"Settings saved",
  "set.clsTitle":"🏷 Class names",
  "set.clsHint":"Renaming only changes the name. Students, measurements and lessons of the class stay with it — they are identified by a fixed id, not by the name.",
  "set.clsPick":"Class", "set.clsCurLbl":"Current name", "set.clsNewLbl":"New name",
  "set.clsNewPh":"e.g. 9th grade, section 3 — Honors", "set.clsSaveBtn":"Save",
  "set.lang":"Language", "set.langHint":"The interface changes language immediately. Professional content (games, lesson plans, knowledge base) is still Hebrew and is being translated gradually.",
  "set.about":"📘 About, version and credits",
  "set.purge":"🧹 Clear old data",
  "set.install":"📲 Install as an app: in Chrome — menu ⋮ then \"Add to Home screen\". On iPhone — Share then \"Add to Home Screen\". Saved as a file, the app works without internet too (only the fonts load from the network).",

  /* --- גיבוי --- */
  "bk.title":"💾 Backup and restore",
  "bk.body":"All your data — students, results, records, grades, norms and settings — is stored <b>on this device only</b>. A broken device or clearing site data means it is gone, with no way back. One backup file solves that, and also moves everything to a new device or another teacher.",
  "bk.export":"⬇ Back up everything to a file",
  "bk.import":"⬆ Restore from a file",
  "bk.encrypt":"🔐 Encrypt the backup with a password",
  "bk.encryptHint":"An encrypted file can be kept in Drive or sent by email without anyone — not even the storage service — being able to read it. <b>No password recovery:</b> lose the password, lose the file. That is what real encryption means. Without this checkbox — a plain, unencrypted file that any JSON-reading tool can open.",
  "bk.pass":"Password", "bk.passAgain":"Again, to confirm",
  "bk.passTitleNew":"🔐 Backup password", "bk.passTitleOpen":"🔐 This file is encrypted",
  "bk.passHintNew":"Choose a password. <b>There is no way to recover it</b> — save it somewhere you will remember, or the file is lost.",
  "bk.passHintOpen":"This file is encrypted. Enter the password it was created with.",
  "bk.passShort":"Password must be at least 8 characters.",
  "bk.passMismatch":"The two passwords do not match.",
  "bk.passWrongLeft":"Wrong password — {n} attempts left",
  "bk.passWrongFinal":"Wrong password. The file was not opened.",
  "bk.never":"never backed up",
  "bk.lastAt":"last backup",
  "bk.groups":"data groups",
  "bk.restoreTitle":"⬆ Restore from a backup file",
  "bk.restoreHint":"This is what the file contains. Restoring <b>replaces</b> the data on this device — so back up the current state first.",
  "bk.colItem":"Data", "bk.colFile":"In file", "bk.colHere":"On device now",
  "bk.safety":"⬇ Back up the current state first",
  "bk.go":"✓ Restore and replace",
  "bk.cancel":"Cancel",
  "bk.confirm":"Restore? All data on this device will be replaced by the data in the file.",
  "bk.done":"✓ Restored — reloading",
  "bk.bad":"That file is not a Hamigresh PRO backup",

  /* --- כללי --- */
  "thm.dark":"Night", "thm.turf":"Turf", "thm.slate":"Slate", "thm.day":"Day", "thm.sun":"Bright sun",
  "i18n.partial":"Interface translated. Professional content is still Hebrew.",
  "ui.close":"Close", "ui.cancel":"Cancel", "ui.save":"Save", "ui.delete":"Delete",
  "ui.edit":"Edit", "ui.add":"Add", "ui.export":"Export", "ui.import":"Import",
  "ui.search":"Search", "ui.sort":"Sort", "ui.class":"Class", "ui.grade":"Year",
  "ui.name":"Name", "ui.date":"Date", "ui.result":"Result", "ui.score":"Score",
  "ui.boys":"Boys", "ui.girls":"Girls", "ui.all":"All", "ui.none":"None",
  "ui.yes":"Yes", "ui.no":"No", "ui.back":"Back", "ui.next":"Next", "ui.done":"Done",
  "ui.sun":"Bright-sun mode — high contrast for daylight",
  "ui.sunOff":"Back to the normal theme",
  "ui.settings":"Settings",
  "ui.info":"Quick guide — what this screen does",
  "ui.demoBar":"Demo mode", "ui.demoNote":"— the data here is a sample",
  "ui.demoClear":"Clear demo data",
  "ui.explain":"Explanation"
},

ar:{
  "brand.word":"Hamigresh", "brand.full":"Hamigresh PRO", "about.title":"📘 حول Hamigresh PRO",
  "bt.setup":"إعداد الاختبار", "bt.dist":"طول المسار", "bt.speed":"سرعة المرحلة 1 (كم/س)",
  "bt.age":"عمر الصف", "bt.sex":"الجنس (للمعايير)",
  "bt.voice":"إعلانات صوتية", "bt.beeps":"نبضات",
  "bt.live":"الاختبار جارٍ", "bt.ready":"جاهز للانطلاق", "bt.paused":"موقوف مؤقتًا", "bt.ended":"انتهى",
  "bt.metres":"م", "bt.stage":"مرحلة · شوط", "bt.time":"الزمن", "bt.speedNow":"السرعة",
  "bt.vo2":"VO₂max الحالي",
  "bt.start":"▶ انطلاق", "bt.reset":"↺ تصفير",
  "bt.drop":"🛑 تسجيل انسحاب · الطالب توقّف",
  "bt.heat":"قائمة السباق", "bt.loadCls":"👥 تحميل صف", "bt.clearCls":"✕ مسح",
  "bt.board":"لوحة النتائج", "bt.cRank":"الترتيب", "bt.cName":"الاسم", "bt.cDist":"المسافة",
  "bt.cCat":"الفئة", "bt.empty":"لا تسجيلات بعد.",
  "pf.tLive":"🎯 المسار المباشر", "pf.tStrip":"🎞 صورة النهاية", "pf.tRes":"🏁 النتائج",
  "pf.tLaps":"🔄 اللفّات", "pf.tArc":"🗄 الأرشيف", "pf.tMeta":"📋 تفاصيل السباق",
  "pf.sim":"محاكاة", "pf.cam":"كاميرا", "pf.gun":"🔫 انطلاق", "pf.stop":"⏹ إيقاف السباق",
  "pf.line":"موضع خط النهاية", "pf.lanes":"المسارات والمتسابقون", "pf.loadCls":"👥 تحميل صف",
  "pf.board":"النتائج الرسمية", "pf.cLane":"المسار", "pf.cTime":"الزمن", "pf.cGap":"الفارق",
  "stu.tabList":"👥 طلابي", "stu.tabGrades":"📊 العلامات", "stu.title":"طلابي",
  "stu.search":"بحث", "stu.sort":"ترتيب", "stu.add":"+ إضافة طلاب",
  "stu.count":"طلاب", "stu.avg":"متوسط VO₂max", "stu.allCls":"كل الصفوف",
  "lock.sub":"منطقة المعلّم — أدخل رمزك",
  "lock.enter":"دخول المعلّم",
  "lock.or":"أو",
  "lock.student":"👦 دخول الطالب — بدون رمز",
  "lock.studentNote":"وضع الطالب: عرض لوحة الأرقام القياسية وصفحة الألعاب، وإرسال رقم قياسي جديد لموافقة المعلّم. بدون وصول إلى الطلاب أو الاختبارات أو الإعدادات أو الموافقات.",
  "lock.demo":"🎬 وضع العرض التوضيحي — جولة بدون رمز",
  "lock.demoNote":"عرض توضيحي: صف نموذجي مع نتائج، لترى كيف يعمل كل شيء قبل إدخال طلاب حقيقيين. يمكن مسح بيانات العرض بضغطة واحدة.",
  "lock.aboutQ":"ما هذا؟",
  "lock.aboutA":"عدّة ميدانية لمعلّمي التربية الرياضية: اختبارات لياقة، اختبار البيب، تصوير خط النهاية بالكاميرا، خطط دروس، أرقام قياسية وعلامات.",
  "lock.dataQ":"أين البيانات؟",
  "lock.dataA":"على هذا الجهاز فقط. لا خادم، لا حساب، ولا يُرسل أي شيء إلى أي مكان.",
  "lock.newCode":"عيّن رمز المعلّم — اختر رمزًا تعرفه أنت وحدك",
  "lock.setCode":"تعيين الرمز والدخول",
  "lock.newCodePh":"رمز جديد",
  "lock.welcome":"أهلًا بعودتك، أيها المدرّب 👋",
  "lock.wrong":"رمز غير صحيح",
  "lock.tooShort":"اختر رمزًا من 4 أرقام على الأقل",

  "nav.home":"الرئيسية", "nav.tests":"اختبارات", "nav.lesson":"الدرس",
  "nav.beep":"البيب", "nav.photo":"النهاية", "nav.records":"الأرقام",
  "nav.games":"ألعاب", "nav.more":"المزيد", "nav.back":"رجوع",

  "home.greet":"يوم طيب،", "home.coach":"أيها المدرّب.",
  "home.statRuns":"سباقات مقيسة", "home.statBeep":"أفضل بيب",
  "home.statRecs":"أرقام معتمدة", "home.statStu":"طلاب قيد المتابعة",
  "home.ft":"اختبارات اللياقة",
  "home.ftSub":"30 اختبارًا · ساعة إيقاف وعدّاد · قائمة الصف · مؤشر اللياقة",
  "home.lesson":"خطط الدروس",
  "home.lessonSub":"إحماء ← محطات ← قياس · سريع أو بناء يدوي",
  "home.beep":"اختبار البيب",
  "home.beepSub":"نبضات بدقة الساعة الصوتية · VO₂max · معايير FITNESSGRAM",
  "home.photo":"تصوير خط النهاية",
  "home.photoSub":"توقيت بالكاميرا · سباقات سرعة · لفّات · شهادات",
  "home.more":"خيارات أخرى",
  "home.moreSub":"أبطال المدرسة · الطلاب والعلامات · المعرفة · أدوات الصف · التغذية",
  "home.challenge":"تحدّي الأسبوع",
  "home.chPlus":"+ أضف عدًّا", "home.chEdit":"✎ تحدٍّ جديد",
  "home.tip":"نصيحة ميدانية",

  "more.title":"وحدات إضافية",
  "more.records":"أبطال المدرسة", "more.students":"الطلاب والعلامات",
  "more.knowledge":"المعرفة", "more.tools":"أدوات الصف", "more.nutrition":"ركن التغذية",

  "set.title":"الإعدادات",
  "set.school":"اسم المدرسة (يظهر في الترويسة وعلى الشهادات وفي وضع التلفاز)",
  "set.theme":"سِمة الألوان",
  "set.themeHint":"«نهار» و«شمس ساطعة» مخصّصتان للاستخدام في الخارج — خلفية فاتحة وتباين عالٍ يبقيان مقروءين تحت أشعة الشمس المباشرة.",
  "set.sound":"الأصوات", "set.voice":"الإعلانات الصوتية",
  "set.wake":"إبقاء الشاشة مضاءة أثناء النشاط",
  "set.lock":"قفل منطقة المعلّم عند الدخول",
  "set.touch":"أزرار كبيرة (استخدام بيد واحدة أثناء الدرس)",
  "set.save":"حفظ", "set.saved":"تم حفظ الإعدادات",
  "set.clsTitle":"🏷 أسماء الصفوف",
  "set.clsHint":"تغيير الاسم يغيّر الاسم فقط. الطلاب والقياسات والحصص الخاصة بالصف يبقون معه — يُعرَّفون بمعرّف ثابت، لا بالاسم.",
  "set.clsPick":"الصف", "set.clsCurLbl":"الاسم الحالي", "set.clsNewLbl":"اسم جديد",
  "set.clsNewPh":"مثال: تاسع 3 — متفوقين", "set.clsSaveBtn":"حفظ",
  "set.lang":"اللغة", "set.langHint":"تتغيّر لغة الواجهة فورًا. المحتوى المهني (الألعاب، خطط الدروس، قاعدة المعرفة) ما زال بالعبرية ويُترجم تدريجيًا.",
  "set.about":"📘 حول، الإصدار والاعتمادات",
  "set.purge":"🧹 مسح البيانات القديمة",
  "set.install":"📲 التثبيت كتطبيق: في كروم — القائمة ⋮ ثم \"إضافة إلى الشاشة الرئيسية\". في آيفون — مشاركة ثم \"إضافة إلى الشاشة الرئيسية\". التطبيق يعمل بدون إنترنت أيضًا (الخطوط فقط تُحمّل من الشبكة).",

  "bk.title":"💾 النسخ الاحتياطي والاستعادة",
  "bk.body":"كل بياناتك — الطلاب، النتائج، الأرقام القياسية، العلامات، المعايير والإعدادات — محفوظة <b>على هذا الجهاز فقط</b>. جهاز يتعطّل أو مسح بيانات الموقع يعني ضياع كل شيء بلا رجعة. ملف نسخ احتياطي واحد يحلّ ذلك، وينقل كل شيء إلى جهاز جديد أو إلى معلّم آخر.",
  "bk.export":"⬇ انسخ كل شيء إلى ملف",
  "bk.import":"⬆ استعادة من ملف",
  "bk.encrypt":"🔐 تشفير النسخة الاحتياطية بكلمة مرور",
  "bk.encryptHint":"يمكن حفظ الملف المشفّر في درايف أو إرساله بالبريد دون أن يتمكن أحد — ولا حتى خدمة التخزين — من قراءة محتواه. <b>لا استعادة لكلمة المرور:</b> إن ضاعت كلمة المرور ضاع الملف. هذا هو معنى التشفير الحقيقي. بدون تحديد هذا المربع — ملف عادي غير مشفّر يمكن لأي أداة تقرأ JSON فتحه.",
  "bk.pass":"كلمة المرور", "bk.passAgain":"مرة أخرى للتأكيد",
  "bk.passTitleNew":"🔐 كلمة مرور النسخة الاحتياطية", "bk.passTitleOpen":"🔐 هذا الملف مشفّر",
  "bk.passHintNew":"اختر كلمة مرور. <b>لا توجد طريقة لاستعادتها</b> — احفظها في مكان تتذكره، وإلا فُقد الملف.",
  "bk.passHintOpen":"هذا الملف مشفّر. أدخل كلمة المرور التي أُنشئ بها.",
  "bk.passShort":"كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
  "bk.passMismatch":"كلمتا المرور غير متطابقتين.",
  "bk.passWrongLeft":"كلمة مرور خاطئة — تبقّت {n} محاولات",
  "bk.passWrongFinal":"كلمة مرور خاطئة. لم يُفتح الملف.",
  "bk.never":"لم يُنسخ احتياطيًا قط",
  "bk.lastAt":"آخر نسخة",
  "bk.groups":"مجموعات بيانات",
  "bk.restoreTitle":"⬆ استعادة من ملف نسخ احتياطي",
  "bk.restoreHint":"هذا ما يحتويه الملف. الاستعادة <b>تستبدل</b> البيانات الموجودة على الجهاز — لذا انسخ الحالة الحالية أولًا.",
  "bk.colItem":"البيانات", "bk.colFile":"في الملف", "bk.colHere":"على الجهاز الآن",
  "bk.safety":"⬇ انسخ الحالة الحالية أولًا",
  "bk.go":"✓ استعادة واستبدال",
  "bk.cancel":"إلغاء",
  "bk.confirm":"استعادة؟ ستُستبدل كل البيانات على هذا الجهاز ببيانات الملف.",
  "bk.done":"✓ تمت الاستعادة — يُعاد التحميل",
  "bk.bad":"هذا الملف ليس نسخة احتياطية لـ Hamigresh PRO",

  "thm.dark":"ليل", "thm.turf":"عشب", "thm.slate":"رمادي", "thm.day":"نهار", "thm.sun":"شمس ساطعة",
  "i18n.partial":"الواجهة مترجمة. المحتوى المهني ما زال بالعبرية.",
  "ui.close":"إغلاق", "ui.cancel":"إلغاء", "ui.save":"حفظ", "ui.delete":"حذف",
  "ui.edit":"تحرير", "ui.add":"إضافة", "ui.export":"تصدير", "ui.import":"استيراد",
  "ui.search":"بحث", "ui.sort":"ترتيب", "ui.class":"الصف", "ui.grade":"المرحلة",
  "ui.name":"الاسم", "ui.date":"التاريخ", "ui.result":"النتيجة", "ui.score":"العلامة",
  "ui.boys":"بنون", "ui.girls":"بنات", "ui.all":"الكل", "ui.none":"لا شيء",
  "ui.yes":"نعم", "ui.no":"لا", "ui.back":"رجوع", "ui.next":"التالي", "ui.done":"تم",
  "ui.sun":"وضع الشمس — تباين عالٍ لضوء النهار",
  "ui.sunOff":"العودة إلى السِمة العادية",
  "ui.settings":"الإعدادات",
  "ui.info":"دليل سريع — ماذا تفعل هذه الشاشة",
  "ui.demoBar":"وضع العرض التوضيحي", "ui.demoNote":"— البيانات هنا نموذجية",
  "ui.demoClear":"مسح بيانات العرض",
  "ui.explain":"شرح"
},

ru:{
  "brand.word":"Hamigresh", "brand.full":"Hamigresh PRO", "about.title":"📘 О Hamigresh PRO",
  "bt.setup":"Настройка теста", "bt.dist":"Длина отрезка", "bt.speed":"Скорость 1-й ступени (км/ч)",
  "bt.std":"↺ Стандарт (8.0)", "bt.proto":"Стандартный протокол",
  "bt.saveProf":"💾 Сохранить профиль", "bt.age":"Возраст класса", "bt.sex":"Пол (для норм)",
  "bt.voice":"Голосовые объявления", "bt.beeps":"Сигналы",
  "bt.live":"Тест идёт", "bt.ready":"Готов к старту", "bt.paused":"Пауза", "bt.ended":"Завершён",
  "bt.metres":"м", "bt.stage":"Ступень · отрезок", "bt.time":"Время", "bt.speedNow":"Скорость",
  "bt.inStage":"Прогресс в ступени", "bt.vo2":"Текущий VO₂max",
  "bt.start":"▶ Старт", "bt.reset":"↺ Сброс",
  "bt.drop":"🛑 Сход · ученик остановился",
  "bt.laneMode":"Запись по номеру дорожки", "bt.laneN":"Сколько дорожек",
  "bt.undo":"↩ Отменить последнюю запись",
  "bt.heat":"Состав забега", "bt.loadCls":"👥 Загрузить класс", "bt.clearCls":"✕ Очистить",
  "bt.board":"Результаты", "bt.byOrder":"По порядку", "bt.byDist":"По дистанции",
  "bt.cRank":"Место", "bt.cName":"Имя", "bt.cDist":"Дистанция", "bt.cCat":"Категория",
  "bt.empty":"Записей пока нет.",
  "pf.tLive":"🎯 Живая дорожка", "pf.tStrip":"🎞 Снимок финиша", "pf.tRes":"🏁 Результаты",
  "pf.tLaps":"🔄 Круги", "pf.tArc":"🗄 Архив", "pf.tMeta":"📋 О забеге",
  "pf.sim":"Симуляция", "pf.cam":"Камера", "pf.gun":"🔫 Старт", "pf.stop":"⏹ Остановить",
  "pf.line":"Положение линии финиша", "pf.sens":"Чувствительность ·",
  "pf.lanes":"Дорожки и участники", "pf.loadCls":"👥 Загрузить класс",
  "pf.board":"Официальные результаты", "pf.cLane":"Дорожка", "pf.cTime":"Время",
  "pf.cGap":"Отставание", "pf.cSrc":"Источник",
  "stu.tabList":"👥 Мои ученики", "stu.tabGrades":"📊 Оценки", "stu.title":"Мои ученики",
  "stu.search":"Поиск", "stu.sort":"Сортировка", "stu.add":"+ Добавить учеников",
  "stu.count":"Учеников", "stu.avg":"Средний VO₂max", "stu.allCls":"Все классы",
  "stu.below":"Зона риска", "stu.falling":"Спад",
  "lock.sub":"Зона учителя — введите код",
  "lock.enter":"Вход учителя",
  "lock.or":"или",
  "lock.student":"👦 Вход ученика — без кода",
  "lock.studentNote":"Режим ученика: просмотр таблицы рекордов и страницы игр, отправка нового рекорда на подтверждение учителю. Без доступа к ученикам, тестам, настройкам и подтверждению рекордов.",
  "lock.demo":"🎬 Демо-режим — обзор без кода",
  "lock.demoNote":"Демо: учебный класс с результатами, чтобы посмотреть, как всё работает, до ввода реальных учеников. Демо-данные удаляются одним нажатием.",
  "lock.aboutQ":"Что это?",
  "lock.aboutA":"Полевой набор для учителя физкультуры: тесты, бип-тест, фотофиниш с камеры, планы уроков, рекорды и оценки.",
  "lock.dataQ":"Где данные?",
  "lock.dataA":"Только на этом устройстве. Нет сервера, нет аккаунта, ничего никуда не отправляется.",
  "lock.newCode":"Задайте код учителя — тот, что знаете только вы",
  "lock.setCode":"Задать код и войти",
  "lock.newCodePh":"Новый код",
  "lock.welcome":"С возвращением, тренер 👋",
  "lock.wrong":"Неверный код",
  "lock.tooShort":"Выберите код минимум из 4 цифр",

  "nav.home":"Главная", "nav.tests":"Тесты", "nav.lesson":"Урок",
  "nav.beep":"Бип", "nav.photo":"Финиш", "nav.records":"Рекорды",
  "nav.games":"Игры", "nav.more":"Ещё", "nav.back":"Назад",

  "home.greet":"Добрый день,", "home.coach":"тренер.",
  "home.statRuns":"забегов замерено", "home.statBeep":"лучший бип",
  "home.statRecs":"рекордов подтверждено", "home.statStu":"учеников в наблюдении",
  "home.ft":"Тесты физподготовки",
  "home.ftSub":"30 тестов · секундомер и счётчик · список класса · индекс формы",
  "home.lesson":"Планы уроков",
  "home.lessonSub":"разминка → станции → замер · быстро или вручную",
  "home.beep":"Бип-тест",
  "home.beepSub":"сигналы по аудиочасам · VO₂max · нормы FITNESSGRAM",
  "home.photo":"Фотофиниш",
  "home.photoSub":"замер с камеры · спринт · круги · грамоты",
  "home.more":"Другие возможности",
  "home.moreSub":"чемпионы школы · ученики и оценки · знания · инструменты класса · питание",
  "home.challenge":"Вызов недели",
  "home.chPlus":"+ добавить", "home.chEdit":"✎ новый вызов",
  "home.tip":"Полевой совет",

  "more.title":"Другие модули",
  "more.records":"Чемпионы школы", "more.students":"Ученики и оценки",
  "more.knowledge":"Знания", "more.tools":"Инструменты класса", "more.nutrition":"Уголок питания",

  "set.title":"Настройки",
  "set.school":"Название школы (в шапке, на грамотах и в режиме ТВ)",
  "set.theme":"Цветовая тема",
  "set.themeHint":"«День» и «Яркое солнце» — для улицы: светлый фон и высокий контраст, читаемые под прямым солнцем.",
  "set.sound":"Звуки", "set.voice":"Голосовые объявления",
  "set.wake":"Не гасить экран во время активности",
  "set.lock":"Блокировать зону учителя при входе",
  "set.touch":"Крупные кнопки (управление одной рукой во время урока)",
  "set.save":"Сохранить", "set.saved":"Настройки сохранены",
  "set.clsTitle":"🏷 Названия классов",
  "set.clsHint":"Переименование меняет только название. Ученики, измерения и уроки класса остаются с ним — они определяются по постоянному id, а не по названию.",
  "set.clsPick":"Класс", "set.clsCurLbl":"Текущее название", "set.clsNewLbl":"Новое название",
  "set.clsNewPh":"например: 9 класс, группа 3 — с углублённым изучением", "set.clsSaveBtn":"Сохранить",
  "set.lang":"Язык", "set.langHint":"Язык интерфейса меняется сразу. Профессиональный контент (игры, планы уроков, база знаний) пока на иврите и переводится постепенно.",
  "set.about":"📘 О программе, версия и благодарности",
  "set.purge":"🧹 Очистить старые данные",
  "set.install":"📲 Установка как приложение: в Chrome — меню ⋮ и «Добавить на главный экран». На iPhone — «Поделиться» и «На экран «Домой»». Сохранённое как файл, приложение работает и без интернета (из сети грузятся только шрифты).",

  "bk.title":"💾 Резервная копия и восстановление",
  "bk.body":"Все ваши данные — ученики, результаты, рекорды, оценки, нормы и настройки — хранятся <b>только на этом устройстве</b>. Сломанное устройство или очистка данных сайта — и всё пропало без возврата. Один файл копии решает это, а заодно переносит всё на новое устройство или другому учителю.",
  "bk.export":"⬇ Сохранить всё в файл",
  "bk.import":"⬆ Восстановить из файла",
  "bk.encrypt":"🔐 Зашифровать копию паролем",
  "bk.encryptHint":"Зашифрованный файл можно хранить на Диске или отправлять по почте — никто, даже сам сервис хранения, не прочитает содержимое. <b>Восстановить пароль нельзя:</b> забыли пароль — потеряли файл. В этом смысл настоящего шифрования. Без этой галочки — обычный незашифрованный файл, который откроет любая программа, читающая JSON.",
  "bk.pass":"Пароль", "bk.passAgain":"Ещё раз, для проверки",
  "bk.passTitleNew":"🔐 Пароль для копии", "bk.passTitleOpen":"🔐 Этот файл зашифрован",
  "bk.passHintNew":"Выберите пароль. <b>Восстановить его нельзя</b> — сохраните там, где не забудете, иначе файл будет потерян.",
  "bk.passHintOpen":"Этот файл зашифрован. Введите пароль, с которым он был создан.",
  "bk.passShort":"Пароль должен быть не короче 8 символов.",
  "bk.passMismatch":"Пароли не совпадают.",
  "bk.passWrongLeft":"Неверный пароль — осталось попыток: {n}",
  "bk.passWrongFinal":"Неверный пароль. Файл не открыт.",
  "bk.never":"копия ещё не создавалась",
  "bk.lastAt":"последняя копия",
  "bk.groups":"групп данных",
  "bk.restoreTitle":"⬆ Восстановление из файла копии",
  "bk.restoreHint":"Вот что в файле. Восстановление <b>заменяет</b> данные на устройстве — сначала сохраните текущее состояние.",
  "bk.colItem":"Данные", "bk.colFile":"В файле", "bk.colHere":"На устройстве сейчас",
  "bk.safety":"⬇ Сначала сохранить текущее состояние",
  "bk.go":"✓ Восстановить и заменить",
  "bk.cancel":"Отмена",
  "bk.confirm":"Восстановить? Все данные на устройстве будут заменены данными из файла.",
  "bk.done":"✓ Восстановлено — перезагрузка",
  "bk.bad":"Этот файл не является резервной копией Hamigresh PRO",

  "thm.dark":"Ночь", "thm.turf":"Газон", "thm.slate":"Сланец", "thm.day":"День", "thm.sun":"Яркое солнце",
  "i18n.partial":"Интерфейс переведён. Профессиональный контент пока на иврите.",
  "ui.close":"Закрыть", "ui.cancel":"Отмена", "ui.save":"Сохранить", "ui.delete":"Удалить",
  "ui.edit":"Изменить", "ui.add":"Добавить", "ui.export":"Экспорт", "ui.import":"Импорт",
  "ui.search":"Поиск", "ui.sort":"Сортировка", "ui.class":"Класс", "ui.grade":"Параллель",
  "ui.name":"Имя", "ui.date":"Дата", "ui.result":"Результат", "ui.score":"Балл",
  "ui.boys":"Мальчики", "ui.girls":"Девочки", "ui.all":"Все", "ui.none":"Нет",
  "ui.yes":"Да", "ui.no":"Нет", "ui.back":"Назад", "ui.next":"Далее", "ui.done":"Готово",
  "ui.sun":"Режим солнца — высокий контраст для дневного света",
  "ui.sunOff":"Вернуться к обычной теме",
  "ui.settings":"Настройки",
  "ui.info":"Краткое руководство — что делает этот экран",
  "ui.demoBar":"Демо-режим", "ui.demoNote":"— данные здесь учебные",
  "ui.demoClear":"Очистить демо-данные",
  "ui.explain":"Пояснение"
}
};

const KEY="pehub.lang";
let cur=(function(){
  try{ const v=localStorage.getItem(KEY); if(v&&DICT[v.replace(/"/g,"")]!==undefined)return v.replace(/"/g,""); }catch(e){}
  /* בכוונה בלי ניחוש משפת הדפדפן. התוכן המקצועי עדיין עברית, ולכן
     מורה ישראלי עם טלפון מוגדר באנגלית היה מקבל ממשק אנגלי מעל תוכן
     עברי — גרוע משתי השפות. ברירת המחדל היא עברית, והבחירה מפורשת. */
  return "he";
})();

const info=c=>LANGS.find(l=>l.code===c)||LANGS[0];

/* t(key) — מפתח חסר מחזיר את ברירת המחדל שנמסרה, ואם אין — את המפתח
   עצמו. אף פעם לא מחרוזת ריקה: טקסט חסר גרוע מטקסט בשפה הלא נכונה. */
function t(key,def){
  const d=DICT[cur];
  if(d&&d[key]!=null)return d[key];
  return def!=null?def:(DICT.he[key]!=null?DICT.he[key]:key);
}

/* המרקאפ נכתב עברית, ולכן data-i18n שומר את המקור העברי כברירת מחדל
   בפעם הראשונה — וכך מעבר חזרה לעברית מחזיר בדיוק את הטקסט המקורי. */
function applyDom(root){
  const scope=root||document;
  scope.querySelectorAll("[data-i18n]").forEach(el=>{
    const k=el.dataset.i18n;
    if(el.dataset.i18nHe==null)el.dataset.i18nHe=el.innerHTML;
    el.innerHTML=cur==="he"?el.dataset.i18nHe:t(k,el.dataset.i18nHe);
  });
  ["placeholder","title","aria-label"].forEach(attr=>{
    scope.querySelectorAll("[data-i18n-"+attr+"]").forEach(el=>{
      const k=el.getAttribute("data-i18n-"+attr);
      const memo="i18nHe_"+attr.replace("-","");
      if(el.dataset[memo]==null)el.dataset[memo]=el.getAttribute(attr)||"";
      el.setAttribute(attr,cur==="he"?el.dataset[memo]:t(k,el.dataset[memo]));
    });
  });
}

/* כיוון: ערבית ועברית מימין לשמאל, אנגלית ורוסית משמאל לימין.
   ה-CSS משתמש בתכונות לוגיות (inset-inline, margin-inline) ולכן
   החלפת dir לבדה מספיקה כדי להפוך את הפריסה. */
function applyDir(){
  const d=info(cur).dir;
  document.documentElement.setAttribute("lang",cur);
  document.documentElement.setAttribute("dir",d);
  const app=document.querySelector(".app");
  if(app)app.setAttribute("dir",d);
  document.body.dataset.lang=cur;
  document.body.dataset.dir=d;
}

function set(code){
  if(DICT[code]===undefined)return false;
  cur=code;
  try{ localStorage.setItem(KEY,code); }catch(e){}
  applyDir(); applyDom();
  document.dispatchEvent(new CustomEvent("i18n:change",{detail:{lang:code}}));
  return true;
}

function init(){ applyDir(); applyDom(); }

return {t,set,init,applyDom,applyDir,langs:()=>LANGS.slice(),
        lang:()=>cur, dir:()=>info(cur).dir, info:()=>info(cur),
        /* כמה מפתחות תורגמו לכל שפה — לשקיפות במסך ההגדרות */
        coverage:()=>{ const base=Object.keys(DICT.en).length;
          const out={}; Object.keys(DICT).forEach(c=>{
            out[c]=c==="he"?base:Object.keys(DICT[c]).length; });
          return {base,out}; }};
})();
