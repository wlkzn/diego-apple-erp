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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              select: {
                brand: true,
                model: true,
                color: true,
                storage: true,
                imei: true,
                serialNumber: true,
                warranty: true,
                condition: true,
              },
            },
          },
        },
        installments: {
          orderBy: { installmentNumber: "asc" },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });
    }

    // Buscar configurações da empresa
    const companySettings = await prisma.companySetting.findFirst();

    return NextResponse.json({ sale, companySettings });
  } catch (error: any) {
    console.error("Get sale details error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (user.role !== "ADMIN" && user.role !== "DEV") {
      return NextResponse.json({ error: "Apenas administradores podem excluir vendas." }, { status: 403 });
    }

    const { id } = await params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, quantity: true, status: true } } } },
        tradeInDevice: { select: { id: true, productId: true } },
      },
    });

    if (!sale) return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // 1. Se a venda estava ATIVA, restaurar estoque dos produtos vendidos
      if (sale.status === "ACTIVE") {
        for (const item of sale.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              status: "AVAILABLE",
              quantity: item.product.quantity + item.quantity,
            },
          });
        }
      }

      // 2. Excluir transações financeiras vinculadas à venda
      await tx.financialTransaction.deleteMany({ where: { saleId: id } });

      // 3. Excluir trade-in (cascata exclui repairs e statusHistory)
      if (sale.tradeInDevice) {
        // Excluir o produto gerado pelo trade-in se ainda não foi vendido
        if (sale.tradeInDevice.productId) {
          const tiProduct = await tx.product.findUnique({
            where: { id: sale.tradeInDevice.productId },
            select: { status: true },
          });
          if (tiProduct && tiProduct.status !== "SOLD") {
            await tx.product.delete({ where: { id: sale.tradeInDevice.productId } });
          }
        }
        await tx.tradeInDevice.delete({ where: { id: sale.tradeInDevice.id } });
      }

      // 4. Excluir a venda (cascata remove SaleItems e Installments)
      await tx.sale.delete({ where: { id } });

      // 5. Registro de auditoria
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "EXCLUIR_VENDA",
          details: `Venda #${String(sale.saleNumber).padStart(5, "0")} excluída permanentemente pelo administrador ${user.name}.`,
        },
      });
    });

    return NextResponse.json({ message: "Venda excluída permanentemente com sucesso." });
  } catch (error: any) {
    console.error("Delete sale error:", error);
    return NextResponse.json({ error: "Erro ao excluir venda", detail: error?.message }, { status: 500 });
  }
}
