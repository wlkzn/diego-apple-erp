"use client";

import { Code2, Zap, Shield, RefreshCcw, FileText, BarChart3, Settings, ShoppingBag } from "lucide-react";

const MODULES = [
  { icon: ShoppingBag, label: "Frente de Caixa (PDV)", desc: "Venda com trade-in, parcelamento, desconto e múltiplas formas de pagamento." },
  { icon: RefreshCcw, label: "Trade-in", desc: "Receba aparelhos como parte do pagamento, com avaliação, fotos e checklist." },
  { icon: BarChart3, label: "Financeiro", desc: "Fluxo de caixa, controle de parcelas e receitas integradas a cada venda." },
  { icon: FileText, label: "Contratos & Comprovantes", desc: "Geração automática de contrato de parcelamento e recibo NFC-e estilo profissional." },
  { icon: Shield, label: "Auditoria", desc: "Log completo de todas as ações dos usuários no sistema." },
  { icon: Settings, label: "Configurações", desc: "Dados corporativos PF/PJ, logotipo, usuários e cláusulas contratuais." },
];

const TECH = [
  { label: "Framework", value: "Next.js 16 (App Router)" },
  { label: "Linguagem", value: "TypeScript / React 19" },
  { label: "Banco de Dados", value: "PostgreSQL via Prisma 7" },
  { label: "Estilização", value: "Tailwind CSS 4" },
  { label: "Autenticação", value: "JWT + bcrypt (cookies HTTP-only)" },
  { label: "Documentos", value: "docxtemplater + PizZip" },
];

export default function AboutPage() {
  return (
    <div className="space-y-10 max-w-3xl select-none">

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Sobre o Sistema</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          ERP especializado para revendas de aparelhos Apple e similares. Gestão completa de estoque,
          vendas, financeiro, contratos e trade-in em uma única plataforma.
        </p>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Módulos do Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MODULES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-4 flex gap-3 items-start">
              <div className="p-2 bg-muted rounded-xl flex-shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Stack Tecnológica</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border/60">
              {TECH.map(({ label, value }) => (
                <tr key={label} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase w-40">{label}</td>
                  <td className="px-4 py-3 text-foreground font-medium text-xs">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Developer Credits */}
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-5">
        <div className="p-3 bg-muted rounded-2xl flex-shrink-0">
          <Code2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Desenvolvido por Zenix Systems</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Soluções de software sob medida para pequenas e médias empresas.<br />
            © Todos os direitos reservados.
          </p>
        </div>
      </div>

    </div>
  );
}
