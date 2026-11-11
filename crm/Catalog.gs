/**
 * TEGRI MOTORS — Вэбсайтын машин, банкны мэдээлэл (Catalog.gs)
 * CRM-ийн "Машинууд", "Банкууд" хэсгээс засна. Вэбсайт ?api=site холбоосоор уншина.
 * Анх тохируулахдаа setupCatalog() функцийг нэг удаа ажиллуулна.
 */

const SHEET_CARS = 'Машинууд';
const SHEET_BANKS = 'Банкууд';
const CAR_STATUSES = ['Бэлэн', 'Тун удахгүй', 'Захиалгаар', 'Зарагдсан'];
const CAR_FIELDS = ['id', 'name', 'kind', 'tag', 'price', 'status', 'visible', 'featured', 'order', 'kicker', 'sub', 'heroDesktop', 'heroMobile', 'cardImg', 'gallery', 'keySpecs', 'specs', 'brochure', 'updated', 'updatedBy'];
const CAR_HEADERS = ['ID', 'Нэр', 'Төрөл', 'Ангилал', 'Үнэ (₮)', 'Төлөв', 'Сайтад харуулах', 'Баннерт гаргах', 'Эрэмбэ', 'Баннерын дээд мөр', 'Тайлбар', 'Баннер — компьютер', 'Баннер — утас', 'Картын зураг', 'Цомог (JSON)', 'Гол үзүүлэлт (JSON)', 'Техникийн үзүүлэлт (JSON)', 'Танилцуулга PDF', 'Шинэчилсэн', 'Шинэчилсэн хүн'];
const BANK_FIELDS = ['id', 'name', 'mark', 'type', 'rate', 'downs', 'terms', 'notes', 'logo', 'visible', 'order', 'updated', 'updatedBy'];
const BANK_HEADERS = ['ID', 'Нэр', 'Товч тэмдэг', 'Зээлийн төрөл', 'Сарын хүү (%)', 'Урьдчилгаа (%)', 'Хугацаа (сар)', 'Нөхцөл (мөр бүрт нэг)', 'Лого', 'Сайтад харуулах', 'Эрэмбэ', 'Шинэчилсэн', 'Шинэчилсэн хүн'];
const IMG_FOLDER_NAME = 'Tegri вэбсайт зураг';
const SITE_CACHE_KEY = 'site-data-v1';

/* ---------- Вэбсайтад өгөх өгөгдөл ---------- */
function siteDataCached_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(SITE_CACHE_KEY);
  if (hit) return JSON.parse(hit);
  const data = {
    cars: readCars_().filter(c => c.visible),
    banks: readBanks_().filter(b => b.visible),
    updated: new Date().toISOString()
  };
  try { cache.put(SITE_CACHE_KEY, JSON.stringify(data), 300); } catch (e) {}
  return data;
}
function clearSiteCache_() { CacheService.getScriptCache().remove(SITE_CACHE_KEY); }

/* ---------- CRM-ээс дуудагдах функцууд ---------- */
function apiCatalog() {
  currentUser_();
  return { cars: readCars_(), banks: readBanks_(), statuses: CAR_STATUSES };
}

function apiSaveCar(obj) {
  const me = currentUser_();
  const c = cleanCar_(obj || {});
  if (!c.name) throw new Error('Машины нэрийг бичнэ үү.');
  if (!c.id) c.id = slug_(c.name);
  c.updated = new Date(); c.updatedBy = me.name;
  upsert_(SHEET_CARS, CAR_FIELDS, c, carToRow_(c));
  clearSiteCache_();
  return readCars_();
}
function apiDeleteCar(id) {
  currentUser_();
  removeRow_(SHEET_CARS, id);
  clearSiteCache_();
  return readCars_();
}
function apiSaveBank(obj) {
  const me = currentUser_();
  const b = cleanBank_(obj || {});
  if (!b.name) throw new Error('Байгууллагын нэрийг бичнэ үү.');
  if (!(b.rate > 0)) throw new Error('Сарын хүүг бичнэ үү.');
  if (!b.downs.length || !b.terms.length) throw new Error('Урьдчилгаа болон хугацааны сонголтыг бичнэ үү.');
  if (!b.id) b.id = slug_(b.name);
  b.updated = new Date(); b.updatedBy = me.name;
  upsert_(SHEET_BANKS, BANK_FIELDS, b, bankToRow_(b));
  clearSiteCache_();
  return readBanks_();
}
function apiDeleteBank(id) {
  currentUser_();
  removeRow_(SHEET_BANKS, id);
  clearSiteCache_();
  return readBanks_();
}

