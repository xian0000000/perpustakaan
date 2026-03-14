package main

import (
	"backend/config"
	"backend/routers"
	"backend/ws"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	config.ConnectDB()

	// Jalankan WebSocket hub
	go ws.H.Run()

	// Buat router
	r := gin.Default()
	routers.SetupRoutes(r)

	// Jalankan server
	r.Run(":8080")
}
