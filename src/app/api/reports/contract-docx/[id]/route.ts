import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import fs from "fs";
import path from "path";

// Template DOCX em: <raiz do projeto>/img/CONTRATO APPLE.docx
// Adicione no documento as variáveis no formato {nome_variavel}
// Lista completa de variáveis disponíveis: ver mapa abaixo (variable map)
const TEMPLATE_PATH = path.join(process.cwd(), "img", "CONTRATO APPLE.docx");

async function getAuthUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

function formatBRL(val: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateLong(d: Date | string): string {
  return new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function maskCPFLocal(cpf: string): string {
  const d = cpf.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function maskCNPJLocal(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "").slice(0, 14);
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return phone;
}

function maskCEP(cep: string): string {
  const d = cep.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d{3})/, "$1-$2");
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

    if (!fs.existsSync(TEMPLATE_PATH)) {
      return NextResponse.json(
        {
          error:
            "Template de contrato não encontrado. " +
            "O arquivo 'CONTRATO APPLE.docx' deve estar na pasta 'img/' do projeto. " +
            "Abra o arquivo no Word e substitua os dados variáveis pelas tags no formato {variavel}. " +
            "Consulte a documentação do sistema para a lista completa de variáveis disponíveis.",
        },
        { status: 404 }
      );
    }

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
        installments: { orderBy: { installmentNumber: "asc" } },
        tradeInDevice: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });
    }

    const company = await prisma.companySetting.findFirst();
    const seller = await prisma.user.findUnique({ where: { id: userId } });

    const paymentLabels: Record<string, string> = {
      PIX: "PIX",
      DINHEIRO: "Dinheiro / Espécie",
      CARTAO: "Cartão (Débito/Crédito)",
      BOLETO: "Boleto Bancário",
      PARCELADO_LOJA: "Parcelado — Crediário da Loja",
    };

    // Produto(s) — tabela de texto
    const productLines = sale.items
      .map((item, i) => {
        const p = item.product;
        let line = `${i + 1}. ${p.brand} ${p.model} — ${p.color} — ${p.storage}`;
        if (p.imei) line += ` — IMEI: ${p.imei}`;
        if (p.serialNumber) line += ` — S/N: ${p.serialNumber}`;
        if (p.warranty) line += ` — Garantia: ${p.warranty}`;
        line += ` — ${formatBRL(item.unitPrice)}`;
        return line;
      })
      .join("\n");

    // Primeiro produto (para campos individuais)
    const firstItem = sale.items[0];
    const fp = firstItem?.product;

    // Parcelas — tabela de texto
    const installmentLines = sale.installments
      .map(
        (inst) =>
          `${String(inst.installmentNumber).padStart(2, "0")}ª parcela: ${formatDate(inst.dueDate)} — ${formatBRL(inst.amount)}`
      )
      .join("\n");

    const financiado = Math.max(sale.netAmount - sale.downPayment, 0);
    const valorParcela =
      sale.installmentCount > 0 ? formatBRL(financiado / sale.installmentCount) : formatBRL(0);

    // Endereço completo da empresa
    const enderecoCompleto = [
      company?.address,
      company?.city,
      company?.state,
      company?.cep ? `CEP: ${maskCEP(company.cep)}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    // Mapa de variáveis — use no DOCX como {nome_variavel}
    const variables: Record<string, string> = {
      // ── Contrato ──────────────────────────────────────────────────────────
      numero_contrato: String(sale.saleNumber).padStart(5, "0"),
      data: formatDate(sale.createdAt),
      data_extenso: formatDateLong(sale.createdAt),
      codigo_venda: `#${sale.id.slice(0, 8).toUpperCase()}`,
      id_venda: sale.id,
      vendedor: seller?.name ?? "",

      // ── Empresa ───────────────────────────────────────────────────────────
      nome_empresa: company?.name ?? "",
      nome_fantasia: company?.tradeName ?? company?.name ?? "",
      cnpj_empresa: company?.cnpj ? maskCNPJLocal(company.cnpj) : "",
      cpf_empresa: company?.cnpj ? maskCPFLocal(company.cnpj) : "",
      endereco_empresa: company?.address ?? "",
      cidade_empresa: company?.city ?? "",
      estado_empresa: company?.state ?? "",
      cep_empresa: company?.cep ? maskCEP(company.cep) : "",
      endereco_completo_empresa: enderecoCompleto,
      telefone_empresa: company?.phone ? maskPhone(company.phone) : "",
      whatsapp_empresa: company?.whatsApp ? maskPhone(company.whatsApp) : "",
      email_empresa: company?.email ?? "",
      ie_empresa: company?.ie ?? "",

      // ── Cliente ───────────────────────────────────────────────────────────
      nome_cliente: sale.customer.name,
      cpf_cliente: maskCPFLocal(sale.customer.cpf),
      rg_cliente: sale.customer.rg ?? "",
      telefone_cliente: sale.customer.phone ? maskPhone(sale.customer.phone) : "",
      whatsapp_cliente: sale.customer.whatsApp ? maskPhone(sale.customer.whatsApp) : "",
      email_cliente: sale.customer.email ?? "",
      cep_cliente: sale.customer.cep ? maskCEP(sale.customer.cep) : "",
      logradouro_cliente: sale.customer.address ?? "",
      numero_cliente: sale.customer.addressNumber ?? "",
      bairro_cliente: sale.customer.neighborhood ?? "",
      cidade_cliente: sale.customer.city ?? "",
      estado_cliente: sale.customer.state ?? "",
      endereco_cliente: [
        sale.customer.address,
        sale.customer.addressNumber,
        sale.customer.neighborhood,
        sale.customer.city,
        sale.customer.state,
        sale.customer.cep ? maskCEP(sale.customer.cep) : null,
      ].filter(Boolean).join(", "),
      nascimento_cliente: sale.customer.birthDate ? formatDate(sale.customer.birthDate) : "",

      // ── Produto principal ─────────────────────────────────────────────────
      marca: fp?.brand ?? "",
      modelo: fp?.model ?? "",
      cor: fp?.color ?? "",
      capacidade: fp?.storage ?? "",
      imei: fp?.imei ?? "",
      serial: fp?.serialNumber ?? "",
      garantia: fp?.warranty ?? "90 dias",
      condicao: fp?.condition ?? "",
      saude_bateria: "",
      preco_unitario: firstItem ? formatBRL(firstItem.unitPrice) : "",

      // ── Lista de produtos ─────────────────────────────────────────────────
      produtos: productLines,

      // ── Valores ───────────────────────────────────────────────────────────
      valor_total: formatBRL(sale.totalAmount),
      valor_desconto: formatBRL(sale.discountAmount),
      valor_liquido: formatBRL(sale.netAmount),
      valor_entrada: formatBRL(sale.downPayment),
      valor_financiado: formatBRL(financiado),
      valor_trade_in: sale.tradeInAmount > 0 ? formatBRL(sale.tradeInAmount) : "",
      forma_pagamento: paymentLabels[sale.paymentMethod] ?? sale.paymentMethod,
      quantidade_parcelas: String(sale.installmentCount),
      valor_parcela: valorParcela,

      // ── Parcelas ──────────────────────────────────────────────────────────
      parcelas: installmentLines,

      // ── Trade-in (quando houver) ──────────────────────────────────────────
      tem_trade_in: sale.tradeInDevice ? "Sim" : "Não",
      trade_in_marca: sale.tradeInDevice?.brand ?? "",
      trade_in_modelo: sale.tradeInDevice?.model ?? "",
      trade_in_cor: sale.tradeInDevice?.color ?? "",
      trade_in_capacidade: sale.tradeInDevice?.storage ?? "",
      trade_in_imei: sale.tradeInDevice?.imei1 ?? "",
      trade_in_condicao: sale.tradeInDevice?.condition ?? "",
      trade_in_valor: sale.tradeInDevice ? formatBRL(sale.tradeInDevice.evaluationPrice) : "",
    };

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PizZip = require("pizzip");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Docxtemplater = require("docxtemplater");

    const content = fs.readFileSync(TEMPLATE_PATH, "binary");
    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter() {
        return "";
      },
    });

    doc.render(variables);

    const buffer: Buffer = doc.getZip().generate({ type: "nodebuffer" });
    const uint8 = new Uint8Array(buffer);

    const filename = `Contrato-${String(sale.saleNumber).padStart(5, "0")}-${sale.customer.name.replace(/\s+/g, "-").slice(0, 20)}.docx`;

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao gerar contrato DOCX:", error);

    if (
      error &&
      typeof error === "object" &&
      "properties" in error &&
      error.properties &&
      typeof error.properties === "object" &&
      "errors" in (error.properties as object)
    ) {
      return NextResponse.json(
        {
          error:
            "Erro nas variáveis do template DOCX. " +
            "Verifique se o contrato usa o formato correto: {nome_variavel}.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Erro interno ao gerar o contrato." }, { status: 500 });
  }
}
