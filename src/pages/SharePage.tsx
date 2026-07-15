import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, type Project, type Transaction } from '../lib/supabase'
import { Building2, TrendingUp, TrendingDown, Wallet, Image, Plus, X, Check, Upload, Clock, BarChart2, PieChart } from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

const COLORS = ['#c9a96e','#34c759','#ff3b30','#007aff','#ff9500','#af52de','#5ac8fa','#ff2d55']
const GOLD = '#c9a96e'

/* ========== مخططات (كما كانت) ========== */
function PieChartSVG({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div className="text-center opacity-30 py-8 text-sm">لا توجد بيانات</div>
  let cum = 0
  const slices = data.map(d => { const s = cum; cum += d.value/total; return { ...d, start: s, pct: d.value/total } })
  const xy = (pct: number, r: number) => [50 + r * Math.cos(pct * 2 * Math.PI - Math.PI/2), 50 + r * Math.sin(pct * 2 * Math.PI - Math.PI/2)]
  return (
    <svg viewBox="0 0 100 100" className="w-full max-w-[160px] mx-auto">
      {slices.map((s, i) => { const [x1,y1]=xy(s.start,38); const [x2,y2]=xy(s.start+s.pct,38); return <path key={i} d={`M50,50 L${x1},${y1} A38,38 0 ${s.pct>0.5?1:0},1 ${x2},${y2} Z`} fill={s.color} opacity={0.85} stroke="#1a1d27" strokeWidth="1"/> })}
      <circle cx="50" cy="50" r="22" fill="#1a1d27"/>
    </svg>
  )
}

function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return <div className="space-y-3">{data.map((d, i) => <div key={i}><div className="flex justify-between text-xs opacity-60 mb-1"><span className="truncate max-w-[140px]">{d.label}</span><span>{d.value.toLocaleString('ar-SA')}</span></div><div className="h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}><div className="h-full rounded-full" style={{width:`${(d.value/max)*100}%`,background:d.color}}/></div></div>)}</div>
}

/* ========== حلقة التقدم الذهبية ========== */
function ProgressRing({ value, label, sub }: { value: number; label: string; sub: string }) {
  const r = 52
  const c = 2 * Math.PI * r
  const [animated, setAnimated] = useState(0)
  useEffect(() => { const t = setTimeout(() => setAnimated(value), 300); return () => clearTimeout(t) }, [value])
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={GOLD} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * animated) / 100}
          style={{ transition: 'stroke-dashoffset 1.4s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{color:GOLD}}>{Math.round(value)}٪</span>
        <span className="text-xs opacity-60 mt-0.5">{label}</span>
        <span className="text-[10px] opacity-40">{sub}</span>
      </div>
    </div>
  )
}

/* ========== مرحلة على الخيط الذهبي ========== */
function MilestoneCard({ m, index }: { m: any; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className="relative pr-10 transition-all duration-700"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transitionDelay: `${Math.min(index*80,400)}ms` }}>
      <div className="absolute right-0 top-1.5 w-[27px] flex justify-center">
        <div className="w-3.5 h-3.5 rounded-full" style={{background:GOLD, boxShadow:'0 0 0 4px rgba(201,169,110,0.15)'}}/>
      </div>
      <p className="text-xs mb-1" style={{color:'rgba(201,169,110,0.8)'}}>
        {format(new Date(m.milestone_date), 'd MMMM yyyy', { locale: ar })}
      </p>
      <h3 className="text-lg font-bold">{m.title}</h3>
      {m.description && <p className="text-sm opacity-50 mt-1 leading-relaxed">{m.description}</p>}
      {m.photo_url && (
        <div className="mt-3 rounded-2xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.08)'}}>
          <img src={m.photo_url} alt={m.title} loading="lazy"
            className="w-full object-cover max-h-80 hover:scale-[1.02] transition-transform duration-500"/>
        </div>
      )}
    </div>
  )
}

