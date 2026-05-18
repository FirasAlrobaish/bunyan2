import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { adminSupabase } from '../lib/adminSupabase'
import { Building2, Users, TrendingUp, TrendingDown, LogOut, ChevronLeft, Phone, MapPin, CheckCircle, Clock } from 'lucide-react'

type UserData = {
  id: string
  full_name: string
  phone: string
  region: string
  created_at: string
  projects: { id: string; name: string }[]
  totalIncome: number
  totalExpense: number
  isActive: boolean
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<UserData[]>([])
  const [totalStats, setTotalStats] = useState({ users: 0, activeUsers: 0, newUsers: 0, projects: 0, income: 0, expense: 0 })
  const [activeUser, setActiveUser] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'new'>('all')

  useEffect(() => { checkAdmin() }, [])

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

    // جيب كل البروفايلات
    const { data: profiles } = await adminSupabase.from('profiles').select('*').order('created_at', { ascending: false })
    const { data: projects } = await adminSupabase.from('projects').select('*')
    const { data: allTxns } = await adminSupabase.from('transactions').select('*')

    if (!profiles) { setLoading(false); return }

    const usersArr: UserData[] = profiles.map((p: any) => {
      const userProjects = projects?.filter((pr: any) => pr.user_id === p.id) || []
      const userTxns = allTxns?.filter((t: any) => 
        userProjects.some((pr: any) => pr.id === t.project_id) && 
        (!t.status || t.status === 'approved')
      ) || []
      
      const totalIncome = userTxns.filter((t: any) => t.type === 'INCOME').reduce((s: number, t: any) => s + t.amount, 0)
      const totalExpense = userTxns.filter((t: any) => t.type === 'EXPENSE').reduce((s: number, t: any) => s + t.amount, 0)

      return {
        id: p.id,
        full_name: p.full_name || 'غير محدد',
        phone: p.phone || '-',
        region: p.region || '-',
        created_at: p.created_at,
        projects: userProjects.map((pr: any) => ({ id: pr.id, name: pr.name })),
        totalIncome,
        totalExpense,
        isActive: userProjects.length > 0
      }
    })

    setUsers(usersArr)

    const totalIncome = allTxns?.filter((t: any) => t.type === 'INCOME' && (!t.status || t.status === 'approved')).reduce((s: number, t: any) => s + t.amount, 0) || 0
    const totalExpense = allTxns?.filter((t: any) => t.type === 'EXPENSE' && (!t.status || t.status === 'approved')).reduce((s: number, t: any) => s + t.amount, 0) || 0

    setTotalStats({
      users: usersArr.length,
      activeUsers: usersArr.filter(u => u.isActive).length,
      newUsers: usersArr.filter(u => !u.isActive).length,
      projects: projects?.length || 0,
      income: totalIncome,
      expense: totalExpense
    })

    setLoading(false)
  }

  const fmt = (n: number) => n.toLocaleString('ar-SA')

  const filteredUsers = users.filter(u => {
    if (filter === 'active') return u.isActive
    if (filter === 'new') return !u.isActive
    return true
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
      <div className="w-8 h-8 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!isAdmin) return null

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
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
          <button onClick={async () => { await supabase.auth.signOut(); navigate('/auth') }}
            className="btn-ghost !py-2 !px-3 flex items-center gap-2 text-sm">
            <LogOut size={14} />خروج
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div>
          <h2 className="text-lg font-bold mb-4 opacity-60">إحصائيات المنصة</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div className="card !p-4 text-center">
              <Users size={20} className="mx-auto mb-2" style={{ color: '#c9a96e' }} />
              <p className="font-black text-2xl" style={{ color: '#c9a96e' }}>{totalStats.users}</p>
              <p className="text-xs opacity-40 mt-1">إجمالي المقاولين</p>
            </div>
            <div className="card !p-4 text-center">
              <CheckCircle size={20} className="mx-auto mb-2" style={{ color: '#34c759' }} />
              <p className="font-black text-2xl" style={{ color: '#34c759' }}>{totalStats.activeUsers}</p>
              <p className="text-xs opacity-40 mt-1">مقاول نشط</p>
            </div>
            <div className="card !p-4 text-center">
              <Clock size={20} className="mx-auto mb-2" style={{ color: '#ff9500' }} />
              <p className="font-black text-2xl" style={{ color: '#ff9500' }}>{totalStats.newUsers}</p>
              <p className="text-xs opacity-40 mt-1">مقاول جديد</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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

        {/* Filter tabs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold opacity-60">المقاولون ({filteredUsers.length})</h2>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {([
                { key: 'all', label: 'الكل' },
                { key: 'active', label: '🟢 نشط' },
                { key: 'new', label: '🟡 جديد' },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={filter === f.key ? {
                    background: 'linear-gradient(135deg, #c9a96e, #a07d54)', color: '#0f1117'
                  } : { color: 'rgba(245,240,232,0.4)' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="card text-center py-12 opacity-30">
                <Users size={36} className="mx-auto mb-3 opacity-50" />
                <p>لا يوجد مقاولون</p>
              </div>
            ) : filteredUsers.map((u, i) => (
              <div key={u.id} className="card fade-in" style={{
                animationDelay: `${i * 0.05}s`,
                borderColor: u.isActive ? 'rgba(52,199,89,0.15)' : 'rgba(255,149,0,0.15)'
              }}>
                <div className="flex items-center justify-between cursor-pointer"
                  onClick={() => setActiveUser(activeUser === u.id ? null : u.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg relative"
                      style={{ background: u.isActive ? 'rgba(52,199,89,0.15)' : 'rgba(255,149,0,0.15)', color: u.isActive ? '#34c759' : '#ff9500' }}>
                      {u.projects.length}
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                        style={{ background: u.isActive ? '#34c759' : '#ff9500' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{u.full_name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={u.isActive ? { background: 'rgba(52,199,89,0.15)', color: '#34c759' } : { background: 'rgba(255,149,0,0.15)', color: '#ff9500' }}>
                          {u.isActive ? 'نشط' : 'جديد'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs opacity-40 flex items-center gap-1">
                          <Phone size={10} />{u.phone}
                        </span>
                        <span className="text-xs opacity-40 flex items-center gap-1">
                          <MapPin size={10} />{u.region}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {u.isActive && (
                      <div className="text-left">
                        <p className="text-xs text-green-400 font-semibold">+{fmt(u.totalIncome)}</p>
                        <p className="text-xs text-red-400">-{fmt(u.totalExpense)}</p>
                      </div>
                    )}
                    <ChevronLeft size={16} className={`opacity-30 transition-transform ${activeUser === u.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {activeUser === u.id && (
                  <div className="mt-4 pt-4 border-t border-white/5 fade-in">
                    {u.projects.length === 0 ? (
                      <p className="text-sm opacity-30 text-center py-4">لا يوجد مشاريع بعد</p>
                    ) : (
                      <>
                        <p className="text-xs opacity-40 mb-3">المشاريع ({u.projects.length}):</p>
                        <div className="space-y-2">
                          {u.projects.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl"
                              style={{ background: 'rgba(255,255,255,0.04)' }}>
                              <div className="flex items-center gap-2">
                                <Building2 size={14} style={{ color: '#c9a96e' }} />
                                <span className="text-sm">{p.name}</span>
                              </div>
                              <a href={`/project/${p.id}`} target="_blank" rel="noreferrer"
                                className="text-xs opacity-40 hover:opacity-70">عرض ←</a>
                            </div>
                          ))}
                        </div>
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
                      </>
                    )}
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
