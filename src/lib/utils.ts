export const API = "https://backend-production-5ad9.up.railway.app";
export const WS_URL = API.replace(/^https?/, (p) => (p === "https" ? "wss" : "ws"));

// ─── Auth helpers ──────────────────────────────────────────────────────────
export function getToken(): string {
  return typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
}
export function getRole() {
  if (typeof window === "undefined") return null;
  const r = localStorage.getItem("role");
  return r === "admin" || r === "pengguna" ? r : null;
}
export function getNama(): string {
  return typeof window !== "undefined" ? (localStorage.getItem("nama") ?? "") : "";
}
export function authHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}
export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("nama");
}

// ─── Date helpers ──────────────────────────────────────────────────────────
export function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
export function fmtDateTime(s: string): string {
  return new Date(s).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
export function timeAgo(s: string): string {
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return fmtDate(s);
}

// ─── UI helpers ────────────────────────────────────────────────────────────
export function aksiLabel(aksi: string): { icon: string; color: string; label: string } {
  const map: Record<string, { icon: string; color: string; label: string }> = {
    login:        { icon: "🔑", color: "#c084fc", label: "Login"     },
    pinjam_buku:  { icon: "📥", color: "#38bdf8", label: "Meminjam"  },
    kembali_buku: { icon: "📤", color: "#34d399", label: "Kembali"   },
    baca_buku:    { icon: "📖", color: "#fb923c", label: "Membaca"   },
    chat:         { icon: "💬", color: "#f472b6", label: "Chat"      },
    mading:       { icon: "📌", color: "#fbbf24", label: "Mading"    },
    browsing:     { icon: "👁",  color: "#a78bfa", label: "Browsing" },
    online:       { icon: "🟢", color: "#34d399", label: "Online"    },
    offline:      { icon: "⚫", color: "#3d2f4a", label: "Offline"   },
  };
  return map[aksi] ?? { icon: "•", color: "#5a4f6a", label: aksi };
}

export function madingKategoriStyle(k: string): { color: string; icon: string } {
  const map: Record<string, { color: string; icon: string }> = {
    info_user:    { color: "#a78bfa", icon: "👤" },
    buku_baru:    { color: "#fb923c", icon: "📚" },
    pengumuman:   { color: "#f87171", icon: "📢" },
    umum:         { color: "#38bdf8", icon: "📌" },
  };
  return map[k] ?? { color: "#5a4f6a", icon: "📌" };
}
