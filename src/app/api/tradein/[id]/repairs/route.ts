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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await params;

    const repairs = await prisma.tradeInRepair.findMany({
      where: { deviceId: id },
      orderBy: { createdAt: "desc" },
    });

    const totalCost = repairs.reduce((sum, r) => sum + r.cost, 0);

    return NextResponse.json({ repairs, totalCost });
  } catch (error: any) {
    console.error("Get repairs error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { defect, service, parts, cost, startDate, endDate, technician } = body;

    if (!defect || !service || cost === undefined || !startDate || !technician) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const repair = await prisma.tradeInRepair.create({
      data: {
        deviceId: id,
        defect,
        service,
        parts: parts || null,
        cost: parseFloat(cost),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        technician,
      },
    });

    // Atualizar custo do produto no estoque (purchasePrice += custo do reparo)
    const device = await prisma.tradeInDevice.findUnique({ where: { id } });
    if (device?.productId) {
      const product = await prisma.product.findUnique({ where: { id: device.productId } });
      if (product) {
        const newPurchasePrice = product.purchasePrice + parseFloat(cost);
        const newProfit = product.sellingPrice - newPurchasePrice;
        await prisma.product.update({
          where: { id: device.productId },
          data: { purchasePrice: newPurchasePrice, profit: newProfit },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CADASTRAR_REPARO_TRADEIN",
        details: `Reparo cadastrado para trade-in ${id}. Serviço: ${service}. Custo: R$ ${cost}.`,
      },
    });

    return NextResponse.json({ repair, message: "Reparo cadastrado com sucesso!" });
  } catch (error: any) {
    console.error("Create repair error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
