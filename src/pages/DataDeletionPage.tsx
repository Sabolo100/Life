import { BookOpen, ArrowLeft, Trash2, Mail, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DataDeletionPage() {
  // Show confirmation if ?code= present in URL
  const code = new URLSearchParams(window.location.search).get('code')

  return (
    <div className="min-h-screen bg-[#f8f4ee]">
      {/* Header */}
      <header className="border-b border-stone-200/60 bg-[#faf7f2]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Vissza
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-800" />
            <span className="font-serif font-bold text-amber-900">Emlékkönyv</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="font-serif font-bold text-3xl text-amber-950">Adattörlési kérelem</h1>
        </div>

        {code ? (
          /* Confirmation state — shown when Facebook redirects back with ?code= */
          <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="font-serif font-semibold text-xl text-green-900 mb-2">Kérelem rögzítve</h2>
            <p className="text-green-800 mb-4">
              Az adattörlési kérelmed beérkezett. Azonosítód:
            </p>
            <code className="inline-block bg-white border border-green-200 rounded-lg px-4 py-2 font-mono text-lg font-bold text-green-900 mb-4">
              {code}
            </code>
            <p className="text-sm text-green-700">
              30 napon belül emailben értesítünk a törlés elvégzéséről.
            </p>
          </div>
        ) : (
          /* Default state */
          <div className="space-y-6">
            <p className="text-stone-600 leading-relaxed text-base">
              Ha szeretnéd törölni az Emlékkönyv alkalmazással kapcsolatos Facebook adataidat,
              kérjük vedd fel velünk a kapcsolatot.
            </p>

            <div className="rounded-2xl border border-amber-200/60 bg-[#faf7f2] divide-y divide-stone-100">
              <div className="flex items-start gap-4 p-5">
                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-amber-800" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-700 mb-1">Kapcsolat</p>
                  <a
                    href="mailto:info@emlekkonyv.com?subject=Adattörlési kérelem"
                    className="text-amber-800 hover:text-amber-900 underline underline-offset-2 font-medium"
                  >
                    info@emlekkonyv.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5">
                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-amber-800" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-700 mb-1">Határidő</p>
                  <p className="text-stone-600 text-sm">Az adattörlési kérelmet 30 napon belül teljesítjük.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5">
                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-amber-800" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-700 mb-1">Visszaigazolás</p>
                  <p className="text-stone-600 text-sm">A törlés visszaigazolását emailben küldjük el.</p>
                </div>
              </div>
            </div>

            <a
              href="mailto:info@emlekkonyv.com?subject=Adattörlési kérelem"
              className="inline-block"
            >
              <Button className="gap-2">
                <Mail className="w-4 h-4" /> Kérelem küldése emailben
              </Button>
            </a>
          </div>
        )}
      </main>

      <footer className="border-t border-stone-200/60 py-8 text-center">
        <p className="text-xs text-stone-400">© {new Date().getFullYear()} Emlékkönyv — www.emlekkonyv.com</p>
      </footer>
    </div>
  )
}
