package models

import "time"

type AktivitasUser struct {
	ID       uint      `gorm:"primaryKey"`
	UserID   uint
	Aksi     string    // "login", "pinjam_buku", "kembali_buku", "baca_buku", "lihat_buku"
	TargetID uint      // ID buku atau peminjaman yang terkait (0 jika tidak ada)
	Waktu    time.Time

	User User
}

func (AktivitasUser) TableName() string {
	return "aktivitas_user"
}
