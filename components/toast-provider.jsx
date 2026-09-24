"use client";
import { createContext, useContext, useEffect, useState } from "react";
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);
export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <ToastContext.Provider
      value={(message, error = false) =>
        setToast({ message, error, id: Date.now() })
      }
    >
      {children}
      {toast && (
        <div
          className="toast-popup"
          role={toast.error ? "alert" : "status"}
          key={toast.id}
        >
          <span className={toast.error ? "text-red-300" : "text-lime"}>
            {toast.error ? "Action needed" : "Done"}
          </span>
          <p className="text-sm leading-6">{toast.message}</p>
          <button
            className="absolute right-3 top-2 p-2 text-muted"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
