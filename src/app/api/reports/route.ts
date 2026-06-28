import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { startOfDay, endOfDay, parseISO } from "date-fns";

async function getAuthUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "sales"; // sales, products, customers, finance, installments
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const dateQuery: any = {};
    if (startDateStr && endDateStr) {
      dateQuery.createdAt = {
        gte: startOfDay(parseISO(startDateStr)),
        lte: endOfDay(parseISO(endDateStr)),
      };
    }

    let reportData: any = [];

    // 1. RELATÓRIO DE VENDAS
    if (type === "sales") {
      const whereClause: any = {};
      if (startDateStr && endDateStr) {
        whereClause.createdAt = {
          gte: startOfDay(parseISO(startDateStr)),
          lte: endOfDay(parseISO(endDateStr)),
        };
      }

      const sales = await prisma.sale.findMany({
        where: whereClause,
        include: {
          customer: { select: { name: true, cpf: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      reportData = sales.map((s) => ({
        NumeroVenda: String(s.saleNumber).padStart(5, "0"),
        Cliente: s.customer.name,
        CPF: s.customer.cpf,
        Data: s.createdAt.toISOString().split("T")[0],
        MetodoPagamento: s.paymentMethod,
        TotalBruto: s.totalAmount,
        Desconto: s.discountAmount,
        TotalLiquido: s.netAmount,
        Entrada: s.downPayment,
        Parcelas: s.installmentCount,
      }));
    }

    // 2. RELATÓRIO DE PRODUTOS/ESTOQUE
    else if (type === "products") {
      const products = await prisma.product.findMany({
        orderBy: { brand: "asc" },
      });

      reportData = products.map((p) => ({
        ID: p.id.slice(0, 8),
        Marca: p.brand,
        Modelo: p.model,
        Cor: p.color,
        Armazenamento: p.storage,
        IMEI: p.imei || "N/A",
        SerialNumber: p.serialNumber || "N/A",
        Custo: p.purchasePrice,
        PrecoVenda: p.sellingPrice,
        LucroEstimado: p.profit,
        Quantidade: p.quantity,
        Status: p.status,
      }));
    }

    // 3. RELATÓRIO DE CLIENTES
    else if (type === "customers") {
      const customers = await prisma.customer.findMany({
        include: {
          sales: { select: { netAmount: true } },
          installments: { select: { remainingAmount: true, status: true } },
        },
        orderBy: { name: "asc" },
      });

      reportData = customers.map((c) => {
        const totalPurchased = c.sales.reduce((sum, s) => sum + s.netAmount, 0);
        const totalDue = c.installments
          .filter((i) => i.status !== "PAID")
          .reduce((sum, i) => sum + i.remainingAmount, 0);

        return {
          Nome: c.name,
          CPF: c.cpf,
          Telefone: c.phone,
          Email: c.email || "N/A",
          ComprasQuantidade: c.sales.length,
          TotalGasto: totalPurchased,
          SaldoDevedor: totalDue,
          Endereco: c.address || "N/A",
        };
      });
    }

    // 4. RELATÓRIO FINANCEIRO (Transações de Caixa)
    else if (type === "finance") {
      const whereClause: any = {};
      if (startDateStr && endDateStr) {
        whereClause.date = {
          gte: startOfDay(parseISO(startDateStr)),
          lte: endOfDay(parseISO(endDateStr)),
        };
      }

      const txs = await prisma.financialTransaction.findMany({
        where: whereClause,
        orderBy: { date: "desc" },
      });

      reportData = txs.map((t) => ({
        ID: t.id.slice(0, 8),
        Tipo: t.type === "INFLOW" ? "Entrada" : "Saída",
        Categoria: t.category,
        Valor: t.amount,
        Data: t.date.toISOString().split("T")[0],
        Status: t.status,
        Descricao: t.description || "",
      }));
    }

    // 5. RELATÓRIO DE PARCELAS
    else if (type === "installments") {
      const whereClause: any = {};
      const statusFilter = searchParams.get("status"); // PENDING, OVERDUE, PAID
      if (statusFilter) {
        whereClause.status = statusFilter;
      }

      const installments = await prisma.installment.findMany({
        where: whereClause,
        include: {
          customer: { select: { name: true, cpf: true } },
          sale: { select: { saleNumber: true } },
        },
        orderBy: { dueDate: "asc" },
      });

      reportData = installments.map((i) => ({
        VendaRef: String(i.sale.saleNumber).padStart(5, "0"),
        Cliente: i.customer.name,
        CPF: i.customer.cpf,
        NumeroParcela: i.installmentNumber,
        ValorParcela: i.amount,
        Vencimento: i.dueDate.toISOString().split("T")[0],
        Status: i.status,
        ValorPago: i.paidAmount,
        SaldoRestante: i.remainingAmount,
      }));
    }

    return NextResponse.json({ reportData });
  } catch (error: any) {
    console.error("Report data error:", error);
    return NextResponse.json({ error: "Erro ao compilar dados do relatório" }, { status: 500 });
  }
}
