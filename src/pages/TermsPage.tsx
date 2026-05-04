import { BookOpen, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TermsPage() {
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-serif font-bold text-3xl text-amber-950 mb-2">Felhasználási feltételek</h1>
        <p className="text-sm text-stone-400 mb-10">Utolsó frissítés: 2026. április</p>

        <div className="prose prose-stone max-w-none space-y-8 text-stone-700 leading-relaxed">

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">1. A szolgáltatás</h2>
            <p>
              Az Emlékkönyv (<strong>www.emlekkonyv.com</strong>) egy személyes élettörténet-rögzítő alkalmazás,
              amelyet az <strong>Arworks Kft.</strong> üzemeltet. A szolgáltatás mesterséges intelligencia
              segítségével segíti a felhasználókat emlékeik rendszerezésében és megőrzésében.
            </p>
            <p className="mt-2">
              A regisztrációval elfogadod az alábbi feltételeket. Ha nem értesz egyet velük,
              kérjük, ne használd a szolgáltatást.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">2. Regisztráció és fiók</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>A szolgáltatás használatához érvényes e-mail cím szükséges.</li>
              <li>Legalább 16 éves életkor szükséges a regisztrációhoz.</li>
              <li>A fiókod biztonságáért te vagy felelős — jelszavadat tartsd titokban.</li>
              <li>Felhasználónként egy aktív fiók engedélyezett.</li>
              <li>Fiókod bármikor törölheted a beállítások menüpontból.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">3. A tartalom tulajdonjoga</h2>
            <p>
              <strong>A te tartalmad a tiéd.</strong> Az alkalmazásba bevitt minden szöveg, emlék, adat
              kizárólag a tiéd marad. Az Arworks Kft. nem szerez tulajdonjogot a tartalmad felett,
              és nem használja fel azt más célra (pl. hirdetés, AI-tréning) a te hozzájárulásod nélkül.
            </p>
            <p className="mt-2">
              Az AI által generált összefoglalók, rendszerezések és kérdések az alkalmazás részeként
              a te fiókodhoz kötve kerülnek tárolásra.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">4. Elfogadható használat</h2>
            <p>A szolgáltatást kizárólag személyes, nem kereskedelmi célra használhatod. Tilos:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>más személyek adatait a hozzájárulásuk nélkül rögzíteni</li>
              <li>a rendszert jogosulatlan hozzáférés megszerzésére használni</li>
              <li>automatizált eszközökkel (botok, scraperck) adatokat kinyerni</li>
              <li>illegális, gyűlöletre uszító vagy káros tartalmat tárolni</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">5. AI-szolgáltatás korlátai</h2>
            <p>
              Az alkalmazás mesterséges intelligencia segítségével dolgozza fel és rendszerezi az általad
              megosztott információkat. Az AI válaszai tájékoztató jellegűek, és nem minősülnek
              szakmai tanácsadásnak (orvosi, jogi, pszichológiai stb.).
            </p>
            <p className="mt-2">
              Az AI-modell időnként pontatlan, hiányos vagy félreérthető válaszokat adhat.
              A generált tartalmakat mindig ellenőrizd és szükség esetén javítsd.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">6. Adatok és tárolás</h2>
            <p>
              A tárolás helye a te választásod alapján eltér (felhő, Google Drive, lokális).
              Részletesen lásd az <a href="/privacy" className="text-amber-800 underline">Adatvédelmi irányelvekben</a>.
              Felhő módban az adataid az EU területén tárolódnak, titkosítva.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">7. Elérhetőség és változtatások</h2>
            <p>
              Törekszünk arra, hogy a szolgáltatás folyamatosan elérhető legyen, de nem vállalunk
              garanciát 100%-os rendelkezésre állásra. Fenntartjuk a jogot a szolgáltatás
              módosítására, szüneteltetésére vagy megszüntetésére — ebben az esetben előzetesen értesítünk.
            </p>
            <p className="mt-2">
              A felhasználási feltételek módosítása esetén e-mailben értesítünk. A folyamatos
              használat az újabb feltételek elfogadását jelenti.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">8. Felelősségkorlátozás</h2>
            <p>
              Az Arworks Kft. nem vállal felelősséget a szolgáltatás használatából eredő közvetett
              károkért, adatvesztésért (különösen lokális tárolás esetén), vagy harmadik fél
              platformok (Google Drive, Supabase) hibájából bekövetkező problémákért.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">9. Irányadó jog</h2>
            <p>
              Ezekre a feltételekre a magyar jog az irányadó. Vitás kérdések esetén a felek
              elsőként tárgyalásos úton kísérelik meg a megegyezést.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">10. Kapcsolat</h2>
            <p>
              Kérdés esetén írj nekünk:{' '}
              <a href="mailto:info@emlekkonyv.com" className="text-amber-800 underline">info@emlekkonyv.com</a>
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-stone-200/60 py-8 text-center">
        <p className="text-xs text-stone-400">© {new Date().getFullYear()} Emlékkönyv — www.emlekkonyv.com</p>
      </footer>
    </div>
  )
}
