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

type WSHandler = (payload: unknown) => void;

export function useWebSocket(
  onChat: (msg: ChatMessage) => void,
  onMading: (post: MadingPost) => void,
): UseWSReturn {
  const ws = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WSStatus>("disconnected");
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const handlers = useRef<Record<string, WSHandler>>({});

  // Keep handlers current without reconnecting
  handlers.current = {
    presence: (payload) => {
      const users = payload as PresenceUser[];
      setOnlineUsers(users ?? []);
    },
    chat: (payload) => onChat(payload as ChatMessage),
    mading_new: (payload) => {
      const raw = payload as { ID: number; Judul: string; Isi: string; Kategori: string; Nama: string; Waktu: string };
      const post: MadingPost = {
        ID: raw.ID, Judul: raw.Judul, Isi: raw.Isi, Kategori: raw.Kategori,
        UserID: 0, CreatedAt: raw.Waktu, User: { ID: 0, Nama: raw.Nama, Saldo: 0, Role: "" },
      };
      onMading(post);
    },
  };

  const connect = useCallback(() => {
    const token = getToken();
    if (!token || !mountedRef.current) return;

    const url = `${WS_URL}/api/ws?token=${token}`;
    const socket = new WebSocket(url);
    ws.current = socket;
    setStatus("connecting");

    socket.onopen = () => { if (mountedRef.current) setStatus("connected"); };

    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const handler = handlers.current[msg.type];
        if (handler) handler(JSON.parse(msg.payload ?? "null"));
      } catch { /* ignore */ }
    };

    socket.onclose = () => {
      if (!mountedRef.current) return;
      setStatus("disconnected");
      setOnlineUsers([]);
      // Reconnect after 3s
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    socket.onerror = () => socket.close();
  }, []);

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
