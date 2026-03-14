"use client";
import { useState, useEffect, FormEvent } from "react";
import { API, authHeaders, timeAgo, madingKategoriStyle } from "@/lib/utils";
import type { MadingPost, UserRole } from "@/types";
import { PanelHeader, Field, Feedback, LoadingDots, ps } from "@/components/shared/ui";

interface MadingPanelProps {
  onClose: () => void;
  role: UserRole;
  newPosts: MadingPost[];
  sendPresence: (aksi: string) => void;
}

export function MadingPanel({ onClose, role, newPosts, sendPresence }: MadingPanelProps) {
  const [posts, setPosts] = useState<MadingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"baca" | "posting">("baca");
  const [form, setForm] = useState({ judul: "", isi: "", kategori: "umum" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch(`${API}/api/mading`)
      .then(r => r.json()).then(d => { if (d.data) setPosts(d.data); })
      .catch(() => {}).finally(() => setLoading(false));
    sendPresence("mading");
    return () => sendPresence("browsing");
  }, []); // eslint-disable-line

  // Prepend new realtime posts
  useEffect(() => {
    if (newPosts.length > 0) setPosts(p => [...newPosts, ...p]);
  }, [newPosts]);

  async function handlePost(e: FormEvent) {
    e.preventDefault(); if (!form.judul || !form.isi) { setError("Judul dan isi wajib."); return; }
    setSubmitting(true); setError(""); setSuccess("");
    try {
      const r = await fetch(`${API}/api/user/mading`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.sukses) { setSuccess("Posting berhasil!"); setForm({ judul: "", isi: "", kategori: "umum" }); setTab("baca"); }
      else setError(d.error || "Gagal posting.");
    } catch { setError("Gagal terhubung."); }
    finally { setSubmitting(false); }
  }

  const kategoriOptions = [
    { value: "umum",       label: "Umum"         },
    { value: "pengumuman", label: "Pengumuman"    },
  ];

  return (
    <div style={ps.wrap}>
      <PanelHeader icon="📌" title="Mading Digital" sub="GET /api/mading  •  POST /api/user/mading" color="#fbbf24" onClose={onClose} />
      <div style={ps.toggleRow}>
        <button onClick={() => setTab("baca")} style={{ ...ps.toggleBtn, color: tab === "baca" ? "#e2d9c8" : "#5a4f6a", borderBottomColor: tab === "baca" ? "#fbbf24" : "transparent" }}>📋 Baca Mading</button>
        {role && <button onClick={() => setTab("posting")} style={{ ...ps.toggleBtn, color: tab === "posting" ? "#e2d9c8" : "#5a4f6a", borderBottomColor: tab === "posting" ? "#fbbf24" : "transparent" }}>✏️ Posting</button>}
      </div>

      {tab === "baca" && (
        <div>
          {loading && <LoadingDots />}
          {!loading && posts.length === 0 && <p style={ps.empty}>Mading masih kosong.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 440, overflowY: "auto", paddingRight: 4 }}>
            {posts.map(p => {
              const { color, icon } = madingKategoriStyle(p.Kategori);
              return (
                <div key={p.ID} style={{ background: "rgba(255,255,255,.02)", border: `1px solid ${color}25`, borderLeft: `3px solid ${color}`, borderRadius: "0 6px 6px 0", padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, fontWeight: 700, color: "#c9b99a" }}>{icon} {p.Judul}</div>
                    <span style={{ fontFamily: "monospace", fontSize: 9, color, border: `1px solid ${color}44`, borderRadius: 3, padding: "1px 6px", whiteSpace: "nowrap" }}>{p.Kategori}</span>
                  </div>
                  <p style={{ fontFamily: "'IM Fell English',Georgia,serif", fontSize: 13, color: "#9a8e80", lineHeight: 1.6, margin: 0, marginBottom: 8 }}>{p.Isi}</p>
                  <div style={{ display: "flex", gap: 10, fontFamily: "monospace", fontSize: 9, color: "#3d2f4a" }}>
                    <span>{p.User?.Nama || "Sistem"}</span>
                    <span>•</span>
                    <span>{timeAgo(p.CreatedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "posting" && (
        <div>
          {error && <Feedback type="error">{error}</Feedback>}
          {success && <Feedback type="success">{success}</Feedback>}
          <form onSubmit={handlePost} style={ps.form}>
            <Field label="Judul">
              <input type="text" placeholder="Judul postingan…" value={form.judul} onChange={e => setForm(f => ({ ...f, judul: e.target.value }))} style={ps.input} />
            </Field>
            <Field label="Isi">
              <textarea placeholder="Tulis informasi yang ingin kamu bagikan…" value={form.isi} onChange={e => setForm(f => ({ ...f, isi: e.target.value }))}
                style={{ ...ps.input, resize: "vertical", minHeight: 100 }} />
            </Field>
            <Field label="Kategori">
              <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))} style={{ ...ps.input, cursor: "pointer" }}>
                {kategoriOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <button type="submit" disabled={submitting} style={{ ...ps.submitBtn, borderColor: "#fbbf2466", color: "#fbbf24", background: "rgba(251,191,36,.08)", opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "···" : "Posting ke Mading"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
