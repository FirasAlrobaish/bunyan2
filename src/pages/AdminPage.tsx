import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Building2, Users, TrendingUp, TrendingDown, Wallet, LogOut, ChevronLeft, BarChart2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

type UserData = {
  id: string
  email: string
  created_at: string
  projects: { id: string; name: string; icon: string }[]
  totalIncome: number
  totalExpense: number
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<UserData[]>([])
  const [totalStats, setTotalStats] = useState({ users: 0, projects: 0, income: 0, expense: 0 })
  const [activeUser, setActiveUser] = useState<string | null>(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/auth'); return }

    const { data: admin } = await supabase.from('admins').select('*').eq('user_id', user.id).single()
    if (!admin) { navigate('/'); return }

    setIsAdmin(true)
    fetchData()
  }

  const fetchData = async () => {
    setLoading(true)

    // Get all projects with transactions
    const { data: projects } = await supabase
      .from('projects')
      .select('*, transactions(*)')

    // Get all transactions
    const { data: allTxns } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'approved')

    if (!projects) { setLoading(false); return }

    // Group by user_id
    const userMap: Record<string, UserData> = {}

    projects.forEach((p: any) => {
      if (!userMap[p.user_id]) {
        userMap[p.user_id] = {
          id: p.user_id,
          email: '',
          created_at: p.created_at,
          projects: [],
          totalIncome: 0,
          totalExpense: 0
        }
      }
      userMap[p.user_id].projects.push({ id: p.id, name: p.name, icon: p.icon })

      const txns = allTxns?.filter(t => t.project_id === p.id) || []
      txns.forEach((t: any) => {
        if (t.type === 'INCOME') userMap[p.user_id].totalIncome += t.amount
        else userMap[p.user_id].totalExpense += t.amount
      })
    })

    const usersArr = Object.values(userMap)
    setUsers(usersArr)

    const totalIncome = allTxns?.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) || 0
    const totalExpense = allTxns?.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0) || 0

    setTotalStats({
      users: usersArr.length,
      projects: projects.length,
      income: totalIncome,
      expense: totalExpense
    })

    setLoading(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const fmt = (n: number) => n.toLocaleString('ar-SA')

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
      <div className="w-8 h-8 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!isAdmin) return null

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{
        background: 'rgba(15,17,23,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,169,110,0.1)'
      }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #c9a96e22, #c9a96e44)' }}>
              <Building2 size={18} style={{ color: '#c9a96e' }} />
            </div>
            <div>
              <span className="font-black text-lg" style={{ color: '#c9a96e' }}>بنيان</span>
              <span className="text-xs opacity-40 mr-2 bg-white/5 px-2 py-0.5 rounded-full">أدمن</span>
            </div>
          </div>
          <button onClick={logout} className="btn-ghost !py-2 !px-3 flex items-center gap-2 text-sm">
            <LogOut size={14} />
            خروج
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Platform Stats */}
        <div>
          <h2 className="text-lg font-bold mb-4 opacity-60">إحصائيات المنصة</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card !p-4 text-center">
              <Users size={20} className="mx-auto mb-2" style={{ color: '#c9a96e' }} />
              <p className="font-black text-2xl" style={{ color: '#c9a96e' }}>{totalStats.users}</p>
              <p className="text-xs opacity-40 mt-1">مقاول</p>
            </div>
            <div className="card !p-4 text-center">
              <Building2 size={20} className="mx-auto mb-2" style={{ color: '#007aff' }} />
              <p className="font-black text-2xl" style={{ color: '#007aff' }}>{totalStats.projects}</p>
              <p className="text-xs opacity-40 mt-1">مشروع</p>
            </div>
            <div className="card !p-4 text-center">
              <TrendingUp size={20} className="mx-auto mb-2" style={{ color: '#34c759' }} />
              <p className="font-black text-xl" style={{ color: '#34c759' }}>{fmt(totalStats.income)}</p>
              <p className="text-xs opacity-40 mt-1">إجمالي الإيرادات</p>
            </div>
            <div className="card !p-4 text-center">
              <TrendingDown size={20} className="mx-auto mb-2" style={{ color: '#ff3b30' }} />
              <p className="font-black text-xl" style={{ color: '#ff3b30' }}>{fmt(totalStats.expense)}</p>
              <p className="text-xs opacity-40 mt-1">إجمالي المصاريف</p>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div>
          <h2 className="text-lg font-bold mb-4 opacity-60">المقاولون ({users.length})</h2>
          <div className="space-y-3">
            {users.length === 0 ? (
              <div className="card text-center py-12 opacity-30">
                <Users size={36} className="mx-auto mb-3 opacity-50" />
                <p>لا يوجد مقاولون بعد</p>
              </div>
            ) : users.map((u, i) => (
              <div key={u.id} className="card fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center justify-between cursor-pointer"
                  onClick={() => setActiveUser(activeUser === u.id ? null : u.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg"
                      style={{ background: 'linear-gradient(135deg, #c9a96e22, #c9a96e44)', color: '#c9a96e' }}>
                      {u.projects.length}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{u.id.substring(0, 8)}...</p>
                      <p className="text-xs opacity-40 mt-0.5">{u.projects.length} مشروع</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <p className="text-xs text-green-400 font-semibold">+{fmt(u.totalIncome)}</p>
                      <p className="text-xs text-red-400">-{fmt(u.totalExpense)}</p>
                    </div>
                    <ChevronLeft size={16} className={`opacity-30 transition-transform ${activeUser === u.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Expanded projects */}
                {activeUser === u.id && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-2 fade-in">
                    <p className="text-xs opacity-40 mb-3">المشاريع:</p>
                    {u.projects.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <div className="flex items-center gap-2">
                          <Building2 size={14} style={{ color: '#c9a96e' }} />
                          <span className="text-sm">{p.name}</span>
                        </div>
                        <a href={`/project/${p.id}`} target="_blank" rel="noreferrer"
                          className="text-xs opacity-40 hover:opacity-70">
                          عرض ←
                        </a>
                      </div>
                    ))}
                    <div className="flex gap-3 mt-3 pt-3 border-t border-white/5">
                      <div className="flex-1 p-2 rounded-lg text-center" style={{ background: 'rgba(52,199,89,0.1)' }}>
                        <p className="text-xs opacity-60">إيرادات</p>
                        <p className="font-bold text-green-400 text-sm">{fmt(u.totalIncome)}</p>
                      </div>
                      <div className="flex-1 p-2 rounded-lg text-center" style={{ background: 'rgba(255,59,48,0.1)' }}>
                        <p className="text-xs opacity-60">مصاريف</p>
                        <p className="font-bold text-red-400 text-sm">{fmt(u.totalExpense)}</p>
                      </div>
                      <div className="flex-1 p-2 rounded-lg text-center" style={{ background: 'rgba(201,169,110,0.1)' }}>
                        <p className="text-xs opacity-60">الرصيد</p>
                        <p className="font-bold text-sm" style={{ color: '#c9a96e' }}>{fmt(u.totalIncome - u.totalExpense)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
