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
    const {
      brand,
      model,
      color,
      storage,
      imei,
      serialNumber,
      purchasePrice,
      sellingPrice,
      quantity,
      warranty,
      imageUrl,
      status,
      condition,
      hasAppleWarranty,
      appleWarrantyUntil,
    } = body;

    if (!brand || !model || !color || !storage || purchasePrice === undefined || sellingPrice === undefined) {
      return NextResponse.json(
        { error: "Marca, Modelo, Cor, Armazenamento e Valores são obrigatórios" },
        { status: 400 }
      );
    }

    const profit = sellingPrice - purchasePrice;

    const product = await prisma.product.update({
      where: { id },
      data: {
        brand,
        model,
        color,
        storage,
        imei: imei || null,
        serialNumber: serialNumber || null,
        purchasePrice: parseFloat(purchasePrice),
        sellingPrice: parseFloat(sellingPrice),
        profit,
        quantity: parseInt(quantity) !== undefined ? parseInt(quantity) : 1,
        warranty: warranty || null,
        imageUrl: imageUrl || null,
        status: status || "AVAILABLE",
        condition: condition || null,
        hasAppleWarranty: hasAppleWarranty === undefined ? null : hasAppleWarranty,
        appleWarrantyUntil: appleWarrantyUntil ? new Date(appleWarrantyUntil) : null,
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        action: "ATUALIZAR_PRODUTO",
        details: `Produto ${brand} ${model} atualizado. Status: ${status || "AVAILABLE"}.`,
      },
    });

    return NextResponse.json({ product, message: "Produto atualizado com sucesso!" });
  } catch (error: any) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}


export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se o produto já foi vendido
    const saleItemsCount = await prisma.saleItem.count({
      where: { productId: id },
    });

    if (saleItemsCount > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir um produto que possui histórico de vendas no sistema. Se necessário, altere a quantidade para 0 ou o status para vendido." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    await prisma.product.delete({
      where: { id },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        action: "EXCLUIR_PRODUTO",
        details: `Produto ${product.brand} ${product.model} (IMEI: ${product.imei || "N/A"}) excluído do estoque.`,
      },
    });

    return NextResponse.json({ message: "Produto excluído com sucesso!" });
  } catch (error: any) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
