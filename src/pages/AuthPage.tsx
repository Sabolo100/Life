import { useState } from 'react'
import { MosaicBackground } from '@/components/MosaicBackground'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/auth-store'
import { BookOpen, ArrowLeft } from 'lucide-react'

interface AuthPageProps {
  inviteToken?: string | null
  defaultTab?: 'login' | 'register'
  onBack?: () => void
}

export function AuthPage({ inviteToken, defaultTab = 'login', onBack }: AuthPageProps) {
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(loginEmail, loginPassword)
    if (error) setError(error)
    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    const { error } = await signUp(regEmail, regPassword, regName)
    if (error) {
      setError(error)
    } else {
      setSuccess('Sikeres regisztráció! Kérjük, erősítsd meg az email címedet.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f4ee] p-4 relative">
      <MosaicBackground opacity={0.35} />
      <Card className="w-full max-w-md relative z-10 bg-[#faf7f2]/90 backdrop-blur-md shadow-xl shadow-amber-900/10 border-amber-200/50">
        <CardHeader className="text-center relative">
          {onBack && (
            <button
              onClick={onBack}
              className="absolute left-4 top-4 p-1.5 rounded-md hover:bg-muted text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-amber-800 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Emlékkönyv</CardTitle>
          <CardDescription>
            {inviteToken
              ? 'Jelentkezz be vagy regisztrálj a meghívó elfogadásához'
              : 'Építsd fel az élettörténetedet AI segítségével'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md mb-4">
              {success}
            </div>
          )}
          <Tabs defaultValue={defaultTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Bejelentkezés</TabsTrigger>
              <TabsTrigger value="register">Regisztráció</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Jelszó</Label>
                  <Input id="login-password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Név</Label>
                  <Input id="reg-name" type="text" value={regName} onChange={e => setRegName(e.target.value)} required placeholder="Hogyan szólítsunk?" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Jelszó</Label>
                  <Input id="reg-password" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Regisztráció...' : 'Regisztráció'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
