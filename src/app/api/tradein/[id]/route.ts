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

    const device = await prisma.tradeInDevice.findUnique({
      where: { id },
      include: {
        sale: {
          include: {
            customer: true,
            items: { include: { product: true } },
          },
        },
        repairs: { orderBy: { createdAt: "desc" } },
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!device) {
      return NextResponse.json({ error: "Trade-in não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ device });
  } catch (error: any) {
    console.error("Get trade-in error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { status, note, photos, notes, checklist } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (photos !== undefined) updateData.photos = photos;
    if (notes !== undefined) updateData.notes = notes;
    if (checklist !== undefined) updateData.checklist = checklist;

    const device = await prisma.tradeInDevice.update({
      where: { id },
      data: updateData,
    });

    // Se status mudou, registrar no histórico
    if (status) {
      await prisma.tradeInStatusHistory.create({
        data: {
          deviceId: id,
          status,
          note: note || null,
          userId,
        },
      });

      // Atualiza status do produto no estoque, se existir
      if (device.productId) {
        let productStatus: string | undefined;
        if (status === "DISPONIVEL") productStatus = "AVAILABLE";
        else if (status === "VENDIDO") productStatus = "SOLD";
        else if (status === "RESERVADO") productStatus = "RESERVED";

        if (productStatus) {
          await prisma.product.update({
            where: { id: device.productId },
            data: { status: productStatus as any },
          });
        }
      }
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: "ATUALIZAR_TRADEIN",
        details: `Trade-in ${id} atualizado. Status: ${status || "sem alteração"}.`,
      },
    });

    return NextResponse.json({ device, message: "Trade-in atualizado com sucesso!" });
  } catch (error: any) {
    console.error("Update trade-in error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
