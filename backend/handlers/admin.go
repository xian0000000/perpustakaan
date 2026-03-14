package handlers

import (
	"net/http"
	"strconv"

	"backend/config"
	"backend/models"
	"backend/services"

	"github.com/gin-gonic/gin"
)

// ─── CRUD User ────────────────────────────────────────────────────────────────

// GET /api/admin/users
func AdminGetAllUsers(c *gin.Context) {
	db := config.DB
	var users []models.User

	if err := db.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal ambil data user"})
		return
	}

	// Hapus password dari response
	for i := range users {
		users[i].Password = ""
	}

	c.JSON(http.StatusOK, gin.H{
		"sukses": true,
		"data":   users,
	})
}

// GET /api/admin/users/:id
func AdminGetUserByID(c *gin.Context) {
	db := config.DB
	id := c.Param("id")

	var user models.User
	if err := db.Preload("Peminjaman.Buku").First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user tidak ditemukan"})
		return
	}
	user.Password = ""

	c.JSON(http.StatusOK, gin.H{
		"sukses": true,
		"data":   user,
	})
}

// POST /api/admin/users
func AdminTambahUser(c *gin.Context) {
	db := config.DB

	var body struct {
		Nama     string `json:"nama" binding:"required"`
		Password string `json:"password" binding:"required"`
		Saldo    int    `json:"saldo"`
		Role     string `json:"role"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Cek duplikat nama
	var existing models.User
	if err := db.Where("nama = ?", body.Nama).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "nama sudah terdaftar"})
		return
	}

	role := body.Role
	if role != "admin" && role != "pengguna" {
		role = "pengguna"
	}

	hashed, err := services.HashPassword(body.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal hash password"})
		return
	}

	user := models.User{
		Nama:     body.Nama,
		Password: hashed,
		Saldo:    body.Saldo,
		Role:     role,
	}

	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal membuat user"})
		return
	}
	user.Password = ""

	c.JSON(http.StatusCreated, gin.H{
		"sukses": true,
		"pesan":  "User berhasil dibuat",
		"data":   user,
	})
}

// PUT /api/admin/users/:id
func AdminUpdateUser(c *gin.Context) {
	db := config.DB
	id := c.Param("id")

	var user models.User
	if err := db.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user tidak ditemukan"})
		return
	}

	var body struct {
		Nama     string `json:"nama"`
		Password string `json:"password"`
		Saldo    *int   `json:"saldo"`
		Role     string `json:"role"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.Nama != "" {
		user.Nama = body.Nama
	}
	if body.Password != "" {
		hashed, err := services.HashPassword(body.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal hash password"})
			return
		}
		user.Password = hashed
	}
	if body.Saldo != nil {
		user.Saldo = *body.Saldo
	}
	if body.Role == "admin" || body.Role == "pengguna" {
		user.Role = body.Role
	}

	if err := db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal update user"})
		return
	}
	user.Password = ""

	c.JSON(http.StatusOK, gin.H{
		"sukses": true,
		"pesan":  "User berhasil diupdate",
		"data":   user,
	})
}

// DELETE /api/admin/users/:id
func AdminHapusUser(c *gin.Context) {
	db := config.DB
	id := c.Param("id")

	// Cek apakah user punya peminjaman aktif
	var count int64
	db.Model(&models.Peminjaman{}).Where("user_id = ? AND status = ?", id, "dipinjam").Count(&count)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "user masih memiliki peminjaman aktif"})
		return
	}

	if err := db.Delete(&models.User{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal hapus user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sukses": true,
		"pesan":  "User berhasil dihapus",
	})
}

// ─── Admin Peminjaman ─────────────────────────────────────────────────────────

// GET /api/admin/peminjaman
func AdminGetAllPeminjaman(c *gin.Context) {
	db := config.DB

	status := c.Query("status") // ?status=dipinjam atau kosong = semua

	query := db.Preload("User").Preload("Buku").Order("tanggal_peminjaman DESC")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var list []models.Peminjaman
	if err := query.Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal ambil data"})
		return
	}

	// Hapus password dari nested user
	for i := range list {
		list[i].User.Password = ""
	}

	c.JSON(http.StatusOK, gin.H{
		"sukses": true,
		"total":  len(list),
		"data":   list,
	})
}

// PUT /api/admin/peminjaman/:id  — admin paksa update status
func AdminUpdatePeminjaman(c *gin.Context) {
	db := config.DB

	peminjamanID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id tidak valid"})
		return
	}

	var body struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.Status != "dipinjam" && body.Status != "dikembalikan" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status harus 'dipinjam' atau 'dikembalikan'"})
		return
	}

	var p models.Peminjaman
	if err := db.First(&p, peminjamanID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "peminjaman tidak ditemukan"})
		return
	}

	p.Status = body.Status
	if body.Status == "dikembalikan" && p.TanggalPengembalian == nil {
		db.Model(&p).Update("status", "dikembalikan")
	} else {
		db.Save(&p)
	}

	db.Preload("User").Preload("Buku").First(&p, peminjamanID)
	p.User.Password = ""

	c.JSON(http.StatusOK, gin.H{
		"sukses": true,
		"pesan":  "Status peminjaman diperbarui",
		"data":   p,
	})
}

// DELETE /api/admin/peminjaman/:id
func AdminHapusPeminjaman(c *gin.Context) {
	db := config.DB
	id := c.Param("id")

	var p models.Peminjaman
	if err := db.First(&p, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "peminjaman tidak ditemukan"})
		return
	}

	if p.Status == "dipinjam" {
		c.JSON(http.StatusConflict, gin.H{"error": "tidak bisa hapus peminjaman yang masih aktif"})
		return
	}

	if err := db.Delete(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal hapus peminjaman"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sukses": true,
		"pesan":  "Peminjaman berhasil dihapus",
	})
}

// GET /api/admin/stats  — ringkasan statistik
func AdminGetStats(c *gin.Context) {
	db := config.DB

	var totalBuku, totalUser, totalPeminjaman, peminjamanAktif int64

	db.Model(&models.Buku{}).Count(&totalBuku)
	db.Model(&models.User{}).Count(&totalUser)
	db.Model(&models.Peminjaman{}).Count(&totalPeminjaman)
	db.Model(&models.Peminjaman{}).Where("status = ?", "dipinjam").Count(&peminjamanAktif)

	c.JSON(http.StatusOK, gin.H{
		"sukses": true,
		"data": gin.H{
			"total_buku":         totalBuku,
			"total_user":         totalUser,
			"total_peminjaman":   totalPeminjaman,
			"peminjaman_aktif":   peminjamanAktif,
		},
	})
}
