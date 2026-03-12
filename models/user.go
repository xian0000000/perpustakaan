package models

type User struct {
	ID       uint `gorm:"primaryKey"`
	Nama     string
	Password string
	Saldo    int
	Role     string

	Peminjaman []Peminjaman
}

func (User) TableName() string {
	return "user"
}
