"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import {
  ShoppingBag,
  Search,
  Plus,
  FileText,
  Printer,
  UploadCloud,
  CheckCircle,
  FileDown,
  Loader2,
  Calendar,
  User,
  XCircle,
  AlertTriangle,
  Trash2,
} from "lucide-react";

interface Sale {
  id: string;
  saleNumber: number;
  totalAmount: number;
  discountAmount: number;
  surchargeAmount: number;
  netAmount: number;
  downPayment: number;
  paymentMethod: string;
  installmentCount: number;
  signedContractUrl: string | null;
  status: "ACTIVE" | "CANCELLED";
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  customer: {
    name: string;
    cpf: string;
    phone: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    product: {
      brand: string;
      model: string;
    };
  }>;
}

export default function SalesHistoryPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingSaleId, setUploadingSaleId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; saleNumber: number } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; saleNumber: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setUserRole(d.user.role); })
      .catch(() => {});
  }, []);

  const handleDeleteSale = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sales/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setDeleteTarget(null);
        loadSales();
      } else {
        showToast(data.error || "Erro ao excluir venda", "error");
      }
    } catch {
      showToast("Erro de conexão", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const loadSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sales?q=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setSales(data.sales);
      } else {
        showToast("Erro ao carregar histórico de vendas", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar com a API", "error");
    } finally {
      setIsLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadSales();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, loadSales]);

  // Handle Signed Contract Upload
  const handleFileUpload = async (saleId: string, file: File) => {
    if (!file) return;

    // Validar tipo de arquivo
    const allowedExtensions = ["pdf", "jpg", "jpeg", "png"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      showToast("Formato de arquivo inválido. Use PDF ou Imagens (JPG, PNG).", "warning");
      return;
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("O arquivo não pode ser maior que 5MB.", "warning");
      return;
    }

    setUploadingSaleId(saleId);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/sales/${saleId}/upload-contract`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, "success");
        loadSales(); // Recarregar lista
      } else {
        showToast(data.error || "Erro no upload do contrato", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro de conexão ao enviar arquivo", "error");
    } finally {
      setUploadingSaleId(null);
    }
  };

  const handleCancelSale = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/sales/${cancelTarget.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setCancelTarget(null);
        setCancelReason("");
        loadSales();
      } else {
        showToast(data.error || "Erro ao cancelar venda", "error");
      }
    } catch {
      showToast("Erro de conexão", "error");
    } finally {
      setIsCancelling(false);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-8 select-none">

      {/* ── Modal de Exclusão Definitiva ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Excluir Venda #{String(deleteTarget.saleNumber).padStart(5, "0")} permanentemente?</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Esta ação é irreversível. Todos os registros vinculados serão removidos.</p>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-xs text-red-600 dark:text-red-400 space-y-1">
              <p className="font-bold">Serão excluídos permanentemente:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                <li>Venda, itens e parcelas</li>
                <li>Transações financeiras vinculadas</li>
                <li>Trade-in e produto recebido (se não vendido)</li>
                <li>Contrato e histórico da venda</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-muted/50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteSale}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? "Excluindo..." : "Excluir Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Cancelamento ── */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Cancelar Venda #{String(cancelTarget.saleNumber).padStart(5, "0")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Esta ação restaura o estoque e cancela as parcelas pendentes.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Motivo do cancelamento</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Descreva o motivo (opcional)..."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setCancelTarget(null); setCancelReason(""); }}
                disabled={isCancelling}
                className="flex-1 px-4 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-muted/50 transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={handleCancelSale}
                disabled={isCancelling}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {isCancelling ? "Cancelando..." : "Confirmar Cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
            <span>Histórico de Vendas</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consulte todas as vendas realizadas, emita comprovantes e contratos, e gerencie os contratos assinados.
          </p>
        </div>
        
        <Link
          href="/sales/new"
          className="flex items-center justify-center gap-2 px-4.5 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-sm hover:opacity-90 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Venda (PDV)</span>
        </Link>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
          <Search className="w-4.5 h-4.5" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente, CPF ou nº da venda..."
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all duration-200"
        />
      </div>

      {/* Sales List Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="text-sm">Carregando histórico...</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhuma venda localizada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Venda Nº</th>
                  <th className="px-6 py-4">Cliente / Contato</th>
                  <th className="px-6 py-4">Data / Pagamento</th>
                  <th className="px-6 py-4">Total Líquido</th>
                  <th className="px-6 py-4">Contrato Assinado</th>
                  <th className="px-6 py-4 text-center">Documentos</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sales.map((s) => (
                  <tr key={s.id} className={`hover:bg-muted/10 transition-colors ${s.status === "CANCELLED" ? "opacity-60" : ""}`}>

                    {/* Numero da Venda */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">#{String(s.saleNumber).padStart(5, "0")}</div>
                      {s.status === "CANCELLED" && (
                        <span className="inline-flex items-center gap-1 text-[9px] bg-red-500/10 text-red-500 font-bold px-1.5 py-0.5 rounded-full border border-red-500/20 mt-1">
                          <XCircle className="w-2.5 h-2.5" />
                          Cancelada
                        </span>
                      )}
                    </td>

                    {/* Cliente */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{s.customer.name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">CPF: {s.customer.cpf}</div>
                    </td>

                    {/* Data / Forma Pagto */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{formatDate(s.createdAt)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">
                        {s.paymentMethod.replace("_", " ")}
                        {s.paymentMethod === "PARCELADO_LOJA" && ` (${s.installmentCount}x)`}
                      </div>
                    </td>

                    {/* Total */}
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-foreground">
                        {formatBRL(s.netAmount)}
                      </div>
                      {s.surchargeAmount > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-0.5" title="Juros/Acréscimo aplicado">
                          (Inclui {formatBRL(s.surchargeAmount)} juros)
                        </div>
                      )}
                    </td>

                    {/* Upload / Status Contrato Assinado */}
                    <td className="px-6 py-4">
                      {s.paymentMethod !== "PARCELADO_LOJA" ? (
                        <span className="text-[10px] text-muted-foreground/60 italic">Não aplicável</span>
                      ) : s.signedContractUrl ? (
                        <div className="flex flex-col gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 max-w-max">
                            <CheckCircle className="w-3 h-3" />
                            <span>Contrato Assinado</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <a
                              href={s.signedContractUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                            >
                              <FileDown className="w-3 h-3" />
                              <span>Baixar</span>
                            </a>
                            <label className="text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:underline cursor-pointer">
                              <span>Substituir</span>
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(s.id, file);
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-[9px] bg-zinc-500/10 text-zinc-500 font-bold px-2 py-0.5 rounded-full border border-zinc-500/20 max-w-max">
                            Sem Assinatura
                          </span>
                          <label className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline cursor-pointer mt-1">
                            {uploadingSaleId === s.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Enviando...</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-3 h-3" />
                                <span>Enviar Assinado</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              disabled={uploadingSaleId === s.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(s.id, file);
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </td>

                    {/* Ações Documentos */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* Cupom */}
                        <button
                          onClick={() => router.push(`/reports/voucher?id=${s.id}`)}
                          className="flex items-center gap-1 px-2.5 py-1.5 border border-border text-foreground hover:bg-muted text-xs font-semibold rounded-lg cursor-pointer"
                          title="Imprimir Cupom de Recibo"
                        >
                          <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Recibo</span>
                        </button>

                        {/* Contrato */}
                        {s.paymentMethod === "PARCELADO_LOJA" && (
                          <button
                            onClick={() => router.push(`/reports/contract?id=${s.id}`)}
                            className="flex items-center gap-1 px-2.5 py-1.5 border border-border text-foreground hover:bg-muted text-xs font-semibold rounded-lg cursor-pointer"
                            title="Gerar Contrato"
                          >
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Contrato</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Ações Admin */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {s.status === "ACTIVE" && (
                          <button
                            onClick={() => setCancelTarget({ id: s.id, saleNumber: s.saleNumber })}
                            className="flex items-center gap-1 px-2.5 py-1.5 border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                            title="Cancelar esta venda"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancelar</span>
                          </button>
                        )}
                        {s.status === "CANCELLED" && (
                          <span className="text-[10px] text-muted-foreground italic">
                            {s.cancelledAt ? new Date(s.cancelledAt).toLocaleDateString("pt-BR") : "—"}
                          </span>
                        )}
                        {(userRole === "ADMIN" || userRole === "DEV") && (
                          <button
                            onClick={() => setDeleteTarget({ id: s.id, saleNumber: s.saleNumber })}
                            className="p-1.5 border border-red-500/20 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                            title="Excluir permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
