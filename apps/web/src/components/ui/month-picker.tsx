"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"

import { cn } from "@/lib/utils"

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

/** Parse a `YYYYMM` code into { year, month } (month is 1-12), or null. */
function parseCode(value: string): { year: number; month: number } | null {
  if (!/^\d{6}$/.test(value)) return null
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6))
  if (month < 1 || month > 12) return null
  return { year, month }
}

function formatCode(value: string): string {
  const parsed = parseCode(value)
  if (!parsed) return value
  return `${parsed.year}-${String(parsed.month).padStart(2, "0")}`
}

interface MonthPickerProps {
  /** Current value as a `YYYYMM` code, or "" when unset. */
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  className?: string
  /** Earliest selectable year (inclusive). */
  fromYear?: number
  /** Latest selectable year (inclusive). */
  toYear?: number
}

/**
 * A styled month/year picker that reads and writes `YYYYMM` codes — the format
 * BCER date fields (spud, rig release, first production) are stored in. Renders
 * a popover calendar with year navigation and a 12-month grid instead of a bare
 * text input.
 */
export function MonthPicker({
  value,
  onChange,
  id,
  placeholder = "Any month",
  className,
  fromYear = 1950,
  toYear = new Date().getFullYear() + 1,
}: MonthPickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = parseCode(value)
  const [viewYear, setViewYear] = React.useState(
    () => selected?.year ?? Math.min(new Date().getFullYear(), toYear)
  )

  // Keep the visible year in sync when the value changes from the outside
  // (e.g. a Reset that clears the form) while the popover is closed.
  React.useEffect(() => {
    if (!open && selected) setViewYear(selected.year)
  }, [open, selected?.year]) // eslint-disable-line react-hooks/exhaustive-deps

  function select(month: number) {
    onChange(`${viewYear}${String(month).padStart(2, "0")}`)
    setOpen(false)
  }

  function clear(event: React.MouseEvent) {
    event.stopPropagation()
    onChange("")
  }

  const canGoPrev = viewYear > fromYear
  const canGoNext = viewYear < toYear

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          data-slot="month-picker-trigger"
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-md border border-input bg-muted/50 px-2.5 text-sm shadow-xs transition-[color,box-shadow] outline-none",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "dark:bg-input/30 dark:hover:bg-input/50",
            className
          )}
        >
          <CalendarDays className="size-3.5 shrink-0 opacity-60" />
          <span className={cn("flex-1 text-left", !selected && "text-muted-foreground")}>
            {selected ? formatCode(value) : placeholder}
          </span>
          {selected && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear"
              onClick={clear}
              className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3" />
            </span>
          )}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          data-slot="month-picker-content"
          className={cn(
            "z-50 w-56 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={() => setViewYear((y) => Math.max(fromYear, y - 1))}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              aria-label="Previous year"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-semibold tabular-nums">{viewYear}</span>
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => setViewYear((y) => Math.min(toYear, y + 1))}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              aria-label="Next year"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((label, index) => {
              const month = index + 1
              const isSelected = selected?.year === viewYear && selected?.month === month
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => select(month)}
                  data-selected={isSelected || undefined}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary/90"
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
