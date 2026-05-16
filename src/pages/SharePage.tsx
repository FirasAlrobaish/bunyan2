import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, type Project, type Transaction } from '../lib/supabase'
import { Building2, TrendingUp, TrendingDown, Wallet, Image } from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'INCOME' | 'EXPENSE'>('all')

  useEffect(() => {
    const fetch = async () => {
      const { data: proj } = await supabase.from('projects')
        .select('*').eq('share_token', token).single()
      if (!proj) { setLoading(false); return }
      setProject(proj)
      const { data: txns } = await supabase.from('transactions')
        .select('*').eq('project_id', proj.id).order('date', { ascending: false })
      setTransactions(txns || [])
      setLoading(false)
    }
    fetch()
  }, [token])

  const filtered = transactions.filter(t => activeTab === 'all' || t.type === activeTab)
  const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const balance = income - expense
  const fmt = (n: number) => n.toLocaleString('ar-SA')

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
      <div className="w-8 h-8 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
      <div className="text-center opacity-40">
        <Building2 size={48} className="mx-auto mb-4 opacity-30" />
        <p>الرابط غير صحيح أو انتهت صلاحيته</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
      {/* Header */}
      <header style={{
        background: 'rgba(15,17,23,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,169,110,0.1)'
      }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #c9a96e22, #c9a96e44)' }}>
              <Building2 size={18} style={{ color: '#c9a96e' }} />
            </div>
            <div>
              <span className="font-black" style={{ color: '#c9a96e' }}>بنيان</span>
              <span className="text-sm opacity-40 mx-2">·</span>
              <span className="font-semibold">{project.name}</span>
            </div>
          </div>
          <span className="text-xs opacity-30 bg-white/5 px-3 py-1 rounded-full">عرض فقط</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card !p-4 text-center">
            <TrendingUp size={18} className="mx-auto mb-2" style={{ color: '#34c759' }} />
            <p className="text-xs opacity-40 mb-1">إيرادات</p>
            <p className="font-black text-lg" style={{ color: '#34c759' }}>{fmt(income)}</p>
            <p className="text-xs opacity-30 mt-0.5">ريال</p>
          </div>
          <div className="card !p-4 text-center">
            <TrendingDown size={18} className="mx-auto mb-2" style={{ color: '#ff3b30' }} />
            <p className="text-xs opacity-40 mb-1">مصاريف</p>
            <p className="font-black text-lg" style={{ color: '#ff3b30' }}>{fmt(expense)}</p>
            <p className="text-xs opacity-30 mt-0.5">ريال</p>
          </div>
          <div className="card !p-4 text-center">
            <Wallet size={18} className="mx-auto mb-2" style={{ color: '#c9a96e' }} />
            <p className="text-xs opacity-40 mb-1">الرصيد</p>
            <p className="font-black text-lg" style={{ color: balance >= 0 ? '#c9a96e' : '#ff3b30' }}>
              {balance >= 0 ? '+' : ''}{fmt(balance)}
            </p>
            <p className="text-xs opacity-30 mt-0.5">ريال</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {(['all', 'INCOME', 'EXPENSE'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={activeTab === tab ? {
                background: 'linear-gradient(135deg, #c9a96e, #a07d54)', color: '#0f1117'
              } : { color: 'rgba(245,240,232,0.4)' }}>
              {tab === 'all' ? `الكل (${transactions.length})` : tab === 'INCOME' ? `إيرادات (${transactions.filter(t=>t.type==='INCOME').length})` : `مصاريف (${transactions.filter(t=>t.type==='EXPENSE').length})`}
            </button>
          ))}
        </div>

        {/* Transactions */}
        <div className="space-y-2">
          {filtered.map((t, i) => (
            <div key={t.id} className="card !p-4 flex items-center gap-4 fade-in"
              style={{ animationDelay: `${i * 0.03}s` }}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'INCOME' ? 'income-badge' : 'expense-badge'}`}>
                {t.type === 'INCOME' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold truncate">{t.title}</p>
                  {t.category && <span className="text-xs opacity-40">{t.category}</span>}
                </div>
                <div className="flex items-center gap-3 text-xs opacity-40">
                  <span>{format(new Date(t.date), 'd MMM yyyy', { locale: ar })}</span>
                  {t.notes && <span className="truncate">{t.notes}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {t.receipt_url && (
                  <a href={t.receipt_url} target="_blank" rel="noreferrer" className="opacity-40 hover:opacity-70">
                    <Image size={16} />
                  </a>
                )}
                <p className={`font-black text-lg ${t.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'INCOME' ? '+' : '-'}{fmt(t.amount)}
                </p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 opacity-30">
              <Wallet size={36} className="mx-auto mb-3 opacity-50" />
              <p>لا توجد معاملات</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 opacity-20 text-xs">
        بنيان · نظام إدارة تكاليف البناء
      </footer>
    </div>
  )
}
