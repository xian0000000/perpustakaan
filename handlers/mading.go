package handlers

import (
	"net/http"
	"time"

	"backend/config"
	"backend/models"
	"backend/ws"

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

// POST /api/mading  — user bisa post (auth required)
func PostMading(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var body struct {
		Judul    string `json:"judul" binding:"required"`
		Isi      string `json:"isi" binding:"required"`
		Kategori string `json:"kategori"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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

	// Load user
	config.DB.Preload("User").First(&post, post.ID)
	post.User.Password = ""

	// Broadcast ke semua via WS
	ws.H.Broadcast("mading_new", ws.MadingPayload{
		ID:       post.ID,
		Judul:    post.Judul,
		Isi:      post.Isi,
		Kategori: post.Kategori,
		Nama:     post.User.Nama,
		Waktu:    post.CreatedAt.Format(time.RFC3339),
	})

	c.JSON(http.StatusCreated, gin.H{
		"sukses": true,
		"pesan":  "Posting berhasil",
		"data":   post,
	})
}

// DELETE /api/admin/mading/:id  — admin only
func AdminHapusMading(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.MadingPost{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal hapus"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"sukses": true, "pesan": "Mading dihapus"})
}

// ─── Chat history ─────────────────────────────────────────────────────────────

// GET /api/chat/history  — auth required, ambil 100 chat terakhir
func GetChatHistory(c *gin.Context) {
	var msgs []models.ChatMessage
	if err := config.DB.
		Preload("User").
		Order("waktu DESC").
		Limit(100).
		Find(&msgs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal ambil chat"})
		return
	}
	// Reverse agar urutan kronologis
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	for i := range msgs {
		msgs[i].User.Password = ""
	}
	c.JSON(http.StatusOK, gin.H{"sukses": true, "data": msgs})
}

// ─── System mading helper (dipanggil dari handler lain) ──────────────────────

func PostSystemMading(judul, isi, kategori string) {
	post := models.MadingPost{
		Judul:     judul,
		Isi:       isi,
		Kategori:  kategori,
		UserID:    0, // system
		CreatedAt: time.Now(),
	}
	config.DB.Create(&post)

	ws.H.Broadcast("mading_new", ws.MadingPayload{
		ID:       post.ID,
		Judul:    post.Judul,
		Isi:      post.Isi,
		Kategori: post.Kategori,
		Nama:     "Sistem",
		Waktu:    post.CreatedAt.Format(time.RFC3339),
	})
}
