package models

import "time"

type Peminjaman struct {
	ID uint `gorm:"primaryKey"`

	UserID uint
	BukuID uint

	TanggalPeminjaman   time.Time
	TanggalPengembalian *time.Time
	Status              string

	User User
	Buku Buku
}

func (Peminjaman) TableName() string {
	return "peminjaman"
}
