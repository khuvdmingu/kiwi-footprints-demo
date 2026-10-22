// 발자국 한글 서비스 워커 — 한 번 받은 파일을 기기에 저장해 두고, 인터넷이 없어도 거기서 꺼내 준다.
//  - 첫 화면(index.html): 인터넷 먼저, 안 되면 저장본 → 새 버전을 올리면 다음에 열 때 바로 보인다.
//  - 나머지(모듈·그림·소리): 저장본 먼저, 없으면 받아서 저장 → 그림 23MB를 한꺼번에 받지 않고 본 것만 쌓인다.
//  - 저장 이름에 버전이 들어간다. 새 버전이 켜지면 옛 저장분은 통째로 지운다.
//    VERSION 은 tools/deploy-demo.sh 가 배포 버전(예: v18.0.0)으로 바꿔 넣는다.
const VERSION = 'v28.10.0';
const CACHE = 'kiwi-footprints-' + VERSION;

self.addEventListener('install', e => {
  // 하나라도 못 받으면 설치 전체가 실패하므로 따로따로 (폴더 주소 './' 를 index.html 로 안 돌려주는 서버도 있다)
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(['./', './index.html', './manifest.webmanifest'].map(u => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('kiwi-footprints-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 같은 주소에서 온 GET 만 다룬다 (외부 요청·소리 일부 받기(Range)는 그냥 통과)
const mine = req => req.method === 'GET' && new URL(req.url).origin === location.origin && !req.headers.has('range');

async function store(req, res) {
  if (res && res.ok && res.type === 'basic') (await caches.open(CACHE)).put(req, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (!mine(req)) return;
  if (req.mode === 'navigate') {
    // GitHub Pages 는 첫 화면을 길에서 최대 10분 붙잡고 있어(브라우저·CDN 캐시) 새 버전을 올려도 옛 화면이 열렸다 (v18.3.2)
    //  → 매번 꼬리표를 붙여 서버에서 새로 받는다. 첫 화면 한 장(약 15KB)뿐이라 부담이 없다
    const u = new URL(req.url); u.searchParams.set('_sw', Date.now());
    e.respondWith(fetch(u, { cache: 'no-store', credentials: 'same-origin' }).then(res => store(req, res))
      .catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => store(req, res))));
});

// 서비스 워커가 켜지기 전에 페이지가 이미 받은 파일(첫 방문)을 뒤늦게 저장한다 — 페이지가 목록을 보내 준다
self.addEventListener('message', e => {
  if (e.data?.type !== 'warm' || !Array.isArray(e.data.urls)) return;
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(e.data.urls
    .filter(u => { try { return new URL(u).origin === location.origin; } catch { return false; } })
    .map(async u => { if (!(await c.match(u))) { try { const r = await fetch(u); if (r.ok) await c.put(u, r); } catch {} } }))));
});
