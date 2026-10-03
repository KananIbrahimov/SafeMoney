// Safe Money — Service Worker
// Tətbiqin öz fayllarını offline üçün keşləyir. Xarici kitabxanalardan yalnız Firebase və Chart.js-in
// versiyalı faylları NETWORK-FIRST keşlənir (internet yoxkən tətbiq açılsın); digər xarici sorğulara
// (Google Drive, Firestore, giriş) toxunulmur.

// VACİB: Hər yeni versiya buraxdıqda bu adı artır (v3 → v4 → v5 ...).
// Bu, köhnə keşin avtomatik təmizlənməsini təmin edir.
// (v27: Çox hesablı sistem (js/hesablar.js): ⭐ əsas hesab, bank/kart, mənfi balans icazəsi, hesabat tiki, kredit ödənişi, aylıq əməliyyatlar.)
// (v26: Loqo SM monoqramına dəyişdi (hərfli), brend şrifti fonts/brand.woff.)
// (v25: Yeni premium loqo (qrafit + gümüşü seyf çarxı) və 'SAFE MONEY' yazısı; ikonlar yeniləndi.)
// (v24: Başlıqlar 3 dildə aydınlaşdırıldı (Borclar, Hesabat); 'Bu ay gündə orta' düzgün hesablanır.)
// (v23: Son əməliyyatlar — kateqoriya və tarix aralığı filtri; keçmiş tarixə xərc düyməsi bura köçdü.)
// (v22: Premium Graphite & Silver tema, SVG ikonlar; keçmiş günün xərcləri yalnız baxış; Ayarlar yenidən quruldu.)
// (v21: Rus dili (lang/ru.json) əlavə edildi; AZ/EN mətnlər yenidən yazıldı; bütün sabit mətnlər tərcümə açarlarına keçdi.)
// (v20: Test düzəlişləri — tema ilk basış, günün xərcləri siyahısı, pul yuvarlaqlaşdırma, köhnə kateqoriya datası, xəbərdarlıq pəncərəsi, EN mətnlər.)
// (v19: Ana ekranda itmiş "Günün xərcləri" (#giderListesi) siyahısı bərpa edildi.)
// (v18: CSS/JS ayrı fayllara bölündü; css/ və js/ network-first keş.)
// (v17: GitHub API avtomatik dil sorğusu silindi; Drive GIS yalnız əl ilə bağlananda yüklənir.)
// (v16: Faz 5 — lang/en.json (İngilis dili) əlavə edildi.)
// (v15: Faz 7 — boş tərcümə dəyəri az mətninə düşür; lang/template.json + YENI-DIL-ELAVE-ETMEK.md əlavə edildi.)
// (v14: Faz 6 — lang/languages.json (əl ilə ehtiyat dil siyahısı) keşə əlavə edildi;
//  GitHub API sorğusu artıq 24 saatda bir edilir, saatlik 60 limiti qorunur.)
// (v13: lang/index.json (dil siyahısı) keşə əlavə edildi; dil kodu doğrulaması.)
// (v12: Faz 4-5 — statik HTML + hesablar/transfer mətnləri tərcümə açarlarına keçdi.)
// (v10: dil faylları (lang/*.json) üçün network-first əlavə edildi.)
// (v9: ad "Safe Money" olaraq dəyişdi və yeni logo əlavə edildi — köhnə keşlənmiş
// ikonların/title-ın istifadəçilərdə qalmaması üçün versiya artırıldı.)
// (v35: v33-də əlavə olunan Firebase/Chart.js keşi geri alındı — bəzi hallarda kitabxanalar yüklənmirdi və
//  giriş işləmirdi. Xarici kitabxanaları yenə brauzer özü yükləyir.)
// KananTest ilə eyni domendə işlədiyi üçün keş adı fərqli prefikslə başlayır.
const CACHE_PREFIKS = 'safemoney-app-cache-';
// (v51: Firebase/Chart.js NETWORK-FIRST keşi — yalnız tam (CORS, 200) cavab keşlənir, keşdən yalnız şəbəkə
//  xətasında verilir. v33-dəki problem: keş-first + no-cors (opaque) cavablar idi — pozulmuş cavab keşdə
//  qalıb girişi sındırırdı. İnternet olanda davranış brauzerin öz yükləməsi ilə eynidir.)
const CACHE_ADI = CACHE_PREFIKS + 'v62';
// Xarici kitabxanalar ayrıca keşdə saxlanılır (versiya nömrəli ünvanlar); "Tətbiqi yenilə" bunu silmir.
// Ad KananTest-in keşindən fərqlidir (eyni domen).
const CDN_KESH = 'safemoney-app-cdn-v1';
const CDN_FAYLLAR = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js'
];

