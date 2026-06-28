import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  startOfDay, endOfDay, startOfMonth, endOfMonth,
  subDays, addDays, format, differenceInDays, parseISO, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

function growth(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();

    const fromParam = searchParams.get("from");
    const toParam   = searchParams.get("to");
    const to   = toParam   ? endOfDay(parseISO(toParam))   : endOfDay(now);
    const from = fromParam ? startOfDay(parseISO(fromParam)) : startOfDay(subDays(now, 29));

    const durationMs = to.getTime() - from.getTime();
    const prevTo     = new Date(from.getTime() - 1);
    const prevFrom   = new Date(from.getTime() - durationMs - 1);
    const days       = Math.min(differenceInDays(to, from) + 1, 90);

    // ── Parallel queries ─────────────────────────────────────────────────
    const [
      salesCurrent,
      prevRevenueAgg,
      prevSalesCount,
      inventoryProducts,
      reservedCount,
      tradeInAll,
      recvPendingAgg,
      recvOverdueAgg,
      recvOverdueCount,
      recvTodayAgg,
      recvTodayCount,
      recvMonthAgg,
      custTotal,
      custNew,
      pmGrouped,
      recentSales,
      recentCust,
    ] = await Promise.all([
      // Current period sales — full detail for profit + chart calc
      prisma.sale.findMany({
        where: { createdAt: { gte: from, lte: to }, status: "ACTIVE" },
        select: {
          id: true, saleNumber: true, netAmount: true, discountAmount: true,
          paymentMethod: true, createdAt: true,
          customer: { select: { id: true, name: true } },
          items: {
            select: {
              quantity: true, unitPrice: true,
              product: { select: { purchasePrice: true, brand: true, model: true } },
            },
          },
        },
      }),
      // Previous period — revenue sum only
      prisma.sale.aggregate({
        where: { createdAt: { gte: prevFrom, lte: prevTo }, status: "ACTIVE" },
        _sum: { netAmount: true },
      }),
      // Previous period — sale count (separate query, no _count in aggregate)
      prisma.sale.count({
        where: { createdAt: { gte: prevFrom, lte: prevTo }, status: "ACTIVE" },
      }),
      // Inventory
      prisma.product.findMany({
        where: { status: "AVAILABLE" },
        select: { quantity: true, sellingPrice: true, purchasePrice: true },
      }),
      prisma.product.count({ where: { status: "RESERVED" } }),
      // Trade-in
      prisma.tradeInDevice.findMany({
        select: { status: true, evaluationPrice: true, createdAt: true },
      }),
      // Receivables — sums only
      prisma.installment.aggregate({
        where: { status: { in: ["PENDING", "OVERDUE"] } },
        _sum: { remainingAmount: true },
      }),
      prisma.installment.aggregate({
        where: { status: "OVERDUE" },
        _sum: { remainingAmount: true },
      }),
      prisma.installment.count({ where: { status: "OVERDUE" } }),
      prisma.installment.aggregate({
        where: {
          status: { in: ["PENDING", "OVERDUE"] },
          dueDate: { gte: startOfDay(now), lte: endOfDay(now) },
        },
        _sum: { remainingAmount: true },
      }),
      prisma.installment.count({
        where: {
          status: { in: ["PENDING", "OVERDUE"] },
          dueDate: { gte: startOfDay(now), lte: endOfDay(now) },
        },
      }),
      prisma.installment.aggregate({
        where: {
          status: { in: ["PENDING", "OVERDUE"] },
          dueDate: { gte: startOfMonth(now), lte: endOfMonth(now) },
        },
        _sum: { remainingAmount: true },
      }),
      // Customers
      prisma.customer.count(),
      prisma.customer.count({ where: { createdAt: { gte: from, lte: to } } }),
      // Payment methods (groupBy with simple _count: true)
      prisma.sale.groupBy({
        by: ["paymentMethod"],
        where: { createdAt: { gte: from, lte: to }, status: "ACTIVE" },
        _sum: { netAmount: true },
        _count: true,
      }),
      // Recent sales (last 10)
      prisma.sale.findMany({
        take: 10, orderBy: { createdAt: "desc" },
        select: {
          id: true, saleNumber: true, netAmount: true, createdAt: true,
          paymentMethod: true, status: true,
          customer: { select: { name: true } },
          items: { take: 1, select: { product: { select: { brand: true, model: true } } } },
        },
      }),
      // Recent customers
      prisma.customer.findMany({
        take: 5, orderBy: { createdAt: "desc" },
        select: { id: true, name: true, createdAt: true },
      }),
    ]);

    // Cash flow (6 months) — sequential after main batch
    const cashFlowMonths = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(now, 5 - i);
        const s = startOfMonth(d);
        const e = endOfMonth(d);
        return Promise.all([
          prisma.financialTransaction.aggregate({
            where: { type: "INFLOW", status: "PAID", date: { gte: s, lte: e } },
            _sum: { amount: true },
          }),
          prisma.financialTransaction.aggregate({
            where: { type: "OUTFLOW", status: "PAID", date: { gte: s, lte: e } },
            _sum: { amount: true },
          }),
          format(d, "MMM", { locale: ptBR }),
        ]);
      })
    );

    // Top customers (groupBy, sort in JS)
    const topCustRaw = await prisma.sale.groupBy({
      by: ["customerId"],
      where: { createdAt: { gte: from, lte: to }, status: "ACTIVE" },
      _sum: { netAmount: true },
      _count: true,
    });

    // ── Process ──────────────────────────────────────────────────────────

    const revenue     = salesCurrent.reduce((s, x) => s + x.netAmount, 0);
    const prevRevenue = prevRevenueAgg._sum.netAmount ?? 0;
    const salesCount  = salesCurrent.length;
    const avgTicket   = salesCount > 0 ? revenue / salesCount : 0;

    // Profit = revenue - product costs - discounts
    let profit = 0;
    for (const sale of salesCurrent) {
      profit -= sale.discountAmount;
      for (const item of sale.items) {
        profit += item.quantity * (item.unitPrice - item.product.purchasePrice);
      }
    }
    const margin = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;

    const productCosts = salesCurrent.reduce(
      (s, sale) => s + sale.items.reduce((ss, item) => ss + item.quantity * item.product.purchasePrice, 0),
      0
    );

    // Inventory
    const availableQty   = inventoryProducts.reduce((s, p) => s + p.quantity, 0);
    const inventoryValue = inventoryProducts.reduce((s, p) => s + p.sellingPrice, 0);
    const unpricedCount  = inventoryProducts.filter(p => p.sellingPrice === 0).length;

    // Trade-in
    const tiInPeriod = tradeInAll.filter(d => {
      const dt = new Date(d.createdAt);
      return dt >= from && dt <= to;
    }).length;
    const tiInvested  = tradeInAll.reduce((s, d) => s + d.evaluationPrice, 0);
    const tiAwaiting  = tradeInAll.filter(d => d.status === "AGUARDANDO_AVALIACAO").length;
    const tiRepair    = tradeInAll.filter(d => ["EM_REPARO","AGUARDANDO_PECAS","EM_MANUTENCAO","EM_TESTES"].includes(d.status)).length;
    const tiAvailable = tradeInAll.filter(d => d.status === "DISPONIVEL").length;

    // Revenue chart (daily)
    const dailyMap = new Map<string, { revenue: number; profit: number }>();
    for (let i = 0; i < days; i++) {
      dailyMap.set(format(addDays(from, i), "dd/MM"), { revenue: 0, profit: 0 });
    }
    for (const sale of salesCurrent) {
      const key = format(sale.createdAt, "dd/MM");
      const cur = dailyMap.get(key) ?? { revenue: 0, profit: 0 };
      cur.revenue += sale.netAmount;
      cur.profit  -= sale.discountAmount;
      for (const item of sale.items) {
        cur.profit += item.quantity * (item.unitPrice - item.product.purchasePrice);
      }
      dailyMap.set(key, cur);
    }
    const revenueChart = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }));

    // Payment methods (groupBy returns _count as number when _count: true)
    const paymentMethods = pmGrouped.map(g => ({
      method: g.paymentMethod,
      count: typeof g._count === "number" ? g._count : (g._count as any)._all ?? 0,
      total: g._sum?.netAmount ?? 0,
    }));

    // Top products & brands
    const productSales = new Map<string, { name: string; brand: string; count: number; revenue: number }>();
    for (const sale of salesCurrent) {
      for (const item of sale.items) {
        const key = `${item.product.brand}|${item.product.model}`;
        const cur = productSales.get(key) ?? { name: item.product.model, brand: item.product.brand, count: 0, revenue: 0 };
        cur.count   += item.quantity;
        cur.revenue += item.quantity * item.unitPrice;
        productSales.set(key, cur);
      }
    }
    const allProducts = Array.from(productSales.values());
    const topProducts = allProducts.sort((a, b) => b.revenue - a.revenue).slice(0, 6);

    const brandSales = new Map<string, { brand: string; count: number; revenue: number }>();
    for (const p of allProducts) {
      const cur = brandSales.get(p.brand) ?? { brand: p.brand, count: 0, revenue: 0 };
      cur.count   += p.count;
      cur.revenue += p.revenue;
      brandSales.set(p.brand, cur);
    }
    const topBrands = Array.from(brandSales.values()).sort((a, b) => b.count - a.count).slice(0, 5);

    // Cash flow
    const cashFlow = cashFlowMonths.map(([inResult, outResult, month]) => ({
      month: month as string,
      inflow:  (inResult  as any)._sum?.amount ?? 0,
      outflow: (outResult as any)._sum?.amount ?? 0,
    }));

    // Top customers (sort in JS)
    const topCustSorted = topCustRaw
      .sort((a, b) => (b._sum?.netAmount ?? 0) - (a._sum?.netAmount ?? 0))
      .slice(0, 5);

    let topCustomers: Array<{ name: string; count: number; revenue: number }> = [];
    if (topCustSorted.length > 0) {
      const ids     = topCustSorted.map(g => g.customerId);
      const details = await prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
      topCustomers  = topCustSorted.map(g => {
        const c = details.find(d => d.id === g.customerId);
        const cnt = typeof g._count === "number" ? g._count : (g._count as any)._all ?? 0;
        return { name: c?.name ?? "—", count: cnt, revenue: g._sum?.netAmount ?? 0 };
      });
    }

    // Recent activity
    const recentActivity = [
      ...recentSales.map(s => ({
        type: "SALE" as const,
        title: `Venda #${String(s.saleNumber).padStart(5, "0")} — ${s.customer.name}`,
        subtitle: s.items[0]?.product
          ? `${s.items[0].product.brand} ${s.items[0].product.model}`
          : s.paymentMethod.replace("_", " "),
        timestamp: s.createdAt.toISOString(),
        amount: s.netAmount,
        cancelled: s.status === "CANCELLED",
      })),
      ...recentCust.map(c => ({
        type: "CUSTOMER" as const,
        title: `Novo cliente: ${c.name}`,
        subtitle: "Cliente cadastrado",
        timestamp: c.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 12);

    // Alerts
    const alerts: Array<{ type: string; severity: string; title: string; count: number; amount?: number }> = [];
    if (recvOverdueCount > 0) {
      alerts.push({ type: "overdue", severity: "critical", title: "Parcelas vencidas", count: recvOverdueCount, amount: recvOverdueAgg._sum.remainingAmount ?? 0 });
    }
    if (recvTodayCount > 0) {
      alerts.push({ type: "dueToday", severity: "warning", title: "Parcelas vencem hoje", count: recvTodayCount, amount: recvTodayAgg._sum.remainingAmount ?? 0 });
    }
    if (unpricedCount > 0) {
      alerts.push({ type: "unpriced", severity: "warning", title: "Produtos sem preço de venda", count: unpricedCount });
    }

    return NextResponse.json({
      period:     { from: from.toISOString(), to: to.toISOString() },
      revenue:    { total: revenue, previous: prevRevenue, growth: growth(revenue, prevRevenue) },
      profit:     { total: profit, previous: 0, margin },
      costs:      { products: productCosts },
      sales:      { count: salesCount, prevCount: prevSalesCount, growth: growth(salesCount, prevSalesCount), avgTicket },
      inventory:  { available: availableQty, reserved: reservedCount, value: inventoryValue, unpriced: unpricedCount },
      tradeIn:    { total: tradeInAll.length, inPeriod: tiInPeriod, invested: tiInvested, awaiting: tiAwaiting, inRepair: tiRepair, available: tiAvailable },
      receivables: {
        total:        recvPendingAgg._sum.remainingAmount ?? 0,
        overdue:      recvOverdueAgg._sum.remainingAmount ?? 0,
        overdueCount: recvOverdueCount,
        dueToday:     recvTodayAgg._sum.remainingAmount ?? 0,
        dueTodayCount: recvTodayCount,
        dueMonth:     recvMonthAgg._sum.remainingAmount ?? 0,
      },
      customers:  { total: custTotal, newInPeriod: custNew },
      revenueChart,
      paymentMethods,
      topProducts,
      topBrands,
      topCustomers,
      cashFlow,
      recentActivity,
      alerts,
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Erro ao buscar métricas do dashboard" }, { status: 500 });
  }
}
