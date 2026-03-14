"use client";
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { fmtDateTime } from "@/lib/utils";
import type { ChatMessage, PresenceUser } from "@/types";
import { PanelHeader, LoadingDots, ps } from "@/components/shared/ui";
import { aksiLabel } from "@/lib/utils";

interface ChatPanelProps {
  onClose: () => void;
  onlineUsers: PresenceUser[];
  onlineCount: number;
  sendChat: (pesan: string) => void;
  /** Parent registers push fn here — called directly on WS "chat" event */
  pushRef: React.MutableRefObject<((msg: ChatMessage) => void) | null>;
  /** Parent registers loadHistory fn here — called on WS "pesan_lama" event */
  loadRef: React.MutableRefObject<((msgs: ChatMessage[]) => void) | null>;
  sendPresence: (aksi: string, detail?: string) => void;
}

// Mirrors App.js ChatMessages memo component
const ChatMessages = memo(function ChatMessages({
  messages,
  myNama,
  bottomRef,
}: {
  messages: ChatMessage[];
  myNama: string;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  // mirrors: messages.slice(-50)
  const visible = messages.slice(-50);

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
          <div
            key={m.ID ?? i}
            style={{
              marginBottom: 10, display: "flex", flexDirection: "column",
              alignItems: isMine ? "flex-end" : "flex-start",
            }}
          >
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
            <div style={{
              fontFamily: "monospace", fontSize: 9, color: "#3d2f4a", marginTop: 3,
            }}>
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
  const bottomRef = useRef<HTMLDivElement>(null);

  const myNama = typeof window !== "undefined"
    ? localStorage.getItem("nama") ?? "" : "";
  const myId = typeof window !== "undefined"
    ? parseInt(localStorage.getItem("userId") ?? "0") : 0;

  // mirrors: socket.on('pesan lama', (msgs) => setMessages(msgs || []))
  // Called by parent when WS fires "pesan_lama"
  const handlePesanLama = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs);
    setLoading(false);
  }, []);

  // mirrors: socket.on('chat message', (msg) => setMessages(prev => [...prev, msg]))
  // Called directly by parent on each new WS "chat" event
  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      // Replace optimistic (temp ID > 1e12) from same sender + text
      const idx = prev.findIndex(
        m => m.ID > 1e12 && m.Nama === msg.Nama && m.Pesan === msg.Pesan
      );
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = msg;
        return updated;
      }
      // Skip if real ID already present
      if (prev.some(m => m.ID === msg.ID && m.ID < 1e12)) return prev;
      return [...prev, msg];
    });
  }, []);

  // Register push + load refs so parent can call them without prop-drilling
  useEffect(() => {
    pushRef.current = appendMessage;
    loadRef.current = handlePesanLama;
    return () => {
      pushRef.current = null;
      loadRef.current = null;
    };
  }, [appendMessage, handlePesanLama, pushRef, loadRef]);

  // Auto-scroll — mirrors App.js useEffect on messages with setTimeout
  useEffect(() => {
    const t = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(t);
  }, [messages]);

  // Announce presence on mount/unmount
  useEffect(() => {
    sendPresence("chat");
    return () => sendPresence("browsing");
  }, []); // eslint-disable-line

  // If WS reconnects while panel is open, loading might stay true
  // Reset after 3s as a safety valve
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    // Optimistic — shown instantly, swapped for server echo via appendMessage
    const optimistic: ChatMessage = {
      ID: Date.now(),   // temp ID, > 1e12 until year ~2286
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
