import { useEffect, useState } from 'react'
import { MosaicBackground } from '@/components/MosaicBackground'
import { Button } from '@/components/ui/button'
import {
  BookOpen, MessageSquare, MapPin, Clock, Users, Shield,
  ChevronRight, Mic, PenLine, Heart, ArrowDown,
  GraduationCap, Briefcase, Home, Plane, Baby, Star,
  Lock, Eye, UserPlus, Sparkles, ChevronLeft,
} from 'lucide-react'

interface LandingPageProps {
  onLogin: () => void
  onRegister: () => void
}

// ── Scroll reveal hook ────────────────────────────────────────────────────────

function useScrollReveal() {
  useEffect(() => {
    let observer: IntersectionObserver | null = null

    const timer = setTimeout(() => {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              e.target.classList.add('visible')
              observer?.unobserve(e.target)
            }
          })
        },
        { threshold: 0.08, rootMargin: '0px 0px -20px 0px' },
      )
      document.querySelectorAll('.reveal').forEach(el => observer!.observe(el))
    }, 100)

    return () => {
      clearTimeout(timer)
      observer?.disconnect()
    }
  }, [])
}

// ── Screenshot slider ─────────────────────────────────────────────────────────

function ScreenshotSlider({ images }: { images: string[] }) {
  const [active, setActive] = useState(0)

  // Auto-advance every 3.5 seconds
  useEffect(() => {
    if (images.length <= 1) return
    const id = setInterval(() => setActive(prev => (prev + 1) % images.length), 3500)
    return () => clearInterval(id)
  }, [images.length])

  const prev = () => setActive(a => (a - 1 + images.length) % images.length)
  const next = () => setActive(a => (a + 1) % images.length)

  return (
    <div className="relative w-full max-w-3xl mx-auto reveal reveal-delay-2">
      {/* Track */}
      <div className="overflow-hidden rounded-2xl shadow-2xl border border-amber-100/60">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Képernyőkép ${i + 1}`}
              className="w-full shrink-0 object-cover"
              draggable={false}
            />
          ))}
        </div>
      </div>

      {/* Prev / Next */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur shadow-md flex items-center justify-center text-stone-600 hover:bg-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur shadow-md flex items-center justify-center text-stone-600 hover:bg-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === active ? 'bg-amber-700 w-5' : 'bg-stone-300 hover:bg-stone-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Inline SVG illustrations ──────────────────────────────────────────────────

function ChatIllustration() {
  return (
    <div className="relative w-full max-w-[300px] mx-auto">
      {/* Phone frame */}
      <div className="relative bg-stone-800 rounded-[2rem] p-2 shadow-2xl phone-shine overflow-hidden">
        <div className="bg-white rounded-[1.6rem] overflow-hidden">
          {/* Status bar */}
          <div className="bg-amber-800 px-4 py-2.5 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-100" />
            <span className="text-amber-50 text-xs font-medium font-body">Emlékkönyv</span>
          </div>
          {/* Chat messages */}
          <div className="p-3 space-y-2.5 bg-gradient-to-b from-amber-50/30 to-white min-h-[260px]">
            {/* AI message */}
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-amber-700" />
              </div>
              <div className="bg-amber-50 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%] border border-amber-100/60">
                <p className="text-[11px] text-stone-700 leading-relaxed font-body">
                  Mesélj nekem a gyerekkorodról! Hol nőttél fel, és mi az első emléked?
                </p>
              </div>
            </div>
            {/* User message */}
            <div className="flex justify-end">
              <div className="bg-amber-800 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                <p className="text-[11px] text-amber-50 leading-relaxed font-body">
                  Miskolcon nőttem fel, a Szinva parton. Az első emlékem az, amikor nagyapámmal mentünk horgászni a Sajóra...
                </p>
              </div>
            </div>
            {/* AI message */}
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-amber-700" />
              </div>
              <div className="bg-amber-50 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%] border border-amber-100/60">
                <p className="text-[11px] text-stone-700 leading-relaxed font-body">
                  Ez gyönyörű emlék! Hány éves lehettél? És milyen volt a nagyapád — mesélsz róla többet?
                </p>
              </div>
            </div>
            {/* Typing indicator */}
            <div className="flex gap-2 items-end">
              <div className="w-6 h-6 rounded-full bg-stone-100 shrink-0" />
              <div className="flex gap-1 px-3 py-2.5">
                <div className="w-1.5 h-1.5 bg-stone-400 rounded-full typing-dot" />
                <div className="w-1.5 h-1.5 bg-stone-400 rounded-full typing-dot" />
                <div className="w-1.5 h-1.5 bg-stone-400 rounded-full typing-dot" />
              </div>
            </div>
          </div>
          {/* Input bar */}
          <div className="border-t px-3 py-2 flex items-center gap-2">
            <div className="flex-1 bg-stone-100 rounded-full px-3 py-1.5 text-[10px] text-stone-400 font-body">
              Írj üzenetet...
            </div>
            <Mic className="w-4 h-4 text-stone-400" />
          </div>
        </div>
      </div>
    </div>
  )
}


// ── Memory category cards ─────────────────────────────────────────────────────

const MEMORY_CATEGORIES = [
  { icon: Baby, label: 'Gyerekkor', desc: 'családi történetek', color: '#3b82f6', bg: '#eff6ff' },
  { icon: Heart, label: 'Kapcsolatok', desc: 'szerelmek, barátok', color: '#ec4899', bg: '#fdf2f8' },
  { icon: GraduationCap, label: 'Tanulás', desc: 'iskolák, tanárok', color: '#a855f7', bg: '#faf5ff' },
  { icon: Briefcase, label: 'Munka', desc: 'karrierútak', color: '#22c55e', bg: '#f0fdf4' },
  { icon: Home, label: 'Otthon', desc: 'lakások, költözések', color: '#14b8a6', bg: '#f0fdfa' },
  { icon: Plane, label: 'Utazások', desc: 'nyaralások, felfedezések', color: '#f59e0b', bg: '#fffbeb' },
  { icon: Star, label: 'Fordulópontok', desc: 'döntések, sikerek', color: '#ef4444', bg: '#fef2f2' },
  { icon: Users, label: 'Társaság', desc: 'közösségek, csapatok', color: '#6366f1', bg: '#eef2ff' },
]

// ── Feature showcase ──────────────────────────────────────────────────────────

const FEATURES = [
  { icon: BookOpen, label: 'Életrajz', desc: 'Rendezett, olvasható személyes történet' },
  { icon: Clock, label: 'Idővonal', desc: 'Események vizuális időrendje' },
  { icon: MapPin, label: 'Térkép', desc: 'Helyszínek a világtérképen' },
  { icon: Users, label: 'Kapcsolatok', desc: 'Fontos emberek és kapcsolati háló' },
]

// ── Screenshot slider képek ───────────────────────────────────────────────────
// Ide kerülnek majd a screenshots/ mappából feltöltött képek
const SCREENSHOTS: string[] = [
  '/screenshots/Screenshot 2026-04-06 at 6.16.23.png',
  '/screenshots/Screenshot 2026-04-06 at 6.16.44.png',
  '/screenshots/Screenshot 2026-04-06 at 6.17.24.png',
  '/screenshots/Screenshot 2026-04-06 at 6.17.37.png',
  '/screenshots/Screenshot 2026-04-06 at 6.17.52.png',
  '/screenshots/Screenshot 2026-04-06 at 6.18.24.png',
  '/screenshots/Screenshot 2026-04-06 at 6.18.34.png',
  '/screenshots/Screenshot 2026-04-06 at 6.18.51.png',
  '/screenshots/Screenshot 2026-04-06 at 6.19.11.png',
  '/screenshots/Screenshot 2026-04-06 at 6.19.33.png',
]

// ── Main component ────────────────────────────────────────────────────────────

export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  useScrollReveal()

  return (
    <div className="relative min-h-screen font-body bg-[#f8f4ee]">
      {/* Full-page mosaic background */}
      <MosaicBackground opacity={0.45} />

      <div className="relative z-10">
        {/* ═══════════════════════════════════════════════════════════════════
            NAVIGATION
        ═══════════════════════════════════════════════════════════════════ */}
        <nav className="sticky top-0 z-50 bg-[#f8f4ee]/80 backdrop-blur-xl border-b border-amber-200/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-amber-800" />
              <span className="font-serif font-bold text-xl text-amber-900 tracking-tight">Emlékkönyv</span>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-stone-500 font-body">
              <a href="#hogyan" className="hover:text-amber-800 transition-colors">Hogyan működik</a>
              <a href="#funkciok" className="hover:text-amber-800 transition-colors">Funkciók</a>
              <a href="#vonj-be" className="hover:text-amber-800 transition-colors">Vond be a családod</a>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-stone-600 font-body" onClick={onLogin}>
                Belépés
              </Button>
              <Button size="sm" className="bg-amber-800 hover:bg-amber-900 text-white font-body shadow-md shadow-amber-900/20" onClick={onRegister}>
                Regisztráció
              </Button>
            </div>
          </div>
        </nav>

        {/* ═══════════════════════════════════════════════════════════════════
            1. HERO
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="min-h-[90vh] flex items-center relative overflow-hidden">
          {/* Floating decorative shapes */}
          <div className="absolute top-20 left-[8%] w-16 h-16 rounded-xl bg-amber-200/30 rotate-12 float-slow hidden lg:block" />
          <div className="absolute top-40 right-[12%] w-12 h-12 rounded-lg bg-stone-300/20 -rotate-6 float-medium hidden lg:block" />
          <div className="absolute bottom-32 left-[15%] w-10 h-10 rounded-md bg-amber-300/20 rotate-45 float-medium hidden lg:block" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: Text */}
              <div className="text-center lg:text-left">
                <h1 className="font-serif font-bold text-5xl sm:text-6xl lg:text-7xl text-stone-800 tracking-tight leading-[1.05] mb-3">
                  {'Emlékkönyv'.split('').map((ch, i) => (
                    <span key={i} className="hero-letter" style={{ animationDelay: `${i * 0.06}s` }}>
                      {ch}
                    </span>
                  ))}
                </h1>
                <p className="text-xl sm:text-2xl gradient-text font-serif font-semibold mb-6 reveal">
                  Rakd össze életed mozaikját
                </p>
                <p className="text-stone-600 text-base sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0 mb-4 reveal reveal-delay-1">
                  Az életünk fontos történetei ritkán állnak készen, szépen sorba rendezve előttünk.
                  Inkább apró emlékekben, helyszínekben és félmondatokban élnek bennünk.
                </p>
                <p className="text-stone-500 text-base leading-relaxed max-w-lg mx-auto lg:mx-0 mb-8 reveal reveal-delay-2">
                  Az Emlékkönyv egy AI-alapú beszélgetőtárs, amely segít felidézni, összerendezni
                  és megőrizni a saját történetedet.
                </p>
                <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3 mb-6 reveal reveal-delay-3">
                  <Button size="lg" className="bg-amber-800 hover:bg-amber-900 text-white px-8 text-base shadow-xl shadow-amber-900/20 font-body" onClick={onLogin}>
                    Belépek <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button size="lg" variant="outline" className="border-stone-300 text-stone-700 hover:bg-white/80 px-8 text-base font-body" onClick={onRegister}>
                    Regisztrálok
                  </Button>
                </div>
                <p className="text-base text-stone-500 italic font-serif reveal reveal-delay-4">
                  Fogsz rá emlékezni? Fognak rád emlékezni?
                </p>
              </div>

              {/* Right: Mosaic illustration + Chat preview */}
              <div className="relative reveal reveal-delay-2 hidden lg:block">
                <div className="absolute -inset-8 bg-gradient-to-br from-amber-100/40 to-stone-200/20 rounded-3xl blur-2xl" />
                <div className="relative">
                  <ChatIllustration />
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 scroll-indicator">
            <ArrowDown className="w-5 h-5 text-amber-700/50" />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            2. BESZÉLGESS (with storyteller illustration)
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="py-20 sm:py-28 bg-gradient-to-b from-amber-50/70 to-[#f8f4ee]/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Text */}
              <div className="order-2 lg:order-1">
                <div className="flex items-center gap-3 mb-4 reveal">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center">
                    <PenLine className="w-5 h-5 text-amber-800" />
                  </div>
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl text-stone-800">
                    Beszélgess a saját életrajzíróddal
                  </h2>
                </div>
                <p className="text-stone-600 leading-relaxed mb-4 reveal reveal-delay-1">
                  Sokan érzik, hogy egyszer jó lenne végre leírni az életüket, de kevesen tudják,
                  hogyan kezdjenek hozzá. Mesélni viszont sokkal természetesebb.
                </p>
                <p className="text-stone-600 leading-relaxed mb-6 reveal reveal-delay-2">
                  Az Emlékkönyv úgy működik, mint egy figyelmes, türelmes életrajzíró. Kérdez,
                  visszakérdez, segít felidézni a fontos korszakokat, és közben folyamatosan rendezi
                  az elhangzottakat.
                </p>
                <div className="bg-white/70 backdrop-blur rounded-2xl p-5 border border-amber-100/80 reveal reveal-delay-3">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-3 font-body">A beszélgetésekből összeáll</p>
                  <ul className="space-y-2.5">
                    {[
                      'a személyes életutad',
                      'a fontos emberek és kapcsolatok köre',
                      'a jelentős helyszínek és időszakok',
                      'az élmények, amelyek formálták az életedet',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-stone-600">
                        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                          <ChevronRight className="w-3 h-3 text-amber-700" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {/* Storyteller illustration */}
              <div className="order-1 lg:order-2 reveal reveal-delay-2">
                <img src="/images/storyteller.jpg" alt="Mesélő ember" className="w-full max-w-md mx-auto rounded-2xl shadow-xl border border-amber-100/50" />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            3. NEM KELL ELŐKÉSZÜLET — lépések
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="hogyan" className="py-20 sm:py-28">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="font-serif font-bold text-3xl sm:text-4xl text-stone-800 text-center mb-3 reveal">
              Nem kell hozzá előkészület
            </h2>
            <p className="text-stone-500 text-center max-w-md mx-auto mb-14 reveal reveal-delay-1">
              Kis lépésekben, természetes módon halad veled.
            </p>
            <div className="relative">
              <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-[2px] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-300 hidden sm:block" />
              <div className="space-y-12 sm:space-y-16">
                {[
                  {
                    num: '1', icon: Mic, title: 'Elkezdesz mesélni',
                    text: 'Leírhatod, ami eszedbe jut, vagy ha kényelmesebb, el is mondhatod. Nem kell szép mondatokban fogalmazni.',
                    accent: '#d97706',
                  },
                  {
                    num: '2', icon: MessageSquare, title: 'Az Emlékkönyv kérdez',
                    text: 'A rendszer finoman végigvezet a múltad különböző szakaszain, és olyan részletekre is rákérdez, amik magadtól nem jutnának eszedbe.',
                    accent: '#b45309',
                  },
                  {
                    num: '3', icon: BookOpen, title: 'Összeáll az életutad',
                    text: 'A beszélgetésekből fokozatosan kirajzolódik egy rendezett, átlátható személyes történet, amelyet bármikor bővíthetsz.',
                    accent: '#92400e',
                  },
                ].map((step, i) => {
                  const Icon = step.icon
                  return (
                    <div key={i} className="flex gap-5 sm:gap-8 reveal" style={{ transitionDelay: `${i * 0.15}s` }}>
                      <div className="relative z-10 shrink-0">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg pulse-glow" style={{ backgroundColor: step.accent }}>
                          <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                        </div>
                      </div>
                      <div className="pt-1 sm:pt-3">
                        <span className="text-xs font-bold text-amber-700/60 font-body block mb-1.5">{step.num}. LÉPÉS</span>
                        <h3 className="font-serif font-bold text-xl sm:text-2xl text-stone-800 mb-2">{step.title}</h3>
                        <p className="text-stone-600 leading-relaxed max-w-lg font-body">{step.text}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            4. MILYEN EMLÉKEK — icon grid
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="py-20 sm:py-28 bg-gradient-to-b from-stone-100/70 to-[#f8f4ee]/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="font-serif font-bold text-3xl sm:text-4xl text-stone-800 mb-3 reveal">
                Minden fontos ember, hely és történet
              </h2>
              <p className="text-stone-500 max-w-xl mx-auto reveal reveal-delay-1">
                Az életünk nem csak nagy fordulópontokból áll. Sokszor a kisebb jelenetek
                maradnak velünk a legtovább.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {MEMORY_CATEGORIES.map((cat, i) => {
                const Icon = cat.icon
                return (
                  <div key={i} className="card-hover reveal rounded-2xl p-5 text-center border border-stone-100 cursor-default"
                    style={{ backgroundColor: cat.bg, transitionDelay: `${i * 0.08}s` }}>
                    <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${cat.color}18` }}>
                      <Icon className="w-6 h-6" style={{ color: cat.color }} />
                    </div>
                    <h3 className="font-semibold text-sm text-stone-800 mb-0.5 font-body">{cat.label}</h3>
                    <p className="text-xs text-stone-500 font-body">{cat.desc}</p>
                  </div>
                )
              })}
            </div>
            <p className="text-center text-base text-stone-500 italic font-serif mt-8 reveal">
              Az első szerelem, egy emlékezetes szilveszter, egy hosszú nyár —<br className="hidden sm:block" />
              itt mindennek lehet helye, ami valaha számított.
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            5. TÖBB NÉZŐPONTBÓL — funkciók + screenshot slider
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="funkciok" className="py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="font-serif font-bold text-3xl sm:text-4xl text-stone-800 mb-3 text-center reveal">
              Több nézőpontból is visszanézheted
            </h2>
            <p className="text-stone-500 mb-12 text-center max-w-xl mx-auto reveal reveal-delay-1">
              Nem csak szöveget gyűjt — többféleképpen rá tudsz nézni a saját múltadra.
            </p>
            {/* 4 feature cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
              {FEATURES.map((feat, i) => {
                const Icon = feat.icon
                return (
                  <div key={i} className="card-hover reveal flex flex-col items-center gap-3 bg-white/60 backdrop-blur rounded-2xl p-6 border border-stone-100 text-center"
                    style={{ transitionDelay: `${i * 0.1}s` }}>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-amber-800" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-stone-800 font-body">{feat.label}</h4>
                      <p className="text-xs text-stone-500 font-body mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Screenshot slider — megjelenik ha vannak screenshotok */}
            {SCREENSHOTS.length > 0 ? (
              <ScreenshotSlider images={SCREENSHOTS} />
            ) : (
              /* Placeholder amíg nincsenek screenshotok */
              <div className="reveal reveal-delay-2">
                <img src="/images/mosaic-tree.jpg" alt="Életfa mozaik" className="w-full max-w-2xl mx-auto rounded-2xl shadow-lg border border-amber-100/50" />
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            6. VOND BE — közös múlt
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="vonj-be" className="py-20 sm:py-28 bg-gradient-to-b from-amber-50/60 to-[#f8f4ee]/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-10 items-center">
              <div className="lg:col-span-3">
                <div className="flex items-center gap-3 mb-4 reveal">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-amber-800" />
                  </div>
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl text-stone-800">
                    Vond be családodat, barátaidat
                  </h2>
                </div>
                <p className="text-stone-600 leading-relaxed mb-4 reveal reveal-delay-1">
                  Sok emlék nem csak benned él. Egy testvér más részletekre emlékszik, egy régi barát
                  felidézhet egy elfelejtett pillanatot. Az Emlékkönyv lehetőséget ad arra, hogy
                  másokat is bevonj a közös múlt feltérképezésébe.
                </p>
                <div className="space-y-2 reveal reveal-delay-2">
                  {[
                    'testvérekkel közös gyerekkori történetek',
                    'családi események felidézése',
                    'régi barátságok újra összerakása',
                    'gyerekeknek, unokáknak szánt emlékanyag',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm text-stone-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2 reveal reveal-delay-2">
                <img src="/images/family.jpg" alt="Családi emlékek" className="w-full rounded-2xl shadow-lg border border-amber-100/50" />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            7. BIZTONSÁG
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="py-20 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="bg-white/70 backdrop-blur rounded-3xl p-8 sm:p-12 border border-stone-100 text-center reveal">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
                <Shield className="w-8 h-8 text-amber-800" />
              </div>
              <h2 className="font-serif font-bold text-3xl sm:text-4xl text-stone-800 mb-4">
                A történeted felett te rendelkezel
              </h2>
              <p className="text-stone-600 leading-relaxed max-w-2xl mx-auto mb-6">
                Az ember élettörténete nem egyszerű adat. Az Emlékkönyv arra épül, hogy a saját múltadról
                te dönthess — mit őrzöl meg, mit osztasz meg, és mit tartasz meg teljesen magadnak.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { icon: Lock, text: 'Titkosított tárolás' },
                  { icon: Eye, text: 'Te irányítod a hozzáférést' },
                  { icon: Shield, text: 'Nem nyilvános felület' },
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="flex items-center gap-2 bg-amber-50/80 rounded-full px-4 py-2 text-sm text-amber-900 font-body border border-amber-200/50">
                      <Icon className="w-4 h-4" />
                      {item.text}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            11. ZÁRÓ — emotional CTA
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="py-20 sm:py-28">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="relative bg-gradient-to-br from-amber-800 to-amber-950 rounded-3xl p-8 sm:p-14 text-center overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/10 rounded-full -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400/10 rounded-full translate-y-1/2 -translate-x-1/3" />

              <div className="relative z-10">
                <h2 className="font-serif font-bold text-3xl sm:text-4xl text-amber-50 mb-5 reveal">
                  Az életünk nem csak akkor fontos,<br className="hidden sm:block" />
                  amikor éppen történik
                </h2>
                <p className="text-amber-200/80 leading-relaxed max-w-2xl mx-auto mb-4 reveal reveal-delay-1">
                  Vannak történetek, amelyekről azt hisszük, mindig emlékezni fogunk rájuk.
                  Aztán telnek az évek, és a részletek lassan halványodni kezdenek.
                </p>
                <p className="text-amber-100/90 leading-relaxed max-w-2xl mx-auto mb-10 reveal reveal-delay-2">
                  Az Emlékkönyv azért született, hogy ezek a történetek ne tűnjenek el nyomtalanul.
                  Hogy legyen helye annak, aki voltál, amit átéltél, és amit egyszer talán mások is
                  szeretnének megérteni belőled.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 reveal reveal-delay-3">
                  <Button size="lg" className="bg-white text-amber-900 hover:bg-amber-50 px-8 text-base font-semibold shadow-xl font-body" onClick={onLogin}>
                    Belépek <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button size="lg" variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:border-white/80 hover:text-white px-8 text-base font-body" onClick={onRegister}>
                    Regisztrálok
                  </Button>
                </div>
                <p className="text-base text-amber-200 italic font-serif reveal reveal-delay-4">
                  Kezdd el akkor, amikor jólesik. A történeted már ott van benned.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════════════════════════════ */}
        <footer className="py-10 px-4 text-center border-t border-stone-200/60">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-amber-800" />
            <span className="font-serif font-bold text-lg text-amber-900">Emlékkönyv</span>
          </div>
          <p className="text-xs text-stone-400 font-body">
            © {new Date().getFullYear()} Emlékkönyv — www.emlekkonyv.com
          </p>
        </footer>
      </div>
    </div>
  )
}
