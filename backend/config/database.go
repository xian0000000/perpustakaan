package config

import (
	"backend/models"
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB
var USER []models.User
var BUKU []models.Buku
var PEMINJAMAN []models.Peminjaman

func ConnectDB() {

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=5432 sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
	)
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
