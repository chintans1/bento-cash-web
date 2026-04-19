"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  };
};

type ChartContextProps = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextProps | null>(null);

export function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used within <ChartContainer>");
  return ctx;
}

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uid = React.useId();
  const chartId = `chart-${id ?? uid.replace(/:/g, "")}`;
  const colorVars = Object.entries(config)
    .filter(([, v]) => v.color)
    .map(([k, v]) => `  --color-${k}: ${v.color};`)
    .join("\n");

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
          "[&_.recharts-layer]:outline-none",
          "[&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        {colorVars && (
          <style
            dangerouslySetInnerHTML={{
              __html: `[data-chart=${chartId}] {\n${colorVars}\n}`,
            }}
          />
        )}
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

export const ChartTooltip = RechartsPrimitive.Tooltip;
export const ChartLegend = RechartsPrimitive.Legend;

type LegendItem = {
  value?: string | number;
  color?: string;
  dataKey?: string | number | ((obj: unknown) => unknown);
};

export const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    payload?: readonly LegendItem[];
    verticalAlign?: "top" | "middle" | "bottom";
    nameKey?: string;
  }
>(({ className, payload, verticalAlign = "bottom", nameKey }, ref) => {
  const { config } = useChart();
  if (!payload?.length) return null;
  const items = payload as LegendItem[];

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-4 text-xs",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {items.map((item) => {
        const rawKey =
          nameKey ??
          (typeof item.dataKey === "string" ? item.dataKey : undefined) ??
          "value";
        const key = String(rawKey);
        const cfg = config[key];
        return (
          <div key={item.value} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">
              {cfg?.label ?? item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegendContent";
