import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface SectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-border">
      <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-1 text-sm font-semibold hover:bg-accent/50 rounded-sm transition-colors">
        {title}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-1 pb-4 space-y-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
