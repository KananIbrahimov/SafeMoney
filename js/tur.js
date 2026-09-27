/* Safe Money — qonaq rejimində tanışlıq turu: hər funksiya qısa kartla, müvafiq hissə işıqlandırılır.
   Toxunduqda növbəti addıma keçir. */
const TUR_ADDIMLARI = [
  { sehife: 'ana', hedef: () => [...document.querySelectorAll('#butonlarKonteyneri .cat-btn')].slice(0, 4), acar: 'tur.1', bas: 'Xərclərin qeydiyyatı', metn: 'Kateqoriyaya bir toxunuşla xərc qeydə alınır. Fərqli məbləğ üçün kateqoriya basılı saxlanılır.' },
  { sehife: 'ana', hedef: () => { const t = document.getElementById('toplamTutar'); return t ? (t.closest('.card, .summary-card, section, .ozet-kart') || t.parentElement) : null; }, acar: 'tur.2', bas: 'Günlük xərclərin icmalı', metn: 'Günün ümumi xərci, kateqoriyalar üzrə bölgü və gündəlik limitin icrası.' },
  { sehife: 'hesablar', hedef: () => document.getElementById('hesablarKartlari'), acar: 'tur.3', bas: 'Hesablar', metn: 'Bank kartları və nağd vəsait. Bütün xərclər ⭐ ilə işarələnmiş əsas hesabdan silinir.' },
  { sehife: 'hesablar', hedef: () => document.querySelector('.hesab-emeliyyat-btnlar'), acar: 'tur.4', bas: 'Daxilolmalar və köçürmələr', metn: 'Daxilolmaların (məs. əmək haqqının) qeydiyyatı, hesablararası köçürmələr və kredit ödənişləri.' },
  { sehife: 'dashboard', hedef: () => document.getElementById('dashKart1'), acar: 'tur.5', bas: 'Maliyyə vəziyyəti', metn: 'Aktivlər, öhdəliklər və xalis maliyyə mövqeyi. Hər kredit üzrə ayrıca qrafik.' },
  { sehife: 'aylikHesabat', hedef: () => { const x = document.getElementById('aylikGunlukSarici'); return x ? (x.closest('.pie-card') || x) : null; }, acar: 'tur.6', bas: 'Aylıq hesabat', metn: 'Cari ayın xərc strukturu: gündəlik və sabit xərclər, büdcənin icrası.' },
  { sehife: 'ayarlar', hedef: () => document.querySelector('#ayarlarModal .ayarlar-qrup'), acar: 'tur.7', bas: 'Ayarlar', metn: 'Kateqoriyalar, hesablar, əməliyyat tarixçəsi və axtarış, Google Drive-da ehtiyat nüsxə, tətbiq kilidi.' },
  { sehife: 'ana', hedef: null, acar: 'tur.8', bas: 'Şəxsi hesab', metn: 'Şəxsi hesab yaradıldıqdan sonra bütün məlumatlar yalnız hesab sahibinə məxsus olur.', son: true }
];
let turIndeks = -1;

function turBaslat() {
  if (!demoRejim) return;
  turIndeks = -1;
  let el = document.getElementById('turQat');
  if (!el) {
    el = document.createElement('div');
    el.id = 'turQat';
    el.className = 'tur-qat';
    el.innerHTML = '<div class="tur-isiq" id="turIsiq"></div><div class="tur-kart" id="turKart" role="dialog" aria-live="polite"></div>';
    el.addEventListener('click', (e) => { if (!e.target.closest('button')) turNovbeti(); });
    document.body.appendChild(el);
  }
  el.classList.add('active');
  turNovbeti();
}
function turBitir() {
  const el = document.getElementById('turQat');
  if (el) el.classList.remove('active');
  turIndeks = -1;
  if (typeof sekmeSec === 'function') sekmeSec('ana');
}
function turNovbeti() {
  turIndeks++;
  if (turIndeks >= TUR_ADDIMLARI.length) { turBitir(); return; }
  const a = TUR_ADDIMLARI[turIndeks];
  if (typeof sekmeSec === 'function') sekmeSec(a.sehife);
  const kart = document.getElementById('turKart');
  const say = TUR_ADDIMLARI.length;
  const duymeler = a.son
    ? `<button class="tur-btn tur-esas" onclick="turBitir(); qonaqdanCix();">${escapeHtml(tr('demo.qeydiyyat', 'Hesab yarat'))}</button><button class="tur-btn" onclick="turBitir()">${escapeHtml(tr('tur.davam', 'Nümunə rejimində qal'))}</button>`
    : `<button class="tur-btn tur-kec" onclick="turBitir()">${escapeHtml(tr('tur.kec', 'Turu bitir'))}</button><button class="tur-btn tur-esas" onclick="turNovbeti()">${escapeHtml(tr('tur.novbeti', 'Növbəti'))} ›</button>`;
  kart.innerHTML = `<div class="tur-say">${turIndeks + 1} / ${say}</div><b>${escapeHtml(tr(a.acar + 'b', a.bas))}</b><p>${escapeHtml(tr(a.acar + 'm', a.metn))}</p><div class="tur-duymeler">${duymeler}</div>`;
  // Hədəfi görünən yerə gətir, sonra işığı və kartı yerləşdir
  const hedef = a.hedef ? a.hedef() : null;
  const ilk = Array.isArray(hedef) ? hedef[0] : hedef;
  if (ilk && ilk.scrollIntoView) ilk.scrollIntoView({ block: 'center' });
  setTimeout(() => turYerlesdir(hedef), 260);
}
// hedef: element və ya elementlər massivi (birlikdə işıqlandırılır)
function turDuzbucaq(hedef) {
  const list = (Array.isArray(hedef) ? hedef : [hedef]).filter(e => e && e.getBoundingClientRect && e.offsetParent);
  if (!list.length) return null;
  const rs = list.map(e => e.getBoundingClientRect());
  return { left: Math.min(...rs.map(r => r.left)), top: Math.min(...rs.map(r => r.top)), right: Math.max(...rs.map(r => r.right)), bottom: Math.max(...rs.map(r => r.bottom)) };
}
function turYerlesdir(hedef) {
  const isiq = document.getElementById('turIsiq');
  const kart = document.getElementById('turKart');
  if (!isiq || !kart) return;
  const vh = window.innerHeight, vw = window.innerWidth;
  const r = turDuzbucaq(hedef);
  const kh = kart.offsetHeight || 150;
  if (!r) {
    isiq.style.cssText = `left:${vw / 2}px; top:${vh / 2}px; width:0; height:0;`;
    kart.style.cssText = `top:${Math.max(16, vh / 2 - kh / 2)}px;`;
    return;
  }
  const p = 6;
  const top = Math.max(4, r.top - p), bottom = Math.min(vh - 4, r.bottom + p);
  isiq.style.cssText = `left:${Math.max(4, r.left - p)}px; top:${top}px; width:${Math.min(vw - 8, r.right - r.left + p * 2)}px; height:${Math.max(0, bottom - top)}px;`;
  // Kart hədəfin hansı tərəfində daha çox yer varsa, orada
  const ust = top - 12, alt = vh - bottom - 12;
  let y = alt >= kh || alt >= ust ? bottom + 12 : top - kh - 12;
  y = Math.min(Math.max(12, y), vh - kh - 12);
  kart.style.cssText = `top:${y}px;`;
}
window.addEventListener('resize', () => { if (turIndeks >= 0) { const a = TUR_ADDIMLARI[turIndeks]; turYerlesdir(a && a.hedef ? a.hedef() : null); } });
