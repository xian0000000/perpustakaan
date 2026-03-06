package handlers

import (
	"net/http"

	"backend/config"
	"backend/models"

	"github.com/gin-gonic/gin"
)

func GetRiwayatPeminjaman(c *gin.Context) {
	db := config.DB

	// ambil user dari JWT
	userID := c.MustGet("user_id").(uint)

	var peminjaman []models.Peminjaman

	// ambil hanya milik user
	if err := db.
		Preload("Buku").
		Where("user_id = ?", userID).
		Order("tanggal_peminjaman DESC").
		Find(&peminjaman).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "gagal mengambil data",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "riwayat peminjaman",
		"data":    peminjaman,
	})
}
