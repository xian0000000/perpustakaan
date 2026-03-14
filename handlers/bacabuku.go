package handlers

import (
	"net/http"
	"strconv"
	"time"

	"backend/config"
	"backend/models"

	"github.com/gin-gonic/gin"
)

// GET /api/user/baca/:id  — baca isi buku, hanya kalau sedang dipinjam
func BacaBuku(c *gin.Context) {
	db := config.DB
	userID := c.MustGet("user_id").(uint)

	bukuID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id tidak valid"})
		return
	}

	go CatatAktivitas(userID, "baca_buku", uint(bukuID))

	var peminjaman models.Peminjaman
	if err := db.
		Where("user_id = ? AND buku_id = ? AND status = ?", userID, bukuID, "dipinjam").
		First(&peminjaman).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Kamu tidak sedang meminjam buku ini. Pinjam terlebih dahulu untuk membacanya.",
		})
		return
	}

	var buku models.Buku
	if err := db.First(&buku, bukuID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "buku tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "berhasil membuka buku",
		"data": gin.H{
			"ID":                buku.ID,
			"NamaBuku":          buku.NamaBuku,
			"Penulis":           buku.Penulis,
			"IsiBuku":           buku.IsiBuku,
			"TanggalPeminjaman": peminjaman.TanggalPeminjaman,
			"IDPeminjaman":      peminjaman.ID,
		},
	})
}

// Helper — catat aktivitas user (dipanggil goroutine)
func CatatAktivitas(userID uint, aksi string, targetID uint) {
	config.DB.Create(&models.AktivitasUser{
		UserID:   userID,
		Aksi:     aksi,
		TargetID: targetID,
		Waktu:    time.Now(),
	})
}
