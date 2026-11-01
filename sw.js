/* =========================================================
   SERVICE WORKER — hace que la app funcione sin internet
   ---------------------------------------------------------
   Es un archivo JavaScript que el navegador corre "aparte" de la página.
   Se para en el medio de cada pedido de archivos: si el archivo está
   guardado en la caché, lo devuelve desde ahí sin ir a internet.

   IMPORTANTE: cada vez que cambies algún archivo de la app (HTML, CSS,
   JS, íconos), subí el número de VERSION. Así el celular se entera de
   que hay archivos nuevos y los vuelve a descargar.
   Y si agregás un archivo .js nuevo, sumalo a la lista ARCHIVOS.
   ========================================================= */

const VERSION = 'v7';
const CACHE = `gym-metrics-${VERSION}`;

// Todo lo que la app necesita para funcionar sin conexión
const ARCHIVOS = [
  './',
  './index.html',
  './css/estilos.css',
  './js/app.js',
  './js/almacen.js',
  './js/respaldo.js',
  './js/pwa.js',
  './js/utiles.js',
  './js/ejercicios.js',
  './js/pantalla-ejercicios.js',
  './js/sesiones.js',
  './js/pantalla-entrenar.js',
  './js/hojas-sesion.js',
  './js/navegacion.js',
  './js/pantalla-historial.js',
  './js/progreso.js',
  './js/graficos.js',
  './js/pantalla-progreso.js',
  './js/csv.js',
  './manifest.json',
  './iconos/icono-192.png',
  './iconos/icono-512.png',
  './iconos/icono-maskable-512.png',
  './iconos/apple-touch-icon.png',
  './iconos/favicon.png'
];

// 1. INSTALACIÓN: descarga y guarda todos los archivos
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then(cache =>
      // cache: 'reload' = pedirlos frescos al servidor, sin usar copias viejas del navegador
      cache.addAll(ARCHIVOS.map(url => new Request(url, { cache: 'reload' })))
    )
  );
  self.skipWaiting(); // que la versión nueva se active sin esperar
});

// 2. ACTIVACIÓN: borra las cachés de versiones viejas
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then(nombres => Promise.all(
        nombres.filter(n => n !== CACHE).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim()) // tomar control de las pestañas abiertas
  );
});

// 3. CADA PEDIDO: primero la caché; si no está, internet
self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;

  evento.respondWith(
    caches.match(evento.request, { ignoreSearch: true })
      .then(guardado => guardado || fetch(evento.request))
  );
});
