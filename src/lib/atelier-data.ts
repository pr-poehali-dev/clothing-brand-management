export interface Material {
  id: string;
  name: string;
  type: 'Ткань' | 'Фурнитура';
  unit: string;
  pricePerUnit: number;
  stock: number;
  perItem: number;
}

export interface Order {
  id: string;
  date: string;
  product: string;
  qty: number;
  pricePerItem: number;
}

export interface CostItem {
  label: string;
  value: number;
}

export const products = ['Костюм «Таймень»', 'Костюм «Сёмга»', 'Костюм «Налим»'] as const;

export const materials: Material[] = [
  { id: 'm1', name: 'Мембрана 3-слойная', type: 'Ткань', unit: 'м', pricePerUnit: 1450, stock: 84, perItem: 3.2 },
  { id: 'm2', name: 'Флис-подкладка', type: 'Ткань', unit: 'м', pricePerUnit: 620, stock: 120, perItem: 2.5 },
  { id: 'm3', name: 'Сетка вентиляционная', type: 'Ткань', unit: 'м', pricePerUnit: 340, stock: 60, perItem: 0.8 },
  { id: 'f1', name: 'Молния влагозащитная YKK', type: 'Фурнитура', unit: 'шт', pricePerUnit: 280, stock: 45, perItem: 3 },
  { id: 'f2', name: 'Фастекс усиленный', type: 'Фурнитура', unit: 'шт', pricePerUnit: 35, stock: 200, perItem: 6 },
  { id: 'f3', name: 'Стопор-фиксатор', type: 'Фурнитура', unit: 'шт', pricePerUnit: 18, stock: 320, perItem: 4 },
  { id: 'f4', name: 'Светоотражающий кант', type: 'Фурнитура', unit: 'м', pricePerUnit: 90, stock: 75, perItem: 2.1 },
];

export const logistics = {
  perItemDelivery: 350,
  packaging: 120,
};

export const labor = 1800;

export const sizes = ['S', 'M', 'L', 'XL'] as const;
export type Size = (typeof sizes)[number];

// Коэффициент расхода ткани и пошива по размеру (M — базовый)
export const sizeFactor: Record<Size, number> = {
  S: 0.9,
  M: 1.0,
  L: 1.1,
  XL: 1.22,
};

// Постоянные расходы, автоматически входящие в КАЖДЫЙ костюм (на изделие)
export const overhead = {
  taxes: 1490, // налоги
  marketing: 900, // реклама
  logistics: 350, // логистика
};

export const overheadTotal = overhead.taxes + overhead.marketing + overhead.logistics;

export const orders: Order[] = [
  { id: 'o1', date: '2026-06-02', product: 'Костюм «Таймень»', qty: 5, pricePerItem: 14900 },
  { id: 'o2', date: '2026-06-05', product: 'Костюм «Сёмга»', qty: 3, pricePerItem: 16500 },
  { id: 'o3', date: '2026-06-09', product: 'Костюм «Налим»', qty: 4, pricePerItem: 12900 },
  { id: 'o4', date: '2026-06-11', product: 'Костюм «Таймень»', qty: 6, pricePerItem: 14900 },
  { id: 'o5', date: '2026-06-14', product: 'Костюм «Сёмга»', qty: 2, pricePerItem: 16500 },
];

export const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₽';

export function materialCostPerItem(size: Size = 'M') {
  // ткань масштабируется по размеру, фурнитура — фиксированная
  return materials.reduce((s, m) => {
    const factor = m.type === 'Ткань' ? sizeFactor[size] : 1;
    return s + m.pricePerUnit * m.perItem * factor;
  }, 0);
}

// Себестоимость одного изделия конкретного размера (с учётом постоянных расходов)
export function unitCost(size: Size = 'M') {
  const labrCost = labor * sizeFactor[size];
  return (
    materialCostPerItem(size) +
    labrCost +
    logistics.perItemDelivery +
    logistics.packaging +
    overheadTotal
  );
}

export function costBreakdown(size: Size = 'M'): CostItem[] {
  const factor = sizeFactor[size];
  const fabric = materials
    .filter((m) => m.type === 'Ткань')
    .reduce((s, m) => s + m.pricePerUnit * m.perItem * factor, 0);
  const hardware = materials
    .filter((m) => m.type === 'Фурнитура')
    .reduce((s, m) => s + m.pricePerUnit * m.perItem, 0);
  return [
    { label: 'Ткань', value: Math.round(fabric) },
    { label: 'Фурнитура', value: Math.round(hardware) },
    { label: 'Пошив', value: Math.round(labor * factor) },
    { label: 'Упаковка', value: logistics.packaging },
    { label: 'Налоги', value: overhead.taxes },
    { label: 'Реклама', value: overhead.marketing },
    { label: 'Логистика', value: logistics.perItemDelivery + overhead.logistics },
  ];
}

export interface SizeCost {
  size: Size;
  material: number;
  cost: number;
}

export function costBySize(): SizeCost[] {
  return sizes.map((s) => ({
    size: s,
    material: Math.round(materialCostPerItem(s)),
    cost: Math.round(unitCost(s)),
  }));
}

export function totals() {
  const revenue = orders.reduce((s, o) => s + o.qty * o.pricePerItem, 0);
  const unitsSold = orders.reduce((s, o) => s + o.qty, 0);
  const cost = unitsSold * unitCost('M');
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  return { revenue, unitsSold, cost: Math.round(cost), profit: Math.round(profit), margin };
}

export interface ProductProfit {
  product: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export function profitByProduct(): ProductProfit[] {
  const uc = unitCost();
  return products.map((p) => {
    const rows = orders.filter((o) => o.product === p);
    const units = rows.reduce((s, o) => s + o.qty, 0);
    const revenue = rows.reduce((s, o) => s + o.qty * o.pricePerItem, 0);
    const cost = Math.round(units * uc);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { product: p, units, revenue, cost, profit, margin };
  });
}