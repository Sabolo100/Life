import { MosaicBackground } from '@/components/MosaicBackground'
import { BookOpen, MessageSquare, Map, Clock, Users, Shield, ChevronRight, Mic, PenLine, Search, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LandingPageProps {
  onLogin: () => void
  onRegister: () => void
}

export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  return (
    <div className="relative min-h-screen">
      {/* Mosaic background — full page */}
      <MosaicBackground />

      {/* Content layer */}
      <div className="relative z-10">
        {/* ── Navigation ─────────────────────────────────────────────── */}
        <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-stone-200/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-800" />
              <span className="font-semibold text-amber-900 tracking-tight">Emlékkönyv</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-stone-700" onClick={onLogin}>
                Belépés
              </Button>
              <Button size="sm" className="bg-amber-800 hover:bg-amber-900 text-white" onClick={onRegister}>
                Regisztráció
              </Button>
            </div>
          </div>
        </nav>

        {/* ── 1. HERO ─────────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 sm:p-12 shadow-sm border border-white/80">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-800 tracking-tight leading-tight mb-4">
              Emlékkönyv
            </h1>
            <p className="text-lg sm:text-xl text-amber-800 font-medium mb-6">
              Rakd össze életed mozaikját
            </p>
            <p className="text-stone-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-8">
              Az életünk fontos történetei ritkán állnak készen, szépen sorba rendezve előttünk.
              Inkább apró emlékekben, helyszínekben, emberekben, korszakokban és félmondatokban
              élnek bennünk.
            </p>
            <p className="text-stone-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-10">
              Az Emlékkönyv egy AI-alapú beszélgetőtárs, amely segít felidézni, összerendezni
              és megőrizni a saját történetedet. Család, barátok, utazások, munkahelyek,
              fordulópontok, sikerek, veszteségek, különleges esték és hétköznapi pillanatok —
              minden lassan a helyére kerül.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <Button size="lg" className="bg-amber-800 hover:bg-amber-900 text-white px-8 text-base" onClick={onLogin}>
                Belépek
              </Button>
              <Button size="lg" variant="outline" className="border-stone-400 text-stone-700 hover:bg-white/80 px-8 text-base" onClick={onRegister}>
                Regisztrálok
              </Button>
            </div>
            <p className="text-sm text-stone-500 italic leading-relaxed max-w-lg mx-auto">
              Fogsz rá emlékezni? Fognak rád emlékezni?<br />
              Az Emlékkönyv segít megőrizni azt, aki voltál, amit átéltél, és amit érdemes továbbadni.
            </p>
          </div>
        </section>

        {/* ── 2. MOZAIK BLOKK ─────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 sm:p-10 border border-white/70">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-4">
              Minden élet apró darabokból áll össze
            </h2>
            <p className="text-stone-600 leading-relaxed mb-4">
              Vannak emlékek, amelyek élesen élnek bennünk, és vannak olyanok is, amelyek csak
              egy helyszín, egy név, egy nyár vagy egy régi történet foszlányaként maradnak meg.
              Nem vesznek el teljesen, csak szétszóródnak bennünk az évek során.
            </p>
            <p className="text-stone-600 leading-relaxed">
              Az Emlékkönyv ebben segít. Beszélgetésről beszélgetésre újra előkerülnek ezek a
              darabok, és lassan összeállnak egy nagyobb, teljesebb képpé. Mint egy mozaik,
              amelynek minden eleme a saját helyére kerül.
            </p>
          </div>
        </section>

        {/* ── 3. MI EZ PONTOSAN ───────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 sm:p-10 border border-white/70">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <PenLine className="w-5 h-5 text-amber-800" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-800">
                Beszélgess a saját életrajzíróddal
              </h2>
            </div>
            <p className="text-stone-600 leading-relaxed mb-4">
              Sokan érzik, hogy egyszer jó lenne végre leírni az életüket, de kevesen tudják,
              hogyan kezdjenek hozzá. Egy üres dokumentum előtt ülni nehéz, mesélni viszont
              sokkal természetesebb.
            </p>
            <p className="text-stone-600 leading-relaxed mb-6">
              Az Emlékkönyv úgy működik, mint egy figyelmes, türelmes életrajzíró. Kérdez,
              visszakérdez, segít felidézni a fontos korszakokat, és közben folyamatosan rendezi
              az elhangzottakat. Nem kell egyszerre mindent összefoglalnod — elég, ha elkezdesz
              mesélni, a többi fokozatosan kialakul.
            </p>
            <div className="bg-amber-50/80 rounded-xl p-5 border border-amber-100/80">
              <p className="text-sm font-medium text-stone-700 mb-3">A beszélgetésekből lassan összeáll:</p>
              <ul className="space-y-2">
                {[
                  'a személyes életutad',
                  'a fontos emberek és kapcsolatok köre',
                  'a jelentős helyszínek és időszakok',
                  'azok az élmények, amelyek igazán formálták az életedet',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-stone-600">
                    <ChevronRight className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── 4. MILYEN EMLÉKEK ────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 sm:p-10 border border-white/70">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Heart className="w-5 h-5 text-rose-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-800">
                Minden fontos ember, hely és történet helyet kaphat benne
              </h2>
            </div>
            <p className="text-stone-600 leading-relaxed mb-6">
              Az életünk nem csak nagy fordulópontokból áll. Sokszor éppen azok a kisebb jelenetek
              maradnak velünk a legtovább, amelyekről nem is gondolnánk, hogy egyszer ennyire
              fontosak lesznek.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                'gyerekkori emlékek és családi történetek',
                'testvérek, nagyszülők, barátok, szerelmek',
                'iskolák, tanárok, első munkahelyek',
                'költözések, városok, falvak, lakások',
                'nyaralások, ünnepek, különleges utazások',
                'szakmai sikerek, döntések, újrakezdések',
                'veszteségek, nehezebb időszakok, tanulságok',
                'dátumok, időszakok, visszatérő szereplők',
              ].map(item => (
                <div key={item} className="flex items-start gap-2 text-sm text-stone-600 bg-white/50 rounded-lg p-3 border border-stone-100">
                  <ChevronRight className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <p className="text-stone-500 text-sm mt-5 italic">
              Az első szerelem, az első repülőút, egy emlékezetes szilveszter, egy régi baráti
              társaság, egy hosszú nyár vagy egy meghatározó beszélgetés — itt mindennek lehet
              helye, ami valaha számított.
            </p>
          </div>
        </section>

        {/* ── 5. MIÉRT JÓ EZ NEKED ────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 sm:p-10 border border-white/70">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-4">
              Nem csak felidézed a múltat, hanem meg is őrzöd
            </h2>
            <p className="text-stone-600 leading-relaxed mb-6">
              Amikor az ember mesélni kezd a saját életéről, gyakran nem csak emlékezik, hanem
              jobban meg is érti önmagát. Az Emlékkönyv ebben ad valódi értéket: nem hagyja,
              hogy a történeteid különálló foszlányok maradjanak.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: Search, text: 'segít egyben látni az életedet' },
                { icon: MessageSquare, text: 'előhozhat rég elfeledett történeteket' },
                { icon: Clock, text: 'rendszerezi a szétszórt emlékeket' },
                { icon: PenLine, text: 'később is bővíthető, pontosítható' },
                { icon: BookOpen, text: 'megőriz valamit abból, aki voltál' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 bg-white/60 rounded-xl p-4 border border-stone-100">
                  <Icon className="w-5 h-5 text-amber-700 shrink-0" />
                  <span className="text-sm text-stone-700">{text}</span>
                </div>
              ))}
            </div>
            <p className="text-stone-500 text-sm mt-5">
              Ez nem egy nyilvános közösségi felület, és nem is egy üres naplóoldal. Inkább egy
              személyes emléktér, amelynek egyre nagyobb értéke lesz az idő múlásával.
            </p>
          </div>
        </section>

        {/* ── 6. HOGYAN MŰKÖDIK ───────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 sm:p-10 border border-white/70">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-2">
              Nem kell hozzá különösebb előkészület
            </h2>
            <p className="text-stone-600 leading-relaxed mb-8">
              Sokan azért nem kezdenek bele az élettörténetük összerakásába, mert túl nagy
              feladatnak érzik. Az Emlékkönyv éppen ezt teszi könnyebbé: kis lépésekben,
              természetes módon halad veled.
            </p>
            <div className="space-y-6">
              {[
                {
                  num: '1',
                  title: 'Elkezdesz mesélni',
                  icon: Mic,
                  text: 'Leírhatod, ami eszedbe jut, vagy ha kényelmesebb, el is mondhatod. Nem kell szép mondatokban fogalmazni, és nem kell mindent előre tudnod.',
                },
                {
                  num: '2',
                  title: 'Az Emlékkönyv kérdez és segít továbbmenni',
                  icon: MessageSquare,
                  text: 'A rendszer finoman végigvezet a múltad különböző szakaszain, és olyan részletekre is rákérdezhet, amelyekről magadtól talán nem jutna eszedbe beszélni.',
                },
                {
                  num: '3',
                  title: 'Lassan összeáll az életutad',
                  icon: BookOpen,
                  text: 'A beszélgetésekből fokozatosan kirajzolódik egy rendezett, átlátható személyes történet, amelyet később bármikor újra elővehetsz, javíthatsz vagy tovább bővíthetsz.',
                },
              ].map(step => (
                <div key={step.num} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-amber-800 text-white font-bold flex items-center justify-center shrink-0 text-lg">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-800 mb-1">{step.title}</h3>
                    <p className="text-sm text-stone-600 leading-relaxed">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. FUNKCIÓK ─────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 sm:p-10 border border-white/70">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-2">
              Az emlékeid több nézőpontból is visszanézhetők
            </h2>
            <p className="text-stone-600 leading-relaxed mb-6">
              Az Emlékkönyv nem egyszerűen csak szöveget gyűjt. Úgy épül fel, hogy a saját
              múltadra többféleképpen is rá tudj nézni, és minden új részlet jobban kapcsolódjon
              a többihez.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: BookOpen, text: 'az életed történetének rendezett felépítése' },
                { icon: Clock, text: 'fontos dátumok és időszakok rögzítése' },
                { icon: Map, text: 'helyszínek és városok összegyűjtése' },
                { icon: Map, text: 'emlékek térképes megjelenítése' },
                { icon: Clock, text: 'naptáras vagy idővonalas visszanézés' },
                { icon: Users, text: 'fontos emberek és kapcsolatok követése' },
                { icon: Users, text: 'családi kapcsolatok és családfa átlátása' },
                { icon: PenLine, text: 'pontatlan emlékek későbbi javítása, kiegészítése' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-stone-600 p-3 rounded-lg bg-white/40 border border-stone-100/80">
                  <Icon className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                  {text}
                </div>
              ))}
            </div>
            <p className="text-stone-500 text-sm mt-5">
              A múltad nem csak sorokból áll. Emberekből, helyekből, időkből és összekapcsolódó
              élményekből épül fel — az Emlékkönyv ezt a teljes képet segít láthatóvá tenni.
            </p>
          </div>
        </section>

        {/* ── 8. KÖZÖS MÚLT ───────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 sm:p-10 border border-white/70">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-700" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-800">
                Vond be azokat is, akikkel közös a történeted
              </h2>
            </div>
            <p className="text-stone-600 leading-relaxed mb-4">
              Sok emlék nem csak benned él. Egy testvér más részletekre emlékszik, egy régi barát
              felidézhet egy elfelejtett pillanatot, egy gyerek egészen más szemmel őriz meg egy
              közös korszakot.
            </p>
            <p className="text-stone-600 leading-relaxed mb-6">
              Az Emlékkönyv lehetőséget ad arra, hogy másokat is bevonj a közös múlt
              feltérképezésébe. Így nem csak a saját nézőpontodból áll össze a történet, hanem
              gazdagabbá, elevenebbé és emberibbé válik.
            </p>
            <div className="bg-blue-50/60 rounded-xl p-5 border border-blue-100/60">
              <p className="text-sm font-medium text-stone-700 mb-3">Különösen értékes lehet:</p>
              <ul className="space-y-2">
                {[
                  'testvérekkel közös gyerekkori történeteknél',
                  'családi események felidézésénél',
                  'régi barátságok, társaságok újra összerakásánál',
                  'gyerekeknek, unokáknak szánt emlékanyag bővítésénél',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-stone-600">
                    <ChevronRight className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── 9. BIZTONSÁG ────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 sm:p-10 border border-white/70">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-700" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-800">
                A saját történeted felett te rendelkezel
              </h2>
            </div>
            <p className="text-stone-600 leading-relaxed mb-4">
              Az ember élettörténete nem egyszerű adat. Sokkal személyesebb, intimebb és értékesebb
              annál, hogy úgy kezeljük, mint bármilyen más online tartalmat.
            </p>
            <p className="text-stone-600 leading-relaxed">
              Az Emlékkönyv ezért arra épül, hogy a saját múltadról te dönthess. Te választod meg,
              mit szeretnél megőrizni, mit pontosítasz később, mit osztasz meg, és mit tartasz meg
              teljesen magadnak. Ez a felület nem a külvilágnak készül, hanem neked és azoknak,
              akik fontosak számodra.
            </p>
          </div>
        </section>

        {/* ── 10. KINEK SZÓL ──────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 sm:p-10 border border-white/70">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-800 mb-4">
              Azoknak, akik érzik, hogy a történeteik többet érdemelnek néhány elfelejtett emléknél
            </h2>
            <p className="text-stone-600 leading-relaxed mb-6">
              Van egy életkor és egy életszakasz, amikor az ember egyre gyakrabban néz vissza.
              Nem feltétlenül nosztalgiából, hanem azért, mert kezdi látni, mennyi minden történt
              vele, és mennyi minden lenne érdemes megőrizni.
            </p>
            <div className="space-y-2.5">
              {[
                'aki szeret visszagondolni a régi időkre',
                'aki szeretné egyben látni a saját életét',
                'aki nem író, de szívesen mesélne',
                'aki megőrizné a családi történeteket',
                'aki valamit szeretne továbbadni a gyerekeinek vagy unokáinak',
                'aki nem akarja, hogy a fontos emlékek csendben elkopjanak',
              ].map(item => (
                <div key={item} className="flex items-start gap-2 text-sm text-stone-600">
                  <ChevronRight className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 11. ZÁRÓ BLOKK ──────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-20">
          <div className="bg-white/65 backdrop-blur-sm rounded-3xl p-8 sm:p-12 border border-white/80 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-4">
              Az életünk nem csak akkor fontos, amikor éppen történik
            </h2>
            <p className="text-stone-600 leading-relaxed max-w-2xl mx-auto mb-4">
              Vannak történetek, amelyekről azt hisszük, mindig emlékezni fogunk rájuk. Aztán
              telnek az évek, és a részletek lassan halványodni kezdenek. Egy név, egy nyár,
              egy lakás, egy nevetés, egy út, egy korszak — minden egy kicsit távolabb kerül.
            </p>
            <p className="text-stone-600 leading-relaxed max-w-2xl mx-auto mb-8">
              Az Emlékkönyv azért született, hogy ezek a történetek ne tűnjenek el nyomtalanul.
              Hogy legyen helye annak, aki voltál, amit átéltél, és amit egyszer talán mások is
              szeretnének megérteni belőled.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <Button size="lg" className="bg-amber-800 hover:bg-amber-900 text-white px-8 text-base" onClick={onLogin}>
                Belépek
              </Button>
              <Button size="lg" variant="outline" className="border-stone-400 text-stone-700 hover:bg-white/80 px-8 text-base" onClick={onRegister}>
                Regisztrálok
              </Button>
            </div>
            <p className="text-sm text-stone-500 italic">
              Kezdd el akkor, amikor jólesik. A történeted már ott van benned.
            </p>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="bg-stone-800/90 backdrop-blur text-stone-300 py-8 px-4 text-center text-xs">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="font-medium text-white">Emlékkönyv</span>
          </div>
          <p>© {new Date().getFullYear()} Emlékkönyv — www.emlekkonyv.com</p>
        </footer>
      </div>
    </div>
  )
}
