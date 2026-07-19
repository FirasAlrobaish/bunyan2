import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * ✨ بوابة العميل — "قصة بيتك"
 *
 * ترقية فاخرة لـ SharePage: بدل جدول أرقام، العميل يشوف مشروعه كقصة —
 * خيط ذهبي عمودي يمر بكل مرحلة (تأسيس، عظم، تشطيب...) مع صورها وتاريخها.
 *
 * الرابط: /story/:shareToken  (نفس آلية توكن المشاركة الحالية)
 *
 * الجدول المطلوب (جديد):
 *
 * create table project_milestones (
 *   id uuid primary key default gen_random_uuid(),
 *   project_id uuid references projects not null,
 *   title text not null,           -- "صبّة القواعد"
 *   description text,              -- وصف قصير يكتبه المقاول
 *   photo_url text,                -- من Supabase Storage
 *   milestone_date date not null,
 *   sort_order int default 0
 * );
 *
 * المقاول يضيف المراحل من ProjectPage (زر "أضف مرحلة لقصة العميل").
 * البوابة قراءة فقط — ما تعرض المصاريف التفصيلية، فقط:
 * التقدم الكلي + المراحل + ملخص الدفعات (المدفوع/المتبقي على العميل).
 */

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  milestone_date: string;
}

interface PortalData {
  projectName: string;
  clientName: string | null;
  contractorName: string;
  contractorPhone: string | null;
  startDate: string;
  endDate: string;
  totalBudget: number;   // قيمة العقد
  paidByClient: number;  // مجموع دفعات العميل المعتمدة
  milestones: Milestone[];
}

