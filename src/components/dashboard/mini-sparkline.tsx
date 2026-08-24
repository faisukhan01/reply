"use client";

import * as React from "react";

type Point = { label?: string; value: number };

/**
 * Tiny inline SVG sparkline — used inside stat cards (7-day trend)
 * and the welcome banner (24h hourly activity). Pure SVG, no recharts.
 */
export function MiniSparkline({
  points,
  width = 120,
  height = 36,
  stroke = "var(--foreground)",
  fill = false,
  strokeWidth = 1.5,
  className,
  ariaLabel,
}: {
  points: number[] | { label?: string; value: number }[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: boolean;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const values = React.useMemo(
    () =>
      (points as Array<number | Point>).map((p) =>
        typeof p === "number" ? p : p.value
      ),
    [points]
  );

  const path = React.useMemo(() => {
    if (values.length === 0) return { line: "", area: "" };
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);
    const stepX = values.length > 1 ? width / (values.length - 1) : width;

    const coords = values.map((v, i) => {
      const x = i * stepX;
      // Invert Y so higher values go up; pad with 4px top/bottom.
      const padTop = 3;
      const padBottom = 3;
      const usableH = height - padTop - padBottom;
      const y = padTop + (1 - (v - min) / range) * usableH;
      return [x, y] as const;
    });

    const linePath = coords
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ");

    const areaPath =
      coords.length > 0
        ? `${linePath} L${width.toFixed(2)},${height.toFixed(2)} L0,${height.toFixed(2)} Z`
        : "";

    return { line: linePath, area: areaPath };
  }, [values, width, height]);

  const gradientId = React.useId();

  if (values.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        aria-label={ariaLabel ?? "No data"}
        role="img"
      />
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel ?? "Trend"}
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <path d={path.area} fill={`url(#${gradientId})`} stroke="none" />
        </>
      )}
      <path
        d={path.line}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot for emphasis */}
      {values.length > 0 && (
        <circle
          cx={width}
          cy={
            3 +
            (1 -
              (values[values.length - 1] -
                Math.min(...values, 0)) /
                Math.max(
                  Math.max(...values, 1) - Math.min(...values, 0),
                  1
                )) *
              (height - 6)
          }
          r={2.25}
          fill={stroke}
        />
      )}
    </svg>
  );
}
