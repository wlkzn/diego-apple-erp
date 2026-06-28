"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useUser } from "@/context/UserContext";
import { maskCPF, maskPhone } from "@/lib/masks";
import {
  Printer,
  ArrowLeft,
  Share2,
  Mail,
  Loader2,
  Monitor,
  Smartphone,
} from "lucide-react";

interface Installment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
}

interface SaleDetail {
  id: string;
  saleNumber: number;
  totalAmount: number;
  discountAmount: number;
  netAmount: number;
  downPayment: number;
  tradeInAmount: number;
  paymentMethod: string;
  installmentCount: number;
  createdAt: string;
  customer: {
    name: string;
    cpf: string;
    phone: string;
    email: string | null;
    address: string | null;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product: {
      brand: string;
      model: string;
      color: string;
      storage: string;
      imei: string | null;
      serialNumber: string | null;
      warranty: string | null;
      condition: string | null;
    };
  }>;
  installments: Installment[];
}

interface Company {
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string | null;
}

type PrintMode = "a4" | "thermal80" | "thermal58";

const PAYMENT_LABELS: Record<string, string> = {
  PIX: "PIX",
  DINHEIRO: "Dinheiro / Espécie",
  CARTAO: "Cartão (Débito/Crédito)",
  BOLETO: "Boleto Bancário",
  PARCELADO_LOJA: "Parcelado — Crediário da Loja",
};

