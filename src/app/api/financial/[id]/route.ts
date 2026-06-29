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

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  return prisma.user.findUnique({ where: { id: decoded.userId } });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { category, amount, date, description, status } = body;

    const existingTx = await prisma.financialTransaction.findUnique({
      where: { id },
    });

    if (!existingTx) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 44 });
    }

    // Impedir alteração de valor/data de transações vinculadas a vendas para manter a integridade
    if (existingTx.saleId || existingTx.installmentId) {
      if (amount !== undefined && parseFloat(amount) !== existingTx.amount) {
        return NextResponse.json(
          { error: "Não é possível alterar o valor de lançamentos vinculados a vendas ou parcelas." },
          { status: 400 }
        );
      }
    }

    const transaction = await prisma.financialTransaction.update({
      where: { id },
      data: {
        category: category || existingTx.category,
        amount: amount !== undefined ? parseFloat(amount) : existingTx.amount,
        date: date ? new Date(date) : existingTx.date,
        description: description || existingTx.description,
        status: status || existingTx.status,
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        action: "ATUALIZAR_TRANSACAO",
        details: `Lançamento financeiro ${transaction.category} atualizado. Valor: R$ ${transaction.amount.toFixed(2)}.`,
      },
    });

    return NextResponse.json({
      transaction,
      message: "Lançamento financeiro atualizado com sucesso!",
    });
  } catch (error: any) {
    console.error("Update transaction error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (user.role !== "ADMIN" && user.role !== "DEV") {
      return NextResponse.json({ error: "Apenas administradores podem cancelar lançamentos." }, { status: 403 });
    }

    const { id } = await params;

    const existingTx = await prisma.financialTransaction.findUnique({ where: { id } });
    if (!existingTx) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    if (existingTx.status === "CANCELLED") {
      return NextResponse.json({ error: "Este lançamento já está cancelado." }, { status: 400 });
    }
    if (existingTx.saleId || existingTx.installmentId) {
      return NextResponse.json({
        error: "Lançamentos automáticos de vendas ou parcelas não podem ser cancelados individualmente. Cancele a venda ou parcela correspondente.",
      }, { status: 400 });
    }

    await prisma.financialTransaction.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CANCELAR_LANCAMENTO",
        details: `Lançamento "${existingTx.category}" (R$ ${existingTx.amount.toFixed(2)}) cancelado. O registro permanece no histórico.`,
      },
    });

    return NextResponse.json({ message: "Lançamento cancelado com sucesso. O registro foi mantido no histórico." });
  } catch (error: any) {
    console.error("Cancel transaction error:", error);
    return NextResponse.json({ error: "Erro ao cancelar lançamento", detail: error?.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (user.role !== "ADMIN" && user.role !== "DEV") {
      return NextResponse.json({ error: "Apenas administradores podem excluir lançamentos." }, { status: 403 });
    }
    const userId = user.id;

    const { id } = await params;

    const existingTx = await prisma.financialTransaction.findUnique({
      where: { id },
    });

    if (!existingTx) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    // Proibir a exclusão de lançamentos automáticos de venda/parcela
    if (existingTx.saleId || existingTx.installmentId) {
      return NextResponse.json(
        { error: "Não é possível excluir lançamentos gerados automaticamente por vendas ou parcelamentos. Estorne a venda ou parcela correspondente." },
        { status: 400 }
      );
    }

    await prisma.financialTransaction.delete({
      where: { id },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        action: "EXCLUIR_TRANSACAO",
        details: `Lançamento financeiro ${existingTx.category} (Valor: R$ ${existingTx.amount.toFixed(2)}) excluído.`,
      },
    });

    return NextResponse.json({ message: "Lançamento financeiro excluído com sucesso!" });
  } catch (error: any) {
    console.error("Delete transaction error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
