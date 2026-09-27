/* Safe Money — vəziyyət, yükləmə, yadda saxlama */
const APP_VERSION = '3.35'; // hər yeni göndərilən html versiyasında əl ilə +1 artırılır
let goruntulenenTarix = new Date(); goruntulenenTarix.setHours(0, 0, 0, 0);
let kategoriler = [];
let giderler = [];
// Qeydiyyatda yazılan ad/soyad — 'syncs/{uid}' sənədinin bir hissəsi kimi saxlanır.
let istifadeciProfili = { ad: '', soyad: '' };
// Köhnə hesab sahələri (anaHesap, nagdBakiye, krediBorcu ...) artıq yaddaşda saxlanılmır — yalnız buluda
// güzgü kimi yazılır (hesablarGuzgusu) və köhnə datadan köçürmədə oxunur (hesabDatasiniHazirla).
let hesabTransferleri = []; // hesablar arası transfer tarixçəsi
let gunlukLimit = null; // gündəlik xərc limiti — istifadəçi "Ayarlar" bölməsindən özü təyin edir, invented default yoxdur
let veriYuklendi = false;
// Qonaq (nümunə) rejimi: data yalnız yaddaşdadır, buluda heç nə yazılmır.
let demoRejim = false;
// TƏHLÜKƏSİZLİK QIFILI: true YALNIZ bulud vəziyyəti QƏTİ şəkildə təsdiqlənəndə olur —
// ya həqiqi data uğurla oxunub, ya da sənədin HƏQİQƏTƏN boş (yeni key) olduğu təsdiqlənib,
// ya da ümumiyyətlə heç bir Sync Key yoxdur (təklikdə iş rejimi). Bağlantı xətası/vaxt
// aşımı zamanı FALSE olaraq qalır ki, ekranda görünən (yalançı) boş vəziyyət səhvən
// Firestore-a yazılıb əsl buludda olan datanı silməsin. veriKaydet() bu bayrağı yoxlayır.
let veriMenbeGuvenli = false;
let aylikGunlukChart = null; // Chart.js: aylıq hesabat — günlük xərclər dairəsi
let aylikSabitChart = null; // Chart.js: aylıq hesabat — aylıq sabit xərclər dairəsi
let aylikTrendChart = null; // Chart.js: günlük xərc trendi (xətt)
let dashVeziyyetChart = null; // Chart.js: maliyyə — xalis vəziyyət
let dashUmumiBorcChart = null; // Chart.js: dashboard — ümumi borc dairəvi diaqramı

function cssVar(ad) {
  return getComputedStyle(document.documentElement).getPropertyValue(ad).trim();
}
// 20 rəng: ilk 8-i köhnə palitradır (mövcud kateqoriyaların rəngi seçili qalsın deyə eyni saxlanılıb).
// Premium tema palitrası: doyğunluğu azaldılmış, bir-biri ilə uyğun 20 ton (qrafit + gümüşü fonda sakit görünür).
// Mövcud kateqoriyaların rəngi dəyişmir — bu siyahı yalnız yeni kateqoriya və rəng seçimi üçündür.
const renkPaleti = [
  '#8fa3b8','#b89a7a','#7fa08f','#a58aa8','#b88482','#7d93b0','#a3a77f','#b08d9b',
  '#6f9a9a','#c2a36b','#9c8fbf','#8aa6c9','#a9b4bf','#7c8a99','#c4a9a0','#94b0a0',
  '#b5b09a','#9aa0ad','#d0c3a4','#8c9c86'
];

// Kateqoriya "aylıq sabit xərc"dirsə true (tik aktivdir); tiksiz / tapılmayan kateqoriya = günlük xərc.
function kategoriAylikdirmi(ad) {
  const k = kategoriler.find(x => x.ad === ad);
  return !!(k && k.aylik);
}

// Yeni hesab üçün defolt kateqoriyalar: gündəlik (ümumi, hər kəsə uyğun) + aylıq kommunal xərclər.
// Adlar istifadəçinin dilində yaradılır (defKat.* açarları); mövcud hesablara toxunulmur.
const varsayilanKategoriler = [
  { ad: 'Transport', sabitTutar: null, renk: '#8fa3b8', ikon: '🚕' },
  { ad: 'Market', sabitTutar: null, renk: '#7fa08f', ikon: '🛒' },
  { ad: 'Coffee', sabitTutar: null, renk: '#b89a7a', ikon: '☕️' },
  { ad: 'Food', sabitTutar: null, renk: '#b88482', ikon: '🍽️' },
  { ad: 'Shopping', sabitTutar: null, renk: '#a58aa8', ikon: '🛍️' },
  { ad: 'Fun', sabitTutar: null, renk: '#c2a36b', ikon: '🎬' },
  { ad: 'Pharmacy', sabitTutar: null, renk: '#7d93b0', ikon: '💊' },
  { ad: 'Other', sabitTutar: null, renk: '#9aa0ad', ikon: '📦' },
  { ad: 'Electricity', sabitTutar: null, renk: '#b3a27a', ikon: '💡', aylik: true },
  { ad: 'Water', sabitTutar: null, renk: '#7f9fa8', ikon: '💧', aylik: true },
  { ad: 'Gas', sabitTutar: null, renk: '#b08a7a', ikon: '🔥', aylik: true },
  { ad: 'Internet', sabitTutar: null, renk: '#8f9bb0', ikon: '📶', aylik: true }
];
function defoltKategoriler() { return varsayilanKategoriler.map(k => ({ ...k, ad: tr('defKat.' + k.ad.toLowerCase(), k.ad) })); }

