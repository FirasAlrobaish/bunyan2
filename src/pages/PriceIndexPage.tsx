import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  CATEGORIES,
  SEED_PRICES,
  SEED_SUPPLIERS,
  type PriceItem,
  type Supplier,
} from '../lib/priceIndexData';

/**
 * مؤشر بنيان للأسعار — صفحة خاصة بالمقاول (ما تظهر للعميل ولا بالرابط المشارك)
 *
 * الجداول المطلوبة في Supabase:
 *
 * create table price_items (
 *   id uuid primary key default gen_random_uuid(),
 *   contractor_id uuid references auth.users not null,
 *   name text not null,
 *   category text not null,
 *   unit text not null,
 *   avg_price numeric not null,
 *   min_price numeric,
 *   max_price numeric,
 *   note text,
 *   is_custom boolean default true,
 *   updated_at timestamptz default now()
 * );
 *
 * create table suppliers (
 *   id uuid primary key default gen_random_uuid(),
 *   contractor_id uuid references auth.users not null,
 *   name text not null,
 *   phone text not null,
 *   city text,
 *   item_ids text[] default '{}',
 *   is_preferred boolean default false
 * );
 *
 * + RLS: كل مقاول يشوف بنوده وموّرديه فقط.
 */

export default function PriceIndexPage() {
  const [items, setItems] = useState<PriceItem[]>(SEED_PRICES);
  const [suppliers, setSuppliers] = useState<Supplier[]>(SEED_SUPPLIERS);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- تحميل بنود المقاول المخصصة من Supabase ودمجها مع البيانات الأولية ---
  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      const [{ data: customItems }, { data: mySuppliers }] = await Promise.all([
        supabase.from('price_items').select('*').eq('contractor_id', user.user.id),
        supabase.from('suppliers').select('*').eq('contractor_id', user.user.id),
      ]);

      if (customItems?.length) {
        const mapped: PriceItem[] = customItems.map((r) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          unit: r.unit,
          avgPrice: Number(r.avg_price),
          minPrice: Number(r.min_price ?? r.avg_price),
          maxPrice: Number(r.max_price ?? r.avg_price),
          lastUpdated: (r.updated_at ?? '').slice(0, 7),
          isCustom: true,
          note: r.note ?? undefined,
        }));
        // البنود المخصصة تطغى على الأولية إذا تطابق الاسم
        const customNames = new Set(mapped.map((m) => m.name));
        setItems([...SEED_PRICES.filter((s) => !customNames.has(s.name)), ...mapped]);
      }
      if (mySuppliers?.length) {
        setSuppliers(
          mySuppliers.map((s) => ({
            id: s.id,
            name: s.name,
            phone: s.phone,
            city: s.city ?? undefined,
            itemIds: s.item_ids ?? [],
            isPreferred: s.is_preferred,
          })),
        );
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const okCat = activeCategory === 'all' || it.category === activeCategory;
      const okSearch = !search || it.name.includes(search);
      return okCat && okSearch;
    });
  }, [items, activeCategory, search]);

  const suppliersFor = (itemId: string) => suppliers.filter((s) => s.itemIds.includes(itemId));

  // --- إضافة بند مخصص ---
  const addCustomItem = async (form: {
    name: string; category: string; unit: string; avgPrice: number;
  }) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;
    const { data, error } = await supabase
      .from('price_items')
      .insert({
        contractor_id: user.user.id,
        name: form.name,
        category: form.category,
        unit: form.unit,
        avg_price: form.avgPrice,
      })
      .select()
      .single();
    if (!error && data) {
      setItems((prev) => [
        ...prev,
        {
          id: data.id, name: form.name, category: form.category, unit: form.unit,
          avgPrice: form.avgPrice, minPrice: form.avgPrice, maxPrice: form.avgPrice,
          lastUpdated: new Date().toISOString().slice(0, 7), isCustom: true,
        },
      ]);
      setShowAddItem(false);
    }
  };

  // --- تعديل متوسط سعر بند (حتى لو من البيانات الأولية — ينسخ كبند مخصص) ---
  const updatePrice = async (item: PriceItem, newAvg: number) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;
    if (item.isCustom) {
      await supabase.from('price_items').update({ avg_price: newAvg, updated_at: new Date().toISOString() }).eq('id', item.id);
    } else {
      await supabase.from('price_items').insert({
        contractor_id: user.user.id, name: item.name, category: item.category,
        unit: item.unit, avg_price: newAvg, min_price: item.minPrice, max_price: item.maxPrice,
      });
    }
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, avgPrice: newAvg, isCustom: true } : it)));
    setEditingId(null);
  };

  // --- إضافة مورد ---
  const addSupplier = async (form: { name: string; phone: string; city: string; itemIds: string[] }) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        contractor_id: user.user.id, name: form.name, phone: form.phone,
        city: form.city || null, item_ids: form.itemIds,
      })
      .select()
      .single();
    if (!error && data) {
      setSuppliers((prev) => [...prev, { id: data.id, ...form }]);
      setShowAddSupplier(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#12100E' }} dir="rtl">
    <div className="max-w-4xl mx-auto px-4 py-6 fade-in">
      {/* الترويسة */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors text-lg"
          >
            →
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">📊 مؤشر بنيان للأسعار</h1>
            <p className="text-sm text-gray-400 mt-1">
              متوسطات السوق السعودي — استرشادية وقابلة للتعديل حسب منطقتك ومورّديك
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setShowAddSupplier(true)}>+ مورد</button>
          <button className="btn-primary" onClick={() => setShowAddItem(true)}>+ بند جديد</button>
        </div>
      </div>

      {/* البحث والفلاتر */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <input
          className="input-field max-w-xs"
          placeholder="ابحث عن بند…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className={activeCategory === 'all' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setActiveCategory('all')}
        >
          الكل
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={activeCategory === c.id ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setActiveCategory(c.id)}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* بطاقات البنود */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const itemSuppliers = suppliersFor(item.id);
          const range = item.maxPrice - item.minPrice;
          const pos = range > 0 ? ((item.avgPrice - item.minPrice) / range) * 100 : 50;
          return (
            <div key={item.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white">{item.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    لكل {item.unit}
                    {item.isCustom && <span className="mr-2 text-[#c9a96e]">• بند خاص</span>}
                  </p>
                </div>
                <button
                  className="text-xs text-gray-500 hover:text-[#c9a96e]"
                  onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                >
                  ✏️
                </button>
              </div>

              {/* المتوسط */}
              {editingId === item.id ? (
                <EditPriceInline
                  initial={item.avgPrice}
                  onSave={(v) => updatePrice(item, v)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="mt-3">
                  <span className="text-3xl font-bold text-[#c9a96e]">
                    {item.avgPrice.toLocaleString('ar-SA')}
                  </span>
                  <span className="text-sm text-gray-400 mr-1">ريال</span>
                </div>
              )}

              {/* شريط النطاق: أقل ← متوسط ← أعلى */}
              <div className="mt-3">
                <div className="relative h-1.5 rounded-full bg-gray-700">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#c9a96e] border-2 border-[#12100E]"
                    style={{ right: `calc(${Math.min(Math.max(pos, 0), 100)}% - 6px)` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                  <span>{item.minPrice.toLocaleString('ar-SA')}</span>
                  <span>{item.maxPrice.toLocaleString('ar-SA')}</span>
                </div>
              </div>

              {item.note && <p className="text-xs text-gray-500 mt-2">💡 {item.note}</p>}

              {/* الموردين */}
              <div className="mt-3 pt-3 border-t border-gray-800">
                {itemSuppliers.length === 0 ? (
                  <button
                    className="text-xs text-gray-500 hover:text-[#c9a96e]"
                    onClick={() => setShowAddSupplier(true)}
                  >
                    + أضف مورد لهذا البند
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    {itemSuppliers.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">
                          {s.isPreferred && '⭐ '}
                          {s.name}
                          {s.city && <span className="text-gray-500 text-xs"> — {s.city}</span>}
                        </span>
                        <div className="flex gap-2">
                          <a
                            href={`tel:${s.phone}`}
                            className="text-xs px-2 py-1 rounded bg-[#34c759]/10 text-[#34c759] hover:bg-[#34c759]/20"
                          >
                            📞 اتصال
                          </a>
                          <a
                            href={`https://wa.me/${s.phone.replace(/^0/, '966').replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs px-2 py-1 rounded bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                          >
                            واتساب
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-[10px] text-gray-600 mt-2">آخر تحديث: {item.lastUpdated}</p>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-10 text-gray-500">
          ما فيه بنود بهذا الفلتر — أضف بند جديد 👆
        </div>
      )}

      {/* نافذة إضافة بند */}
      {showAddItem && <AddItemModal onSave={addCustomItem} onClose={() => setShowAddItem(false)} />}

      {/* نافذة إضافة مورد */}
      {showAddSupplier && (
        <AddSupplierModal items={items} onSave={addSupplier} onClose={() => setShowAddSupplier(false)} />
      )}
    </div>
    </div>
  );
}

/* ---------- مكونات فرعية ---------- */

function EditPriceInline({
  initial, onSave, onCancel,
}: { initial: number; onSave: (v: number) => void; onCancel: () => void }) {
  const [val, setVal] = useState(String(initial));
  return (
    <div className="flex gap-2 mt-3 items-center">
      <input
        className="input-field w-28"
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        autoFocus
      />
      <button className="btn-primary text-xs" onClick={() => onSave(Number(val))}>حفظ</button>
      <button className="btn-ghost text-xs" onClick={onCancel}>إلغاء</button>
    </div>
  );
}

function AddItemModal({
  onSave, onClose,
}: {
  onSave: (f: { name: string; category: string; unit: string; avgPrice: number }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('other');
  const [unit, setUnit] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-white mb-4">إضافة بند جديد للمؤشر</h3>
        <div className="space-y-3">
          <input className="input-field" placeholder="اسم البند (مثال: سيراميك أرضيات)" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <input className="input-field" placeholder="الوحدة (م² / طن / حبة / يوم)" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <input className="input-field" type="number" placeholder="متوسط السعر بالريال" value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} />
        </div>
        <div className="flex gap-2 mt-5">
          <button
            className="btn-primary flex-1"
            disabled={!name || !unit || !avgPrice}
            onClick={() => onSave({ name, category, unit, avgPrice: Number(avgPrice) })}
          >
            إضافة
          </button>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function AddSupplierModal({
  items, onSave, onClose,
}: {
  items: PriceItem[];
  onSave: (f: { name: string; phone: string; city: string; itemIds: string[] }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [itemIds, setItemIds] = useState<string[]>([]);
  const toggle = (id: string) =>
    setItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-white mb-4">إضافة مورد / مصنع</h3>
        <div className="space-y-3">
          <input className="input-field" placeholder="اسم المورد أو المصنع" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input-field" placeholder="رقم الجوال (05xxxxxxxx)" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="input-field" placeholder="المدينة (اختياري)" value={city} onChange={(e) => setCity(e.target.value)} />
          <div>
            <p className="text-sm text-gray-400 mb-2">وش يوفر هذا المورد؟</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((it) => (
                <button
                  key={it.id}
                  className={`text-xs px-2 py-1 rounded-full border transition ${
                    itemIds.includes(it.id)
                      ? 'border-[#c9a96e] text-[#c9a96e] bg-[#c9a96e]/10'
                      : 'border-gray-700 text-gray-400'
                  }`}
                  onClick={() => toggle(it.id)}
                >
                  {it.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            className="btn-primary flex-1"
            disabled={!name || !phone}
            onClick={() => onSave({ name, phone, city, itemIds })}
          >
            حفظ المورد
          </button>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
