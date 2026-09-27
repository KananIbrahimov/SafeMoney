/* Safe Money — oflayn rejim və birləşdirmə (v3.20)
   1) Telefonda saxlanan nüsxə: buluddan son təsdiqlənmiş vəziyyət ("baza") + hələ göndərilməmiş yerli vəziyyət.
      İnternet yoxkən yazılan xərclər tətbiq bağlansa belə itmir; internet gələndə özü göndərilir.
   2) Birləşdirmə (3 tərəfli): iki cihaz eyni vaxtda dəyişiklik edəndə heç birinin dəyişikliyi atılmır —
      baza ilə müqayisədə yerli tərəfdə nə əlavə/silinib/dəyişibsə, buluddakı ən son vəziyyətin üzərinə tətbiq olunur.
      Hesab balansları "fərq" kimi birləşir (məs. burada −20, orada −30 → buludda −50). */

let bazaData = null; // buluddan son təsdiqlənmiş data (birləşdirmə üçün əsas)

function oflaynAcar() { return senkronKey ? 'sm_yerli_' + senkronKey : null; }
function jsonKopya(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }

function bazaTeyinEt(data, rev) {
  bazaData = jsonKopya(data);
  oflaynYaz({ baza: bazaData, bazaRev: rev, yerli: yerliDeyisiklikVar() ? driveBackupVerisi() : null });
}
function oflaynOxu() {
  const a = oflaynAcar(); if (!a) return null;
  try { return JSON.parse(localStorage.getItem(a) || 'null'); } catch (e) { return null; }
}
function oflaynYaz(obj) {
  const a = oflaynAcar(); if (!a || demoRejim) return;
  try { localStorage.setItem(a, JSON.stringify(Object.assign({ vaxt: new Date().toISOString() }, obj))); }
  catch (e) { console.warn('[oflayn] telefonda saxlamaq alınmadı:', e); }
}
// Hər yerli dəyişiklikdən sonra: göndərilməmiş vəziyyəti telefonda saxla
function oflaynDeyisiklikSaxla() {
  if (!senkronKey || demoRejim || !veriMenbeGuvenli) return;
  oflaynYaz({ baza: bazaData, bazaRev, yerli: driveBackupVerisi() });
  oflaynGostericiYenile();
}
// Uğurlu yazmadan sonra: gözləyən yoxdur, yazılan data yeni bazadır
function oflaynYazildi(yazilanData, rev) {
  bazaData = jsonKopya(yazilanData);
  oflaynYaz({ baza: bazaData, bazaRev: rev, yerli: yerliDeyisiklikVar() ? driveBackupVerisi() : null });
  oflaynGostericiYenile();
}
function oflaynSil(uid) {
  try { localStorage.removeItem('sm_yerli_' + (uid || senkronKey)); } catch (e) {}
}

