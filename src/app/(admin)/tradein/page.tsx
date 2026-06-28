"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import {
  RefreshCcw,
  Search,
  ChevronRight,
  Smartphone,
  Wrench,
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
  DollarSign,
  Filter,
} from "lucide-react";

interface TradeInDevice {
  id: string;
  brand: string;
  model: string;
  color: string;
  storage: string;
  imei1: string;
  evaluationPrice: number;
  condition: string;
  status: string;
  createdAt: string;
  sale: {
    saleNumber: number;
    customer: { id: string; name: string; cpf: string; phone: string };
  };
  repairs: { cost: number }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  AGUARDANDO_AVALIACAO: { label: "Aguardando Avaliação", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", icon: <Clock className="w-3 h-3" /> },
  DISPONIVEL:           { label: "Disponível p/ Venda",  color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", icon: <CheckCircle className="w-3 h-3" /> },
  EM_REPARO:            { label: "Em Reparo",            color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", icon: <Wrench className="w-3 h-3" /> },
  AGUARDANDO_PECAS:     { label: "Aguardando Peças",     color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10", icon: <Package className="w-3 h-3" /> },
  EM_MANUTENCAO:        { label: "Em Manutenção",        color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10", icon: <Wrench className="w-3 h-3" /> },
  EM_TESTES:            { label: "Em Testes",            color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10", icon: <Smartphone className="w-3 h-3" /> },
  RESERVADO:            { label: "Reservado",            color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10", icon: <AlertTriangle className="w-3 h-3" /> },
  VENDIDO:              { label: "Vendido",              color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500/10", icon: <DollarSign className="w-3 h-3" /> },
  SUCATA:               { label: "Sucata",               color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", icon: <AlertTriangle className="w-3 h-3" /> },
  DEVOLVIDO:            { label: "Devolvido ao Cliente", color: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-500/10", icon: <RefreshCcw className="w-3 h-3" /> },
};

export default function TradeInPage() {
  const { showToast } = useToast();
  const [devices, setDevices] = useState<TradeInDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/tradein?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices);
      } else {
        showToast("Erro ao carregar trade-ins", "error");
      }
    } catch {
      showToast("Erro de conexão", "error");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: "text-muted-foreground", bg: "bg-muted", icon: null };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
        {cfg.icon}
        {cfg.label}
      </span>
    );
  };

  const totalInvestido = devices.reduce((s, d) => s + d.evaluationPrice, 0);
  const totalEmReparo = devices.filter((d) =>
    ["EM_REPARO", "AGUARDANDO_PECAS", "EM_MANUTENCAO", "EM_TESTES"].includes(d.status)
  ).length;
  const totalDisponiveis = devices.filter((d) => d.status === "DISPONIVEL").length;

  return (
    <div className="space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <RefreshCcw className="w-8 h-8 text-muted-foreground" />
            <span>Gestão de Trade-in</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aparelhos recebidos como parte do pagamento — rastreie status, reparos e lucro.
          </p>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Recebidos</span>
            <p className="text-2xl font-extrabold text-foreground mt-0.5">{devices.length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Valor Investido</span>
            <p className="text-2xl font-extrabold text-foreground mt-0.5">{formatBRL(totalInvestido)}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Disponíveis / Em Reparo</span>
            <p className="text-2xl font-extrabold text-foreground mt-0.5">
              {totalDisponiveis} <span className="text-base text-muted-foreground font-semibold">/ {totalEmReparo}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            id="tradein-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por marca, modelo ou IMEI..."
            className="w-full pl-10 pr-3 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <select
            id="tradein-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
          >
            <option value="">Todos os Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Aparelhos Recebidos</h3>
          <span className="text-xs bg-secondary border border-border text-foreground px-2 py-0.5 rounded-full font-bold">
            {devices.length} registros
          </span>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Carregando...</div>
          ) : devices.length === 0 ? (
            <div className="p-12 text-center">
              <RefreshCcw className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">Nenhum aparelho recebido em trade-in.</p>
              <p className="text-xs text-muted-foreground mt-1">Os aparelhos aparecerão aqui após serem registrados em uma venda.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Aparelho</th>
                  <th className="px-5 py-3.5">Cliente</th>
                  <th className="px-5 py-3.5">Venda</th>
                  <th className="px-5 py-3.5">Entrada</th>
                  <th className="px-5 py-3.5">Avaliação</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {devices.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-foreground text-sm">{d.brand} {d.model}</div>
                      <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                        {d.storage} · {d.color} · {d.condition}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground text-xs">{d.sale.customer.name}</div>
                      <div className="text-[10px] text-muted-foreground">{d.sale.customer.cpf}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-foreground text-xs">
                        #{String(d.sale.saleNumber).padStart(5, "0")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground font-semibold">
                      {formatDate(d.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 font-extrabold text-foreground text-sm">
                      {formatBRL(d.evaluationPrice)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/tradein/${d.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group-hover:text-foreground"
                      >
                        <span>Detalhes</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
