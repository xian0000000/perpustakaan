"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { WS_URL, getToken } from "@/lib/utils";
import type { PresenceUser, ChatMessage, MadingPost } from "@/types";

export type WSStatus = "connecting" | "connected" | "disconnected";

interface UseWSReturn {
  status: WSStatus;
  onlineUsers: PresenceUser[];
  sendPresence: (aksi: string, detail?: string, targetId?: number) => void;
  sendChat: (pesan: string) => void;
}

export function useWebSocket(
  onChat: (msg: ChatMessage) => void,
  onMading: (post: MadingPost) => void,
): UseWSReturn {
  const ws = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WSStatus>("disconnected");
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Always keep latest callbacks in refs — no stale closures
  const onChatRef = useRef(onChat);
  const onMadingRef = useRef(onMading);
  useEffect(() => { onChatRef.current = onChat; }, [onChat]);
  useEffect(() => { onMadingRef.current = onMading; }, [onMading]);

  const handleMessage = useCallback((e: MessageEvent) => {
    try {
      const msg = JSON.parse(e.data as string) as { type: string; payload: string };
      const payload = JSON.parse(msg.payload ?? "null");

      if (msg.type === "presence") {
        // Backend sends PresencePayload with json tags: user_id, nama, role, aksi, detail
        const raw = payload as Array<{
          user_id: number; nama: string; role: string;
          aksi: string; target_id?: number; detail?: string;
        }>;
        const users: PresenceUser[] = (raw ?? []).map(u => ({
          user_id: u.user_id,
          nama: u.nama,
          role: u.role,
          aksi: u.aksi,
          target_id: u.target_id,
          detail: u.detail,
        }));
        setOnlineUsers(users);

      } else if (msg.type === "chat") {
        // Backend sends ChatPayload: id, user_id, nama, pesan, waktu
        const raw = payload as { id: number; user_id: number; nama: string; pesan: string; waktu: string };
        const chatMsg: ChatMessage = {
          ID: raw.id,
          UserID: raw.user_id,
          Nama: raw.nama,
          Pesan: raw.pesan,
          Waktu: raw.waktu,
        };
        onChatRef.current(chatMsg);

      } else if (msg.type === "mading_new") {
        const raw = payload as { ID: number; Judul: string; Isi: string; Kategori: string; Nama: string; Waktu: string };
        const post: MadingPost = {
          ID: raw.ID, Judul: raw.Judul, Isi: raw.Isi, Kategori: raw.Kategori,
          UserID: 0, CreatedAt: raw.Waktu, User: { ID: 0, Nama: raw.Nama, Saldo: 0, Role: "" },
        };
        onMadingRef.current(post);
      }
    } catch { /* ignore malformed */ }
  }, []);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token || !mountedRef.current) return;

    const url = `${WS_URL}/api/ws?token=${token}`;
    const socket = new WebSocket(url);
    ws.current = socket;
    setStatus("connecting");

    socket.onopen = () => {
      if (mountedRef.current) setStatus("connected");
    };

    socket.onmessage = handleMessage;

    // Respond to server pings so connection stays alive (backend pings every 30s)
    socket.addEventListener("message", (e: MessageEvent) => {
      // Gorilla WS ping is handled at protocol level; browser auto-pongs.
      // But if server sends a text "ping", reply with pong:
      if (e.data === "ping") socket.send("pong");
    });

    socket.onclose = (ev) => {
      if (!mountedRef.current) return;
      setStatus("disconnected");
      // Don't clear onlineUsers immediately — keep last known state briefly
      // Reconnect with backoff
      const delay = ev.wasClean ? 1000 : 3000;
      reconnectTimer.current = setTimeout(connect, delay);
    };

    socket.onerror = () => socket.close();
  }, [handleMessage]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  const sendPresence = useCallback((aksi: string, detail = "", targetId = 0) => {
    send({ type: "presence_update", payload: { aksi, detail, target_id: targetId } });
  }, [send]);

  const sendChat = useCallback((pesan: string) => {
    send({ type: "chat", payload: { pesan } });
  }, [send]);

  return { status, onlineUsers, sendPresence, sendChat };
}
