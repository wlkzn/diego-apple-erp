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

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let settings = await prisma.companySetting.findFirst();

    if (!settings) {
      // Criar padrão se não houver
      settings = await prisma.companySetting.create({
        data: {
          name: "Diego Apple Store",
          cnpj: "12.345.678/0001-99",
          address: "Av. das Américas, 500 - Barra da Tijuca, Rio de Janeiro - RJ",
          phone: "(21) 99999-8888",
          email: "contato@diegoapple.store",
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Apenas admins podem alterar as configurações da empresa
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== "ADMIN" && user.role !== "DEV")) {
      return NextResponse.json({ error: "Permissão negada. Apenas administradores." }, { status: 403 });
    }

    const body = await request.json();
    const { name, tipo, tradeName, cnpj, rg, ie, address, neighborhood, city, state, cep, phone, whatsApp, email, logoUrl } = body;

    if (!name || !cnpj || !address || !phone || !email) {
      return NextResponse.json({ error: "Campos obrigatórios em falta: nome, CPF/CNPJ, endereço, telefone e e-mail." }, { status: 400 });
    }

    let settings = await prisma.companySetting.findFirst();

    const safeLogoUrl = logoUrl && logoUrl.length > 2_000_000
      ? null
      : (logoUrl || null);

    if (settings) {
      settings = await prisma.companySetting.update({
        where: { id: settings.id },
        data: {
          name: String(name),
          tipo: tipo || "PJ",
          tradeName: tradeName || null,
          cnpj: String(cnpj),
          rg: rg || null,
          ie: ie || null,
          address: String(address),
          neighborhood: neighborhood || null,
          city: city || null,
          state: state || null,
          cep: cep || null,
          phone: String(phone),
          whatsApp: whatsApp || null,
          email: String(email),
          logoUrl: safeLogoUrl,
        },
      });
    } else {
      settings = await prisma.companySetting.create({
        data: {
          name: String(name),
          tipo: tipo || "PJ",
          tradeName: tradeName || null,
          cnpj: String(cnpj),
          rg: rg || null,
          ie: ie || null,
          address: String(address),
          neighborhood: neighborhood || null,
          city: city || null,
          state: state || null,
          cep: cep || null,
          phone: String(phone),
          whatsApp: whatsApp || null,
          email: String(email),
          logoUrl: safeLogoUrl,
        },
      });
    }

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        action: "CONFIGURAR_LOJA",
        details: "Dados cadastrais da loja foram atualizados.",
      },
    });

    return NextResponse.json({ settings, message: "Configurações da empresa salvas com sucesso!" });
  } catch (error: any) {
    console.error("Save settings error:", error);
    return NextResponse.json({
      error: "Erro ao salvar configurações",
      detail: error?.message ?? String(error),
    }, { status: 500 });
  }
}
