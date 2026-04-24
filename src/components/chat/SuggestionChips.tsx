import { Badge } from '@/components/ui/badge'
import { Lightbulb } from 'lucide-react'

interface SuggestionChipsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
  open: boolean
  onToggle: () => void
}

export function SuggestionChips({ suggestions, onSelect, open, onToggle }: SuggestionChipsProps) {
  if (!suggestions.length) return null

  return (
    <div className="px-4 pb-2">
      <div className="max-w-3xl mx-auto flex flex-wrap gap-2 items-center">
        <button
          onClick={onToggle}
          title={open ? 'Javaslatok elrejtése' : 'Javaslatok mutatása'}
          className={`p-1 rounded-md hover:bg-muted transition-colors ${
            open ? 'text-amber-500' : 'text-muted-foreground'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
        </button>
        {open && suggestions.map((suggestion, i) => (
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
