"use client";
import { CSSProperties, ReactNode } from "react";

export const MC: Record<string, string> = {
  GET: "#34d399", POST: "#38bdf8", PUT: "#fb923c", DELETE: "#f87171",
};

export function PanelHeader({
  icon, title, sub, color, onClose,
}: { icon: string; title: string; sub: string; color: string; onClose: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <div>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 17, fontWeight: 700, letterSpacing: "0.06em", color }}>{title}</div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: "#5a4f6a", marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      <button onClick={onClose} style={ps.closeBtn}>✕</button>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={ps.fieldWrap}>
      <label style={ps.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

export function Feedback({ type, children }: { type: "error" | "success"; children: ReactNode }) {
  const isErr = type === "error";
  return (
    <div style={{
      border: "1px solid", borderRadius: 4, padding: "8px 12px", fontSize: 12, marginBottom: 12,
      borderColor: isErr ? "#f87171" : "#34d399",
      color: isErr ? "#fca5a5" : "#6ee7b7",
      background: isErr ? "rgba(248,113,113,0.08)" : "rgba(52,211,153,0.08)",
    }}>
      {isErr ? "⚠ " : "✓ "}{children}
    </div>
  );
}

export function LoadingDots() {
  return <div style={{ textAlign: "center", color: "#5a4f6a", letterSpacing: 4, marginBottom: 12 }}>· · ·</div>;
}

export function statusColor(s: string): CSSProperties {
  if (s === "dipinjam") return { color: "#38bdf8", borderColor: "#38bdf855", background: "rgba(56,189,248,0.08)" };
  return { color: "#34d399", borderColor: "#34d39955", background: "rgba(52,211,153,0.08)" };
}

export const roleAdmin: CSSProperties    = { color: "#fbbf24", borderColor: "#fbbf2455", background: "rgba(251,191,36,0.1)" };
export const rolePengguna: CSSProperties = { color: "#a78bfa", borderColor: "#a78bfa55", background: "rgba(167,139,250,0.1)" };

// ─── Shared panel styles ───────────────────────────────────────────────────
export const ps: Record<string, CSSProperties> = {
  wrap: { padding: "0 24px 4px" },
  toggleRow: { display: "flex", borderBottom: "1px solid #1e1e3a", marginBottom: 14 },
  toggleBtn: { background: "transparent", border: "none", borderBottom: "2px solid transparent", padding: "5px 16px 7px", cursor: "pointer", fontFamily: "'Cinzel',serif", fontSize: 12, letterSpacing: ".08em", transition: "color .2s, border-color .2s", marginBottom: -1 },
  tagline: { fontStyle: "italic", fontSize: 12, color: "#6b5e4e", marginBottom: 14, lineHeight: 1.6 },
  form: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 4 },
  fieldLabel: { fontFamily: "'Cinzel',serif", fontSize: 10, letterSpacing: ".12em", color: "#6b5e4e", textTransform: "uppercase" },
  input: { background: "rgba(255,255,255,.03)", border: "none", borderBottom: "1px solid #3d2f4a", padding: "8px 4px", color: "#e2d9c8", fontFamily: "'IM Fell English',Georgia,serif", fontSize: 14, outline: "none", width: "100%", transition: "border-color .2s" },
  submitBtn: { marginTop: 4, padding: "10px 24px", background: "rgba(192,132,252,.08)", border: "1px solid #c084fc66", borderRadius: 4, color: "#c084fc", fontFamily: "'Cinzel',serif", fontSize: 13, letterSpacing: ".1em", cursor: "pointer", width: "100%" },
  closeBtn: { background: "transparent", border: "1px solid #2d1f3a", color: "#5a4f6a", borderRadius: 4, width: 28, height: 28, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  switchHint: { fontSize: 11, color: "#5a4f6a", textAlign: "center", letterSpacing: ".04em" },
  switchLink: { background: "transparent", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: 11, fontFamily: "'IM Fell English',Georgia,serif", textDecoration: "underline", textDecorationColor: "#a78bfa55", padding: 0 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 },
  bookCard: { background: "rgba(255,255,255,.02)", border: "1px solid #2d1f3a", borderRadius: 5, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 5 },
  bookTitle: { fontFamily: "'Cinzel',serif", fontSize: 13, fontWeight: 700, color: "#c9b99a", letterSpacing: ".04em", lineHeight: 1.3 },
  bookMeta: { fontFamily: "monospace", fontSize: 10, color: "#5a4f6a", letterSpacing: ".03em" },
  bookDesc: { fontSize: 12, color: "#7a6e60", lineHeight: 1.5, fontStyle: "italic", marginTop: 2 },
  stockBadge: { fontFamily: "monospace", fontSize: 10, border: "1px solid", borderRadius: 3, padding: "2px 7px", alignSelf: "flex-start", marginTop: 4 },
  empty: { color: "#5a4f6a", fontStyle: "italic", fontSize: 13, textAlign: "center", padding: "20px 0" },
  card: { background: "rgba(255,255,255,.02)", border: "1px solid #2d1f3a", borderRadius: 5, padding: "12px 14px", marginBottom: 8 },
  statusBadge: { fontFamily: "monospace", fontSize: 10, border: "1px solid", borderRadius: 3, padding: "2px 7px" },
  profileCard: { display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16, background: "rgba(255,255,255,.02)", border: "1px solid #2d1f3a", borderRadius: 5, padding: "14px" },
  profileAvatar: { width: 48, height: 48, borderRadius: "50%", background: "rgba(167,139,250,.15)", border: "1px solid #a78bfa55", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cinzel',serif", fontSize: 20, color: "#a78bfa", flexShrink: 0 },
  profileName: { fontFamily: "'Cinzel',serif", fontSize: 16, fontWeight: 700, color: "#e2d9c8", letterSpacing: ".06em", marginBottom: 4 },
  roleBadge: { fontFamily: "monospace", fontSize: 10, border: "1px solid", borderRadius: 3, padding: "2px 8px", display: "inline-block", marginBottom: 6, letterSpacing: ".06em", textTransform: "uppercase" },
  logoutBtn: { background: "rgba(248,113,113,.06)", border: "1px solid #f8717144", borderRadius: 4, color: "#f87171", fontFamily: "'Cinzel',serif", fontSize: 12, letterSpacing: ".08em", padding: "8px 18px", cursor: "pointer", width: "100%", marginTop: 4 },
};
