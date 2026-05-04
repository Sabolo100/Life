import { BookOpen, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PrivacyPage() {
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
        <h1 className="font-serif font-bold text-3xl text-amber-950 mb-2">Adatvédelmi irányelvek</h1>
        <p className="text-sm text-stone-400 mb-10">Utolsó frissítés: 2026. április</p>

        <div className="prose prose-stone max-w-none space-y-8 text-stone-700 leading-relaxed">

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">1. Az adatkezelő</h2>
            <p>
              Az Emlékkönyv szolgáltatást az <strong>Arworks Kft.</strong> (székhely: Magyarország) üzemelteti.
              Az alkalmazás célja személyes élettörténetek rögzítése, rendszerezése és megőrzése mesterséges intelligencia segítségével.
            </p>
            <p className="mt-2">
              Kapcsolat: <a href="mailto:info@emlekkonyv.com" className="text-amber-800 underline">info@emlekkonyv.com</a>
            </p>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">2. Milyen adatokat gyűjtünk?</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Regisztrációs adatok:</strong> e-mail cím, jelszó (titkosítva tárolva Supabase Auth-ban).</li>
              <li><strong>Profil beállítások:</strong> tárolási preferencia, onboarding állapot.</li>
              <li><strong>Élettörténet-tartalom:</strong> a te saját emlékeid, személyek, helyszínek, időszakok, érzelmek — ezeket kizárólag a te által választott helyen tároljuk (lásd 3. pont).</li>
              <li><strong>Technikai naplók:</strong> szerver-oldali hibanaplók, amelyek nem tartalmaznak személyes tartalmat.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">3. Hol tárolódnak az adataid?</h2>
            <p>Az alkalmazás három tárolási módot kínál — te választod meg:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>
                <strong>Emlékkönyv felhő:</strong> az adatok titkosítottan a mi Supabase adatbázisunkban tárolódnak
                (EU régió, Írország). A hozzáférés kizárólag a te fiókodhoz kötött.
              </li>
              <li>
                <strong>Google Drive:</strong> az adatok kizárólag a saját Google Drive-fiókodban, egy
                <em>Emlékkönyv (ne töröld!)</em> nevű mappában tárolódnak. Mi nem férünk hozzá.
              </li>
              <li>
                <strong>Lokális tárolás:</strong> az adatok kizárólag a te eszközödön, egy általad kiválasztott
                mappában tárolódnak. Nem kerülnek semmilyen szerverre.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">4. AI-feldolgozás</h2>
            <p>
              Amikor az alkalmazásban AI-val beszélgetsz, a kérdésed és a vonatkozó kontextus áthalad
              a szerverünkön, hogy ott hívjuk meg az AI modellt (Anthropic Claude). Ez az átvitel
              titkosított (HTTPS). <strong>Az AI-val folytatott beszélgetéseket nem tároljuk</strong> a szerveren —
              a válasz közvetlenül a te választott tárolási helyedre íródik.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">5. Harmadik felek</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Supabase:</strong> hitelesítés és (felhő módban) adattárolás. <a href="https://supabase.com/privacy" className="text-amber-800 underline" target="_blank" rel="noopener">Supabase adatvédelmi irányelvek</a>.</li>
              <li><strong>Anthropic:</strong> AI feldolgozás. <a href="https://www.anthropic.com/privacy" className="text-amber-800 underline" target="_blank" rel="noopener">Anthropic adatvédelmi irányelvek</a>.</li>
              <li><strong>Google:</strong> Google Drive tárolás (ha ezt választod), Google OAuth bejelentkezés. <a href="https://policies.google.com/privacy" className="text-amber-800 underline" target="_blank" rel="noopener">Google adatvédelmi irányelvek</a>.</li>
              <li><strong>Vercel:</strong> webalkalmazás hosting. Az alkalmazás statikus fájljait és API-kéréseit kezeli.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">6. Sütik (cookie-k)</h2>
            <p>
              Az alkalmazás kizárólag funkcionálisan szükséges sütiket használ (munkamenet-kezelés, hitelesítési token).
              Nyomkövető vagy marketing célú sütiket nem alkalmazunk.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">7. A te jogaid (GDPR)</h2>
            <p>Az EU GDPR alapján jogod van:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>hozzáférni a rólad tárolt adatokhoz</li>
              <li>kérni azok helyesbítését vagy törlését</li>
              <li>az adatkezelés korlátozását kérni</li>
              <li>adataidat hordozható formátumban (JSON, PDF) exportálni</li>
              <li>visszavonni a hozzájárulásodat bármikor</li>
            </ul>
            <p className="mt-3">
              Kérelmedet az <a href="mailto:info@emlekkonyv.com" className="text-amber-800 underline">info@emlekkonyv.com</a> címre küldheted.
              Fiókod és minden adatod törlését a beállításokban magad is elvégezheted.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">8. Adatmegőrzés</h2>
            <p>
              A felhő módban tárolt adatokat a fiók törlésétől számított 30 napon belül véglegesen töröljük.
              Google Drive és lokális módban az adatok törlése teljes mértékben a te kezedben van.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-xl text-amber-900 mb-3">9. Változtatások</h2>
            <p>
              Az adatvédelmi irányelveket szükség esetén frissítjük. Lényeges változásról e-mailben értesítünk.
              A folyamatos használat az újabb irányelvek elfogadását jelenti.
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
