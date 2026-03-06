package handlers

import (
	"backend/config"
	"backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

type UpdateBukuRequest struct {
	NamaBuku string `json:"nama_buku"`
	Penulis  string `json:"penulis"`
	IsiBuku  string `json:"isi_buku"`
	Stock    int    `json:"stock" binding:"min=0"`
}

// PUT /api/buku/:id
func UpdateBuku(c *gin.Context) {
	id := c.Param("id")
	var req UpdateBukuRequest

	// Bind JSON
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"sukses": false,
			"pesan":  "Input tidak valid: " + err.Error(),
		})
		return
	}

	// Cek apakah buku ada
	var buku models.Buku
	if err := config.DB.First(&buku, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"sukses": false,
			"pesan":  "Buku tidak ditemukan",
		})
		return
	}

	// Update field yang diisi
	updates := map[string]interface{}{}
	if req.NamaBuku != "" {
		updates["nama_buku"] = req.NamaBuku
	}
	if req.Penulis != "" {
		updates["penulis"] = req.Penulis
	}
	if req.IsiBuku != "" {
		updates["isi_buku"] = req.IsiBuku
	}
	if req.Stock >= 0 { // 0 boleh
		updates["stock"] = req.Stock
	}

	// Simpan perubahan
	if err := config.DB.Model(&buku).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"sukses": false,
			"pesan":  "Gagal update buku: " + err.Error(),
		})
		return
	}

	// Ambil data terbaru
	config.DB.First(&buku, id)

	c.JSON(http.StatusOK, gin.H{
		"sukses": true,
		"pesan":  "Buku berhasil diupdate",
		"data":   buku,
	})
}
