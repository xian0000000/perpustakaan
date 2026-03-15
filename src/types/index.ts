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

export interface MadingPost {
  ID: number;
  Judul: string;
  Isi: string;
  Kategori: string;
  UserID: number;
  CreatedAt: string;
  User?: User;
}

export interface BukuBaca {
  ID: number;
  NamaBuku: string;
  Penulis: string;
  IsiBuku: string;
  TanggalPeminjaman: string;
  IDPeminjaman: number;
}
