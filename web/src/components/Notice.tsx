import type { ReactNode } from "react";

interface NoticeProps {
  tone?: "info" | "warning" | "success" | "error";
  title?: string;
  children: ReactNode;
}

export function Notice({ tone = "info", title, children }: NoticeProps) {
  return (
    <aside className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "note"}>
      <span className="notice-icon" aria-hidden="true">
        {tone === "warning" ? "!" : tone === "success" ? "✓" : tone === "error" ? "×" : "i"}
      </span>
      <div>
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
    </aside>
  );
}