export default function ClientPortal() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // TODO: عدّل حسب أسماء جداولك الفعلية — نفس استعلام SharePage الحالي + المراحل
        const { data: project } = await supabase
          .from('projects')
          .select('*, project_milestones(*), transactions(*)')
          .eq('share_token', shareToken)
          .single();

        if (!project) { setLoading(false); return; }

        // نفس منطق ProjectPage: النوع INCOME والحالة معتمدة (أو بدون حالة)
        const approvedPayments = (project.transactions ?? [])
          .filter((t: { type: string; status?: string }) => t.type === 'INCOME' && (!t.status || t.status === 'approved'))
          .reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);

        setData({
          projectName: project.name,
          clientName: project.client_name ?? null,
          contractorName: project.contractor_name ?? 'مقاول المشروع',
          contractorPhone: project.contractor_phone ?? null,
          startDate: project.start_date,
          endDate: project.end_date,
          totalBudget: Number(project.budget),
          paidByClient: approvedPayments,
          milestones: (project.project_milestones ?? []).sort(
            (a: Milestone & { sort_order: number }, b: Milestone & { sort_order: number }) =>
              a.sort_order - b.sort_order,
          ),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100E] flex items-center justify-center">
        <div className="text-[#c9a96e] animate-pulse text-lg">جاري فتح قصة بيتك…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#12100E] flex items-center justify-center" dir="rtl">
        <div className="text-gray-400">الرابط غير صحيح أو انتهت صلاحيته</div>
      </div>
    );
  }

  // حسابات التقدم
  const now = Date.now();
  const start = new Date(data.startDate).getTime();
  const end = new Date(data.endDate).getTime();
  const timeProgress = Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100);
  const paymentProgress = data.totalBudget > 0 ? (data.paidByClient / data.totalBudget) * 100 : 0;
  const daysLeft = Math.max(Math.ceil((end - now) / 86_400_000), 0);

  return (
    <div className="min-h-screen bg-[#12100E] text-white" dir="rtl">
      {/* ===== الغلاف ===== */}
      <header className="relative overflow-hidden">
        {/* أول صورة مرحلة = خلفية الغلاف */}
        {data.milestones[data.milestones.length - 1]?.photo_url && (
          <div className="absolute inset-0">
            <img
              src={data.milestones[data.milestones.length - 1].photo_url!}
              alt=""
              className="w-full h-full object-cover opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#12100E]/40 via-[#12100E]/80 to-[#12100E]" />
          </div>
        )}

        <div className="relative max-w-2xl mx-auto px-6 pt-16 pb-12 text-center">
          <p className="text-[#c9a96e] text-sm tracking-[0.35em] mb-4">قـصـة بـيـتـك</p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">{data.projectName}</h1>
          {data.clientName && (
            <p className="text-gray-400 mt-3">يُبنى بعناية لـ {data.clientName}</p>
          )}

          {/* حلقة التقدم الذهبية */}
          <ProgressRing value={timeProgress} label={`${daysLeft} يوم متبقي`} />

          {/* ملخص الدفعات — الشيء الوحيد المالي اللي يشوفه العميل */}
          <div className="grid grid-cols-2 gap-3 mt-8 max-w-sm mx-auto">
            <div className="rounded-2xl border border-[#c9a96e]/20 bg-[#c9a96e]/5 px-4 py-3">
              <p className="text-xs text-gray-400">دفعت حتى الآن</p>
              <p className="text-xl font-bold text-[#c9a96e] mt-1">
                {data.paidByClient.toLocaleString('ar-SA')} <span className="text-xs font-normal">ريال</span>
              </p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-800/30 px-4 py-3">
              <p className="text-xs text-gray-400">قيمة العقد</p>
              <p className="text-xl font-bold text-gray-200 mt-1">
                {data.totalBudget.toLocaleString('ar-SA')} <span className="text-xs font-normal">ريال</span>
              </p>
            </div>
          </div>
          <div className="max-w-sm mx-auto mt-2">
            <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full bg-[#c9a96e] rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(paymentProgress, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1 text-left" dir="ltr">
              {paymentProgress.toFixed(0)}%
            </p>
          </div>
        </div>
      </header>

      {/* ===== خيط الذهب — الخط الزمني ===== */}
      <main className="max-w-2xl mx-auto px-6 pb-20">
        {data.milestones.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            القصة بدأت للتو… المراحل بتظهر هنا أول بأول 🌱
          </div>
        ) : (
          <div className="relative mt-4">
            {/* الخيط */}
            <div className="absolute right-[13px] top-2 bottom-2 w-px bg-gradient-to-b from-[#c9a96e] via-[#c9a96e]/40 to-transparent" />

            <div className="space-y-10">
              {data.milestones.map((m, i) => (
                <MilestoneCard key={m.id} milestone={m} index={i} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ===== التذييل ===== */}
      <footer className="border-t border-gray-800/60 py-8 text-center">
        <p className="text-sm text-gray-400">
          ينفذه بكل فخر: <span className="text-[#c9a96e]">{data.contractorName}</span>
        </p>
        {data.contractorPhone && (
          <a
            href={`https://wa.me/${data.contractorPhone.replace(/^0/, '966').replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-3 text-xs px-4 py-2 rounded-full border border-[#34c759]/40 text-[#34c759] hover:bg-[#34c759]/10 transition"
          >
            تواصل مع المقاول 💬
          </a>
        )}
        <p className="text-[10px] text-gray-600 mt-6">
          صُنعت هذه الصفحة بواسطة <span className="text-[#c9a96e]">بُنيان</span> — منصة إدارة مشاريع البناء
        </p>
      </footer>
    </div>
  );
}

/* ---------- حلقة التقدم الذهبية ---------- */
function ProgressRing({ value, label }: { value: number; label: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="relative w-36 h-36 mx-auto mt-8">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1f2330" strokeWidth="6" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke="#c9a96e" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * animated) / 100}
          style={{ transition: 'stroke-dashoffset 1.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[#c9a96e]">{Math.round(value)}٪</span>
        <span className="text-[11px] text-gray-400 mt-0.5">{label}</span>
      </div>
    </div>
  );
}

/* ---------- بطاقة مرحلة على الخيط ---------- */
function MilestoneCard({ milestone, index }: { milestone: Milestone; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // تظهر بنعومة عند التمرير
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const dateStr = new Date(milestone.milestone_date).toLocaleDateString('ar-SA', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div
      ref={ref}
      className="relative pr-10 transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${Math.min(index * 80, 400)}ms`,
      }}
    >
      {/* عقدة الخيط */}
      <div className="absolute right-0 top-1.5 w-[27px] flex justify-center">
        <div className="w-3.5 h-3.5 rounded-full bg-[#c9a96e] ring-4 ring-[#c9a96e]/15" />
      </div>

      <p className="text-xs text-[#c9a96e]/80 mb-1">{dateStr}</p>
      <h3 className="text-lg font-semibold">{milestone.title}</h3>
      {milestone.description && (
        <p className="text-sm text-gray-400 mt-1 leading-relaxed">{milestone.description}</p>
      )}

      {milestone.photo_url && (
        <div className="mt-3 rounded-2xl overflow-hidden border border-gray-800">
          <img
            src={milestone.photo_url}
            alt={milestone.title}
            loading="lazy"
            className="w-full object-cover max-h-80 hover:scale-[1.02] transition-transform duration-500"
          />
        </div>
      )}
    </div>
  );
}
