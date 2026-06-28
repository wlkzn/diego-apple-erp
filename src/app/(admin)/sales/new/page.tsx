"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { maskMoney, parseMoneyToFloat, maskCPF, maskRG, maskPhone, maskDate, maskCEP } from "@/lib/masks";
import { BRAND_NAMES, getModels, COLORS, STORAGE_OPTIONS } from "@/lib/deviceData";
import {
  ShoppingBag,
  Search,
  User,
  Plus,
  Minus,
  Trash2,
  Percent,
  CheckCircle,
  X,
  Loader2,
  FileText,
  FileDown,
  Printer,
  ChevronRight,
  Info,
  UserPlus,
  Share2,
  Mail,
  RefreshCcw,
  Camera,
  Smartphone,
} from "lucide-react";

const CHECKLIST_ITEMS = [
  { key: "screenOk",      label: "Tela sem trincas" },
  { key: "touchOk",       label: "Touch funcionando" },
  { key: "faceIdOk",      label: "Face ID / Biometria funcionando" },
  { key: "camerasOk",     label: "Câmeras funcionando" },
  { key: "speakersOk",    label: "Alto-falantes funcionando" },
  { key: "micOk",         label: "Microfone funcionando" },
  { key: "buttonsOk",     label: "Botões funcionando" },
  { key: "chargingOk",    label: "Carregamento funcionando" },
  { key: "wifiOk",        label: "Wi-Fi funcionando" },
  { key: "bluetoothOk",   label: "Bluetooth funcionando" },
  { key: "mobileNetOk",   label: "Rede móvel funcionando" },
  { key: "batteryOk",     label: "Bateria em bom estado" },
  { key: "unlockedOk",    label: "Aparelho desbloqueado" },
  { key: "noAccountOk",   label: "Sem conta Google/iCloud bloqueada" },
  { key: "noOxidationOk", label: "Sem sinais de oxidação" },
];

interface Customer {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  rg?: string | null;
  email?: string | null;
  address?: string | null;
}

