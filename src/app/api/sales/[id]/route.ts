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
