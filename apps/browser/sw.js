const CACHE = "framecast-v2";
const SHELL = [
	"./",
	"index.html",
	"styles.css",
	"manifest.webmanifest",
	"favicon.ico",
	"js/app.js",
	"js/capture.js",
	"js/compositor-worker.js",
	"js/draw.js",
	"js/editor.js",
	"js/floating.js",
	"js/store.js",
	"fonts/geist-sans-latin-400-normal.woff2",
	"fonts/geist-sans-latin-600-normal.woff2",
	"icons/icon.svg",
	"icons/icon-192.png",
	"icons/icon-512.png",
	"sounds/start-recording.ogg",
	"sounds/stop-recording.ogg",
	"sounds/action.ogg",
	"sounds/screenshot.ogg",
];

self.addEventListener("install", (e) => {
	e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
	self.skipWaiting();
});

self.addEventListener("activate", (e) => {
	e.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (e) => {
	if (
		e.request.method !== "GET" ||
		new URL(e.request.url).origin !== location.origin
	)
		return;
	e.respondWith(
		fetch(e.request)
			.then((res) => {
				if (res.ok) {
					const copy = res.clone();
					caches.open(CACHE).then((c) => c.put(e.request, copy));
				}
				return res;
			})
			.catch(() =>
				caches
					.match(e.request)
					.then((hit) => hit || caches.match("index.html")),
			),
	);
});
