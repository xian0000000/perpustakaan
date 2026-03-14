package ws

import (
	"encoding/json"
	"log"
	"sync"
	"time"
)

// ─── Message types ──────────────────────────────────────────────────────────

type WSMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// Presence payload
type PresencePayload struct {
	UserID   uint   `json:"user_id"`
	Nama     string `json:"nama"`
	Role     string `json:"role"`
	Aksi     string `json:"aksi"`    // "online", "offline", "membaca", "chat", "mading", "browsing"
	TargetID uint   `json:"target_id,omitempty"`
	Detail   string `json:"detail,omitempty"` // judul buku yg dibaca, dll
}

// Chat payload
type ChatPayload struct {
	ID     uint   `json:"id"`
	UserID uint   `json:"user_id"`
	Nama   string `json:"nama"`
	Pesan  string `json:"pesan"`
	Waktu  string `json:"waktu"`
}

// Mading payload
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
	Hub      *Hub
	Send     chan []byte
	UserID   uint
	Nama     string
	Role     string
	Aksi     string
	Detail   string
	TargetID uint
	LastSeen time.Time
}

func (c *Client) UpdatePresence(aksi, detail string, targetID uint) {
	c.Aksi = aksi
	c.Detail = detail
	c.TargetID = targetID
	c.LastSeen = time.Now()
	c.Hub.BroadcastPresence()
}

// ─── Hub ─────────────────────────────────────────────────────────────────────

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
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			h.BroadcastPresence()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
			}
			h.mu.Unlock()
			h.BroadcastPresence()

		case msg := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- msg:
				default:
					// slow client - skip
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Register(c *Client) { h.register <- c }
func (h *Hub) Unregister(c *Client) { h.unregister <- c }

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
		log.Println("ws: broadcast channel full, dropping message")
	}
}

func (h *Hub) BroadcastPresence() {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var users []PresencePayload
	for c := range h.clients {
		users = append(users, PresencePayload{
			UserID:   c.UserID,
			Nama:     c.Nama,
			Role:     c.Role,
			Aksi:     c.Aksi,
			TargetID: c.TargetID,
			Detail:   c.Detail,
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

func (h *Hub) GetOnlineUsers() []PresencePayload {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var users []PresencePayload
	for c := range h.clients {
		users = append(users, PresencePayload{
			UserID:   c.UserID,
			Nama:     c.Nama,
			Role:     c.Role,
			Aksi:     c.Aksi,
			TargetID: c.TargetID,
			Detail:   c.Detail,
		})
	}
	return users
}
