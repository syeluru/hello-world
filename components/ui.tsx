"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { back } from "@/lib/nav";
import { IBack, IChevronRight } from "./Icons";

export function TopBar({
  title,
  left,
  right,
  onBack,
  large,
  bordered,
}: {
  title?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  onBack?: (() => void) | true;
  large?: boolean;
  bordered?: boolean;
}) {
  return (
    <div className={`topbar${bordered ? " bordered" : ""}`}>
      <div className="side">
        {onBack ? (
          <button className="iconbtn" aria-label="Back" onClick={onBack === true ? back : onBack}>
            <IBack />
          </button>
        ) : (
          left
        )}
      </div>
      <div className={`title${large ? " left" : ""}`}>{title}</div>
      <div className="side right">{right}</div>
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  tall?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet${tall ? " tall" : ""}`} role="dialog">
        <div className="grabber" />
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  message,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: ReactNode;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="overlay centered" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog">
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        <div className="actions">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} message={message}>
      <button
        className={`btn ${danger ? "danger" : "primary"}`}
        onClick={() => {
          onConfirm();
          onClose();
        }}
      >
        {confirmLabel}
      </button>
      <button className="btn" onClick={onClose}>
        Cancel
      </button>
    </Dialog>
  );
}

export function Prompt({
  open,
  onClose,
  title,
  message,
  initial = "",
  placeholder,
  confirmLabel = "Save",
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: ReactNode;
  initial?: string;
  placeholder?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setValue(initial);
      setTimeout(() => ref.current?.focus(), 50);
    }
  }, [open, initial]);
  return (
    <Dialog open={open} onClose={onClose} title={title} message={message}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim()) return;
          onSubmit(value.trim());
          onClose();
        }}
        className="stack"
      >
        <input ref={ref} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
        <button className="btn primary" type="submit" disabled={!value.trim()}>
          {confirmLabel}
        </button>
        <button className="btn" type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </Dialog>
  );
}

export function MenuItem({
  icon,
  label,
  desc,
  danger,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  desc?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`menu-item${danger ? " danger" : ""}`} onClick={onClick}>
      {icon && <span style={{ display: "inline-flex", width: 24, justifyContent: "center" }}>{icon}</span>}
      <span className="grow">
        <div>{label}</div>
        {desc && <div className="desc">{desc}</div>}
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.id} className={o.id === value ? "active" : ""} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <button className={`switch${on ? " on" : ""}`} role="switch" aria-checked={on} onClick={() => onChange(!on)} />;
}

export function SettingsRow({
  label,
  sub,
  value,
  onClick,
  right,
}: {
  label: string;
  sub?: string;
  value?: ReactNode;
  onClick?: () => void;
  right?: ReactNode;
}) {
  const inner = (
    <>
      <div className="grow">
        <div className="label">{label}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right ?? (
        <div className="value">
          {value}
          {onClick && <IChevronRight size={18} />}
        </div>
      )}
    </>
  );
  return onClick ? (
    <button className="settings-row" onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className="settings-row">{inner}</div>
  );
}

let toastListener: ((msg: string) => void) | null = null;
export function toast(msg: string) {
  toastListener?.(msg);
}
export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    toastListener = (m) => {
      setMsg(m);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 2200);
    };
    return () => {
      toastListener = null;
    };
  }, []);
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

export function EmptyState({ icon, title, text, children }: { icon: ReactNode; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}
