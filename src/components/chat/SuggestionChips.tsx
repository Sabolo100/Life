import { Badge } from '@/components/ui/badge'
import { Lightbulb } from 'lucide-react'

interface SuggestionChipsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (!suggestions.length) return null

  return (
    <div className="px-4 pb-2">
      <div className="max-w-3xl mx-auto flex flex-wrap gap-2 items-center">
        <Lightbulb className="w-4 h-4 text-muted-foreground" />
        {suggestions.map((suggestion, i) => (
          <Badge
            key={i}
            variant="secondary"
            className="cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => onSelect(suggestion)}
          >
            {suggestion}
          </Badge>
        ))}
      </div>
    </div>
  )
}
