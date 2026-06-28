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
        { imei1: { contains: query, mode: "insensitive" } },
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    const devices = await prisma.tradeInDevice.findMany({
      where: whereClause,
      include: {
        sale: {
          select: {
            saleNumber: true,
            customer: { select: { id: true, name: true, cpf: true, phone: true } },
          },
        },
        repairs: true,
        statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ devices });
  } catch (error: any) {
    console.error("List trade-in error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
