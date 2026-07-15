import { useMemo } from 'react';
import { SEED_PRICES, type PriceItem } from '../lib/priceIndexData';

/**
 * تلميح السعر — يظهر داخل نموذج إضافة المعاملة في ProjectPage
 *
 * الاستخدام:
 * <PriceHint description={form.description} amount={Number(form.amount)} quantity={qty} />
 *
 * يبحث عن أقرب بند من مؤشر الأسعار حسب وصف المعاملة، ويقارن سعر الوحدة
 * اللي دفعه المقاول بمتوسط السوق — أخضر لو أوفر، أحمر لو أغلى.
 */

// كلمات مفتاحية → بند المؤشر (تُوسّع مع الوقت)
const KEYWORD_MAP: Record<string, string> = {
  'أسمنت أبيض': 'cement-white-bag',
  'اسمنت ابيض': 'cement-white-bag',
  'أسمنت': 'cement-bag-50',
  'اسمنت': 'cement-bag-50',
  'حديد': 'rebar-ton-main',
  'بلوك 15': 'block-black-15',
  'بلوك 20': 'block-black-20',
  'بلوك عازل': 'block-insulated',
  'بلوك': 'block-black-20',
  'خرسانة': 'concrete-ready',
  'خرسانه': 'concrete-ready',
  'رمل': 'sand-truck',
  'عامل': 'labor-daily',
  'عمالة': 'labor-daily',
  'يومية': 'labor-daily',
};

export function matchPriceItem(text: string, customItems: PriceItem[] = []): PriceItem | null {
  if (!text) return null;
  const all = [...customItems, ...SEED_PRICES];
  // أولاً: تطابق مباشر مع أسماء البنود (بما فيها بنود المقاول الخاصة)
  const direct = all.find((it) => text.includes(it.name.split(' ')[0]) && text.includes(it.name.split(' ')[1] ?? ''));
  if (direct) return direct;
  // ثانياً: الكلمات المفتاحية (الأطول أولاً عشان "أسمنت أبيض" تسبق "أسمنت")
  const keys = Object.keys(KEYWORD_MAP).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (text.includes(k)) {
      const item = all.find((it) => it.id === KEYWORD_MAP[k]);
      if (item) return item;
    }
  }
  return null;
}

interface Props {
  description: string;      // وصف المعاملة اللي كتبه المقاول
  amount: number;            // المبلغ الإجمالي
  quantity?: number;         // الكمية (اختياري — لو معروفة نحسب سعر الوحدة)
  customItems?: PriceItem[]; // بنود المقاول الخاصة من Supabase
}

export default function PriceHint({ description, amount, quantity, customItems = [] }: Props) {
  const match = useMemo(() => matchPriceItem(description, customItems), [description, customItems]);

  if (!match || !amount || amount <= 0) return null;

  // لو عندنا كمية نحسب سعر الوحدة، وإلا نقارن المبلغ نفسه (مفيد لما الكمية = 1)
  const unitPrice = quantity && quantity > 0 ? amount / quantity : amount;
  const diff = unitPrice - match.avgPrice;
  const diffPct = (diff / match.avgPrice) * 100;

  // فرق أقل من 5% = طبيعي
  const status: 'good' | 'normal' | 'high' =
    diffPct <= -5 ? 'good' : diffPct >= 5 ? 'high' : 'normal';

  const styles = {
    good: 'border-[#34c759]/40 bg-[#34c759]/5 text-[#34c759]',
    normal: 'border-gray-700 bg-gray-800/40 text-gray-300',
    high: 'border-[#ff3b30]/40 bg-[#ff3b30]/5 text-[#ff3b30]',
  }[status];

  const message = {
    good: `👍 أوفر من متوسط السوق بـ ${Math.abs(diffPct).toFixed(0)}٪`,
    normal: '✓ ضمن نطاق السوق',
    high: `⚠️ أعلى من متوسط السوق بـ ${diffPct.toFixed(0)}٪`,
  }[status];

  return (
    <div className={`fade-in rounded-lg border px-3 py-2 text-sm mt-2 ${styles}`} dir="rtl">
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <span className="text-xs opacity-80">
          متوسط {match.name}: {match.avgPrice.toLocaleString('ar-SA')} ريال/{match.unit}
        </span>
      </div>
      {status === 'high' && (
        <p className="text-xs mt-1 opacity-80">
          💡 شيك على مؤشر الأسعار — يمكن تلقى مورد أرخص
        </p>
      )}
    </div>
  );
}
