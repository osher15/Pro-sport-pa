/* ============================================================
   Service Worker — המגרש PRO
   ------------------------------------------------------------
   המורה עומד במגרש בלי קליטה. השירות הזה שומר את קליפת האפליקציה
   במטמון ומגיש אותה מהמכשיר, כך שפתיחה שנייה עובדת גם בלי רשת.

   הנתונים עצמם אינם עוברים כאן בכלל — הם ב-localStorage, מקומיים
   לדפדפן. השירות נוגע רק בקבצים הסטטיים של האפליקציה.

   CACHE_VERSION נחתם בזמן הבנייה לפי תוכן הקבצים, ולכן פריסה חדשה
   יוצרת מטמון חדש והישן נמחק — במקום שגרסה ישנה תישאר תקועה על
   מכשיר בלי שאיש יידע.
   ============================================================ */
const CACHE_VERSION = "f26ae802";
const CACHE = "hamegrash-" + CACHE_VERSION;

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./support.js",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./hm-styles.css",
  "./hm-data.js",
  "./hm-app.js",
  "./hm-qr.js",
  "./hm-howto.js",
  "./hm-know.js",
  "./hm-tools.js",
  "./hm-plans.js",
  "./hm-lesson.js",
  "./hm-build.js",
  "./hm-tests.js",
  "./hm-new.js"
];

self.addEventListener("install", e => {
  /* addAll נכשל כולו אם קובץ אחד נופל; כאן עדיף מטמון חלקי על פני
     התקנה שנכשלת ומשאירה את המשתמש בלי שום מטמון. */
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    /* מטמון הגופנים נושא את שם הגרסה כדי שיימחק יחד איתה, אבל
       הגופנים עצמם לא משתנים בין פריסות — לכן שומרים אותו. */
    await Promise.all(keys.filter(k => k.startsWith("hamegrash-") &&
                                       k !== CACHE && k !== CACHE + "-fonts" &&
                                       !k.endsWith("-fonts"))
                          .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* גופני Google: cache-first לתמיד. אחרי טעינה מקוונת אחת הם זמינים
     גם בלי רשת, במקום שהאפליקציה תיפול לגופן מערכת דווקא במגרש.
     התשובות מ-gstatic הן opaque — אי אפשר לבדוק אותן, ולכן שומרים
     רק כשהבקשה הצליחה בכלל. */
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    e.respondWith((async () => {
      const c = await caches.open(CACHE + "-fonts");
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res) c.put(req, res.clone());
        return res;
      } catch (err) {
        return new Response("", { status: 504 });
      }
    })());
    return;
  }
  if (url.origin !== self.location.origin) return;   /* כל השאר — לדפדפן */

  /* ניווט: קודם רשת (כדי לקבל פריסה חדשה), ובלי רשת — הדף מהמטמון.
     כך עדכון מגיע מיד כשיש קליטה, ובלעדיה האפליקציה עדיין נפתחת. */
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const c = await caches.open(CACHE);
        c.put("./index.html", net.clone());
        return net;
      } catch (err) {
        return (await caches.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  /* נכסים: קודם מטמון (מיידי), ורענון ברקע לפעם הבאה. */
  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: false });
    const net = fetch(req).then(res => {
      if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => null);
    return cached || (await net) || Response.error();
  })());
});