// Aylıq xərclər bölməsi ləğv olunub. Köhnə backuplarda kredit borcu bəzən həmin
// siyahının içində saxlanılırdı — mövcud krediBorcu yoxdursa, oradan çıxarırıq.
function krediBorcuKohnaBackupdanCixar(eskiAylikXerclar) {
  if (!Array.isArray(eskiAylikXerclar)) return null;
  const KREDI_BORCU_ID = 'kredi_borcu_2026_09';
  const eski = eskiAylikXerclar.find(x => x.id === KREDI_BORCU_ID);
  if (!eski) return null;
  return {
    id: KREDI_BORCU_ID, ad: 'Kredi Borcu', aylikMebleg: (typeof eski.tutar === 'number') ? eski.tutar : 0,
    baslangic: eski.baslangic || null, bitis: eski.bitis || null, taksitSayi: eski.taksitSayi || 0,
    odenmisTaksitSayi: eski.odenmisTaksitSayi || 0
  };
}

// Firebase-dən oxuna bilmədikdə (key yoxdursa, ya da bağlantı alınmadısa) tətbiq
// ARTIQ heç bir yerli keşə müraciət ETMİR — sadəcə boş/defolt vəziyyətlə açılır.
// Bu, "yalnız Firebase-dən qidalanma" tələbinin dəqiq icrasıdır: köhnə, sinxron
// olmamış yerli məlumat heç vaxt ekrana çıxıb çaşdırmayacaq.
function yerliVeriniYukle() {
  // Yeni hesab üçün defolt kateqoriyalar istifadəçinin seçdiyi dildə yaradılır (mövcud hesablara toxunulmur).
  kategoriler = defoltKategoriler();
  giderler = [];
  hesabTransferleri = [];
  hesablar = [];
  gunlukLimit = null;
  sonDeyisiklikVaxti = null;
}

// Vaxt aşımı ilə bir promise-i "yarışdırır" — Firebase həddindən artıq uzun
// çəkərsə (məs. şəbəkə problemi), tətbiq əbədi "Yüklənir..." ekranında qalmasın.
function vaxtAsimiIle(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(false), ms))
  ]);
}