/* ========== الصفحة ========== */
export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [milestones, setMilestones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all'|'INCOME'|'EXPENSE'>('all')
  const [activeView, setActiveView] = useState<'list'|'charts'>('list')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title:'', amount:'', category:'', date:format(new Date(),'yyyy-MM-dd'), notes:'' })
  const [receipt, setReceipt] = useState<File|null>(null)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const DEFAULT_INCOME_CATS = ['دفعة مقدمة', 'دفعة أولى', 'دفعة ثانية', 'دفعة نهائية', 'أخرى']

  useEffect(() => { fetchAll() }, [token])

  const fetchAll = async () => {
    setLoading(true)
    const { data: proj } = await supabase.from('projects').select('*').eq('share_token', token).single()
    if (!proj) { setLoading(false); return }
    setProject(proj)
    const [{ data: txns }, { data: ms }] = await Promise.all([
      supabase.from('transactions').select('*').eq('project_id', proj.id).order('date', { ascending: false }),
      supabase.from('project_milestones').select('*').eq('project_id', proj.id).order('sort_order'),
    ])
    setTransactions(txns || [])
    setMilestones(ms || [])
    setLoading(false)
  }

  const approvedTxns = transactions.filter(t => t.status === 'approved' || !t.status)
  const pendingTxns = transactions.filter(t => t.status === 'pending')
  const filtered = approvedTxns.filter(t => activeTab === 'all' || t.type === activeTab)
  const income = approvedTxns.filter(t => t.type==='INCOME').reduce((s,t) => s+t.amount, 0)
  const expense = approvedTxns.filter(t => t.type==='EXPENSE').reduce((s,t) => s+t.amount, 0)
  const balance = income - expense
  const fmt = (n: number) => n.toLocaleString('ar-SA')

  const byCat = (type: 'INCOME'|'EXPENSE') => Object.entries(
    approvedTxns.filter(t => t.type===type).reduce((acc,t) => { const k=t.category||'أخرى'; acc[k]=(acc[k]||0)+t.amount; return acc }, {} as Record<string,number>)
  ).sort((a,b) => b[1]-a[1]).map(([label,value],i) => ({ label, value, color: COLORS[i%COLORS.length] }))

  const submitIncome = async () => {
    if (!form.title || !form.amount || !form.date || !project) return
    setSaving(true)
    let receipt_url = undefined
    if (receipt) {
      const path = `${project.id}/${Date.now()}.${receipt.name.split('.').pop()}`
      const { error } = await supabase.storage.from('receipts').upload(path, receipt)
      if (!error) { const { data } = supabase.storage.from('receipts').getPublicUrl(path); receipt_url = data.publicUrl }
    }
    await supabase.from('transactions').insert({
      project_id: project.id, type: 'INCOME', title: form.title,
      amount: parseFloat(form.amount), category: form.category,
      date: form.date, notes: form.notes || null,
      receipt_url, status: 'pending'
    })
    setForm({ title:'', amount:'', category:'', date:format(new Date(),'yyyy-MM-dd'), notes:'' })
    setReceipt(null); setShowForm(false); setSaving(false)
    setSuccessMsg('تم إرسال الإيراد وبانتظار موافقة المقاول ✅')
    setTimeout(() => setSuccessMsg(''), 4000)
    fetchAll()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'#0f1117'}}><div className="w-8 h-8 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"/></div>

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0f1117'}}>
      <div className="text-center opacity-40"><Building2 size={48} className="mx-auto mb-4 opacity-30"/><p>الرابط غير صحيح</p></div>
    </div>
  )

  // حسابات الوقت والميزانية للبطل
  const p = project as any
  const hasKpi = p?.start_date && p?.end_date && p?.budget
  let timePct = 0, remainingDays = 0, totalDays = 0, elapsedDays = 0, budgetPct = 0, budgetUsed = expense, budget = 0, dailyRate = 0, isOnTrack = true
  if (hasKpi) {
    const start = new Date(p.start_date), end = new Date(p.end_date), today = new Date()
    totalDays = Math.ceil((end.getTime()-start.getTime())/86400000)
    elapsedDays = Math.max(0, Math.ceil((today.getTime()-start.getTime())/86400000))
    remainingDays = Math.max(0, Math.ceil((end.getTime()-today.getTime())/86400000))
    timePct = Math.min(100, (elapsedDays/totalDays)*100)
    budget = parseFloat(p.budget)
    budgetPct = Math.min(100, (budgetUsed/budget)*100)
    dailyRate = elapsedDays > 0 ? budgetUsed/elapsedDays : 0
    isOnTrack = budgetPct <= timePct + 10
  }
  const coverPhoto = [...milestones].reverse().find(m => m.photo_url)?.photo_url as string | undefined

  return (
    <div className="min-h-screen" style={{background:'#0f1117'}} dir="rtl">
      {/* ===== الهيدر الثابت ===== */}
      <header className="sticky top-0 z-40" style={{background:'rgba(15,17,23,0.85)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(201,169,110,0.12)'}}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#c9a96e22,#c9a96e44)'}}>
              <Building2 size={16} style={{color:GOLD}}/>
            </div>
            <span className="font-black" style={{color:GOLD}}>بنيان</span>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary !py-2 !px-4 flex items-center gap-1.5 text-sm">
            <Plus size={14}/>إضافة دفعة
          </button>
        </div>
      </header>

      {/* ===== الغلاف ===== */}
      <section className="relative overflow-hidden">
        {coverPhoto && (
          <div className="absolute inset-0">
            <img src={coverPhoto} alt="" className="w-full h-full object-cover opacity-25"/>
            <div className="absolute inset-0" style={{background:'linear-gradient(to bottom, rgba(15,17,23,0.5), rgba(15,17,23,0.85), #0f1117)'}}/>
          </div>
        )}
        <div className="relative max-w-3xl mx-auto px-4 pt-14 pb-10 text-center">
          <p className="text-sm mb-4" style={{color:GOLD, letterSpacing:'0.35em'}}>قـصـة بـيـتـك</p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight">{project.name}</h1>

          {hasKpi && (p as any).show_kpis !== false && (
            <>
              <div className="mt-8"><ProgressRing value={timePct} label={`${remainingDays} يوم متبقي`} sub={`من أصل ${totalDays} يوم`}/></div>
              <div className="inline-flex items-center gap-2 mt-5 px-4 py-1.5 rounded-full text-sm font-semibold"
                style={{background: isOnTrack?'rgba(52,199,89,0.1)':'rgba(255,59,48,0.1)', border:`1px solid ${isOnTrack?'rgba(52,199,89,0.3)':'rgba(255,59,48,0.3)'}`, color: isOnTrack?'#34c759':'#ff3b30'}}>
                <span className="w-2 h-2 rounded-full" style={{background:isOnTrack?'#34c759':'#ff3b30'}}/>
                {isOnTrack ? 'المشروع في المسار الصحيح' : 'المشروع يحتاج مراجعة'}
              </div>
            </>
          )}

          {/* البطاقات المالية */}
          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { label:'الإيرادات', value:income, color:'#34c759', Icon:TrendingUp },
              { label:'المصاريف', value:expense, color:'#ff3b30', Icon:TrendingDown },
              { label:'الرصيد', value:balance, color: balance>=0?GOLD:'#ff3b30', Icon:Wallet, sign:true },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl px-3 py-4 text-center fade-in"
                style={{background:'rgba(255,255,255,0.03)', border:`1px solid ${i===2?'rgba(201,169,110,0.25)':'rgba(255,255,255,0.07)'}`, animationDelay:`${i*0.08}s`}}>
                <s.Icon size={16} className="mx-auto mb-2" style={{color:s.color}}/>
                <p className="text-[11px] opacity-40 mb-1">{s.label}</p>
                <p className="font-black text-base sm:text-lg" style={{color:s.color}}>
                  {s.sign && s.value>=0 ? '+' : ''}{fmt(s.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-4 pb-16 space-y-10">
        {/* رسالة النجاح */}
        {successMsg && (
          <div className="fade-in text-sm text-green-400 bg-green-400/10 rounded-xl p-4 text-center border border-green-400/20">{successMsg}</div>
        )}

        {/* دفعات بانتظار الموافقة */}
        {pendingTxns.length > 0 && (
          <div className="rounded-2xl p-4" style={{background:'rgba(201,169,110,0.05)', border:'1px solid rgba(201,169,110,0.25)'}}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} style={{color:GOLD}}/>
              <span className="text-sm font-bold" style={{color:GOLD}}>بانتظار موافقة المقاول ({pendingTxns.length})</span>
            </div>
            <div className="space-y-2">
              {pendingTxns.map(t => (
                <div key={t.id} className="flex items-center justify-between text-sm opacity-70">
                  <span>{t.title}</span>
                  <span className="font-bold text-green-400">+{fmt(t.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== رحلة البناء — الخيط الذهبي ===== */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-black">رحلة البناء</h2>
            <div className="flex-1 h-px" style={{background:'linear-gradient(to left, rgba(201,169,110,0.4), transparent)'}}/>
          </div>
          {milestones.length === 0 ? (
            <p className="text-center text-sm opacity-30 py-8">الرحلة بدأت للتو… المراحل بتظهر هنا أول بأول 🌱</p>
          ) : (
            <div className="relative">
              <div className="absolute right-[13px] top-2 bottom-2 w-px" style={{background:'linear-gradient(to bottom, #c9a96e, rgba(201,169,110,0.35), transparent)'}}/>
              <div className="space-y-10">
                {milestones.map((m, i) => <MilestoneCard key={m.id} m={m} index={i}/>)}
              </div>
            </div>
          )}
        </section>

        {/* ===== مؤشرات الأداء ===== */}
        {hasKpi && (p as any).show_kpis !== false && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-black">مؤشرات الأداء</h2>
              <div className="flex-1 h-px" style={{background:'linear-gradient(to left, rgba(201,169,110,0.4), transparent)'}}/>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: totalDays, l: 'إجمالي الأيام', c: '#007aff' },
                  { v: elapsedDays, l: 'منقضية', c: '#ff9500' },
                  { v: remainingDays, l: 'متبقية', c: remainingDays<7?'#ff3b30':'#34c759' },
                ].map((s,i) => (
                  <div key={i} className="rounded-2xl p-4 text-center" style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)'}}>
                    <p className="font-black text-2xl" style={{color:s.c}}>{s.v}</p>
                    <p className="text-xs opacity-40 mt-1">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl p-5 space-y-5" style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)'}}>
                <div>
                  <div className="flex justify-between text-xs opacity-60 mb-1.5"><span>تقدم الوقت</span><span>{timePct.toFixed(0)}%</span></div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{width:`${timePct}%`,background:'linear-gradient(90deg,#007aff,#5ac8fa)'}}/>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs opacity-60 mb-1.5"><span>استهلاك الميزانية</span><span>{budgetPct.toFixed(0)}%</span></div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{width:`${budgetPct}%`,background:budgetPct>90?'linear-gradient(90deg,#ff3b30,#ff9500)':'linear-gradient(90deg,#c9a96e,#34c759)'}}/>
                  </div>
                  <div className="flex justify-between text-xs mt-1.5 opacity-40">
                    <span>المصروف: <span className="text-red-400">{fmt(budgetUsed)}</span></span>
                    <span>الميزانية: <span style={{color:GOLD}}>{fmt(budget)}</span></span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div><p className="text-xs opacity-40 mb-1">معدل الصرف اليومي</p><p className="font-black" style={{color:'#ff9500'}}>{fmt(Math.round(dailyRate))} ريال</p></div>
                  <div><p className="text-xs opacity-40 mb-1">المتبقي من الميزانية</p><p className="font-black" style={{color:budget-budgetUsed<0?'#ff3b30':'#34c759'}}>{budget-budgetUsed<0?'-':'+'}{fmt(Math.abs(budget-budgetUsed))} ريال</p></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== السجل والتقارير ===== */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-black">المعاملات</h2>
            <div className="flex-1 h-px" style={{background:'linear-gradient(to left, rgba(201,169,110,0.4), transparent)'}}/>
          </div>

          <div className="flex gap-1 p-1 rounded-xl w-fit mb-4" style={{background:'rgba(255,255,255,0.04)'}}>
            {([{key:'list',label:'السجل',Icon:Wallet},{key:'charts',label:'التقارير',Icon:BarChart2}] as const).map(({key,label,Icon}) => (
              <button key={key} onClick={() => setActiveView(key as any)} className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                style={activeView===key?{background:'linear-gradient(135deg,#c9a96e,#a07d54)',color:'#0f1117'}:{color:'rgba(245,240,232,0.4)'}}>
                <Icon size={14}/>{label}
              </button>
            ))}
          </div>

          {activeView==='list' && <>
            <div className="flex gap-1 p-1 rounded-xl w-fit mb-4" style={{background:'rgba(255,255,255,0.04)'}}>
              {(['all','INCOME','EXPENSE'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={activeTab===tab?{background:'linear-gradient(135deg,#c9a96e,#a07d54)',color:'#0f1117'}:{color:'rgba(245,240,232,0.4)'}}>
                  {tab==='all'?`الكل (${approvedTxns.length})`:tab==='INCOME'?`إيرادات (${approvedTxns.filter(t=>t.type==='INCOME').length})`:`مصاريف (${approvedTxns.filter(t=>t.type==='EXPENSE').length})`}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {filtered.map((t,i) => (
                <div key={t.id} className="rounded-2xl p-4 flex items-center gap-4 fade-in"
                  style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', animationDelay:`${i*0.03}s`}}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type==='INCOME'?'income-badge':'expense-badge'}`}>
                    {t.type==='INCOME'?<TrendingUp size={16}/>:<TrendingDown size={16}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold truncate">{t.title}</p>
                      {t.category&&<span className="text-xs opacity-40 bg-white/5 px-2 py-0.5 rounded-full">{t.category}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs opacity-40">
                      <span>{format(new Date(t.date),'d MMM yyyy',{locale:ar})}</span>
                      {t.notes&&<span className="truncate">{t.notes}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {t.receipt_url&&<a href={t.receipt_url} target="_blank" rel="noreferrer" className="opacity-40 hover:opacity-70"><Image size={16}/></a>}
                    <p className={`font-black text-lg ${t.type==='INCOME'?'text-green-400':'text-red-400'}`}>
                      {t.type==='INCOME'?'+':'-'}{fmt(t.amount)}
                    </p>
                  </div>
                </div>
              ))}
              {filtered.length===0&&<div className="text-center py-16 opacity-30"><Wallet size={36} className="mx-auto mb-3 opacity-50"/><p>لا توجد معاملات</p></div>}
            </div>
          </>}

          {activeView==='charts' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 fade-in">
            <div className="card"><h3 className="font-bold mb-4 flex items-center gap-2"><PieChart size={16} style={{color:'#ff3b30'}}/>توزيع المصاريف</h3><PieChartSVG data={byCat('EXPENSE')}/><div className="mt-4 space-y-1">{byCat('EXPENSE').slice(0,5).map((d,i)=><div key={i} className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{background:d.color}}/><span className="flex-1 opacity-60 truncate">{d.label}</span><span className="font-semibold">{fmt(d.value)}</span></div>)}</div></div>
            <div className="card"><h3 className="font-bold mb-4 flex items-center gap-2"><PieChart size={16} style={{color:'#34c759'}}/>توزيع الإيرادات</h3><PieChartSVG data={byCat('INCOME')}/><div className="mt-4 space-y-1">{byCat('INCOME').slice(0,5).map((d,i)=><div key={i} className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{background:d.color}}/><span className="flex-1 opacity-60 truncate">{d.label}</span><span className="font-semibold">{fmt(d.value)}</span></div>)}</div></div>
            <div className="card md:col-span-2"><h3 className="font-bold mb-6 flex items-center gap-2"><BarChart2 size={16} style={{color:GOLD}}/>أكبر بنود المصاريف</h3><BarChart data={byCat('EXPENSE').slice(0,6)}/></div>
          </div>}
        </section>
      </main>

      <footer className="text-center py-10" style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        <p className="text-xs opacity-40">صُنعت هذه الصفحة بواسطة <span style={{color:GOLD}}>بُنيان</span> — منصة إدارة مشاريع البناء</p>
      </footer>

      {/* ===== نافذة إضافة دفعة (نفس نظام الموافقات) ===== */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{background:'rgba(0,0,0,0.8)',backdropFilter:'blur(4px)'}} onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="card w-full max-w-lg fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-lg">إضافة دفعة</h3>
                <p className="text-xs opacity-40 mt-0.5">سيتم إرسالها للمقاول للموافقة</p>
              </div>
              <button onClick={()=>setShowForm(false)} className="opacity-40 hover:opacity-70"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div><label className="text-xs opacity-50 mb-2 block">البيان *</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="input-field" placeholder="مثال: دفعة أولى" autoFocus/></div>
              <div><label className="text-xs opacity-50 mb-2 block">المبلغ (ريال) *</label><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} className="input-field" placeholder="0"/></div>
              <div><label className="text-xs opacity-50 mb-2 block">الفئة</label>
                <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="input-field">
                  <option value="">اختر فئة</option>
                  {DEFAULT_INCOME_CATS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="text-xs opacity-50 mb-2 block">التاريخ *</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className="input-field"/></div>
              <div><label className="text-xs opacity-50 mb-2 block">ملاحظات</label><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="input-field resize-none" rows={2} placeholder="اختياري..."/></div>
              <div><label className="text-xs opacity-50 mb-2 block">إيصال الدفع</label>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e=>setReceipt(e.target.files?.[0]||null)}/>
                <button onClick={()=>fileRef.current?.click()} className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"><Upload size={16}/>{receipt?receipt.name:'رفع إيصال'}</button>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={()=>setShowForm(false)} className="btn-ghost flex-1">إلغاء</button>
                <button onClick={submitIncome} disabled={!form.title||!form.amount||!form.date||saving} className="btn-primary flex-1 disabled:opacity-40 flex items-center justify-center gap-2">
                  {saving?<><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>جاري...</>:<><Check size={16}/>إرسال للموافقة</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
