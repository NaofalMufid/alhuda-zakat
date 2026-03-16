# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install git (needed for go mod download)
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server .

# Final stage
FROM alpine:latest

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Copy binary from builder
COPY --from=builder /app/server .

# Copy static files
COPY --from=builder /app/static ./static

# Create credentials directory
RUN mkdir -p /app/credentials

# Expose port
EXPOSE 8080

# Run the binary
CMD ["./server"]
