"use client";

import { useState, useRef, useEffect, CSSProperties, FormEvent } from "react";
import { useRouter } from "next/navigation";

// ─── Constants ────────────────────────────────────────────────────────────────

const API = "/backend"; // proxy via next.config.ts → http://localhost:8080

// ─── Types ────────────────────────────────────────────────────────────────────

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type UserRole = "admin" | "pengguna" | null;
type PanelId =
  | "login"
  | "bookshelf"
  | "single-book"
  | "throne"
  | "history"
  | "profile"
  | "admin";

interface Buku {
  ID: number;
  NamaBuku: string;
  Penulis: string;
  IsiBuku: string;
  Stock: number;
}

interface User {
  ID: number;
  Nama: string;
  Saldo: number;
  Role: string;
}

interface Peminjaman {
  ID: number;
  UserID: number;
  BukuID: number;
  TanggalPeminjaman: string;
  TanggalPengembalian: string | null;
  Status: string;
  Buku: Buku;
  User?: User;
}

interface Hotspot {
  id: PanelId;
  label: string;
  icon: string;
  x: number;
  y: number;
  color: string;
  glow: string;
  requiresAuth: boolean;
  adminOnly: boolean;
}

// ─── Hotspot positions ────────────────────────────────────────────────────────

const HOTSPOTS: Hotspot[] = [
  { id: "login",       label: "Gerbang Masuk",    icon: "🚪", x: 49, y: 88, color: "#c084fc", glow: "rgba(192,132,252,0.6)", requiresAuth: false, adminOnly: false },
  { id: "bookshelf",   label: "Rak Kitab Besar",  icon: "📚", x: 49, y: 44, color: "#fb923c", glow: "rgba(251,146,60,0.6)",  requiresAuth: false, adminOnly: false },
  { id: "single-book", label: "Lemari Katalog",   icon: "🔍", x: 25, y: 53, color: "#34d399", glow: "rgba(52,211,153,0.6)",  requiresAuth: false, adminOnly: false },
  { id: "throne",      label: "Kursi Pembaca",    icon: "📖", x: 49, y: 73, color: "#38bdf8", glow: "rgba(56,189,248,0.6)",  requiresAuth: true,  adminOnly: false },
  { id: "history",     label: "Papan Riwayat",    icon: "📋", x: 73, y: 59, color: "#f472b6", glow: "rgba(244,114,182,0.6)", requiresAuth: true,  adminOnly: false },
  { id: "profile",     label: "Cermin Jiwa",      icon: "👤", x: 71, y: 47, color: "#a78bfa", glow: "rgba(167,139,250,0.6)", requiresAuth: true,  adminOnly: false },
  { id: "admin",       label: "Ruang Arsip Admin",icon: "⚗️", x: 84, y: 71, color: "#fbbf24", glow: "rgba(251,191,36,0.6)",  requiresAuth: true,  adminOnly: true  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string { return typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : ""; }
function getRole(): UserRole {
  if (typeof window === "undefined") return null;
  const r = localStorage.getItem("role");
  return r === "admin" || r === "pengguna" ? r : null;
}
function authHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}
function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Sub-panels ───────────────────────────────────────────────────────────────

// ── Auth Panel ────────────────────────────────────────────────────────────────
function AuthPanel({ onClose, onLogin }: { onClose: () => void; onLogin: (role: UserRole) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [nama, setNama] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { setNama(""); setPassword(""); setError(""); setSuccess(""); }, [isRegister]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nama || !password) { setError("Nama dan password wajib diisi!"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${API}/api/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, password }),
      });
      const data = await res.json();
      if (isRegister) {
        if (data.sukses) { setSuccess("Pendaftaran berhasil! Silakan masuk."); setTimeout(() => setIsRegister(false), 1200); }
        else setError(data.pesan || "Gagal mendaftar.");
      } else {
        if (data.sukses) {
          localStorage.setItem("token", data.data.token);
          localStorage.setItem("role", data.data.role);
          localStorage.setItem("nama", data.data.nama);
          setSuccess(`Selamat datang, ${data.data.nama}…`);
          setTimeout(() => { onLogin(data.data.role as UserRole); onClose(); }, 800);
        } else setError(data.pesan || "Login gagal.");
      }
    } catch { setError("Tidak dapat terhubung ke server."); }
    finally { setLoading(false); }
  }

  return (
    <div style={ps.wrap}>
      <PanelHeader icon="🚪" title="Gerbang Masuk" sub="POST /api/login  •  POST /api/register" color="#c084fc" onClose={onClose} />
      <div style={ps.toggleRow}>
        {(["Masuk", "Daftar"] as const).map((l, i) => {
          const active = i === 0 ? !isRegister : isRegister;
          return <button key={l} onClick={() => setIsRegister(i === 1)} style={{ ...ps.toggleBtn, color: active ? "#e2d9c8" : "#5a4f6a", borderBottomColor: active ? "#c084fc" : "transparent" }}>{l}</button>;
        })}
      </div>
      <p style={ps.tagline}>{isRegister ? "Tuliskan namamu dalam buku pendaftaran perpustakaan ini." : "Buktikan identitasmu kepada penjaga gerbang yang bijaksana."}</p>
      {error   && <Feedback type="error">{error}</Feedback>}
      {success && <Feedback type="success">{success}</Feedback>}
      <form onSubmit={handleSubmit} style={ps.form}>
        <Field label="Nama"><input type="text" placeholder="nama_pengguna" value={nama} onChange={e => setNama(e.target.value)} style={ps.input} autoComplete="username" /></Field>
        <Field label="Kata Sandi"><input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={ps.input} autoComplete={isRegister ? "new-password" : "current-password"} /></Field>
        <button type="submit" disabled={loading} style={{ ...ps.submitBtn, opacity: loading ? 0.6 : 1 }}>
          {loading ? "···" : isRegister ? "Daftarkan Diri" : "Masuk ke Perpustakaan"}
        </button>
      </form>
      <p style={ps.switchHint}>
        {isRegister ? "Sudah punya akun? " : "Belum terdaftar? "}
        <button onClick={() => setIsRegister(!isRegister)} style={ps.switchLink}>{isRegister ? "Masuk di sini" : "Daftar sekarang"}</button>
      </p>
    </div>
  );
}

