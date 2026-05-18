import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Building2, Mail, Lock, Eye, EyeOff, User, Phone, MapPin } from 'lucide-react'

const REGIONS = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام',
  'الخبر', 'الطائف', 'تبوك', 'بريدة', 'خميس مشيط',
  'أبها', 'نجران', 'الجبيل', 'حائل', 'الباحة', 'عرعر', 'سكاكا'
]

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [region, setRegion] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'register') {
        if (!fullName.trim() || !phone.trim() || !region) {
          setError('يرجى تعبئة جميع الحقول')
          setLoading(false)
          return
        }
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        // Save profile
        if (data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            full_name: fullName.trim(),
            phone: phone.trim(),
            region
          })
        }
        setSuccess('تم إنشاء حسابك! تحقق من بريدك الإلكتروني.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (e: any) {
      setError(e.message === 'Invalid login credentials' ? 'البريد أو كلمة المرور غير صحيحة' : e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'radial-gradient(ellipse at top, #1a1d27 0%, #0f1117 70%)'
    }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #c9a96e, transparent)' }} />
      </div>

      <div className="w-full max-w-md fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #c9a96e22, #c9a96e44)', border: '1px solid #c9a96e44' }}>
            <Building2 size={36} style={{ color: '#c9a96e' }} />
          </div>
          <h1 className="text-4xl font-black mb-1" style={{ color: '#c9a96e' }}>بنيان</h1>
          <p className="text-sm opacity-50">إدارة تكاليف البناء</p>
        </div>

        {/* Card */}
        <div className="card">
          <div className="flex gap-2 mb-8 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={mode === m ? {
                  background: 'linear-gradient(135deg, #c9a96e, #a07d54)', color: '#0f1117'
                } : { color: 'rgba(245,240,232,0.5)' }}>
                {m === 'login' ? 'تسجيل الدخول' : 'حساب جديد'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {/* Register fields */}
            {mode === 'register' && (
              <>
                <div>
                  <label className="text-xs opacity-50 mb-2 block">الاسم الكامل *</label>
                  <div className="relative">
                    <User size={16} className="absolute top-1/2 -translate-y-1/2 left-4 opacity-40" />
                    <input value={fullName} onChange={e => setFullName(e.target.value)}
                      className="input-field pl-10" placeholder="محمد أحمد العمري" />
                  </div>
                </div>

                <div>
                  <label className="text-xs opacity-50 mb-2 block">رقم الجوال *</label>
                  <div className="relative">
                    <Phone size={16} className="absolute top-1/2 -translate-y-1/2 left-4 opacity-40" />
                    <input value={phone} onChange={e => setPhone(e.target.value)}
                      className="input-field pl-10" placeholder="05xxxxxxxx" type="tel" minLength={10} maxLength={10} />
                  </div>
                </div>

                <div>
                  <label className="text-xs opacity-50 mb-2 block">المنطقة *</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute top-1/2 -translate-y-1/2 left-4 opacity-40" />
                    <select value={region} onChange={e => setRegion(e.target.value)}
                      className="input-field pl-10">
                      <option value="">اختر المنطقة</option>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs opacity-50 mb-2 block">البريد الإلكتروني *</label>
              <div className="relative">
                <Mail size={16} className="absolute top-1/2 -translate-y-1/2 left-4 opacity-40" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input-field pl-10" placeholder="your@email.com"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              </div>
            </div>

            <div>
              <label className="text-xs opacity-50 mb-2 block">كلمة المرور *</label>
              <div className="relative">
                <Lock size={16} className="absolute top-1/2 -translate-y-1/2 left-10 opacity-40" />
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pl-10 pr-12" placeholder="••••••••"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                <button onClick={() => setShowPass(!showPass)}
                  className="absolute top-1/2 -translate-y-1/2 right-4 opacity-40 hover:opacity-70">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 rounded-xl p-3 text-center">{error}</div>
            )}
            {success && (
              <div className="text-sm text-green-400 bg-green-400/10 rounded-xl p-3 text-center">{success}</div>
            )}

            <button onClick={handleSubmit}
              disabled={loading || !email || !password || (mode === 'register' && (!fullName || !phone || !region))}
              className="btn-primary w-full mt-2 disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? 'جاري...' : mode === 'login' ? 'دخول' : 'إنشاء حساب'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
