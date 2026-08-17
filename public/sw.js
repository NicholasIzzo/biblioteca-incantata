/**
 * Service worker: mette in cache l'app per farla partire anche offline.
 *
 * I libri non passano di qui — stanno in IndexedDB, che è già persistente.
 * Questa cache serve solo al guscio dell'applicazione (HTML, JS, CSS, icone).
 *
 * Strategia: rete per prima, cache come rete di salvataggio. Così chi apre
 * l'app riceve sempre la versione aggiornata quando c'è linea, e continua a
 * funzionare quando non c'è.
 */
const CACHE = "biblioteca-incantata-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.add("./")));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const richiesta = e.request;
  if (richiesta.method !== "GET" || !richiesta.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(richiesta)
      .then((risposta) => {
        // copia in cache solo ciò che è andato a buon fine
        if (risposta.ok) {
          const copia = risposta.clone();
          caches.open(CACHE).then((c) => c.put(richiesta, copia));
        }
        return risposta;
      })
      .catch(async () => {
        const salvata = await caches.match(richiesta);
        if (salvata) return salvata;
        // navigazione senza rete: si serve comunque l'app
        if (richiesta.mode === "navigate") {
          const radice = await caches.match("./");
          if (radice) return radice;
        }
        return new Response("Non disponibile offline", { status: 503 });
      }),
  );
});
