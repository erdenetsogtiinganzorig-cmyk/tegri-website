/* Tegri Motors — сайтын үндсэн код */
(function () {
  'use strict';
  var C = window.TEGRI_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return Math.round(n).toLocaleString('en-US') + '₮'; };
  var tel = function (p) { return 'tel:' + String(p).replace(/\D/g, ''); };
  var ARROW = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var PREV = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';
  var DL = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
  var PIN = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  var PHONE = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>';
  var MAIL = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
  var CLOCK = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  var FB = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5H16l.5-3h-3V8.6c0-.9.3-1.6 1.6-1.6h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10.5H8v3h2.5V21z"/></svg>';
  var NEXT = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  var CHECK = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1ec8f0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /* ---------- Өгөгдөл ---------- */
  var CACHE_KEY = 'tegri-data-v1';
  function normalize(d) {
    var cars = (d.cars || []).filter(function (c) { return c && c.name && c.visible !== false; });
    cars.sort(function (a, b) { return (a.order || 99) - (b.order || 99); });
    var banks = (d.banks || []).filter(function (b) { return b && b.name && b.visible !== false && b.rate > 0 && (b.downs || []).length && (b.terms || []).length; });
    banks.sort(function (a, b) { return (a.order || 99) - (b.order || 99); });
    return { cars: cars, banks: banks };
  }
  function loadData() {
    var fb = window.TEGRI_FALLBACK || { cars: [], banks: [] };
    if (!C.API) return Promise.resolve(normalize(fb));
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) {}
    var fresh = fetch(C.API + (C.API.indexOf('?') < 0 ? '?' : '&') + 'api=site', { redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.cars) throw new Error('bad data');
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) {}
        return normalize(d);
      });
    if (cached && cached.cars) { fresh.catch(function () {}); return Promise.resolve(normalize(cached)); }
    return fresh.catch(function () { return normalize(fb); });
  }

  /* ---------- Хүсэлт илгээх (CRM руу) ---------- */
  function sendLead(fields) {
    if (!C.API) { console.info('[Tegri] API тохируулаагүй — илгээгээгүй:', fields); return Promise.resolve(); }
    var body = new URLSearchParams();
    Object.keys(fields).forEach(function (k) { if (fields[k] != null && fields[k] !== '') body.append(k, fields[k]); });
    body.append('page', location.pathname + location.search);
    return fetch(C.API, { method: 'POST', mode: 'no-cors', body: body }).catch(function () {});
  }
  var phoneOk = function (p) { return String(p || '').replace(/\D/g, '').length >= 8; };

  /* ---------- Нийтлэг хэсгүүд ---------- */
  function header(solid) {
    var h = document.createElement('header');
    h.className = 'hdr' + (solid ? ' solid' : '');
    h.innerHTML = '<div class="hdr-in">' +
      '<a class="hdr-logo" href="index.html" aria-label="Tegri Motors нүүр"><img src="assets/img/logo.png" alt="Tegri EV Motors" width="141" height="40"></a>' +
      '<nav class="nav" aria-label="Үндсэн цэс"><a href="index.html#cars">Машинууд</a><a href="index.html#why">Баталгаа ба бэлэг</a><a href="index.html#showroom">Шоурүүм</a><a href="#contact">Холбоо барих</a></nav>' +
      '<a class="hdr-phone" href="' + tel(C.phones[0]) + '">' + esc(C.phones[0]) + '</a>' +
      '<a class="btn btn-cyan hdr-cta" href="#contact" data-intent="Туршилтын жолоодлого">Туршилтын жолоодлого</a>' +
      '<button class="menu-btn" type="button" aria-label="Цэс нээх" aria-expanded="false"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>' +
      '</div>';
    var dr = document.createElement('div');
    dr.className = 'drawer'; dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-label', 'Цэс');
    dr.innerHTML = '<div class="drawer-top"><img src="assets/img/logo.png" alt="Tegri EV Motors" width="106" height="30"><button class="close" type="button" aria-label="Цэс хаах">×</button></div><a href="index.html#cars">Машинууд</a><a href="index.html#why">Баталгаа ба бэлэг</a><a href="index.html#showroom">Шоурүүм</a><a href="#contact">Холбоо барих</a><a href="' + tel(C.phones[0]) + '">☎ ' + esc(C.phones[0]) + '</a>';
    var btn = $('.menu-btn', h);
    var close = function () { dr.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); document.documentElement.classList.remove('lock'); };
    btn.onclick = function () { dr.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); document.documentElement.classList.add('lock'); };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    if (!solid) {
      var onScroll = function () { h.classList.toggle('scrolled', window.scrollY > 40); };
      window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    }
    $('.close', dr).onclick = close;
    dr.addEventListener('click', function (e) { if (e.target.tagName === 'A') close(); });
    document.body.prepend(dr);
    document.body.prepend(h);
  }
  function footer() {
    var f = document.createElement('footer');
    f.className = 'ftr';
    var SR = C.showroom || {};
    f.innerHTML = '<div class="wrap"><div class="ftr-grid">' +
      '<div class="ftr-brand"><img src="assets/img/logo.png" alt="Tegri EV Motors" width="141" height="40"><p>Шинэ, 0 км цахилгаан ба plug-in hybrid машин. Баталгаа, бэлэг, банкны зээлтэй.</p>' +
      '<a class="ftr-social" href="' + esc(C.facebook) + '" target="_blank" rel="noopener">' + FB + '<span>Facebook</span></a></div>' +
      '<div class="ftr-col"><h3>Холбоо барих</h3><div class="ftr-phones">' + C.phones.map(function (p) { return '<a class="ftr-phone" href="' + tel(p) + '">' + PHONE + '<span>' + esc(p) + '</span></a>'; }).join('') + '</div>' +
      '<a class="ftr-line" href="mailto:' + esc(C.email) + '">' + MAIL + '<span>' + esc(C.email) + '</span></a></div>' +
      '<div class="ftr-col"><h3>Шоурүүм</h3><a class="ftr-line" href="' + esc(mapsUrl()) + '" target="_blank" rel="noopener">' + PIN + '<span>' + esc(C.address) + '</span></a>' +
      (SR.hours ? '<span class="ftr-line">' + CLOCK + '<span>' + esc(SR.hours) + '</span></span>' : '') + '</div>' +
      '</div><div class="ftr-bottom"><span>© ' + new Date().getFullYear() + ' ' + esc(C.company) + '</span><span>tegrimotors.mn</span></div></div>';
    document.body.appendChild(f);
  }
  /* Утгагүй мөр (жишээ нь "Хэмжээ ба жин") нь бүлгийн гарчиг болно */
  function specGroups(list) {
    var gs = [], g = null;
    list.forEach(function (x) {
      if (!x.value) { g = { name: x.label, rows: [] }; gs.push(g); return; }
      if (!g) { g = { name: '', rows: [] }; gs.push(g); }
      g.rows.push(x);
    });
    return gs.filter(function (x) { return x.rows.length; });
  }
  function mapsUrl() { var SR = C.showroom || {}; return SR.mapsUrl || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(SR.mapsQuery || C.address); }
  function dlLabel(c) { return DL + '<span>Танилцуулга татах (PDF)</span>'; }
  function statusHtml(s) { return s ? '<span class="status' + (s === 'Бэлэн' ? ' ok' : '') + '">' + esc(s) + '</span>' : ''; }
  function priceText(c) { return c.price ? fmt(c.price) : 'Үнэ лавлах'; }
  function carUrl(c) { return 'car.html?id=' + encodeURIComponent(c.id); }

  /* ---------- Холбоо барих форм ---------- */
  function contactForm(el, opts) {
    opts = opts || {};
    var models = (opts.cars || []).map(function (c) { return '<option' + (opts.car && opts.car.id === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
    el.innerHTML =
      '<div class="wrap contact-in"><div class="contact-txt"><h2 class="h2" id="contact-h">' + esc(opts.title || 'Мэдээлэл авах') + '</h2>' +
      '<p>Утасны дугаараа үлдээгээрэй. Манай зөвлөх ' + esc(C.callbackText) + ' холбогдож, үнэ, зээлийн нөхцөл, туршилтын жолоодлогын цагийг тохирно.</p></div>' +
      '<form class="form" novalidate>' +
      '<div class="field full"><label for="cf-phone">Утасны дугаар *</label><input id="cf-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="8888 8888" required><span class="err" hidden>8 оронтой утасны дугаар оруулна уу</span></div>' +
      '<div class="field"><label for="cf-name">Нэр</label><input id="cf-name" name="name" autocomplete="name" placeholder="Заавал биш"></div>' +
      '<div class="field"><label for="cf-model">Сонирхсон загвар</label><select id="cf-model" name="model">' + models + '<option>Шийдээгүй байна</option></select></div>' +
      '<div class="field full"><label for="cf-want">Юу сонирхож байна</label><select id="cf-want" name="intent"><option>Мэдээлэл авах</option><option>Туршилтын жолоодлого</option><option>Зээлийн нөхцөл</option><option>Танилцуулга авах</option><option>Бусад</option></select></div>' +
      '<button class="btn btn-cyan btn-block field full" type="submit">Илгээх</button></form></div>';
    var form = $('form', el);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var err = $('.err', form);
      if (!phoneOk(fd.get('phone'))) { err.hidden = false; $('#cf-phone').focus(); return; }
      err.hidden = true;
      var btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Илгээж байна…';
      sendLead({ type: fd.get('intent'), phone: fd.get('phone'), name: fd.get('name'), model: fd.get('model') }).then(function () {
        form.innerHTML = '<div class="done" role="status"><h3>Баярлалаа!</h3><p>Таны хүсэлтийг хүлээж авлаа. Манай зөвлөх ' + esc(C.callbackText) + ' холбогдоно.</p></div>';
      });
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-intent]');
      if (a) { var s = $('#cf-want'); if (s) s.value = a.getAttribute('data-intent'); }
    });
  }

  /* ---------- Нүүр хуудас ---------- */
  function renderHome(data) {
    header(false);
    var cars = data.cars;
    var slides = cars.filter(function (c) { return c.featured; });
    if (!slides.length) slides = cars.slice(0, 5);
    var i = 0;
    var hero = $('#hero');
    function draw() {
      var c = slides[i];
      if (!c) { hero.innerHTML = '<div class="hero-noimg"></div>'; return; }
      var pic = c.heroDesktop || c.heroMobile
        ? '<picture>' + (c.heroMobile ? '<source media="(max-width:860px)" srcset="' + esc(c.heroMobile) + '">' : '') + '<img src="' + esc(c.heroDesktop || c.heroMobile) + '" alt="' + esc(c.name) + '" fetchpriority="high"></picture>'
        : '<div class="hero-noimg"></div>';
      hero.innerHTML = pic +
        '<div class="hero-in"><div class="hero-txt"><p class="kicker">' + esc(c.kicker || c.kind) + '</p><h1>' + esc(c.name) + '</h1>' +
        (c.sub ? '<p class="hero-sub">' + esc(c.sub) + '</p>' : '') +
        (c.price ? '<p class="hero-price">' + fmt(c.price) + '</p>' : '') +
        '<div class="hero-cta">' + (c.brochure ? '<a class="btn btn-cyan" href="' + esc(c.brochure) + '" target="_blank" rel="noopener">' + dlLabel(c) + '</a>' : '<a class="btn btn-cyan" href="#contact" data-intent="Танилцуулга авах">' + dlLabel(c) + '</a>') +
        '<a class="link-arrow" href="' + carUrl(c) + '">Дэлгэрэнгүй үзэх ' + ARROW + '</a></div></div>' +
        (slides.length > 1 ? '<div class="hero-nav"><div class="tabs" role="tablist" aria-label="Загвар сонгох">' +
          slides.map(function (s, k) { return '<button class="tab" role="tab" type="button" aria-selected="' + (k === i) + '" data-k="' + k + '">' + esc(s.name.replace(/^BYD\s+/, '')) + '</button>'; }).join('') +
          '</div><div class="arrows"><button class="arrow" type="button" data-d="-1" aria-label="Өмнөх загвар">' + PREV + '</button><button class="arrow" type="button" data-d="1" aria-label="Дараагийн загвар">' + NEXT + '</button></div></div>' : '') +
        '</div>';
    }
    hero.addEventListener('click', function (e) {
      var t = e.target.closest('[data-k],[data-d]'); if (!t) return;
      i = t.hasAttribute('data-k') ? +t.getAttribute('data-k') : (i + +t.getAttribute('data-d') + slides.length) % slides.length;
      draw();
    });
    draw();

    // Машинууд
    var tags = ['Бүгд'].concat(cars.map(function (c) { return c.tag; }).filter(function (t, k, a) { return t && a.indexOf(t) === k; }));
    var filter = 'Бүгд';
    var sec = $('#cars');
    sec.innerHTML = '<div class="wrap"><div class="cars-head"><h2 class="h2">Машинууд</h2><div class="filters"><div class="filters" role="group" aria-label="Төрлөөр шүүх">' +
      tags.map(function (t) { return '<button class="chip" type="button" aria-pressed="' + (t === filter) + '" data-tag="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') +
      '</div><div class="arrows"><button class="arrow dark" type="button" data-s="-1" aria-label="Өмнөх машинууд">' + PREV + '</button><button class="arrow dark fill" type="button" data-s="1" aria-label="Дараагийн машинууд">' + NEXT + '</button></div></div></div>' +
      '<div class="track" tabindex="0" aria-label="Машинуудын жагсаалт"></div><p class="swipe-hint">← Хажуу тийш гүйлгэж бүх машиныг үзнэ үү →</p></div>';
    var track = $('.track', sec);
    function drawCars() {
      track.innerHTML = cars.filter(function (c) { return filter === 'Бүгд' || c.tag === filter; }).map(function (c) {
        return '<article class="card"><a class="card-link" href="' + carUrl(c) + '" tabindex="-1" aria-hidden="true">' + (c.cardImg || c.heroDesktop ? '<img class="card-img" loading="lazy" src="' + esc(c.cardImg || c.heroDesktop) + '" alt="">' : '<div class="card-ph">Зураг удахгүй</div>') + '</a>' +
          '<div class="card-body"><span class="card-kind">' + esc(c.kind) + '</span><h3><a href="' + carUrl(c) + '">' + esc(c.name) + '</a></h3>' +
          '<div class="price-row"><p class="price">' + priceText(c) + '</p>' + statusHtml(c.status) + '</div>' +
          '<a class="btn btn-dark btn-block" href="' + carUrl(c) + '">Дэлгэрэнгүй</a></div></article>';
      }).join('');
    }
    sec.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tag],[data-s]'); if (!t) return;
      if (t.hasAttribute('data-tag')) {
        filter = t.getAttribute('data-tag');
        sec.querySelectorAll('[data-tag]').forEach(function (b) { b.setAttribute('aria-pressed', b === t); });
        drawCars();
      } else track.scrollBy({ left: +t.getAttribute('data-s') * 320, behavior: 'smooth' });
    });
    drawCars();

    // Шоурүүм
    var SR = C.showroom || {}, sr = $('#showroom');
    if (sr) sr.innerHTML = '<div class="wrap"><div class="sr-box"><div class="sr-img">' +
      (SR.image ? '<img src="' + esc(SR.image) + '" alt="' + esc(SR.title || 'Tegri Motors шоурүүм') + '" loading="lazy">' : '<div class="sr-ph">' + PIN + '<span>Шоурүүмийн зураг</span></div>') + '</div>' +
      '<div class="sr-txt"><span class="eyebrow">Шоурүүм</span><h2 class="h2" id="showroom-h">' + esc(SR.title || 'Шоурүүмд зочлоорой') + '</h2>' +
      '<p>' + esc(SR.text || 'Машинуудыг биеэр үзэж, туршилтын жолоодлого хийх боломжтой.') + '</p>' +
      '<ul class="sr-meta"><li>' + PIN + '<span>' + esc(C.address) + '</span></li>' + (SR.hours ? '<li>' + CLOCK + '<span>' + esc(SR.hours) + '</span></li>' : '') + '</ul>' +
      '<a class="btn btn-dark" href="' + esc(mapsUrl()) + '" target="_blank" rel="noopener">' + PIN + '<span>Байршил харах</span></a></div></div></div>';

    contactForm($('#contact'), { cars: cars, title: 'Үнийн санал, мэдээлэл авах' });
    footer();
  }

  function pay(price, down, term, rate) {
    var P = price * (1 - down / 100), r = rate / 100;
    return P * r / (1 - Math.pow(1 + r, -term));
  }

  /* Хүүгийн нөхцөл: орлогын төрөл, машины төрөл (EV/PHEV), хугацаанаас хамаарна */
  var INCOMES = ['Цалин', 'Бизнес'];
  function rateFor(b, car, inc, term) {
    var rules = b.rules || [];
    if (!rules.length) return { min: b.rate, max: b.rate };
    var power = car.power === 'EV' ? 'EV' : 'PHEV', best = null;
    rules.forEach(function (r) {
      if ((r.inc === 'Бүгд' || r.inc === inc) && (r.car === 'Бүгд' || r.car === power) && r.max >= term && (!best || r.max < best.max)) best = r;
    });
    return best ? { min: best.rate, max: best.rateMax > best.rate ? best.rateMax : best.rate } : null;
  }
  function termsFor(b, car, inc) { return b.terms.filter(function (t) { return rateFor(b, car, inc, t); }); }
  function bankFits(b, car) { return INCOMES.some(function (i) { return termsFor(b, car, i).length; }); }
  /* Хамгийн бага сарын төлбөрийн жишээ: хамгийн бага урьдчилгаа биш, 20%-иас эхэлнэ (боломжтой бол) */
  function bestOffer(car, banks) {
    var best = null;
    banks.forEach(function (b) {
      if (!bankFits(b, car)) return;
      var d = b.downs.indexOf(20) >= 0 ? 20 : b.downs[0];
      INCOMES.forEach(function (inc) {
        var ts = termsFor(b, car, inc); if (!ts.length) return;
        var t = ts[ts.length - 1], r = rateFor(b, car, inc, t), m = pay(car.price, d, t, r.min);
        if (!best || m < best.m) best = { m: m, b: b, d: d, t: t, r: r, inc: inc };
      });
    });
    return best;
  }
  function pct(r) { return r.max > r.min ? r.min + '–' + r.max + '%' : r.min + '%'; }

  /* ---------- Машины дэлгэрэнгүй ---------- */
  function renderCar(data) {
    header(true);
    var id = new URLSearchParams(location.search).get('id');
    var car = data.cars.filter(function (c) { return c.id === id; })[0] || data.cars[0];
    var main = $('#main');
    if (!car) { main.innerHTML = '<div class="wrap" style="padding:80px 24px"><h1>Машин олдсонгүй</h1><p><a href="index.html">Нүүр хуудас руу буцах</a></p></div>'; footer(); return; }
    document.title = car.name + ' — Tegri Motors';
    var md = document.querySelector('meta[name=description]');
    if (md) md.setAttribute('content', car.name + (car.price ? ', ' + fmt(car.price) : '') + '. ' + (car.sub || car.kind || '') + ' — Tegri Motors, Улаанбаатар.');
    var gallery = (car.gallery || []).filter(function (g) { return g && g.url; });
    if (!gallery.length && (car.heroDesktop || car.cardImg)) gallery = [{ label: 'Гадна', url: car.heroDesktop || car.cardImg }];
    var gi = 0;
    var banks = data.banks.filter(function (b) { return bankFits(b, car); });
    var offer = car.price ? bestOffer(car, banks) : null;
    var teaser = offer ? '<span class="teaser-line">Зээлээр сард ≈ ' + fmt(offer.m) + '-өөс</span>' : '';

    main.innerHTML =
      '<section class="top"><div class="wrap"><nav class="crumbs" aria-label="Хуудасны зам"><a href="index.html#cars">Машинууд</a> / ' + esc(car.name) + '</nav>' +
      '<div class="top-in"><div class="gal"><div id="gal-main"></div>' + (gallery.length > 1 ? '<div class="thumbs" role="group" aria-label="Зургийн цомог"></div>' : '') + '</div>' +
      '<aside class="aside"><span class="kicker">' + esc(car.kicker || car.kind) + '</span><h1>' + esc(car.name) + '</h1>' +
      '<div><div class="small">Үнэ, НӨАТ орсон</div><div class="big">' + priceText(car) + '</div>' + teaser + '</div>' + statusHtml(car.status) +
      '<a class="btn btn-cyan btn-block" href="#contact" data-intent="Туршилтын жолоодлого">Туршилтын жолоодлого товлох</a>' +
      (car.brochure ? '<a class="dl-btn" href="' + esc(car.brochure) + '" target="_blank" rel="noopener">' + dlLabel(car) + '</a>' : '<a class="dl-btn" href="#contact" data-intent="Танилцуулга авах">' + dlLabel(car) + '</a>') +
      '<ul><li>✓ ' + esc(C.gifts[0]) + '</li><li>✓ Бэлгийн багц машин бүрт</li><li>✓ Банк, ББСБ-ын зээл</li></ul></aside></div></div></section>' +
      ((car.keySpecs || []).length ? '<section class="keyspecs" aria-label="Гол үзүүлэлтүүд"><div class="keyspecs-in wrap">' + car.keySpecs.map(function (k) { return '<div><div class="ks-v">' + esc(k.value) + ' <small>' + esc(k.unit || '') + '</small></div><div class="ks-l">' + esc(k.label) + '</div></div>'; }).join('') + '</div></section>' : '') +
      (car.price && banks.length ? '<section class="calc" id="calc" aria-labelledby="calc-h"><div class="wrap"><h2 class="h2" id="calc-h">Зээлийн тооцоолуур</h2><p class="lead">Гэрээт банк, ББСБ-аа сонгоод урьдчилгаа, хугацаагаа тохируулна уу.</p><div class="banks" role="tablist" aria-label="Гэрээт байгууллагууд"></div><div class="calc-grid" id="calc-body"></div></div></section>' : '') +
      '<section class="gifts" aria-labelledby="gifts-h"><div class="wrap"><h2 class="h2" id="gifts-h" style="color:#fff">Машин бүрт багтана</h2><p>Нэмэлт төлбөргүй, машинтай хамт.</p><div class="gift-grid">' + C.gifts.map(function (g) { return '<div class="gift">' + CHECK + '<span>' + esc(g) + '</span></div>'; }).join('') + '</div></div></section>' +
      ((car.specs || []).length ? '<section class="specs" aria-labelledby="specs-h"><div class="wrap"><h2 class="h2" id="specs-h">Техникийн үзүүлэлт</h2><div class="spec-groups">' + specGroups(car.specs).map(function (g) {
        return '<div class="spec-group">' + (g.name ? '<h3>' + esc(g.name) + '</h3>' : '') + '<table><tbody>' + g.rows.map(function (s) { return '<tr><th scope="row">' + esc(s.label) + '</th><td>' + esc(s.value) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }).join('') + '</div></div></section>' : '') +
      '<section class="contact" id="contact" aria-labelledby="contact-h"></section>';

    function drawGal() {
      var g = gallery[gi];
      $('#gal-main').innerHTML = g ? '<img class="gal-main" src="' + esc(g.url) + '" alt="' + esc(car.name + ' — ' + (g.label || '')) + '">' : '<div class="gal-ph">Зураг удахгүй</div>';
      var th = $('.thumbs');
      if (th) th.innerHTML = gallery.map(function (x, k) { return '<button class="thumb" type="button" aria-pressed="' + (k === gi) + '" data-g="' + k + '"><img src="' + esc(x.url) + '" alt="" loading="lazy"><span>' + esc(x.label || '') + '</span></button>'; }).join('');
    }
    main.addEventListener('click', function (e) { var t = e.target.closest('[data-g]'); if (t) { gi = +t.getAttribute('data-g'); drawGal(); } });
    drawGal();

    if (car.price && banks.length) calculator(car, banks);
    contactForm($('#contact'), { cars: data.cars, car: car, title: car.name + ' — мэдээлэл авах' });
    footer();
  }

  function calculator(car, banks) {
    var st = { b: 0, d: null, t: null, inc: 'Цалин', loan: 'idle' };
    var tabs = $('.banks'), body = $('#calc-body');
    var bar = document.createElement('a');
    bar.className = 'calc-bar'; bar.href = '#calc-result'; bar.setAttribute('aria-hidden', 'true'); bar.tabIndex = -1;
    document.body.appendChild(bar);
    var inCalc = false, resVisible = false;
    function showBar() { bar.classList.toggle('show', inCalc && !resVisible); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { inCalc = es[0].isIntersecting; showBar(); }, { rootMargin: '-120px 0px -60% 0px' }).observe($('#calc'));
    }
    function drawTabs() {
      tabs.innerHTML = banks.map(function (b, k) {
        return '<button class="bank" type="button" role="tab" aria-selected="' + (k === st.b) + '" data-b="' + k + '"><span class="bank-mark" aria-hidden="true">' + (b.logo ? '<img src="' + esc(b.logo) + '" alt="">' : esc(b.mark || b.name.charAt(0))) + '</span><span class="bank-name">' + esc(b.name) + '</span></button>';
      }).join('');
    }
    function draw() {
      var b = banks[st.b];
      var terms = termsFor(b, car, st.inc);
      var d = b.downs.indexOf(st.d) >= 0 ? st.d : b.downs[0];
      var t = terms.indexOf(st.t) >= 0 ? st.t : terms[terms.length - 1];
      var r = terms.length ? rateFor(b, car, st.inc, t) : null;
      var m = r ? pay(car.price, d, t, r.min) : 0, mMax = r ? pay(car.price, d, t, r.max) : 0;
      var money = r ? (mMax > m + 1 ? fmt(m) + ' – ' + fmt(mMax) : fmt(m)) : '—';
      var allRates = [];
      INCOMES.forEach(function (i) { termsFor(b, car, i).forEach(function (x) { var q = rateFor(b, car, i, x); allRates.push(q.min, q.max); }); });
      var rateText = allRates.length ? pct({ min: Math.min.apply(null, allRates), max: Math.max.apply(null, allRates) }) : '—';
      var other = st.inc === 'Цалин' ? 'Бизнес' : 'Цалин';
      var loanPart;
      if (!r) loanPart = '<p class="fine" style="margin:0">' + esc(b.name) + ' ' + (st.inc === 'Цалин' ? 'цалингийн' : 'бизнесийн') + ' орлоготой хүнд энэ машинд зээл олгодоггүй.</p>' +
        (termsFor(b, car, other).length ? '<button class="btn btn-cyan btn-block" type="button" data-inc="' + other + '">' + (other === 'Бизнес' ? 'Бизнесийн' : 'Цалингийн') + ' орлогоор тооцох</button>' : '');
      else if (st.loan === 'open') {
        loanPart = '<form class="loanform" id="loanform" novalidate><strong>Зээлийн хүсэлт</strong><span style="font-size:13px;color:var(--text2)">' + esc(car.name + ' · ' + b.name + ' · ' + (st.inc === 'Цалин' ? 'цалингийн' : 'бизнесийн') + ' орлого · ' + d + '% урьдчилгаа · ' + t + ' сар · сард ' + money) + '</span>' +
          '<label class="legend" for="lf-phone">Утасны дугаар *</label><input id="lf-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="8888 8888"><span class="err" hidden>8 оронтой дугаар оруулна уу</span>' +
          '<label class="legend" for="lf-name">Нэр</label><input id="lf-name" autocomplete="name" placeholder="Заавал биш">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn btn-ghost" type="button" data-loan="cancel">Болих</button><button class="btn btn-cyan" type="submit">Илгээх</button></div></form>';
      } else if (st.loan === 'sent') {
        loanPart = '<div class="done" role="status"><h3>Хүсэлтийг хүлээж авлаа</h3><p>Манай зээлийн зөвлөх ' + esc(C.callbackText) + ' залгаж, ' + esc(b.name) + '-нд бүрдүүлэх материалын жагсаалтыг илгээнэ.</p></div>';
      } else loanPart = '<button class="btn btn-cyan btn-block" type="button" data-loan="open">Энэ нөхцлөөр зээл хүсэх</button>';
      body.innerHTML =
        '<div class="panel p-cond"><h3>' + esc(b.name) + ' — нөхцөл</h3><dl class="kv"><dt>Зээлийн төрөл</dt><dd>' + esc(b.type || '—') + '</dd><dt>Сарын хүү</dt><dd>' + rateText + '</dd><dt>Урьдчилгаа</dt><dd>' + Math.min.apply(null, b.downs) + '% – ' + Math.max.apply(null, b.downs) + '%</dd></dl>' +
        ((b.notes || []).length ? '<ul class="notes">' + b.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') + '</div>' +
        '<div class="panel p-opts"><strong id="il">Таны орлого</strong><div class="opts" role="group" aria-labelledby="il">' +
        INCOMES.map(function (x) { return '<button class="opt" type="button" aria-pressed="' + (x === st.inc) + '" data-inc="' + x + '">' + (x === 'Цалин' ? 'Цалингийн' : 'Бизнесийн') + '</button>'; }).join('') + '</div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><strong id="dl">Урьдчилгаа</strong><strong>' + fmt(car.price * d / 100) + '</strong></div><div class="opts" role="group" aria-labelledby="dl">' +
        b.downs.map(function (x) { return '<button class="opt" type="button" aria-pressed="' + (x === d) + '" data-d="' + x + '">' + x + '%</button>'; }).join('') + '</div>' +
        (terms.length ? '<strong id="tl">Хугацаа</strong><div class="opts" role="group" aria-labelledby="tl">' +
        terms.map(function (x) { return '<button class="opt" type="button" aria-pressed="' + (x === t) + '" data-t="' + x + '">' + x + ' сар</button>'; }).join('') + '</div>' : '') +
        '<p class="fine">Нөхцөл нь жишээ. Эцсийн хүү, урьдчилгааг банк таны орлого, зээлийн түүхээр тогтооно.</p></div>' +
        '<div class="result" id="calc-result"><span style="font-size:14px;color:#0e5b70">Сарын төлбөр · ' + esc(b.name) + (r ? ' · ' + pct(r) : '') + '</span><span class="monthly' + (mMax > m + 1 ? ' range' : '') + '" aria-live="polite">' + money + '</span>' +
        (mMax > m + 1 ? '<span class="fine" style="margin:0">Хүү таны зээлийн оноогоор ' + pct(r) + ' хооронд тогтоно.</span>' : '') +
        '<dl class="kv"><dt>Машины үнэ</dt><dd>' + fmt(car.price) + '</dd><dt>Урьдчилгаа</dt><dd>' + fmt(car.price * d / 100) + '</dd><dt>Зээлийн дүн</dt><dd>' + fmt(car.price * (1 - d / 100)) + '</dd></dl>' + loanPart + '</div>';
      bar.innerHTML = '<span class="cb-l">' + esc(b.name) + (r ? ' · ' + t + ' сар' : '') + '<small>Сарын төлбөр</small></span><span class="cb-v">' + money + '</span>';
      if ('IntersectionObserver' in window) {
        if (draw.ro) draw.ro.disconnect();
        draw.ro = new IntersectionObserver(function (es) { resVisible = es[0].isIntersecting; showBar(); }, { threshold: 0.35 });
        draw.ro.observe($('#calc-result'));
      }
      var lf = $('#loanform');
      if (lf) lf.addEventListener('submit', function (e) {
        e.preventDefault();
        var p = $('#lf-phone').value;
        if (!phoneOk(p)) { $('.err', lf).hidden = false; $('#lf-phone').focus(); return; }
        sendLead({ type: 'Зээлийн хүсэлт', phone: p, name: $('#lf-name').value, model: car.name, payment: 'Зээл', bank: b.name + ' (' + (st.inc === 'Цалин' ? 'цалингийн' : 'бизнесийн') + ' орлого)', down: d + '%', term: t + ' сар', monthly: money })
          .then(function () { st.loan = 'sent'; draw(); });
      });
    }
    tabs.addEventListener('click', function (e) { var x = e.target.closest('[data-b]'); if (x) { st.b = +x.getAttribute('data-b'); if (st.loan === 'sent') st.loan = 'idle'; drawTabs(); draw(); } });
    body.addEventListener('click', function (e) {
      var x = e.target.closest('[data-d],[data-t],[data-loan],[data-inc]'); if (!x) return;
      if (x.hasAttribute('data-inc')) { st.inc = x.getAttribute('data-inc'); if (st.loan === 'sent') st.loan = 'idle'; }
      if (x.hasAttribute('data-d')) st.d = +x.getAttribute('data-d');
      if (x.hasAttribute('data-t')) st.t = +x.getAttribute('data-t');
      if (x.hasAttribute('data-loan')) st.loan = x.getAttribute('data-loan') === 'open' ? 'open' : 'idle';
      draw();
      if (st.loan === 'open' && x.getAttribute('data-loan') === 'open') { var i = $('#lf-phone'); if (i) i.focus(); }
    });
    drawTabs(); draw();
  }

  window.TegriSite = { start: function (page) { loadData().then(function (d) { (page === 'car' ? renderCar : renderHome)(d); }); } };
})();
