"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/Toast";
import {
  RevenueAreaChart, CashFlowBarChart, PaymentPieChart, TopProductsChart, PM_LABELS,
} from "@/components/DashboardCharts";
import {
  LayoutDashboard, DollarSign, TrendingUp, ShoppingCart, Package,
  Repeat2, CreditCard, Users, AlertTriangle, CheckCircle2,
  RefreshCw, ArrowUpRight, ArrowDownRight, Loader2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface DashData {
  period: { from: string; to: string };
  revenue: { total: number; previous: number; growth: number };
  profit: { total: number; previous: number; margin: number };
  costs: { products: number };
  sales: { count: number; prevCount: number; growth: number; avgTicket: number };
  inventory: { available: number; reserved: number; value: number; unpriced: number };
  tradeIn: { total: number; inPeriod: number; invested: number; awaiting: number; inRepair: number; available: number };
  receivables: { total: number; overdue: number; overdueCount: number; dueToday: number; dueTodayCount: number; dueMonth: number };
  customers: { total: number; newInPeriod: number };
  revenueChart: Array<{ date: string; revenue: number; profit: number }>;
  paymentMethods: Array<{ method: string; count: number; total: number }>;
  topProducts: Array<{ name: string; brand: string; count: number; revenue: number }>;
  topBrands: Array<{ brand: string; count: number; revenue: number }>;
  topCustomers: Array<{ name: string; count: number; revenue: number }>;
  cashFlow: Array<{ month: string; inflow: number; outflow: number }>;
  recentActivity: Array<{ type: string; title: string; subtitle: string; timestamp: string; amount?: number; cancelled?: boolean }>;
  alerts: Array<{ type: string; severity: string; title: string; count: number; amount?: number }>;
}

// ── Presets ───────────────────────────────────────────────────────────────────
const now = new Date();
const PRESETS = [
  { label: "Hoje",        from: format(now, "yyyy-MM-dd"),                              to: format(now, "yyyy-MM-dd") },
  { label: "Ontem",       from: format(subDays(now, 1), "yyyy-MM-dd"),                  to: format(subDays(now, 1), "yyyy-MM-dd") },
  { label: "7 dias",      from: format(subDays(now, 6), "yyyy-MM-dd"),                  to: format(now, "yyyy-MM-dd") },
  { label: "15 dias",     from: format(subDays(now, 14), "yyyy-MM-dd"),                 to: format(now, "yyyy-MM-dd") },
  { label: "30 dias",     from: format(subDays(now, 29), "yyyy-MM-dd"),                 to: format(now, "yyyy-MM-dd") },
  { label: "Este mês",    from: format(startOfMonth(now), "yyyy-MM-dd"),                to: format(now, "yyyy-MM-dd") },
  { label: "Mês passado", from: format(startOfMonth(subMonths(now,1)), "yyyy-MM-dd"),   to: format(endOfMonth(subMonths(now,1)), "yyyy-MM-dd") },
  { label: "Este ano",    from: format(startOfYear(now), "yyyy-MM-dd"),                 to: format(now, "yyyy-MM-dd") },
];

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtCompact = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1)}k`;
  return fmt(v);
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "agora mesmo";
  if (diff < 3600)  return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return format(new Date(iso), "dd/MM 'às' HH:mm", { locale: ptBR });
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, growth, icon, loading, alert }: {
  label: string; value: string; sub?: string; growth?: number;
  icon: React.ReactNode; loading?: boolean; alert?: boolean;
}) {
  return (
    <div className={`bg-card border rounded-2xl p-5 shadow-sm flex flex-col gap-2 ${alert ? "border-red-500/30" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      {loading
        ? <div className="h-8 w-28 bg-muted/40 rounded-lg animate-pulse" />
        : <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
      }
      {sub && (
        <div className="flex items-center justify-between min-h-[18px]">
          <span className="text-xs text-muted-foreground">{sub}</span>
          {growth !== undefined && !loading && growth !== 0 && (
            <span className={`flex items-center gap-0.5 text-xs font-bold ${growth > 0 ? "text-emerald-500" : "text-red-500"}`}>
              {growth > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(growth).toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`bg-muted/40 rounded-xl animate-pulse ${className}`} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { showToast } = useToast();
  const toastRef       = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; }, [showToast]);

  const [data,         setData]         = useState<DashData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [activePreset, setActivePreset] = useState(4);
  const [from,         setFrom]         = useState(PRESETS[4].from);
  const [to,           setTo]           = useState(PRESETS[4].to);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (f: string, t: string, silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await fetch(`/api/dashboard?from=${f}&to=${t}`);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e: any) {
      if (!silent) toastRef.current("Erro ao carregar métricas: " + (e?.message ?? ""), "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // load is stable — deps intentionally empty
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load(from, to);
    intervalRef.current = setInterval(() => load(from, to, true), 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const applyPreset = (idx: number) => {
    setActivePreset(idx);
    setFrom(PRESETS[idx].from);
    setTo(PRESETS[idx].to);
  };

  const d = data;

  return (
    <div className="space-y-8 select-none">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-muted-foreground" />
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão consolidada da operação — atualização automática a cada minuto.
          </p>
        </div>
        <button
          onClick={() => load(from, to, true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-foreground text-sm font-semibold rounded-xl hover:bg-muted/50 transition-colors cursor-pointer disabled:opacity-50 self-start"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* ── Filtro de Período ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Período:</span>
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            onClick={() => applyPreset(i)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activePreset === i
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <input type="date" value={from}
            onChange={e => { setFrom(e.target.value); setActivePreset(-1); }}
            className="px-2.5 py-1.5 bg-card border border-border text-foreground rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
          <span className="text-muted-foreground text-xs">—</span>
          <input type="date" value={to}
            onChange={e => { setTo(e.target.value); setActivePreset(-1); }}
            className="px-2.5 py-1.5 bg-card border border-border text-foreground rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
          <button onClick={() => load(from, to)}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer">
            Aplicar
          </button>
        </div>
        {refreshing && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-1" />}
      </div>

      {/* ── KPIs — Financeiro ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Financeiro</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Faturamento" value={d ? fmtCompact(d.revenue.total) : "—"}
            sub={d ? `vs ${fmtCompact(d.revenue.previous)} período ant.` : undefined}
            growth={d?.revenue.growth} icon={<DollarSign className="w-4 h-4" />} loading={loading} />
          <KPICard label="Lucro Líquido" value={d ? fmtCompact(d.profit.total) : "—"}
            sub={d ? `Margem: ${d.profit.margin.toFixed(1)}%` : undefined}
            icon={<TrendingUp className="w-4 h-4" />} loading={loading} />
          <KPICard label="Vendas realizadas" value={d ? String(d.sales.count) : "—"}
            sub={d ? `Ticket médio: ${fmt(d.sales.avgTicket)}` : undefined}
            growth={d?.sales.growth} icon={<ShoppingCart className="w-4 h-4" />} loading={loading} />
          <KPICard label="Custo de Mercadoria" value={d ? fmtCompact(d.costs.products) : "—"}
            sub={d ? `${d.sales.count} venda${d.sales.count !== 1 ? "s" : ""} no período` : undefined}
            icon={<Package className="w-4 h-4" />} loading={loading} />
        </div>
      </div>

      {/* ── KPIs — Operação ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Operação</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Estoque Disponível" value={d ? String(d.inventory.available) : "—"}
            sub={d ? `Valor: ${fmtCompact(d.inventory.value)}${d.inventory.unpriced > 0 ? ` · ${d.inventory.unpriced} sem preço` : ""}` : undefined}
            icon={<Package className="w-4 h-4" />} loading={loading} />
          <KPICard label="Trade-in no período" value={d ? String(d.tradeIn.inPeriod) : "—"}
            sub={d ? `${d.tradeIn.available} disponíveis · ${d.tradeIn.inRepair} em reparo` : undefined}
            icon={<Repeat2 className="w-4 h-4" />} loading={loading} />
          <KPICard label="A Receber" value={d ? fmtCompact(d.receivables.total) : "—"}
            sub={d ? (d.receivables.overdueCount > 0
              ? `${d.receivables.overdueCount} vencida${d.receivables.overdueCount !== 1 ? "s" : ""}: ${fmtCompact(d.receivables.overdue)}`
              : "Sem parcelas vencidas") : undefined}
            icon={<CreditCard className="w-4 h-4" />} loading={loading}
            alert={!!(d && d.receivables.overdueCount > 0)} />
          <KPICard label="Clientes" value={d ? String(d.customers.total) : "—"}
            sub={d ? `+${d.customers.newInPeriod} novo${d.customers.newInPeriod !== 1 ? "s" : ""} no período` : undefined}
            icon={<Users className="w-4 h-4" />} loading={loading} />
        </div>
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-bold text-foreground mb-0.5">Faturamento vs Lucro</p>
          <p className="text-xs text-muted-foreground mb-4">Evolução diária no período selecionado</p>
          {loading ? <SkeletonBlock className="h-[220px]" /> : d ? <RevenueAreaChart data={d.revenueChart} /> : null}
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-bold text-foreground mb-0.5">Fluxo de Caixa</p>
          <p className="text-xs text-muted-foreground mb-4">Entradas vs Saídas — últimos 6 meses</p>
          {loading ? <SkeletonBlock className="h-[220px]" /> : d ? <CashFlowBarChart data={d.cashFlow} /> : null}
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-bold text-foreground mb-0.5">Formas de Pagamento</p>
          <p className="text-xs text-muted-foreground mb-4">Distribuição por volume faturado no período</p>
          {loading ? <SkeletonBlock className="h-[220px]" /> : d ? (
            <>
              <PaymentPieChart data={d.paymentMethods} />
              {d.paymentMethods.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                  {d.paymentMethods.sort((a, b) => b.total - a.total).map(pm => (
                    <div key={pm.method} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{PM_LABELS[pm.method] ?? pm.method}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{pm.count}x</span>
                        <span className="font-bold text-foreground">{fmt(pm.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-bold text-foreground mb-0.5">Top Produtos</p>
          <p className="text-xs text-muted-foreground mb-4">Mais vendidos por faturamento no período</p>
          {loading ? <SkeletonBlock className="h-[220px]" /> : d ? <TopProductsChart data={d.topProducts} /> : null}
        </div>
      </div>

      {/* ── Rankings + Alertas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-bold text-foreground mb-4">Top Marcas</p>
          {loading ? <div className="space-y-3">{[1,2,3].map(i => <SkeletonBlock key={i} className="h-8" />)}</div>
          : d?.topBrands.length ? (
            <div className="space-y-3">
              {d.topBrands.map((b, i) => {
                const max = d.topBrands[0].count;
                return (
                  <div key={b.brand}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-semibold w-4">{i + 1}</span>
                        <span className="font-semibold text-foreground">{b.brand}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-muted-foreground">{b.count} un.</span>
                        <span className="font-bold text-foreground">{fmtCompact(b.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-1 bg-muted/40 rounded-full overflow-hidden">
                      <div className="h-full bg-foreground/20 rounded-full" style={{ width: `${(b.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-xs text-muted-foreground">Sem dados no período</p>}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-bold text-foreground mb-4">Melhores Clientes</p>
          {loading ? <div className="space-y-3">{[1,2,3].map(i => <SkeletonBlock key={i} className="h-10" />)}</div>
          : d?.topCustomers.length ? (
            <div className="divide-y divide-border/60">
              {d.topCustomers.map((c, i) => (
                <div key={c.name + i} className="flex items-center gap-3 py-2.5">
                  <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.count} compra{c.count !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-xs font-bold text-foreground">{fmtCompact(c.revenue)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">Sem dados no período</p>}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            Alertas
          </p>
          {loading ? <div className="space-y-3">{[1,2].map(i => <SkeletonBlock key={i} className="h-14" />)}</div>
          : d ? (
            d.alerts.length === 0
              ? <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Tudo em ordem!
                </div>
              : <div className="space-y-2">
                  {d.alerts.map(alert => (
                    <div key={alert.type} className={`p-3 rounded-xl border text-xs ${
                      alert.severity === "critical" ? "bg-red-500/5 border-red-500/20" : "bg-amber-500/5 border-amber-500/20"
                    }`}>
                      <p className="font-semibold text-foreground">{alert.title}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {alert.count} item{alert.count !== 1 ? "s" : ""}
                        {alert.amount ? ` · ${fmt(alert.amount)}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
          ) : null}
        </div>
      </div>

      {/* ── Atividade Recente ── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-sm font-bold text-foreground">Atividade Recente</p>
        </div>
        {loading
          ? <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <SkeletonBlock key={i} className="h-12" />)}</div>
          : d?.recentActivity.length
            ? <div className="divide-y divide-border/60">
                {d.recentActivity.map((item, i) => (
                  <div key={i} className="px-6 py-3.5 flex items-center gap-4 hover:bg-muted/20 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center flex-shrink-0">
                      {item.type === "SALE"
                        ? <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                        : <Users className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {item.title}
                        {item.cancelled && (
                          <span className="ml-2 text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">
                            Cancelada
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {item.amount !== undefined && (
                        <p className={`text-xs font-bold ${item.cancelled ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {fmt(item.amount)}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{timeAgo(item.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            : <div className="p-12 text-center text-sm text-muted-foreground">Nenhuma atividade recente</div>
        }
      </div>

    </div>
  );
}
