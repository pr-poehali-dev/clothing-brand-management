import { CostItem, fmt } from '@/lib/atelier-data';

interface CostChartProps {
  items: CostItem[];
  total: number;
}

const palette = [
  'hsl(24 60% 52%)',
  'hsl(28 25% 22%)',
  'hsl(34 35% 60%)',
  'hsl(152 30% 45%)',
  'hsl(34 18% 78%)',
];

const CostChart = ({ items, total }: CostChartProps) => {
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
        {items.map((it, i) => (
          <div
            key={it.label}
            style={{ width: `${(it.value / total) * 100}%`, background: palette[i % palette.length] }}
            className="h-full transition-all"
          />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {items.map((it, i) => {
          const pct = (it.value / total) * 100;
          return (
            <div key={it.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: palette[i % palette.length] }}
                />
                <span className="text-sm text-foreground">{it.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{pct.toFixed(0)}%</span>
                <span className="w-24 text-right text-sm font-medium tabular-nums">
                  {fmt(it.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CostChart;
