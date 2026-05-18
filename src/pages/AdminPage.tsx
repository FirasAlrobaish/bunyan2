import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { adminSupabase } from '../lib/adminSupabase'
import { Building2, Users, TrendingUp, TrendingDown, LogOut, ChevronLeft, Phone, MapPin, User } from 'lucide-react'

type UserData = {
  id: string
  full_name: string
  phone: string
  region: string
  created_at: string
  projects: { id: string; name: string }[]
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

    const { data: projects } = await adminSupabase.from('projects').select('*')
    const { data: allTxns } = await adminSupabase.from('transactions').select('*')
    const { data: profiles } = await adminSupabase.from('profiles').select('*')

    if (!projects) { setLoading(false); return }

    const userMap: Record<string, UserData> = {}

    projects.forEach((p: any) => {
      if (!userMap[p.user_id]) {
        const profile = profiles?.find(pr => pr.id === p.user_id)
        userMap[p.user_id] = {
          id: p.user_id,
          full_name: profile?.full_name || 'غير محدد',
          phone: profile?.phone || '-',
          region: profile?.region || '-',
          created_at: p.created_at,
          projects: [],
          totalIncome: 0,
          totalExpense: 0
        }
      }
      userMap[p.user_id].projects.push({ id: p.id, name: p.name })

      const txns = allTxns?.filter((t: any) => t.project_id === p.id && (!t.status || t.status === 'approved')) || []
      txns.forEach((t: any) => {
        if (t.type === 'INCOME') userMap[p.user_id].totalIncome += t.amount
        else userMap[p.user_id].totalExpense += t.amount
      })
    })

    const usersArr = Object.values(userMap)
    setUsers(usersArr)

    const totalIncome = allTxns?.filter((t: any) => t.type === 'INCOME' && (!t.status || t.status === 'approved')).reduce((s: number, t: any) => s + t.amount, 0) || 0
    const totalExpense = allTxns?.filter((t: any) => t.type === 'EXPENSE' && (!t.status || t.status === 'approved')).reduce((s: number, t: any) => s + t.amount, 0) || 0

    setTotalStats({ users: usersArr.length, projects: projects.length, income: totalIncome, expense: totalExpense })
    setLoading(false)
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

        {/* Users */}
        <div>
          <h2 className="text-lg font-bold mb-4 opacity-60">المقاولون ({users.length})</h2>
          <div className="space-y-3">
            {users.map((u, i) => (
              <div key={u.id} className="card fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center justify-between cursor-pointer"
                  onClick={() => setActiveUser(activeUser === u.id ? null : u.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg"
                      style={{ background: 'linear-gradient(135deg, #c9a96e22, #c9a96e44)', color: '#c9a96e' }}>
                      {u.projects.length}
                    </div>
                    <div>
                      <p className="font-bold">{u.full_name}</p>
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
                    <div className="text-left">
                      <p className="text-xs text-green-400 font-semibold">+{fmt(u.totalIncome)}</p>
                      <p className="text-xs text-red-400">-{fmt(u.totalExpense)}</p>
                    </div>
                    <ChevronLeft size={16} className={`opacity-30 transition-transform ${activeUser === u.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>

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
                          className="text-xs opacity-40 hover:opacity-70">عرض ←</a>
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
