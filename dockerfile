FROM golang:1.22

WORKDIR /app

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend .

RUN go build -o app

CMD ["./app"]