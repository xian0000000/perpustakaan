package handlers

import (
	"backend/config"
	"backend/models"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ==================== STRUCT UNTUK REQUEST ====================

type CreateBukuRequest struct {
	NamaBuku string `json:"nama_buku" binding:"required"`
	Penulis  string `json:"penulis" binding:"required"`
	IsiBuku  string `json:"isi_buku"`
	Stock    int    `json:"stock" binding:"required,min=0"`
}

// POST /api/buku
func TambahBuku(c *gin.Context) {
	var req CreateBukuRequest

	// Bind JSON
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"sukses": false,
			"pesan":  "Input tidak valid: " + err.Error(),
		})
		return
	}

	// Buat buku baru pake struct models.Buku
	buku := models.Buku{
		NamaBuku: req.NamaBuku,
		Penulis:  req.Penulis,
		IsiBuku:  req.IsiBuku,
		Stock:    req.Stock,
	}

	// Simpan ke database
	if err := config.DB.Create(&buku).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"sukses": false,
			"pesan":  "Gagal menyimpan buku: " + err.Error(),
		})
		return
	}

	// Post mading otomatis
	go PostSystemMading(
		"📚 Buku Baru: "+buku.NamaBuku,
		fmt.Sprintf("Buku \"%s\" karya %s kini tersedia di perpustakaan. Stok: %d", buku.NamaBuku, buku.Penulis, buku.Stock),
		"buku_baru",
	)

	c.JSON(http.StatusCreated, gin.H{
		"sukses": true,
		"pesan":  "Buku berhasil ditambahkan",
		"data":   buku,
	})
}
