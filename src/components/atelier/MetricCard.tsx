import Icon from '@/components/ui/icon';

interface MetricCardProps {
  label: string;
  value: string;
  icon: string;
  hint?: string;
  accent?: boolean;
  delay?: number;
}

const MetricCard = ({ label, value, icon, hint, accent, delay = 0 }: MetricCardProps) => {
  return (
    <div
      className="animate-fade-up rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            accent ? 'bg-accent text-accent-foreground' : 'bg-secondary text-primary'
          }`}
        >
          <Icon name={icon} size={17} />
        </div>
      </div>
      <div className="mt-5 font-display text-4xl font-medium leading-none text-foreground">
        {value}
      </div>
      {hint && <div className="mt-2 text-sm text-muted-foreground">{hint}</div>}
    </div>
  );
};

export default MetricCard;
