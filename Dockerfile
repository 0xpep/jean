FROM debian:bookworm-slim

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create jean user
RUN useradd -m -s /bin/bash jean

# Copy prebuilt Jean binary from build context
# Build context should contain: --chmod +x for the binary
COPY --chmod=755 jean /usr/local/bin/jean

# Copy codex config (optional - mount or customize as needed)
# Default location: ~/.config/jean/config.yml or provide via volume
COPY config.yml /home/jean/.config/jean/config.yml

# Install codex with openrouter provider
# Codex is installed via: curl -LsSf https://@astral.sh/codex/install | sh
# For openrouter, create config at ~/.config/opencode/config.toml
RUN su - jean -c "curl -LsSf https://astral.sh/codex/install | sh" \
    && mkdir -p /home/jean/.config/opencode \
    && cp /home/jean/.config/codex/config.toml /home/jean/.config/opencode/config.toml 2>/dev/null || true

# Switch to jean user
USER jean
WORKDIR /home/jean

# Default command - run headless
CMD ["jean", "headless"]