import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, type Project, type Transaction } from '../lib/supabase'
import { Building2, TrendingUp, TrendingDown, Wallet, Image, Plus, X, Check, Upload, Clock, CheckCircle, XCircle, BarChart2, PieChart } from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

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

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
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
    const { data: txns } = await supabase.from('transactions').select('*').eq('project_id', proj.id).order('date', { ascending: false })
    setTransactions(txns || [])
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

  return (
    <div className="min-h-screen" style={{background:'#0f1117'}}>
      <header style={{background:'rgba(15,17,23,0.9)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(201,169,110,0.1)'}}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#c9a96e22,#c9a96e44)'}}>
              <Building2 size={18} style={{color:'#c9a96e'}}/>
            </div>
            <div>
              <span className="font-black" style={{color:'#c9a96e'}}>بنيان</span>
              <span className="text-sm opacity-40 mx-2">·</span>
              <span className="font-semibold">{project.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-30 bg-white/5 px-3 py-1 rounded-full">عرض مشترك</span>
            <button onClick={() => setShowForm(true)} className="btn-primary !py-2 !px-3 flex items-center gap-1.5 text-sm">
              <Plus size={14}/>إضافة إيراد
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Success message */}
        {successMsg && (
          <div className="fade-in text-sm text-green-400 bg-green-400/10 rounded-xl p-4 text-center border border-green-400/20">
            {successMsg}
          </div>
        )}

        {/* Pending notifications */}
        {pendingTxns.length > 0 && (
          <div className="card !p-4 border-yellow-600/30" style={{borderColor:'rgba(201,169,110,0.3)'}}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} style={{color:'#c9a96e'}}/>
              <span className="text-sm font-semibold" style={{color:'#c9a96e'}}>بانتظار موافقة المقاول ({pendingTxns.length})</span>
            </div>
            <div className="space-y-2">
              {pendingTxns.map(t => (
                <div key={t.id} className="flex items-center justify-between text-sm opacity-60">
                  <span>{t.title}</span>
                  <span className="font-semibold text-green-400">+{fmt(t.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 fade-in">
          <div className="card !p-4 text-center"><TrendingUp size={18} className="mx-auto mb-2" style={{color:'#34c759'}}/><p className="text-xs opacity-40 mb-1">إيرادات</p><p className="font-black text-lg" style={{color:'#34c759'}}>{fmt(income)}</p></div>
          <div className="card !p-4 text-center"><TrendingDown size={18} className="mx-auto mb-2" style={{color:'#ff3b30'}}/><p className="text-xs opacity-40 mb-1">مصاريف</p><p className="font-black text-lg" style={{color:'#ff3b30'}}>{fmt(expense)}</p></div>
          <div className="card !p-4 text-center"><Wallet size={18} className="mx-auto mb-2" style={{color:'#c9a96e'}}/><p className="text-xs opacity-40 mb-1">الرصيد</p><p className="font-black text-lg" style={{color:balance>=0?'#c9a96e':'#ff3b30'}}>{balance>=0?'+':''}{fmt(balance)}</p></div>
        </div>

        {/* View tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{background:'rgba(255,255,255,0.04)'}}>
          {([{key:'list',label:'السجل',Icon:Wallet},{key:'charts',label:'التقارير',Icon:BarChart2}] as const).map(({key,label,Icon}) => (
            <button key={key} onClick={() => setActiveView(key as any)} className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
              style={activeView===key?{background:'linear-gradient(135deg,#c9a96e,#a07d54)',color:'#0f1117'}:{color:'rgba(245,240,232,0.4)'}}>
              <Icon size={14}/>{label}
            </button>
          ))}
        </div>

        {/* LIST VIEW */}
        {activeView==='list' && <>
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{background:'rgba(255,255,255,0.04)'}}>
            {(['all','INCOME','EXPENSE'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={activeTab===tab?{background:'linear-gradient(135deg,#c9a96e,#a07d54)',color:'#0f1117'}:{color:'rgba(245,240,232,0.4)'}}>
                {tab==='all'?`الكل (${approvedTxns.length})`:tab==='INCOME'?`إيرادات (${approvedTxns.filter(t=>t.type==='INCOME').length})`:`مصاريف (${approvedTxns.filter(t=>t.type==='EXPENSE').length})`}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {filtered.map((t,i) => (
              <div key={t.id} className="card !p-4 flex items-center gap-4 fade-in" style={{animationDelay:`${i*0.03}s`}}>
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

        {/* CHARTS VIEW */}
        {activeView==='charts' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 fade-in">
          <div className="card"><h3 className="font-bold mb-4 flex items-center gap-2"><PieChart size={16} style={{color:'#ff3b30'}}/>توزيع المصاريف</h3><PieChartSVG data={byCat('EXPENSE')}/><div className="mt-4 space-y-1">{byCat('EXPENSE').slice(0,5).map((d,i)=><div key={i} className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{background:d.color}}/><span className="flex-1 opacity-60 truncate">{d.label}</span><span className="font-semibold">{fmt(d.value)}</span></div>)}</div></div>
          <div className="card"><h3 className="font-bold mb-4 flex items-center gap-2"><PieChart size={16} style={{color:'#34c759'}}/>توزيع الإيرادات</h3><PieChartSVG data={byCat('INCOME')}/><div className="mt-4 space-y-1">{byCat('INCOME').slice(0,5).map((d,i)=><div key={i} className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{background:d.color}}/><span className="flex-1 opacity-60 truncate">{d.label}</span><span className="font-semibold">{fmt(d.value)}</span></div>)}</div></div>
          <div className="card md:col-span-2"><h3 className="font-bold mb-6 flex items-center gap-2"><BarChart2 size={16} style={{color:'#c9a96e'}}/>أكبر بنود المصاريف</h3><BarChart data={byCat('EXPENSE').slice(0,6)}/></div>
        </div>}
      </main>

      <footer className="text-center py-8 opacity-20 text-xs">بنيان · نظام إدارة تكاليف البناء</footer>

      {/* Add Income Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{background:'rgba(0,0,0,0.8)',backdropFilter:'blur(4px)'}} onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="card w-full max-w-lg fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-lg">إضافة إيراد</h3>
                <p className="text-xs opacity-40 mt-0.5">سيتم إرساله للمقاول للموافقة</p>
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
