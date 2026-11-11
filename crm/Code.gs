/**
 * TEGRI MOTORS — CRM (Google Apps Script)
 * Өгөгдөл: энэ скрипт холбогдсон Google Sheet-д хадгалагдана.
 * Анх тохируулахдаа setup() функцийг нэг удаа ажиллуулна.
 */

const SHEET_LEADS = 'Лидүүд';
const SHEET_LOG = 'Түүх';
const SHEET_SETTINGS = 'Тохиргоо';
const SHEET_SUMMARY = 'Тойм';

// Вэбсайтын формоор шинэ хүсэлт ирэхэд мэдэгдэл очих имэйл
const NOTIFY_EMAIL = 'info@tegrimotors.mn';

const STATUSES = ['Шинэ', 'Холбогдсон', 'Туршилтын жолоодлого', 'Зээлийн материал', 'Урьдчилгаа төлсөн', 'Хүлээлгэн өгсөн', 'Алдсан'];
const CLOSED = ['Хүлээлгэн өгсөн', 'Алдсан'];
const ACTIONS = ['Залгах', 'Мессеж бичих', 'Үнийн санал илгээх', 'Шоурүүмд урих', 'Зээлийн бичиг баримт авах', 'Гэрээ байгуулах', 'Машин хүлээлгэх'];
const SOURCES = ['Вэбсайт', 'Facebook', 'Утас', 'Шоурүүм', 'Танил', 'BNI', 'Бусад'];
const PAYMENTS = ['Бэлэн', 'Зээл', 'Тодорхойгүй'];
// Сонирхлын түвшин:
//   Hot  — загвар сонгосон, мөнгө/зээл бэлэн, 1 сарын дотор авна эсвэл шоурүүмд ирсэн
//   Warm — сонирхож байгаа, хугацаа тодорхойгүй эсвэл зээлээ шалгаж байгаа
//   Cold — зөвхөн үнэ асуусан, "дараа болъё" гэсэн
const INTERESTS = ['Hot', 'Warm', 'Cold'];
// Энэ олон хоног ямар ч өөрчлөлт ороогүй нээлттэй лидийг автоматаар Cold болгоно (0 = унтраах)
const AUTO_COLD_DAYS = 14;

const FIELDS = ['id', 'created', 'name', 'phone', 'email', 'source', 'model', 'payment', 'status', 'owner', 'nextAction', 'actionDate', 'lostReason', 'updated', 'updatedBy', 'interest'];
const HEADERS = ['ID', 'Бүртгэсэн', 'Нэр', 'Утас', 'Имэйл', 'Эх сурвалж', 'Загвар', 'Төлбөр', 'Төлөв', 'Хариуцагч', 'Дараагийн үйлдэл', 'Үйлдлийн огноо', 'Алдсан шалтгаан', 'Шинэчилсэн', 'Шинэчилсэн хүн', 'Сонирхол'];
const LOG_HEADERS = ['Огноо', 'Лид ID', 'Хэн', 'Төрөл', 'Агуулга'];
const COL = {};
FIELDS.forEach((f, i) => { COL[f] = i + 1; });

/* =========================================================
 * CRM вэб хуудас
 * ========================================================= */
