// Egyptian governorates, cities and districts, in Arabic and English. Locations in a campaign are picked from this list (never free text),
// so every location the search engine receives is one it can geocode. Plain ESM (no imports) so the same file serves the wizard,
// the server-side validation and the tests. Entries are "arabic|english". Districts are listed for the large cities.

/** governorate "ar|en" -> [{ c: city "ar|en", d: [district "ar|en"] }] */
const DATA = {
  'القاهرة|Cairo': [
    { c: 'القاهرة|Cairo', d: ['المعادي|Maadi', 'مدينة نصر|Nasr City|nasr;madinet nasr', 'مصر الجديدة|Heliopolis|masr el gedida;misr el gedida', 'الزمالك|Zamalek', 'وسط البلد|Downtown', 'جاردن سيتي|Garden City', 'شبرا|Shubra', 'العباسية|Abbassia', 'الزيتون|Zeitoun', 'المطرية|Matariya', 'عين شمس|Ain Shams', 'حلوان|Helwan', 'المقطم|Mokattam', 'مصر القديمة|Old Cairo', 'السيدة زينب|Sayyida Zeinab', 'المعصرة|Maasara', 'التبين|Tebbin', 'النزهة|El Nozha', 'مدينة السلام|El Salam City', 'الأميرية|Amiriya', 'الوايلي|El Waili', 'روض الفرج|Rod El Farag', 'بولاق|Bulaq', 'عابدين|Abdeen', 'الموسكي|El Mosky', 'الجمالية|Gamaliya', 'الدرب الأحمر|Darb El Ahmar', 'الخليفة|El Khalifa', 'المرج|El Marg', 'الشرابية|El Sharabia', 'منشية ناصر|Manshiyat Nasser', 'دار السلام|Dar El Salam', 'البساتين|Basatin', 'طرة|Tura', 'المنيل|Manial', 'حدائق القبة|Hadayek El Qobba', 'الظاهر|El Zahir', 'الحلمية|Helmeya', 'الألف مسكن|El Alf Maskan', 'غمرة|Ghamra', 'الفجالة|Fagalla', 'الساحل|El Sahel', 'ألماظة|Almaza', 'كوبري القبة|Kobry El Qobba', 'الزهراء|Zahraa', 'عزبة النخل|Ezbet El Nakhl'] },
    { c: 'القاهرة الجديدة|New Cairo|tagamoa;تجمع', d: ['التجمع الأول|First Settlement|1st settlement;tagamoa awal', 'التجمع الثالث|Third Settlement|3rd settlement', 'التجمع الخامس|Fifth Settlement|5th settlement;tagamoa;tagamo3', 'الرحاب|Rehab City', 'مدينتي|Madinaty', 'الشويفات|Shuwayfat', 'الحي الأول|District 1', 'القطامية|Katameya', 'النرجس|Narges', 'اللوتس|Lotus', 'بيت الوطن|Beit El Watan'] },
    { c: 'الشروق|El Shorouk', d: [] },
    { c: 'بدر|Badr City', d: [] },
    { c: 'العاصمة الإدارية الجديدة|New Administrative Capital|new capital;nac', d: [] },
    { c: '15 مايو|15th of May City', d: [] },
  ],
  'الجيزة|Giza': [
    { c: 'الجيزة|Giza', d: ['الدقي|Dokki', 'المهندسين|Mohandessin', 'العجوزة|Agouza', 'الهرم|Haram', 'فيصل|Faisal', 'إمبابة|Imbaba', 'بولاق الدكرور|Bulaq Dakrour', 'العمرانية|Omraniya', 'حدائق الأهرام|Hadayek El Ahram', 'الوراق|Warraq', 'المنيب|Moneeb', 'كرداسة|Kerdasa', 'ناهيا|Nahia', 'الطالبية|Talbia', 'المريوطية|Maryotia', 'الكيت كات|Kit Kat', 'ميدان الجيزة|Giza Square'] },
    { c: '6 أكتوبر|6th of October City|october;6 october;sitta october;اكتوبر', d: ['الحي المتميز|El Hay El Motamayez', 'الحي الأول|District 1', 'الحي الثاني|District 2', 'الحي الثالث|District 3', 'الحي الرابع|District 4', 'الحي الخامس|District 5', 'الحي السابع|District 7', 'دريم لاند|Dreamland', 'الواحة|El Wahat', 'حدائق أكتوبر|October Gardens', 'المحور المركزي|Central Axis'] },
    { c: 'الشيخ زايد|Sheikh Zayed City|zayed', d: ['بيفرلي هيلز|Beverly Hills', 'الحي الثالث عشر|District 13', 'زايد 2000|Zayed 2000'] },
    { c: 'الحوامدية|Hawamdeya', d: [] },
    { c: 'البدرشين|Badrashin', d: [] },
    { c: 'الصف|El Saff', d: [] },
    { c: 'العياط|Ayat', d: [] },
    { c: 'أوسيم|Ausim', d: [] },
    { c: 'أبو النمرس|Abu El Nomros', d: [] },
    { c: 'منشأة القناطر|Manshaat El Qanater', d: [] },
    { c: 'أطفيح|Atfih', d: [] },
  ],
  'الإسكندرية|Alexandria|iskandariya;alex;اسكندرية': [
    { c: 'الإسكندرية|Alexandria', d: ['سموحة|Smouha', 'سيدي جابر|Sidi Gaber', 'ميامي|Miami', 'المنتزه|Montaza', 'العجمي|Agami', 'محرم بك|Moharam Bek', 'الإبراهيمية|Ibrahimia', 'سبورتنج|Sporting', 'كليوباترا|Cleopatra', 'ستانلي|Stanley', 'جليم|Glim', 'زيزينيا|Zizinia', 'لوران|Laurent', 'سان ستيفانو|San Stefano', 'الشاطبي|Shatby', 'اللبان|Labban', 'كرموز|Karmoz', 'المنشية|Mansheya', 'العطارين|Attarin', 'باكوس|Bacos', 'فيكتوريا|Victoria', 'الظاهرية|Dahriya', 'العصافرة|Asafra', 'المندرة|Mandara', 'سيدي بشر|Sidi Bishr', 'العامرية|Amreya', 'أبو قير|Abu Qir', 'رشدي|Rushdy', 'بولكلي|Bulkeley', 'جناكليس|Gianaclis', 'الأزاريطة|Azarita', 'كفر عبده|Kafr Abdu', 'الورديان|Wardian', 'القباري|Qabbary', 'الدخيلة|Dekheila', 'المعمورة|Maamoura', 'الكيلو 21|Kilo 21', 'الجمرك|Gomrok', 'مصطفى كامل|Mostafa Kamel', 'الحضرة|Hadra', 'سيدي كرير|Sidi Kerir'] },
    { c: 'برج العرب|Borg El Arab', d: [] },
    { c: 'برج العرب الجديدة|New Borg El Arab', d: [] },
  ],
  'القليوبية|Qalyubia': [
    { c: 'بنها|Banha', d: [] }, { c: 'شبرا الخيمة|Shubra El Kheima', d: [] }, { c: 'القناطر الخيرية|El Qanater El Khayreya', d: [] }, { c: 'الخانكة|El Khanka', d: [] },
    { c: 'قليوب|Qalyub', d: [] }, { c: 'كفر شكر|Kafr Shukr', d: [] }, { c: 'طوخ|Toukh', d: [] }, { c: 'شبين القناطر|Shibin El Qanater', d: [] }, { c: 'العبور|El Obour City', d: [] }, { c: 'الخصوص|El Khosous', d: [] },
  ],
  'الشرقية|Sharqia': [
    { c: 'الزقازيق|Zagazig', d: [] }, { c: 'العاشر من رمضان|10th of Ramadan City', d: [] }, { c: 'بلبيس|Belbeis', d: [] }, { c: 'أبو كبير|Abu Kabir', d: [] }, { c: 'فاقوس|Faqous', d: [] },
    { c: 'منيا القمح|Minya El Qamh', d: [] }, { c: 'ههيا|Hihya', d: [] }, { c: 'الصالحية الجديدة|New Salhia', d: [] }, { c: 'مشتول السوق|Mashtoul El Souk', d: [] }, { c: 'ديرب نجم|Diarb Negm', d: [] },
    { c: 'أبو حماد|Abu Hammad', d: [] }, { c: 'الحسينية|El Husseiniya', d: [] }, { c: 'كفر صقر|Kafr Saqr', d: [] },
  ],
  'الدقهلية|Dakahlia': [
    { c: 'المنصورة|Mansoura', d: [] }, { c: 'طلخا|Talkha', d: [] }, { c: 'ميت غمر|Mit Ghamr', d: [] }, { c: 'دكرنس|Dekernes', d: [] }, { c: 'أجا|Aga', d: [] }, { c: 'السنبلاوين|El Senbellawein', d: [] },
    { c: 'بلقاس|Belqas', d: [] }, { c: 'المنزلة|Manzala', d: [] }, { c: 'شربين|Sherbin', d: [] }, { c: 'جمصة|Gamasa', d: [] }, { c: 'المطرية|El Matareya', d: [] }, { c: 'المنصورة الجديدة|New Mansoura', d: [] },
  ],
  'الغربية|Gharbia': [
    { c: 'طنطا|Tanta', d: [] }, { c: 'المحلة الكبرى|El Mahalla El Kubra', d: [] }, { c: 'كفر الزيات|Kafr El Zayat', d: [] }, { c: 'زفتى|Zefta', d: [] }, { c: 'السنطة|El Santa', d: [] },
    { c: 'بسيون|Basyoun', d: [] }, { c: 'قطور|Qutour', d: [] }, { c: 'سمنود|Samannoud', d: [] },
  ],
  'المنوفية|Monufia': [
    { c: 'شبين الكوم|Shibin El Kom', d: [] }, { c: 'مدينة السادات|Sadat City', d: [] }, { c: 'منوف|Menouf', d: [] }, { c: 'أشمون|Ashmoun', d: [] }, { c: 'الباجور|El Bagour', d: [] },
    { c: 'قويسنا|Quesna', d: [] }, { c: 'تلا|Tala', d: [] }, { c: 'بركة السبع|Birket El Sab', d: [] }, { c: 'الشهداء|El Shohada', d: [] },
  ],
  'البحيرة|Beheira': [
    { c: 'دمنهور|Damanhur', d: [] }, { c: 'كفر الدوار|Kafr El Dawwar', d: [] }, { c: 'رشيد|Rashid', d: [] }, { c: 'إدكو|Edku', d: [] }, { c: 'أبو حمص|Abu Hummus', d: [] },
    { c: 'إيتاي البارود|Itay El Barud', d: [] }, { c: 'كوم حمادة|Kom Hamada', d: [] }, { c: 'الدلنجات|El Delengat', d: [] }, { c: 'وادي النطرون|Wadi El Natrun', d: [] },
    { c: 'النوبارية الجديدة|New Nubaria', d: [] }, { c: 'حوش عيسى|Hosh Issa', d: [] }, { c: 'شبراخيت|Shubrakhit', d: [] }, { c: 'المحمودية|El Mahmoudiya', d: [] },
  ],
  'كفر الشيخ|Kafr El Sheikh': [
    { c: 'كفر الشيخ|Kafr El Sheikh', d: [] }, { c: 'دسوق|Desouk', d: [] }, { c: 'فوه|Fuwwah', d: [] }, { c: 'مطوبس|Metoubes', d: [] }, { c: 'بلطيم|Baltim', d: [] },
    { c: 'الحامول|El Hamoul', d: [] }, { c: 'بيلا|Bella', d: [] }, { c: 'سيدي سالم|Sidi Salem', d: [] }, { c: 'قلين|Qallin', d: [] }, { c: 'الرياض|El Riyad', d: [] },
  ],
  'دمياط|Damietta': [
    { c: 'دمياط|Damietta', d: [] }, { c: 'دمياط الجديدة|New Damietta', d: [] }, { c: 'رأس البر|Ras El Bar', d: [] }, { c: 'فارسكور|Faraskur', d: [] }, { c: 'كفر سعد|Kafr Saad', d: [] }, { c: 'الزرقا|El Zarqa', d: [] },
  ],
  'بورسعيد|Port Said': [
    { c: 'بورسعيد|Port Said', d: ['حي الشرق|El Sharq District', 'حي العرب|El Arab District', 'حي المناخ|El Manakh District', 'حي الضواحي|El Dawahy District', 'حي الزهور|El Zohour District'] },
    { c: 'بورفؤاد|Port Fouad', d: [] },
  ],
  'الإسماعيلية|Ismailia': [
    { c: 'الإسماعيلية|Ismailia', d: [] }, { c: 'فايد|Fayed', d: [] }, { c: 'القنطرة شرق|Qantara East', d: [] }, { c: 'القنطرة غرب|Qantara West', d: [] }, { c: 'التل الكبير|Tell El Kebir', d: [] },
    { c: 'أبو صوير|Abu Suwir', d: [] }, { c: 'القصاصين|El Qassasin', d: [] },
  ],
  'السويس|Suez': [
    { c: 'السويس|Suez', d: [] }, { c: 'الأربعين|El Arbaeen', d: [] }, { c: 'عتاقة|Ataka', d: [] }, { c: 'الجناين|El Ganayen', d: [] }, { c: 'العين السخنة|Ain Sokhna', d: [] },
  ],
  'شمال سيناء|North Sinai': [
    { c: 'العريش|Arish', d: [] }, { c: 'الشيخ زويد|Sheikh Zuweid', d: [] }, { c: 'رفح|Rafah', d: [] }, { c: 'بئر العبد|Bir El Abd', d: [] }, { c: 'الحسنة|El Hasana', d: [] }, { c: 'نخل|Nakhl', d: [] },
  ],
  'جنوب سيناء|South Sinai': [
    { c: 'شرم الشيخ|Sharm El Sheikh', d: [] }, { c: 'دهب|Dahab', d: [] }, { c: 'نويبع|Nuweiba', d: [] }, { c: 'طابا|Taba', d: [] }, { c: 'سانت كاترين|Saint Catherine', d: [] },
    { c: 'الطور|El Tor', d: [] }, { c: 'أبو رديس|Abu Redis', d: [] }, { c: 'رأس سدر|Ras Sedr', d: [] },
  ],
  'الفيوم|Faiyum': [
    { c: 'الفيوم|Faiyum', d: [] }, { c: 'سنورس|Sinnuris', d: [] }, { c: 'إطسا|Itsa', d: [] }, { c: 'طامية|Tamiya', d: [] }, { c: 'إبشواي|Ibshaway', d: [] }, { c: 'يوسف الصديق|Yusuf El Sediq', d: [] },
  ],
  'بني سويف|Beni Suef': [
    { c: 'بني سويف|Beni Suef', d: [] }, { c: 'الواسطى|El Wasta', d: [] }, { c: 'ناصر|Nasser', d: [] }, { c: 'إهناسيا|Ehnasia', d: [] }, { c: 'ببا|Biba', d: [] },
    { c: 'الفشن|El Fashn', d: [] }, { c: 'سمسطا|Samasta', d: [] }, { c: 'بني سويف الجديدة|New Beni Suef', d: [] },
  ],
  'المنيا|Minya': [
    { c: 'المنيا|Minya', d: [] }, { c: 'ملوي|Mallawi', d: [] }, { c: 'سمالوط|Samalut', d: [] }, { c: 'مغاغة|Maghagha', d: [] }, { c: 'بني مزار|Beni Mazar', d: [] },
    { c: 'أبو قرقاص|Abu Qurqas', d: [] }, { c: 'العدوة|El Idwa', d: [] }, { c: 'مطاي|Matai', d: [] }, { c: 'دير مواس|Deir Mawas', d: [] }, { c: 'المنيا الجديدة|New Minya', d: [] },
  ],
  'أسيوط|Asyut': [
    { c: 'أسيوط|Asyut', d: [] }, { c: 'ديروط|Dairut', d: [] }, { c: 'القوصية|El Qusiya', d: [] }, { c: 'منفلوط|Manfalut', d: [] }, { c: 'أبنوب|Abnub', d: [] },
    { c: 'أبو تيج|Abu Tig', d: [] }, { c: 'الغنايم|El Ghanayem', d: [] }, { c: 'صدفا|Sedfa', d: [] }, { c: 'البداري|El Badari', d: [] }, { c: 'ساحل سليم|Sahel Selim', d: [] }, { c: 'أسيوط الجديدة|New Asyut', d: [] },
  ],
  'سوهاج|Sohag': [
    { c: 'سوهاج|Sohag', d: [] }, { c: 'أخميم|Akhmim', d: [] }, { c: 'جرجا|Girga', d: [] }, { c: 'طهطا|Tahta', d: [] }, { c: 'المراغة|El Maragha', d: [] },
    { c: 'دار السلام|Dar El Salam', d: [] }, { c: 'البلينا|El Balyana', d: [] }, { c: 'المنشاة|El Mansha', d: [] }, { c: 'جهينة|Juhayna', d: [] }, { c: 'ساقلتة|Saqulta', d: [] },
  ],
  'قنا|Qena': [
    { c: 'قنا|Qena', d: [] }, { c: 'نجع حمادي|Nag Hammadi', d: [] }, { c: 'دشنا|Dishna', d: [] }, { c: 'قوص|Qus', d: [] }, { c: 'أبو تشت|Abu Tesht', d: [] },
    { c: 'فرشوط|Farshut', d: [] }, { c: 'الوقف|El Waqf', d: [] }, { c: 'نقادة|Naqada', d: [] }, { c: 'قفط|Qift', d: [] },
  ],
  'الأقصر|Luxor': [
    { c: 'الأقصر|Luxor', d: [] }, { c: 'إسنا|Esna', d: [] }, { c: 'أرمنت|Armant', d: [] }, { c: 'الطود|El Tod', d: [] }, { c: 'القرنة|El Qurna', d: [] }, { c: 'البياضية|El Bayadiya', d: [] }, { c: 'الزينية|El Zeiniya', d: [] },
  ],
  'أسوان|Aswan': [
    { c: 'أسوان|Aswan', d: [] }, { c: 'كوم أمبو|Kom Ombo', d: [] }, { c: 'إدفو|Edfu', d: [] }, { c: 'نصر النوبة|Nasr El Nuba', d: [] }, { c: 'دراو|Daraw', d: [] },
    { c: 'أبو سمبل|Abu Simbel', d: [] }, { c: 'أسوان الجديدة|New Aswan', d: [] },
  ],
  'البحر الأحمر|Red Sea': [
    { c: 'الغردقة|Hurghada', d: [] }, { c: 'سفاجا|Safaga', d: [] }, { c: 'القصير|Quseir', d: [] }, { c: 'مرسى علم|Marsa Alam', d: [] }, { c: 'رأس غارب|Ras Gharib', d: [] },
    { c: 'الجونة|El Gouna', d: [] }, { c: 'شلاتين|Shalateen', d: [] }, { c: 'حلايب|Halayeb', d: [] },
  ],
  'الوادي الجديد|New Valley': [
    { c: 'الخارجة|Kharga', d: [] }, { c: 'الداخلة|Dakhla', d: [] }, { c: 'الفرافرة|Farafra', d: [] }, { c: 'باريس|Paris', d: [] }, { c: 'بلاط|Balat', d: [] },
  ],
  'مطروح|Matrouh': [
    { c: 'مرسى مطروح|Marsa Matrouh', d: [] }, { c: 'العلمين|El Alamein', d: [] }, { c: 'الحمام|El Hammam', d: [] }, { c: 'الضبعة|El Dabaa', d: [] },
    { c: 'النجيلة|El Negaila', d: [] }, { c: 'سيدي براني|Sidi Barrani', d: [] }, { c: 'السلوم|Salloum', d: [] }, { c: 'سيوة|Siwa', d: [] },
  ],
};