export default function VoucherPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user } = useUser();

  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [printMode, setPrintMode] = useState<PrintMode>("a4");
  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sales/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSale(data.sale);
        setCompany(data.companySettings);
      } else {
        showToast("Erro ao carregar dados da venda", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao carregar comprovante", "error");
    } finally {
      setIsLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrint = () => window.print();

  const handleWhatsAppShare = () => {
    if (!sale || !company) return;
    const phone = sale.customer.phone.replace(/\D/g, "");
    const msg =
      `Olá, ${sale.customer.name}! Segue o comprovante da sua compra na ${company.name}:\n\n` +
      `Recibo Nº: ${String(sale.saleNumber).padStart(5, "0")}\n` +
      `Data: ${new Date(sale.createdAt).toLocaleDateString("pt-BR")}\n` +
      `Total: ${formatBRL(sale.netAmount)}\n` +
      `Pagamento: ${PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}\n\n` +
      `Agradecemos a preferência!`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleEmailShare = () => {
    if (!sale || !company) return;
    const email = sale.customer.email || "";
    const subject = `Recibo de Compra #${String(sale.saleNumber).padStart(5, "0")} — ${company.name}`;
    const body =
      `Olá, ${sale.customer.name},\n\nObrigado por comprar conosco!\n\n` +
      `Recibo Nº: ${String(sale.saleNumber).padStart(5, "0")}\n` +
      `Valor total: ${formatBRL(sale.netAmount)}\n` +
      `Pagamento: ${PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}\n\n` +
      `Atenciosamente,\n${company.name}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const formatBRL = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString("pt-BR"),
      time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("pt-BR");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground select-none">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm">Carregando recibo...</span>
      </div>
    );
  }

  if (!sale || !company) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Erro: Venda não encontrada ou parâmetros incorretos.
      </div>
    );
  }

  const { date, time } = formatDateTime(sale.createdAt);
  const financiado = sale.netAmount - sale.downPayment;
  const hasInstallments = sale.paymentMethod === "PARCELADO_LOJA" && sale.installments.length > 0;
  const warrantyItems = sale.items.filter((i) => i.product.warranty);
  const firstWarranty = warrantyItems[0]?.product.warranty;

  const docWidth =
    printMode === "a4"
      ? "max-w-[794px]"
      : printMode === "thermal80"
      ? "max-w-[302px]"
      : "max-w-[219px]";

  const thermalMode = printMode !== "a4";

  return (
    <div id="voucher-outer" className="min-h-screen bg-neutral-100 dark:bg-zinc-950 py-8 px-4 flex flex-col items-center select-none">

      {/* Print style overrides */}
      <style>{`
        @page {
          size: ${printMode === "a4" ? "A4" : printMode === "thermal80" ? "80mm auto" : "58mm auto"};
          margin: ${printMode === "a4" ? "1cm" : "5mm"};
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          #voucher-outer { display: block !important; padding: 0 !important; background: white !important; min-height: unset !important; }
          #voucher-doc { max-width: 100% !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; }
          table { break-inside: avoid !important; page-break-inside: avoid !important; }
          .print-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>

      {/* Control Bar */}
      <div className={`w-full ${docWidth} no-print bg-card border border-border p-3 rounded-2xl shadow-md flex flex-wrap items-center gap-2 justify-between mb-5`}>
        <button
          onClick={() => router.back()}
          className="p-2 border border-border text-foreground hover:bg-muted rounded-xl cursor-pointer"
          title="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Print mode selector */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setPrintMode("a4")}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${printMode === "a4" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>A4</span>
          </button>
          <button
            onClick={() => setPrintMode("thermal80")}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${printMode === "thermal80" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>80mm</span>
          </button>
          <button
            onClick={() => setPrintMode("thermal58")}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${printMode === "thermal58" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Smartphone className="w-3 h-3" />
            <span>58mm</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:opacity-90 transition-all cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={handleWhatsAppShare}
            className="p-2 border border-border text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl cursor-pointer"
            title="Enviar via WhatsApp"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleEmailShare}
            className="p-2 border border-border text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 rounded-xl cursor-pointer"
            title="Enviar via E-mail"
          >
            <Mail className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── DOCUMENT ── */}
      <div
        id="voucher-doc"
        className={`w-full ${docWidth} bg-white text-zinc-900 border border-zinc-200 shadow-xl rounded-sm
          ${thermalMode ? "text-[10px] font-mono p-4" : "text-xs font-sans p-10"}`}
      >
        {/* ─── CABEÇALHO ─── */}
        {thermalMode ? (
          <div className="text-center space-y-0.5 mb-3">
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt={company.name} className="w-10 h-10 object-contain mx-auto mb-1 rounded" />
            ) : (
              <div className="w-10 h-10 bg-zinc-200 rounded mx-auto mb-1 flex items-center justify-center font-black text-zinc-500 text-lg">{company.name.charAt(0)}</div>
            )}
            <p className="font-extrabold text-[11px] uppercase">{company.name}</p>
            {company.cnpj && <p>CNPJ: {company.cnpj}</p>}
            <p>{company.address}</p>
            <p>Tel: {maskPhone(company.phone)}</p>
          </div>
        ) : (
          <div className="flex items-start justify-between pb-5 mb-5 border-b-2 border-zinc-900">
            <div className="flex items-center gap-4">
              {company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logoUrl} alt={company.name} className="w-16 h-16 object-contain rounded-lg border border-zinc-200" />
              ) : (
                <div className="w-16 h-16 bg-zinc-100 rounded-lg border border-zinc-200 flex items-center justify-center font-black text-zinc-400 text-2xl">{company.name.charAt(0)}</div>
              )}
              <div>
                <h1 className="text-lg font-black uppercase tracking-tight">{company.name}</h1>
                {company.cnpj && <p className="text-[11px] text-zinc-600 mt-0.5">CNPJ: {company.cnpj}</p>}
                <p className="text-[11px] text-zinc-600">{company.address}</p>
                <p className="text-[11px] text-zinc-600">Tel: {maskPhone(company.phone)} | {company.email}</p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-center inline-block">
                <p className="text-[9px] uppercase tracking-wider font-bold">Recibo de Venda</p>
                <p className="text-xl font-black tracking-wide">#{String(sale.saleNumber).padStart(5, "0")}</p>
              </div>
              <p className="text-[10px] text-zinc-500">{date} — {time}</p>
            </div>
          </div>
        )}

        {thermalMode && (
          <>
            <div className="border-t border-dashed border-zinc-400 my-2" />
            <div className="space-y-0.5 mb-2">
              <p className="font-extrabold uppercase text-center">CUPOM NÃO FISCAL</p>
              <p>Venda: #{String(sale.saleNumber).padStart(5, "0")}</p>
              <p>Data: {date} {time}</p>
              {user && <p>Vendedor: {user.name}</p>}
            </div>
          </>
        )}

        {/* Título (A4 only) */}
        {!thermalMode && (
          <div className="text-center mb-5">
            <span className="inline-block border-2 border-zinc-900 px-6 py-2 rounded-lg">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Documento Não Fiscal</p>
              <p className="text-sm font-black uppercase tracking-wide text-zinc-900">Recibo de Venda ao Consumidor</p>
            </span>
          </div>
        )}

        {/* Info A4: data, hora, vendedor */}
        {!thermalMode && (
          <div className="grid grid-cols-3 gap-3 mb-5 text-[10px]">
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5">
              <p className="text-zinc-500 font-bold uppercase">Data / Hora</p>
              <p className="font-semibold text-zinc-900 mt-0.5">{date}</p>
              <p className="text-zinc-600">{time}</p>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5">
              <p className="text-zinc-500 font-bold uppercase">Nº do Recibo</p>
              <p className="font-black text-zinc-900 mt-0.5 text-sm">#{String(sale.saleNumber).padStart(5, "0")}</p>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5">
              <p className="text-zinc-500 font-bold uppercase">Vendedor(a)</p>
              <p className="font-semibold text-zinc-900 mt-0.5">{user?.name ?? "—"}</p>
            </div>
          </div>
        )}

        {/* ─── DADOS DO CLIENTE ─── */}
        {!thermalMode ? (
          <div className="mb-5">
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Dados do Comprador</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                <div><span className="font-bold text-zinc-700">Nome:</span> <span className="text-zinc-900 uppercase">{sale.customer.name}</span></div>
                <div><span className="font-bold text-zinc-700">CPF:</span> <span className="text-zinc-900">{maskCPF(sale.customer.cpf)}</span></div>
                <div><span className="font-bold text-zinc-700">Telefone:</span> <span className="text-zinc-900">{maskPhone(sale.customer.phone)}</span></div>
                {sale.customer.email && (
                  <div><span className="font-bold text-zinc-700">E-mail:</span> <span className="text-zinc-900">{sale.customer.email}</span></div>
                )}
                {sale.customer.address && (
                  <div className="col-span-2"><span className="font-bold text-zinc-700">Endereço:</span> <span className="text-zinc-900">{sale.customer.address}</span></div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-2">
            <div className="border-t border-dashed border-zinc-400 my-2" />
            <p className="font-bold uppercase mb-0.5">CLIENTE</p>
            <p className="uppercase">{sale.customer.name}</p>
            <p>CPF: {maskCPF(sale.customer.cpf)}</p>
            <p>Tel: {maskPhone(sale.customer.phone)}</p>
          </div>
        )}

        {/* ─── PRODUTOS ─── */}
        {!thermalMode ? (
          <div className="mb-5">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Produtos / Serviços</p>
            <table className="w-full border border-zinc-200 rounded-lg overflow-hidden text-[10px] border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-white">
                  <th className="p-2 text-left font-bold">Nº</th>
                  <th className="p-2 text-left font-bold">Descrição</th>
                  <th className="p-2 text-center font-bold">Qtd</th>
                  <th className="p-2 text-right font-bold">V. Unit.</th>
                  <th className="p-2 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, idx) => (
                  <tr key={item.id} className={`border-b border-zinc-200 ${idx % 2 === 0 ? "bg-white" : "bg-zinc-50"}`}>
                    <td className="p-2.5 text-zinc-500 font-bold align-top">{String(idx + 1).padStart(2, "0")}</td>
                    <td className="p-2.5 align-top">
                      <p className="font-black text-zinc-900">{item.product.brand} {item.product.model}</p>
                      <p className="text-zinc-600 mt-0.5">Cor: {item.product.color} · {item.product.storage}{item.product.condition ? ` · ${item.product.condition}` : ""}</p>
                      {item.product.imei && <p className="text-zinc-500 font-mono mt-0.5">IMEI: {item.product.imei}</p>}
                      {item.product.serialNumber && <p className="text-zinc-500 font-mono">S/N: {item.product.serialNumber}</p>}
                      {item.product.warranty && <p className="text-emerald-700 font-semibold mt-0.5">Garantia: {item.product.warranty}</p>}
                    </td>
                    <td className="p-2.5 text-center align-top font-semibold">{item.quantity}</td>
                    <td className="p-2.5 text-right align-top">{formatBRL(item.unitPrice)}</td>
                    <td className="p-2.5 text-right align-top font-black text-zinc-900">{formatBRL(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mb-2">
            <div className="border-t border-dashed border-zinc-400 my-2" />
            <div className="grid grid-cols-12 font-bold text-[9px] uppercase mb-1">
              <span className="col-span-6">Descrição</span>
              <span className="col-span-2 text-center">Qtd</span>
              <span className="col-span-4 text-right">Total</span>
            </div>
            {sale.items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 leading-tight mb-1.5">
                <div className="col-span-6">
                  <p className="font-bold">{item.product.brand} {item.product.model}</p>
                  <p className="text-[8px]">{item.product.color} · {item.product.storage}</p>
                  {item.product.imei && <p className="text-[8px]">IMEI: {item.product.imei}</p>}
                </div>
                <span className="col-span-2 text-center">{item.quantity}</span>
                <span className="col-span-4 text-right font-semibold">{formatBRL(item.totalPrice)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ─── RESUMO FINANCEIRO ─── */}
        {!thermalMode ? (
          <div className="mb-5">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Resumo Financeiro</p>
            <div className="border border-zinc-200 rounded-lg overflow-hidden">
              <div className="divide-y divide-zinc-100">
                <div className="flex justify-between px-4 py-2.5 text-[11px]">
                  <span className="text-zinc-600">Subtotal</span>
                  <span className="font-semibold">{formatBRL(sale.totalAmount)}</span>
                </div>
                {sale.discountAmount > 0 && (
                  <div className="flex justify-between px-4 py-2.5 text-[11px]">
                    <span className="text-zinc-600">Desconto</span>
                    <span className="font-semibold text-rose-600">— {formatBRL(sale.discountAmount)}</span>
                  </div>
                )}
                {sale.tradeInAmount > 0 && (
                  <div className="flex justify-between px-4 py-2.5 text-[11px]">
                    <span className="text-zinc-600">Trade-in (aparelho entregue)</span>
                    <span className="font-semibold text-blue-600">— {formatBRL(sale.tradeInAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3 bg-zinc-900 text-white text-[12px] font-black">
                  <span>TOTAL LÍQUIDO</span>
                  <span>{formatBRL(sale.netAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-2">
            <div className="border-t border-dashed border-zinc-400 my-2" />
            <div className="space-y-0.5 text-right">
              <div className="flex justify-between"><span>Subtotal:</span><span>{formatBRL(sale.totalAmount)}</span></div>
              {sale.discountAmount > 0 && <div className="flex justify-between"><span>Desconto:</span><span>-{formatBRL(sale.discountAmount)}</span></div>}
              {sale.tradeInAmount > 0 && <div className="flex justify-between"><span>Trade-in:</span><span>-{formatBRL(sale.tradeInAmount)}</span></div>}
              <div className="flex justify-between font-extrabold border-t border-zinc-400 pt-1 mt-1 text-[11px]">
                <span>TOTAL:</span><span>{formatBRL(sale.netAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── PAGAMENTO ─── */}
        {!thermalMode ? (
          <div className="mb-5">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Forma de Pagamento</p>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3.5 space-y-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-700">Método:</span>
                <span className="font-black text-zinc-900">{PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</span>
              </div>
              {sale.paymentMethod === "PARCELADO_LOJA" && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white border border-zinc-200 rounded-lg p-2 text-center">
                      <p className="text-[9px] font-bold text-zinc-500 uppercase">Entrada</p>
                      <p className="font-black text-zinc-900">{formatBRL(sale.downPayment)}</p>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg p-2 text-center">
                      <p className="text-[9px] font-bold text-zinc-500 uppercase">Financiado</p>
                      <p className="font-black text-zinc-900">{formatBRL(financiado)}</p>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg p-2 text-center">
                      <p className="text-[9px] font-bold text-zinc-500 uppercase">Parcelas</p>
                      <p className="font-black text-zinc-900">{sale.installmentCount}×</p>
                    </div>
                  </div>
                  {hasInstallments && (
                    <div>
                      <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1.5">Calendário de Vencimentos</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {sale.installments.map((inst) => (
                          <div key={inst.id} className="bg-white border border-zinc-200 rounded-lg p-1.5 text-center">
                            <p className="text-[9px] font-bold text-zinc-500">{String(inst.installmentNumber).padStart(2, "0")}ª</p>
                            <p className="text-[9px] text-zinc-700">{formatDate(inst.dueDate)}</p>
                            <p className="font-bold text-zinc-900">{formatBRL(inst.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-2">
            <div className="border-t border-dashed border-zinc-400 my-2" />
            <p><span className="font-bold">PAGAMENTO:</span> {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</p>
            {sale.paymentMethod === "PARCELADO_LOJA" && (
              <>
                <p>Entrada: {formatBRL(sale.downPayment)}</p>
                <p>{sale.installmentCount}x de {formatBRL(sale.installmentCount > 0 ? financiado / sale.installmentCount : 0)}</p>
              </>
            )}
          </div>
        )}

        {/* ─── GARANTIA / OBSERVAÇÕES ─── */}
        {(firstWarranty) && (
          <div className={`${thermalMode ? "mb-2" : "mb-5"}`}>
            {!thermalMode && <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Garantia</p>}
            {thermalMode && <div className="border-t border-dashed border-zinc-400 my-2" />}
            <div className={thermalMode ? "" : "bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-[11px]"}>
              <p className={thermalMode ? "" : "text-emerald-800 font-semibold"}>
                {thermalMode ? `Garantia: ${firstWarranty}` : `Garantia da loja: ${firstWarranty}`}
              </p>
              {!thermalMode && (
                <p className="text-emerald-600 text-[10px] mt-0.5">Aparelhos seminovos possuem garantia legal de 90 dias contra defeitos de fabricação.</p>
              )}
            </div>
          </div>
        )}

        {/* ─── RODAPÉ ─── */}
        {!thermalMode ? (
          <>
            <div className="border-t border-zinc-200 my-5" />
            <div className="text-center space-y-2">
              <p className="text-sm font-black text-zinc-900 uppercase tracking-wide">
                Obrigado pela preferência!
              </p>
              <p className="text-[10px] text-zinc-500">
                Guarde este recibo. Ele é o comprovante da sua compra.
              </p>
              <p className="text-[10px] text-zinc-500">
                {company.name} · {company.phone} · {company.email}
              </p>
              <p className="text-[9px] text-zinc-400 pt-2">
                Ref. Interna: {sale.id.slice(0, 8).toUpperCase()} · Zenix Systems
              </p>
            </div>
          </>
        ) : (
          <div className="text-center space-y-2 mt-3">
            <div className="border-t border-dashed border-zinc-400 my-2" />
            <p className="font-bold text-[11px]">OBRIGADO PELA PREFERÊNCIA!</p>
            <p className="text-[8px]">Ref: {sale.id.slice(0, 8).toUpperCase()}</p>
            {firstWarranty && (
              <p className="text-[8px] leading-tight">
                Garantia: {firstWarranty}. Aparelhos seminovos: 90 dias garantia legal.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
