# دليل دمج الميزات الثلاث في بنيان

## 📁 الملفات

| الملف | الوظيفة |
|---|---|
| `src/lib/priceIndexData.ts` | بيانات المؤشر الأولية (أسعار حقيقية من السوق) |
| `src/pages/PriceIndexPage.tsx` | صفحة مؤشر الأسعار للمقاول + الموردين |
| `src/components/PriceHint.tsx` | تلميح مقارنة السعر داخل نموذج المعاملة |
| `src/components/VoiceInput.tsx` | زر 🎤 قل الفاتورة |
| `supabase/functions/parse-voice/index.ts` | Edge Function تحليل الكلام |
| `src/pages/ClientPortal.tsx` | بوابة العميل "قصة بيتك" |

## 1️⃣ قاعدة البيانات (Supabase SQL Editor)

```sql
-- مؤشر الأسعار
create table price_items (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid references auth.users not null,
  name text not null,
  category text not null,
  unit text not null,
  avg_price numeric not null,
  min_price numeric,
  max_price numeric,
  note text,
  is_custom boolean default true,
  updated_at timestamptz default now()
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid references auth.users not null,
  name text not null,
  phone text not null,
  city text,
  item_ids text[] default '{}',
  is_preferred boolean default false
);

-- مراحل قصة العميل
create table project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects not null,
  title text not null,
  description text,
  photo_url text,
  milestone_date date not null,
  sort_order int default 0
);

-- RLS
alter table price_items enable row level security;
alter table suppliers enable row level security;
alter table project_milestones enable row level security;

create policy "own price items" on price_items
  for all using (auth.uid() = contractor_id);
create policy "own suppliers" on suppliers
  for all using (auth.uid() = contractor_id);
-- المراحل: المقاول يكتب، والقراءة العامة عبر التوكن تتم من استعلام SharePage نفسه
create policy "milestones read" on project_milestones for select using (true);
create policy "milestones write" on project_milestones
  for insert with check (
    exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
  );
```

✅ متوافق مع سكيما مشروعك (user_id, share_token, INCOME/EXPENSE, status).

## 2️⃣ Edge Function

```bash
supabase functions deploy parse-voice
# مفتاح Anthropic موجود أصلاً من scan-receipt، ما تحتاج تضيفه من جديد
```

## 3️⃣ الراوتر (App.tsx)

```tsx
<Route path="/prices" element={<PriceIndexPage />} />
<Route path="/story/:shareToken" element={<ClientPortal />} />
```

وأضف رابط "📊 مؤشر الأسعار" في القائمة الجانبية / الهيدر (للمقاول فقط، ما يظهر في SharePage).

## 4️⃣ داخل نموذج المعاملة في ProjectPage.tsx

```tsx
import VoiceInput from '../components/VoiceInput';
import PriceHint from '../components/PriceHint';

// بجانب زر 📸 صوّر الفاتورة:
<VoiceInput
  categories={customCategories.map(c => c.name)}
  onResult={(tx) => setForm(prev => ({
    ...prev,
    type: tx.type,
    amount: tx.amount ? String(tx.amount) : prev.amount,
    description: tx.description ?? prev.description,
    category: tx.category ?? prev.category,
  }))}
/>

// تحت حقل المبلغ مباشرة:
<PriceHint description={form.description} amount={Number(form.amount)} />
```

## 5️⃣ زر إضافة مرحلة للقصة (ProjectPage)

أضف زر "✨ أضف مرحلة لقصة العميل" يفتح نموذج بسيط: عنوان + وصف + صورة (نفس مسار رفع الإيصالات في Storage) + تاريخ → insert في `project_milestones`.

## 🎬 سيناريو الديمو (3 دقايق)

1. **الصوت (60 ثانية):** افتح نموذج معاملة → اضغط 🎤 → قل: "اشتريت خمسين كيس أسمنت من مؤسسة النور بألف وأربعمية ريال" → الحقول تتعبى قدامهم.
2. **المؤشر (60 ثانية):** لاحظ تلميح السعر الأخضر "أوفر من السوق" تحت المبلغ → افتح صفحة المؤشر → عدّل سعر → أضف مورد برقم جوال → زر اتصال مباشر.
3. **القصة (60 ثانية):** افتح رابط /story/... على الجوال → الغلاف + حلقة التقدم + الخيط الذهبي بالصور → "هذا اللي يشوفه عميلك — وهو اللي بيسوق لك بنيان."

## ⚠️ ملاحظات

- أسعار المؤشر الأولية من نشرات السوق (فبراير–أبريل 2026): الأسمنت ~12.75 ريال/كيس، الحديد 2,150–2,450 ريال/طن، البلوك الأسود ~1,683–1,730 ريال/ألف. البنود المعلّمة "استرشادي" (الخرسانة، الرمل، العمالة) عدّلها من تجربتك.
- ما حطيت أرقام جوالات مصانع حقيقية — المقاول يضيف مورّديه بنفسه (أفضل قانونياً وأدق عملياً). مرجع رسمي إضافي: مؤشر أسعار هيئة المقاولين muqawil.org.
- الإدخال الصوتي يشتغل على Chrome / Edge / Safari. لو المتصفح ما يدعم، الزر يختفي بدون خطأ.
