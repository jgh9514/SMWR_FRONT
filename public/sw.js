/* Chrome/Android PWA 설치 조건: fetch 이벤트 핸들러가 있는 서비스 워커 필요 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