// ── All Books Panel ───────────────────────────────────────────────────────────
function BookshelfPanel({ onClose }: { onClose: () => void }) {
  const [books, setBooks] = useState<Buku[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rawDebug, setRawDebug] = useState("");

  useEffect(() => {
    fetch(`${API}/api/buku`)
      .then(async r => {
        const text = await r.text();
        // Simpan raw text untuk debug kalau parse gagal
        let d: Record<string, unknown>;
        try { d = JSON.parse(text); }
        catch { setError(`Response bukan JSON: ${text.slice(0, 120)}`); return; }

        if (d.sukses === true) {
          const data = d.data as Buku[] | null;
          setBooks(Array.isArray(data) ? data : []);
        } else {
          // Tampilkan pesan error dari server + raw untuk debug
          const msg = (d.pesan as string) || (d.error as string) || "Server mengembalikan sukses: false";
          setError(msg);
          setRawDebug(text.slice(0, 300));
        }
      })
      .catch(err => setError(`Gagal terhubung ke server: ${err.message}`))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={ps.wrap}>
      <PanelHeader icon="📚" title="Rak Kitab Besar" sub="GET /api/buku" color="#fb923c" onClose={onClose} />
      <p style={ps.tagline}>Semua koleksi kitab yang tersedia di perpustakaan ini.</p>
      {loading && <LoadingDots />}
      {error && (
        <>
          <Feedback type="error">{error}</Feedback>
          {rawDebug && (
            <pre style={{ fontFamily: "monospace", fontSize: 10, color: "#5a4f6a", background: "rgba(0,0,0,.3)", borderRadius: 4, padding: "8px 10px", overflowX: "auto", marginBottom: 10, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {rawDebug}
            </pre>
          )}
        </>
      )}
      {!loading && !error && (
        <div style={ps.grid}>
          {books.map(b => (
            <div key={b.ID} style={ps.bookCard}>
              <div style={ps.bookTitle}>{b.NamaBuku}</div>
              <div style={ps.bookMeta}>✍ {b.Penulis}</div>
              {b.IsiBuku && <div style={ps.bookDesc}>{b.IsiBuku.slice(0, 80)}{b.IsiBuku.length > 80 ? "…" : ""}</div>}
              <div style={{ ...ps.stockBadge, color: b.Stock > 0 ? "#34d399" : "#f87171", borderColor: b.Stock > 0 ? "#34d39955" : "#f8717155" }}>
                {b.Stock > 0 ? `📦 Stok: ${b.Stock}` : "❌ Habis"}
              </div>
              <div style={ps.bookMeta}>ID: {b.ID}</div>
            </div>
          ))}
          {books.length === 0 && <p style={ps.empty}>Belum ada buku terdaftar.</p>}
        </div>
      )}
    </div>
  );
}

// ── Single Book Panel ─────────────────────────────────────────────────────────
function SingleBookPanel({ onClose }: { onClose: () => void }) {
  const [bookId, setBookId] = useState("");
  const [book, setBook] = useState<Buku | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    if (!bookId.trim()) return;
    setLoading(true); setError(""); setBook(null);
    try {
      const r = await fetch(`${API}/api/buku/${bookId.trim()}`);
      const d = await r.json();
      if (d.sukses) setBook(d.data); else setError(d.pesan || "Buku tidak ditemukan.");
    } catch { setError("Gagal terhubung ke server."); }
    finally { setLoading(false); }
  }

  return (
    <div style={ps.wrap}>
      <PanelHeader icon="🔍" title="Lemari Katalog" sub="GET /api/buku/:id" color="#34d399" onClose={onClose} />
      <p style={ps.tagline}>Cari kitab berdasarkan nomor ID-nya.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input type="number" placeholder="Masukkan ID buku…" value={bookId} onChange={e => setBookId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()} style={{ ...ps.input, flex: 1 }} />
        <button onClick={search} style={{ ...ps.submitBtn, padding: "8px 18px", width: "auto" }}>Cari</button>
      </div>
      {loading && <LoadingDots />}
      {error   && <Feedback type="error">{error}</Feedback>}
      {book && (
        <div style={{ ...ps.bookCard, marginTop: 0 }}>
          <div style={ps.bookTitle}>{book.NamaBuku}</div>
          <div style={ps.bookMeta}>✍ {book.Penulis}</div>
          {book.IsiBuku && <div style={ps.bookDesc}>{book.IsiBuku}</div>}
          <div style={{ ...ps.stockBadge, color: book.Stock > 0 ? "#34d399" : "#f87171", borderColor: book.Stock > 0 ? "#34d39955" : "#f8717155" }}>
            {book.Stock > 0 ? `📦 Stok: ${book.Stock}` : "❌ Habis"}
          </div>
          <div style={ps.bookMeta}>ID: {book.ID}</div>
        </div>
      )}
    </div>
  );
}

// ── Throne Panel — Pinjam & Kembali ──────────────────────────────────────────
function ThronePanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"pinjam" | "kembali">("pinjam");
  const [inputId, setInputId] = useState("");
  const [result, setResult] = useState<Peminjaman | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function reset() { setInputId(""); setResult(null); setError(""); setSuccess(""); }
  useEffect(reset, [tab]);

  async function handleAction() {
    if (!inputId.trim()) return;
    setLoading(true); setError(""); setSuccess(""); setResult(null);
    try {
      const endpoint = tab === "pinjam" ? `/api/user/pinjam/${inputId.trim()}` : `/api/user/kembali/${inputId.trim()}`;
      const r = await fetch(`${API}${endpoint}`, { method: "POST", headers: authHeaders() });
      const d = await r.json();
      if (d.error) setError(d.error);
      else { setSuccess(d.message); setResult(d.data); }
    } catch { setError("Gagal terhubung ke server."); }
    finally { setLoading(false); }
  }

  return (
    <div style={ps.wrap}>
      <PanelHeader icon="📖" title="Kursi Pembaca" sub="POST /api/user/pinjam/:id  •  POST /api/user/kembali/:id" color="#38bdf8" onClose={onClose} />
      <div style={ps.toggleRow}>
        {(["pinjam", "kembali"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...ps.toggleBtn, color: tab === t ? "#e2d9c8" : "#5a4f6a", borderBottomColor: tab === t ? "#38bdf8" : "transparent", textTransform: "capitalize" }}>
            {t === "pinjam" ? "Pinjam Buku" : "Kembalikan Buku"}
          </button>
        ))}
      </div>
      <p style={ps.tagline}>{tab === "pinjam" ? "Masukkan ID buku yang ingin kamu pinjam." : "Masukkan ID peminjaman yang ingin dikembalikan."}</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input type="number" placeholder={tab === "pinjam" ? "ID buku…" : "ID peminjaman…"}
          value={inputId} onChange={e => setInputId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAction()} style={{ ...ps.input, flex: 1 }} />
        <button onClick={handleAction} style={{ ...ps.submitBtn, padding: "8px 18px", width: "auto", borderColor: "#38bdf866", color: "#38bdf8", background: "rgba(56,189,248,0.08)" }}>
          {tab === "pinjam" ? "Pinjam" : "Kembalikan"}
        </button>
      </div>
      {loading && <LoadingDots />}
      {error   && <Feedback type="error">{error}</Feedback>}
      {success && <Feedback type="success">{success}</Feedback>}
      {result && (
        <div style={ps.pinjamCard}>
          <div style={ps.bookTitle}>{result.Buku?.NamaBuku ?? `Buku #${result.BukuID}`}</div>
          <div style={ps.bookMeta}>✍ {result.Buku?.Penulis}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ ...ps.statusBadge, ...statusColor(result.Status) }}>{result.Status}</span>
            <span style={ps.bookMeta}>📅 {fmtDate(result.TanggalPeminjaman)}</span>
            {result.TanggalPengembalian && <span style={ps.bookMeta}>↩ {fmtDate(result.TanggalPengembalian)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── History Panel ─────────────────────────────────────────────────────────────
function HistoryPanel({ onClose }: { onClose: () => void }) {
  const [list, setList] = useState<Peminjaman[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/user/peminjaman`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.data) setList(d.data); else setError(d.error || "Gagal memuat."); })
      .catch(() => setError("Gagal terhubung."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={ps.wrap}>
      <PanelHeader icon="📋" title="Papan Riwayat" sub="GET /api/user/peminjaman" color="#f472b6" onClose={onClose} />
      <p style={ps.tagline}>Semua riwayat peminjaman buku milikmu.</p>
      {loading && <LoadingDots />}
      {error   && <Feedback type="error">{error}</Feedback>}
      {!loading && !error && list.length === 0 && <p style={ps.empty}>Belum ada riwayat peminjaman.</p>}
      {!loading && list.map(p => (
        <div key={p.ID} style={ps.pinjamCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
            <div style={ps.bookTitle}>{p.Buku?.NamaBuku ?? `Buku #${p.BukuID}`}</div>
            <span style={{ ...ps.statusBadge, ...statusColor(p.Status) }}>{p.Status}</span>
          </div>
          <div style={ps.bookMeta}>✍ {p.Buku?.Penulis}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
            <span style={ps.bookMeta}>📅 Dipinjam: {fmtDate(p.TanggalPeminjaman)}</span>
            {p.TanggalPengembalian && <span style={ps.bookMeta}>↩ Dikembalikan: {fmtDate(p.TanggalPengembalian)}</span>}
          </div>
          <div style={{ ...ps.bookMeta, marginTop: 4 }}>ID Peminjaman: #{p.ID}</div>
        </div>
      ))}
    </div>
  );
}

