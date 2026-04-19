"use client";

import { useState, useRef } from "react";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { niceAxis, fmtAxis } from "@/lib/chart-utils";
import type { NetWorthPoint } from "@/lib/lunchmoney/balance-history";

const W = 600;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 72 };

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

  const {
    min: axisMin,
    max: axisMax,
    ticks,
  } = niceAxis(
    Math.min(...data.map((d) => d.total)),
    Math.max(...data.map((d) => d.total))
  );

  const xOf = (i: number) =>
    data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW;
  const yOf = (v: number) => ((axisMax - v) / (axisMax - axisMin)) * plotH;

  const linePath = data
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(d.total).toFixed(1)}`
    )
    .join(" ");

  const areaPath = [
    `M ${xOf(0).toFixed(1)} ${plotH}`,
    ...data.map((d, i) => `L ${xOf(i).toFixed(1)} ${yOf(d.total).toFixed(1)}`),
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

  // Show first, middle, and last labels; all labels when ≤ 6 points
  const labelIndices =
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
                  {fmtAxis(tick, primaryCurrency)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#nw-area-fill)" />
          <path
            d={linePath}
            fill="none"
            style={{ stroke: "var(--chart-1)" }}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {hoveredIdx !== null && (
            <>
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
              <circle
                cx={xOf(hoveredIdx)}
                cy={yOf(data[hoveredIdx].total)}
                r={3.5}
                style={{ fill: "var(--chart-1)", stroke: "var(--background)" }}
                strokeWidth={1.5}
              />
            </>
          )}

          {labelIndices.map((i) => (
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
