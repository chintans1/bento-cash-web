"use client";

import { useState, useRef } from "react";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type { NetWorthPoint } from "@/lib/lunchmoney/balance-history";

// SVG viewport dimensions and plot padding
const W = 600;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 72 };

// Returns a "nice" step size for the given data range and desired tick count.
function niceStep(range: number, count: number): number {
  const raw = range / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

// Expands the data min/max to nice round numbers and returns evenly-spaced ticks.
function niceAxis(
  dataMin: number,
  dataMax: number,
  count = 4
): { min: number; max: number; ticks: number[] } {
  if (dataMin === dataMax) {
    const pad = dataMin === 0 ? 1 : Math.abs(dataMin) * 0.1;
    return {
      min: dataMin - pad,
      max: dataMax + pad,
      ticks: [dataMin - pad, dataMin, dataMax + pad],
    };
  }
  const step = niceStep(dataMax - dataMin, count);
  const min = Math.floor(dataMin / step) * step;
  const max = Math.ceil(dataMax / step) * step;
  const ticks: number[] = [];
  for (let t = min; t <= max + step * 0.01; t += step) {
    ticks.push(t);
  }
  return { min, max, ticks };
}

// Compact axis labels: "$120K", "$1.2M", "EUR 120K", etc.
function formatAxisLabel(value: number, currency: string): string {
  const prefix =
    currency.toLowerCase() === "usd" ? "$" : currency.toUpperCase() + " ";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${prefix}${Math.round(abs / 1_000)}K`;
  return `${sign}${prefix}${Math.round(abs)}`;
}

export function NetWorthChart({
  data,
  primaryCurrency,
}: {
  data: NetWorthPoint[];
  primaryCurrency: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (data.length === 0) return null;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const { min: axisMin, max: axisMax, ticks } = niceAxis(
    Math.min(...data.map((d) => d.total)),
    Math.max(...data.map((d) => d.total))
  );

  // Map a data index to SVG x-coordinate within the plot area
  const xOf = (i: number): number =>
    data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW;

  // Map a value to SVG y-coordinate within the plot area
  const yOf = (v: number): number =>
    ((axisMax - v) / (axisMax - axisMin)) * plotH;

  const linePath = data
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(d.total).toFixed(1)}`
    )
    .join(" ");

  const areaPath = [
    `M ${xOf(0).toFixed(1)} ${plotH}`,
    ...data.map(
      (d, i) => `L ${xOf(i).toFixed(1)} ${yOf(d.total).toFixed(1)}`
    ),
    `L ${xOf(data.length - 1).toFixed(1)} ${plotH}`,
    "Z",
  ].join(" ");

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || data.length < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W - PAD.left;
    const idx = Math.round((relX / plotW) * (data.length - 1));
    setHoveredIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  // Show first, middle, and last date labels; show all if 6 or fewer points
  const xLabelIndices =
    data.length <= 6
      ? data.map((_, i) => i)
      : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="relative mt-2">
      {hovered && (
        <div className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 rounded bg-foreground px-2 py-0.5 text-xs whitespace-nowrap text-background">
          {formatShortDate(hovered.date)}:{" "}
          {formatCurrency(hovered.total, primaryCurrency, true)}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
        style={{ cursor: "crosshair" }}
      >
        <defs>
          <linearGradient id="nw-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              style={{ stopColor: "var(--chart-1)", stopOpacity: 0.25 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "var(--chart-1)", stopOpacity: 0.02 }}
            />
          </linearGradient>
        </defs>

        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Horizontal grid lines + y-axis labels */}
          {ticks.map((tick) => {
            const y = yOf(tick);
            if (y < -1 || y > plotH + 1) return null;
            return (
              <g key={tick}>
                <line
                  x1={0}
                  y1={y}
                  x2={plotW}
                  y2={y}
                  style={{ stroke: "var(--border)" }}
                  strokeWidth={0.5}
                  strokeDasharray="3 3"
                />
                <text
                  x={-6}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={9}
                  style={{ fill: "var(--muted-foreground)" }}
                >
                  {formatAxisLabel(tick, primaryCurrency)}
                </text>
              </g>
            );
          })}

          {/* Area fill under the line */}
          <path d={areaPath} fill="url(#nw-area-fill)" />

          {/* Main line */}
          <path
            d={linePath}
            fill="none"
            style={{ stroke: "var(--chart-1)" }}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Hover: vertical crosshair */}
          {hoveredIdx !== null && (
            <line
              x1={xOf(hoveredIdx)}
              y1={0}
              x2={xOf(hoveredIdx)}
              y2={plotH}
              style={{ stroke: "var(--foreground)" }}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.35}
            />
          )}

          {/* Hover: dot on the line */}
          {hoveredIdx !== null && (
            <circle
              cx={xOf(hoveredIdx)}
              cy={yOf(data[hoveredIdx].total)}
              r={3.5}
              style={{
                fill: "var(--chart-1)",
                stroke: "var(--background)",
              }}
              strokeWidth={1.5}
            />
          )}

          {/* X-axis date labels */}
          {xLabelIndices.map((i) => (
            <text
              key={i}
              x={xOf(i)}
              y={plotH + 18}
              textAnchor={
                i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"
              }
              fontSize={9}
              style={{ fill: "var(--muted-foreground)" }}
            >
              {formatShortDate(data[i].date)}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
