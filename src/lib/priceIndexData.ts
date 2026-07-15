// مؤشر بنيان للأسعار — بيانات أولية من السوق السعودي
// المصادر: نشرات أسعار السوق فبراير-أبريل 2026 + مؤشر هيئة المقاولين (muqawil.org)
// ملاحظة: هذي أسعار استرشادية قابلة للتعديل من المقاول — الأسعار تختلف حسب المنطقة والكمية

export interface PriceItem {
  id: string;
  name: string;           // اسم البند
  category: string;       // الفئة
  unit: string;           // الوحدة
  avgPrice: number;       // متوسط السعر (ريال)
  minPrice: number;       // أقل سعر بالسوق
  maxPrice: number;       // أعلى سعر بالسوق
  lastUpdated: string;    // آخر تحديث
  isCustom?: boolean;     // بند أضافه المقاول بنفسه
  note?: string;
}

export interface Supplier {
  id: string;
  name: string;           // اسم المورد / المصنع
  phone: string;          // رقم التواصل
  city?: string;
  itemIds: string[];      // البنود اللي يوفرها
  isPreferred?: boolean;  // مورد مفضل
}

export const CATEGORIES = [
  { id: 'cement', name: 'أسمنت وخرسانة', icon: '🏗️' },
  { id: 'steel', name: 'حديد', icon: '⚙️' },
  { id: 'block', name: 'بلوك وطابوق', icon: '🧱' },
  { id: 'aggregate', name: 'رمل وبحص', icon: '⛰️' },
  { id: 'labor', name: 'عمالة وأجور', icon: '👷' },
  { id: 'other', name: 'أخرى', icon: '📦' },
] as const;

// الأسعار الافتتاحية — من نشرات السوق الفعلية (الربع الأول/الثاني 2026)
export const SEED_PRICES: PriceItem[] = [
  {
    id: 'cement-bag-50',
    name: 'كيس أسمنت عادي (50 كجم)',
    category: 'cement',
    unit: 'كيس',
    avgPrice: 12.75,
    minPrice: 10,
    maxPrice: 14,
    lastUpdated: '2026-04',
    note: 'يختلف حسب الشركة (اليمامة، الرياض، البحرين)',
  },
  {
    id: 'cement-white-bag',
    name: 'كيس أسمنت أبيض',
    category: 'cement',
    unit: 'كيس',
    avgPrice: 39.5,
    minPrice: 36,
    maxPrice: 43,
    lastUpdated: '2026-04',
  },
  {
    id: 'cement-ton',
    name: 'أسمنت (طن)',
    category: 'cement',
    unit: 'طن',
    avgPrice: 255,
    minPrice: 235,
    maxPrice: 275,
    lastUpdated: '2026-04',
  },
  {
    id: 'rebar-ton-main',
    name: 'حديد تسليح — مصانع رئيسية (8-16مم)',
    category: 'steel',
    unit: 'طن',
    avgPrice: 2300,
    minPrice: 2150,
    maxPrice: 2450,
    lastUpdated: '2026-04',
    note: 'الاتفاق، الراجحي، الوطنية، اليمامة',
  },
  {
    id: 'rebar-ton-retail',
    name: 'حديد تسليح — تجزئة',
    category: 'steel',
    unit: 'طن',
    avgPrice: 2400,
    minPrice: 2350,
    maxPrice: 2450,
    lastUpdated: '2026-04',
  },
  {
    id: 'rebar-small-sizes',
    name: 'حديد مقاسات صغيرة (6-8مم)',
    category: 'steel',
    unit: 'طن',
    avgPrice: 3500,
    minPrice: 3047,
    maxPrice: 4140,
    lastUpdated: '2026-04',
    note: 'المقاسات الدقيقة أغلى من المقاسات الرئيسية',
  },
  {
    id: 'block-black-15',
    name: 'بلوك أسود 15 سم',
    category: 'block',
    unit: '1000 حبة',
    avgPrice: 1683,
    minPrice: 1600,
    maxPrice: 1750,
    lastUpdated: '2026-02',
  },
  {
    id: 'block-black-20',
    name: 'بلوك أسود 20 سم',
    category: 'block',
    unit: '1000 حبة',
    avgPrice: 1730,
    minPrice: 1650,
    maxPrice: 1800,
    lastUpdated: '2026-02',
  },
  {
    id: 'block-insulated',
    name: 'بلوك عازل',
    category: 'block',
    unit: 'حبة',
    avgPrice: 4.5,
    minPrice: 3.8,
    maxPrice: 6.2,
    lastUpdated: '2026-02',
    note: 'حسب نوع العزل والضغط',
  },
  // بنود بدون نشرة رسمية حديثة — أرقام استرشادية، عدّلها حسب منطقتك
  {
    id: 'concrete-ready',
    name: 'خرسانة جاهزة (مقاومة 350)',
    category: 'cement',
    unit: 'م³',
    avgPrice: 250,
    minPrice: 220,
    maxPrice: 290,
    lastUpdated: '2026-01',
    note: 'استرشادي — يختلف حسب المدينة والمسافة',
  },
  {
    id: 'sand-truck',
    name: 'رمل أحمر (قلاب)',
    category: 'aggregate',
    unit: 'قلاب',
    avgPrice: 450,
    minPrice: 350,
    maxPrice: 600,
    lastUpdated: '2026-01',
    note: 'استرشادي — حسب حجم القلاب والمسافة',
  },
  {
    id: 'labor-daily',
    name: 'عامل بناء (يومية)',
    category: 'labor',
    unit: 'يوم',
    avgPrice: 120,
    minPrice: 80,
    maxPrice: 180,
    lastUpdated: '2026-01',
    note: 'استرشادي — حسب المهارة والمنطقة',
  },
];

// الموردين — يبدأ فاضي، المقاول يضيف مورّديه وأرقامهم
// (ما نحط أرقام جوالات مصانع حقيقية بدون تأكيد — المقاول يعبيها من معارفه)
export const SEED_SUPPLIERS: Supplier[] = [];
