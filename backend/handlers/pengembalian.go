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

func KembalikanBuku(c *gin.Context) {
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

	var peminjaman models.Peminjaman

	// lock row peminjaman
	if err := tx.
		Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&peminjaman, id).Error; err != nil {

		tx.Rollback()
		c.JSON(404, gin.H{"error": "data peminjaman tidak ditemukan"})
		return
	}

	// ✅ pastikan milik user
	if peminjaman.UserID != userID {
		tx.Rollback()
		c.JSON(403, gin.H{"error": "bukan peminjaman milik anda"})
		return
	}

	// ✅ cegah double return
	if peminjaman.Status == "dikembalikan" {
		tx.Rollback()
		c.JSON(400, gin.H{"error": "buku sudah dikembalikan"})
		return
	}

	now := time.Now()

	// update peminjaman
	if err := tx.Model(&peminjaman).Updates(map[string]interface{}{
		"status":               "dikembalikan",
		"tanggal_pengembalian": &now,
	}).Error; err != nil {

		tx.Rollback()
		c.JSON(500, gin.H{"error": "gagal update peminjaman"})
		return
	}

	// tambah stock buku
	if err := tx.Model(&models.Buku{}).
		Where("id = ?", peminjaman.BukuID).
		Update("stock", gorm.Expr("stock + 1")).Error; err != nil {

		tx.Rollback()
		c.JSON(500, gin.H{"error": "gagal update stock"})
		return
	}

	// preload response
	tx.Preload("User").
		Preload("Buku").
		First(&peminjaman, peminjaman.ID)

	if err := tx.Commit().Error; err != nil {
		c.JSON(500, gin.H{"error": "commit gagal"})
		return
	}

	c.JSON(200, gin.H{
		"message": "buku berhasil dikembalikan",
		"data":    peminjaman,
	})
}
