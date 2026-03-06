package handlers

import (
	"backend/config"
	"backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GET /api/buku

func GetAllBuku(c *gin.Context) {
	var buku []models.Buku

	// Ambil semua buku dari database
	if err := config.DB.Find(&buku).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"sukses": false,
			"pesan":  "Gagal mengambil data: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sukses": true,
		"data":   buku,
	})
}

// GET /api/buku/:id
func GetBukuByID(c *gin.Context) {
	id := c.Param("id")
	var buku models.Buku

	// Cari buku berdasarkan ID
	if err := config.DB.First(&buku, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"sukses": false,
			"pesan":  "Buku tidak ditemukan",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sukses": true,
		"data":   buku,
	})
}