function doGet(e) {
  if (e && e.parameter && e.parameter.api === 'site') {
    try { return json_(Object.assign({ ok: true }, siteDataCached_())); }
    catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
  }
  let email = '';
  try { email = (Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (e) {}
  let allowed = false;
  let reason = '';
  if (!email) {
    reason = 'Google бүртгэлээрээ нэвтэрч орно уу.';
  } else {
    try {
      allowed = getMembers_().some(m => m.email === email);
      if (!allowed) reason = email + ' хаяг CRM-ийн гишүүдийн жагсаалтад байхгүй байна.';
    } catch (e) {
      reason = email + ' хаягтай CRM-ийн Sheet хуваалцаагүй байна.';
    }
  }
  if (!allowed) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:32px;max-width:480px;margin:auto">' +
      '<h2>Хандах эрхгүй</h2><p>' + esc_(reason) + '</p></div>'
    ).setTitle('Tegri CRM').addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Tegri CRM')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
}

/* ---------- Хуудаснаас дуудагдах функцууд ---------- */
function apiBootstrap() {
  const me = currentUser_();
  return {
    me: me,
    members: getMembers_().map(m => m.name),
    statuses: STATUSES, closed: CLOSED, actions: ACTIONS, sources: SOURCES, payments: PAYMENTS, interests: INTERESTS,
    models: getModels_(),
    leads: readLeads_()
  };
}

function apiGetLeads() {
  currentUser_();
  return readLeads_();
}

function apiGetLog(id) {
  currentUser_();
  const sh = sheet_(SHEET_LOG);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, LOG_HEADERS.length).getValues()
    .filter(r => String(r[1]) === String(id))
    .map(r => ({ at: fmt_(r[0], 'yyyy-MM-dd HH:mm'), who: String(r[2]), type: String(r[3]), text: String(r[4]) }))
    .reverse();
}

function apiSaveLead(obj) {
  const me = currentUser_();
  const clean = sanitizeLead_(obj || {});
  if (!clean.phone) throw new Error('Утасны дугаар заавал бөглөнө.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_(SHEET_LEADS);
    const now = new Date();
    if (!obj.id) {
      clean.id = newId_();
      clean.created = now;
      clean.updated = now;
      clean.updatedBy = me.name;
      sh.appendRow(toRow_(clean));
      addLog_(clean.id, me.name, 'Үүсгэсэн', 'Лид бүртгэв (' + clean.source + ')');
      SpreadsheetApp.flush();
      return toClient_(fromRow_(sh.getRange(sh.getLastRow(), 1, 1, FIELDS.length).getValues()[0]));
    }
    const r = findRow_(sh, obj.id);
    if (!r) throw new Error('Лид олдсонгүй.');
    const old = toClient_(fromRow_(sh.getRange(r, 1, 1, FIELDS.length).getValues()[0]));
    clean.id = old.id;
    clean.created = sh.getRange(r, COL.created).getValue();
    clean.updated = now;
    clean.updatedBy = me.name;
    sh.getRange(r, 1, 1, FIELDS.length).setValues([toRow_(clean)]);

    if (old.status !== clean.status) addLog_(clean.id, me.name, 'Төлөв', old.status + ' → ' + clean.status);
    if (old.interest !== clean.interest) addLog_(clean.id, me.name, 'Сонирхол', (old.interest || '—') + ' → ' + (clean.interest || '—'));
    if (old.owner !== clean.owner) addLog_(clean.id, me.name, 'Хариуцагч', (old.owner || '—') + ' → ' + (clean.owner || '—'));
    if (old.nextAction !== clean.nextAction || old.actionDate !== clean.actionDate) {
      addLog_(clean.id, me.name, 'Үйлдэл', (clean.nextAction || '—') + ' · ' + (clean.actionDate || 'огноогүй'));
    }
    SpreadsheetApp.flush();
    return toClient_(fromRow_(sh.getRange(r, 1, 1, FIELDS.length).getValues()[0]));
  } finally {
    lock.releaseLock();
  }
}

function apiAddNote(id, text) {
  const me = currentUser_();
  const t = String(text || '').trim();
  if (!t) throw new Error('Тэмдэглэл хоосон байна.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    addLog_(id, me.name, 'Тэмдэглэл', t);
    const sh = sheet_(SHEET_LEADS);
    const r = findRow_(sh, id);
    if (r) {
      sh.getRange(r, COL.updated).setValue(new Date());
      sh.getRange(r, COL.updatedBy).setValue(me.name);
    }
  } finally {
    lock.releaseLock();
  }
  return apiGetLog(id);
}

/* =========================================================
 * Вэбсайтын "Үнийн санал авах" форм хүлээн авагч
 * (тусдаа deployment: Execute as Me, Anyone)
 * Талбарууд: name, phone, email, model, payment, message, website(далд спам хамгаалалт)
 * ========================================================= */
