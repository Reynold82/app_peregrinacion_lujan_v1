const CACHE_NAME = 'lujan-2026-v2';

// Recursos críticos para precachear inmediatamente en la instalación
const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// Instalación: Precarga el shell básico de la aplicación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activación: Limpia cachés antiguas y toma el control inmediato de todos los clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Intercepción de Fetch: Estrategia híbrida optimizada para PWA Offline
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Solo gestionar peticiones GET
  if (request.method !== 'GET') {
    return;
  }

  // No almacenar el archivo comprimido del proyecto en la caché del service worker
  if (request.url.includes('proyecto_lujan.tar.gz')) {
    return;
  }

  const url = new URL(request.url);

  // 1. Navegación (HTML / Páginas): Network First con Fallback inmediato al Cache Shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return (await caches.match('/')) || (await caches.match('/index.html'));
        })
    );
    return;
  }

  // 2. Assets estáticos generados por Vite (JS, CSS, SVGs, Fuentes): Cache First con actualización en segundo plano
  const isStaticAsset = (
    url.origin === self.location.origin && (
      url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.woff2')
    )
  );

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Si está en caché, servirlo inmediatamente para velocidad instantánea
          return cachedResponse;
        }

        // Si no está, buscar en red y guardar en caché para la próxima vez
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Peticiones externas o fuentes de Google Fonts (Stale-While-Revalidate)
  if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => null);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 4. Resto de peticiones: Network first con fallback a caché
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
