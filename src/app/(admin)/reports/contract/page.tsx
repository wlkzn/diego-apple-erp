"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/Toast";
import { maskCPF, maskCEP } from "@/lib/masks";
import {
  Printer,
  ArrowLeft,
  Share2,
  Mail,
  Loader2,
  Download,
} from "lucide-react";

interface SaleDetail {
  id: string;
  saleNumber: number;
  totalAmount: number;
  discountAmount: number;
  netAmount: number;
  downPayment: number;
  paymentMethod: string;
  installmentCount: number;
  tradeInAmount: number;
  createdAt: string;
  customer: {
    name: string;
    cpf: string;
    rg: string | null;
    phone: string;
    email: string | null;
    address: string | null;
    addressNumber: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    cep: string | null;
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
  installments: Array<{
    id: string;
    installmentNumber: number;
    amount: number;
    dueDate: string;
  }>;
}

interface Company {
  name: string;
  tradeName: string | null;
  tipo: string | null;
  cnpj: string;
  address: string;
  city: string | null;
  state: string | null;
  cep: string | null;
  phone: string;
  whatsApp: string | null;
  email: string;
  ie: string | null;
  logoUrl: string | null;
  contractTerms: string | null;
}

export default function ContractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
      showToast("Erro ao carregar contrato", "error");
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
    const message =
      `Olá, ${sale.customer.name}! O contrato de parcelamento referente à venda ` +
      `#${String(sale.saleNumber).padStart(5, "0")} está pronto. ` +
      `Você pode acessá-lo e assiná-lo diretamente na loja.\n\nAgradecemos a preferência!`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleEmailShare = () => {
    if (!sale || !company) return;
    const email = sale.customer.email || "";
    const subject = `Contrato de Parcelamento de Venda #${String(sale.saleNumber).padStart(5, "0")} - ${company.name}`;
    const body =
      `Olá, ${sale.customer.name},\n\nO contrato referente à sua compra já está emitido.\n\n` +
      `Contrato nº: #${String(sale.saleNumber).padStart(5, "0")}\n` +
      `Parcelas: ${sale.installmentCount}x\n\n` +
      `Por favor, compareça à loja para assinatura do documento.\n\nAtenciosamente,\n${company.name}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const formatBRL = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR");

  const formatDateLong = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground select-none">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="text-sm">Carregando contrato...</span>
      </div>
    );
  }

  if (!sale || !company) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Erro: Contrato não encontrado ou parâmetros incorretos.
      </div>
    );
  }

  const c = sale.customer;
  const enderecoCliente = [
    c.address,
    c.addressNumber,
    c.neighborhood,
    c.city,
    c.state,
    c.cep ? `CEP ${maskCEP(c.cep)}` : null,
  ].filter(Boolean).join(", ") || "endereço não informado";

  const enderecoEmpresa = [
    company.address,
    company.city,
    company.state,
    company.cep ? `CEP ${maskCEP(company.cep)}` : null,
  ].filter(Boolean).join(", ");

  const foroCidade = `${company.city ?? ""}${company.state ? `/${company.state}` : ""}` || "desta comarca";

  const valorFinanciado = Math.max(sale.netAmount - sale.downPayment, 0);
  const valorParcela = sale.installmentCount > 0
    ? formatBRL(valorFinanciado / sale.installmentCount)
    : formatBRL(0);

  const paymentLabels: Record<string, string> = {
    PIX: "PIX",
    DINHEIRO: "Dinheiro / Espécie",
    CARTAO: "Cartão (Débito/Crédito)",
    BOLETO: "Boleto Bancário",
    PARCELADO_LOJA: "Parcelado — Crediário da Loja",
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-zinc-950 py-8 px-4 flex flex-col items-center select-none font-sans print:bg-white print:py-0 print:px-0 print:block">
      <style>{`
        @page { size: A4; margin: 1.5cm; }
        @media print {
          body { background: white !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .clause { break-inside: avoid !important; page-break-inside: avoid !important; }
          .clause h3 { break-after: avoid !important; page-break-after: avoid !important; }
          table { break-inside: avoid !important; page-break-inside: avoid !important; }
          .sig-block { break-inside: avoid !important; page-break-inside: avoid !important; }
          p { orphans: 3; widows: 3; }
          li { break-inside: avoid !important; page-break-inside: avoid !important; }
          ul, ol { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>

      {/* Barra de controle */}
      <div className="w-full max-w-[800px] print:hidden bg-card border border-border p-4 rounded-2xl shadow-md flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 border border-border text-foreground hover:bg-muted rounded-xl cursor-pointer"
          title="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:opacity-90 transition-all cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 text-white font-semibold rounded-xl text-xs hover:bg-zinc-700 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar PDF</span>
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

      {/* Contrato imprimível */}
      <div className="w-full max-w-[800px] bg-white text-zinc-900 p-12 border border-zinc-200 shadow-lg rounded-sm space-y-6 text-sm leading-relaxed text-justify print:max-w-none print:border-0 print:shadow-none print:p-0 print:rounded-none">

        {/* Cabeçalho / Logotipo */}
        <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-5">
          <div className="flex items-center gap-4">
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt={company.name} className="h-16 w-16 object-contain rounded-lg" />
            ) : (
              <div className="h-16 w-16 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-400 font-black text-xl border border-zinc-200">
                {company.name.charAt(0)}
              </div>
            )}
            <div className="space-y-1">
              <h1 className="text-xl font-black uppercase tracking-tight">{company.name}</h1>
              <p className="text-xs text-zinc-600">CNPJ: {company.cnpj}</p>
              <p className="text-xs text-zinc-600">{enderecoEmpresa}</p>
              <p className="text-xs text-zinc-600">
                Tel: {company.phone}
                {company.whatsApp ? ` | WhatsApp: ${company.whatsApp}` : ""}
                {" | "}Email: {company.email}
              </p>
            </div>
          </div>
          <div className="p-3 bg-zinc-100 rounded-xl font-mono text-center">
            <p className="text-[10px] text-zinc-500 font-bold uppercase">Nº Contrato</p>
            <p className="text-lg font-black tracking-wider text-zinc-900">
              #{String(sale.saleNumber).padStart(5, "0")}
            </p>
          </div>
        </div>

        {/* Título */}
        <div className="text-center my-6">
          <h2 className="text-base font-black uppercase tracking-wide">
            INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE APARELHO CELULAR
          </h2>
        </div>

        {/* Qualificação das partes */}
        <div>
          <p>
            Pelo presente instrumento particular, de um lado, na qualidade de{" "}
            <strong>VENDEDORA</strong>: <strong>{company.name}</strong>
            {company.tradeName ? `, nome fantasia ${company.tradeName}` : ""},
            inscrita no CNPJ sob o nº <strong>{company.cnpj}</strong>, com sede em{" "}
            {enderecoEmpresa}; e de outro lado, na qualidade de{" "}
            <strong>COMPRADOR(A)</strong>: <strong>{c.name}</strong>, portador
            {c.rg ? ` do RG nº ${c.rg} e` : ""} do CPF nº{" "}
            <strong>{maskCPF(c.cpf)}</strong>, residente e domiciliado em{" "}
            {enderecoCliente}; têm entre si justo e contratado o que se segue nas
            cláusulas abaixo:
          </p>
        </div>

        <div className="space-y-6">

          {/* ── CLÁUSULA 1ª ── */}
          <div className="clause">
            <h3 className="font-bold uppercase text-zinc-950 border-b border-zinc-200 pb-1">
              CLÁUSULA 1ª – DO OBJETO DO CONTRATO
            </h3>
            <p className="mt-2">
              O presente contrato tem por objeto a compra e venda do(s) seguinte(s)
              aparelho(s) celular(es), pertencente(s) ao VENDEDOR(A), identificado(s)
              pelas especificações técnicas a seguir:
            </p>
            <div className="mt-3 border border-zinc-300 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 font-bold text-zinc-800">
                    <th className="p-2.5">Aparelho</th>
                    <th className="p-2.5">Cor / Armaz.</th>
                    <th className="p-2.5">IMEI / Serial</th>
                    <th className="p-2.5">Conservação</th>
                    <th className="p-2.5">Garantia</th>
                    <th className="p-2.5 text-right">Preço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {sale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2.5 font-bold">{item.product.brand} {item.product.model}</td>
                      <td className="p-2.5">{item.product.color} / {item.product.storage}</td>
                      <td className="p-2.5 font-mono text-[10px]">
                        {item.product.imei || item.product.serialNumber || "—"}
                      </td>
                      <td className="p-2.5">{item.product.condition || "—"}</td>
                      <td className="p-2.5 font-semibold text-zinc-700">{item.product.warranty || "90 dias"}</td>
                      <td className="p-2.5 text-right font-bold">{formatBRL(item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 pl-4 text-xs text-zinc-600">
              <strong>§ 1º</strong> O COMPRADOR(A) declara ter vistoriado o aparelho, conferido suas
              características físicas e funcionais e recebido o equipamento em conformidade com
              as especificações descritas nesta cláusula.
            </p>
            <p className="mt-2 pl-4 text-xs text-zinc-600">
              <strong>§ 2º</strong> No momento da entrega, o COMPRADOR(A) declara, sob as penas da lei,
              que inspecionou o BEM minuciosamente e testou todas as funcionalidades essenciais,
              incluindo: chamadas, câmeras frontal e traseira, Face ID / Touch ID,
              conectividade Wi-Fi, dados móveis 4G/5G, Bluetooth, GPS e carregamento.
            </p>
          </div>

          {/* ── CLÁUSULA 2ª ── */}
          <div className="clause">
            <h3 className="font-bold uppercase text-zinc-950 border-b border-zinc-200 pb-1">
              CLÁUSULA 2ª – DO PREÇO, FORMA E CONDIÇÕES DE PAGAMENTO
            </h3>
            <p className="mt-2">
              O COMPRADOR(A) compromete-se a pagar ao VENDEDOR(A), pela aquisição do aparelho
              descrito na Cláusula 1ª, o valor total de{" "}
              <strong>{formatBRL(sale.netAmount)}</strong>, sendo pactuado da seguinte forma:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
              <li>
                Valor de Sinal / Entrada:{" "}
                <strong>{formatBRL(sale.downPayment)}</strong>, pago no ato da assinatura
                deste contrato.
              </li>
              <li>
                Valor Restante Financiado:{" "}
                <strong>{formatBRL(valorFinanciado)}</strong>, a ser adimplido em{" "}
                <strong>{sale.installmentCount} parcela(s)</strong> mensais de{" "}
                <strong>{valorParcela}</strong>.
              </li>
              <li>
                Forma de pagamento:{" "}
                <strong>{paymentLabels[sale.paymentMethod] ?? sale.paymentMethod}</strong>.
              </li>
              {sale.tradeInAmount > 0 && (
                <li>
                  Valor de trade-in abatido:{" "}
                  <strong>{formatBRL(sale.tradeInAmount)}</strong>.
                </li>
              )}
            </ul>
            <p className="mt-2 pl-4 text-xs text-zinc-600">
              <strong>§ 1º</strong> O pagamento das parcelas será realizado exclusivamente por meio
              de PIX, dinheiro, cartão de crédito ou cartão de débito na conta titular fornecida
              pelo VENDEDOR(A), não sendo admitida qualquer outra modalidade não prevista neste
              instrumento, salvo ajuste expresso entre as partes por escrito.
            </p>
            <p className="mt-2 pl-4 text-xs text-zinc-600">
              <strong>§ 2º</strong> O COMPRADOR(A) está ciente de que os valores pagos a título de
              entrada não serão devolvidos em caso de desistência imotivada, ressalvadas as
              hipóteses de vício do produto ou rescisão por descumprimento imputável ao VENDEDOR(A).
            </p>
            <p className="mt-2 pl-4 text-xs text-zinc-600">
              <strong>§ 3º</strong> O atraso no pagamento de qualquer parcela implicará multa
              moratória de 2%, juros de 1% ao mês e correção monetária pelo índice oficial aplicável.
            </p>
            <p className="mt-2 pl-4 text-xs text-zinc-600">
              <strong>§ 4º</strong> Fica facultado ao COMPRADOR(A) realizar a quitação antecipada,
              total ou parcial, com redução proporcional dos juros, nos termos do art. 52, § 2º,
              da Lei nº 8.078/1990 (CDC).
            </p>
          </div>

          {/* ── CLÁUSULA 3ª ── */}
          <div className="clause">
            <h3 className="font-bold uppercase text-zinc-950 border-b border-zinc-200 pb-1">
              CLÁUSULA 3ª – DAS PARCELAS E VENCIMENTOS
            </h3>
            <p className="mt-2">
              As parcelas vencerão nas datas especificadas abaixo. O pagamento deverá ser
              realizado diretamente no caixa da loja física da VENDEDORA ou via canais
              autorizados (PIX fornecido pela gerência).
            </p>
            {sale.installments.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-2 print:gap-1.5">
                {sale.installments.map((inst) => (
                  <div key={inst.id} className="p-2.5 border border-zinc-200 rounded-lg text-center text-xs">
                    <p className="font-bold text-zinc-800">Parcela {inst.installmentNumber}</p>
                    <p className="text-zinc-600 mt-0.5">{formatDate(inst.dueDate)}</p>
                    <p className="font-black text-zinc-950 mt-1">{formatBRL(inst.amount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-500 italic">
                Pagamento à vista — sem parcelamento.
              </p>
            )}
          </div>

          {/* ── CLÁUSULA 4ª ── */}
          <div className="clause">
            <h3 className="font-bold uppercase text-zinc-950 border-b border-zinc-200 pb-1">
              CLÁUSULA 4ª – DA CLÁUSULA DE RESERVA DE DOMÍNIO
            </h3>
            <p className="mt-2">
              Nos termos expressos dos artigos 521 a 528 do Código Civil Brasileiro
              (Lei n. 10.406/2002), as partes estipulam, de forma irrevogável e irretratável,
              a <strong>CLÁUSULA DE RESERVA DE DOMÍNIO</strong>, pela qual a transmissão da
              propriedade plena do BEM ao COMPRADOR(A) fica condicionada, como condição suspensiva
              (art. 125 do Código Civil), ao pagamento integral e incondicional de todas as
              parcelas previstas na Cláusula 2ª, incluindo eventuais encargos moratórios.
            </p>
            <p className="mt-2 pl-4 text-xs text-zinc-600">
              <strong>§ 1º</strong> Em razão da reserva de domínio aqui estipulada, o COMPRADOR(A)
              recebe o BEM na qualidade jurídica de mero detentor e depositário fiel, assumindo
              integralmente as responsabilidades civis e criminais decorrentes da guarda,
              conservação e uso adequado do aparelho, incluindo responsabilidade por danos,
              furto, roubo, extravio e deterioração além do desgaste natural.
            </p>
            <p className="mt-2 pl-4 text-xs text-zinc-600">
              <strong>§ 2º</strong> Enquanto perdurar a reserva de domínio, fica o COMPRADOR(A)
              expressamente proibido, sob pena de vencimento antecipado da dívida e
              responsabilidade civil e criminal, de:
            </p>
            <ul className="list-[upper-roman] pl-12 mt-1 space-y-1 text-xs text-zinc-600">
              <li>vender, ceder, transferir, permutar ou alienar o BEM a terceiros, a qualquer título oneroso ou gratuito;</li>
              <li>oferecer o BEM em garantia, penhor, caução, alienação fiduciária ou qualquer outra forma de oneração real;</li>
              <li>levar o BEM a conserto, destravamento, jailbreak ou qualquer modificação técnica ou de software sem autorização prévia e escrita do VENDEDOR(A);</li>
              <li>afastar-se do domicílio declarado neste instrumento por período superior a 30 (trinta) dias sem comunicação prévia ao VENDEDOR(A);</li>
              <li>sujeitar o BEM a penhora, aresto, sequestro ou qualquer constrição judicial por dívidas do COMPRADOR(A) perante terceiros.</li>
            </ul>
            <p className="mt-2 pl-4 text-xs text-zinc-600">
              <strong>§ 3º</strong> O descumprimento de qualquer das vedações acima importará,
              cumulativamente: (I) vencimento antecipado da integralidade da dívida;
              (II) configuração da conduta de desvio, ocultação ou deterioração de bem sujeito
              à execução (art. 179 do Código Penal); (III) obrigação de indenizar o VENDEDOR(A)
              por perdas e danos, na forma do art. 402 do Código Civil.
            </p>
          </div>

          {/* ── CLÁUSULA 5ª ── */}
          <div className="clause">
            <h3 className="font-bold uppercase text-zinc-950 border-b border-zinc-200 pb-1">
              CLÁUSULA 5ª – DO VENCIMENTO ANTECIPADO E DO INADIMPLEMENTO
            </h3>
            <p className="mt-2">
              O inadimplemento de 02 (duas) parcelas, consecutivas ou não, bem como o
              descumprimento de qualquer obrigação prevista neste contrato, acarretará o
              vencimento antecipado das parcelas vincendas, tornando imediatamente exigível
              todo o saldo devedor.
            </p>
            <p className="mt-2 pl-4 text-xs text-zinc-600">
              <strong>§ 1º</strong> Verificado o inadimplemento, poderá o VENDEDOR(A),
              independentemente de notificação judicial:
            </p>
            <ul className="list-[upper-roman] pl-12 mt-1 space-y-1 text-xs text-zinc-600">
              <li>Exigir o pagamento integral do saldo devedor;</li>
              <li>Promover cobrança judicial ou extrajudicial;</li>
              <li>Protestar o débito;</li>
              <li>Solicitar a inscrição do nome do COMPRADOR(A) nos órgãos de proteção ao crédito, observadas as disposições legais;</li>
              <li>Exigir a devolução imediata do aparelho;</li>
              <li>Promover as medidas judiciais cabíveis para recuperação do bem e satisfação do crédito.</li>
            </ul>
            <p className="mt-2 pl-4 text-xs text-zinc-600">
              <strong>§ 2º</strong> Em caso de resolução contratual por culpa do COMPRADOR(A),
              os valores pagos poderão ser retidos pelo VENDEDOR(A) para compensação da depreciação
              do aparelho, prejuízos suportados e despesas decorrentes do inadimplemento,
              observados os limites legais.
            </p>
            <p className="mt-2 pl-4 text-xs text-zinc-600">
              <strong>Parágrafo único.</strong> Declarado o vencimento antecipado, o COMPRADOR(A)
              terá o prazo improrrogável de 5 (cinco) dias úteis para realizar o pagamento
              integral do saldo devedor atualizado, sob pena de adoção das medidas previstas
              neste instrumento.
            </p>
          </div>

          {/* ── CLÁUSULA 6ª ── */}
          <div className="clause">
            <h3 className="font-bold uppercase text-zinc-950 border-b border-zinc-200 pb-1">
              CLÁUSULA 6ª – DA GARANTIA CONTRATUAL E LEGAL
            </h3>
            <p className="mt-2">
              O BEM objeto do presente contrato é coberto pela seguinte garantia:
            </p>
            <div className="mt-3 border border-zinc-300 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 font-bold text-zinc-800">
                    <th className="p-2.5">Tipo de Garantia</th>
                    <th className="p-2.5 text-center">Prazo</th>
                    <th className="p-2.5">Abrangência</th>
                    <th className="p-2.5">Fundamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-700">
                  <tr>
                    <td className="p-2.5 font-semibold">Garantia Contratual do Vendedor</td>
                    <td className="p-2.5 text-center">
                      {sale.items[0]?.product.warranty ?? "90 dias"} da entrega
                    </td>
                    <td className="p-2.5">Defeitos técnicos de fabricação comprovados</td>
                    <td className="p-2.5">Previsão contratual</td>
                  </tr>
                  <tr className="bg-zinc-50">
                    <td className="p-2.5 font-semibold">Garantia Legal – CDC (bem durável)</td>
                    <td className="p-2.5 text-center">90 dias</td>
                    <td className="p-2.5">Vícios ocultos não identificáveis na entrega</td>
                    <td className="p-2.5">Art. 26, II, CDC</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">Garantia do Fabricante (Apple) – se novo</td>
                    <td className="p-2.5 text-center">1 ano</td>
                    <td className="p-2.5">Defeitos de fabricação na cadeia original</td>
                    <td className="p-2.5">Política Apple</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 pl-4 text-xs text-zinc-600">
              <strong>§ 1º</strong> A garantia contratual <strong>NÃO</strong> abrange: (a) danos
              físicos por quedas, impactos ou pressão mecânica; (b) danos por imersão ou exposição
              a líquidos; (c) danos por mau uso ou operação fora das especificações do fabricante;
              (d) danos por vírus, softwares maliciosos, jailbreak ou modificações não autorizadas;
              (e) roubo, furto, extravio, força maior ou caso fortuito.
            </p>
            <p className="mt-2 pl-4 text-xs text-zinc-600">
              <strong>§ 2º</strong> Para BEM classificado como SEMINOVO ou USADO, a garantia do
              fabricante pode estar expirada, sendo a garantia contratual do VENDEDOR(A) a única
              vigente, além da garantia legal do CDC para vícios ocultos.
            </p>
          </div>

          {/* ── CLÁUSULA 7ª ── */}
          <div className="clause">
            <h3 className="font-bold uppercase text-zinc-950 border-b border-zinc-200 pb-1">
              CLÁUSULA 7ª – DO FORO
            </h3>
            <p className="mt-2">
              Fica eleito o foro da Comarca de <strong>{foroCidade}</strong>, para dirimir
              quaisquer dúvidas ou litígios advindos do presente contrato. Dispensam-se
              reciprocamente as partes o reconhecimento de firma no presente instrumento,
              reconhecendo como verdadeiras as assinaturas apostas, valendo-o como título
              executivo, mesmo sem assinatura de duas testemunhas (STJ, REsp 400687).
            </p>
            <p className="mt-2">
              E para a firmeza e como prova de assim haverem acordado e contratado, as
              partes assinam o presente instrumento particular em 2 (duas) vias de igual
              teor e forma.
            </p>
          </div>

        </div>

        {/* Data */}
        <p className="text-right text-xs text-zinc-600 mt-6">
          {foroCidade}, {formatDateLong(sale.createdAt)}.
        </p>

        {/* Assinaturas */}
        <div className="sig-block grid grid-cols-2 gap-12 pt-16 text-center text-xs">
          <div className="space-y-1">
            <div className="border-t border-zinc-400 w-full pt-2" />
            <p className="font-bold text-zinc-900">{c.name}</p>
            <p className="text-[10px] text-zinc-500">COMPRADOR(A) (CPF: {maskCPF(c.cpf)})</p>
          </div>
          <div className="space-y-1">
            <div className="border-t border-zinc-400 w-full pt-2" />
            <p className="font-bold text-zinc-900">{company.name}</p>
            <p className="text-[10px] text-zinc-500">VENDEDORA (CNPJ: {company.cnpj})</p>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between pt-8 text-[9px] text-zinc-400 border-t border-zinc-200 mt-4">
          <span>Venda ID: {sale.id.slice(0, 8).toUpperCase()}</span>
          <span>© {company.name} — Documento gerado pelo sistema ERP</span>
          <span>Zenix Systems</span>
        </div>

      </div>
    </div>
  );
}
