import { useState, useRef } from 'react';
import Icon from '@/components/ui/icon';
import MetricCard from '@/components/atelier/MetricCard';
import CostChart from '@/components/atelier/CostChart';
import {
  Material,
  Supplier,
  orders as initialOrders,
  materials as initialMaterials,
  sizes,
  Size,
  sizeFactor,
  fmt,
} from '@/lib/atelier-data';

// ── Утилиты ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9)

// ── Типы ─────────────────────────────────────────────────────────────────────
interface TaskItem     { id: string; text: string; done: boolean }
interface NoteItem     { id: string; text: string; color: NoteColor }
interface ReminderItem { id: string; text: string; date: string; done: boolean }
type NoteColor = 'blue' | 'olive' | 'sand' | 'slate'

interface ActiveOrder {
  id: string; date: string; product: string; qty: number; pricePerItem: number; note: string;
}
interface ArchiveOrder extends ActiveOrder { completedAt: string }
interface WriteOff {
  id: string; date: string; materialName: string; qty: number; unit: string; reason: string;
}
interface Overhead { taxes: number; marketing: number; logistics: number }

// ── Расчёты (принимают параметры, не из модуля) ──────────────────────────────
function calcMaterialCost(mats: Material[], size: Size) {
  return mats.reduce((s, m) => {
    const factor = m.type === 'Ткань' ? sizeFactor[size] : 1
    return s + m.pricePerUnit * m.perItem * factor
  }, 0)
}
function calcUnitCost(mats: Material[], size: Size, labor: number, oh: Overhead) {
  return calcMaterialCost(mats, size) + labor * sizeFactor[size]
    + oh.taxes + oh.marketing + oh.logistics
}
function calcBreakdown(mats: Material[], size: Size, labor: number, oh: Overhead) {
  const factor = sizeFactor[size]
  const fabric   = mats.filter(m => m.type === 'Ткань').reduce((s, m) => s + m.pricePerUnit * m.perItem * factor, 0)
  const hardware = mats.filter(m => m.type === 'Фурнитура').reduce((s, m) => s + m.pricePerUnit * m.perItem, 0)
  return [
    { label: 'Ткань',      value: Math.round(fabric) },
    { label: 'Фурнитура',  value: Math.round(hardware) },
    { label: 'Пошив',      value: Math.round(labor * factor) },
    { label: 'Налоги',     value: oh.taxes },
    { label: 'Реклама',    value: oh.marketing },
    { label: 'Логистика',  value: oh.logistics },
  ]
}

// ── Константы UI ──────────────────────────────────────────────────────────────
const NOTE_COLORS: Record<NoteColor, string> = {
  blue:  'bg-sky-50 border-sky-200 text-sky-900',
  olive: 'bg-green-50 border-green-200 text-green-900',
  sand:  'bg-amber-50 border-amber-200 text-amber-900',
  slate: 'bg-slate-50 border-slate-200 text-slate-900',
}

type Tab = 'dashboard' | 'materials' | 'cost' | 'orders' | 'profit' | 'archive'
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Обзор',         icon: 'LayoutDashboard' },
  { id: 'materials', label: 'Материалы',     icon: 'Package' },
  { id: 'cost',      label: 'Себестоимость', icon: 'Calculator' },
  { id: 'orders',    label: 'Заказы',        icon: 'ShoppingBag' },
  { id: 'profit',    label: 'Прибыльность',  icon: 'TrendingUp' },
  { id: 'archive',   label: 'Архив',         icon: 'Archive' },
]

const emptyMat = (): Omit<Material, 'id'> => ({
  name: '', type: 'Ткань', unit: 'м', pricePerUnit: 0,
  stock: 0, maxStock: 0, usedQty: 0, perItem: 0,
  supplier: { name: '', site: '', contact: '', deliveryDays: 1 },
})

const FInput = ({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string;
}) => (
  <label className="block">
    <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
    <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
  </label>
)

