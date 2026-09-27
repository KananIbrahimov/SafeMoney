/* Safe Money — ilk giriş sihirbazı
   Yeni istifadəçi (hələ heç bir hesabı yoxdur) ilk dəfə daxil olanda 4 addım:
   1) valyuta  2) əsas hesab və balans  3) kateqoriyalar  4) gündəlik limit.
   "Keç" ilə istənilən vaxt tamamlamaq olar — seçimlər sonra Parametrlərdən dəyişdirilir.
   Tamamlananda profilə "kurulum" tarixi yazılır və sihirbaz bir daha açılmır. */

const KURULUM_ADDIM_SAYI = 4;
let kurulumAddim = 0;
let kurulumData = null;

function kurulumLazimdir() {
  return !demoRejim && veriMenbeGuvenli && !!cariGoogleIstifadeci &&
    !(istifadeciProfili && istifadeciProfili.kurulum) && hesablar.length === 0;
}

function kurulumBaslat() {
  kurulumAddim = 0;
  kurulumData = {
    valyuta: valyuta || 'AZN',
    tip: 'debit', ad: '', balans: '', limit: '', muvcud: '',
    kategoriler: kategoriler.map(k => ({ k, secili: true })),
    gunlukLimit: (typeof gunlukLimit === 'number') ? String(gunlukLimit) : ''
  };
  kurulumCiz();
  modalAc('kurulumEkrani');
}

function kurulumValyutaAdi(kod) {
  return {
    AZN: tr('valyuta.AZN', 'Azərbaycan manatı'),
    RUB: tr('valyuta.RUB', 'Rusiya rublu'),
    USD: tr('valyuta.USD', 'ABŞ dolları'),
    TRY: tr('valyuta.TRY', 'Türk lirəsi')
  }[kod] || kod;
}
const VALYUTA_ISARE = { AZN: '₼', RUB: '₽', USD: '$', TRY: '₺' };