function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.website) return json_({ ok: true }); // робот бөглөсөн бол үл тоомсорлоно
  const name = safe_(p.name, 100);
  const phone = safe_(p.phone, 40);
  if (phone.replace(/\D/g, '').length < 8) {
    return json_({ ok: false, error: 'Утасны дугаараа зөв оруулна уу.' });
  }
  const type = safe_(p.type, 40) || 'Мэдээлэл авах';
  const NEXT = { 'Туршилтын жолоодлого': 'Шоурүүмд урих', 'Зээлийн хүсэлт': 'Зээлийн бичиг баримт авах', 'Зээлийн нөхцөл': 'Залгах', 'Танилцуулга авах': 'Үнийн санал илгээх' };
  const now = new Date();
  const lead = {
    id: newId_(), created: now, name: name, phone: phone, email: safe_(p.email, 100),
    source: 'Вэбсайт', model: safe_(p.model, 60),
    payment: PAYMENTS.indexOf(p.payment) >= 0 ? p.payment : 'Тодорхойгүй',
    status: 'Шинэ', owner: '', nextAction: NEXT[type] || 'Залгах',
    actionDate: Utilities.formatDate(now, tz_(), 'yyyy-MM-dd'),
    lostReason: '', updated: now, updatedBy: 'Вэбсайт', interest: type === 'Зээлийн хүсэлт' || type === 'Туршилтын жолоодлого' ? 'Warm' : ''
  };
  const msg = String(p.message || '').trim().slice(0, 1000);
  const loan = p.bank ? ['Банк: ' + safe_(p.bank, 80), 'Урьдчилгаа: ' + safe_(p.down, 20), 'Хугацаа: ' + safe_(p.term, 20), 'Сарын төлбөр: ' + safe_(p.monthly, 30)].join(' · ') : '';
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet_(SHEET_LEADS).appendRow(toRow_(lead));
    addLog_(lead.id, 'Вэбсайт', 'Үүсгэсэн', 'Вэбсайтаас ирсэн: ' + type + (p.page ? ' (' + safe_(p.page, 100) + ')' : ''));
    if (loan) addLog_(lead.id, 'Вэбсайт', 'Тэмдэглэл', 'Зээлийн тооцоо — ' + loan);
    if (msg) addLog_(lead.id, 'Вэбсайт', 'Тэмдэглэл', 'Хэрэглэгчийн мессеж: ' + msg);
  } finally {
    lock.releaseLock();
  }
  try {
    MailApp.sendEmail(NOTIFY_EMAIL,
      'Вэбсайт: ' + type + ' — ' + (name || phone) + (lead.model ? ' · ' + lead.model : ''),
      ['Төрөл: ' + type, 'Нэр: ' + (name || '—'), 'Утас: ' + phone, 'Имэйл: ' + (lead.email || '—'),
       'Загвар: ' + (lead.model || '—'), 'Төлбөр: ' + lead.payment, loan ? 'Зээл: ' + loan : '',
       'Мессеж: ' + (msg || '—'), '', 'CRM дээр "Шинэ" төлөвтэй бүртгэгдлээ.'].filter(Boolean).join('\n'));
  } catch (err) {}
  return json_({ ok: true, id: lead.id });
}

/* =========================================================
 * Өглөө бүр хариуцагч бүрт "өнөөдөр холбогдох" жагсаалт илгээх
 * ========================================================= */
function dailyDigest() {
  const today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  const open = readLeads_().filter(l => CLOSED.indexOf(l.status) < 0);
  getMembers_().forEach(m => {
    const due = open.filter(l =>
      (l.owner === m.name && l.actionDate && l.actionDate <= today) || (!l.owner && l.status === 'Шинэ'));
    if (!due.length) return;
    due.sort((a, b) => interestRank_(a.interest) - interestRank_(b.interest));
    const lines = due.map(l => '• ' + (l.interest ? '[' + l.interest + '] ' : '') + (l.name || 'Нэргүй') + ' (' + l.phone + ') — ' + (l.nextAction || 'үйлдэл тодорхойгүй') +
      (l.actionDate ? ', ' + l.actionDate : '') + (l.owner ? '' : ' [хариуцагчгүй]'));
    MailApp.sendEmail(m.email, 'Tegri CRM: өнөөдөр холбогдох ' + due.length + ' лид',
      'Сайн байна уу, ' + m.name + '!\n\n' + lines.join('\n'));
  });
}

