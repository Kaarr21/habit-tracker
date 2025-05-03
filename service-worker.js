// service-worker.js - Updated for better offline functionality

const CACHE_NAME = 'lifestyle-tracker-v1';
const DYNAMIC_CACHE = 'lifestyle-tracker-dynamic-v1';

// Assets to cache immediately during installation
const APP_ASSETS = [
  './',
  './index.html',
  './app.js',
  './auth.js',
  './dataManager.js',
  './firebase.js',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js',
  'https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js'
];

// Install event - cache our basic assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching app assets');
      return cache.addAll(APP_ASSETS);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...');
  
  // Claim clients to ensure the SW controls all clients immediately
  event.waitUntil(clients.claim());
  
  // Delete old caches
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  
  return self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and Firebase API requests
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response;
      }
      
      // Otherwise fetch from network
      return fetch(event.request)
        .then((fetchResponse) => {
          // Don't cache non-successful responses
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }
          
          // Cache dynamic content for future offline use
          const responseToCache = fetchResponse.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
            
          return fetchResponse;
        })
        .catch(() => {
          // If both cache and network fail, return a fallback for HTML
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
          
          // For other resources, we just have to fail
          return new Response('Not available offline');
        });
    })
  );
});

// Handle sync events for background data uploading
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Sync', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Notify all clients to try syncing their data
      self.clients.matchAll().then((clients) => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_REQUIRED'
          });
        });
      })
    );
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Notification received', event);
  
  let data = { title: 'New message', content: 'Something happened!' };
  
  if (event.data) {
    data = JSON.parse(event.data.text());
  }
  
  const options = {
    body: data.content,
    icon: './icon-192x192.png',
    badge: './icon-96x96.png',
    data: {
      openUrl: data.openUrl
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});