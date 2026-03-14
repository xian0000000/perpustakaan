"use client";
import { useState, useEffect, FormEvent } from "react";
import { API, authHeaders, fmtDate, fmtDateTime, aksiLabel } from "@/lib/utils";
import type { Buku, User, Peminjaman, AktivitasUser, Stats, PresenceUser } from "@/types";
import { PanelHeader, Field, Feedback, LoadingDots, ps, MC, roleAdmin, rolePengguna } from "@/components/shared/ui";

type AdminTab = "stats" | "monitoring" | "buku" | "users" | "peminjaman";

export function AdminPanel({ onClose, onlineUsers }: { onClose: () => void; onlineUsers: PresenceUser[] }) {
  const [tab, setTab] = useState<AdminTab>("stats");
  const tabs: { key: AdminTab; icon: string; label: string; color: string }[] = [
    { key: "stats",      icon: "📊", label: "Statistik",  color: "#fbbf24" },
    { key: "monitoring", icon: "🔭", label: "Monitoring", color: "#f472b6" },
    { key: "buku",       icon: "📚", label: "Buku",       color: "#fb923c" },
    { key: "users",      icon: "👥", label: "User",       color: "#a78bfa" },
    { key: "peminjaman", icon: "📋", label: "Peminjaman", color: "#38bdf8" },
  ];
  return (
    <div style={ps.wrap}>
      <PanelHeader icon="⚗️" title="Ruang Arsip Admin" sub="Admin Dashboard" color="#fbbf24" onClose={onClose} />
      <div style={{ ...ps.toggleRow, gap: 0, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...ps.toggleBtn, color: tab === t.key ? "#e2d9c8" : "#5a4f6a", borderBottomColor: tab === t.key ? t.color : "transparent", whiteSpace: "nowrap", fontSize: 11 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === "stats"      && <AdminStats />}
      {tab === "monitoring" && <AdminMonitoring onlineUsers={onlineUsers} />}
      {tab === "buku"       && <AdminBuku />}
      {tab === "users"      && <AdminUsers />}
      {tab === "peminjaman" && <AdminPeminjaman />}
    </div>
  );
}

// ── Stats ──────────────────────────────────────────────────────────────────
function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { fetch(`${API}/api/admin/stats`, { headers: authHeaders() }).then(r => r.json()).then(d => { if (d.sukses) setStats(d.data); else setError(d.error || "Gagal"); }).catch(() => setError("Gagal")).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingDots />; if (error) return <Feedback type="error">{error}</Feedback>; if (!stats) return null;
  const cards = [
    { label: "Total Buku",       value: stats.total_buku,       icon: "📚", color: "#fb923c" },
    { label: "Total User",       value: stats.total_user,       icon: "👥", color: "#a78bfa" },
    { label: "Total Peminjaman", value: stats.total_peminjaman, icon: "📋", color: "#38bdf8" },
    { label: "Dipinjam Aktif",   value: stats.peminjaman_aktif, icon: "🔴", color: "#f87171" },
  ];
  return (
    <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>
      {cards.map(c => (
        <div key={c.label} style={{ background: c.color + "10", border: `1px solid ${c.color}30`, borderRadius: 8, padding: "16px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{c.icon}</div>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 30, fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.value}</div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: "#6b5e4e", marginTop: 5 }}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Monitoring (realtime dari WS + REST fallback) ──────────────────────────
function AdminMonitoring({ onlineUsers }: { onlineUsers: PresenceUser[] }) {
  const [view, setView] = useState<"realtime" | "log">("realtime");
  const [log, setLog] = useState<AktivitasUser[]>([]); const [loadingLog, setLoadingLog] = useState(false); const [error, setError] = useState("");

  function loadLog() {
    setLoadingLog(true); setError("");
    fetch(`${API}/api/admin/monitoring`, { headers: authHeaders() })
      .then(r => r.json()).then(d => { if (d.data) setLog(d.data); else setError(d.error || "Gagal"); })
      .catch(() => setError("Gagal")).finally(() => setLoadingLog(false));
  }
  useEffect(() => { if (view === "log") loadLog(); }, [view]);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ ...ps.toggleRow, marginBottom: 12 }}>
        <button onClick={() => setView("realtime")} style={{ ...ps.toggleBtn, fontSize: 11, color: view === "realtime" ? "#e2d9c8" : "#5a4f6a", borderBottomColor: view === "realtime" ? "#f472b6" : "transparent" }}>🟢 Realtime ({onlineUsers.length} online)</button>
        <button onClick={() => setView("log")} style={{ ...ps.toggleBtn, fontSize: 11, color: view === "log" ? "#e2d9c8" : "#5a4f6a", borderBottomColor: view === "log" ? "#f472b6" : "transparent" }}>📜 Log Aktivitas</button>
        {view === "log" && <button onClick={loadLog} style={{ ...ps.submitBtn, marginLeft: "auto", padding: "3px 10px", width: "auto", fontSize: 10 }}>↺</button>}
      </div>

      {view === "realtime" && (
        <div>
          {onlineUsers.length === 0 && <p style={ps.empty}>Tidak ada pengguna online saat ini.</p>}
          {onlineUsers.map(u => {
            const { icon, color, label } = aksiLabel(u.aksi);
            return (
              <div key={u.user_id} style={{ ...ps.card, display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginBottom: 6 }}>
                <div style={{ ...ps.profileAvatar, width: 36, height: 36, fontSize: 13, flexShrink: 0, borderColor: color + "55", background: color + "15" }}>{u.nama.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: "#c9b99a" }}>{u.nama}</span>
                    <span style={{ ...ps.statusBadge, color, borderColor: color + "44", background: color + "10", fontSize: 9 }}>{icon} {label}</span>
                    {u.role === "admin" && <span style={{ ...ps.statusBadge, color: "#fbbf24", borderColor: "#fbbf2444", fontSize: 9 }}>admin</span>}
                  </div>
                  {u.detail && <div style={{ fontFamily: "'IM Fell English',serif", fontSize: 11, color: "#7a6e60", marginTop: 3, fontStyle: "italic" }}>📖 {u.detail}</div>}
                </div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d39988", flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}

      {view === "log" && (
        <div>
          {loadingLog && <LoadingDots />}
          {error && <Feedback type="error">{error}</Feedback>}
          {!loadingLog && log.map(a => {
            const { icon, color } = aksiLabel(a.Aksi);
            return (
              <div key={a.ID} style={{ ...ps.card, display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", marginBottom: 5 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: "#c9b99a" }}>{a.User?.Nama ?? `User #${a.UserID}`}</span>
                    <span style={{ ...ps.statusBadge, color, borderColor: color + "44", background: color + "10", fontSize: 9 }}>{a.Aksi.replace(/_/g, " ")}</span>
                    {a.TargetID > 0 && <span style={{ fontFamily: "monospace", fontSize: 9, color: "#5a4f6a" }}>→ #{a.TargetID}</span>}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 9, color: "#3d2f4a", marginTop: 2 }}>{fmtDateTime(a.Waktu)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CRUD Buku ──────────────────────────────────────────────────────────────
function AdminBuku() {
  const [tab, setTab] = useState<"tambah" | "update" | "hapus">("tambah");
  const [form, setForm] = useState({ nama_buku: "", penulis: "", isi_buku: "", stock: "" });
  const [targetId, setTargetId] = useState(""); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  useEffect(() => { setForm({ nama_buku: "", penulis: "", isi_buku: "", stock: "" }); setTargetId(""); setError(""); setSuccess(""); }, [tab]);
  function sf(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); }
  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError(""); setSuccess("");
    try {
      let url = `${API}/api/admin/buku`; let method = "POST"; const body: Record<string, unknown> = {};
      if (tab === "tambah") { Object.assign(body, { nama_buku: form.nama_buku, penulis: form.penulis, isi_buku: form.isi_buku, stock: Number(form.stock) }); }
      else if (tab === "update") { if (!targetId) { setError("ID wajib."); setLoading(false); return; } url += `/${targetId}`; method = "PUT"; if (form.nama_buku) body.nama_buku = form.nama_buku; if (form.penulis) body.penulis = form.penulis; if (form.isi_buku) body.isi_buku = form.isi_buku; if (form.stock) body.stock = Number(form.stock); }
      else { if (!targetId) { setError("ID wajib."); setLoading(false); return; } url += `/${targetId}`; method = "DELETE"; }
      const r = await fetch(url, { method, headers: authHeaders(), body: method !== "DELETE" ? JSON.stringify(body) : undefined });
      const d = await r.json();
      if (d.sukses) setSuccess(d.pesan || "Berhasil!"); else setError(d.pesan || d.error || "Gagal.");
    } catch { setError("Gagal terhubung."); } finally { setLoading(false); }
  }
  const tabs = [{ key: "tambah" as const, method: "POST", color: "#38bdf8" }, { key: "update" as const, method: "PUT", color: "#fb923c" }, { key: "hapus" as const, method: "DELETE", color: "#f87171" }];
  const cur = tabs.find(t => t.key === tab)!;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={ps.toggleRow}>{tabs.map(t => (<button key={t.key} onClick={() => setTab(t.key)} style={{ ...ps.toggleBtn, color: tab === t.key ? "#e2d9c8" : "#5a4f6a", borderBottomColor: tab === t.key ? t.color : "transparent" }}><span style={{ fontFamily: "monospace", fontSize: 10, marginRight: 5, color: tab === t.key ? MC[t.method] : "#5a4f6a" }}>{t.method}</span>{t.key}</button>))}</div>
      {error && <Feedback type="error">{error}</Feedback>}{success && <Feedback type="success">{success}</Feedback>}
      <form onSubmit={handleSubmit} style={ps.form}>
        {tab !== "tambah" && <Field label="ID Buku"><input type="number" placeholder="ID…" value={targetId} onChange={e => setTargetId(e.target.value)} style={ps.input} /></Field>}
        {tab !== "hapus" && (<><Field label="Nama Buku"><input type="text" placeholder="Judul…" value={form.nama_buku} onChange={e => sf("nama_buku", e.target.value)} style={ps.input} /></Field><Field label="Penulis"><input type="text" placeholder="Penulis…" value={form.penulis} onChange={e => sf("penulis", e.target.value)} style={ps.input} /></Field><Field label="Isi Buku"><textarea placeholder="Isi lengkap buku…" value={form.isi_buku} onChange={e => sf("isi_buku", e.target.value)} style={{ ...ps.input, minHeight: 90, resize: "vertical" }} /></Field><Field label="Stok"><input type="number" placeholder="0" value={form.stock} onChange={e => sf("stock", e.target.value)} style={ps.input} /></Field></>)}
        {tab === "hapus" && <p style={ps.tagline}>Buku yang sedang dipinjam tidak dapat dihapus.</p>}
        <button type="submit" disabled={loading} style={{ ...ps.submitBtn, opacity: loading ? 0.6 : 1, borderColor: cur.color + "55", color: cur.color, background: cur.color + "10" }}>{loading ? "···" : tab === "tambah" ? "Tambah Buku" : tab === "update" ? "Simpan Perubahan" : "Hapus Buku"}</button>
      </form>
    </div>
  );
}

// ── CRUD Users ─────────────────────────────────────────────────────────────
function AdminUsers() {
  const [sub, setSub] = useState<"list" | "tambah" | "update" | "hapus">("list");
  const [users, setUsers] = useState<User[]>([]); const [loadingList, setLoadingList] = useState(true);
  const [form, setForm] = useState({ nama: "", password: "", saldo: "", role: "pengguna" });
  const [targetId, setTargetId] = useState(""); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  function loadUsers() { setLoadingList(true); fetch(`${API}/api/admin/users`, { headers: authHeaders() }).then(r => r.json()).then(d => { if (d.sukses) setUsers(d.data); }).finally(() => setLoadingList(false)); }
  useEffect(() => { if (sub === "list") loadUsers(); setError(""); setSuccess(""); setForm({ nama: "", password: "", saldo: "", role: "pengguna" }); setTargetId(""); }, [sub]);
  function sf(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); }
  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError(""); setSuccess("");
    try {
      let url = `${API}/api/admin/users`; let method = "POST"; const body: Record<string, unknown> = {};
      if (sub === "tambah") { if (!form.nama || !form.password) { setError("Nama & password wajib."); setLoading(false); return; } Object.assign(body, { nama: form.nama, password: form.password, saldo: Number(form.saldo) || 0, role: form.role }); }
      else if (sub === "update") { if (!targetId) { setError("ID wajib."); setLoading(false); return; } url += `/${targetId}`; method = "PUT"; if (form.nama) body.nama = form.nama; if (form.password) body.password = form.password; if (form.saldo) body.saldo = Number(form.saldo); if (form.role) body.role = form.role; }
      else { if (!targetId) { setError("ID wajib."); setLoading(false); return; } url += `/${targetId}`; method = "DELETE"; }
      const r = await fetch(url, { method, headers: authHeaders(), body: method !== "DELETE" ? JSON.stringify(body) : undefined });
      const d = await r.json();
      if (d.sukses) { setSuccess(d.pesan || "Berhasil!"); } else setError(d.error || d.pesan || "Gagal.");
    } catch { setError("Gagal."); } finally { setLoading(false); }
  }
  const subTabs: { key: typeof sub; label: string; color: string }[] = [{ key: "list", label: "Daftar", color: "#a78bfa" }, { key: "tambah", label: "Tambah", color: "#38bdf8" }, { key: "update", label: "Update", color: "#fb923c" }, { key: "hapus", label: "Hapus", color: "#f87171" }];
  return (
    <div style={{ marginTop: 12 }}>
      <div style={ps.toggleRow}>{subTabs.map(t => (<button key={t.key} onClick={() => setSub(t.key)} style={{ ...ps.toggleBtn, fontSize: 11, color: sub === t.key ? "#e2d9c8" : "#5a4f6a", borderBottomColor: sub === t.key ? t.color : "transparent" }}>{t.label}</button>))}</div>
      {sub === "list" && (loadingList ? <LoadingDots /> : <div style={{ marginTop: 8 }}>{users.length === 0 && <p style={ps.empty}>Tidak ada user.</p>}{users.map(u => (<div key={u.ID} style={{ ...ps.card, display: "flex", alignItems: "center", gap: 10, marginBottom: 6, padding: "10px 14px" }}><div style={{ ...ps.profileAvatar, width: 36, height: 36, fontSize: 13, flexShrink: 0 }}>{u.Nama.charAt(0).toUpperCase()}</div><div style={{ flex: 1 }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: "#c9b99a" }}>{u.Nama}</div><div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}><span style={{ ...ps.roleBadge, display: "inline-flex", ...(u.Role === "admin" ? roleAdmin : rolePengguna), fontSize: 9 }}>{u.Role}</span><span style={ps.bookMeta}>Rp {u.Saldo.toLocaleString("id-ID")}</span><span style={ps.bookMeta}>#{u.ID}</span></div></div></div>))}</div>)}
      {sub !== "list" && (<>{error && <Feedback type="error">{error}</Feedback>}{success && <Feedback type="success">{success}</Feedback>}<form onSubmit={handleSubmit} style={ps.form}>{(sub === "update" || sub === "hapus") && <Field label="ID User"><input type="number" placeholder="ID…" value={targetId} onChange={e => setTargetId(e.target.value)} style={ps.input} /></Field>}{sub !== "hapus" && (<><Field label={sub === "update" ? "Nama Baru (opsional)" : "Nama"}><input type="text" placeholder="nama_user" value={form.nama} onChange={e => sf("nama", e.target.value)} style={ps.input} /></Field><Field label={sub === "update" ? "Password Baru (opsional)" : "Password"}><input type="password" placeholder="••••••" value={form.password} onChange={e => sf("password", e.target.value)} style={ps.input} /></Field><Field label="Saldo"><input type="number" placeholder="0" value={form.saldo} onChange={e => sf("saldo", e.target.value)} style={ps.input} /></Field><Field label="Role"><select value={form.role} onChange={e => sf("role", e.target.value)} style={{ ...ps.input, cursor: "pointer" }}><option value="pengguna">pengguna</option><option value="admin">admin</option></select></Field></>)}{sub === "hapus" && <p style={ps.tagline}>User dengan peminjaman aktif tidak bisa dihapus.</p>}<button type="submit" disabled={loading} style={{ ...ps.submitBtn, opacity: loading ? 0.6 : 1, borderColor: subTabs.find(t => t.key === sub)!.color + "55", color: subTabs.find(t => t.key === sub)!.color, background: subTabs.find(t => t.key === sub)!.color + "10" }}>{loading ? "···" : sub === "tambah" ? "Tambah User" : sub === "update" ? "Simpan" : "Hapus User"}</button></form></>)}
    </div>
  );
}

// ── CRUD Peminjaman ────────────────────────────────────────────────────────
function AdminPeminjaman() {
  const [sub, setSub] = useState<"list" | "update" | "hapus">("list");
  const [filter, setFilter] = useState<"" | "dipinjam" | "dikembalikan">("");
  const [list, setList] = useState<Peminjaman[]>([]); const [loadingList, setLoadingList] = useState(true);
  const [targetId, setTargetId] = useState(""); const [newStatus, setNewStatus] = useState("dikembalikan");
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  function loadList() { setLoadingList(true); const q = filter ? `?status=${filter}` : ""; fetch(`${API}/api/admin/peminjaman${q}`, { headers: authHeaders() }).then(r => r.json()).then(d => { if (d.sukses) setList(d.data ?? []); else setError(d.error || "Gagal"); }).catch(() => setError("Gagal")).finally(() => setLoadingList(false)); }
  useEffect(() => { if (sub === "list") loadList(); setError(""); setSuccess(""); setTargetId(""); }, [sub, filter]); // eslint-disable-line
  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); if (!targetId) { setError("ID wajib."); return; } setLoading(true); setError(""); setSuccess("");
    try {
      const r = sub === "update"
        ? await fetch(`${API}/api/admin/peminjaman/${targetId}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ status: newStatus }) })
        : await fetch(`${API}/api/admin/peminjaman/${targetId}`, { method: "DELETE", headers: authHeaders() });
      const d = await r.json();
      if (d.sukses) setSuccess(d.pesan || "Berhasil!"); else setError(d.error || d.pesan || "Gagal.");
    } catch { setError("Gagal."); } finally { setLoading(false); }
  }
  const subTabs: { key: typeof sub; label: string; color: string }[] = [{ key: "list", label: "Daftar", color: "#38bdf8" }, { key: "update", label: "Update Status", color: "#fb923c" }, { key: "hapus", label: "Hapus", color: "#f87171" }];
  return (
    <div style={{ marginTop: 12 }}>
      <div style={ps.toggleRow}>{subTabs.map(t => (<button key={t.key} onClick={() => setSub(t.key)} style={{ ...ps.toggleBtn, fontSize: 11, color: sub === t.key ? "#e2d9c8" : "#5a4f6a", borderBottomColor: sub === t.key ? t.color : "transparent" }}>{t.label}</button>))}</div>
      {sub === "list" && (<div><div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>{(["", "dipinjam", "dikembalikan"] as const).map(f => (<button key={f} onClick={() => setFilter(f)} style={{ ...ps.submitBtn, width: "auto", padding: "4px 10px", fontSize: 10, borderColor: filter === f ? "#38bdf866" : "#2d1f3a", color: filter === f ? "#38bdf8" : "#5a4f6a", background: filter === f ? "rgba(56,189,248,.1)" : "transparent" }}>{f === "" ? "Semua" : f}</button>))}</div>{loadingList ? <LoadingDots /> : (list.length === 0 ? <p style={ps.empty}>Tidak ada data.</p> : list.map(p => (<div key={p.ID} style={{ ...ps.card, marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><div><span style={ps.bookMeta}>#{p.ID} — </span><span style={{ ...ps.bookTitle, fontSize: 12 }}>{p.Buku?.NamaBuku ?? `Buku #${p.BukuID}`}</span></div><span style={{ ...ps.statusBadge, ...(p.Status === "dipinjam" ? { color: "#38bdf8", borderColor: "#38bdf855" } : { color: "#34d399", borderColor: "#34d39955" }) }}>{p.Status}</span></div><div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}><span style={ps.bookMeta}>👤 {p.User?.Nama ?? `#${p.UserID}`}</span><span style={ps.bookMeta}>📅 {fmtDate(p.TanggalPeminjaman)}</span>{p.TanggalPengembalian && <span style={ps.bookMeta}>↩ {fmtDate(p.TanggalPengembalian)}</span>}</div></div>)))}</div>)}
      {sub !== "list" && (<>{error && <Feedback type="error">{error}</Feedback>}{success && <Feedback type="success">{success}</Feedback>}<form onSubmit={handleSubmit} style={ps.form}><Field label="ID Peminjaman"><input type="number" placeholder="ID…" value={targetId} onChange={e => setTargetId(e.target.value)} style={ps.input} /></Field>{sub === "update" && <Field label="Status Baru"><select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ ...ps.input, cursor: "pointer" }}><option value="dikembalikan">dikembalikan</option><option value="dipinjam">dipinjam</option></select></Field>}{sub === "hapus" && <p style={ps.tagline}>Peminjaman aktif tidak bisa dihapus.</p>}<button type="submit" disabled={loading} style={{ ...ps.submitBtn, opacity: loading ? 0.6 : 1, borderColor: sub === "update" ? "#fb923c55" : "#f8717155", color: sub === "update" ? "#fb923c" : "#f87171", background: sub === "update" ? "rgba(251,146,60,.08)" : "rgba(248,113,113,.08)" }}>{loading ? "···" : sub === "update" ? "Update Status" : "Hapus"}</button></form></>)}
    </div>
  );
}
