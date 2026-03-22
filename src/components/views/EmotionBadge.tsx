import { cn } from '@/lib/utils'
import type { Valence } from '@/types'

interface EmotionBadgeProps {
  feeling: string
  valence: Valence
  importance?: number
  compact?: boolean
}

const valenceConfig: Record<Valence, { emoji: string; bg: string; text: string; border: string }> = {
  positive: { emoji: '😊', bg: 'bg-green-50 dark:bg-green-950/40', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  negative: { emoji: '😢', bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  mixed:    { emoji: '🤔', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  neutral:  { emoji: '😐', bg: 'bg-gray-50 dark:bg-gray-950/40', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-800' },
}

export function EmotionBadge({ feeling, valence, importance, compact = false }: EmotionBadgeProps) {
  const config = valenceConfig[valence] || valenceConfig.neutral

  if (compact) {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs', config.bg, config.text, config.border)}>
        <span>{config.emoji}</span>
        <span>{feeling}</span>
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', config.bg, config.text, config.border)}>
      <span>{config.emoji}</span>
      <span>{feeling}</span>
      {importance != null && importance > 0 && (
        <span className="ml-0.5 opacity-70">
          {'●'.repeat(importance)}{'○'.repeat(Math.max(0, 5 - importance))}
        </span>
      )}
    </span>
  )
}
