"use client";

import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie,
  Legend,
} from "recharts";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const fmtShort = (v: number) => {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
  return fmt(v);
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3.5 py-2.5 shadow-lg text-xs">
      <p className="font-bold text-foreground mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Revenue / Profit Area Chart ──────────────────────────────────────────────
interface RevenueChartPoint { date: string; revenue: number; profit: number }

export function RevenueAreaChart({ data }: { data: RevenueChartPoint[] }) {
  const interval = data.length > 20 ? Math.floor(data.length / 8) : undefined;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          interval={interval}
        />
        <YAxis
          tickFormatter={fmtShort}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="revenue" name="Faturamento" stroke="#10b981" strokeWidth={2}
          fill="url(#gradRevenue)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        <Area type="monotone" dataKey="profit" name="Lucro" stroke="#3b82f6" strokeWidth={2}
          fill="url(#gradProfit)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(v) => <span style={{ color: "var(--muted-foreground)" }}>{v}</span>} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Cash Flow Bar Chart ──────────────────────────────────────────────────────
interface CashFlowPoint { month: string; inflow: number; outflow: number }

export function CashFlowBarChart({ data }: { data: CashFlowPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={52} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="inflow" name="Entradas" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="outflow" name="Saídas" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(v) => <span style={{ color: "var(--muted-foreground)" }}>{v}</span>} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Payment Methods Pie Chart ────────────────────────────────────────────────
const PM_COLORS: Record<string, string> = {
  PIX: "#10b981", DINHEIRO: "#f59e0b", CARTAO: "#3b82f6",
  BOLETO: "#8b5cf6", PARCELADO_LOJA: "#f43f5e",
};
export const PM_LABELS: Record<string, string> = {
  PIX: "Pix", DINHEIRO: "Dinheiro", CARTAO: "Cartão",
  BOLETO: "Boleto", PARCELADO_LOJA: "Parcelado Loja",
};

function PieInnerLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.07) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + r * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + r * Math.sin(-midAngle * (Math.PI / 180));
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

interface PmPoint { method: string; count: number; total: number }

export function PaymentPieChart({ data }: { data: PmPoint[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-[220px] text-xs text-muted-foreground">Sem dados no período</div>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data.map(d => ({ ...d, fill: PM_COLORS[d.method] ?? "#94a3b8" }))}
          cx="50%" cy="45%" innerRadius={52} outerRadius={82}
          dataKey="total" nameKey="method" label={<PieInnerLabel />} labelLine={false}
        />
        <Tooltip formatter={(val: any, _: any, props: any) => [fmt(Number(val)), PM_LABELS[props.payload?.method] ?? props.payload?.method]}
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }}
          formatter={(v) => <span style={{ color: "var(--muted-foreground)" }}>{PM_LABELS[v] ?? v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Top Products Horizontal Bar Chart ────────────────────────────────────────
interface ProductPoint { name: string; brand: string; count: number; revenue: number }

export function TopProductsChart({ data }: { data: ProductPoint[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-[220px] text-xs text-muted-foreground">Sem dados no período</div>;
  const chartData = data.map(d => ({ ...d, label: `${d.brand} ${d.name}`.slice(0, 24) }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 40)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" width={128} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
        <Tooltip formatter={(val: any) => [fmt(Number(val)), "Faturamento"]}
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
        <Bar dataKey="revenue" name="Faturamento" fill="#8b5cf6" radius={[0, 3, 3, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
