const CACHE_NAME = 'habit-tracker-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html', 
  './app.js',
  './auth.js',
  './firebase.js',
  './manifest.json'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('Service Worker installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('Cache addAll error:', err))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
          return null;
        })
      );
    }).then(() => {
      console.log('Service Worker: Now controlling the page');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip Firebase API requests
  if (event.request.url.includes('firebasestorage.googleapis.com') || 
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('firebase-auth') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  // Handle the fetch event
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Add to cache for future
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(err => console.error('Cache put error:', err));

            return response;
          })
          .catch(err => {
            console.error('Fetch failed:', err);
            // Return a simple offline page or message if needed
          });
      })
  );
});