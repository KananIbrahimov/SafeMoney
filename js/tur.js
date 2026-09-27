/* Safe Money — qonaq rejimində tanışlıq turu: hər funksiya qısa kartla, müvafiq hissə işıqlandırılır.
   Toxunduqda növbəti addıma keçir. */
const TUR_ADDIMLARI = [
  { sehife: 'ana', hedef: () => { const t = document.getElementById('toplamTutar'); return t ? (t.closest('.card, .summary-card, section') || t.parentElement) : null; }, acar: 'tur.s1', bas: 'Bugünkü xərclər', metn: 'Günün gündəlik və aylıq sabit xərclərinin cəmi, kateqoriyalar üzrə bölgü ilə.' },
  { sehife: 'ana', hedef: () => document.getElementById('gunlukLimitKart'), acar: 'tur.s2', bas: 'Gündəlik limit', metn: 'Limitin icrası burada göstərilir. Məbləğ Ayarlar bölməsində təyin edilir.' },
  { sehife: 'ana', hedef: () => [...document.querySelectorAll('#butonlarKonteyneri .cat-btn')].slice(0, 4), acar: 'tur.s3', bas: 'Xərcin qeydə alınması', metn: 'Kateqoriyaya toxunduqda xərc qeydə alınır. Sabit məbləğ təyin edilibsə, məbləğ soruşulmur.' },
  { sehife: 'ana', hedef: () => [...document.querySelectorAll('#butonlarKonteyneri .cat-btn')].slice(0, 2), acar: 'tur.s4', bas: 'Fərqli məbləğ', metn: 'Kateqoriya basılı saxlanıldıqda sabit məbləğ əvəzinə birdəfəlik fərqli məbləğ daxil edilir.' },
  { sehife: 'ana', hedef: () => document.getElementById('duzenlemeBtn'), acar: 'tur.s5', bas: 'Kateqoriyaların redaktəsi', metn: 'Kateqoriya əlavə etmək, adını, ikonunu, rəngini və sabit məbləğini dəyişmək, gündəlik və ya aylıq sabit xərc kimi təyin etmək.' },
  { sehife: 'hesablar', hedef: () => [...document.querySelectorAll('#hesablarKartlari .hesab-kart')].slice(0, 2), acar: 'tur.s6', bas: 'Hesab növləri', metn: 'Beş hesab növü: nağd pul, debet kartı, depozit, kredit kartı və kredit xətti. Xərclər ⭐ ilə işarələnmiş əsas hesabdan silinir.' },
  { sehife: 'hesablar', hedef: () => document.getElementById('medaxilBtn'), acar: 'tur.s7', bas: 'Mədaxil', metn: 'Daxilolmanın (məs. əmək haqqının) seçilmiş hesaba qeydə alınması; istəyə görə açıqlama ilə.' },
  { sehife: 'hesablar', hedef: () => document.getElementById('transferBtn'), acar: 'tur.s8', bas: 'Köçürmə', metn: 'Göndərən və alan hesab seçilir, məbləğ daxil edilir. Hər iki hesabın balansı avtomatik yenilənir.' },
  { sehife: 'hesablar', hedef: () => document.getElementById('krediOdeBtn'), acar: 'tur.s9', bas: 'Kredit ödənişi', metn: 'Növbəti taksit seçilmiş hesabdan ödənilir; ödənilmiş taksitlərin sayı və qalan borc avtomatik yenilənir.' },
  { sehife: 'dashboard', hedef: () => document.getElementById('dashKart1'), acar: 'tur.s10', bas: 'Xalis maliyyə vəziyyəti', metn: 'Aktivlər (müsbət balanslar) ilə öhdəliklərin (mənfi balanslar) fərqi.' },
  { sehife: 'dashboard', hedef: () => document.getElementById('dashKart2'), acar: 'tur.s11', bas: 'Ümumi borc', metn: 'Mənfi balanslı bütün hesabların borcu, hər hesab üzrə ayrıca.' },
  { sehife: 'dashboard', hedef: () => document.querySelector('#dashKartlarQrup .pie-card'), acar: 'tur.s12', bas: 'Kredit kartı limiti', metn: 'Hər kredit kartı üzrə limit, istifadə olunmuş və istifadə edilə bilən məbləğ.' },
  { sehife: 'dashboard', hedef: () => document.querySelector('#dashXettlerQrup .pie-card'), acar: 'tur.s13', bas: 'Kredit xətti', metn: 'Aylıq taksit məbləği, ödənilmiş və qalan taksitlər, qalan borc və bitmə tarixi.' },
  { sehife: 'aylikHesabat', hedef: () => document.querySelector('#aylikHesabatModal .hesabat-cemi-card'), acar: 'tur.s14', bas: 'Cari ayın xərcləri', metn: 'Ay ərzində gündəlik və aylıq sabit xərclərin ümumi cəmi.' },
  { sehife: 'aylikHesabat', hedef: () => document.getElementById('aylikGunlukSarici'), acar: 'tur.s15', bas: 'Gündəlik xərclər qrafiki', metn: 'Kateqoriyalar üzrə faiz və məbləğ; mərkəzdə aylıq büdcənin icrası.' },
  { sehife: 'aylikHesabat', hedef: () => document.getElementById('aylikSabitSarici'), acar: 'tur.s16', bas: 'Aylıq sabit xərclər qrafiki', metn: 'Kommunal, internet, kirayə kimi sabit xərclərin kateqoriyalar üzrə bölgüsü.' },
  { sehife: 'ayarlar', hedef: () => document.querySelector('#ayarlarModal .ayarlar-qrup'), acar: 'tur.s17', bas: 'Ayarlar', metn: 'Gündəlik limit, kateqoriyalar, hesabların idarəsi, əməliyyat tarixçəsi və axtarış, Google Drive-da ehtiyat nüsxə, tətbiq kilidi.' },
  { sehife: 'ana', hedef: null, acar: 'tur.s18', bas: 'Şəxsi hesab', metn: 'Şəxsi hesab yaradıldıqdan sonra bütün məlumatlar yalnız hesab sahibinə məxsus olur.', son: true }
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
    ? `<button class="tur-btn tur-esas" onclick="turBitir(); hesabYarat();">${escapeHtml(tr('demo.qeydiyyat', 'Hesab yarat'))}</button><button class="tur-btn" onclick="turBitir()">${escapeHtml(tr('tur.davam', 'Nümunə rejimində qal'))}</button>`
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
