/* CRM холбогдоогүй үед харуулах өгөгдөл. CRM-ийн "Машинууд", "Банкууд" хэсэг ажиллаж эхэлмэгц сайт тэндээс уншина. */
window.TEGRI_FALLBACK = {
  cars: [
    { id: 'sealion-06-dm-i-pro', name: 'BYD Sealion 06 DM-i Pro', kind: 'SUV · Plug-in hybrid', tag: 'SUV', price: null, status: 'Тун удахгүй', featured: true, order: 1,
      kicker: 'Шинэ · 0 км · Plug-in hybrid SUV', sub: 'Цахилгаан бензин хосолсон дунд оврын SUV',
      heroDesktop: 'assets/img/sealion06-pro-desktop.jpg', heroMobile: 'assets/img/sealion06-pro-mobile.jpg', cardImg: 'assets/img/sealion06-pro-card.jpg',
      gallery: [{ label: 'Гадна', url: 'assets/img/sealion06-pro-desktop.jpg' }], keySpecs: [], specs: [], brochure: '' },
    { id: 'seal-5', name: 'BYD Seal 5', kind: 'Седан · Plug-in hybrid', tag: 'Седан', price: 57000000, status: 'Бэлэн', featured: true, order: 2,
      kicker: 'Шинэ · 0 км · Plug-in hybrid седан', sub: 'Цахилгаан бензин хосолсон седан',
      heroDesktop: '', heroMobile: '', cardImg: '', gallery: [],
      keySpecs: [{ value: '212', unit: 'м.х', label: 'Системийн нийт хүч' }, { value: '100', unit: 'км', label: 'Зөвхөн цахилгаанаар (WLTP)' }, { value: '1.7', unit: 'л', label: '100 км-т зарцуулах бензин' }, { value: '7.5', unit: 'сек', label: '0–100 км/ц' }],
      specs: [{ label: 'Хөдөлгүүр', value: '1.5 л бензин + цахилгаан мотор (DM-i)' }, { label: 'Батарей', value: '18.3 кВт·ц, LFP (Blade)' }, { label: 'Урт × өргөн × өндөр', value: '4780 × 1837 × 1515 мм' }, { label: 'Суудал', value: '5' }],
      brochure: '' },
    { id: 'yuan-up', name: 'BYD Yuan Up', kind: 'Кроссовер · Цахилгаан', tag: 'Цахилгаан', price: null, status: 'Бэлэн', featured: true, order: 3,
      kicker: 'Шинэ · 0 км · Цахилгаан', sub: 'Хотод зориулсан цэвэр цахилгаан кроссовер', heroDesktop: '', heroMobile: '', cardImg: '', gallery: [], keySpecs: [], specs: [], brochure: '' },
    { id: 'ti-7', name: 'BYD Ti 7', kind: 'SUV', tag: 'SUV', price: null, status: 'Бэлэн', featured: true, order: 4,
      kicker: 'Шинэ · 0 км · SUV', sub: 'Аялал, гэр бүлд зориулсан том оврын SUV', heroDesktop: '', heroMobile: '', cardImg: '', gallery: [], keySpecs: [], specs: [], brochure: '' },
    { id: 'sealion-06-dm-i', name: 'BYD Sealion 06 DM-i', kind: 'SUV · Plug-in hybrid · Цагаан саарал', tag: 'SUV', price: null, status: 'Тун удахгүй', featured: true, order: 5,
      kicker: 'Тун удахгүй · Plug-in hybrid SUV', sub: 'Цагаан саарал өнгө · plug-in hybrid SUV', heroDesktop: '', heroMobile: '', cardImg: '', gallery: [], keySpecs: [], specs: [], brochure: '' }
  ],
  banks: [
    { id: 'khan', name: 'Хаан банк', mark: 'Х', type: 'Ногоон зээл', rate: 1.25, downs: [10, 20, 30, 40], terms: [24, 36, 48, 60, 72, 84, 96], notes: ['Цахилгаан ба хосолмол машинд'], logo: '', order: 1 },
    { id: 'golomt', name: 'Голомт банк', mark: 'Г', type: 'Ногоон зээл', rate: 1.3, downs: [10, 20, 30], terms: [24, 36, 48, 60, 72, 84, 96], notes: ['Цахилгаан ба хосолмол машинд'], logo: '', order: 2 },
    { id: 'tdb', name: 'Төрийн банк', mark: 'Т', type: 'Ногоон зээл', rate: 1.3, downs: [10, 20, 30], terms: [36, 48, 60, 72, 84, 96], notes: ['Цахилгаан ба хосолмол машинд'], logo: '', order: 3 },
    { id: 'tdb-leasing', name: 'Төрийн банк — санхүүгийн түрээс', mark: 'ТЛ', type: 'Санхүүгийн түрээс', rate: 1.3, downs: [10, 20, 30], terms: [24, 36, 48, 60], notes: [], logo: '', order: 4 },
    { id: 'arig', name: 'Ариг банк', mark: 'А', type: 'Автомашины зээл', rate: 1.3, downs: [10, 20, 30], terms: [24, 36, 48, 60, 72], notes: [], logo: '', order: 5 },
    { id: 'bers', name: 'Бэрс ББСБ', mark: 'Б', type: 'ББСБ-ын зээл', rate: 1.3, downs: [20, 30, 40], terms: [12, 24, 36, 48], notes: [], logo: '', order: 6 }
  ]
};
