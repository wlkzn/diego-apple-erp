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

    const whereClause: any = {};

    if (query) {
      whereClause.OR = [
        { customer: { name: { contains: query, mode: "insensitive" } } },
        { customer: { cpf: { contains: query, mode: "insensitive" } } },
        { paymentMethod: { contains: query, mode: "insensitive" } },
      ];
      // Se for número
      if (!isNaN(Number(query))) {
        whereClause.OR.push({ saleNumber: Number(query) });
      }
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sales });
  } catch (error: any) {
    console.error("List sales error:", error);
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
    const {
      customerId,
      items, // array of { productId, quantity, price }
      discountAmount = 0,
      surchargeAmount = 0,
      downPayment = 0,
      paymentMethod,
      installmentCount = 1,
      installmentDueDay = 10,
    } = body;

    if (!customerId || !items || items.length === 0 || !paymentMethod) {
      return NextResponse.json(
        { error: "Dados da venda incompletos" },
        { status: 400 }
      );
    }

    // Executar transação no banco de dados para garantir integridade
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validar e buscar produtos
      let totalAmount = 0;
      const saleItemsData = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Produto não encontrado: ${item.productId}`);
        }

        if (product.status === "SOLD" || product.quantity < item.quantity) {
          throw new Error(`Estoque insuficiente para o produto: ${product.brand} ${product.model}`);
        }

        const itemTotal = item.quantity * item.price;
        totalAmount += itemTotal;

        saleItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: itemTotal,
        });

        // 2. Atualizar estoque do produto
        const newQty = product.quantity - item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: newQty,
            status: newQty === 0 ? "SOLD" : product.status,
          },
        });
      }

      const tradeInAmount = body.tradeIn ? parseFloat(body.tradeIn.evaluationPrice) || 0 : 0;
      const netAmount = Math.max(totalAmount - discountAmount - tradeInAmount + surchargeAmount, 0);

      // 3. Criar a venda (Sale)
      const sale = await tx.sale.create({
        data: {
          customerId,
          totalAmount,
          discountAmount,
          surchargeAmount,
          netAmount,
          downPayment,
          paymentMethod,
          installmentCount,
          tradeInAmount,
          items: {
            create: saleItemsData,
          },
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // 4. Criar o registro de Trade-in e o produto no estoque (se houver trade-in)
      if (body.tradeIn) {
        const ti = body.tradeIn;
        const evalPrice = parseFloat(ti.evaluationPrice) || 0;

        // Cadastrar o aparelho recebido como produto no estoque
        const tradeInProduct = await tx.product.create({
          data: {
            brand: ti.brand,
            model: ti.model,
            color: ti.color,
            storage: ti.storage,
            imei: ti.imei1 || undefined,
            serialNumber: ti.serialNumber || undefined,
            purchasePrice: evalPrice,
            sellingPrice: 0,
            profit: 0,
            quantity: 1,
            condition: ti.condition || undefined,
            status: "RESERVED",
            isTradeIn: true,
            imageUrl: ti.photos ? (() => {
              try { const arr = JSON.parse(ti.photos); return arr[0] || undefined; } catch { return undefined; }
            })() : undefined,
          },
        });

        // Criar o registro de TradeInDevice
        const tradeInDevice = await tx.tradeInDevice.create({
          data: {
            brand: ti.brand,
            model: ti.model,
            color: ti.color,
            storage: ti.storage,
            imei1: ti.imei1 || undefined,
            imei2: ti.imei2 || undefined,
            serialNumber: ti.serialNumber || undefined,
            carrier: ti.carrier || undefined,
            evaluationPrice: evalPrice,
            condition: ti.condition || "Bom",
            notes: ti.notes || undefined,
            photos: ti.photos || undefined,
            checklist: ti.checklist || undefined,
            status: "AGUARDANDO_AVALIACAO",
            sale: { connect: { id: sale.id } },
            customerId,
            evaluatedById: userId,
            productId: tradeInProduct.id,
          },
        });

        // Atualizar o produto com a referência ao trade-in
        await tx.product.update({
          where: { id: tradeInProduct.id },
          data: { tradeInDeviceId: tradeInDevice.id },
        });

        // Registrar histórico inicial de status
        await tx.tradeInStatusHistory.create({
          data: {
            deviceId: tradeInDevice.id,
            status: "AGUARDANDO_AVALIACAO",
            note: "Aparelho recebido como parte do pagamento na venda.",
            userId,
          },
        });

        // Registrar no financeiro o trade-in como aquisição de mercadoria
        await tx.financialTransaction.create({
          data: {
            type: "OUTFLOW",
            category: "Trade-in (Aquisição)",
            amount: evalPrice,
            date: new Date(),
            status: "PAID",
            description: `Trade-in recebido na venda #${String(sale.saleNumber).padStart(5, "0")}: ${ti.brand} ${ti.model} avaliado em R$ ${evalPrice.toFixed(2)}`,
            saleId: sale.id,
          },
        });
      }

      // 5. Lançar transações financeiras e parcelas
      if (paymentMethod === "PARCELADO_LOJA") {
        // Registrar a entrada (downPayment) se for maior que 0
        if (downPayment > 0) {
          await tx.financialTransaction.create({
            data: {
              type: "INFLOW",
              category: "Venda (Entrada)",
              amount: downPayment,
              date: new Date(),
              status: "PAID",
              description: `Entrada recebida na venda #${String(sale.saleNumber).padStart(5, "0")}`,
              saleId: sale.id,
            },
          });
        }

        // Gerar parcelas
        const remainingAmount = netAmount - downPayment;
        const installmentValue = parseFloat((remainingAmount / installmentCount).toFixed(2));
        let sumInstallments = 0;

        for (let i = 1; i <= installmentCount; i++) {
          let currentAmount = installmentValue;
          // Ajuste de dízimas na última parcela
          if (i === installmentCount) {
            currentAmount = parseFloat((remainingAmount - sumInstallments).toFixed(2));
          }
          sumInstallments += currentAmount;

          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + i);
          const lastDayOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
          dueDate.setDate(Math.min(installmentDueDay, lastDayOfMonth));

          const installment = await tx.installment.create({
            data: {
              saleId: sale.id,
              customerId,
              installmentNumber: i,
              amount: currentAmount,
              dueDate,
              status: "PENDING",
              remainingAmount: currentAmount,
            },
          });

          // Registrar transação financeira pendente vinculada à parcela
          await tx.financialTransaction.create({
            data: {
              type: "INFLOW",
              category: "Recebimento de Parcela",
              amount: currentAmount,
              date: dueDate,
              status: "PENDING",
              description: `Parcela ${i}/${installmentCount} referente à venda #${String(sale.saleNumber).padStart(5, "0")}`,
              saleId: sale.id,
              installmentId: installment.id,
            },
          });
        }
      } else {
        // Pagamento à vista (PIX, Dinheiro, Cartão, Boleto)
        // Lançar transação de receita total imediata como paga
        await tx.financialTransaction.create({
          data: {
            type: "INFLOW",
            category: "Venda",
            amount: netAmount,
            date: new Date(),
            status: "PAID",
            description: `Receita total recebida via ${paymentMethod} na venda #${String(sale.saleNumber).padStart(5, "0")}`,
            saleId: sale.id,
          },
        });
      }

      return sale;
    });

    // 6. Auditoria de sucesso
    await prisma.auditLog.create({
      data: {
        userId,
        action: "CADASTRAR_VENDA",
        details: `Venda #${String(result.saleNumber).padStart(5, "0")} cadastrada para o cliente ${result.customer.name}. Valor líquido: R$ ${result.netAmount.toFixed(2)}.`,
      },
    });

    const companySettings = await prisma.companySetting.findFirst();

    return NextResponse.json({
      sale: result,
      companySettings,
      message: "Venda cadastrada com sucesso!",
    });
  } catch (error: any) {
    console.error("Create sale error:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno no servidor ao processar a venda" },
      { status: 500 }
    );
  }
}
