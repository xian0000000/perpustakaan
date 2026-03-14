package config

import (
	"backend/models"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB
var USER []models.User
var BUKU []models.Buku
var PEMINJAMAN []models.Peminjaman

func ConnectDB() {

	// load .env kalau jalan di local
	godotenv.Load()

	dsn := os.Getenv("DATABASE_URL")

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("gagal connect database:", err)
	}

	DB = db

	DB.AutoMigrate(
		&models.User{},
		&models.Buku{},
		&models.Peminjaman{},
		&models.AktivitasUser{},
	)

	DB.Find(&USER)
	DB.Find(&BUKU)
	DB.Find(&PEMINJAMAN)

	log.Println("berhasil connect database")
}
