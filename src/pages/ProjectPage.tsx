import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, type Project, type Transaction, type Category } from '../lib/supabase'
import { ArrowRight, Plus, Share2, TrendingUp, TrendingDown, Wallet, Search, Trash2, Image, X, Check, Upload, Eye, Tag, BarChart2, FileText, PieChart, Edit2, Calendar, Target, Clock, Activity, EyeOff } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { ar } from 'date-fns/locale'
import VoiceInput from '../components/VoiceInput'
import PriceHint from '../components/PriceHint'

const DEFAULT_EXPENSE_CATS = ['مواد بناء', 'عمالة', 'معدات', 'كهرباء وسباكة', 'تشطيب', 'أخرى']
const DEFAULT_INCOME_CATS = ['دفعة مقدمة', 'دفعة أولى', 'دفعة ثانية', 'دفعة نهائية', 'أخرى']
const COLORS = ['#c9a96e','#34c759','#ff3b30','#007aff','#ff9500','#af52de','#5ac8fa','#ff2d55']

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

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all'|'INCOME'|'EXPENSE'>('all')
  const [activeView, setActiveView] = useState<'list'|'charts'|'categories'|'kpis'>('list')
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  // Form
  const [form, setForm] = useState({ type:'EXPENSE' as 'INCOME'|'EXPENSE', title:'', amount:'', category:'', date:format(new Date(),'yyyy-MM-dd'), notes:'', quantity:'', unit_price:'' })
  const [receipt, setReceipt] = useState<File|null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Category form
  const [catForm, setCatForm] = useState({ name:'', type:'EXPENSE' as 'INCOME'|'EXPENSE', color:COLORS[0] })
  const [savingCat, setSavingCat] = useState(false)

  // KPI settings
  const [showKpiForm, setShowKpiForm] = useState(false)
  const [kpiForm, setKpiForm] = useState({ start_date:'', end_date:'', budget:'', show_kpis: true })
  const [savingKpi, setSavingKpi] = useState(false)
  const [currency, setCurrency] = useState<string>('ر.س')

  useEffect(() => { fetchAll() }, [id])

  const fetchAll = async () => {
    setLoading(true)
    const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single()
    setProject(proj)
    const { data: { user } } = await supabase.auth.getUser()
    setIsOwner(user?.id === proj?.user_id)
    if (proj) {
      setKpiForm({
        start_date: (proj as any).start_date || '',
        end_date: (proj as any).end_date || '',
        budget: (proj as any).budget || '',
        show_kpis: (proj as any).show_kpis !== false
      })
    }
    const { data: txns } = await supabase.from('transactions').select('*').eq('project_id', id).order('date', { ascending: false })
    setTransactions(txns || [])
    if (user) { const { data: cats } = await supabase.from('categories').select('*').eq('user_id', user.id); setCategories(cats || []) }
    setLoading(false)
  }

  const handleShare = async () => {
    if (!project) return
    await navigator.clipboard.writeText(`${window.location.origin}/share/${project.share_token}`)
    setShareMsg('تم نسخ الرابط!'); setTimeout(() => setShareMsg(''), 2000)
  }

  const approvedTxns = transactions.filter(t => !(t as any).status || (t as any).status === 'approved')
  const filtered = approvedTxns.filter(t => {
    if (activeTab !== 'all' && t.type !== activeTab) return false
    if (filterCat && t.category !== filterCat) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.category?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const income = approvedTxns.filter(t => t.type==='INCOME').reduce((s,t) => s+t.amount, 0)
  const expense = approvedTxns.filter(t => t.type==='EXPENSE').reduce((s,t) => s+t.amount, 0)
  const balance = income - expense
  const fmt = (n: number) => `${n.toLocaleString('ar-SA')} ${currency}`

  const CURRENCIES = [
    { label: 'ريال سعودي', symbol: 'ر.س' },
    { label: 'دولار أمريكي', symbol: '$' },
    { label: 'يورو', symbol: '€' },
    { label: 'جنيه مصري', symbol: 'ج.م' },
    { label: 'جنيه سوداني', symbol: 'ج.س' },
    { label: 'درهم إماراتي', symbol: 'د.إ' },
    { label: 'دينار كويتي', symbol: 'د.ك' },
    { label: 'ريال قطري', symbol: 'ر.ق' },
    { label: 'جنيه استرليني', symbol: '£' },
  ]

  const byCat = (type: 'INCOME'|'EXPENSE') => Object.entries(
    approvedTxns.filter(t => t.type===type).reduce((acc,t) => { const k=t.category||'أخرى'; acc[k]=(acc[k]||0)+t.amount; return acc }, {} as Record<string,number>)
  ).sort((a,b) => b[1]-a[1]).map(([label,value],i) => ({ label, value, color: COLORS[i%COLORS.length] }))

  // KPI calculations
  const kpiData = () => {
    const p = project as any
    if (!p?.start_date || !p?.end_date || !p?.budget) return null
    const start = new Date(p.start_date)
    const end = new Date(p.end_date)
    const today = new Date()
    const totalDays = differenceInDays(end, start)
    const elapsedDays = Math.max(0, differenceInDays(today, start))
    const remainingDays = Math.max(0, differenceInDays(end, today))
    const budget = parseFloat(p.budget)
    const budgetUsed = expense
    const budgetPct = Math.min(100, (budgetUsed / budget) * 100)
    const timePct = Math.min(100, (elapsedDays / totalDays) * 100)
    const dailyRate = elapsedDays > 0 ? expense / elapsedDays : 0
    const expectedExpense = dailyRate * totalDays
    const isOnTrack = budgetPct <= timePct + 10
    return { totalDays, elapsedDays, remainingDays, budget, budgetUsed, budgetPct, timePct, dailyRate, expectedExpense, isOnTrack, start, end }
  }

  const saveTransaction = async () => {
    if (!form.title || !form.amount || !form.date) return
    setSaving(true)
    let receipt_url = editingTx?.receipt_url
    if (receipt) {
      setUploading(true)
      const path = `${id}/${Date.now()}.${receipt.name.split('.').pop()}`
      const { error } = await supabase.storage.from('receipts').upload(path, receipt)
      if (!error) { const { data } = supabase.storage.from('receipts').getPublicUrl(path); receipt_url = data.publicUrl }
      setUploading(false)
    }
    const amount = form.quantity && form.unit_price ? parseFloat(form.quantity)*parseFloat(form.unit_price) : parseFloat(form.amount)

    if (editingTx) {
      await supabase.from('transactions').update({ type:form.type, title:form.title, amount, category:form.category, date:form.date, notes:form.notes||null, quantity:form.quantity?parseFloat(form.quantity):null, unit_price:form.unit_price?parseFloat(form.unit_price):null, receipt_url }).eq('id', editingTx.id)
      setEditingTx(null)
    } else {
      await supabase.from('transactions').insert({ project_id:id, type:form.type, title:form.title, amount, category:form.category, date:form.date, notes:form.notes||null, quantity:form.quantity?parseFloat(form.quantity):null, unit_price:form.unit_price?parseFloat(form.unit_price):null, receipt_url })
    }
    setForm({ type:'EXPENSE', title:'', amount:'', category:'', date:format(new Date(),'yyyy-MM-dd'), notes:'', quantity:'', unit_price:'' })
    setReceipt(null); setShowForm(false); setSaving(false); fetchAll()
  }

  const startEdit = (t: Transaction) => {
    setEditingTx(t)
    setForm({ type:t.type, title:t.title, amount:String(t.amount), category:t.category||'', date:t.date, notes:t.notes||'', quantity:t.quantity?String(t.quantity):'', unit_price:t.unit_price?String(t.unit_price):'' })
    setShowForm(true)
  }

  const saveKpi = async () => {
    if (!id) return
    setSavingKpi(true)
    await supabase.from('projects').update({
      start_date: kpiForm.start_date || null,
      end_date: kpiForm.end_date || null,
      budget: kpiForm.budget ? parseFloat(kpiForm.budget) : null,
      show_kpis: kpiForm.show_kpis
    }).eq('id', id)
    setSavingKpi(false); setShowKpiForm(false); fetchAll()
  }

  const saveCategory = async () => {
    if (!catForm.name.trim()) return
    setSavingCat(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('categories').insert({ name:catForm.name.trim(), type:catForm.type, color:catForm.color, user_id:user?.id })
    setCatForm({ name:'', type:'EXPENSE', color:COLORS[0] }); setSavingCat(false); fetchAll()
  }

  const deleteCategory = async (catId: string) => {
    if (!confirm('حذف هذه الفئة؟')) return
    await supabase.from('categories').delete().eq('id', catId); fetchAll()
  }

  const deleteTransaction = async (txId: string) => {
    if (!confirm('حذف هذه المعاملة؟')) return
    setTransactions(prev => prev.filter(t => t.id !== txId))
    await supabase.from('transactions').delete().eq('id', txId)
  }

  const generatePDF = () => {
    if (!project) return
    setGeneratingPDF(true)
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet"><style>*{font-family:Tajawal,Arial,sans-serif;direction:rtl}body{margin:0;padding:32px;background:#fff;color:#111}h1{font-size:28px;font-weight:900;margin-bottom:4px}.sub{color:#888;font-size:14px;margin-bottom:32px}.stats{display:flex;gap:16px;margin-bottom:32px}.stat{flex:1;padding:16px;border-radius:12px;border:1px solid #eee}.label{font-size:12px;color:#888;margin-bottom:4px}.val{font-size:22px;font-weight:900}.green{color:#16a34a}.red{color:#dc2626}.gold{color:#b45309}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f5f5f5;padding:10px 12px;text-align:right;font-weight:700;border-bottom:2px solid #eee}td{padding:10px 12px;border-bottom:1px solid #f0f0f0}tr:nth-child(even) td{background:#fafafa}.badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700}.inc{background:#dcfce7;color:#16a34a}.exp{background:#fee2e2;color:#dc2626}.footer{margin-top:32px;text-align:center;color:#bbb;font-size:12px}</style></head><body><h1>تقرير: ${project.name}</h1><div class="sub">تاريخ التقرير: ${format(new Date(),'d MMMM yyyy',{locale:ar})}</div><div class="stats"><div class="stat"><div class="label">إجمالي المدفوعات</div><div class="val green">${fmt(income)} ريال</div></div><div class="stat"><div class="label">إجمالي المصاريف</div><div class="val red">${fmt(expense)} ريال</div></div><div class="stat"><div class="label">الرصيد</div><div class="val gold">${fmt(balance)} ريال</div></div></div><table><thead><tr><th>التاريخ</th><th>البيان</th><th>الفئة</th><th>النوع</th><th>المبلغ</th></tr></thead><tbody>${approvedTxns.map(t=>`<tr><td>${format(new Date(t.date),'d/M/yyyy')}</td><td>${t.title}</td><td>${t.category||'-'}</td><td><span class="badge ${t.type==='INCOME'?'inc':'exp'}">${t.type==='INCOME'?'المدفوع':'مصروف'}</span></td><td style="font-weight:700;color:${t.type==='INCOME'?'#16a34a':'#dc2626'}">${t.type==='INCOME'?'+':'-'}${fmt(t.amount)}</td></tr>`).join('')}</tbody></table><div class="footer">بنيان · ${approvedTxns.length} معاملة</div></body></html>`
    const blob = new Blob([html], { type:'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`تقرير_${project.name}_${format(new Date(),'yyyy-MM-dd')}.html`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    setGeneratingPDF(false)
  }

  const allCats = form.type==='EXPENSE' ? [...DEFAULT_EXPENSE_CATS, ...categories.filter(c=>c.type==='EXPENSE').map(c=>c.name)] : [...DEFAULT_INCOME_CATS, ...categories.filter(c=>c.type==='INCOME').map(c=>c.name)]
  const uniqueCats = [...new Set(approvedTxns.map(t=>t.category).filter(Boolean))]
  const kpi = kpiData()

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'#0f1117'}}><div className="w-8 h-8 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"/></div>
  if (!project) return <div className="min-h-screen flex items-center justify-center" style={{background:'#0f1117'}}><p className="opacity-40">المشروع غير موجود</p></div>

  return (
    <div className="min-h-screen" style={{background:'#0f1117'}}>
      <header className="sticky top-0 z-50" style={{background:'rgba(15,17,23,0.9)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(201,169,110,0.1)'}}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"><ArrowRight size={18} className="opacity-60"/></button>
            <h1 className="font-black text-lg">{project.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="btn-ghost !py-2 !px-3 text-xs" style={{background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'inherit', cursor:'pointer'}}>
              {CURRENCIES.map(c => <option key={c.symbol} value={c.symbol}>{c.symbol} — {c.label}</option>)}
            </select>
            <button onClick={generatePDF} disabled={generatingPDF} className="btn-ghost !py-2 !px-3 flex items-center gap-1.5 text-xs disabled:opacity-40"><FileText size={14}/>{generatingPDF?'جاري...':'تقرير'}</button>
            <button onClick={() => navigate(`/share/${project.share_token}`)} className="btn-ghost !py-2 !px-3 flex items-center gap-1.5 text-xs"><Eye size={14}/>معاينة</button>
            <button onClick={handleShare} className="btn-ghost !py-2 !px-3 flex items-center gap-1.5 text-xs"><Share2 size={14}/>{shareMsg||'مشاركة'}</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 fade-in">
          <div className="card !p-4 text-center"><TrendingUp size={18} className="mx-auto mb-2" style={{color:'#34c759'}}/><p className="text-xs opacity-40 mb-1">المدفوعات</p><p className="font-black text-lg" style={{color:'#34c759'}}>{fmt(income)}</p></div>
          <div className="card !p-4 text-center"><TrendingDown size={18} className="mx-auto mb-2" style={{color:'#ff3b30'}}/><p className="text-xs opacity-40 mb-1">مصاريف</p><p className="font-black text-lg" style={{color:'#ff3b30'}}>{fmt(expense)}</p></div>
          <div className="card !p-4 text-center"><Wallet size={18} className="mx-auto mb-2" style={{color:'#c9a96e'}}/><p className="text-xs opacity-40 mb-1">الرصيد</p><p className="font-black text-lg" style={{color:balance>=0?'#c9a96e':'#ff3b30'}}>{balance>=0?'+':''}{fmt(balance)}</p></div>
        </div>

        {/* Warning: expense > income */}
        {expense > income && income > 0 && (
          <div className="fade-in flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.25)' }}>
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold text-sm" style={{ color: '#ff3b30' }}>
                تنبيه: المصاريف تجاوزت المدفوعات
              </p>
              <p className="text-xs opacity-60 mt-1">
                المصاريف أعلى من المدفوعات بمقدار {fmt(expense - income)} ريال — يُنصح بمراجعة المالك لإجراء الدفعات اللازمة.
              </p>
            </div>
          </div>
        )}

        {/* View tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit flex-wrap" style={{background:'rgba(255,255,255,0.04)'}}>
          {([
            {key:'list',label:'السجل',Icon:Wallet},
            {key:'kpis',label:'KPIs',Icon:Activity},
            {key:'charts',label:'التقارير',Icon:BarChart2},
            {key:'categories',label:'الفئات',Icon:Tag}
          ] as const).map(({key,label,Icon}) => (
            <button key={key} onClick={() => setActiveView(key as any)} className="px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5"
              style={activeView===key?{background:'linear-gradient(135deg,#c9a96e,#a07d54)',color:'#0f1117'}:{color:'rgba(245,240,232,0.4)'}}>
              <Icon size={13}/>{label}
            </button>
          ))}
        </div>

        {/* Pending approvals */}
        {isOwner && transactions.filter(t => (t as any).status === 'pending').length > 0 && (
          <div className="card fade-in" style={{borderColor:'rgba(201,169,110,0.3)'}}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"/>
              <span className="font-bold text-sm" style={{color:'#c9a96e'}}>طلبات تحتاج موافقة ({transactions.filter(t => (t as any).status === 'pending').length})</span>
            </div>
            <div className="space-y-3">
              {transactions.filter(t => (t as any).status === 'pending').map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{background:'rgba(255,255,255,0.04)'}}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{t.title}</p>
                    <p className="text-xs opacity-40 mt-0.5">{t.category} · {t.date}</p>
                    {(t as any).receipt_url && <a href={(t as any).receipt_url} target="_blank" rel="noreferrer" className="text-xs opacity-40 hover:opacity-70 flex items-center gap-1 mt-1"><Image size={10}/>عرض الإيصال</a>}
                  </div>
                  <p className="font-black text-green-400">+{fmt(t.amount)}</p>
                  <div className="flex gap-2">
                    <button onClick={async () => { await supabase.from('transactions').update({status:'approved'}).eq('id', t.id); fetchAll() }} className="w-8 h-8 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-400/20 transition-colors text-lg">✓</button>
                    <button onClick={async () => { await supabase.from('transactions').update({status:'rejected'}).eq('id', t.id); fetchAll() }} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-400/20 transition-colors text-lg">✗</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== LIST VIEW ===== */}
        {activeView==='list' && <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-40"><Search size={14} className="absolute top-1/2 -translate-y-1/2 left-4 opacity-30"/><input value={search} onChange={e=>setSearch(e.target.value)} className="input-field pl-10 !py-2.5 text-sm" placeholder="بحث..."/></div>
            {uniqueCats.length>0 && <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} className="input-field !py-2.5 text-sm w-auto"><option value="">كل الفئات</option>{uniqueCats.map(c=><option key={c} value={c!}>{c}</option>)}</select>}
            <div className="flex gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.04)'}}>
              {(['all','INCOME','EXPENSE'] as const).map(tab=><button key={tab} onClick={()=>setActiveTab(tab)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={activeTab===tab?{background:'linear-gradient(135deg,#c9a96e,#a07d54)',color:'#0f1117'}:{color:'rgba(245,240,232,0.4)'}}>{tab==='all'?'الكل':tab==='INCOME'?'المدفوعات':'مصاريف'}</button>)}
            </div>
            {isOwner && <button onClick={()=>{setEditingTx(null);setForm({type:'EXPENSE',title:'',amount:'',category:'',date:format(new Date(),'yyyy-MM-dd'),notes:'',quantity:'',unit_price:''});setShowForm(true)}} className="btn-primary flex items-center gap-2 !py-2.5"><Plus size={16}/>إضافة</button>}
          </div>
          <div className="space-y-2">
            {filtered.length===0 ? <div className="text-center py-16 opacity-30"><Wallet size={36} className="mx-auto mb-3 opacity-50"/><p>لا توجد معاملات</p></div>
            : filtered.map((t,i) => (
              <div key={t.id} className="card !p-4 flex items-center gap-4 group fade-in hover:border-white/10 transition-all" style={{animationDelay:`${i*0.03}s`}}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type==='INCOME'?'income-badge':'expense-badge'}`}>{t.type==='INCOME'?<TrendingUp size={16}/>:<TrendingDown size={16}/>}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5"><p className="font-semibold truncate">{t.title}</p>{t.category&&<span className="text-xs opacity-40 bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">{t.category}</span>}</div>
                  <div className="flex items-center gap-3 text-xs opacity-40"><span>{format(new Date(t.date),'d MMM yyyy',{locale:ar})}</span>{t.quantity&&<span>{t.quantity} × {t.unit_price?.toLocaleString('ar-SA')}</span>}{t.notes&&<span className="truncate">{t.notes}</span>}</div>
                </div>
                <div className="flex items-center gap-2">
                  {t.receipt_url&&<a href={t.receipt_url} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-40 hover:!opacity-70 transition-opacity"><Image size={16}/></a>}
                  <p className={`font-black text-lg ${t.type==='INCOME'?'text-green-400':'text-red-400'}`}>{t.type==='INCOME'?'+':'-'}{fmt(t.amount)}</p>
                  {isOwner && <>
                    <button onClick={()=>startEdit(t)} className="opacity-0 group-hover:opacity-40 hover:!opacity-70 transition-opacity text-blue-400"><Edit2 size={14}/></button>
                    <button onClick={()=>deleteTransaction(t.id)} className="opacity-0 group-hover:opacity-30 hover:!opacity-70 transition-opacity text-red-400"><Trash2 size={14}/></button>
                  </>}
                </div>
              </div>
            ))}
          </div>
        </>}

        {/* ===== KPIs VIEW ===== */}
        {activeView==='kpis' && <div className="fade-in space-y-4">
          {isOwner && (
            <div className="flex justify-between items-center">
              <h3 className="font-bold opacity-60">مؤشرات الأداء</h3>
              <div className="flex gap-2">
                <button onClick={async () => {
                  await supabase.from('projects').update({ show_kpis: !(project as any).show_kpis }).eq('id', id!)
                  fetchAll()
                }} className="btn-ghost !py-2 !px-3 flex items-center gap-1.5 text-xs">
                  {(project as any).show_kpis ? <><EyeOff size={13}/>إخفاء عن الزوار</> : <><Eye size={13}/>إظهار للزوار</>}
                </button>
                <button onClick={()=>setShowKpiForm(!showKpiForm)} className="btn-ghost !py-2 !px-3 flex items-center gap-1.5 text-xs">
                  <Edit2 size={13}/>إعداد KPIs
                </button>
              </div>
            </div>
          )}

          {isOwner && showKpiForm && (
            <div className="card fade-in">
              <h3 className="font-bold mb-4">إعدادات المشروع</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs opacity-50 mb-2 block">تاريخ البداية</label><input type="date" value={kpiForm.start_date} onChange={e=>setKpiForm(f=>({...f,start_date:e.target.value}))} className="input-field"/></div>
                <div><label className="text-xs opacity-50 mb-2 block">تاريخ النهاية المتوقعة</label><input type="date" value={kpiForm.end_date} onChange={e=>setKpiForm(f=>({...f,end_date:e.target.value}))} className="input-field"/></div>
                <div className="col-span-2"><label className="text-xs opacity-50 mb-2 block">الميزانية الكلية (ريال)</label><input type="number" value={kpiForm.budget} onChange={e=>setKpiForm(f=>({...f,budget:e.target.value}))} className="input-field" placeholder="0"/></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={()=>setShowKpiForm(false)} className="btn-ghost flex-1">إلغاء</button>
                <button onClick={saveKpi} disabled={savingKpi} className="btn-primary flex-1 disabled:opacity-40">
                  {savingKpi?'جاري...':'حفظ'}
                </button>
              </div>
            </div>
          )}

          {!kpi ? (
            <div className="card text-center py-12 opacity-40">
              <Activity size={36} className="mx-auto mb-3 opacity-50"/>
              <p>لم يتم إعداد KPIs بعد</p>
              {isOwner && <p className="text-sm mt-2">اضغط "إعداد KPIs" لإضافة تواريخ وميزانية المشروع</p>}
            </div>
          ) : (
            <div className="space-y-3">

              {/* Status bar */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{
                background: kpi.isOnTrack ? 'rgba(52,199,89,0.08)' : 'rgba(255,59,48,0.08)',
                border: `1px solid ${kpi.isOnTrack ? 'rgba(52,199,89,0.25)' : 'rgba(255,59,48,0.25)'}`
              }}>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse" style={{background: kpi.isOnTrack ? '#34c759' : '#ff3b30'}}/>
                <p className="font-bold text-sm flex-1">{kpi.isOnTrack ? 'المشروع في المسار الصحيح' : 'المشروع يحتاج مراجعة'}</p>
                <span className="text-xs opacity-50">{format(kpi.start,'d MMM',{locale:ar})} ← {format(kpi.end,'d MMM yyyy',{locale:ar})}</span>
              </div>

              {/* Time cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card !p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={14} style={{color:'#34c759'}}/>
                    <span className="text-xs opacity-40">أيام متبقية</span>
                  </div>
                  <p className="font-black text-2xl" style={{color: kpi.remainingDays < 14 ? '#ff3b30' : '#34c759'}}>{kpi.remainingDays}</p>
                  <p className="text-xs opacity-30 mt-1">يوم</p>
                </div>
                <div className="card !p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={14} style={{color:'#c9a96e'}}/>
                    <span className="text-xs opacity-40">أيام منقضية</span>
                  </div>
                  <p className="font-black text-2xl" style={{color:'#c9a96e'}}>{kpi.elapsedDays}</p>
                  <p className="text-xs opacity-30 mt-1">من {kpi.totalDays} يوم</p>
                </div>
                <div className="card !p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={14} style={{color:'#007aff'}}/>
                    <span className="text-xs opacity-40">معدل يومي</span>
                  </div>
                  <p className="font-black text-xl" style={{color:'#007aff'}}>{Math.round(kpi.dailyRate).toLocaleString('ar-SA')}</p>
                  <p className="text-xs opacity-30 mt-1">{currency}/يوم</p>
                </div>
              </div>

              {/* Time progress */}
              <div className="card !p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs opacity-50 flex items-center gap-1.5"><Calendar size={12}/>تقدم الوقت</span>
                  <span className="text-sm font-bold">{kpi.timePct.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                  <div className="h-full rounded-full transition-all" style={{width:`${kpi.timePct}%`, background:'#007aff'}}/>
                </div>
                <div className="flex justify-between text-xs opacity-30 mt-2">
                  <span>{format(kpi.start,'d MMM yyyy',{locale:ar})}</span>
                  <span>{format(kpi.end,'d MMM yyyy',{locale:ar})}</span>
                </div>
              </div>

              {/* Budget progress */}
              <div className="card !p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs opacity-50 flex items-center gap-1.5"><Wallet size={12}/>استهلاك الميزانية</span>
                  <span className="text-sm font-bold" style={{color: kpi.budgetPct > 90 ? '#ff3b30' : kpi.budgetPct > 70 ? '#ff9500' : '#34c759'}}>{kpi.budgetPct.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                  <div className="h-full rounded-full transition-all" style={{
                    width:`${kpi.budgetPct}%`,
                    background: kpi.budgetPct > 90 ? '#ff3b30' : kpi.budgetPct > 70 ? '#ff9500' : '#34c759'
                  }}/>
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="opacity-40">مصروف: <span className="text-red-400 font-semibold">{fmt(kpi.budgetUsed)}</span></span>
                  <span className="opacity-40">الميزانية: <span style={{color:'#c9a96e'}} className="font-semibold">{fmt(kpi.budget)}</span></span>
                </div>
              </div>

              {/* Bottom row: expected cost + remaining */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card !p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={14} style={{color: kpi.expectedExpense > kpi.budget ? '#ff3b30' : '#34c759'}}/>
                    <span className="text-xs opacity-40">التكلفة المتوقعة</span>
                  </div>
                  <p className="font-black text-lg" style={{color: kpi.expectedExpense > kpi.budget ? '#ff3b30' : '#34c759'}}>
                    {Math.round(kpi.expectedExpense).toLocaleString('ar-SA')}
                  </p>
                  <p className="text-xs opacity-30 mt-1">{currency}</p>
                </div>
                <div className="card !p-4" style={{borderColor: kpi.budget - kpi.budgetUsed < 0 ? 'rgba(255,59,48,0.3)' : 'rgba(52,199,89,0.2)'}}>
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet size={14} style={{color: kpi.budget - kpi.budgetUsed < 0 ? '#ff3b30' : '#34c759'}}/>
                    <span className="text-xs opacity-40">المتبقي من الميزانية</span>
                  </div>
                  <p className="font-black text-lg" style={{color: kpi.budget - kpi.budgetUsed < 0 ? '#ff3b30' : '#34c759'}}>
                    {kpi.budget - kpi.budgetUsed < 0 ? '-' : '+'}{Math.abs(kpi.budget - kpi.budgetUsed).toLocaleString('ar-SA')}
                  </p>
                  <p className="text-xs opacity-30 mt-1">{currency}</p>
                </div>
              </div>

            </div>
          )}
        </div>}

        {/* ===== CHARTS VIEW ===== */}
        {activeView==='charts' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 fade-in">
          <div className="card"><h3 className="font-bold mb-4 flex items-center gap-2"><PieChart size={16} style={{color:'#ff3b30'}}/>توزيع المصاريف</h3><PieChartSVG data={byCat('EXPENSE')}/><div className="mt-4 space-y-1">{byCat('EXPENSE').slice(0,5).map((d,i)=><div key={i} className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:d.color}}/><span className="flex-1 opacity-60 truncate">{d.label}</span><span className="font-semibold">{fmt(d.value)}</span></div>)}</div></div>
          <div className="card"><h3 className="font-bold mb-4 flex items-center gap-2"><PieChart size={16} style={{color:'#34c759'}}/>توزيع المدفوعات</h3><PieChartSVG data={byCat('INCOME')}/><div className="mt-4 space-y-1">{byCat('INCOME').slice(0,5).map((d,i)=><div key={i} className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:d.color}}/><span className="flex-1 opacity-60 truncate">{d.label}</span><span className="font-semibold">{fmt(d.value)}</span></div>)}</div></div>
          <div className="card md:col-span-2"><h3 className="font-bold mb-6 flex items-center gap-2"><BarChart2 size={16} style={{color:'#c9a96e'}}/>أكبر بنود المصاريف</h3><BarChart data={byCat('EXPENSE').slice(0,6)}/></div>
        </div>}

        {/* ===== CATEGORIES VIEW ===== */}
        {activeView==='categories' && <div className="fade-in space-y-4">
          {isOwner && <div className="card"><h3 className="font-bold mb-4 flex items-center gap-2"><Plus size={16} style={{color:'#c9a96e'}}/>إضافة فئة جديدة</h3>
            <div className="flex gap-3 flex-wrap items-center">
              <input value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))} className="input-field flex-1 min-w-32" placeholder="اسم الفئة"/>
              <select value={catForm.type} onChange={e=>setCatForm(f=>({...f,type:e.target.value as any}))} className="input-field w-auto"><option value="EXPENSE">مصروف</option><option value="INCOME">مدفوع</option></select>
              <div className="flex gap-1">{COLORS.map(c=><button key={c} onClick={()=>setCatForm(f=>({...f,color:c}))} className="w-7 h-7 rounded-full hover:scale-110 transition-transform" style={{background:c,outline:catForm.color===c?'2px solid white':'none',outlineOffset:'2px'}}/>)}</div>
              <button onClick={saveCategory} disabled={!catForm.name.trim()||savingCat} className="btn-primary flex items-center gap-2 disabled:opacity-40"><Check size={16}/>{savingCat?'جاري...':'إضافة'}</button>
            </div>
          </div>}
          <div className="card"><h3 className="font-bold mb-4 text-red-400">فئات المصاريف</h3><div className="flex flex-wrap gap-2">
            {DEFAULT_EXPENSE_CATS.map(c=><span key={c} className="px-3 py-1.5 rounded-full text-sm" style={{background:'rgba(255,59,48,0.1)',color:'#ff3b30',border:'1px solid rgba(255,59,48,0.2)'}}>{c}</span>)}
            {categories.filter(c=>c.type==='EXPENSE').map(c=><div key={c.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm group" style={{background:`${c.color}22`,color:c.color,border:`1px solid ${c.color}44`}}>{c.name}{isOwner&&<button onClick={()=>deleteCategory(c.id)} className="opacity-0 group-hover:opacity-70 transition-opacity mr-1"><X size={12}/></button>}</div>)}
          </div></div>
          <div className="card"><h3 className="font-bold mb-4 text-green-400">فئات المدفوعات</h3><div className="flex flex-wrap gap-2">
            {DEFAULT_INCOME_CATS.map(c=><span key={c} className="px-3 py-1.5 rounded-full text-sm" style={{background:'rgba(52,199,89,0.1)',color:'#34c759',border:'1px solid rgba(52,199,89,0.2)'}}>{c}</span>)}
            {categories.filter(c=>c.type==='INCOME').map(c=><div key={c.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm group" style={{background:`${c.color}22`,color:c.color,border:`1px solid ${c.color}44`}}>{c.name}{isOwner&&<button onClick={()=>deleteCategory(c.id)} className="opacity-0 group-hover:opacity-70 transition-opacity mr-1"><X size={12}/></button>}</div>)}
          </div></div>
        </div>}
      </main>

      {/* Add/Edit Transaction Modal */}
      {showForm && <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{background:'rgba(0,0,0,0.8)',backdropFilter:'blur(4px)'}} onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
        <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto fade-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-lg">{editingTx ? 'تعديل المعاملة' : 'إضافة معاملة'}</h3>
            <button onClick={()=>{setShowForm(false);setEditingTx(null)}} className="opacity-40 hover:opacity-70"><X size={20}/></button>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.04)'}}>
              {(['EXPENSE','INCOME'] as const).map(t=><button key={t} onClick={()=>setForm(f=>({...f,type:t,category:''}))} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all" style={form.type===t?{background:t==='INCOME'?'rgba(52,199,89,0.2)':'rgba(255,59,48,0.2)',color:t==='INCOME'?'#34c759':'#ff3b30',border:`1px solid ${t==='INCOME'?'rgba(52,199,89,0.4)':'rgba(255,59,48,0.4)'}`}:{color:'rgba(245,240,232,0.4)'}}>{t==='INCOME'?'+ المدفوع':'- مصروف'}</button>)}
            </div>
            {!editingTx && <VoiceInput
              categories={allCats}
              onResult={tx => setForm(f => ({
                ...f,
                type: tx.type || f.type,
                title: tx.title ?? f.title,
                amount: tx.amount ? String(tx.amount) : f.amount,
                quantity: tx.quantity ? String(tx.quantity) : f.quantity,
                unit_price: tx.unit_price ? String(tx.unit_price) : f.unit_price,
                category: tx.category && allCats.includes(tx.category) ? tx.category : f.category,
              }))}
            />}
            <div><label className="text-xs opacity-50 mb-2 block">البيان *</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="input-field" placeholder="مثال: شراء أسمنت" autoFocus/></div>
            <div className="grid grid-cols-2 gap-3">
              {form.type==='EXPENSE' && <div><label className="text-xs opacity-50 mb-2 block">الكمية</label><input type="number" value={form.quantity} onChange={e=>{const q=e.target.value;const amt=q&&form.unit_price?String(parseFloat(q)*parseFloat(form.unit_price)):form.amount;setForm(f=>({...f,quantity:q,amount:amt}))}} className="input-field" placeholder="0"/></div>}
              {form.type==='EXPENSE' && <div><label className="text-xs opacity-50 mb-2 block">سعر الوحدة</label><input type="number" value={form.unit_price} onChange={e=>{const p=e.target.value;const amt=form.quantity&&p?String(parseFloat(form.quantity)*parseFloat(p)):form.amount;setForm(f=>({...f,unit_price:p,amount:amt}))}} className="input-field" placeholder="0"/></div>}
            </div>
            <div><label className="text-xs opacity-50 mb-2 block">المبلغ الإجمالي (ريال) *</label><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} className="input-field" placeholder="0"/>
              {form.type==='EXPENSE' && <PriceHint description={form.title} amount={parseFloat(form.amount)||0} quantity={form.quantity?parseFloat(form.quantity):undefined}/>}
            </div>
            <div><label className="text-xs opacity-50 mb-2 block">الفئة</label><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="input-field"><option value="">اختر فئة</option>{allCats.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="text-xs opacity-50 mb-2 block">التاريخ *</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className="input-field"/></div>
            <div><label className="text-xs opacity-50 mb-2 block">ملاحظات</label><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="input-field resize-none" rows={2} placeholder="اختياري..."/></div>
            <div><label className="text-xs opacity-50 mb-2 block">إيصال / صورة</label><input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e=>setReceipt(e.target.files?.[0]||null)}/><button onClick={()=>fileRef.current?.click()} className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"><Upload size={16}/>{receipt?receipt.name:editingTx?.receipt_url?'تغيير الإيصال':'رفع ملف'}</button></div>
            <div className="flex gap-2 pt-2">
              <button onClick={()=>{setShowForm(false);setEditingTx(null)}} className="btn-ghost flex-1">إلغاء</button>
              <button onClick={saveTransaction} disabled={!form.title||!form.amount||!form.date||saving} className="btn-primary flex-1 disabled:opacity-40 flex items-center justify-center gap-2">
                {saving||uploading?<><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>{uploading?'رفع...':'حفظ...'}</>:<><Check size={16}/>{editingTx?'تحديث':'حفظ'}</>}
              </button>
            </div>
          </div>
        </div>
      </div>}
    </div>
  )
}
