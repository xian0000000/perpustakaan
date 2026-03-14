package main

import (
	"backend/config"
	"backend/routers"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	config.ConnectDB()

	// Buat routers
	r := gin.Default()
	routers.SetupRoutes(r)

	// Jalankan server
	r.Run(":8080")

}
