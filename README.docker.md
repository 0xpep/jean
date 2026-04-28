# Jean Docker Setup

Run Jean as a headless Docker container with Codex and OpenRouter support.

## Prerequisites

- Docker (with buildx for multi-platform builds)
- Linux x86_64 or ARM64 Jean binary
- OpenRouter API key

## Quick Start

### 1. Get Linux Jean Binary

Download or build the Linux ARM64 binary, then place it as `jean` in this directory:

```bash
# If you have the macOS M1 binary, you'll need a Linux ARM64 build
# Jean releases: https://github.com/coollabsio/jean/releases
cp /path/to/jean-linux-arm64 ./jean
chmod +x ./jean
```

### 2. Set OpenRouter API Key

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
```

### 3. Build and Run

```bash
docker compose up --build -d
```

### 4. Access

Open http://localhost:3456 in your browser.

## Configuration

### Volumes

| Path | Description |
|------|-------------|
| `./config:/home/jean/.config/jean` | Jean config (persisted) |
| `./opencode-config:/home/jean/.config/opencode` | Codex/OpenRouter config |
| `~/jean:/home/jean/jean` | Project worktrees |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JEAN_HOST` | `0.0.0.0` | Bind address |
| `JEAN_PORT` | `3456` | HTTP server port |

### Customizing OpenRouter Config

Edit `opencode-config/config.toml` to set your preferred models and API key.

## Troubleshooting

### Binary Architecture Mismatch

If you get `exec format error`, the binary architecture doesn't match the container:
```bash
file ./jean  # Check binary type
# For macOS M1 -> Linux ARM64, you need a Linux build
```

### Permission Issues

Ensure the binary is executable:
```bash
chmod +x ./jean
```