const CACHE_NAME = 'habit-tracker-v2';
const APP_SHELL = [
  './',
  './index.html', 
  './app.js',
  './auth.js',
  './firebase.js',
  './dataManager.js',
  './manifest.json'
];

// Dynamic cache for other resources
const DYNAMIC_CACHE = 'habit-tracker-dynamic-v1';

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  // Ensure the service worker becomes active right away
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(APP_SHELL);
      })
      .catch(err => console.error('Cache addAll error:', err))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  // Take control of all clients immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      
      // Remove old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
            return null;
          })
        );
      })
    ])
  );
});

// Helper function to determine if a request should be cached
function shouldCache(url) {
  // Don't cache Firebase API requests or auth
  if (url.includes('firebasestorage.googleapis.com') || 
      url.includes('firebaseio.com') ||
      url.includes('firebase-auth') ||
      url.includes('googleapis.com')) {
    return false;
  }
  
  // Don't cache other third-party APIs
  if (url.includes('cdn') || 
      url.includes('api.') || 
      url.includes('analytics')) {
    return false;
  }
  
  return true;
}

// Network first, falling back to cache strategy
async function networkFirstWithCache(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // If successful and cacheable, update cache
    if (networkResponse.ok && shouldCache(request.url)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    
    // Return cached response or a fallback
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // For HTML requests, return the offline page
    if (request.headers.get('Accept').includes('text/html')) {
      return caches.match('./index.html');
    }
    
    // If nothing else works, throw the error
    throw error;
  }
}

// Cache first, falling back to network strategy (for static assets)
async function cacheFirstWithNetwork(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If not in cache, get from network
  try {
    const networkResponse = await fetch(request);
    
    // Update cache
    if (networkResponse.ok && shouldCache(request.url)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // If it's an HTML request and we can't get it, return offline page
    if (request.headers.get('Accept').includes('text/html')) {
      return caches.match('./index.html');
    }
    
    throw error;
  }
}

// Fetch event - apply different strategies based on request type
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Skip Firebase API requests
  if (!shouldCache(event.request.url)) {
    return;
  }
  
  // For page navigations, use network-first strategy
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstWithCache(event.request));
    return;
  }
  
  // For app shell assets, use cache-first
  if (APP_SHELL.includes(url.pathname) || 
      event.request.url.match(/\.(js|css|png|jpg|svg)$/)) {
    event.respondWith(cacheFirstWithNetwork(event.request));
    return;
  }
  
  // For everything else, use network-first
  event.respondWith(networkFirstWithCache(event.request));
});

// Listen for messages from clients
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Send a message to the client to trigger data sync
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_REQUIRED'
          });
        });
      })
    );
  }
});