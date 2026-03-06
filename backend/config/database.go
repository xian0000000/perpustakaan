package config

import (
	"backend/models"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB
var USER []models.User
var BUKU []models.Buku
var PEMINJAMAN []models.Peminjaman

func ConnectDB() {
	dsn := "host=localhost user=postgres password=postgres dbname=perpustakaan port=5432 sslmode=disable"

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("gagal connect database", err)
	}

	DB = db
	DB.AutoMigrate(
		&models.User{},
		&models.Buku{},
		&models.Peminjaman{},
	)
	DB.Find(&USER)
	DB.Find(&BUKU)
	DB.Find(&PEMINJAMAN)
	log.Println("berhasil connect database")
}
