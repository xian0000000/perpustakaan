package handlers

import (
	"strconv"
	"time"

	"backend/config"
	"backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func PinjamBuku(c *gin.Context) {
	db := config.DB

	userID := c.MustGet("user_id").(uint)

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "id tidak valid"})
		return
	}

	tx := db.Begin()

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var buku models.Buku

	if err := tx.
		Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&buku, id).Error; err != nil {

		tx.Rollback()
		c.JSON(404, gin.H{"error": "buku tidak ditemukan"})
		return
	}

	if buku.Stock <= 0 {
		tx.Rollback()
		c.JSON(400, gin.H{"error": "stok habis"})
		return
	}

	peminjaman := models.Peminjaman{
		UserID:            userID,
		BukuID:            buku.ID,
		TanggalPeminjaman: time.Now(),
		Status:            "dipinjam",
	}

	if err := tx.Create(&peminjaman).Error; err != nil {
		tx.Rollback()
		c.JSON(500, gin.H{"error": "gagal pinjam"})
		return
	}

	if err := tx.Model(&models.Buku{}).
		Where("id = ?", buku.ID).
		Update("stock", gorm.Expr("stock - 1")).Error; err != nil {

		tx.Rollback()
		c.JSON(500, gin.H{"error": "gagal update stock"})
		return
	}

	tx.Preload("User").
		Preload("Buku").
		First(&peminjaman, peminjaman.ID)

	if err := tx.Commit().Error; err != nil {
		c.JSON(500, gin.H{"error": "commit gagal"})
		return
	}

	c.JSON(200, gin.H{
		"message": "berhasil meminjam buku",
		"data":    peminjaman,
	})
}
