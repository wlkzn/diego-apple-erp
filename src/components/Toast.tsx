"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de um ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Remove toast after 3.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const typeClasses = {
            success: "bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/90 dark:text-emerald-300 dark:border-emerald-900/50",
            error: "bg-rose-50 text-rose-800 border-rose-100 dark:bg-rose-950/90 dark:text-rose-300 dark:border-rose-900/50",
            warning: "bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-950/90 dark:text-amber-300 dark:border-amber-900/50",
            info: "bg-sky-50 text-sky-800 border-sky-100 dark:bg-sky-950/90 dark:text-sky-300 dark:border-sky-900/50",
          }[toast.type];

          const Icon = {
            success: CheckCircle,
            error: XCircle,
            warning: AlertCircle,
            info: Info,
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`flex items-center gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md pointer-events-auto animate-slide-in duration-300 transition-all ${typeClasses}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium pr-2">{toast.message}</p>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
