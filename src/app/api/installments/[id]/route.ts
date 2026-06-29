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

export async function POST(
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
    const { paymentAmount } = body;

    if (paymentAmount === undefined || parseFloat(paymentAmount) <= 0) {
      return NextResponse.json(
        { error: "Valor de pagamento inválido" },
        { status: 400 }
      );
    }

    const payValue = parseFloat(paymentAmount);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Buscar a parcela
      const installment = await tx.installment.findUnique({
        where: { id },
        include: {
          customer: true,
          sale: true,
        },
      });

      if (!installment) {
        throw new Error("Parcela não encontrada");
      }

      if (installment.status === "PAID") {
        throw new Error("Esta parcela já está totalmente paga");
      }

      const isFullPayment = payValue >= installment.remainingAmount;
      const amountPaidThisTime = isFullPayment ? installment.remainingAmount : payValue;
      
      const newPaidAmount = installment.paidAmount + amountPaidThisTime;
      const newRemainingAmount = installment.remainingAmount - amountPaidThisTime;
      const newStatus = isFullPayment ? "PAID" : installment.status; // manter pending/overdue se parcial
      const paymentDate = isFullPayment ? new Date() : installment.paymentDate;

      // 2. Atualizar a parcela no banco
      const updatedInstallment = await tx.installment.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: newStatus as any,
          paymentDate,
        },
      });

      // 3. Atualizar o Fluxo de Caixa (Lançamentos Financeiros)
      // Buscar o lançamento financeiro pendente planejado para esta parcela
      const pendingTx = await tx.financialTransaction.findFirst({
        where: {
          installmentId: id,
          status: { in: ["PENDING", "OVERDUE"] },
        },
      });

      if (isFullPayment) {
        // Pagamento TOTAL da parcela
        if (pendingTx) {
          // Atualiza o lançamento planejado para PAGO, ajustando o valor para o valor final da parcela
          await tx.financialTransaction.update({
            where: { id: pendingTx.id },
            data: {
              status: "PAID",
              amount: updatedInstallment.amount, // valor total da parcela
              date: new Date(), // data do recebimento real
              description: `Recebimento da parcela ${installment.installmentNumber} referente à venda #${String(installment.sale.saleNumber).padStart(5, "0")}`,
            },
          });
        } else {
          // Criar um novo caso não encontre
          await tx.financialTransaction.create({
            data: {
              type: "INFLOW",
              category: "Recebimento de Parcela",
              amount: amountPaidThisTime,
              date: new Date(),
              status: "PAID",
              description: `Recebimento da parcela ${installment.installmentNumber} referente à venda #${String(installment.sale.saleNumber).padStart(5, "0")}`,
              saleId: installment.saleId,
              installmentId: installment.id,
            },
          });
        }
      } else {
        // Pagamento PARCIAL da parcela
        // Cria um lançamento de entrada pago para a porção recebida hoje
        await tx.financialTransaction.create({
          data: {
            type: "INFLOW",
            category: "Recebimento Parcial de Parcela",
            amount: amountPaidThisTime,
            date: new Date(),
            status: "PAID",
            description: `Recebimento parcial da parcela ${installment.installmentNumber} referente à venda #${String(installment.sale.saleNumber).padStart(5, "0")}`,
            saleId: installment.saleId,
            installmentId: installment.id,
          },
        });

        // Atualiza a transação pendente planejada subtraindo o valor pago
        if (pendingTx) {
          await tx.financialTransaction.update({
            where: { id: pendingTx.id },
            data: {
              amount: newRemainingAmount, // valor que resta a receber
              description: `Saldo restante da parcela ${installment.installmentNumber} referente à venda #${String(installment.sale.saleNumber).padStart(5, "0")}`,
            },
          });
        }
      }

      return { updatedInstallment, amountPaidThisTime, isFullPayment, customerName: installment.customer.name, saleNumber: installment.sale.saleNumber };
    });

    // 4. Registrar auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        action: "BAIXAR_PARCELA",
        details: `Parcela ${result.updatedInstallment.installmentNumber} da venda #${String(result.saleNumber).padStart(5, "0")} (${result.customerName}) recebeu pagamento de R$ ${result.amountPaidThisTime.toFixed(2)}. Status final: ${result.updatedInstallment.status}.`,
      },
    });

    return NextResponse.json({
      installment: result.updatedInstallment,
      message: result.isFullPayment
        ? "Pagamento da parcela registrado com sucesso!"
        : "Pagamento parcial registrado com sucesso!",
    });
  } catch (error: any) {
    console.error("Pay installment error:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno no servidor ao registrar pagamento" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (user.role !== "ADMIN" && user.role !== "DEV") {
      return NextResponse.json({ error: "Apenas administradores podem cancelar parcelas." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const cancelReason: string = body.reason?.trim() || "Cancelamento sem motivo informado";

    const result = await prisma.$transaction(async (tx) => {
      const installment = await tx.installment.findUnique({
        where: { id },
        include: {
          sale: { select: { saleNumber: true } },
          customer: { select: { name: true } },
        },
      });

      if (!installment) throw new Error("Parcela não encontrada");
      if (installment.status === "CANCELLED") throw new Error("Esta parcela já está cancelada");
      if (installment.status === "PAID") throw new Error("Não é possível cancelar uma parcela já paga");

      await tx.installment.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      await tx.financialTransaction.updateMany({
        where: { installmentId: id, status: { in: ["PENDING", "OVERDUE"] } },
        data: { status: "CANCELLED" },
      });

      return {
        saleNumber: installment.sale.saleNumber,
        customerName: installment.customer.name,
        installmentNumber: installment.installmentNumber,
      };
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CANCELAR_PARCELA",
        details: `Parcela ${result.installmentNumber} da venda #${String(result.saleNumber).padStart(5, "0")} (${result.customerName}) cancelada. Motivo: ${cancelReason}`,
      },
    });

    return NextResponse.json({ message: "Parcela cancelada com sucesso." });
  } catch (error: any) {
    console.error("Cancel installment error:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao cancelar parcela" },
      { status: error.message?.includes("não encontrada") || error.message?.includes("já") ? 400 : 500 }
    );
  }
}
