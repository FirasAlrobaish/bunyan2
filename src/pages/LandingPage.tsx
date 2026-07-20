import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Mic, BarChart2, Sparkles, TrendingUp, ShieldCheck, ArrowLeft, Building2 } from 'lucide-react'

/**
 * ✨ صفحة الهبوط — أول انطباع عن بنيان
 * الهوية: المخطط الذهبي / فحمي دافئ
 */

const GOLD = '#c9a96e'
const CHAMPAGNE = '#E8D5AE'

/* ظهور ناعم عند التمرير */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} style={{
      opacity: on ? 1 : 0,
      transform: on ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity .8s ease ${delay}ms, transform .8s ease ${delay}ms`,
    }}>{children}</div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div dir="rtl" style={{ background: '#12100E', color: '#F5F0E8', overflowX: 'hidden' }}>
      <style>{`
        @keyframes bn-float { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-14px) rotate(-1deg)} }
        @keyframes bn-float2 { 0%,100%{transform:translateY(0) rotate(2deg)} 50%{transform:translateY(-10px) rotate(2deg)} }
        @keyframes bn-pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes bn-grow { from{width:0} }
        .bn-feature { transition: transform .35s ease, border-color .35s ease; }
        .bn-feature:hover { transform: translateY(-6px); border-color: rgba(201,169,110,.4) !important; }
        .bn-feature:hover .bn-fi { background: linear-gradient(135deg,#E8D5AE,#c9a96e) !important; color:#12100E !important; }
        .bn-fi { transition: all .35s ease; }
        .bn-cta { transition: transform .25s ease, box-shadow .25s ease; }
        .bn-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(201,169,110,.45) !important; }
      `}</style>

      {/* ============ الهيدر ============ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(18,16,14,0.75)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(245,240,232,0.06)',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, border: `1.5px solid ${GOLD}`, borderRadius: 8, display: 'grid', placeItems: 'center' }}>
              <span className="font-black" style={{ fontSize: 17, color: GOLD }}>ب</span>
            </div>
            <span className="font-black" style={{ fontSize: 20, color: GOLD }}>بنيان</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/auth')} className="btn-ghost" style={{ padding: '9px 20px', fontSize: 13 }}>دخول</button>
            <button onClick={() => navigate('/auth')} className="btn-primary bn-cta" style={{ padding: '9px 22px', fontSize: 13 }}>ابدأ مجاناً</button>
          </div>
        </div>
      </header>

      {/* ============ البطل ============ */}
      <section style={{
        position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center',
        backgroundImage: `radial-gradient(ellipse 1000px 600px at 70% -10%, rgba(201,169,110,0.12), transparent),
                          radial-gradient(ellipse 700px 500px at 10% 110%, rgba(201,169,110,0.06), transparent)`,
      }}>
        {/* شبكة مخطط هندسي خافتة */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.35,
          backgroundImage: `linear-gradient(rgba(245,240,232,0.025) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(245,240,232,0.025) 1px, transparent 1px)`,
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent)',
        }} />

        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '140px 24px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 60, alignItems: 'center', position: 'relative' }}>

          {/* النص */}
          <div>
            <Reveal>
              <p className="font-black" style={{ fontSize: 12, letterSpacing: '0.4em', color: GOLD, marginBottom: 20 }}>
                مـنـصـة الـمـقـاول الـسـعـودي
              </p>
            </Reveal>
            <Reveal delay={120}>
              <h1 className="font-black" style={{ fontSize: 'clamp(38px, 5.5vw, 58px)', lineHeight: 1.3, marginBottom: 22 }}>
                مشاريعك تُبنى بالطوب…
                <br />
                <span style={{
                  background: 'linear-gradient(135deg,#E8D5AE 0%,#c9a96e 45%,#8A6D3F 100%)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>وأرباحك تُبنى بالأرقام</span>
              </h1>
            </Reveal>
            <Reveal delay={240}>
              <p style={{ fontSize: 17, color: 'rgba(245,240,232,0.55)', fontWeight: 300, maxWidth: 480, lineHeight: 1.9, marginBottom: 34 }}>
                بنيان يمسك دفاترك: كل فاتورة، كل دفعة، كل مؤشر — في مكان واحد، بالعربي، ولطريقة شغل المقاول الحقيقية.
              </p>
            </Reveal>
            <Reveal delay={360}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/auth')} className="btn-primary bn-cta" style={{ padding: '15px 34px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ابدأ مشروعك الأول <ArrowLeft size={16} />
                </button>
                <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="btn-ghost" style={{ padding: '15px 28px', fontSize: 15 }}>
                  اكتشف الميزات
                </button>
              </div>
            </Reveal>
          </div>

          {/* المجسم — بطاقات عائمة تحاكي التطبيق */}
          <div style={{ position: 'relative', minHeight: 420 }}>
            {/* بطاقة المشروع الرئيسية */}
            <Reveal delay={300}>
              <div className="card" style={{ position: 'relative', maxWidth: 380, margin: '0 auto', animation: 'bn-float 7s ease-in-out infinite', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h3 className="font-black" style={{ fontSize: 18 }}>فيلا العليا</h3>
                    <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.3)' }}>الرياض · بدأ مايو 2026</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 100, background: 'rgba(61,211,117,0.1)', color: '#3DD375', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3DD375', animation: 'bn-pulse 2s infinite' }} />
                    بالمسار الصحيح
                  </span>
                </div>
                <p className="gold-num" style={{ fontSize: 38, lineHeight: 1 }}>486,200</p>
                <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.3)', marginBottom: 18 }}>مصروف من أصل 1,200,000 ريال</p>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg,#E8D5AE,#c9a96e)', borderRadius: 2, animation: 'bn-grow 1.5s ease' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(245,240,232,0.06)' }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.3)' }}>معدل الصرف اليومي</p>
                    <p className="font-black" style={{ fontSize: 16, color: '#FF9500' }}>7,480 ر.س</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.3)' }}>متبقي من المدة</p>
                    <p className="font-black" style={{ fontSize: 16, color: '#3DD375' }}>142 يوم</p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* بطاقة تلميح السعر العائمة */}
            <Reveal delay={500}>
              <div style={{
                position: 'absolute', bottom: 20, right: -10, maxWidth: 250,
                background: '#1A1714', border: '1px solid rgba(61,211,117,0.3)', borderRadius: 10,
                padding: '14px 18px', animation: 'bn-float2 6s ease-in-out infinite 1s',
                boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
              }}>
                <p style={{ fontSize: 12, color: '#3DD375', fontWeight: 700, marginBottom: 3 }}>👍 أوفر من متوسط السوق بـ 12٪</p>
                <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.35)' }}>كيس الأسمنت: دفعت 11.2 — المتوسط 12.75 ريال</p>
              </div>
            </Reveal>

            {/* بطاقة الصوت العائمة */}
            <Reveal delay={650}>
              <div style={{
                position: 'absolute', top: -14, left: -6,
                background: '#1A1714', border: `1px solid rgba(201,169,110,0.35)`, borderRadius: 100,
                padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 10,
                animation: 'bn-float2 8s ease-in-out infinite .5s',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              }}>
                <Mic size={15} style={{ color: GOLD }} />
                <span style={{ fontSize: 12, color: 'rgba(245,240,232,0.7)' }}>"اشتريت ٥٠ كيس أسمنت بألف وأربعمية"</span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ الميزات ============ */}
      <section id="features" style={{ padding: '90px 24px', position: 'relative' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <p className="font-black" style={{ fontSize: 11, letterSpacing: '0.4em', color: GOLD, marginBottom: 14 }}>لـيـش بـنـيـان؟</p>
              <h2 className="font-black" style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>كل ريال… له حساب</h2>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 18 }}>
            {[
              { Icon: Camera, title: 'صوّر الفاتورة وخلاص', desc: 'الذكاء الاصطناعي يقرأ الفاتورة ويسجل البيان والمبلغ والفئة — بدون كتابة.' },
              { Icon: BarChart2, title: 'مؤشر أسعار السوق', desc: 'أسعار حقيقية لمواد البناء من السوق السعودي، وتنبيه فوري لو دفعت أكثر من المتوسط.' },
              { Icon: TrendingUp, title: 'مؤشرات تقرأ مشروعك', desc: 'معدل الصرف اليومي، استهلاك الميزانية، والتكلفة المتوقعة — تعرف وضعك قبل ما يفاجئك.' },
              { Icon: Sparkles, title: 'قصة بيتك للعميل', desc: 'صفحة فاخرة يتابع فيها عميلك مراحل بناء بيته بالصور، ويعتمد دفعاته من جواله.' },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="card bn-feature" style={{ height: '100%' }}>
                  <div className="bn-fi" style={{
                    width: 46, height: 46, borderRadius: 10, display: 'grid', placeItems: 'center',
                    background: 'rgba(201,169,110,0.1)', color: GOLD, marginBottom: 18,
                  }}>
                    <f.Icon size={21} />
                  </div>
                  <h3 className="font-black" style={{ fontSize: 17, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: 13.5, color: 'rgba(245,240,232,0.45)', lineHeight: 1.8, fontWeight: 300 }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ قصة بيتك — العرض ============ */}
      <section style={{
        padding: '90px 24px',
        background: 'linear-gradient(180deg, transparent, rgba(201,169,110,0.04), transparent)',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 60, alignItems: 'center' }}>
          <Reveal>
            <div>
              <p className="font-black" style={{ fontSize: 11, letterSpacing: '0.4em', color: GOLD, marginBottom: 14 }}>الـثـقـة تُـبـنـى بـالـشـفـافـيـة</p>
              <h2 className="font-black" style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', lineHeight: 1.4, marginBottom: 18 }}>
                عميلك يشوف بيته
                <br />وهو ينبني… لحظة بلحظة
              </h2>
              <p style={{ fontSize: 15.5, color: 'rgba(245,240,232,0.5)', fontWeight: 300, lineHeight: 1.9, marginBottom: 26 }}>
                ترسل لعميلك رابطاً واحداً: يفتح «قصة بيتك» — مراحل البناء بالصور على خيط ذهبي، تقدم المشروع، ودفعاته باعتماد إلكتروني موثّق. عميل مطمئن = مقاول مرتاح.
              </p>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[
                  { Icon: ShieldCheck, t: 'نظام موافقات موثّق' },
                  { Icon: Building2, t: 'متابعة بالصور' },
                ].map((x, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'rgba(245,240,232,0.6)' }}>
                    <x.Icon size={16} style={{ color: GOLD }} /> {x.t}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* مجسم القصة */}
          <Reveal delay={200}>
            <div className="card" style={{ maxWidth: 360, margin: '0 auto', boxShadow: '0 40px 80px rgba(0,0,0,0.45)' }}>
              <p style={{ fontSize: 10, letterSpacing: '0.35em', color: GOLD, textAlign: 'center', marginBottom: 8 }}>قـصـة بـيـتـك</p>
              <h4 className="font-black" style={{ textAlign: 'center', fontSize: 20, marginBottom: 24 }}>فيلا العليا</h4>
              <div style={{ position: 'relative', paddingRight: 26 }}>
                <div style={{ position: 'absolute', right: 7, top: 4, bottom: 4, width: 1, background: `linear-gradient(to bottom, ${GOLD}, rgba(201,169,110,0.3), transparent)` }} />
                {[
                  { t: 'صبّة القواعد', d: '12 مايو', done: true },
                  { t: 'بناء العظم', d: '28 يونيو', done: true },
                  { t: 'التشطيبات الداخلية', d: 'جاري العمل…', done: false },
                ].map((m, i) => (
                  <div key={i} style={{ position: 'relative', marginBottom: i < 2 ? 22 : 0 }}>
                    <span style={{
                      position: 'absolute', right: -26, top: 4, width: 13, height: 13, borderRadius: '50%',
                      background: m.done ? GOLD : 'transparent',
                      border: m.done ? 'none' : `2px solid ${GOLD}`,
                      boxShadow: m.done ? '0 0 0 4px rgba(201,169,110,0.15)' : 'none',
                      animation: m.done ? 'none' : 'bn-pulse 2s infinite',
                    }} />
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{m.t}</p>
                    <p style={{ fontSize: 11, color: m.done ? 'rgba(245,240,232,0.3)' : GOLD }}>{m.d}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(245,240,232,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.35)' }}>دفعت حتى الآن</span>
                <span className="gold-num" style={{ fontSize: 20 }}>720,000 ر.س</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ كيف تبدأ ============ */}
      <section style={{ padding: '90px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p className="font-black" style={{ fontSize: 11, letterSpacing: '0.4em', color: GOLD, marginBottom: 14 }}>ثـلاث خـطـوات</p>
              <h2 className="font-black" style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>وتبدأ السيطرة</h2>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
            {[
              { n: '01', t: 'أنشئ مشروعك', d: 'اسم المشروع، الميزانية، والمدة — نصف دقيقة.' },
              { n: '02', t: 'سجّل مصاريفك', d: 'اكتبها، صوّرها، أو قلها — والباقي علينا.' },
              { n: '03', t: 'شارك عميلك', d: 'رابط واحد يطمّنه ويعتمد دفعاته منه.' },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 120}>
                <div style={{ textAlign: 'center' }}>
                  <p className="gold-num" style={{ fontSize: 44, marginBottom: 10 }}>{s.n}</p>
                  <h3 className="font-black" style={{ fontSize: 18, marginBottom: 8 }}>{s.t}</h3>
                  <p style={{ fontSize: 13.5, color: 'rgba(245,240,232,0.45)', fontWeight: 300 }}>{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ النداء الأخير ============ */}
      <section style={{ padding: '40px 24px 100px' }}>
        <Reveal>
          <div className="card" style={{
            maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: '60px 32px',
            backgroundImage: 'radial-gradient(ellipse 400px 200px at 50% 0%, rgba(201,169,110,0.1), transparent)',
          }}>
            <h2 className="font-black" style={{ fontSize: 'clamp(26px, 4vw, 38px)', lineHeight: 1.4, marginBottom: 14 }}>
              كل يوم بدون أرقام…
              <br /><span className="gold-num">ريال يضيع بصمت</span>
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(245,240,232,0.5)', fontWeight: 300, marginBottom: 30 }}>
              ابدأ مشروعك الأول على بنيان — مجاناً.
            </p>
            <button onClick={() => navigate('/auth')} className="btn-primary bn-cta" style={{ padding: '16px 44px', fontSize: 16 }}>
              ابدأ الآن
            </button>
          </div>
        </Reveal>
      </section>

      {/* ============ التذييل ============ */}
      <footer style={{ borderTop: '1px solid rgba(245,240,232,0.05)', padding: '36px 24px', textAlign: 'center' }}>
        <span className="font-black" style={{ fontSize: 17, color: GOLD }}>بنيان</span>
        <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.25)', marginTop: 6 }}>دقة المخطط · فخامة التنفيذ — صُنع في السعودية 🇸🇦</p>
      </footer>
    </div>
  )
}