const KESLENECEK_FAYLLAR = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './css/main.css',
  './css/components.css',
  './css/huquqi.css',
  './js/huquqi.js',
  './privacy.html',
  './terms.html',
  './fonts/brand.woff',
  './js/config.js',
  './js/ui.js',
  './js/auth.js',
  './js/sync.js',
  './js/storage.js',
  './js/hesablar.js',
  './js/oflayn.js',
  './js/app.js',
  './js/tur.js',
  './js/kurulum.js',
  './lang/az.json',
  './lang/en.json',
  './lang/ru.json',
  './lang/tr.json',
  './lang/index.json',
  './lang/languages.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_ADI).then((cache) => {
      // Hər faylı AYRI-AYRI yüklə: biri uğursuz olsa, digərləri keşlənə bilsin.
      return Promise.all(
        KESLENECEK_FAYLLAR.map((f) =>
          cache.add(new Request(f, { cache: 'reload' })).catch((e) => console.warn('[SW] Keş xətası:', f, e))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((adlar) =>
      Promise.all(adlar.filter((ad) => ad.startsWith(CACHE_PREFIKS) && ad !== CACHE_ADI).map((ad) => caches.delete(ad))) // yalnız öz köhnə keşlərimiz; KananTest-in keşinə toxunmuruq
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Firebase / Chart.js kitabxanaları: NETWORK-FIRST, CORS rejimində (cavabın tam olduğu yoxlanıla bilsin).
  if (event.request.method === 'GET' && CDN_FAYLLAR.indexOf(event.request.url) !== -1) {
    const u = event.request.url;
    event.respondWith(
      fetch(u, { mode: 'cors', credentials: 'omit' })
        .then((cavab) => {
          if (cavab && cavab.ok && cavab.type === 'cors') {
            const kopya = cavab.clone();
            caches.open(CDN_KESH).then((c) => c.put(u, kopya)).catch(() => {});
            return cavab;
          }
          return fetch(event.request); // gözlənilməz cavab — brauzerin adi sorğusu
        })
        .catch(() => caches.open(CDN_KESH).then((c) => c.match(u)).then((k) => k || fetch(event.request)))
    );
    return;
  }

  // Qalan xarici sorğulara (Firestore, Google Drive, giriş) toxunmuruq; yalnız öz origin-imizdəki GET sorğuları.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // HTML naviqasiya sorğuları üçün NETWORK-FIRST:
  // GitHub Pages cavabı brauzerin HTTP keşində ~10 dəq saxlaya bilər, ona görə
  // cache:'no-store' ilə HƏMİŞƏ serverdən təzə versiyanı çəkirik.
  // Yalnız internet yoxdursa keşdən veririk.
  // Yalnız tətbiqin öz səhifəsi (index.html) — privacy.html / terms.html kimi səhifələr adi qaydada açılır
  // (əks halda onların cavabı index.html kimi keşə yazılıb oflayn açılışı pozurdu).
  const tetbiqSehifesi = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (event.request.mode === 'navigate' && tetbiqSehifesi) {
    event.respondWith(
      fetch(event.request.url, { cache: 'no-store' })
        .then((cavab) => {
          if (cavab && cavab.ok) {
            const kopya = cavab.clone();
            caches.open(CACHE_ADI).then((cache) => cache.put('./index.html', kopya));
          }
          return cavab;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Dil, CSS və JS: NETWORK-FIRST — yeni kod dərhal görünsün; internet yoxdursa keşdən.
  // cache:'no-cache' — brauzerin HTTP keşi (GitHub Pages ~10 dəq) köhnə JS-i verməsin: HTML yeni, JS köhnə
  // olanda düymələr "funksiya tapılmadı" xətası verirdi. Server dəyişməyibsə cavab qısa 304 olur.
  if (url.pathname.includes('/lang/') || url.pathname.includes('/css/') || url.pathname.includes('/js/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((cavab) => {
          if (cavab && cavab.ok) {
            const kopya = cavab.clone();
            caches.open(CACHE_ADI).then((cache) => cache.put(event.request, kopya));
          }
          return cavab;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Digər öz resurslarımız (manifest, ikonlar) üçün CACHE-FIRST.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const shebekeden = fetch(event.request)
        .then((cavab) => {
          if (cavab && cavab.ok) {
            const kopya = cavab.clone();
            caches.open(CACHE_ADI).then((cache) => cache.put(event.request, kopya));
          }
          return cavab;
        })
        .catch(() => cached);
      return cached || shebekeden;
    })
  );
});
