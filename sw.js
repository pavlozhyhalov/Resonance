/* Resonance service worker.
   Navigations are network-first: always fetch a fresh index.html so a new
   deploy's ?v= (and thus the new bundle) is picked up without a manual
   refresh, with a cached fallback for offline. Versioned/immutable assets
   (?v=, media, fonts) stay cache-first. Bump VERSION on each deploy so this
   worker updates and old caches are purged. */
const VERSION = "20260905000013";
const CACHE = "resonance-assets-" + VERSION;

self.addEventListener("install", function () { self.skipWaiting(); });

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (_e) { return; }
  var sameOrigin = url.origin === self.location.origin;

  // Top-level navigations (HTML): network-first so new deploys propagate
  // immediately; fall back to cache when offline.
  if (req.mode === "navigate" || (sameOrigin && /\.html?$/i.test(url.pathname))) {
    e.respondWith(
      fetch(req, { cache: "reload" }).then(function (res) {
        if (res && res.ok) {
          try { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); } catch (_e) {}
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match("./"); });
      })
    );
    return;
  }

  var host = url.hostname;
  var font = host.indexOf("gstatic") >= 0 || host.indexOf("googleapis") >= 0;
  var versioned = sameOrigin && url.search.indexOf("v=") >= 0;   // app.bundle.js?v=, styles.css?v=, icons?v=
  var media = sameOrigin && /\.(png|svg|woff2?|mp3|wav|ogg)$/i.test(url.pathname);
  if (!(font || versioned || media)) return;                    // i18n json, Supabase, etc -> network
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

// --- Web push ---
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_e) { d = { title: "Resonance", body: e.data ? e.data.text() : "" }; }
  var title = d.title || "Resonance";
  var opts = {
    body: d.body || "",
    icon: "icons/icon-192.png?v=" + VERSION,
    badge: "icons/icon-192.png?v=" + VERSION,
    tag: d.tag || "resonance",
    data: { url: d.url || "/" }
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if ("focus" in c) { try { c.navigate(url); } catch (_e) {} return c.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
