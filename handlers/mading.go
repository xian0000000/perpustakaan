package handlers

import (
	"net/http"
	"strconv"
	"time"

	"backend/config"
	"backend/models"

	"github.com/gin-gonic/gin"
)

// ─── Mading ──────────────────────────────────────────────────────────────────

// GET /api/mading  — public, semua bisa lihat
func GetMading(c *gin.Context) {
	var posts []models.MadingPost
	if err := config.DB.
		Preload("User").
		Order("created_at DESC").
		Limit(50).
		Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal ambil mading"})
		return
	}
	for i := range posts {
		posts[i].User.Password = ""
	}
	c.JSON(http.StatusOK, gin.H{"sukses": true, "data": posts})
}

// POST /api/user/mading  — user posting mading
func PostMading(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var body struct {
		Judul    string `json:"judul"`
		Isi      string `json:"isi"`
		Kategori string `json:"kategori"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Judul == "" || body.Isi == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "judul dan isi wajib"})
		return
	}

	kategori := body.Kategori
	if kategori == "" {
		kategori = "umum"
	}

	post := models.MadingPost{
		Judul:     body.Judul,
		Isi:       body.Isi,
		Kategori:  kategori,
		UserID:    userID,
		CreatedAt: time.Now(),
	}

	if err := config.DB.Create(&post).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal posting"})
		return
	}

	config.DB.Preload("User").First(&post, post.ID)
	post.User.Password = ""

	c.JSON(http.StatusCreated, gin.H{
		"sukses": true,
		"pesan":  "Posting berhasil",
		"data":   post,
	})
}

// DELETE /api/admin/mading/:id  — admin only
func AdminHapusMading(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id tidak valid"})
		return
	}
	if err := config.DB.Delete(&models.MadingPost{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal hapus"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"sukses": true, "pesan": "Mading dihapus"})
}

// ─── System mading helper (dipanggil dari handler lain) ──────────────────────

func PostSystemMading(judul, isi, kategori string) {
	config.DB.Create(&models.MadingPost{
		Judul:     judul,
		Isi:       isi,
		Kategori:  kategori,
		UserID:    0,
		CreatedAt: time.Now(),
	})
}
