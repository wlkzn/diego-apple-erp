"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/components/Toast";
import {
  Settings,
  Building,
  Users,
  ShieldAlert,
  Loader2,
  Save,
  PlusCircle,
  Trash2,
  Clock,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { maskCNPJ, maskPhone, maskCEP, maskCPF } from "@/lib/masks";

interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SELLER" | "DEV";
  createdAt: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  } | null;
}

export default function SettingsPage() {
  const { user } = useUser();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"company" | "users" | "logs">("company");
  const [isLoading, setIsLoading] = useState(true);

  // Company Form State
  const [tipo, setTipo] = useState("PJ");
  const [companyName, setCompanyName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [rg, setRg] = useState("");
  const [ie, setIe] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cep, setCep] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsApp, setWhatsApp] = useState("");
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  // Users List State
  const [usersList, setUsersList] = useState<UserListItem[]>([]);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"ADMIN" | "SELLER" | "DEV">("SELLER");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const loadCompanySettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        const s = data.settings;
        const loadedTipo = s.tipo || "PJ";
        setTipo(loadedTipo);
        setCompanyName(s.name || "");
        setTradeName(s.tradeName || "");
        setCnpj(loadedTipo === "PF" ? maskCPF(s.cnpj || "") : maskCNPJ(s.cnpj || ""));
        setRg(s.rg || "");
        setIe(s.ie || "");
        setAddress(s.address || "");
        setNeighborhood(s.neighborhood || "");
        setCity(s.city || "");
        setState(s.state || "");
        setCep(maskCEP(s.cep || ""));
        setPhone(maskPhone(s.phone || ""));
        setWhatsApp(s.whatsApp ? maskPhone(s.whatsApp) : "");
        setEmail(s.email || "");
        setLogoUrl(s.logoUrl || "");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao carregar configurações da empresa", "error");
    }
  }, [showToast]);

  const loadUsersList = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users);
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao carregar lista de usuários", "error");
    }
  }, [showToast]);

  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/logs");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs);
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao carregar logs de auditoria", "error");
    }
  }, [showToast]);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    await loadCompanySettings();
    if (activeTab === "users") await loadUsersList();
    if (activeTab === "logs") await loadAuditLogs();
    setIsLoading(false);
  }, [activeTab, loadCompanySettings, loadUsersList, loadAuditLogs]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const fetchCepCompany = useCallback(async () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setIsFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (data.logradouro) setAddress(data.logradouro);
        if (data.bairro) setNeighborhood(data.bairro);
        if (data.localidade) setCity(data.localidade);
        if (data.uf) setState(data.uf);
      }
    } catch { /* silent — usuário pode preencher manualmente */ } finally {
      setIsFetchingCep(false);
    }
  }, [cep]);

  // Save company
  const handleSaveCompany = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast("Sem permissão para salvar configurações", "error");
      return;
    }
    setIsSavingCompany(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName, tipo, tradeName: tradeName || null,
          cnpj: cnpj.replace(/\D/g, ""), rg: rg.replace(/\D/g, "") || null,
          ie: ie || null, address, neighborhood: neighborhood || null,
          city: city || null, state: state || null,
          cep: cep.replace(/\D/g, "") || null,
          phone: phone.replace(/\D/g, ""),
          whatsApp: whatsApp.replace(/\D/g, "") || null,
          email, logoUrl: logoUrl || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || "Configurações salvas com sucesso!", "success");
      } else {
        const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || "Erro ao salvar dados da loja");
        showToast(msg, "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro de conexão", "error");
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Create user
  const handleCreateUser = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (user?.role !== "ADMIN") return;

    if (!newUserName || !newUserEmail || !newUserPassword) {
      showToast("Por favor, preencha todos os campos do usuário", "warning");
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, "success");
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserRole("SELLER");
        loadUsersList();
      } else {
        showToast(data.error || "Erro ao cadastrar usuário", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro de conexão", "error");
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (idToDelete: string) => {
    if (user?.role !== "ADMIN") return;

    setIsDeletingUser(idToDelete);
    try {
      const res = await fetch(`/api/settings/users/${idToDelete}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, "success");
        loadUsersList();
      } else {
        showToast(data.error || "Erro ao excluir usuário", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro de conexão", "error");
    } finally {
      setIsDeletingUser(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const isAdmin = user?.role === "ADMIN" || user?.role === "DEV";

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="w-8 h-8 text-muted-foreground" />
          <span>Configurações do Sistema</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ajuste as informações da empresa, cadastre vendedores e consulte o log de auditoria operacional.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border text-sm font-semibold select-none">
        <button
          onClick={() => setActiveTab("company")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all cursor-pointer ${
            activeTab === "company"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building className="w-4.5 h-4.5" />
          <span>Dados da Empresa</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all cursor-pointer ${
            activeTab === "users"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4.5 h-4.5" />
          <span>Usuários & Acessos</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all cursor-pointer ${
            activeTab === "logs"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldAlert className="w-4.5 h-4.5" />
          <span>Logs de Auditoria</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="text-sm">Carregando dados da aba...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: Company Profile */}
            {activeTab === "company" && (
              <form onSubmit={handleSaveCompany} className="space-y-6 max-w-3xl">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Cadastro Corporativo</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Estas informações serão preenchidas automaticamente nos contratos e comprovantes de venda.
                  </p>
                </div>

                {/* Tipo PF / PJ */}
                <div className="flex gap-3">
                  {["PJ", "PF"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => isAdmin && setTipo(t)}
                      className={`px-5 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                        tipo === t
                          ? "bg-foreground text-background border-foreground"
                          : "bg-muted text-muted-foreground border-border hover:border-foreground/40"
                      } ${!isAdmin ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      {t === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Logo Upload */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      Logotipo da Empresa
                    </label>
                    <div className="flex items-center gap-4">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Logo" className="h-14 w-14 object-contain rounded-xl border border-border bg-muted" />
                      ) : (
                        <div className="h-14 w-14 rounded-xl border border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground">
                          <Building className="w-6 h-6" />
                        </div>
                      )}
                      {isAdmin && (
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-foreground text-xs font-semibold rounded-lg hover:bg-muted/80 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Enviar imagem</span>
                          </button>
                          {logoUrl && (
                            <button type="button" onClick={() => setLogoUrl("")} className="text-[10px] text-rose-500 hover:underline cursor-pointer">
                              Remover logo
                            </button>
                          )}
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => setLogoUrl(reader.result as string);
                              reader.readAsDataURL(file);
                            }}
                          />
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Aparece no cabeçalho dos<br />contratos e comprovantes.
                      </p>
                    </div>
                  </div>

                  {/* Razão Social / Nome */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      {tipo === "PJ" ? "Razão Social" : "Nome Completo"} *
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      disabled={!isAdmin}
                      required
                    />
                  </div>

                  {/* Nome Fantasia */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      Nome Fantasia
                    </label>
                    <input
                      type="text"
                      value={tradeName}
                      onChange={(e) => setTradeName(e.target.value)}
                      placeholder="Como a loja é conhecida pelo público"
                      className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                      disabled={!isAdmin}
                    />
                  </div>

                  {/* CNPJ / CPF */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      {tipo === "PJ" ? "CNPJ" : "CPF"} *
                    </label>
                    <input
                      type="text"
                      value={cnpj}
                      onChange={(e) => setCnpj(tipo === "PJ" ? maskCNPJ(e.target.value) : maskCPF(e.target.value))}
                      placeholder={tipo === "PJ" ? "00.000.000/0001-00" : "000.000.000-00"}
                      className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                      disabled={!isAdmin}
                      required
                    />
                  </div>

                  {/* RG (PF) / IE (PJ) */}
                  {tipo === "PF" ? (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">RG</label>
                      <input
                        type="text"
                        value={rg}
                        onChange={(e) => setRg(e.target.value.replace(/\D/g, "").slice(0, 9))}
                        placeholder="Somente números"
                        className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                        disabled={!isAdmin}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Inscrição Estadual</label>
                      <input
                        type="text"
                        value={ie}
                        onChange={(e) => setIe(e.target.value)}
                        placeholder="Isento ou número"
                        className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                        disabled={!isAdmin}
                      />
                    </div>
                  )}

                  {/* Telefone */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      Telefone *
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(maskPhone(e.target.value))}
                      placeholder="(21) 99999-9999"
                      className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                      disabled={!isAdmin}
                      required
                    />
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      value={whatsApp}
                      onChange={(e) => setWhatsApp(maskPhone(e.target.value))}
                      placeholder="(21) 99999-9999"
                      className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                      disabled={!isAdmin}
                    />
                  </div>

                  {/* E-mail */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                      disabled={!isAdmin}
                      required
                    />
                  </div>

                  {/* Endereço */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      Logradouro (Rua, Número, Complemento) *
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Av. das Américas, 500, Sala 100"
                      className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                      disabled={!isAdmin}
                      required
                    />
                  </div>

                  {/* Bairro */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Bairro</label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Barra da Tijuca"
                      className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                      disabled={!isAdmin}
                    />
                  </div>

                  {/* Cidade */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Cidade</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Rio de Janeiro"
                      className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                      disabled={!isAdmin}
                    />
                  </div>

                  {/* Estado + CEP */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Estado</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="RJ"
                        maxLength={2}
                        className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                        disabled={!isAdmin}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">CEP</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cep}
                          onChange={(e) => setCep(maskCEP(e.target.value))}
                          onBlur={isAdmin ? fetchCepCompany : undefined}
                          placeholder="00000-000"
                          className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none"
                          disabled={!isAdmin}
                        />
                        {isFetchingCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                      </div>
                    </div>
                  </div>

                </div>

                {isAdmin && (
                  <button
                    type="submit"
                    disabled={isSavingCompany}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingCompany ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Salvar Configurações</span>
                  </button>
                )}
              </form>
            )}

            {/* TAB 2: Users Management */}
            {activeTab === "users" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Users List Table (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Usuários do Sistema</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Vendedores e administradores que possuem acesso ao ERP.</p>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase">
                          <th className="p-3">Nome</th>
                          <th className="p-3">E-mail</th>
                          <th className="p-3">Permissão</th>
                          {isAdmin && <th className="p-3 text-center">Ações</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {usersList.map((u) => (
                          <tr key={u.id} className="hover:bg-muted/10">
                            <td className="p-3 font-semibold text-foreground">{u.name}</td>
                            <td className="p-3 text-muted-foreground">{u.email}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                                u.role === "ADMIN"
                                  ? "bg-zinc-900/10 text-zinc-900 border-zinc-900/20 dark:bg-zinc-100/10 dark:text-zinc-100"
                                  : u.role === "DEV"
                                  ? "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400"
                                  : "bg-secondary text-muted-foreground border-border"
                              }`}>
                                {u.role === "ADMIN" ? "Administrador" : u.role === "DEV" ? "Desenvolvedor" : "Vendedor"}
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  disabled={isDeletingUser === u.id}
                                  className="p-1 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-500/10 cursor-pointer disabled:opacity-50"
                                  title="Excluir Usuário"
                                >
                                  {isDeletingUser === u.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Create User Form (5 cols) */}
                <div className="lg:col-span-5 bg-muted/20 border border-border p-5 rounded-2xl space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Novo Usuário</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Cadastre um novo perfil vendedor/admin.</p>
                  </div>

                  {isAdmin ? (
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      {/* Nome */}
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                          Nome Completo
                        </label>
                        <input
                          type="text"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Diego Apple"
                          className="w-full px-3.5 py-2.5 bg-card border border-border text-foreground rounded-xl text-xs focus:outline-none"
                          required
                        />
                      </div>

                      {/* E-mail */}
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                          E-mail
                        </label>
                        <input
                          type="email"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="vendedor@diegoapple.store"
                          className="w-full px-3.5 py-2.5 bg-card border border-border text-foreground rounded-xl text-xs focus:outline-none"
                          required
                        />
                      </div>

                      {/* Senha */}
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                          Senha Provisória
                        </label>
                        <input
                          type="password"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3.5 py-2.5 bg-card border border-border text-foreground rounded-xl text-xs focus:outline-none"
                          required
                        />
                      </div>

                      {/* Permissão */}
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                          Nível de Acesso
                        </label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 bg-card border border-border text-foreground rounded-xl text-xs focus:outline-none"
                        >
                          <option value="SELLER">Vendedor (Sellers/POS)</option>
                          <option value="ADMIN">Administrador (Total)</option>
                          <option value="DEV">Desenvolvedor (DEV)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={isCreatingUser}
                        className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs shadow-sm hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isCreatingUser ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <PlusCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Adicionar Usuário</span>
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground flex flex-col items-center gap-2 select-none">
                      <ShieldCheck className="w-6 h-6 text-muted-foreground/60" />
                      <span>Somente administradores possuem autorização para gerenciar acessos de usuários.</span>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 3: Audit Logs */}
            {activeTab === "logs" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Registro de Auditoria</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Histórico completo de ações e movimentações executadas no banco de dados.</p>
                </div>

                <div className="border border-border rounded-xl overflow-hidden shadow-sm max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase select-none sticky top-0 z-10">
                        <th className="p-3">Horário</th>
                        <th className="p-3">Operador</th>
                        <th className="p-3">Ação</th>
                        <th className="p-3">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-muted-foreground">
                            Nenhum log registrado até o momento.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-muted/10">
                            <td className="p-3 text-muted-foreground font-medium flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground/80" />
                              <span>{formatDate(log.createdAt)}</span>
                            </td>
                            <td className="p-3 font-semibold text-foreground">
                              {log.user ? (
                                <div>
                                  <p className="leading-tight">{log.user.name}</p>
                                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{log.user.email}</p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">Sistema</span>
                              )}
                            </td>
                            <td className="p-3 font-bold text-foreground">
                              <span className="px-2 py-0.5 bg-secondary text-foreground border border-border rounded-full text-[9px] uppercase tracking-wider">
                                {log.action.replace("_", " ")}
                              </span>
                            </td>
                            <td className="p-3 text-muted-foreground leading-relaxed font-medium">
                              {log.details}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
