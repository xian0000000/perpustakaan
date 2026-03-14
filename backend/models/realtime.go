package models

import "time"

type ChatMessage struct {
	ID      uint      `gorm:"primaryKey"`
	UserID  uint
	Pesan   string
	Waktu   time.Time
	User    User
}

func (ChatMessage) TableName() string { return "chat_message" }

type MadingPost struct {
	ID        uint      `gorm:"primaryKey"`
	Judul     string
	Isi       string
	Kategori  string    // "info_user", "buku_baru", "pengumuman", "umum"
	UserID    uint      // 0 = system
	CreatedAt time.Time
	User      User
}

func (MadingPost) TableName() string { return "mading_post" }