// "arabic|english" or "arabic|english|alt1;alt2" (other spellings people type)
const split = (s) => { const [ar, en, alt] = s.split('|'); return { ar, en, alt: alt ? alt.split(';') : [] }; };

// ── normalization (Arabic letters unified, English lowercased, "ال" and punctuation ignored) ──
const DIAC = new RegExp('[ً-ٰٟـ]', 'g');
export function normPlace(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(DIAC, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const stripAl = (s) => s.replace(/^ال/, '').replace(/ ال/g, ' ');
const key = (s) => stripAl(normPlace(s));

// ── flat list of everything pickable ──
/** @typedef {{kind:'governorate'|'city'|'district', ar:string, en:string, governorate:{ar:string,en:string}, city?:{ar:string,en:string}, district?:{ar:string,en:string}, label:string, sub:string, hay:string}} PlaceOption */
/** @type {PlaceOption[]} */
export const PLACES = [];
for (const [g, cities] of Object.entries(DATA)) {
  const gov = split(g);
  PLACES.push({ kind: 'governorate', ar: gov.ar, en: gov.en, governorate: gov, label: `${gov.ar} · ${gov.en}`, sub: '', hay: '' });
  for (const c of cities) {
    const city = split(c.c);
    // a city that is the governorate itself (Cairo, Giza, Alexandria ...) is listed once, with its districts
    const sameAsGov = key(city.ar) === key(gov.ar);
    if (!sameAsGov) PLACES.push({ kind: 'city', ar: city.ar, en: city.en, governorate: gov, city, label: `${city.ar} · ${city.en}`, sub: `${gov.ar} · ${gov.en}`, hay: '' });
    for (const d of c.d) {
      const dist = split(d);
      PLACES.push({ kind: 'district', ar: dist.ar, en: dist.en, governorate: gov, city, district: dist, label: `${dist.ar} · ${dist.en}`, sub: sameAsGov ? `${gov.ar} · ${gov.en}` : `${city.ar} · ${city.en}، ${gov.ar}`, hay: '' });
    }
  }
}
const altOf = (p) => [...(p.district ? p.district.alt : p.city ? p.city.alt : p.governorate.alt)];
for (const p of PLACES) p.hay = normPlace([p.ar, p.en, ...altOf(p), p.governorate.ar, p.governorate.en, p.city && p.city.ar, p.city && p.city.en].filter(Boolean).join(' '));

/**
 * Autocomplete: places whose Arabic or English name (or parent) starts each typed word. Names that start with the query come first,
 * then governorates, cities, districts.
 * @param {string} query
 * @param {number} [limit]
 * @returns {PlaceOption[]}
 */
export function searchPlaces(query, limit = 8) {
  const q = normPlace(query);
  if (!q) return [];
  const words = q.split(' ').filter(Boolean);
  const own = (p) => `${normPlace(p.ar)} ${normPlace(p.en)} ${normPlace(altOf(p).join(' '))}`;
  const scored = [];
  for (const p of PLACES) {
    const words2 = p.hay.split(' ');
    if (!words.every((w) => words2.some((x) => x.startsWith(w) || x.replace(/^ال/, '').startsWith(w.replace(/^ال/, ''))))) continue;
    const o = own(p);
    const starts = words.every((w) => o.split(' ').some((x) => x.startsWith(w) || x.replace(/^ال/, '').startsWith(w.replace(/^ال/, ''))));
    const exact = key(p.ar) === key(q) || normPlace(p.en) === q;
    scored.push({ p, s: (exact ? 0 : starts ? 10 : 20) + (p.kind === 'governorate' ? 0 : p.kind === 'city' ? 1 : 2) });
  }
  scored.sort((a, b) => a.s - b.s);
  return scored.slice(0, limit).map((x) => x.p);
}

/** The region object stored in a campaign for a picked place: Arabic names (shown) and English names (used to geocode). */
export function regionFromPlace(p) {
  const r = { governorate: p.governorate.ar, governorate_en: p.governorate.en };
  if (p.city && key(p.city.ar) !== key(p.governorate.ar)) { r.city = p.city.ar; r.city_en = p.city.en; }
  else if (p.city && p.district) { r.city = p.city.ar; r.city_en = p.city.en; }
  if (p.district) { r.district = p.district.ar; r.district_en = p.district.en; }
  return r;
}

const INDEX = new Map(); // normalized name -> [PlaceOption]
for (const p of PLACES) for (const n of [key(p.ar), key(p.en), ...altOf(p).map(key)]) { if (!INDEX.has(n)) INDEX.set(n, []); INDEX.get(n).push(p); }
const ALIASES = { 'القاهره الجديده': 'new cairo', 'التجمع الخامس': 'fifth settlement', '5th settlement': 'fifth settlement', 'اكتوبر': '6th of october city', 'مدينه اكتوبر': '6th of october city', 'zayed': 'sheikh zayed city', 'الشيخ زايد': 'sheikh zayed city', 'alex': 'alexandria', 'اسكندريه': 'الاسكندريه' };

/**
 * Resolve a stored or suggested region ({governorate, city, district} as Arabic or English text) to a place of the list.
 * The most specific name wins (district, then city, then governorate); when a name exists in several governorates the one that agrees
 * with the region's governorate is used. Returns null when nothing matches, so unknown text never reaches the search engine.
 * @param {{governorate?:string, city?:string, district?:string}} r
 * @returns {PlaceOption|null}
 */
export function resolvePlace(r) {
  if (!r) return null;
  const govKey = r.governorate ? key(r.governorate) : null;
  for (const name of [r.district, r.city, r.governorate]) {
    if (!name) continue;
    let k = key(name);
    if (ALIASES[k]) k = key(ALIASES[k]);
    const hits = INDEX.get(k);
    if (!hits || !hits.length) continue;
    if (hits.length === 1) return hits[0];
    const byGov = govKey ? hits.filter((p) => key(p.governorate.ar) === govKey || key(p.governorate.en) === govKey) : [];
    return (byGov[0]) || hits.sort((a, b) => (a.kind === 'governorate' ? 0 : a.kind === 'city' ? 1 : 2) - (b.kind === 'governorate' ? 0 : b.kind === 'city' ? 1 : 2))[0];
  }
  return null;
}

/** Same as resolvePlace but returns the region object ready to store, or null. */
export function resolveRegion(r) {
  const p = resolvePlace(r);
  return p ? regionFromPlace(p) : null;
}

/** Text shown for a region (Arabic). */
export function regionLabelAr(r) {
  return [r.district, r.city, r.governorate].filter(Boolean).filter((x, i, a) => a.findIndex((y) => key(y) === key(x)) === i).join('، ');
}

/** English text for the geocoder, from the English names: "Maadi, Cairo, Egypt". Null when the region has no English names. */
export function geocoderQuery(r) {
  const parts = [r.district_en, r.city_en, r.governorate_en].filter(Boolean);
  if (!parts.length) return null;
  const uniq = parts.filter((x, i) => parts.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i);
  return `${uniq.join(', ')}, Egypt`;
}

export const GOVERNORATE_COUNT = Object.keys(DATA).length;
