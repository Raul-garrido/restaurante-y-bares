const CACHE_NAME = "rb-pwa-v2";
const PRECACHE_URLS = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png",
  "./hero-food.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Solo intercepta peticiones al propio origen (el app shell). Las llamadas a
// Google Maps/Places y a la IA (Gemini/OpenAI) son a otro origen y pasan
// siempre directas a la red, sin caché ni interferencia.
//
// Estrategia: red primero, caché como respaldo (no al revés). Con
// cache-first un usuario que ya hubiera abierto la PWA una vez se quedaría
// viendo la version vieja para siempre, aunque hubiera una actualización
// publicada y tuviera conexión — el Service Worker nunca volvería a pedir
// el archivo porque ya "estaba en caché". Con red-primero, si hay conexión
// siempre se coge la versión más reciente (y se actualiza la caché de
// paso); solo se usa la copia guardada si falla la red (modo offline real).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    // cache: 'no-store' es imprescindible aquí -- GitHub Pages sirve con
    // Cache-Control: max-age=600, y sin esto un fetch() normal se conformaba
    // con la respuesta de la caché HTTP del navegador dentro de esos 10
    // minutos, sirviendo una versión vieja aunque "red primero" fuera la
    // intención. Con no-store se fuerza a ir siempre de verdad a la red.
    fetch(req, { cache: "no-store" })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
  );
});
