import { useState, useMemo } from 'react'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { X, Check, Filter, ChevronDown, ChevronRight } from 'lucide-react'
import type { OpenQuestion, QuestionType } from '@/types'

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  incomplete_topic: 'Befejezetlen tema',
  unresolved_event: 'Tisztazatlan esemeny',
  unclear_time: 'Bizonytalan idopont',
  missing_detail: 'Hianyzo reszlet',
  follow_up: 'Foltetendo kerdes',
}

const QUESTION_TYPE_ORDER: QuestionType[] = [
  'follow_up',
  'missing_detail',
  'incomplete_topic',
  'unresolved_event',
  'unclear_time',
]

function priorityColor(priority: number): string {
  switch (priority) {
    case 1: return 'bg-red-500'
    case 2: return 'bg-orange-500'
    case 3: return 'bg-yellow-500'
    case 4: return 'bg-green-500'
    default: return 'bg-gray-400'
  }
}

function priorityLabel(priority: number): string {
  switch (priority) {
    case 1: return 'Surges'
    case 2: return 'Fontos'
    case 3: return 'Kozepes'
    case 4: return 'Alacsony'
    default: return 'Minimalis'
  }
}

interface OpenQuestionsPanelProps {
  open: boolean
  onClose: () => void
  onQuestionClick: (question: string) => void
}

export function OpenQuestionsPanel({ open, onClose, onQuestionClick }: OpenQuestionsPanelProps) {
  const { openQuestions, updateOpenQuestions } = useLifeStoryStore()
  const [showAll, setShowAll] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<QuestionType>>(new Set())

  const questions = useMemo(() => {
    if (showAll) return openQuestions
    return openQuestions.filter(q => q.status === 'open')
  }, [openQuestions, showAll])

  const grouped = useMemo(() => {
    const groups = new Map<QuestionType, OpenQuestion[]>()
    for (const q of questions) {
      const existing = groups.get(q.question_type) || []
      existing.push(q)
      groups.set(q.question_type, existing)
    }
    // Sort groups by defined order
    const sorted = new Map<QuestionType, OpenQuestion[]>()
    for (const type of QUESTION_TYPE_ORDER) {
      const items = groups.get(type)
      if (items?.length) {
        // Sort by priority (1 = highest)
        sorted.set(type, items.sort((a, b) => a.priority - b.priority))
      }
    }
    return sorted
  }, [questions])

  const openCount = openQuestions.filter(q => q.status === 'open').length

  const toggleGroup = (type: QuestionType) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const handleDismiss = async (question: OpenQuestion) => {
    await updateOpenQuestions([{
      id: question.id,
      status: 'addressed',
      addressed_at: new Date().toISOString(),
    }])
  }

  if (!open) return null

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">Nyitott kerdesek</h2>
          {openCount > 0 && (
            <Badge variant="secondary">{openCount}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger >
              <Button
                variant={showAll ? 'secondary' : 'ghost'}
                size="icon-xs"
                onClick={() => setShowAll(!showAll)}
              >
                <Filter className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showAll ? 'Csak nyitott kerdesek' : 'Osszes kerdes mutatasa'}
            </TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {questions.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {showAll
              ? 'Meg nincsenek kerdesek.'
              : 'Nincsenek nyitott kerdesek.'}
          </div>
        ) : (
          <div className="p-2">
            {Array.from(grouped.entries()).map(([type, items]) => (
              <div key={type} className="mb-2">
                {/* Group header */}
                <button
                  className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
                  onClick={() => toggleGroup(type)}
                >
                  {collapsedGroups.has(type) ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  {QUESTION_TYPE_LABELS[type]}
                  <Badge variant="outline" className="ml-auto text-[10px] h-4 px-1.5">
                    {items.length}
                  </Badge>
                </button>

                {/* Questions */}
                {!collapsedGroups.has(type) && (
                  <div className="space-y-1 mt-1">
                    {items.map(q => (
                      <div
                        key={q.id}
                        className={`group relative flex items-start gap-2 px-2 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                          q.status === 'addressed'
                            ? 'opacity-50 bg-muted/30'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          if (q.status === 'open') {
                            onQuestionClick(q.description)
                          }
                        }}
                      >
                        {/* Priority dot */}
                        <Tooltip>
                          <TooltipTrigger >
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${priorityColor(q.priority)}`} />
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {priorityLabel(q.priority)}
                          </TooltipContent>
                        </Tooltip>

                        {/* Question text */}
                        <span className="flex-1 leading-snug">{q.description}</span>

                        {/* Dismiss button */}
                        {q.status === 'open' && (
                          <Tooltip>
                            <TooltipTrigger >
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDismiss(q)
                                }}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Megvalaszolva</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
