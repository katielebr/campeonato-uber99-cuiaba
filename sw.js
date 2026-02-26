const CACHE_NAME = 'ranking-app-v23';
const STATIC_ASSETS = [
    './',
    './index.html',
    './css/style.css?v=23',
    './js/app.js?v=99',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Install: cache all static and external assets
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Take over immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // Cache static assets first
            await cache.addAll(STATIC_ASSETS);

            // Cache external assets (don't fail install if CDN is down)
            for (const url of EXTERNAL_ASSETS) {
                try {
                    const response = await fetch(url, { mode: 'cors' });
                    if (response.ok) {
                        await cache.put(url, response);
                    }
                } catch (e) {
                    console.warn('Could not cache external asset:', url, e);
                }
            }

            // Try to cache Google Fonts CSS and the font files it references
            try {
                const fontCssUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
                const fontCssResponse = await fetch(fontCssUrl, { mode: 'cors' });
                if (fontCssResponse.ok) {
                    const cssText = await fontCssResponse.clone().text();
                    // Extract font file URLs from the CSS
                    const fontUrls = cssText.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g);
                    if (fontUrls) {
                        for (const fontUrl of fontUrls) {
                            const url = fontUrl.replace(/url\(|\)/g, '');
                            try {
                                const fontResponse = await fetch(url, { mode: 'cors' });
                                if (fontResponse.ok) {
                                    await cache.put(url, fontResponse);
                                }
                            } catch (e) {
                                console.warn('Could not cache font file:', url);
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('Could not cache Google Fonts:', e);
            }
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: cache-first for assets, network-first for navigation
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // For navigation requests (HTML pages) - network first
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, clone);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then((cached) => {
                        return cached || caches.match('./index.html');
                    });
                })
        );
        return;
    }

    // For all other requests - cache first, then network
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                // Return cache, but also update in background
                fetch(request)
                    .then((response) => {
                        if (response.ok) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, response);
                            });
                        }
                    })
                    .catch(() => { });
                return cached;
            }

            // Not in cache, try network
            return fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Return nothing for failed requests that aren't in cache
                    return new Response('', { status: 408, statusText: 'Offline' });
                });
        })
    );
});
