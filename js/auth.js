/* Safe Money — tətbiq kilidi (Face ID / PIN) */
let kilidVar = localStorage.getItem('kilit_aktiv') === '1';
let kilidCredentialId = localStorage.getItem('kilit_webauthn_id') || null;
// PIN açıq mətn kimi saxlanılmır: duz (salt) + SHA-256 heşi. Köhnə açıq PIN ilk açılışda heşə çevrilir.
let kilidPinHash = localStorage.getItem('kilit_pin_h') || null;
let kilidPinDuz = localStorage.getItem('kilit_pin_s') || null;
let kilidKohnePin = localStorage.getItem('kilit_pin') || null;
function kilidPinVar() { return !!(kilidPinHash || kilidKohnePin); }

async function pinHeshle(pin, duz) {
  if (!(window.crypto && crypto.subtle)) return 'p:' + duz + ':' + pin; // çox köhnə brauzer — heş mümkün deyil
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(duz + ':' + pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function pinYaddaSaxla(pin) {
  const duz = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('');
  const h = await pinHeshle(pin, duz);
  kilidPinHash = h; kilidPinDuz = duz; kilidKohnePin = null;
  localStorage.setItem('kilit_pin_h', h); localStorage.setItem('kilit_pin_s', duz); localStorage.removeItem('kilit_pin');
}
async function pinDogrudur(pin) {
  if (kilidPinHash && kilidPinDuz) return (await pinHeshle(pin, kilidPinDuz)) === kilidPinHash;
  if (kilidKohnePin) { const ok = pin === kilidKohnePin; if (ok) await pinYaddaSaxla(pin); return ok; }
  return false;
}
if (kilidKohnePin && window.crypto && crypto.subtle) pinYaddaSaxla(kilidKohnePin).catch(() => {});

// Səhv PIN cəhdləri: 5 səhvdən sonra 30 san., sonra hər dəfə iki qat uzun gözləmə
function kilidCehdOxu() { try { return JSON.parse(localStorage.getItem('kilit_cehd') || '{"n":0,"t":0}'); } catch (e) { return { n: 0, t: 0 }; } }
function kilidCehdYaz(c) { try { localStorage.setItem('kilit_cehd', JSON.stringify(c)); } catch (e) {} }

function kilidYoxla() {
  if (!kilidVar) return;
  const ekran = document.getElementById('kilidEkrani');
  const faceBtn = document.getElementById('kilidFaceBtn');
  const pinWrap = document.getElementById('kilidPinWrap');
  const hint = document.getElementById('kilidHint');
  ekran.classList.add('active');
  const faceVar = !!(kilidCredentialId && window.PublicKeyCredential);
  faceBtn.style.display = faceVar ? 'block' : 'none';
  // PIN təyin olunubsa həmişə görünür — Face ID işləməsə də giriş yolu qalsın
  pinWrap.style.display = kilidPinVar() ? 'block' : 'none';
  hint.innerText = faceVar ? tr('kilid.faceIdHint', 'Davam etmək üçün Face ID / Touch ID ilə təsdiqlə.') : tr('kilid.pinHint', 'Davam etmək üçün PIN kodu daxil et.');
  if (faceVar) setTimeout(kilidWebAuthnDogrula, 350); // avtomatik sına — bəzi brauzerlər düymə klikini gözləyəcək
}

function kilidAc() {
  document.getElementById('kilidEkrani').classList.remove('active');
  document.getElementById('kilidError').innerText = '';
}

async function kilidWebAuthnDogrula() {
  const errEl = document.getElementById('kilidError');
  errEl.innerText = '';
  if (!kilidCredentialId || !window.PublicKeyCredential) {
    document.getElementById('kilidPinWrap').style.display = 'block';
    return;
  }
  try {
    const idBytes = Uint8Array.from(atob(kilidCredentialId), c => c.charCodeAt(0));
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    await navigator.credentials.get({
      publicKey: { challenge, allowCredentials: [{ id: idBytes, type: 'public-key' }], userVerification: 'required', timeout: 60000 }
    });
    kilidAc();
  } catch (e) {
    errEl.innerText = kilidPinVar()
      ? tr('kilid.tesdiqlenmediXeta', 'Təsdiqlənmədi. Yenidən cəhd et və ya PIN koddan istifadə et.')
      : tr('kilid.tesdiqlenmediPinsiz', 'Təsdiqlənmədi. Yenidən cəhd et və ya aşağıdan hesabdan çıx.');
    if (kilidPinVar()) document.getElementById('kilidPinWrap').style.display = 'block';
  }
}

async function kilidPinIleAc() {
  const errEl = document.getElementById('kilidError');
  const inp = document.getElementById('kilidPinInput');
  const c = kilidCehdOxu();
  if (c.t > Date.now()) {
    errEl.innerText = tr('kilid.gozle', 'Çox səhv cəhd. {san} saniyə sonra yenidən yoxla.', { san: Math.ceil((c.t - Date.now()) / 1000) });
    return;
  }
  const val = inp.value.trim();
  if (kilidPinVar() && await pinDogrudur(val)) {
    inp.value = '';
    kilidCehdYaz({ n: 0, t: 0 });
    kilidAc();
  } else {
    c.n += 1;
    if (c.n >= 5) c.t = Date.now() + 30000 * Math.pow(2, Math.min(c.n - 5, 6));
    kilidCehdYaz(c);
    inp.value = '';
    errEl.innerText = c.n >= 5
      ? tr('kilid.gozle', 'Çox səhv cəhd. {san} saniyə sonra yenidən yoxla.', { san: Math.ceil((c.t - Date.now()) / 1000) })
      : tr('kilid.yanlisPin', 'PIN kod yanlışdır.');
  }
}

// Kilidi unutmusansa: hesabdan çıx — məlumatlar buludda qalır, yenidən e-poçt və şifrə ilə girəndə kilid olmayacaq.
function kilidSifirlaCixis() {
  confirmAc(tr('kilid.sifirlaBaslik', 'Hesabdan çıx'), tr('kilid.sifirlaSual', 'Kilid bu cihazda sıfırlanacaq və hesabdan çıxacaqsan. Məlumatların buludda qalır — e-poçt və şifrənlə yenidən daxil ol.'), () => {
    kilidTemizle();
    kilidAc();
    if (typeof driveCihazMelumatiniSil === 'function') driveCihazMelumatiniSil();
    try { if (firebaseUnsubscribe) { firebaseUnsubscribe(); firebaseUnsubscribe = null; } } catch (e) {}
    try { firebase.auth().signOut().catch(() => {}).then(() => location.reload()); } catch (e) { location.reload(); }
  });
}
function kilidTemizle() {
  kilidVar = false; kilidCredentialId = null; kilidPinHash = null; kilidPinDuz = null; kilidKohnePin = null;
  ['kilit_aktiv', 'kilit_webauthn_id', 'kilit_pin', 'kilit_pin_h', 'kilit_pin_s', 'kilit_cehd'].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
}

function kilidAyarGoster() {
  const sw = document.getElementById('kilidAyarSwitch');
  const lbl = document.getElementById('kilidAyarLabel');
  if (!sw || !lbl) return;
  sw.classList.toggle('on', kilidVar);
  lbl.innerHTML = kilidVar
    ? '<span class="ayarlar-ikon">' + ikon('kilid') + '</span><span class="ayarlar-metin">' + escapeHtml(tr('ayarlar.kilidAktiv', 'Tətbiq kilidi (aktiv)')) + '</span>'
    : '<span class="ayarlar-ikon">' + ikon('kilid') + '</span><span class="ayarlar-metin">' + escapeHtml(tr('ayarlar.kilidFaceIdPin', 'Tətbiq kilidi (Face ID / PIN)')) + '</span>';
  const errEl = document.getElementById('kilidAyarError');
  if (errEl) errEl.innerText = '';
}

function kilidToggle() {
  if (kilidVar) {
    confirmAc(tr('kilid.sondurBaslik', 'Kilidi söndür'), tr('kilid.sondurSual', 'Tətbiq kilidini söndürmək istəyirsən?'), () => {
      kilidTemizle();
      kilidAyarGoster();
    });
  } else {
    kilidKurulumBaslat();
  }
}

async function kilidKurulumBaslat() {
  const errEl = document.getElementById('kilidAyarError');
  errEl.innerText = '';
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    errEl.innerText = tr('kilid.httpsTelebOlunur', 'Face ID / Touch ID yalnız https:// ünvanında işləyir. Hələlik PIN təyin edək.');
    pinAyarlaModalAc();
    return;
  }
  if (window.PublicKeyCredential) {
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (available) {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const userId = crypto.getRandomValues(new Uint8Array(16));
        const cred = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: 'Safe Money' },
            user: { id: userId, name: 'istifadeci', displayName: 'Safe Money' },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
            // residentKey: 'discouraged' -> iOS bunu "passkey" kimi yox, adi bir WebAuthn açarı kimi
            // qeydə alır. Bu sayədə hər dəfə "Giriş Yap / Geçiş Anahtarını Kullan" marka ekranı
            // çıxmır, çağırış birbaşa Face ID/Touch ID istəyinə keçir.
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
            timeout: 60000
          }
        });
        // Face ID hazırdır, amma kilid yalnız ehtiyat PIN təyin olunandan sonra aktiv olur —
        // Face ID gələcəkdə işləməsə tətbiqə girmək mümkün olsun.
        kilidGozleyenFaceId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
        pinAyarlaModalAc(true);
        return;
      }
    } catch (e) {
      console.warn('WebAuthn qurulmadı, PIN-ə keçilir:', e);
    }
  }
  pinAyarlaModalAc();
}

