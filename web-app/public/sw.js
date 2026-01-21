// Service Worker for Gym Bro PWA
const CACHE_NAME = 'gymbro-v1';
const STATIC_CACHE_NAME = 'gymbro-static-v1';
const API_CACHE_NAME = 'gymbro-api-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/dashboard',
    '/login',
    '/manifest.json',
    '/logo.png'
];

// API routes to cache for offline use
const CACHEABLE_API_ROUTES = [
    '/api/profile',
    '/api/routines',
    '/api/diet',
    '/api/billing/status'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE_NAME &&
                        cacheName !== API_CACHE_NAME &&
                        cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip cross-origin requests
    if (url.origin !== location.origin) return;

    // Handle API requests with network-first strategy
    if (url.pathname.startsWith('/api/')) {
        // Only cache specific API routes
        const isCacheable = CACHEABLE_API_ROUTES.some(route =>
            url.pathname.startsWith(route)
        );

        if (isCacheable) {
            event.respondWith(networkFirstWithCache(request, API_CACHE_NAME));
        }
        return;
    }

    // Handle page navigation with network-first strategy
    if (request.mode === 'navigate') {
        event.respondWith(networkFirstWithCache(request, STATIC_CACHE_NAME));
        return;
    }

    // Handle static assets with cache-first strategy
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE_NAME));
});

// Network first, fall back to cache
async function networkFirstWithCache(request, cacheName) {
    try {
        const networkResponse = await fetch(request);

        // Clone response before caching
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // For navigation requests, return cached dashboard
        if (request.mode === 'navigate') {
            const fallback = await caches.match('/dashboard');
            if (fallback) return fallback;
        }

        // Return offline fallback response
        return new Response(
            JSON.stringify({ error: 'You are offline', offline: true }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Cache first, fall back to network
async function cacheFirstWithNetwork(request, cacheName) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Failed to fetch:', request.url);
        return new Response('Offline', { status: 503 });
    }
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data === 'clearCache') {
        caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
                caches.delete(cacheName);
            });
        });
    }
});
