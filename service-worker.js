const CACHE = 'cricket-scorer-v2';
const ASSETS = [
	'./',
	'./index.html',
	'./styles.css',
	'./app.js',
	'./db.js',
	'./cricket.js',
	'./stats.js',
	'./graphs.js',
	'./manifest.webmanifest',
	'./icons/icon-192.png',
	'./icons/icon-512.png',
];

self.addEventListener('install', (e) => {
	e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
	self.skipWaiting();
});

self.addEventListener('activate', (e) => {
	e.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.map((k) => (k !== CACHE ? caches.delete(k) : null))
				)
			)
	);
	self.clients.claim();
});

// Cache-first for everything; will also cache Chart.js CDN after first load.
self.addEventListener('fetch', (e) => {
	e.respondWith(
		caches.match(e.request).then((cached) => {
			if (cached) return cached;
			return fetch(e.request)
				.then((resp) => {
					if (e.request.method === 'GET' && resp.ok) {
						const copy = resp.clone();
						caches.open(CACHE).then((c) => c.put(e.request, copy));
					}
					return resp;
				})
				.catch(() => caches.match('./index.html'));
		})
	);
});
