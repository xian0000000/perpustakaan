package handlers

import (
	"backend/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type LoginRequest struct {
	Nama     string `json:"nama"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Sukses bool      `json:"sukses"`
	Pesan  string    `json:"pesan"`
	Data   LoginData `json:"data"`
}

type LoginData struct {
	ID    uint   `json:"id"`
	Nama  string `json:"nama"`
	Saldo int    `json:"saldo"`
	Role  string `json:"role"`
	Token string `json:"token"`
}

func HandlersLogin(c *gin.Context) {
	// Set header JSON (di Gin otomatis, tapi tetep kasih)
	c.Header("Content-Type", "application/json")

	// Method harus post (di Gin udah otomatis pake router, tapi tetep cek)
	if c.Request.Method != http.MethodPost {
		c.JSON(http.StatusMethodNotAllowed, LoginResponse{
			Sukses: false,
			Pesan:  "Method harus POST",
		})
		return
	}

	// req harus sama kaya login request
	var req LoginRequest
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, LoginResponse{
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

	sukses, user := services.CekPassword(req.Nama, req.Password)

	// cek pw hash
	if !sukses {
		// Gagal login
		c.JSON(http.StatusUnauthorized, LoginResponse{
			Sukses: false,
			Pesan:  "Nama atau password salah",
		})
		return
	}
	token, err := services.GenerateToken(user.ID, user.Role)
	if err != nil {
		c.JSON(500, gin.H{"error": "gagal generate token"})
		return
	}

	response := LoginResponse{
		Sukses: true,
		Pesan:  "Login berhasil",
		Data: LoginData{
			ID:    user.ID,
			Nama:  user.Nama,
			Saldo: user.Saldo,
			Role:  user.Role,
			Token: token,
		},
	}

	c.JSON(http.StatusOK, response)
}