interface Product {
  id: string;
  brand: string;
  model: string;
  color: string;
  storage: string;
  sellingPrice: number;
  quantity: number;
  imei: string | null;
  serialNumber: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
  customPrice: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Selection States
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Checkout States
  const [discountInput, setDiscountInput] = useState("");
  const [downPaymentInput, setDownPaymentInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [installmentCount, setInstallmentCount] = useState(1);
  const [installmentDueDay, setInstallmentDueDay] = useState(10);

  // Search States
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // loading & success states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [createdSale, setCreatedSale] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);

  // Trade-in states
  const [tradeInEnabled, setTradeInEnabled] = useState(false);
  const [tiChecklist, setTiChecklist] = useState<Record<string, boolean | null>>({});
  const [tiBrand, setTiBrand] = useState("");
  const [tiModel, setTiModel] = useState("");
  const [tiColor, setTiColor] = useState("");
  const [tiStorage, setTiStorage] = useState("");
  const [tiImei1, setTiImei1] = useState("");
  const [tiImei2, setTiImei2] = useState("");
  const [tiSerial, setTiSerial] = useState("");
  const [tiCarrier, setTiCarrier] = useState("");
  const [tiEvalPrice, setTiEvalPrice] = useState("");
  const [tiCondition, setTiCondition] = useState("Bom");
  const [tiNotes, setTiNotes] = useState("");
  const [tiPhotos, setTiPhotos] = useState<string[]>([]);
  const [tiCustomColor, setTiCustomColor] = useState("");
  const [tiCustomStorage, setTiCustomStorage] = useState("");
  const [tiShowModelDropdown, setTiShowModelDropdown] = useState(false);
  const [tiModelSearch, setTiModelSearch] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const tiModelDropdownRef = useRef<HTMLDivElement>(null);

  const tiFilteredModels = useMemo(() => {
    const models = getModels(tiBrand);
    if (!tiModelSearch) return models;
    return models.filter((m) => m.toLowerCase().includes(tiModelSearch.toLowerCase()));
  }, [tiBrand, tiModelSearch]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tiModelDropdownRef.current && !tiModelDropdownRef.current.contains(e.target as Node)) {
        setTiShowModelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Customer creation modal states
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [custName, setCustName] = useState("");
  const [custCpf, setCustCpf] = useState("");
  const [custRg, setCustRg] = useState("");
  const [custBirthDate, setCustBirthDate] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custWhatsApp, setCustWhatsApp] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custCep, setCustCep] = useState("");
  const [custStreet, setCustStreet] = useState("");
  const [custAddrNumber, setCustAddrNumber] = useState("");
  const [custNeighborhood, setCustNeighborhood] = useState("");
  const [custCity, setCustCity] = useState("");
  const [custAddrState, setCustAddrState] = useState("");
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [custNotes, setCustNotes] = useState("");
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);


  // Load active customers & products
  const loadData = useCallback(async () => {
    try {
      const custRes = await fetch("/api/customers");
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(custData.customers);
      }

      const prodRes = await fetch("/api/products?status=AVAILABLE");
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products);
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao carregar dados auxiliares do PDV", "error");
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cart operations
  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.quantity) {
        showToast("Quantidade máxima em estoque atingida", "warning");
        return;
      }
      setCart(
        cart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1, customPrice: product.sellingPrice }]);
    }
    showToast(`${product.brand} ${product.model} adicionado`, "info");
  };

  const updateCartQty = (productId: string, val: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + val;
    if (newQty <= 0) {
      setCart(cart.filter((i) => i.product.id !== productId));
      return;
    }

    if (newQty > item.product.quantity) {
      showToast("Estoque máximo indisponível", "warning");
      return;
    }

    setCart(cart.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i)));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.product.id !== productId));
  };

  const updateCartItemPrice = (productId: string, valStr: string) => {
    const price = parseMoneyToFloat(valStr);
    setCart(cart.map((i) => (i.product.id === productId ? { ...i, customPrice: price } : i)));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.customPrice * item.quantity, 0);
  const discountVal = parseMoneyToFloat(discountInput);
  const tradeInVal = tradeInEnabled ? parseMoneyToFloat(tiEvalPrice) : 0;
  const netTotal = Math.max(subtotal - discountVal - tradeInVal, 0);
  const downPaymentVal = parseMoneyToFloat(downPaymentInput);
  const remainingTotal = Math.max(netTotal - downPaymentVal, 0);

  // Photo upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setTiPhotos((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const toggleChecklistItem = (key: string, val: boolean) => {
    setTiChecklist((prev) => ({ ...prev, [key]: prev[key] === val ? null : val }));
  };

  // Simulate installments list
  const simulatedInstallments = [];
  if (paymentMethod === "PARCELADO_LOJA" && remainingTotal > 0 && installmentCount > 0) {
    const instValue = parseFloat((remainingTotal / installmentCount).toFixed(2));
    let sum = 0;
    for (let i = 1; i <= installmentCount; i++) {
      let currentVal = instValue;
      if (i === installmentCount) {
        currentVal = parseFloat((remainingTotal - sum).toFixed(2));
      }
      sum += currentVal;

      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      date.setDate(Math.min(installmentDueDay, lastDay));
      simulatedInstallments.push({
        num: i,
        val: currentVal,
        date: date.toLocaleDateString("pt-BR"),
      });
    }
  }

  // Checkout: validação + abre modal de confirmação
  const handleClickFinalize = () => {
    if (!selectedCustomerId) {
      showToast("Selecione um cliente para prosseguir", "warning");
      return;
    }
    if (cart.length === 0) {
      showToast("O carrinho de vendas está vazio", "warning");
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);

    if (paymentMethod === "PARCELADO_LOJA") {
      if (remainingTotal <= 0) {
        showToast("Venda parcelada exige valor restante maior que zero", "warning");
        return;
      }
      if (!customer?.name || !customer?.cpf || !customer?.rg || !customer?.phone || !customer?.address) {
        showToast(
          "Para vendas parceladas na loja, o cliente deve ter todos os dados cadastrados (Nome, CPF, RG, Telefone e Endereço) para fins de contrato legal.",
          "error"
        );
        return;
      }
    }

    if (downPaymentVal > netTotal) {
      showToast("O valor da entrada não pode ser maior que o total líquido", "warning");
      return;
    }

    if (tradeInEnabled && (!tiBrand || !tiModel || !tiColor || !tiStorage || !tiEvalPrice)) {
      showToast("Preencha todos os campos obrigatórios do Trade-in", "warning");
      return;
    }

    setShowConfirmModal(true);
  };

  // Checkout: execução real após confirmação
  const handleConfirmSale = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);

    const payload: any = {
      customerId: selectedCustomerId,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.customPrice,
      })),
      discountAmount: discountVal,
      downPayment: downPaymentVal,
      paymentMethod,
      installmentCount: paymentMethod === "PARCELADO_LOJA" ? installmentCount : 1,
      installmentDueDay: paymentMethod === "PARCELADO_LOJA" ? installmentDueDay : 10,
    };

    if (tradeInEnabled) {
      payload.tradeIn = {
        brand: tiBrand, model: tiModel, color: tiColor, storage: tiStorage,
        imei1: tiImei1, imei2: tiImei2 || null, serialNumber: tiSerial || null,
        carrier: tiCarrier || null, evaluationPrice: parseMoneyToFloat(tiEvalPrice),
        condition: tiCondition, notes: tiNotes || null,
        photos: tiPhotos.length > 0 ? JSON.stringify(tiPhotos) : null,
        checklist: JSON.stringify(tiChecklist),
      };
    }

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        showToast("Venda finalizada com sucesso!", "success");
        setCreatedSale(data.sale);
        setCompany(data.companySettings);
      } else {
        showToast(data.error || "Erro ao processar venda", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar com o servidor", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustCepBlur = async () => {
    const rawCep = custCep.replace(/\D/g, "");
    if (rawCep.length !== 8) return;
    setIsFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      if (res.ok) {
        const data = await res.json();
        if (!data.erro) {
          setCustStreet(data.logradouro || "");
          setCustNeighborhood(data.bairro || "");
          setCustCity(data.localidade || "");
          setCustAddrState(data.uf || "");
          setTimeout(() => document.getElementById("custAddrNumber")?.focus(), 100);
        }
      }
    } catch { /* silent — usuário pode preencher manualmente */ } finally {
      setIsFetchingCep(false);
    }
  };

  const handleSaveCustomer = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!custName || !custCpf || !custPhone) {
      showToast("Por favor, preencha os campos obrigatórios (*)", "warning");
      return;
    }

    setIsSavingCustomer(true);

    // Limpar máscaras para salvar no banco
    const rawCpf = custCpf.replace(/\D/g, "");
    const rawPhone = custPhone.replace(/\D/g, "");
    const rawWhatsApp = custWhatsApp.replace(/\D/g, "");
    
    let formattedBirthDate = null;
    if (custBirthDate) {
      const parts = custBirthDate.split("/");
      if (parts.length === 3) {
        formattedBirthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    const payload = {
      name: custName,
      cpf: rawCpf,
      rg: custRg || null,
      birthDate: formattedBirthDate,
      phone: rawPhone,
      whatsApp: rawWhatsApp || null,
      email: custEmail || null,
      address: custStreet || null,
      addressNumber: custAddrNumber || null,
      neighborhood: custNeighborhood || null,
      city: custCity || null,
      state: custAddrState || null,
      cep: custCep.replace(/\D/g, "") || null,
      notes: custNotes || null,
    };

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, "success");
        setIsCustomerModalOpen(false);
        // Recarregar lista e autoselecionar
        const custRes = await fetch("/api/customers");
        if (custRes.ok) {
          const custData = await custRes.json();
          setCustomers(custData.customers);
          setSelectedCustomerId(data.customer.id);
        }
        // Limpar campos
        setCustName("");
        setCustCpf("");
        setCustRg("");
        setCustBirthDate("");
        setCustPhone("");
        setCustWhatsApp("");
        setCustEmail("");
        setCustCep(""); setCustStreet(""); setCustAddrNumber("");
        setCustNeighborhood(""); setCustCity(""); setCustAddrState("");
        setCustNotes("");
      } else {
        showToast(data.error || "Erro ao salvar cliente", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar com o servidor", "error");
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!createdSale || !company) return;
    const customerObj = createdSale.customer || selectedCustomer;
    if (!customerObj) return;
    const phone = customerObj.phone.replace(/\D/g, "");
    const message = `Olá, ${customerObj.name}! Segue o comprovante da sua compra na ${company.name}:\n\n` +
      `Venda #${String(createdSale.saleNumber).padStart(5, "0")}\n` +
      `Total: ${formatBRL(createdSale.netAmount)}\n` +
      `Forma de Pagamento: ${createdSale.paymentMethod.replace("_", " ")}\n\n` +
      `Agradecemos a preferência!`;
    
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleEmailShare = () => {
    if (!createdSale || !company) return;
    const customerObj = createdSale.customer || selectedCustomer;
    if (!customerObj || !customerObj.email) {
      showToast("Cliente não possui e-mail cadastrado", "warning");
      return;
    }
    const email = customerObj.email;
    const subject = `Comprovante de Compra #${String(createdSale.saleNumber).padStart(5, "0")} - ${company.name}`;
    const body = `Olá, ${customerObj.name},\n\nObrigado por comprar conosco!\n\n` +
      `Detalhes do seu pedido:\n` +
      `Venda número: #${String(createdSale.saleNumber).padStart(5, "0")}\n` +
      `Valor total: ${formatBRL(createdSale.netAmount)}\n` +
      `Método de pagamento: ${createdSale.paymentMethod.replace("_", " ")}\n\n` +
      `Atenciosamente,\n${company.name}`;
    
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };


  const handleReset = () => {
    setCart([]);
    setSelectedCustomerId("");
    setCustomerSearch("");
    setDiscountInput("");
    setDownPaymentInput("");
    setPaymentMethod("PIX");
    setInstallmentCount(1);
    setInstallmentDueDay(10);
    setCreatedSale(null);
    setTradeInEnabled(false);
    setTiBrand(""); setTiModel(""); setTiModelSearch(""); setTiColor(""); setTiStorage("");
    setTiCustomColor(""); setTiCustomStorage(""); setTiShowModelDropdown(false);
    setTiImei1(""); setTiImei2(""); setTiSerial(""); setTiCarrier("");
    setTiEvalPrice(""); setTiCondition("Bom"); setTiNotes("");
    setTiPhotos([]); setTiChecklist({});
    loadData();
  };

  // Filter lists based on typing
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.cpf.includes(customerSearch.replace(/\D/g, ""))
  );

  const filteredProducts = products.filter(
    (p) =>
      p.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.model.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.imei && p.imei.includes(productSearch))
  );

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <ShoppingBag className="w-8 h-8 text-muted-foreground" />
          <span>Frente de Caixa (PDV)</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Efetue novas vendas, aplique descontos, lance entradas e parcele diretamente na conta da loja.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Cart & Calculations (7/12 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Customer Selection */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>Cliente da Venda *</span>
            </h3>

            <div className="flex gap-2 relative">
              {selectedCustomerId ? (
                <div className="flex items-center justify-between p-3.5 bg-secondary border border-border rounded-xl w-full">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{selectedCustomer?.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      CPF: {selectedCustomer?.cpf} {selectedCustomer?.rg ? `| RG: ${selectedCustomer.rg}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId("");
                      setCustomerSearch("");
                    }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer border-0 bg-transparent"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      placeholder="Pesquisar cliente por nome ou CPF..."
                      className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                    />
                    {isCustomerDropdownOpen && customerSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-border">
                        {filteredCustomers.length === 0 ? (
                          <div className="p-3 text-xs text-muted-foreground text-center">
                            Nenhum cliente cadastrado com esse critério.
                          </div>
                        ) : (
                          filteredCustomers.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                setIsCustomerDropdownOpen(false);
                              }}
                              className="p-3 text-xs font-semibold hover:bg-muted cursor-pointer flex items-center justify-between text-foreground"
                            >
                              <span>{c.name}</span>
                              <span className="text-[10px] text-muted-foreground">CPF: {c.cpf}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="flex items-center gap-1 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-sm border-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Cadastrar</span>
                  </button>
                </>
              )}
            </div>

          </div>

          {/* Carrinho de Compras */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground">Aparelhos no Carrinho</h3>

            {cart.length === 0 ? (
              <div className="p-8 text-center text-sm border border-dashed border-border rounded-xl text-muted-foreground">
                Selecione aparelhos no catálogo à direita para adicionar ao carrinho.
              </div>
            ) : (
              <div className="space-y-3.5 divide-y divide-border/60">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-start justify-between gap-4 pt-3.5 first:pt-0">
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-foreground">
                        {item.product.brand} {item.product.model}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        ({item.product.color}, {item.product.storage}) 
                        {item.product.imei && ` | IMEI: ${item.product.imei}`}
                      </p>
                      {/* Price Customizer */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Preço un.:</span>
                        <input
                          type="text"
                          value={maskMoney(item.customPrice)}
                          onChange={(e) => updateCartItemPrice(item.product.id, e.target.value)}
                          className="px-2 py-0.5 bg-input border border-border rounded-lg text-xs font-bold text-foreground w-24 text-right focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 text-right">
                      {/* Quantity selector */}
                      <div className="flex items-center border border-border rounded-lg bg-input overflow-hidden">
                        <button
                          onClick={() => updateCartQty(item.product.id, -1)}
                          className="p-1.5 hover:bg-muted text-foreground cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-foreground">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQty(item.product.id, 1)}
                          className="p-1.5 hover:bg-muted text-foreground cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-2 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout Configs */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Método de Pagamento */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                Forma de Pagamento *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
              >
                <option value="PIX">PIX</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="CARTAO">Cartão</option>
                <option value="BOLETO">Boleto</option>
                <option value="PARCELADO_LOJA">Parcelado na Loja</option>
              </select>
            </div>

            {/* Desconto Geral */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                Desconto Geral
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Percent className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(maskMoney(e.target.value))}
                  placeholder="R$ 0,00"
                  className="w-full pl-9 pr-3 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Configs adicionais para parcelamento na loja */}
            {paymentMethod === "PARCELADO_LOJA" && (
              <>
                {/* Entrada (Down payment) */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Entrada / Sinal (Down Payment)
                  </label>
                  <input
                    type="text"
                    value={downPaymentInput}
                    onChange={(e) => setDownPaymentInput(maskMoney(e.target.value))}
                    placeholder="R$ 0,00"
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                {/* Quantidade de Parcelas */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Número de Parcelas
                  </label>
                  <select
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  >
                    {[...Array(24)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}x
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dia de Vencimento */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Dia de Vencimento das Parcelas
                  </label>
                  <select
                    value={installmentDueDay}
                    onChange={(e) => setInstallmentDueDay(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  >
                    {[5, 10, 15, 20, 25].map((d) => (
                      <option key={d} value={d}>Dia {d} (recomendado)</option>
                    ))}
                    {[...Array(31)].filter((_, i) => ![5, 10, 15, 20, 25].includes(i + 1)).map((_, i) => {
                      const day = [1,2,3,4,6,7,8,9,11,12,13,14,16,17,18,19,21,22,23,24,26,27,28,29,30,31][i];
                      return <option key={day} value={day}>Dia {day}</option>;
                    })}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Trade-in Section */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                  <RefreshCcw className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Receber aparelho como parte do pagamento</p>
                  <p className="text-xs text-muted-foreground">Trade-in — aparelho usado abate o valor da compra</p>
                </div>
              </div>
              <button
                id="tradein-toggle"
                type="button"
                onClick={() => setTradeInEnabled(!tradeInEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer border-0 ${tradeInEnabled ? "bg-amber-500" : "bg-muted"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${tradeInEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {/* Trade-in Form */}
            {tradeInEnabled && (
              <div className="border-t border-border pt-5 space-y-5 animate-in fade-in duration-200">
                {/* Dados Básicos */}
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5" />Dados do Aparelho
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Marca — dropdown */}
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Marca *</label>
                      <select
                        value={tiBrand}
                        onChange={(e) => { setTiBrand(e.target.value); setTiModel(""); setTiModelSearch(""); }}
                        className="w-full px-3 py-2 bg-input border border-border text-foreground rounded-xl text-xs focus:outline-none"
                        required
                      >
                        <option value="">Selecione...</option>
                        {BRAND_NAMES.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>

                    {/* Modelo — combobox */}
                    <div ref={tiModelDropdownRef} className="relative">
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Modelo *</label>
                      <input
                        value={tiModel || tiModelSearch}
                        onChange={(e) => {
                          setTiModelSearch(e.target.value);
                          setTiModel("");
                          setTiShowModelDropdown(true);
                        }}
                        onFocus={() => setTiShowModelDropdown(true)}
                        placeholder={tiBrand ? "Buscar modelo..." : "Escolha a marca primeiro"}
                        disabled={!tiBrand}
                        className="w-full px-3 py-2 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-xs focus:outline-none disabled:opacity-50"
                        required
                      />
                      {tiShowModelDropdown && tiBrand && tiFilteredModels.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-30 max-h-40 overflow-y-auto">
                          {tiFilteredModels.map((m) => (
                            <div
                              key={m}
                              onMouseDown={() => { setTiModel(m); setTiModelSearch(m); setTiShowModelDropdown(false); }}
                              className="px-3 py-1.5 text-xs hover:bg-muted cursor-pointer text-foreground"
                            >
                              {m}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Cor — dropdown + campo livre */}
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Cor *</label>
                      <select
                        value={COLORS.includes(tiColor) ? tiColor : "Outra"}
                        onChange={(e) => {
                          if (e.target.value === "Outra") { setTiColor(""); setTiCustomColor(""); }
                          else { setTiColor(e.target.value); setTiCustomColor(""); }
                        }}
                        className="w-full px-3 py-2 bg-input border border-border text-foreground rounded-xl text-xs focus:outline-none"
                        required
                      >
                        <option value="">Selecione...</option>
                        {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {(!COLORS.includes(tiColor) || tiColor === "") && (
                        <input
                          value={tiCustomColor}
                          onChange={(e) => { setTiCustomColor(e.target.value); setTiColor(e.target.value); }}
                          placeholder="Digite a cor..."
                          className="w-full mt-1 px-3 py-2 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-xs focus:outline-none"
                        />
                      )}
                    </div>

                    {/* Armazenamento — dropdown + campo livre */}
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Armazenamento *</label>
                      <select
                        value={STORAGE_OPTIONS.includes(tiStorage) ? tiStorage : "Outro"}
                        onChange={(e) => {
                          if (e.target.value === "Outro") { setTiStorage(""); setTiCustomStorage(""); }
                          else { setTiStorage(e.target.value); setTiCustomStorage(""); }
                        }}
                        className="w-full px-3 py-2 bg-input border border-border text-foreground rounded-xl text-xs focus:outline-none"
                        required
                      >
                        <option value="">Selecione...</option>
                        {STORAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {(!STORAGE_OPTIONS.includes(tiStorage) || tiStorage === "") && (
                        <input
                          value={tiCustomStorage}
                          onChange={(e) => { setTiCustomStorage(e.target.value); setTiStorage(e.target.value); }}
                          placeholder="Ex: 64GB, 512GB..."
                          className="w-full mt-1 px-3 py-2 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-xs focus:outline-none"
                        />
                      )}
                    </div>

                    {/* IMEI 1 (opcional) */}
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">IMEI 1</label>
                      <input value={tiImei1} onChange={(e) => setTiImei1(e.target.value.replace(/\D/g, "").slice(0, 15))} placeholder="15 dígitos (opcional)" className="w-full px-3 py-2 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">IMEI 2</label>
                      <input value={tiImei2} onChange={(e) => setTiImei2(e.target.value.replace(/\D/g, "").slice(0, 15))} placeholder="Opcional" className="w-full px-3 py-2 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Número de Série</label>
                      <input value={tiSerial} onChange={(e) => setTiSerial(e.target.value)} placeholder="Opcional" className="w-full px-3 py-2 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Operadora</label>
                      <input value={tiCarrier} onChange={(e) => setTiCarrier(e.target.value)} placeholder="Vivo, Claro, Tim..." className="w-full px-3 py-2 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Valor de Avaliação *</label>
                      <input value={tiEvalPrice} onChange={(e) => setTiEvalPrice(maskMoney(e.target.value))} placeholder="R$ 0,00" className="w-full px-3 py-2 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-xs focus:outline-none" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Estado de Conservação *</label>
                      <select value={tiCondition} onChange={(e) => setTiCondition(e.target.value)} className="w-full px-3 py-2 bg-input border border-border text-foreground rounded-xl text-xs focus:outline-none">
                        {["Novo","Excelente","Bom","Regular","Ruim"].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Observações</label>
                      <textarea value={tiNotes} onChange={(e) => setTiNotes(e.target.value)} rows={2} placeholder="Riscos, amassados, anotações gerais..." className="w-full px-3 py-2 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-xs focus:outline-none resize-none" />
                    </div>
                  </div>
                </div>

                {/* Fotos */}
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5" />Fotos do Aparelho
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {tiPhotos.map((photo, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-border bg-muted group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt={`Foto ${i+1}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setTiPhotos(tiPhotos.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer border-0">
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => photoInputRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-all cursor-pointer bg-transparent">
                      <Plus className="w-5 h-5" />
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                  </div>
                </div>

                {/* Checklist */}
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Checklist de Avaliação</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {CHECKLIST_ITEMS.map(({ key, label }) => {
                      const val = tiChecklist[key];
                      return (
                        <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                          <span className="text-xs text-foreground font-medium">{label}</span>
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => toggleChecklistItem(key, true)} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border-0 ${val === true ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground hover:bg-emerald-500/20"}`}>OK</button>
                            <button type="button" onClick={() => toggleChecklistItem(key, false)} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border-0 ${val === false ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground hover:bg-rose-500/20"}`}>Defeito</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Trade-in Value Summary */}
                {parseMoneyToFloat(tiEvalPrice) > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Aparelho deduzido da venda:</span>
                    <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">- {formatBRL(parseMoneyToFloat(tiEvalPrice))}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Catalogue & Summary (5/12 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Catalogue Grid */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Catálogo de Aparelhos</h3>
              <span className="text-[10px] bg-secondary border border-border text-foreground px-2 py-0.5 rounded-full font-bold">
                {filteredProducts.length} itens
              </span>
            </div>

            {/* Search Catalogue */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar marca, modelo, IMEI..."
                className="w-full pl-9 pr-3 py-2 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
              />
            </div>

            {/* Catalogue list */}
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Nenhum aparelho disponível no momento.
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="p-3 border border-border bg-muted/20 hover:bg-muted/50 rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-bold text-xs text-foreground">{p.brand} {p.model}</p>
                      <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">
                        {p.storage} | {p.color} ({p.quantity} disponíveis)
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-xs font-extrabold text-foreground">{formatBRL(p.sellingPrice)}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Checkout Summary Card */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground">Resumo da Venda</h3>

            <div className="space-y-2 text-xs font-semibold">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal dos itens</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Desconto</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">- {formatBRL(discountVal)}</span>
              </div>
              {tradeInEnabled && tradeInVal > 0 && (
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-bold">
                  <span className="flex items-center gap-1">
                    <RefreshCcw className="w-3 h-3" />
                    Trade-in
                  </span>
                  <span>- {formatBRL(tradeInVal)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-extrabold text-foreground border-t border-border pt-2 mt-2">
                <span>Valor a Pagar</span>
                <span>{formatBRL(netTotal)}</span>
              </div>

              {paymentMethod === "PARCELADO_LOJA" && (
                <div className="border-t border-border/80 pt-2.5 mt-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Sinal / Entrada</span>
                    <span>{formatBRL(downPaymentVal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-foreground font-bold">
                    <span>Saldo Parcelado</span>
                    <span>{formatBRL(remainingTotal)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-relaxed flex items-start gap-1 bg-muted/40 p-2.5 rounded-lg border border-border mt-1">
                    <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span>
                      Gerando {installmentCount} parcela(s) de{" "}
                      <span className="font-extrabold text-foreground">
                        {formatBRL(parseFloat((remainingTotal / installmentCount).toFixed(2)))}
                      </span>{" "}
                      com vencimento todo dia <span className="font-extrabold text-foreground">{installmentDueDay}</span> de cada mês.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleClickFinalize}
              disabled={isSubmitting}
              className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-sm hover:opacity-90 active:scale-98 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando Venda...</span>
                </>
              ) : (
                <>
                  <span>Finalizar e Registrar Venda</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Modal de Confirmação de Venda */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-black text-foreground">Confirmar Venda</h2>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted cursor-pointer border-0 bg-transparent text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">

              {/* Cliente */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Cliente</p>
                <div className="bg-muted/30 border border-border rounded-xl p-3">
                  <p className="font-bold text-sm text-foreground">{selectedCustomer?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">CPF: {selectedCustomer?.cpf}{selectedCustomer?.rg ? ` · RG: ${selectedCustomer.rg}` : ""}</p>
                </div>
              </div>

              {/* Produtos */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Produtos ({cart.length})</p>
                <div className="space-y-1.5">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between bg-muted/30 border border-border rounded-xl px-3 py-2.5">
                      <div>
                        <p className="text-xs font-bold text-foreground">{item.product.brand} {item.product.model}</p>
                        <p className="text-[10px] text-muted-foreground">{item.product.color} / {item.product.storage}{item.quantity > 1 ? ` × ${item.quantity}` : ""}</p>
                      </div>
                      <p className="text-xs font-extrabold text-foreground">{formatBRL(item.customPrice * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagamento */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Pagamento</p>
                <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Método</span>
                    <span className="font-bold">{paymentMethod === "PARCELADO_LOJA" ? "Parcelado na Loja" : paymentMethod}</span>
                  </div>
                  {paymentMethod === "PARCELADO_LOJA" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entrada</span>
                        <span className="font-bold">{formatBRL(downPaymentVal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parcelas</span>
                        <span className="font-bold">{installmentCount}× de {formatBRL(parseFloat((remainingTotal / installmentCount).toFixed(2)))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vencimento</span>
                        <span className="font-bold">Todo dia {installmentDueDay}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Trade-in */}
              {tradeInEnabled && tradeInVal > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Trade-in</p>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aparelho</span>
                      <span className="font-bold">{tiBrand} {tiModel} {tiStorage && `(${tiStorage})`}</span>
                    </div>
                    {tiImei1 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IMEI</span>
                        <span className="font-mono">{tiImei1}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor abatido</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">— {formatBRL(tradeInVal)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo Financeiro */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Resumo Financeiro</p>
                <div className="border border-border rounded-xl overflow-hidden text-xs">
                  <div className="divide-y divide-border">
                    <div className="flex justify-between px-3 py-2 text-muted-foreground">
                      <span>Subtotal</span><span>{formatBRL(subtotal)}</span>
                    </div>
                    {discountVal > 0 && (
                      <div className="flex justify-between px-3 py-2 text-rose-600 dark:text-rose-400">
                        <span>Desconto</span><span>— {formatBRL(discountVal)}</span>
                      </div>
                    )}
                    {tradeInVal > 0 && (
                      <div className="flex justify-between px-3 py-2 text-amber-600 dark:text-amber-400">
                        <span>Trade-in</span><span>— {formatBRL(tradeInVal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between px-3 py-3 bg-foreground text-background font-black text-sm">
                      <span>TOTAL A PAGAR</span><span>{formatBRL(netTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="px-6 py-4 border-t border-border flex items-center gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 border border-border text-foreground font-semibold rounded-xl text-sm hover:bg-muted cursor-pointer transition-colors bg-transparent"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSale}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 border-0 transition-all"
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Processando...</span></>
                  : <span>Confirmar Venda</span>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal overlay (Voucher/Contract generation options) */}
      {createdSale && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 text-center animate-slide-in space-y-6">
            
            {/* Checked Icon */}
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-black tracking-tight text-foreground">Venda Finalizada!</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                A venda de número <span className="font-bold text-foreground">#{String(createdSale.saleNumber).padStart(5, "0")}</span> foi devidamente registrada no financeiro e estoque!
              </p>
            </div>

            {/* Document options grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-border py-6 my-2">
              
              {/* Comprovante */}
              <div className="p-4 bg-muted/20 border border-border hover:bg-muted/40 rounded-xl space-y-3 flex flex-col items-center">
                <Printer className="w-6 h-6 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-bold text-xs text-foreground">Comprovante de Venda</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Formato cupom térmico fiscal</p>
                </div>
                <button
                  onClick={() => router.push(`/reports/voucher?id=${createdSale.id}`)}
                  className="w-full mt-2 py-2 px-3 border border-border bg-card text-foreground hover:bg-muted text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Visualizar Comprovante</span>
                </button>
              </div>

              {/* Contrato (Conditional) */}
              <div className={`p-4 bg-muted/20 border border-border hover:bg-muted/40 rounded-xl space-y-3 flex flex-col items-center ${paymentMethod !== "PARCELADO_LOJA" ? "opacity-50 pointer-events-none" : ""}`}>
                <FileText className="w-6 h-6 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-bold text-xs text-foreground">Contrato de Parcelamento</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Com cláusulas e prazos</p>
                </div>
                <button
                  onClick={() => router.push(`/reports/contract?id=${createdSale.id}`)}
                  className="w-full mt-2 py-2 px-3 border border-border bg-card text-foreground hover:bg-muted text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Visualizar Contrato</span>
                </button>
              </div>

            </div>

            {/* Share options */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-left">Enviar Comprovante</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleWhatsAppShare}
                  className="flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-sm border-0"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={handleEmailShare}
                  className="flex items-center justify-center gap-2 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-sm border-0"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>E-mail</span>
                </button>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-6 py-2.5 border border-border text-foreground hover:bg-muted font-bold rounded-xl text-sm cursor-pointer transition-colors border-0 bg-transparent"
              >
                Nova Venda
              </button>
              <button
                onClick={() => {
                  router.push("/dashboard");
                  router.refresh();
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm cursor-pointer hover:opacity-90 transition-colors border-0"
              >
                Voltar ao Painel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Inline Customer Registration Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-in">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-muted-foreground" />
                <span>Cadastrar Novo Cliente (PDV)</span>
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted cursor-pointer border-0 bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
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
                    value={custCpf}
                    onChange={(e) => setCustCpf(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                    required
                  />
                </div>

                {/* RG */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    RG (Obrigatório para contrato)
                  </label>
                  <input
                    type="text"
                    value={custRg}
                    onChange={(e) => setCustRg(maskRG(e.target.value))}
                    placeholder="00.000.000-0"
                    maxLength={12}
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
                    value={custBirthDate}
                    onChange={(e) => setCustBirthDate(maskDate(e.target.value))}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
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
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
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
                    value={custPhone}
                    onChange={(e) => setCustPhone(maskPhone(e.target.value))}
                    placeholder="(21) 99999-9999"
                    maxLength={15}
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
                    value={custWhatsApp}
                    onChange={(e) => setCustWhatsApp(maskPhone(e.target.value))}
                    placeholder="(21) 99999-9999"
                    maxLength={15}
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  />
                </div>

                {/* CEP */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    CEP (Obrigatório para contrato)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={custCep}
                      onChange={(e) => setCustCep(maskCEP(e.target.value))}
                      onBlur={handleCustCepBlur}
                      placeholder="00000-000"
                      maxLength={9}
                      className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                    />
                    {isFetchingCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                  </div>
                </div>

                {/* Logradouro */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Logradouro (Rua / Av.)
                  </label>
                  <input
                    type="text"
                    value={custStreet}
                    onChange={(e) => setCustStreet(e.target.value)}
                    placeholder="Rua das Flores"
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  />
                </div>

                {/* Número */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Número
                  </label>
                  <input
                    id="custAddrNumber"
                    type="text"
                    value={custAddrNumber}
                    onChange={(e) => setCustAddrNumber(e.target.value)}
                    placeholder="123 / S/N"
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  />
                </div>

                {/* Bairro */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={custNeighborhood}
                    onChange={(e) => setCustNeighborhood(e.target.value)}
                    placeholder="Centro"
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
                    value={custCity}
                    onChange={(e) => setCustCity(e.target.value)}
                    placeholder="Rio de Janeiro"
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
                    value={custAddrState}
                    onChange={(e) => setCustAddrState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="RJ"
                    maxLength={2}
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  />
                </div>

                {/* Observações */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Observações Internas
                  </label>
                  <textarea
                    value={custNotes}
                    onChange={(e) => setCustNotes(e.target.value)}
                    rows={2}
                    placeholder="Anotações sobre o cliente..."
                    className="w-full px-3.5 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2.5 border border-border text-foreground hover:bg-muted font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer border-0 bg-transparent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 active:scale-98 transition-all duration-200 cursor-pointer disabled:opacity-50 border-0"
                >
                  {isSavingCustomer ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <span>Salvar e Selecionar</span>
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

