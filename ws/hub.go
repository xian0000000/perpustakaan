package ws

import (
	"encoding/json"
	"log"
	"sync"
)

// ─── Wire types ─────────────────────────────────────────────────────────────

type WSMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type OnlineCountPayload struct {
	Count int `json:"count"`
}

type ChatPayload struct {
	ID     uint   `json:"id"`
	UserID uint   `json:"user_id"`
	Nama   string `json:"nama"`
	Pesan  string `json:"pesan"`
	Waktu  string `json:"waktu"`
}

type PresencePayload struct {
	UserID   uint   `json:"user_id"`
	Nama     string `json:"nama"`
	Role     string `json:"role"`
	Aksi     string `json:"aksi"`
	TargetID uint   `json:"target_id,omitempty"`
	Detail   string `json:"detail,omitempty"`
}

type MadingPayload struct {
	ID       uint   `json:"id"`
	Judul    string `json:"judul"`
	Isi      string `json:"isi"`
	Kategori string `json:"kategori"`
	Nama     string `json:"nama"`
	Waktu    string `json:"waktu"`
}

// ─── Client ─────────────────────────────────────────────────────────────────

type Client struct {
	Hub    *Hub
	Send   chan []byte
	UserID uint
	Nama   string
	Role   string
	Aksi   string
	Detail string
}

// ─── Hub ─────────────────────────────────────────────────────────────────────
// Mirrors reference chatSocket.js:
//   onlineUser = new Set()             → clients map[*Client]bool
//   hitung()                           → broadcastOnlineCount()
//   socket.emit('pesan lama', msgs)    → SendTo(client, "pesan_lama", msgs)
//   io.emit('chat message', msg)       → Broadcast("chat", payload)
//   disconnect → delete + hitung       → unregister + broadcastOnlineCount

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

var H = NewHub()

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 512),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = true
			h.mu.Unlock()
			// mirrors: onlineUser.add(socket.id); hitung();
			h.broadcastOnlineCount()
			// NOTE: "pesan lama" is sent in HandleWS goroutine right after Register

		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				close(c.Send)
			}
			h.mu.Unlock()
			// mirrors: onlineUser.delete(socket.id); hitung();
			h.broadcastOnlineCount()
			h.broadcastPresence()

		case msg := <-h.broadcast:
			h.mu.RLock()
			for c := range h.clients {
				select {
				case c.Send <- msg:
				default:
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Register(c *Client)   { h.register <- c }
func (h *Hub) Unregister(c *Client) { h.unregister <- c }

// Broadcast mirrors io.emit() — sends to ALL clients
func (h *Hub) Broadcast(msgType string, payload interface{}) {
	p, err := json.Marshal(payload)
	if err != nil {
		return
	}
	msg, err := json.Marshal(WSMessage{Type: msgType, Payload: p})
	if err != nil {
		return
	}
	select {
	case h.broadcast <- msg:
	default:
		log.Println("ws: broadcast channel full, dropping")
	}
}

// SendTo mirrors socket.emit() — sends only to one client
func (h *Hub) SendTo(c *Client, msgType string, payload interface{}) {
	p, err := json.Marshal(payload)
	if err != nil {
		return
	}
	msg, err := json.Marshal(WSMessage{Type: msgType, Payload: p})
	if err != nil {
		return
	}
	select {
	case c.Send <- msg:
	default:
	}
}

// broadcastOnlineCount mirrors hitung() in chatSocket.js
func (h *Hub) broadcastOnlineCount() {
	h.mu.RLock()
	count := len(h.clients)
	h.mu.RUnlock()
	h.Broadcast("online_count", OnlineCountPayload{Count: count})
}

func (h *Hub) broadcastPresence() {
	h.mu.RLock()
	defer h.mu.RUnlock()

	users := make([]PresencePayload, 0, len(h.clients))
	for c := range h.clients {
		users = append(users, PresencePayload{
			UserID: c.UserID,
			Nama:   c.Nama,
			Role:   c.Role,
			Aksi:   c.Aksi,
			Detail: c.Detail,
		})
	}

	p, _ := json.Marshal(users)
	msg, _ := json.Marshal(WSMessage{Type: "presence", Payload: p})
	for c := range h.clients {
		select {
		case c.Send <- msg:
		default:
		}
	}
}

func (h *Hub) BroadcastPresence() { h.broadcastPresence() }

func (h *Hub) UpdatePresence(c *Client, aksi, detail string) {
	c.Aksi = aksi
	c.Detail = detail
	h.broadcastPresence()
}

// ─── Admin helpers ───────────────────────────────────────────────────────────

func (h *Hub) GetOnlineUsers() []PresencePayload {
	h.mu.RLock()
	defer h.mu.RUnlock()
	users := make([]PresencePayload, 0, len(h.clients))
	for c := range h.clients {
		users = append(users, PresencePayload{
			UserID: c.UserID, Nama: c.Nama, Role: c.Role,
			Aksi: c.Aksi, Detail: c.Detail,
		})
	}
	return users
}

func (h *Hub) GetOnlineCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// KickUser closes a connection by UserID — mirrors admin/kick in reference
func (h *Hub) KickUser(userID uint) bool {
	h.mu.RLock()
	var target *Client
	for c := range h.clients {
		if c.UserID == userID {
			target = c
			break
		}
	}
	h.mu.RUnlock()
	if target == nil {
		return false
	}
	h.unregister <- target
	return true
}
