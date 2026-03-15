// Tool untuk generate bcrypt hash dari password
// Usage: go run tools/hash_password.go
package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	fmt.Println("=====================================")
	fmt.Println("  Zakat App - Password Hash Generator")
	fmt.Println("=====================================")
	fmt.Println()

	reader := bufio.NewReader(os.Stdin)

	fmt.Print("Masukkan password: ")
	password, _ := reader.ReadString('\n')
	password = strings.TrimSpace(password)

	if password == "" {
		fmt.Println("❌ Password tidak boleh kosong")
		os.Exit(1)
	}

	fmt.Print("Konfirmasi password: ")
	confirmPassword, _ := reader.ReadString('\n')
	confirmPassword = strings.TrimSpace(confirmPassword)

	if password != confirmPassword {
		fmt.Println("❌ Password tidak cocok")
		os.Exit(1)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Printf("❌ Gagal generate hash: %v\n", err)
		os.Exit(1)
	}

	fmt.Println()
	fmt.Println("=====================================")
	fmt.Println("  Hash berhasil digenerate!")
	fmt.Println("=====================================")
	fmt.Println()
	fmt.Println("Password Hash:")
	fmt.Println(string(hash))
	fmt.Println()
	fmt.Println("Copy hash di atas ke sheet 'users' pada kolom password_hash")
	fmt.Println()
	fmt.Println("Contoh data di sheet 'users':")
	fmt.Println("-------------------------------------")
	fmt.Printf("| username | password_hash | nama_lengkap | aktif |\n")
	fmt.Printf("| admin    | %-13s... | Administrator | TRUE  |\n", string(hash))
	fmt.Println("-------------------------------------")
}
