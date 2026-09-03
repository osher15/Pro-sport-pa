/* Service worker — מאפשר לאפליקציה לעבוד גם בלי רשת (מגרש, אולם, שטח).
   אסטרטגיה: רשת קודם, וכשאין רשת — מהמטמון. כך התוכן תמיד עדכני כשיש
   חיבור, ואף פעם לא נתקעים על גרסה ישנה אחרי פריסה. */
const CACHE = "tochnit-shnatit-v1";
const SHELL = [
  "./", "./index.html", "./ap-styles.css",
  "./ap-calendar.js", "./ap-timetable.js", "./ap-curriculum.js",
  "./ap-hevra.js", "./ap-fitness.js", "./ap-heart.js", "./ap-learn.js", "./ap-app.js",
  "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});

self.addEventListener("fetch", e=>{
  const req=e.request;
  if(req.method!=="GET") return;
  if(new URL(req.url).origin!==location.origin) return;   /* פונטים וקישורים חיצוניים — לא נוגעים */
  e.respondWith(
    fetch(req)
      .then(res=>{
        if(res && res.ok){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); }
        return res;
      })
      .catch(()=> caches.match(req).then(hit=> hit || caches.match("./index.html")))
  );
});
