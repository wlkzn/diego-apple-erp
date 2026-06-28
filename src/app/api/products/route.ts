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
    const query = searchParams.get("q") || "";
    const status = searchParams.get("status") || "";

    const whereClause: any = {};

    if (query) {
      whereClause.OR = [
        { brand: { contains: query, mode: "insensitive" } },
        { model: { contains: query, mode: "insensitive" } },
        { imei: { contains: query, mode: "insensitive" } },
        { serialNumber: { contains: query, mode: "insensitive" } },
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("List products error:", error);
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

    const profit = parseFloat(sellingPrice) - parseFloat(purchasePrice);
    const qtyVal = quantity !== undefined ? parseInt(quantity) : 1;
    const costVal = parseFloat(purchasePrice);

    // Executar criação do produto e lançamento financeiro em uma transação
    const product = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          brand,
          model,
          color,
          storage,
          imei: imei || null,
          serialNumber: serialNumber || null,
          purchasePrice: costVal,
          sellingPrice: parseFloat(sellingPrice),
          profit,
          quantity: qtyVal,
          warranty: warranty || null,
          imageUrl: imageUrl || null,
          status: status || "AVAILABLE",
          condition: condition || null,
          hasAppleWarranty: hasAppleWarranty === undefined ? null : hasAppleWarranty,
          appleWarrantyUntil: appleWarrantyUntil ? new Date(appleWarrantyUntil) : null,
        },
      });

      // Se houver preço de custo, lança automaticamente uma despesa no financeiro como "Compra de Mercadoria"
      if (costVal > 0 && qtyVal > 0) {
        await tx.financialTransaction.create({
          data: {
            type: "OUTFLOW",
            category: "Compra de Mercadoria",
            amount: costVal * qtyVal,
            date: new Date(),
            status: "PAID",
            description: `Lançamento automático de custo de aquisição do aparelho: ${brand} ${model} (Qtd: ${qtyVal})`,
          },
        });
      }

      return prod;
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        action: "CADASTRAR_PRODUTO",
        details: `Produto ${brand} ${model} (${storage}, Cor: ${color}) cadastrado. Quantidade: ${qtyVal}.`,
      },
    });

    return NextResponse.json({ product, message: "Produto cadastrado com sucesso!" });
  } catch (error: any) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