let kilidGozleyenFaceId = null;
function pinAyarlaModalAc(faceIdIle) {
  if (!faceIdIle) kilidGozleyenFaceId = null;
  const izah = document.querySelector('#pinAyarlaModal .hint');
  if (izah) izah.innerText = faceIdIle
    ? tr('pin.faceIdEhtiyat', 'Face ID hazırdır. Face ID işləməyəndə istifadə etmək üçün 4 rəqəmli ehtiyat PIN kod təyin et.')
    : tr('pin.buCihazFaceId', 'Bu cihaz Face ID / Touch ID dəstəkləmir və ya icazə verilmədi. 4 rəqəmli PIN kod təyin et.');
  document.getElementById('pinAyarlaInput').value = '';
  document.getElementById('pinAyarlaError').innerText = '';
  modalAc('pinAyarlaModal');
}
async function pinAyarlaOnayla() {
  const val = document.getElementById('pinAyarlaInput').value.trim();
  if (!/^\d{4}$/.test(val)) {
    document.getElementById('pinAyarlaError').innerText = tr('pin.dordReqemliXeta', '4 rəqəmli PIN kod yaz.');
    return;
  }
  await pinYaddaSaxla(val);
  if (kilidGozleyenFaceId) {
    kilidCredentialId = kilidGozleyenFaceId; kilidGozleyenFaceId = null;
    localStorage.setItem('kilit_webauthn_id', kilidCredentialId);
  }
  kilidVar = true;
  localStorage.setItem('kilit_aktiv', '1');
  kilidCehdYaz({ n: 0, t: 0 });
  modalKapat('pinAyarlaModal');
  kilidAyarGoster();
}
// Tətbiq 30 saniyədən uzun arxa planda qalıbsa, geri qayıdanda kilid yenidən açılır.
// (Əvvəl kilid yalnız səhifə tam yüklənəndə çıxırdı — PWA arxa plandan qayıdanda çıxmırdı.)
let gizliBaslangic = null;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { gizliBaslangic = Date.now(); return; }
  if (kilidVar && gizliBaslangic && (Date.now() - gizliBaslangic) > 30000) kilidYoxla();
  gizliBaslangic = null;
  gunDeyisdiYoxla();
});
// ==================== /Tətbiq kilidi ====================