// ---- Qeydlərin açarı (id yoxdursa məzmundan hesablanan sabit id) ----
function metnHeshi(s) {
  let h = 5381; s = String(s || '');
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
function xercAcari(g) { return g.id || 'g_' + metnHeshi(['g', g.tamTarix || g.tarix || '', g.tutar, g.kategori, g.hesabId || ''].join('|')); }
function kocurmeAcari(t) { return t.id || 't_' + metnHeshi(['t', t.tamTarix || t.tarix || '', t.tutar, t.menbeId || '', t.hedefId || '', t.medaxil ? 1 : 0].join('|')); }
// Köhnə (id-siz) qeydlərə id verilir — id məzmundan hesablandığı üçün hər cihazda eyni olur. Əvvəl açar
// məzmundan qurulurdu: köhnə xərcin kateqoriyası/məbləği dəyişəndə birləşmə onu yeni qeyd sayıb ikiləşdirirdi.
function qeydIdleriniTemin(list, acarFn) {
  if (!Array.isArray(list)) return list;
  const gorulen = new Set();
  list.forEach(x => {
    if (!x || typeof x !== 'object') return;
    if (!x.id) { const a = acarFn(x); x.id = gorulen.has(a) ? qeydIdUret(a.slice(0, 1)) : a; }
    gorulen.add(x.id);
  });
  return list;
}
function qeydIdUret(p) { return p + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
// Açar sırasından asılı olmayan müqayisə. Firestore sahələri öz sırası ilə qaytarır — adi JSON.stringify
// eyni məzmunu "fərqli" sayırdı və birləşmədə yerli versiya səbəbsiz qalib gəlirdi.
function kanonik(x) {
  if (Array.isArray(x)) return '[' + x.map(kanonik).join(',') + ']';
  if (x && typeof x === 'object') return '{' + Object.keys(x).filter(k => x[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + kanonik(x[k])).join(',') + '}';
  return JSON.stringify(x === undefined ? null : x);
}
function eyniDir(a, b) { return kanonik(a) === kanonik(b); }

// ---- Kateqoriya id-ləri ----
// Xərclər kateqoriyaya adı ilə bağlıdır. Ad dəyişəndə iki cihazın birləşməsində köhnə adlı xərclər "Digər"ə
// düşməsin deyə hər kateqoriyanın dəyişməyən id-si var. Id-si olmayan (köhnə) kateqoriyaya id adından
// hesablanır — beləcə hər cihaz eyni id-ni alır.
function katIdHesabla(ad) { return 'k_' + metnHeshi(ad); }
function kategoriIdleriniTemin(list) {
  if (!Array.isArray(list)) return list;
  const gorulen = new Set();
  list.forEach(k => {
    if (!k || typeof k !== 'object') return;
    if (typeof k.id !== 'string' || !k.id || gorulen.has(k.id)) {
      const h = katIdHesabla(k.ad);
      k.id = gorulen.has(h) ? qeydIdUret('k') : h;
    }
    gorulen.add(k.id);
  });
  return list;
}

// Siyahı birləşdirmə: yerli əlavələr, silinmələr və dəyişikliklər buludun üzərinə
function siyahiBirlesdir(baza, yerli, bulud, acar) {
  baza = Array.isArray(baza) ? baza : []; yerli = Array.isArray(yerli) ? yerli : []; bulud = Array.isArray(bulud) ? bulud : [];
  const bMap = new Map(baza.map(x => [acar(x), x]));
  const yMap = new Map(yerli.map(x => [acar(x), x]));
  const silinen = new Set([...bMap.keys()].filter(k => !yMap.has(k)));
  const netice = [];
  const var_ = new Set();
  bulud.forEach(x => {
    const k = acar(x);
    if (silinen.has(k) || var_.has(k)) return;
    const y = yMap.get(k), b = bMap.get(k);
    // yerli tərəfdə dəyişibsə (id eyni, məzmun fərqli) — yerli versiya
    netice.push(y && b && !eyniDir(y, b) ? y : x);
    var_.add(k);
  });
  yerli.forEach(x => { const k = acar(x); if (!bMap.has(k) && !var_.has(k)) { netice.push(x); var_.add(k); } });
  return netice;
}

// Hesab birləşdirmə: balans və taksit sayları fərq kimi, digər sahələr yerli dəyişibsə yerli
function hesablarBirlesdir(baza, yerli, bulud) {
  if (!Array.isArray(bulud)) return yerli;
  if (!Array.isArray(baza)) return bulud;
  const bMap = new Map(baza.map(h => [h.id, h]));
  const yMap = new Map((yerli || []).map(h => [h.id, h]));
  const eded = v => (typeof v === 'number' && isFinite(v)) ? v : 0;
  const netice = [];
  bulud.forEach(c => {
    const b = bMap.get(c.id), y = yMap.get(c.id);
    if (b && !y) return; // yerli silinib
    if (!b || !y) { netice.push(c); return; } // buludda yenidir və ya yerli toxunulmayıb
    const h = Object.assign({}, c);
    Object.keys(y).forEach(f => {
      if (['balans', 'odenmisTaksitSayi', 'elaveOdenis', 'ana'].indexOf(f) !== -1) return;
      if (!eyniDir(y[f], b[f])) h[f] = y[f];
    });
    h.balans = pulYuvarla(eded(c.balans) + eded(y.balans) - eded(b.balans));
    if (h.tip === 'krediXett') {
      h.odenmisTaksitSayi = Math.max(0, Math.min(eded(h.taksitSayi), eded(c.odenmisTaksitSayi) + eded(y.odenmisTaksitSayi) - eded(b.odenmisTaksitSayi)));
      h.elaveOdenis = Math.max(0, pulYuvarla(eded(c.elaveOdenis) + eded(y.elaveOdenis) - eded(b.elaveOdenis)));
    }
    netice.push(h);
  });
  (yerli || []).forEach(y => { if (!bMap.has(y.id) && !netice.some(h => h.id === y.id)) netice.push(y); });
  // ⭐ əsas hesab: yerli seçim dəyişibsə yerli seçim qalib gəlir
  const anaId = arr => { const a = (arr || []).find(h => h.ana); return a ? a.id : null; };
  if (anaId(yerli) !== anaId(baza) && (anaId(yerli) === null || netice.some(h => h.id === anaId(yerli)))) {
    netice.forEach(h => { h.ana = h.id === anaId(yerli); });
  }
  return netice;
}

// baza: son ortaq vəziyyət, yerli: bu cihaz, bulud: digər cihazın yazdığı son vəziyyət
function dataBirlesdir(baza, yerli, bulud) {
  if (!bulud) return yerli;
  if (!baza) return bulud; // ortaq nöqtə məlum deyil — təhlükəsiz seçim: bulud
  [baza, yerli, bulud].forEach(t => kategoriIdleriniTemin(t.kategoriler));
  const sec = f => !eyniDir(yerli[f], baza[f]) ? yerli[f] : bulud[f];
  const katlar = sec('kategoriler');
  // Ad dəyişiklikləri: hansı tərəfdə olursa olsun, həmin id-li kateqoriyanın son adına köçürülür
  const sonAd = new Map((Array.isArray(katlar) ? katlar : []).map(k => [k.id, k.ad]));
  const sonAdlar = new Set(sonAd.values());
  const adXerite = {};
  [baza, yerli, bulud].forEach(t => (Array.isArray(t.kategoriler) ? t.kategoriler : []).forEach(k => {
    const yeni = k && sonAd.get(k.id);
    if (yeni && yeni !== k.ad && !sonAdlar.has(k.ad)) adXerite[k.ad] = yeni;
  }));
  const adKocur = g => (g && adXerite[g.kategori]) ? Object.assign({}, g, { kategori: adXerite[g.kategori] }) : g;
  const netice = Object.assign({}, bulud, {
    schema: 2,
    kategoriler: katlar,
    gunlukLimit: sec('gunlukLimit'),
    valyuta: sec('valyuta'),
    profil: sec('profil'),
    hesablar: hesablarBirlesdir(baza.hesablar, yerli.hesablar, bulud.hesablar),
    giderler: siyahiBirlesdir(baza.giderler, yerli.giderler, bulud.giderler, xercAcari).map(adKocur)
      .sort((a, b) => new Date(b.tamTarix || 0) - new Date(a.tamTarix || 0)),
    hesabTransferleri: siyahiBirlesdir(baza.hesabTransferleri, yerli.hesabTransferleri, bulud.hesabTransferleri, kocurmeAcari)
      .sort((a, b) => new Date(b.tamTarix || 0) - new Date(a.tamTarix || 0)),
    backupTarixi: new Date().toISOString()
  });
  return netice;
}

// ---- Göstərici: "Oflayn — dəyişikliklər telefonda saxlanıb" ----
let oflaynYazmaXetasi = false;
function oflaynGostericiYenile() {
  const gozleyir = typeof yerliDeyisiklikVar === 'function' && yerliDeyisiklikVar();
  const oflayn = !navigator.onLine || oflaynYazmaXetasi;
  let el = document.getElementById('oflaynPill');
  if (!(oflayn && veriYuklendi && !demoRejim && senkronKey)) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'oflaynPill';
    el.className = 'oflayn-pill';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.innerHTML = `<span class="op-noqte"></span><span>${escapeHtml(gozleyir
    ? tr('oflayn.gozleyir', 'Oflayn — dəyişikliklər telefonda saxlanıb')
    : tr('oflayn.aktiv', 'Oflayn — internet yoxdur'))}</span>`;
}
window.addEventListener('online', () => {
  oflaynYazmaXetasi = false;
  oflaynGostericiYenile();
  if (typeof yerliDeyisiklikVar === 'function' && yerliDeyisiklikVar() && veriMenbeGuvenli) firebaseYazPlanla();
});
window.addEventListener('offline', oflaynGostericiYenile);
