import * as React from 'react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';

export interface SalesPipelineStage {
  id: string;
  label: string;
  color: string;
  count: number;
}

export function SalesPipelinePieChart({ stages }: { stages: SalesPipelineStage[] }) {
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <div className="dashboard-pipeline-chart grid min-h-0 items-center gap-5 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.72fr)]">
      <div
        className="relative h-52 min-w-0"
        role="img"
        aria-label={`${total} total leads split across ${stages.length} pipeline stages`}
      >
        {total > 0 && (
          <PieChart responsive style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 208 }}>
            <Pie
              data={stages}
              dataKey="count"
              nameKey="label"
              innerRadius="55%"
              outerRadius="82%"
              paddingAngle={2}
              stroke="none"
            >
              {stages.map((stage) => <Cell key={stage.id} fill={stage.color} />)}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${Number(value) || 0} leads`, String(name)]}
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '6px' }}
              itemStyle={{ color: '#f4f4f5' }}
            />
          </PieChart>
        )}
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="font-mono text-2xl font-bold tabular-nums text-white">{total}</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total leads</span>
        </div>
      </div>

      <div className="dashboard-pipeline-legend max-h-52 min-w-0 overflow-y-auto pr-2">
        {stages.map((stage) => {
          const percentage = total > 0 ? (stage.count / total) * 100 : 0;
          return (
            <div key={stage.id} className="flex min-h-10 items-center gap-3 border-b border-zinc-800 last:border-b-0">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-300">{stage.label}</span>
              <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-white">{stage.count}</span>
              <span className="w-11 shrink-0 text-right font-mono text-[10px] tabular-nums text-zinc-500">{percentage.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
