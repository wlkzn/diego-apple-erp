"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { maskMoney, parseMoneyToFloat } from "@/lib/masks";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  X,
  PlusCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Filter,
} from "lucide-react";

interface Transaction {
  id: string;
  type: "INFLOW" | "OUTFLOW";
  category: string;
  amount: number;
  date: string;
  description: string | null;
  status: "PAID" | "PENDING" | "OVERDUE";
  saleId: string | null;
  installmentId: string | null;
  sale?: {
    saleNumber: number;
    customer: {
      name: string;
    };
  };
}

interface Summary {
  entradasPagas: number;
  saidasPagas: number;
  saldoLiquido: number;
  entradasPendentes: number;
  saidasPendentes: number;
}

export default function FinancialPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({
    entradasPagas: 0,
    saidasPagas: 0,
    saldoLiquido: 0,
    entradasPendentes: 0,
    saidasPendentes: 0,
  });

  // Filters State (Default is current month start to end)
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
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [type, setType] = useState<"INFLOW" | "OUTFLOW">("OUTFLOW");
  const [category, setCategory] = useState("Despesa Administrativa");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"PAID" | "PENDING">("PAID");

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        type: typeFilter,
        status: statusFilter,
      });

      const res = await fetch(`/api/financial?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setSummary(data.summary);
      } else {
        showToast("Erro ao carregar dados financeiros", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro de conexão com o servidor", "error");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, typeFilter, statusFilter, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openNewModal = () => {
    setType("OUTFLOW");
    setCategory("Despesa Administrativa");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setStatus("PAID");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanAmount = parseMoneyToFloat(amount);
    if (cleanAmount <= 0) {
      showToast("O valor do lançamento deve ser maior que zero", "warning");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      type,
      category,
      amount: cleanAmount,
      date,
      description: description || null,
      status,
    };

    try {
      const res = await fetch("/api/financial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, "success");
        setIsModalOpen(false);
        loadData();
      } else {
        showToast(data.error || "Erro ao salvar lançamento", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro de conexão com o servidor", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/financial/${deleteConfirmId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, "success");
        setDeleteConfirmId(null);
        loadData();
      } else {
        showToast(data.error || "Não foi possível excluir o lançamento", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar com o servidor", "error");
    } finally {
      setIsDeleting(false);
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

  const categoriesOptions = {
    INFLOW: ["Venda", "Recebimento de Parcela", "Ajuste de Caixa", "Outras Receitas"],
    OUTFLOW: [
      "Compra de Mercadoria",
      "Despesa Administrativa",
      "Aluguel / Condomínio",
      "Salários / Pro-labore",
      "Marketing / Anúncios",
      "Impostos e Taxas",
      "Outras Despesas",
    ],
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-muted-foreground" />
            <span>Fluxo Financeiro</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lance despesas, acompanhe o fluxo de caixa pago e simule receitas futuras em aberto.
          </p>
        </div>
        
        <button
          onClick={openNewModal}
          className="flex items-center justify-center gap-2 px-4.5 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-sm hover:opacity-90 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Lançar Movimentação</span>
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4.5">
        
        {/* Saldo Líquido em Caixa */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1.5 col-span-1 md:col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Saldo em Caixa</span>
          <div className={`text-2xl font-black ${summary.saldoLiquido >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-400"}`}>
            {formatBRL(summary.saldoLiquido)}
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold">Total de receitas liquidas</span>
        </div>

        {/* Entradas Pagas */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Entradas Pagas</span>
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatBRL(summary.entradasPagas)}
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold">Faturamento efetivado</span>
        </div>

        {/* Despesas Pagas */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            <span>Saídas Pagas</span>
          </span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatBRL(summary.saidasPagas)}
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold">Despesas quitadas</span>
        </div>

        {/* Contas a Receber */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Contas a Receber</span>
          </span>
          <div className="text-2xl font-black text-foreground">
            {formatBRL(summary.entradasPendentes)}
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold">Parcelas pendentes</span>
        </div>

        {/* Contas a Pagar */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Contas a Pagar</span>
          </span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatBRL(summary.saidasPendentes)}
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold">Despesas a vencer</span>
        </div>

      </div>

      {/* Filters Form */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Date Ranges */}
        <div className="flex flex-wrap items-center gap-3.5 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-input border border-border text-foreground rounded-xl text-xs focus:outline-none"
            />
          </div>
          <span className="text-xs font-semibold text-muted-foreground">até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-input border border-border text-foreground rounded-xl text-xs focus:outline-none"
          />
        </div>

        {/* Filter selects */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-input border border-border text-foreground rounded-xl text-xs focus:outline-none"
          >
            <option value="">Todas Transações</option>
            <option value="INFLOW">Entradas (Receitas)</option>
            <option value="OUTFLOW">Saídas (Despesas)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-input border border-border text-foreground rounded-xl text-xs focus:outline-none"
          >
            <option value="">Todos Status</option>
            <option value="PAID">Liquidado / Pago</option>
            <option value="PENDING">Pendente</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="text-sm">Carregando lançamentos do fluxo de caixa...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhuma transação encontrada no período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Venda Associada</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {transactions.map((t) => {
                  const statusColors = {
                    PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    OVERDUE: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                  }[t.status];

                  const statusTexts = {
                    PAID: "Liquidado",
                    PENDING: "Pendente",
                    OVERDUE: "Vencido",
                  }[t.status];

                  const isManual = !t.saleId && !t.installmentId;

                  return (
                    <tr key={t.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground font-medium">
                        {formatDate(t.date)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-2">
                        {t.type === "INFLOW" ? (
                          <div className="p-1 bg-emerald-500/10 text-emerald-600 rounded-md">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1 bg-rose-500/10 text-rose-600 rounded-md">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span>{t.category}</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">
                        {t.description || "-"}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {t.sale ? (
                          <div>
                            <span className="font-bold">Venda #{String(t.sale.saleNumber).padStart(5, "0")}</span>
                            <span className="block text-[10px] text-muted-foreground leading-none mt-1">({t.sale.customer.name})</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${statusColors}`}>
                          {statusTexts}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-extrabold ${t.type === "INFLOW" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {t.type === "INFLOW" ? "+" : "-"} {formatBRL(t.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          {isManual ? (
                            <button
                              onClick={() => setDeleteConfirmId(t.id)}
                              className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Excluir Lançamento Manual"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60 select-none font-semibold">Automático</span>
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

      {/* Manual Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-slide-in">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-muted-foreground" />
                <span>Registrar Lançamento Financeiro</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Type selector */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                  Tipo de Movimentação *
                </label>
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      setType("INFLOW");
                      setCategory("Outras Receitas");
                    }}
                    className={`py-2 px-3 border rounded-xl font-bold text-sm cursor-pointer flex items-center justify-center gap-2 transition-all ${
                      type === "INFLOW"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "border-border text-muted-foreground hover:text-foreground bg-card"
                    }`}
                  >
                    <ArrowUpRight className="w-4.5 h-4.5" />
                    <span>Receita (Entrada)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType("OUTFLOW");
                      setCategory("Despesa Administrativa");
                    }}
                    className={`py-2 px-3 border rounded-xl font-bold text-sm cursor-pointer flex items-center justify-center gap-2 transition-all ${
                      type === "OUTFLOW"
                        ? "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400"
                        : "border-border text-muted-foreground hover:text-foreground bg-card"
                    }`}
                  >
                    <ArrowDownRight className="w-4.5 h-4.5" />
                    <span>Despesa (Saída)</span>
                  </button>
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                  Categoria *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                  required
                >
                  {type === "INFLOW"
                    ? categoriesOptions.INFLOW.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))
                    : categoriesOptions.OUTFLOW.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                </select>
              </div>

              {/* Valor e Data */}
              <div className="grid grid-cols-2 gap-4">
                {/* Valor */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Valor Lançado *
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(maskMoney(e.target.value))}
                    placeholder="R$ 0,00"
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none"
                    required
                  />
                </div>

                {/* Data */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Data do Lançamento *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                  Status de Liquidação *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                >
                  <option value="PAID">Pago / Efetivado</option>
                  <option value="PENDING">Pendente / Em Aberto</option>
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Compra de 5 capas de iPhone"
                  className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Registrar Lançamento</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6 animate-slide-in">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">Excluir Lançamento Manual?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Tem certeza que deseja excluir esta transação? Essa ação apagará permanentemente o registro de caixa e criará um log de auditoria.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 border border-border text-foreground hover:bg-muted font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 text-white hover:bg-rose-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span>Sim, Excluir</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
