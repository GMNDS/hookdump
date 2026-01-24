<p align="center">
  <h1 align="center">Hookdump</h1>
  <p align="center">
    <strong>Open-source webhook debugger. Receive, inspect, and replay webhooks.</strong>
  </p>
  <p align="center">
    <a href="#quick-start">Quick Start</a> •
    <a href="#features">Features</a> •
    <a href="#why-hookdump">Why Hookdump</a> •
    <a href="#self-hosting">Self-Hosting</a>
  </p>
</p>

<p align="center">
  <a href="https://github.com/orangekame3/hookdump/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </a>
  <a href="https://github.com/orangekame3/hookdump">
    <img src="https://img.shields.io/github/stars/orangekame3/hookdump?style=social" alt="GitHub Stars">
  </a>
</p>

---

## Why Hookdump?

Webhook debugging tools like RequestBin and Webhook.site are **closed-source SaaS** products. Your sensitive webhook data goes through their servers.

**Hookdump is different:**

| Feature | RequestBin | Webhook.site | Hookdump |
|---------|------------|--------------|----------|
| Open Source | No | No | **Yes** |
| Self-Hostable | No | No | **Yes** |
| Data Privacy | Their servers | Their servers | **Your servers** |
| Free Tier Limits | Limited | Limited | **Unlimited** |
| Replay Webhooks | No | Paid | **Yes** |

> **Your webhook data stays on your infrastructure.** Perfect for teams handling sensitive data, compliance requirements, or air-gapped environments.

## Features

- **Receive** - Create unique webhook URLs instantly
- **Inspect** - View headers, body, and metadata in a clean 3-pane UI
- **Replay** - Re-send captured webhooks to any target URL
- **Store** - SQLite-based storage, no external database needed
- **Self-Host** - One command Docker deployment

## Quick Start

### Docker (Recommended)

```bash
# Clone and start
git clone https://github.com/orangekame3/hookdump.git
cd hookdump
docker compose up -d

# Open http://localhost:8080
```

### Local Development

```bash
npm install
npm run build -w shared
npm run dev:backend   # Terminal 1
npm run dev:frontend  # Terminal 2
# Open http://localhost:5173
```

## Usage

1. **Create a Hook** - Click "+ New" and enter a name
2. **Copy the URL** - `http://localhost:8080/hooks/{hookId}`
3. **Send webhooks** to the URL:

```bash
curl -X POST http://localhost:8080/hooks/{hookId} \
  -H "Content-Type: application/json" \
  -d '{"event": "user.created", "data": {"id": 123}}'
```

4. **View** the captured request in the UI
5. **Replay** to forward the request to another endpoint

## Self-Hosting

### Docker Compose

```yaml
services:
  backend:
    image: ghcr.io/orangekame3/hookdump-backend:latest
    volumes:
      - ./data:/app/data
    environment:
      - MAX_EVENTS_PER_HOOK=100

  frontend:
    image: ghcr.io/orangekame3/hookdump-frontend:latest
    ports:
      - "8080:80"
    depends_on:
      - backend
```

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Backend port |
| `DATABASE_PATH` | `./data/hookdump.db` | SQLite path |
| `MAX_EVENTS_PER_HOOK` | `100` | Event retention limit |

## Architecture

```
hookdump/
├── shared/      # Zod schemas (TypeScript types)
├── backend/     # Fastify + Drizzle ORM + SQLite
├── frontend/    # React + Vite
└── compose.yaml
```

**Tech Stack:**
- Backend: Fastify, Drizzle ORM, better-sqlite3
- Frontend: React 18, Vite, TypeScript
- Shared: Zod for schema validation

## API Reference

### Webhook Receiver
- `* /hooks/:hookId` - Receive webhook (any HTTP method)

### Management API
- `POST /api/hooks` - Create hook
- `GET /api/hooks` - List hooks
- `DELETE /api/hooks/:hookId` - Delete hook
- `GET /api/hooks/:hookId/events` - List events
- `GET /api/events/:eventId` - Get event details
- `DELETE /api/events/:eventId` - Delete event
- `POST /api/events/:eventId/replay` - Replay event
- `GET /api/events/:eventId/replays` - Replay history

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT - See [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built for developers who care about data privacy.</sub>
</p>
