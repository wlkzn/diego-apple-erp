"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useToast } from "@/components/Toast";
import { maskMoney, parseMoneyToFloat } from "@/lib/masks";
import { BRAND_NAMES, getBrandData, getModels, COLORS, STORAGE_OPTIONS, CONDITIONS } from "@/lib/deviceData";
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  X,
  PlusCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Layers,
  ChevronDown,
} from "lucide-react";

interface Product {
  id: string;
  brand: string;
  model: string;
  color: string;
  storage: string;
  imei: string | null;
  serialNumber: string | null;
  purchasePrice: number;
  sellingPrice: number;
  profit: number;
  quantity: number;
  warranty: string | null;
  imageUrl: string | null;
  status: "AVAILABLE" | "RESERVED" | "SOLD";
  condition?: string | null;
  hasAppleWarranty?: boolean | null;
  appleWarrantyUntil?: string | null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [brand, setBrand] = useState("Apple");
  const [modelInput, setModelInput] = useState("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [colorSelect, setColorSelect] = useState("Preto");
  const [customColor, setCustomColor] = useState("");
  const [storageSelect, setStorageSelect] = useState("128GB");
  const [customStorage, setCustomStorage] = useState("");
  const [imei, setImei] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [warrantySelect, setWarrantySelect] = useState("90 dias");
  const [customWarranty, setCustomWarranty] = useState("");
  const [status, setStatus] = useState<"AVAILABLE" | "RESERVED" | "SOLD">("AVAILABLE");
  const [condition, setCondition] = useState("Seminovo");
  const [hasAppleWarranty, setHasAppleWarranty] = useState(false);
  const [appleWarrantyUntil, setAppleWarrantyUntil] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Models for selected brand filtered by search
  const brandModels = useMemo(() => getModels(brand), [brand]);
  const filteredModels = useMemo(() => {
    if (!modelInput) return brandModels;
    return brandModels.filter((m) =>
      m.toLowerCase().includes(modelInput.toLowerCase())
    );
  }, [brandModels, modelInput]);

  // Auto-fill brand info when brand changes
  const brandData = useMemo(() => getBrandData(brand), [brand]);

  // Click outside to close model dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/products?q=${encodeURIComponent(search)}&status=${statusFilter}`
      );
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
      } else {
        showToast("Erro ao carregar estoque", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar com a API", "error");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => loadProducts(), 300);
    return () => clearTimeout(delayDebounce);
  }, [search, statusFilter, loadProducts]);

  const resetForm = () => {
    setBrand("Apple");
    setModelInput("");
    setShowModelDropdown(false);
    setColorSelect("Preto");
    setCustomColor("");
    setStorageSelect("128GB");
    setCustomStorage("");
    setImei("");
    setSerialNumber("");
    setPurchasePrice("");
    setSellingPrice("");
    setQuantity("1");
    setWarrantySelect("90 dias");
    setCustomWarranty("");
    setStatus("AVAILABLE");
    setCondition("Seminovo");
    setHasAppleWarranty(false);
    setAppleWarrantyUntil("");
  };

  const openNewModal = () => {
    setEditingId(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingId(p.id);
    // Brand
    const knownBrand = BRAND_NAMES.includes(p.brand) ? p.brand : "Outra";
    setBrand(knownBrand);
    // Model
    setModelInput(p.model);
    setShowModelDropdown(false);
    // Color
    if (COLORS.includes(p.color)) {
      setColorSelect(p.color);
      setCustomColor("");
    } else {
      setColorSelect("Outra");
      setCustomColor(p.color);
    }
    // Storage
    if (STORAGE_OPTIONS.slice(0, -1).includes(p.storage)) {
      setStorageSelect(p.storage);
      setCustomStorage("");
    } else {
      setStorageSelect("Outro");
      setCustomStorage(p.storage);
    }
    setImei(p.imei || "");
    setSerialNumber(p.serialNumber || "");
    setPurchasePrice(maskMoney(p.purchasePrice));
    setSellingPrice(maskMoney(p.sellingPrice));
    setQuantity(String(p.quantity));
    const standardWarranties = ["Sem garantia", "30 dias", "90 dias", "180 dias", "1 ano"];
    if (p.warranty && standardWarranties.includes(p.warranty)) {
      setWarrantySelect(p.warranty);
      setCustomWarranty("");
    } else {
      setWarrantySelect("Outro");
      setCustomWarranty(p.warranty || "");
    }
    setStatus(p.status);
    setCondition(p.condition || "Seminovo");
    setHasAppleWarranty(!!p.hasAppleWarranty);
    setAppleWarrantyUntil(
      p.appleWarrantyUntil ? new Date(p.appleWarrantyUntil).toISOString().split("T")[0] : ""
    );
    setIsModalOpen(true);
  };

  const selectModel = (m: string) => {
    setModelInput(m);
    setShowModelDropdown(false);
  };

  const costFloat = parseMoneyToFloat(purchasePrice);
  const sellFloat = parseMoneyToFloat(sellingPrice);
  const liveProfit = sellFloat - costFloat;
  const liveMargin = sellFloat > 0 ? (liveProfit / sellFloat) * 100 : 0;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const finalColor = colorSelect === "Outra" ? customColor : colorSelect;
    const finalStorage = storageSelect === "Outro" ? customStorage : storageSelect;
    const finalWarranty = warrantySelect === "Outro" ? customWarranty : warrantySelect;

    if (!brand || !modelInput || !finalColor || !finalStorage || !purchasePrice || !sellingPrice) {
      showToast("Por favor, preencha os campos obrigatórios (*)", "warning");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      brand,
      model: modelInput,
      color: finalColor,
      storage: finalStorage,
      imei: imei || null,
      serialNumber: serialNumber || null,
      purchasePrice: costFloat,
      sellingPrice: sellFloat,
      quantity: parseInt(quantity) || 1,
      warranty: finalWarranty || null,
      status,
      condition,
      hasAppleWarranty,
      appleWarrantyUntil: appleWarrantyUntil || null,
    };

    try {
      const url = editingId ? `/api/products/${editingId}` : "/api/products";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, "success");
        setIsModalOpen(false);
        loadProducts();
      } else {
        showToast(data.error || "Ocorreu um erro ao salvar o produto", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar com o servidor", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteConfirmId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setDeleteConfirmId(null);
        loadProducts();
      } else {
        showToast(data.error || "Não foi possível excluir o produto", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar com o servidor", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalStockItems = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalCostValue = products.reduce((sum, p) => sum + p.purchasePrice * p.quantity, 0);
  const totalPotentialSales = products.reduce((sum, p) => sum + p.sellingPrice * p.quantity, 0);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const inputClass =
    "w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all";

  return (
    <div className="space-y-8 select-none">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-8 h-8 text-muted-foreground" />
            <span>Controle de Estoque</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie o estoque de aparelhos, acompanhe IMEI/Serial e calcule margens de lucro.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center justify-center gap-2 px-4.5 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-sm hover:opacity-90 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-card border border-border rounded-2xl p-4.5 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-neutral-100 dark:bg-zinc-800/80 rounded-lg text-foreground">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total no Estoque</span>
            <p className="text-lg font-bold text-foreground mt-0.5">{totalStockItems} unidades</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4.5 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-neutral-100 dark:bg-zinc-800/80 rounded-lg text-foreground">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Custo de Aquisição</span>
            <p className="text-lg font-bold text-foreground mt-0.5">{formatBRL(totalCostValue)}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4.5 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Retorno Estimado</span>
            <p className="text-lg font-bold text-foreground mt-0.5">{formatBRL(totalPotentialSales)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative max-w-sm w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Search className="w-4.5 h-4.5" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por marca, modelo, IMEI..."
            className="w-full pl-10 pr-4 py-2 bg-card border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all duration-200"
          />
        </div>
        <div className="flex items-center bg-card border border-border p-1 rounded-xl text-xs font-semibold select-none shadow-sm">
          {(["", "AVAILABLE", "RESERVED", "SOLD"] as const).map((s) => {
            const labels = { "": "Todos", AVAILABLE: "Disponível", RESERVED: "Reservado", SOLD: "Vendido" };
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${statusFilter === s ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="text-sm">Carregando estoque de aparelhos...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhum produto cadastrado com os filtros ativos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Aparelho</th>
                  <th className="px-6 py-4">Armazenamento / Cor</th>
                  <th className="px-6 py-4">Identificação (IMEI/Serial)</th>
                  <th className="px-6 py-4">Estoque / Status</th>
                  <th className="px-6 py-4 text-right">Compra / Venda</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {products.map((p) => {
                  const statusColors = {
                    AVAILABLE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    RESERVED: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    SOLD: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                  }[p.status];
                  const statusTexts = { AVAILABLE: "Disponível", RESERVED: "Reservado", SOLD: "Vendido" }[p.status];

                  return (
                    <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span>{p.brand} {p.model}</span>
                          {p.condition && (
                            <span className="px-1.5 py-0.5 text-[8px] bg-secondary text-foreground font-semibold rounded">
                              {p.condition}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Lucro: {formatBRL(p.profit)} ({(p.profit / p.sellingPrice * 100 || 0).toFixed(0)}%)
                        </div>
                        {p.hasAppleWarranty && (
                          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                            Garantia Apple até: {p.appleWarrantyUntil ? new Date(p.appleWarrantyUntil).toLocaleDateString("pt-BR") : "Sim"}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{p.storage}</div>
                        <div className="text-xs text-muted-foreground">{p.color}</div>
                      </td>
                      <td className="px-6 py-4">
                        {p.imei && <div className="text-xs text-foreground font-medium">IMEI: {p.imei}</div>}
                        {p.serialNumber && <div className="text-[10px] text-muted-foreground">S/N: {p.serialNumber}</div>}
                        {!p.imei && !p.serialNumber && <div className="text-xs text-muted-foreground">-</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-foreground font-semibold mb-1">{p.quantity} un.</div>
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${statusColors}`}>
                          {statusTexts}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-muted-foreground text-xs">Custo: {formatBRL(p.purchasePrice)}</div>
                        <div className="text-foreground font-extrabold">{formatBRL(p.sellingPrice)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl animate-slide-in">
            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-muted-foreground" />
                <span>{editingId ? "Editar Aparelho" : "Cadastrar Novo Aparelho"}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Seção: Identificação */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Identificação do Aparelho</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Marca */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Marca *</label>
                    <select
                      value={brand}
                      onChange={(e) => {
                        setBrand(e.target.value);
                        setModelInput("");
                        setShowModelDropdown(false);
                      }}
                      className={inputClass}
                      required
                    >
                      {BRAND_NAMES.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    {brandData && brandData.name !== "Outra" && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Categoria: {brandData.category} · Sistema: {brandData.os}
                      </p>
                    )}
                  </div>

                  {/* Modelo (Combobox com autocomplete) */}
                  <div ref={modelDropdownRef} className="relative">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Modelo *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={modelInput}
                        onChange={(e) => {
                          setModelInput(e.target.value);
                          setShowModelDropdown(true);
                        }}
                        onFocus={() => setShowModelDropdown(true)}
                        placeholder={brand ? "Digite para buscar ou selecionar..." : "Selecione uma marca primeiro"}
                        disabled={!brand}
                        className={`${inputClass} pr-9`}
                        required
                        autoComplete="off"
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                    {showModelDropdown && filteredModels.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-52 overflow-y-auto">
                        {filteredModels.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectModel(m)}
                            className={`w-full text-left px-3.5 py-2 text-sm hover:bg-muted transition-colors ${modelInput === m ? "bg-muted font-semibold" : ""}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                    {brand === "Outra" && (
                      <p className="text-[10px] text-muted-foreground mt-1">Marca personalizada — informe o modelo manualmente.</p>
                    )}
                  </div>

                  {/* Cor */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Cor *</label>
                    <select
                      value={colorSelect}
                      onChange={(e) => {
                        setColorSelect(e.target.value);
                        if (e.target.value !== "Outra") setCustomColor("");
                      }}
                      className={inputClass}
                      required
                    >
                      {COLORS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {colorSelect === "Outra" && (
                      <input
                        type="text"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        placeholder="Informe a cor..."
                        className={`${inputClass} mt-2`}
                        required
                      />
                    )}
                  </div>

                  {/* Armazenamento */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Armazenamento *</label>
                    <select
                      value={storageSelect}
                      onChange={(e) => {
                        setStorageSelect(e.target.value);
                        if (e.target.value !== "Outro") setCustomStorage("");
                      }}
                      className={inputClass}
                      required
                    >
                      {STORAGE_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {storageSelect === "Outro" && (
                      <input
                        type="text"
                        value={customStorage}
                        onChange={(e) => setCustomStorage(e.target.value)}
                        placeholder="Ex: 16GB, 32GB, Acessório..."
                        className={`${inputClass} mt-2`}
                        required
                      />
                    )}
                  </div>

                  {/* Condição */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Condição</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className={inputClass}
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as typeof status)}
                      className={inputClass}
                    >
                      <option value="AVAILABLE">Disponível</option>
                      <option value="RESERVED">Reservado</option>
                      <option value="SOLD">Vendido (Estoque Baixado)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção: Rastreabilidade */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Rastreabilidade</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">IMEI (15 dígitos)</label>
                    <input
                      type="text"
                      value={imei}
                      onChange={(e) => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))}
                      placeholder="000000000000000"
                      className={inputClass}
                      inputMode="numeric"
                      maxLength={15}
                    />
                    {imei && imei.length > 0 && imei.length < 15 && (
                      <p className="text-[10px] text-amber-500 mt-1">{15 - imei.length} dígito(s) restantes</p>
                    )}
                    {imei.length === 15 && (
                      <p className="text-[10px] text-emerald-500 mt-1">IMEI completo</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Número de Série (S/N)</label>
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value.toUpperCase().slice(0, 20))}
                      placeholder="Ex: C39QWERTY123"
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                </div>
              </div>

              {/* Seção: Precificação */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Precificação</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Valor de Compra (Custo) *</label>
                    <input
                      type="text"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(maskMoney(e.target.value))}
                      placeholder="R$ 0,00"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Valor de Venda *</label>
                    <input
                      type="text"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(maskMoney(e.target.value))}
                      placeholder="R$ 0,00"
                      className={inputClass}
                      required
                    />
                  </div>

                  {/* Live Profit */}
                  <div className="col-span-2 bg-muted/30 border border-border/60 rounded-xl p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="block font-bold text-muted-foreground uppercase tracking-wider mb-1">Lucro Estimado</span>
                      <span className={`text-base font-extrabold ${liveProfit < 0 ? "text-rose-500" : "text-foreground"}`}>{formatBRL(liveProfit)}</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-bold text-muted-foreground uppercase tracking-wider mb-1">Margem</span>
                      <span className={`text-base font-extrabold ${liveMargin >= 25 ? "text-emerald-600 dark:text-emerald-400" : liveMargin < 0 ? "text-rose-500" : "text-foreground"}`}>
                        {liveMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Quantidade em Estoque</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      min="0"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Garantia da Loja</label>
                    <select
                      value={warrantySelect}
                      onChange={(e) => {
                        setWarrantySelect(e.target.value);
                        if (e.target.value !== "Outro") setCustomWarranty("");
                      }}
                      className={inputClass}
                    >
                      {["Sem garantia", "30 dias", "90 dias", "180 dias", "1 ano", "2 anos", "Outro"].map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                    {warrantySelect === "Outro" && (
                      <input
                        type="text"
                        value={customWarranty}
                        onChange={(e) => setCustomWarranty(e.target.value)}
                        placeholder="Ex: garantia legal, 6 meses..."
                        className={`${inputClass} mt-2`}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Seção: Garantia Apple */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Garantia Apple (Opcional)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasAppleWarranty"
                      checked={hasAppleWarranty}
                      onChange={(e) => {
                        setHasAppleWarranty(e.target.checked);
                        if (!e.target.checked) setAppleWarrantyUntil("");
                      }}
                      className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-0"
                    />
                    <label htmlFor="hasAppleWarranty" className="text-sm font-semibold text-foreground cursor-pointer select-none">
                      Possui Garantia Apple Ativa
                    </label>
                  </div>
                  {hasAppleWarranty && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Válida até</label>
                      <input
                        type="date"
                        value={appleWarrantyUntil}
                        onChange={(e) => setAppleWarrantyUntil(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-border text-foreground hover:bg-muted font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 active:scale-98 transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingId ? "Salvar Alterações" : "Cadastrar Produto"}</span>
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
                <h3 className="text-lg font-bold text-foreground">Excluir Produto do Estoque?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Essa ação é permanente e registrará um log de auditoria.
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
