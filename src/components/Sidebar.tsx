"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useUser } from "@/context/UserContext";
import { useTheme } from "@/components/ThemeProvider";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  Calendar,
  DollarSign,
  FileText,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  User as UserIcon,
  RefreshCcw,
  Info,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Vendas / PDV", href: "/sales", icon: ShoppingBag },
    { name: "Clientes", href: "/customers", icon: Users },
    { name: "Estoque / Produtos", href: "/products", icon: Package },
    { name: "Trade-in", href: "/tradein", icon: RefreshCcw },
    { name: "Fluxo Financeiro", href: "/financial", icon: DollarSign },
    { name: "Controle de Parcelas", href: "/installments", icon: Calendar },
    { name: "Relatórios", href: "/reports", icon: FileText },
    { name: "Configurações", href: "/settings", icon: Settings },
    { name: "Sobre o Sistema", href: "/about", icon: Info },
  ];

  const handleToggle = () => setIsOpen(!isOpen);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border py-6 px-4 select-none">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 relative">
          <Image
            src="/img/logo-sem-fungo.png"
            alt="Diego Apple Store"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm leading-tight text-foreground">Diego Apple Store</span>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Premium Management
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-secondary text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Actions */}
      <div className="border-t border-border pt-5 mt-5 space-y-4">
        {/* User Card */}
        {user && (
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold border border-border">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">{user.name}</span>
              <span className="text-[10px] text-muted-foreground capitalize font-medium">
                {user.role.toLowerCase() === "admin" ? "Administrador" : user.role.toLowerCase() === "dev" ? "Desenvolvedor" : "Vendedor"}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-1">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 cursor-pointer"
            title={theme === "light" ? "Modo Escuro" : "Modo Claro"}
          >
            {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-rose-200/40 text-rose-600 bg-rose-50/10 hover:bg-rose-500/10 hover:text-rose-600 dark:border-rose-900/30 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>

        {/* Credits */}
        <p className="text-[9px] text-muted-foreground/50 text-center leading-relaxed pt-2 select-none">
          © Todos os direitos reservados.<br />Desenvolvido por <span className="font-semibold">Zenix Systems</span>
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 h-screen fixed inset-y-0 left-0 z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden h-16 border-b border-border bg-card flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-30 select-none">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 relative">
            <Image
              src="/img/logo-sem-fungo.png"
              alt="Diego Apple Store"
              fill
              className="object-contain dark:invert"
            />
          </div>
          <span className="font-bold text-sm text-foreground">Diego Apple Store</span>
        </div>
        <button
          onClick={handleToggle}
          className="p-2 rounded-lg hover:bg-secondary text-foreground cursor-pointer"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-40"
          onClick={handleToggle}
        />
      )}

      {/* Mobile Sidebar Content */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-64 z-50 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out`}
      >
        <SidebarContent />
      </div>

      {/* Spacing spacer for fixed sidebar layouts */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
      <div className="lg:hidden h-16 flex-shrink-0" />
    </>
  );
}
