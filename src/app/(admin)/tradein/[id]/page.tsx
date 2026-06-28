"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { maskMoney, parseMoneyToFloat } from "@/lib/masks";
import {
  RefreshCcw, ArrowLeft, Smartphone, Wrench, Clock, CheckCircle,
  AlertTriangle, Package, DollarSign, Camera, ClipboardList,
  History, Plus, X, Loader2, ChevronRight, User, ShoppingBag,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  AGUARDANDO_AVALIACAO: { label: "Aguardando Avaliação", color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/10" },
  DISPONIVEL:           { label: "Disponível p/ Venda",  color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  EM_REPARO:            { label: "Em Reparo",            color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-500/10" },
  AGUARDANDO_PECAS:     { label: "Aguardando Peças",     color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10" },
  EM_MANUTENCAO:        { label: "Em Manutenção",        color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
  EM_TESTES:            { label: "Em Testes",            color: "text-cyan-600 dark:text-cyan-400",     bg: "bg-cyan-500/10" },
  RESERVADO:            { label: "Reservado",            color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10" },
  VENDIDO:              { label: "Vendido",              color: "text-slate-600 dark:text-slate-400",   bg: "bg-slate-500/10" },
  SUCATA:               { label: "Sucata",               color: "text-rose-600 dark:text-rose-400",     bg: "bg-rose-500/10" },
  DEVOLVIDO:            { label: "Devolvido ao Cliente", color: "text-zinc-600 dark:text-zinc-400",     bg: "bg-zinc-500/10" },
};

const CHECKLIST_LABELS: Record<string, string> = {
  screenOk: "Tela sem trincas", touchOk: "Touch funcionando", faceIdOk: "Face ID / Biometria",
  camerasOk: "Câmeras funcionando", speakersOk: "Alto-falantes funcionando", micOk: "Microfone funcionando",
  buttonsOk: "Botões funcionando", chargingOk: "Carregamento funcionando", wifiOk: "Wi-Fi funcionando",
  bluetoothOk: "Bluetooth funcionando", mobileNetOk: "Rede móvel funcionando", batteryOk: "Bateria em bom estado",
  unlockedOk: "Aparelho desbloqueado", noAccountOk: "Sem conta Google/iCloud bloqueada", noOxidationOk: "Sem sinais de oxidação",
};

type TabId = "info" | "status" | "repairs" | "history";

export default function TradeInDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const id = params.id as string;

  const [device, setDevice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("info");

  // Status change
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Repair form
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [repairDefect, setRepairDefect] = useState("");
  const [repairService, setRepairService] = useState("");
  const [repairParts, setRepairParts] = useState("");
  const [repairCost, setRepairCost] = useState("");
  const [repairStart, setRepairStart] = useState("");
  const [repairEnd, setRepairEnd] = useState("");
  const [repairTech, setRepairTech] = useState("");
  const [isSavingRepair, setIsSavingRepair] = useState(false);

  const loadDevice = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tradein/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDevice(data.device);
        setNewStatus(data.device.status);
      } else {
        showToast("Trade-in não encontrado", "error");
        router.push("/tradein");
      }
    } catch {
      showToast("Erro de conexão", "error");
    } finally {
      setIsLoading(false);
    }
  }, [id, showToast, router]);

  useEffect(() => { loadDevice(); }, [loadDevice]);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/tradein/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, note: statusNote }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Status atualizado!", "success");
        setStatusNote("");
        loadDevice();
      } else {
        showToast(data.error || "Erro ao atualizar status", "error");
      }
    } catch {
      showToast("Erro de conexão", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repairDefect || !repairService || !repairCost || !repairStart || !repairTech) {
      showToast("Preencha todos os campos obrigatórios", "warning");
      return;
    }
    setIsSavingRepair(true);
    try {
      const res = await fetch(`/api/tradein/${id}/repairs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defect: repairDefect,
          service: repairService,
          parts: repairParts || null,
          cost: parseMoneyToFloat(repairCost),
          startDate: repairStart,
          endDate: repairEnd || null,
          technician: repairTech,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Reparo cadastrado!", "success");
        setShowRepairForm(false);
        setRepairDefect(""); setRepairService(""); setRepairParts("");
        setRepairCost(""); setRepairStart(""); setRepairEnd(""); setRepairTech("");
        loadDevice();
      } else {
        showToast(data.error || "Erro ao salvar reparo", "error");
      }
    } catch {
      showToast("Erro de conexão", "error");
    } finally {
      setIsSavingRepair(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: "text-muted-foreground", bg: "bg-muted" };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  if (isLoading || !device) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const checklist = device.checklist ? JSON.parse(device.checklist) : {};
  const photos: string[] = device.photos ? JSON.parse(device.photos) : [];
  const totalRepairCost = (device.repairs || []).reduce((s: number, r: any) => s + r.cost, 0);
  const custDevice = device.sale?.customer;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "info",    label: "Informações", icon: <ClipboardList className="w-4 h-4" /> },
    { id: "status",  label: "Status",      icon: <RefreshCcw className="w-4 h-4" /> },
    { id: "repairs", label: `Reparos (${(device.repairs || []).length})`, icon: <Wrench className="w-4 h-4" /> },
    { id: "history", label: "Histórico",   icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 select-none">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push("/tradein")}
          className="mt-1 p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {device.brand} {device.model}
            </h1>
            <StatusBadge status={device.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {device.storage} · {device.color} · {device.condition} · IMEI: {device.imei1}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avaliado em</span>
          <p className="text-2xl font-extrabold text-foreground">{formatBRL(device.evaluationPrice)}</p>
          {totalRepairCost > 0 && (
            <p className="text-xs text-rose-500 font-semibold mt-0.5">+ {formatBRL(totalRepairCost)} em reparos</p>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-secondary rounded-xl"><User className="w-4 h-4 text-muted-foreground" /></div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Cliente</span>
            <p className="text-xs font-bold text-foreground mt-0.5">{custDevice?.name}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-secondary rounded-xl"><ShoppingBag className="w-4 h-4 text-muted-foreground" /></div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Venda</span>
            <p className="text-xs font-bold text-foreground mt-0.5">#{String(device.sale?.saleNumber).padStart(5, "0")}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-secondary rounded-xl"><Wrench className="w-4 h-4 text-muted-foreground" /></div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Custo Reparos</span>
            <p className="text-xs font-bold text-foreground mt-0.5">{formatBRL(totalRepairCost)}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-secondary rounded-xl"><DollarSign className="w-4 h-4 text-muted-foreground" /></div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Custo Total</span>
            <p className="text-xs font-bold text-foreground mt-0.5">{formatBRL(device.evaluationPrice + totalRepairCost)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Informações */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dados do Aparelho */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              Dados do Aparelho
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Marca", device.brand], ["Modelo", device.model],
                ["Cor", device.color], ["Armazenamento", device.storage],
                ["IMEI 1", device.imei1], ["IMEI 2", device.imei2 || "—"],
                ["Número de Série", device.serialNumber || "—"], ["Operadora", device.carrier || "—"],
                ["Estado", device.condition], ["Data de Entrada", formatDate(device.createdAt)],
              ].map(([label, val]) => (
                <div key={label}>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
                  <p className="text-foreground font-semibold mt-0.5">{val}</p>
                </div>
              ))}
            </div>
            {device.notes && (
              <div className="border-t border-border pt-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Observações</span>
                <p className="text-sm text-foreground mt-1">{device.notes}</p>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              Checklist de Avaliação
            </h3>
            <div className="space-y-2.5">
              {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
                const val = checklist[key];
                return (
                  <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm text-foreground font-medium">{label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      val === true  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                      val === false ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {val === true ? "✓ OK" : val === false ? "✗ Com Defeito" : "— Não verificado"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fotos */}
          {photos.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4 lg:col-span-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Camera className="w-4 h-4 text-muted-foreground" />
                Fotos do Aparelho ({photos.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((photo, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Status */}
      {activeTab === "status" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5 max-w-xl">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <RefreshCcw className="w-4 h-4 text-muted-foreground" />
            Alterar Status do Aparelho
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Novo Status</label>
              <select
                id="status-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Observação (Opcional)</label>
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={3}
                placeholder="Ex: Aparelho aprovado na triagem, pronto para revenda..."
                className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none resize-none"
              />
            </div>
            <button
              id="btn-update-status"
              onClick={handleStatusUpdate}
              disabled={isUpdatingStatus || newStatus === device.status}
              className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isUpdatingStatus ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Salvando...</span></> : <span>Salvar Status</span>}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Reparos */}
      {activeTab === "repairs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Reparos Realizados</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Custo total acumulado: <strong className="text-foreground">{formatBRL(totalRepairCost)}</strong>
              </p>
            </div>
            <button
              id="btn-add-repair"
              onClick={() => setShowRepairForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-all cursor-pointer border-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Reparo</span>
            </button>
          </div>

          {/* Repair Form Modal */}
          {showRepairForm && (
            <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="p-5 border-b border-border flex items-center justify-between">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-muted-foreground" />
                    Registrar Reparo
                  </h3>
                  <button onClick={() => setShowRepairForm(false)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted cursor-pointer border-0 bg-transparent">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleSaveRepair} className="p-5 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Defeito Encontrado *</label>
                      <input value={repairDefect} onChange={(e) => setRepairDefect(e.target.value)} placeholder="Ex: Tela quebrada, bateria inchada..." className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Serviço Realizado *</label>
                      <input value={repairService} onChange={(e) => setRepairService(e.target.value)} placeholder="Ex: Troca de tela, troca de bateria..." className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Peças Utilizadas</label>
                      <input value={repairParts} onChange={(e) => setRepairParts(e.target.value)} placeholder="Ex: Tela OLED, Bateria 3279mAh..." className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Custo (R$) *</label>
                        <input value={repairCost} onChange={(e) => setRepairCost(maskMoney(e.target.value))} placeholder="R$ 0,00" className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Técnico *</label>
                        <input value={repairTech} onChange={(e) => setRepairTech(e.target.value)} placeholder="Nome do técnico" className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Data Início *</label>
                        <input type="date" value={repairStart} onChange={(e) => setRepairStart(e.target.value)} className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Data Conclusão</label>
                        <input type="date" value={repairEnd} onChange={(e) => setRepairEnd(e.target.value)} className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2 border-t border-border mt-4">
                    <button type="button" onClick={() => setShowRepairForm(false)} className="flex-1 py-2.5 border border-border text-foreground hover:bg-muted font-semibold rounded-xl text-sm cursor-pointer bg-transparent">Cancelar</button>
                    <button type="submit" disabled={isSavingRepair} className="flex-1 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 border-0">
                      {isSavingRepair ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Salvando...</span></> : <span>Salvar Reparo</span>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {(device.repairs || []).length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <Wrench className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">Nenhum reparo registrado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(device.repairs || []).map((r: any) => (
                <div key={r.id} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-foreground">{r.service}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Defeito: {r.defect}</p>
                    </div>
                    <span className="font-extrabold text-foreground text-sm">{formatBRL(r.cost)}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {[
                      ["Peças", r.parts || "—"],
                      ["Técnico", r.technician],
                      ["Início", new Date(r.startDate).toLocaleDateString("pt-BR")],
                      ["Conclusão", r.endDate ? new Date(r.endDate).toLocaleDateString("pt-BR") : "Em andamento"],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{label}</span>
                        <p className="text-foreground font-semibold mt-0.5">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Histórico */}
      {activeTab === "history" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            Linha do Tempo
          </h3>
          {(device.statusHistory || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum histórico registrado.</p>
          ) : (
            <div className="space-y-0 relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              {(device.statusHistory || []).map((h: any, i: number) => {
                const cfg = STATUS_CONFIG[h.status] || { label: h.status, color: "text-muted-foreground", bg: "bg-muted" };
                return (
                  <div key={h.id || i} className="relative pl-7 pb-6 last:pb-0">
                    <div className={`absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 border-background ${cfg.bg}`} />
                    <div>
                      <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(h.createdAt)}</p>
                      {h.note && <p className="text-xs text-foreground/80 mt-1 bg-muted/30 px-2 py-1 rounded-lg">{h.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
