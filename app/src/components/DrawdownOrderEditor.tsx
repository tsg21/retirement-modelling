import { Label } from '@/components/ui/label'
import type { DrawdownCategory } from '../types'

interface DrawdownOrderEditorProps {
  order: DrawdownCategory[]
  onChange: (order: DrawdownCategory[]) => void
}

export function DrawdownOrderEditor({ order, onChange }: DrawdownOrderEditorProps) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">Drawdown order</Label>
      <div className="space-y-1">
        {order.map((cat, i) => (
          <div key={cat} className="flex items-center gap-2 rounded border border-border px-3 py-1.5 text-sm">
            <span className="text-muted-foreground">{i + 1}.</span>
            <span className="flex-1">{cat}</span>
            <button
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              disabled={i === 0}
              onClick={() => {
                const newOrder = [...order] as DrawdownCategory[]
                ;[newOrder[i - 1], newOrder[i]] = [newOrder[i], newOrder[i - 1]]
                onChange(newOrder)
              }}
            >
              ↑
            </button>
            <button
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              disabled={i === order.length - 1}
              onClick={() => {
                const newOrder = [...order] as DrawdownCategory[]
                ;[newOrder[i], newOrder[i + 1]] = [newOrder[i + 1], newOrder[i]]
                onChange(newOrder)
              }}
            >
              ↓
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
