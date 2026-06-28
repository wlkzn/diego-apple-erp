import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

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
    const status = searchParams.get("status") || ""; // PENDING, PAID, OVERDUE
    const query = searchParams.get("q") || "";

    // Atualização automática de parcelas vencidas antes de listar
    const now = new Date();
    await prisma.installment.updateMany({
      where: {
        dueDate: { lt: now },
        status: "PENDING",
      },
      data: {
        status: "OVERDUE",
      },
    });

    // Atualizar as transações financeiras vinculadas a essas parcelas para OVERDUE
    await prisma.financialTransaction.updateMany({
      where: {
        date: { lt: now },
        status: "PENDING",
        installmentId: { not: null },
      },
      data: {
        status: "OVERDUE",
      },
    });

    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (query) {
      whereClause.customer = {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { cpf: { contains: query, mode: "insensitive" } },
        ],
      };
    }

    const installments = await prisma.installment.findMany({
      where: whereClause,
      orderBy: [
        { status: "desc" }, // vencidas primeiro
        { dueDate: "asc" },
      ],
      include: {
        customer: {
          select: {
            name: true,
            cpf: true,
            phone: true,
          },
        },
        sale: {
          select: {
            saleNumber: true,
          },
        },
      },
    });

    return NextResponse.json({ installments });
  } catch (error: any) {
    console.error("List installments error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
