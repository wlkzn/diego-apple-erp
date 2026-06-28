import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  return prisma.user.findUnique({ where: { id: decoded.userId } });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (user.role !== "ADMIN" && user.role !== "DEV") {
      return NextResponse.json({ error: "Apenas administradores podem cancelar vendas." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const cancelReason: string = body.reason?.trim() || "Cancelamento sem motivo informado";

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { id: true, quantity: true, status: true } } },
        },
        installments: { select: { id: true, status: true } },
        transactions: { select: { id: true, status: true } },
      },
    });

    if (!sale) return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 });
    if (sale.status === "CANCELLED") {
      return NextResponse.json({ error: "Esta venda já está cancelada." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark sale cancelled
      await tx.sale.update({
        where: { id: sale.id },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason },
      });

      // 2. Restore each sold product back to available
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            status: "AVAILABLE",
            quantity: item.product.quantity + item.quantity,
          },
        });
      }

      // 3. Cancel pending/overdue installments
      await tx.installment.updateMany({
        where: { saleId: sale.id, status: { in: ["PENDING", "OVERDUE"] } },
        data: { status: "CANCELLED" },
      });

      // 4. Cancel pending financial transactions
      await tx.financialTransaction.updateMany({
        where: { saleId: sale.id, status: { in: ["PENDING", "OVERDUE"] } },
        data: { status: "CANCELLED" },
      });

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CANCELAR_VENDA",
          details: `Venda #${String(sale.saleNumber).padStart(5, "0")} cancelada. Motivo: ${cancelReason}`,
        },
      });
    });

    return NextResponse.json({ message: "Venda cancelada com sucesso." });
  } catch (error: any) {
    console.error("Cancel sale error:", error);
    return NextResponse.json(
      { error: "Erro ao cancelar venda", detail: error?.message },
      { status: 500 }
    );
  }
}
