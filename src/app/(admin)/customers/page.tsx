"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { maskCPF, maskRG, maskPhone, maskDate, maskCEP } from "@/lib/masks";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  X,
  UserPlus,
  AlertCircle,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  cpf: string;
  rg: string | null;
  birthDate: string | null;
  phone: string;
  whatsApp: string | null;
  email: string | null;
  address: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  notes: string | null;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsApp, setWhatsApp] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [notes, setNotes] = useState("");

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
      } else {
        showToast("Erro ao carregar clientes", "error");
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
      loadCustomers();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, loadCustomers]);

  const resetAddressFields = () => {
    setCep("");
    setAddress("");
    setAddressNumber("");
    setNeighborhood("");
    setCity("");
    setAddrState("");
  };

  const openNewModal = () => {
    setEditingId(null);
    setName("");
    setCpf("");
    setRg("");
    setBirthDate("");
    setPhone("");
    setWhatsApp("");
    setEmail("");
    resetAddressFields();
    setNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingId(c.id);
    setName(c.name);
    setCpf(maskCPF(c.cpf));
    setRg(c.rg ? maskRG(c.rg) : "");
    setBirthDate(c.birthDate ? new Date(c.birthDate).toLocaleDateString("pt-BR") : "");
    setPhone(maskPhone(c.phone));
    setWhatsApp(c.whatsApp ? maskPhone(c.whatsApp) : "");
    setEmail(c.email || "");
    setCep(c.cep ? maskCEP(c.cep) : "");
    setAddress(c.address || "");
    setAddressNumber(c.addressNumber || "");
    setNeighborhood(c.neighborhood || "");
    setCity(c.city || "");
    setAddrState(c.state || "");
    setNotes(c.notes || "");
    setIsModalOpen(true);
  };

  const handleCepBlur = async () => {
    const raw = cep.replace(/\D/g, "");
    if (raw.length !== 8) return;
    setIsFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setAddrState(data.uf || "");
        // Foca no campo número após preenchimento
        document.getElementById("addressNumber")?.focus();
      }
    } catch {
      // ViaCEP indisponível — usuário preenche manualmente
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name || !cpf || !phone) {
      showToast("Por favor, preencha os campos obrigatórios (*)", "warning");
      return;
    }

    setIsSubmitting(true);

    // Limpar máscaras para salvar no banco
    const rawCpf = cpf.replace(/\D/g, "");
    const rawPhone = phone.replace(/\D/g, "");
    const rawWhatsApp = whatsApp.replace(/\D/g, "");
    
    let formattedBirthDate = null;
    if (birthDate) {
      const parts = birthDate.split("/");
      if (parts.length === 3) {
        formattedBirthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    const payload = {
      name,
      cpf: rawCpf,
      rg: rg || null,
      birthDate: formattedBirthDate,
      phone: rawPhone,
      whatsApp: rawWhatsApp || null,
      email: email || null,
      address: address || null,
      addressNumber: addressNumber || null,
      neighborhood: neighborhood || null,
      city: city || null,
      state: addrState || null,
      cep: cep.replace(/\D/g, "") || null,
      notes: notes || null,
    };

    try {
      const url = editingId ? `/api/customers/${editingId}` : "/api/customers";
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
        loadCustomers();
      } else {
        showToast(data.error || "Ocorreu um erro ao salvar o cliente", "error");
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
      const res = await fetch(`/api/customers/${deleteConfirmId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, "success");
        setDeleteConfirmId(null);
        loadCustomers();
      } else {
        showToast(data.error || "Não foi possível excluir o cliente", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar com o servidor", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-8 h-8 text-muted-foreground" />
            <span>Gestão de Clientes</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre novos clientes e consulte o histórico de compras, contratos e parcelas.
          </p>
        </div>
        
        <button
          onClick={openNewModal}
          className="flex items-center justify-center gap-2 px-4.5 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-sm hover:opacity-90 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
          <Search className="w-4.5 h-4.5" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, CPF ou telefone..."
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all duration-200"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="text-sm">Carregando lista de clientes...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">CPF / RG</th>
                  <th className="px-6 py-4">Telefone / WhatsApp</th>
                  <th className="px-6 py-4">E-mail</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {c.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground font-medium">{maskCPF(c.cpf)}</div>
                      {c.rg && <div className="text-xs text-muted-foreground">RG: {c.rg}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground font-medium">{maskPhone(c.phone)}</div>
                      {c.whatsApp && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          Whats: {maskPhone(c.whatsApp)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {c.email || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/customers/${c.id}`}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                          title="Ver Histórico Completo"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(c.id)}
                          className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Registration/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-in">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-muted-foreground" />
                <span>{editingId ? "Editar Cliente" : "Cadastrar Novo Cliente"}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Diego Silva Araujo"
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                    required
                  />
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    CPF *
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                    required
                  />
                </div>

                {/* RG */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    RG
                  </label>
                  <input
                    type="text"
                    value={rg}
                    onChange={(e) => setRg(maskRG(e.target.value))}
                    placeholder="00.000.000-0"
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  />
                </div>

                {/* Data de Nascimento */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Data de Nascimento
                  </label>
                  <input
                    type="text"
                    value={birthDate}
                    onChange={(e) => setBirthDate(maskDate(e.target.value))}
                    placeholder="DD/MM/AAAA"
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@exemplo.com"
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  />
                </div>

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
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                    required
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    WhatsApp (Opcional)
                  </label>
                  <input
                    type="text"
                    value={whatsApp}
                    onChange={(e) => setWhatsApp(maskPhone(e.target.value))}
                    placeholder="(21) 99999-9999"
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  />
                </div>

                {/* Seção Endereço */}
                <div className="col-span-2 pt-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 border-t border-border pt-3">
                    Endereço
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* CEP */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                        CEP
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cep}
                          onChange={(e) => setCep(maskCEP(e.target.value))}
                          onBlur={handleCepBlur}
                          placeholder="00000-000"
                          maxLength={9}
                          className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring pr-9"
                        />
                        {isFetchingCep && (
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Número */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                        Número
                      </label>
                      <input
                        id="addressNumber"
                        type="text"
                        value={addressNumber}
                        onChange={(e) => setAddressNumber(e.target.value)}
                        placeholder="983"
                        className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                      />
                    </div>

                    {/* Rua/Logradouro */}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                        Endereço (Rua / Av.)
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Rua Castro Alves"
                        className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                      />
                    </div>

                    {/* Bairro */}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Ipioca"
                        className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                      />
                    </div>

                    {/* Cidade */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Maceió"
                        className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                      />
                    </div>

                    {/* Estado */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                        Estado (UF)
                      </label>
                      <input
                        type="text"
                        value={addrState}
                        onChange={(e) => setAddrState(e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="AL"
                        maxLength={2}
                        className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                      />
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Observações Internas
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Anotações relevantes sobre o cliente..."
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
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
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Cliente</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6 animate-slide-in">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">Excluir Registro de Cliente?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Tem certeza que deseja excluir as informações deste cliente? Essa ação é permanente e registrará um log no sistema.
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
