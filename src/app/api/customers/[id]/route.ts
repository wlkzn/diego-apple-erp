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
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    brand: true,
                    model: true,
                    color: true,
                    storage: true,
                    imei: true,
                  },
                },
              },
            },
          },
        },
        installments: {
          orderBy: { dueDate: "asc" },
          include: {
            sale: {
              select: {
                saleNumber: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 44 });
    }

    return NextResponse.json({ customer });
  } catch (error: any) {
    console.error("Get customer error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
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
    const { name, cpf, rg, birthDate, phone, whatsApp, email, address, addressNumber, neighborhood, city, state, cep, notes } = body;

    if (!name || !cpf || !phone) {
      return NextResponse.json(
        { error: "Nome, CPF e Telefone são campos obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar duplicidade de CPF para outros clientes
    const existingCpf = await prisma.customer.findFirst({
      where: {
        cpf,
        id: { not: id },
      },
    });

    if (existingCpf) {
      return NextResponse.json(
        { error: "Já existe outro cliente cadastrado com este CPF" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.update({
      where: { id },
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
        action: "ATUALIZAR_CLIENTE",
        details: `Dados do cliente ${name} (CPF: ${cpf}) foram atualizados.`,
      },
    });

    return NextResponse.json({ customer, message: "Dados do cliente atualizados com sucesso!" });
  } catch (error: any) {
    console.error("Update customer error:", error);
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

    // Verificar se possui histórico de compras
    const salesCount = await prisma.sale.count({
      where: { customerId: id },
    });

    if (salesCount > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir um cliente que possui histórico de compras no sistema." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    await prisma.customer.delete({
      where: { id },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        action: "EXCLUIR_CLIENTE",
        details: `Cliente ${customer.name} (CPF: ${customer.cpf}) foi excluído do sistema.`,
      },
    });

    return NextResponse.json({ message: "Cliente excluído com sucesso!" });
  } catch (error: any) {
    console.error("Delete customer error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
