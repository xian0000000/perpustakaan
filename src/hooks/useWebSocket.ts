"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { WS_URL, getToken } from "@/lib/utils";
import type { PresenceUser, ChatMessage, MadingPost } from "@/types";

export type WSStatus = "connecting" | "connected" | "disconnected";

interface UseWSReturn {
  status: WSStatus;
  onlineCount: number;          // mirrors: onlineUser.size  (socket.on "online_count")
  onlineUsers: PresenceUser[];  // full presence list        (socket.on "presence")
  sendPresence: (aksi: string, detail?: string) => void;
  sendChat: (pesan: string) => void;
}

export function useWebSocket(
  onChat: (msg: ChatMessage) => void,
  onPesanLama: (msgs: ChatMessage[]) => void,   // mirrors: socket.on('pesan lama', ...)
  onMading: (post: MadingPost) => void,
): UseWSReturn {
  const ws = useRef<WebSocket | null>(null);
  const [status, setStatus]           = useState<WSStatus>("disconnected");
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef     = useRef(true);

  // Keep callbacks in refs — no stale closures, no reconnects on re-render
  const onChatRef      = useRef(onChat);
  const onPesanLamaRef = useRef(onPesanLama);
  const onMadingRef    = useRef(onMading);
  useEffect(() => { onChatRef.current      = onChat;      }, [onChat]);
  useEffect(() => { onPesanLamaRef.current = onPesanLama; }, [onPesanLama]);
  useEffect(() => { onMadingRef.current    = onMading;    }, [onMading]);

  const handleMessage = useCallback((e: MessageEvent) => {
    try {
      const msg     = JSON.parse(e.data as string) as { type: string; payload: string };
      const payload = JSON.parse(msg.payload ?? "null");

      switch (msg.type) {

        // mirrors: socket.on('online user', (data) => setOnlineCount(data.count))
        case "online_count": {
          const d = payload as { count: number };
          setOnlineCount(d.count ?? 0);
          break;
        }

        // mirrors: socket.emit('pesan lama', messages)  — received once on connect
        case "pesan_lama": {
          const raw = payload as Array<{
            id: number; user_id: number; nama: string; pesan: string; waktu: string;
          }>;
          const msgs: ChatMessage[] = (raw ?? []).map(m => ({
            ID: m.id, UserID: m.user_id, Nama: m.nama, Pesan: m.pesan, Waktu: m.waktu,
          }));
          onPesanLamaRef.current(msgs);
          break;
        }

        // mirrors: socket.on('chat message', (msg) => setMessages(prev => [...prev, msg]))
        case "chat": {
          const m = payload as { id: number; user_id: number; nama: string; pesan: string; waktu: string };
          onChatRef.current({
            ID: m.id, UserID: m.user_id, Nama: m.nama, Pesan: m.pesan, Waktu: m.waktu,
          });
          break;
        }

        // presence list — for sidebar + admin monitoring
        case "presence": {
          const raw = payload as Array<{
            user_id: number; nama: string; role: string;
            aksi: string; target_id?: number; detail?: string;
          }>;
          setOnlineUsers((raw ?? []).map(u => ({
            user_id: u.user_id, nama: u.nama, role: u.role,
            aksi: u.aksi, target_id: u.target_id, detail: u.detail,
          })));
          break;
        }

        case "mading_new": {
          const r = payload as {
            id: number; judul: string; isi: string;
            kategori: string; nama: string; waktu: string;
          };
          onMadingRef.current({
            ID: r.id, Judul: r.judul, Isi: r.isi, Kategori: r.kategori,
            UserID: 0, CreatedAt: r.waktu,
            User: { ID: 0, Nama: r.nama, Saldo: 0, Role: "" },
          });
          break;
        }
      }
    } catch { /* ignore malformed */ }
  }, []);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token || !mountedRef.current) return;

    const socket = new WebSocket(`${WS_URL}/api/ws?token=${token}`);
    ws.current = socket;
    setStatus("connecting");

    socket.onopen = () => {
      if (mountedRef.current) setStatus("connected");
    };

    socket.onmessage = handleMessage;

    socket.onclose = (ev) => {
      if (!mountedRef.current) return;
      setStatus("disconnected");
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

  const sendPresence = useCallback((aksi: string, detail = "") => {
    send({ type: "presence_update", payload: { aksi, detail } });
  }, [send]);

  const sendChat = useCallback((pesan: string) => {
    send({ type: "chat", payload: { pesan } });
  }, [send]);

  return { status, onlineCount, onlineUsers, sendPresence, sendChat };
}
