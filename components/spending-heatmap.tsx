"use client"

import { useState, useRef, useMemo } from "react"
import type { HeatmapData, DayCell } from "@/lib/lunchmoney/analytics"
import { formatAmount, formatShortDate } from "@/lib/format"

function spendColor(spend: number, max: number): string {
  if (spend === 0 || max === 0) return "color-mix(in srgb, var(--chart-1) 50%, white)"
  const t = Math.pow(spend / max, 0.55)
  if (t < 0.15) return "var(--chart-1)"
  if (t < 0.32) return "var(--chart-2)"
  if (t < 0.52) return "var(--chart-3)"
  if (t < 0.72) return "var(--chart-4)"
  return "var(--chart-5)"
}

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"]
const GRID_GAP = 3
const DAY_COL_WIDTH = 28 // matches inline style below; also used for month/legend offset

export function SpendingHeatmap({ weeks, monthLabels, maxDailySpend }: HeatmapData) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ cells: DayCell[]; x: number; y: number } | null>(null)

  // Memoized so mouse-move (which updates x/y) doesn't recompute week aggregates
  const weekInfo = useMemo(() => {
    if (!tooltip) return null
    const inRange = tooltip.cells.filter((c) => c.inRange)
    if (!inRange.length) return null
    return {
      start: inRange[0].date,
      end: inRange[inRange.length - 1].date,
      total: inRange.reduce((s, c) => s + c.spend, 0),
      txCount: inRange.reduce((s, c) => s + c.txCount, 0),
    }
  }, [tooltip])

  const gridTemplate = `repeat(${weeks.length}, 1fr)`
  const monthRowPadding = DAY_COL_WIDTH + GRID_GAP // aligns labels with the heatmap columns

  return (
    <div ref={containerRef} className="relative select-none w-full">
      {/* Month labels — same grid template as the heatmap so columns align */}
      <div
        className="grid mb-1"
        style={{ gridTemplateColumns: gridTemplate, gap: GRID_GAP, paddingLeft: monthRowPadding }}
      >
        {weeks.map((_, wi) => (
          <div key={wi} className="text-[9px] font-mono text-muted-foreground leading-none truncate">
            {monthLabels.find((m) => m.col === wi)?.label ?? ""}
          </div>
        ))}
      </div>

      <div className="flex w-full" style={{ gap: GRID_GAP }}>
        {/* Day-of-week labels */}
        <div className="flex flex-col shrink-0" style={{ width: DAY_COL_WIDTH, gap: GRID_GAP }}>
          {DAY_LABELS.map((lbl, i) => (
            <div key={i} className="flex-1 flex items-center justify-end pr-1 text-[9px] font-mono text-muted-foreground">
              {lbl}
            </div>
          ))}
        </div>

        {/* Heatmap — fills all remaining width */}
        <div className="flex-1 grid" style={{ gridTemplateColumns: gridTemplate, gap: GRID_GAP }}>
          {weeks.map((week, wi) => (
            <div
              key={wi}
              className="flex flex-col cursor-default"
              style={{ gap: GRID_GAP }}
              onMouseEnter={(e) => {
                const rect = containerRef.current?.getBoundingClientRect()
                if (rect) setTooltip({ cells: week, x: e.clientX - rect.left, y: e.clientY - rect.top })
              }}
              onMouseMove={(e) => {
                const rect = containerRef.current?.getBoundingClientRect()
                if (rect) setTooltip((prev) => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null)
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {week.map((cell, di) => (
                <div
                  key={di}
                  className="aspect-square rounded-sm"
                  style={{ backgroundColor: cell.inRange ? spendColor(cell.spend, maxDailySpend) : "transparent" }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Intensity legend */}
      <div className="flex items-center mt-2" style={{ gap: GRID_GAP, paddingLeft: monthRowPadding }}>
        <span className="text-[9px] font-mono text-muted-foreground mr-0.5">less</span>
        {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((t, i) => (
          <div key={i} className="size-3 rounded-sm shrink-0" style={{ backgroundColor: spendColor(t * 100, 100) }} />
        ))}
        <span className="text-[9px] font-mono text-muted-foreground ml-0.5">more</span>
      </div>

      {/* Hover tooltip */}
      {tooltip && weekInfo && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltip.x > (containerRef.current?.offsetWidth ?? 0) * 0.65 ? tooltip.x - 168 : tooltip.x + 14,
            top: tooltip.y - 52,
          }}
        >
          <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-xl text-xs font-mono whitespace-nowrap">
            <p className="text-muted-foreground text-[10px] mb-1">
              {formatShortDate(weekInfo.start)}
              {weekInfo.start !== weekInfo.end ? ` — ${formatShortDate(weekInfo.end)}` : ""}
            </p>
            <p className="text-foreground font-semibold tabular-nums">{formatAmount(weekInfo.total, true)}</p>
            {weekInfo.txCount > 0 && (
              <p className="text-muted-foreground text-[10px] mt-0.5">
                {weekInfo.txCount} transaction{weekInfo.txCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