// ==== Məlumat mənbəyi: Firebase (Firestore) ====
// TƏHLÜKƏSİZLİK QAYDASI: tətbiq HEÇ VAXT özbaşına yeni Sync Key yaratmır və
// Firestore-a yazmır. Yalnız bu CİHAZDA daha əvvəl əl ilə yaradılmış/daxil
// edilmiş bir Sync Key varsa (localStorage-da saxlanılıb) həmin key ilə
// Firebase-dən oxumağa çalışır. Yəni linki başqası açsa, ona heç bir key
// verilmir və sənin datana avtomatik toxunulmur — sadəcə boş/yerli vəziyyət
// görünür. Sync yalnız "Yeni Sync Key yarat" və ya "Var olan Key-i gir"
// düymələrinə əl ilə basdıqda başlayır.
async function veriYukle() {
  let firebaseDenGeldi = false;
  let senedTesdiqlenmisBosdur = false; // Firebase-ə çatdıq VƏ sənəd HƏQİQƏTƏN boşdur
  let gozleyenGonderilmeli = false;    // telefonda göndərilməmiş dəyişiklik var
  const telefonda = (typeof oflaynOxu === 'function') ? oflaynOxu() : null;
  try {
    const hazir = await vaxtAsimiIle(firebaseBaslat(), 15000);
    if (hazir && firestoreDb && senkronKey && navigator.onLine !== false) {
      const snap = await vaxtAsimiIle(firestoreDb.collection('syncs').doc(senkronKey).get(), 10000);
      if (snap && snap.exists && snap.data() && snap.data().data) {
        const bulud = snap.data().data, rev = Number(snap.data().rev) || 0;
        if (telefonda && telefonda.yerli) {
          // Əvvəlki açılışda göndərilə bilməmiş dəyişikliklər: buluddakı son vəziyyətlə birləşdirilib göndərilir
          driveVerisiniTetbiqEt(telefonda.bazaRev === rev ? telefonda.yerli : dataBirlesdir(telefonda.baza, telefonda.yerli, bulud));
          gozleyenGonderilmeli = true;
        } else {
          driveVerisiniTetbiqEt(bulud);
        }
        bazaRev = rev;
        bazaData = jsonKopya(bulud);
        firebaseDenGeldi = true;
      } else if (snap && !snap.exists) {
        senedTesdiqlenmisBosdur = true;
      }
    }
  } catch (e) {
    console.warn('Firebase-dən oxuma xətası:', e);
  }

  // İnternet yoxdur, amma telefonda son nüsxə var → oflayn rejimdə aç
  if (!firebaseDenGeldi && !senedTesdiqlenmisBosdur && senkronKey && telefonda && (telefonda.yerli || telefonda.baza)) {
    driveVerisiniTetbiqEt(telefonda.yerli || telefonda.baza);
    bazaRev = Number(telefonda.bazaRev) || 0;
    bazaData = jsonKopya(telefonda.baza);
    gozleyenGonderilmeli = !!telefonda.yerli;
    firebaseDenGeldi = true;
    oflaynYazmaXetasi = true;
    setTimeout(() => toastGoster(tr('oflayn.acildi', 'İnternet yoxdur — telefonda saxlanan son məlumatla açıldı. Dəyişikliklər internet gələndə göndəriləcək.')), 600);
  }

  if (!firebaseDenGeldi) {
    yerliVeriniYukle();
    // TƏHLÜKƏSİZLİK: boş vəziyyəti buluda YALNIZ o halda yazırıq ki, Firebase-ə
    // çatıb sənədin HƏQİQƏTƏN boş (yeni key) olduğunu təsdiqləmiş olaq. Əks halda
    // (bağlantı xətası/vaxt aşımı) heç nə yazmırıq — real buludda olan datanı
    // təsadüfən boşla əvəz etməmək üçün.
    if (senedTesdiqlenmisBosdur) { bazaRev = 0; veriMenbeGuvenli = true; firebaseYazEt(); }
    else if (senkronKey) { firebasePanelGuncelle(tr('sinx.qosulmadi', 'Buluda qoşulmaq alınmadı — yenidən cəhd et.'), true); veriMenbeGuvenli = false; }
    else { veriMenbeGuvenli = true; } // Sync Key ümumiyyətlə yoxdur — təklikdə rejim qəsdən icazəlidir
  } else {
    veriMenbeGuvenli = true;
  }

  // Qeydiyyat zamanı email təsdiqindən əvvəl yerli saxlanmış ad/soyad
  // varsa, indi (təsdiqlənmiş, buluda yazmaq təhlükəsiz olan anda) tətbiq et.
  if (veriMenbeGuvenli && cariGoogleIstifadeci && cariGoogleIstifadeci.email && !istifadeciProfili.ad) {
    const gozleyen = gozleyenProfilOxu(cariGoogleIstifadeci.email);
    if (gozleyen) {
      istifadeciProfili = gozleyen;
      gozleyenProfilSil(cariGoogleIstifadeci.email);
      firebaseYazEt();
    }
  }

  yazilmisSurum = yerliSurum;
  if (gozleyenGonderilmeli) { yerliSurum++; oflaynGonderilir = true; }
  veriYuklendi = true;
  appIskeletiOlustur();
  ekraniGuncelle();
  driveMenyuGuncelle();
  firebasePanelGuncelle();
  if (firebaseHazir && senkronKey) {
    firebaseDinlemeyeBasla();
  }
  if (gozleyenGonderilmeli) firebaseYazPlanla();
  else if (firebaseDenGeldi && typeof bazaTeyinEt === 'function' && veriMenbeGuvenli && !oflaynYazmaXetasi) bazaTeyinEt(bazaData, bazaRev);
  if (typeof oflaynGostericiYenile === 'function') oflaynGostericiYenile();
  if (typeof driveAcilisYoxla === 'function') driveAcilisYoxla();
}

async function veriKaydet() {
  try {
    sonDeyisiklikVaxti = new Date().toISOString();
    if (demoRejim) return; // nümunə rejimi: heç nə saxlanılmır
    // TƏHLÜKƏSİZLİK QIFILI: bulud vəziyyəti hələ təsdiqlənməyibsə (bağlantı
    // gözlənilir/uğursuzdur), Firestore-a HEÇ NƏ yazma — əks halda ekranda
    // görünən müvəqqəti boş vəziyyət əsl buludda olan datanın üzərinə yazılıb
    // onu silə bilər. İstifadəçiyə də xəbər ver ki, dəyişiklik itməsin.
    if (senkronKey && !veriMenbeGuvenli) {
      console.warn('Yadda saxlama bloklandı: bulud mənbəyi hələ təsdiqlənməyib (bağlantı gözlənilir).');
      firebasePanelGuncelle(tr('sinx.tesdiqlenmeyibPanel', 'Bulud hələ hazır deyil — dəyişiklik göndərilmədi. Bağlantını yoxla.'), true);
      toastGoster(tr('sinx.tesdiqlenmeyibToast', 'Bulud hələ hazır deyil — dəyişiklik göndərilmədi. İnterneti yoxla və səhifəni yenilə.'), 'blok');
      return;
    }
    // QƏSDƏN localStorage-a YAZILMIR — məlumatın YEGANƏ mənbəyi Firestore-dur.
    yerliSurum++;
    if (typeof oflaynDeyisiklikSaxla === 'function') oflaynDeyisiklikSaxla(); // internet olmasa da itməsin
    firebaseYazPlanla();
  } catch (e) {
    console.error('Yadda saxlama xətası:', e);
  }
}
