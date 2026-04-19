"use client";

import { useState, useRef } from "react";
import { formatCurrency } from "@/lib/format";
import { niceAxis, fmtAxis } from "@/lib/chart-utils";
import type { MonthlySummary } from "@/lib/lunchmoney/wealth-analytics";

const W = 600;
const H = 180;
const PAD = { top: 16, right: 16, bottom: 28, left: 80 };
const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function CashFlowChart({
  data,
  primaryCurrency,
}: {
  data: MonthlySummary[];
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
  } = niceAxis(0, Math.max(...data.flatMap((d) => [d.income, d.expenses])));

  const xOf = (i: number) =>
    data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW;
  const yOf = (v: number) => ((axisMax - v) / (axisMax - axisMin)) * plotH;

  const buildLine = (key: "income" | "expenses") =>
    data
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(d[key]).toFixed(1)}`
      )
      .join(" ");

  const buildArea = (key: "income" | "expenses") =>
    [
      `M ${xOf(0).toFixed(1)} ${plotH}`,
      ...data.map((d, i) => `L ${xOf(i).toFixed(1)} ${yOf(d[key]).toFixed(1)}`),
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

  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div>
      {/* Legend + hover readout */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-0.5 w-4 rounded-full"
              style={{ backgroundColor: "var(--chart-1)" }}
            />
            <span className="text-xs text-muted-foreground">Expenses</span>
          </div>
        </div>
        {hovered && (
          <div className="flex gap-3 text-xs">
            <span className="text-muted-foreground">
              {SHORT_MONTHS[hovered.month - 1]} {hovered.year}
            </span>
            <span className="font-mono text-green-600 tabular-nums dark:text-green-400">
              +{formatCurrency(hovered.income, primaryCurrency, false)}
            </span>
            <span
              className="font-mono tabular-nums"
              style={{ color: "var(--chart-1)" }}
            >
              −{formatCurrency(hovered.expenses, primaryCurrency, false)}
            </span>
            <span
              className={`font-mono font-medium tabular-nums ${hovered.net >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
            >
              {hovered.net >= 0 ? "+" : ""}
              {formatCurrency(hovered.net, primaryCurrency, false)}
            </span>
          </div>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
        style={{ cursor: "crosshair" }}
      >
        <defs>
          <linearGradient id="cf-income" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              style={{ stopColor: "#22c55e", stopOpacity: 0.2 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "#22c55e", stopOpacity: 0.01 }}
            />
          </linearGradient>
          <linearGradient id="cf-expenses" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              style={{ stopColor: "var(--chart-1)", stopOpacity: 0.2 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "var(--chart-1)", stopOpacity: 0.01 }}
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

          <path d={buildArea("income")} fill="url(#cf-income)" />
          <path d={buildArea("expenses")} fill="url(#cf-expenses)" />
          <path
            d={buildLine("income")}
            fill="none"
            stroke="#22c55e"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={buildLine("expenses")}
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
                cy={yOf(data[hoveredIdx].income)}
                r={3.5}
                fill="#22c55e"
                style={{ stroke: "var(--background)" }}
                strokeWidth={1.5}
              />
              <circle
                cx={xOf(hoveredIdx)}
                cy={yOf(data[hoveredIdx].expenses)}
                r={3.5}
                style={{ fill: "var(--chart-1)", stroke: "var(--background)" }}
                strokeWidth={1.5}
              />
            </>
          )}

          {data.map((d, i) => (
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
              {SHORT_MONTHS[d.month - 1]}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
