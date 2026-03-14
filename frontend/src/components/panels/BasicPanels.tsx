"use client";
import { useState, useEffect, FormEvent } from "react";
import { API, authHeaders, clearAuth, fmtDate } from "@/lib/utils";
import type { Buku, User, UserRole } from "@/types";
import { PanelHeader, Field, Feedback, LoadingDots, ps, rolePengguna, roleAdmin } from "@/components/shared/ui";

// ─── Auth Panel ────────────────────────────────────────────────────────────
export function AuthPanel({ onClose, onLogin }: { onClose: () => void; onLogin: (role: UserRole) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [nama, setNama] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => { setNama(""); setPassword(""); setError(""); setSuccess(""); }, [isRegister]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); if (!nama || !password) { setError("Nama dan password wajib!"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${API}/api/${isRegister ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nama, password }),
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
      <p style={ps.tagline}>{isRegister ? "Tuliskan namamu dalam buku pendaftaran." : "Buktikan identitasmu kepada penjaga gerbang."}</p>
      {error && <Feedback type="error">{error}</Feedback>}
      {success && <Feedback type="success">{success}</Feedback>}
      <form onSubmit={handleSubmit} style={ps.form}>
        <Field label="Nama"><input type="text" placeholder="nama_pengguna" value={nama} onChange={e => setNama(e.target.value)} style={ps.input} autoComplete="username" /></Field>
        <Field label="Kata Sandi"><input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={ps.input} /></Field>
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

// ─── Bookshelf Panel ───────────────────────────────────────────────────────
export function BookshelfPanel({ onClose }: { onClose: () => void }) {
  const [books, setBooks] = useState<Buku[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => {
    fetch(`${API}/api/buku`)
      .then(async r => { const d = await r.json(); if (d.sukses) setBooks(d.data ?? []); else setError(d.pesan || d.error || "Gagal"); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  return (
    <div style={ps.wrap}>
      <PanelHeader icon="📚" title="Rak Kitab Besar" sub="GET /api/buku" color="#fb923c" onClose={onClose} />
      <p style={ps.tagline}>Semua koleksi kitab yang tersedia di perpustakaan ini.</p>
      {loading && <LoadingDots />}{error && <Feedback type="error">{error}</Feedback>}
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

// ─── Single Book Panel ─────────────────────────────────────────────────────
export function SingleBookPanel({ onClose }: { onClose: () => void }) {
  const [bookId, setBookId] = useState(""); const [book, setBook] = useState<Buku | null>(null);
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function search() {
    if (!bookId.trim()) return; setLoading(true); setError(""); setBook(null);
    try { const r = await fetch(`${API}/api/buku/${bookId.trim()}`); const d = await r.json(); if (d.sukses) setBook(d.data); else setError(d.pesan || "Tidak ditemukan."); }
    catch { setError("Gagal terhubung."); } finally { setLoading(false); }
  }
  return (
    <div style={ps.wrap}>
      <PanelHeader icon="🔍" title="Lemari Katalog" sub="GET /api/buku/:id" color="#34d399" onClose={onClose} />
      <p style={ps.tagline}>Cari kitab berdasarkan nomor ID-nya.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input type="number" placeholder="Masukkan ID buku…" value={bookId} onChange={e => setBookId(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} style={{ ...ps.input, flex: 1 }} />
        <button onClick={search} style={{ ...ps.submitBtn, padding: "8px 18px", width: "auto" }}>Cari</button>
      </div>
      {loading && <LoadingDots />}{error && <Feedback type="error">{error}</Feedback>}
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

// ─── Profile Panel ─────────────────────────────────────────────────────────
export function ProfilePanel({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => {
    fetch(`${API}/api/user/me`, { headers: authHeaders() })
      .then(r => r.json()).then(d => { if (d.data) setUser(d.data); else setError(d.error || "Gagal"); })
      .catch(() => setError("Gagal terhubung.")).finally(() => setLoading(false));
  }, []);
  function handleLogout() { clearAuth(); onLogout(); onClose(); }
  return (
    <div style={ps.wrap}>
      <PanelHeader icon="👤" title="Cermin Jiwa" sub="GET /api/user/me" color="#a78bfa" onClose={onClose} />
      <p style={ps.tagline}>Identitasmu yang tercatat dalam arsip perpustakaan.</p>
      {loading && <LoadingDots />}{error && <Feedback type="error">{error}</Feedback>}
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

// ─── History Panel ─────────────────────────────────────────────────────────
export function HistoryPanel({ onClose }: { onClose: () => void }) {
  const [list, setList] = useState<import("@/types").Peminjaman[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => {
    fetch(`${API}/api/user/peminjaman`, { headers: authHeaders() })
      .then(r => r.json()).then(d => { if (d.data) setList(d.data); else setError(d.error || "Gagal"); })
      .catch(() => setError("Gagal terhubung.")).finally(() => setLoading(false));
  }, []);
  return (
    <div style={ps.wrap}>
      <PanelHeader icon="📋" title="Papan Riwayat" sub="GET /api/user/peminjaman" color="#f472b6" onClose={onClose} />
      <p style={ps.tagline}>Semua riwayat peminjaman buku milikmu.</p>
      {loading && <LoadingDots />}{error && <Feedback type="error">{error}</Feedback>}
      {!loading && !error && list.length === 0 && <p style={ps.empty}>Belum ada riwayat peminjaman.</p>}
      {list.map(p => (
        <div key={p.ID} style={ps.card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div style={ps.bookTitle}>{p.Buku?.NamaBuku ?? `Buku #${p.BukuID}`}</div>
            <span style={{ ...ps.statusBadge, ...(p.Status === "dipinjam" ? { color: "#38bdf8", borderColor: "#38bdf855", background: "rgba(56,189,248,.08)" } : { color: "#34d399", borderColor: "#34d39955", background: "rgba(52,211,153,.08)" }) }}>{p.Status}</span>
          </div>
          <div style={ps.bookMeta}>✍ {p.Buku?.Penulis}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
            <span style={ps.bookMeta}>📅 {fmtDate(p.TanggalPeminjaman)}</span>
            {p.TanggalPengembalian && <span style={ps.bookMeta}>↩ {fmtDate(p.TanggalPengembalian)}</span>}
          </div>
          <div style={{ ...ps.bookMeta, marginTop: 4 }}>ID Peminjaman: #{p.ID}</div>
        </div>
      ))}
    </div>
  );
}
