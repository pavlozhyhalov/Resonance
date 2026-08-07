/* Resonance service worker — cache-first for immutable/versioned assets.
   Never caches index.html or i18n JSON, so new deploys (?v=) and translation
   updates always propagate. */
const CACHE = "resonance-assets";

self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (_e) { return; }
  var host = url.hostname;
  var font = host.indexOf("gstatic") >= 0 || host.indexOf("googleapis") >= 0;
  var sameOrigin = url.origin === self.location.origin;
  var versioned = sameOrigin && url.search.indexOf("v=") >= 0;         // app.bundle.js?v=, styles.css?v=, icons?v=
  var media = sameOrigin && /\.(png|svg|woff2?|mp3|wav|ogg)$/i.test(url.pathname);
  if (!(font || versioned || media)) return;                          // everything else (HTML, Supabase, i18n json) -> network
  e.respondWith(
    caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          try { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); } catch (_e) {}
          return res;
        });
      });
    })
  );
});
