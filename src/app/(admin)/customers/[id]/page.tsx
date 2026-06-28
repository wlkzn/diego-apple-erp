"use client";

import React, { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { maskCPF, maskPhone, maskDate, maskMoney } from "@/lib/masks";
import {
  ArrowLeft,
  User,
  ShoppingBag,
  Calendar,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileDown,
} from "lucide-react";

interface CustomerDetail {
  id: string;
  name: string;
  cpf: string;
  rg: string | null;
  birthDate: string | null;
  phone: string;
  whatsApp: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  sales: Array<{
    id: string;
    saleNumber: number;
    totalAmount: number;
    discountAmount: number;
    netAmount: number;
    downPayment: number;
    paymentMethod: string;
    installmentCount: number;
    createdAt: string;
    items: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      product: {
        brand: string;
        model: string;
        color: string;
        storage: string;
        imei: string | null;
      };
    }>;
  }>;
  installments: Array<{
    id: string;
    installmentNumber: number;
    amount: number;
    dueDate: string;
    status: "PAID" | "PENDING" | "OVERDUE";
    paidAmount: number;
    remainingAmount: number;
    paymentDate: string | null;
    sale: {
      saleNumber: number;
    };
  }>;
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadCustomer = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
      } else {
        showToast("Erro ao carregar detalhes do cliente", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar com o servidor", "error");
    } finally {
      setIsLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground select-none">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="text-sm">Carregando detalhes do cliente...</span>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6 select-none">
        <Link href="/customers" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Clientes</span>
        </Link>
        <div className="p-8 text-center border border-border rounded-2xl bg-card text-muted-foreground">
          Cliente não encontrado.
        </div>
      </div>
    );
  }

  // Estatísticas Rápidas
  const totalSales = customer.sales.length;
  const totalSpent = customer.sales.reduce((sum, s) => sum + s.netAmount, 0);
  
  const pendingInstallments = customer.installments.filter((i) => i.status !== "PAID");
  const totalDue = pendingInstallments.reduce((sum, i) => sum + i.remainingAmount, 0);
  const overdueCount = pendingInstallments.filter((i) => i.status === "OVERDUE").length;

  return (
    <div className="space-y-8 select-none">
      
      {/* Back to list */}
      <Link
        href="/customers"
        className="flex items-center gap-2 self-start text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para Lista de Clientes</span>
      </Link>

      {/* Profile summary header */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Customer card details */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-muted-foreground border border-border">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{customer.name}</h2>
              <p className="text-xs text-muted-foreground mt-1">Cadastrado em {formatDate(customer.sales[0]?.createdAt || new Date().toISOString())}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border-t border-border pt-5">
            <div className="flex items-center gap-3">
              <FileText className="w-4.5 h-4.5 text-muted-foreground" />
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">CPF</span>
                <span className="font-medium text-foreground">{maskCPF(customer.cpf)}</span>
              </div>
            </div>
            {customer.rg && (
              <div className="flex items-center gap-3">
                <FileText className="w-4.5 h-4.5 text-muted-foreground" />
                <div>
                  <span className="block text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">RG</span>
                  <span className="font-medium text-foreground">{customer.rg}</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Phone className="w-4.5 h-4.5 text-muted-foreground" />
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Telefone / WhatsApp</span>
                <span className="font-medium text-foreground">
                  {maskPhone(customer.phone)}
                  {customer.whatsApp && ` / ${maskPhone(customer.whatsApp)}`}
                </span>
              </div>
            </div>
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4.5 h-4.5 text-muted-foreground" />
                <div>
                  <span className="block text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">E-mail</span>
                  <span className="font-medium text-foreground truncate max-w-[200px] block">{customer.email}</span>
                </div>
              </div>
            )}
            {customer.birthDate && (
              <div className="flex items-center gap-3 col-span-1 md:col-span-2">
                <Calendar className="w-4.5 h-4.5 text-muted-foreground" />
                <div>
                  <span className="block text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Data de Nascimento</span>
                  <span className="font-medium text-foreground">{formatDate(customer.birthDate)}</span>
                </div>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-3 col-span-1 md:col-span-2">
                <MapPin className="w-4.5 h-4.5 text-muted-foreground mt-0.5" />
                <div>
                  <span className="block text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Endereço</span>
                  <span className="font-medium text-foreground leading-relaxed">{customer.address}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick summary metrics */}
        <div className="w-full lg:w-80 grid grid-cols-2 lg:grid-cols-1 gap-4.5">
          {/* Compras Efetuadas */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Compras Realizadas</span>
            <div className="text-3xl font-extrabold text-foreground">{totalSales}</div>
            <p className="text-[11px] text-muted-foreground font-semibold">Total de {formatBRL(totalSpent)} gastos</p>
          </div>

          {/* Saldo Devedor */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Saldo Devedor na Loja</span>
            <div className={`text-3xl font-extrabold ${totalDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
              {formatBRL(totalDue)}
            </div>
            {overdueCount > 0 ? (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{overdueCount} parcelas atrasadas</span>
              </p>
            ) : (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Sem parcelas em atraso</p>
            )}
          </div>
        </div>

      </div>

      {/* History Tabs / Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Purchase History List (2/3 width) */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                <span>Histórico de Compras</span>
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-secondary border border-border text-foreground rounded-full">
                {totalSales} Vendas
              </span>
            </div>

            {customer.sales.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Nenhuma compra registrada para este cliente.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {customer.sales.map((sale) => (
                  <div key={sale.id} className="p-5 hover:bg-muted/10 transition-colors space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-foreground">
                          Venda #{String(sale.saleNumber).padStart(5, "0")}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(sale.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold px-2 py-0.5 bg-secondary text-foreground rounded-full border border-border">
                          {sale.paymentMethod.replace("_", " ")}
                        </span>
                        <span className="font-extrabold text-foreground">{formatBRL(sale.netAmount)}</span>
                      </div>
                    </div>

                    {/* Sale Items Detail */}
                    <div className="bg-muted/30 border border-border/60 rounded-xl p-3 space-y-2">
                      {sale.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs">
                          <div className="text-foreground">
                            <span className="font-semibold">
                              {item.product.brand} {item.product.model}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              ({item.product.color}, {item.product.storage})
                            </span>
                            {item.product.imei && (
                              <span className="block text-[10px] text-muted-foreground/80 mt-0.5">
                                IMEI: {item.product.imei}
                              </span>
                            )}
                          </div>
                          <div className="text-foreground/80 font-medium">
                            {item.quantity}x {formatBRL(item.unitPrice)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Installments History List (1/3 width) */}
        <div className="col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <span>Controle de Parcelas</span>
              </h3>
            </div>

            {customer.installments.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Nenhum parcelamento ativo para este cliente.
              </div>
            ) : (
              <div className="divide-y divide-border/60 max-h-[500px] overflow-y-auto">
                {customer.installments.map((inst) => {
                  const statusColors = {
                    PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    OVERDUE: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                  }[inst.status];

                  const statusTexts = {
                    PAID: "Paga",
                    PENDING: "Pendente",
                    OVERDUE: "Vencida",
                  }[inst.status];

                  return (
                    <div key={inst.id} className="p-4 hover:bg-muted/10 transition-colors flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-foreground">
                          Parcela {inst.installmentNumber} (Venda #{String(inst.sale.saleNumber).padStart(5, "0")})
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Vence em {formatDate(inst.dueDate)}</span>
                        </div>
                        {inst.status === "PAID" && inst.paymentDate && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            Paga em: {formatDate(inst.paymentDate)}
                          </div>
                        )}
                      </div>
                      <div className="text-right space-y-1.5">
                        <div className="font-extrabold text-foreground">{formatBRL(inst.amount)}</div>
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${statusColors}`}>
                          {statusTexts}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
