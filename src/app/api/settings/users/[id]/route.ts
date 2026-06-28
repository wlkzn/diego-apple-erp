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

    // Apenas admins podem excluir usuários
    const requestor = await prisma.user.findUnique({ where: { id: userId } });
    if (!requestor || requestor.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    // Impedir auto-exclusão
    if (id === userId) {
      return NextResponse.json(
        { error: "Não é permitido excluir o próprio usuário que está logado atualmente." },
        { status: 400 }
      );
    }

    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        action: "EXCLUIR_USUARIO",
        details: `Usuário ${userToDelete.name} (${userToDelete.email}) foi excluído do sistema.`,
      },
    });

    return NextResponse.json({ message: "Usuário excluído com sucesso!" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
