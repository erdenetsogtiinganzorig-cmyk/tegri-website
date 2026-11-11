/* Tegri Motors — сайтын тохиргоо.
   API: Tegri CRM-ийн "Execute as: Me / Who has access: Anyone" deployment-ийн /exec холбоос.
   Хоосон бол сайт fallback.js доторх өгөгдлөөр ажиллаж, форм илгээгдэхгүй. */
window.TEGRI_CONFIG = {
  API: 'https://script.google.com/macros/s/AKfycbydjPn3-QVZuFJD2XNXq1nLSIFksQWVzk2_Os9KsGMi9ZH_goLnHbKtBZT60rfo4esy/exec',
  company: 'Тэгри Волт ХХК',
  phones: ['9999-7069', '9999-8579', '8888-8701'],
  email: 'info@tegrimotors.mn',
  address: 'ХУД, 20-р хороо, Чингисийн өргөн чөлөө, UG Motors, 4 давхар',
  facebook: 'https://www.facebook.com/Tegrimotors',
  gifts: ['3 жил / 100,000 км баталгаа', 'Гэрийн ханын цэнэглэгч', '4 өвлийн дугуй', 'Улсын дугаарын хүрээ', 'Шалавч', 'Борооны хаалт'],
  callbackText: 'ажлын цагаар 1 цагийн дотор',
  /* Шоурүүм: image — зургийн зам (assets/img/showroom.jpg), mapsUrl — Google Maps-ийн "Share" холбоос, hours — ажлын цаг */
  showroom: {
    title: 'Шоурүүмд зочлоорой',
    text: 'Машинуудыг биеэр үзэж, туршилтын жолоодлого хийх боломжтой. Манай зөвлөхүүд зээлийн нөхцөл, бэлгийн багцын талаар дэлгэрэнгүй танилцуулна.',
    image: 'assets/img/showroom.jpg',
    mapsUrl: 'https://maps.app.goo.gl/eLEngHpFZNM3eZCJA',
    mapsQuery: 'UG Motors Ulaanbaatar',
    hours: 'Өдөр бүр 10:00–19:00'
  }
};
