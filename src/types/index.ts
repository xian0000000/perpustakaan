export type UserRole = "admin" | "pengguna" | null;
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface Buku {
  ID: number;
  NamaBuku: string;
  Penulis: string;
  IsiBuku: string;
  Stock: number;
}

export interface User {
  ID: number;
  Nama: string;
  Saldo: number;
  Role: string;
}

export interface Peminjaman {
  ID: number;
  UserID: number;
  BukuID: number;
  TanggalPeminjaman: string;
  TanggalPengembalian: string | null;
  Status: string;
  Buku: Buku;
  User?: User;
}

export interface AktivitasUser {
  ID: number;
  UserID: number;
  Aksi: string;
  TargetID: number;
  Waktu: string;
  User: User;
}

export interface Stats {
  total_buku: number;
  total_user: number;
  total_peminjaman: number;
  peminjaman_aktif: number;
}

export interface ChatMessage {
  ID: number;
  UserID: number;
  Nama: string;
  Pesan: string;
  Waktu: string;
  User?: User;
}

export interface MadingPost {
  ID: number;
  Judul: string;
  Isi: string;
  Kategori: string;
  UserID: number;
  CreatedAt: string;
  User?: User;
}

// WebSocket presence
export interface PresenceUser {
  user_id: number;
  nama: string;
  role: string;
  aksi: string;      // "online" | "membaca" | "chat" | "mading" | "browsing" | "offline"
  target_id?: number;
  detail?: string;
}

// WebSocket message envelope
export interface WSMessage<T = unknown> {
  type: string;
  payload: T;
}

export interface BukuBaca {
  ID: number;
  NamaBuku: string;
  Penulis: string;
  IsiBuku: string;
  TanggalPeminjaman: string;
  IDPeminjaman: number;
}
