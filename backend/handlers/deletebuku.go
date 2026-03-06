package handlers

import (
	"backend/config"
	"backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// DELETE /api/buku/:id
func HapusBuku(c *gin.Context) {
	id := c.Param("id")

	// Cek apakah buku ada
	var buku models.Buku
	if err := config.DB.First(&buku, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"sukses": false,
			"pesan":  "Buku tidak ditemukan",
		})
		return
	}

	// Cek apakah buku sedang dipinjam
	var count int64
	config.DB.Model(&models.Peminjaman{}).Where("buku_id = ? AND status = ?", id, "dipinjam").Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"sukses": false,
			"pesan":  "Buku sedang dipinjam, tidak bisa dihapus",
		})
		return
	}

	// Hapus buku
	if err := config.DB.Delete(&buku).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"sukses": false,
			"pesan":  "Gagal hapus buku: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sukses": true,
		"pesan":  "Buku berhasil dihapus",
	})
}
