import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  prefix?: string
  suffix?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
  step,
  disabled,
}: NumberFieldProps) {
  return (
    <div className="space-y-1">
      <Label className={`text-sm font-medium ${disabled ? 'text-muted-foreground' : ''}`}>{label}</Label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="h-8"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  )
}
