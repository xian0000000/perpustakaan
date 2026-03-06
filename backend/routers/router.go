package routers

import (
	"backend/handlers"
	"backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// ✅ CORS harus dipasang PERTAMA, sebelum semua group & route
	r.Use(middleware.CORSMiddleware())

	// ✅ Handle OPTIONS preflight untuk semua path
	r.OPTIONS("/*path", func(c *gin.Context) {
		c.Status(204)
	})

	// Public routes (tidak perlu login)
	public := r.Group("/api")
	{
		public.POST("/login", handlers.HandlersLogin)
		public.POST("/register", handlers.HandlersRegister)

		public.GET("/buku", handlers.GetAllBuku)
		public.GET("/buku/:id", handlers.GetBukuByID)
	}

	// User routes (perlu login)
	user := r.Group("/api/user")
	user.Use(middleware.AuthMiddleware())
	{
		user.GET("/me", handlers.GetMe)
		user.POST("/pinjam/:id", handlers.PinjamBuku)
		user.POST("/kembali/:id", handlers.KembalikanBuku)
		user.GET("/peminjaman", handlers.GetRiwayatPeminjaman)
	}

	// Admin routes (perlu login + admin)
	admin := r.Group("/api/admin")
	admin.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		admin.POST("/buku", handlers.TambahBuku)
		admin.PUT("/buku/:id", handlers.UpdateBuku)
		admin.DELETE("/buku/:id", handlers.HapusBuku)
	}
}
