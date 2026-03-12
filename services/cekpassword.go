package services

import (
	"backend/config"
	"backend/models"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func CekPassword(nama string, password string) (bool, *models.User) {
	var user models.User

	result := config.DB.Where("nama = ?", nama).First(&user)

	if result.Error != nil {
		fmt.Println("User tidak ditemukan:", nama)
		return false, nil
	}
	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if err != nil {
		fmt.Println("Password salah untuk user:", nama)
		return false, nil
	}

	fmt.Println("Password cocok untuk user:", nama)
	return true, &user

}
