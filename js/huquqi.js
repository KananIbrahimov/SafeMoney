/* Safe Money — Məxfilik siyasəti / İstifadə şərtləri: dil, tema, geri düyməsi.
   Dil və tema tətbiqdən ?dil=az&tema=dark ilə gəlir; yoxdursa SafeMoney-in öz seçimi, sonra ingilis dili. */
(function () {
  const DILLER = ['az', 'en', 'ru', 'tr'];
  const q = new URLSearchParams(location.search);
  const oxu = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  let dil = q.get('dil') || location.hash.replace('#', '') || oxu('dil') || oxu('sm:dil') || 'en';
  if (DILLER.indexOf(dil) === -1) dil = 'en';
  const tema = q.get('tema') || oxu('tema') || oxu('sm:tema') || 'dark';
  document.documentElement.setAttribute('data-theme', tema === 'light' ? 'light' : 'dark');
  const metaTema = document.querySelector('meta[name="theme-color"]');
  if (metaTema) metaTema.setAttribute('content', tema === 'light' ? '#f3f4f6' : '#0b0c0e');

  function dilTetbiqEt(yeni) {
    dil = yeni;
    document.documentElement.lang = dil;
    document.querySelectorAll('section[data-dil]').forEach(s => {
      const bu = s.getAttribute('data-dil') === dil;
      s.classList.toggle('gorunur', bu);
      if (bu) {
        document.title = s.getAttribute('data-basliq') + ' — Safe Money';
        const h1 = document.getElementById('hqBasliq'); if (h1) h1.textContent = s.getAttribute('data-basliq');
        const geri = document.getElementById('hqGeri'); if (geri) geri.setAttribute('aria-label', s.getAttribute('data-geri'));
      }
    });
    document.querySelectorAll('.hq-dil button').forEach(b => {
      const aktiv = b.getAttribute('data-kod') === dil;
      b.classList.toggle('aktiv', aktiv); b.setAttribute('aria-pressed', String(aktiv));
    });
    // Səhifələr arası linklər dili və temanı saxlasın
    document.querySelectorAll('a[data-sehife]').forEach(a => {
      a.href = a.getAttribute('data-sehife') + '?dil=' + dil + '&tema=' + (tema === 'light' ? 'light' : 'dark');
    });
    try { history.replaceState(null, '', location.pathname + '?dil=' + dil + '&tema=' + (tema === 'light' ? 'light' : 'dark')); } catch (e) {}
  }
  // Geri: tətbiqdən gəlinibsə — ora qayıt; birbaşa açılıbsa — SafeMoney-in ana səhifəsinə
  window.hqGeri = function () {
    let eyniSayt = false;
    try { eyniSayt = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
    if (eyniSayt && history.length > 1) history.back();
    else location.href = './';
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.hq-dil button').forEach(b => b.addEventListener('click', () => dilTetbiqEt(b.getAttribute('data-kod'))));
    dilTetbiqEt(dil);
  });
})();
