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

	r := gin.Default()
	routers.SetupRoutes(r)
	r.Run(":8080")
}