// ── Profile Panel ─────────────────────────────────────────────────────────────
function ProfilePanel({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/user/me`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.data) setUser(d.data); else setError(d.error || "Gagal memuat profil."); })
      .catch(() => setError("Gagal terhubung."))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("nama");
    onLogout();
    onClose();
  }

  return (
    <div style={ps.wrap}>
      <PanelHeader icon="👤" title="Cermin Jiwa" sub="GET /api/user/me" color="#a78bfa" onClose={onClose} />
      <p style={ps.tagline}>Identitasmu yang tercatat dalam arsip perpustakaan.</p>
      {loading && <LoadingDots />}
      {error   && <Feedback type="error">{error}</Feedback>}
      {user && (
        <div style={ps.profileCard}>
          <div style={ps.profileAvatar}>{user.Nama.charAt(0).toUpperCase()}</div>
          <div>
            <div style={ps.profileName}>{user.Nama}</div>
            <div style={{ ...ps.roleBadge, ...(user.Role === "admin" ? roleAdmin : rolePengguna) }}>{user.Role}</div>
            <div style={ps.bookMeta}>💰 Saldo: Rp {user.Saldo.toLocaleString("id-ID")}</div>
            <div style={ps.bookMeta}>🪪 ID: #{user.ID}</div>
          </div>
        </div>
      )}
      <button onClick={handleLogout} style={ps.logoutBtn}>Keluar dari Perpustakaan</button>
    </div>
  );
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"tambah" | "update" | "hapus">("tambah");
  const [form, setForm] = useState({ nama_buku: "", penulis: "", isi_buku: "", stock: "" });
  const [targetId, setTargetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { setForm({ nama_buku: "", penulis: "", isi_buku: "", stock: "" }); setTargetId(""); setError(""); setSuccess(""); }, [tab]);

  function setField(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    try {
      let url = `${API}/api/admin/buku`;
      let method: HttpMethod = "POST";
      let body: Record<string, unknown> = {};

      if (tab === "tambah") {
        body = { nama_buku: form.nama_buku, penulis: form.penulis, isi_buku: form.isi_buku, stock: Number(form.stock) };
      } else if (tab === "update") {
        if (!targetId) { setError("ID buku wajib diisi."); setLoading(false); return; }
        url = `${API}/api/admin/buku/${targetId}`;
        method = "PUT";
        if (form.nama_buku) body.nama_buku = form.nama_buku;
        if (form.penulis)   body.penulis   = form.penulis;
        if (form.isi_buku)  body.isi_buku  = form.isi_buku;
        if (form.stock)     body.stock     = Number(form.stock);
      } else {
        if (!targetId) { setError("ID buku wajib diisi."); setLoading(false); return; }
        url = `${API}/api/admin/buku/${targetId}`;
        method = "DELETE";
      }

      const r = await fetch(url, { method, headers: authHeaders(), body: method !== "DELETE" ? JSON.stringify(body) : undefined });
      const d = await r.json();
      if (d.sukses) setSuccess(d.pesan || "Berhasil!");
      else setError(d.pesan || "Operasi gagal.");
    } catch { setError("Gagal terhubung."); }
    finally { setLoading(false); }
  }

  const tabs: { key: typeof tab; label: string; method: HttpMethod; color: string }[] = [
    { key: "tambah", label: "Tambah",  method: "POST",   color: "#38bdf8" },
    { key: "update", label: "Update",  method: "PUT",    color: "#fb923c" },
    { key: "hapus",  label: "Hapus",   method: "DELETE", color: "#f87171" },
  ];

  return (
    <div style={ps.wrap}>
      <PanelHeader icon="⚗️" title="Ruang Arsip Admin" sub="POST • PUT • DELETE /api/admin/buku" color="#fbbf24" onClose={onClose} />
      <div style={ps.toggleRow}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...ps.toggleBtn, color: tab === t.key ? "#e2d9c8" : "#5a4f6a", borderBottomColor: tab === t.key ? t.color : "transparent" }}>
            <span style={{ fontFamily: "monospace", fontSize: 10, marginRight: 4, color: tab === t.key ? MC[t.method] : "#5a4f6a" }}>{t.method}</span>
            {t.label}
          </button>
        ))}
      </div>
      {error   && <Feedback type="error">{error}</Feedback>}
      {success && <Feedback type="success">{success}</Feedback>}
      <form onSubmit={handleSubmit} style={ps.form}>
        {(tab === "update" || tab === "hapus") && (
          <Field label="ID Buku"><input type="number" placeholder="contoh: 3" value={targetId} onChange={e => setTargetId(e.target.value)} style={ps.input} /></Field>
        )}
        {tab !== "hapus" && (
          <>
            <Field label="Nama Buku"><input type="text" placeholder="Judul buku…" value={form.nama_buku} onChange={e => setField("nama_buku", e.target.value)} style={ps.input} /></Field>
            <Field label="Penulis"><input type="text" placeholder="Nama penulis…" value={form.penulis} onChange={e => setField("penulis", e.target.value)} style={ps.input} /></Field>
            <Field label="Isi / Sinopsis"><textarea placeholder="Deskripsi buku…" value={form.isi_buku} onChange={e => setField("isi_buku", e.target.value)}
              style={{ ...ps.input, resize: "vertical", minHeight: 72 }} /></Field>
            <Field label="Stok"><input type="number" placeholder="0" value={form.stock} onChange={e => setField("stock", e.target.value)} style={ps.input} /></Field>
          </>
        )}
        {tab === "hapus" && <p style={ps.tagline}>Buku yang sedang dipinjam tidak dapat dihapus.</p>}
        <button type="submit" disabled={loading}
          style={{ ...ps.submitBtn, opacity: loading ? 0.6 : 1, borderColor: MC[tabs.find(t => t.key === tab)!.method] + "66", color: MC[tabs.find(t => t.key === tab)!.method], background: MC[tabs.find(t => t.key === tab)!.method] + "12" }}>
          {loading ? "···" : tab === "tambah" ? "Tambah Buku" : tab === "update" ? "Simpan Perubahan" : "Hapus Buku"}
        </button>
      </form>
    </div>
  );
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

const MC: Record<HttpMethod, string> = { GET: "#34d399", POST: "#38bdf8", PUT: "#fb923c", DELETE: "#f87171" };

function PanelHeader({ icon, title, sub, color, onClose }: { icon: string; title: string; sub: string; color: string; onClose: () => void }) {
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={ps.fieldWrap}><label style={ps.fieldLabel}>{label}</label>{children}</div>;
}

function Feedback({ type, children }: { type: "error" | "success"; children: React.ReactNode }) {
  const isErr = type === "error";
  return <div style={{ border: "1px solid", borderRadius: 4, padding: "8px 12px", fontSize: 12, marginBottom: 12, borderColor: isErr ? "#f87171" : "#34d399", color: isErr ? "#fca5a5" : "#6ee7b7", background: isErr ? "rgba(248,113,113,0.08)" : "rgba(52,211,153,0.08)" }}>{isErr ? "⚠ " : "✓ "}{children}</div>;
}

function LoadingDots() {
  return <div style={{ textAlign: "center", color: "#5a4f6a", letterSpacing: 4, marginBottom: 12 }}>· · ·</div>;
}

function statusColor(s: string): CSSProperties {
  if (s === "dipinjam") return { color: "#38bdf8", borderColor: "#38bdf855", background: "rgba(56,189,248,0.08)" };
  return { color: "#34d399", borderColor: "#34d39955", background: "rgba(52,211,153,0.08)" };
}

const roleAdmin: CSSProperties    = { color: "#fbbf24", borderColor: "#fbbf2455", background: "rgba(251,191,36,0.1)" };
const rolePengguna: CSSProperties = { color: "#a78bfa", borderColor: "#a78bfa55", background: "rgba(167,139,250,0.1)" };

// ─── Hotspot Button ───────────────────────────────────────────────────────────

function HotspotButton({ hotspot, isActive, isHovered, onClick, onMouseEnter, onMouseLeave, locked }: {
  hotspot: Hotspot; isActive: boolean; isHovered: boolean; locked: boolean;
  onClick: () => void; onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const { color, glow, x, y, icon, label } = hotspot;
  const scale = isActive ? "scale(1.2)" : isHovered ? "scale(1.1)" : "scale(1)";
  const bg = locked ? "rgba(10,8,20,0.35)" : isActive ? `${color}30` : isHovered ? `${color}18` : "rgba(10,8,20,0.55)";
  const shadow = locked ? "none" : isActive || isHovered ? `0 0 0 3px ${glow}, 0 0 24px ${glow}` : `0 0 0 1px ${color}44, 0 0 12px ${glow}`;
  const lockColor = locked ? "#3a3050" : color;
  return (
    <button aria-label={label} onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      style={{ ...ss.hotspot, left: `${x}%`, top: `${y}%`, borderColor: lockColor, boxShadow: shadow, background: bg, transform: `translate(-50%,-50%) ${scale}`, opacity: locked ? 0.45 : 1 }}>
      {!locked && <span style={{ ...ss.ping, borderColor: color, animationPlayState: isActive ? "paused" : "running" }} />}
      <span style={{ fontSize: 18, lineHeight: 1, filter: locked ? "grayscale(1)" : "drop-shadow(0 0 4px currentColor)" }}>{icon}</span>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Page() {
  const [activeId, setActiveId] = useState<PanelId | null>(null);
  const [hoveredId, setHoveredId] = useState<PanelId | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Read role from localStorage on mount (client only)
  useEffect(() => { setRole(getRole()); }, []);

  const activeHotspot = HOTSPOTS.find(h => h.id === activeId);
  const hoveredHotspot = HOTSPOTS.find(h => h.id === hoveredId);

  function isLocked(h: Hotspot): boolean {
    if (h.adminOnly && role !== "admin") return true;
    if (h.requiresAuth && !role) return true;
    return false;
  }

  function handleClick(id: PanelId): void {
    const h = HOTSPOTS.find(x => x.id === id)!;
    if (isLocked(h)) return;
    if (activeId === id) { setActiveId(null); return; }
    setActiveId(id);
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  }

  function handleLogin(r: UserRole) { setRole(r); }
  function handleLogout() { setRole(null); setActiveId(null); }

  const showPanel = !!activeId && !!activeHotspot;

  function renderPanelContent() {
    if (!activeId) return null;
    switch (activeId) {
      case "login":       return <AuthPanel       onClose={() => setActiveId(null)} onLogin={handleLogin} />;
      case "bookshelf":   return <BookshelfPanel  onClose={() => setActiveId(null)} />;
      case "single-book": return <SingleBookPanel onClose={() => setActiveId(null)} />;
      case "throne":      return <ThronePanel     onClose={() => setActiveId(null)} />;
      case "history":     return <HistoryPanel    onClose={() => setActiveId(null)} />;
      case "profile":     return <ProfilePanel    onClose={() => setActiveId(null)} onLogout={handleLogout} />;
      case "admin":       return <AdminPanel      onClose={() => setActiveId(null)} />;
    }
  }

  return (
    <div style={ss.root}>
      <div style={ss.grain} />

      <div style={ss.wrapper}>
        {/* Title + session badge */}
        <div style={ss.titleRow}>
          <span style={ss.glyph}>✦</span>
          <h1 style={ss.title}>Perpustakaan Kuno</h1>
          <span style={ss.glyph}>✦</span>
        </div>

        {/* Session indicator */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          {role ? (
            <span style={{ ...ps.roleBadge, display: "inline-flex", ...(role === "admin" ? roleAdmin : rolePengguna) }}>
              {role === "admin" ? "🔑" : "👤"} {localStorage.getItem("nama") ?? role}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: "#3a3050", letterSpacing: "0.12em" }}>
              🔒 BELUM MASUK — klik 🚪 untuk login
            </span>
          )}
        </div>

        <p style={ss.subtitle}>Klik lokasi untuk berinteraksi dengan perpustakaan</p>

        {/* Scene */}
        <div style={ss.sceneOuter}>
          <div style={ss.sceneInner}>
            <img src="/perpus3.png" alt="Perpustakaan" style={ss.bgImage} draggable={false} />
            <div style={ss.vignette} />

            {HOTSPOTS.map(h => (
              <HotspotButton
                key={h.id}
                hotspot={h}
                isActive={activeId === h.id}
                isHovered={hoveredId === h.id}
                locked={isLocked(h)}
                onClick={() => handleClick(h.id)}
                onMouseEnter={() => setHoveredId(h.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
            ))}

            {/* Tooltip */}
            {hoveredHotspot && !activeId && (
              <div style={{
                ...ss.tooltip,
                left: `${hoveredHotspot.x}%`,
                top: `${hoveredHotspot.y - 9}%`,
                color: isLocked(hoveredHotspot) ? "#3a3050" : hoveredHotspot.color,
                borderColor: (isLocked(hoveredHotspot) ? "#3a3050" : hoveredHotspot.color) + "55",
                boxShadow: isLocked(hoveredHotspot) ? "none" : `0 0 12px ${hoveredHotspot.glow}`,
              }}>
                {isLocked(hoveredHotspot) ? "🔒 " : ""}{hoveredHotspot.label}
              </div>
            )}
          </div>
        </div>

        {/* Sliding panel */}
        <div ref={panelRef} style={{
          ...ss.panelShell,
          maxHeight: showPanel ? "700px" : "0px",
          opacity: showPanel ? 1 : 0,
          marginTop: showPanel ? 16 : 0,
          borderWidth: showPanel ? 1 : 0,
          paddingTop: showPanel ? 20 : 0,
          paddingBottom: showPanel ? 20 : 0,
        }}>
          {renderPanelContent()}
        </div>

        {/* Legend */}
        <div style={ss.legend}>
          {[
            { icon: "🔓", label: "Public" },
            { icon: "🔒", label: "Perlu login" },
            { icon: "🔑", label: "Admin only" },
            { icon: "⬜", label: "Terkunci (redup)" },
          ].map(l => (
            <span key={l.label} style={ss.legendItem}>{l.icon} <span style={{ color: "#9ca3af" }}>{l.label}</span></span>
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=IM+Fell+English&display=swap');
        @keyframes ping { 0%{transform:scale(1);opacity:.8} 70%{transform:scale(2.2);opacity:0} 100%{transform:scale(2.2);opacity:0} }
        @keyframes grain { 0%,100%{transform:translate(0,0)} 10%{transform:translate(-2%,-3%)} 30%{transform:translate(3%,2%)} 50%{transform:translate(-1%,4%)} 70%{transform:translate(2%,-2%)} 90%{transform:translate(-3%,1%)} }
        input:focus, textarea:focus { border-bottom-color: #7c5cbf !important; }
        textarea { font-family: 'IM Fell English', Georgia, serif; }
      `}</style>
    </div>
  );
}

