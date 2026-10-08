const CACHE_NAME = 'lojaexpress-cache-v1';
const RECURSOS_ESSENCIAIS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn-icons-png.flaticon.com/512/3081/3081840.png'
];

// 1. Instalação: grava arquivos estáticos essenciais no Cache Storage
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 [PWA] Armazenando recursos vitais no cache...');
      return cache.addAll(RECURSOS_ESSENCIAIS);
    })
  );
  self.skipWaiting();
});

// 2. Ativação: limpa versões antigas de caches se o app for atualizado
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) => {
      return Promise.all(
        chaves.map((chave) => {
          if (chave !== CACHE_NAME) {
            console.log('🧹 [PWA] Removendo cache antigo:', chave);
            return caches.delete(chave);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interceptação de Rede (Fetch): se não houver internet, responde a partir do cache
self.addEventListener('fetch', (evento) => {
  evento.respondWith(
    caches.match(evento.request).then((respostaCache) => {
      return respostaCache || fetch(evento.request).catch(() => {
        // Fallback defensivo para quando o usuário estiver offline
        if (evento.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});