import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, type Project } from '../lib/supabase'
import { Plus, Building2, LogOut, ChevronLeft, Home, Wrench, TreePine, Warehouse } from 'lucide-react'

const ICONS: Record<string, any> = {
  home: Home, building: Building2, wrench: Wrench, tree: TreePine, warehouse: Warehouse
}
const ICON_LIST = Object.keys(ICONS)

type ProjectWithStats = Project & {
  totalExpense: number
  totalIncome: number
}

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('home')
  const [creating, setCreating] = useState(false)
  const [user, setUser] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    const { data: projectsData } = await supabase
      .from('projects').select('*').order('created_at', { ascending: false })

    if (!projectsData) { setLoading(false); return }

    const projectsWithStats = await Promise.all(projectsData.map(async (p) => {
      const { data: txs } = await supabase
        .from('transactions').select('amount, type').eq('project_id', p.id)
      const totalExpense = txs?.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0) || 0
      const totalIncome = txs?.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) || 0
      return { ...p, totalExpense, totalIncome }
    }))

    setProjects(projectsWithStats)
    setLoading(false)
  }

  const createProject = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('projects').insert({
      name: newName.trim(), icon: newIcon, user_id: userData.user?.id
    })
    if (!error) { setShowNew(false); setNewName(''); fetchProjects() }
    setCreating(false)
  }

  const logout = async () => { await supabase.auth.signOut() }

  const getStatus = (p: ProjectWithStats) => {
    if (!p.start_date || !p.end_date) return null
    const now = new Date()
    const start = new Date(p.start_date)
    const end = new Date(p.end_date)
    const total = end.getTime() - start.getTime()
    const elapsed = now.getTime() - start.getTime()
    const timeProgress = Math.min(Math.max(elapsed / total, 0), 1)
    const budgetProgress = p.budget ? p.totalExpense / p.budget : 0

    if (now > end) return { label: 'منتهي', color: '#888' }
    if (budgetProgress > timeProgress + 0.1) return { label: 'متأخر', color: '#ff4444' }
    if (budgetProgress < timeProgress - 0.1) return { label: 'متقدم', color: '#00c853' }
    return { label: 'طبيعي', color: '#c9a96e' }
  }

  const getBudgetPct = (p: ProjectWithStats) => {
    if (!p.budget || p.budget === 0) return null
    return Math.min((p.totalExpense / p.budget) * 100, 100)
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
      <header className="sticky top-0 z-50" style={{
        background: 'rgba(15,17,23,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,169,110,0.1)'
      }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #c9a96e22, #c9a96e44)' }}>
              <Building2 size={18} style={{ color: '#c9a96e' }} />
            </div>
            <span className="font-black text-xl" style={{ color: '#c9a96e' }}>بنيان</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs opacity-40 hidden sm:block">{user?.email}</span>
            <button onClick={logout} className="btn-ghost !py-2 !px-3 flex items-center gap-2 text-sm">
              <LogOut size={14} /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black">مشاريعي</h2>
            <p className="text-sm opacity-40 mt-1">{projects.length} مشروع</p>
          </div>
          <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> مشروع جديد
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-52 rounded-2xl shimmer" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24 opacity-40">
            <Building2 size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">لا يوجد مشاريع بعد</p>
            <p className="text-sm mt-1">اضغط "مشروع جديد" للبدء</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p, i) => {
              const Icon = ICONS[p.icon] || Home
              const status = getStatus(p)
              const budgetPct = getBudgetPct(p)
              return (
                <button key={p.id} onClick={() => navigate(`/project/${p.id}`)}
                  className="card text-right hover:border-yellow-600/30 transition-all group fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}>

                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #c9a96e22, #c9a96e44)' }}>
                      <Icon size={22} style={{ color: '#c9a96e' }} />
                    </div>
                    <div className="flex items-center gap-2">
                      {status && (
                        <span className="text-xs font-bold px-2 py-1 rounded-full"
                          style={{ background: `${status.color}22`, color: status.color }}>
                          {status.label}
                        </span>
                      )}
                      <ChevronLeft size={16} className="opacity-20 group-hover:opacity-60 transition-opacity mt-1" />
                    </div>
                  </div>

                  {/* Name */}
                  <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                  <p className="text-xs opacity-30 mb-4">
                    {new Date(p.created_at).toLocaleDateString('ar-SA')}
                  </p>

                  {/* Budget bar */}
                  {budgetPct !== null && (
                    <div className="mt-auto">
                      <div className="flex justify-between text-xs opacity-50 mb-1">
                        <span>المصروف</span>
                        <span>{budgetPct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-1.5 rounded-full transition-all" style={{
                          width: `${budgetPct}%`,
                          background: budgetPct > 90 ? '#ff4444' : budgetPct > 70 ? '#ffab00' : '#00c853'
                        }} />
                      </div>
                      <p className="text-xs opacity-40 mt-2">
                        {p.totalExpense.toLocaleString('ar-SA')} / {p.budget?.toLocaleString('ar-SA')} ر.س
                      </p>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setShowNew(false)}>
          <div className="card w-full max-w-sm fade-in">
            <h3 className="font-black text-lg mb-6">مشروع جديد</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs opacity-50 mb-2 block">اسم المشروع</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  className="input-field" placeholder="مثال: فيلا الرياض"
                  onKeyDown={e => e.key === 'Enter' && createProject()} autoFocus />
              </div>
              <div>
                <label className="text-xs opacity-50 mb-2 block">الأيقونة</label>
                <div className="flex gap-2">
                  {ICON_LIST.map(ic => {
                    const Ic = ICONS[ic]
                    return (
                      <button key={ic} onClick={() => setNewIcon(ic)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                        style={newIcon === ic ? {
                          background: 'linear-gradient(135deg, #c9a96e, #a07d54)', color: '#0f1117'
                        } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,232,0.5)' }}>
                        <Ic size={18} />
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowNew(false)} className="btn-ghost flex-1">إلغاء</button>
                <button onClick={createProject} disabled={!newName.trim() || creating}
                  className="btn-primary flex-1 disabled:opacity-40">
                  {creating ? 'جاري...' : 'إنشاء'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