// ─── Scene styles ─────────────────────────────────────────────────────────────
const ss: Record<string, CSSProperties> = {
  root: { minHeight: "100vh", background: "radial-gradient(ellipse at 40% 0%,#1a0a2e 0%,#06060f 60%)", fontFamily: "'IM Fell English',Georgia,serif", color: "#e2d9c8", position: "relative", overflow: "hidden" },
  grain: { position: "fixed", inset: "-200%", width: "400%", height: "400%", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, opacity: 0.04, pointerEvents: "none", zIndex: 0, animation: "grain 8s steps(1) infinite" },
  wrapper: { position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "32px 16px 48px" },
  titleRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 8 },
  glyph: { color: "#7c5cbf", fontSize: 22, opacity: 0.7 },
  title: { fontFamily: "'Cinzel',Georgia,serif", fontSize: "clamp(22px,5vw,38px)", fontWeight: 700, letterSpacing: ".12em", background: "linear-gradient(135deg,#d4b896 20%,#a07850 80%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", margin: 0 },
  subtitle: { textAlign: "center", fontSize: 11, letterSpacing: ".18em", color: "#6b5e4e", textTransform: "uppercase", marginBottom: 20 },
  sceneOuter: { borderRadius: 6, overflow: "hidden", border: "1px solid #2d1f0e", boxShadow: "0 0 60px rgba(100,50,10,.3)" },
  sceneInner: { position: "relative", width: "100%", aspectRatio: "1/1", overflow: "hidden", userSelect: "none" },
  bgImage: { width: "100%", height: "100%", objectFit: "cover", display: "block", imageRendering: "pixelated" },
  vignette: { position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%,transparent 40%,rgba(4,2,10,.55) 100%)", pointerEvents: "none" },
  hotspot: { position: "absolute", width: 44, height: 44, borderRadius: "50%", border: "1.5px solid", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .25s cubic-bezier(.34,1.56,.64,1)", backdropFilter: "blur(2px)", zIndex: 10 },
  ping: { position: "absolute", inset: -4, borderRadius: "50%", border: "1.5px solid", animation: "ping 2s ease-out infinite", pointerEvents: "none" },
  tooltip: { position: "absolute", transform: "translateX(-50%)", background: "rgba(6,4,18,.88)", border: "1px solid", borderRadius: 4, padding: "4px 12px", fontSize: 11, letterSpacing: ".1em", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 20, fontFamily: "'Cinzel',serif", fontWeight: 600, backdropFilter: "blur(8px)" },
  panelShell: { background: "rgba(14,10,26,.94)", border: "1px solid #2d1f3a", borderRadius: 6, backdropFilter: "blur(12px)", boxShadow: "0 8px 40px rgba(0,0,0,.5)", overflow: "hidden", transition: "max-height .4s cubic-bezier(.4,0,.2,1), opacity .3s ease, margin-top .3s ease" },
  legend: { display: "flex", gap: 16, justifyContent: "center", marginTop: 18, flexWrap: "wrap" },
  legendItem: { fontSize: 11, letterSpacing: ".08em", color: "#5a4f6a", display: "flex", alignItems: "center", gap: 4 },
};

