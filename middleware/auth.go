package middleware

import (
	"backend/services"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {

		authHeader := c.GetHeader("Authorization")

		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "token required",
			})
			c.Abort()
			return
		}

		splitToken := strings.Split(authHeader, " ")
		if len(splitToken) != 2 {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid token format",
			})
			c.Abort()
			return
		}

		tokenString := splitToken[1]

		claims, err := services.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid token",
			})
			c.Abort()
			return
		}

		// simpan info user
		c.Set("user_id", claims.UserID)
		c.Set("role", claims.Role)

		c.Next()
	}
}