/* =========================================================
 * Удаан хөдөлгөөнгүй лидийг автоматаар Cold болгох (өдөр бүр)
 * ========================================================= */
function autoCold() {
  if (!AUTO_COLD_DAYS) return;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(SHEET_LEADS);
    const n = sh.getLastRow() - 1;
    if (n < 1) return;
    const rows = sh.getRange(2, 1, n, FIELDS.length).getValues();
    const limit = Date.now() - AUTO_COLD_DAYS * 86400000;
    rows.forEach((r, i) => {
      const l = fromRow_(r);
      if (!l.id || CLOSED.indexOf(l.status) >= 0 || l.interest === 'Cold') return;
      const last = l.updated instanceof Date ? l.updated : (l.created instanceof Date ? l.created : null);
      if (!last || last.getTime() > limit) return;
      const row = i + 2;
      sh.getRange(row, COL.interest).setValue('Cold');
      sh.getRange(row, COL.updated).setValue(new Date());
      sh.getRange(row, COL.updatedBy).setValue('Систем');
      addLog_(l.id, 'Систем', 'Сонирхол', (l.interest || '—') + ' → Cold (' + AUTO_COLD_DAYS + ' хоног хөдөлгөөнгүй)');
    });
  } finally {
    lock.releaseLock();
  }
}

/* =========================================================
 * Анхны тохиргоо — нэг удаа ажиллуулна
 * ========================================================= */
// CRM-ийн өгөгдөл хадгалах Google Sheet-ийн ID (холбоосын /d/ ба /edit хоорондох хэсэг)
const CRM_SHEET_ID = '1vBooYU_BJ1lcv_YaFLw-Ef6ZT_2VUB1_AremYUBSGJo';