// ─── Panel styles ─────────────────────────────────────────────────────────────
const ps: Record<string, CSSProperties> = {
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
  // Book cards
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 },
  bookCard: { background: "rgba(255,255,255,.02)", border: "1px solid #2d1f3a", borderRadius: 5, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 5 },
  bookTitle: { fontFamily: "'Cinzel',serif", fontSize: 13, fontWeight: 700, color: "#c9b99a", letterSpacing: ".04em", lineHeight: 1.3 },
  bookMeta: { fontFamily: "monospace", fontSize: 10, color: "#5a4f6a", letterSpacing: ".03em" },
  bookDesc: { fontSize: 12, color: "#7a6e60", lineHeight: 1.5, fontStyle: "italic", marginTop: 2 },
  stockBadge: { fontFamily: "monospace", fontSize: 10, border: "1px solid", borderRadius: 3, padding: "2px 7px", alignSelf: "flex-start", marginTop: 4 },
  empty: { color: "#5a4f6a", fontStyle: "italic", fontSize: 13, textAlign: "center", padding: "20px 0" },
  // Peminjaman
  pinjamCard: { background: "rgba(255,255,255,.02)", border: "1px solid #2d1f3a", borderRadius: 5, padding: "12px 14px", marginBottom: 8 },
  statusBadge: { fontFamily: "monospace", fontSize: 10, border: "1px solid", borderRadius: 3, padding: "2px 7px" },
  // Profile
  profileCard: { display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16, background: "rgba(255,255,255,.02)", border: "1px solid #2d1f3a", borderRadius: 5, padding: "14px" },
  profileAvatar: { width: 48, height: 48, borderRadius: "50%", background: "rgba(167,139,250,.15)", border: "1px solid #a78bfa55", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cinzel',serif", fontSize: 20, color: "#a78bfa", flexShrink: 0 },
  profileName: { fontFamily: "'Cinzel',serif", fontSize: 16, fontWeight: 700, color: "#e2d9c8", letterSpacing: ".06em", marginBottom: 4 },
  roleBadge: { fontFamily: "monospace", fontSize: 10, border: "1px solid", borderRadius: 3, padding: "2px 8px", display: "inline-block", marginBottom: 6, letterSpacing: ".06em", textTransform: "uppercase" },
  logoutBtn: { background: "rgba(248,113,113,.06)", border: "1px solid #f8717144", borderRadius: 4, color: "#f87171", fontFamily: "'Cinzel',serif", fontSize: 12, letterSpacing: ".08em", padding: "8px 18px", cursor: "pointer", width: "100%", marginTop: 4 },
};
