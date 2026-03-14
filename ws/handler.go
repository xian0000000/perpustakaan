package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"backend/config"
	"backend/models"
	"backend/services"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:    func(r *http.Request) bool { return true },
}

// WS /api/ws?token=...
func HandleWS(c *gin.Context) {
	tokenStr := c.Query("token")
	if tokenStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token required"})
		return
	}

	claims, err := services.ValidateToken(tokenStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	// Load user info
	var user models.User
	if err := config.DB.First(&user, claims.UserID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("ws upgrade error:", err)
		return
	}

	client := &Client{
		Hub:      H,
		Send:     make(chan []byte, 256),
		UserID:   user.ID,
		Nama:     user.Nama,
		Role:     user.Role,
		Aksi:     "online",
		LastSeen: time.Now(),
	}

	H.Register(client)

	go writePump(client, conn)
	go readPump(client, conn)
}

// ─── Read pump: client → server ─────────────────────────────────────────────

type IncomingMsg struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

func readPump(c *Client, conn *websocket.Conn) {
	defer func() {
		H.Unregister(c)
		conn.Close()
	}()

	conn.SetReadLimit(4096)
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, rawMsg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var msg IncomingMsg
		if err := json.Unmarshal(rawMsg, &msg); err != nil {
			continue
		}

		switch msg.Type {

		case "presence_update":
			var p struct {
				Aksi     string `json:"aksi"`
				Detail   string `json:"detail"`
				TargetID uint   `json:"target_id"`
			}
			if err := json.Unmarshal(msg.Payload, &p); err == nil {
				c.UpdatePresence(p.Aksi, p.Detail, p.TargetID)
			}

		case "chat":
			var p struct {
				Pesan string `json:"pesan"`
			}
			if err := json.Unmarshal(msg.Payload, &p); err == nil && p.Pesan != "" {
				// Simpan ke DB
				chatMsg := models.ChatMessage{
					UserID: c.UserID,
					Pesan:  p.Pesan,
					Waktu:  time.Now(),
				}
				config.DB.Create(&chatMsg)

				// Broadcast ke semua
				H.Broadcast("chat", ChatPayload{
					ID:     chatMsg.ID,
					UserID: c.UserID,
					Nama:   c.Nama,
					Pesan:  p.Pesan,
					Waktu:  chatMsg.Waktu.Format(time.RFC3339),
				})

				c.UpdatePresence("chat", "", 0)
			}

		case "ping":
			conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		}
	}
}

// ─── Write pump: server → client ────────────────────────────────────────────

func writePump(c *Client, conn *websocket.Conn) {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.Send:
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}

		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
