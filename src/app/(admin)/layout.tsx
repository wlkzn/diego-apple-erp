"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import Sidebar from "@/components/Sidebar";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background select-none">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">Carregando painel...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      {/* Menu Lateral */}
      <Sidebar />
      
      {/* Conteúdo Principal */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto animate-fade-in w-full max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
