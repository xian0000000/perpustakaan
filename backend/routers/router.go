package routers

import (
	"backend/handlers"
	"backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	r.Use(middleware.CORSMiddleware())
	r.OPTIONS("/*path", func(c *gin.Context) { c.Status(204) })

	// Public
	public := r.Group("/api")
	{
		public.POST("/login", handlers.HandlersLogin)
		public.POST("/register", handlers.HandlersRegister)
		public.GET("/buku", handlers.GetAllBuku)
		public.GET("/buku/:id", handlers.GetBukuByID)
		public.GET("/mading", handlers.GetMading)
	}

	// User
	user := r.Group("/api/user")
	user.Use(middleware.AuthMiddleware())
	{
		user.GET("/me", handlers.GetMe)
		user.POST("/pinjam/:id", handlers.PinjamBuku)
		user.POST("/kembali/:id", handlers.KembalikanBuku)
		user.GET("/peminjaman", handlers.GetRiwayatPeminjaman)
		user.GET("/baca/:id", handlers.BacaBuku)
		user.POST("/mading", handlers.PostMading)
	}

	// Admin
	admin := r.Group("/api/admin")
	admin.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		admin.POST("/buku", handlers.TambahBuku)
		admin.PUT("/buku/:id", handlers.UpdateBuku)
		admin.DELETE("/buku/:id", handlers.HapusBuku)
		admin.GET("/users", handlers.AdminGetAllUsers)
		admin.GET("/users/:id", handlers.AdminGetUserByID)
		admin.POST("/users", handlers.AdminTambahUser)
		admin.PUT("/users/:id", handlers.AdminUpdateUser)
		admin.DELETE("/users/:id", handlers.AdminHapusUser)
		admin.GET("/peminjaman", handlers.AdminGetAllPeminjaman)
		admin.PUT("/peminjaman/:id", handlers.AdminUpdatePeminjaman)
		admin.DELETE("/peminjaman/:id", handlers.AdminHapusPeminjaman)
		admin.GET("/stats", handlers.AdminGetStats)
		admin.DELETE("/mading/:id", handlers.AdminHapusMading)
	}
}
