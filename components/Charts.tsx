"use client";

import { useMemo } from "react";

export interface Point {
  x: number; // epoch ms or index
  y: number;
  label?: string;
}

/** Minimal responsive SVG line chart. */
export function LineChart({ points, height = 160, format }: { points: Point[]; height?: number; format?: (y: number) => string }) {
  const W = 600;
  const H = height;
  const padL = 44;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const model = useMemo(() => {
    if (points.length === 0) return null;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY0 = Math.min(...ys);
    const maxY0 = Math.max(...ys);
    const pad = (maxY0 - minY0) * 0.15 || maxY0 * 0.2 || 1;
    const minY = Math.max(0, minY0 - pad);
    const maxY = maxY0 + pad;
    const sx = (x: number) => (maxX === minX ? (padL + (W - padR)) / 2 : padL + ((x - minX) / (maxX - minX)) * (W - padL - padR));
    const sy = (y: number) => padT + (1 - (y - minY) / (maxY - minY || 1)) * (H - padT - padB);
    const path = points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
    const ticks = [minY, (minY + maxY) / 2, maxY];
    const xLabels = points.length > 1 ? [points[0]!, points[points.length - 1]!] : [points[0]!];
    return { sx, sy, path, ticks, xLabels, minY, maxY };
  }, [points, H]);

  if (!model) {
    return <div className="empty small">No data yet</div>;
  }
  const fmt = format ?? ((y: number) => String(Math.round(y)));
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }}>
        {model.ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={model.sy(t)} y2={model.sy(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={padL - 6} y={model.sy(t) + 4} fontSize={11} fill="var(--text-3)" textAnchor="end">
              {fmt(t)}
            </text>
          </g>
        ))}
        <path d={model.path} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={i} cx={model.sx(p.x)} cy={model.sy(p.y)} r={3.5} fill="var(--accent)">
            <title>{`${p.label ?? ""} ${fmt(p.y)}`.trim()}</title>
          </circle>
        ))}
        {model.xLabels.map((p, i) => (
          <text
            key={i}
            x={model.sx(p.x)}
            y={H - 6}
            fontSize={11}
            fill="var(--text-3)"
            textAnchor={i === 0 && model.xLabels.length > 1 ? "start" : model.xLabels.length > 1 ? "end" : "middle"}
          >
            {p.label ?? ""}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function BarChart({
  bars,
  height = 140,
  format,
  highlightLast,
}: {
  bars: { label: string; value: number; sub?: string }[];
  height?: number;
  format?: (v: number) => string;
  highlightLast?: boolean;
}) {
  const W = 600;
  const H = height;
  const padB = 22;
  const padT = 18;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const gap = 6;
  const bw = (W - gap * (bars.length + 1)) / Math.max(1, bars.length);
  const fmt = format ?? ((v: number) => String(v));
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }}>
        {bars.map((b, i) => {
          const h = (b.value / max) * (H - padT - padB);
          const x = gap + i * (bw + gap);
          const y = H - padB - h;
          const last = i === bars.length - 1;
          return (
            <g key={i}>
              <rect x={x} y={y} width={bw} height={Math.max(h, b.value > 0 ? 2 : 0)} rx={4} fill={highlightLast && last ? "var(--accent)" : "var(--accent-soft)"} stroke={highlightLast && last ? "none" : "var(--accent)"} strokeWidth={1} />
              {b.value > 0 && (
                <text x={x + bw / 2} y={y - 4} fontSize={11} fill="var(--text-2)" textAnchor="middle">
                  {fmt(b.value)}
                </text>
              )}
              <text x={x + bw / 2} y={H - 6} fontSize={10} fill="var(--text-3)" textAnchor="middle">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
