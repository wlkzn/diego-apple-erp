// Utilidades de Máscara de Entrada para Diego Apple Store

export const maskCPF = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

export const maskRG = (value: string): string => {
  // Formato padrão SP: XX.XXX.XXX-X (9 dígitos)
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return digits.replace(/(\d{2})(\d)/, "$1.$2");
  if (digits.length <= 8) return digits.replace(/(\d{2})(\d{3})(\d)/, "$1.$2.$3");
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{1})$/, "$1.$2.$3-$4");
};

export const maskCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

export const maskCEP = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
};

export const maskPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

export const maskDate = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d{1,4})$/, "$1/$2");
};

export const maskMoney = (value: string | number): string => {
  if (value === undefined || value === null) return "R$ 0,00";
  let cleanValue = "";
  if (typeof value === "number") {
    cleanValue = value.toFixed(2).replace(/\D/g, "");
  } else {
    cleanValue = value.replace(/\D/g, "");
  }
  if (!cleanValue) return "R$ 0,00";
  const num = parseFloat(cleanValue) / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
};

export const maskPercent = (value: string): string => {
  const clean = value.replace(/[^\d,\.]/g, "");
  if (!clean) return "";
  const digits = clean.replace(/\D/g, "").slice(0, 5);
  if (digits.length <= 2) return `${digits}%`;
  const num = parseInt(digits) / 100;
  return `${num.toFixed(2).replace(".", ",")}%`;
};

export const parseMoneyToFloat = (value: string): number => {
  const cleanValue = value.replace(/\D/g, "");
  if (!cleanValue) return 0;
  return parseFloat(cleanValue) / 100;
};

export const cleanDigits = (value: string): string => {
  return value.replace(/\D/g, "");
};

export const formatCPF = (cpf: string): string => maskCPF(cpf);

export const formatPhone = (phone: string): string => maskPhone(phone);

export const formatBRL = (val: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