function setup() {
  const ss = CRM_SHEET_ID ? SpreadsheetApp.openById(CRM_SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Ulaanbaatar');
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  const N = 3000;

  // Тохиргоо
  let set = ss.getSheetByName(SHEET_SETTINGS);
  if (!set) {
    set = ss.insertSheet(SHEET_SETTINGS);
    set.getRange('A1:B5').setValues([
      ['Гишүүний нэр', 'Gmail хаяг'],
      ['Ганзориг', Session.getEffectiveUser().getEmail()],
      ['Аюурсүрэн', ''], ['Цогтбаяр', ''], ['Ганбилэг', '']
    ]);
    set.getRange('D1:D5').setValues([['Загварууд'], ['Seal 5'], ['Sealion 06 DM-i Pro'], ['Yuan Up'], ['Ti 7']]);
    set.getRange('A1:D1').setFontWeight('bold');
    set.setColumnWidth(1, 160); set.setColumnWidth(2, 260); set.setColumnWidth(4, 200);
  }

  // Лидүүд
  const leads = ensureSheet_(ss, SHEET_LEADS, HEADERS);
  leads.getRange(2, COL.phone, N, 1).setNumberFormat('@');
  leads.getRange(2, COL.created, N, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  leads.getRange(2, COL.updated, N, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  leads.getRange(2, COL.actionDate, N, 1).setNumberFormat('yyyy-mm-dd');
  listRule_(leads, COL.status, STATUSES, N, false);
  listRule_(leads, COL.nextAction, ACTIONS, N, false);
  listRule_(leads, COL.source, SOURCES, N, false);
  listRule_(leads, COL.payment, PAYMENTS, N, false);
  listRule_(leads, COL.interest, INTERESTS, N, false);
  leads.getRange(2, COL.owner, N, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(set.getRange('A2:A30'), true).setAllowInvalid(true).build());
  leads.getRange(2, COL.model, N, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(set.getRange('D2:D60'), true).setAllowInvalid(true).build());
  leads.getRange(2, COL.actionDate, N, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());

  // Өнгө: хугацаа хэтэрсэн / өнөөдөр, төлөв бүрийн өнгө
  const open = '$I2<>"Хүлээлгэн өгсөн",$I2<>"Алдсан"';
  const dateRng = leads.getRange(2, COL.actionDate, N, 1);
  const statusRng = leads.getRange(2, COL.status, N, 1);
  const rules = [
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($L2<>"",$L2<TODAY(),' + open + ')')
      .setBackground('#fee2e2').setFontColor('#b91c1c').setRanges([dateRng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($L2<>"",$L2=TODAY(),' + open + ')')
      .setBackground('#fef3c7').setFontColor('#92400e').setRanges([dateRng]).build()
  ];
  const colors = {
    'Шинэ': '#dbeafe', 'Холбогдсон': '#cffafe', 'Туршилтын жолоодлого': '#ede9fe', 'Зээлийн материал': '#fae8ff',
    'Урьдчилгаа төлсөн': '#fef3c7', 'Хүлээлгэн өгсөн': '#dcfce7', 'Алдсан': '#e5e7eb'
  };
  Object.keys(colors).forEach(s => rules.push(
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(s).setBackground(colors[s]).setRanges([statusRng]).build()));
  const intRng = leads.getRange(2, COL.interest, N, 1);
  [['Hot', '#fee2e2', '#b91c1c'], ['Warm', '#ffedd5', '#c2410c'], ['Cold', '#e5e7eb', '#475569']].forEach(c => rules.push(
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(c[0]).setBackground(c[1]).setFontColor(c[2]).setBold(true).setRanges([intRng]).build()));
  leads.setConditionalFormatRules(rules);
  [130, 130, 150, 110, 180, 110, 160, 100, 170, 110, 170, 120, 180, 130, 120, 100].forEach((w, i) => leads.setColumnWidth(i + 1, w));

  // Түүх
  const log = ensureSheet_(ss, SHEET_LOG, LOG_HEADERS);
  log.getRange(2, 1, N * 3, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  [130, 150, 110, 100, 500].forEach((w, i) => log.setColumnWidth(i + 1, w));

  // Тойм
  let sum = ss.getSheetByName(SHEET_SUMMARY) || ss.insertSheet(SHEET_SUMMARY);
  sum.clear();
  [['A', 'I'], ['D', 'P'], ['G', 'F'], ['J', 'G'], ['M', 'J']].forEach(b => {
    sum.getRange(b[0] + '1').setFormula(
      "=QUERY('" + SHEET_LEADS + "'!A1:P,\"select " + b[1] + ", count(A) where A is not null group by " + b[1] +
      " label count(A) 'Тоо'\",1)");
  });
  sum.getRange('A1:N1').setFontWeight('bold');

  // Эрэмбэ, хэрэггүй хоосон хуудсыг устгах
  [SHEET_LEADS, SHEET_LOG, SHEET_SUMMARY, SHEET_SETTINGS].forEach((name, i) => {
    ss.setActiveSheet(ss.getSheetByName(name));
    ss.moveActiveSheet(i + 1);
  });
  const keep = [SHEET_LEADS, SHEET_LOG, SHEET_SUMMARY, SHEET_SETTINGS];
  ss.getSheets().forEach(s => {
    if (keep.indexOf(s.getName()) < 0 && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  ss.setActiveSheet(leads);

  // Өглөө 8 цагийн имэйл сануулга
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'dailyDigest').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailyDigest').timeBased().everyDays(1).atHour(8).inTimezone('Asia/Ulaanbaatar').create();
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'autoCold').forEach(t => ScriptApp.deleteTrigger(t));
  if (AUTO_COLD_DAYS) ScriptApp.newTrigger('autoCold').timeBased().everyDays(1).atHour(6).inTimezone('Asia/Ulaanbaatar').create();

  Logger.log('Тохиргоо дууслаа. "Тохиргоо" хуудсанд гишүүдийн Gmail-ийг бөглөнө үү.');
}

/* =========================================================
 * Туслах функцууд
 * ========================================================= */
let _ss = null, _tz = null;
function ss_() {
  if (_ss) return _ss;
  const id = CRM_SHEET_ID || PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  _ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  return _ss;
}
function tz_() { return _tz || (_tz = ss_().getSpreadsheetTimeZone() || 'Asia/Ulaanbaatar'); }
function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('"' + name + '" хуудас олдсонгүй. setup() ажиллуулна уу.');
  return sh;
}

function getMembers_() {
  const sh = sheet_(SHEET_SETTINGS);
  const n = Math.max(sh.getLastRow() - 1, 1);
  return sh.getRange(2, 1, n, 2).getValues()
    .filter(r => String(r[1]).trim())
    .map(r => ({ name: String(r[0] || r[1]).trim(), email: String(r[1]).trim().toLowerCase() }));
}
function getModels_() {
  const sh = sheet_(SHEET_SETTINGS);
  const n = Math.max(sh.getLastRow() - 1, 1);
  return sh.getRange(2, 4, n, 1).getValues().map(r => String(r[0]).trim()).filter(Boolean);
}
function currentUser_() {
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) throw new Error('Google бүртгэлээрээ нэвтэрнэ үү.');
  const me = getMembers_().filter(m => m.email === email)[0];
  if (!me) throw new Error(email + ' хаяг CRM-д эрхгүй байна.');
  return me;
}

function readLeads_() {
  const sh = sheet_(SHEET_LEADS);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, FIELDS.length).getValues()
    .filter(r => r[0] !== '')
    .map(r => toClient_(fromRow_(r)));
}
function fromRow_(r) { const o = {}; FIELDS.forEach((f, i) => { o[f] = r[i]; }); return o; }
function toRow_(o) { return FIELDS.map(f => (o[f] === undefined || o[f] === null) ? '' : o[f]); }
function toClient_(o) {
  const c = {};
  FIELDS.forEach(f => { c[f] = fmt_(o[f], 'yyyy-MM-dd'); });
  c.created = fmt_(o.created, 'yyyy-MM-dd HH:mm');
  c.updated = fmt_(o.updated, 'yyyy-MM-dd HH:mm');
  return c;
}
function fmt_(v, pattern) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), pattern);
  return v === null || v === undefined ? '' : String(v);
}
function findRow_(sh, id) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  const ids = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}
function sanitizeLead_(o) {
  const pick = (v, list, def) => list.indexOf(v) >= 0 ? v : def;
  const d = String(o.actionDate || '').trim();
  return {
    name: safe_(o.name, 100), phone: safe_(o.phone, 40), email: safe_(o.email, 100),
    source: pick(o.source, SOURCES, 'Бусад'), model: safe_(o.model, 60),
    payment: pick(o.payment, PAYMENTS, 'Тодорхойгүй'), status: pick(o.status, STATUSES, 'Шинэ'),
    owner: safe_(o.owner, 60), nextAction: pick(o.nextAction, ACTIONS, ''),
    actionDate: /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '', lostReason: safe_(o.lostReason, 200),
    interest: pick(o.interest, INTERESTS, '')
  };
}
function interestRank_(v) { const i = INTERESTS.indexOf(v); return i < 0 ? 1.5 : i; }
// Sheet томьёо болж хувирахаас сэргийлнэ
function safe_(v, max) {
  let s = String(v === null || v === undefined ? '' : v).trim().slice(0, max || 500);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
function addLog_(id, who, type, text) {
  sheet_(SHEET_LOG).appendRow([new Date(), id, who, type, safe_(text, 2000)]);
}
function newId_() {
  return 'T' + Utilities.formatDate(new Date(), tz_(), 'yyMMdd-HHmmss') + Math.floor(Math.random() * 90 + 10);
}
function ensureSheet_(ss, name, headers) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]); // шинэ багана нэмэгдсэн бол толгойг шинэчилнэ
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0b0f14').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  const prot = sh.getRange(1, 1, 1, headers.length).protect().setDescription('Толгой мөр');
  prot.setWarningOnly(true);
  return sh;
}
function listRule_(sh, col, list, n, allowInvalid) {
  sh.getRange(2, col, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(allowInvalid).build());
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function esc_(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