// ══════════════════════════════════════════════════════════════════════════════
const Index = () => {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [size, setSize] = useState<Size>('M')

  // ── Материалы ──────────────────────────────────────────────────────────────
  const [matList, setMatList] = useState<Material[]>(initialMaterials)
  const [matModal, setMatModal] = useState<{ open: boolean; editing: Material | null }>({ open: false, editing: null })
  const [matForm, setMatForm] = useState<Omit<Material, 'id'>>(emptyMat())

  const openAddMat  = () => { setMatForm(emptyMat()); setMatModal({ open: true, editing: null }) }
  const openEditMat = (m: Material) => {
    setMatForm({ name: m.name, type: m.type, unit: m.unit, pricePerUnit: m.pricePerUnit,
      stock: m.stock, maxStock: m.maxStock, usedQty: m.usedQty, perItem: m.perItem,
      supplier: { ...m.supplier } })
    setMatModal({ open: true, editing: m })
  }
  const saveMat = () => {
    if (!matForm.name.trim()) return
    if (matModal.editing) setMatList(p => p.map(m => m.id === matModal.editing!.id ? { ...matForm, id: matModal.editing!.id } : m))
    else setMatList(p => [...p, { ...matForm, id: uid() }])
    setMatModal({ open: false, editing: null })
  }
  const deleteMat = (id: string) => setMatList(p => p.filter(m => m.id !== id))
  const setF = (key: keyof Omit<Material, 'id' | 'supplier'>, val: string) =>
    setMatForm(p => ({ ...p, [key]: ['pricePerUnit','stock','maxStock','usedQty','perItem'].includes(key) ? Number(val) : val }))
  const setS = (key: keyof Supplier, val: string) =>
    setMatForm(p => ({ ...p, supplier: { ...p.supplier, [key]: key === 'deliveryDays' ? Number(val) : val } }))

  // ── Редактируемая себестоимость ─────────────────────────────────────────────
  const [labor, setLabor] = useState(1800)
  const [oh, setOh] = useState<Overhead>({ taxes: 1490, marketing: 900, logistics: 350 })
  const [editCost, setEditCost] = useState(false)
  const [costDraft, setCostDraft] = useState({ labor, ...oh })

  const openCostEdit = () => { setCostDraft({ labor, ...oh }); setEditCost(true) }
  const saveCostEdit = () => {
    setLabor(costDraft.labor)
    setOh({ taxes: costDraft.taxes, marketing: costDraft.marketing, logistics: costDraft.logistics })
    setEditCost(false)
  }

  // Производные расчёты себестоимости
  const ohTotal     = oh.taxes + oh.marketing + oh.logistics
  const uc          = Math.round(calcUnitCost(matList, 'M', labor, oh))
  const breakdown   = calcBreakdown(matList, 'M', labor, oh)
  const sizeUc      = Math.round(calcUnitCost(matList, size, labor, oh))
  const sizeBreakdown = calcBreakdown(matList, size, labor, oh)
  const bySize      = sizes.map(s => ({ size: s, material: Math.round(calcMaterialCost(matList, s)), cost: Math.round(calcUnitCost(matList, s, labor, oh)) }))

  // ── Заказы (активные) ──────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>(
    initialOrders.map(o => ({ ...o, note: '' }))
  )
  const [orderModal, setOrderModal] = useState(false)
  const [orderForm, setOrderForm] = useState<Omit<ActiveOrder,'id'>>({ date: today, product: '', qty: 1, pricePerItem: 0, note: '' })

  const saveActiveOrder = () => {
    if (!orderForm.product.trim()) return
    setActiveOrders(p => [{ ...orderForm, id: uid() }, ...p])
    setOrderModal(false)
    setOrderForm({ date: today, product: '', qty: 1, pricePerItem: 0, note: '' })
  }
  const deleteActiveOrder = (id: string) => setActiveOrders(p => p.filter(o => o.id !== id))

  // Кнопка «Выполнен» — переносит заказ в архив
  const completeOrder = (id: string) => {
    const order = activeOrders.find(o => o.id === id)
    if (!order) return
    setArchiveOrders(p => [{ ...order, completedAt: today }, ...p])
    setActiveOrders(p => p.filter(o => o.id !== id))
  }

  // Итоги по активным заказам
  const activeRevenue  = activeOrders.reduce((s, o) => s + o.qty * o.pricePerItem, 0)
  const activeUnitsSold = activeOrders.reduce((s, o) => s + o.qty, 0)
  const activeCost     = activeUnitsSold * uc
  const activeProfit   = activeRevenue - activeCost
  const activeMargin   = activeRevenue > 0 ? (activeProfit / activeRevenue) * 100 : 0

  // ── Архив заказов ─────────────────────────────────────────────────────────
  const [archiveOrders, setArchiveOrders] = useState<ArchiveOrder[]>([])
  const deleteArchiveOrder = (id: string) => setArchiveOrders(p => p.filter(o => o.id !== id))

  // ── Архив списаний ────────────────────────────────────────────────────────
  const [writeOffs, setWriteOffs] = useState<WriteOff[]>([
    { id: uid(), date: '2026-06-10', materialName: 'Мембрана 3-слойная', qty: 9.6, unit: 'м', reason: 'Пошив 3 костюмов «Таймень»' },
    { id: uid(), date: '2026-06-12', materialName: 'Молния влагозащитная YKK', qty: 9, unit: 'шт', reason: 'Пошив 3 костюмов «Сёмга»' },
    { id: uid(), date: '2026-06-14', materialName: 'Флис-подкладка', qty: 7.5, unit: 'м', reason: 'Пошив 3 костюмов «Таймень»' },
  ])
  const [woModal, setWoModal] = useState(false)
  const [woForm, setWoForm] = useState<Omit<WriteOff,'id'>>({ date: today, materialName: '', qty: 0, unit: 'м', reason: '' })
  const saveWo = () => {
    if (!woForm.materialName.trim()) return
    setWriteOffs(p => [{ ...woForm, id: uid() }, ...p])
    setWoModal(false)
    setWoForm({ date: today, materialName: '', qty: 0, unit: 'м', reason: '' })
  }
  const deleteWo = (id: string) => setWriteOffs(p => p.filter(w => w.id !== id))

  const [archiveTab, setArchiveTab] = useState<'orders' | 'writeoffs'>('orders')

  // ── Прибыльность по продуктам ─────────────────────────────────────────────
  const allProducts = [...new Set(activeOrders.map(o => o.product))]
  const profitByProduct = allProducts.map(p => {
    const rows = activeOrders.filter(o => o.product === p)
    const units   = rows.reduce((s, o) => s + o.qty, 0)
    const revenue = rows.reduce((s, o) => s + o.qty * o.pricePerItem, 0)
    const cost    = Math.round(units * uc)
    const profit  = revenue - cost
    const margin  = revenue > 0 ? (profit / revenue) * 100 : 0
    return { product: p, units, revenue, cost, profit, margin }
  })

  // ── Виджеты дашборда ──────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: uid(), text: 'Заказать мембрану 3-слойную (запас заканчивается)', done: false },
    { id: uid(), text: 'Согласовать новый прайс с поставщиком YKK', done: false },
    { id: uid(), text: 'Отправить костюмы «Таймень» клиенту из Екатеринбурга', done: true },
  ])
  const [taskInput, setTaskInput] = useState('')
  const taskRef = useRef<HTMLInputElement>(null)
  const addTask    = () => { if (!taskInput.trim()) return; setTasks(p => [...p, { id: uid(), text: taskInput.trim(), done: false }]); setTaskInput('') }
  const toggleTask = (id: string) => setTasks(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const removeTask = (id: string) => setTasks(p => p.filter(t => t.id !== id))

  const [notes, setNotes] = useState<NoteItem[]>([
    { id: uid(), text: 'Попробовать новую ткань — дышащий таслан для летней линейки', color: 'olive' },
    { id: uid(), text: 'Идея: добавить карман для термоса внутри костюма', color: 'blue' },
  ])
  const [noteInput, setNoteInput] = useState('')
  const [noteColor, setNoteColor] = useState<NoteColor>('blue')
  const addNote    = () => { if (!noteInput.trim()) return; setNotes(p => [...p, { id: uid(), text: noteInput.trim(), color: noteColor }]); setNoteInput('') }
  const removeNote = (id: string) => setNotes(p => p.filter(n => n.id !== id))

  const [reminders, setReminders] = useState<ReminderItem[]>([
    { id: uid(), text: 'Оплатить счёт от ТекстильПро', date: '2026-06-18', done: false },
    { id: uid(), text: 'Съёмка новой коллекции для каталога', date: '2026-06-25', done: false },
  ])
  const [remText, setRemText] = useState('')
  const [remDate, setRemDate] = useState('')
  const addReminder    = () => { if (!remText.trim() || !remDate) return; setReminders(p => [...p, { id: uid(), text: remText.trim(), date: remDate, done: false }]); setRemText(''); setRemDate('') }
  const toggleReminder = (id: string) => setReminders(p => p.map(r => r.id === id ? { ...r, done: !r.done } : r))
  const removeReminder = (id: string) => setReminders(p => p.filter(r => r.id !== id))
  const overdue = reminders.filter(r => !r.done && r.date < today).length

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background bg-grain">

      {/* Header */}
      <header className="border-b border-border/70 bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Icon name="Fish" size={18} />
            </div>
            <div className="leading-tight">
              <div className="font-display text-xl font-semibold">Арапайма</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Учёт производства</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <Icon name="Calendar" size={15} />Июнь 2026
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="mx-auto mt-6 max-w-6xl px-6">
        <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1.5">
          {tabs.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${tab === tb.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}>
              <Icon name={tb.icon} size={16} />{tb.label}
              {tb.id === 'orders' && activeOrders.length > 0 && (
                <span className="ml-0.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground leading-none">{activeOrders.length}</span>
              )}
              {tb.id === 'archive' && archiveOrders.length > 0 && (
                <span className="ml-0.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground leading-none">{archiveOrders.length}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-8">

        {/* ══ ДАШБОРД ══ */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Выручка"        value={fmt(activeRevenue)}  icon="Banknote"   accent hint={`${activeUnitsSold} изделий`} delay={0} />
              <MetricCard label="Чистая прибыль" value={fmt(activeProfit)}   icon="TrendingUp" hint={`Маржа ${activeMargin.toFixed(1)}%`} delay={60} />
              <MetricCard label="Расходы"        value={fmt(activeCost)}     icon="Wallet"     hint="Материалы + пошив + накладные" delay={120} />
              <MetricCard label="Себестоимость"  value={fmt(uc)}             icon="Tag"        hint="за одно изделие (M)" delay={180} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Задачи */}
              <div className="animate-fade-up rounded-2xl border border-border bg-card p-5" style={{ animationDelay: '200ms' }}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2"><Icon name="CheckSquare" size={16} className="text-accent" /><span className="font-medium">Задачи</span></div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{tasks.filter(t => !t.done).length} осталось</span>
                </div>
                <div className="mb-3 space-y-1.5">
                  {tasks.map(task => (
                    <div key={task.id} className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-secondary/50">
                      <button onClick={() => toggleTask(task.id)} className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${task.done ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-background'}`}>
                        {task.done && <Icon name="Check" size={10} />}
                      </button>
                      <span className={`flex-1 text-sm leading-snug ${task.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.text}</span>
                      <button onClick={() => removeTask(task.id)} className="hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:block"><Icon name="X" size={13} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input ref={taskRef} value={taskInput} onChange={e => setTaskInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder="Новая задача..."
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring" />
                  <button onClick={addTask} className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-80"><Icon name="Plus" size={16} /></button>
                </div>
              </div>
              {/* Заметки */}
              <div className="animate-fade-up rounded-2xl border border-border bg-card p-5" style={{ animationDelay: '260ms' }}>
                <div className="mb-4 flex items-center gap-2"><Icon name="StickyNote" size={16} className="text-accent" /><span className="font-medium">Заметки</span></div>
                <div className="mb-3 space-y-2">
                  {notes.map(note => (
                    <div key={note.id} className={`group relative rounded-xl border px-3 py-2.5 text-sm leading-snug ${NOTE_COLORS[note.color]}`}>
                      {note.text}
                      <button onClick={() => removeNote(note.id)} className="absolute right-2 top-2 hidden text-current opacity-40 hover:opacity-80 group-hover:block"><Icon name="X" size={13} /></button>
                    </div>
                  ))}
                  {notes.length === 0 && <div className="py-4 text-center text-sm text-muted-foreground">Нет заметок</div>}
                </div>
                <div className="space-y-2">
                  <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="Новая заметка..." rows={2}
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring" />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {(Object.keys(NOTE_COLORS) as NoteColor[]).map(c => (
                        <button key={c} onClick={() => setNoteColor(c)} className={`h-5 w-5 rounded-full border-2 transition-all ${c==='blue'?'bg-sky-300':c==='olive'?'bg-green-300':c==='sand'?'bg-amber-300':'bg-slate-300'} ${noteColor===c?'border-foreground scale-110':'border-transparent'}`} />
                      ))}
                    </div>
                    <button onClick={addNote} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-80"><Icon name="Plus" size={12} />Добавить</button>
                  </div>
                </div>
              </div>
              {/* Напоминания */}
              <div className="animate-fade-up rounded-2xl border border-border bg-card p-5" style={{ animationDelay: '320ms' }}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2"><Icon name="Bell" size={16} className="text-accent" /><span className="font-medium">Напоминания</span></div>
                  {overdue > 0 && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">{overdue} просрочено</span>}
                </div>
                <div className="mb-3 space-y-1.5">
                  {reminders.map(r => {
                    const isOverdue = !r.done && r.date < today
                    return (
                      <div key={r.id} className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-secondary/50">
                        <button onClick={() => toggleReminder(r.id)} className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${r.done?'border-accent bg-accent text-accent-foreground':'border-border bg-background'}`}>
                          {r.done && <Icon name="Check" size={10} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm leading-snug ${r.done?'text-muted-foreground line-through':'text-foreground'}`}>{r.text}</div>
                          <div className={`mt-0.5 text-xs ${isOverdue?'text-destructive font-medium':'text-muted-foreground'}`}>
                            {isOverdue ? '⚠ ' : ''}{new Date(r.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
                          </div>
                        </div>
                        <button onClick={() => removeReminder(r.id)} className="hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:block"><Icon name="X" size={13} /></button>
                      </div>
                    )
                  })}
                </div>
                <div className="space-y-2">
                  <input value={remText} onChange={e => setRemText(e.target.value)} placeholder="Текст напоминания..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring" />
                  <div className="flex gap-2">
                    <input type="date" value={remDate} onChange={e => setRemDate(e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                    <button onClick={addReminder} className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-80"><Icon name="Plus" size={16} /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ МАТЕРИАЛЫ ══ */}
        {tab === 'materials' && (
          <Section title="Ткань и фурнитура" subtitle="Остатки, расход и данные поставщиков">
            <div className="mb-4 flex justify-end">
              <button onClick={openAddMat} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-80">
                <Icon name="Plus" size={16} />Добавить материал
              </button>
            </div>
            <div className="space-y-3">
              {matList.map((m, i) => {
                const stockPct = m.maxStock > 0 ? Math.round((m.stock / m.maxStock) * 100) : 0
                const usedPct  = (m.stock + m.usedQty) > 0 ? Math.round((m.usedQty / (m.stock + m.usedQty)) * 100) : 0
                const isLow    = stockPct < 35
                return (
                  <div key={m.id} className="animate-fade-up rounded-2xl border border-border bg-card p-5" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{m.name}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.type==='Ткань'?'bg-accent/15 text-accent':'bg-secondary text-secondary-foreground'}`}>{m.type}</span>
                          {isLow && <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"><Icon name="AlertTriangle" size={11} />Мало</span>}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{fmt(m.pricePerUnit)}/{m.unit} · расход {m.perItem} {m.unit}/изд.</div>
                      </div>
                      <div className="flex shrink-0 items-start gap-2">
                        <div className="rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm">
                          <div className="font-medium text-foreground">{m.supplier.name}</div>
                          <div className="mt-0.5 flex flex-col gap-0.5 text-xs text-muted-foreground">
                            {m.supplier.site    && <span className="flex items-center gap-1"><Icon name="Globe"  size={11} />{m.supplier.site}</span>}
                            {m.supplier.contact && <span className="flex items-center gap-1"><Icon name="Phone"  size={11} />{m.supplier.contact}</span>}
                            <span className="flex items-center gap-1"><Icon name="Truck" size={11} />доставка {m.supplier.deliveryDays} дн.</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => openEditMat(m)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"><Icon name="Pencil" size={14} /></button>
                          <button onClick={() => deleteMat(m.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-destructive transition-colors"><Icon name="Trash2" size={14} /></button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Остаток на складе</span>
                          <span className={`font-medium tabular-nums ${isLow?'text-destructive':'text-foreground'}`}>{m.stock} / {m.maxStock} {m.unit}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div className={`h-full rounded-full transition-all ${isLow?'bg-destructive':'bg-success'}`} style={{ width: `${stockPct}%` }} />
                        </div>
                        <div className="mt-1 text-right text-xs text-muted-foreground">{stockPct}%</div>
                      </div>
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Израсходовано</span>
                          <span className="font-medium tabular-nums text-foreground">{m.usedQty} {m.unit}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-accent/70 transition-all" style={{ width: `${usedPct}%` }} />
                        </div>
                        <div className="mt-1 text-right text-xs text-muted-foreground">{usedPct}% от закупки</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* ══ СЕБЕСТОИМОСТЬ ══ */}
        {tab === 'cost' && (
          <Section title="Расчёт себестоимости" subtitle="Полная стоимость одного изделия по размерам">

            {/* Постоянные расходы — редактируемый блок */}
            <div className="mb-6 rounded-2xl border border-accent/30 bg-accent/[0.06] p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2"><Icon name="Repeat" size={16} className="text-accent" /><h3 className="font-display text-xl font-medium">Постоянные расходы</h3></div>
                  <p className="mt-0.5 text-sm text-muted-foreground">Автоматически входят в любой костюм — {fmt(ohTotal + labor)} на изделие (размер M)</p>
                </div>
                <button onClick={openCostEdit} className="flex items-center gap-2 rounded-xl border border-accent/40 bg-card px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10 transition-colors">
                  <Icon name="Pencil" size={14} />Редактировать
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { l: 'Пошив (базовый)',  v: labor,          i: 'Scissors',  hint: 'масштабируется по размеру' },
                  { l: 'Налоги',           v: oh.taxes,       i: 'Landmark',  hint: 'на изделие' },
                  { l: 'Реклама',          v: oh.marketing,   i: 'Megaphone', hint: 'на изделие' },
                  { l: 'Логистика',        v: oh.logistics,   i: 'Truck',     hint: 'на изделие' },
                ].map(o => (
                  <div key={o.l} className="rounded-xl bg-card px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Icon name={o.i} size={14} />{o.l}</div>
                    <div className="mt-1 font-display text-2xl font-medium tabular-nums">{fmt(o.v)}</div>
                    <div className="text-xs text-muted-foreground">{o.hint}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Таблица по размерам */}
            <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <h3 className="font-display text-xl font-medium">Себестоимость по размерам</h3>
                <p className="text-sm text-muted-foreground">Ткань и пошив масштабируются — нажмите строку для детализации</p>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Размер</th>
                  <th className="px-5 py-3 text-right font-medium">Материалы</th>
                  <th className="px-5 py-3 text-right font-medium">Накладные</th>
                  <th className="px-5 py-3 text-right font-medium">Итого</th>
                </tr></thead>
                <tbody>
                  {bySize.map(s => (
                    <tr key={s.size} onClick={() => setSize(s.size)} className={`cursor-pointer border-b border-border/60 last:border-0 transition-colors ${size===s.size?'bg-accent/10':'hover:bg-secondary/30'}`}>
                      <td className="px-5 py-3.5"><span className="inline-flex h-7 w-9 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">{s.size}</span></td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{fmt(s.material)}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{fmt(ohTotal)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{fmt(s.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Детализация по выбранному размеру */}
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-2xl border border-border bg-primary p-8 text-primary-foreground">
                <div className="mb-4 flex gap-1.5">
                  {sizes.map(s => (
                    <button key={s} onClick={() => setSize(s)} className={`h-9 w-11 rounded-lg text-sm font-semibold transition-all ${size===s?'bg-accent text-accent-foreground':'bg-primary-foreground/10 text-primary-foreground/70 hover:bg-primary-foreground/20'}`}>{s}</button>
                  ))}
                </div>
                <div className="text-xs uppercase tracking-[0.2em] opacity-70">Итого · размер {size}</div>
                <div className="mt-2 font-display text-6xl font-medium">{fmt(sizeUc)}</div>
                <div className="mt-6 space-y-2 text-sm opacity-80">
                  {sizeBreakdown.map(b => (
                    <div key={b.label} className="flex justify-between border-b border-primary-foreground/15 pb-2"><span>{b.label}</span><span className="tabular-nums">{fmt(b.value)}</span></div>
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

        {/* ══ ЗАКАЗЫ ══ */}
        {tab === 'orders' && (
          <Section title="Активные заказы" subtitle="Нажмите «Выполнен» — заказ автоматически уйдёт в архив">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-4 py-2 text-sm text-muted-foreground">
                <Icon name="Info" size={14} />
                <span>{activeOrders.length} активных · в архиве {archiveOrders.length}</span>
              </div>
              <button onClick={() => setOrderModal(true)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-80">
                <Icon name="Plus" size={16} />Новый заказ
              </button>
            </div>

            {activeOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                <Icon name="ShoppingBag" size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                <div className="text-muted-foreground">Нет активных заказов</div>
                <div className="mt-1 text-sm text-muted-foreground/60">Все выполненные заказы перенесены в архив</div>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map((o, i) => (
                  <div key={o.id} className="animate-fade-up rounded-2xl border border-border bg-card p-5" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{o.product}</span>
                          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">{o.qty} шт</span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{new Date(o.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })}</span>
                          <span className="font-medium tabular-nums text-foreground">{fmt(o.qty * o.pricePerItem)}</span>
                        </div>
                        {o.note && <div className="mt-1 text-sm text-muted-foreground italic">{o.note}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => completeOrder(o.id)}
                          className="flex items-center gap-1.5 rounded-xl bg-success/15 px-3 py-2 text-sm font-medium text-success hover:bg-success/25 transition-colors">
                          <Icon name="CheckCircle" size={15} />Выполнен
                        </button>
                        <button onClick={() => deleteActiveOrder(o.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-destructive transition-colors">
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Итого по активным */}
            {activeOrders.length > 0 && (
              <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-secondary/40 p-5 sm:grid-cols-3">
                <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Выручка</div><div className="mt-1 font-display text-2xl font-medium">{fmt(activeRevenue)}</div></div>
                <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Расходы</div><div className="mt-1 font-display text-2xl font-medium">{fmt(activeCost)}</div></div>
                <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Прибыль</div><div className="mt-1 font-display text-2xl font-medium text-success">{fmt(activeProfit)}</div></div>
              </div>
            )}
          </Section>
        )}

        {/* ══ ПРИБЫЛЬНОСТЬ ══ */}
        {tab === 'profit' && (
          <Section title="Прибыльность по товарам" subtitle="Автоматический отчёт по активным заказам">
            {profitByProduct.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">Нет данных — добавьте заказы</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {profitByProduct.map((p, i) => (
                  <div key={p.product} className="animate-fade-up rounded-2xl border border-border bg-card p-6" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="font-display text-xl font-medium">{p.product}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{p.units} продано</div>
                    <div className="mt-5 space-y-2 text-sm">
                      <Row label="Выручка"  value={fmt(p.revenue)} />
                      <Row label="Затраты"  value={fmt(p.cost)}    muted />
                      <Row label="Прибыль"  value={fmt(p.profit)}  accent />
                    </div>
                    <div className="mt-5">
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="text-muted-foreground">Маржа</span>
                        <span className="font-medium text-success">{p.margin.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-success transition-all" style={{ width: `${Math.min(p.margin, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ══ АРХИВ ══ */}
        {tab === 'archive' && (
          <Section title="Архив" subtitle="Выполненные заказы и списания материалов">
            <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit">
              {[{ id: 'orders', label: 'Заказы', icon: 'ShoppingBag' }, { id: 'writeoffs', label: 'Списания', icon: 'Minus' }].map(at => (
                <button key={at.id} onClick={() => setArchiveTab(at.id as 'orders' | 'writeoffs')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${archiveTab===at.id?'bg-primary text-primary-foreground':'text-muted-foreground hover:bg-secondary'}`}>
                  <Icon name={at.icon} size={15} />{at.label}
                </button>
              ))}
            </div>

            {archiveTab === 'orders' && (
              <div>
                {archiveOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                    <Icon name="Archive" size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                    <div className="text-muted-foreground">Архив пуст</div>
                    <div className="mt-1 text-sm text-muted-foreground/60">Выполненные заказы будут появляться здесь</div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-5 py-3 font-medium">Выполнен</th>
                        <th className="px-5 py-3 font-medium">Изделие</th>
                        <th className="px-5 py-3 text-right font-medium">Кол-во</th>
                        <th className="px-5 py-3 text-right font-medium">Сумма</th>
                        <th className="px-5 py-3 font-medium">Примечание</th>
                        <th className="px-5 py-3" />
                      </tr></thead>
                      <tbody>
                        {archiveOrders.map(o => (
                          <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                            <td className="px-5 py-3.5 tabular-nums text-muted-foreground">{new Date(o.completedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td className="px-5 py-3.5 font-medium text-foreground">{o.product}</td>
                            <td className="px-5 py-3.5 text-right tabular-nums">{o.qty}</td>
                            <td className="px-5 py-3.5 text-right font-medium tabular-nums">{fmt(o.qty * o.pricePerItem)}</td>
                            <td className="px-5 py-3.5 text-muted-foreground">{o.note || '—'}</td>
                            <td className="px-5 py-3.5 text-right">
                              <button onClick={() => deleteArchiveOrder(o.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Icon name="Trash2" size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr className="bg-secondary/50 font-medium">
                        <td className="px-5 py-3.5" colSpan={2}>Итого в архиве</td>
                        <td className="px-5 py-3.5 text-right tabular-nums">{archiveOrders.reduce((s,o) => s + o.qty, 0)}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-accent">{fmt(archiveOrders.reduce((s,o) => s + o.qty * o.pricePerItem, 0))}</td>
                        <td colSpan={2} />
                      </tr></tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {archiveTab === 'writeoffs' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button onClick={() => setWoModal(true)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-80">
                    <Icon name="Plus" size={16} />Добавить списание
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Дата</th>
                      <th className="px-5 py-3 font-medium">Материал</th>
                      <th className="px-5 py-3 text-right font-medium">Количество</th>
                      <th className="px-5 py-3 font-medium">Причина</th>
                      <th className="px-5 py-3" />
                    </tr></thead>
                    <tbody>
                      {writeOffs.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">Нет списаний</td></tr>}
                      {writeOffs.map(w => (
                        <tr key={w.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                          <td className="px-5 py-3.5 tabular-nums text-muted-foreground">{new Date(w.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="px-5 py-3.5 font-medium text-foreground">{w.materialName}</td>
                          <td className="px-5 py-3.5 text-right tabular-nums">{w.qty} {w.unit}</td>
                          <td className="px-5 py-3.5 text-muted-foreground">{w.reason || '—'}</td>
                          <td className="px-5 py-3.5 text-right"><button onClick={() => deleteWo(w.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Icon name="Trash2" size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Section>
        )}
      </main>

      <footer className="border-t border-border/70 py-8 text-center text-sm text-muted-foreground">
        Арапайма · система учёта производства · {new Date().getFullYear()}
      </footer>

      {/* Модалка: редактирование себестоимости */}
      {editCost && (
        <Modal title="Постоянные расходы на изделие" onClose={() => setEditCost(false)} onSave={saveCostEdit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-xl bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
              Эти значения влияют на все расчёты себестоимости и прибыльности
            </div>
            <FInput label="Пошив — базовая стоимость, ₽ (размер M)" type="number" value={costDraft.labor}      onChange={v => setCostDraft(p => ({ ...p, labor:     Number(v) }))} />
            <div className="rounded-xl bg-secondary/30 px-3 py-2 text-xs text-muted-foreground flex items-center">Для S ×0.9, L ×1.1, XL ×1.22</div>
            <FInput label="Налоги, ₽ на изделие"    type="number" value={costDraft.taxes}     onChange={v => setCostDraft(p => ({ ...p, taxes:     Number(v) }))} />
            <FInput label="Реклама, ₽ на изделие"   type="number" value={costDraft.marketing} onChange={v => setCostDraft(p => ({ ...p, marketing: Number(v) }))} />
            <FInput label="Логистика, ₽ на изделие" type="number" value={costDraft.logistics} onChange={v => setCostDraft(p => ({ ...p, logistics: Number(v) }))} />
            <div className="rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3">
              <div className="text-xs text-muted-foreground">Итого накладные (M)</div>
              <div className="mt-1 font-display text-2xl font-medium text-accent">
                {fmt(costDraft.labor + costDraft.taxes + costDraft.marketing + costDraft.logistics)}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Модалка: редактирование материала */}
      {matModal.open && (
        <Modal title={matModal.editing ? 'Редактировать материал' : 'Новый материал'} onClose={() => setMatModal({ open: false, editing: null })} onSave={saveMat}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><FInput label="Название" value={matForm.name} onChange={v => setF('name', v)} placeholder="Мембрана 3-слойная" /></div>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Тип</span>
              <select value={matForm.type} onChange={e => setF('type', e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option>Ткань</option><option>Фурнитура</option>
              </select></label>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Единица</span>
              <select value={matForm.unit} onChange={e => setF('unit', e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="м">м (метр)</option><option value="шт">шт</option><option value="рул">рул</option>
              </select></label>
            <FInput label="Цена за единицу (₽)" type="number" value={matForm.pricePerUnit} onChange={v => setF('pricePerUnit', v)} />
            <FInput label="Расход на изделие"    type="number" value={matForm.perItem}      onChange={v => setF('perItem', v)} />
            <FInput label="Остаток на складе"    type="number" value={matForm.stock}        onChange={v => setF('stock', v)} />
            <FInput label="Максимальный запас"   type="number" value={matForm.maxStock}     onChange={v => setF('maxStock', v)} />
            <FInput label="Израсходовано всего"  type="number" value={matForm.usedQty}      onChange={v => setF('usedQty', v)} />
            <div />
            <div className="sm:col-span-2 border-t border-border pt-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Поставщик</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FInput label="Название"  value={matForm.supplier.name}          onChange={v => setS('name', v)}         placeholder="ТекстильПро" />
                <FInput label="Сайт"      value={matForm.supplier.site || ''}    onChange={v => setS('site', v)}         placeholder="textilpro.ru" />
                <FInput label="Контакт"   value={matForm.supplier.contact || ''} onChange={v => setS('contact', v)}      placeholder="+7 495 123-45-67" />
                <FInput label="Доставка (дн.)" type="number" value={matForm.supplier.deliveryDays} onChange={v => setS('deliveryDays', v)} />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Модалка: новый заказ */}
      {orderModal && (
        <Modal title="Новый заказ" onClose={() => setOrderModal(false)} onSave={saveActiveOrder}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><FInput label="Изделие" value={orderForm.product} onChange={v => setOrderForm(p => ({ ...p, product: v }))} placeholder="Костюм «Таймень»" /></div>
            <FInput label="Дата"              type="date"   value={orderForm.date}         onChange={v => setOrderForm(p => ({ ...p, date: v }))} />
            <FInput label="Количество"        type="number" value={orderForm.qty}          onChange={v => setOrderForm(p => ({ ...p, qty: Number(v) }))} />
            <FInput label="Цена за изделие (₽)" type="number" value={orderForm.pricePerItem} onChange={v => setOrderForm(p => ({ ...p, pricePerItem: Number(v) }))} />
            <div className="sm:col-span-2"><FInput label="Примечание (клиент, регион...)" value={orderForm.note} onChange={v => setOrderForm(p => ({ ...p, note: v }))} placeholder="Иванов, Новосибирск" /></div>
          </div>
        </Modal>
      )}

      {/* Модалка: списание */}
      {woModal && (
        <Modal title="Добавить списание" onClose={() => setWoModal(false)} onSave={saveWo}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Материал</span>
                <select value={woForm.materialName} onChange={e => {
                  const m = matList.find(m => m.name === e.target.value)
                  setWoForm(p => ({ ...p, materialName: e.target.value, unit: m?.unit || 'м' }))
                }} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">— выберите —</option>
                  {matList.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </label>
            </div>
            <FInput label="Дата" type="date" value={woForm.date} onChange={v => setWoForm(p => ({ ...p, date: v }))} />
            <FInput label={`Количество (${woForm.unit})`} type="number" value={woForm.qty} onChange={v => setWoForm(p => ({ ...p, qty: Number(v) }))} />
            <div className="sm:col-span-2"><FInput label="Причина" value={woForm.reason} onChange={v => setWoForm(p => ({ ...p, reason: v }))} placeholder="Пошив 5 костюмов «Таймень»" /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Вспомогательные компоненты ───────────────────────────────────────────────
const Section = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <div className="animate-fade-up space-y-5">
    <div><h2 className="font-display text-3xl font-medium">{title}</h2><p className="text-muted-foreground">{subtitle}</p></div>
    {children}
  </div>
)

const Row = ({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) => (
  <div className="flex justify-between border-b border-border/60 pb-2 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className={`tabular-nums ${accent?'font-semibold text-accent':muted?'text-muted-foreground':'font-medium'}`}>{value}</span>
  </div>
)

const Modal = ({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
    <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="font-display text-xl font-medium">{title}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
      <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
        <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">Отмена</button>
        <button onClick={onSave} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-80">Сохранить</button>
      </div>
    </div>
  </div>
)

export default Index
