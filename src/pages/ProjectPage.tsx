import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, type Project, type Transaction, type Category } from '../lib/supabase'
import {
  ArrowRight, Plus, Share2, TrendingUp, TrendingDown, Wallet,
  Search, Filter, Trash2, Image, X, Check, Upload, Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

const DEFAULT_EXPENSE_CATS = ['مواد بناء', 'عمالة', 'معدات', 'كهرباء وسباكة', 'تشطيب', 'أخرى']
const DEFAULT_INCOME_CATS = ['دفعة مقدمة', 'دفعة أولى', 'دفعة ثانية', 'دفعة نهائية', 'أخرى']

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'INCOME' | 'EXPENSE'>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [isOwner, setIsOwner] = useState(false)

  // Form state
  const [form, setForm] = useState({
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    title: '', amount: '', category: '', date: format(new Date(), 'yyyy-MM-dd'),
    notes: '', quantity: '', unit_price: ''
  })
  const [receipt, setReceipt] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchAll()
  }, [id])

  const fetchAll = async () => {
    setLoading(true)
    const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single()
    setProject(proj)

    const { data: { user } } = await supabase.auth.getUser()
    setIsOwner(user?.id === proj?.user_id)

    const { data: txns } = await supabase.from('transactions')
      .select('*').eq('project_id', id).order('date', { ascending: false })
    setTransactions(txns || [])

    if (user) {
      const { data: cats } = await supabase.from('categories').select('*').eq('user_id', user.id)
      setCategories(cats || [])
    }
    setLoading(false)
  }

  const handleShare = async () => {
    if (!project) return
    const url = `${window.location.origin}/share/${project.share_token}`
    await navigator.clipboard.writeText(url)
    setShareMsg('تم نسخ الرابط!')
    setTimeout(() => setShareMsg(''), 2000)
  }

  const filtered = transactions.filter(t => {
    if (activeTab !== 'all' && t.type !== activeTab) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.category?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const balance = income - expense

  const saveTransaction = async () => {
    if (!form.title || !form.amount || !form.date) return
    setSaving(true)
    let receipt_url = undefined

    if (receipt) {
      setUploading(true)
      const ext = receipt.name.split('.').pop()
      const path = `${id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('receipts').upload(path, receipt)
      if (!error) {
        const { data } = supabase.storage.from('receipts').getPublicUrl(path)
        receipt_url = data.publicUrl
      }
      setUploading(false)
    }

    const amount = form.quantity && form.unit_price
      ? parseFloat(form.quantity) * parseFloat(form.unit_price)
      : parseFloat(form.amount)

    await supabase.from('transactions').insert({
      project_id: id, type: form.type, title: form.title,
      amount, category: form.category, date: form.date,
      notes: form.notes || null,
      quantity: form.quantity ? parseFloat(form.quantity) : null,
      unit_price: form.unit_price ? parseFloat(form.unit_price) : null,
      receipt_url
    })

    setForm({ type: 'EXPENSE', title: '', amount: '', category: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '', quantity: '', unit_price: '' })
    setReceipt(null)
    setShowForm(false)
    setSaving(false)
    fetchAll()
  }

  const deleteTransaction = async (txId: string) => {
    if (!confirm('حذف هذه المعاملة؟')) return
    await supabase.from('transactions').delete().eq('id', txId)
    setTransactions(prev => prev.filter(t => t.id !== txId))
  }

  const fmt = (n: number) => n.toLocaleString('ar-SA', { minimumFractionDigits: 0 })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
      <div className="text-center opacity-40">
        <div className="w-8 h-8 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">جاري التحميل...</p>
      </div>
    </div>
  )

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
      <p className="opacity-40">المشروع غير موجود</p>
    </div>
  )

  const cats = form.type === 'EXPENSE'
    ? [...DEFAULT_EXPENSE_CATS, ...categories.filter(c => c.type === 'EXPENSE').map(c => c.name)]
    : [...DEFAULT_INCOME_CATS, ...categories.filter(c => c.type === 'INCOME').map(c => c.name)]

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{
        background: 'rgba(15,17,23,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,169,110,0.1)'
      }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors">
              <ArrowRight size={18} className="opacity-60" />
            </button>
            <h1 className="font-black text-lg">{project.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/share/${project.share_token}`)}
              className="btn-ghost !py-2 !px-3 flex items-center gap-1.5 text-xs">
              <Eye size={14} />
              معاينة
            </button>
            <button onClick={handleShare}
              className="btn-ghost !py-2 !px-3 flex items-center gap-1.5 text-xs">
              <Share2 size={14} />
              {shareMsg || 'مشاركة'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 fade-in">
          <div className="card !p-4 text-center">
            <TrendingUp size={18} className="mx-auto mb-2" style={{ color: '#34c759' }} />
            <p className="text-xs opacity-40 mb-1">إيرادات</p>
            <p className="font-black text-lg" style={{ color: '#34c759' }}>{fmt(income)}</p>
          </div>
          <div className="card !p-4 text-center">
            <TrendingDown size={18} className="mx-auto mb-2" style={{ color: '#ff3b30' }} />
            <p className="text-xs opacity-40 mb-1">مصاريف</p>
            <p className="font-black text-lg" style={{ color: '#ff3b30' }}>{fmt(expense)}</p>
          </div>
          <div className="card !p-4 text-center" style={{
            borderColor: balance >= 0 ? 'rgba(201,169,110,0.3)' : 'rgba(255,59,48,0.2)'
          }}>
            <Wallet size={18} className="mx-auto mb-2" style={{ color: '#c9a96e' }} />
            <p className="text-xs opacity-40 mb-1">الرصيد</p>
            <p className="font-black text-lg" style={{ color: balance >= 0 ? '#c9a96e' : '#ff3b30' }}>
              {balance >= 0 ? '+' : ''}{fmt(balance)}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute top-1/2 -translate-y-1/2 left-4 opacity-30" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-10 !py-2.5 text-sm" placeholder="بحث..." />
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {(['all', 'INCOME', 'EXPENSE'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={activeTab === tab ? {
                  background: 'linear-gradient(135deg, #c9a96e, #a07d54)', color: '#0f1117'
                } : { color: 'rgba(245,240,232,0.4)' }}>
                {tab === 'all' ? 'الكل' : tab === 'INCOME' ? 'إيرادات' : 'مصاريف'}
              </button>
            ))}
          </div>
          {isOwner && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 !py-2.5">
              <Plus size={16} />
              إضافة
            </button>
          )}
        </div>

        {/* Transactions List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16 opacity-30">
              <Wallet size={36} className="mx-auto mb-3 opacity-50" />
              <p>لا توجد معاملات</p>
            </div>
          ) : filtered.map((t, i) => (
            <div key={t.id} className="card !p-4 flex items-center gap-4 group fade-in hover:border-white/10 transition-all"
              style={{ animationDelay: `${i * 0.03}s` }}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'INCOME' ? 'income-badge' : 'expense-badge'}`}>
                {t.type === 'INCOME' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold truncate">{t.title}</p>
                  {t.category && (
                    <span className="text-xs opacity-40 flex-shrink-0">{t.category}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs opacity-40">
                  <span>{format(new Date(t.date), 'd MMM yyyy', { locale: ar })}</span>
                  {t.quantity && <span>{t.quantity} × {t.unit_price?.toLocaleString('ar-SA')}</span>}
                  {t.notes && <span className="truncate">{t.notes}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {t.receipt_url && (
                  <a href={t.receipt_url} target="_blank" rel="noreferrer"
                    className="opacity-0 group-hover:opacity-40 hover:!opacity-70 transition-opacity">
                    <Image size={16} />
                  </a>
                )}
                <p className={`font-black text-lg ${t.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'INCOME' ? '+' : '-'}{fmt(t.amount)}
                </p>
                {isOwner && (
                  <button onClick={() => deleteTransaction(t.id)}
                    className="opacity-0 group-hover:opacity-30 hover:!opacity-70 transition-opacity text-red-400">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Add Transaction Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">إضافة معاملة</h3>
              <button onClick={() => setShowForm(false)} className="opacity-40 hover:opacity-70">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {(['EXPENSE', 'INCOME'] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t, category: '' }))}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={form.type === t ? {
                      background: t === 'INCOME' ? 'rgba(52,199,89,0.2)' : 'rgba(255,59,48,0.2)',
                      color: t === 'INCOME' ? '#34c759' : '#ff3b30',
                      border: `1px solid ${t === 'INCOME' ? 'rgba(52,199,89,0.4)' : 'rgba(255,59,48,0.4)'}`
                    } : { color: 'rgba(245,240,232,0.4)' }}>
                    {t === 'INCOME' ? '+ إيراد' : '- مصروف'}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs opacity-50 mb-2 block">البيان *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="input-field" placeholder="مثال: شراء أسمنت" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs opacity-50 mb-2 block">الكمية</label>
                  <input type="number" value={form.quantity}
                    onChange={e => {
                      const q = e.target.value
                      const amt = q && form.unit_price ? String(parseFloat(q) * parseFloat(form.unit_price)) : form.amount
                      setForm(f => ({ ...f, quantity: q, amount: amt }))
                    }}
                    className="input-field" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs opacity-50 mb-2 block">سعر الوحدة</label>
                  <input type="number" value={form.unit_price}
                    onChange={e => {
                      const p = e.target.value
                      const amt = form.quantity && p ? String(parseFloat(form.quantity) * parseFloat(p)) : form.amount
                      setForm(f => ({ ...f, unit_price: p, amount: amt }))
                    }}
                    className="input-field" placeholder="0" />
                </div>
              </div>

              <div>
                <label className="text-xs opacity-50 mb-2 block">المبلغ الإجمالي (ريال) *</label>
                <input type="number" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="input-field" placeholder="0" />
              </div>

              <div>
                <label className="text-xs opacity-50 mb-2 block">الفئة</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="input-field">
                  <option value="">اختر فئة</option>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs opacity-50 mb-2 block">التاريخ *</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="input-field" />
              </div>

              <div>
                <label className="text-xs opacity-50 mb-2 block">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="input-field resize-none" rows={2} placeholder="اختياري..." />
              </div>

              {/* Receipt upload */}
              <div>
                <label className="text-xs opacity-50 mb-2 block">إيصال / صورة</label>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={e => setReceipt(e.target.files?.[0] || null)} />
                <button onClick={() => fileRef.current?.click()}
                  className="btn-ghost w-full flex items-center justify-center gap-2 text-sm">
                  <Upload size={16} />
                  {receipt ? receipt.name : 'رفع ملف'}
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">إلغاء</button>
                <button onClick={saveTransaction}
                  disabled={!form.title || !form.amount || !form.date || saving}
                  className="btn-primary flex-1 disabled:opacity-40 flex items-center justify-center gap-2">
                  {saving || uploading ? (
                    <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {uploading ? 'رفع...' : 'حفظ...'}</>
                  ) : (<><Check size={16} />حفظ</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
