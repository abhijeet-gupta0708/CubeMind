import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "./ui";

export type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title?: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  push: (message: string, tone?: ToastTone, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<number, number>());

  const remove = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = "info", title?: string) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current.slice(-3), { id, message, tone, title }]);
      const timer = window.setTimeout(() => {
        timers.current.delete(id);
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 5200);
      timers.current.set(id, timer);
    },
    [],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of activeTimers.values()) window.clearTimeout(timer);
      activeTimers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = TONE_ICON[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={cn("toast", `toast--${toast.tone}`)}
                role={toast.tone === "error" ? "alert" : "status"}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-4 w-4 flex-none",
                    toast.tone === "success" && "text-emerald-300",
                    toast.tone === "error" && "text-red-300",
                    toast.tone === "info" && "text-cyan-300",
                  )}
                />
                <div className="min-w-0 flex-1">
                  {toast.title ? (
                    <div className="mb-0.5 text-[0.8rem] font-semibold text-white">
                      {toast.title}
                    </div>
                  ) : null}
                  <div className="text-muted">{toast.message}</div>
                </div>
                <button
                  type="button"
                  className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md text-muted-dim transition-colors hover:bg-white/5 hover:text-white"
                  aria-label="Dismiss notification"
                  onClick={() => remove(toast.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used inside ToastProvider.");
  }
  return value;
}
