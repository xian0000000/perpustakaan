"use client";
import { useState, useEffect, CSSProperties } from "react";
import { API, authHeaders, fmtDate } from "@/lib/utils";
import type { Peminjaman, BukuBaca } from "@/types";
import { PanelHeader, Feedback, LoadingDots, ps } from "@/components/shared/ui";

const readerStyle: Record<string, CSSProperties> = {
  shell: { marginTop: 16, background: "rgba(16,10,26,0.98)", border: "1px solid #3d2f4a", borderRadius: 8, padding: "28px 32px", maxHeight: 540, overflowY: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  judul: { fontFamily: "'Cinzel',serif", fontSize: 22, fontWeight: 700, color: "#d4b896", letterSpacing: ".05em", lineHeight: 1.3, marginBottom: 6 },
  penulis: { fontFamily: "'IM Fell English',Georgia,serif", fontSize: 14, color: "#7a6e60", fontStyle: "italic", marginBottom: 4 },
  meta: { fontFamily: "monospace", fontSize: 10, color: "#3d2f4a", letterSpacing: ".06em" },
  ornamen: { fontFamily: "'Cinzel',serif", fontSize: 36, color: "#251a35", flexShrink: 0, lineHeight: 1 },
  divider: { height: 1, background: "linear-gradient(90deg,transparent,#3d2f4a 20%,#6b4f2a 50%,#3d2f4a 80%,transparent)", margin: "18px 0" },
  paragraf: { fontFamily: "'IM Fell English',Georgia,serif", fontSize: 15.5, lineHeight: 2, color: "#c9b99a", textAlign: "justify", textIndent: "2.2em", margin: "0 0 14px 0" } as CSSProperties,
  tamat: { textAlign: "center", color: "#3d2f4a", fontFamily: "'Cinzel',serif", fontSize: 12, letterSpacing: ".25em", marginTop: 8 },
};

export function ThronePanel({ onClose }: {
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"pinjam" | "kembali" | "baca">("pinjam");
  const [inputId, setInputId] = useState("");
  const [result, setResult] = useState<Peminjaman | null>(null);
  const [bukuBaca, setBukuBaca] = useState<BukuBaca | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function reset() { setInputId(""); setResult(null); setError(""); setSuccess(""); setBukuBaca(null); }
  useEffect(reset, [tab]);

  async function handleAction() {
    if (!inputId.trim()) return;
    setLoading(true); setError(""); setSuccess(""); setResult(null); setBukuBaca(null);
    try {
      if (tab === "baca") {
        const r = await fetch(`${API}/api/user/baca/${inputId.trim()}`, { headers: authHeaders() });
        const d = await r.json();
        if (d.error) setError(d.error); else { setBukuBaca(d.data); setSuccess(d.message); }
      } else {
        const ep = tab === "pinjam" ? `/api/user/pinjam/${inputId.trim()}` : `/api/user/kembali/${inputId.trim()}`;
        const r = await fetch(`${API}${ep}`, { method: "POST", headers: authHeaders() });
        const d = await r.json();
        if (d.error) setError(d.error); else { setSuccess(d.message); setResult(d.data); }
      }
    } catch { setError("Gagal terhubung."); }
    finally { setLoading(false); }
  }

  const tabs = [
    { key: "pinjam"  as const, label: "Pinjam Buku",     color: "#38bdf8", ph: "ID buku…",       btn: "Pinjam" },
    { key: "kembali" as const, label: "Kembalikan Buku", color: "#34d399", ph: "ID peminjaman…", btn: "Kembalikan" },
    { key: "baca"    as const, label: "Baca Buku",       color: "#fb923c", ph: "ID buku…",       btn: "Buka Buku" },
  ];
  const cur = tabs.find(t => t.key === tab)!;

  return (
    <div style={ps.wrap}>
      <PanelHeader icon="📖" title="Kursi Pembaca" sub="POST /pinjam  •  /kembali  •  GET /baca" color="#38bdf8" onClose={onClose} />
      <div style={ps.toggleRow}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...ps.toggleBtn, color: tab === t.key ? "#e2d9c8" : "#5a4f6a", borderBottomColor: tab === t.key ? t.color : "transparent" }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "baca" && <p style={ps.tagline}>Masukkan ID buku yang sedang kamu pinjam untuk membacanya.</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input type="number" placeholder={cur.ph} value={inputId} onChange={e => setInputId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAction()} style={{ ...ps.input, flex: 1 }} />
        <button onClick={handleAction} disabled={loading}
          style={{ ...ps.submitBtn, padding: "8px 18px", width: "auto", borderColor: cur.color + "66", color: cur.color, background: cur.color + "12" }}>
          {loading ? "···" : cur.btn}
        </button>
      </div>
      {loading && <LoadingDots />}
      {error && <Feedback type="error">{error}</Feedback>}
      {success && !bukuBaca && <Feedback type="success">{success}</Feedback>}
      {result && (
        <div style={ps.card}>
          <div style={ps.bookTitle}>{result.Buku?.NamaBuku ?? `Buku #${result.BukuID}`}</div>
          <div style={ps.bookMeta}>✍ {result.Buku?.Penulis}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ ...ps.statusBadge, color: "#38bdf8", borderColor: "#38bdf855" }}>{result.Status}</span>
            <span style={ps.bookMeta}>📅 {fmtDate(result.TanggalPeminjaman)}</span>
          </div>
        </div>
      )}
      {bukuBaca && (
        <div style={readerStyle.shell}>
          <div style={readerStyle.header}>
            <div>
              <div style={readerStyle.judul}>{bukuBaca.NamaBuku}</div>
              <div style={readerStyle.penulis}>✍ {bukuBaca.Penulis}</div>
              <div style={readerStyle.meta}>📅 Dipinjam sejak {fmtDate(bukuBaca.TanggalPeminjaman)}</div>
            </div>
            <div style={readerStyle.ornamen}>✦</div>
          </div>
          <div style={readerStyle.divider} />
          <div>
            {bukuBaca.IsiBuku
              ? bukuBaca.IsiBuku.split(/\n\n+/).map((par, i) => <p key={i} style={readerStyle.paragraf}>{par.trim()}</p>)
              : <p style={{ ...readerStyle.paragraf, color: "#5a4f6a", fontStyle: "italic" }}>Buku ini belum memiliki isi.</p>}
          </div>
          <div style={readerStyle.divider} />
          <div style={readerStyle.tamat}>— T A M A T —</div>
        </div>
      )}
    </div>
  );
}
