"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { maskMoney, parseMoneyToFloat } from "@/lib/masks";
import {
  Calendar,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  CreditCard,
  Loader2,
  X,
  PlusCircle,
  User,
  DollarSign,
} from "lucide-react";

interface Installment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: "PAID" | "PENDING" | "OVERDUE";
  paidAmount: number;
  remainingAmount: number;
  paymentDate: string | null;
  customer: {
    name: string;
    cpf: string;
    phone: string;
  };
  sale: {
    saleNumber: number;
  };
}

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Payment Modal State
  const [activeInstallment, setActiveInstallment] = useState<Installment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();

  const loadInstallments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/installments?q=${encodeURIComponent(search)}&status=${statusFilter}`
      );
      if (res.ok) {
        const data = await res.json();
        setInstallments(data.installments);
      } else {
        showToast("Erro ao carregar parcelas", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro de conexão com o servidor", "error");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadInstallments();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, statusFilter, loadInstallments]);

  const openPaymentModal = (inst: Installment) => {
    setActiveInstallment(inst);
    setPaymentAmount(maskMoney(inst.remainingAmount)); // Default is the remaining amount
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInstallment) return;

    const value = parseMoneyToFloat(paymentAmount);
    if (value <= 0) {
      showToast("Insira um valor maior que zero", "warning");
      return;
    }

    if (value > activeInstallment.remainingAmount) {
      showToast(
        `O valor não pode ser maior que o saldo devedor (${formatBRL(activeInstallment.remainingAmount)})`,
        "warning"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/installments/${activeInstallment.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentAmount: value }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, "success");
        setActiveInstallment(null);
        loadInstallments();
      } else {
        showToast(data.error || "Erro ao processar pagamento", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro de conexão com o servidor", "error");
    } finally {
      setIsSubmitting(false);
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

  // Stats
  const pendingCount = installments.filter((i) => i.status === "PENDING").length;
  const overdueCount = installments.filter((i) => i.status === "OVERDUE").length;
  const totalReceivable = installments
    .filter((i) => i.status !== "PAID")
    .reduce((sum, i) => sum + i.remainingAmount, 0);

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <Calendar className="w-8 h-8 text-muted-foreground" />
          <span>Controle de Parcelas</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe os vencimentos de vendas parceladas na loja, aplique pagamentos e dê baixas parciais ou totais.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Total a Receber */}
        <div className="bg-card border border-border rounded-2xl p-4.5 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Saldo Total a Receber</span>
            <p className="text-lg font-bold text-foreground mt-0.5">{formatBRL(totalReceivable)}</p>
          </div>
        </div>

        {/* Parcelas Pendentes */}
        <div className="bg-card border border-border rounded-2xl p-4.5 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Parcelas Pendentes</span>
            <p className="text-lg font-bold text-foreground mt-0.5">{pendingCount} parcelas</p>
          </div>
        </div>

        {/* Parcelas Vencidas (Atraso) */}
        <div className="bg-card border border-border rounded-2xl p-4.5 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Parcelas em Atraso</span>
            <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">{overdueCount} parcelas</p>
          </div>
        </div>

      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative max-w-sm w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Search className="w-4.5 h-4.5" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar cliente por nome ou CPF..."
            className="w-full pl-10 pr-4 py-2 bg-card border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center bg-card border border-border p-1 rounded-xl text-xs font-semibold select-none shadow-sm">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "PENDING" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setStatusFilter("OVERDUE")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "OVERDUE" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Vencidas
          </button>
          <button
            onClick={() => setStatusFilter("PAID")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "PAID" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pagas
          </button>
        </div>

      </div>

      {/* Installments Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="text-sm">Carregando parcelas da loja...</span>
          </div>
        ) : installments.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhuma parcela pendente localizada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Venda Ref</th>
                  <th className="px-6 py-4">Nº Parcela</th>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Valor / Saldo</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {installments.map((i) => {
                  const statusColors = {
                    PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    OVERDUE: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                  }[i.status];

                  const statusTexts = {
                    PAID: "Paga",
                    PENDING: "Pendente",
                    OVERDUE: "Vencida",
                  }[i.status];

                  return (
                    <tr key={i.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground">{i.customer.name}</div>
                        <div className="text-[10px] text-muted-foreground">CPF: {i.customer.cpf}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        Venda #{String(i.sale.saleNumber).padStart(5, "0")}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-semibold">
                        Parcela {i.installmentNumber}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">
                        {formatDate(i.dueDate)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${statusColors}`}>
                          {statusTexts}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-foreground font-extrabold">{formatBRL(i.amount)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Devedor: {formatBRL(i.remainingAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          {i.status !== "PAID" ? (
                            <button
                              onClick={() => openPaymentModal(i)}
                              className="px-3 py-1.5 bg-secondary text-foreground hover:bg-muted border border-border font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              Dar Baixa
                            </button>
                          ) : (
                            <div className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Pago</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Registry Modal */}
      {activeInstallment && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-slide-in">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <span>Registrar Pagamento de Parcela</span>
              </h3>
              <button
                onClick={() => setActiveInstallment(null)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              
              {/* Info card */}
              <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-1.5 text-xs font-semibold select-none">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Cliente</span>
                  <span className="text-foreground">{activeInstallment.customer.name}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Parcela</span>
                  <span className="text-foreground">Parcela {activeInstallment.installmentNumber}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Saldo Devedor</span>
                  <span className="text-foreground">{formatBRL(activeInstallment.remainingAmount)}</span>
                </div>
              </div>

              {/* Valor Pago */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                  Valor Pago (BRL) *
                </label>
                <input
                  type="text"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(maskMoney(e.target.value))}
                  placeholder="R$ 0,00"
                  className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none"
                  required
                />
                <span className="block text-[10px] text-muted-foreground mt-1.5">
                  Pague o valor total para quitar, ou insira um valor menor para registrar pagamento parcial.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setActiveInstallment(null)}
                  className="px-4 py-2.5 border border-border text-foreground hover:bg-muted font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 active:scale-98 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <span>Registrar Baixa</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
