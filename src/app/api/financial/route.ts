import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { parseISO, startOfDay, endOfDay } from "date-fns";

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
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const type = searchParams.get("type"); // INFLOW or OUTFLOW
    const status = searchParams.get("status"); // PAID or PENDING

    const whereClause: any = {};

    if (startDateStr && endDateStr) {
      whereClause.date = {
        gte: startOfDay(parseISO(startDateStr)),
        lte: endOfDay(parseISO(endDateStr)),
      };
    }

    if (type) {
      whereClause.type = type;
    }

    if (status) {
      whereClause.status = status;
    }

    const transactions = await prisma.financialTransaction.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      include: {
        sale: {
          select: {
            saleNumber: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Calcular agregados
    const paidInflows = await prisma.financialTransaction.aggregate({
      where: { ...whereClause, type: "INFLOW", status: "PAID" },
      _sum: { amount: true },
    });

    const paidOutflows = await prisma.financialTransaction.aggregate({
      where: { ...whereClause, type: "OUTFLOW", status: "PAID" },
      _sum: { amount: true },
    });

    const pendingInflows = await prisma.financialTransaction.aggregate({
      where: { ...whereClause, type: "INFLOW", status: { in: ["PENDING", "OVERDUE"] } },
      _sum: { amount: true },
    });

    const pendingOutflows = await prisma.financialTransaction.aggregate({
      where: { ...whereClause, type: "OUTFLOW", status: { in: ["PENDING", "OVERDUE"] } },
      _sum: { amount: true },
    });

    return NextResponse.json({
      transactions,
      summary: {
        entradasPagas: paidInflows._sum.amount || 0,
        saidasPagas: paidOutflows._sum.amount || 0,
        saldoLiquido: (paidInflows._sum.amount || 0) - (paidOutflows._sum.amount || 0),
        entradasPendentes: pendingInflows._sum.amount || 0,
        saidasPendentes: pendingOutflows._sum.amount || 0,
      },
    });
  } catch (error: any) {
    console.error("List financial transactions error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { type, category, amount, date, description, status } = body;

    if (!type || !category || amount === undefined || !date) {
      return NextResponse.json(
        { error: "Tipo, Categoria, Valor e Data são obrigatórios" },
        { status: 400 }
      );
    }

    const transaction = await prisma.financialTransaction.create({
      data: {
        type,
        category,
        amount: parseFloat(amount),
        date: new Date(date),
        description,
        status: status || "PAID",
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        action: "REGISTRAR_TRANSACAO",
        details: `Transação de ${type === "INFLOW" ? "Entrada" : "Saída"} registrada. Categoria: ${category}. Valor: R$ ${parseFloat(amount).toFixed(2)}.`,
      },
    });

    return NextResponse.json({
      transaction,
      message: "Transação financeira registrada com sucesso!",
    });
  } catch (error: any) {
    console.error("Create transaction error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
