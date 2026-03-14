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

// HandleWS — adapts reference chatSocket.js connection lifecycle to Go/Gin
//
// JS reference flow:
//   io.on('connection', async (socket) => {
//     onlineUser.add(socket.id); hitung();               ← H.Register(client) triggers this
//     socket.emit('pesan lama', messages);               ← SendTo after register
//     socket.on('chat message', handler)                 ← readPump case "chat"
//     socket.on('disconnect', () => { delete; hitung() }) ← H.Unregister triggers this
//   });
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
		Hub:    H,
		Send:   make(chan []byte, 256),
		UserID: user.ID,
		Nama:   user.Nama,
		Role:   user.Role,
		Aksi:   "online",
	}

	// mirrors: onlineUser.add(socket.id); hitung()
	H.Register(client)

	// mirrors: socket.emit('pesan lama', messages)  — sent only to this new client
	go sendOldMessages(client)

	go writePump(client, conn)
	go readPump(client, conn)
}

// sendOldMessages mirrors:
//   const messages = await Message.find().sort({ time: 1 });
//   socket.emit('pesan lama', messages);
func sendOldMessages(c *Client) {
	var msgs []models.ChatMessage
	config.DB.
		Preload("User").
		Order("waktu ASC").
		Limit(100).
		Find(&msgs)

	payloads := make([]ChatPayload, 0, len(msgs))
	for _, m := range msgs {
		nama := m.User.Nama
		if nama == "" {
			nama = "—"
		}
		payloads = append(payloads, ChatPayload{
			ID:     m.ID,
			UserID: m.UserID,
			Nama:   nama,
			Pesan:  m.Pesan,
			Waktu:  m.Waktu.Format(time.RFC3339),
		})
	}

	H.SendTo(c, "pesan_lama", payloads)
}

// ─── Read pump: client → server ─────────────────────────────────────────────

type IncomingMsg struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

func readPump(c *Client, conn *websocket.Conn) {
	defer func() {
		// mirrors: socket.on('disconnect', () => { onlineUser.delete; hitung() })
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

		// mirrors: socket.on('chat message', async (msg) => { ... io.emit('chat message', newMsg) })
		case "chat":
			var p struct {
				Pesan string `json:"pesan"`
			}
			if err := json.Unmarshal(msg.Payload, &p); err != nil || p.Pesan == "" {
				continue
			}

			// Save to DB
			chatMsg := models.ChatMessage{
				UserID: c.UserID,
				Pesan:  p.Pesan,
				Waktu:  time.Now(),
			}
			config.DB.Create(&chatMsg)

			// mirrors: io.emit('chat message', newMsg)
			H.Broadcast("chat", ChatPayload{
				ID:     chatMsg.ID,
				UserID: c.UserID,
				Nama:   c.Nama,
				Pesan:  p.Pesan,
				Waktu:  chatMsg.Waktu.Format(time.RFC3339),
			})

			H.UpdatePresence(c, "chat", "")

		case "presence_update":
			var p struct {
				Aksi   string `json:"aksi"`
				Detail string `json:"detail"`
			}
			if err := json.Unmarshal(msg.Payload, &p); err == nil {
				H.UpdatePresence(c, p.Aksi, p.Detail)
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
