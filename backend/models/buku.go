package models

type Buku struct {
	ID       uint `gorm:"primaryKey"`
	NamaBuku string
	Penulis  string
	IsiBuku  string
	Stock    int

	Peminjaman []Peminjaman
}

func (Buku) TableName() string {
	return "buku"
}
