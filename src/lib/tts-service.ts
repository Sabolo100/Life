const synth = typeof window !== 'undefined' ? window.speechSynthesis : null

interface SpeakOptions {
  lang?: string
  rate?: number
}

export function speakText(text: string, options?: SpeakOptions): void {
  if (!synth) return

  // Ha már beszél, előbb leállítjuk
  stopSpeaking()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = options?.lang ?? 'hu-HU'
  utterance.rate = options?.rate ?? 1.0

  // Magyar hang kiválasztása, ha elérhető
  const voices = synth.getVoices()
  const hungarianVoice = voices.find(v => v.lang.startsWith('hu'))
  if (hungarianVoice) {
    utterance.voice = hungarianVoice
  }

  synth.speak(utterance)
}

export function stopSpeaking(): void {
  if (!synth) return
  synth.cancel()
}

export function isSpeaking(): boolean {
  if (!synth) return false
  return synth.speaking
}