function kurulumCiz() {
  const d = kurulumData;
  const kutu = document.getElementById('kurulumAddim');
  document.getElementById('kurulumXeta').innerText = '';
  document.getElementById('kurulumSay').innerText = tr('kurulum.addim', 'Addım {n}/{say}', { n: kurulumAddim + 1, say: KURULUM_ADDIM_SAYI });
  document.getElementById('kurulumNoqteler').innerHTML = Array.from({ length: KURULUM_ADDIM_SAYI }, (_, i) =>
    `<span class="${i <= kurulumAddim ? 'aktiv' : ''}"></span>`).join('');
  document.getElementById('kurulumGeriBtn').style.visibility = kurulumAddim === 0 ? 'hidden' : 'visible';
  document.getElementById('kurulumIreliBtn').innerText = kurulumAddim === KURULUM_ADDIM_SAYI - 1 ? tr('kurulum.basla', 'Başla') : tr('kurulum.novbeti', 'Növbəti');
  let h = '';
  if (kurulumAddim === 0) {
    h = `<h2>${escapeHtml(tr('kurulum.valyutaBasliq', 'Valyutanı seç'))}</h2>
      <p class="hint">${escapeHtml(tr('kurulum.valyutaIzah', 'Bütün məbləğlər bu valyutada göstəriləcək. Sonra Parametrlərdən dəyişə bilərsən.'))}</p>
      <div class="kurulum-secimler">${VALYUTALAR.map(v => `<button type="button" class="kurulum-secim${d.valyuta === v ? ' aktiv' : ''}" onclick="kurulumValyutaSec('${v}')">
        <span class="ks-isare">${VALYUTA_ISARE[v]}</span><span class="ks-metn"><b>${v}</b><small>${escapeHtml(kurulumValyutaAdi(v))}</small></span></button>`).join('')}</div>`;
  } else if (kurulumAddim === 1) {
    const kredit = d.tip === 'kredit';
    const tipDuyme = (t, ikonAd) => `<button type="button" class="${d.tip === t ? 'aktiv' : ''}" onclick="kurulumTipSec('${t}')">${ikon(ikonAd)}<span>${escapeHtml(hesabNovAdi(t))}</span></button>`;
    h = `<h2>${escapeHtml(tr('kurulum.hesabBasliq', 'Əsas hesabını əlavə et'))}</h2>
      <p class="hint">${escapeHtml(tr('kurulum.hesabIzah', 'Xərclər bu hesabdan çıxılacaq. Başqa hesabları sonra Hesablar bölməsində əlavə edə bilərsən.'))}</p>
      <div class="nov-secim" style="margin-bottom:12px;">${tipDuyme('nagd', 'nagd')}${tipDuyme('debit', 'debit')}${tipDuyme('kredit', 'kredit')}</div>
      <label class="filtr-lbl" for="kurAd">${escapeHtml(tr('hesab.ad', 'Hesabın adı'))}</label>
      <input type="text" id="kurAd" maxlength="40" value="${escapeHtml(d.ad)}" placeholder="${escapeHtml(hesabNovAdi(d.tip))}" oninput="kurulumData.ad = this.value">
      ${kredit ? `
      <label class="filtr-lbl" for="kurLimit">${escapeHtml(tr('kreditKart.kreditLimitiAzn', 'Kredit limiti (AZN)'))}</label>
      <input type="text" inputmode="decimal" autocomplete="off" id="kurLimit" value="${escapeHtml(d.limit)}" placeholder="2000" oninput="kurulumData.limit = this.value">
      <label class="filtr-lbl" for="kurMuvcud">${escapeHtml(tr('hesab.kartMovcud', 'Kartda mövcud vəsait (AZN)'))}</label>
      <input type="text" inputmode="decimal" autocomplete="off" id="kurMuvcud" value="${escapeHtml(d.muvcud)}" placeholder="0.00" oninput="kurulumData.muvcud = this.value">` : `
      <label class="filtr-lbl" for="kurBalans">${escapeHtml(tr('kurulum.balans', 'Hazırkı balans (AZN)'))}</label>
      <input type="text" inputmode="decimal" autocomplete="off" id="kurBalans" value="${escapeHtml(d.balans)}" placeholder="0.00" oninput="kurulumData.balans = this.value">`}`;
  } else if (kurulumAddim === 2) {
    const setir = (x, i) => `<label class="sw-setir"><span class="sw-metn"><b>${escapeHtml(x.k.ikon)} ${escapeHtml(x.k.ad)}</b></span>
      <input type="checkbox" class="sw-inp" role="switch" ${x.secili ? 'checked' : ''} onchange="kurulumData.kategoriler[${i}].secili = this.checked"></label>`;
    const gunluk = [], aylik = [];
    d.kategoriler.forEach((x, i) => (x.k.aylik ? aylik : gunluk).push(setir(x, i)));
    h = `<h2>${escapeHtml(tr('kurulum.katBasliq', 'Kateqoriyaları seç'))}</h2>
      <p class="hint">${escapeHtml(tr('kurulum.katIzah', 'Lazım olmayanları söndür, istəsən yenisini əlavə et. Hamısını sonra da dəyişə bilərsən.'))}</p>
      <div class="kurulum-kat-qrup"><div class="kurulum-alt">${escapeHtml(tr('kurulum.gunluk', 'Gündəlik xərclər'))}</div>${gunluk.join('')}</div>
      ${aylik.length ? `<div class="kurulum-kat-qrup"><div class="kurulum-alt">${escapeHtml(tr('aylik.ayliqSabitXercler', 'Aylıq sabit xərclər'))}</div>${aylik.join('')}</div>` : ''}
      <div class="kurulum-yeni"><input type="text" id="kurYeniKat" maxlength="40" placeholder="${escapeHtml(tr('yeniKat.yeniKateqoriya', 'Yeni kateqoriya'))}" onkeydown="if(event.key==='Enter'){event.preventDefault();kurulumKatElave();}">
      <button type="button" class="btn btn-ghost" onclick="kurulumKatElave()">${ikon('artir', 16)}<span>${escapeHtml(tr('yeniKat.elaveEt', 'Əlavə et'))}</span></button></div>`;
  } else {
    h = `<h2>${escapeHtml(tr('kurulum.limitBasliq', 'Gündəlik xərc limiti'))}</h2>
      <p class="hint">${escapeHtml(tr('kurulum.limitIzah', 'Gündəlik xərclərin bu məbləği keçəndə ana ekranda xəbərdar olacaqsan. İstəmirsənsə boş burax.'))}</p>
      <label class="filtr-lbl" for="kurGunlukLimit">${escapeHtml(tr('kurulum.limitLbl', 'Gündəlik limit (AZN)'))}</label>
      <input type="text" inputmode="decimal" autocomplete="off" id="kurGunlukLimit" value="${escapeHtml(d.gunlukLimit)}" placeholder="20" oninput="kurulumData.gunlukLimit = this.value">`;
  }
  kutu.innerHTML = h;
  kutu.oninput = () => { document.getElementById('kurulumXeta').innerText = ''; }; // yazmağa başlayanda köhnə xəta itsin
  const scr = document.getElementById('kurulumEkrani'); if (scr) scr.scrollTop = 0;
}

