"use client";

import React, { useState } from "react";
import { useToast } from "@/components/Toast";
import {
  FileText,
  Search,
  FileDown,
  Printer,
  Calendar,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

export default function ReportsPage() {
  const { showToast } = useToast();

  const [reportType, setReportType] = useState<"sales" | "products" | "customers" | "finance" | "installments">("sales");

  // Date filters
  const getInitialDates = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };

  const initialDates = getInitialDates();
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [instStatus, setInstStatus] = useState(""); // PENDING, PAID, OVERDUE

  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setHasGenerated(true);
    try {
      const queryParams = new URLSearchParams({
        type: reportType,
        startDate,
        endDate,
      });

      if (reportType === "installments" && instStatus) {
        queryParams.append("status", instStatus);
      }

      const res = await fetch(`/api/reports?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data.reportData);
        showToast("Relatório gerado com sucesso!", "success");
      } else {
        showToast("Erro ao processar relatório", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro de conexão", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Export dynamically to CSV (Excel compatible with UTF-8 BOM)
  const handleExportCSV = () => {
    if (reportData.length === 0) {
      showToast("Gere o relatório primeiro para poder exportar", "warning");
      return;
    }

    try {
      const headers = Object.keys(reportData[0]);
      const csvRows = [];
      
      // Header row
      csvRows.push(headers.join(";"));

      // Value rows
      for (const row of reportData) {
        const values = headers.map((h) => {
          const val = row[h];
          // Tratar números e floats para formato Excel brasileiro (vírgula decimal)
          if (typeof val === "number") {
            return String(val).replace(".", ",");
          }
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(";"));
      }

      const csvContent = "\uFEFF" + csvRows.join("\n"); // Adicionar BOM para UTF-8 no Excel
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio-${reportType}-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("Arquivo CSV exportado!", "success");
    } catch (error) {
      console.error(error);
      showToast("Erro ao exportar arquivo", "error");
    }
  };

  const handlePrint = () => {
    if (reportData.length === 0) {
      showToast("Gere o relatório primeiro para poder imprimir", "warning");
      return;
    }
    window.print();
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  // Retornar cabeçalhos legíveis para a tabela
  const getTableHeaders = () => {
    if (reportType === "sales") {
      return ["Venda Nº", "Cliente", "CPF", "Data", "Pagamento", "Total Bruto", "Desconto", "Total Líquido", "Entrada", "Parc."];
    }
    if (reportType === "products") {
      return ["ID", "Marca", "Modelo", "Cor", "Armazenamento", "IMEI", "S/N", "Custo", "Venda", "Lucro", "Qtd", "Status"];
    }
    if (reportType === "customers") {
      return ["Nome", "CPF", "Telefone", "E-mail", "Qtd Compras", "Total Gasto", "Saldo Devedor", "Endereço"];
    }
    if (reportType === "finance") {
      return ["ID", "Tipo", "Categoria", "Valor", "Data", "Status", "Descrição"];
    }
    // installments
    return ["Venda Ref", "Cliente", "CPF", "Parcela Nº", "Valor Parcela", "Vencimento", "Status", "Valor Pago", "Saldo Restante"];
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div className="no-print">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <FileText className="w-8 h-8 text-muted-foreground" />
          <span>Central de Relatórios</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gere arquivos analíticos de vendas, produtos em estoque, saldo de clientes, movimentações de caixa e parcelas.
        </p>
      </div>

      {/* Select Report Parameter Box (Hidden on Print) */}
      <div className="no-print bg-card border border-border p-5 rounded-2xl shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Tipo de Relatório */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
              Tipo de Relatório *
            </label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value as any);
                setReportData([]);
                setHasGenerated(false);
              }}
              className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
            >
              <option value="sales">Vendas Efetuadas</option>
              <option value="products">Estoque & Produtos</option>
              <option value="customers">Clientes & Saldos</option>
              <option value="finance">Lançamentos Financeiros (Fluxo)</option>
              <option value="installments">Controle de Parcelas</option>
            </select>
          </div>

          {/* Filtros de datas (Apenas para tipos relevantes) */}
          {(reportType === "sales" || reportType === "finance") && (
            <>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                  Data Final
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Filtros específicos de parcelas */}
          {reportType === "installments" && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                Filtrar Status da Parcela
              </label>
              <select
                value={instStatus}
                onChange={(e) => setInstStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
              >
                <option value="">Todas Parcelas</option>
                <option value="PENDING">Pendentes</option>
                <option value="OVERDUE">Vencidas</option>
                <option value="PAID">Pagas</option>
              </select>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3.5 pt-4 border-t border-border justify-end">
          <button
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Gerar Relatório</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={isLoading || reportData.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-foreground hover:bg-muted font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={isLoading || reportData.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-foreground hover:bg-muted font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir PDF</span>
          </button>
        </div>
      </div>

      {/* Report Data List Result Table */}
      {hasGenerated && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden print-area">
          
          {/* Printable Header Branding (Visible ONLY on print view) */}
          <div className="hidden print:block p-8 border-b-2 border-zinc-950 select-none text-center space-y-1 mb-6">
            <h2 className="text-xl font-black uppercase tracking-tight">Diego Apple Store</h2>
            <p className="text-xs text-zinc-600">Relatório Operacional Interno</p>
            <p className="text-[10px] text-zinc-500">
              Emitido em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}
            </p>
          </div>

          <div className="p-5 border-b border-border no-print">
            <h3 className="text-base font-bold text-foreground capitalize">
              Resultados do Relatório de {reportType.replace("sales", "Vendas").replace("products", "Produtos").replace("customers", "Clientes").replace("finance", "Financeiro").replace("installments", "Parcelas")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consulte a listagem de dados compilados correspondente aos filtros.
            </p>
          </div>

          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span>Gerando listagem analítica...</span>
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>Nenhum registro localizado para os filtros informados.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-zinc-300 font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wider select-none">
                    {getTableHeaders().map((th, i) => (
                      <th key={i} className="px-4 py-3">
                        {th}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {reportData.map((row, rowIndex) => {
                    const rowValues = Object.keys(row);
                    return (
                      <tr key={rowIndex} className="hover:bg-muted/10 transition-colors">
                        {rowValues.map((key, colIndex) => {
                          const val = row[key];

                          // Formatar valores financeiros nas tabelas
                          const isFinancialKey =
                            key.toLowerCase().includes("custo") ||
                            key.toLowerCase().includes("preco") ||
                            key.toLowerCase().includes("lucro") ||
                            key.toLowerCase().includes("valor") ||
                            key.toLowerCase().includes("total") ||
                            key.toLowerCase().includes("desconto") ||
                            key.toLowerCase().includes("entrada") ||
                            key.toLowerCase().includes("gasto") ||
                            key.toLowerCase().includes("devedor") ||
                            key.toLowerCase().includes("restante");

                          const isFormattedVal = isFinancialKey && typeof val === "number";

                          return (
                            <td
                              key={colIndex}
                              className={`px-4 py-3 text-foreground/90 font-medium ${
                                isFormattedVal ? "text-right font-bold" : ""
                              }`}
                            >
                              {isFormattedVal ? formatBRL(val) : String(val)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
