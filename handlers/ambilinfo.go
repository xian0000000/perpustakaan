package handlers

import (
	"net/http"

	"backend/config"
	"backend/models"

	"github.com/gin-gonic/gin"
)

func GetMe(c *gin.Context) {
	db := config.DB

	// ambil user_id dari JWT middleware
	userID := c.MustGet("user_id").(uint)

	var user models.User

	// ambil data user dari database
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "user tidak ditemukan",
		})
		return
	}

	// jangan kirim password
	user.Password = ""

	c.JSON(http.StatusOK, gin.H{
		"message": "data user",
		"data":    user,
	})
}