function kurulumValyutaSec(v) {
  kurulumData.valyuta = valyutaNormal(v);
  valyuta = kurulumData.valyuta; // sonrakı addımlarda etiketlər dərhal yeni valyuta ilə görünsün
  kurulumCiz();
}
function kurulumTipSec(t) { kurulumData.tip = t; kurulumCiz(); }
function kurulumKatElave() {
  const inp = document.getElementById('kurYeniKat');
  const ad = (inp && inp.value || '').trim();
  if (!ad) return;
  const kicik = x => x.toLocaleLowerCase(dilKodu === 'az' ? 'az-AZ' : (dilKodu === 'tr' ? 'tr-TR' : undefined));
  if (kurulumData.kategoriler.some(x => kicik(x.k.ad) === kicik(ad))) {
    document.getElementById('kurulumXeta').innerText = tr('kateqoriyalar.adTekrarXeta', 'Bu adda kateqoriya artıq var.');
    return;
  }
  const istifade = new Set(kurulumData.kategoriler.map(x => x.k.renk));
  const renk = renkPaleti.find(r => !istifade.has(r)) || renkPaleti[kurulumData.kategoriler.length % renkPaleti.length];
  // Yeni kateqoriya gündəlik xərclərin sonuna əlavə olunur
  let yer = kurulumData.kategoriler.findIndex(x => x.k.aylik);
  if (yer === -1) yer = kurulumData.kategoriler.length;
  kurulumData.kategoriler.splice(yer, 0, { k: { ad, ikon: '💰', renk, sabitTutar: null }, secili: true });
  kurulumCiz();
  const yeni = document.getElementById('kurYeniKat'); if (yeni) yeni.focus();
}

// Hər addımın yoxlaması; səhv varsa mətn qaytarır
function kurulumYoxla() {
  const d = kurulumData;
  if (kurulumAddim === 1) {
    if (d.tip === 'kredit') {
      const lim = meblegOxu(d.limit);
      if (!(lim > 0)) return tr('hesab.kartLimitLazim', 'Kredit limitini yaz.');
      if (String(d.muvcud).trim() !== '' && isNaN(meblegOxu(d.muvcud, true))) return tr('umumi.duzgunMebleg', 'Düzgün məbləğ yaz.');
    } else if (String(d.balans).trim() !== '' && isNaN(meblegOxu(d.balans, true))) {
      return tr('umumi.duzgunMebleg', 'Düzgün məbləğ yaz.');
    }
  } else if (kurulumAddim === 2) {
    if (!d.kategoriler.some(x => x.secili)) return tr('kateqoriyalar.enAziBirQalmalidir', 'Ən azı bir kateqoriya qalmalıdır.');
  } else if (kurulumAddim === 3) {
    if (String(d.gunlukLimit).trim() !== '' && !(meblegOxu(d.gunlukLimit) >= 0)) return tr('umumi.duzgunMebleg', 'Düzgün məbləğ yaz.');
  }
  return '';
}
function kurulumIreli() {
  const xeta = kurulumYoxla();
  if (xeta) { document.getElementById('kurulumXeta').innerText = xeta; return; }
  if (kurulumAddim < KURULUM_ADDIM_SAYI - 1) { kurulumAddim++; kurulumCiz(); return; }
  kurulumTamamla(true);
}
function kurulumGeri() { if (kurulumAddim > 0) { kurulumAddim--; kurulumCiz(); } }
function kurulumKec() { kurulumTamamla(false); }

// tetbiqEt=false ("Keç"): yalnız seçilmiş valyuta saxlanılır, qalan hər şey olduğu kimi qalır
function kurulumTamamla(tetbiqEt) {
  const d = kurulumData;
  valyuta = valyutaNormal(d.valyuta);
  if (tetbiqEt) {
    const ad = String(d.ad || '').trim() || hesabNovAdi(d.tip);
    let h;
    if (d.tip === 'kredit') {
      const lim = meblegOxu(d.limit);
      const muv = String(d.muvcud).trim() === '' ? lim : meblegOxu(d.muvcud, true);
      h = hesabNormallasdir({ tip: 'kredit', ad, limit: lim, balans: pulYuvarla(muv - lim), menfiOlar: true, ana: true });
    } else {
      const bal = String(d.balans).trim() === '' ? 0 : meblegOxu(d.balans, true);
      h = hesabNormallasdir({ tip: d.tip, ad, balans: bal, menfiOlar: bal < 0, ana: true });
    }
    hesablar.forEach(x => { x.ana = false; });
    hesablar.push(h);
    kategoriler = d.kategoriler.filter(x => x.secili).map(x => x.k);
    const lim = String(d.gunlukLimit).trim() === '' ? null : meblegOxu(d.gunlukLimit);
    gunlukLimit = (typeof lim === 'number' && lim > 0) ? lim : null;
  }
  istifadeciProfili = Object.assign({}, istifadeciProfili, { kurulum: new Date().toISOString() });
  veriKaydet();
  modalKapat('kurulumEkrani');
  dilTetbiqEt();
  ekraniGuncelle();
  if (tetbiqEt) toastGoster(tr('kurulum.hazir', 'Hazırdır! İlk xərcini kateqoriyaya toxunaraq qeyd et.'));
}
