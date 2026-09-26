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

// ---- Qeydlərin açarı (id yoxdursa məzmundan) ----
function xercAcari(g) { return g.id || ['g', g.tamTarix || g.tarix || '', g.tutar, g.kategori, g.hesabId || ''].join('|'); }
function kocurmeAcari(t) { return t.id || ['t', t.tamTarix || t.tarix || '', t.tutar, t.menbeId || '', t.hedefId || '', t.medaxil ? 1 : 0].join('|'); }
function qeydIdUret(p) { return p + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }

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
    netice.push(y && b && JSON.stringify(y) !== JSON.stringify(b) ? y : x);
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
      if (JSON.stringify(y[f]) !== JSON.stringify(b[f])) h[f] = y[f];
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
  const sec = f => JSON.stringify(yerli[f]) !== JSON.stringify(baza[f]) ? yerli[f] : bulud[f];
  const netice = Object.assign({}, bulud, {
    schema: 2,
    kategoriler: sec('kategoriler'),
    gunlukLimit: sec('gunlukLimit'),
    profil: sec('profil'),
    hesablar: hesablarBirlesdir(baza.hesablar, yerli.hesablar, bulud.hesablar),
    giderler: siyahiBirlesdir(baza.giderler, yerli.giderler, bulud.giderler, xercAcari)
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