/** Зураг эсвэл PDF-ийг Drive-д хадгалж, сайтад харагдах холбоос буцаана. */
function apiUpload(name, mime, b64) {
  currentUser_();
  const okMime = /^(image\/(jpeg|png|webp)|application\/pdf)$/.test(String(mime));
  if (!okMime) throw new Error('Зөвхөн JPG, PNG, WebP зураг эсвэл PDF оруулна.');
  const bytes = Utilities.base64Decode(String(b64));
  if (bytes.length > 20 * 1024 * 1024) throw new Error('Файл 20 MB-аас их байна.');
  const blob = Utilities.newBlob(bytes, mime, safeName_(name));
  const file = imgFolder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const id = file.getId();
  return mime === 'application/pdf'
    ? 'https://drive.google.com/file/d/' + id + '/view'
    : 'https://lh3.googleusercontent.com/d/' + id;
}

/* ---------- Анхны тохиргоо ---------- */
function setupCatalog() {
  const ss = ss_();
  const cars = ensureSheet_(ss, SHEET_CARS, CAR_HEADERS);
  const banks = ensureSheet_(ss, SHEET_BANKS, BANK_HEADERS);
  cars.getRange(2, 5, 500, 1).setNumberFormat('#,##0');
  banks.getRange(2, 6, 500, 2).setNumberFormat('@'); // "10, 20, 30"-ийг огноо гэж ойлгохоос сэргийлнэ
  // Өмнө нь огноо болж хадгалагдсан урьдчилгаа/хугацааг анхны утгаар засна
  if (banks.getLastRow() > 1) {
    const n = banks.getLastRow() - 1, vals = banks.getRange(2, 1, n, 7).getValues();
    vals.forEach((r, i) => {
      const seed = CATALOG_SEED.banks.filter(b => b.id === String(r[0]))[0];
      [5, 6].forEach(c => {
        if (r[c] instanceof Date) banks.getRange(i + 2, c + 1).setValue(seed ? (c === 5 ? seed.downs : seed.terms).join(', ') : '');
      });
    });
  }
  const now = new Date();
  if (cars.getLastRow() < 2) {
    CATALOG_SEED.cars.forEach(c => { c.updated = now; c.updatedBy = 'Тохиргоо'; cars.appendRow(carToRow_(cleanCar_(c))); });
  }
  if (banks.getLastRow() < 2) {
    CATALOG_SEED.banks.forEach(b => { b.updated = now; b.updatedBy = 'Тохиргоо'; banks.appendRow(bankToRow_(cleanBank_(b))); });
  }
  imgFolder_();
  clearSiteCache_();
  Logger.log('Машинууд, Банкууд хуудас бэлэн боллоо.');
}

