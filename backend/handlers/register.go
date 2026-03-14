package handlers

import (
	"backend/config"
	"backend/models"
	"backend/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type RegisterRequest struct {
	Nama     string `json:"nama" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterResponse struct {
	Sukses bool   `json:"sukses"`
	Pesan  string `json:"pesan"`
}

func HandlersRegister(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, RegisterResponse{
			Sukses: false,
			Pesan:  "Format JSON salah: " + err.Error(),
		})
		return
	}
	// cek nama sama pw kosong ga
	if req.Nama == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, LoginResponse{
			Sukses: false,
			Pesan:  "Nama dan password harus diisi",
		})
		return
	}

	hash, err := services.HashPassword(req.Password)

	if err != nil {
		c.JSON(http.StatusInternalServerError, RegisterResponse{
			Sukses: false,
			Pesan:  "Gagal hash password: " + err.Error(),
		})
		return
	}

	user := models.User{
		Nama:     req.Nama,
		Password: string(hash), // <-- YANG DISIMPAN HASH, BUKAN PASSWORD ASLI
		Saldo:    10000,
		Role:     "pengguna",
	}
	result := config.DB.Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, RegisterResponse{
			Sukses: false,
			Pesan:  "Gagal simpan ke database: " + result.Error.Error(),
		})
		return
	}

	// 4. Post mading otomatis
	go PostSystemMading(
		"👤 Anggota Baru: "+req.Nama,
		req.Nama+" baru saja bergabung dengan perpustakaan. Selamat datang!",
		"info_user",
	)

	// 5. KIRIM RESPONSE SUKSES
	c.JSON(http.StatusCreated, RegisterResponse{
		Sukses: true,
		Pesan:  "Register berhasil",
	})

}
