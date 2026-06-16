import { useState } from 'react';
import Icon from '@/components/ui/icon';
import MetricCard from '@/components/atelier/MetricCard';
import CostChart from '@/components/atelier/CostChart';
import {
  materials,
  orders,
  totals,
  costBreakdown,
  unitCost,
  profitByProduct,
  costBySize,
  sizes,
  Size,
  overhead,
  overheadTotal,
  fmt,
} from '@/lib/atelier-data';

const HERO = 'https://cdn.poehali.dev/projects/b64ce30a-748b-476e-b108-36b20c8e1977/files/d1e50a0e-1a10-477c-8ac1-d703fd06607f.jpg';

type Tab = 'dashboard' | 'materials' | 'cost' | 'orders' | 'profit';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Обзор', icon: 'LayoutDashboard' },
  { id: 'materials', label: 'Материалы', icon: 'Package' },
  { id: 'cost', label: 'Себестоимость', icon: 'Calculator' },
  { id: 'orders', label: 'Заказы', icon: 'ShoppingBag' },
  { id: 'profit', label: 'Прибыльность', icon: 'TrendingUp' },
];

const Index = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [size, setSize] = useState<Size>('M');
  const t = totals();
  const breakdown = costBreakdown('M');
  const uc = Math.round(unitCost('M'));
  const products = profitByProduct();
  const sizeBreakdown = costBreakdown(size);
  const sizeUc = Math.round(unitCost(size));
  const bySize = costBySize();

  return (
    <div className="min-h-screen bg-background bg-grain">
      {/* Header */}
      <header className="border-b border-border/70 bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Icon name="Anchor" size={18} />
            </div>
            <div className="leading-tight">
              <div className="font-display text-xl font-semibold">Ателье</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Учёт производства
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <Icon name="Calendar" size={15} />
            Июнь 2026
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-10">
        <div className="grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
          <div className="animate-fade-up">
            <div className="mb-3 text-xs uppercase tracking-[0.22em] text-accent">
              Костюмы для рыбаков
            </div>
            <h1 className="font-display text-5xl font-medium leading-[1.05] text-foreground md:text-6xl">
              Каждая нить —<br />под контролем
            </h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              Материалы, себестоимость, продажи и прибыль вашего бренда — в одном спокойном
              пространстве.
            </p>
          </div>
          <div className="animate-fade-up overflow-hidden rounded-2xl border border-border" style={{ animationDelay: '120ms' }}>
            <img src={HERO} alt="Материалы" className="aspect-[4/3] w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="mx-auto mt-10 max-w-6xl px-6">
        <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1.5">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                tab === tb.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              <Icon name={tb.icon} size={16} />
              {tb.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Выручка" value={fmt(t.revenue)} icon="Banknote" accent hint={`${t.unitsSold} изделий продано`} delay={0} />
              <MetricCard label="Чистая прибыль" value={fmt(t.profit)} icon="TrendingUp" hint={`Маржа ${t.margin.toFixed(1)}%`} delay={60} />
              <MetricCard label="Расходы" value={fmt(t.cost)} icon="Wallet" hint="Материалы + пошив + доставка" delay={120} />
              <MetricCard label="Себестоимость" value={fmt(uc)} icon="Tag" hint="за одно изделие" delay={180} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="animate-fade-up rounded-2xl border border-border bg-card p-6" style={{ animationDelay: '220ms' }}>
                <h3 className="font-display text-2xl font-medium">Прибыль и расходы</h3>
                <p className="mb-6 text-sm text-muted-foreground">Соотношение в выручке</p>
                <ProfitRatio profit={t.profit} cost={t.cost} revenue={t.revenue} />
              </div>
              <div className="animate-fade-up rounded-2xl border border-border bg-card p-6" style={{ animationDelay: '280ms' }}>
                <h3 className="font-display text-2xl font-medium">Структура себестоимости</h3>
                <p className="mb-6 text-sm text-muted-foreground">На одно изделие — {fmt(uc)}</p>
                <CostChart items={breakdown} total={uc} />
              </div>
            </div>
          </div>
        )}

        {tab === 'materials' && (
          <Section title="Ткань и фурнитура" subtitle="Остатки, расход и данные поставщиков">
            {/* Карточки материалов */}
            <div className="space-y-3">
              {materials.map((m, i) => {
                const stockPct = Math.round((m.stock / m.maxStock) * 100);
                const usedPct = Math.round((m.usedQty / (m.stock + m.usedQty)) * 100);
                const isLow = stockPct < 35;
                return (
                  <div
                    key={m.id}
                    className="animate-fade-up rounded-2xl border border-border bg-card p-5"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      {/* Левый блок: название + тип + цена */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{m.name}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.type === 'Ткань' ? 'bg-accent/15 text-accent' : 'bg-secondary text-secondary-foreground'}`}>
                            {m.type}
                          </span>
                          {isLow && (
                            <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                              <Icon name="AlertTriangle" size={11} /> Мало
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {fmt(m.pricePerUnit)}/{m.unit} · расход {m.perItem} {m.unit}/изд.
                        </div>
                      </div>

                      {/* Правый блок: поставщик */}
                      <div className="shrink-0 rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm">
                        <div className="font-medium text-foreground">{m.supplier.name}</div>
                        <div className="mt-0.5 flex flex-col gap-0.5 text-xs text-muted-foreground">
                          {m.supplier.site && (
                            <span className="flex items-center gap-1">
                              <Icon name="Globe" size={11} />
                              {m.supplier.site}
                            </span>
                          )}
                          {m.supplier.contact && (
                            <span className="flex items-center gap-1">
                              <Icon name="Phone" size={11} />
                              {m.supplier.contact}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Icon name="Truck" size={11} />
                            доставка {m.supplier.deliveryDays} дн.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Визуальный учёт: остаток + расход */}
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {/* Остаток */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Остаток на складе</span>
                          <span className={`font-medium tabular-nums ${isLow ? 'text-destructive' : 'text-foreground'}`}>
                            {m.stock} / {m.maxStock} {m.unit}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full transition-all ${isLow ? 'bg-destructive' : 'bg-success'}`}
                            style={{ width: `${stockPct}%` }}
                          />
                        </div>
                        <div className="mt-1 text-right text-xs text-muted-foreground">{stockPct}%</div>
                      </div>
                      {/* Расход */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Израсходовано</span>
                          <span className="font-medium tabular-nums text-foreground">
                            {m.usedQty} {m.unit}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-accent/70 transition-all"
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                        <div className="mt-1 text-right text-xs text-muted-foreground">{usedPct}% от закупки</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {tab === 'cost' && (
          <Section title="Расчёт себестоимости" subtitle="Полная стоимость одного изделия по размерам">
            {/* Постоянные расходы */}
            <div className="mb-6 rounded-2xl border border-accent/30 bg-accent/[0.06] p-6">
              <div className="flex items-center gap-2">
                <Icon name="Repeat" size={16} className="text-accent" />
                <h3 className="font-display text-xl font-medium">Постоянные расходы</h3>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Автоматически входят в любой костюм — {fmt(overheadTotal)} на изделие
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { l: 'Налоги', v: overhead.taxes, i: 'Landmark' },
                  { l: 'Реклама', v: overhead.marketing, i: 'Megaphone' },
                  { l: 'Логистика', v: overhead.logistics, i: 'Truck' },
                ].map((o) => (
                  <div key={o.l} className="flex items-center justify-between rounded-xl bg-card px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon name={o.i} size={15} /> {o.l}
                    </span>
                    <span className="font-medium tabular-nums">{fmt(o.v)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Себестоимость по размерам — таблица */}
            <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <h3 className="font-display text-xl font-medium">Себестоимость по размерам</h3>
                <p className="text-sm text-muted-foreground">Расход ткани и пошив зависят от размера</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Размер</th>
                    <th className="px-5 py-3 text-right font-medium">Материалы</th>
                    <th className="px-5 py-3 text-right font-medium">Постоянные</th>
                    <th className="px-5 py-3 text-right font-medium">Итого</th>
                  </tr>
                </thead>
                <tbody>
                  {bySize.map((s) => (
                    <tr
                      key={s.size}
                      onClick={() => setSize(s.size)}
                      className={`cursor-pointer border-b border-border/60 last:border-0 transition-colors ${
                        size === s.size ? 'bg-accent/10' : 'hover:bg-secondary/30'
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <span className="inline-flex h-7 w-9 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                          {s.size}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{fmt(s.material)}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{fmt(overheadTotal)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{fmt(s.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Детализация выбранного размера */}
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-2xl border border-border bg-primary p-8 text-primary-foreground">
                <div className="mb-4 flex gap-1.5">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`h-9 w-11 rounded-lg text-sm font-semibold transition-all ${
                        size === s
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-primary-foreground/10 text-primary-foreground/70 hover:bg-primary-foreground/20'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="text-xs uppercase tracking-[0.2em] opacity-70">Итого · размер {size}</div>
                <div className="mt-2 font-display text-6xl font-medium">{fmt(sizeUc)}</div>
                <div className="mt-6 space-y-2 text-sm opacity-80">
                  {sizeBreakdown.map((b) => (
                    <div key={b.label} className="flex justify-between border-b border-primary-foreground/15 pb-2">
                      <span>{b.label}</span>
                      <span className="tabular-nums">{fmt(b.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-1 font-display text-2xl font-medium">Распределение затрат · {size}</h3>
                <p className="mb-6 text-sm text-muted-foreground">Что формирует стоимость</p>
                <CostChart items={sizeBreakdown} total={sizeUc} />
              </div>
            </div>
          </Section>
        )}

        {tab === 'orders' && (
          <Section title="Реестр заказов" subtitle="Продажи и выручка по периоду">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Дата</th>
                    <th className="px-5 py-3 font-medium">Изделие</th>
                    <th className="px-5 py-3 text-right font-medium">Кол-во</th>
                    <th className="px-5 py-3 text-right font-medium">Цена</th>
                    <th className="px-5 py-3 text-right font-medium">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                      <td className="px-5 py-3.5 tabular-nums text-muted-foreground">
                        {new Date(o.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-foreground">{o.product}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{o.qty}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{fmt(o.pricePerItem)}</td>
                      <td className="px-5 py-3.5 text-right font-medium tabular-nums">{fmt(o.qty * o.pricePerItem)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/50 font-medium">
                    <td className="px-5 py-3.5" colSpan={2}>Итого</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{t.unitsSold}</td>
                    <td className="px-5 py-3.5"></td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-accent">{fmt(t.revenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>
        )}

        {tab === 'profit' && (
          <Section title="Прибыльность по товарам" subtitle="Автоматический отчёт за период">
            <div className="grid gap-4 md:grid-cols-3">
              {products.map((p, i) => (
                <div key={p.product} className="animate-fade-up rounded-2xl border border-border bg-card p-6" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="font-display text-xl font-medium">{p.product}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{p.units} продано</div>
                  <div className="mt-5 space-y-2 text-sm">
                    <Row label="Выручка" value={fmt(p.revenue)} />
                    <Row label="Затраты" value={fmt(p.cost)} muted />
                    <Row label="Прибыль" value={fmt(p.profit)} accent />
                  </div>
                  <div className="mt-5">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-muted-foreground">Маржа</span>
                      <span className="font-medium text-success">{p.margin.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-success transition-all" style={{ width: `${p.margin}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </main>

      <footer className="border-t border-border/70 py-8 text-center text-sm text-muted-foreground">
        Ателье · система учёта производства · {new Date().getFullYear()}
      </footer>
    </div>
  );
};

const Section = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <div className="animate-fade-up space-y-5">
    <div>
      <h2 className="font-display text-3xl font-medium">{title}</h2>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
    {children}
  </div>
);

const Row = ({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) => (
  <div className="flex justify-between border-b border-border/60 pb-2 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className={`tabular-nums ${accent ? 'font-semibold text-accent' : muted ? 'text-muted-foreground' : 'font-medium'}`}>
      {value}
    </span>
  </div>
);

const ProfitRatio = ({ profit, cost, revenue }: { profit: number; cost: number; revenue: number }) => {
  const profitPct = (profit / revenue) * 100;
  const costPct = (cost / revenue) * 100;
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        <div className="h-full bg-success" style={{ width: `${profitPct}%` }} />
        <div className="h-full bg-primary/30" style={{ width: `${costPct}%` }} />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-secondary/60 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-success" /> Прибыль
          </div>
          <div className="mt-2 font-display text-3xl font-medium text-success">{profitPct.toFixed(1)}%</div>
          <div className="text-sm tabular-nums text-muted-foreground">{fmt(profit)}</div>
        </div>
        <div className="rounded-xl bg-secondary/60 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-primary/40" /> Расходы
          </div>
          <div className="mt-2 font-display text-3xl font-medium text-foreground">{costPct.toFixed(1)}%</div>
          <div className="text-sm tabular-nums text-muted-foreground">{fmt(cost)}</div>
        </div>
      </div>
    </div>
  );
};

export default Index;