import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

// Helper to authenticate route and get userId
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

    const customers = await prisma.customer.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { cpf: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {},
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ customers });
  } catch (error: any) {
    console.error("List customers error:", error);
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
    const { name, cpf, rg, birthDate, phone, whatsApp, email, address, addressNumber, neighborhood, city, state, cep, notes } = body;

    if (!name || !cpf || !phone) {
      return NextResponse.json(
        { error: "Nome, CPF e Telefone são campos obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se CPF já está cadastrado
    const existingCustomer = await prisma.customer.findUnique({
      where: { cpf },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: "Já existe um cliente cadastrado com este CPF" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        cpf,
        rg,
        birthDate: birthDate ? new Date(birthDate) : null,
        phone,
        whatsApp,
        email,
        address,
        addressNumber,
        neighborhood,
        city,
        state,
        cep,
        notes,
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        action: "CADASTRAR_CLIENTE",
        details: `Cliente ${name} (CPF: ${cpf}) cadastrado com sucesso.`,
      },
    });

    return NextResponse.json({ customer, message: "Cliente cadastrado com sucesso!" });
  } catch (error: any) {
    console.error("Create customer error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