/* ---------- Туслах функцууд ---------- */
function readCars_() {
  return readRows_(SHEET_CARS, CAR_FIELDS).map(r => {
    const c = {};
    CAR_FIELDS.forEach(f => { c[f] = r[f]; });
    c.price = Number(String(r.price).replace(/[^\d.]/g, '')) || null;
    c.visible = r.visible === true || r.visible === 'TRUE';
    c.featured = r.featured === true || r.featured === 'TRUE';
    c.order = Number(r.order) || 99;
    c.gallery = parseJson_(r.gallery, []);
    c.keySpecs = parseJson_(r.keySpecs, []);
    c.specs = parseJson_(r.specs, []);
    c.updated = fmt_(r.updated, 'yyyy-MM-dd HH:mm');
    ['name', 'kind', 'tag', 'status', 'kicker', 'sub', 'heroDesktop', 'heroMobile', 'cardImg', 'brochure', 'id', 'updatedBy'].forEach(f => { c[f] = String(r[f] || ''); });
    return c;
  }).sort((a, b) => a.order - b.order);
}
function readBanks_() {
  return readRows_(SHEET_BANKS, BANK_FIELDS).map(r => ({
    id: String(r.id), name: String(r.name || ''), mark: String(r.mark || ''), type: String(r.type || ''),
    rate: Number(r.rate) || 0, downs: nums_(r.downs), terms: nums_(r.terms),
    notes: String(r.notes || '').split('\n').map(s => s.trim()).filter(Boolean),
    logo: String(r.logo || ''), visible: r.visible === true || r.visible === 'TRUE', order: Number(r.order) || 99,
    updated: fmt_(r.updated, 'yyyy-MM-dd HH:mm'), updatedBy: String(r.updatedBy || '')
  })).sort((a, b) => a.order - b.order);
}
function readRows_(name, fields) {
  const sh = sheet_(name);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, fields.length).getValues().filter(r => r[0] !== '').map(r => {
    const o = {}; fields.forEach((f, i) => { o[f] = r[i]; }); return o;
  });
}
function upsert_(name, fields, obj, row) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_(name);
    const r = findRow_(sh, obj.id);
    if (r) sh.getRange(r, 1, 1, fields.length).setValues([row]);
    else sh.appendRow(row);
  } finally { lock.releaseLock(); }
}
function removeRow_(name, id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_(name);
    const r = findRow_(sh, id);
    if (r) sh.deleteRow(r);
  } finally { lock.releaseLock(); }
}
function cleanCar_(o) {
  const url = v => { const s = String(v || '').trim(); return /^(https:\/\/|assets\/)/.test(s) ? s.slice(0, 500) : ''; };
  const list = (v, keys) => (Array.isArray(v) ? v : []).slice(0, 30).map(x => {
    const y = {}; keys.forEach(k => { y[k] = k === 'url' ? url(x && x[k]) : safe_(x && x[k], 120); }); return y;
  }).filter(x => keys.some(k => x[k]));
  return {
    id: slug_(o.id || ''), name: safe_(o.name, 80), kind: safe_(o.kind, 80), tag: safe_(o.tag, 30),
    price: Number(String(o.price || '').replace(/[^\d]/g, '')) || '',
    status: CAR_STATUSES.indexOf(o.status) >= 0 ? o.status : 'Бэлэн',
    visible: o.visible !== false, featured: !!o.featured, order: Number(o.order) || 99,
    kicker: safe_(o.kicker, 80), sub: safe_(o.sub, 200),
    heroDesktop: url(o.heroDesktop), heroMobile: url(o.heroMobile), cardImg: url(o.cardImg), brochure: url(o.brochure),
    gallery: list(o.gallery, ['label', 'url']).filter(g => g.url),
    keySpecs: list(o.keySpecs, ['value', 'unit', 'label']).slice(0, 4),
    specs: list(o.specs, ['label', 'value']),
    updated: o.updated || '', updatedBy: o.updatedBy || ''
  };
}
function carToRow_(c) {
  return CAR_FIELDS.map(f => ['gallery', 'keySpecs', 'specs'].indexOf(f) >= 0 ? JSON.stringify(c[f] || []) : (c[f] === undefined || c[f] === null ? '' : c[f]));
}
function cleanBank_(o) {
  const url = String(o.logo || '').trim();
  const notes = Array.isArray(o.notes) ? o.notes.join('\n') : String(o.notes || '');
  return {
    id: slug_(o.id || ''), name: safe_(o.name, 80), mark: safe_(o.mark, 3), type: safe_(o.type, 60),
    rate: Math.round((Number(o.rate) || 0) * 1000) / 1000, downs: nums_(o.downs), terms: nums_(o.terms),
    notes: notes.split('\n').map(s => safe_(s, 160)).filter(Boolean).slice(0, 8).join('\n'),
    logo: /^https:\/\//.test(url) ? url.slice(0, 500) : '', visible: o.visible !== false, order: Number(o.order) || 99,
    updated: o.updated || '', updatedBy: o.updatedBy || ''
  };
}
function bankToRow_(b) {
  return BANK_FIELDS.map(f => (f === 'downs' || f === 'terms') ? b[f].join(', ') : (b[f] === undefined || b[f] === null ? '' : b[f]));
}
function nums_(v) {
  const arr = Array.isArray(v) ? v : String(v || '').split(/[,\s]+/);
  return arr.map(Number).filter(n => n > 0 && n < 1000).filter((n, i, a) => a.indexOf(n) === i).sort((a, b) => a - b);
}
function parseJson_(v, d) { try { const x = JSON.parse(String(v || '')); return Array.isArray(x) ? x : d; } catch (e) { return d; } }
function slug_(s) {
  const map = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', ө: 'u', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ү: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
  return String(s || '').toLowerCase().split('').map(ch => map[ch] !== undefined ? map[ch] : ch).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
function safeName_(n) { return String(n || 'file').replace(/[^\w.\-]+/g, '_').slice(0, 80); }
function imgFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('IMG_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const f = DriveApp.createFolder(IMG_FOLDER_NAME);
  props.setProperty('IMG_FOLDER_ID', f.getId());
  return f;
}

/* Анхны өгөгдөл (сайтын fallback.js-тэй адил). Зураг "assets/..." гэсэн нь сайтын өөр дээрх файл. */
const CATALOG_SEED = {
 "cars": [
  {
   "id": "sealion-06-dm-i-pro",
   "name": "BYD Sealion 06 DM-i Pro",
   "kind": "SUV · Plug-in hybrid",
   "tag": "SUV",
   "price": "",
   "status": "Тун удахгүй",
   "featured": true,
   "order": 1,
   "kicker": "Шинэ · 0 км · Plug-in hybrid SUV",
   "sub": "Цахилгаан бензин хосолсон дунд оврын SUV",
   "heroDesktop": "assets/img/sealion06-pro-desktop.jpg",
   "heroMobile": "assets/img/sealion06-pro-mobile.jpg",
   "cardImg": "assets/img/sealion06-pro-card.jpg",
   "gallery": [
    {
     "label": "Гадна",
     "url": "assets/img/sealion06-pro-desktop.jpg"
    }
   ],
   "keySpecs": [],
   "specs": [],
   "brochure": "",
   "visible": true
  },
  {
   "id": "seal-5",
   "name": "BYD Seal 5",
   "kind": "Седан · Plug-in hybrid",
   "tag": "Седан",
   "price": 57000000,
   "status": "Бэлэн",
   "featured": true,
   "order": 2,
   "kicker": "Шинэ · 0 км · Plug-in hybrid седан",
   "sub": "Цахилгаан бензин хосолсон седан",
   "heroDesktop": "",
   "heroMobile": "",
   "cardImg": "",
   "gallery": [],
   "keySpecs": [
    {
     "value": "212",
     "unit": "м.х",
     "label": "Системийн нийт хүч"
    },
    {
     "value": "100",
     "unit": "км",
     "label": "Зөвхөн цахилгаанаар (WLTP)"
    },
    {
     "value": "1.7",
     "unit": "л",
     "label": "100 км-т зарцуулах бензин"
    },
    {
     "value": "7.5",
     "unit": "сек",
     "label": "0–100 км/ц"
    }
   ],
   "specs": [
    {
     "label": "Хөдөлгүүр",
     "value": "1.5 л бензин + цахилгаан мотор (DM-i)"
    },
    {
     "label": "Батарей",
     "value": "18.3 кВт·ц, LFP (Blade)"
    },
    {
     "label": "Урт × өргөн × өндөр",
     "value": "4780 × 1837 × 1515 мм"
    },
    {
     "label": "Суудал",
     "value": "5"
    }
   ],
   "brochure": "",
   "visible": true
  },
  {
   "id": "yuan-up",
   "name": "BYD Yuan Up",
   "kind": "Кроссовер · Цахилгаан",
   "tag": "Цахилгаан",
   "price": "",
   "status": "Бэлэн",
   "featured": true,
   "order": 3,
   "kicker": "Шинэ · 0 км · Цахилгаан",
   "sub": "Хотод зориулсан цэвэр цахилгаан кроссовер",
   "heroDesktop": "",
   "heroMobile": "",
   "cardImg": "",
   "gallery": [],
   "keySpecs": [],
   "specs": [],
   "brochure": "",
   "visible": true
  },
  {
   "id": "ti-7",
   "name": "BYD Ti 7",
   "kind": "SUV",
   "tag": "SUV",
   "price": "",
   "status": "Бэлэн",
   "featured": true,
   "order": 4,
   "kicker": "Шинэ · 0 км · SUV",
   "sub": "Аялал, гэр бүлд зориулсан том оврын SUV",
   "heroDesktop": "",
   "heroMobile": "",
   "cardImg": "",
   "gallery": [],
   "keySpecs": [],
   "specs": [],
   "brochure": "",
   "visible": true
  },
  {
   "id": "sealion-06-dm-i",
   "name": "BYD Sealion 06 DM-i",
   "kind": "SUV · Plug-in hybrid · Цагаан саарал",
   "tag": "SUV",
   "price": "",
   "status": "Тун удахгүй",
   "featured": true,
   "order": 5,
   "kicker": "Тун удахгүй · Plug-in hybrid SUV",
   "sub": "Цагаан саарал өнгө · plug-in hybrid SUV",
   "heroDesktop": "",
   "heroMobile": "",
   "cardImg": "",
   "gallery": [],
   "keySpecs": [],
   "specs": [],
   "brochure": "",
   "visible": true
  }
 ],
 "banks": [
  {
   "id": "khan",
   "name": "Хаан банк",
   "mark": "Х",
   "type": "Ногоон зээл",
   "rate": 1.25,
   "downs": [
    10,
    20,
    30,
    40
   ],
   "terms": [
    24,
    36,
    48,
    60,
    72,
    84,
    96
   ],
   "notes": [
    "Цахилгаан ба хосолмол машинд"
   ],
   "logo": "",
   "order": 1,
   "visible": true
  },
  {
   "id": "golomt",
   "name": "Голомт банк",
   "mark": "Г",
   "type": "Ногоон зээл",
   "rate": 1.3,
   "downs": [
    10,
    20,
    30
   ],
   "terms": [
    24,
    36,
    48,
    60,
    72,
    84,
    96
   ],
   "notes": [
    "Цахилгаан ба хосолмол машинд"
   ],
   "logo": "",
   "order": 2,
   "visible": true
  },
  {
   "id": "tdb",
   "name": "Төрийн банк",
   "mark": "Т",
   "type": "Ногоон зээл",
   "rate": 1.3,
   "downs": [
    10,
    20,
    30
   ],
   "terms": [
    36,
    48,
    60,
    72,
    84,
    96
   ],
   "notes": [
    "Цахилгаан ба хосолмол машинд"
   ],
   "logo": "",
   "order": 3,
   "visible": true
  },
  {
   "id": "tdb-leasing",
   "name": "Төрийн банк — санхүүгийн түрээс",
   "mark": "ТЛ",
   "type": "Санхүүгийн түрээс",
   "rate": 1.3,
   "downs": [
    10,
    20,
    30
   ],
   "terms": [
    24,
    36,
    48,
    60
   ],
   "notes": [],
   "logo": "",
   "order": 4,
   "visible": true
  },
  {
   "id": "arig",
   "name": "Ариг банк",
   "mark": "А",
   "type": "Автомашины зээл",
   "rate": 1.3,
   "downs": [
    10,
    20,
    30
   ],
   "terms": [
    24,
    36,
    48,
    60,
    72
   ],
   "notes": [],
   "logo": "",
   "order": 5,
   "visible": true
  },
  {
   "id": "bers",
   "name": "Бэрс ББСБ",
   "mark": "Б",
   "type": "ББСБ-ын зээл",
   "rate": 1.3,
   "downs": [
    20,
    30,
    40
   ],
   "terms": [
    12,
    24,
    36,
    48
   ],
   "notes": [],
   "logo": "",
   "order": 6,
   "visible": true
  }
 ]
};
