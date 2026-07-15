// supabase/functions/parse-voice/index.ts
// نفس نمط scan-receipt — لكن بدل الصورة، ناخذ نص منطوق ونحوله لحقول معاملة
// النشر: supabase functions deploy parse-voice

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transcript, categories } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return new Response(JSON.stringify({ error: 'transcript is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const categoriesList = Array.isArray(categories) && categories.length
      ? categories.join('، ')
      : 'مواد بناء، عمالة، معدات، نقل، أخرى';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `أنت مساعد لمقاول سعودي. حوّل النص المنطوق التالي إلى معاملة مالية منظمة.

النص المنطوق: "${transcript}"

الفئات المتاحة: ${categoriesList}

أرجع JSON فقط بدون أي نص إضافي وبدون Markdown، بهذا الشكل:
{
  "type": "EXPENSE" أو "INCOME",
  "amount": المبلغ الإجمالي رقم فقط (لو قال "خمسة آلاف وخمسمية" = 5500),
  "title": "بيان مختصر واضح (مثال: شراء أسمنت - مؤسسة النور)",
  "category": "أقرب فئة من القائمة",
  "vendor": "اسم المورد أو الجهة إن ذُكر وإلا null",
  "quantity": الكمية إن ذُكرت (مثل 50 كيس = 50) وإلا null,
  "unit_price": سعر الوحدة إن ذُكر أو احسبه (المبلغ ÷ الكمية) وإلا null,
  "confidence": "high" أو "low" (low إذا النص غامض أو ناقص)
}

ملاحظات:
- "اشتريت / دفعت / صرفت" = EXPENSE
- "استلمت / وصلني / قبضت / دفعة من العميل" = INCOME
- انتبه للأرقام العربية المنطوقة: "ألف وأربعمية" = 1400`,
          },
        ],
      }),
    });

    const data = await response.json();
    const text = (data.content ?? [])
      .map((b: { type: string; text?: string }) => (b.type === 'text' ? b.text : ''))
      .join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('parse-voice error:', err);
    return new Response(JSON.stringify({ error: 'failed to parse transcript' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
