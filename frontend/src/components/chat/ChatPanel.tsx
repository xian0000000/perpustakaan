"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { API, authHeaders, fmtDateTime } from "@/lib/utils";
import type { ChatMessage, PresenceUser } from "@/types";
import { PanelHeader, LoadingDots, ps } from "@/components/shared/ui";
import { aksiLabel } from "@/lib/utils";

interface ChatPanelProps {
  onClose: () => void;
  onlineUsers: PresenceUser[];
  sendChat: (pesan: string) => void;
  /** Parent calls this to push a WS message directly into the panel */
  onNewMessage: (msg: ChatMessage) => void;
  /** Parent stores the push function via this ref so it can call onNewMessage */
  pushRef: React.MutableRefObject<((msg: ChatMessage) => void) | null>;
  sendPresence: (aksi: string, detail?: string) => void;
}

export function ChatPanel({ onClose, onlineUsers, sendChat, pushRef, sendPresence }: ChatPanelProps) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const myNama = typeof window !== "undefined" ? localStorage.getItem("nama") ?? "" : "";
  const myId   = typeof window !== "undefined" ? parseInt(localStorage.getItem("userId") ?? "0") : 0;

  // Expose push function to parent via ref — called directly when WS message arrives
  const appendMessage = useCallback((msg: ChatMessage) => {
    setHistory(h => {
      // Replace optimistic (temp ID > 1e12) from same user+text, or skip if real ID already exists
      const realIds = new Set(h.filter(m => m.ID < 1e12).map(m => m.ID));
      if (realIds.has(msg.ID)) return h; // already have it

      const optimisticIdx = h.findIndex(
        m => m.ID > 1e12 && m.Nama === msg.Nama && m.Pesan === msg.Pesan
      );
      if (optimisticIdx !== -1) {
        // Swap optimistic for confirmed server message
        const updated = [...h];
        updated[optimisticIdx] = msg;
        return updated;
      }
      return [...h, msg];
    });
  }, []);

  useEffect(() => {
    pushRef.current = appendMessage;
    return () => { pushRef.current = null; };
  }, [appendMessage, pushRef]);

  // Load history on mount
  useEffect(() => {
    fetch(`${API}/api/user/chat/history`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.data) setHistory(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
    sendPresence("chat");
    return () => sendPresence("browsing");
  }, []); // eslint-disable-line

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    // Optimistic: show immediately, will be replaced by server echo
    const optimistic: ChatMessage = {
      ID: Date.now(), // temp ID > 1e12 by year ~2286, safe marker
      Pesan: text,
      Nama: myNama,
      Waktu: new Date().toISOString(),
      UserID: myId,
    };
    setHistory(h => [...h, optimistic]);
    sendChat(text);
    setInput("");
  }

  return (
    <div style={ps.wrap}>
      <PanelHeader icon="💬" title="Ruang Bicara" sub="WebSocket chat  •  realtime" color="#f472b6" onClose={onClose} />
      <div style={{ display: "flex", gap: 12 }}>
        {/* Chat messages */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ height: 380, overflowY: "auto", background: "rgba(0,0,0,.2)", borderRadius: 6, border: "1px solid #1e1e3a", padding: "12px", marginBottom: 10 }}>
            {loading && <LoadingDots />}
            {!loading && history.length === 0 && <p style={{ ...ps.empty, paddingTop: 60 }}>Belum ada percakapan. Jadilah yang pertama!</p>}
            {history.map((m, i) => {
              const isMine = m.Nama === myNama;
              return (
                <div key={m.ID ?? i} style={{ marginBottom: 10, display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                  {!isMine && <div style={{ fontFamily: "'Cinzel',serif", fontSize: 10, color: "#c084fc", marginBottom: 3, letterSpacing: ".06em" }}>{m.Nama ?? m.User?.Nama}</div>}
                  <div style={{
                    maxWidth: "76%", padding: "8px 12px", borderRadius: isMine ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                    background: isMine ? "rgba(192,132,252,.15)" : "rgba(255,255,255,.04)",
                    border: `1px solid ${isMine ? "#c084fc33" : "#2d1f3a"}`,
                    fontFamily: "'IM Fell English',Georgia,serif", fontSize: 13, color: "#e2d9c8", lineHeight: 1.5,
                  }}>
                    {m.Pesan}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 9, color: "#3d2f4a", marginTop: 3 }}>{fmtDateTime(m.Waktu)}</div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Tulis pesanmu… (Enter untuk kirim)"
              style={{ ...ps.input, flex: 1, borderBottom: "1px solid #c084fc55", padding: "10px 8px" }}
            />
            <button onClick={handleSend} style={{ ...ps.submitBtn, width: "auto", padding: "8px 16px", borderColor: "#c084fc55", color: "#c084fc" }}>
              Kirim
            </button>
          </div>
        </div>

        {/* Online users sidebar */}
        <div style={{ width: 140, flexShrink: 0 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 10, color: "#5a4f6a", letterSpacing: ".12em", marginBottom: 8, textTransform: "uppercase" }}>
            🟢 Online ({onlineUsers.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {onlineUsers.length === 0 && <div style={{ fontFamily: "monospace", fontSize: 10, color: "#3d2f4a", fontStyle: "italic" }}>Tidak ada</div>}
            {onlineUsers.map(u => {
              const { icon, color } = aksiLabel(u.aksi);
              return (
                <div key={u.user_id} style={{ background: "rgba(255,255,255,.02)", border: "1px solid #2d1f3a", borderRadius: 5, padding: "7px 10px" }}>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: "#c9b99a", marginBottom: 2 }}>{u.nama}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 9, color }}>
                    {icon} {u.aksi.replace(/_/g, " ")}
                    {u.detail ? <div style={{ color: "#5a4f6a", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.detail}</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
