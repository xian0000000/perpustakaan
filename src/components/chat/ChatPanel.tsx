"use client";
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { API, authHeaders, fmtDateTime } from "@/lib/utils";
import type { ChatMessage, PresenceUser } from "@/types";
import { PanelHeader, LoadingDots, ps } from "@/components/shared/ui";
import { aksiLabel } from "@/lib/utils";

interface ChatPanelProps {
  onClose: () => void;
  onlineUsers: PresenceUser[];
  onlineCount: number;
  sendChat: (pesan: string) => void;
  /** Parent calls this to push a single new WS "chat" message directly into the panel */
  pushRef: React.MutableRefObject<((msg: ChatMessage) => void) | null>;
  /** Parent calls this when WS "pesan_lama" fires — used as fallback if REST fails */
  loadRef: React.MutableRefObject<((msgs: ChatMessage[]) => void) | null>;
  sendPresence: (aksi: string, detail?: string) => void;
}

// Memoised message list — only re-renders when messages array changes
const ChatMessages = memo(function ChatMessages({
  messages,
  myNama,
  bottomRef,
}: {
  messages: ChatMessage[];
  myNama: string;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  const visible = messages.slice(-50); // mirrors App.js: messages.slice(-50)

  return (
    <div style={{
      height: 380, overflowY: "auto",
      background: "rgba(0,0,0,.2)", borderRadius: 6,
      border: "1px solid #1e1e3a", padding: "12px", marginBottom: 10,
    }}>
      {visible.length === 0 && (
        <p style={{ ...ps.empty, paddingTop: 60 }}>
          Belum ada percakapan. Jadilah yang pertama!
        </p>
      )}
      {visible.map((m, i) => {
        const isMine = m.Nama === myNama;
        return (
          <div key={m.ID ?? i} style={{
            marginBottom: 10, display: "flex", flexDirection: "column",
            alignItems: isMine ? "flex-end" : "flex-start",
          }}>
            {!isMine && (
              <div style={{
                fontFamily: "'Cinzel',serif", fontSize: 10,
                color: "#c084fc", marginBottom: 3, letterSpacing: ".06em",
              }}>
                {m.Nama}
              </div>
            )}
            <div style={{
              maxWidth: "76%", padding: "8px 12px",
              borderRadius: isMine ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
              background: isMine ? "rgba(192,132,252,.15)" : "rgba(255,255,255,.04)",
              border: `1px solid ${isMine ? "#c084fc33" : "#2d1f3a"}`,
              fontFamily: "'IM Fell English',Georgia,serif",
              fontSize: 13, color: "#e2d9c8", lineHeight: 1.5,
            }}>
              {m.Pesan}
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#3d2f4a", marginTop: 3 }}>
              {fmtDateTime(m.Waktu)}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
});

export function ChatPanel({
  onClose, onlineUsers, onlineCount, sendChat,
  pushRef, loadRef, sendPresence,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [input, setInput]       = useState("");
  const bottomRef  = useRef<HTMLDivElement>(null);
  const restLoaded = useRef(false); // prevent WS fallback overwriting REST data

  const myNama = typeof window !== "undefined" ? localStorage.getItem("nama") ?? "" : "";
  const myId   = typeof window !== "undefined" ? parseInt(localStorage.getItem("userId") ?? "0") : 0;

  // ── Load history via REST on mount (primary) ──────────────────────────────
  // This is the same endpoint that was always there: GET /api/user/chat/history
  // The REST response uses PascalCase (ID, Nama, Pesan, Waktu) which matches ChatMessage type
  useEffect(() => {
    fetch(`${API}/api/user/chat/history`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          // REST returns { ID, UserID, Nama, Pesan, Waktu } — direct assign
          setMessages(d.data);
          restLoaded.current = true;
        }
      })
      .catch(() => {}) // WS pesan_lama will cover if REST fails
      .finally(() => setLoading(false));

    sendPresence("chat");
    return () => sendPresence("browsing");
  }, []); // eslint-disable-line

  // ── WS pesan_lama fallback ────────────────────────────────────────────────
  // Only used if REST hasn't loaded yet (e.g. token expired but WS still open)
  const handlePesanLama = useCallback((msgs: ChatMessage[]) => {
    if (!restLoaded.current) {
      setMessages(msgs);
      setLoading(false);
    }
  }, []);

  // ── WS new message — push directly into state ─────────────────────────────
  // mirrors: socket.on('chat message', msg => setMessages(prev => [...prev, msg]))
  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      // Replace optimistic entry (temp ID > 1e12) from same sender+text
      const idx = prev.findIndex(
        m => m.ID > 1e12 && m.Nama === msg.Nama && m.Pesan === msg.Pesan
      );
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = msg;
        return updated;
      }
      // Skip if real server ID already present
      if (prev.some(m => m.ID === msg.ID && m.ID < 1e12)) return prev;
      return [...prev, msg];
    });
  }, []);

  // Register refs so parent can invoke these directly without prop re-render
  useEffect(() => {
    pushRef.current = appendMessage;
    loadRef.current = handlePesanLama;
    return () => { pushRef.current = null; loadRef.current = null; };
  }, [appendMessage, handlePesanLama, pushRef, loadRef]);

  // Auto-scroll on new messages — mirrors App.js setTimeout pattern
  useEffect(() => {
    const t = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(t);
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    // Optimistic update — temp ID replaced by server echo via appendMessage
    const optimistic: ChatMessage = {
      ID: Date.now(), // safe temp marker until year ~2286
      UserID: myId,
      Nama: myNama,
      Pesan: text,
      Waktu: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    sendChat(text);
    setInput("");
  }, [input, myId, myNama, sendChat]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) handleSend(); },
    [handleSend],
  );

  return (
    <div style={ps.wrap}>
      <PanelHeader
        icon="💬" title="Ruang Bicara"
        sub={`WebSocket chat  •  ${onlineCount} online`}
        color="#f472b6" onClose={onClose}
      />
      <div style={{ display: "flex", gap: 12 }}>
        {/* Chat area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading
            ? <div style={{ height: 380, display: "flex", alignItems: "center", justifyContent: "center" }}><LoadingDots /></div>
            : <ChatMessages messages={messages} myNama={myNama} bottomRef={bottomRef} />
          }
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tulis pesanmu… (Enter untuk kirim)"
              style={{ ...ps.input, flex: 1, borderBottom: "1px solid #c084fc55", padding: "10px 8px" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                ...ps.submitBtn, width: "auto", padding: "8px 16px",
                borderColor: "#c084fc55", color: "#c084fc",
                opacity: input.trim() ? 1 : 0.4,
              }}
            >
              Kirim
            </button>
          </div>
        </div>

        {/* Online sidebar */}
        <div style={{ width: 140, flexShrink: 0 }}>
          <div style={{
            fontFamily: "'Cinzel',serif", fontSize: 10, color: "#5a4f6a",
            letterSpacing: ".12em", marginBottom: 8, textTransform: "uppercase",
          }}>
            🟢 Online ({onlineCount})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {onlineUsers.length === 0 && (
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#3d2f4a", fontStyle: "italic" }}>
                Tidak ada
              </div>
            )}
            {onlineUsers.map(u => {
              const { icon, color } = aksiLabel(u.aksi);
              return (
                <div key={u.user_id} style={{
                  background: "rgba(255,255,255,.02)", border: "1px solid #2d1f3a",
                  borderRadius: 5, padding: "7px 10px",
                }}>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: "#c9b99a", marginBottom: 2 }}>
                    {u.nama}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 9, color }}>
                    {icon} {u.aksi.replace(/_/g, " ")}
                    {u.detail && (
                      <div style={{
                        color: "#5a4f6a", marginTop: 1,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {u.detail}
                      </div>
                    )}
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


