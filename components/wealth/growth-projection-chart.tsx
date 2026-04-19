"use client";

import { useState, useRef } from "react";
import { niceAxis, fmtAxis } from "@/lib/chart-utils";
import type { ProjectionPoint } from "@/lib/lunchmoney/wealth-analytics";

const W = 600;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 80 };

const SCENARIOS = [
  {
    key: "aggressive" as const,
    label: "Aggressive",
    rate: "10%",
    colorVar: "--chart-1",
  },
  {
    key: "moderate" as const,
    label: "Moderate",
    rate: "7%",
    colorVar: "--chart-2",
  },
  {
    key: "conservative" as const,
    label: "Conservative",
    rate: "4%",
    colorVar: "--chart-3",
  },
] as const;

export function GrowthProjectionChart({
  data,
  primaryCurrency,
}: {
  data: ProjectionPoint[];
  primaryCurrency: string;
}) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (data.length === 0) return null;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const maxYear = data[data.length - 1].year;

  const allValues = data.flatMap((d) => [
    d.conservative,
    d.moderate,
    d.aggressive,
  ]);
  const {
    min: axisMin,
    max: axisMax,
    ticks,
  } = niceAxis(Math.min(...allValues), Math.max(...allValues));

  const xOf = (year: number) => (year / maxYear) * plotW;
  const yOf = (v: number) => ((axisMax - v) / (axisMax - axisMin)) * plotH;

  const buildLine = (key: keyof Omit<ProjectionPoint, "year">) =>
    data
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"} ${xOf(d.year).toFixed(1)} ${yOf(d[key]).toFixed(1)}`
      )
      .join(" ");

  const buildArea = (key: keyof Omit<ProjectionPoint, "year">) =>
    [
      `M ${xOf(0).toFixed(1)} ${plotH}`,
      ...data.map(
        (d) => `L ${xOf(d.year).toFixed(1)} ${yOf(d[key]).toFixed(1)}`
      ),
      `L ${xOf(maxYear).toFixed(1)} ${plotH}`,
      "Z",
    ].join(" ");

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W - PAD.left;
    const year = Math.round((relX / plotW) * maxYear);
    setHoveredYear(Math.max(0, Math.min(maxYear, year)));
  };

  // The point to display — hovered year or last year
  const displayPoint =
    hoveredYear !== null
      ? (data[hoveredYear] ?? data[data.length - 1])
      : data[data.length - 1];
  const displayYear = hoveredYear ?? maxYear;

  // X tick every 5 years (or every year for short horizons)
  const step = maxYear <= 10 ? 1 : 5;
  const xTicks = data.filter((d) => d.year % step === 0);

  return (
    <div>
      {/* Scenario legend + live readout panel */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-4">
          {SCENARIOS.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <div
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: `var(${s.colorVar})` }}
              />
              <span className="text-xs text-muted-foreground">
                {s.label} ({s.rate})
              </span>
            </div>
          ))}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Year {displayYear}</p>
          <div className="flex gap-3">
            {SCENARIOS.map((s) => (
              <span
                key={s.key}
                className="font-mono text-xs tabular-nums"
                style={{ color: `var(${s.colorVar})` }}
              >
                {fmtAxis(displayPoint[s.key], primaryCurrency)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredYear(null)}
        style={{ cursor: "crosshair" }}
      >
        <defs>
          {SCENARIOS.map((s) => (
            <linearGradient
              key={s.key}
              id={`proj-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                style={{ stopColor: `var(${s.colorVar})`, stopOpacity: 0.15 }}
              />
              <stop
                offset="100%"
                style={{ stopColor: `var(${s.colorVar})`, stopOpacity: 0.01 }}
              />
            </linearGradient>
          ))}
        </defs>

        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Grid lines + y-axis */}
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

          {/* Area fills — aggressive drawn first (behind) */}
          {[...SCENARIOS].reverse().map((s) => (
            <path
              key={s.key}
              d={buildArea(s.key)}
              fill={`url(#proj-${s.key})`}
            />
          ))}

          {/* Lines */}
          {SCENARIOS.map((s) => (
            <path
              key={s.key}
              d={buildLine(s.key)}
              fill="none"
              style={{ stroke: `var(${s.colorVar})` }}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* Hover crosshair + dots */}
          {hoveredYear !== null && (
            <>
              <line
                x1={xOf(hoveredYear)}
                y1={0}
                x2={xOf(hoveredYear)}
                y2={plotH}
                style={{ stroke: "var(--foreground)" }}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.35}
              />
              {SCENARIOS.map((s) => (
                <circle
                  key={s.key}
                  cx={xOf(displayPoint.year)}
                  cy={yOf(displayPoint[s.key])}
                  r={3.5}
                  style={{
                    fill: `var(${s.colorVar})`,
                    stroke: "var(--background)",
                  }}
                  strokeWidth={1.5}
                />
              ))}
            </>
          )}

          {/* X-axis year labels */}
          {xTicks.map((d) => (
            <text
              key={d.year}
              x={xOf(d.year)}
              y={plotH + 18}
              textAnchor={
                d.year === 0 ? "start" : d.year === maxYear ? "end" : "middle"
              }
              fontSize={9}
              style={{ fill: "var(--muted-foreground)" }}
            >
              {d.year === 0 ? "Now" : `+${d.year}yr`}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
