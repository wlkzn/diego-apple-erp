import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

async function getAuthUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    
    // Verificar se a venda existe
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!sale) {
      return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Definir diretório de uploads local
    const uploadsDir = join(process.cwd(), "public", "uploads", "signed-contracts");
    
    // Garantir que a pasta existe
    await mkdir(uploadsDir, { recursive: true });

    // Salvar o arquivo preservando o ID da venda e a extensão original
    const ext = file.name.split(".").pop() || "pdf";
    const filename = `${id}.${ext}`;
    const filePath = join(uploadsDir, filename);

    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/signed-contracts/${filename}`;

    // Atualizar a venda com o link do contrato assinado
    await prisma.sale.update({
      where: { id },
      data: { signedContractUrl: fileUrl },
    });

    // Registrar no auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        action: "UPLOAD_CONTRATO",
        details: `Upload de contrato assinado para a venda #${String(sale.saleNumber).padStart(5, "0")} (Cliente: ${sale.customer.name}).`,
      },
    });

    return NextResponse.json({
      message: "Contrato assinado enviado com sucesso!",
      signedContractUrl: fileUrl,
    });
  } catch (error: any) {
    console.error("Upload contract error:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar o upload" },
      { status: 500 }
    );
  }
}
