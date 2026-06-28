"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import { KeyRound, Mail, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("E-mail e senha são obrigatórios", "warning");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Erro ao realizar login", "error");
        return;
      }

      showToast("Acesso autorizado com sucesso!", "success");
      
      // Forçar atualização do middleware e ir para o dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(error);
      showToast("Erro de conexão com o servidor", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden transition-colors duration-300">
      {/* Premium background decorations (gradients) */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-neutral-200/30 dark:bg-neutral-800/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-neutral-300/20 dark:bg-zinc-800/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[420px] animate-slide-in relative">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl backdrop-blur-md relative z-10 transition-all duration-300">
          
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 relative mb-4 select-none">
              <Image
                src="/img/logo-sem-fungo.png"
                alt="Diego Apple Store Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-center">
              Diego Apple Store
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 text-center">
              Painel de Administração Interno
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Endereço de E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@diegoapple.store"
                  className="w-full pl-10 pr-4 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all duration-200"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <KeyRound className="w-4.5 h-4.5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-input border border-border text-foreground placeholder-muted-foreground/60 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all duration-200"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-sm hover:opacity-90 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4.5 h-4.5" />
                </>
              )}
            </button>
          </form>

        </div>
        
        {/* Footnote */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6 select-none leading-relaxed">
          © Todos os direitos reservados.<br />
          <span className="text-muted-foreground/40">Desenvolvido por Zenix Systems</span>
        </p>
      </div>
    </div>
  );
}
