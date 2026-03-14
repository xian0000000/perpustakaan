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

	// Catat aktivitas
	go CatatAktivitas(userID, "baca_buku", uint(bukuID))

	// Cek apakah user sedang meminjam buku ini
	var peminjaman models.Peminjaman
	if err := db.
		Where("user_id = ? AND buku_id = ? AND status = ?", userID, bukuID, "dipinjam").
		First(&peminjaman).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Kamu tidak sedang meminjam buku ini. Pinjam terlebih dahulu untuk membacanya.",
		})
		return
	}

	// Ambil buku
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

// GET /api/admin/monitoring  — admin lihat semua aktivitas user
func GetMonitoring(c *gin.Context) {
	db := config.DB

	var aktivitas []models.AktivitasUser
	if err := db.
		Preload("User").
		Order("waktu DESC").
		Limit(200).
		Find(&aktivitas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal ambil data monitoring"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "data monitoring",
		"data":    aktivitas,
	})
}

// GET /api/admin/monitoring/online  — user yang aktif dalam 15 menit terakhir
func GetUserOnline(c *gin.Context) {
	db := config.DB

	cutoff := time.Now().Add(-15 * time.Minute)

	var aktivitas []models.AktivitasUser
	if err := db.
		Preload("User").
		Where("waktu > ?", cutoff).
		Order("waktu DESC").
		Find(&aktivitas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal ambil data"})
		return
	}

	// Deduplicate: ambil aktivitas terbaru per user
	seen := map[uint]bool{}
	result := []models.AktivitasUser{}
	for _, a := range aktivitas {
		if !seen[a.UserID] {
			seen[a.UserID] = true
			result = append(result, a)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "user aktif (15 menit terakhir)",
		"data":    result,
		"total":   len(result),
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
