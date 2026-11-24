import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import clsx from "clsx";

export function cn(...values: Array<string | false | null | undefined>): string {
  return clsx(values);
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "dashed" | "danger" | "cyan";
type ButtonSize = "md" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  block = false,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "btn",
        `btn-${variant}`,
        size === "sm" && "btn-sm",
        block && "btn-block",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: "md" | "sm";
}

export function IconButton({ label, size = "md", className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn("icon-btn", size === "sm" && "icon-btn--sm", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Badge({
  tone = "default",
  children,
  className,
  icon,
}: {
  tone?: "default" | "violet" | "cyan" | "success" | "warning" | "danger";
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span className={cn("badge", tone !== "default" && `badge--${tone}`, className)}>
      {icon}
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn("h-4 w-4 animate-spin", className)} />;
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("segmented", className)} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          className="segmented__item"
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Panel({
  title,
  icon,
  action,
  children,
  className,
  bodyClassName,
  id,
}: {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section className={cn("surface", className)} id={id}>
      <div className="panel-header">
        <h2 className="panel-title">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      <div className={cn("panel-body", bodyClassName)}>{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {eyebrow ? (
        <div className={cn("eyebrow", align === "center" && "justify-center")}>{eyebrow}</div>
      ) : null}
      <h2 className="section-title mt-2.5">{title}</h2>
      {description ? (
        <p className={cn("lead mt-2.5", align === "center" && "mx-auto max-w-2xl")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("stat", className)}>
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-dim">{hint}</div> : null}
    </div>
  );
}

export function Callout({
  tone = "info",
  icon,
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("callout", `callout--${tone}`, className)}>
      <div className="flex items-start gap-2.5">
        {icon ? <span className="mt-0.5 flex-none">{icon}</span> : null}
        <div className="min-w-0">
          {title ? <div className="callout__title">{title}</div> : null}
          <div className="callout__body">{children}</div>
        </div>
      </div>
    </div>
  );
}

const MODAL_FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 760,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const appRoot = document.getElementById("root");
    const previousInert = appRoot?.inert ?? false;
    document.body.style.overflow = "hidden";
    if (appRoot) appRoot.inert = true;
    const focusTimer = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(MODAL_FOCUSABLE);
      (first ?? panelRef.current)?.focus();
    }, 20);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE);
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panelRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (appRoot) appRoot.inert = previousInert;
      window.clearTimeout(focusTimer);
      previousActive?.focus();
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            className="modal-panel"
            style={{ maxWidth: size }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            aria-describedby={description ? "modal-description" : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="modal-header">
              <div>
                <h2 className="text-base font-semibold tracking-tight">{title}</h2>
                {description ? (
                  <p id="modal-description" className="mt-1 text-xs leading-relaxed text-muted">
                    {description}
                  </p>
                ) : null}
              </div>
              <IconButton label="Close dialog" onClick={onClose}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="p-4 sm:p-5">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
