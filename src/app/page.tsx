"use client";

import { useState, useRef, useEffect, CSSProperties, useCallback } from "react";
import { getRole, getNama, getToken } from "@/lib/utils";
import type { UserRole, ChatMessage, MadingPost, PresenceUser } from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";

import { AuthPanel, BookshelfPanel, SingleBookPanel, ProfilePanel, HistoryPanel } from "@/components/panels/BasicPanels";
import { ThronePanel } from "@/components/reader/ThronePanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { MadingPanel } from "@/components/mading/MadingPanel";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { MusicPlayer } from "@/components/music/MusicPlayer";

// ─── Types ────────────────────────────────────────────────────────────────────
type PanelId = "login" | "bookshelf" | "single-book" | "throne" | "history" | "profile" | "admin" | "chat" | "mading";

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

const HOTSPOTS: Hotspot[] = [
  { id: "login",       label: "Gerbang Masuk",     icon: "🚪", x: 49, y: 88, color: "#c084fc", glow: "rgba(192,132,252,0.6)", requiresAuth: false, adminOnly: false },
  { id: "bookshelf",   label: "Rak Kitab Besar",   icon: "📚", x: 49, y: 44, color: "#fb923c", glow: "rgba(251,146,60,0.6)",  requiresAuth: false, adminOnly: false },
  { id: "single-book", label: "Lemari Katalog",    icon: "🔍", x: 25, y: 53, color: "#34d399", glow: "rgba(52,211,153,0.6)",  requiresAuth: false, adminOnly: false },
  { id: "mading",      label: "Mading Digital",    icon: "📌", x: 18, y: 67, color: "#fbbf24", glow: "rgba(251,191,36,0.6)",  requiresAuth: false, adminOnly: false },
  { id: "throne",      label: "Kursi Pembaca",     icon: "📖", x: 49, y: 73, color: "#38bdf8", glow: "rgba(56,189,248,0.6)",  requiresAuth: true,  adminOnly: false },
  { id: "chat",        label: "Ruang Bicara",      icon: "💬", x: 62, y: 37, color: "#f472b6", glow: "rgba(244,114,182,0.6)", requiresAuth: true,  adminOnly: false },
  { id: "history",     label: "Papan Riwayat",     icon: "📋", x: 73, y: 59, color: "#f472b6", glow: "rgba(244,114,182,0.6)", requiresAuth: true,  adminOnly: false },
  { id: "profile",     label: "Cermin Jiwa",       icon: "👤", x: 71, y: 47, color: "#a78bfa", glow: "rgba(167,139,250,0.6)", requiresAuth: true,  adminOnly: false },
  { id: "admin",       label: "Ruang Arsip Admin", icon: "⚗️", x: 84, y: 71, color: "#fbbf24", glow: "rgba(251,191,36,0.6)",  requiresAuth: true,  adminOnly: true  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Page() {
  const [activeId, setActiveId] = useState<PanelId | null>(null);
  const [hoveredId, setHoveredId] = useState<PanelId | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [nama, setNama] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Realtime state
  const [madingQueue, setMadingQueue] = useState<MadingPost[]>([]);
  const [unreadChat, setUnreadChat]   = useState(0);
  const [unreadMading, setUnreadMading] = useState(0);

  // Ref tracks active panel without stale closure in callbacks
  const activeIdRef = useRef<PanelId | null>(null);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // ChatPanel registers its push + load fns here
  // push: called per new "chat" WS event — direct setState in panel
  // load: called once on "pesan_lama" WS event (history on connect)
  const chatPushRef = useRef<((msg: ChatMessage) => void) | null>(null);
  const chatLoadRef = useRef<((msgs: ChatMessage[]) => void) | null>(null);

  // mirrors: socket.on('chat message', msg => setMessages(prev => [...prev, msg]))
  const handleChat = useCallback((msg: ChatMessage) => {
    if (activeIdRef.current === "chat" && chatPushRef.current) {
      chatPushRef.current(msg);
    } else {
      setUnreadChat(n => n + 1);
    }
  }, []);

  // mirrors: socket.on('pesan lama', msgs => setMessages(msgs))
  const handlePesanLama = useCallback((msgs: ChatMessage[]) => {
    if (chatLoadRef.current) chatLoadRef.current(msgs);
  }, []);

  const handleMading = useCallback((post: MadingPost) => {
    setMadingQueue(q => [...q, post]);
    if (activeIdRef.current !== "mading") setUnreadMading(n => n + 1);
  }, []);

  const { status: wsStatus, onlineCount, onlineUsers, sendPresence, sendChat } =
    useWebSocket(handleChat, handlePesanLama, handleMading);

  useEffect(() => { setRole(getRole()); setNama(getNama()); }, []);

  // Reset unread badge when panel opens
  useEffect(() => {
    if (activeId === "chat") setUnreadChat(0);
    if (activeId === "mading") setUnreadMading(0);
  }, [activeId]);

  // Send presence on connect
  useEffect(() => {
    if (role && wsStatus === "connected") sendPresence("browsing");
  }, [role, wsStatus]); // eslint-disable-line

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
    sendPresence(id === "chat" ? "chat" : id === "mading" ? "mading" : "browsing");
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  }

  function handleLogin(r: UserRole) { setRole(r); setNama(getNama()); }
  function handleLogout() { setRole(null); setNama(""); setActiveId(null); }

  const activeHotspot  = HOTSPOTS.find(h => h.id === activeId);
  const hoveredHotspot = HOTSPOTS.find(h => h.id === hoveredId);
  const showPanel = !!activeId && !!activeHotspot;

  function renderPanel() {
    switch (activeId) {
      case "login":       return <AuthPanel onClose={() => setActiveId(null)} onLogin={handleLogin} />;
      case "bookshelf":   return <BookshelfPanel onClose={() => setActiveId(null)} />;
      case "single-book": return <SingleBookPanel onClose={() => setActiveId(null)} />;
      case "throne":      return <ThronePanel onClose={() => setActiveId(null)} sendPresence={sendPresence} />;
      case "history":     return <HistoryPanel onClose={() => setActiveId(null)} />;
      case "profile":     return <ProfilePanel onClose={() => setActiveId(null)} onLogout={handleLogout} />;
      case "chat":        return <ChatPanel onClose={() => setActiveId(null)} onlineUsers={onlineUsers} onlineCount={onlineCount} sendChat={sendChat} onNewMessage={handleChat} pushRef={chatPushRef} loadRef={chatLoadRef} sendPresence={sendPresence} />;
      case "mading":      return <MadingPanel onClose={() => setActiveId(null)} role={role} newPosts={madingQueue} sendPresence={sendPresence} />;
      case "admin":       return <AdminPanel onClose={() => setActiveId(null)} onlineUsers={onlineUsers} onlineCount={onlineCount} />;
    }
  }

  return (
    <div style={ss.root}>
      <div style={ss.grain} />
      <div style={ss.wrapper}>

        {/* Title */}
        <div style={ss.titleRow}>
          <span style={ss.glyph}>✦</span>
          <h1 style={ss.title}>Perpustakaan Kuno</h1>
          <span style={ss.glyph}>✦</span>
        </div>

        {/* Session badge + WS status */}
        <div style={{ textAlign: "center", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          {role ? (
            <span style={{ fontFamily: "monospace", fontSize: 10, border: "1px solid", borderRadius: 3, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4, letterSpacing: ".06em", textTransform: "uppercase", ...(role === "admin" ? { color: "#fbbf24", borderColor: "#fbbf2455", background: "rgba(251,191,36,0.1)" } : { color: "#a78bfa", borderColor: "#a78bfa55", background: "rgba(167,139,250,0.1)" }) }}>
              {role === "admin" ? "🔑" : "👤"} {nama || role}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: "#3a3050", letterSpacing: ".12em" }}>🔒 BELUM MASUK — klik 🚪</span>
          )}
          {/* WS indicator */}
          {role && (
            <span style={{ fontFamily: "monospace", fontSize: 9, color: wsStatus === "connected" ? "#34d399" : wsStatus === "connecting" ? "#fbbf24" : "#5a4f6a" }}>
              {wsStatus === "connected" ? `● live · ${onlineCount} online` : wsStatus === "connecting" ? "○ menghubungkan…" : "○ offline"}
            </span>
          )}
          {/* Unread badges */}
          {unreadChat > 0 && <span style={{ background: "#f472b6", color: "#000", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontFamily: "monospace", cursor: "pointer" }} onClick={() => handleClick("chat")}>💬 {unreadChat}</span>}
          {unreadMading > 0 && <span style={{ background: "#fbbf24", color: "#000", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontFamily: "monospace", cursor: "pointer" }} onClick={() => handleClick("mading")}>📌 {unreadMading}</span>}
        </div>

        <p style={ss.subtitle}>Klik lokasi untuk berinteraksi dengan perpustakaan</p>

        {/* Scene */}
        <div style={ss.sceneOuter}>
          <div style={ss.sceneInner}>
            <img src="/perpus3.png" alt="Perpustakaan" style={ss.bgImage} draggable={false} />
            <div style={ss.vignette} />

            {HOTSPOTS.map(h => (
              <HotspotButton key={h.id}
                hotspot={h}
                isActive={activeId === h.id}
                isHovered={hoveredId === h.id}
                locked={isLocked(h)}
                badge={h.id === "chat" ? unreadChat : h.id === "mading" ? unreadMading : 0}
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

        {/* Panel */}
        <div ref={panelRef} style={{
          ...ss.panelShell,
          maxHeight: showPanel ? "960px" : "0px",
          opacity: showPanel ? 1 : 0,
          marginTop: showPanel ? 16 : 0,
          borderWidth: showPanel ? 1 : 0,
          paddingTop: showPanel ? 20 : 0,
          paddingBottom: showPanel ? 20 : 0,
        }}>
          {renderPanel()}
        </div>

        {/* Legend */}
        <div style={ss.legend}>
          {[{ icon: "🔓", label: "Public" }, { icon: "🔒", label: "Perlu login" }, { icon: "🔑", label: "Admin only" }].map(l => (
            <span key={l.label} style={ss.legendItem}>{l.icon} <span style={{ color: "#9ca3af" }}>{l.label}</span></span>
          ))}
        </div>
      </div>

      {/* Floating music player */}
      <MusicPlayer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=IM+Fell+English&display=swap');
        @keyframes ping { 0%{transform:scale(1);opacity:.8} 70%{transform:scale(2.2);opacity:0} 100%{transform:scale(2.2);opacity:0} }
        @keyframes grain { 0%,100%{transform:translate(0,0)} 10%{transform:translate(-2%,-3%)} 30%{transform:translate(3%,2%)} 50%{transform:translate(-1%,4%)} 70%{transform:translate(2%,-2%)} 90%{transform:translate(-3%,1%)} }
        input:focus, textarea:focus, select:focus { border-bottom-color: #7c5cbf !important; outline: none; }
        textarea { font-family: 'IM Fell English', Georgia, serif; }
        select { appearance: none; -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2d1f3a; border-radius: 2px; }
      `}</style>
    </div>
  );
}

// ─── Hotspot Button ───────────────────────────────────────────────────────────
function HotspotButton({ hotspot, isActive, isHovered, locked, badge, onClick, onMouseEnter, onMouseLeave }: {
  hotspot: Hotspot; isActive: boolean; isHovered: boolean; locked: boolean; badge: number;
  onClick: () => void; onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const { color, glow, x, y, icon, label } = hotspot;
  const scale = isActive ? "scale(1.2)" : isHovered ? "scale(1.1)" : "scale(1)";
  const bg = locked ? "rgba(10,8,20,0.35)" : isActive ? `${color}30` : isHovered ? `${color}18` : "rgba(10,8,20,0.55)";
  const shadow = locked ? "none" : isActive || isHovered ? `0 0 0 3px ${glow}, 0 0 24px ${glow}` : `0 0 0 1px ${color}44, 0 0 12px ${glow}`;
  return (
    <button aria-label={label} onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      style={{ ...ss.hotspot, left: `${x}%`, top: `${y}%`, borderColor: locked ? "#3a3050" : color, boxShadow: shadow, background: bg, transform: `translate(-50%,-50%) ${scale}`, opacity: locked ? 0.45 : 1 }}>
      {!locked && <span style={{ ...ss.ping, borderColor: color, animationPlayState: isActive ? "paused" : "running" }} />}
      <span style={{ fontSize: 18, lineHeight: 1, filter: locked ? "grayscale(1)" : "drop-shadow(0 0 4px currentColor)" }}>{icon}</span>
      {badge > 0 && !isActive && (
        <span style={{ position: "absolute", top: -4, right: -4, background: color, color: "#000", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{badge > 9 ? "9+" : badge}</span>
      )}
    </button>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss: Record<string, CSSProperties> = {
  root: { minHeight: "100vh", background: "radial-gradient(ellipse at 40% 0%,#1a0a2e 0%,#06060f 60%)", fontFamily: "'IM Fell English',Georgia,serif", color: "#e2d9c8", position: "relative", overflow: "hidden" },
  grain: { position: "fixed", inset: "-200%", width: "400%", height: "400%", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, opacity: 0.04, pointerEvents: "none", zIndex: 0, animation: "grain 8s steps(1) infinite" },
  wrapper: { position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "32px 16px 48px" },
  titleRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 10 },
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
